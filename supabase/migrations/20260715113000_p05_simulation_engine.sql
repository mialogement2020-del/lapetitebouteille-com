-- P0.5 Simulation Engine.
-- Compares current production financial behavior with the P0 observation engine.
-- Additive only: no wallet, commission, order, product, or ledger mutation.

CREATE TABLE IF NOT EXISTS public.p05_simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT 'historical_replay' CHECK (mode IN ('single_order', 'historical_replay')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  requested_by uuid DEFAULT auth.uid(),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  orders_requested integer NOT NULL DEFAULT 0,
  orders_analyzed integer NOT NULL DEFAULT 0,
  compatible_orders integer NOT NULL DEFAULT 0,
  different_orders integer NOT NULL DEFAULT 0,
  margin_difference_total numeric(14,2) NOT NULL DEFAULT 0,
  commission_difference_total numeric(14,2) NOT NULL DEFAULT 0,
  commission_saved_total numeric(14,2) NOT NULL DEFAULT 0,
  commission_extra_total numeric(14,2) NOT NULL DEFAULT 0,
  simulated_platform_profit_total numeric(14,2) NOT NULL DEFAULT 0,
  production_platform_profit_total numeric(14,2) NOT NULL DEFAULT 0,
  anomalies_detected integer NOT NULL DEFAULT 0,
  simulation_accuracy numeric(8,4) NOT NULL DEFAULT 0,
  simulation_confidence_score numeric(8,4) NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);

CREATE INDEX IF NOT EXISTS idx_p05_simulation_runs_requested
  ON public.p05_simulation_runs(requested_at DESC);

