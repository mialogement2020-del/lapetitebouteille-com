-- Finance/MLM P2: separate withdrawal approval from payout completion.
-- Non-destructive migration: keeps existing completed/rejected withdrawals unchanged.

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

  IF _action = 'approve' AND v_withdrawal.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_pending');
  END IF;

  IF _action = 'complete' AND v_withdrawal.status NOT IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_payable');
  END IF;

  IF _action = 'reject' AND v_withdrawal.status NOT IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_already_processed');
  END IF;

  IF _action = 'complete' AND NULLIF(trim(COALESCE(_transaction_reference, '')), '') IS NULL THEN
    RAISE EXCEPTION 'missing_transaction_reference';
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
    IF NOT v_reserved AND COALESCE(v_wallet.balance, 0) < v_withdrawal.amount THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;
  END IF;

  v_status := CASE
    WHEN _action = 'approve' THEN 'approved'::public.withdrawal_status
    WHEN _action = 'complete' THEN 'completed'::public.withdrawal_status
    ELSE 'rejected'::public.withdrawal_status
  END;

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

  IF OLD.status NOT IN ('pending', 'approved') THEN
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

  IF NEW.status = 'approved' THEN
    NEW.processed_by := COALESCE(NEW.processed_by, auth.uid());
    NEW.processed_at := COALESCE(NEW.processed_at, now());
    RETURN NEW;
  END IF;

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
      format('Retrait payé via %s - %s - ref %s', NEW.payment_method, NEW.phone_number, COALESCE(NEW.transaction_reference, 'n/a'))
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

REVOKE ALL ON FUNCTION public.process_withdrawal_request(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_withdrawal_request(uuid,text,text,text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
