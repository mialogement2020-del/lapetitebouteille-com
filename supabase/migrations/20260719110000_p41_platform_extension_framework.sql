-- P4.1 Platform Extension Framework.
-- Architecture metadata only: no business execution and no P0 financial mutation.
-- This migration creates registries, contracts, feature flags and admin-only
-- documentation views for progressive platform extension.

CREATE OR REPLACE FUNCTION public.platform_extension_is_admin()
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

CREATE TABLE IF NOT EXISTS public.platform_extension_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'observation', 'deprecated', 'disabled', 'experimental')),
  logical_owner text NOT NULL DEFAULT 'platform',
  dependencies text[] NOT NULL DEFAULT ARRAY[]::text[],
  provided_capabilities text[] NOT NULL DEFAULT ARRAY[]::text[],
  produced_events text[] NOT NULL DEFAULT ARRAY[]::text[],
  consumed_events text[] NOT NULL DEFAULT ARRAY[]::text[],
  required_permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  routes text[] NOT NULL DEFAULT ARRAY[]::text[],
  rpc_functions text[] NOT NULL DEFAULT ARRAY[]::text[],
  edge_functions text[] NOT NULL DEFAULT ARRAY[]::text[],
  primary_tables text[] NOT NULL DEFAULT ARRAY[]::text[],
  documentation_path text,
  contract_version text NOT NULL DEFAULT 'v1',
  can_be_disabled boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.platform_capability_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_key text NOT NULL UNIQUE,
  module_key text NOT NULL REFERENCES public.platform_extension_modules(module_key) ON DELETE CASCADE,
  description text NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  access_type text NOT NULL DEFAULT 'internal' CHECK (access_type IN ('internal', 'admin', 'vendor', 'advisor', 'public', 'service')),
  required_permission text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'observation', 'deprecated', 'disabled', 'experimental')),
  dependencies text[] NOT NULL DEFAULT ARRAY[]::text[],
  input_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  documentation_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_event_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  producer_module_key text NOT NULL REFERENCES public.platform_extension_modules(module_key) ON DELETE CASCADE,
  description text NOT NULL,
  payload_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  optional_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  sensitivity_level text NOT NULL DEFAULT 'internal' CHECK (sensitivity_level IN ('public', 'internal', 'sensitive', 'restricted')),
  retention_policy text NOT NULL DEFAULT 'standard',
  known_consumers text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'disabled', 'experimental')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_key, version)
);

CREATE TABLE IF NOT EXISTS public.platform_rpc_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rpc_name text NOT NULL UNIQUE,
  module_key text NOT NULL REFERENCES public.platform_extension_modules(module_key) ON DELETE CASCADE,
  purpose text NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'observation', 'deprecated', 'disabled', 'experimental')),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  return_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  error_behavior jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency text NOT NULL DEFAULT 'not_required' CHECK (idempotency IN ('required', 'supported', 'not_required', 'unknown')),
  logging_policy text NOT NULL DEFAULT 'standard',
  documentation_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_edge_function_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  module_key text NOT NULL REFERENCES public.platform_extension_modules(module_key) ON DELETE CASCADE,
  purpose text NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'observation', 'deprecated', 'disabled', 'experimental')),
  auth_policy text NOT NULL DEFAULT 'jwt_required',
  authorization_policy text NOT NULL DEFAULT 'module_policy',
  input_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  timeout_ms integer NOT NULL DEFAULT 30000,
  retry_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  documentation_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_scheduled_task_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key text NOT NULL UNIQUE,
  module_key text NOT NULL REFERENCES public.platform_extension_modules(module_key) ON DELETE CASCADE,
  description text NOT NULL,
  frequency text NOT NULL,
  invoked_function text NOT NULL,
  timeout_ms integer NOT NULL DEFAULT 30000,
  retry_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_policy text NOT NULL DEFAULT 'required',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deprecated', 'disabled', 'experimental')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  module_key text NOT NULL REFERENCES public.platform_extension_modules(module_key) ON DELETE CASCADE,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'disabled' CHECK (status IN ('enabled', 'disabled', 'limited', 'experimental')),
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('local', 'preview', 'staging', 'production', 'all')),
  eligibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowed_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  allowed_user_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  rollout_percent numeric NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.platform_feature_flag_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  changed_by uuid DEFAULT auth.uid(),
  previous_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_architecture_scan_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_source text NOT NULL DEFAULT 'script',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'warning', 'failed')),
  modules_detected integer NOT NULL DEFAULT 0,
  rpc_detected integer NOT NULL DEFAULT 0,
  edge_functions_detected integer NOT NULL DEFAULT 0,
  undocumented_rpc integer NOT NULL DEFAULT 0,
  undocumented_edge_functions integer NOT NULL DEFAULT 0,
  circular_dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_extension_modules_status
  ON public.platform_extension_modules(status, logical_owner);
CREATE INDEX IF NOT EXISTS idx_platform_capability_module
  ON public.platform_capability_registry(module_key, status);
