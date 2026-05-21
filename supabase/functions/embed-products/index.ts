import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function embed(input: string[]): Promise<number[][]> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input,
      dimensions: 1536,
    }),
  });
  if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.data.map((d: any) => d.embedding);
}

function productToText(p: any): string {
  return [
    p.name,
    p.short_description,
    p.description,
    p.region,
    p.origin_country,
    p.grape_variety,
    p.tasting_notes,
    p.food_pairing,
    p.vintage_year ? `millésime ${p.vintage_year}` : "",
  ].filter(Boolean).join(". ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Number(body.limit ?? 50), 100);
    const force = Boolean(body.force);

    let query = supabase.from("products").select("id, name, short_description, description, region, origin_country, grape_variety, tasting_notes, food_pairing, vintage_year").eq("is_active", true);
    if (!force) query = query.is("embedding", null);
    const { data: products, error } = await query.limit(limit);
    if (error) throw error;
    if (!products?.length) return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const texts = products.map(productToText);
    const vectors = await embed(texts);

    let ok = 0;
    for (let i = 0; i < products.length; i++) {
      const { error: upErr } = await supabase.from("products").update({
        embedding: vectors[i] as any,
        embedding_source: "text",
        embedding_updated_at: new Date().toISOString(),
      }).eq("id", products[i].id);
      if (!upErr) ok++;
    }

    return new Response(JSON.stringify({ processed: ok, total: products.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-products error", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});