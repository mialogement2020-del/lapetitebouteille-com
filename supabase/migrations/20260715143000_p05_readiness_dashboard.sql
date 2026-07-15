-- P0.5 Readiness dashboard.
-- Adds explanatory readiness/go-live reporting and immutable activation audit.
-- Additive/reporting only: no wallet, commission, order, product, or ledger mutation.

CREATE TABLE IF NOT EXISTS public.p05_activation_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  requested_mode text NOT NULL CHECK (requested_mode IN ('partial', 'full')),
  decision text NOT NULL CHECK (decision IN ('partial_activation_authorized', 'full_activation_authorized', 'rejected')),
  engine_version text NOT NULL DEFAULT 'p0_revenue_engine_v1',
  simulation_run_id uuid REFERENCES public.p05_simulation_runs(id) ON DELETE RESTRICT,
  orders_analyzed integer NOT NULL DEFAULT 0,
  simulation_confidence_score numeric(8,4) NOT NULL DEFAULT 0,
  simulation_accuracy numeric(8,4) NOT NULL DEFAULT 0,
  go_live_score numeric(8,4) NOT NULL DEFAULT 0,
  comment text NOT NULL,
  confirmation_text text NOT NULL,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION public.prevent_p05_activation_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'p05_activation_audit_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_p05_activation_audit_immutable ON public.p05_activation_audit_logs;
CREATE TRIGGER trg_p05_activation_audit_immutable
BEFORE UPDATE OR DELETE ON public.p05_activation_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_p05_activation_audit_mutation();

