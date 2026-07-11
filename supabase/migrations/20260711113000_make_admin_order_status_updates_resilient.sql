-- Keep admin order status updates from being blocked by side-effect triggers.
-- This migration does not delete or recalculate data. It makes notification,
-- history, stock restore ledger, and accounting side effects best-effort so the
-- primary order status update can complete.

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        notes
      ) VALUES (
        NEW.id,
        OLD.status::text,
        NEW.status::text,
        auth.uid(),
        NULL
      );
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'Order status history logging failed for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_email text;
  customer_name text;
  function_url text := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-order-status-update';
  push_function_url text := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-order-push-notification';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
  status_label text;
  status_emoji text;
  notif_title text;
  notif_message text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    SELECT email INTO customer_email FROM public.profiles WHERE id = NEW.user_id;
  ELSE
    customer_email := NEW.guest_email;
  END IF;

  customer_name := COALESCE(NEW.shipping_full_name, 'Client');

  CASE NEW.status
    WHEN 'confirmed' THEN
      status_label := 'confirmee';
      status_emoji := '[OK]';
    WHEN 'processing' THEN
      status_label := 'en preparation';
      status_emoji := '[PREP]';
    WHEN 'shipped' THEN
      status_label := 'en cours de livraison';
      status_emoji := '[SHIP]';
    WHEN 'delivered' THEN
      status_label := 'livree';
      status_emoji := '[DONE]';
    WHEN 'cancelled' THEN
      status_label := 'annulee';
      status_emoji := '[CANCEL]';
    ELSE
      status_label := NEW.status::text;
      status_emoji := '[INFO]';
  END CASE;

  notif_title := status_emoji || ' Commande ' || status_label;
  notif_message := 'Votre commande ' || NEW.order_number || ' est maintenant ' || status_label || '.';

  IF NEW.user_id IS NOT NULL AND NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled') THEN
    BEGIN
      INSERT INTO public.user_notifications (
        user_id,
        type,
        title,
        message,
        reference_type,
        reference_id
      ) VALUES (
        NEW.user_id,
        'order_update',
        notif_title,
        notif_message,
        'order',
        NEW.id
      );
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'Order in-app notification insert failed for order %: %', NEW.id, SQLERRM;
    END;

    BEGIN
      PERFORM net.http_post(
        url := push_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object(
          'userId', NEW.user_id,
          'orderNumber', NEW.order_number,
          'status', NEW.status::text,
          'customerName', customer_name
        )::jsonb
      );
    EXCEPTION
      WHEN undefined_function OR invalid_schema_name THEN
        RAISE WARNING 'pg_net is unavailable; skipped order push notification for %', NEW.order_number;
      WHEN others THEN
        RAISE WARNING 'Order push notification failed for %: %', NEW.order_number, SQLERRM;
    END;
  END IF;

  IF customer_email IS NOT NULL
     AND customer_email <> ''
     AND NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled') THEN
    BEGIN
      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object(
          'orderNumber', NEW.order_number,
          'customerName', customer_name,
          'customerEmail', customer_email,
          'customerPhone', COALESCE(NEW.shipping_phone, ''),
          'newStatus', NEW.status::text,
          'shippingCity', COALESCE(NEW.shipping_city, ''),
          'shippingNeighborhood', COALESCE(NEW.shipping_neighborhood, ''),
          'shippingStreet', COALESCE(NEW.shipping_street, ''),
          'total', NEW.total
        )::jsonb
      );
    EXCEPTION
      WHEN undefined_function OR invalid_schema_name THEN
        RAISE WARNING 'pg_net is unavailable; skipped order email notification for %', NEW.order_number;
      WHEN others THEN
        RAISE WARNING 'Order email notification failed for %: %', NEW.order_number, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

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

  BEGIN
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
        'trigger_timing', 'before_update',
        'ledger_mode', 'best_effort'
      )
    );
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'Stock restore ledger logging failed for order %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_on_order_failure ON public.orders;
CREATE TRIGGER trg_restore_stock_on_order_failure
BEFORE UPDATE OF status, payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_restore_stock_on_order_failure();

CREATE OR REPLACE FUNCTION public.refresh_order_accounting_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric := 0;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    IF NEW.payment_status = 'refunded' THEN
      BEGIN
        UPDATE public.orders
        SET refunded_amount = COALESCE(NULLIF(NEW.refunded_amount, 0), NEW.total)
        WHERE id = NEW.id;
      EXCEPTION
        WHEN others THEN
          RAISE WARNING 'Refunded amount refresh failed for order %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  IF NEW.payment_status = 'completed' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    BEGIN
      PERFORM public.log_financial_ledger_entry(
        'payment_captured',
        NEW.total,
        'payment_captured:' || NEW.id::text,
        NEW.id,
        NEW.user_id,
        NULL,
        NULL,
        COALESCE(NEW.currency, 'XAF'),
        NULL,
        NULL,
        NEW.payment_reference,
        auth.uid(),
        jsonb_build_object('payment_method', NEW.payment_method, 'ledger_mode', 'best_effort')
      );
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'Payment capture ledger logging failed for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  IF NEW.payment_status = 'refunded' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    v_delta := COALESCE(NULLIF(NEW.refunded_amount, 0), NEW.total);
    BEGIN
      PERFORM public.log_financial_ledger_entry(
        'refund_recorded',
        v_delta,
        'refund_recorded:' || NEW.id::text,
        NEW.id,
        NEW.user_id,
        NULL,
        NULL,
        COALESCE(NEW.currency, 'XAF'),
        NULL,
        NULL,
        NEW.payment_reference,
        auth.uid(),
        jsonb_build_object('previous_payment_status', OLD.payment_status, 'ledger_mode', 'best_effort')
      );
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'Refund ledger logging failed for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
