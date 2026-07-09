import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

async function signPayload(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const webhookSecret = Deno.env.get("MOBILE_MONEY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!webhookSecret || !supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "webhook_not_configured" }, 500);
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-lpb-signature") || "";
    const expected = await signPayload(webhookSecret, rawBody);

    if (!timingSafeEqual(signature, expected)) {
      return jsonResponse({ error: "invalid_signature" }, 401);
    }

    const payload = JSON.parse(rawBody);
    const providerReference = String(payload.provider_reference || payload.external_reference || "");
    const providerStatus = String(payload.status || "");
    const providerResponse = payload.provider_response ?? payload;

    if (!providerReference) return jsonResponse({ error: "missing_provider_reference" }, 400);

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: intent, error: intentError } = await supabase
      .from("payment_intents")
      .select("id,order_id,amount,status")
      .eq("external_reference", providerReference)
      .single();

    if (intentError || !intent) return jsonResponse({ error: "payment_intent_not_found" }, 404);

    if (intent.status === "succeeded") {
      return jsonResponse({ success: true, alreadyProcessed: true });
    }

    const succeeded = ["success", "succeeded", "completed", "paid"].includes(providerStatus.toLowerCase());
    const failed = ["failed", "cancelled", "canceled", "expired"].includes(providerStatus.toLowerCase());

    if (!succeeded && !failed) {
      return jsonResponse({ success: true, ignored: true, status: providerStatus });
    }

    const nextStatus = succeeded ? "succeeded" : "failed";
    const { error: updateIntentError } = await supabase
      .from("payment_intents")
      .update({
        status: nextStatus,
        provider_response: providerResponse,
        processed_at: new Date().toISOString(),
        failure_reason: failed ? providerStatus : null,
      })
      .eq("id", intent.id);

    if (updateIntentError) return jsonResponse({ error: updateIntentError.message }, 400);

    if (succeeded && intent.order_id) {
      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ payment_status: "completed", status: "confirmed" })
        .eq("id", intent.order_id)
        .neq("status", "cancelled");

      if (updateOrderError) return jsonResponse({ error: updateOrderError.message }, 400);
    }

    return jsonResponse({ success: true, status: nextStatus });
  } catch (error) {
    console.error("mobile-money-webhook failed", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown_error" }, 500);
  }
});
