-- Finance / MLM P0-P1 hardening.
-- Additive migration: no destructive deletes, keeps existing checkout flow intact.

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS pending_withdrawal_balance numeric(14,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallets_pending_withdrawal_balance_non_negative'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT wallets_pending_withdrawal_balance_non_negative
      CHECK (pending_withdrawal_balance >= 0);
  END IF;
END $$;

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS dedupe_key text;

WITH ranked AS (
  SELECT
    id,
    order_id,
    beneficiary_id,
    level,
    row_number() OVER (
      PARTITION BY order_id, beneficiary_id, level
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.commissions
  WHERE order_id IS NOT NULL
)
UPDATE public.commissions c
SET dedupe_key = CASE
  WHEN ranked.rn = 1 THEN ranked.order_id::text || ':' || ranked.beneficiary_id::text || ':' || ranked.level::text
  ELSE NULL
END
FROM ranked
WHERE c.id = ranked.id
  AND c.dedupe_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commissions_order_beneficiary_level_unique
  ON public.commissions (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE OR REPLACE VIEW public.public_products AS
SELECT
  id,
  name,
  slug,
  description,
  short_description,
  category_id,
  price,
  original_price,
  stock_quantity,
  is_active,
  is_featured,
  alcohol_percentage,
  volume_ml,
  origin_country,
  region,
  grape_variety,
  vintage_year,
  tasting_notes,
  food_pairing,
  serving_temperature,
  image_url,
  gallery_urls,
  average_rating,
  review_count,
  created_at,
  points_tiers_override,
  available_as_case,
  units_per_case,
  case_price
FROM public.products
WHERE is_active = true;

GRANT SELECT ON public.public_products TO anon, authenticated;
REVOKE SELECT (purchase_price, markup_percent_override, points_override) ON public.products FROM anon;

DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users request withdrawals through RPC only" ON public.withdrawal_requests;
CREATE POLICY "Users request withdrawals through RPC only"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric,
  _phone_number text,
  _payment_method public.payment_method
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet public.wallets%ROWTYPE;
  v_withdrawal_id uuid;
  v_phone text := NULLIF(regexp_replace(COALESCE(_phone_number, ''), '[^0-9+]', '', 'g'), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _payment_method NOT IN ('mtn_money', 'orange_money') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  IF _amount IS NULL OR _amount < 5000 OR _amount > 500000 THEN
    RAISE EXCEPTION 'invalid_withdrawal_amount';
  END IF;

  IF v_phone IS NULL OR length(v_phone) < 9 OR length(v_phone) > 15 THEN
    RAISE EXCEPTION 'invalid_phone_number';
  END IF;

  SELECT *
    INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  IF COALESCE(v_wallet.balance, 0) < _amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.wallets
  SET
    balance = COALESCE(balance, 0) - _amount,
    pending_withdrawal_balance = COALESCE(pending_withdrawal_balance, 0) + _amount,
    updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.withdrawal_requests (
    user_id,
    wallet_id,
    amount,
    payment_method,
    phone_number,
    status
  ) VALUES (
    v_user_id,
    v_wallet.id,
    _amount,
    _payment_method,
    v_phone,
    'pending'
  )
  RETURNING id INTO v_withdrawal_id;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'reserved_amount', _amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_withdrawal_request(
  _withdrawal_id uuid,
  _action text,
  _reason text DEFAULT NULL,
  _transaction_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_withdrawal public.withdrawal_requests%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_status public.withdrawal_status;
  v_reserved boolean;
BEGIN
  IF NOT public.has_role(v_admin_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _action NOT IN ('approve', 'complete', 'reject') THEN
    RAISE EXCEPTION 'invalid_withdrawal_action';
  END IF;

  SELECT *
    INTO v_withdrawal
  FROM public.withdrawal_requests
  WHERE id = _withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'withdrawal_not_found';
  END IF;

  IF v_withdrawal.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_already_processed');
  END IF;

  SELECT *
    INTO v_wallet
  FROM public.wallets
  WHERE id = v_withdrawal.wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  v_reserved := COALESCE(v_wallet.pending_withdrawal_balance, 0) >= v_withdrawal.amount;

  IF _action IN ('approve', 'complete') THEN
    v_status := 'completed';
    IF NOT v_reserved AND COALESCE(v_wallet.balance, 0) < v_withdrawal.amount THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;
  ELSE
    v_status := 'rejected';
  END IF;

  UPDATE public.withdrawal_requests
  SET
    status = v_status,
    processed_by = v_admin_id,
    processed_at = now(),
    rejection_reason = CASE WHEN v_status = 'rejected' THEN NULLIF(_reason, '') ELSE rejection_reason END,
    transaction_reference = COALESCE(NULLIF(_transaction_reference, ''), transaction_reference),
    updated_at = now()
  WHERE id = v_withdrawal.id;

  RETURN jsonb_build_object('success', true, 'status', v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_withdrawal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_reserved boolean;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO v_wallet
  FROM public.wallets
  WHERE id = NEW.wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  v_reserved := COALESCE(v_wallet.pending_withdrawal_balance, 0) >= NEW.amount;

  IF NEW.status = 'completed' THEN
    IF v_reserved THEN
      UPDATE public.wallets
      SET
        pending_withdrawal_balance = pending_withdrawal_balance - NEW.amount,
        total_withdrawn = COALESCE(total_withdrawn, 0) + NEW.amount,
        updated_at = now()
      WHERE id = v_wallet.id;
    ELSE
      IF COALESCE(v_wallet.balance, 0) < NEW.amount THEN
        RAISE EXCEPTION 'insufficient_balance';
      END IF;

      UPDATE public.wallets
      SET
        balance = balance - NEW.amount,
        total_withdrawn = COALESCE(total_withdrawn, 0) + NEW.amount,
        updated_at = now()
      WHERE id = v_wallet.id;
    END IF;

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
      NEW.wallet_id,
      NEW.user_id,
      'withdrawal',
      NEW.amount,
      CASE WHEN v_reserved THEN v_wallet.balance ELSE v_wallet.balance - NEW.amount END,
      'withdrawal',
      NEW.id,
      format('Retrait validé via %s - %s', NEW.payment_method, NEW.phone_number)
    );

    NEW.processed_by := COALESCE(NEW.processed_by, auth.uid());
    NEW.processed_at := COALESCE(NEW.processed_at, now());
  ELSIF NEW.status = 'rejected' THEN
    IF v_reserved THEN
      UPDATE public.wallets
      SET
        balance = balance + NEW.amount,
        pending_withdrawal_balance = pending_withdrawal_balance - NEW.amount,
        updated_at = now()
      WHERE id = v_wallet.id;
    END IF;

    NEW.processed_by := COALESCE(NEW.processed_by, auth.uid());
    NEW.processed_at := COALESCE(NEW.processed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawal_status_change_trigger ON public.withdrawal_requests;
CREATE TRIGGER withdrawal_status_change_trigger
BEFORE UPDATE OF status ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_withdrawal_status_change();

CREATE OR REPLACE FUNCTION public.generate_mlm_commissions(
  _order_id uuid,
  _referrer_id uuid DEFAULT NULL,
  _order_total numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_current_referrer_id uuid;
  v_current_level integer := 1;
  v_commission_rate numeric;
  v_bonus_rate numeric;
  v_commission_amount numeric;
  v_commissions_created jsonb := '[]'::jsonb;
  v_wallet_id uuid;
  v_new_pending numeric;
  v_has_qualifying_purchase boolean;
  v_dedupe_key text;
BEGIN
  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.status = 'cancelled' OR v_order.payment_status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_commissionable');
  END IF;

  v_current_referrer_id := COALESCE(_referrer_id, v_order.referrer_id);

  WHILE v_current_level <= 3 AND v_current_referrer_id IS NOT NULL LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.user_id = v_current_referrer_id
        AND o.status <> 'cancelled'
        AND o.payment_status = 'completed'
        AND o.total >= 10000
    ) INTO v_has_qualifying_purchase;

    IF v_has_qualifying_purchase THEN
      SELECT rate_percentage
        INTO v_commission_rate
      FROM public.commission_rates
      WHERE level = v_current_level
        AND is_active = true;

      IF v_commission_rate IS NOT NULL THEN
        SELECT rc.bonus_percentage
          INTO v_bonus_rate
        FROM public.user_ranks ur
        JOIN public.rank_config rc ON rc.rank = ur.current_rank
        WHERE ur.user_id = v_current_referrer_id;

        v_bonus_rate := COALESCE(v_bonus_rate, 0);
        v_commission_amount := (COALESCE(_order_total, v_order.total) * (v_commission_rate + v_bonus_rate)) / 100;
        v_dedupe_key := _order_id::text || ':' || v_current_referrer_id::text || ':' || v_current_level::text;

        INSERT INTO public.commissions (
          beneficiary_id,
          order_id,
          purchaser_id,
          order_amount,
          commission_rate,
          bonus_rate,
          commission_amount,
          level,
          status,
          dedupe_key
        ) VALUES (
          v_current_referrer_id,
          _order_id,
          v_order.user_id,
          COALESCE(_order_total, v_order.total),
          v_commission_rate,
          v_bonus_rate,
          v_commission_amount,
          v_current_level,
          'pending',
          v_dedupe_key
        )
        ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

        IF FOUND THEN
          UPDATE public.wallets
          SET
            pending_balance = COALESCE(pending_balance, 0) + v_commission_amount,
            updated_at = now()
          WHERE user_id = v_current_referrer_id
          RETURNING id, pending_balance INTO v_wallet_id, v_new_pending;

          IF FOUND THEN
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
              v_wallet_id,
              v_current_referrer_id,
              'commission',
              v_commission_amount,
              v_new_pending,
              'order',
              _order_id,
              format('Commission niveau %s (%s%%)', v_current_level, v_commission_rate + v_bonus_rate)
            );
          END IF;

          v_commissions_created := v_commissions_created || jsonb_build_object(
            'beneficiary_id', v_current_referrer_id,
            'level', v_current_level,
            'amount', v_commission_amount,
            'rate', v_commission_rate,
            'bonus', v_bonus_rate
          );
        END IF;
      END IF;
    END IF;

    SELECT referrer_id
      INTO v_current_referrer_id
    FROM public.referral_relationships
    WHERE referred_id = v_current_referrer_id
      AND level = 1;

    v_current_level := v_current_level + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'commissions', v_commissions_created);
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_mlm_commissions_for_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_reversed_count integer := 0;
BEGIN
  FOR r IN
    SELECT *
    FROM public.commissions
    WHERE order_id = _order_id
      AND status = 'pending'
    FOR UPDATE
  LOOP
    UPDATE public.wallets
    SET
      pending_balance = GREATEST(COALESCE(pending_balance, 0) - r.commission_amount, 0),
      updated_at = now()
    WHERE user_id = r.beneficiary_id;

    UPDATE public.commissions
    SET status = 'refunded'
    WHERE id = r.id;

    v_reversed_count := v_reversed_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'reversed', v_reversed_count);
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
    PERFORM public.generate_mlm_commissions(NEW.id, NEW.referrer_id, NEW.total);
  END IF;

  IF (NEW.payment_status = 'refunded' OR NEW.status = 'cancelled')
     AND (TG_OP = 'UPDATE')
     AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.reverse_mlm_commissions_for_order(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_commissions_on_paid_order ON public.orders;
CREATE TRIGGER trg_generate_commissions_on_paid_order
AFTER INSERT OR UPDATE OF payment_status, status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_generate_commissions_on_paid_order();

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric,text,public.payment_method) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric,text,public.payment_method) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.process_withdrawal_request(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_withdrawal_request(uuid,text,text,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_mlm_commissions(uuid,uuid,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_mlm_commissions_for_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_mlm_commissions(uuid,uuid,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_mlm_commissions_for_order(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.capture_escrow(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_escrow(uuid,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_escrow(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_escrow(uuid,numeric,text) TO service_role;

NOTIFY pgrst, 'reload schema';
