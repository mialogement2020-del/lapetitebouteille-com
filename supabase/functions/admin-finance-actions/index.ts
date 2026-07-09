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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "missing_authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ error: "missing_supabase_configuration" }, 500);
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) return jsonResponse({ error: "not_authorized" }, 403);

    try {
      const { data: twoFaEnabled } = await supabaseAdmin.rpc("has_2fa_enabled", {
        _user_id: user.id,
      });
      if (twoFaEnabled) {
        const { data: sessionValid } = await supabaseAdmin.rpc("is_2fa_session_valid", {
          _user_id: user.id,
        });
        if (!sessionValid) return jsonResponse({ error: "2fa_required" }, 403);
      }
    } catch (error) {
      console.warn("2FA check skipped because helper is unavailable", error);
    }

    const body = await req.json();
    const action = String(body.action || "");
    const escrowId = String(body.escrowId || "");
    const reason = typeof body.reason === "string" ? body.reason : null;

    if (action === "auto_release_delivered_escrows") {
      const { data, error } = await supabaseAdmin.rpc("auto_release_delivered_escrows");
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true, data });
    }

    if (!escrowId) return jsonResponse({ error: "missing_escrow_id" }, 400);

    if (action === "capture_escrow") {
      const { data, error } = await supabaseAdmin.rpc("capture_escrow", {
        _escrow_id: escrowId,
        _reason: reason,
      });
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true, data });
    }

    if (action === "refund_escrow") {
      const amount =
        body.amount === null || body.amount === undefined || body.amount === ""
          ? null
          : Number(body.amount);

      if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
        return jsonResponse({ error: "invalid_refund_amount" }, 400);
      }

      const { data, error } = await supabaseAdmin.rpc("refund_escrow", {
        _escrow_id: escrowId,
        _amount: amount,
        _reason: reason,
      });
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true, data });
    }

    return jsonResponse({ error: "unsupported_action" }, 400);
  } catch (error) {
    console.error("admin-finance-actions failed", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown_error" }, 500);
  }
});