CREATE OR REPLACE VIEW public.admin_p05_readiness_dashboard AS
WITH latest AS (
  SELECT r.*
  FROM public.p05_simulation_runs r
  ORDER BY r.requested_at DESC
  LIMIT 1
),
inventory AS (
  SELECT
    count(*) FILTER (WHERE is_active = true) AS active_products,
    count(*) FILTER (
      WHERE is_active = true
        AND COALESCE(purchase_price, 0) <= 0
    ) AS active_products_missing_purchase_cost
  FROM public.products
),
orders_state AS (
  SELECT
    count(*) AS total_orders,
    count(*) FILTER (WHERE payment_status IS DISTINCT FROM 'completed') AS orders_not_paid,
    count(*) FILTER (WHERE payment_status = 'completed') AS completed_payment_orders,
    count(*) FILTER (WHERE status::text IN ('cancelled', 'refunded')) AS cancelled_or_refunded_orders
  FROM public.orders
),
latest_results AS (
  SELECT
    COALESCE(count(*), 0) AS orders_simulated,
    COALESCE(count(*) FILTER (WHERE compatible), 0) AS compatible_orders,
    COALESCE(count(*) FILTER (WHERE NOT compatible), 0) AS different_orders,
    COALESCE(sum(anomaly_count), 0) AS anomalies_detected,
    COALESCE(count(*) FILTER (WHERE differences ? 'missing_purchase_cost'), 0) AS missing_cost_order_count,
    COALESCE(count(*) FILTER (WHERE payment_status IS DISTINCT FROM 'completed'), 0) AS pending_payment_simulated_count,
    COALESCE(count(*) FILTER (WHERE differences ? 'commission_difference'), 0) AS commission_difference_count,
    COALESCE(count(*) FILTER (WHERE differences ? 'margin_difference'), 0) AS margin_difference_count,
    COALESCE(count(*) FILTER (WHERE differences ? 'attribution_difference'), 0) AS attribution_difference_count
  FROM public.p05_simulation_order_results r
  WHERE r.run_id = (SELECT id FROM latest)
),
scores AS (
  SELECT
    l.id AS latest_run_id,
    COALESCE(l.simulation_confidence_score, 0) AS simulation_confidence_score,
    COALESCE(l.simulation_accuracy, 0) AS simulation_accuracy,
    COALESCE(l.orders_analyzed, 0) AS orders_analyzed,
    COALESCE(l.compatible_orders, 0) AS compatible_orders,
    COALESCE(l.different_orders, 0) AS different_orders,
    COALESCE(l.anomalies_detected, 0) AS run_anomalies_detected,
    COALESCE(i.active_products, 0) AS active_products,
    COALESCE(i.active_products_missing_purchase_cost, 0) AS active_products_missing_purchase_cost,
    COALESCE(o.total_orders, 0) AS total_orders,
    COALESCE(o.orders_not_paid, 0) AS orders_not_paid,
    COALESCE(o.completed_payment_orders, 0) AS completed_payment_orders,
    COALESCE(o.cancelled_or_refunded_orders, 0) AS cancelled_or_refunded_orders,
    COALESCE(lr.orders_simulated, 0) AS orders_simulated,
    COALESCE(lr.anomalies_detected, 0) AS anomalies_detected,
    COALESCE(lr.missing_cost_order_count, 0) AS missing_cost_order_count,
    COALESCE(lr.pending_payment_simulated_count, 0) AS pending_payment_simulated_count,
    COALESCE(lr.commission_difference_count, 0) AS commission_difference_count,
    COALESCE(lr.margin_difference_count, 0) AS margin_difference_count,
    COALESCE(lr.attribution_difference_count, 0) AS attribution_difference_count,
    CASE
      WHEN COALESCE(i.active_products, 0) = 0 THEN 0
      ELSE round(((COALESCE(i.active_products, 0) - COALESCE(i.active_products_missing_purchase_cost, 0))::numeric / COALESCE(i.active_products, 1)::numeric) * 100, 4)
    END AS purchase_costs_score,
    CASE
      WHEN COALESCE(l.orders_analyzed, 0) >= 300
        AND COALESCE(l.simulation_confidence_score, 0) >= 99.5
        AND COALESCE(l.anomalies_detected, 0) = 0
      THEN 100
      WHEN COALESCE(l.orders_analyzed, 0) = 0 THEN 0
      ELSE LEAST(95, round((COALESCE(l.simulation_confidence_score, 0) * 0.7) + (LEAST(COALESCE(l.orders_analyzed, 0), 300)::numeric / 300::numeric * 30), 4))
    END AS simulation_engine_score
  FROM latest l
  CROSS JOIN inventory i
  CROSS JOIN orders_state o
  CROSS JOIN latest_results lr
)
SELECT
  s.latest_run_id,
  s.simulation_confidence_score,
  s.simulation_accuracy,
  s.orders_analyzed,
  s.compatible_orders,
  s.different_orders,
  s.anomalies_detected,
  s.active_products_missing_purchase_cost,
  s.orders_not_paid,
  s.pending_payment_simulated_count,
  s.missing_cost_order_count,
  s.commission_difference_count,
  s.margin_difference_count,
  s.attribution_difference_count,
  jsonb_build_object(
    'Finance', CASE WHEN s.active_products_missing_purchase_cost = 0 THEN 100 ELSE LEAST(100, round(s.simulation_confidence_score * 0.6 + s.purchase_costs_score * 0.4, 4)) END,
    'Marketplace', 100,
    'Wallet', 100,
    'Attribution Engine', CASE WHEN s.attribution_difference_count = 0 THEN 100 ELSE GREATEST(0, 100 - LEAST(100, s.attribution_difference_count * 5)) END,
    'Fraud Detection', CASE WHEN s.anomalies_detected = 0 THEN 100 ELSE GREATEST(0, 100 - LEAST(100, s.anomalies_detected * 2)) END,
    'Commission Engine', CASE WHEN s.commission_difference_count = 0 AND s.active_products_missing_purchase_cost = 0 THEN 100 ELSE GREATEST(0, round(s.simulation_confidence_score - LEAST(80, s.commission_difference_count * 5), 4)) END,
    'Purchase Costs', s.purchase_costs_score,
    'Simulation Engine', s.simulation_engine_score
  ) AS p0_readiness_components,
  round((
    (CASE WHEN s.active_products_missing_purchase_cost = 0 THEN 100 ELSE LEAST(100, s.simulation_confidence_score * 0.6 + s.purchase_costs_score * 0.4) END) * 0.22
    + 100 * 0.08
    + 100 * 0.08
    + (CASE WHEN s.attribution_difference_count = 0 THEN 100 ELSE GREATEST(0, 100 - LEAST(100, s.attribution_difference_count * 5)) END) * 0.12
    + (CASE WHEN s.anomalies_detected = 0 THEN 100 ELSE GREATEST(0, 100 - LEAST(100, s.anomalies_detected * 2)) END) * 0.12
    + (CASE WHEN s.commission_difference_count = 0 AND s.active_products_missing_purchase_cost = 0 THEN 100 ELSE GREATEST(0, s.simulation_confidence_score - LEAST(80, s.commission_difference_count * 5)) END) * 0.15
    + s.purchase_costs_score * 0.15
    + s.simulation_engine_score * 0.08
  ), 4) AS p0_readiness_score,
  round(LEAST(100,
    s.simulation_confidence_score * 0.35
    + s.purchase_costs_score * 0.30
    + s.simulation_engine_score * 0.20
    + (CASE WHEN s.anomalies_detected = 0 THEN 100 ELSE GREATEST(0, 100 - LEAST(100, s.anomalies_detected * 3)) END) * 0.15
  ), 4) AS go_live_score,
  (
    s.orders_analyzed >= 300
    AND s.simulation_confidence_score >= 99.5
    AND s.active_products_missing_purchase_cost = 0
    AND s.pending_payment_simulated_count = 0
    AND s.anomalies_detected = 0
  ) AS ready_for_production,
  jsonb_strip_nulls(jsonb_build_object(
    'produits_sans_prix_achat', NULLIF(s.active_products_missing_purchase_cost, 0),
    'commandes_pending', NULLIF(s.pending_payment_simulated_count, 0),
    'marge_reelle_incomplete', CASE WHEN s.active_products_missing_purchase_cost > 0 OR s.missing_cost_order_count > 0 THEN true ELSE NULL END,
    'commission_pool_bloque', CASE WHEN s.commission_difference_count > 0 OR s.simulation_confidence_score < 99.5 THEN true ELSE NULL END,
    'marge_minimale_non_verifiable', CASE WHEN s.active_products_missing_purchase_cost > 0 THEN true ELSE NULL END,
    'anomalies_detectees', NULLIF(s.anomalies_detected, 0),
    'activation_production_interdite', CASE WHEN NOT (
      s.orders_analyzed >= 300
      AND s.simulation_confidence_score >= 99.5
      AND s.active_products_missing_purchase_cost = 0
      AND s.pending_payment_simulated_count = 0
      AND s.anomalies_detected = 0
    ) THEN true ELSE NULL END
  )) AS confidence_explanations,
  jsonb_strip_nulls(jsonb_build_object(
    'produits_sans_prix_achat', NULLIF(s.active_products_missing_purchase_cost, 0),
    'commandes_pending', NULLIF(s.pending_payment_simulated_count, 0),
    'anomalies_critiques', NULLIF(s.anomalies_detected, 0),
    'simulation_confidence_sous_seuil', CASE WHEN s.simulation_confidence_score < 99.5 THEN s.simulation_confidence_score ELSE NULL END,
    'marge_reelle_incomplete', CASE WHEN s.active_products_missing_purchase_cost > 0 OR s.missing_cost_order_count > 0 THEN true ELSE NULL END
  )) AS production_blockers,
  jsonb_build_array(
    jsonb_build_object(
      'step', 'Completer les prix achat',
      'count', s.active_products_missing_purchase_cost,
      'impact', 'Critique',
      'done', s.active_products_missing_purchase_cost = 0
    ),
    jsonb_build_object(
      'step', 'Tester au moins 300 commandes historiques ou payees',
      'count', GREATEST(300 - s.orders_analyzed, 0),
      'impact', 'Tres eleve',
      'done', s.orders_analyzed >= 300
    ),
    jsonb_build_object(
      'step', 'Tester remboursements et annulations',
      'count', s.cancelled_or_refunded_orders,
      'impact', 'Eleve',
      'done', s.cancelled_or_refunded_orders > 0
    ),
    jsonb_build_object(
      'step', 'Obtenir Simulation Confidence Score superieur a 99.5%',
      'count', s.simulation_confidence_score,
      'impact', 'Critique',
      'done', s.simulation_confidence_score >= 99.5
    ),
    jsonb_build_object(
      'step', 'Obtenir zero anomalie critique',
      'count', s.anomalies_detected,
      'impact', 'Critique',
      'done', s.anomalies_detected = 0
    )
  ) AS action_plan,
  'Activation automatique interdite. Seul un Super Admin peut autoriser une transition volontaire apres validation.' AS activation_rule
