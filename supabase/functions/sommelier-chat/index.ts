 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const SYSTEM_PROMPT = `Tu es "Le Sommelier", un assistant expert en vins et spiritueux pour La Petite Bouteille, une boutique premium au Cameroun.
 
 🍷 TON EXPERTISE:
 - Conseiller sur le choix des vins selon l'occasion (dîner romantique, célébration, cadeau)
 - Recommander des accords mets-vins parfaits avec la cuisine camerounaise et internationale
 - Guider selon le budget (économique, moyen, premium, luxe)
 - Expliquer les caractéristiques des vins (cépages, terroirs, notes de dégustation)
 - Conseiller sur les spiritueux (whisky, cognac, rhum, gin, champagne)
 - Suggérer des coffrets cadeaux et des découvertes
 
 🎯 STYLE DE COMMUNICATION:
 - Chaleureux, professionnel et passionné
 - Utilise des emojis avec parcimonie pour rendre la conversation agréable
 - Adapte ton langage au niveau de connaissance du client
 - Pose des questions pour mieux comprendre les besoins
 - Suggère toujours 2-3 options avec des gammes de prix variées
 
 💡 INFORMATIONS CLÉS:
 - Livraison express 24h sur Yaoundé et Douala
 - Paiement par Mobile Money (MTN/Orange) ou à la livraison
 - Livraison gratuite à partir de 50 000 FCFA
 - Programme ambassadeur avec commissions sur les recommandations
 - Service conciergerie 7j/7
 
 🏆 MISSION:
 Aider chaque client à trouver la bouteille parfaite pour son occasion, son goût et son budget, tout en partageant ta passion pour le monde des vins et spiritueux.
 
 Si on te pose des questions hors sujet (politique, religion, etc.), ramène poliment la conversation vers les vins et spiritueux.
 
 Réponds toujours en français.`;
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { messages } = await req.json();
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-3-flash-preview",
         messages: [
           { role: "system", content: SYSTEM_PROMPT },
           ...messages,
         ],
         stream: true,
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(
           JSON.stringify({ error: "Le service est temporairement surchargé. Veuillez réessayer dans quelques instants." }),
           { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       if (response.status === 402) {
         return new Response(
           JSON.stringify({ error: "Service momentanément indisponible. Veuillez réessayer plus tard." }),
           { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       return new Response(
         JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     return new Response(response.body, {
       headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
     });
   } catch (error) {
     console.error("Sommelier chat error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });