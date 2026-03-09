import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dataUrl = `data:${mimeType || "image/png"};base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a professional product photography retoucher specialized in wine and spirits bottles for e-commerce catalogs.

MANDATORY REQUIREMENTS — follow ALL of them precisely:

1. BACKGROUND: Remove the entire existing background completely. Replace it with a PURE WHITE background (#FFFFFF). No gradients, no shadows on the background, no grey tones — strictly pure white.

2. BOTTLE CENTERING: Center the bottle perfectly in the frame, vertically and horizontally. Leave balanced margins on all sides.

3. LABEL CLARITY & READABILITY: This is critical. Enhance the label text so every word, every letter is sharp, crisp and perfectly readable. If text on the label appears blurry, faded, or unclear:
   - Sharpen the text edges
   - Increase contrast on the label area specifically
   - Ensure all typography on the label is legible at display size
   - Preserve the original label design, colors and branding accurately

4. LIGHTING & COLOR: Apply professional studio-quality lighting:
   - Even, soft illumination that eliminates harsh shadows on the bottle
   - Accurate color reproduction — the wine/spirit color through glass must look natural
   - Subtle reflections on glass surfaces for a premium look
   - No color cast, no yellowish or bluish tint

5. SHARPNESS & DETAIL: The entire bottle must be tack-sharp:
   - Crisp edges on the bottle silhouette
   - Clear capsule/cork/cap details
   - Visible texture on labels and embossing

6. ASPECT RATIO: Maintain a 3:4 portrait orientation suitable for product cards.

7. OUTPUT: Return ONLY the enhanced image. No text, no watermark, no border.

The goal is a catalog-ready, professional product photo that could be used on a premium wine e-commerce website.`
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits insufficient. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const enhancedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!enhancedImageUrl) {
      // AI didn't return an image, return original
      return new Response(
        JSON.stringify({ enhanced: false, message: "AI could not enhance this image. Using original." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract base64 from data URL
    const base64Data = enhancedImageUrl.includes(",") 
      ? enhancedImageUrl.split(",")[1] 
      : enhancedImageUrl;

    return new Response(
      JSON.stringify({ enhanced: true, imageBase64: base64Data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("enhance-product-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
