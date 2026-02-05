 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
 
// Simple in-memory rate limiter (resets on function cold start)
// For production, consider using Redis or database-based rate limiting
// Privacy: IPs are hashed for logging, never stored in full
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_AUTHENTICATED = 30; // Max requests per window for authenticated users
const RATE_LIMIT_ANONYMOUS = 5; // Lower limit for anonymous users
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(clientIP: string, isAuthenticated: boolean): { allowed: boolean; remaining: number; resetIn: number } {
  const maxRequests = isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_ANONYMOUS;
  const now = Date.now();
  const key = isAuthenticated ? `auth:${clientIP}` : `anon:${clientIP}`;
  const record = rateLimitMap.get(key);
  
  // Clean up old entries periodically (simple cleanup every 100 checks)
  if (rateLimitMap.size > 1000) {
    for (const [ip, data] of rateLimitMap.entries()) {
      if (data.resetTime < now) {
        rateLimitMap.delete(ip);
      }
    }
  }
  
  if (!record || record.resetTime < now) {
    // New window
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetTime - now };
}

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
    // Check authentication status (optional - higher rate limits for authenticated users)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    let isAuthenticated = false;
    
    if (supabaseUrl && supabaseAnonKey) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false }
          });
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
          isAuthenticated = !!user;
        } catch {
          // Auth check failed, continue as anonymous
        }
      }
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Check rate limit (stricter for anonymous users)
    const rateLimit = checkRateLimit(clientIP, isAuthenticated);
    if (!rateLimit.allowed) {
      console.log("Rate limit exceeded", { authenticated: isAuthenticated, resetIn: rateLimit.resetIn });
      return new Response(
        JSON.stringify({ 
          error: "Trop de requêtes. Veuillez patienter avant de réessayer.",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000))
          } 
        }
      );
    }
    
    // Log request for monitoring (hashed IP for privacy compliance)
    // Using SHA-256 hash with salt prefix for proper anonymization
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`sommelier-${clientIP}`));
    const ipHash = new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));
    const shortHash = ipHash.substring(0, 12); // First 12 chars sufficient for debugging
    console.log("Chat request", { ipHash: shortHash, authenticated: isAuthenticated, remaining: rateLimit.remaining, timestamp: new Date().toISOString() });

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