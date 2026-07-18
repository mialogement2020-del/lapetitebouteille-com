-- P4.2 API & Integration Gateway.
-- Architecture foundation only: no P0 financial mutation.

CREATE OR REPLACE FUNCTION public.api_gateway_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.api_gateway_mask_secret(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _value IS NULL OR length(_value) < 10 THEN NULL
    ELSE left(_value, 6) || repeat('*', greatest(length(_value) - 10, 0)) || right(_value, 4)
  END
$$;

CREATE TABLE IF NOT EXISTS public.api_gateway_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_key text NOT NULL UNIQUE,
  module_key text NOT NULL REFERENCES public.platform_extension_modules(module_key) ON DELETE RESTRICT,
  capability_key text REFERENCES public.platform_capability_registry(capability_key) ON DELETE SET NULL,
  path text NOT NULL,
  http_method text NOT NULL CHECK (http_method IN ('GET','POST','PUT','PATCH','DELETE')),
  version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','deprecated','disabled')),
  route_type text NOT NULL DEFAULT 'rpc' CHECK (route_type IN ('rpc','edge_function','read_view','webhook','documentation')),
  target_name text NOT NULL,
  auth_modes text[] NOT NULL DEFAULT ARRAY['jwt']::text[],
  required_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  required_permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  request_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_policy jsonb NOT NULL DEFAULT '{"strict_input":true,"strict_output":false}'::jsonb,
  rate_limit_policy jsonb NOT NULL DEFAULT '{"window_seconds":60,"max_requests":60}'::jsonb,
  observability_policy jsonb NOT NULL DEFAULT '{"log_requests":true,"record_latency":true}'::jsonb,
  documentation jsonb NOT NULL DEFAULT '{}'::jsonb,
  deprecation_notice text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_gateway_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  owner_user_id uuid,
  owner_label text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired','rotating')),
  allowed_endpoint_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  allowed_modules text[] NOT NULL DEFAULT ARRAY[]::text[],
  allowed_ips inet[] NOT NULL DEFAULT ARRAY[]::inet[],
  expires_at timestamptz,
  last_used_at timestamptz,
  rotated_from_key_id uuid REFERENCES public.api_gateway_api_keys(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  revoked_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_gateway_request_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  endpoint_key text,
  module_key text,
  api_key_id uuid REFERENCES public.api_gateway_api_keys(id) ON DELETE SET NULL,
  user_id uuid,
  auth_mode text NOT NULL DEFAULT 'unknown',
  ip_address inet,
  http_method text,
  path text,
  status_code integer,
  latency_ms integer,
  request_size_bytes integer,
  response_size_bytes integer,
  error_code text,
  error_message text,
  request_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_gateway_rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL UNIQUE,
  endpoint_key text,
  identity_type text NOT NULL CHECK (identity_type IN ('user','api_key','ip','role','anonymous')),
  identity_value text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  window_seconds integer NOT NULL DEFAULT 60 CHECK (window_seconds > 0),
  max_requests integer NOT NULL DEFAULT 60 CHECK (max_requests > 0),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_gateway_webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_key text NOT NULL UNIQUE,
  owner_label text NOT NULL,
  target_url text NOT NULL,
  event_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled','failing')),
  signing_secret_hash text NOT NULL,
  signing_secret_prefix text,
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  retry_policy jsonb NOT NULL DEFAULT '{"base_delay_seconds":60,"max_delay_seconds":3600}'::jsonb,
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  disabled_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_gateway_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  event_version text NOT NULL DEFAULT 'v1',
  aggregate_type text,
  aggregate_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_module_key text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','delivered','partially_delivered','failed','cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_gateway_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.api_gateway_webhook_events(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.api_gateway_webhook_subscriptions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','failed','dead_letter','cancelled')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_attempt_at timestamptz,
  last_status_code integer,
  last_error text,
  signature_preview text,
  response_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_api_gateway_endpoints_status ON public.api_gateway_endpoints(status, module_key);
CREATE INDEX IF NOT EXISTS idx_api_gateway_request_logs_endpoint ON public.api_gateway_request_logs(endpoint_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_gateway_request_logs_user ON public.api_gateway_request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_gateway_webhook_deliveries_status ON public.api_gateway_webhook_deliveries(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_api_gateway_webhook_events_key ON public.api_gateway_webhook_events(event_key, created_at DESC);

CREATE OR REPLACE FUNCTION public.api_gateway_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_api_gateway_endpoints_touch ON public.api_gateway_endpoints;
CREATE TRIGGER trg_api_gateway_endpoints_touch
  BEFORE UPDATE ON public.api_gateway_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.api_gateway_touch_updated_at();

DROP TRIGGER IF EXISTS trg_api_gateway_api_keys_touch ON public.api_gateway_api_keys;
CREATE TRIGGER trg_api_gateway_api_keys_touch
  BEFORE UPDATE ON public.api_gateway_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.api_gateway_touch_updated_at();

DROP TRIGGER IF EXISTS trg_api_gateway_webhook_subscriptions_touch ON public.api_gateway_webhook_subscriptions;
CREATE TRIGGER trg_api_gateway_webhook_subscriptions_touch
  BEFORE UPDATE ON public.api_gateway_webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.api_gateway_touch_updated_at();

DROP TRIGGER IF EXISTS trg_api_gateway_webhook_deliveries_touch ON public.api_gateway_webhook_deliveries;
CREATE TRIGGER trg_api_gateway_webhook_deliveries_touch
  BEFORE UPDATE ON public.api_gateway_webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.api_gateway_touch_updated_at();

CREATE OR REPLACE FUNCTION public.api_gateway_history_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'api_gateway_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_api_gateway_request_logs_append_only_update ON public.api_gateway_request_logs;
CREATE TRIGGER trg_api_gateway_request_logs_append_only_update
  BEFORE UPDATE ON public.api_gateway_request_logs
  FOR EACH ROW EXECUTE FUNCTION public.api_gateway_history_is_append_only();

DROP TRIGGER IF EXISTS trg_api_gateway_request_logs_append_only_delete ON public.api_gateway_request_logs;
CREATE TRIGGER trg_api_gateway_request_logs_append_only_delete
  BEFORE DELETE ON public.api_gateway_request_logs
  FOR EACH ROW EXECUTE FUNCTION public.api_gateway_history_is_append_only();

DROP TRIGGER IF EXISTS trg_api_gateway_webhook_events_append_only_update ON public.api_gateway_webhook_events;
CREATE TRIGGER trg_api_gateway_webhook_events_append_only_update
  BEFORE UPDATE ON public.api_gateway_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.api_gateway_history_is_append_only();

DROP TRIGGER IF EXISTS trg_api_gateway_webhook_events_append_only_delete ON public.api_gateway_webhook_events;
CREATE TRIGGER trg_api_gateway_webhook_events_append_only_delete
  BEFORE DELETE ON public.api_gateway_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.api_gateway_history_is_append_only();

INSERT INTO public.platform_extension_modules(
  module_key, name, description, version, status, logical_owner, dependencies, provided_capabilities,
  produced_events, consumed_events, required_permissions, routes, rpc_functions, edge_functions, primary_tables,
  documentation_path, contract_version, can_be_disabled, metadata
)
VALUES
  (
    'p42_api_integration_gateway',
    'P4.2 API & Integration Gateway',
    'Passerelle versionnee pour API internes, webhooks, rate limiting, journaux et contrats integration.',
    'p4.2',
    'active',
    'architecture',
    ARRAY['p4_extension_framework','p3_governance_operations'],
    ARRAY['api.gateway.route','api.registry.manage','webhook.subscription.manage','rate_limit.evaluate','api.documentation.generate'],
    ARRAY['api.request.logged','webhook.event.queued','webhook.delivery.failed'],
    ARRAY['architecture.registry.updated','observability.alert.created'],
    ARRAY['admin'],
    ARRAY['/admin?tab=api-gateway'],
    ARRAY['admin_register_api_gateway_endpoint','api_gateway_check_rate_limit','api_gateway_log_request','api_gateway_enqueue_webhook_event'],
    ARRAY['api-gateway'],
    ARRAY['api_gateway_endpoints','api_gateway_request_logs','api_gateway_webhook_subscriptions','api_gateway_webhook_deliveries'],
    'docs/architecture/api-gateway.md',
    'v1',
    false,
    '{"mode":"progressive","p0_mutation_allowed":false}'::jsonb
  )
ON CONFLICT (module_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    logical_owner = EXCLUDED.logical_owner,
    dependencies = EXCLUDED.dependencies,
    provided_capabilities = EXCLUDED.provided_capabilities,
    produced_events = EXCLUDED.produced_events,
    consumed_events = EXCLUDED.consumed_events,
    required_permissions = EXCLUDED.required_permissions,
    routes = EXCLUDED.routes,
    rpc_functions = EXCLUDED.rpc_functions,
    edge_functions = EXCLUDED.edge_functions,
    primary_tables = EXCLUDED.primary_tables,
    documentation_path = EXCLUDED.documentation_path,
    contract_version = EXCLUDED.contract_version,
    metadata = EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.platform_capability_registry(
  capability_key, module_key, description, version, access_type, required_permission, status, dependencies, input_contract, output_contract, documentation_path
)
VALUES
  ('api.gateway.route', 'p42_api_integration_gateway', 'Route les requetes integration vers des contrats declares.', 'v1', 'service', 'admin', 'active', ARRAY[]::text[], '{"path":"text","method":"text"}'::jsonb, '{"ok":"boolean"}'::jsonb, 'docs/architecture/api-gateway.md#routing'),
  ('api.registry.manage', 'p42_api_integration_gateway', 'Declare endpoints, schemas, permissions et versions.', 'v1', 'admin', 'admin', 'active', ARRAY[]::text[], '{"endpoint":"object"}'::jsonb, '{"endpoint_key":"text"}'::jsonb, 'docs/architecture/api-gateway.md#registry'),
  ('webhook.subscription.manage', 'p42_api_integration_gateway', 'Gere abonnements, signatures, retries et desactivation automatique.', 'v1', 'admin', 'admin', 'active', ARRAY['api.gateway.route'], '{"event_key":"text","payload":"object"}'::jsonb, '{"event_id":"uuid","deliveries":"integer"}'::jsonb, 'docs/architecture/api-gateway.md#webhooks'),
  ('rate_limit.evaluate', 'p42_api_integration_gateway', 'Evalue quotas par endpoint et identite.', 'v1', 'service', 'admin', 'active', ARRAY['api.gateway.route'], '{"identity":"text","endpoint":"text"}'::jsonb, '{"allowed":"boolean","remaining":"integer"}'::jsonb, 'docs/architecture/api-gateway.md#rate-limits'),
  ('api.documentation.generate', 'p42_api_integration_gateway', 'Expose une documentation OpenAPI issue du registre.', 'v1', 'admin', 'admin', 'active', ARRAY['api.registry.manage'], '{"format":"openapi"}'::jsonb, '{"spec":"object"}'::jsonb, 'docs/api/openapi-lpb-gateway.json')
ON CONFLICT (capability_key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    description = EXCLUDED.description,
    version = EXCLUDED.version,
    access_type = EXCLUDED.access_type,
    required_permission = EXCLUDED.required_permission,
    status = EXCLUDED.status,
    dependencies = EXCLUDED.dependencies,
    input_contract = EXCLUDED.input_contract,
    output_contract = EXCLUDED.output_contract,
    documentation_path = EXCLUDED.documentation_path,
    updated_at = now();

INSERT INTO public.platform_event_catalog(
  event_key, version, producer_module_key, description, payload_schema, required_fields, optional_fields, sensitivity_level, retention_policy, known_consumers, status
)
VALUES
  ('api.request.logged', 'v1', 'p42_api_integration_gateway', 'Une requete API gateway a ete journalisee.', '{"type":"object","required":["endpoint_key","status_code"]}'::jsonb, ARRAY['endpoint_key','status_code'], ARRAY['latency_ms','user_id','api_key_id'], 'internal', '24 months', ARRAY['platform_observability'], 'active'),
  ('webhook.event.queued', 'v1', 'p42_api_integration_gateway', 'Un evenement webhook a ete mis en file.', '{"type":"object","required":["event_key"]}'::jsonb, ARRAY['event_key'], ARRAY['aggregate_id','source_module_key'], 'internal', '24 months', ARRAY['platform_observability'], 'active'),
  ('webhook.delivery.failed', 'v1', 'p42_api_integration_gateway', 'Une livraison webhook a echoue.', '{"type":"object","required":["subscription_id","attempt_count"]}'::jsonb, ARRAY['subscription_id','attempt_count'], ARRAY['last_status_code','last_error'], 'internal', '24 months', ARRAY['platform_observability'], 'active')
ON CONFLICT (event_key, version) DO UPDATE
SET producer_module_key = EXCLUDED.producer_module_key,
    description = EXCLUDED.description,
    payload_schema = EXCLUDED.payload_schema,
    required_fields = EXCLUDED.required_fields,
    optional_fields = EXCLUDED.optional_fields,
    sensitivity_level = EXCLUDED.sensitivity_level,
    retention_policy = EXCLUDED.retention_policy,
    known_consumers = EXCLUDED.known_consumers,
    status = EXCLUDED.status,
    updated_at = now();

INSERT INTO public.api_gateway_endpoints(
  endpoint_key, module_key, capability_key, path, http_method, version, status, route_type, target_name,
  auth_modes, required_roles, required_permissions, request_schema, response_schema, rate_limit_policy, documentation
)
VALUES
  ('gateway.health.v1', 'p42_api_integration_gateway', 'api.gateway.route', '/gateway/v1/health', 'GET', 'v1', 'active', 'documentation', 'gateway_health', ARRAY['jwt','api_key'], ARRAY[]::text[], ARRAY[]::text[], '{"type":"object"}'::jsonb, '{"type":"object","required":["ok"]}'::jsonb, '{"window_seconds":60,"max_requests":120}'::jsonb, '{"summary":"Health check gateway"}'::jsonb),
  ('gateway.registry.v1', 'p42_api_integration_gateway', 'api.registry.manage', '/gateway/v1/registry', 'GET', 'v1', 'active', 'read_view', 'admin_api_gateway_endpoints', ARRAY['jwt'], ARRAY['admin'], ARRAY['admin'], '{"type":"object"}'::jsonb, '{"type":"array"}'::jsonb, '{"window_seconds":60,"max_requests":60}'::jsonb, '{"summary":"Liste les endpoints declares"}'::jsonb),
  ('webhooks.enqueue.v1', 'p42_api_integration_gateway', 'webhook.subscription.manage', '/gateway/v1/webhooks/enqueue', 'POST', 'v1', 'active', 'rpc', 'api_gateway_enqueue_webhook_event', ARRAY['jwt'], ARRAY['admin'], ARRAY['admin'], '{"type":"object","required":["event_key","payload"]}'::jsonb, '{"type":"object","required":["event_id","deliveries"]}'::jsonb, '{"window_seconds":60,"max_requests":40}'::jsonb, '{"summary":"Ajoute un evenement webhook compatible Event Catalog"}'::jsonb),
  ('observability.scan.v1', 'p3_governance_operations', 'observability.metric.record', '/gateway/v1/observability/scan', 'POST', 'v1', 'active', 'rpc', 'scan_platform_observability', ARRAY['jwt'], ARRAY['admin'], ARRAY['admin'], '{"type":"object"}'::jsonb, '{"type":"object"}'::jsonb, '{"window_seconds":60,"max_requests":10}'::jsonb, '{"summary":"Declenche un scan observability via gateway"}'::jsonb),
  ('extension.flags.read.v1', 'p4_extension_framework', 'feature.flag.evaluate', '/gateway/v1/extensions/flags', 'GET', 'v1', 'active', 'read_view', 'admin_platform_feature_flags', ARRAY['jwt'], ARRAY['admin'], ARRAY['admin'], '{"type":"object"}'::jsonb, '{"type":"array"}'::jsonb, '{"window_seconds":60,"max_requests":60}'::jsonb, '{"summary":"Expose les feature flags P4.1 en lecture admin"}'::jsonb)
ON CONFLICT (endpoint_key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    capability_key = EXCLUDED.capability_key,
    path = EXCLUDED.path,
    http_method = EXCLUDED.http_method,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    route_type = EXCLUDED.route_type,
    target_name = EXCLUDED.target_name,
    auth_modes = EXCLUDED.auth_modes,
    required_roles = EXCLUDED.required_roles,
    required_permissions = EXCLUDED.required_permissions,
    request_schema = EXCLUDED.request_schema,
    response_schema = EXCLUDED.response_schema,
    rate_limit_policy = EXCLUDED.rate_limit_policy,
    documentation = EXCLUDED.documentation,
    updated_at = now();

INSERT INTO public.platform_rpc_contracts(
  rpc_name, module_key, purpose, version, status, parameters, return_contract, required_permissions, error_behavior, idempotency, logging_policy, documentation_path
)
VALUES
  ('admin_register_api_gateway_endpoint', 'p42_api_integration_gateway', 'Cree ou met a jour un endpoint gateway declare.', 'v1', 'active', '{"endpoint_key":"text","path":"text"}'::jsonb, '{"endpoint_key":"text","status":"registered"}'::jsonb, ARRAY['admin'], '{"raises":["admin_required","endpoint_key_required"]}'::jsonb, 'supported', 'standard', 'docs/architecture/api-gateway.md#registry'),
  ('api_gateway_check_rate_limit', 'p42_api_integration_gateway', 'Evalue et incremente un bucket de rate limiting.', 'v1', 'active', '{"endpoint_key":"text","identity_type":"text","identity_value":"text"}'::jsonb, '{"allowed":"boolean","remaining":"number"}'::jsonb, ARRAY['service_role'], '{"raises":[]}'::jsonb, 'supported', 'standard', 'docs/architecture/api-gateway.md#rate-limits'),
  ('api_gateway_log_request', 'p42_api_integration_gateway', 'Journalise une requete gateway de maniere append-only.', 'v1', 'active', '{"endpoint_key":"text","status_code":"number"}'::jsonb, '{"request_id":"uuid"}'::jsonb, ARRAY['service_role'], '{"append_only":true}'::jsonb, 'not_required', 'audit', 'docs/architecture/api-gateway.md#logs'),
  ('api_gateway_enqueue_webhook_event', 'p42_api_integration_gateway', 'Cree un evenement webhook et les livraisons associees.', 'v1', 'active', '{"event_key":"text","payload":"jsonb"}'::jsonb, '{"event_id":"uuid","deliveries":"number"}'::jsonb, ARRAY['admin','service_role'], '{"raises":["event_not_declared_in_catalog"]}'::jsonb, 'supported', 'audit', 'docs/architecture/api-gateway.md#webhooks')
ON CONFLICT (rpc_name) DO UPDATE
SET module_key = EXCLUDED.module_key,
    purpose = EXCLUDED.purpose,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    parameters = EXCLUDED.parameters,
    return_contract = EXCLUDED.return_contract,
    required_permissions = EXCLUDED.required_permissions,
    error_behavior = EXCLUDED.error_behavior,
    idempotency = EXCLUDED.idempotency,
    logging_policy = EXCLUDED.logging_policy,
    documentation_path = EXCLUDED.documentation_path,
    updated_at = now();

INSERT INTO public.platform_edge_function_contracts(
  function_name, module_key, purpose, version, status, auth_policy, authorization_policy, input_contract, output_contract, timeout_ms, retry_policy, metrics, documentation_path
)
VALUES
  ('api-gateway', 'p42_api_integration_gateway', 'Point entree unifie pour integrations versionnees.', 'v1', 'active', 'JWT or x-api-key', 'Endpoint registry + RLS target + role checks', '{"path":"string","method":"string","body":"object"}'::jsonb, '{"ok":"boolean"}'::jsonb, 30000, '{"mode":"caller_retry"}'::jsonb, '{"logs":true,"latency":true,"rate_limits":true}'::jsonb, 'docs/architecture/api-gateway.md#edge-function')
ON CONFLICT (function_name) DO UPDATE
SET module_key = EXCLUDED.module_key,
    purpose = EXCLUDED.purpose,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    auth_policy = EXCLUDED.auth_policy,
    authorization_policy = EXCLUDED.authorization_policy,
    input_contract = EXCLUDED.input_contract,
    output_contract = EXCLUDED.output_contract,
    timeout_ms = EXCLUDED.timeout_ms,
    retry_policy = EXCLUDED.retry_policy,
    metrics = EXCLUDED.metrics,
    documentation_path = EXCLUDED.documentation_path,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.admin_register_api_gateway_endpoint(_endpoint jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_endpoint_key text := _endpoint->>'endpoint_key';
BEGIN
  IF NOT public.api_gateway_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF COALESCE(v_endpoint_key, '') = '' THEN
    RAISE EXCEPTION 'endpoint_key_required';
  END IF;

  INSERT INTO public.api_gateway_endpoints(
    endpoint_key, module_key, capability_key, path, http_method, version, status, route_type, target_name,
    auth_modes, required_roles, required_permissions, request_schema, response_schema, validation_policy,
    rate_limit_policy, observability_policy, documentation, deprecation_notice, created_by, updated_by
  )
  VALUES (
    v_endpoint_key,
    COALESCE(_endpoint->>'module_key', 'p42_api_integration_gateway'),
    _endpoint->>'capability_key',
    COALESCE(_endpoint->>'path', '/gateway/v1/' || v_endpoint_key),
    upper(COALESCE(_endpoint->>'http_method', 'POST')),
    COALESCE(_endpoint->>'version', 'v1'),
    COALESCE(_endpoint->>'status', 'draft'),
    COALESCE(_endpoint->>'route_type', 'rpc'),
    COALESCE(_endpoint->>'target_name', v_endpoint_key),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_endpoint->'auth_modes')), ARRAY['jwt']::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_endpoint->'required_roles')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_endpoint->'required_permissions')), ARRAY[]::text[]),
    COALESCE(_endpoint->'request_schema', '{}'::jsonb),
    COALESCE(_endpoint->'response_schema', '{}'::jsonb),
    COALESCE(_endpoint->'validation_policy', '{"strict_input":true}'::jsonb),
    COALESCE(_endpoint->'rate_limit_policy', '{"window_seconds":60,"max_requests":60}'::jsonb),
    COALESCE(_endpoint->'observability_policy', '{"log_requests":true}'::jsonb),
    COALESCE(_endpoint->'documentation', '{}'::jsonb),
    _endpoint->>'deprecation_notice',
    auth.uid(),
    auth.uid()
  )
  ON CONFLICT (endpoint_key) DO UPDATE
  SET module_key = EXCLUDED.module_key,
      capability_key = EXCLUDED.capability_key,
      path = EXCLUDED.path,
      http_method = EXCLUDED.http_method,
      version = EXCLUDED.version,
      status = EXCLUDED.status,
      route_type = EXCLUDED.route_type,
      target_name = EXCLUDED.target_name,
      auth_modes = EXCLUDED.auth_modes,
      required_roles = EXCLUDED.required_roles,
      required_permissions = EXCLUDED.required_permissions,
      request_schema = EXCLUDED.request_schema,
      response_schema = EXCLUDED.response_schema,
      validation_policy = EXCLUDED.validation_policy,
      rate_limit_policy = EXCLUDED.rate_limit_policy,
      observability_policy = EXCLUDED.observability_policy,
      documentation = EXCLUDED.documentation,
      deprecation_notice = EXCLUDED.deprecation_notice,
      updated_by = auth.uid(),
      updated_at = now();

  RETURN jsonb_build_object('endpoint_key', v_endpoint_key, 'status', 'registered');
END;
$$;

CREATE OR REPLACE FUNCTION public.api_gateway_check_rate_limit(
  _endpoint_key text,
  _identity_type text,
  _identity_value text,
  _window_seconds integer DEFAULT 60,
  _max_requests integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket_key text := concat_ws(':', _endpoint_key, _identity_type, _identity_value, floor(extract(epoch FROM now()) / greatest(_window_seconds, 1))::bigint);
  v_bucket public.api_gateway_rate_limit_buckets%ROWTYPE;
BEGIN
  INSERT INTO public.api_gateway_rate_limit_buckets(
    bucket_key, endpoint_key, identity_type, identity_value, window_seconds, max_requests, request_count
  )
  VALUES (
    v_bucket_key, _endpoint_key, _identity_type, COALESCE(_identity_value, 'anonymous'), greatest(_window_seconds, 1), greatest(_max_requests, 1), 1
  )
  ON CONFLICT (bucket_key) DO UPDATE
  SET request_count = public.api_gateway_rate_limit_buckets.request_count + 1,
      updated_at = now()
  RETURNING * INTO v_bucket;

  RETURN jsonb_build_object(
    'allowed', v_bucket.request_count <= v_bucket.max_requests AND COALESCE(v_bucket.blocked_until, now() - interval '1 second') <= now(),
    'request_count', v_bucket.request_count,
    'remaining', greatest(v_bucket.max_requests - v_bucket.request_count, 0),
    'reset_at', v_bucket.window_started_at + make_interval(secs => v_bucket.window_seconds)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.api_gateway_log_request(_log jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid := COALESCE((_log->>'request_id')::uuid, gen_random_uuid());
BEGIN
  INSERT INTO public.api_gateway_request_logs(
    request_id, endpoint_key, module_key, api_key_id, user_id, auth_mode, ip_address, http_method, path,
    status_code, latency_ms, request_size_bytes, response_size_bytes, error_code, error_message,
    request_summary, response_summary
  )
  VALUES (
    v_request_id,
    _log->>'endpoint_key',
    _log->>'module_key',
    NULLIF(_log->>'api_key_id', '')::uuid,
    NULLIF(_log->>'user_id', '')::uuid,
    COALESCE(_log->>'auth_mode', 'unknown'),
    NULLIF(_log->>'ip_address', '')::inet,
    _log->>'http_method',
    _log->>'path',
    NULLIF(_log->>'status_code', '')::integer,
    NULLIF(_log->>'latency_ms', '')::integer,
    NULLIF(_log->>'request_size_bytes', '')::integer,
    NULLIF(_log->>'response_size_bytes', '')::integer,
    _log->>'error_code',
    _log->>'error_message',
    COALESCE(_log->'request_summary', '{}'::jsonb),
    COALESCE(_log->'response_summary', '{}'::jsonb)
  );

  RETURN jsonb_build_object('request_id', v_request_id, 'logged', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.api_gateway_enqueue_webhook_event(
  _event_key text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _aggregate_type text DEFAULT NULL,
  _aggregate_id text DEFAULT NULL,
  _source_module_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_delivery_count integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.api_gateway_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.platform_event_catalog
    WHERE event_key = _event_key
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'event_not_declared_in_catalog';
  END IF;

  SELECT count(*)::integer INTO v_delivery_count
  FROM public.api_gateway_webhook_subscriptions s
  WHERE s.status = 'active'
    AND _event_key = ANY(s.event_keys);

  INSERT INTO public.api_gateway_webhook_events(
    event_key, payload, aggregate_type, aggregate_id, source_module_key, status, created_by
  )
  VALUES (
    _event_key,
    COALESCE(_payload, '{}'::jsonb),
    _aggregate_type,
    _aggregate_id,
    _source_module_key,
    CASE WHEN v_delivery_count > 0 THEN 'queued' ELSE 'cancelled' END,
    auth.uid()
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.api_gateway_webhook_deliveries(event_id, subscription_id, signature_preview)
  SELECT v_event_id, s.id, public.api_gateway_mask_secret(s.signing_secret_prefix || ':' || v_event_id::text)
  FROM public.api_gateway_webhook_subscriptions s
  WHERE s.status = 'active'
    AND _event_key = ANY(s.event_keys)
  ON CONFLICT (event_id, subscription_id) DO NOTHING;

  GET DIAGNOSTICS v_delivery_count = ROW_COUNT;

  RETURN jsonb_build_object('event_id', v_event_id, 'deliveries', v_delivery_count);
END;
$$;

CREATE OR REPLACE VIEW public.admin_api_gateway_overview AS
SELECT
  (SELECT count(*) FROM public.api_gateway_endpoints)::integer AS endpoints_count,
  (SELECT count(*) FROM public.api_gateway_endpoints WHERE status = 'active')::integer AS active_endpoints_count,
  (SELECT count(*) FROM public.api_gateway_api_keys WHERE status = 'active')::integer AS active_api_keys_count,
  (SELECT count(*) FROM public.api_gateway_webhook_subscriptions WHERE status = 'active')::integer AS active_webhooks_count,
  (SELECT count(*) FROM public.api_gateway_request_logs WHERE created_at >= now() - interval '24 hours')::integer AS requests_24h,
  (SELECT count(*) FROM public.api_gateway_request_logs WHERE status_code >= 400 AND created_at >= now() - interval '24 hours')::integer AS errors_24h,
  (SELECT count(*) FROM public.api_gateway_webhook_deliveries WHERE status IN ('pending','processing','failed'))::integer AS webhook_queue_count,
  (SELECT count(*) FROM public.api_gateway_webhook_deliveries WHERE status = 'dead_letter')::integer AS dead_letter_count
WHERE public.api_gateway_is_admin();

CREATE OR REPLACE VIEW public.admin_api_gateway_endpoints AS
SELECT e.*, m.name AS module_name, c.description AS capability_name
FROM public.api_gateway_endpoints e
JOIN public.platform_extension_modules m ON m.module_key = e.module_key
LEFT JOIN public.platform_capability_registry c ON c.capability_key = e.capability_key
WHERE public.api_gateway_is_admin();

CREATE OR REPLACE VIEW public.admin_api_gateway_request_logs AS
SELECT *
FROM public.api_gateway_request_logs
WHERE public.api_gateway_is_admin()
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.admin_api_gateway_webhooks AS
SELECT
  s.*,
  (SELECT count(*) FROM public.api_gateway_webhook_deliveries d WHERE d.subscription_id = s.id)::integer AS delivery_count,
  (SELECT count(*) FROM public.api_gateway_webhook_deliveries d WHERE d.subscription_id = s.id AND d.status = 'failed')::integer AS failed_delivery_count
FROM public.api_gateway_webhook_subscriptions s
WHERE public.api_gateway_is_admin();

CREATE OR REPLACE VIEW public.admin_api_gateway_webhook_deliveries AS
SELECT d.*, e.event_key, e.aggregate_type, e.aggregate_id, s.subscription_key, s.owner_label
FROM public.api_gateway_webhook_deliveries d
JOIN public.api_gateway_webhook_events e ON e.id = d.event_id
JOIN public.api_gateway_webhook_subscriptions s ON s.id = d.subscription_id
WHERE public.api_gateway_is_admin()
ORDER BY d.created_at DESC;

CREATE OR REPLACE VIEW public.admin_api_gateway_rate_limits AS
SELECT *
FROM public.api_gateway_rate_limit_buckets
WHERE public.api_gateway_is_admin()
ORDER BY updated_at DESC;

CREATE OR REPLACE VIEW public.admin_api_gateway_openapi AS
SELECT jsonb_build_object(
  'openapi', '3.1.0',
  'info', jsonb_build_object('title', 'La Petite Bouteille API Gateway', 'version', 'v1'),
  'paths', COALESCE(jsonb_object_agg(
    path,
    jsonb_build_object(
      lower(http_method),
      jsonb_build_object(
        'operationId', endpoint_key,
        'summary', COALESCE(documentation->>'summary', endpoint_key),
        'x-module', module_key,
        'x-version', version,
        'x-status', status,
        'x-auth-modes', auth_modes,
        'x-required-roles', required_roles,
        'requestBody', request_schema,
        'responses', jsonb_build_object('200', response_schema)
      )
    )
  ), '{}'::jsonb) AS spec
FROM public.api_gateway_endpoints
WHERE public.api_gateway_is_admin()
  AND status IN ('active','deprecated');

CREATE OR REPLACE VIEW public.admin_api_gateway_security_findings AS
SELECT
  'missing_rate_limit'::text AS finding_type,
  'medium'::text AS severity,
  endpoint_key,
  'Endpoint sans politique de rate limit explicite'::text AS detail
FROM public.api_gateway_endpoints
WHERE public.api_gateway_is_admin()
  AND (rate_limit_policy IS NULL OR rate_limit_policy = '{}'::jsonb)
UNION ALL
SELECT
  'deprecated_endpoint'::text,
  'low'::text,
  endpoint_key,
  COALESCE(deprecation_notice, 'Endpoint deprecie sans note detaillee')
FROM public.api_gateway_endpoints
WHERE public.api_gateway_is_admin()
  AND status = 'deprecated'
UNION ALL
SELECT
  'webhook_failing'::text,
  'high'::text,
  subscription_key,
  'Webhook avec echecs repetes: ' || failure_count::text
FROM public.api_gateway_webhook_subscriptions
WHERE public.api_gateway_is_admin()
  AND failure_count >= 5;

ALTER TABLE public.api_gateway_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_gateway_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_gateway_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_gateway_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_gateway_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_gateway_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_gateway_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage API gateway endpoints" ON public.api_gateway_endpoints;
CREATE POLICY "Admins manage API gateway endpoints"
ON public.api_gateway_endpoints FOR ALL TO authenticated
USING (public.api_gateway_is_admin())
WITH CHECK (public.api_gateway_is_admin());

DROP POLICY IF EXISTS "Admins manage API gateway keys" ON public.api_gateway_api_keys;
CREATE POLICY "Admins manage API gateway keys"
ON public.api_gateway_api_keys FOR ALL TO authenticated
USING (public.api_gateway_is_admin())
WITH CHECK (public.api_gateway_is_admin());

DROP POLICY IF EXISTS "Admins read API gateway logs" ON public.api_gateway_request_logs;
CREATE POLICY "Admins read API gateway logs"
ON public.api_gateway_request_logs FOR SELECT TO authenticated
USING (public.api_gateway_is_admin());

DROP POLICY IF EXISTS "Admins manage API gateway rate limits" ON public.api_gateway_rate_limit_buckets;
CREATE POLICY "Admins manage API gateway rate limits"
ON public.api_gateway_rate_limit_buckets FOR ALL TO authenticated
USING (public.api_gateway_is_admin())
WITH CHECK (public.api_gateway_is_admin());

DROP POLICY IF EXISTS "Admins manage API gateway webhooks" ON public.api_gateway_webhook_subscriptions;
CREATE POLICY "Admins manage API gateway webhooks"
ON public.api_gateway_webhook_subscriptions FOR ALL TO authenticated
USING (public.api_gateway_is_admin())
WITH CHECK (public.api_gateway_is_admin());

DROP POLICY IF EXISTS "Admins read API gateway webhook events" ON public.api_gateway_webhook_events;
CREATE POLICY "Admins read API gateway webhook events"
ON public.api_gateway_webhook_events FOR SELECT TO authenticated
USING (public.api_gateway_is_admin());

DROP POLICY IF EXISTS "Admins manage API gateway webhook deliveries" ON public.api_gateway_webhook_deliveries;
CREATE POLICY "Admins manage API gateway webhook deliveries"
ON public.api_gateway_webhook_deliveries FOR ALL TO authenticated
USING (public.api_gateway_is_admin())
WITH CHECK (public.api_gateway_is_admin());

GRANT SELECT ON public.api_gateway_endpoints TO authenticated, service_role;
GRANT SELECT ON public.api_gateway_api_keys TO authenticated, service_role;
GRANT SELECT ON public.api_gateway_request_logs TO authenticated, service_role;
GRANT SELECT ON public.api_gateway_rate_limit_buckets TO authenticated, service_role;
GRANT SELECT ON public.api_gateway_webhook_subscriptions TO authenticated, service_role;
GRANT SELECT ON public.api_gateway_webhook_events TO authenticated, service_role;
GRANT SELECT, UPDATE ON public.api_gateway_webhook_deliveries TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_register_api_gateway_endpoint(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.api_gateway_check_rate_limit(text, text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.api_gateway_log_request(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.api_gateway_enqueue_webhook_event(text, jsonb, text, text, text) TO authenticated, service_role;

INSERT INTO public.platform_observability_services(code, name, category, owner_module, description, health_thresholds)
VALUES
  ('api_gateway', 'P4.2 API Gateway', 'api', 'p42_api_integration_gateway', 'Passerelle API, rate limits, logs et webhooks.', '{"error_rate_warning":5,"webhook_dead_letter_warning":1}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    owner_module = EXCLUDED.owner_module,
    description = EXCLUDED.description,
    health_thresholds = EXCLUDED.health_thresholds,
    status = 'active',
    updated_at = now();

NOTIFY pgrst, 'reload schema';
