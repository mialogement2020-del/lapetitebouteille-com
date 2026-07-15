-- LPB Business Flight Recorder.
-- Permanent append-only memory for P0 financial decisions and replay.
-- Additive/reporting only: no wallet, commission, order, product, or ledger mutation.

CREATE TABLE IF NOT EXISTS public.business_flight_recorder_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  replay_run_id uuid,
  event_time timestamptz NOT NULL DEFAULT now(),
  engine_name text NOT NULL DEFAULT 'LPB Business Flight Recorder',
  engine_version text NOT NULL DEFAULT 'p0_revenue_engine_v1',
  business_rules_version text NOT NULL DEFAULT 'p0_business_rules_v1',
  event_type text NOT NULL,
  event_sequence integer NOT NULL DEFAULT 0,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id uuid,
  advisor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  decision text NOT NULL DEFAULT 'observed',
  final_decision text,
  margin_amount numeric(14,2),
  product_cost_total numeric(14,2),
  commission_pool_amount numeric(14,2),
  attribution_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fraud_risk_level text,
  trust_score numeric(8,4),
  business_score numeric(8,4),
  block_reason text,
  commission_reduction_reason text,
  refusal_reason text,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_table text,
  source_id uuid,
  created_by uuid DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_bfr_events_order
  ON public.business_flight_recorder_events(order_id, event_sequence, event_time);
CREATE INDEX IF NOT EXISTS idx_bfr_events_replay
  ON public.business_flight_recorder_events(replay_run_id, event_sequence);
