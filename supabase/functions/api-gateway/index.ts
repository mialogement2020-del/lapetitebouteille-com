import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-forwarded-for",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

type Endpoint = {
  endpoint_key: string;
  module_key: string;
  path: string;
  http_method: string;
  status: string;
  route_type: "rpc" | "read_view" | "documentation" | "edge_function" | "webhook";
  target_name: string;
  auth_modes: string[];
  required_roles: string[];
  rate_limit_policy: { window_seconds?: number; max_requests?: number };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getJson(req: Request) {
  if (req.method === "GET") return {};
  const text = await req.text();
  if (!text.trim()) return {};
  return JSON.parse(text);
}

async function safeLog(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  try {
    await supabase.rpc("api_gateway_log_request", { _log: payload });
  } catch (error) {
    console.error("api_gateway_log_request_failed", error);
  }
}

async function getAuthContext(req: Request, supabase: ReturnType<typeof createClient>) {
  const apiKey = req.headers.get("x-api-key") ?? "";
  if (apiKey) {
    const keyPrefix = apiKey.slice(0, 8);
    const { data: keyRows } = await supabase
      .from("api_gateway_api_keys")
      .select("id,key_name,key_prefix,status,allowed_endpoint_keys,allowed_modules,expires_at")
      .eq("key_prefix", keyPrefix)
      .limit(1);
    const key = Array.isArray(keyRows) ? keyRows[0] : null;
    if (key && key.status === "active" && (!key.expires_at || new Date(key.expires_at).getTime() > Date.now())) {
      return { ok: true, mode: "api_key", userId: null, apiKeyId: key.id, identity: key.id, key };
    }
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  if (!token) return { ok: false, mode: "none", reason: "missing_authorization" };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { ok: false, mode: "jwt", reason: "invalid_authorization" };
  return { ok: true, mode: "jwt", userId: data.user.id, apiKeyId: null, identity: data.user.id };
}

async function hasRequiredRole(supabase: ReturnType<typeof createClient>, userId: string | null, roles: string[]) {
  if (!roles.length) return true;
  if (!userId) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", roles);
  return !error && Array.isArray(data) && data.length > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const requestUrl = new URL(req.url);
  const path = requestUrl.pathname.replace(/^\/api-gateway/, "") || requestUrl.pathname;
  const method = req.method.toUpperCase();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);
  let endpoint: Endpoint | null = null;
  let authContext: Awaited<ReturnType<typeof getAuthContext>> | null = null;
  let statusCode = 500;
  let responseBody: unknown = { ok: false, error: "internal_error" };

  try {
    const { data: endpoints, error: endpointError } = await supabase
      .from("api_gateway_endpoints")
      .select("*")
      .eq("path", path)
      .eq("http_method", method)
      .eq("status", "active")
      .limit(1);

    if (endpointError) throw endpointError;
    endpoint = Array.isArray(endpoints) ? endpoints[0] as Endpoint : null;
    if (!endpoint) {
      statusCode = 404;
      responseBody = { ok: false, error: "endpoint_not_registered", path, method };
      return jsonResponse(responseBody, statusCode);
    }

    authContext = await getAuthContext(req, supabase);
    if (!authContext.ok) {
      statusCode = 401;
      responseBody = { ok: false, error: authContext.reason };
      return jsonResponse(responseBody, statusCode);
    }

    if (!endpoint.auth_modes.includes(authContext.mode)) {
      statusCode = 403;
      responseBody = { ok: false, error: "auth_mode_not_allowed" };
      return jsonResponse(responseBody, statusCode);
    }

    const roleOk = await hasRequiredRole(supabase, authContext.userId, endpoint.required_roles || []);
    if (!roleOk) {
      statusCode = 403;
      responseBody = { ok: false, error: "role_not_allowed" };
      return jsonResponse(responseBody, statusCode);
    }

    const rate = endpoint.rate_limit_policy || {};
    const { data: rateLimit } = await supabase.rpc("api_gateway_check_rate_limit", {
      _endpoint_key: endpoint.endpoint_key,
      _identity_type: authContext.mode === "api_key" ? "api_key" : "user",
      _identity_value: authContext.identity,
      _window_seconds: rate.window_seconds ?? 60,
      _max_requests: rate.max_requests ?? 60,
    });
    if (rateLimit && rateLimit.allowed === false) {
      statusCode = 429;
      responseBody = { ok: false, error: "rate_limit_exceeded", rate_limit: rateLimit };
      return jsonResponse(responseBody, statusCode);
    }

    if (endpoint.route_type === "documentation" && endpoint.target_name === "gateway_health") {
      statusCode = 200;
      responseBody = { ok: true, gateway: "lpb-api-gateway", version: endpoint.version, endpoint_key: endpoint.endpoint_key };
      return jsonResponse(responseBody, statusCode);
    }

    if (endpoint.route_type === "read_view") {
      const { data, error } = await supabase.from(endpoint.target_name).select("*").limit(200);
      if (error) throw error;
      statusCode = 200;
      responseBody = { ok: true, endpoint_key: endpoint.endpoint_key, data };
      return jsonResponse(responseBody, statusCode);
    }

    if (endpoint.route_type === "rpc") {
      const body = await getJson(req);
      const args = body?.args && typeof body.args === "object" ? body.args : body;
      const { data, error } = await supabase.rpc(endpoint.target_name, args);
      if (error) throw error;
      statusCode = 200;
      responseBody = { ok: true, endpoint_key: endpoint.endpoint_key, data };
      return jsonResponse(responseBody, statusCode);
    }

    statusCode = 501;
    responseBody = { ok: false, error: "route_type_not_enabled_yet", route_type: endpoint.route_type };
    return jsonResponse(responseBody, statusCode);
  } catch (error) {
    statusCode = 500;
    responseBody = { ok: false, error: error instanceof Error ? error.message : String(error) };
    return jsonResponse(responseBody, statusCode);
  } finally {
    await safeLog(supabase, {
      endpoint_key: endpoint?.endpoint_key,
      module_key: endpoint?.module_key,
      api_key_id: authContext?.ok ? authContext.apiKeyId : null,
      user_id: authContext?.ok ? authContext.userId : null,
      auth_mode: authContext?.mode ?? "unknown",
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      http_method: method,
      path,
      status_code: statusCode,
      latency_ms: Date.now() - startedAt,
      request_summary: { query: Object.fromEntries(requestUrl.searchParams.entries()) },
      response_summary: { ok: statusCode < 400 },
    });
  }
});
