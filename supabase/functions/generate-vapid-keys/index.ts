import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // VAPID public key is safe to share publicly - it's meant to be public
    // No authentication required for getting the public key

    // Get VAPID public key from environment (NEVER expose private key)
    const existingPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const existingPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (existingPublicKey && existingPrivateKey) {
      // Return ONLY the public key - NEVER return private key
      return new Response(
        JSON.stringify({
          success: true,
          publicKey: existingPublicKey,
          message: "VAPID public key retrieved",
          alreadyExists: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // If keys don't exist, return an error - they must be configured by admin
    console.log("VAPID keys not configured in environment");
    return new Response(
      JSON.stringify({
        success: false,
        error: "VAPID keys not configured. Contact administrator.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-vapid-keys:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