CREATE INDEX IF NOT EXISTS idx_bfr_events_type
  ON public.business_flight_recorder_events(event_type, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_bfr_events_engine_version
  ON public.business_flight_recorder_events(engine_version, business_rules_version, event_time DESC);

CREATE TABLE IF NOT EXISTS public.business_flight_replay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NOT NULL DEFAULT now(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  engine_version text NOT NULL DEFAULT 'p0_revenue_engine_v1',
  business_rules_version text NOT NULL DEFAULT 'p0_business_rules_v1',
  event_count integer NOT NULL DEFAULT 0,
  final_decision text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bfr_replay_runs_requested
  ON public.business_flight_replay_runs(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_bfr_replay_runs_order
  ON public.business_flight_replay_runs(order_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS public.business_engine_version_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  left_engine_version text NOT NULL,
  right_engine_version text NOT NULL,
  left_business_rules_version text,
  right_business_rules_version text,
  orders_compared integer NOT NULL DEFAULT 0,
  different_decision_count integer NOT NULL DEFAULT 0,
  margin_impact_total numeric(14,2) NOT NULL DEFAULT 0,
  commission_pool_impact_total numeric(14,2) NOT NULL DEFAULT 0,
  differently_treated_orders jsonb NOT NULL DEFAULT '[]'::jsonb,
  rule_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION public.prevent_business_flight_recorder_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'business_flight_recorder_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_bfr_events_immutable ON public.business_flight_recorder_events;
CREATE TRIGGER trg_bfr_events_immutable
BEFORE UPDATE OR DELETE ON public.business_flight_recorder_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_flight_recorder_mutation();

DROP TRIGGER IF EXISTS trg_bfr_replay_runs_immutable ON public.business_flight_replay_runs;
CREATE TRIGGER trg_bfr_replay_runs_immutable
BEFORE UPDATE OR DELETE ON public.business_flight_replay_runs
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_flight_recorder_mutation();

DROP TRIGGER IF EXISTS trg_bfr_version_comparisons_immutable ON public.business_engine_version_comparisons;
CREATE TRIGGER trg_bfr_version_comparisons_immutable
BEFORE UPDATE OR DELETE ON public.business_engine_version_comparisons
FOR EACH ROW EXECUTE FUNCTION public.prevent_business_flight_recorder_mutation();

CREATE OR REPLACE FUNCTION public.admin_replay_business_flight_order(_order_ref text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_snapshot public.order_accounting_snapshots%ROWTYPE;
  v_revenue public.revenue_engine_snapshots%ROWTYPE;
  v_pool public.commission_pool_snapshots%ROWTYPE;
  v_attr public.order_attributions%ROWTYPE;
  v_fraud record;
  v_customer_trust numeric := NULL;
  v_advisor_trust numeric := NULL;
  v_business_score numeric := NULL;
  v_replay_id uuid := gen_random_uuid();
  v_sequence integer := 0;
  v_final_decision text := 'unknown';
  v_event_count integer := 0;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id::text = _order_ref
     OR order_number = _order_ref
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  SELECT * INTO v_snapshot
  FROM public.order_accounting_snapshots
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'accounting_snapshot_missing';
  END IF;

  PERFORM public.calculate_p0_revenue_observation(v_order.id);

  SELECT * INTO v_revenue
  FROM public.revenue_engine_snapshots
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_pool
  FROM public.commission_pool_snapshots
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_attr
  FROM public.order_attributions
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT
    CASE max(CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END)
      WHEN 4 THEN 'critical'
      WHEN 3 THEN 'high'
      WHEN 2 THEN 'medium'
      ELSE 'low'
    END AS severity,
    jsonb_agg(jsonb_build_object('signal_type', signal_type, 'severity', severity, 'details', signal_details)) AS signals
  INTO v_fraud
  FROM public.fraud_risk_signals
  WHERE order_id = v_order.id;

  v_final_decision := COALESCE(v_revenue.decision, 'unknown');
  v_items := COALESCE(v_snapshot.items, '[]'::jsonb);
  v_business_score := round(COALESCE(v_revenue.confidence, 1) * 100, 4);

  SELECT score INTO v_customer_trust
  FROM public.trust_scores
  WHERE subject_id = v_order.user_id
    AND subject_type = 'customer'::public.trust_subject_type
  ORDER BY computed_at DESC
  LIMIT 1;

  IF v_attr.attributed_user_id IS NOT NULL THEN
    SELECT score INTO v_advisor_trust
    FROM public.trust_scores
    WHERE subject_id = v_attr.attributed_user_id
      AND subject_type = 'ambassador'::public.trust_subject_type
    ORDER BY computed_at DESC
    LIMIT 1;
  END IF;

  v_sequence := v_sequence + 1;
  INSERT INTO public.business_flight_recorder_events (
    replay_run_id, event_type, event_sequence, order_id, order_number, user_id,
    decision, final_decision, explanation, input_data, output_data, source_table, source_id
  ) VALUES (
    v_replay_id, 'order_created', v_sequence, v_order.id, v_order.order_number, v_order.user_id,
    'observed', v_final_decision,
    jsonb_build_object('step', 'Commande creee', 'status', v_order.status, 'payment_status', v_order.payment_status),
    jsonb_build_object('order_total', v_order.total, 'created_at', v_order.created_at),
    jsonb_build_object('order_number', v_order.order_number),
    'orders', v_order.id
  );

  v_sequence := v_sequence + 1;
  INSERT INTO public.business_flight_recorder_events (
    replay_run_id, event_type, event_sequence, order_id, order_number, user_id,
    decision, final_decision, trust_score, business_score,
    explanation, input_data, output_data, source_table, source_id
  ) VALUES (
    v_replay_id, 'payment_status_checked', v_sequence, v_order.id, v_order.order_number, v_order.user_id,
    CASE WHEN v_order.payment_status = 'completed' THEN 'payment_confirmed' ELSE 'payment_not_completed' END,
    v_final_decision,
    v_customer_trust,
    v_business_score,
    jsonb_build_object('step', 'Paiement verifie', 'payment_status', v_order.payment_status),
    jsonb_build_object('payment_method', v_order.payment_method),
    jsonb_build_object('eligible_for_commission', v_order.payment_status = 'completed'),
    'orders', v_order.id
  );

  v_sequence := v_sequence + 1;
  INSERT INTO public.business_flight_recorder_events (
    replay_run_id, event_type, event_sequence, order_id, order_number, user_id,
    decision, final_decision, product_cost_total, block_reason, explanation,
    input_data, output_data, source_table, source_id
  ) VALUES (
    v_replay_id, 'product_cost_loaded', v_sequence, v_order.id, v_order.order_number, v_order.user_id,
    CASE WHEN COALESCE(v_revenue.missing_cost_count, 0) > 0 THEN 'missing_purchase_cost' ELSE 'cost_available' END,
    v_final_decision,
    COALESCE(v_revenue.product_cost_total, v_snapshot.product_cost_total, 0),
    CASE WHEN COALESCE(v_revenue.missing_cost_count, 0) > 0 THEN 'missing_purchase_cost' ELSE NULL END,
    jsonb_build_object('step', 'Cout produit recupere', 'missing_cost_count', COALESCE(v_revenue.missing_cost_count, 0)),
    jsonb_build_object('items', v_items),
    jsonb_build_object('product_cost_total', COALESCE(v_revenue.product_cost_total, v_snapshot.product_cost_total, 0)),
    'order_accounting_snapshots', v_snapshot.id
  );

  v_sequence := v_sequence + 1;
  INSERT INTO public.business_flight_recorder_events (
    replay_run_id, event_type, event_sequence, order_id, order_number, user_id,
    decision, final_decision, margin_amount, product_cost_total, block_reason, explanation,
    input_data, output_data, source_table, source_id
  ) VALUES (
    v_replay_id, 'margin_calculated', v_sequence, v_order.id, v_order.order_number, v_order.user_id,
    COALESCE(v_revenue.decision, 'observed'),
    v_final_decision,
    COALESCE(v_revenue.contribution_margin, 0),
    COALESCE(v_revenue.product_cost_total, 0),
    CASE WHEN COALESCE(v_revenue.rejection_reasons, '[]'::jsonb) ? 'minimum_platform_margin_not_met' THEN 'minimum_platform_margin_not_met' ELSE NULL END,
    jsonb_build_object(
      'step', 'Marge calculee',
      'gross_margin', COALESCE(v_revenue.gross_margin, 0),
      'contribution_margin', COALESCE(v_revenue.contribution_margin, 0),
      'minimum_profit', COALESCE(v_revenue.platform_minimum_profit, 0)
    ),
    COALESCE(v_revenue.calculation_details, '{}'::jsonb),
    jsonb_build_object(
      'is_commissionable', COALESCE(v_revenue.is_commissionable, false),
      'warnings', COALESCE(v_revenue.warnings, '[]'::jsonb),
      'rejection_reasons', COALESCE(v_revenue.rejection_reasons, '[]'::jsonb)
    ),
    'revenue_engine_snapshots', v_revenue.id
  );

  v_sequence := v_sequence + 1;
  INSERT INTO public.business_flight_recorder_events (
    replay_run_id, event_type, event_sequence, order_id, order_number, user_id,
    decision, final_decision, commission_pool_amount, commission_reduction_reason, block_reason,
    explanation, input_data, output_data, source_table, source_id
  ) VALUES (
    v_replay_id, 'commission_pool_calculated', v_sequence, v_order.id, v_order.order_number, v_order.user_id,
    COALESCE(v_pool.decision, 'blocked'),
    v_final_decision,
    COALESCE(v_pool.pool_available, 0),
    CASE WHEN COALESCE(v_pool.pool_available, 0) <= 0 THEN 'commission_pool_not_positive' ELSE NULL END,
    CASE WHEN COALESCE(v_pool.rejection_reasons, '[]'::jsonb) <> '[]'::jsonb THEN v_pool.rejection_reasons::text ELSE NULL END,
    jsonb_build_object(
      'step', 'Commission Pool calcule',
      'direct_pool_amount', COALESCE(v_pool.direct_pool_amount, 0),
      'indirect_pool_amount', COALESCE(v_pool.indirect_pool_amount, 0),
      'campaign_reserve_amount', COALESCE(v_pool.campaign_reserve_amount, 0),
      'quality_reserve_amount', COALESCE(v_pool.quality_reserve_amount, 0)
    ),
    jsonb_build_object('pool_rules_version', COALESCE(v_pool.rules_version, 'p0_commission_pool_v1')),
    jsonb_build_object('warnings', COALESCE(v_pool.warnings, '[]'::jsonb), 'rejection_reasons', COALESCE(v_pool.rejection_reasons, '[]'::jsonb)),
    'commission_pool_snapshots', v_pool.id
  );

  v_sequence := v_sequence + 1;
  INSERT INTO public.business_flight_recorder_events (
    replay_run_id, event_type, event_sequence, order_id, order_number, user_id,
    advisor_user_id, attribution_user_id, decision, final_decision, explanation,
    input_data, output_data, source_table, source_id
  ) VALUES (
    v_replay_id, 'attribution_determined', v_sequence, v_order.id, v_order.order_number, v_order.user_id,
    v_attr.attributed_user_id,
    v_attr.attributed_user_id,
    COALESCE(v_attr.decision, 'unattributed'),
    v_final_decision,
    jsonb_build_object('step', 'Attribution determinee', 'source', COALESCE(v_attr.attribution_source, 'none')),
    jsonb_build_object('order_referrer_id', v_order.referrer_id),
    jsonb_build_object('confidence', COALESCE(v_attr.confidence, 0), 'rejection_reasons', COALESCE(v_attr.rejection_reasons, '[]'::jsonb), 'explanation', COALESCE(v_attr.explanation, '{}'::jsonb)),
    'order_attributions', v_attr.id
  );

  v_sequence := v_sequence + 1;
  INSERT INTO public.business_flight_recorder_events (
    replay_run_id, event_type, event_sequence, order_id, order_number, user_id,
    fraud_risk_level, trust_score, business_score, decision, final_decision, explanation, input_data, output_data
  ) VALUES (
    v_replay_id, 'fraud_checked', v_sequence, v_order.id, v_order.order_number, v_order.user_id,
    COALESCE(v_fraud.severity::text, 'low'),
    COALESCE(v_customer_trust, v_advisor_trust),
    v_business_score,
    CASE WHEN COALESCE(v_fraud.severity::text, 'low') IN ('high', 'critical') THEN 'risk_detected' ELSE 'risk_acceptable' END,
    v_final_decision,
    jsonb_build_object('step', 'Fraude verifiee', 'risk_level', COALESCE(v_fraud.severity::text, 'low')),
    jsonb_build_object('signals', COALESCE(v_fraud.signals, '[]'::jsonb)),
    jsonb_build_object('risk_accepted_for_observation', true)
  );

  v_sequence := v_sequence + 1;
  INSERT INTO public.business_flight_recorder_events (
    replay_run_id, event_type, event_sequence, order_id, order_number, user_id,
    decision, final_decision, margin_amount, product_cost_total, commission_pool_amount,
    trust_score, business_score,
    block_reason, refusal_reason, explanation, input_data, output_data,
    source_table, source_id
  ) VALUES (
    v_replay_id, 'ai_governance_decision', v_sequence, v_order.id, v_order.order_number, v_order.user_id,
    v_final_decision,
    v_final_decision,
    COALESCE(v_revenue.contribution_margin, 0),
    COALESCE(v_revenue.product_cost_total, 0),
    COALESCE(v_pool.pool_available, 0),
    COALESCE(v_customer_trust, v_advisor_trust),
    v_business_score,
    CASE WHEN COALESCE(v_revenue.is_commissionable, false) THEN NULL ELSE COALESCE(v_revenue.rejection_reasons::text, 'blocked') END,
    CASE WHEN COALESCE(v_revenue.is_commissionable, false) THEN NULL ELSE COALESCE(v_revenue.rejection_reasons::text, 'blocked') END,
    jsonb_build_object(
      'step', 'Decision AI Governance',
      'decision', v_final_decision,
      'confidence', COALESCE(v_revenue.confidence, 1),
      'commissionable', COALESCE(v_revenue.is_commissionable, false)
    ),
    jsonb_build_object('warnings', COALESCE(v_revenue.warnings, '[]'::jsonb), 'rejection_reasons', COALESCE(v_revenue.rejection_reasons, '[]'::jsonb)),
    jsonb_build_object('final_decision', v_final_decision),
    'revenue_engine_snapshots', v_revenue.id
  );

  SELECT count(*) INTO v_event_count
  FROM public.business_flight_recorder_events
  WHERE replay_run_id = v_replay_id;

  INSERT INTO public.business_flight_replay_runs (
    id, requested_by, order_id, order_number, engine_version, business_rules_version,
    event_count, final_decision, summary
  ) VALUES (
    v_replay_id, auth.uid(), v_order.id, v_order.order_number,
    COALESCE(v_revenue.rules_version, 'p0_revenue_engine_v1'),
    'p0_business_rules_v1',
    v_event_count,
    v_final_decision,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'payment_status', v_order.payment_status,
      'status', v_order.status,
      'product_cost_total', COALESCE(v_revenue.product_cost_total, 0),
      'contribution_margin', COALESCE(v_revenue.contribution_margin, 0),
      'commission_pool', COALESCE(v_pool.pool_available, 0),
      'attribution_user_id', v_attr.attributed_user_id,
      'fraud_risk_level', COALESCE(v_fraud.severity::text, 'low'),
      'final_decision', v_final_decision
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'replay_run_id', v_replay_id,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'event_count', v_event_count,
    'final_decision', v_final_decision
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_compare_business_engine_versions(
  _left_engine_version text,
  _right_engine_version text,
  _limit integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders_compared integer := 0;
  v_different integer := 0;
  v_margin_impact numeric := 0;
  v_pool_impact numeric := 0;
  v_orders jsonb := '[]'::jsonb;
  v_comparison_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  WITH left_events AS (
    SELECT DISTINCT ON (order_id)
      order_id, order_number, final_decision, margin_amount, commission_pool_amount, business_rules_version
    FROM public.business_flight_recorder_events
    WHERE engine_version = _left_engine_version
      AND event_type = 'ai_governance_decision'
      AND order_id IS NOT NULL
    ORDER BY order_id, event_time DESC
  ),
  right_events AS (
    SELECT DISTINCT ON (order_id)
      order_id, order_number, final_decision, margin_amount, commission_pool_amount, business_rules_version
    FROM public.business_flight_recorder_events
    WHERE engine_version = _right_engine_version
      AND event_type = 'ai_governance_decision'
      AND order_id IS NOT NULL
    ORDER BY order_id, event_time DESC
  ),
  compared AS (
    SELECT
      COALESCE(l.order_id, r.order_id) AS order_id,
      COALESCE(l.order_number, r.order_number) AS order_number,
      l.final_decision AS left_decision,
      r.final_decision AS right_decision,
      COALESCE(r.margin_amount, 0) - COALESCE(l.margin_amount, 0) AS margin_impact,
      COALESCE(r.commission_pool_amount, 0) - COALESCE(l.commission_pool_amount, 0) AS pool_impact,
      l.business_rules_version AS left_rules,
      r.business_rules_version AS right_rules
    FROM left_events l
    FULL JOIN right_events r ON r.order_id = l.order_id
    LIMIT GREATEST(COALESCE(_limit, 500), 1)
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE left_decision IS DISTINCT FROM right_decision),
    COALESCE(sum(margin_impact), 0),
    COALESCE(sum(pool_impact), 0),
    COALESCE(jsonb_agg(jsonb_build_object(
      'order_id', order_id,
      'order_number', order_number,
      'left_decision', left_decision,
      'right_decision', right_decision,
      'margin_impact', margin_impact,
      'commission_pool_impact', pool_impact,
      'left_rules', left_rules,
      'right_rules', right_rules
    )) FILTER (WHERE left_decision IS DISTINCT FROM right_decision), '[]'::jsonb)
  INTO v_orders_compared, v_different, v_margin_impact, v_pool_impact, v_orders
  FROM compared;

  INSERT INTO public.business_engine_version_comparisons (
    requested_by, left_engine_version, right_engine_version,
    orders_compared, different_decision_count, margin_impact_total,
    commission_pool_impact_total, differently_treated_orders, rule_changes, summary
  ) VALUES (
    auth.uid(), _left_engine_version, _right_engine_version,
    v_orders_compared, v_different, v_margin_impact, v_pool_impact, v_orders,
    jsonb_build_object(
      'left_engine_version', _left_engine_version,
      'right_engine_version', _right_engine_version,
      'note', 'Comparison uses recorded Business Flight Recorder events. It does not mutate production state.'
    ),
    jsonb_build_object(
      'orders_compared', v_orders_compared,
      'different_decision_count', v_different,
      'margin_impact_total', v_margin_impact,
      'commission_pool_impact_total', v_pool_impact
    )
  )
  RETURNING id INTO v_comparison_id;

  RETURN jsonb_build_object(
    'success', true,
    'comparison_id', v_comparison_id,
    'orders_compared', v_orders_compared,
    'different_decision_count', v_different,
    'margin_impact_total', v_margin_impact,
    'commission_pool_impact_total', v_pool_impact,
    'differently_treated_orders', v_orders
  );
END;
$$;

CREATE OR REPLACE VIEW public.admin_business_flight_recorder_events AS
SELECT
  e.id,
  e.replay_run_id,
  e.event_time,
  e.engine_name,
  e.engine_version,
  e.business_rules_version,
  e.event_type,
  e.event_sequence,
  e.order_id,
  e.order_number,
  e.user_id,
  e.vendor_id,
  e.advisor_user_id,
  e.decision,
  e.final_decision,
  e.margin_amount,
  e.product_cost_total,
  e.commission_pool_amount,
  e.attribution_user_id,
  e.fraud_risk_level,
  e.trust_score,
  e.business_score,
  e.block_reason,
  e.commission_reduction_reason,
  e.refusal_reason,
  e.explanation,
  e.input_data,
  e.output_data
FROM public.business_flight_recorder_events e
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

CREATE OR REPLACE VIEW public.admin_business_flight_replay_runs AS
SELECT
  r.id,
  r.requested_at,
  r.completed_at,
  r.order_id,
  r.order_number,
  r.engine_version,
  r.business_rules_version,
  r.event_count,
  r.final_decision,
  r.summary
FROM public.business_flight_replay_runs r
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

CREATE OR REPLACE VIEW public.admin_business_engine_version_comparisons AS
SELECT
  c.id,
  c.requested_at,
  c.left_engine_version,
  c.right_engine_version,
  c.orders_compared,
  c.different_decision_count,
  c.margin_impact_total,
  c.commission_pool_impact_total,
  c.differently_treated_orders,
  c.rule_changes,
  c.summary
FROM public.business_engine_version_comparisons c
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

ALTER TABLE public.business_flight_recorder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_flight_replay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_engine_version_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read business flight recorder events" ON public.business_flight_recorder_events;
CREATE POLICY "Admins read business flight recorder events"
ON public.business_flight_recorder_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read business flight replay runs" ON public.business_flight_replay_runs;
CREATE POLICY "Admins read business flight replay runs"
ON public.business_flight_replay_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read business engine version comparisons" ON public.business_engine_version_comparisons;
CREATE POLICY "Admins read business engine version comparisons"
ON public.business_engine_version_comparisons FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.business_flight_recorder_events FROM PUBLIC, anon;
REVOKE ALL ON public.business_flight_replay_runs FROM PUBLIC, anon;
REVOKE ALL ON public.business_engine_version_comparisons FROM PUBLIC, anon;

GRANT SELECT ON public.business_flight_recorder_events TO authenticated, service_role;
GRANT SELECT ON public.business_flight_replay_runs TO authenticated, service_role;
GRANT SELECT ON public.business_engine_version_comparisons TO authenticated, service_role;
GRANT SELECT ON public.admin_business_flight_recorder_events TO authenticated, service_role;
GRANT SELECT ON public.admin_business_flight_replay_runs TO authenticated, service_role;
GRANT SELECT ON public.admin_business_engine_version_comparisons TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_replay_business_flight_order(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_compare_business_engine_versions(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_replay_business_flight_order(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_compare_business_engine_versions(text, text, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
