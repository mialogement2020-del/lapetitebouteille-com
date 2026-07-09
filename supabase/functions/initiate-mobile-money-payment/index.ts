import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "missing_supabase_configuration" }, 500);
    }

    const { orderId, paymentMethod, paymentPhone } = await req.json();
    if (!orderId || !["mtn_money", "orange_money"].includes(paymentMethod)) {
      return jsonResponse({ error: "invalid_payment_request" }, 400);
    }

    const phone = String(paymentPhone || "").replace(/[^0-9+]/g, "");
    if (phone.length < 9 || phone.length > 15) {
      return jsonResponse({ error: "invalid_payment_phone" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,user_id,total,payment_status,payment_method,order_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) return jsonResponse({ error: "order_not_found" }, 404);
    if (order.payment_status === "completed") {
      return jsonResponse({ success: true, alreadyCompleted: true });
    }
    if (order.payment_method !== paymentMethod) {
      return jsonResponse({ error: "payment_method_mismatch" }, 400);
    }

    const providerReference = `${paymentMethod.toUpperCase()}-${crypto.randomUUID()}`;

    const { data: paymentIntent, error: intentError } = await supabase
      .from("payment_intents")
      .insert({
        user_id: order.user_id,
        order_id: order.id,
        provider: paymentMethod === "mtn_money" ? "mtn" : "orange",
        method: paymentMethod,
        status: "pending",
        amount: order.total,
        currency: "XAF",
        external_reference: providerReference,
        metadata: {
          order_number: order.order_number,
          payment_phone: phone,
          initiated_by: "checkout",
        },
      })
      .select("id,external_reference,status")
      .single();

    if (intentError) return jsonResponse({ error: intentError.message }, 400);

    return jsonResponse({
      success: true,
      payment_intent_id: paymentIntent.id,
      provider_reference: paymentIntent.external_reference,
      status: paymentIntent.status,
      requires_provider_confirmation: true,
    });
  } catch (error) {
    console.error("initiate-mobile-money-payment failed", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown_error" }, 500);
  }
});
