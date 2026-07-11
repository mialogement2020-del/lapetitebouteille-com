-- Restore reserved stock exactly once when an order is cancelled or a payment fails.
-- Additive migration: no data deletion and no recalculation of historical orders.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS stock_restore_reason text;

CREATE OR REPLACE FUNCTION public.restore_order_stock_once(
  _order_id uuid,
  _reason text DEFAULT 'order_cancelled_or_payment_failed'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_restored_count integer := 0;
  v_restored_units integer := 0;
BEGIN
  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.stock_restored_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_restored', true,
      'restored_at', v_order.stock_restored_at
    );
  END IF;

  UPDATE public.products p
  SET
    stock_quantity = COALESCE(p.stock_quantity, 0) + oi.quantity,
    updated_at = now()
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id
    AND oi.product_id = p.id
    AND oi.product_id IS NOT NULL;

  GET DIAGNOSTICS v_restored_count = ROW_COUNT;

  SELECT COALESCE(SUM(quantity), 0)
    INTO v_restored_units
  FROM public.order_items
  WHERE order_id = v_order.id
    AND product_id IS NOT NULL;

  UPDATE public.orders
  SET
    stock_restored_at = now(),
    stock_restore_reason = COALESCE(NULLIF(_reason, ''), 'order_cancelled_or_payment_failed'),
    updated_at = now()
  WHERE id = v_order.id
    AND stock_restored_at IS NULL;

  PERFORM public.log_financial_ledger_entry(
    'stock_restored',
    0,
    'stock_restored:' || v_order.id::text,
    v_order.id,
    v_order.user_id,
    NULL,
    NULL,
    COALESCE(v_order.currency, 'XAF'),
    NULL,
    NULL,
    v_order.payment_reference,
    auth.uid(),
    jsonb_build_object(
      'reason', COALESCE(NULLIF(_reason, ''), 'order_cancelled_or_payment_failed'),
      'restored_product_rows', v_restored_count,
      'restored_units', v_restored_units
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_restored', false,
    'restored_product_rows', v_restored_count,
    'restored_units', v_restored_units
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_restore_stock_on_order_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.stock_restored_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.restore_order_stock_once(NEW.id, 'order_cancelled');
  ELSIF NEW.payment_status = 'failed'
     AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    PERFORM public.restore_order_stock_once(NEW.id, 'payment_failed');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_on_order_failure ON public.orders;
CREATE TRIGGER trg_restore_stock_on_order_failure
AFTER UPDATE OF status, payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_restore_stock_on_order_failure();

REVOKE ALL ON FUNCTION public.restore_order_stock_once(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_order_stock_once(uuid,text) TO service_role;

NOTIFY pgrst, 'reload schema';
