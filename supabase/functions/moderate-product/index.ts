import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `Tu es un modérateur expert pour une marketplace de vins et spiritueux haut de gamme au Cameroun.
Analyse la fiche produit (image + texte) et renvoie STRICTEMENT un JSON valide avec ce schéma :
{
  "quality_score": 0-100,
  "verdict": "approved" | "review" | "rejected",
  "issues": [string],
  "suggestions": [string],
  "counterfeit_risk": 0-100,
  "compliance_ok": boolean,
  "summary": string
}

Critères :
- Qualité photo (netteté, fond, cadrage, éclairage)
- Description complète (origine, cépage, degré, volume, accord mets)
- Conformité légale (vente d'alcool +18, étiquetage)
- Risque de contrefaçon (logo flou, packaging suspect, prix anormalement bas)
- Cohérence prix/produit

verdict :
- "approved" si score >= 75 ET compliance_ok ET counterfeit_risk < 30
- "rejected" si compliance_ok=false OU counterfeit_risk >= 70
- "review" sinon

Réponds UNIQUEMENT avec le JSON, sans markdown.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id,name,description,short_description,price,image_url,region,origin_country,grape_variety,vintage_year,alcohol_percentage,volume_ml,tasting_notes")
      .eq("id", product_id)
      .single();
    if (pErr || !product) throw new Error(pErr?.message || "product not found");

    const userContent: any[] = [
      {
        type: "text",
        text: `Fiche produit:\n${JSON.stringify(product, null, 2)}`,
      },
    ];
    if (product.image_url) {
      userContent.push({ type: "image_url", image_url: { url: product.image_url } });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, réessayez" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits Lovable AI épuisés" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${t}`);
    }

    const aiJson = await aiResp.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { quality_score: 0, verdict: "review", issues: ["IA: réponse non JSON"], suggestions: [], counterfeit_risk: 0, compliance_ok: true, summary: raw.slice(0, 500) };
    }

    const quality = Math.max(0, Math.min(100, Number(parsed.quality_score) || 0));
    const cfRisk = Math.max(0, Math.min(100, Number(parsed.counterfeit_risk) || 0));
    const verdict: "approved" | "review" | "rejected" =
      ["approved", "review", "rejected"].includes(parsed.verdict) ? parsed.verdict : "review";

    const { error: insErr } = await supabase.from("product_moderations").insert({
      product_id,
      quality_score: quality,
      verdict,
      issues: parsed.issues ?? [],
      suggestions: parsed.suggestions ?? [],
      summary: parsed.summary ?? null,
      counterfeit_risk: cfRisk,
      compliance_ok: parsed.compliance_ok !== false,
      analyzed_image_url: product.image_url,
      model_used: MODEL,
    });
    if (insErr) throw insErr;

    // Update product moderation_status
    const newStatus =
      verdict === "approved" ? "approved" : verdict === "rejected" ? "rejected" : "flagged";
    await supabase
      .from("products")
      .update({ moderation_status: newStatus })
      .eq("id", product_id);

    return new Response(
      JSON.stringify({ success: true, product_id, quality_score: quality, verdict, counterfeit_risk: cfRisk, status: newStatus, summary: parsed.summary, issues: parsed.issues, suggestions: parsed.suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("moderate-product error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});