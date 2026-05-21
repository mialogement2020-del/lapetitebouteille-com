import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CAPTION_PROMPT = `Tu analyses la photo d'une bouteille d'alcool (vin, champagne, spiritueux).
Décris en 2-3 phrases en français: type de boisson, couleur (rouge/blanc/rosé), région ou appellation visible sur l'étiquette, marque/domaine, millésime si visible, style (sec, doux, etc.), cépage si identifiable.
Sois précis et factuel. Pas d'introduction, juste la description.`;

async function captionImage(imageDataUrl: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: CAPTION_PROMPT },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      }],
    }),
  });
  if (!r.ok) throw new Error(`caption ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() ?? "";
}

async function embedText(text: string): Promise<number[]> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-embedding-001", input: text, dimensions: 1536 }),
  });
  if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.data[0].embedding;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { image, query } = await req.json();
    if (!image && !query) {
      return new Response(JSON.stringify({ error: "image (data URL) ou query requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let caption = query as string | undefined;
    if (image) caption = await captionImage(image);
    if (!caption) throw new Error("caption vide");

    const vector = await embedText(caption);

    const { data: matches, error } = await supabase.rpc("match_products_by_embedding", {
      query_embedding: vector as any,
      match_count: 12,
      min_similarity: 0.2,
    });
    if (error) throw error;

    // Log
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const client = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await client.auth.getUser();
      userId = u.user?.id ?? null;
    }
    await supabase.from("visual_searches").insert({
      user_id: userId, caption, match_count: matches?.length ?? 0,
    });

    return new Response(JSON.stringify({ caption, matches: matches ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visual-search error", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});