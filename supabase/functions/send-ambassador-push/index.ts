import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AmbassadorPushRequest {
  userId: string;
  type: "commission" | "referral" | "bonus" | "rank";
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Create JWT for VAPID authentication
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKey: string
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const signatureInput = `${headerB64}.${payloadB64}`;
  const signatureInputBytes = encoder.encode(signatureInput);

  const privateKeyBytes = urlBase64ToUint8Array(privateKey);
  
  const pkcs8Header = new Uint8Array([
    0x30, 0x41,
    0x02, 0x01, 0x00,
    0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27,
    0x30, 0x25,
    0x02, 0x01, 0x01,
    0x04, 0x20,
  ]);
  
  const pkcs8Key = new Uint8Array(pkcs8Header.length + 32);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes.slice(0, 32), pkcs8Header.length);
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Key.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    signatureInputBytes
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signatureInput}.${signatureB64}`;
}

// Send push notification to a single subscription
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        TTL: "86400",
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed: ${response.status} - ${errorText}`);
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Push send error:", error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const ownerEmail = Deno.env.get("OWNER_EMAIL") || "noreply@lapetitebouteille.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log("VAPID keys not configured, skipping push notifications");
    return new Response(
      JSON.stringify({
        success: false,
        error: "VAPID keys not configured",
        skipped: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, type, title, body, data }: AmbassadorPushRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get subscriptions for this specific user
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No active push subscriptions for user ${userId}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active subscriptions for user",
          sent: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Choose icon based on notification type
    const icons: Record<string, string> = {
      commission: "💰",
      referral: "👥",
      bonus: "🎁",
      rank: "🏆",
    };

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `ambassador-${type}-${Date.now()}`,
      data: {
        ...data,
        type,
        url: "/ambassadeur",
      },
      timestamp: Date.now(),
    });

    // Send to all user's subscriptions
    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          notificationPayload,
          vapidPublicKey,
          vapidPrivateKey,
          `mailto:${ownerEmail}`
        )
      )
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Deactivate failed subscriptions
    const failedIndices = results
      .map((r, i) => (!r.success ? i : -1))
      .filter((i) => i >= 0);

    if (failedIndices.length > 0) {
      const failedSubIds = failedIndices.map((i) => subscriptions[i].id);
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("id", failedSubIds);
    }

    console.log(`Ambassador push notifications sent to ${userId}: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending ambassador push notifications:", error);
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