-- P3.5 Platform Observability & Health Engine.
-- Technical monitoring only: no business decision and no financial-data mutation.
-- The module observes P1/P2/P3 services, records metrics/logs, raises alerts and
-- keeps diagnostics explainable for administrators.

CREATE OR REPLACE FUNCTION public.platform_observability_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
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
    );
$$;

CREATE TABLE IF NOT EXISTS public.platform_observability_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('frontend', 'database', 'rpc', 'edge_function', 'queue', 'module', 'storage', 'integration')),
  owner_module text NOT NULL,
  description text,
  health_thresholds jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_days integer NOT NULL DEFAULT 90 CHECK (retention_days BETWEEN 7 AND 730),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.platform_observability_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.platform_observability_services(id) ON DELETE SET NULL,
  service_code text NOT NULL,
  component_type text NOT NULL CHECK (component_type IN ('frontend', 'rpc', 'edge_function', 'sql', 'queue', 'storage', 'module', 'external_service')),
  component_name text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'count',
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'warning', 'critical', 'unknown')),
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  observed_at timestamptz NOT NULL DEFAULT now(),
  correlation_id text,
  engine_version text NOT NULL DEFAULT 'p3.5-observability-v1',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_observability_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.platform_observability_services(id) ON DELETE SET NULL,
  service_code text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  event_type text NOT NULL CHECK (event_type IN ('health_check', 'metric_collected', 'rpc_error', 'api_error', 'frontend_error', 'edge_error', 'queue_event', 'alert_event', 'system_event')),
  component_type text NOT NULL,
  component_name text NOT NULL,
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text,
  actor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_observability_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  metric_name text NOT NULL,
  condition_operator text NOT NULL CHECK (condition_operator IN ('gt', 'gte', 'lt', 'lte', 'eq')),
  threshold numeric NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  window_minutes integer NOT NULL DEFAULT 15 CHECK (window_minutes BETWEEN 1 AND 10080),
  component_filter text,
  is_active boolean NOT NULL DEFAULT true,
  probable_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_observability_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.platform_observability_alert_rules(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.platform_observability_services(id) ON DELETE SET NULL,
  service_code text NOT NULL,
  alert_key text NOT NULL,
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'archived')),
  component_type text NOT NULL,
  component_name text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  threshold numeric,
  diagnosis text NOT NULL,
  probable_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_observability_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  metrics_collected integer NOT NULL DEFAULT 0,
  alerts_created integer NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  scan_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_observability_services_active
  ON public.platform_observability_services(is_active, category, owner_module);
