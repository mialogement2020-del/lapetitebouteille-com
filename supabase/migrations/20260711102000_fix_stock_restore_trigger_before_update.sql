-- Make stock restoration safe for direct admin status updates.
-- The previous AFTER UPDATE trigger updated the same order row again to mark
-- stock_restored_at. This version marks the order in BEFORE UPDATE and restores
-- products in the same transaction, avoiding recursive order updates.

CREATE OR REPLACE FUNCTION public.trg_restore_stock_on_order_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restored_count integer := 0;
  v_restored_units integer := 0;
  v_reason text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(OLD.stock_restored_at, NEW.stock_restored_at) IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_reason := 'order_cancelled';
  ELSIF NEW.payment_status = 'failed'
     AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    v_reason := 'payment_failed';
  ELSE
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(quantity), 0)
    INTO v_restored_units
  FROM public.order_items
  WHERE order_id = NEW.id
    AND product_id IS NOT NULL;

  UPDATE public.products p
  SET
    stock_quantity = COALESCE(p.stock_quantity, 0) + oi.quantity,
    updated_at = now()
  FROM public.order_items oi
  WHERE oi.order_id = NEW.id
    AND oi.product_id = p.id
    AND oi.product_id IS NOT NULL;

  GET DIAGNOSTICS v_restored_count = ROW_COUNT;

  NEW.stock_restored_at := now();
  NEW.stock_restore_reason := v_reason;

  PERFORM public.log_financial_ledger_entry(
    'stock_restored',
    0,
    'stock_restored:' || NEW.id::text,
    NEW.id,
    NEW.user_id,
    NULL,
    NULL,
    COALESCE(NEW.currency, 'XAF'),
    NULL,
    NULL,
    NEW.payment_reference,
    auth.uid(),
    jsonb_build_object(
      'reason', v_reason,
      'restored_product_rows', v_restored_count,
      'restored_units', v_restored_units,
      'trigger_timing', 'before_update'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_on_order_failure ON public.orders;
CREATE TRIGGER trg_restore_stock_on_order_failure
BEFORE UPDATE OF status, payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_restore_stock_on_order_failure();

NOTIFY pgrst, 'reload schema';