CREATE INDEX IF NOT EXISTS idx_platform_event_module
  ON public.platform_event_catalog(producer_module_key, status);
CREATE INDEX IF NOT EXISTS idx_platform_rpc_module
  ON public.platform_rpc_contracts(module_key, status);
CREATE INDEX IF NOT EXISTS idx_platform_edge_module
  ON public.platform_edge_function_contracts(module_key, status);
CREATE INDEX IF NOT EXISTS idx_platform_task_module
  ON public.platform_scheduled_task_registry(module_key, status);
CREATE INDEX IF NOT EXISTS idx_platform_feature_flags_module
  ON public.platform_feature_flags(module_key, status, environment);

CREATE OR REPLACE FUNCTION public.platform_extension_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_extension_history_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'platform_extension_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_extension_modules_touch ON public.platform_extension_modules;
CREATE TRIGGER trg_platform_extension_modules_touch
  BEFORE UPDATE ON public.platform_extension_modules
  FOR EACH ROW EXECUTE FUNCTION public.platform_extension_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_capability_registry_touch ON public.platform_capability_registry;
CREATE TRIGGER trg_platform_capability_registry_touch
  BEFORE UPDATE ON public.platform_capability_registry
  FOR EACH ROW EXECUTE FUNCTION public.platform_extension_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_event_catalog_touch ON public.platform_event_catalog;
CREATE TRIGGER trg_platform_event_catalog_touch
  BEFORE UPDATE ON public.platform_event_catalog
  FOR EACH ROW EXECUTE FUNCTION public.platform_extension_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_rpc_contracts_touch ON public.platform_rpc_contracts;
CREATE TRIGGER trg_platform_rpc_contracts_touch
  BEFORE UPDATE ON public.platform_rpc_contracts
  FOR EACH ROW EXECUTE FUNCTION public.platform_extension_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_edge_contracts_touch ON public.platform_edge_function_contracts;
CREATE TRIGGER trg_platform_edge_contracts_touch
  BEFORE UPDATE ON public.platform_edge_function_contracts
  FOR EACH ROW EXECUTE FUNCTION public.platform_extension_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_task_registry_touch ON public.platform_scheduled_task_registry;
CREATE TRIGGER trg_platform_task_registry_touch
  BEFORE UPDATE ON public.platform_scheduled_task_registry
  FOR EACH ROW EXECUTE FUNCTION public.platform_extension_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_feature_flags_touch ON public.platform_feature_flags;
CREATE TRIGGER trg_platform_feature_flags_touch
  BEFORE UPDATE ON public.platform_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.platform_extension_touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_feature_flag_history_append_only ON public.platform_feature_flag_history;
CREATE TRIGGER trg_platform_feature_flag_history_append_only
  BEFORE UPDATE OR DELETE ON public.platform_feature_flag_history
  FOR EACH ROW EXECUTE FUNCTION public.platform_extension_history_append_only();

