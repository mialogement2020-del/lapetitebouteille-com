import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Rule = {
  id: string;
  name: string;
  trigger_event: string;
  conditions: Array<{ path: string; op: string; value: unknown }>;
  actions: Array<{ type: string; params: Record<string, unknown> }>;
  priority: number;
};

type Event = {
  id: number;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string | null;
  payload: Record<string, unknown>;
  source: string | null;
  actor_id: string | null;
  status: string;
};

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function evalCondition(event: Event, cond: { path: string; op: string; value: unknown }): boolean {
  const actual = getByPath(event, cond.path);
  const expected = cond.value;
  switch (cond.op) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "gte": return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lte": return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "gt":  return typeof actual === "number" && typeof expected === "number" && actual >  expected;
    case "lt":  return typeof actual === "number" && typeof expected === "number" && actual <  expected;
    case "in":  return Array.isArray(expected) && expected.includes(actual as never);
    case "exists": return actual !== undefined && actual !== null;
    default: return false;
  }
}

async function runAction(
  supabase: ReturnType<typeof createClient>,
  event: Event,
  action: { type: string; params: Record<string, unknown> },
): Promise<{ ok: boolean; detail?: unknown }> {
  switch (action.type) {
    case "log": {
      console.log("[orchestrator]", action.params, "event:", event.event_type, event.aggregate_id);
      return { ok: true };
    }
    case "notify_admins": {
      // Insert an in-app notification for every admin
      const { data: admins, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) return { ok: false, detail: error.message };
      const title = String(action.params.title ?? "Notification système");
      const message = String(action.params.message ?? `Événement ${event.event_type}`);
      const rows = (admins ?? []).map((a: { user_id: string }) => ({
        user_id: a.user_id,
        type: "system",
        title,
        message,
        reference_type: event.aggregate_type,
        reference_id: event.aggregate_id,
      }));
      if (rows.length === 0) return { ok: true, detail: "no admins" };
      const { error: insErr } = await supabase.from("user_notifications").insert(rows);
      if (insErr) return { ok: false, detail: insErr.message };
      return { ok: true, detail: { notified: rows.length } };
    }
    case "notify_user": {
      const userId = (action.params.user_id as string) ?? (event.actor_id ?? undefined);
      if (!userId) return { ok: false, detail: "no user_id" };
      const { error } = await supabase.from("user_notifications").insert({
        user_id: userId,
        type: "system",
        title: String(action.params.title ?? "Notification"),
        message: String(action.params.message ?? ""),
        reference_type: event.aggregate_type,
        reference_id: event.aggregate_id,
      });
      if (error) return { ok: false, detail: error.message };
      return { ok: true };
    }
    default:
      return { ok: false, detail: `unknown action: ${action.type}` };
  }
}

async function processEvent(supabase: ReturnType<typeof createClient>, eventId: number) {
  const { data: event, error } = await supabase
    .from("domain_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<Event>();
  if (error || !event) return { processed: 0, error: error?.message ?? "event not found" };
  if (event.status !== "pending") return { processed: 0, skipped: true };

  const { data: rules } = await supabase
    .from("workflow_rules")
    .select("*")
    .eq("trigger_event", event.event_type)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  let actionsRun = 0;
  let firstError: string | null = null;

  for (const rule of (rules ?? []) as Rule[]) {
    const started = Date.now();
    const conditionsOk = (rule.conditions ?? []).every((c) => evalCondition(event, c));
    if (!conditionsOk) {
      await supabase.from("workflow_executions").insert({
        rule_id: rule.id,
        rule_name: rule.name,
        event_id: event.id,
        event_type: event.event_type,
        status: "skipped",
        actions_run: 0,
        duration_ms: Date.now() - started,
      });
      continue;
    }

    const results: Array<{ action: string; ok: boolean; detail?: unknown }> = [];
    let failed = false;
    for (const action of rule.actions ?? []) {
      const res = await runAction(supabase, event, action);
      results.push({ action: action.type, ...res });
      if (res.ok) actionsRun += 1;
      else { failed = true; firstError = firstError ?? String(res.detail); }
    }

    await supabase.from("workflow_executions").insert({
      rule_id: rule.id,
      rule_name: rule.name,
      event_id: event.id,
      event_type: event.event_type,
      status: failed ? "failed" : "success",
      actions_run: results.filter((r) => r.ok).length,
      error: failed ? firstError : null,
      result: results as never,
      duration_ms: Date.now() - started,
    });

    await supabase
      .from("workflow_rules")
      .update({ run_count: ((rule as unknown as { run_count?: number }).run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
      .eq("id", rule.id);
  }

  await supabase
    .from("domain_events")
    .update({
      status: firstError ? "failed" : "processed",
      processed_at: new Date().toISOString(),
      error: firstError,
    })
    .eq("id", event.id);

  return { processed: 1, actionsRun, error: firstError };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let body: { event_id?: number; backfill?: boolean } = {};
    try { body = await req.json(); } catch { /* GET or empty body */ }

    if (body.event_id) {
      const res = await processEvent(supabase, body.event_id);
      return new Response(JSON.stringify(res), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Backfill: process pending events (max 50)
    const { data: pending } = await supabase
      .from("domain_events")
      .select("id")
      .eq("status", "pending")
      .order("id", { ascending: true })
      .limit(50);

    let total = 0;
    for (const row of (pending ?? []) as Array<{ id: number }>) {
      const r = await processEvent(supabase, row.id);
      total += r.processed ?? 0;
    }

    return new Response(JSON.stringify({ processed: total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});