CREATE TABLE IF NOT EXISTS public.p05_simulation_order_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.p05_simulation_runs(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  order_status text,
  payment_status text,
  production_revenue numeric(14,2) NOT NULL DEFAULT 0,
  p0_revenue numeric(14,2) NOT NULL DEFAULT 0,
  production_margin numeric(14,2) NOT NULL DEFAULT 0,
  p0_contribution_margin numeric(14,2) NOT NULL DEFAULT 0,
  margin_difference numeric(14,2) NOT NULL DEFAULT 0,
  production_commission numeric(14,2) NOT NULL DEFAULT 0,
  p0_commission_pool numeric(14,2) NOT NULL DEFAULT 0,
  theoretical_advisor_gains numeric(14,2) NOT NULL DEFAULT 0,
  theoretical_marketplace_gains numeric(14,2) NOT NULL DEFAULT 0,
  theoretical_platform_profit numeric(14,2) NOT NULL DEFAULT 0,
  production_platform_profit numeric(14,2) NOT NULL DEFAULT 0,
  commission_difference numeric(14,2) NOT NULL DEFAULT 0,
  production_attribution_user_id uuid,
  p0_attribution_user_id uuid,
  production_attribution_source text,
  p0_attribution_source text,
  attribution_difference boolean NOT NULL DEFAULT false,
  governance_decision text NOT NULL DEFAULT 'unknown',
  compatible boolean NOT NULL DEFAULT false,
  anomaly_count integer NOT NULL DEFAULT 0,
  differences jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_p05_simulation_order_results_run
  ON public.p05_simulation_order_results(run_id, compatible, anomaly_count DESC);
CREATE INDEX IF NOT EXISTS idx_p05_simulation_order_results_order
  ON public.p05_simulation_order_results(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.p05_engine_activation_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL CHECK (decision IN ('partial_activation_authorized', 'full_activation_authorized', 'rejected')),
  requested_mode text NOT NULL CHECK (requested_mode IN ('partial', 'full')),
  simulation_run_id uuid REFERENCES public.p05_simulation_runs(id) ON DELETE RESTRICT,
  simulation_confidence_score numeric(8,4) NOT NULL DEFAULT 0,
  simulation_accuracy numeric(8,4) NOT NULL DEFAULT 0,
  orders_analyzed integer NOT NULL DEFAULT 0,
  justification text NOT NULL,
  confirm_text text NOT NULL,
  is_financial_execution_enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION public.is_super_admin_for_p0()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid()
        AND ap.permission = 'full_access'
    );
$$;

CREATE OR REPLACE FUNCTION public.prevent_p05_simulation_result_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'p05_simulation_results_are_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_p05_simulation_order_results_immutable ON public.p05_simulation_order_results;
CREATE TRIGGER trg_p05_simulation_order_results_immutable
BEFORE UPDATE OR DELETE ON public.p05_simulation_order_results
FOR EACH ROW EXECUTE FUNCTION public.prevent_p05_simulation_result_mutation();

CREATE OR REPLACE FUNCTION public.simulate_p05_order(_run_id uuid, _order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_accounting public.order_accounting_snapshots%ROWTYPE;
  v_revenue public.revenue_engine_snapshots%ROWTYPE;
  v_pool public.commission_pool_snapshots%ROWTYPE;
  v_attr public.order_attributions%ROWTYPE;
  v_actual_commission numeric := 0;
  v_production_margin numeric := 0;
  v_production_profit numeric := 0;
  v_theoretical_platform_profit numeric := 0;
  v_theoretical_advisor numeric := 0;
  v_theoretical_marketplace numeric := 0;
  v_margin_diff numeric := 0;
  v_commission_diff numeric := 0;
  v_attr_diff boolean := false;
  v_differences jsonb := '[]'::jsonb;
  v_anomalies integer := 0;
  v_compatible boolean := false;
  v_governance_decision text := 'unknown';
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  SELECT * INTO v_accounting
  FROM public.order_accounting_snapshots
  WHERE order_id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'accounting_snapshot_missing';
  END IF;

  PERFORM public.calculate_p0_revenue_observation(_order_id);

  SELECT * INTO v_revenue
  FROM public.revenue_engine_snapshots
  WHERE order_id = _order_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_pool
  FROM public.commission_pool_snapshots
  WHERE order_id = _order_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_attr
  FROM public.order_attributions
  WHERE order_id = _order_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT COALESCE(sum(c.commission_amount), 0)
    INTO v_actual_commission
  FROM public.commissions c
  WHERE c.order_id = _order_id
    AND c.status IN ('pending', 'completed');

  v_production_margin := round(COALESCE(v_accounting.estimated_net_margin, v_accounting.gross_margin, 0), 0);
  v_production_profit := round(GREATEST(v_production_margin - v_actual_commission, 0), 0);
  v_theoretical_advisor := round(COALESCE(v_pool.direct_pool_amount, 0), 0);
  v_theoretical_marketplace := round(COALESCE(v_accounting.vendor_commission_amount, 0), 0);
  v_theoretical_platform_profit := round(GREATEST(COALESCE(v_revenue.contribution_margin, 0) - COALESCE(v_pool.pool_available, 0), 0), 0);
  v_margin_diff := round(COALESCE(v_revenue.contribution_margin, 0) - v_production_margin, 0);
  v_commission_diff := round(COALESCE(v_pool.pool_available, 0) - v_actual_commission, 0);
  v_attr_diff := COALESCE(v_order.referrer_id::text, '') <> COALESCE(v_attr.attributed_user_id::text, '');
  v_governance_decision := COALESCE(v_revenue.decision, 'unknown');

  IF abs(v_margin_diff) > 1 THEN
    v_differences := v_differences || jsonb_build_array('margin_difference');
    v_anomalies := v_anomalies + 1;
  END IF;
  IF abs(v_commission_diff) > 1 THEN
    v_differences := v_differences || jsonb_build_array('commission_difference');
  END IF;
  IF v_attr_diff THEN
    v_differences := v_differences || jsonb_build_array('attribution_difference');
    v_anomalies := v_anomalies + 1;
  END IF;
  IF NOT COALESCE(v_revenue.is_commissionable, false)
     AND v_actual_commission > 0 THEN
    v_differences := v_differences || jsonb_build_array('production_paid_commission_p0_would_block');
    v_anomalies := v_anomalies + 1;
  END IF;
  IF COALESCE(v_revenue.missing_cost_count, 0) > 0 THEN
    v_differences := v_differences || jsonb_build_array('missing_purchase_cost');
    v_anomalies := v_anomalies + 1;
  END IF;

  v_compatible := jsonb_array_length(v_differences) = 0;

  INSERT INTO public.p05_simulation_order_results (
    run_id, order_id, order_number, order_status, payment_status,
    production_revenue, p0_revenue, production_margin, p0_contribution_margin,
    margin_difference, production_commission, p0_commission_pool,
    theoretical_advisor_gains, theoretical_marketplace_gains,
    theoretical_platform_profit, production_platform_profit, commission_difference,
    production_attribution_user_id, p0_attribution_user_id,
    production_attribution_source, p0_attribution_source,
    attribution_difference, governance_decision, compatible,
    anomaly_count, differences, explanation
  ) VALUES (
    _run_id, _order_id, v_order.order_number, v_order.status::text, v_order.payment_status,
    COALESCE(v_accounting.amount_including_tax, v_order.total, 0),
    COALESCE(v_revenue.revenue_amount, 0),
    v_production_margin,
    COALESCE(v_revenue.contribution_margin, 0),
    v_margin_diff,
    v_actual_commission,
    COALESCE(v_pool.pool_available, 0),
    v_theoretical_advisor,
    v_theoretical_marketplace,
    v_theoretical_platform_profit,
    v_production_profit,
    v_commission_diff,
    v_order.referrer_id,
    v_attr.attributed_user_id,
    CASE WHEN v_order.referrer_id IS NOT NULL THEN 'current_order_referrer' ELSE 'none' END,
    COALESCE(v_attr.attribution_source, 'none'),
    v_attr_diff,
    v_governance_decision,
    v_compatible,
    v_anomalies,
    v_differences,
    jsonb_build_object(
      'production', jsonb_build_object(
        'margin', v_production_margin,
        'commission', v_actual_commission,
        'platform_profit', v_production_profit,
        'attribution_user_id', v_order.referrer_id
      ),
      'p0', jsonb_build_object(
        'contribution_margin', COALESCE(v_revenue.contribution_margin, 0),
        'commission_pool', COALESCE(v_pool.pool_available, 0),
        'advisor_gains', v_theoretical_advisor,
        'platform_profit', v_theoretical_platform_profit,
        'attribution_user_id', v_attr.attributed_user_id,
        'governance_decision', v_governance_decision,
        'rejection_reasons', COALESCE(v_revenue.rejection_reasons, '[]'::jsonb)
      )
    )
  )
  ON CONFLICT (run_id, order_id) DO NOTHING;

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'compatible', v_compatible,
    'differences', v_differences,
    'anomaly_count', v_anomalies,
    'commission_difference', v_commission_diff,
    'margin_difference', v_margin_diff
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_p05_simulation_run_summary(_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'orders_analyzed', count(*),
    'compatible_orders', count(*) FILTER (WHERE compatible),
    'different_orders', count(*) FILTER (WHERE NOT compatible),
    'simulation_accuracy', CASE WHEN count(*) = 0 THEN 0 ELSE round((count(*) FILTER (WHERE compatible)::numeric / count(*)::numeric) * 100, 4) END,
    'simulation_confidence_score',
      CASE
        WHEN count(*) = 0 THEN 0
        ELSE GREATEST(0, round((count(*) FILTER (WHERE compatible)::numeric / count(*)::numeric) * 100, 4)
          - LEAST(5, count(*) FILTER (WHERE anomaly_count > 0)::numeric * 0.05))
      END,
    'margin_difference_total', COALESCE(sum(margin_difference), 0),
    'commission_difference_total', COALESCE(sum(commission_difference), 0),
    'commission_saved_total', COALESCE(sum(GREATEST(production_commission - p0_commission_pool, 0)), 0),
    'commission_extra_total', COALESCE(sum(GREATEST(p0_commission_pool - production_commission, 0)), 0),
    'simulated_platform_profit_total', COALESCE(sum(theoretical_platform_profit), 0),
    'production_platform_profit_total', COALESCE(sum(production_platform_profit), 0),
    'anomalies_detected', COALESCE(sum(anomaly_count), 0)
  )
  INTO v_summary
  FROM public.p05_simulation_order_results
  WHERE run_id = _run_id;

  UPDATE public.p05_simulation_runs
  SET status = 'completed',
      completed_at = now(),
      orders_analyzed = COALESCE((v_summary->>'orders_analyzed')::integer, 0),
      compatible_orders = COALESCE((v_summary->>'compatible_orders')::integer, 0),
      different_orders = COALESCE((v_summary->>'different_orders')::integer, 0),
      margin_difference_total = COALESCE((v_summary->>'margin_difference_total')::numeric, 0),
      commission_difference_total = COALESCE((v_summary->>'commission_difference_total')::numeric, 0),
      commission_saved_total = COALESCE((v_summary->>'commission_saved_total')::numeric, 0),
      commission_extra_total = COALESCE((v_summary->>'commission_extra_total')::numeric, 0),
      simulated_platform_profit_total = COALESCE((v_summary->>'simulated_platform_profit_total')::numeric, 0),
      production_platform_profit_total = COALESCE((v_summary->>'production_platform_profit_total')::numeric, 0),
      anomalies_detected = COALESCE((v_summary->>'anomalies_detected')::integer, 0),
      simulation_accuracy = COALESCE((v_summary->>'simulation_accuracy')::numeric, 0),
      simulation_confidence_score = COALESCE((v_summary->>'simulation_confidence_score')::numeric, 0),
      summary = v_summary
  WHERE id = _run_id;

  RETURN v_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_p05_simulation_replay(_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  r record;
  v_processed integer := 0;
  v_failed integer := 0;
  v_summary jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  INSERT INTO public.p05_simulation_runs (mode, orders_requested)
  VALUES ('historical_replay', GREATEST(COALESCE(_limit, 500), 1))
  RETURNING id INTO v_run_id;

  FOR r IN
    SELECT o.id
    FROM public.orders o
    JOIN public.order_accounting_snapshots s ON s.order_id = o.id
    ORDER BY o.created_at DESC
    LIMIT GREATEST(COALESCE(_limit, 500), 1)
  LOOP
    BEGIN
      PERFORM public.simulate_p05_order(v_run_id, r.id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      INSERT INTO public.governance_decision_logs (
        engine_name, decision_type, decision, order_id, confidence,
        rejection_reasons, data_used, rules_applied
      ) VALUES (
        'AI Governance Engine',
        'p05_simulation_order_error',
        'simulation_failed',
        r.id,
        1,
        jsonb_build_array(SQLERRM),
        jsonb_build_object('simulation_run_id', v_run_id),
        jsonb_build_object('mode', 'simulation')
      );
    END;
  END LOOP;

  v_summary := public.recompute_p05_simulation_run_summary(v_run_id);

  UPDATE public.p05_simulation_runs
  SET summary = summary || jsonb_build_object('failed_orders', v_failed, 'processed_attempts', v_processed)
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'processed', v_processed,
    'failed', v_failed,
    'summary', v_summary
  );
END;
$$;

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
  v_required_score numeric := 99.5;
  v_decision text := 'rejected';
  v_control_id uuid;
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

  IF _confirm_text <> 'JE CONFIRME QUE LE P0 RESTE SOUS CONTROLE SUPER ADMIN' THEN
    RAISE EXCEPTION 'invalid_confirmation_text';
  END IF;

  IF v_run.orders_analyzed < 300 THEN
    RAISE EXCEPTION 'not_enough_simulated_orders';
  END IF;

  IF v_run.simulation_confidence_score < v_required_score THEN
    RAISE EXCEPTION 'simulation_confidence_too_low';
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
      'minimum_required_score', v_required_score
    )
  )
  RETURNING id INTO v_control_id;

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
      'orders_analyzed', v_run.orders_analyzed
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
    'decision', v_decision,
    'financial_execution_enabled', false
  );
