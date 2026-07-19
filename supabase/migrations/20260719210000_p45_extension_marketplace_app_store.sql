-- P4.5 Marketplace App Store & Extension Marketplace.
-- Controlled extension catalog only: no direct access to P0 financial internals.

CREATE OR REPLACE FUNCTION public.extension_marketplace_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.extension_marketplace_is_developer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.extension_marketplace_is_admin()
    OR public.developer_portal_is_member()
$$;

CREATE TABLE IF NOT EXISTS public.extension_marketplace_publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_key text NOT NULL UNIQUE,
  name text NOT NULL,
  owner_user_id uuid,
  publisher_type text NOT NULL DEFAULT 'partner' CHECK (publisher_type IN ('internal','partner','vendor','community')),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','suspended','rejected')),
  support_email text,
  website_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extension_marketplace_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_key text NOT NULL UNIQUE,
  publisher_id uuid REFERENCES public.extension_marketplace_publishers(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('erp','crm','payment','delivery','ai','marketing','accounting','bi','marketplace','productivity','communication','analytics','other')),
  description text NOT NULL,
  icon_url text,
  listing_status text NOT NULL DEFAULT 'draft' CHECK (listing_status IN ('draft','review','published','private','suspended','archived')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','beta','experimental','public','disabled')),
  minimum_platform_version text NOT NULL DEFAULT 'p4.5',
  compatibility_policy jsonb NOT NULL DEFAULT '{"requires_gateway":true,"requires_connector_framework":true,"direct_p0_access":false}'::jsonb,
  license text NOT NULL DEFAULT 'commercial',
  documentation_url text,
  support_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extension_marketplace_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id uuid NOT NULL REFERENCES public.extension_marketplace_extensions(id) ON DELETE CASCADE,
  version text NOT NULL,
  release_status text NOT NULL DEFAULT 'draft' CHECK (release_status IN ('draft','submitted','approved','published','deprecated','blocked')),
  changelog text NOT NULL DEFAULT '',
  package_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  dependencies text[] NOT NULL DEFAULT ARRAY[]::text[],
  requested_permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  required_capabilities text[] NOT NULL DEFAULT ARRAY[]::text[],
  consumed_events text[] NOT NULL DEFAULT ARRAY[]::text[],
  produced_events text[] NOT NULL DEFAULT ARRAY[]::text[],
  required_api_endpoints text[] NOT NULL DEFAULT ARRAY[]::text[],
  required_connectors text[] NOT NULL DEFAULT ARRAY[]::text[],
  signature_digest text,
  integrity_digest text,
  rollback_notes text,
  published_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(extension_id, version)
);

CREATE TABLE IF NOT EXISTS public.extension_marketplace_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id uuid NOT NULL REFERENCES public.extension_marketplace_extensions(id) ON DELETE RESTRICT,
  version_id uuid NOT NULL REFERENCES public.extension_marketplace_versions(id) ON DELETE RESTRICT,
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox','staging','production')),
  install_status text NOT NULL DEFAULT 'active' CHECK (install_status IN ('sandbox','active','disabled','uninstalled','rollback_required','failed')),
  installed_by uuid DEFAULT auth.uid(),
  installed_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  uninstalled_at timestamptz,
  feature_flag_key text,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_health_status text NOT NULL DEFAULT 'unknown' CHECK (last_health_status IN ('healthy','warning','critical','unknown')),
  last_health_score numeric NOT NULL DEFAULT 0 CHECK (last_health_score BETWEEN 0 AND 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(extension_id, environment)
);

