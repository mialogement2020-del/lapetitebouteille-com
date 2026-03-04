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
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "This is a wine or spirits product photo for an e-commerce catalog. Please enhance it: 1) Remove any background clutter and make the background clean white or transparent. 2) Center the bottle/product. 3) Improve lighting, contrast and sharpness. 4) Ensure the label is clearly readable. 5) Make it look professional and catalog-ready. 6) Keep the aspect ratio suitable for a 3:4 portrait product card. Return ONLY the enhanced image."
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
