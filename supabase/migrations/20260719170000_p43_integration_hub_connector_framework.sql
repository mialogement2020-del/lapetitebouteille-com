-- P4.3 Integration Hub & Connector Framework.
-- Generic connector infrastructure only: no provider-specific connector and no P0 financial mutation.

CREATE OR REPLACE FUNCTION public.integration_hub_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.admin_permissions ap
        WHERE ap.user_id = auth.uid()
          AND ap.permission::text IN (
            'full_access',
            'security',
            'audit',
            'analytics',
            'marketplace_governance',
            'marketplace_analytics',
            'products'
          )
      )
    )
$$;

CREATE TABLE IF NOT EXISTS public.integration_hub_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_key text NOT NULL UNIQUE CHECK (connector_key ~ '^[a-z0-9][a-z0-9_.-]*$'),
  name text NOT NULL,
  description text NOT NULL,
  provider text NOT NULL DEFAULT 'generic',
  category text NOT NULL CHECK (category IN ('erp','crm','payment','logistics','ai','marketing','bi','observability','storage','communication','generic')),
  version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'installed' CHECK (status IN ('installed','enabled','disabled','maintenance','deprecated','experimental')),
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('local','preview','staging','production','all')),
  owner_module_key text NOT NULL DEFAULT 'p43_integration_hub',
  documentation_url text,
  installed_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  health_status text NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy','warning','critical','unknown')),
  health_score numeric NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  api_min_version text,
  gateway_required_version text NOT NULL DEFAULT 'v1',
  capabilities_used text[] NOT NULL DEFAULT ARRAY[]::text[],
  events_consumed text[] NOT NULL DEFAULT ARRAY[]::text[],
  events_produced text[] NOT NULL DEFAULT ARRAY[]::text[],
  feature_flag_key text,
  sync_policy jsonb NOT NULL DEFAULT '{"mode":"manual","max_parallelism":1,"retry_attempts":3}'::jsonb,
  compatibility_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.integration_hub_connector_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES public.integration_hub_connectors(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('local','preview','staging','production','all')),
  organization_key text NOT NULL DEFAULT 'default',
  config_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_parameters text[] NOT NULL DEFAULT ARRAY[]::text[],
  optional_parameters text[] NOT NULL DEFAULT ARRAY[]::text[],
  secret_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status text NOT NULL DEFAULT 'not_validated' CHECK (validation_status IN ('not_validated','valid','warning','invalid')),
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connector_id, environment, organization_key)
);

CREATE TABLE IF NOT EXISTS public.integration_hub_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES public.integration_hub_connectors(id) ON DELETE CASCADE,
  job_key text NOT NULL UNIQUE DEFAULT ('sync_' || gen_random_uuid()::text),
  sync_type text NOT NULL DEFAULT 'manual' CHECK (sync_type IN ('manual','scheduled','incremental','full','retry','deferred','test')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled','retrying','interrupted')),
  priority integer NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 1000),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 20),
  lock_token text,
  locked_at timestamptz,
  locked_by text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_hub_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.integration_hub_sync_jobs(id) ON DELETE SET NULL,
  connector_id uuid REFERENCES public.integration_hub_connectors(id) ON DELETE SET NULL,
  run_status text NOT NULL CHECK (run_status IN ('started','succeeded','failed','retry_scheduled','cancelled','interrupted')),
  duration_ms integer,
  records_read integer NOT NULL DEFAULT 0 CHECK (records_read >= 0),
  records_written integer NOT NULL DEFAULT 0 CHECK (records_written >= 0),
  records_failed integer NOT NULL DEFAULT 0 CHECK (records_failed >= 0),
  retry_after timestamptz,
  error_code text,
  error_message text,
  health_after text CHECK (health_after IN ('healthy','warning','critical','unknown')),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_hub_lifecycle_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  connector_id uuid REFERENCES public.integration_hub_connectors(id) ON DELETE SET NULL,
  connector_key text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('installed','enabled','disabled','maintenance','deprecated','updated','configuration_changed','sync_scheduled','sync_started','sync_succeeded','sync_failed','retry_scheduled','compatibility_checked','health_changed','deleted')),
  previous_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  actor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_hub_compatibility_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid REFERENCES public.integration_hub_connectors(id) ON DELETE CASCADE,
  connector_key text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  finding_type text NOT NULL,
  detail text NOT NULL,
  required_action text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','ignored')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  UNIQUE(connector_key, finding_type, detail)
);

CREATE INDEX IF NOT EXISTS idx_integration_hub_connectors_status
  ON public.integration_hub_connectors(status, category, health_status);
CREATE INDEX IF NOT EXISTS idx_integration_hub_sync_jobs_status
  ON public.integration_hub_sync_jobs(status, scheduled_for, priority);
