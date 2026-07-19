-- P4.4 Developer Portal & SDK Platform.
-- Additive platform layer only: no P0 financial mutation.

CREATE OR REPLACE FUNCTION public.developer_portal_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

CREATE TABLE IF NOT EXISTS public.developer_portal_members (
  user_id uuid PRIMARY KEY,
  display_name text,
  organization_name text,
  member_role text NOT NULL DEFAULT 'developer' CHECK (member_role IN ('developer','partner','internal','admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended','revoked')),
  allowed_modules text[] NOT NULL DEFAULT ARRAY[]::text[],
  allowed_endpoint_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  support_tier text NOT NULL DEFAULT 'standard' CHECK (support_tier IN ('standard','priority','enterprise')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.developer_portal_is_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.developer_portal_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.developer_portal_members m
      WHERE m.user_id = auth.uid()
        AND m.status = 'active'
    )
$$;

CREATE TABLE IF NOT EXISTS public.developer_portal_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text NOT NULL UNIQUE,
  owner_user_id uuid NOT NULL,
  app_name text NOT NULL,
  description text,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','staging','production')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','suspended','revoked')),
  allowed_modules text[] NOT NULL DEFAULT ARRAY[]::text[],
  allowed_endpoint_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  webhook_url text,
  quota_per_minute integer NOT NULL DEFAULT 60 CHECK (quota_per_minute > 0),
  quota_per_day integer NOT NULL DEFAULT 1000 CHECK (quota_per_day > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.developer_portal_api_key_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_key_id uuid,
  app_id uuid REFERENCES public.developer_portal_apps(id) ON DELETE SET NULL,
  actor_user_id uuid DEFAULT auth.uid(),
  event_type text NOT NULL CHECK (event_type IN ('created','rotated','revoked','quota_updated','permission_updated')),
  event_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.developer_portal_sandbox_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES public.developer_portal_apps(id) ON DELETE SET NULL,
  actor_user_id uuid DEFAULT auth.uid(),
  scenario_key text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('queued','completed','failed')),
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.developer_portal_docs_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  section text NOT NULL CHECK (section IN ('home','documentation','apis','webhooks','capabilities','events','sdk','sandbox','faq','support')),
  title text NOT NULL,
  summary text NOT NULL,
  content_md text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  visibility text NOT NULL DEFAULT 'developers' CHECK (visibility IN ('public','developers','admin')),
  source_module_key text,
  version text NOT NULL DEFAULT 'v1',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.developer_portal_sdk_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdk_key text NOT NULL UNIQUE,
  language text NOT NULL,
  package_name text NOT NULL,
  version text NOT NULL DEFAULT '0.1.0',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','alpha','beta','stable','deprecated')),
  repository_path text,
  documentation_path text,
  capabilities text[] NOT NULL DEFAULT ARRAY[]::text[],
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_model jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.developer_portal_changelog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_key text NOT NULL UNIQUE,
  version text NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('api','sdk','webhook','docs','deprecation','migration','fix')),
  title text NOT NULL,
  description text NOT NULL,
  impact_level text NOT NULL DEFAULT 'low' CHECK (impact_level IN ('low','medium','high','breaking')),
  affected_modules text[] NOT NULL DEFAULT ARRAY[]::text[],
  published_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.developer_portal_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_key text NOT NULL UNIQUE DEFAULT ('dev_' || replace(gen_random_uuid()::text, '-', '')),
  requester_user_id uuid DEFAULT auth.uid(),
  app_id uuid REFERENCES public.developer_portal_apps(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'technical' CHECK (category IN ('technical','api','webhook','sdk','sandbox','access','billing','other')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_user','resolved','closed')),
  detail text,
  resolution text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_portal_apps_owner ON public.developer_portal_apps(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_developer_portal_key_events_app ON public.developer_portal_api_key_events(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_developer_portal_sandbox_app ON public.developer_portal_sandbox_runs(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_developer_portal_docs_section ON public.developer_portal_docs_pages(section, status);
CREATE INDEX IF NOT EXISTS idx_developer_portal_support_requester ON public.developer_portal_support_tickets(requester_user_id, status);

CREATE OR REPLACE FUNCTION public.developer_portal_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_developer_portal_members_touch ON public.developer_portal_members;
CREATE TRIGGER trg_developer_portal_members_touch
  BEFORE UPDATE ON public.developer_portal_members
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_touch_updated_at();

DROP TRIGGER IF EXISTS trg_developer_portal_apps_touch ON public.developer_portal_apps;
CREATE TRIGGER trg_developer_portal_apps_touch
  BEFORE UPDATE ON public.developer_portal_apps
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_touch_updated_at();

DROP TRIGGER IF EXISTS trg_developer_portal_docs_touch ON public.developer_portal_docs_pages;
CREATE TRIGGER trg_developer_portal_docs_touch
  BEFORE UPDATE ON public.developer_portal_docs_pages
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_touch_updated_at();

DROP TRIGGER IF EXISTS trg_developer_portal_sdk_touch ON public.developer_portal_sdk_packages;
CREATE TRIGGER trg_developer_portal_sdk_touch
  BEFORE UPDATE ON public.developer_portal_sdk_packages
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_touch_updated_at();

DROP TRIGGER IF EXISTS trg_developer_portal_support_touch ON public.developer_portal_support_tickets;
CREATE TRIGGER trg_developer_portal_support_touch
  BEFORE UPDATE ON public.developer_portal_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_touch_updated_at();

CREATE OR REPLACE FUNCTION public.developer_portal_history_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'developer_portal_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_developer_portal_api_key_events_append_only_update ON public.developer_portal_api_key_events;
CREATE TRIGGER trg_developer_portal_api_key_events_append_only_update
  BEFORE UPDATE ON public.developer_portal_api_key_events
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_history_is_append_only();

DROP TRIGGER IF EXISTS trg_developer_portal_api_key_events_append_only_delete ON public.developer_portal_api_key_events;
CREATE TRIGGER trg_developer_portal_api_key_events_append_only_delete
  BEFORE DELETE ON public.developer_portal_api_key_events
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_history_is_append_only();

DROP TRIGGER IF EXISTS trg_developer_portal_sandbox_append_only_update ON public.developer_portal_sandbox_runs;
CREATE TRIGGER trg_developer_portal_sandbox_append_only_update
  BEFORE UPDATE ON public.developer_portal_sandbox_runs
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_history_is_append_only();

DROP TRIGGER IF EXISTS trg_developer_portal_sandbox_append_only_delete ON public.developer_portal_sandbox_runs;
CREATE TRIGGER trg_developer_portal_sandbox_append_only_delete
  BEFORE DELETE ON public.developer_portal_sandbox_runs
  FOR EACH ROW EXECUTE FUNCTION public.developer_portal_history_is_append_only();

CREATE OR REPLACE FUNCTION public.admin_register_developer_portal_member(_member jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (_member->>'user_id')::uuid;
BEGIN
  IF NOT public.developer_portal_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  INSERT INTO public.developer_portal_members(
    user_id, display_name, organization_name, member_role, status,
    allowed_modules, allowed_endpoint_keys, support_tier, metadata, invited_by
  )
  VALUES (
    v_user_id,
    NULLIF(_member->>'display_name', ''),
    NULLIF(_member->>'organization_name', ''),
    COALESCE(NULLIF(_member->>'member_role', ''), 'developer'),
    COALESCE(NULLIF(_member->>'status', ''), 'active'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_member->'allowed_modules', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_member->'allowed_endpoint_keys', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(NULLIF(_member->>'support_tier', ''), 'standard'),
    COALESCE(_member->'metadata', '{}'::jsonb),
    auth.uid()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      organization_name = EXCLUDED.organization_name,
      member_role = EXCLUDED.member_role,
      status = EXCLUDED.status,
      allowed_modules = EXCLUDED.allowed_modules,
      allowed_endpoint_keys = EXCLUDED.allowed_endpoint_keys,
      support_tier = EXCLUDED.support_tier,
      metadata = EXCLUDED.metadata,
      updated_at = now();

  RETURN jsonb_build_object('user_id', v_user_id, 'status', 'registered');
END;
$$;

CREATE OR REPLACE FUNCTION public.developer_register_app(_app jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_id uuid;
  v_app_key text := lower(regexp_replace(COALESCE(NULLIF(_app->>'app_key', ''), 'app-' || replace(gen_random_uuid()::text, '-', '')), '[^a-z0-9_.-]+', '-', 'g'));
BEGIN
  IF NOT public.developer_portal_is_member() THEN
    RAISE EXCEPTION 'developer_required';
  END IF;

  INSERT INTO public.developer_portal_apps(
    app_key, owner_user_id, app_name, description, environment, status,
    allowed_modules, allowed_endpoint_keys, webhook_url, quota_per_minute, quota_per_day, metadata
  )
  VALUES (
    v_app_key,
    auth.uid(),
    COALESCE(NULLIF(_app->>'app_name', ''), 'Application LPB'),
    NULLIF(_app->>'description', ''),
    COALESCE(NULLIF(_app->>'environment', ''), 'sandbox'),
    COALESCE(NULLIF(_app->>'status', ''), 'draft'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_app->'allowed_modules', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_app->'allowed_endpoint_keys', '[]'::jsonb))), ARRAY[]::text[]),
    NULLIF(_app->>'webhook_url', ''),
    COALESCE(NULLIF(_app->>'quota_per_minute', '')::integer, 60),
    COALESCE(NULLIF(_app->>'quota_per_day', '')::integer, 1000),
    COALESCE(_app->'metadata', '{}'::jsonb)
  )
  RETURNING id INTO v_app_id;

  RETURN jsonb_build_object('app_id', v_app_id, 'app_key', v_app_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.developer_create_api_key(_app_id uuid, _key_name text DEFAULT 'Default key')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.developer_portal_apps%ROWTYPE;
  v_secret text;
  v_key_id uuid;
BEGIN
  SELECT * INTO v_app
  FROM public.developer_portal_apps
  WHERE id = _app_id
    AND (owner_user_id = auth.uid() OR public.developer_portal_is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'app_not_found_or_forbidden';
  END IF;

  IF v_app.status NOT IN ('draft','active') THEN
    RAISE EXCEPTION 'app_not_eligible_for_key';
  END IF;

  v_secret := 'lpb_' || v_app.environment || '_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.api_gateway_api_keys(
    key_name, key_prefix, key_hash, owner_user_id, owner_label, status,
    allowed_endpoint_keys, allowed_modules, metadata, created_by
  )
  VALUES (
    COALESCE(NULLIF(_key_name, ''), 'Developer key'),
    left(v_secret, 16),
    md5(v_secret),
    v_app.owner_user_id,
    v_app.app_name,
    'active',
    v_app.allowed_endpoint_keys,
    v_app.allowed_modules,
    jsonb_build_object('source', 'developer_portal', 'app_id', v_app.id, 'app_key', v_app.app_key, 'secret_visible_once', true),
    auth.uid()
  )
  RETURNING id INTO v_key_id;

  INSERT INTO public.developer_portal_api_key_events(api_key_id, app_id, actor_user_id, event_type, event_summary, metadata)
  VALUES (v_key_id, v_app.id, auth.uid(), 'created', 'API key created from Developer Portal', jsonb_build_object('key_prefix', left(v_secret, 16)));

  RETURN jsonb_build_object(
    'api_key_id', v_key_id,
    'api_key', v_secret,
    'key_prefix', left(v_secret, 16),
    'warning', 'This API key is returned once. Store it securely.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.developer_revoke_api_key(_api_key_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key public.api_gateway_api_keys%ROWTYPE;
  v_app_id uuid;
BEGIN
  SELECT * INTO v_key
  FROM public.api_gateway_api_keys
  WHERE id = _api_key_id
    AND metadata->>'source' = 'developer_portal'
    AND (owner_user_id = auth.uid() OR public.developer_portal_is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'api_key_not_found_or_forbidden';
  END IF;

  v_app_id := NULLIF(v_key.metadata->>'app_id', '')::uuid;

  UPDATE public.api_gateway_api_keys
  SET status = 'revoked',
      revoked_by = auth.uid(),
      revoked_at = now(),
      metadata = metadata || jsonb_build_object('revoke_reason', _reason)
  WHERE id = _api_key_id;

  INSERT INTO public.developer_portal_api_key_events(api_key_id, app_id, actor_user_id, event_type, event_summary)
  VALUES (_api_key_id, v_app_id, auth.uid(), 'revoked', COALESCE(_reason, 'API key revoked'));

  RETURN jsonb_build_object('api_key_id', _api_key_id, 'status', 'revoked');
END;
$$;

CREATE OR REPLACE FUNCTION public.developer_rotate_api_key(_api_key_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key public.api_gateway_api_keys%ROWTYPE;
  v_app_id uuid;
  v_result jsonb;
BEGIN
  SELECT * INTO v_key
  FROM public.api_gateway_api_keys
  WHERE id = _api_key_id
    AND metadata->>'source' = 'developer_portal'
    AND status = 'active'
    AND (owner_user_id = auth.uid() OR public.developer_portal_is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'api_key_not_found_or_forbidden';
  END IF;

  v_app_id := NULLIF(v_key.metadata->>'app_id', '')::uuid;
  v_result := public.developer_create_api_key(v_app_id, v_key.key_name || ' rotated');

  UPDATE public.api_gateway_api_keys
  SET status = 'rotating',
      metadata = metadata || jsonb_build_object('rotated_to', v_result->>'api_key_id')
  WHERE id = _api_key_id;

  INSERT INTO public.developer_portal_api_key_events(api_key_id, app_id, actor_user_id, event_type, event_summary, metadata)
  VALUES (_api_key_id, v_app_id, auth.uid(), 'rotated', 'API key rotated', jsonb_build_object('new_api_key_id', v_result->>'api_key_id'));

  RETURN v_result || jsonb_build_object('rotated_from_api_key_id', _api_key_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.developer_run_sandbox(_app_id uuid, _scenario_key text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.developer_portal_apps%ROWTYPE;
  v_run_id uuid;
  v_started timestamptz := clock_timestamp();
  v_response jsonb;
BEGIN
  SELECT * INTO v_app
  FROM public.developer_portal_apps
  WHERE id = _app_id
    AND (owner_user_id = auth.uid() OR public.developer_portal_is_admin());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'app_not_found_or_forbidden';
  END IF;

  v_response := jsonb_build_object(
    'ok', true,
    'sandbox', true,
    'scenario_key', _scenario_key,
    'app_key', v_app.app_key,
    'request_echo', _payload,
    'simulated_webhook_signature', 'sha256=demo-signature-not-for-production',
    'side_effects', 'none'
  );

  INSERT INTO public.developer_portal_sandbox_runs(app_id, actor_user_id, scenario_key, status, request_payload, response_payload, latency_ms)
  VALUES (_app_id, auth.uid(), _scenario_key, 'completed', COALESCE(_payload, '{}'::jsonb), v_response, GREATEST(1, (EXTRACT(milliseconds FROM clock_timestamp() - v_started))::integer))
  RETURNING id INTO v_run_id;

  RETURN v_response || jsonb_build_object('run_id', v_run_id);
END;
$$;

CREATE OR REPLACE VIEW public.developer_portal_overview AS
SELECT
  (SELECT count(*) FROM public.api_gateway_endpoints WHERE status IN ('active','deprecated'))::integer AS documented_api_count,
  (SELECT count(*) FROM public.platform_capability_registry WHERE status = 'active')::integer AS capability_count,
  (SELECT count(*) FROM public.platform_event_catalog WHERE status = 'active')::integer AS event_count,
  (SELECT count(*) FROM public.developer_portal_sdk_packages WHERE status IN ('alpha','beta','stable'))::integer AS sdk_count,
  (SELECT count(*) FROM public.developer_portal_docs_pages WHERE status = 'published')::integer AS docs_count,
  (SELECT count(*) FROM public.developer_portal_apps WHERE owner_user_id = auth.uid() OR public.developer_portal_is_admin())::integer AS app_count,
  (SELECT count(*) FROM public.developer_portal_sandbox_runs WHERE actor_user_id = auth.uid() OR public.developer_portal_is_admin())::integer AS sandbox_runs_count
WHERE public.developer_portal_is_member();

CREATE OR REPLACE VIEW public.developer_portal_my_apps AS
SELECT *
FROM public.developer_portal_apps
WHERE public.developer_portal_is_member()
  AND (owner_user_id = auth.uid() OR public.developer_portal_is_admin())
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.developer_portal_my_api_keys AS
SELECT
  k.id,
  k.key_name,
  k.key_prefix,
  k.owner_label,
  k.status,
  k.allowed_endpoint_keys,
  k.allowed_modules,
  k.expires_at,
  k.last_used_at,
  k.created_at,
  NULLIF(k.metadata->>'app_id', '')::uuid AS app_id,
  k.metadata->>'app_key' AS app_key
FROM public.api_gateway_api_keys k
WHERE public.developer_portal_is_member()
  AND k.metadata->>'source' = 'developer_portal'
  AND (k.owner_user_id = auth.uid() OR public.developer_portal_is_admin())
ORDER BY k.created_at DESC;

CREATE OR REPLACE VIEW public.developer_portal_docs_catalog AS
SELECT 'doc'::text AS item_type, slug AS item_key, section, title, summary, version, status, visibility, source_module_key, updated_at
FROM public.developer_portal_docs_pages
WHERE status = 'published'
  AND (visibility = 'public' OR public.developer_portal_is_member())
UNION ALL
SELECT 'api'::text, endpoint_key, 'apis'::text, path || ' ' || http_method, COALESCE(documentation->>'summary', endpoint_key), version, status, 'developers'::text, module_key, updated_at
FROM public.api_gateway_endpoints
WHERE public.developer_portal_is_member()
  AND status IN ('active','deprecated')
UNION ALL
SELECT 'capability'::text, capability_key, 'capabilities'::text, capability_key, description, version, status, 'developers'::text, module_key, updated_at
FROM public.platform_capability_registry
WHERE public.developer_portal_is_member()
  AND status IN ('active','observation','experimental')
UNION ALL
SELECT 'event'::text, event_key, 'events'::text, event_key, description, version, status, 'developers'::text, producer_module_key, updated_at
FROM public.platform_event_catalog
WHERE public.developer_portal_is_member()
  AND status IN ('active','experimental')
ORDER BY section, item_type, item_key;

CREATE OR REPLACE VIEW public.developer_portal_openapi AS
SELECT jsonb_build_object(
  'openapi', '3.1.0',
  'info', jsonb_build_object(
    'title', 'La Petite Bouteille Developer API',
    'version', 'v1',
    'description', 'Specification developer portal generee depuis P4.1/P4.2.'
  ),
  'paths', COALESCE(jsonb_object_agg(
    path,
    jsonb_build_object(
      lower(http_method),
      jsonb_build_object(
        'operationId', endpoint_key,
        'summary', COALESCE(documentation->>'summary', endpoint_key),
        'x-module', module_key,
        'x-capability', capability_key,
        'x-version', version,
        'x-status', status,
        'x-auth-modes', auth_modes,
        'x-required-roles', required_roles,
        'requestBody', request_schema,
        'responses', jsonb_build_object('200', response_schema)
      )
    )
  ), '{}'::jsonb)
) AS spec
FROM public.api_gateway_endpoints
WHERE public.developer_portal_is_member()
  AND status IN ('active','deprecated');

CREATE OR REPLACE VIEW public.developer_portal_sdk_packages_view AS
SELECT *
FROM public.developer_portal_sdk_packages
WHERE public.developer_portal_is_member()
  AND status IN ('planned','alpha','beta','stable')
ORDER BY language, package_name;

CREATE OR REPLACE VIEW public.developer_portal_changelog AS
SELECT *
FROM public.developer_portal_changelog_entries
WHERE public.developer_portal_is_member()
ORDER BY published_at DESC;

CREATE OR REPLACE VIEW public.developer_portal_sandbox_runs_view AS
SELECT r.*, a.app_key, a.app_name
FROM public.developer_portal_sandbox_runs r
LEFT JOIN public.developer_portal_apps a ON a.id = r.app_id
WHERE public.developer_portal_is_member()
  AND (r.actor_user_id = auth.uid() OR public.developer_portal_is_admin())
ORDER BY r.created_at DESC;

CREATE OR REPLACE VIEW public.admin_developer_portal_overview AS
SELECT
  (SELECT count(*) FROM public.developer_portal_members WHERE status = 'active')::integer AS active_developers,
  (SELECT count(*) FROM public.developer_portal_apps WHERE status = 'active')::integer AS active_apps,
  (SELECT count(*) FROM public.api_gateway_api_keys WHERE metadata->>'source' = 'developer_portal' AND status = 'active')::integer AS active_api_keys,
  (SELECT count(*) FROM public.developer_portal_sandbox_runs WHERE created_at >= now() - interval '24 hours')::integer AS sandbox_runs_24h,
  (SELECT count(*) FROM public.api_gateway_request_logs WHERE created_at >= now() - interval '24 hours' AND api_key_id IN (SELECT id FROM public.api_gateway_api_keys WHERE metadata->>'source' = 'developer_portal'))::integer AS api_requests_24h,
  (SELECT count(*) FROM public.api_gateway_request_logs WHERE created_at >= now() - interval '24 hours' AND status_code >= 400 AND api_key_id IN (SELECT id FROM public.api_gateway_api_keys WHERE metadata->>'source' = 'developer_portal'))::integer AS api_errors_24h,
  (SELECT count(*) FROM public.developer_portal_support_tickets WHERE status IN ('open','in_progress','waiting_user'))::integer AS open_support_tickets
WHERE public.developer_portal_is_admin();

CREATE OR REPLACE VIEW public.admin_developer_portal_apps AS
SELECT *
FROM public.developer_portal_apps
WHERE public.developer_portal_is_admin()
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.admin_developer_portal_members AS
SELECT *
FROM public.developer_portal_members
WHERE public.developer_portal_is_admin()
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.admin_developer_portal_api_keys AS
SELECT *
FROM public.developer_portal_my_api_keys
WHERE public.developer_portal_is_admin();

CREATE OR REPLACE VIEW public.admin_developer_portal_security_findings AS
SELECT 'app_without_key'::text AS finding_type, 'medium'::text AS severity, app_key AS subject_key, 'Application active sans cle API active'::text AS detail
FROM public.developer_portal_apps a
WHERE public.developer_portal_is_admin()
  AND a.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.api_gateway_api_keys k
    WHERE k.metadata->>'app_id' = a.id::text
      AND k.status = 'active'
  )
UNION ALL
SELECT 'production_app_without_endpoint_scope'::text, 'high'::text, app_key, 'Application production sans restriction endpoint explicite'
FROM public.developer_portal_apps
WHERE public.developer_portal_is_admin()
  AND environment = 'production'
  AND cardinality(allowed_endpoint_keys) = 0
UNION ALL
SELECT 'stale_sdk'::text, 'low'::text, sdk_key, 'SDK non stable ou encore planifie'
FROM public.developer_portal_sdk_packages
WHERE public.developer_portal_is_admin()
  AND status IN ('planned','alpha');

INSERT INTO public.developer_portal_docs_pages(slug, section, title, summary, content_md, status, visibility, source_module_key, version, metadata)
VALUES
  ('getting-started', 'home', 'Getting started', 'Configurer une integration LPB sans toucher aux donnees financieres.', '1. Creer une application sandbox. 2. Creer une cle API. 3. Tester via sandbox. 4. Demander validation production.', 'published', 'developers', 'p44_developer_portal', 'v1', '{"seeded":true}'::jsonb),
  ('authentication', 'documentation', 'Authentification', 'Utiliser les cles API du Gateway et ne jamais exposer les secrets.', 'Les cles sont visibles une seule fois. Stocker cote serveur uniquement.', 'published', 'developers', 'p44_developer_portal', 'v1', '{"seeded":true}'::jsonb),
  ('webhooks', 'webhooks', 'Webhooks', 'Recevoir les evenements autorises avec signature.', 'Verifier la signature, traiter de maniere idempotente et journaliser les erreurs.', 'published', 'developers', 'p44_developer_portal', 'v1', '{"seeded":true}'::jsonb),
  ('sandbox', 'sandbox', 'Sandbox', 'Simuler des appels et webhooks sans impact production.', 'Les reponses sandbox sont marquees sandbox=true et side_effects=none.', 'published', 'developers', 'p44_developer_portal', 'v1', '{"seeded":true}'::jsonb),
  ('faq', 'faq', 'FAQ technique', 'Questions frequentes pour integrateurs LPB.', 'Le P0 financier est exclu du portail developpeur.', 'published', 'developers', 'p44_developer_portal', 'v1', '{"seeded":true}'::jsonb)
ON CONFLICT (slug) DO UPDATE
SET section = EXCLUDED.section,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    content_md = EXCLUDED.content_md,
    status = EXCLUDED.status,
    visibility = EXCLUDED.visibility,
    source_module_key = EXCLUDED.source_module_key,
    version = EXCLUDED.version,
    metadata = EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.developer_portal_sdk_packages(sdk_key, language, package_name, version, status, repository_path, documentation_path, capabilities, examples, error_model, metadata)
VALUES
  (
    'typescript-js',
    'TypeScript',
    '@lapetitebouteille/sdk',
    '0.1.0',
    'alpha',
    'docs/sdk/typescript',
    'docs/architecture/developer-portal.md#sdk-typescript',
    ARRAY['api.gateway.route','api.documentation.generate','webhook.subscription.manage'],
    '[
      {"title":"Authentification","path":"docs/sdk/typescript/authentication.ts"},
      {"title":"Appel API","path":"docs/sdk/typescript/api-call.ts"},
      {"title":"Webhook","path":"docs/sdk/typescript/webhook-handler.ts"},
      {"title":"Retries","path":"docs/sdk/typescript/retries.ts"}
    ]'::jsonb,
    '{"error_shape":{"code":"string","message":"string","request_id":"string"}}'::jsonb,
    '{"official":true,"runtime":"browser_or_node","financial_side_effects":false}'::jsonb
  )
ON CONFLICT (sdk_key) DO UPDATE
SET language = EXCLUDED.language,
    package_name = EXCLUDED.package_name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    repository_path = EXCLUDED.repository_path,
    documentation_path = EXCLUDED.documentation_path,
    capabilities = EXCLUDED.capabilities,
    examples = EXCLUDED.examples,
    error_model = EXCLUDED.error_model,
    metadata = EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.developer_portal_changelog_entries(entry_key, version, entry_type, title, description, impact_level, affected_modules, metadata)
VALUES
  ('p44-developer-portal-initial', 'p4.4', 'api', 'Developer Portal initial', 'Portail developpeur, sandbox, SDK TypeScript alpha et documentation automatique.', 'medium', ARRAY['p41_platform_extension','p42_api_integration_gateway','p43_integration_hub'], '{"seeded":true}'::jsonb)
ON CONFLICT (entry_key) DO UPDATE
SET version = EXCLUDED.version,
    entry_type = EXCLUDED.entry_type,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    impact_level = EXCLUDED.impact_level,
    affected_modules = EXCLUDED.affected_modules,
    metadata = EXCLUDED.metadata;

INSERT INTO public.platform_extension_modules(
  module_key, name, description, version, status, logical_owner, dependencies, provided_capabilities,
  produced_events, consumed_events, required_permissions, routes, rpc_functions, edge_functions, primary_tables,
  documentation_path, contract_version, can_be_disabled, metadata
)
VALUES (
  'p44_developer_portal',
  'P4.4 Developer Portal & SDK Platform',
  'Portail developpeur, documentation automatique, sandbox, cles API et SDK officiel.',
  'p4.4',
  'active',
  'architecture',
  ARRAY['p4_extension_framework','p42_api_integration_gateway','p43_integration_hub','platform_observability'],
  ARRAY['developer.portal.manage','developer.api_key.manage','developer.sandbox.run','developer.sdk.publish','developer.documentation.generate'],
  ARRAY['developer.api_key.created','developer.api_key.rotated','developer.sandbox.run.completed','developer.doc.updated'],
  ARRAY['api.request.logged','connector.installed','observability.alert.created'],
  ARRAY['admin'],
  ARRAY['/admin?tab=developer-portal'],
  ARRAY['admin_register_developer_portal_member','developer_register_app','developer_create_api_key','developer_rotate_api_key','developer_revoke_api_key','developer_run_sandbox'],
  ARRAY[]::text[],
  ARRAY['developer_portal_members','developer_portal_apps','developer_portal_sandbox_runs','developer_portal_docs_pages','developer_portal_sdk_packages'],
  'docs/architecture/developer-portal.md',
  'v1',
  false,
  '{"mode":"portal_and_sandbox","p0_mutation_allowed":false}'::jsonb
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
    primary_tables = EXCLUDED.primary_tables,
    documentation_path = EXCLUDED.documentation_path,
    contract_version = EXCLUDED.contract_version,
    metadata = EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.platform_capability_registry(capability_key, module_key, description, version, access_type, required_permission, status, dependencies, input_contract, output_contract, documentation_path)
VALUES
  ('developer.portal.manage', 'p44_developer_portal', 'Gerer membres, apps, documentation et support developpeur.', 'v1', 'admin', 'admin', 'active', ARRAY['api.registry.manage'], '{"member":"object"}'::jsonb, '{"status":"text"}'::jsonb, 'docs/architecture/developer-portal.md#portal'),
  ('developer.api_key.manage', 'p44_developer_portal', 'Creer, revoquer et tourner des cles API sans reveler les secrets apres creation.', 'v1', 'public', NULL, 'active', ARRAY['rate_limit.evaluate'], '{"app_id":"uuid"}'::jsonb, '{"api_key_visible_once":"text"}'::jsonb, 'docs/architecture/developer-portal.md#api-keys'),
  ('developer.sandbox.run', 'p44_developer_portal', 'Executer scenarios sandbox sans impact production.', 'v1', 'public', NULL, 'active', ARRAY['api.gateway.route'], '{"scenario_key":"text"}'::jsonb, '{"side_effects":"none"}'::jsonb, 'docs/architecture/developer-portal.md#sandbox'),
  ('developer.sdk.publish', 'p44_developer_portal', 'Declarer SDK officiels et exemples de code.', 'v1', 'admin', 'admin', 'active', ARRAY['api.documentation.generate'], '{"sdk_key":"text"}'::jsonb, '{"sdk_status":"text"}'::jsonb, 'docs/architecture/developer-portal.md#sdk'),
  ('developer.documentation.generate', 'p44_developer_portal', 'Exposer OpenAPI, capabilities, events et contrats depuis les registres P4.', 'v1', 'public', NULL, 'active', ARRAY['architecture.capability.declare','architecture.event.catalog'], '{}'::jsonb, '{"catalog":"array"}'::jsonb, 'docs/architecture/developer-portal.md#documentation')
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

INSERT INTO public.platform_event_catalog(event_key, version, producer_module_key, description, payload_schema, required_fields, optional_fields, sensitivity_level, retention_policy, known_consumers, status)
VALUES
  ('developer.api_key.created', 'v1', 'p44_developer_portal', 'Cle API developpeur creee.', '{"type":"object","required":["api_key_id","app_id"]}'::jsonb, ARRAY['api_key_id','app_id'], ARRAY['key_prefix'], 'sensitive', '36 months', ARRAY['p42_api_integration_gateway','platform_observability'], 'active'),
  ('developer.api_key.rotated', 'v1', 'p44_developer_portal', 'Cle API developpeur tournee.', '{"type":"object","required":["api_key_id","new_api_key_id"]}'::jsonb, ARRAY['api_key_id','new_api_key_id'], ARRAY['app_id'], 'sensitive', '36 months', ARRAY['p42_api_integration_gateway','platform_observability'], 'active'),
  ('developer.sandbox.run.completed', 'v1', 'p44_developer_portal', 'Execution sandbox terminee sans effet production.', '{"type":"object","required":["run_id","scenario_key"]}'::jsonb, ARRAY['run_id','scenario_key'], ARRAY['latency_ms'], 'internal', '24 months', ARRAY['platform_observability'], 'active'),
  ('developer.doc.updated', 'v1', 'p44_developer_portal', 'Documentation developpeur publiee ou mise a jour.', '{"type":"object","required":["slug","version"]}'::jsonb, ARRAY['slug','version'], ARRAY['section'], 'internal', '24 months', ARRAY['p4_extension_framework'], 'active')
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

INSERT INTO public.platform_rpc_contracts(rpc_name, module_key, purpose, version, status, parameters, return_contract, required_permissions, error_behavior, idempotency, logging_policy, documentation_path)
VALUES
  ('admin_register_developer_portal_member', 'p44_developer_portal', 'Ajouter ou mettre a jour un developpeur autorise.', 'v1', 'active', '{"_member":"jsonb"}'::jsonb, '{"user_id":"uuid","status":"registered"}'::jsonb, ARRAY['admin'], '{"raises":["admin_required","user_id_required"]}'::jsonb, 'supported', 'audit', 'docs/architecture/developer-portal.md#rpc'),
  ('developer_register_app', 'p44_developer_portal', 'Creer une application developpeur sandbox/staging/production.', 'v1', 'active', '{"_app":"jsonb"}'::jsonb, '{"app_id":"uuid","app_key":"text"}'::jsonb, ARRAY['developer'], '{"raises":["developer_required"]}'::jsonb, 'not_required', 'standard', 'docs/architecture/developer-portal.md#rpc'),
  ('developer_create_api_key', 'p44_developer_portal', 'Creer une cle API visible une seule fois.', 'v1', 'active', '{"_app_id":"uuid","_key_name":"text"}'::jsonb, '{"api_key":"text","api_key_id":"uuid"}'::jsonb, ARRAY['developer'], '{"secret_visible_once":true}'::jsonb, 'not_required', 'audit', 'docs/architecture/developer-portal.md#rpc'),
  ('developer_rotate_api_key', 'p44_developer_portal', 'Tourner une cle API developpeur.', 'v1', 'active', '{"_api_key_id":"uuid"}'::jsonb, '{"api_key":"text","rotated_from_api_key_id":"uuid"}'::jsonb, ARRAY['developer'], '{"secret_visible_once":true}'::jsonb, 'not_required', 'audit', 'docs/architecture/developer-portal.md#rpc'),
  ('developer_revoke_api_key', 'p44_developer_portal', 'Revoquer une cle API developpeur.', 'v1', 'active', '{"_api_key_id":"uuid","_reason":"text"}'::jsonb, '{"status":"revoked"}'::jsonb, ARRAY['developer'], '{}'::jsonb, 'supported', 'audit', 'docs/architecture/developer-portal.md#rpc'),
  ('developer_run_sandbox', 'p44_developer_portal', 'Executer un scenario sandbox sans side-effect.', 'v1', 'active', '{"_app_id":"uuid","_scenario_key":"text","_payload":"jsonb"}'::jsonb, '{"sandbox":true,"side_effects":"none"}'::jsonb, ARRAY['developer'], '{}'::jsonb, 'not_required', 'standard', 'docs/architecture/developer-portal.md#rpc')
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

INSERT INTO public.platform_feature_flags(flag_key, module_key, description, status, environment, eligibility_rules, allowed_roles, rollout_percent, metadata)
VALUES
  ('p4.developer_portal.admin_dashboard', 'p44_developer_portal', 'Affiche le dashboard portail developpeur aux admins.', 'enabled', 'production', '{"requires_admin":true}'::jsonb, ARRAY['admin'], 100, '{"seeded":true}'::jsonb),
  ('p4.developer_portal.public_self_service', 'p44_developer_portal', 'Autorise self-service externe developpeur. Desactive tant que processus juridique non finalise.', 'disabled', 'production', '{"requires_legal_review":true}'::jsonb, ARRAY['admin'], 0, '{"seeded":true}'::jsonb)
ON CONFLICT (flag_key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    environment = EXCLUDED.environment,
    eligibility_rules = EXCLUDED.eligibility_rules,
    allowed_roles = EXCLUDED.allowed_roles,
    rollout_percent = EXCLUDED.rollout_percent,
    metadata = EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.platform_observability_services(code, name, category, owner_module, description, health_thresholds)
VALUES
  ('developer_portal', 'P4.4 Developer Portal', 'integration', 'p44_developer_portal', 'Documentation, SDK, cles API, sandbox et support developpeur.', '{"api_error_rate_warning":5,"sandbox_failure_warning":3,"open_support_warning":10}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    owner_module = EXCLUDED.owner_module,
    description = EXCLUDED.description,
    health_thresholds = EXCLUDED.health_thresholds,
    is_active = true,
    updated_at = now();

ALTER TABLE public.developer_portal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_portal_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_portal_api_key_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_portal_sandbox_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_portal_docs_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_portal_sdk_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_portal_changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_portal_support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developer portal members can read own membership" ON public.developer_portal_members;
CREATE POLICY "Developer portal members can read own membership"
ON public.developer_portal_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.developer_portal_is_admin());

DROP POLICY IF EXISTS "Admins manage developer portal members" ON public.developer_portal_members;
CREATE POLICY "Admins manage developer portal members"
ON public.developer_portal_members FOR ALL TO authenticated
USING (public.developer_portal_is_admin())
WITH CHECK (public.developer_portal_is_admin());

DROP POLICY IF EXISTS "Developers manage own apps" ON public.developer_portal_apps;
CREATE POLICY "Developers manage own apps"
ON public.developer_portal_apps FOR ALL TO authenticated
USING (owner_user_id = auth.uid() OR public.developer_portal_is_admin())
WITH CHECK (owner_user_id = auth.uid() OR public.developer_portal_is_admin());

DROP POLICY IF EXISTS "Developers read own key events" ON public.developer_portal_api_key_events;
CREATE POLICY "Developers read own key events"
ON public.developer_portal_api_key_events FOR SELECT TO authenticated
USING (
  public.developer_portal_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.developer_portal_apps a
    WHERE a.id = developer_portal_api_key_events.app_id
      AND a.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Developers read own sandbox runs" ON public.developer_portal_sandbox_runs;
CREATE POLICY "Developers read own sandbox runs"
ON public.developer_portal_sandbox_runs FOR SELECT TO authenticated
USING (actor_user_id = auth.uid() OR public.developer_portal_is_admin());

DROP POLICY IF EXISTS "Developers read published docs" ON public.developer_portal_docs_pages;
CREATE POLICY "Developers read published docs"
ON public.developer_portal_docs_pages FOR SELECT TO authenticated
USING ((status = 'published' AND visibility IN ('public','developers') AND public.developer_portal_is_member()) OR public.developer_portal_is_admin());

DROP POLICY IF EXISTS "Admins manage developer docs" ON public.developer_portal_docs_pages;
CREATE POLICY "Admins manage developer docs"
ON public.developer_portal_docs_pages FOR ALL TO authenticated
USING (public.developer_portal_is_admin())
WITH CHECK (public.developer_portal_is_admin());

DROP POLICY IF EXISTS "Developers read sdk packages" ON public.developer_portal_sdk_packages;
CREATE POLICY "Developers read sdk packages"
ON public.developer_portal_sdk_packages FOR SELECT TO authenticated
USING (public.developer_portal_is_member());

DROP POLICY IF EXISTS "Admins manage sdk packages" ON public.developer_portal_sdk_packages;
CREATE POLICY "Admins manage sdk packages"
ON public.developer_portal_sdk_packages FOR ALL TO authenticated
USING (public.developer_portal_is_admin())
WITH CHECK (public.developer_portal_is_admin());

DROP POLICY IF EXISTS "Developers read changelog" ON public.developer_portal_changelog_entries;
CREATE POLICY "Developers read changelog"
ON public.developer_portal_changelog_entries FOR SELECT TO authenticated
USING (public.developer_portal_is_member());

DROP POLICY IF EXISTS "Developers manage own support tickets" ON public.developer_portal_support_tickets;
CREATE POLICY "Developers manage own support tickets"
ON public.developer_portal_support_tickets FOR ALL TO authenticated
USING (requester_user_id = auth.uid() OR public.developer_portal_is_admin())
WITH CHECK (requester_user_id = auth.uid() OR public.developer_portal_is_admin());

GRANT SELECT ON public.developer_portal_members TO authenticated, service_role;
GRANT SELECT ON public.developer_portal_apps TO authenticated, service_role;
GRANT SELECT ON public.developer_portal_api_key_events TO authenticated, service_role;
GRANT SELECT ON public.developer_portal_sandbox_runs TO authenticated, service_role;
GRANT SELECT ON public.developer_portal_docs_pages TO authenticated, service_role;
GRANT SELECT ON public.developer_portal_sdk_packages TO authenticated, service_role;
GRANT SELECT ON public.developer_portal_changelog_entries TO authenticated, service_role;
GRANT SELECT ON public.developer_portal_support_tickets TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_register_developer_portal_member(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.developer_register_app(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.developer_create_api_key(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.developer_rotate_api_key(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.developer_revoke_api_key(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.developer_run_sandbox(uuid, text, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
