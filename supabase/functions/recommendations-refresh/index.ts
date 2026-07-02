import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key);

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body.user_id;

    const { data: affCount, error: aErr } = await supabase.rpc("refresh_product_affinities");
    if (aErr) throw aErr;

    let userCount = 0;
    if (userId) {
      const { data, error } = await supabase.rpc("compute_user_recommendations", { _user_id: userId });
      if (error) throw error;
      userCount = data ?? 0;
    } else {
      // Refresh for all users who bought something in last 60d
      const { data: users } = await supabase
        .from("orders")
        .select("user_id")
        .not("user_id", "is", null)
        .gte("created_at", new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString());
      const unique = Array.from(new Set((users ?? []).map((u: any) => u.user_id))).slice(0, 500);
      for (const uid of unique) {
        const { data } = await supabase.rpc("compute_user_recommendations", { _user_id: uid });
        userCount += data ?? 0;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, affinities: affCount, recommendations: userCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("recommendations-refresh error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});