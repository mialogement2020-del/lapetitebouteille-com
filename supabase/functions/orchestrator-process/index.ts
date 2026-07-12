import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-orchestrator-secret",
};

const MAX_ATTEMPTS = 5;

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
  attempt_count?: number | null;
  next_attempt_at?: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAuthorized(req: Request, supabase: ReturnType<typeof createClient>) {
  const internalSecret = Deno.env.get("ORCHESTRATOR_INTERNAL_SECRET");
  const providedSecret = req.headers.get("x-orchestrator-secret");
  if (internalSecret && providedSecret && providedSecret === internalSecret) {
    return { ok: true, mode: "internal" };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  if (!token) return { ok: false, reason: "missing_authorization" };

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const userId = userData.user?.id;
  if (userError || !userId) return { ok: false, reason: "invalid_authorization" };

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) return { ok: false, reason: "admin_required" };
  return { ok: true, mode: "admin", userId };
}

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
  const lockedBy = `orchestrator-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const { data: event, error } = await supabase
    .from("domain_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<Event>();
  if (error || !event) return { processed: 0, error: error?.message ?? "event not found" };
  if (!["pending", "failed"].includes(event.status)) return { processed: 0, skipped: true };

  if (event.next_attempt_at && new Date(event.next_attempt_at).getTime() > Date.now()) {
    return { processed: 0, skipped: true, reason: "backoff_wait" };
  }

  const attemptCount = Number(event.attempt_count ?? 0) + 1;
  const { error: claimError } = await supabase
    .from("domain_events")
    .update({
      locked_at: now,
      locked_by: lockedBy,
      last_attempt_at: now,
      attempt_count: attemptCount,
      error: null,
    })
    .eq("id", event.id)
    .in("status", ["pending", "failed"]);
  if (claimError) return { processed: 0, error: claimError.message };

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

  const finishedAt = new Date().toISOString();
  const failedPermanently = Boolean(firstError) && attemptCount >= MAX_ATTEMPTS;
  const retryDelayMinutes = Math.min(60, 2 ** Math.max(0, attemptCount - 1));

  await supabase.from("domain_events").update(
    firstError
      ? {
          status: failedPermanently ? "dead_letter" : "failed",
          processed_at: null,
          error: firstError,
          next_attempt_at: failedPermanently
            ? null
            : new Date(Date.now() + retryDelayMinutes * 60_000).toISOString(),
          dead_letter_at: failedPermanently ? finishedAt : null,
          locked_at: null,
          locked_by: null,
        }
      : {
          status: "processed",
          processed_at: finishedAt,
          error: null,
          next_attempt_at: null,
          dead_letter_at: null,
          locked_at: null,
          locked_by: null,
        },
  ).eq("id", event.id);

  return {
    processed: 1,
    actionsRun,
    error: firstError,
    attemptCount,
    deadLetter: failedPermanently,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const auth = await isAuthorized(req, supabase);
    if (!auth.ok) {
      return jsonResponse({ error: auth.reason }, 401);
    }

    let body: { event_id?: number; backfill?: boolean } = {};
    try { body = await req.json(); } catch { /* GET or empty body */ }

    if (body.event_id) {
      const res = await processEvent(supabase, body.event_id);
      return jsonResponse(res);
    }

    // Backfill: process pending and retryable failed events (max 50)
    const retryCutoff = new Date().toISOString();
    const { data: pending } = await supabase
      .from("domain_events")
      .select("id")
      .in("status", ["pending", "failed"])
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${retryCutoff}`)
      .order("id", { ascending: true })
      .limit(50);

    let total = 0;
    for (const row of (pending ?? []) as Array<{ id: number }>) {
      const r = await processEvent(supabase, row.id);
      total += r.processed ?? 0;
    }

    return jsonResponse({ processed: total });
  } catch (e) {
    return jsonResponse({ error: String((e as Error).message) }, 500);
  }
});
