-- P0 foundation: Smart Revenue Engine, Commission Pool and Attribution observation.
-- Additive only. This migration does not mutate historical orders, wallets,
-- commissions, products, snapshots, or ledger entries.

CREATE TABLE IF NOT EXISTS public.revenue_engine_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  accounting_snapshot_id uuid REFERENCES public.order_accounting_snapshots(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  user_id uuid,
  currency text NOT NULL DEFAULT 'XAF',
  mode text NOT NULL DEFAULT 'observation' CHECK (mode IN ('observation', 'enforced')),
  rules_version text NOT NULL DEFAULT 'p0_revenue_engine_v1',
  revenue_amount numeric(14,2) NOT NULL DEFAULT 0,
  product_cost_total numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  delivery_fee_charged numeric(14,2) NOT NULL DEFAULT 0,
  delivery_fee_estimated_cost numeric(14,2) NOT NULL DEFAULT 0,
  payment_provider_fee numeric(14,2) NOT NULL DEFAULT 0,
  packaging_fee numeric(14,2) NOT NULL DEFAULT 0,
  operational_fee_estimate numeric(14,2) NOT NULL DEFAULT 0,
  risk_reserve_amount numeric(14,2) NOT NULL DEFAULT 0,
  gross_margin numeric(14,2) NOT NULL DEFAULT 0,
  contribution_margin numeric(14,2) NOT NULL DEFAULT 0,
  platform_minimum_profit numeric(14,2) NOT NULL DEFAULT 0,
  commission_pool_available numeric(14,2) NOT NULL DEFAULT 0,
  missing_cost_count integer NOT NULL DEFAULT 0,
  min_margin_rate numeric(8,4) NOT NULL DEFAULT 0.10,
  is_commissionable boolean NOT NULL DEFAULT false,
  decision text NOT NULL DEFAULT 'blocked',
  confidence numeric(6,4) NOT NULL DEFAULT 1,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejection_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculation_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_revenue_engine_snapshots_created
  ON public.revenue_engine_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_engine_snapshots_decision
  ON public.revenue_engine_snapshots(decision, is_commissionable);

CREATE TABLE IF NOT EXISTS public.commission_pool_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  revenue_snapshot_id uuid NOT NULL REFERENCES public.revenue_engine_snapshots(id) ON DELETE RESTRICT,
  mode text NOT NULL DEFAULT 'observation' CHECK (mode IN ('observation', 'enforced')),
  rules_version text NOT NULL DEFAULT 'p0_commission_pool_v1',
  pool_available numeric(14,2) NOT NULL DEFAULT 0,
  direct_share_rate numeric(8,4) NOT NULL DEFAULT 0.70,
  indirect_share_rate numeric(8,4) NOT NULL DEFAULT 0.15,
  campaign_reserve_rate numeric(8,4) NOT NULL DEFAULT 0.10,
  quality_reserve_rate numeric(8,4) NOT NULL DEFAULT 0.05,
  direct_pool_amount numeric(14,2) NOT NULL DEFAULT 0,
  indirect_pool_amount numeric(14,2) NOT NULL DEFAULT 0,
  campaign_reserve_amount numeric(14,2) NOT NULL DEFAULT 0,
  quality_reserve_amount numeric(14,2) NOT NULL DEFAULT 0,
  decision text NOT NULL DEFAULT 'blocked',
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejection_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_pool_snapshots_created
  ON public.commission_pool_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS public.attribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  attribution_source text NOT NULL,
  attributed_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id text,
  session_id text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  campaign_id uuid,
  code text,
  confidence numeric(6,4) NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_events_order
  ON public.attribution_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attribution_events_attributed_user
  ON public.attribution_events(attributed_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  attributed_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attribution_source text NOT NULL,
  attribution_event_id uuid REFERENCES public.attribution_events(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 999,
  confidence numeric(6,4) NOT NULL DEFAULT 1,
  decision text NOT NULL DEFAULT 'unattributed',
  rejection_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_attributions_user
  ON public.order_attributions(attributed_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.governance_decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name text NOT NULL,
  decision_type text NOT NULL,
  decision text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confidence numeric(6,4) NOT NULL DEFAULT 1,
  data_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules_applied jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_impacts jsonb NOT NULL DEFAULT '{}'::jsonb,
  alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejection_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_governance_decision_logs_order
  ON public.governance_decision_logs(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_decision_logs_engine
  ON public.governance_decision_logs(engine_name, created_at DESC);

CREATE TABLE IF NOT EXISTS public.fraud_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signal_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'confirmed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fraud_risk_signals_open
  ON public.fraud_risk_signals(status, severity, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_p0_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'p0_observation_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_revenue_engine_snapshots_immutable ON public.revenue_engine_snapshots;
CREATE TRIGGER trg_revenue_engine_snapshots_immutable
BEFORE UPDATE OR DELETE ON public.revenue_engine_snapshots
FOR EACH ROW EXECUTE FUNCTION public.prevent_p0_observation_mutation();

DROP TRIGGER IF EXISTS trg_commission_pool_snapshots_immutable ON public.commission_pool_snapshots;
CREATE TRIGGER trg_commission_pool_snapshots_immutable
BEFORE UPDATE OR DELETE ON public.commission_pool_snapshots
FOR EACH ROW EXECUTE FUNCTION public.prevent_p0_observation_mutation();

DROP TRIGGER IF EXISTS trg_order_attributions_immutable ON public.order_attributions;
CREATE TRIGGER trg_order_attributions_immutable
BEFORE UPDATE OR DELETE ON public.order_attributions
FOR EACH ROW EXECUTE FUNCTION public.prevent_p0_observation_mutation();

DROP TRIGGER IF EXISTS trg_governance_decision_logs_immutable ON public.governance_decision_logs;
CREATE TRIGGER trg_governance_decision_logs_immutable
BEFORE UPDATE OR DELETE ON public.governance_decision_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_p0_observation_mutation();

CREATE OR REPLACE FUNCTION public.calculate_p0_revenue_observation(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_snapshot public.order_accounting_snapshots%ROWTYPE;
  v_revenue numeric := 0;
  v_product_cost numeric := 0;
  v_discount numeric := 0;
  v_delivery numeric := 0;
  v_payment_fee numeric := 0;
  v_packaging_fee numeric := 0;
  v_operational_fee numeric := 0;
  v_risk_reserve numeric := 0;
  v_gross_margin numeric := 0;
  v_contribution_margin numeric := 0;
  v_min_margin_rate numeric := 0.10;
  v_platform_min_profit numeric := 0;
  v_pool numeric := 0;
  v_missing_cost_count integer := 0;
  v_warnings jsonb := '[]'::jsonb;
  v_rejections jsonb := '[]'::jsonb;
  v_decision text := 'blocked';
  v_is_commissionable boolean := false;
  v_revenue_snapshot_id uuid;
  v_pool_snapshot_id uuid;
  v_attributed_user_id uuid;
  v_attribution_source text := 'none';
  v_attribution_priority integer := 999;
  v_attribution_decision text := 'unattributed';
BEGIN
  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  SELECT *
    INTO v_snapshot
  FROM public.order_accounting_snapshots
  WHERE order_id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'accounting_snapshot_missing';
  END IF;

  v_revenue := round(COALESCE(v_snapshot.amount_including_tax, v_order.total, 0), 0);
  v_product_cost := round(COALESCE(v_snapshot.product_cost_total, 0), 0);
  v_discount := round(COALESCE(v_snapshot.discount_amount, 0), 0);
  v_delivery := round(COALESCE(v_snapshot.delivery_fee, 0), 0);
  v_payment_fee := round(COALESCE(v_snapshot.payment_provider_fee, 0), 0);
  v_packaging_fee := round(COALESCE((v_snapshot.metadata->>'gift_packaging_price')::numeric, 0), 0);
  v_operational_fee := 0;
  v_risk_reserve := round(GREATEST(v_revenue * 0.005, 0), 0);
  v_gross_margin := round(COALESCE(v_snapshot.gross_margin, v_revenue - v_product_cost, 0), 0);
  v_contribution_margin := round(v_revenue - v_product_cost - v_payment_fee - v_operational_fee - v_risk_reserve, 0);

  SELECT count(*)
    INTO v_missing_cost_count
  FROM jsonb_array_elements(COALESCE(v_snapshot.items, '[]'::jsonb)) item
  WHERE COALESCE((item->>'purchase_unit_cost')::numeric, 0) <= 0
     OR COALESCE((item->>'cost_missing')::boolean, false) = true;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(v_snapshot.items, '[]'::jsonb)) item
    WHERE item ? 'packaging_option_id'
      AND NULLIF(item->>'packaging_option_id', '') IS NOT NULL
  ) THEN
    v_min_margin_rate := 0.08;
  END IF;

  v_platform_min_profit := round(GREATEST(v_revenue * v_min_margin_rate, 0), 0);
  v_pool := round(GREATEST(v_contribution_margin - v_platform_min_profit, 0), 0);

  IF v_order.payment_status <> 'completed' THEN
    v_rejections := v_rejections || jsonb_build_array('payment_not_completed');
  END IF;
  IF v_order.status = 'cancelled' THEN
    v_rejections := v_rejections || jsonb_build_array('order_cancelled');
  END IF;
  IF v_order.payment_status = 'refunded' THEN
    v_rejections := v_rejections || jsonb_build_array('order_refunded');
  END IF;
  IF v_missing_cost_count > 0 THEN
    v_rejections := v_rejections || jsonb_build_array('missing_purchase_cost');
  END IF;
  IF v_contribution_margin < v_platform_min_profit THEN
    v_rejections := v_rejections || jsonb_build_array('minimum_platform_margin_not_met');
  END IF;
  IF v_pool <= 0 THEN
    v_rejections := v_rejections || jsonb_build_array('commission_pool_not_positive');
  END IF;

  IF v_payment_fee = 0 AND v_order.payment_method IN ('mtn_money', 'orange_money') THEN
    v_warnings := v_warnings || jsonb_build_array('mobile_money_fee_missing_or_zero');
  END IF;

  IF jsonb_array_length(v_rejections) = 0 THEN
    v_decision := 'commissionable_observation';
    v_is_commissionable := true;
  END IF;

  INSERT INTO public.revenue_engine_snapshots (
    order_id, accounting_snapshot_id, order_number, user_id, currency,
    revenue_amount, product_cost_total, discount_amount, delivery_fee_charged,
    delivery_fee_estimated_cost, payment_provider_fee, packaging_fee,
    operational_fee_estimate, risk_reserve_amount, gross_margin,
    contribution_margin, platform_minimum_profit, commission_pool_available,
    missing_cost_count, min_margin_rate, is_commissionable, decision,
    warnings, rejection_reasons, calculation_details
  ) VALUES (
    _order_id, v_snapshot.id, v_order.order_number, v_order.user_id, COALESCE(v_snapshot.currency, 'XAF'),
    v_revenue, v_product_cost, v_discount, v_delivery,
    v_delivery, v_payment_fee, v_packaging_fee,
    v_operational_fee, v_risk_reserve, v_gross_margin,
    v_contribution_margin, v_platform_min_profit, v_pool,
    v_missing_cost_count, v_min_margin_rate, v_is_commissionable, v_decision,
    v_warnings, v_rejections,
    jsonb_build_object(
      'principle', 'growth_must_not_override_profit_trust_or_user_experience',
      'source_snapshot_id', v_snapshot.id,
      'payment_status', v_order.payment_status,
      'order_status', v_order.status,
      'rules_version', 'p0_revenue_engine_v1'
    )
  )
  ON CONFLICT (order_id) DO NOTHING
  RETURNING id INTO v_revenue_snapshot_id;

  IF v_revenue_snapshot_id IS NULL THEN
    SELECT id INTO v_revenue_snapshot_id
    FROM public.revenue_engine_snapshots
    WHERE order_id = _order_id;
  END IF;

  INSERT INTO public.commission_pool_snapshots (
    order_id, revenue_snapshot_id, pool_available,
    direct_pool_amount, indirect_pool_amount, campaign_reserve_amount,
    quality_reserve_amount, decision, warnings, rejection_reasons
  ) VALUES (
    _order_id, v_revenue_snapshot_id, v_pool,
    round(v_pool * 0.70, 0), round(v_pool * 0.15, 0),
    round(v_pool * 0.10, 0), round(v_pool * 0.05, 0),
    CASE WHEN v_is_commissionable THEN 'pool_available_observation' ELSE 'pool_blocked_observation' END,
    v_warnings, v_rejections
  )
  ON CONFLICT (order_id) DO NOTHING
  RETURNING id INTO v_pool_snapshot_id;

  IF v_order.referrer_id IS NOT NULL THEN
    v_attributed_user_id := v_order.referrer_id;
    v_attribution_source := 'referral_code';
    v_attribution_priority := 50;
    v_attribution_decision := 'attributed_observation';

    IF v_order.user_id IS NOT NULL AND v_order.user_id = v_order.referrer_id THEN
      v_attribution_decision := 'blocked';
      v_rejections := v_rejections || jsonb_build_array('self_referral');
      v_attributed_user_id := NULL;

      INSERT INTO public.fraud_risk_signals (
        signal_type, severity, order_id, user_id, related_user_id, signal_details
      ) VALUES (
        'self_referral',
        'high',
        _order_id,
        v_order.user_id,
        v_order.referrer_id,
        jsonb_build_object('engine', 'p0_attribution_engine', 'order_number', v_order.order_number)
      );
    END IF;
  END IF;

  INSERT INTO public.order_attributions (
    order_id, attributed_user_id, attribution_source, priority,
    confidence, decision, rejection_reasons, explanation
  ) VALUES (
    _order_id, v_attributed_user_id, v_attribution_source, v_attribution_priority,
    CASE WHEN v_attribution_decision = 'attributed_observation' THEN 0.90 ELSE 1 END,
    v_attribution_decision,
    CASE WHEN v_attribution_decision = 'blocked' THEN jsonb_build_array('self_referral') ELSE '[]'::jsonb END,
    jsonb_build_object(
      'rules_version', 'p0_attribution_engine_v1',
      'priority_model', 'admin_b2b_campaign_link_code_last_click_historical',
      'source_order_referrer_id', v_order.referrer_id
    )
  )
  ON CONFLICT (order_id) DO NOTHING;

  INSERT INTO public.governance_decision_logs (
    engine_name, decision_type, decision, order_id, user_id, confidence,
    data_used, rules_applied, estimated_impacts, alternatives, rejection_reasons
  ) VALUES (
    'AI Governance Engine',
    'p0_revenue_pool_attribution_observation',
    CASE WHEN v_is_commissionable THEN 'observe_allow_commission_pool' ELSE 'observe_block_commission_pool' END,
    _order_id,
    v_order.user_id,
    1,
    jsonb_build_object(
      'revenue_amount', v_revenue,
      'product_cost_total', v_product_cost,
      'contribution_margin', v_contribution_margin,
      'platform_minimum_profit', v_platform_min_profit,
      'commission_pool_available', v_pool
    ),
    jsonb_build_object(
      'minimum_margin_rate', v_min_margin_rate,
      'payment_required', 'completed',
      'cost_required', true,
      'mode', 'observation'
    ),
    jsonb_build_object(
      'platform_profit_protected', v_platform_min_profit,
      'maximum_commission_pool', v_pool,
      'commissionable', v_is_commissionable
    ),
    jsonb_build_array(
      'keep_commission_blocked_until_payment_and_costs_are_valid',
      'admin_manual_review',
      'enforce_after_observation_period'
    ),
    v_rejections
  );

  RETURN jsonb_build_object(
    'success', true,
    'mode', 'observation',
    'order_id', _order_id,
    'revenue_snapshot_id', v_revenue_snapshot_id,
    'commission_pool_snapshot_id', v_pool_snapshot_id,
    'commission_pool_available', v_pool,
    'is_commissionable', v_is_commissionable,
    'decision', v_decision,
    'warnings', v_warnings,
    'rejection_reasons', v_rejections
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.run_p0_revenue_observation_for_recent_orders(_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_processed integer := 0;
  v_failed integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  FOR r IN
    SELECT o.id
    FROM public.orders o
    JOIN public.order_accounting_snapshots s ON s.order_id = o.id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.revenue_engine_snapshots rs
      WHERE rs.order_id = o.id
    )
    ORDER BY o.created_at DESC
    LIMIT GREATEST(COALESCE(_limit, 50), 1)
  LOOP
    BEGIN
      PERFORM public.calculate_p0_revenue_observation(r.id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      INSERT INTO public.governance_decision_logs (
        engine_name, decision_type, decision, order_id, confidence,
        rejection_reasons, data_used, rules_applied
      ) VALUES (
        'AI Governance Engine',
        'p0_revenue_observation_error',
        'observation_failed',
        r.id,
        1,
        jsonb_build_array(SQLERRM),
        '{}'::jsonb,
        jsonb_build_object('mode', 'observation')
      );
    END;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'processed', v_processed, 'failed', v_failed);
END;
$$;

CREATE OR REPLACE VIEW public.admin_p0_revenue_observation_report AS
SELECT
  rs.created_at,
  rs.order_id,
  rs.order_number,
  o.status,
  o.payment_status,
  rs.revenue_amount,
  rs.product_cost_total,
  rs.gross_margin,
  rs.contribution_margin,
  rs.platform_minimum_profit,
  rs.commission_pool_available,
  rs.missing_cost_count,
  rs.min_margin_rate,
  rs.is_commissionable,
  rs.decision,
  rs.warnings,
  rs.rejection_reasons,
  oa.attributed_user_id,
  oa.attribution_source,
  oa.decision AS attribution_decision
FROM public.revenue_engine_snapshots rs
JOIN public.orders o ON o.id = rs.order_id
LEFT JOIN public.order_attributions oa ON oa.order_id = rs.order_id
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

CREATE OR REPLACE VIEW public.admin_p0_governance_decision_report AS
SELECT
  created_at,
  engine_name,
  decision_type,
  decision,
  order_id,
  user_id,
  confidence,
  data_used,
  rules_applied,
  estimated_impacts,
  alternatives,
  rejection_reasons
FROM public.governance_decision_logs
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

ALTER TABLE public.revenue_engine_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_pool_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_risk_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read revenue engine snapshots" ON public.revenue_engine_snapshots;
CREATE POLICY "Admins read revenue engine snapshots"
ON public.revenue_engine_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read commission pool snapshots" ON public.commission_pool_snapshots;
CREATE POLICY "Admins read commission pool snapshots"
ON public.commission_pool_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read attribution events" ON public.attribution_events;
CREATE POLICY "Admins read attribution events"
ON public.attribution_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read order attributions" ON public.order_attributions;
CREATE POLICY "Admins read order attributions"
ON public.order_attributions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read governance decisions" ON public.governance_decision_logs;
CREATE POLICY "Admins read governance decisions"
ON public.governance_decision_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read fraud risk signals" ON public.fraud_risk_signals;
CREATE POLICY "Admins read fraud risk signals"
ON public.fraud_risk_signals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.revenue_engine_snapshots FROM PUBLIC, anon;
REVOKE ALL ON public.commission_pool_snapshots FROM PUBLIC, anon;
REVOKE ALL ON public.attribution_events FROM PUBLIC, anon;
REVOKE ALL ON public.order_attributions FROM PUBLIC, anon;
REVOKE ALL ON public.governance_decision_logs FROM PUBLIC, anon;
REVOKE ALL ON public.fraud_risk_signals FROM PUBLIC, anon;

GRANT SELECT ON public.revenue_engine_snapshots TO authenticated, service_role;
GRANT SELECT ON public.commission_pool_snapshots TO authenticated, service_role;
GRANT SELECT ON public.attribution_events TO authenticated, service_role;
GRANT SELECT ON public.order_attributions TO authenticated, service_role;
GRANT SELECT ON public.governance_decision_logs TO authenticated, service_role;
GRANT SELECT ON public.fraud_risk_signals TO authenticated, service_role;
GRANT SELECT ON public.admin_p0_revenue_observation_report TO authenticated, service_role;
GRANT SELECT ON public.admin_p0_governance_decision_report TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_p0_revenue_observation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_p0_revenue_observation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_p0_revenue_observation_for_recent_orders(integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