CREATE TABLE IF NOT EXISTS public.extension_marketplace_operations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation_key text NOT NULL DEFAULT ('extop_' || replace(gen_random_uuid()::text, '-', '')),
  extension_id uuid REFERENCES public.extension_marketplace_extensions(id) ON DELETE SET NULL,
  version_id uuid REFERENCES public.extension_marketplace_versions(id) ON DELETE SET NULL,
  installation_id uuid REFERENCES public.extension_marketplace_installations(id) ON DELETE SET NULL,
  actor_user_id uuid DEFAULT auth.uid(),
  operation_type text NOT NULL CHECK (operation_type IN ('submit','validate','install','sandbox_install','update','disable','reactivate','uninstall','rollback','reject')),
  operation_status text NOT NULL DEFAULT 'completed' CHECK (operation_status IN ('queued','completed','failed','blocked')),
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extension_marketplace_validation_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id uuid REFERENCES public.extension_marketplace_extensions(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.extension_marketplace_versions(id) ON DELETE CASCADE,
  finding_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  detail text NOT NULL,
  required_action text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','accepted_risk','false_positive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.extension_marketplace_sandbox_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id uuid REFERENCES public.extension_marketplace_extensions(id) ON DELETE SET NULL,
  version_id uuid REFERENCES public.extension_marketplace_versions(id) ON DELETE SET NULL,
  actor_user_id uuid DEFAULT auth.uid(),
  scenario_key text NOT NULL,
  run_status text NOT NULL DEFAULT 'completed' CHECK (run_status IN ('queued','completed','failed')),
  validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  side_effects text NOT NULL DEFAULT 'none' CHECK (side_effects IN ('none','sandbox_only')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extension_marketplace_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id uuid REFERENCES public.extension_marketplace_extensions(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  api_calls integer NOT NULL DEFAULT 0 CHECK (api_calls >= 0),
  api_errors integer NOT NULL DEFAULT 0 CHECK (api_errors >= 0),
  events_processed integer NOT NULL DEFAULT 0 CHECK (events_processed >= 0),
  sync_runs integer NOT NULL DEFAULT 0 CHECK (sync_runs >= 0),
  avg_latency_ms numeric NOT NULL DEFAULT 0 CHECK (avg_latency_ms >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(extension_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_extension_marketplace_extensions_status ON public.extension_marketplace_extensions(listing_status, visibility, category);
CREATE INDEX IF NOT EXISTS idx_extension_marketplace_versions_extension ON public.extension_marketplace_versions(extension_id, release_status);
CREATE INDEX IF NOT EXISTS idx_extension_marketplace_installations_status ON public.extension_marketplace_installations(install_status, environment);
CREATE INDEX IF NOT EXISTS idx_extension_marketplace_operations_extension ON public.extension_marketplace_operations(extension_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extension_marketplace_findings_status ON public.extension_marketplace_validation_findings(status, severity);

CREATE OR REPLACE FUNCTION public.extension_marketplace_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_extension_publishers_touch ON public.extension_marketplace_publishers;
CREATE TRIGGER trg_extension_publishers_touch
  BEFORE UPDATE ON public.extension_marketplace_publishers
  FOR EACH ROW EXECUTE FUNCTION public.extension_marketplace_touch_updated_at();

DROP TRIGGER IF EXISTS trg_extension_listings_touch ON public.extension_marketplace_extensions;
CREATE TRIGGER trg_extension_listings_touch
  BEFORE UPDATE ON public.extension_marketplace_extensions
  FOR EACH ROW EXECUTE FUNCTION public.extension_marketplace_touch_updated_at();

DROP TRIGGER IF EXISTS trg_extension_versions_touch ON public.extension_marketplace_versions;
CREATE TRIGGER trg_extension_versions_touch
  BEFORE UPDATE ON public.extension_marketplace_versions
  FOR EACH ROW EXECUTE FUNCTION public.extension_marketplace_touch_updated_at();

DROP TRIGGER IF EXISTS trg_extension_installations_touch ON public.extension_marketplace_installations;
CREATE TRIGGER trg_extension_installations_touch
  BEFORE UPDATE ON public.extension_marketplace_installations
  FOR EACH ROW EXECUTE FUNCTION public.extension_marketplace_touch_updated_at();

CREATE OR REPLACE FUNCTION public.extension_marketplace_history_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'extension_marketplace_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_extension_operations_append_only_update ON public.extension_marketplace_operations;
CREATE TRIGGER trg_extension_operations_append_only_update
  BEFORE UPDATE ON public.extension_marketplace_operations
  FOR EACH ROW EXECUTE FUNCTION public.extension_marketplace_history_is_append_only();

DROP TRIGGER IF EXISTS trg_extension_operations_append_only_delete ON public.extension_marketplace_operations;
CREATE TRIGGER trg_extension_operations_append_only_delete
  BEFORE DELETE ON public.extension_marketplace_operations
  FOR EACH ROW EXECUTE FUNCTION public.extension_marketplace_history_is_append_only();

DROP TRIGGER IF EXISTS trg_extension_sandbox_append_only_update ON public.extension_marketplace_sandbox_runs;
CREATE TRIGGER trg_extension_sandbox_append_only_update
  BEFORE UPDATE ON public.extension_marketplace_sandbox_runs
  FOR EACH ROW EXECUTE FUNCTION public.extension_marketplace_history_is_append_only();

DROP TRIGGER IF EXISTS trg_extension_sandbox_append_only_delete ON public.extension_marketplace_sandbox_runs;
CREATE TRIGGER trg_extension_sandbox_append_only_delete
  BEFORE DELETE ON public.extension_marketplace_sandbox_runs
  FOR EACH ROW EXECUTE FUNCTION public.extension_marketplace_history_is_append_only();

CREATE OR REPLACE FUNCTION public.extension_marketplace_log_operation(
  _operation_type text,
  _extension_id uuid,
  _version_id uuid DEFAULT NULL,
  _installation_id uuid DEFAULT NULL,
  _status text DEFAULT 'completed',
  _reason text DEFAULT NULL,
  _previous_state jsonb DEFAULT '{}'::jsonb,
  _new_state jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO public.extension_marketplace_operations(
    extension_id, version_id, installation_id, actor_user_id, operation_type,
    operation_status, previous_state, new_state, reason
  )
  VALUES (
    _extension_id, _version_id, _installation_id, auth.uid(), _operation_type,
    _status, COALESCE(_previous_state, '{}'::jsonb), COALESCE(_new_state, '{}'::jsonb), _reason
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_register_extension_listing(_extension jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_publisher_id uuid;
  v_extension_id uuid;
  v_extension_key text := lower(regexp_replace(COALESCE(NULLIF(_extension->>'extension_key', ''), 'ext-' || replace(gen_random_uuid()::text, '-', '')), '[^a-z0-9_.-]+', '-', 'g'));
BEGIN
  IF NOT public.extension_marketplace_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  INSERT INTO public.extension_marketplace_publishers(publisher_key, name, publisher_type, verification_status, owner_user_id)
  VALUES (
    COALESCE(NULLIF(_extension->>'publisher_key', ''), 'lpb-internal'),
    COALESCE(NULLIF(_extension->>'publisher_name', ''), 'La Petite Bouteille'),
    COALESCE(NULLIF(_extension->>'publisher_type', ''), 'internal'),
    COALESCE(NULLIF(_extension->>'verification_status', ''), 'verified'),
    auth.uid()
  )
  ON CONFLICT (publisher_key) DO UPDATE
  SET name = EXCLUDED.name,
      publisher_type = EXCLUDED.publisher_type,
      verification_status = EXCLUDED.verification_status,
      updated_at = now()
  RETURNING id INTO v_publisher_id;

  INSERT INTO public.extension_marketplace_extensions(
    extension_key, publisher_id, name, category, description, icon_url, listing_status,
    visibility, minimum_platform_version, compatibility_policy, license, documentation_url, support_url, metadata, created_by
  )
  VALUES (
    v_extension_key,
    v_publisher_id,
    COALESCE(NULLIF(_extension->>'name', ''), v_extension_key),
    COALESCE(NULLIF(_extension->>'category', ''), 'other'),
    COALESCE(NULLIF(_extension->>'description', ''), 'Extension LPB'),
    NULLIF(_extension->>'icon_url', ''),
    COALESCE(NULLIF(_extension->>'listing_status', ''), 'draft'),
    COALESCE(NULLIF(_extension->>'visibility', ''), 'private'),
    COALESCE(NULLIF(_extension->>'minimum_platform_version', ''), 'p4.5'),
    COALESCE(_extension->'compatibility_policy', '{"requires_gateway":true,"requires_connector_framework":true,"direct_p0_access":false}'::jsonb),
    COALESCE(NULLIF(_extension->>'license', ''), 'commercial'),
    NULLIF(_extension->>'documentation_url', ''),
    NULLIF(_extension->>'support_url', ''),
    COALESCE(_extension->'metadata', '{}'::jsonb),
    auth.uid()
  )
  ON CONFLICT (extension_key) DO UPDATE
  SET publisher_id = EXCLUDED.publisher_id,
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      icon_url = EXCLUDED.icon_url,
      listing_status = EXCLUDED.listing_status,
      visibility = EXCLUDED.visibility,
      minimum_platform_version = EXCLUDED.minimum_platform_version,
      compatibility_policy = EXCLUDED.compatibility_policy,
      license = EXCLUDED.license,
      documentation_url = EXCLUDED.documentation_url,
      support_url = EXCLUDED.support_url,
      metadata = EXCLUDED.metadata,
      updated_at = now()
  RETURNING id INTO v_extension_id;

  PERFORM public.extension_marketplace_log_operation('submit', v_extension_id, NULL, NULL, 'completed', 'Extension listing registered');

  RETURN jsonb_build_object('extension_id', v_extension_id, 'extension_key', v_extension_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_publish_extension_version(_extension_key text, _version jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_extension_id uuid;
  v_version_id uuid;
BEGIN
  IF NOT public.extension_marketplace_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT id INTO v_extension_id
  FROM public.extension_marketplace_extensions
  WHERE extension_key = _extension_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'extension_not_found';
  END IF;

  INSERT INTO public.extension_marketplace_versions(
    extension_id, version, release_status, changelog, package_manifest,
    dependencies, requested_permissions, required_capabilities, consumed_events,
    produced_events, required_api_endpoints, required_connectors, signature_digest,
    integrity_digest, rollback_notes, published_at, metadata, created_by
  )
  VALUES (
    v_extension_id,
    COALESCE(NULLIF(_version->>'version', ''), '0.1.0'),
    COALESCE(NULLIF(_version->>'release_status', ''), 'submitted'),
    COALESCE(_version->>'changelog', ''),
    COALESCE(_version->'package_manifest', '{}'::jsonb),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_version->'dependencies', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_version->'requested_permissions', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_version->'required_capabilities', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_version->'consumed_events', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_version->'produced_events', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_version->'required_api_endpoints', '[]'::jsonb))), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_version->'required_connectors', '[]'::jsonb))), ARRAY[]::text[]),
    NULLIF(_version->>'signature_digest', ''),
    NULLIF(_version->>'integrity_digest', ''),
    NULLIF(_version->>'rollback_notes', ''),
    CASE WHEN COALESCE(NULLIF(_version->>'release_status', ''), 'submitted') = 'published' THEN now() ELSE NULL END,
    COALESCE(_version->'metadata', '{}'::jsonb),
    auth.uid()
  )
  ON CONFLICT (extension_id, version) DO UPDATE
  SET release_status = EXCLUDED.release_status,
      changelog = EXCLUDED.changelog,
      package_manifest = EXCLUDED.package_manifest,
      dependencies = EXCLUDED.dependencies,
      requested_permissions = EXCLUDED.requested_permissions,
      required_capabilities = EXCLUDED.required_capabilities,
      consumed_events = EXCLUDED.consumed_events,
      produced_events = EXCLUDED.produced_events,
      required_api_endpoints = EXCLUDED.required_api_endpoints,
      required_connectors = EXCLUDED.required_connectors,
      signature_digest = EXCLUDED.signature_digest,
      integrity_digest = EXCLUDED.integrity_digest,
      rollback_notes = EXCLUDED.rollback_notes,
      published_at = EXCLUDED.published_at,
      metadata = EXCLUDED.metadata,
      updated_at = now()
  RETURNING id INTO v_version_id;

  PERFORM public.extension_marketplace_log_operation('submit', v_extension_id, v_version_id, NULL, 'completed', 'Extension version submitted');

  RETURN jsonb_build_object('extension_id', v_extension_id, 'version_id', v_version_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_validate_extension_version(_version_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version public.extension_marketplace_versions%ROWTYPE;
  v_extension public.extension_marketplace_extensions%ROWTYPE;
  v_missing_capabilities text[];
  v_missing_events text[];
  v_missing_endpoints text[];
  v_missing_connectors text[];
  v_financial_risk text[];
  v_open_findings integer;
BEGIN
  IF NOT public.extension_marketplace_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT * INTO v_version
  FROM public.extension_marketplace_versions
  WHERE id = _version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'version_not_found';
  END IF;

  SELECT * INTO v_extension
  FROM public.extension_marketplace_extensions
  WHERE id = v_version.extension_id;

  UPDATE public.extension_marketplace_validation_findings
  SET status = 'resolved',
      resolved_at = now()
  WHERE version_id = _version_id
    AND status = 'open';

  SELECT COALESCE(array_agg(cap), ARRAY[]::text[]) INTO v_missing_capabilities
  FROM unnest(v_version.required_capabilities) cap
  WHERE NOT EXISTS (
    SELECT 1 FROM public.platform_capability_registry c
    WHERE c.capability_key = cap
      AND c.status IN ('active','observation','experimental')
  );

  SELECT COALESCE(array_agg(evt), ARRAY[]::text[]) INTO v_missing_events
  FROM unnest(v_version.consumed_events || v_version.produced_events) evt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.platform_event_catalog e
    WHERE e.event_key = evt
      AND e.status IN ('active','experimental')
  );

  SELECT COALESCE(array_agg(ep), ARRAY[]::text[]) INTO v_missing_endpoints
  FROM unnest(v_version.required_api_endpoints) ep
  WHERE NOT EXISTS (
    SELECT 1 FROM public.api_gateway_endpoints a
    WHERE a.endpoint_key = ep
      AND a.status IN ('active','deprecated')
  );

  SELECT COALESCE(array_agg(conn), ARRAY[]::text[]) INTO v_missing_connectors
  FROM unnest(v_version.required_connectors) conn
  WHERE NOT EXISTS (
    SELECT 1 FROM public.integration_hub_connectors c
    WHERE c.connector_key = conn
      AND c.status IN ('enabled','experimental')
  );

  SELECT COALESCE(array_agg(cap), ARRAY[]::text[]) INTO v_financial_risk
  FROM unnest(v_version.required_capabilities || v_version.requested_permissions) cap
  WHERE cap ~* '(wallet|commission|payment|withdrawal|ledger|revenue|escrow|financial)';

  INSERT INTO public.extension_marketplace_validation_findings(extension_id, version_id, finding_type, severity, detail, required_action)
  SELECT v_extension.id, _version_id, 'missing_capability', 'high', 'Capability absente: ' || cap, 'Declarer ou retirer la capability'
  FROM unnest(v_missing_capabilities) cap;

  INSERT INTO public.extension_marketplace_validation_findings(extension_id, version_id, finding_type, severity, detail, required_action)
  SELECT v_extension.id, _version_id, 'missing_event', 'medium', 'Evenement absent: ' || evt, 'Declarer ou retirer evenement'
  FROM unnest(v_missing_events) evt;

  INSERT INTO public.extension_marketplace_validation_findings(extension_id, version_id, finding_type, severity, detail, required_action)
  SELECT v_extension.id, _version_id, 'missing_api_endpoint', 'high', 'Endpoint API absent: ' || ep, 'Passer par API Gateway'
  FROM unnest(v_missing_endpoints) ep;

  INSERT INTO public.extension_marketplace_validation_findings(extension_id, version_id, finding_type, severity, detail, required_action)
  SELECT v_extension.id, _version_id, 'missing_connector', 'medium', 'Connecteur absent: ' || conn, 'Installer ou retirer connecteur'
  FROM unnest(v_missing_connectors) conn;

  INSERT INTO public.extension_marketplace_validation_findings(extension_id, version_id, finding_type, severity, detail, required_action)
  SELECT v_extension.id, _version_id, 'financial_surface_requested', 'critical', 'Surface financiere demandee: ' || cap, 'Refuser acces direct P0 et passer par interfaces autorisees'
  FROM unnest(v_financial_risk) cap;

  IF v_version.signature_digest IS NULL OR v_version.integrity_digest IS NULL THEN
    INSERT INTO public.extension_marketplace_validation_findings(extension_id, version_id, finding_type, severity, detail, required_action)
    VALUES (v_extension.id, _version_id, 'missing_integrity_signature', 'high', 'Signature ou digest integrite absent', 'Fournir signature_digest et integrity_digest');
  END IF;

  SELECT count(*) INTO v_open_findings
  FROM public.extension_marketplace_validation_findings
  WHERE version_id = _version_id
    AND status = 'open'
    AND severity IN ('high','critical');

  UPDATE public.extension_marketplace_versions
  SET release_status = CASE WHEN v_open_findings = 0 THEN 'approved' ELSE 'blocked' END,
      updated_at = now()
  WHERE id = _version_id;

  PERFORM public.extension_marketplace_log_operation(
    'validate', v_extension.id, _version_id, NULL,
    CASE WHEN v_open_findings = 0 THEN 'completed' ELSE 'blocked' END,
    'Compatibility and security validation completed',
    '{}'::jsonb,
    jsonb_build_object('high_or_critical_findings', v_open_findings)
  );

  RETURN jsonb_build_object(
    'version_id', _version_id,
    'approved', v_open_findings = 0,
    'high_or_critical_findings', v_open_findings,
    'missing_capabilities', v_missing_capabilities,
    'missing_events', v_missing_events,
    'missing_endpoints', v_missing_endpoints,
    'missing_connectors', v_missing_connectors,
    'financial_risk', v_financial_risk
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_install_extension(_version_id uuid, _environment text DEFAULT 'sandbox', _configuration jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version public.extension_marketplace_versions%ROWTYPE;
  v_extension public.extension_marketplace_extensions%ROWTYPE;
  v_validation jsonb;
  v_install_id uuid;
  v_status text;
  v_feature_environment text;
BEGIN
  IF NOT public.extension_marketplace_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF _environment NOT IN ('sandbox','staging','production') THEN
    RAISE EXCEPTION 'invalid_environment';
  END IF;

  SELECT * INTO v_version FROM public.extension_marketplace_versions WHERE id = _version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'version_not_found';
  END IF;

  SELECT * INTO v_extension FROM public.extension_marketplace_extensions WHERE id = v_version.extension_id FOR UPDATE;

  v_validation := public.admin_validate_extension_version(_version_id);
  IF COALESCE((v_validation->>'approved')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'extension_validation_failed';
  END IF;

  v_status := CASE WHEN _environment = 'sandbox' THEN 'sandbox' ELSE 'active' END;
  v_feature_environment := CASE WHEN _environment = 'sandbox' THEN 'staging' ELSE _environment END;

  INSERT INTO public.extension_marketplace_installations(
    extension_id, version_id, environment, install_status, installed_by,
    feature_flag_key, configuration, last_health_status, last_health_score
  )
  VALUES (
    v_extension.id,
    _version_id,
    _environment,
    v_status,
    auth.uid(),
    'extension.' || v_extension.extension_key || '.' || _environment,
    COALESCE(_configuration, '{}'::jsonb),
    'healthy',
    100
  )
  ON CONFLICT (extension_id, environment) DO UPDATE
  SET version_id = EXCLUDED.version_id,
      install_status = EXCLUDED.install_status,
      installed_by = EXCLUDED.installed_by,
      installed_at = now(),
      configuration = EXCLUDED.configuration,
      last_health_status = EXCLUDED.last_health_status,
      last_health_score = EXCLUDED.last_health_score,
      updated_at = now()
  RETURNING id INTO v_install_id;

  INSERT INTO public.platform_feature_flags(flag_key, module_key, description, status, environment, eligibility_rules, allowed_roles, rollout_percent, metadata)
  VALUES (
    'extension.' || v_extension.extension_key || '.' || _environment,
    'p45_extension_marketplace',
    'Feature flag installation extension ' || v_extension.extension_key || ' en ' || _environment,
    CASE WHEN _environment = 'production' THEN 'limited' ELSE 'experimental' END,
    v_feature_environment,
    jsonb_build_object('extension_key', v_extension.extension_key, 'version', v_version.version),
    ARRAY['admin'],
    CASE WHEN _environment = 'production' THEN 0 ELSE 100 END,
    jsonb_build_object('installed_by', auth.uid(), 'installation_id', v_install_id)
  )
  ON CONFLICT (flag_key) DO UPDATE
  SET description = EXCLUDED.description,
      status = EXCLUDED.status,
      environment = EXCLUDED.environment,
      eligibility_rules = EXCLUDED.eligibility_rules,
      allowed_roles = EXCLUDED.allowed_roles,
      rollout_percent = EXCLUDED.rollout_percent,
      metadata = EXCLUDED.metadata,
      updated_at = now();

  PERFORM public.extension_marketplace_log_operation(
    CASE WHEN _environment = 'sandbox' THEN 'sandbox_install' ELSE 'install' END,
    v_extension.id, _version_id, v_install_id, 'completed', 'Extension installed through App Store'
  );

  RETURN jsonb_build_object('installation_id', v_install_id, 'status', v_status, 'environment', _environment);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_extension_installation_status(_installation_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_install public.extension_marketplace_installations%ROWTYPE;
  v_operation text;
BEGIN
  IF NOT public.extension_marketplace_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF _status NOT IN ('active','disabled','uninstalled') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  SELECT * INTO v_install
  FROM public.extension_marketplace_installations
  WHERE id = _installation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'installation_not_found';
  END IF;

  v_operation := CASE
    WHEN _status = 'disabled' THEN 'disable'
    WHEN _status = 'uninstalled' THEN 'uninstall'
    ELSE 'reactivate'
  END;

  UPDATE public.extension_marketplace_installations
  SET install_status = _status,
      disabled_at = CASE WHEN _status = 'disabled' THEN now() ELSE disabled_at END,
      uninstalled_at = CASE WHEN _status = 'uninstalled' THEN now() ELSE uninstalled_at END,
      updated_at = now()
  WHERE id = _installation_id;

  UPDATE public.platform_feature_flags
  SET status = CASE WHEN _status = 'active' THEN 'limited' ELSE 'disabled' END,
      rollout_percent = CASE WHEN _status = 'active' THEN rollout_percent ELSE 0 END,
      updated_at = now()
  WHERE flag_key = v_install.feature_flag_key;

  PERFORM public.extension_marketplace_log_operation(v_operation, v_install.extension_id, v_install.version_id, _installation_id, 'completed', _reason);

  RETURN jsonb_build_object('installation_id', _installation_id, 'status', _status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rollback_extension(_installation_id uuid, _target_version_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_install public.extension_marketplace_installations%ROWTYPE;
  v_target public.extension_marketplace_versions%ROWTYPE;
BEGIN
  IF NOT public.extension_marketplace_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT * INTO v_install
  FROM public.extension_marketplace_installations
  WHERE id = _installation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'installation_not_found';
  END IF;

  SELECT * INTO v_target
  FROM public.extension_marketplace_versions
  WHERE id = _target_version_id
    AND extension_id = v_install.extension_id
    AND release_status IN ('approved','published','deprecated');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'rollback_version_not_allowed';
  END IF;

  UPDATE public.extension_marketplace_installations
  SET version_id = _target_version_id,
      install_status = 'active',
      last_health_status = 'warning',
      last_health_score = 75,
      updated_at = now()
  WHERE id = _installation_id;

  PERFORM public.extension_marketplace_log_operation(
    'rollback', v_install.extension_id, _target_version_id, _installation_id, 'completed',
    COALESCE(_reason, 'Rollback requested'),
    jsonb_build_object('previous_version_id', v_install.version_id),
    jsonb_build_object('target_version_id', _target_version_id)
  );

  RETURN jsonb_build_object('installation_id', _installation_id, 'version_id', _target_version_id, 'status', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_run_extension_sandbox(_version_id uuid, _scenario_key text DEFAULT 'compatibility.default')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version public.extension_marketplace_versions%ROWTYPE;
  v_validation jsonb;
  v_run_id uuid;
BEGIN
  IF NOT public.extension_marketplace_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT * INTO v_version
  FROM public.extension_marketplace_versions
  WHERE id = _version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'version_not_found';
  END IF;

  v_validation := public.admin_validate_extension_version(_version_id);

  INSERT INTO public.extension_marketplace_sandbox_runs(
    extension_id, version_id, actor_user_id, scenario_key, run_status,
    validation_summary, rollback_plan, side_effects
  )
  VALUES (
    v_version.extension_id,
    _version_id,
    auth.uid(),
    COALESCE(NULLIF(_scenario_key, ''), 'compatibility.default'),
    CASE WHEN COALESCE((v_validation->>'approved')::boolean, false) THEN 'completed' ELSE 'failed' END,
    v_validation,
    jsonb_build_object('rollback_supported', true, 'requires_manual_approval', true),
    'none'
  )
  RETURNING id INTO v_run_id;

  RETURN jsonb_build_object('run_id', v_run_id, 'validation', v_validation, 'side_effects', 'none');
END;
$$;

CREATE OR REPLACE VIEW public.admin_extension_marketplace_overview AS
SELECT
  (SELECT count(*) FROM public.extension_marketplace_extensions)::integer AS extensions_count,
  (SELECT count(*) FROM public.extension_marketplace_extensions WHERE listing_status = 'published')::integer AS published_extensions_count,
  (SELECT count(*) FROM public.extension_marketplace_installations WHERE install_status IN ('active','sandbox'))::integer AS installed_extensions_count,
  (SELECT count(*) FROM public.extension_marketplace_versions WHERE release_status = 'blocked')::integer AS blocked_versions_count,
  (SELECT count(*) FROM public.extension_marketplace_validation_findings WHERE status = 'open')::integer AS open_findings_count,
  (SELECT count(*) FROM public.extension_marketplace_operations WHERE created_at >= now() - interval '24 hours')::integer AS operations_24h,
  (SELECT count(*) FROM public.extension_marketplace_sandbox_runs WHERE created_at >= now() - interval '24 hours')::integer AS sandbox_runs_24h
WHERE public.extension_marketplace_is_admin();

CREATE OR REPLACE VIEW public.admin_extension_marketplace_catalog AS
SELECT
  e.*,
  p.name AS publisher_name,
  p.verification_status,
  (SELECT count(*) FROM public.extension_marketplace_versions v WHERE v.extension_id = e.id)::integer AS version_count,
  (SELECT count(*) FROM public.extension_marketplace_installations i WHERE i.extension_id = e.id AND i.install_status IN ('active','sandbox'))::integer AS installation_count,
  (SELECT count(*) FROM public.extension_marketplace_validation_findings f WHERE f.extension_id = e.id AND f.status = 'open')::integer AS open_finding_count
FROM public.extension_marketplace_extensions e
LEFT JOIN public.extension_marketplace_publishers p ON p.id = e.publisher_id
WHERE public.extension_marketplace_is_admin()
ORDER BY e.category, e.name;

CREATE OR REPLACE VIEW public.admin_extension_marketplace_versions AS
SELECT v.*, e.extension_key, e.name AS extension_name, e.category
FROM public.extension_marketplace_versions v
JOIN public.extension_marketplace_extensions e ON e.id = v.extension_id
WHERE public.extension_marketplace_is_admin()
ORDER BY v.created_at DESC;

CREATE OR REPLACE VIEW public.admin_extension_marketplace_installations AS
SELECT i.*, e.extension_key, e.name AS extension_name, e.category, v.version
FROM public.extension_marketplace_installations i
JOIN public.extension_marketplace_extensions e ON e.id = i.extension_id
JOIN public.extension_marketplace_versions v ON v.id = i.version_id
WHERE public.extension_marketplace_is_admin()
ORDER BY i.updated_at DESC;

CREATE OR REPLACE VIEW public.admin_extension_marketplace_operations AS
SELECT o.*, e.extension_key, e.name AS extension_name, v.version
FROM public.extension_marketplace_operations o
LEFT JOIN public.extension_marketplace_extensions e ON e.id = o.extension_id
LEFT JOIN public.extension_marketplace_versions v ON v.id = o.version_id
WHERE public.extension_marketplace_is_admin()
ORDER BY o.created_at DESC;

CREATE OR REPLACE VIEW public.admin_extension_marketplace_findings AS
SELECT f.*, e.extension_key, e.name AS extension_name, v.version
FROM public.extension_marketplace_validation_findings f
LEFT JOIN public.extension_marketplace_extensions e ON e.id = f.extension_id
LEFT JOIN public.extension_marketplace_versions v ON v.id = f.version_id
WHERE public.extension_marketplace_is_admin()
ORDER BY f.created_at DESC;

CREATE OR REPLACE VIEW public.admin_extension_marketplace_sandbox_runs AS
SELECT r.*, e.extension_key, e.name AS extension_name, v.version
FROM public.extension_marketplace_sandbox_runs r
LEFT JOIN public.extension_marketplace_extensions e ON e.id = r.extension_id
LEFT JOIN public.extension_marketplace_versions v ON v.id = r.version_id
WHERE public.extension_marketplace_is_admin()
ORDER BY r.created_at DESC;

CREATE OR REPLACE VIEW public.admin_extension_marketplace_health AS
SELECT
  e.extension_key,
  e.name,
  COALESCE(i.install_status, 'not_installed') AS install_status,
  COALESCE(i.last_health_status, 'unknown') AS health_status,
  COALESCE(i.last_health_score, 0) AS health_score,
  COALESCE(u.api_calls, 0) AS api_calls_today,
  COALESCE(u.api_errors, 0) AS api_errors_today,
  COALESCE(u.avg_latency_ms, 0) AS avg_latency_ms_today,
  (SELECT count(*) FROM public.extension_marketplace_validation_findings f WHERE f.extension_id = e.id AND f.status = 'open' AND f.severity IN ('high','critical'))::integer AS blocking_findings
FROM public.extension_marketplace_extensions e
LEFT JOIN public.extension_marketplace_installations i ON i.extension_id = e.id AND i.environment = 'production'
LEFT JOIN public.extension_marketplace_usage_daily u ON u.extension_id = e.id AND u.usage_date = CURRENT_DATE
WHERE public.extension_marketplace_is_admin()
ORDER BY health_score ASC, e.name;

CREATE OR REPLACE VIEW public.admin_extension_marketplace_security_findings AS
SELECT 'financial_surface_requested'::text AS finding_type, 'critical'::text AS severity, e.extension_key AS subject_key, 'Extension demande une surface financiere interdite'::text AS detail
FROM public.extension_marketplace_versions v
JOIN public.extension_marketplace_extensions e ON e.id = v.extension_id
WHERE public.extension_marketplace_is_admin()
  AND EXISTS (
    SELECT 1
    FROM unnest(v.required_capabilities || v.requested_permissions) item
    WHERE item ~* '(wallet|commission|payment|withdrawal|ledger|revenue|escrow|financial)'
  )
UNION ALL
SELECT 'missing_signature', 'high', e.extension_key, 'Version sans signature ou digest integrite'
FROM public.extension_marketplace_versions v
JOIN public.extension_marketplace_extensions e ON e.id = v.extension_id
WHERE public.extension_marketplace_is_admin()
  AND (v.signature_digest IS NULL OR v.integrity_digest IS NULL)
UNION ALL
SELECT 'production_rollout_not_limited', 'medium', e.extension_key, 'Installation production active sans feature flag limite'
FROM public.extension_marketplace_installations i
JOIN public.extension_marketplace_extensions e ON e.id = i.extension_id
LEFT JOIN public.platform_feature_flags f ON f.flag_key = i.feature_flag_key
WHERE public.extension_marketplace_is_admin()
  AND i.environment = 'production'
  AND i.install_status = 'active'
  AND COALESCE(f.rollout_percent, 100) > 25;

CREATE OR REPLACE VIEW public.developer_extension_marketplace_my_extensions AS
SELECT e.*, p.name AS publisher_name
FROM public.extension_marketplace_extensions e
LEFT JOIN public.extension_marketplace_publishers p ON p.id = e.publisher_id
WHERE public.extension_marketplace_is_developer()
  AND (public.extension_marketplace_is_admin() OR p.owner_user_id = auth.uid())
ORDER BY e.updated_at DESC;

INSERT INTO public.platform_extension_modules(
  module_key, name, description, version, status, logical_owner, dependencies, provided_capabilities,
  produced_events, consumed_events, required_permissions, routes, rpc_functions, edge_functions, primary_tables,
  documentation_path, contract_version, can_be_disabled, metadata
)
VALUES (
  'p45_extension_marketplace',
  'P4.5 Marketplace App Store & Extension Marketplace',
  'Catalogue officiel des extensions LPB, installation controlee, validation, sandbox, rollback et observabilite.',
  'p4.5',
  'active',
  'architecture',
  ARRAY['p4_extension_framework','p42_api_integration_gateway','p43_integration_hub','p44_developer_portal','platform_observability'],
  ARRAY['extension.catalog.manage','extension.install.validate','extension.install.execute','extension.rollback.execute','extension.sandbox.run'],
  ARRAY['extension.submitted','extension.validated','extension.installed','extension.disabled','extension.rollback.completed'],
  ARRAY['developer.doc.updated','api.request.logged','connector.compatibility.finding'],
  ARRAY['admin'],
  ARRAY['/admin?tab=extension-marketplace'],
  ARRAY['admin_register_extension_listing','admin_publish_extension_version','admin_validate_extension_version','admin_install_extension','admin_set_extension_installation_status','admin_rollback_extension','admin_run_extension_sandbox'],
  ARRAY[]::text[],
  ARRAY['extension_marketplace_extensions','extension_marketplace_versions','extension_marketplace_installations','extension_marketplace_operations','extension_marketplace_validation_findings'],
  'docs/architecture/extension-marketplace.md',
  'v1',
  false,
  '{"mode":"controlled_app_store","p0_mutation_allowed":false}'::jsonb
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
    metadata = EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.platform_capability_registry(capability_key, module_key, description, version, access_type, required_permission, status, dependencies, input_contract, output_contract, documentation_path)
VALUES
  ('extension.catalog.manage', 'p45_extension_marketplace', 'Gerer catalogue officiel des extensions.', 'v1', 'admin', 'admin', 'active', ARRAY['developer.portal.manage'], '{"extension":"object"}'::jsonb, '{"extension_id":"uuid"}'::jsonb, 'docs/architecture/extension-marketplace.md#catalogue'),
  ('extension.install.validate', 'p45_extension_marketplace', 'Valider compatibilite, permissions, APIs, events et connecteurs avant installation.', 'v1', 'admin', 'admin', 'active', ARRAY['architecture.capability.declare','api.registry.manage','connector.compatibility.check'], '{"version_id":"uuid"}'::jsonb, '{"approved":"boolean"}'::jsonb, 'docs/architecture/extension-marketplace.md#validation'),
  ('extension.install.execute', 'p45_extension_marketplace', 'Installer ou mettre a jour une extension via feature flags controles.', 'v1', 'admin', 'admin', 'active', ARRAY['extension.install.validate'], '{"version_id":"uuid","environment":"text"}'::jsonb, '{"installation_id":"uuid"}'::jsonb, 'docs/architecture/extension-marketplace.md#installation'),
  ('extension.rollback.execute', 'p45_extension_marketplace', 'Rollback manuel vers version autorisee.', 'v1', 'admin', 'admin', 'active', ARRAY['extension.install.execute'], '{"installation_id":"uuid","target_version_id":"uuid"}'::jsonb, '{"status":"text"}'::jsonb, 'docs/architecture/extension-marketplace.md#rollback'),
  ('extension.sandbox.run', 'p45_extension_marketplace', 'Tester une extension sans effet production.', 'v1', 'admin', 'admin', 'active', ARRAY['developer.sandbox.run'], '{"version_id":"uuid"}'::jsonb, '{"side_effects":"none"}'::jsonb, 'docs/architecture/extension-marketplace.md#sandbox')
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
  ('extension.submitted', 'v1', 'p45_extension_marketplace', 'Extension ou version soumise.', '{"type":"object","required":["extension_key"]}'::jsonb, ARRAY['extension_key'], ARRAY['version'], 'internal', '36 months', ARRAY['p3_governance_operations','developer_portal'], 'active'),
  ('extension.validated', 'v1', 'p45_extension_marketplace', 'Validation extension terminee.', '{"type":"object","required":["extension_key","approved"]}'::jsonb, ARRAY['extension_key','approved'], ARRAY['finding_count'], 'internal', '36 months', ARRAY['platform_observability'], 'active'),
  ('extension.installed', 'v1', 'p45_extension_marketplace', 'Extension installee.', '{"type":"object","required":["extension_key","environment"]}'::jsonb, ARRAY['extension_key','environment'], ARRAY['version'], 'sensitive', '36 months', ARRAY['platform_observability','p43_integration_hub'], 'active'),
  ('extension.disabled', 'v1', 'p45_extension_marketplace', 'Extension desactivee ou desinstallee.', '{"type":"object","required":["extension_key","status"]}'::jsonb, ARRAY['extension_key','status'], ARRAY['reason'], 'sensitive', '36 months', ARRAY['platform_observability'], 'active'),
  ('extension.rollback.completed', 'v1', 'p45_extension_marketplace', 'Rollback extension termine.', '{"type":"object","required":["extension_key","target_version"]}'::jsonb, ARRAY['extension_key','target_version'], ARRAY['reason'], 'sensitive', '36 months', ARRAY['platform_observability'], 'active')
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
  ('admin_register_extension_listing', 'p45_extension_marketplace', 'Creer ou mettre a jour une fiche extension.', 'v1', 'active', '{"_extension":"jsonb"}'::jsonb, '{"extension_id":"uuid"}'::jsonb, ARRAY['admin'], '{"raises":["admin_required"]}'::jsonb, 'supported', 'audit', 'docs/architecture/extension-marketplace.md#rpc'),
  ('admin_publish_extension_version', 'p45_extension_marketplace', 'Publier une version candidate.', 'v1', 'active', '{"_extension_key":"text","_version":"jsonb"}'::jsonb, '{"version_id":"uuid"}'::jsonb, ARRAY['admin'], '{"raises":["extension_not_found"]}'::jsonb, 'supported', 'audit', 'docs/architecture/extension-marketplace.md#rpc'),
  ('admin_validate_extension_version', 'p45_extension_marketplace', 'Valider dependances, permissions, APIs, events et connecteurs.', 'v1', 'active', '{"_version_id":"uuid"}'::jsonb, '{"approved":"boolean"}'::jsonb, ARRAY['admin'], '{"blocks_financial_surface":true}'::jsonb, 'supported', 'audit', 'docs/architecture/extension-marketplace.md#rpc'),
  ('admin_install_extension', 'p45_extension_marketplace', 'Installer en sandbox/staging/production apres validation.', 'v1', 'active', '{"_version_id":"uuid","_environment":"text"}'::jsonb, '{"installation_id":"uuid"}'::jsonb, ARRAY['admin'], '{"raises":["extension_validation_failed"]}'::jsonb, 'supported', 'audit', 'docs/architecture/extension-marketplace.md#rpc'),
  ('admin_set_extension_installation_status', 'p45_extension_marketplace', 'Desactiver, reactiver ou desinstaller une extension.', 'v1', 'active', '{"_installation_id":"uuid","_status":"text"}'::jsonb, '{"status":"text"}'::jsonb, ARRAY['admin'], '{}'::jsonb, 'supported', 'audit', 'docs/architecture/extension-marketplace.md#rpc'),
  ('admin_rollback_extension', 'p45_extension_marketplace', 'Rollback manuel vers version autorisee.', 'v1', 'active', '{"_installation_id":"uuid","_target_version_id":"uuid"}'::jsonb, '{"status":"text"}'::jsonb, ARRAY['admin'], '{"manual_only":true}'::jsonb, 'supported', 'audit', 'docs/architecture/extension-marketplace.md#rpc'),
  ('admin_run_extension_sandbox', 'p45_extension_marketplace', 'Executer validation sandbox sans effet de bord.', 'v1', 'active', '{"_version_id":"uuid","_scenario_key":"text"}'::jsonb, '{"side_effects":"none"}'::jsonb, ARRAY['admin'], '{}'::jsonb, 'not_required', 'standard', 'docs/architecture/extension-marketplace.md#rpc')
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
  ('p4.extension_marketplace.admin_dashboard', 'p45_extension_marketplace', 'Affiche le dashboard App Store extensions aux admins.', 'enabled', 'production', '{"requires_admin":true}'::jsonb, ARRAY['admin'], 100, '{"seeded":true}'::jsonb),
  ('p4.extension_marketplace.public_catalog', 'p45_extension_marketplace', 'Catalogue public extensions. Desactive tant que revue commerciale/juridique non terminee.', 'disabled', 'production', '{"requires_legal_review":true}'::jsonb, ARRAY['admin'], 0, '{"seeded":true}'::jsonb)
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
  ('extension_marketplace', 'P4.5 Extension Marketplace', 'integration', 'p45_extension_marketplace', 'Catalogue, validation, sandbox, installation, rollback et sante des extensions.', '{"critical_finding_warning":1,"failed_sandbox_warning":1,"unhealthy_extension_warning":1}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    owner_module = EXCLUDED.owner_module,
    description = EXCLUDED.description,
    health_thresholds = EXCLUDED.health_thresholds,
    is_active = true,
    updated_at = now();

ALTER TABLE public.extension_marketplace_publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_marketplace_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_marketplace_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_marketplace_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_marketplace_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_marketplace_validation_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_marketplace_sandbox_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_marketplace_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage extension publishers" ON public.extension_marketplace_publishers;
CREATE POLICY "Admins manage extension publishers"
ON public.extension_marketplace_publishers FOR ALL TO authenticated
USING (public.extension_marketplace_is_admin())
WITH CHECK (public.extension_marketplace_is_admin());

DROP POLICY IF EXISTS "Developers read own publishers" ON public.extension_marketplace_publishers;
CREATE POLICY "Developers read own publishers"
ON public.extension_marketplace_publishers FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR public.extension_marketplace_is_admin());

DROP POLICY IF EXISTS "Admins manage extension listings" ON public.extension_marketplace_extensions;
CREATE POLICY "Admins manage extension listings"
ON public.extension_marketplace_extensions FOR ALL TO authenticated
USING (public.extension_marketplace_is_admin())
WITH CHECK (public.extension_marketplace_is_admin());

DROP POLICY IF EXISTS "Developers read own extension listings" ON public.extension_marketplace_extensions;
CREATE POLICY "Developers read own extension listings"
ON public.extension_marketplace_extensions FOR SELECT TO authenticated
USING (
  public.extension_marketplace_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.extension_marketplace_publishers p
    WHERE p.id = extension_marketplace_extensions.publisher_id
      AND p.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage extension versions" ON public.extension_marketplace_versions;
CREATE POLICY "Admins manage extension versions"
ON public.extension_marketplace_versions FOR ALL TO authenticated
USING (public.extension_marketplace_is_admin())
WITH CHECK (public.extension_marketplace_is_admin());

DROP POLICY IF EXISTS "Developers read own extension versions" ON public.extension_marketplace_versions;
CREATE POLICY "Developers read own extension versions"
ON public.extension_marketplace_versions FOR SELECT TO authenticated
USING (
  public.extension_marketplace_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.extension_marketplace_extensions e
    JOIN public.extension_marketplace_publishers p ON p.id = e.publisher_id
    WHERE e.id = extension_marketplace_versions.extension_id
      AND p.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage extension installations" ON public.extension_marketplace_installations;
CREATE POLICY "Admins manage extension installations"
ON public.extension_marketplace_installations FOR ALL TO authenticated
USING (public.extension_marketplace_is_admin())
WITH CHECK (public.extension_marketplace_is_admin());

DROP POLICY IF EXISTS "Admins read extension operations" ON public.extension_marketplace_operations;
CREATE POLICY "Admins read extension operations"
ON public.extension_marketplace_operations FOR SELECT TO authenticated
USING (public.extension_marketplace_is_admin());

DROP POLICY IF EXISTS "Admins manage extension findings" ON public.extension_marketplace_validation_findings;
CREATE POLICY "Admins manage extension findings"
ON public.extension_marketplace_validation_findings FOR ALL TO authenticated
USING (public.extension_marketplace_is_admin())
WITH CHECK (public.extension_marketplace_is_admin());

DROP POLICY IF EXISTS "Developers read own extension findings" ON public.extension_marketplace_validation_findings;
CREATE POLICY "Developers read own extension findings"
ON public.extension_marketplace_validation_findings FOR SELECT TO authenticated
USING (
  public.extension_marketplace_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.extension_marketplace_extensions e
    JOIN public.extension_marketplace_publishers p ON p.id = e.publisher_id
    WHERE e.id = extension_marketplace_validation_findings.extension_id
      AND p.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins read extension sandbox runs" ON public.extension_marketplace_sandbox_runs;
CREATE POLICY "Admins read extension sandbox runs"
ON public.extension_marketplace_sandbox_runs FOR SELECT TO authenticated
USING (public.extension_marketplace_is_admin());

DROP POLICY IF EXISTS "Admins manage extension usage" ON public.extension_marketplace_usage_daily;
CREATE POLICY "Admins manage extension usage"
ON public.extension_marketplace_usage_daily FOR ALL TO authenticated
USING (public.extension_marketplace_is_admin())
WITH CHECK (public.extension_marketplace_is_admin());

GRANT SELECT ON public.extension_marketplace_publishers TO authenticated, service_role;
GRANT SELECT ON public.extension_marketplace_extensions TO authenticated, service_role;
GRANT SELECT ON public.extension_marketplace_versions TO authenticated, service_role;
GRANT SELECT ON public.extension_marketplace_installations TO authenticated, service_role;
GRANT SELECT ON public.extension_marketplace_operations TO authenticated, service_role;
GRANT SELECT ON public.extension_marketplace_validation_findings TO authenticated, service_role;
GRANT SELECT ON public.extension_marketplace_sandbox_runs TO authenticated, service_role;
GRANT SELECT ON public.extension_marketplace_usage_daily TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_register_extension_listing(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_publish_extension_version(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_validate_extension_version(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_install_extension(uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_extension_installation_status(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_rollback_extension(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_run_extension_sandbox(uuid, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
