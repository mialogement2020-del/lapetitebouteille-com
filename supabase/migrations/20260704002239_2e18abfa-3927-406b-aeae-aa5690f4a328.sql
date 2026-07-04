
-- ============================================================
-- ÉTAPE 1 — Fondations Wallet & Paiements avancés
-- ============================================================

-- 1) WALLET_LEDGER : grand livre immuable
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id BIGSERIAL PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('credit','debit')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XAF',
  balance_after NUMERIC(14,2) NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON public.wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet ON public.wallet_ledger(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_ref ON public.wallet_ledger(reference_type, reference_id);

GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.wallet_ledger_id_seq TO authenticated, service_role;

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ledger"
  ON public.wallet_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2) PAYMENT_INTENTS : suivi unifié des paiements
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','succeeded','failed','cancelled','refunded','partially_refunded')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'XAF',
  external_reference TEXT,
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user ON public.payment_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_order ON public.payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_ref ON public.payment_intents(provider, external_reference);

GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment intents"
  ON public.payment_intents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage payment intents"
  ON public.payment_intents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) PAYMENT_RECONCILIATIONS : rapprochement paiements ↔ commandes
CREATE TABLE IF NOT EXISTS public.payment_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  expected_amount NUMERIC(14,2) NOT NULL,
  received_amount NUMERIC(14,2) NOT NULL,
  variance NUMERIC(14,2) GENERATED ALWAYS AS (received_amount - expected_amount) STORED,
  currency TEXT NOT NULL DEFAULT 'XAF',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','matched','mismatched','manual_review','resolved')),
  reconciled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_recon_order ON public.payment_reconciliations(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_recon_status ON public.payment_reconciliations(status, created_at DESC);

GRANT ALL ON public.payment_reconciliations TO service_role;
GRANT SELECT ON public.payment_reconciliations TO authenticated;

ALTER TABLE public.payment_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reconciliations"
  ON public.payment_reconciliations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_recon_updated_at
  BEFORE UPDATE ON public.payment_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Fonctions atomiques wallet
CREATE OR REPLACE FUNCTION public.wallet_credit(
  _user_id UUID,
  _amount NUMERIC,
  _reason TEXT,
  _reference_type TEXT DEFAULT NULL,
  _reference_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _wallet_id UUID;
  _new_balance NUMERIC;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id) RETURNING id INTO _wallet_id;
  END IF;

  UPDATE public.wallets
    SET balance = COALESCE(balance,0) + _amount,
        total_earned = COALESCE(total_earned,0) + _amount,
        updated_at = now()
    WHERE id = _wallet_id
    RETURNING balance INTO _new_balance;

  INSERT INTO public.wallet_ledger (wallet_id, user_id, entry_type, amount, balance_after, reference_type, reference_id, reason, metadata)
  VALUES (_wallet_id, _user_id, 'credit', _amount, _new_balance, _reference_type, _reference_id, _reason, COALESCE(_metadata,'{}'::jsonb));

  RETURN jsonb_build_object('success', true, 'balance', _new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_debit(
  _user_id UUID,
  _amount NUMERIC,
  _reason TEXT,
  _reference_type TEXT DEFAULT NULL,
  _reference_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _wallet_id UUID;
  _current NUMERIC;
  _new_balance NUMERIC;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  SELECT id, COALESCE(balance,0) INTO _wallet_id, _current
  FROM public.wallets WHERE user_id = _user_id FOR UPDATE;

  IF _wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF _current < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', _current);
  END IF;

  _new_balance := _current - _amount;

  UPDATE public.wallets SET balance = _new_balance, updated_at = now() WHERE id = _wallet_id;

  INSERT INTO public.wallet_ledger (wallet_id, user_id, entry_type, amount, balance_after, reference_type, reference_id, reason, metadata)
  VALUES (_wallet_id, _user_id, 'debit', _amount, _new_balance, _reference_type, _reference_id, _reason, COALESCE(_metadata,'{}'::jsonb));

  RETURN jsonb_build_object('success', true, 'balance', _new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_transfer(
  _from_user UUID,
  _to_user UUID,
  _amount NUMERIC,
  _reason TEXT,
  _reference_type TEXT DEFAULT NULL,
  _reference_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _debit JSONB;
  _credit JSONB;
BEGIN
  IF _from_user = _to_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'Same user transfer not allowed');
  END IF;

  _debit := public.wallet_debit(_from_user, _amount, 'transfer_out: ' || _reason, _reference_type, _reference_id, jsonb_build_object('counterparty', _to_user));
  IF NOT (_debit->>'success')::boolean THEN
    RETURN _debit;
  END IF;

  _credit := public.wallet_credit(_to_user, _amount, 'transfer_in: ' || _reason, _reference_type, _reference_id, jsonb_build_object('counterparty', _from_user));
  IF NOT (_credit->>'success')::boolean THEN
    -- rollback: rare — refund debit
    PERFORM public.wallet_credit(_from_user, _amount, 'transfer_rollback', _reference_type, _reference_id, jsonb_build_object('reason','credit_failed'));
    RETURN _credit;
  END IF;

  RETURN jsonb_build_object('success', true, 'from_balance', _debit->'balance', 'to_balance', _credit->'balance');
END;
$$;