END;
$$;

CREATE OR REPLACE VIEW public.admin_p05_simulation_dashboard AS
SELECT
  r.id AS run_id,
  r.requested_at,
  r.completed_at,
  r.status,
  r.orders_analyzed AS commandes_simulees,
  r.compatible_orders AS commandes_identiques,
  r.different_orders AS commandes_differentes,
  r.simulation_accuracy,
  r.simulation_confidence_score,
  r.margin_difference_total,
  r.commission_difference_total,
  r.commission_saved_total,
  r.commission_extra_total,
  r.simulated_platform_profit_total AS profit_plateforme_simule,
  r.production_platform_profit_total AS profit_plateforme_production,
  r.anomalies_detected,
  CASE
    WHEN r.simulation_confidence_score >= 100 THEN 'activation_complete_autorisable'
    WHEN r.simulation_confidence_score >= 99.5 THEN 'pret_activation_partielle'
    WHEN r.simulation_confidence_score >= 98 THEN 'pret_test_controle'
    WHEN r.simulation_confidence_score >= 95 THEN 'surveillance'
    ELSE 'insuffisant'
  END AS confidence_status,
  r.summary
FROM public.p05_simulation_runs r
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

CREATE OR REPLACE VIEW public.admin_p05_simulation_vs_production AS
SELECT
  r.id,
  r.run_id,
  r.created_at,
  r.order_id,
  r.order_number,
  r.order_status,
  r.payment_status,
  jsonb_build_object(
    'revenue', r.production_revenue,
    'margin', r.production_margin,
    'commission', r.production_commission,
    'platform_profit', r.production_platform_profit,
    'attribution_user_id', r.production_attribution_user_id,
    'attribution_source', r.production_attribution_source
  ) AS calcul_actuel,
  jsonb_build_object(
    'revenue', r.p0_revenue,
    'contribution_margin', r.p0_contribution_margin,
    'commission_pool', r.p0_commission_pool,
    'advisor_gains', r.theoretical_advisor_gains,
    'marketplace_gains', r.theoretical_marketplace_gains,
    'platform_profit', r.theoretical_platform_profit,
    'attribution_user_id', r.p0_attribution_user_id,
    'attribution_source', r.p0_attribution_source,
    'governance_decision', r.governance_decision
  ) AS calcul_p0,
  jsonb_build_object(
    'margin_difference', r.margin_difference,
    'commission_difference', r.commission_difference,
    'attribution_difference', r.attribution_difference,
    'compatible', r.compatible,
    'anomaly_count', r.anomaly_count
  ) AS difference,
  r.explanation,
  r.differences
