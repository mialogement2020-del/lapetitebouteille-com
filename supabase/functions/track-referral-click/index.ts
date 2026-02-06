import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize: only allow alphanumeric, hyphen, underscore
    if (!/^[A-Za-z0-9_-]+$/.test(code)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid code format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for write access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Increment click counter
    const { data, error } = await supabase
      .from("referral_codes")
      .update({ 
        total_clicks: supabase.rpc("increment_clicks_helper", { _code: code })
      })
      .or(`code.eq.${code},custom_code.eq.${code}`)
      .eq("is_active", true)
      .select("total_clicks")
      .single();

    // Alternative: Direct SQL increment
    const { error: updateError } = await supabase.rpc("increment_referral_clicks", { _code: code });

    if (updateError) {
      console.error("Error incrementing clicks:", updateError);
      // Don't fail the request - tracking is non-critical
      return new Response(
        JSON.stringify({ success: true, tracked: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, tracked: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Track click error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
