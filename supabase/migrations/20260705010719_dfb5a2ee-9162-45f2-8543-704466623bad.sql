
-- ========== TABLE ==========
CREATE TABLE public.order_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XAF',
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','captured','refunded','partially_refunded','cancelled')),
  captured_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (captured_amount >= 0),
  refunded_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  hold_reason TEXT,
  release_reason TEXT,
  held_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_escrows_order ON public.order_escrows(order_id);
CREATE INDEX idx_order_escrows_buyer ON public.order_escrows(buyer_id);
CREATE INDEX idx_order_escrows_seller ON public.order_escrows(seller_id);
CREATE INDEX idx_order_escrows_status ON public.order_escrows(status);

-- ========== GRANTS ==========
GRANT SELECT ON public.order_escrows TO authenticated;
GRANT ALL ON public.order_escrows TO service_role;

-- ========== RLS ==========
ALTER TABLE public.order_escrows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own escrows"
  ON public.order_escrows FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers view own escrows"
  ON public.order_escrows FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins full access escrows"
  ON public.order_escrows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== TRIGGER updated_at ==========
CREATE TRIGGER update_order_escrows_updated_at
  BEFORE UPDATE ON public.order_escrows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== RPC: escrow_hold ==========
CREATE OR REPLACE FUNCTION public.escrow_hold(
  _order_id UUID,
  _buyer_id UUID,
  _seller_id UUID,
  _amount NUMERIC,
  _currency TEXT DEFAULT 'XAF',
  _reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _escrow_id UUID;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Debit buyer wallet into escrow
  PERFORM public.wallet_debit(
    _buyer_id,
    _amount,
    'escrow_hold',
    _order_id,
    COALESCE(_reason, 'Escrow hold for order')
  );

  INSERT INTO public.order_escrows (
    order_id, buyer_id, seller_id, amount, currency, status, hold_reason
  ) VALUES (
    _order_id, _buyer_id, _seller_id, _amount, _currency, 'held', _reason
  ) RETURNING id INTO _escrow_id;

  RETURN _escrow_id;
END;
$$;

-- ========== RPC: escrow_capture ==========
CREATE OR REPLACE FUNCTION public.escrow_capture(
  _escrow_id UUID,
  _amount NUMERIC DEFAULT NULL,
  _reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _escrow public.order_escrows%ROWTYPE;
  _capture_amount NUMERIC;
  _remaining NUMERIC;
BEGIN
  SELECT * INTO _escrow FROM public.order_escrows WHERE id = _escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF _escrow.status NOT IN ('held','partially_refunded') THEN
    RAISE EXCEPTION 'Escrow not capturable (status=%)', _escrow.status;
  END IF;

  _remaining := _escrow.amount - _escrow.captured_amount - _escrow.refunded_amount;
  _capture_amount := COALESCE(_amount, _remaining);

  IF _capture_amount <= 0 OR _capture_amount > _remaining THEN
    RAISE EXCEPTION 'Invalid capture amount';
  END IF;

  IF _escrow.seller_id IS NOT NULL THEN
    PERFORM public.wallet_credit(
      _escrow.seller_id,
      _capture_amount,
      'escrow_capture',
      _escrow.order_id,
      COALESCE(_reason, 'Escrow release to seller')
    );
  END IF;

  UPDATE public.order_escrows SET
    captured_amount = captured_amount + _capture_amount,
    status = CASE
      WHEN (captured_amount + _capture_amount + refunded_amount) >= amount THEN 'captured'
      ELSE status
    END,
    captured_at = COALESCE(captured_at, now()),
    release_reason = COALESCE(_reason, release_reason)
  WHERE id = _escrow_id;

  RETURN jsonb_build_object('escrow_id', _escrow_id, 'captured', _capture_amount);
END;
$$;

-- ========== RPC: escrow_refund ==========
CREATE OR REPLACE FUNCTION public.escrow_refund(
  _escrow_id UUID,
  _amount NUMERIC DEFAULT NULL,
  _reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _escrow public.order_escrows%ROWTYPE;
  _refund_amount NUMERIC;
  _remaining NUMERIC;
BEGIN
  SELECT * INTO _escrow FROM public.order_escrows WHERE id = _escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF _escrow.status NOT IN ('held','partially_refunded','captured') THEN
    RAISE EXCEPTION 'Escrow not refundable (status=%)', _escrow.status;
  END IF;

  _remaining := _escrow.amount - _escrow.captured_amount - _escrow.refunded_amount;
  _refund_amount := COALESCE(_amount, _remaining);

  IF _refund_amount <= 0 OR _refund_amount > _remaining THEN
    RAISE EXCEPTION 'Invalid refund amount';
  END IF;

  PERFORM public.wallet_credit(
    _escrow.buyer_id,
    _refund_amount,
    'escrow_refund',
    _escrow.order_id,
    COALESCE(_reason, 'Escrow refund to buyer')
  );

  UPDATE public.order_escrows SET
    refunded_amount = refunded_amount + _refund_amount,
    status = CASE
      WHEN (refunded_amount + _refund_amount) >= (amount - captured_amount) THEN 'refunded'
      ELSE 'partially_refunded'
    END,
    refunded_at = COALESCE(refunded_at, now()),
    release_reason = COALESCE(_reason, release_reason)
  WHERE id = _escrow_id;

  RETURN jsonb_build_object('escrow_id', _escrow_id, 'refunded', _refund_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.escrow_hold(UUID,UUID,UUID,NUMERIC,TEXT,TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escrow_capture(UUID,NUMERIC,TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escrow_refund(UUID,NUMERIC,TEXT) TO authenticated, service_role;