FROM public.p05_simulation_order_results r
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

ALTER TABLE public.p05_simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p05_simulation_order_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p05_engine_activation_controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read p05 simulation runs" ON public.p05_simulation_runs;
CREATE POLICY "Admins read p05 simulation runs"
ON public.p05_simulation_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read p05 simulation order results" ON public.p05_simulation_order_results;
CREATE POLICY "Admins read p05 simulation order results"
ON public.p05_simulation_order_results FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read p05 activation controls" ON public.p05_engine_activation_controls;
CREATE POLICY "Admins read p05 activation controls"
ON public.p05_engine_activation_controls FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.p05_simulation_runs FROM PUBLIC, anon;
REVOKE ALL ON public.p05_simulation_order_results FROM PUBLIC, anon;
REVOKE ALL ON public.p05_engine_activation_controls FROM PUBLIC, anon;

GRANT SELECT ON public.p05_simulation_runs TO authenticated, service_role;
GRANT SELECT ON public.p05_simulation_order_results TO authenticated, service_role;
GRANT SELECT ON public.p05_engine_activation_controls TO authenticated, service_role;
GRANT SELECT ON public.admin_p05_simulation_dashboard TO authenticated, service_role;
GRANT SELECT ON public.admin_p05_simulation_vs_production TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.simulate_p05_order(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_p05_simulation_run_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_p05_simulation_replay(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.authorize_p05_activation_gate(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.simulate_p05_order(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_p05_simulation_run_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_p05_simulation_replay(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authorize_p05_activation_gate(uuid, text, text, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