FROM scores s
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

CREATE OR REPLACE FUNCTION public.authorize_p05_activation_gate(
  _simulation_run_id uuid,
  _requested_mode text,
  _justification text,
  _confirm_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.p05_simulation_runs%ROWTYPE;
  v_readiness record;
  v_required_score numeric := 99.5;
  v_decision text := 'rejected';
  v_control_id uuid;
  v_audit_id uuid;
BEGIN
  IF NOT public.is_super_admin_for_p0() THEN
    RAISE EXCEPTION 'super_admin_full_access_required';
  END IF;

  SELECT * INTO v_run
  FROM public.p05_simulation_runs
  WHERE id = _simulation_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'simulation_run_not_found';
  END IF;

  IF _requested_mode NOT IN ('partial', 'full') THEN
    RAISE EXCEPTION 'invalid_activation_mode';
  END IF;

  IF _requested_mode = 'full' THEN
    v_required_score := 100;
  END IF;

  IF _confirm_text <> 'JE CONFIRME QUE LES COMMISSIONS DEVIENDRONT EXECUTOIRES SOUS CONTROLE SUPER ADMIN' THEN
    RAISE EXCEPTION 'invalid_confirmation_text';
  END IF;

  SELECT * INTO v_readiness
  FROM public.admin_p05_readiness_dashboard
  WHERE latest_run_id = _simulation_run_id;

  IF v_run.orders_analyzed < 300 THEN
    RAISE EXCEPTION 'not_enough_simulated_orders';
  END IF;

  IF v_run.simulation_confidence_score < v_required_score THEN
    RAISE EXCEPTION 'simulation_confidence_too_low';
  END IF;

  IF COALESCE(v_readiness.go_live_score, 0) < v_required_score THEN
    RAISE EXCEPTION 'go_live_score_too_low';
  END IF;

  IF v_run.anomalies_detected > 0 AND _requested_mode = 'full' THEN
    RAISE EXCEPTION 'full_activation_requires_zero_anomalies';
  END IF;

  v_decision := CASE
    WHEN _requested_mode = 'partial' THEN 'partial_activation_authorized'
    ELSE 'full_activation_authorized'
  END;

  INSERT INTO public.p05_engine_activation_controls (
    requested_by, decision, requested_mode, simulation_run_id,
    simulation_confidence_score, simulation_accuracy, orders_analyzed,
    justification, confirm_text, is_financial_execution_enabled, metadata
  ) VALUES (
    auth.uid(), v_decision, _requested_mode, _simulation_run_id,
    v_run.simulation_confidence_score, v_run.simulation_accuracy, v_run.orders_analyzed,
    _justification, _confirm_text, false,
    jsonb_build_object(
      'note', 'authorization gate only; real commission execution remains disabled until a separate production migration connects it',
      'minimum_required_score', v_required_score,
      'go_live_score', COALESCE(v_readiness.go_live_score, 0),
      'ready_for_production', COALESCE(v_readiness.ready_for_production, false),
      'automatic_activation_allowed', false
    )
  )
  RETURNING id INTO v_control_id;

  INSERT INTO public.p05_activation_audit_logs (
    requested_by, requested_mode, decision, engine_version, simulation_run_id,
    orders_analyzed, simulation_confidence_score, simulation_accuracy, go_live_score,
    comment, confirmation_text, warnings, metadata
  ) VALUES (
    auth.uid(), _requested_mode, v_decision, 'p0_revenue_engine_v1', _simulation_run_id,
    v_run.orders_analyzed, v_run.simulation_confidence_score, v_run.simulation_accuracy,
    COALESCE(v_readiness.go_live_score, 0),
    _justification, _confirm_text,
    jsonb_build_array(
      'financial_execution_not_enabled_by_this_function',
      'production_transition_requires_separate_reviewed_release'
    ),
    jsonb_build_object(
      'control_id', v_control_id,
      'p0_readiness_score', COALESCE(v_readiness.p0_readiness_score, 0),
      'production_blockers', COALESCE(v_readiness.production_blockers, '{}'::jsonb)
    )
  )
  RETURNING id INTO v_audit_id;

  INSERT INTO public.governance_decision_logs (
    engine_name, decision_type, decision, user_id, confidence,
    data_used, rules_applied, estimated_impacts, alternatives
  ) VALUES (
    'AI Governance Engine',
    'p05_activation_gate',
    v_decision,
    auth.uid(),
    1,
    jsonb_build_object(
      'simulation_run_id', _simulation_run_id,
      'simulation_confidence_score', v_run.simulation_confidence_score,
      'simulation_accuracy', v_run.simulation_accuracy,
      'orders_analyzed', v_run.orders_analyzed,
      'go_live_score', COALESCE(v_readiness.go_live_score, 0),
      'audit_id', v_audit_id
    ),
    jsonb_build_object(
      'super_admin_required', true,
      'minimum_orders', 300,
      'minimum_score', v_required_score,
      'automatic_activation_allowed', false
    ),
    jsonb_build_object(
      'financial_execution_enabled', false,
      'next_step', 'separate reviewed production migration'
    ),
    jsonb_build_array('keep_observation', 'partial_activation_with_limits', 'full_activation_after_zero_anomaly_run')
  );

  RETURN jsonb_build_object(
    'success', true,
    'control_id', v_control_id,
    'audit_id', v_audit_id,
    'decision', v_decision,
    'financial_execution_enabled', false
  );
END;
$$;

ALTER TABLE public.p05_activation_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read p05 activation audit logs" ON public.p05_activation_audit_logs;
CREATE POLICY "Admins read p05 activation audit logs"
ON public.p05_activation_audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.p05_activation_audit_logs FROM PUBLIC, anon;
GRANT SELECT ON public.p05_activation_audit_logs TO authenticated, service_role;
GRANT SELECT ON public.admin_p05_readiness_dashboard TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
