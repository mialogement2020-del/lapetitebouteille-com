
-- Index for pending reconciliations
CREATE INDEX IF NOT EXISTS idx_payment_intents_status_order
  ON public.payment_intents(status, order_id) WHERE status = 'succeeded';

CREATE INDEX IF NOT EXISTS idx_reconciliations_status
  ON public.payment_reconciliations(status, created_at DESC);

-- Reconcile one payment intent
CREATE OR REPLACE FUNCTION public.reconcile_payment_intent(_intent_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_order_total NUMERIC;
  v_order_currency TEXT;
  v_expected NUMERIC;
  v_variance NUMERIC;
  v_status TEXT;
  v_recon_id UUID;
BEGIN
  SELECT * INTO v_intent FROM public.payment_intents WHERE id = _intent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment intent % not found', _intent_id;
  END IF;

  IF v_intent.order_id IS NULL THEN
    RAISE EXCEPTION 'Payment intent % has no order_id', _intent_id;
  END IF;

  SELECT total_amount, COALESCE(currency, 'XAF')
    INTO v_order_total, v_order_currency
  FROM public.orders WHERE id = v_intent.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', v_intent.order_id;
  END IF;

  -- Convert expected to intent currency if needed
  IF v_order_currency = COALESCE(v_intent.currency, 'XAF') THEN
    v_expected := v_order_total;
  ELSE
    v_expected := public.convert_currency(v_order_total, v_order_currency, COALESCE(v_intent.currency, 'XAF'));
  END IF;

  v_variance := v_intent.amount - v_expected;

  IF ABS(v_variance) < 1 THEN
    v_status := 'matched';
  ELSIF ABS(v_variance) / NULLIF(v_expected,0) < 0.01 THEN
    v_status := 'matched'; -- <1% tolerance (rounding)
  ELSIF ABS(v_variance) / NULLIF(v_expected,0) < 0.05 THEN
    v_status := 'manual_review';
  ELSE
    v_status := 'mismatched';
  END IF;

  -- Upsert reconciliation
  SELECT id INTO v_recon_id FROM public.payment_reconciliations
   WHERE payment_intent_id = _intent_id;

  IF v_recon_id IS NULL THEN
    INSERT INTO public.payment_reconciliations(
      payment_intent_id, order_id, expected_amount, received_amount, status, notes
    ) VALUES (
      _intent_id, v_intent.order_id, v_expected, v_intent.amount, v_status,
      'auto-reconciled at ' || now()::text
    ) RETURNING id INTO v_recon_id;
  ELSE
    UPDATE public.payment_reconciliations SET
      expected_amount = v_expected,
      received_amount = v_intent.amount,
      status = v_status,
      updated_at = now(),
      notes = COALESCE(notes,'') || E'\nre-reconciled at ' || now()::text
    WHERE id = v_recon_id;
  END IF;

  RETURN v_recon_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_payment_intent(UUID) TO authenticated, service_role;

-- Batch reconciliation
CREATE OR REPLACE FUNCTION public.auto_reconcile_pending()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  cnt INTEGER := 0;
BEGIN
  FOR r IN
    SELECT pi.id FROM public.payment_intents pi
    LEFT JOIN public.payment_reconciliations pr ON pr.payment_intent_id = pi.id
    WHERE pi.status = 'succeeded'
      AND pi.order_id IS NOT NULL
      AND pr.id IS NULL
    LIMIT 500
  LOOP
    BEGIN
      PERFORM public.reconcile_payment_intent(r.id);
      cnt := cnt + 1;
    EXCEPTION WHEN OTHERS THEN
      -- swallow and continue
      NULL;
    END;
  END LOOP;
  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_reconcile_pending() TO service_role;

-- Trigger: reconcile on payment success
CREATE OR REPLACE FUNCTION public.trg_reconcile_payment_intent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'succeeded'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'succeeded')
     AND NEW.order_id IS NOT NULL THEN
    BEGIN
      PERFORM public.reconcile_payment_intent(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_intents_reconcile ON public.payment_intents;
CREATE TRIGGER trg_payment_intents_reconcile
  AFTER INSERT OR UPDATE OF status ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.trg_reconcile_payment_intent();
