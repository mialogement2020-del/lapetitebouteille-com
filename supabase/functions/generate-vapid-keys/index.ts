import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  // Generate an ECDSA key pair on the P-256 curve (required for VAPID)
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export public key in raw format
  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyArray = new Uint8Array(publicKeyBuffer);
  
  // Export private key in PKCS8 format, then extract the raw 32-byte key
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  // The raw private key is the last 32 bytes of the PKCS8 export for P-256
  const rawPrivateKey = privateKeyArray.slice(-32);
  
  // Convert to URL-safe base64
  const publicKey = btoa(String.fromCharCode(...publicKeyArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
    
  const privateKey = btoa(String.fromCharCode(...rawPrivateKey))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return { publicKey, privateKey };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if VAPID keys already exist
    const existingPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const existingPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (existingPublicKey && existingPrivateKey) {
      // Keys already exist, return public key only
      return new Response(
        JSON.stringify({
          success: true,
          publicKey: existingPublicKey,
          message: "VAPID keys already configured",
          alreadyExists: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate new VAPID keys
    const { publicKey, privateKey } = await generateVapidKeys();

    console.log("Generated VAPID keys successfully");
    console.log("Public Key:", publicKey);
    console.log("Private Key length:", privateKey.length);

    // Note: In production, these keys should be stored as secrets
    // For now, we return them so they can be manually added as secrets
    return new Response(
      JSON.stringify({
        success: true,
        publicKey,
        privateKey,
        message: "VAPID keys generated. Please add these as secrets: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY",
        alreadyExists: false,
        instructions: [
          "1. Copy the publicKey and privateKey values",
          "2. Add them as secrets in your Supabase project",
          "3. Name them VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY respectively",
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error generating VAPID keys:", error);
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