CREATE INDEX IF NOT EXISTS idx_integration_hub_sync_runs_connector
  ON public.integration_hub_sync_runs(connector_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_hub_lifecycle_connector
  ON public.integration_hub_lifecycle_events(connector_key, created_at DESC);

CREATE OR REPLACE FUNCTION public.integration_hub_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_integration_hub_connectors_touch ON public.integration_hub_connectors;
CREATE TRIGGER trg_integration_hub_connectors_touch
  BEFORE UPDATE ON public.integration_hub_connectors
  FOR EACH ROW EXECUTE FUNCTION public.integration_hub_touch_updated_at();

DROP TRIGGER IF EXISTS trg_integration_hub_configs_touch ON public.integration_hub_connector_configs;
CREATE TRIGGER trg_integration_hub_configs_touch
  BEFORE UPDATE ON public.integration_hub_connector_configs
  FOR EACH ROW EXECUTE FUNCTION public.integration_hub_touch_updated_at();

DROP TRIGGER IF EXISTS trg_integration_hub_jobs_touch ON public.integration_hub_sync_jobs;
CREATE TRIGGER trg_integration_hub_jobs_touch
  BEFORE UPDATE ON public.integration_hub_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.integration_hub_touch_updated_at();

CREATE OR REPLACE FUNCTION public.integration_hub_history_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'integration_hub_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_integration_hub_sync_runs_append_only_update ON public.integration_hub_sync_runs;
CREATE TRIGGER trg_integration_hub_sync_runs_append_only_update
  BEFORE UPDATE ON public.integration_hub_sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.integration_hub_history_is_append_only();

DROP TRIGGER IF EXISTS trg_integration_hub_sync_runs_append_only_delete ON public.integration_hub_sync_runs;
CREATE TRIGGER trg_integration_hub_sync_runs_append_only_delete
  BEFORE DELETE ON public.integration_hub_sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.integration_hub_history_is_append_only();

DROP TRIGGER IF EXISTS trg_integration_hub_lifecycle_append_only_update ON public.integration_hub_lifecycle_events;
CREATE TRIGGER trg_integration_hub_lifecycle_append_only_update
  BEFORE UPDATE ON public.integration_hub_lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION public.integration_hub_history_is_append_only();

DROP TRIGGER IF EXISTS trg_integration_hub_lifecycle_append_only_delete ON public.integration_hub_lifecycle_events;
CREATE TRIGGER trg_integration_hub_lifecycle_append_only_delete
  BEFORE DELETE ON public.integration_hub_lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION public.integration_hub_history_is_append_only();

CREATE OR REPLACE FUNCTION public.integration_hub_log_event(
  _connector_id uuid,
  _connector_key text,
  _event_type text,
  _previous_values jsonb DEFAULT '{}'::jsonb,
  _new_values jsonb DEFAULT '{}'::jsonb,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.integration_hub_lifecycle_events(
    connector_id, connector_key, event_type, previous_values, new_values, reason, actor_id
  )
  VALUES (
    _connector_id, _connector_key, _event_type, COALESCE(_previous_values, '{}'::jsonb), COALESCE(_new_values, '{}'::jsonb), _reason, auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_hub_calculate_health(
  _success_rate numeric,
  _avg_latency_ms numeric,
  _failed_runs integer,
  _pending_retries integer
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'score',
    greatest(
      0,
      least(
        100,
        round(
          100
          - (greatest(0, 100 - COALESCE(_success_rate, 100)) * 0.6)
          - (least(COALESCE(_avg_latency_ms, 0), 30000) / 1000)
          - (COALESCE(_failed_runs, 0) * 8)
          - (COALESCE(_pending_retries, 0) * 4),
          0
        )
      )
    ),
    'status',
    CASE
      WHEN greatest(0, least(100, round(100 - (greatest(0, 100 - COALESCE(_success_rate, 100)) * 0.6) - (least(COALESCE(_avg_latency_ms, 0), 30000) / 1000) - (COALESCE(_failed_runs, 0) * 8) - (COALESCE(_pending_retries, 0) * 4), 0))) >= 85 THEN 'healthy'
      WHEN greatest(0, least(100, round(100 - (greatest(0, 100 - COALESCE(_success_rate, 100)) * 0.6) - (least(COALESCE(_avg_latency_ms, 0), 30000) / 1000) - (COALESCE(_failed_runs, 0) * 8) - (COALESCE(_pending_retries, 0) * 4), 0))) >= 60 THEN 'warning'
      ELSE 'critical'
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_register_integration_connector(_connector jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connector_id uuid;
  v_connector_key text := _connector->>'connector_key';
BEGIN
  IF NOT public.integration_hub_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF COALESCE(v_connector_key, '') = '' THEN
    RAISE EXCEPTION 'connector_key_required';
  END IF;

  INSERT INTO public.integration_hub_connectors(
    connector_key, name, description, provider, category, version, status, environment, owner_module_key,
    documentation_url, api_min_version, gateway_required_version, capabilities_used, events_consumed,
    events_produced, feature_flag_key, sync_policy, compatibility_contract, created_by, updated_by, metadata
  )
  VALUES (
    v_connector_key,
    COALESCE(_connector->>'name', v_connector_key),
    COALESCE(_connector->>'description', 'Connecteur declare dans P4.3 Integration Hub.'),
    COALESCE(_connector->>'provider', 'generic'),
    COALESCE(_connector->>'category', 'generic'),
    COALESCE(_connector->>'version', 'v1'),
    COALESCE(_connector->>'status', 'installed'),
    COALESCE(_connector->>'environment', 'production'),
    COALESCE(_connector->>'owner_module_key', 'p43_integration_hub'),
    _connector->>'documentation_url',
    _connector->>'api_min_version',
    COALESCE(_connector->>'gateway_required_version', 'v1'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_connector->'capabilities_used')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_connector->'events_consumed')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_connector->'events_produced')), ARRAY[]::text[]),
    _connector->>'feature_flag_key',
    COALESCE(_connector->'sync_policy', '{"mode":"manual","max_parallelism":1,"retry_attempts":3}'::jsonb),
    COALESCE(_connector->'compatibility_contract', '{}'::jsonb),
    auth.uid(),
    auth.uid(),
    COALESCE(_connector->'metadata', '{}'::jsonb)
  )
  ON CONFLICT (connector_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      provider = EXCLUDED.provider,
      category = EXCLUDED.category,
      version = EXCLUDED.version,
      status = EXCLUDED.status,
      environment = EXCLUDED.environment,
      owner_module_key = EXCLUDED.owner_module_key,
      documentation_url = EXCLUDED.documentation_url,
      api_min_version = EXCLUDED.api_min_version,
      gateway_required_version = EXCLUDED.gateway_required_version,
      capabilities_used = EXCLUDED.capabilities_used,
      events_consumed = EXCLUDED.events_consumed,
      events_produced = EXCLUDED.events_produced,
      feature_flag_key = EXCLUDED.feature_flag_key,
      sync_policy = EXCLUDED.sync_policy,
      compatibility_contract = EXCLUDED.compatibility_contract,
      updated_by = auth.uid(),
      metadata = EXCLUDED.metadata,
      updated_at = now()
  RETURNING id INTO v_connector_id;

  PERFORM public.integration_hub_log_event(
    v_connector_id,
    v_connector_key,
    'installed',
    '{}'::jsonb,
    _connector,
    'Connector registered through P4.3 Integration Hub'
  );

  RETURN jsonb_build_object('connector_id', v_connector_id, 'connector_key', v_connector_key, 'status', 'registered');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_integration_connector_status(
  _connector_key text,
  _status text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous public.integration_hub_connectors%ROWTYPE;
BEGIN
  IF NOT public.integration_hub_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF _status NOT IN ('installed','enabled','disabled','maintenance','deprecated','experimental') THEN
    RAISE EXCEPTION 'invalid_connector_status';
  END IF;

  SELECT * INTO v_previous
  FROM public.integration_hub_connectors
  WHERE connector_key = _connector_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'connector_not_found';
  END IF;

  UPDATE public.integration_hub_connectors
  SET status = _status,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = v_previous.id;

  PERFORM public.integration_hub_log_event(
    v_previous.id,
    v_previous.connector_key,
    CASE WHEN _status = 'enabled' THEN 'enabled'
         WHEN _status = 'disabled' THEN 'disabled'
         WHEN _status = 'maintenance' THEN 'maintenance'
         WHEN _status = 'deprecated' THEN 'deprecated'
         ELSE 'updated' END,
    to_jsonb(v_previous),
    jsonb_build_object('status', _status),
    _reason
  );

  RETURN jsonb_build_object('connector_key', _connector_key, 'status', _status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_schedule_integration_connector_sync(
  _connector_key text,
  _sync_type text DEFAULT 'manual',
  _scheduled_for timestamptz DEFAULT now(),
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connector public.integration_hub_connectors%ROWTYPE;
  v_job_id uuid;
BEGIN
  IF NOT public.integration_hub_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF _sync_type NOT IN ('manual','scheduled','incremental','full','retry','deferred','test') THEN
    RAISE EXCEPTION 'invalid_sync_type';
  END IF;

  SELECT * INTO v_connector
  FROM public.integration_hub_connectors
  WHERE connector_key = _connector_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'connector_not_found';
  END IF;
  IF v_connector.status NOT IN ('enabled','experimental') THEN
    RAISE EXCEPTION 'connector_not_enabled';
  END IF;

  INSERT INTO public.integration_hub_sync_jobs(connector_id, sync_type, scheduled_for, max_attempts, payload, created_by)
  VALUES (
    v_connector.id,
    _sync_type,
    COALESCE(_scheduled_for, now()),
    COALESCE((v_connector.sync_policy->>'retry_attempts')::integer, 3),
    COALESCE(_payload, '{}'::jsonb),
    auth.uid()
  )
  RETURNING id INTO v_job_id;

  PERFORM public.integration_hub_log_event(
    v_connector.id,
    v_connector.connector_key,
    'sync_scheduled',
    '{}'::jsonb,
    jsonb_build_object('job_id', v_job_id, 'sync_type', _sync_type, 'scheduled_for', _scheduled_for),
    'Sync scheduled through P4.3 Integration Hub'
  );

  RETURN jsonb_build_object('job_id', v_job_id, 'connector_key', _connector_key, 'status', 'queued');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_integration_connector_sync_result(
  _job_id uuid,
  _run_status text,
  _metrics jsonb DEFAULT '{}'::jsonb,
  _error_code text DEFAULT NULL,
  _error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.integration_hub_sync_jobs%ROWTYPE;
  v_connector public.integration_hub_connectors%ROWTYPE;
  v_health jsonb;
  v_duration integer;
BEGIN
  IF NOT public.integration_hub_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF _run_status NOT IN ('started','succeeded','failed','retry_scheduled','cancelled','interrupted') THEN
    RAISE EXCEPTION 'invalid_run_status';
  END IF;

  SELECT * INTO v_job
  FROM public.integration_hub_sync_jobs
  WHERE id = _job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sync_job_not_found';
  END IF;

  SELECT * INTO v_connector
  FROM public.integration_hub_connectors
  WHERE id = v_job.connector_id
  FOR UPDATE;

  v_duration := CASE
    WHEN v_job.started_at IS NULL THEN NULL
    ELSE greatest(0, floor(extract(epoch FROM (now() - v_job.started_at)) * 1000)::integer)
  END;

  v_health := public.integration_hub_calculate_health(
    CASE WHEN _run_status = 'succeeded' THEN 100 ELSE 40 END,
    COALESCE((_metrics->>'avg_latency_ms')::numeric, 0),
    CASE WHEN _run_status = 'failed' THEN 1 ELSE 0 END,
    CASE WHEN _run_status = 'retry_scheduled' THEN 1 ELSE 0 END
  );

  INSERT INTO public.integration_hub_sync_runs(
    job_id, connector_id, run_status, duration_ms, records_read, records_written, records_failed,
    retry_after, error_code, error_message, health_after, metrics, created_by
  )
  VALUES (
    _job_id,
    v_job.connector_id,
    _run_status,
    v_duration,
    COALESCE((_metrics->>'records_read')::integer, 0),
    COALESCE((_metrics->>'records_written')::integer, 0),
    COALESCE((_metrics->>'records_failed')::integer, 0),
    NULLIF(_metrics->>'retry_after', '')::timestamptz,
    _error_code,
    _error_message,
    v_health->>'status',
    COALESCE(_metrics, '{}'::jsonb),
    auth.uid()
  );

  UPDATE public.integration_hub_sync_jobs
  SET status = CASE
        WHEN _run_status = 'started' THEN 'running'
        WHEN _run_status = 'succeeded' THEN 'succeeded'
        WHEN _run_status = 'failed' THEN 'failed'
        WHEN _run_status = 'retry_scheduled' THEN 'retrying'
        ELSE _run_status
      END,
      started_at = COALESCE(started_at, CASE WHEN _run_status = 'started' THEN now() ELSE started_at END),
      finished_at = CASE WHEN _run_status IN ('succeeded','failed','cancelled','interrupted') THEN now() ELSE finished_at END,
      attempt_count = attempt_count + CASE WHEN _run_status IN ('started','failed','retry_scheduled') THEN 1 ELSE 0 END,
      result_summary = COALESCE(_metrics, '{}'::jsonb),
      error_code = _error_code,
      error_message = _error_message,
      updated_at = now()
  WHERE id = _job_id;

  UPDATE public.integration_hub_connectors
  SET last_sync_at = CASE WHEN _run_status IN ('succeeded','failed','cancelled','interrupted') THEN now() ELSE last_sync_at END,
      next_sync_at = NULLIF(_metrics->>'next_sync_at', '')::timestamptz,
      health_score = (v_health->>'score')::numeric,
      health_status = v_health->>'status',
      updated_at = now()
  WHERE id = v_job.connector_id;

  PERFORM public.integration_hub_log_event(
    v_connector.id,
    v_connector.connector_key,
    CASE WHEN _run_status = 'succeeded' THEN 'sync_succeeded'
         WHEN _run_status = 'failed' THEN 'sync_failed'
         WHEN _run_status = 'retry_scheduled' THEN 'retry_scheduled'
         ELSE 'sync_started' END,
    '{}'::jsonb,
    jsonb_build_object('job_id', _job_id, 'run_status', _run_status, 'health', v_health),
    _error_message
  );

  RETURN jsonb_build_object('job_id', _job_id, 'run_status', _run_status, 'health', v_health);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_check_integration_connector_compatibility(_connector_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connector public.integration_hub_connectors%ROWTYPE;
  v_missing_capabilities text[];
  v_missing_events text[];
  v_findings integer := 0;
BEGIN
  IF NOT public.integration_hub_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT * INTO v_connector
  FROM public.integration_hub_connectors
  WHERE connector_key = _connector_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'connector_not_found';
  END IF;

  SELECT COALESCE(array_agg(cap), ARRAY[]::text[]) INTO v_missing_capabilities
  FROM unnest(v_connector.capabilities_used) AS cap
  WHERE NOT EXISTS (
    SELECT 1 FROM public.platform_capability_registry cr
    WHERE cr.capability_key = cap
      AND cr.status = 'active'
  );

  SELECT COALESCE(array_agg(evt), ARRAY[]::text[]) INTO v_missing_events
  FROM unnest(v_connector.events_consumed || v_connector.events_produced) AS evt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.platform_event_catalog ec
    WHERE ec.event_key = evt
      AND ec.status = 'active'
  );

  IF cardinality(v_missing_capabilities) > 0 THEN
    INSERT INTO public.integration_hub_compatibility_findings(connector_id, connector_key, severity, finding_type, detail, required_action, evidence)
    VALUES (
      v_connector.id,
      v_connector.connector_key,
      'high',
      'missing_capability',
      'Capacites P4.1 absentes ou inactives',
      'Declarer ou activer les capabilities avant execution du connecteur',
      jsonb_build_object('missing_capabilities', v_missing_capabilities)
    )
    ON CONFLICT (connector_key, finding_type, detail) DO UPDATE
    SET status = 'open',
        evidence = EXCLUDED.evidence,
        created_at = now();
  END IF;

  IF cardinality(v_missing_events) > 0 THEN
    INSERT INTO public.integration_hub_compatibility_findings(connector_id, connector_key, severity, finding_type, detail, required_action, evidence)
    VALUES (
      v_connector.id,
      v_connector.connector_key,
      'medium',
      'missing_event_contract',
      'Evenements P4.1 absents ou inactifs',
      'Declarer les evenements dans Event Catalog avant consommation/production',
      jsonb_build_object('missing_events', v_missing_events)
    )
    ON CONFLICT (connector_key, finding_type, detail) DO UPDATE
    SET status = 'open',
        evidence = EXCLUDED.evidence,
        created_at = now();
  END IF;

  GET DIAGNOSTICS v_findings = ROW_COUNT;

  PERFORM public.integration_hub_log_event(
    v_connector.id,
    v_connector.connector_key,
    'compatibility_checked',
    '{}'::jsonb,
    jsonb_build_object('missing_capabilities', v_missing_capabilities, 'missing_events', v_missing_events),
    'Compatibility check executed'
  );

  RETURN jsonb_build_object(
    'connector_key', v_connector.connector_key,
    'missing_capabilities', v_missing_capabilities,
    'missing_events', v_missing_events,
    'compatible', cardinality(v_missing_capabilities) = 0 AND cardinality(v_missing_events) = 0,
    'findings_touched', v_findings
  );
END;
$$;

CREATE OR REPLACE VIEW public.admin_integration_hub_overview AS
SELECT
  (SELECT count(*) FROM public.integration_hub_connectors)::integer AS connectors_count,
  (SELECT count(*) FROM public.integration_hub_connectors WHERE status = 'enabled')::integer AS enabled_connectors_count,
  (SELECT count(*) FROM public.integration_hub_connectors WHERE health_status = 'healthy')::integer AS healthy_connectors_count,
  (SELECT count(*) FROM public.integration_hub_connectors WHERE health_status IN ('warning','critical'))::integer AS unhealthy_connectors_count,
  (SELECT count(*) FROM public.integration_hub_sync_jobs WHERE status IN ('queued','retrying'))::integer AS queued_sync_count,
  (SELECT count(*) FROM public.integration_hub_sync_jobs WHERE status = 'running')::integer AS running_sync_count,
  (SELECT count(*) FROM public.integration_hub_sync_runs WHERE created_at >= now() - interval '24 hours')::integer AS sync_runs_24h,
  (SELECT count(*) FROM public.integration_hub_sync_runs WHERE run_status = 'failed' AND created_at >= now() - interval '24 hours')::integer AS failed_syncs_24h,
  (SELECT count(*) FROM public.integration_hub_compatibility_findings WHERE status = 'open')::integer AS open_compatibility_findings
WHERE public.integration_hub_is_admin();

CREATE OR REPLACE VIEW public.admin_integration_hub_connectors AS
SELECT
  c.*,
  (SELECT count(*) FROM public.integration_hub_connector_configs cfg WHERE cfg.connector_id = c.id)::integer AS config_count,
  (SELECT count(*) FROM public.integration_hub_sync_jobs j WHERE j.connector_id = c.id AND j.status IN ('queued','running','retrying'))::integer AS active_job_count,
  (SELECT count(*) FROM public.integration_hub_compatibility_findings f WHERE f.connector_id = c.id AND f.status = 'open')::integer AS open_finding_count
FROM public.integration_hub_connectors c
WHERE public.integration_hub_is_admin()
ORDER BY c.connector_key;

CREATE OR REPLACE VIEW public.admin_integration_hub_configs AS
SELECT
  cfg.id,
  c.connector_key,
  cfg.environment,
  cfg.organization_key,
  cfg.config_schema,
  cfg.required_parameters,
  cfg.optional_parameters,
  cfg.secret_refs,
  cfg.validation_status,
  cfg.validation_errors,
  cfg.is_active,
  cfg.created_at,
  cfg.updated_at
FROM public.integration_hub_connector_configs cfg
JOIN public.integration_hub_connectors c ON c.id = cfg.connector_id
WHERE public.integration_hub_is_admin();

CREATE OR REPLACE VIEW public.admin_integration_hub_sync_jobs AS
SELECT j.*, c.connector_key, c.name AS connector_name, c.category
FROM public.integration_hub_sync_jobs j
JOIN public.integration_hub_connectors c ON c.id = j.connector_id
WHERE public.integration_hub_is_admin()
ORDER BY j.scheduled_for DESC;

CREATE OR REPLACE VIEW public.admin_integration_hub_sync_runs AS
SELECT r.*, c.connector_key, c.name AS connector_name
FROM public.integration_hub_sync_runs r
LEFT JOIN public.integration_hub_connectors c ON c.id = r.connector_id
WHERE public.integration_hub_is_admin()
ORDER BY r.created_at DESC;

CREATE OR REPLACE VIEW public.admin_integration_hub_lifecycle_events AS
SELECT *
FROM public.integration_hub_lifecycle_events
WHERE public.integration_hub_is_admin()
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.admin_integration_hub_compatibility_findings AS
SELECT f.*, c.name AS connector_name, c.status AS connector_status
FROM public.integration_hub_compatibility_findings f
LEFT JOIN public.integration_hub_connectors c ON c.id = f.connector_id
WHERE public.integration_hub_is_admin()
ORDER BY CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, f.created_at DESC;

CREATE OR REPLACE VIEW public.admin_integration_hub_health AS
SELECT
  c.connector_key,
  c.name,
  c.category,
  c.status,
  c.health_status,
  c.health_score,
  c.last_sync_at,
  c.next_sync_at,
  COALESCE(avg(r.duration_ms) FILTER (WHERE r.created_at >= now() - interval '7 days'), 0)::numeric(12,2) AS avg_latency_ms_7d,
  count(r.id) FILTER (WHERE r.created_at >= now() - interval '7 days')::integer AS runs_7d,
  count(r.id) FILTER (WHERE r.run_status = 'failed' AND r.created_at >= now() - interval '7 days')::integer AS failed_runs_7d
FROM public.integration_hub_connectors c
LEFT JOIN public.integration_hub_sync_runs r ON r.connector_id = c.id
WHERE public.integration_hub_is_admin()
GROUP BY c.connector_key, c.name, c.category, c.status, c.health_status, c.health_score, c.last_sync_at, c.next_sync_at
ORDER BY c.health_score ASC, c.connector_key;

CREATE OR REPLACE VIEW public.admin_integration_hub_security_findings AS
SELECT
  'secret_inline_risk'::text AS finding_type,
  'critical'::text AS severity,
  c.connector_key,
  'Configuration contenant un champ sensible potentiel en clair'::text AS detail
FROM public.integration_hub_connector_configs cfg
JOIN public.integration_hub_connectors c ON c.id = cfg.connector_id
WHERE public.integration_hub_is_admin()
  AND cfg.config_values::text ~* '(secret|token|password|api_key)'
UNION ALL
SELECT
  'missing_feature_flag'::text,
  'medium'::text,
  connector_key,
  'Connecteur sans feature flag de rollout progressif'
FROM public.integration_hub_connectors
WHERE public.integration_hub_is_admin()
  AND status IN ('enabled','experimental')
  AND feature_flag_key IS NULL
UNION ALL
SELECT
  'connector_unhealthy'::text,
  CASE WHEN health_status = 'critical' THEN 'critical' ELSE 'high' END,
  connector_key,
  'Connecteur en sante degradee: ' || health_status
FROM public.integration_hub_connectors
WHERE public.integration_hub_is_admin()
  AND health_status IN ('warning','critical');

INSERT INTO public.platform_extension_modules(
  module_key, name, description, version, status, logical_owner, dependencies, provided_capabilities,
  produced_events, consumed_events, required_permissions, routes, rpc_functions, edge_functions, primary_tables,
  documentation_path, contract_version, can_be_disabled, metadata
)
VALUES
  (
    'p43_integration_hub',
    'P4.3 Integration Hub & Connector Framework',
    'Registre central, cycle de vie, configuration, synchronisation, compatibilite et sante des connecteurs externes.',
    'p4.3',
    'active',
    'architecture',
    ARRAY['p4_extension_framework','p42_api_integration_gateway','p3_governance_operations'],
    ARRAY['connector.registry.manage','connector.config.validate','connector.sync.schedule','connector.health.evaluate','connector.compatibility.check'],
    ARRAY['connector.installed','connector.status_changed','connector.sync.completed','connector.sync.failed','connector.compatibility.finding'],
    ARRAY['api.request.logged','observability.alert.created'],
    ARRAY['admin'],
    ARRAY['/admin?tab=integration-hub'],
    ARRAY['admin_register_integration_connector','admin_set_integration_connector_status','admin_schedule_integration_connector_sync','admin_check_integration_connector_compatibility'],
    ARRAY[]::text[],
    ARRAY['integration_hub_connectors','integration_hub_connector_configs','integration_hub_sync_jobs','integration_hub_sync_runs','integration_hub_lifecycle_events'],
    'docs/architecture/integration-hub.md',
    'v1',
    false,
    '{"framework_only":true,"provider_connectors_included":false,"p0_mutation_allowed":false}'::jsonb
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
  ('connector.registry.manage', 'p43_integration_hub', 'Installer et maintenir le registre des connecteurs generiques.', 'v1', 'admin', 'admin', 'active', ARRAY['api.registry.manage'], '{"connector_key":"text"}'::jsonb, '{"connector_id":"uuid"}'::jsonb, 'docs/architecture/integration-hub.md#registry'),
  ('connector.config.validate', 'p43_integration_hub', 'Valider configuration et references de secrets sans exposer les secrets.', 'v1', 'admin', 'security', 'active', ARRAY['connector.registry.manage'], '{"config":"object"}'::jsonb, '{"validation_status":"text"}'::jsonb, 'docs/architecture/integration-hub.md#configuration'),
  ('connector.sync.schedule', 'p43_integration_hub', 'Planifier synchronisations manuelles, differees ou periodiques.', 'v1', 'admin', 'admin', 'active', ARRAY['connector.registry.manage','rate_limit.evaluate'], '{"connector_key":"text","sync_type":"text"}'::jsonb, '{"job_id":"uuid"}'::jsonb, 'docs/architecture/integration-hub.md#sync'),
  ('connector.health.evaluate', 'p43_integration_hub', 'Calculer et exposer sante connecteur.', 'v1', 'service', 'audit', 'active', ARRAY['observability.metric.record'], '{"success_rate":"number"}'::jsonb, '{"health_score":"number"}'::jsonb, 'docs/architecture/integration-hub.md#health'),
  ('connector.compatibility.check', 'p43_integration_hub', 'Comparer les besoins connecteur aux capabilities et events P4.', 'v1', 'admin', 'audit', 'active', ARRAY['architecture.capability.declare','architecture.event.catalog'], '{"connector_key":"text"}'::jsonb, '{"compatible":"boolean"}'::jsonb, 'docs/architecture/integration-hub.md#compatibility')
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
  ('connector.installed', 'v1', 'p43_integration_hub', 'Connecteur installe dans le registre P4.3.', '{"type":"object","required":["connector_key"]}'::jsonb, ARRAY['connector_key'], ARRAY['provider','category'], 'internal', '36 months', ARRAY['p3_governance_operations','p42_api_integration_gateway'], 'active'),
  ('connector.status_changed', 'v1', 'p43_integration_hub', 'Statut connecteur modifie.', '{"type":"object","required":["connector_key","status"]}'::jsonb, ARRAY['connector_key','status'], ARRAY['reason'], 'internal', '36 months', ARRAY['p3_governance_operations'], 'active'),
  ('connector.sync.completed', 'v1', 'p43_integration_hub', 'Synchronisation connecteur terminee.', '{"type":"object","required":["connector_key","job_id"]}'::jsonb, ARRAY['connector_key','job_id'], ARRAY['records_read','records_written'], 'internal', '24 months', ARRAY['p3_governance_operations'], 'active'),
  ('connector.sync.failed', 'v1', 'p43_integration_hub', 'Synchronisation connecteur echouee.', '{"type":"object","required":["connector_key","job_id","error_code"]}'::jsonb, ARRAY['connector_key','job_id'], ARRAY['error_code','error_message'], 'sensitive', '36 months', ARRAY['p3_governance_operations'], 'active'),
  ('connector.compatibility.finding', 'v1', 'p43_integration_hub', 'Incompatibilite detectee pour connecteur.', '{"type":"object","required":["connector_key","severity"]}'::jsonb, ARRAY['connector_key','severity'], ARRAY['finding_type'], 'internal', '36 months', ARRAY['p3_governance_operations'], 'active')
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

INSERT INTO public.platform_rpc_contracts(
  rpc_name, module_key, purpose, version, status, parameters, return_contract, required_permissions, error_behavior, idempotency, logging_policy, documentation_path
)
VALUES
  ('admin_register_integration_connector', 'p43_integration_hub', 'Installer ou mettre a jour un connecteur generique.', 'v1', 'active', '{"_connector":"jsonb"}'::jsonb, '{"connector_id":"uuid","status":"registered"}'::jsonb, ARRAY['admin'], '{"raises":["admin_required","connector_key_required"]}'::jsonb, 'supported', 'audit', 'docs/architecture/integration-hub.md#rpc'),
  ('admin_set_integration_connector_status', 'p43_integration_hub', 'Changer cycle de vie connecteur avec journal append-only.', 'v1', 'active', '{"_connector_key":"text","_status":"text"}'::jsonb, '{"connector_key":"text","status":"text"}'::jsonb, ARRAY['admin'], '{"raises":["admin_required","connector_not_found"]}'::jsonb, 'supported', 'audit', 'docs/architecture/integration-hub.md#rpc'),
  ('admin_schedule_integration_connector_sync', 'p43_integration_hub', 'Planifier synchronisation connecteur sans executer de logique metier provider.', 'v1', 'active', '{"_connector_key":"text","_sync_type":"text"}'::jsonb, '{"job_id":"uuid"}'::jsonb, ARRAY['admin'], '{"raises":["connector_not_enabled"]}'::jsonb, 'supported', 'standard', 'docs/architecture/integration-hub.md#rpc'),
  ('admin_record_integration_connector_sync_result', 'p43_integration_hub', 'Enregistrer resultat sync et recalculer sante.', 'v1', 'active', '{"_job_id":"uuid","_run_status":"text"}'::jsonb, '{"health":"object"}'::jsonb, ARRAY['admin','service_role'], '{"append_only_runs":true}'::jsonb, 'supported', 'audit', 'docs/architecture/integration-hub.md#rpc'),
  ('admin_check_integration_connector_compatibility', 'p43_integration_hub', 'Verifier capabilities et events requis par connecteur.', 'v1', 'active', '{"_connector_key":"text"}'::jsonb, '{"compatible":"boolean"}'::jsonb, ARRAY['admin'], '{}'::jsonb, 'supported', 'audit', 'docs/architecture/integration-hub.md#rpc')
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

INSERT INTO public.platform_scheduled_task_registry(
  task_key, module_key, description, frequency, invoked_function, timeout_ms, retry_policy, idempotency_policy, metrics, alert_policy, status
)
VALUES
  ('integration_hub.sync.dispatcher', 'p43_integration_hub', 'Dispatcher generique futur des synchronisations connecteurs planifiees.', 'every_5_minutes', 'api-gateway', 30000, '{"max_attempts":3}'::jsonb, 'required', '{"metrics":["queued_sync_count","failed_syncs_24h"]}'::jsonb, '{"alert_on_failed_sync":true}'::jsonb, 'experimental')
ON CONFLICT (task_key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    description = EXCLUDED.description,
    frequency = EXCLUDED.frequency,
    invoked_function = EXCLUDED.invoked_function,
    timeout_ms = EXCLUDED.timeout_ms,
    retry_policy = EXCLUDED.retry_policy,
    idempotency_policy = EXCLUDED.idempotency_policy,
    metrics = EXCLUDED.metrics,
    alert_policy = EXCLUDED.alert_policy,
    status = EXCLUDED.status,
    updated_at = now();

INSERT INTO public.platform_feature_flags(
  flag_key, module_key, description, status, environment, eligibility_rules, allowed_roles, rollout_percent, metadata
)
VALUES
  ('p4.integration_hub.admin_dashboard', 'p43_integration_hub', 'Affiche le dashboard Integration Hub aux admins autorises.', 'enabled', 'production', '{"requires_admin":true}'::jsonb, ARRAY['admin'], 100, '{"seeded":true}'::jsonb),
  ('p4.integration_hub.connector_execution', 'p43_integration_hub', 'Autorise execution automatique future des connecteurs. Desactive pendant framework-only.', 'disabled', 'production', '{"phase":"future","requires_explicit_go":true}'::jsonb, ARRAY['admin'], 0, '{"seeded":true}'::jsonb)
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
  ('integration_hub', 'P4.3 Integration Hub', 'integration', 'p43_integration_hub', 'Registre, synchronisations, compatibilite et sante des connecteurs.', '{"failed_sync_warning":1,"critical_connector_warning":1,"open_compatibility_warning":1}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    owner_module = EXCLUDED.owner_module,
    description = EXCLUDED.description,
    health_thresholds = EXCLUDED.health_thresholds,
    is_active = true,
    updated_at = now();

ALTER TABLE public.integration_hub_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_hub_connector_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_hub_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_hub_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_hub_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_hub_compatibility_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage integration hub connectors" ON public.integration_hub_connectors;
CREATE POLICY "Admins manage integration hub connectors"
ON public.integration_hub_connectors FOR ALL TO authenticated
USING (public.integration_hub_is_admin())
WITH CHECK (public.integration_hub_is_admin());

DROP POLICY IF EXISTS "Admins manage integration hub configs" ON public.integration_hub_connector_configs;
CREATE POLICY "Admins manage integration hub configs"
ON public.integration_hub_connector_configs FOR ALL TO authenticated
USING (public.integration_hub_is_admin())
WITH CHECK (public.integration_hub_is_admin());

DROP POLICY IF EXISTS "Admins manage integration hub sync jobs" ON public.integration_hub_sync_jobs;
CREATE POLICY "Admins manage integration hub sync jobs"
ON public.integration_hub_sync_jobs FOR ALL TO authenticated
USING (public.integration_hub_is_admin())
WITH CHECK (public.integration_hub_is_admin());

DROP POLICY IF EXISTS "Admins read integration hub sync runs" ON public.integration_hub_sync_runs;
CREATE POLICY "Admins read integration hub sync runs"
ON public.integration_hub_sync_runs FOR SELECT TO authenticated
USING (public.integration_hub_is_admin());

DROP POLICY IF EXISTS "Admins read integration hub lifecycle events" ON public.integration_hub_lifecycle_events;
CREATE POLICY "Admins read integration hub lifecycle events"
ON public.integration_hub_lifecycle_events FOR SELECT TO authenticated
USING (public.integration_hub_is_admin());

DROP POLICY IF EXISTS "Admins manage integration hub compatibility findings" ON public.integration_hub_compatibility_findings;
CREATE POLICY "Admins manage integration hub compatibility findings"
ON public.integration_hub_compatibility_findings FOR ALL TO authenticated
USING (public.integration_hub_is_admin())
WITH CHECK (public.integration_hub_is_admin());

GRANT SELECT ON public.integration_hub_connectors TO authenticated, service_role;
GRANT SELECT ON public.integration_hub_connector_configs TO authenticated, service_role;
GRANT SELECT ON public.integration_hub_sync_jobs TO authenticated, service_role;
GRANT SELECT ON public.integration_hub_sync_runs TO authenticated, service_role;
GRANT SELECT ON public.integration_hub_lifecycle_events TO authenticated, service_role;
GRANT SELECT ON public.integration_hub_compatibility_findings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_register_integration_connector(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_integration_connector_status(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_schedule_integration_connector_sync(text, text, timestamptz, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_record_integration_connector_sync_result(uuid, text, jsonb, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_check_integration_connector_compatibility(text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
