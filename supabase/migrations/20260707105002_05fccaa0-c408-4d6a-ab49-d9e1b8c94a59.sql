
CREATE OR REPLACE FUNCTION public.upsert_payment_reconciliation(_intent_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_order_total numeric; v_expected numeric; v_received numeric;
  v_variance numeric; v_status text; v_id uuid;
BEGIN
  SELECT * INTO v_intent FROM public.payment_intents WHERE id = _intent_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_received := COALESCE(v_intent.amount, 0);
  IF v_intent.order_id IS NULL THEN
    v_expected := v_received; v_variance := 0; v_status := 'missing_order';
  ELSE
    SELECT COALESCE(total, 0) INTO v_order_total FROM public.orders WHERE id = v_intent.order_id;
    v_expected := COALESCE(v_order_total, 0);
    v_variance := v_received - v_expected;
    v_status := CASE WHEN ABS(v_variance) < 1 THEN 'matched' ELSE 'variance' END;
  END IF;
  INSERT INTO public.payment_reconciliations (
    payment_intent_id, order_id, expected_amount, received_amount, currency, variance, status
  ) VALUES (
    v_intent.id, v_intent.order_id, v_expected, v_received,
    COALESCE(v_intent.currency, 'XAF'), v_variance, v_status
  )
  ON CONFLICT (payment_intent_id) DO UPDATE
    SET expected_amount = EXCLUDED.expected_amount,
        received_amount = EXCLUDED.received_amount,
        variance = EXCLUDED.variance,
        status = CASE WHEN public.payment_reconciliations.status = 'reconciled'
                      THEN public.payment_reconciliations.status ELSE EXCLUDED.status END,
        updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_reconciliations_intent_key') THEN
    ALTER TABLE public.payment_reconciliations
      ADD CONSTRAINT payment_reconciliations_intent_key UNIQUE (payment_intent_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_reconcile_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'succeeded' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.upsert_payment_reconciliation(NEW.id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_reconcile_payment ON public.payment_intents;
CREATE TRIGGER trg_reconcile_payment
AFTER INSERT OR UPDATE OF status ON public.payment_intents
FOR EACH ROW EXECUTE FUNCTION public.trg_reconcile_payment();

CREATE OR REPLACE FUNCTION public.reconcile_payment(_recon_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  UPDATE public.payment_reconciliations
     SET status = 'reconciled', reconciled_at = now(), reconciled_by = auth.uid(),
         notes = COALESCE(_note, notes), updated_at = now()
   WHERE id = _recon_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.upsert_payment_reconciliation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.admin_finance_overview
WITH (security_invoker = true) AS
SELECT
  o.id AS order_id, o.created_at AS order_created_at, o.status AS order_status,
  o.total AS order_total, o.user_id AS buyer_id, o.guest_email,
  pi.id AS payment_intent_id, pi.provider AS payment_provider, pi.method AS payment_method,
  pi.status AS payment_status, pi.amount AS payment_amount, pi.processed_at AS payment_processed_at,
  e.id AS escrow_id, e.status AS escrow_status, e.amount AS escrow_amount,
  e.captured_amount AS escrow_captured, e.refunded_amount AS escrow_refunded, e.hold_reason AS escrow_hold_reason,
  r.id AS reconciliation_id, r.status AS reconciliation_status,
  r.expected_amount AS recon_expected, r.received_amount AS recon_received,
  r.variance AS recon_variance, r.reconciled_at,
  rs.risk_level, rs.score AS risk_score, rs.review_status AS risk_review_status
FROM public.orders o
LEFT JOIN LATERAL (
  SELECT * FROM public.payment_intents WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
) pi ON true
LEFT JOIN public.order_escrows e ON e.order_id = o.id
LEFT JOIN public.payment_reconciliations r ON r.payment_intent_id = pi.id
LEFT JOIN public.order_risk_scores rs ON rs.order_id = o.id;

GRANT SELECT ON public.admin_finance_overview TO authenticated, service_role;