CREATE OR REPLACE FUNCTION public.platform_feature_flag_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_feature_flag_history(flag_key, changed_by, previous_values, new_values, change_reason)
  VALUES (
    NEW.flag_key,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END,
    to_jsonb(NEW),
    COALESCE(NEW.metadata->>'change_reason', 'feature flag change')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_feature_flags_audit ON public.platform_feature_flags;
CREATE TRIGGER trg_platform_feature_flags_audit
  AFTER INSERT OR UPDATE ON public.platform_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.platform_feature_flag_audit();

INSERT INTO public.platform_extension_modules(
  module_key, name, description, version, status, logical_owner, dependencies, provided_capabilities, produced_events, consumed_events, required_permissions, routes, rpc_functions, edge_functions, primary_tables, documentation_path, contract_version, can_be_disabled, metadata
)
VALUES
  ('p0_finance_observation', 'P0 Finance Observation', 'Moteur financier en observation/stabilisation. P4.1 le documente uniquement.', 'p0.5', 'observation', 'finance', ARRAY[]::text[], ARRAY['finance.revenue.observe','finance.simulation.replay'], ARRAY['finance.observation.calculated'], ARRAY[]::text[], ARRAY['admin'], ARRAY['/admin?tab=simulation-engine'], ARRAY['calculate_p0_revenue_observation','run_p05_simulation_replay'], ARRAY[]::text[], ARRAY['revenue_engine_snapshots','commission_pool_snapshots','p05_simulation_runs'], 'docs/architecture/module-registry.md#p0_finance_observation', 'v1', false, '{"strict_isolation":true}'::jsonb),
  ('p1_commercial_intelligence', 'P1 Commercial Intelligence', 'CRM conseiller, calendrier IA, objectifs IA, coach, assets, academy, scores et assistant business.', 'p1', 'active', 'growth', ARRAY[]::text[], ARRAY['advisor.crm.manage','advisor.goals.suggest','assistant.recommend'], ARRAY['advisor.task.created','commercial.opportunity.created'], ARRAY['marketplace.product.updated'], ARRAY['admin','advisor'], ARRAY['/admin?tab=advisor-crm','/admin?tab=business-assistant'], ARRAY[]::text[], ARRAY[]::text[], ARRAY['advisor_crm_contacts','commercial_opportunities','advisor_ai_goals'], 'docs/architecture/module-registry.md#p1_commercial_intelligence', 'v1', true, '{}'::jsonb),
  ('p2_marketplace_intelligence', 'P2 Marketplace Intelligence', 'Studio image, coach marketplace, SEO, catalogue intelligence et analytics.', 'p2', 'active', 'marketplace', ARRAY['p1_commercial_intelligence'], ARRAY['marketplace.image.normalize','marketplace.seo.analyze','marketplace.catalog.score'], ARRAY['marketplace.image.analysis_completed','marketplace.product.enriched'], ARRAY['marketplace.product.created','marketplace.product.updated'], ARRAY['admin','vendor'], ARRAY['/vendeur','/admin?tab=marketplace-image-studio','/admin?tab=marketplace-analytics'], ARRAY['analyze_marketplace_product','calculate_marketplace_analytics_snapshot','analyze_catalogue_product'], ARRAY['moderate-product','enhance-product-image'], ARRAY['marketplace_image_studio_jobs','marketplace_coach_recommendations','catalogue_product_quality_snapshots'], 'docs/architecture/module-registry.md#p2_marketplace_intelligence', 'v1', true, '{}'::jsonb),
  ('p3_governance_operations', 'P3 Governance Operations', 'Gouvernance, workflow, orchestration, moderation et observabilite.', 'p3', 'active', 'operations', ARRAY['p2_marketplace_intelligence'], ARRAY['governance.case.create','workflow.task.assign','moderation.content.scan','observability.metric.record'], ARRAY['governance.case.opened','workflow.case.assigned','moderation.review_required','observability.alert.created'], ARRAY['marketplace.image.analysis_completed','marketplace.product.enriched'], ARRAY['admin'], ARRAY['/admin?tab=marketplace-governance','/admin?tab=platform-observability'], ARRAY['create_marketplace_governance_case','scan_platform_compliance','scan_platform_observability'], ARRAY['orchestrator-process'], ARRAY['marketplace_governance_cases','marketplace_workflow_automation_queue','marketplace_compliance_findings','platform_observability_metrics'], 'docs/architecture/module-registry.md#p3_governance_operations', 'v1', false, '{}'::jsonb),
  ('p4_extension_framework', 'P4.1 Platform Extension Framework', 'Registres, contrats, flags, ADR et analyse de dependances pour futurs modules.', 'p4.1', 'active', 'architecture', ARRAY['p3_governance_operations'], ARRAY['architecture.module.register','architecture.capability.declare','architecture.event.catalog','feature.flag.evaluate'], ARRAY['architecture.registry.updated','feature_flag.updated'], ARRAY['observability.alert.created'], ARRAY['admin'], ARRAY['/admin?tab=platform-extension'], ARRAY['register_platform_extension_module','set_platform_feature_flag','is_platform_feature_enabled'], ARRAY[]::text[], ARRAY['platform_extension_modules','platform_capability_registry','platform_event_catalog','platform_feature_flags'], 'docs/architecture/README.md', 'v1', false, '{"adoption":"progressive"}'::jsonb)
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
    can_be_disabled = EXCLUDED.can_be_disabled,
    metadata = EXCLUDED.metadata,
    updated_at = now();

INSERT INTO public.platform_capability_registry(capability_key, module_key, description, version, access_type, required_permission, status, dependencies, input_contract, output_contract, documentation_path)
VALUES
  ('marketplace.image.normalize', 'p2_marketplace_intelligence', 'Normaliser les images Marketplace selon le standard LPB.', 'v1', 'vendor', 'marketplace_image_studio', 'active', ARRAY[]::text[], '{"product_id":"uuid","image":"file_or_url"}'::jsonb, '{"score":"number","public_url":"text","requires_review":"boolean"}'::jsonb, 'docs/architecture/capability-registry.md'),
  ('marketplace.catalog.score', 'p2_marketplace_intelligence', 'Evaluer la qualite catalogue et proposer enrichissements.', 'v1', 'vendor', 'catalogue_intelligence', 'active', ARRAY['marketplace.image.normalize'], '{"product_id":"uuid"}'::jsonb, '{"quality_score":"number","recommendations":"array"}'::jsonb, 'docs/architecture/capability-registry.md'),
  ('marketplace.seo.analyze', 'p2_marketplace_intelligence', 'Analyser titres, meta et decouvrabilite marketplace.', 'v1', 'vendor', 'marketplace_seo', 'active', ARRAY['marketplace.catalog.score'], '{"product_id":"uuid"}'::jsonb, '{"seo_score":"number","proposal_id":"uuid"}'::jsonb, 'docs/architecture/capability-registry.md'),
  ('governance.case.create', 'p3_governance_operations', 'Creer un dossier de gouvernance avec historique.', 'v1', 'admin', 'marketplace_governance', 'active', ARRAY[]::text[], '{"case_type":"text","source_module":"text"}'::jsonb, '{"case_id":"uuid","case_number":"text"}'::jsonb, 'docs/architecture/capability-registry.md'),
  ('workflow.task.assign', 'p3_governance_operations', 'Assigner une tache ou un dossier workflow.', 'v1', 'admin', 'marketplace_governance', 'active', ARRAY['governance.case.create'], '{"case_id":"uuid","assignee_id":"uuid"}'::jsonb, '{"assignment_id":"uuid"}'::jsonb, 'docs/architecture/capability-registry.md'),
  ('moderation.content.scan', 'p3_governance_operations', 'Scanner contenu et conformite sans decision irreversible.', 'v1', 'admin', 'marketplace_governance', 'active', ARRAY['marketplace.catalog.score'], '{"limit":"integer"}'::jsonb, '{"findings_created":"integer"}'::jsonb, 'docs/architecture/capability-registry.md'),
  ('observability.metric.record', 'p3_governance_operations', 'Enregistrer une metrique technique observabilite append-only.', 'v1', 'service', 'audit', 'active', ARRAY[]::text[], '{"service_code":"text","metric_name":"text","metric_value":"number"}'::jsonb, '{"metric_id":"uuid","alerts_created":"integer"}'::jsonb, 'docs/architecture/capability-registry.md'),
  ('architecture.module.register', 'p4_extension_framework', 'Declarer un module et ses contrats sans coupler son execution.', 'v1', 'admin', 'audit', 'active', ARRAY['observability.metric.record'], '{"module_key":"text","version":"text"}'::jsonb, '{"module_id":"uuid"}'::jsonb, 'docs/architecture/capability-registry.md'),
  ('feature.flag.evaluate', 'p4_extension_framework', 'Evaluer un feature flag sans contourner les permissions RLS.', 'v1', 'internal', NULL, 'active', ARRAY[]::text[], '{"flag_key":"text","context":"object"}'::jsonb, '{"enabled":"boolean"}'::jsonb, 'docs/architecture/capability-registry.md')
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
  ('marketplace.product.created', 'v1', 'p2_marketplace_intelligence', 'Produit Marketplace cree.', '{"product_id":"uuid","vendor_shop_id":"uuid"}'::jsonb, ARRAY['product_id'], ARRAY['vendor_shop_id'], 'internal', 'standard', ARRAY['p2_marketplace_intelligence','p3_governance_operations'], 'active'),
  ('marketplace.product.updated', 'v1', 'p2_marketplace_intelligence', 'Produit Marketplace mis a jour.', '{"product_id":"uuid","changed_fields":"array"}'::jsonb, ARRAY['product_id'], ARRAY['changed_fields'], 'internal', 'standard', ARRAY['p2_marketplace_intelligence','p3_governance_operations'], 'active'),
  ('marketplace.image.analysis_completed', 'v1', 'p2_marketplace_intelligence', 'Analyse image terminee.', '{"job_id":"uuid","product_id":"uuid","compliance_score":"number"}'::jsonb, ARRAY['job_id','product_id'], ARRAY['compliance_score'], 'internal', 'standard', ARRAY['p2_marketplace_intelligence','p3_governance_operations'], 'active'),
  ('governance.case.opened', 'v1', 'p3_governance_operations', 'Dossier de gouvernance ouvert.', '{"case_id":"uuid","case_type":"text","severity":"text"}'::jsonb, ARRAY['case_id','case_type'], ARRAY['severity'], 'sensitive', 'long_audit', ARRAY['p3_governance_operations'], 'active'),
  ('workflow.case.assigned', 'v1', 'p3_governance_operations', 'Dossier assigne a une equipe ou personne.', '{"case_id":"uuid","assignee_id":"uuid"}'::jsonb, ARRAY['case_id'], ARRAY['assignee_id'], 'sensitive', 'long_audit', ARRAY['p3_governance_operations'], 'active'),
  ('moderation.review_required', 'v1', 'p3_governance_operations', 'Revue humaine requise par moderation IA.', '{"finding_id":"uuid","product_id":"uuid","severity":"text"}'::jsonb, ARRAY['finding_id'], ARRAY['product_id','severity'], 'sensitive', 'long_audit', ARRAY['p3_governance_operations'], 'active'),
  ('observability.alert.created', 'v1', 'p3_governance_operations', 'Alerte technique creee par P3.5.', '{"alert_id":"uuid","service_code":"text","severity":"text"}'::jsonb, ARRAY['alert_id','service_code'], ARRAY['severity'], 'internal', 'standard', ARRAY['p4_extension_framework'], 'active'),
  ('architecture.registry.updated', 'v1', 'p4_extension_framework', 'Registre d architecture mis a jour.', '{"registry":"text","key":"text","version":"text"}'::jsonb, ARRAY['registry','key'], ARRAY['version'], 'internal', 'long_audit', ARRAY['p3_governance_operations'], 'active'),
  ('feature_flag.updated', 'v1', 'p4_extension_framework', 'Feature flag cree ou modifie.', '{"flag_key":"text","status":"text"}'::jsonb, ARRAY['flag_key','status'], ARRAY['environment'], 'internal', 'long_audit', ARRAY['p3_governance_operations'], 'active')
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
  ('register_platform_extension_module', 'p4_extension_framework', 'Creer ou mettre a jour une declaration de module.', 'v1', 'active', '{"_module":"jsonb"}'::jsonb, '{"module_key":"text","status":"text"}'::jsonb, ARRAY['admin'], '{"admin_required":"caller must be technical admin"}'::jsonb, 'supported', 'audit', 'docs/architecture/api-conventions.md'),
  ('set_platform_feature_flag', 'p4_extension_framework', 'Modifier un feature flag avec historique append-only.', 'v1', 'active', '{"_flag_key":"text","_status":"text","_reason":"text"}'::jsonb, '{"flag_key":"text","status":"text"}'::jsonb, ARRAY['admin'], '{"invalid_flag_status":"unsupported status"}'::jsonb, 'supported', 'audit', 'docs/architecture/api-conventions.md'),
  ('is_platform_feature_enabled', 'p4_extension_framework', 'Evaluer un flag sans exposer les details internes.', 'v1', 'active', '{"_flag_key":"text","_context":"jsonb"}'::jsonb, '{"enabled":"boolean"}'::jsonb, ARRAY[]::text[], '{}'::jsonb, 'not_required', 'none', 'docs/architecture/api-conventions.md'),
  ('scan_platform_observability', 'p3_governance_operations', 'Collecter les metriques techniques P3.5.', 'v1', 'active', '{"_scope":"jsonb"}'::jsonb, '{"metrics_collected":"integer","alerts_created":"integer"}'::jsonb, ARRAY['admin'], '{}'::jsonb, 'supported', 'observability', 'docs/architecture/api-conventions.md')
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

INSERT INTO public.platform_edge_function_contracts(function_name, module_key, purpose, version, status, auth_policy, authorization_policy, input_contract, output_contract, timeout_ms, retry_policy, metrics, documentation_path)
VALUES
  ('orchestrator-process', 'p3_governance_operations', 'Traiter l orchestration asynchrone P3.', 'v1', 'active', 'jwt_or_internal_secret', 'admin_or_internal', '{"limit":"integer"}'::jsonb, '{"processed":"integer"}'::jsonb, 30000, '{"max_attempts":3}'::jsonb, '{"records_duration":true}'::jsonb, 'docs/architecture/api-conventions.md'),
  ('moderate-product', 'p3_governance_operations', 'Analyser un produit pour moderation IA.', 'v1', 'active', 'jwt_required', 'admin_or_vendor_owner', '{"product_id":"uuid"}'::jsonb, '{"compliance_ok":"boolean","quality_score":"number"}'::jsonb, 30000, '{"max_attempts":2}'::jsonb, '{"records_errors":true}'::jsonb, 'docs/architecture/api-conventions.md'),
  ('enhance-product-image', 'p2_marketplace_intelligence', 'Ameliorer une image produit.', 'v1', 'active', 'jwt_required', 'admin_or_vendor_owner', '{"product_id":"uuid","image_url":"text"}'::jsonb, '{"image_url":"text"}'::jsonb, 60000, '{"max_attempts":1}'::jsonb, '{"records_errors":true}'::jsonb, 'docs/architecture/api-conventions.md'),
  ('initiate-mobile-money-payment', 'p0_finance_observation', 'Initier un paiement Mobile Money via backend securise.', 'v1', 'observation', 'jwt_required', 'checkout_user', '{"order_id":"uuid","phone":"text"}'::jsonb, '{"payment_intent":"text"}'::jsonb, 30000, '{"max_attempts":1,"idempotency_required":true}'::jsonb, '{"financial_boundary":true}'::jsonb, 'docs/architecture/api-conventions.md'),
  ('mobile-money-webhook', 'p0_finance_observation', 'Recevoir une confirmation provider signee.', 'v1', 'observation', 'signed_webhook', 'provider_signature', '{"provider_reference":"text","status":"text"}'::jsonb, '{"accepted":"boolean"}'::jsonb, 30000, '{"max_attempts":5,"idempotency_required":true}'::jsonb, '{"financial_boundary":true}'::jsonb, 'docs/architecture/api-conventions.md')
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

INSERT INTO public.platform_scheduled_task_registry(task_key, module_key, description, frequency, invoked_function, timeout_ms, retry_policy, idempotency_policy, metrics, alert_policy, status)
VALUES
  ('observability.health.scan.hourly', 'p3_governance_operations', 'Scanner la sante technique et produire alertes P3.5.', 'hourly', 'scan_platform_observability', 30000, '{"max_attempts":3}'::jsonb, 'required', '{"metrics":["duration_ms","alerts_created"]}'::jsonb, '{"alert_on_failure":true}'::jsonb, 'active'),
  ('workflow.automation.process', 'p3_governance_operations', 'Traiter la file workflow automation.', 'every_5_minutes', 'orchestrator-process', 30000, '{"max_attempts":3}'::jsonb, 'required', '{"metrics":["processed","failed"]}'::jsonb, '{"alert_on_stuck_queue":true}'::jsonb, 'active'),
  ('marketplace.analytics.snapshot.daily', 'p2_marketplace_intelligence', 'Calculer les snapshots analytics marketplace.', 'daily', 'calculate_marketplace_analytics_snapshot', 60000, '{"max_attempts":2}'::jsonb, 'supported', '{"metrics":["shops_processed"]}'::jsonb, '{"alert_on_failure":true}'::jsonb, 'active')
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

INSERT INTO public.platform_feature_flags(flag_key, module_key, description, status, environment, eligibility_rules, allowed_roles, rollout_percent, metadata)
VALUES
  ('p4.extension_framework.admin_dashboard', 'p4_extension_framework', 'Affiche le dashboard technique P4.1 aux admins autorises.', 'enabled', 'production', '{"requires_admin":true}'::jsonb, ARRAY['admin'], 100, '{"seeded":true}'::jsonb),
  ('p4.strict_contract_enforcement', 'p4_extension_framework', 'Mode futur pour bloquer les nouveaux modules non declares. Desactive pendant adoption progressive.', 'disabled', 'production', '{"phase":"future"}'::jsonb, ARRAY['admin'], 0, '{"seeded":true}'::jsonb),
  ('p0.production_activation_guard', 'p0_finance_observation', 'Rappel declaratif: activation P0 production interdite sans decision Super Admin separee.', 'enabled', 'production', '{"strict_isolation":true}'::jsonb, ARRAY['admin'], 100, '{"seeded":true,"financial_guard":true}'::jsonb)
ON CONFLICT (flag_key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    environment = EXCLUDED.environment,
    eligibility_rules = EXCLUDED.eligibility_rules,
    allowed_roles = EXCLUDED.allowed_roles,
    rollout_percent = EXCLUDED.rollout_percent,
    metadata = EXCLUDED.metadata,
    updated_by = auth.uid(),
    updated_at = now();

CREATE OR REPLACE FUNCTION public.register_platform_extension_module(_module jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_key text := _module->>'module_key';
BEGIN
  IF NOT public.platform_extension_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF COALESCE(v_module_key, '') = '' THEN
    RAISE EXCEPTION 'module_key_required';
  END IF;

  INSERT INTO public.platform_extension_modules(
    module_key, name, description, version, status, logical_owner, dependencies, provided_capabilities,
    produced_events, consumed_events, required_permissions, routes, rpc_functions, edge_functions,
    primary_tables, documentation_path, contract_version, can_be_disabled, metadata
  )
  VALUES (
    v_module_key,
    COALESCE(_module->>'name', v_module_key),
    COALESCE(_module->>'description', 'Module declare via P4.1'),
    COALESCE(_module->>'version', 'v1'),
    COALESCE(_module->>'status', 'experimental'),
    COALESCE(_module->>'logical_owner', 'platform'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'dependencies')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'provided_capabilities')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'produced_events')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'consumed_events')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'required_permissions')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'routes')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'rpc_functions')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'edge_functions')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_module->'primary_tables')), ARRAY[]::text[]),
    _module->>'documentation_path',
    COALESCE(_module->>'contract_version', 'v1'),
    COALESCE((_module->>'can_be_disabled')::boolean, false),
    COALESCE(_module->'metadata', '{}'::jsonb)
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
      can_be_disabled = EXCLUDED.can_be_disabled,
      metadata = EXCLUDED.metadata,
      updated_at = now();

  RETURN jsonb_build_object('module_key', v_module_key, 'status', 'registered');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_platform_feature_flag(
  _flag_key text,
  _status text,
  _reason text DEFAULT NULL,
  _eligibility_rules jsonb DEFAULT NULL,
  _rollout_percent numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.platform_extension_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF _status NOT IN ('enabled', 'disabled', 'limited', 'experimental') THEN
    RAISE EXCEPTION 'invalid_flag_status';
  END IF;

  UPDATE public.platform_feature_flags
  SET status = _status,
      eligibility_rules = COALESCE(_eligibility_rules, eligibility_rules),
      rollout_percent = COALESCE(_rollout_percent, rollout_percent),
      metadata = metadata || jsonb_build_object('change_reason', COALESCE(_reason, 'manual update')),
      updated_by = auth.uid(),
      updated_at = now()
  WHERE flag_key = _flag_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'flag_not_found';
  END IF;

  RETURN jsonb_build_object('flag_key', _flag_key, 'status', _status);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_feature_enabled(_flag_key text, _context jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flag public.platform_feature_flags%ROWTYPE;
  v_role text;
BEGIN
  SELECT * INTO v_flag
  FROM public.platform_feature_flags
  WHERE flag_key = _flag_key
    AND environment IN ('production', 'all');

  IF NOT FOUND OR v_flag.status = 'disabled' THEN
    RETURN false;
  END IF;

  IF v_flag.status = 'enabled' THEN
    RETURN true;
  END IF;

  IF auth.uid() = ANY(v_flag.allowed_user_ids) THEN
    RETURN true;
  END IF;

  FOR v_role IN SELECT unnest(v_flag.allowed_roles) LOOP
    BEGIN
      IF public.has_role(auth.uid(), v_role::public.app_role) THEN
        RETURN true;
      END IF;
    EXCEPTION
      WHEN invalid_text_representation THEN
        CONTINUE;
    END;
  END LOOP;

  RETURN false;
END;
$$;

CREATE OR REPLACE VIEW public.admin_platform_extension_overview AS
SELECT
  (SELECT count(*) FROM public.platform_extension_modules)::integer AS modules_count,
  (SELECT count(*) FROM public.platform_extension_modules WHERE status = 'active')::integer AS active_modules_count,
  (SELECT count(*) FROM public.platform_capability_registry WHERE status = 'active')::integer AS active_capabilities_count,
  (SELECT count(*) FROM public.platform_event_catalog WHERE status = 'active')::integer AS active_events_count,
  (SELECT count(*) FROM public.platform_rpc_contracts WHERE status = 'active')::integer AS documented_rpc_count,
  (SELECT count(*) FROM public.platform_edge_function_contracts WHERE status = 'active')::integer AS documented_edge_functions_count,
  (SELECT count(*) FROM public.platform_feature_flags WHERE status IN ('enabled', 'limited', 'experimental'))::integer AS active_flags_count,
  (SELECT count(*) FROM public.platform_scheduled_task_registry WHERE status = 'active')::integer AS active_tasks_count
WHERE public.platform_extension_is_admin();

CREATE OR REPLACE VIEW public.admin_platform_extension_modules AS
SELECT *
FROM public.platform_extension_modules
WHERE public.platform_extension_is_admin()
ORDER BY module_key;

CREATE OR REPLACE VIEW public.admin_platform_capabilities AS
SELECT c.*, m.name AS module_name, m.status AS module_status
FROM public.platform_capability_registry c
JOIN public.platform_extension_modules m ON m.module_key = c.module_key
WHERE public.platform_extension_is_admin()
ORDER BY c.capability_key;

CREATE OR REPLACE VIEW public.admin_platform_event_catalog AS
SELECT e.*, m.name AS producer_module_name
FROM public.platform_event_catalog e
JOIN public.platform_extension_modules m ON m.module_key = e.producer_module_key
WHERE public.platform_extension_is_admin()
ORDER BY e.event_key, e.version;

CREATE OR REPLACE VIEW public.admin_platform_contracts AS
SELECT 'rpc'::text AS contract_type, rpc_name AS contract_name, module_key, purpose, version, status, required_permissions, documentation_path
FROM public.platform_rpc_contracts
WHERE public.platform_extension_is_admin()
UNION ALL
SELECT 'edge_function'::text AS contract_type, function_name AS contract_name, module_key, purpose, version, status, ARRAY[auth_policy, authorization_policy]::text[] AS required_permissions, documentation_path
FROM public.platform_edge_function_contracts
WHERE public.platform_extension_is_admin()
ORDER BY contract_type, contract_name;

CREATE OR REPLACE VIEW public.admin_platform_feature_flags AS
SELECT *
FROM public.platform_feature_flags
WHERE public.platform_extension_is_admin()
ORDER BY module_key, flag_key;

CREATE OR REPLACE VIEW public.admin_platform_scheduled_tasks AS
SELECT t.*, m.name AS module_name
FROM public.platform_scheduled_task_registry t
JOIN public.platform_extension_modules m ON m.module_key = t.module_key
WHERE public.platform_extension_is_admin()
ORDER BY t.task_key;

CREATE OR REPLACE VIEW public.admin_platform_dependency_map AS
SELECT
  m.module_key,
  m.name,
  dependency AS depends_on,
  dep.name AS dependency_name,
  CASE WHEN dep.module_key IS NULL THEN 'missing_declaration' ELSE 'declared' END AS dependency_status
FROM public.platform_extension_modules m
LEFT JOIN LATERAL unnest(m.dependencies) AS dependency ON true
LEFT JOIN public.platform_extension_modules dep ON dep.module_key = dependency
WHERE public.platform_extension_is_admin();

CREATE OR REPLACE VIEW public.admin_platform_compatibility_alerts AS
SELECT
  'missing_dependency'::text AS alert_type,
  'high'::text AS severity,
  module_key,
  'Dependance non declaree dans le registre'::text AS title,
  depends_on AS detail
FROM public.admin_platform_dependency_map
WHERE depends_on IS NOT NULL AND dependency_status = 'missing_declaration'
UNION ALL
SELECT
  'deprecated_module_dependency'::text AS alert_type,
  'medium'::text AS severity,
  m.module_key,
  'Module depend d un module deprecated'::text AS title,
  dep.module_key AS detail
FROM public.platform_extension_modules m
JOIN LATERAL unnest(m.dependencies) AS dependency ON true
JOIN public.platform_extension_modules dep ON dep.module_key = dependency
WHERE public.platform_extension_is_admin()
  AND dep.status = 'deprecated'
UNION ALL
SELECT
  'disabled_flag_enabled_module'::text AS alert_type,
  'low'::text AS severity,
  f.module_key,
  'Feature flag desactive pour un module actif'::text AS title,
  f.flag_key AS detail
FROM public.platform_feature_flags f
JOIN public.platform_extension_modules m ON m.module_key = f.module_key
WHERE public.platform_extension_is_admin()
  AND m.status = 'active'
  AND f.status = 'disabled';

ALTER TABLE public.platform_extension_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_capability_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_event_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_rpc_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_edge_function_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_scheduled_task_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feature_flag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_architecture_scan_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Technical admins manage platform extension modules" ON public.platform_extension_modules;
CREATE POLICY "Technical admins manage platform extension modules"
ON public.platform_extension_modules FOR ALL TO authenticated
USING (public.platform_extension_is_admin())
WITH CHECK (public.platform_extension_is_admin());

DROP POLICY IF EXISTS "Technical admins manage platform capabilities" ON public.platform_capability_registry;
CREATE POLICY "Technical admins manage platform capabilities"
ON public.platform_capability_registry FOR ALL TO authenticated
USING (public.platform_extension_is_admin())
WITH CHECK (public.platform_extension_is_admin());

DROP POLICY IF EXISTS "Technical admins manage platform events" ON public.platform_event_catalog;
CREATE POLICY "Technical admins manage platform events"
ON public.platform_event_catalog FOR ALL TO authenticated
USING (public.platform_extension_is_admin())
WITH CHECK (public.platform_extension_is_admin());

DROP POLICY IF EXISTS "Technical admins manage rpc contracts" ON public.platform_rpc_contracts;
CREATE POLICY "Technical admins manage rpc contracts"
ON public.platform_rpc_contracts FOR ALL TO authenticated
USING (public.platform_extension_is_admin())
WITH CHECK (public.platform_extension_is_admin());

DROP POLICY IF EXISTS "Technical admins manage edge contracts" ON public.platform_edge_function_contracts;
CREATE POLICY "Technical admins manage edge contracts"
ON public.platform_edge_function_contracts FOR ALL TO authenticated
USING (public.platform_extension_is_admin())
WITH CHECK (public.platform_extension_is_admin());

DROP POLICY IF EXISTS "Technical admins manage scheduled tasks" ON public.platform_scheduled_task_registry;
CREATE POLICY "Technical admins manage scheduled tasks"
ON public.platform_scheduled_task_registry FOR ALL TO authenticated
USING (public.platform_extension_is_admin())
WITH CHECK (public.platform_extension_is_admin());

DROP POLICY IF EXISTS "Technical admins manage feature flags" ON public.platform_feature_flags;
CREATE POLICY "Technical admins manage feature flags"
ON public.platform_feature_flags FOR ALL TO authenticated
USING (public.platform_extension_is_admin())
WITH CHECK (public.platform_extension_is_admin());

DROP POLICY IF EXISTS "Technical admins read feature flag history" ON public.platform_feature_flag_history;
CREATE POLICY "Technical admins read feature flag history"
ON public.platform_feature_flag_history FOR SELECT TO authenticated
USING (public.platform_extension_is_admin());

DROP POLICY IF EXISTS "Technical admins read architecture scan reports" ON public.platform_architecture_scan_reports;
CREATE POLICY "Technical admins read architecture scan reports"
ON public.platform_architecture_scan_reports FOR SELECT TO authenticated
USING (public.platform_extension_is_admin());

GRANT SELECT ON public.platform_extension_modules TO authenticated, service_role;
GRANT SELECT ON public.platform_capability_registry TO authenticated, service_role;
GRANT SELECT ON public.platform_event_catalog TO authenticated, service_role;
GRANT SELECT ON public.platform_rpc_contracts TO authenticated, service_role;
GRANT SELECT ON public.platform_edge_function_contracts TO authenticated, service_role;
GRANT SELECT ON public.platform_scheduled_task_registry TO authenticated, service_role;
GRANT SELECT ON public.platform_feature_flags TO authenticated, service_role;
GRANT SELECT ON public.platform_feature_flag_history TO authenticated, service_role;
GRANT SELECT ON public.platform_architecture_scan_reports TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_platform_extension_module(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_platform_feature_flag(text, text, text, jsonb, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_feature_enabled(text, jsonb) TO authenticated, service_role;

INSERT INTO public.platform_observability_services(code, name, category, owner_module, description, health_thresholds)
VALUES
  ('platform_extension_framework', 'P4.1 Platform Extension Framework', 'module', 'p4.1', 'Registres, contrats, flags et cartographie architecture.', '{"missing_declaration_warning":1,"compatibility_alert_warning":1}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    owner_module = EXCLUDED.owner_module,
    description = EXCLUDED.description,
    health_thresholds = EXCLUDED.health_thresholds,
    is_active = true,
    updated_at = now();

NOTIFY pgrst, 'reload schema';