CREATE INDEX IF NOT EXISTS idx_platform_observability_metrics_recent
  ON public.platform_observability_metrics(service_code, metric_name, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_observability_metrics_status
  ON public.platform_observability_metrics(status, severity, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_observability_logs_recent
  ON public.platform_observability_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_observability_alerts_status
  ON public.platform_observability_alerts(status, severity, opened_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_observability_alerts_one_open
  ON public.platform_observability_alerts(alert_key)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_platform_observability_runs_recent
  ON public.platform_observability_runs(started_at DESC);

CREATE OR REPLACE FUNCTION public.platform_observability_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_observability_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'platform_observability_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_observability_services_touch ON public.platform_observability_services;
CREATE TRIGGER trg_platform_observability_services_touch
  BEFORE UPDATE ON public.platform_observability_services
  FOR EACH ROW EXECUTE FUNCTION public.platform_observability_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_observability_alert_rules_touch ON public.platform_observability_alert_rules;
CREATE TRIGGER trg_platform_observability_alert_rules_touch
  BEFORE UPDATE ON public.platform_observability_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.platform_observability_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_observability_alerts_touch ON public.platform_observability_alerts;
CREATE TRIGGER trg_platform_observability_alerts_touch
  BEFORE UPDATE ON public.platform_observability_alerts
  FOR EACH ROW EXECUTE FUNCTION public.platform_observability_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_observability_metrics_append_only_update ON public.platform_observability_metrics;
CREATE TRIGGER trg_platform_observability_metrics_append_only_update
  BEFORE UPDATE ON public.platform_observability_metrics
  FOR EACH ROW EXECUTE FUNCTION public.platform_observability_append_only();

DROP TRIGGER IF EXISTS trg_platform_observability_metrics_append_only_delete ON public.platform_observability_metrics;
CREATE TRIGGER trg_platform_observability_metrics_append_only_delete
  BEFORE DELETE ON public.platform_observability_metrics
  FOR EACH ROW EXECUTE FUNCTION public.platform_observability_append_only();

DROP TRIGGER IF EXISTS trg_platform_observability_logs_append_only_update ON public.platform_observability_logs;
CREATE TRIGGER trg_platform_observability_logs_append_only_update
  BEFORE UPDATE ON public.platform_observability_logs
  FOR EACH ROW EXECUTE FUNCTION public.platform_observability_append_only();

DROP TRIGGER IF EXISTS trg_platform_observability_logs_append_only_delete ON public.platform_observability_logs;
CREATE TRIGGER trg_platform_observability_logs_append_only_delete
  BEFORE DELETE ON public.platform_observability_logs
  FOR EACH ROW EXECUTE FUNCTION public.platform_observability_append_only();

INSERT INTO public.platform_observability_services(code, name, category, owner_module, description, health_thresholds)
VALUES
  ('frontend_admin', 'Interface Admin', 'frontend', 'admin', 'Disponibilite et erreurs du cockpit administrateur.', '{"error_rate_warning":2,"error_rate_critical":5}'::jsonb),
  ('frontend_vendor', 'Interface Vendeur', 'frontend', 'marketplace', 'Disponibilite et erreurs du portail vendeur.', '{"error_rate_warning":2,"error_rate_critical":5}'::jsonb),
  ('supabase_database', 'Base Supabase', 'database', 'platform', 'Tables, vues, RLS et fonctions SQL de la plateforme.', '{"slow_ms_warning":800,"slow_ms_critical":2000}'::jsonb),
  ('edge_functions', 'Edge Functions', 'edge_function', 'platform', 'Fonctions Supabase Edge et integrations serveur.', '{"failure_warning":1,"failure_critical":3}'::jsonb),
  ('workflow_queue', 'Workflow Queue', 'queue', 'p3.3', 'File de traitements Workflow Automation.', '{"pending_warning":20,"pending_critical":50,"stuck_minutes":30}'::jsonb),
  ('p1_commercial_intelligence', 'P1 Intelligence Commerciale', 'module', 'p1', 'CRM, calendrier, objectifs, coachs, academy et scores.', '{}'::jsonb),
  ('p2_marketplace_intelligence', 'P2 Marketplace Intelligence', 'module', 'p2', 'Studio image, coach, SEO, catalogue et analytics Marketplace.', '{}'::jsonb),
  ('p3_governance', 'P3 Governance', 'module', 'p3', 'Gouvernance, workflow, orchestration et moderation.', '{}'::jsonb),
  ('studio_image', 'Studio Image Marketplace', 'module', 'p2.1', 'Pipeline de conformite et normalisation des images.', '{"failed_warning":3,"failed_critical":10}'::jsonb),
  ('catalogue_public', 'Catalogue Public', 'module', 'catalogue', 'Disponibilite des produits publics et qualite catalogue.', '{"inactive_spike_warning":20}'::jsonb),
  ('moderation_compliance', 'AI Moderation & Compliance', 'module', 'p3.4', 'Findings, scores et files de moderation IA.', '{"critical_warning":1,"critical_critical":5}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    owner_module = EXCLUDED.owner_module,
    description = EXCLUDED.description,
    health_thresholds = EXCLUDED.health_thresholds,
    is_active = true,
    updated_at = now();

INSERT INTO public.platform_observability_alert_rules(
  code, name, description, metric_name, condition_operator, threshold, severity, window_minutes, component_filter, probable_causes, recommendations
)
VALUES
  ('rpc_failure_rate_high', 'RPC en echec', 'Un ou plusieurs RPC presentent un taux d echec anormal.', 'rpc_failure_count', 'gte', 1, 'high', 15, 'rpc', '["migration incomplete","schema cache non recharge","permission RLS ou fonction manquante"]'::jsonb, '["Verifier les logs SQL","Relancer NOTIFY pgrst reload schema","Tester le RPC en SQL Editor"]'::jsonb),
  ('edge_function_unavailable', 'Edge Function indisponible', 'Une Edge Function signale des erreurs recentes.', 'edge_failure_count', 'gte', 1, 'high', 15, 'edge_function', '["fonction non deployee","secret manquant","erreur runtime"]'::jsonb, '["Verifier le deploiement Supabase","Verifier les secrets","Consulter les logs Edge Function"]'::jsonb),
  ('queue_stuck', 'File bloquee', 'Des traitements planifies restent bloques ou en retard.', 'queue_stuck_count', 'gte', 1, 'high', 30, 'queue', '["worker non lance","lock abandonne","erreur de traitement repetee"]'::jsonb, '["Relancer le traitement","Verifier les locks","Inspecter les executions echouees"]'::jsonb),
  ('error_rate_increase', 'Hausse des erreurs', 'Le volume d erreurs recentes augmente.', 'error_count_24h', 'gte', 5, 'medium', 60, NULL, '["regression frontend","fonction indisponible","donnee invalide"]'::jsonb, '["Comparer avec le dernier deploiement","Identifier le composant","Corriger la cause racine"]'::jsonb),
  ('slow_processing', 'Ralentissement important', 'Un traitement depasse le seuil de duree attendu.', 'duration_ms', 'gte', 2000, 'medium', 15, NULL, '["requete lourde","index manquant","charge temporaire"]'::jsonb, '["Analyser le plan SQL","Ajouter un index si necessaire","Decaler le traitement en asynchrone"]'::jsonb),
  ('migration_incomplete', 'Migration incomplete', 'Un module attendu semble incomplet ou sans table de suivi.', 'migration_missing_count', 'gte', 1, 'critical', 60, 'sql', '["migration non appliquee","PR non mergee","schema cache stale"]'::jsonb, '["Appliquer la migration manquante","Verifier le commit GitHub","Relancer le schema cache"]'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    metric_name = EXCLUDED.metric_name,
    condition_operator = EXCLUDED.condition_operator,
    threshold = EXCLUDED.threshold,
    severity = EXCLUDED.severity,
    window_minutes = EXCLUDED.window_minutes,
    component_filter = EXCLUDED.component_filter,
    probable_causes = EXCLUDED.probable_causes,
    recommendations = EXCLUDED.recommendations,
    is_active = true,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.platform_observability_rule_matches(
  _operator text,
  _value numeric,
  _threshold numeric
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _operator
    WHEN 'gt' THEN _value > _threshold
    WHEN 'gte' THEN _value >= _threshold
    WHEN 'lt' THEN _value < _threshold
    WHEN 'lte' THEN _value <= _threshold
    WHEN 'eq' THEN _value = _threshold
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_platform_observability_metric(
  _service_code text,
  _component_type text,
  _component_name text,
  _metric_name text,
  _metric_value numeric,
  _unit text DEFAULT 'count',
  _status text DEFAULT 'ok',
  _severity text DEFAULT 'low',
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_id uuid;
  v_metric_id uuid;
  v_rule record;
  v_alert_count integer := 0;
  v_alert_key text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.platform_observability_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT id INTO v_service_id
  FROM public.platform_observability_services
  WHERE code = _service_code;

  INSERT INTO public.platform_observability_metrics(
    service_id, service_code, component_type, component_name, metric_name, metric_value, unit, status, severity, metadata
  )
  VALUES (
    v_service_id,
    _service_code,
    _component_type,
    _component_name,
    _metric_name,
    COALESCE(_metric_value, 0),
    COALESCE(_unit, 'count'),
    COALESCE(_status, 'ok'),
    COALESCE(_severity, 'low'),
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_metric_id;

  FOR v_rule IN
    SELECT *
    FROM public.platform_observability_alert_rules
    WHERE is_active = true
      AND metric_name = _metric_name
      AND (component_filter IS NULL OR component_filter = _component_type)
      AND public.platform_observability_rule_matches(condition_operator, COALESCE(_metric_value, 0), threshold)
  LOOP
    v_alert_key := v_rule.code || ':' || _service_code || ':' || _component_type || ':' || _component_name;
    INSERT INTO public.platform_observability_alerts(
      rule_id,
      service_id,
      service_code,
      alert_key,
      title,
      severity,
      component_type,
      component_name,
      metric_name,
      metric_value,
      threshold,
      diagnosis,
      probable_causes,
      recommendations,
      evidence
    )
    VALUES (
      v_rule.id,
      v_service_id,
      _service_code,
      v_alert_key,
      v_rule.name,
      v_rule.severity,
      _component_type,
      _component_name,
      _metric_name,
      COALESCE(_metric_value, 0),
      v_rule.threshold,
      v_rule.description,
      v_rule.probable_causes,
      v_rule.recommendations,
      jsonb_build_object('metric_id', v_metric_id, 'metadata', COALESCE(_metadata, '{}'::jsonb))
    )
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      v_alert_count := v_alert_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('metric_id', v_metric_id, 'alerts_created', v_alert_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_platform_observability_log(
  _service_code text,
  _severity text,
  _event_type text,
  _component_type text,
  _component_name text,
  _message text,
  _context jsonb DEFAULT '{}'::jsonb,
  _correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_id uuid;
  v_log_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.platform_observability_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT id INTO v_service_id
  FROM public.platform_observability_services
  WHERE code = _service_code;

  INSERT INTO public.platform_observability_logs(
    service_id, service_code, severity, event_type, component_type, component_name, message, context, correlation_id
  )
  VALUES (
    v_service_id,
    _service_code,
    COALESCE(_severity, 'info'),
    COALESCE(_event_type, 'system_event'),
    COALESCE(_component_type, 'module'),
    COALESCE(_component_name, _service_code),
    COALESCE(_message, 'Observability event'),
    COALESCE(_context, '{}'::jsonb),
    _correlation_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_observability_count_rows(_table_name text, _where_sql text DEFAULT 'true')
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF to_regclass(_table_name) IS NULL THEN
    RETURN NULL;
  END IF;

  EXECUTE format('SELECT count(*)::integer FROM %s WHERE %s', _table_name, COALESCE(NULLIF(_where_sql, ''), 'true'))
  INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.scan_platform_observability(_scope jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_started timestamptz := clock_timestamp();
  v_metric_result jsonb;
  v_metrics integer := 0;
  v_alerts integer := 0;
  v_value integer;
  v_expected_tables text[] := ARRAY[
    'public.marketplace_image_studio_jobs',
    'public.marketplace_coach_recommendations',
    'public.marketplace_seo_content_proposals',
    'public.catalogue_ai_enrichment_proposals',
    'public.marketplace_analytics_alerts',
    'public.marketplace_governance_cases',
    'public.marketplace_workflow_automation_queue',
    'public.marketplace_compliance_findings'
  ];
  v_missing integer := 0;
  v_table text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.platform_observability_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  INSERT INTO public.platform_observability_runs(status, scan_scope)
  VALUES ('running', COALESCE(_scope, '{}'::jsonb))
  RETURNING id INTO v_run_id;

  FOREACH v_table IN ARRAY v_expected_tables LOOP
    IF to_regclass(v_table) IS NULL THEN
      v_missing := v_missing + 1;
      PERFORM public.record_platform_observability_log(
        'supabase_database',
        'warning',
        'health_check',
        'sql',
        v_table,
        'Table de module attendue non detectee pendant le scan P3.5.',
        jsonb_build_object('run_id', v_run_id, 'expected_table', v_table)
      );
    END IF;
  END LOOP;

  SELECT public.record_platform_observability_metric(
    'supabase_database', 'sql', 'module_tables', 'migration_missing_count', v_missing, 'count',
    CASE WHEN v_missing > 0 THEN 'critical' ELSE 'ok' END,
    CASE WHEN v_missing > 0 THEN 'critical' ELSE 'low' END,
    jsonb_build_object('run_id', v_run_id)
  ) INTO v_metric_result;
  v_metrics := v_metrics + 1;
  v_alerts := v_alerts + COALESCE((v_metric_result->>'alerts_created')::integer, 0);

  v_value := public.platform_observability_count_rows('public.marketplace_workflow_automation_queue', 'status IN (''pending'', ''processing'', ''failed'') AND scheduled_for < now() - interval ''30 minutes''');
  IF v_value IS NOT NULL THEN
    SELECT public.record_platform_observability_metric(
      'workflow_queue', 'queue', 'marketplace_workflow_automation_queue', 'queue_stuck_count', v_value, 'count',
      CASE WHEN v_value > 0 THEN 'warning' ELSE 'ok' END,
      CASE WHEN v_value > 20 THEN 'critical' WHEN v_value > 0 THEN 'high' ELSE 'low' END,
      jsonb_build_object('run_id', v_run_id)
    ) INTO v_metric_result;
    v_metrics := v_metrics + 1;
    v_alerts := v_alerts + COALESCE((v_metric_result->>'alerts_created')::integer, 0);
  END IF;

  v_value := public.platform_observability_count_rows('public.marketplace_workflow_automation_executions', 'status = ''failed'' AND created_at >= now() - interval ''24 hours''');
  IF v_value IS NOT NULL THEN
    SELECT public.record_platform_observability_metric(
      'workflow_queue', 'queue', 'marketplace_workflow_automation_executions', 'error_count_24h', v_value, 'count',
      CASE WHEN v_value > 0 THEN 'warning' ELSE 'ok' END,
      CASE WHEN v_value >= 5 THEN 'high' WHEN v_value > 0 THEN 'medium' ELSE 'low' END,
      jsonb_build_object('run_id', v_run_id)
    ) INTO v_metric_result;
    v_metrics := v_metrics + 1;
    v_alerts := v_alerts + COALESCE((v_metric_result->>'alerts_created')::integer, 0);
  END IF;

  v_value := public.platform_observability_count_rows('public.marketplace_compliance_findings', 'queue_status NOT IN (''compliant'', ''archived'')');
  IF v_value IS NOT NULL THEN
    SELECT public.record_platform_observability_metric(
      'moderation_compliance', 'module', 'marketplace_compliance_findings', 'open_compliance_findings', v_value, 'count',
      CASE WHEN v_value > 0 THEN 'warning' ELSE 'ok' END,
      CASE WHEN v_value > 100 THEN 'high' WHEN v_value > 0 THEN 'medium' ELSE 'low' END,
      jsonb_build_object('run_id', v_run_id)
    ) INTO v_metric_result;
    v_metrics := v_metrics + 1;
  END IF;

  v_value := public.platform_observability_count_rows('public.marketplace_compliance_findings', 'severity = ''critical'' AND queue_status NOT IN (''compliant'', ''archived'')');
  IF v_value IS NOT NULL THEN
    SELECT public.record_platform_observability_metric(
      'moderation_compliance', 'module', 'marketplace_compliance_findings', 'error_count_24h', v_value, 'count',
      CASE WHEN v_value > 0 THEN 'critical' ELSE 'ok' END,
      CASE WHEN v_value > 0 THEN 'critical' ELSE 'low' END,
      jsonb_build_object('run_id', v_run_id, 'signal', 'critical_compliance_findings')
    ) INTO v_metric_result;
    v_metrics := v_metrics + 1;
    v_alerts := v_alerts + COALESCE((v_metric_result->>'alerts_created')::integer, 0);
  END IF;

  v_value := public.platform_observability_count_rows('public.marketplace_analytics_alerts', 'status = ''open''');
  IF v_value IS NOT NULL THEN
    SELECT public.record_platform_observability_metric(
      'p2_marketplace_intelligence', 'module', 'marketplace_analytics_alerts', 'open_marketplace_alerts', v_value, 'count',
      CASE WHEN v_value > 0 THEN 'warning' ELSE 'ok' END,
      CASE WHEN v_value > 50 THEN 'high' WHEN v_value > 0 THEN 'medium' ELSE 'low' END,
      jsonb_build_object('run_id', v_run_id)
    ) INTO v_metric_result;
    v_metrics := v_metrics + 1;
  END IF;

  v_value := public.platform_observability_count_rows('public.products', 'is_active = true');
  IF v_value IS NOT NULL THEN
    SELECT public.record_platform_observability_metric(
      'catalogue_public', 'module', 'products', 'active_products_count', v_value, 'count',
      'ok', 'low', jsonb_build_object('run_id', v_run_id)
    ) INTO v_metric_result;
    v_metrics := v_metrics + 1;
  END IF;

  UPDATE public.platform_observability_runs
  SET status = 'completed',
      finished_at = clock_timestamp(),
      duration_ms = GREATEST(0, floor(EXTRACT(epoch FROM (clock_timestamp() - v_started)) * 1000)::integer),
      metrics_collected = v_metrics,
      alerts_created = v_alerts,
      result_summary = jsonb_build_object(
        'metrics_collected', v_metrics,
        'alerts_created', v_alerts,
        'missing_tables', v_missing,
        'mode', 'observation'
      )
  WHERE id = v_run_id;

  PERFORM public.record_platform_observability_log(
    'supabase_database',
    'info',
    'health_check',
    'module',
    'scan_platform_observability',
    'Scan observability termine.',
    jsonb_build_object('run_id', v_run_id, 'metrics_collected', v_metrics, 'alerts_created', v_alerts)
  );

  RETURN jsonb_build_object('run_id', v_run_id, 'metrics_collected', v_metrics, 'alerts_created', v_alerts, 'missing_tables', v_missing);
EXCEPTION WHEN OTHERS THEN
  IF v_run_id IS NOT NULL THEN
    UPDATE public.platform_observability_runs
    SET status = 'failed',
        finished_at = clock_timestamp(),
        errors_count = 1,
        error_message = SQLERRM
    WHERE id = v_run_id;
  END IF;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_platform_observability_alert(
  _alert_id uuid,
  _status text DEFAULT 'acknowledged',
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert public.platform_observability_alerts%ROWTYPE;
BEGIN
  IF NOT public.platform_observability_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF _status NOT IN ('acknowledged', 'resolved', 'archived') THEN
    RAISE EXCEPTION 'invalid_alert_status';
  END IF;

  SELECT * INTO v_alert
  FROM public.platform_observability_alerts
  WHERE id = _alert_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'alert_not_found';
  END IF;

  UPDATE public.platform_observability_alerts
  SET status = _status,
      acknowledged_by = CASE WHEN _status = 'acknowledged' THEN auth.uid() ELSE acknowledged_by END,
      acknowledged_at = CASE WHEN _status = 'acknowledged' THEN now() ELSE acknowledged_at END,
      resolved_by = CASE WHEN _status IN ('resolved', 'archived') THEN auth.uid() ELSE resolved_by END,
      resolved_at = CASE WHEN _status IN ('resolved', 'archived') THEN now() ELSE resolved_at END,
      resolution_note = COALESCE(_note, resolution_note)
  WHERE id = _alert_id;

  PERFORM public.record_platform_observability_log(
    v_alert.service_code,
    'info',
    'alert_event',
    v_alert.component_type,
    v_alert.component_name,
    'Statut alerte mis a jour.',
    jsonb_build_object('alert_id', _alert_id, 'new_status', _status, 'note', _note)
  );

  RETURN jsonb_build_object('alert_id', _alert_id, 'status', _status);
END;
$$;

CREATE OR REPLACE VIEW public.admin_platform_observability_overview AS
WITH active_services AS (
  SELECT count(*)::integer AS service_count
  FROM public.platform_observability_services
  WHERE is_active = true
),
open_alerts AS (
  SELECT
    count(*) FILTER (WHERE status = 'open')::integer AS open_alert_count,
    count(*) FILTER (WHERE status = 'open' AND severity = 'critical')::integer AS critical_alert_count,
    count(*) FILTER (WHERE status = 'open' AND severity = 'high')::integer AS high_alert_count
  FROM public.platform_observability_alerts
),
recent_logs AS (
  SELECT
    count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::integer AS logs_24h,
    count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND severity IN ('error', 'critical'))::integer AS errors_24h
  FROM public.platform_observability_logs
),
recent_runs AS (
  SELECT
    count(*) FILTER (WHERE started_at >= now() - interval '24 hours')::integer AS runs_24h,
    count(*) FILTER (WHERE started_at >= now() - interval '24 hours' AND status = 'failed')::integer AS failed_runs_24h,
    max(started_at) AS last_scan_at
  FROM public.platform_observability_runs
)
SELECT
  CASE
    WHEN NOT public.platform_observability_is_admin() THEN 0
    WHEN oa.critical_alert_count > 0 THEN 40
    WHEN oa.high_alert_count > 0 THEN 65
    WHEN oa.open_alert_count > 0 THEN 80
    ELSE 100
  END::numeric AS platform_health_score,
  service_count,
  open_alert_count,
  critical_alert_count,
  high_alert_count,
  logs_24h,
  errors_24h,
  runs_24h,
  failed_runs_24h,
  last_scan_at
FROM active_services, open_alerts oa, recent_logs, recent_runs
WHERE public.platform_observability_is_admin();

CREATE OR REPLACE VIEW public.admin_platform_observability_services AS
SELECT
  s.*,
  lm.metric_name AS last_metric_name,
  lm.metric_value AS last_metric_value,
  lm.status AS last_metric_status,
  lm.severity AS last_metric_severity,
  lm.observed_at AS last_observed_at,
  COALESCE(a.open_alert_count, 0)::integer AS open_alert_count
FROM public.platform_observability_services s
LEFT JOIN LATERAL (
  SELECT *
  FROM public.platform_observability_metrics m
  WHERE m.service_code = s.code
  ORDER BY m.observed_at DESC
  LIMIT 1
) lm ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS open_alert_count
  FROM public.platform_observability_alerts aa
  WHERE aa.service_code = s.code
    AND aa.status = 'open'
) a ON true
WHERE public.platform_observability_is_admin();

CREATE OR REPLACE VIEW public.admin_platform_observability_recent_alerts AS
SELECT *
FROM public.platform_observability_alerts
WHERE public.platform_observability_is_admin()
ORDER BY opened_at DESC;

CREATE OR REPLACE VIEW public.admin_platform_observability_recent_logs AS
SELECT *
FROM public.platform_observability_logs
WHERE public.platform_observability_is_admin()
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.admin_platform_observability_metric_trends AS
SELECT
  date_trunc('hour', observed_at) AS bucket_hour,
  service_code,
  component_type,
  metric_name,
  avg(metric_value)::numeric AS avg_value,
  max(metric_value)::numeric AS max_value,
  count(*)::integer AS samples_count
FROM public.platform_observability_metrics
WHERE public.platform_observability_is_admin()
GROUP BY 1, 2, 3, 4
ORDER BY bucket_hour DESC;

CREATE OR REPLACE VIEW public.admin_platform_observability_queue_health AS
SELECT
  q.service_code,
  q.metric_name,
  q.metric_value,
  q.status,
  q.severity,
  q.observed_at,
  q.metadata
FROM public.platform_observability_metrics q
WHERE public.platform_observability_is_admin()
  AND q.component_type = 'queue'
ORDER BY q.observed_at DESC;

ALTER TABLE public.platform_observability_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_observability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_observability_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_observability_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_observability_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_observability_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage observability services" ON public.platform_observability_services;
CREATE POLICY "Admins can manage observability services"
ON public.platform_observability_services
FOR ALL
TO authenticated
USING (public.platform_observability_is_admin())
WITH CHECK (public.platform_observability_is_admin());

DROP POLICY IF EXISTS "Admins can read observability metrics" ON public.platform_observability_metrics;
CREATE POLICY "Admins can read observability metrics"
ON public.platform_observability_metrics
FOR SELECT
TO authenticated
USING (public.platform_observability_is_admin());

DROP POLICY IF EXISTS "Admins can insert observability metrics" ON public.platform_observability_metrics;
CREATE POLICY "Admins can insert observability metrics"
ON public.platform_observability_metrics
FOR INSERT
TO authenticated
WITH CHECK (public.platform_observability_is_admin());

DROP POLICY IF EXISTS "Admins can read observability logs" ON public.platform_observability_logs;
CREATE POLICY "Admins can read observability logs"
ON public.platform_observability_logs
FOR SELECT
TO authenticated
USING (public.platform_observability_is_admin());

DROP POLICY IF EXISTS "Admins can insert observability logs" ON public.platform_observability_logs;
CREATE POLICY "Admins can insert observability logs"
ON public.platform_observability_logs
FOR INSERT
TO authenticated
WITH CHECK (public.platform_observability_is_admin());

DROP POLICY IF EXISTS "Admins can manage observability alert rules" ON public.platform_observability_alert_rules;
CREATE POLICY "Admins can manage observability alert rules"
ON public.platform_observability_alert_rules
FOR ALL
TO authenticated
USING (public.platform_observability_is_admin())
WITH CHECK (public.platform_observability_is_admin());

DROP POLICY IF EXISTS "Admins can manage observability alerts" ON public.platform_observability_alerts;
CREATE POLICY "Admins can manage observability alerts"
ON public.platform_observability_alerts
FOR ALL
TO authenticated
USING (public.platform_observability_is_admin())
WITH CHECK (public.platform_observability_is_admin());

DROP POLICY IF EXISTS "Admins can read observability runs" ON public.platform_observability_runs;
CREATE POLICY "Admins can read observability runs"
ON public.platform_observability_runs
FOR SELECT
TO authenticated
USING (public.platform_observability_is_admin());

GRANT SELECT ON public.platform_observability_services TO authenticated, service_role;
GRANT SELECT ON public.platform_observability_metrics TO authenticated, service_role;
GRANT SELECT ON public.platform_observability_logs TO authenticated, service_role;
GRANT SELECT ON public.platform_observability_alert_rules TO authenticated, service_role;
GRANT SELECT, UPDATE ON public.platform_observability_alerts TO authenticated, service_role;
GRANT SELECT ON public.platform_observability_runs TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_platform_observability_metric(text, text, text, text, numeric, text, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_platform_observability_log(text, text, text, text, text, text, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.scan_platform_observability(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_platform_observability_alert(uuid, text, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
