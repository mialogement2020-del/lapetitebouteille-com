-- Finance/MLM P2: harden commission reversal on cancelled/refunded orders.
-- Non-destructive migration: no commission is deleted and no wallet can become negative.

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversal_reason text,
  ADD COLUMN IF NOT EXISTS reversal_wallet_recovered_amount numeric(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.reverse_mlm_commissions_for_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_wallet public.wallets%ROWTYPE;
  v_recoverable numeric(12,2);
  v_recovered_count integer := 0;
  v_unrecovered_count integer := 0;
  v_recovered_total numeric(12,2) := 0;
  v_unrecovered_total numeric(12,2) := 0;
BEGIN
  FOR r IN
    SELECT c.*
    FROM public.commissions c
    WHERE c.order_id = _order_id
      AND c.status IN ('pending', 'completed')
    FOR UPDATE
  LOOP
    SELECT *
      INTO v_wallet
    FROM public.wallets
    WHERE user_id = r.beneficiary_id
    FOR UPDATE;

    IF NOT FOUND THEN
      UPDATE public.commissions
      SET
        status = 'refunded',
        reversed_at = COALESCE(reversed_at, now()),
        reversal_reason = COALESCE(reversal_reason, 'order_cancelled_or_refunded_wallet_missing'),
        reversal_wallet_recovered_amount = 0
      WHERE id = r.id;

      v_unrecovered_count := v_unrecovered_count + 1;
      v_unrecovered_total := v_unrecovered_total + r.commission_amount;
      CONTINUE;
    END IF;

    IF r.status = 'pending' THEN
      v_recoverable := LEAST(COALESCE(v_wallet.pending_balance, 0), r.commission_amount);

      UPDATE public.wallets
      SET
        pending_balance = GREATEST(COALESCE(pending_balance, 0) - r.commission_amount, 0),
        updated_at = now()
      WHERE id = v_wallet.id;

      UPDATE public.commissions
      SET
        status = 'refunded',
        reversed_at = COALESCE(reversed_at, now()),
        reversal_reason = COALESCE(reversal_reason, 'order_cancelled_or_refunded_pending_reversal'),
        reversal_wallet_recovered_amount = v_recoverable
      WHERE id = r.id;

      IF v_recoverable < r.commission_amount THEN
        v_unrecovered_count := v_unrecovered_count + 1;
        v_unrecovered_total := v_unrecovered_total + (r.commission_amount - v_recoverable);
      END IF;

      v_recovered_count := v_recovered_count + 1;
      v_recovered_total := v_recovered_total + v_recoverable;
    ELSE
      v_recoverable := LEAST(COALESCE(v_wallet.balance, 0), r.commission_amount);

      UPDATE public.wallets
      SET
        balance = GREATEST(COALESCE(balance, 0) - v_recoverable, 0),
        total_earned = GREATEST(COALESCE(total_earned, 0) - r.commission_amount, 0),
        updated_at = now()
      WHERE id = v_wallet.id;

      IF v_recoverable > 0 THEN
        INSERT INTO public.wallet_transactions (
          wallet_id,
          user_id,
          type,
          amount,
          balance_after,
          reference_type,
          reference_id,
          description
        ) VALUES (
          v_wallet.id,
          r.beneficiary_id,
          'adjustment',
          -v_recoverable,
          GREATEST(COALESCE(v_wallet.balance, 0) - v_recoverable, 0),
          'commission_reversal',
          r.id,
          format('Reprise commission commande annulee/remboursee %s', _order_id)
        );
      END IF;

      UPDATE public.commissions
      SET
        status = 'refunded',
        reversed_at = COALESCE(reversed_at, now()),
        reversal_reason = COALESCE(reversal_reason, 'order_cancelled_or_refunded_completed_reversal'),
        reversal_wallet_recovered_amount = v_recoverable
      WHERE id = r.id;

      IF v_recoverable < r.commission_amount THEN
        v_unrecovered_count := v_unrecovered_count + 1;
        v_unrecovered_total := v_unrecovered_total + (r.commission_amount - v_recoverable);
      END IF;

      v_recovered_count := v_recovered_count + 1;
      v_recovered_total := v_recovered_total + v_recoverable;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'reversed_count', v_recovered_count,
    'unrecovered_count', v_unrecovered_count,
    'recovered_total', v_recovered_total,
    'unrecovered_total', v_unrecovered_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_generate_commissions_on_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'completed'
     AND NEW.status <> 'cancelled'
     AND NEW.referrer_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    BEGIN
      PERFORM public.generate_mlm_commissions(NEW.id, NEW.referrer_id, NEW.total);
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'MLM commission generation skipped for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  IF (NEW.payment_status = 'refunded' OR NEW.status = 'cancelled')
     AND TG_OP = 'UPDATE'
     AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status OR OLD.status IS DISTINCT FROM NEW.status) THEN
    BEGIN
      PERFORM public.reverse_mlm_commissions_for_order(NEW.id);
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'MLM commission reversal skipped for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_commissions_on_paid_order ON public.orders;
CREATE TRIGGER trg_generate_commissions_on_paid_order
AFTER INSERT OR UPDATE OF payment_status, status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_generate_commissions_on_paid_order();

CREATE OR REPLACE VIEW public.admin_mlm_commission_anomalies AS
WITH duplicate_commissions AS (
  SELECT
    order_id,
    beneficiary_id,
    level,
    count(*) AS duplicate_count
  FROM public.commissions
  WHERE order_id IS NOT NULL
  GROUP BY order_id, beneficiary_id, level
  HAVING count(*) > 1
)
SELECT
  c.id AS commission_id,
  c.order_id,
  o.order_number,
  c.beneficiary_id,
  c.purchaser_id,
  c.level,
  c.status AS commission_status,
  o.status AS order_status,
  o.payment_status,
  c.commission_amount,
  COALESCE(c.reversal_wallet_recovered_amount, 0) AS reversal_wallet_recovered_amount,
  GREATEST(c.commission_amount - COALESCE(c.reversal_wallet_recovered_amount, 0), 0) AS unrecovered_amount,
  ARRAY_REMOVE(ARRAY[
    CASE
      WHEN (o.status = 'cancelled' OR o.payment_status = 'refunded')
       AND c.status IN ('pending', 'completed')
      THEN 'active_commission_on_invalid_order'
    END,
    CASE
      WHEN c.status = 'refunded'
       AND GREATEST(c.commission_amount - COALESCE(c.reversal_wallet_recovered_amount, 0), 0) > 0
      THEN 'commission_reversal_not_fully_recovered'
    END,
    CASE
      WHEN d.duplicate_count IS NOT NULL
      THEN 'duplicate_commission'
    END
  ], NULL) AS anomaly_codes,
  c.created_at,
  c.reversed_at
FROM public.commissions c
JOIN public.orders o ON o.id = c.order_id
LEFT JOIN duplicate_commissions d
  ON d.order_id = c.order_id
 AND d.beneficiary_id = c.beneficiary_id
 AND d.level = c.level
WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    ((o.status = 'cancelled' OR o.payment_status = 'refunded') AND c.status IN ('pending', 'completed'))
    OR (c.status = 'refunded' AND GREATEST(c.commission_amount - COALESCE(c.reversal_wallet_recovered_amount, 0), 0) > 0)
    OR d.duplicate_count IS NOT NULL
  );

GRANT SELECT ON public.admin_mlm_commission_anomalies TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reverse_mlm_commissions_for_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_mlm_commissions_for_order(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
