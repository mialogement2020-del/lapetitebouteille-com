-- Prevent notification webhooks from blocking order and stock updates.
-- Some deployed functions call extensions.http_post, but this project exposes
-- pg_net as net.http_post. HTTP failures are now logged as warnings instead of
-- aborting the business transaction.

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
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

CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url text := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-low-stock-alert';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
  stock_threshold integer;
  category_threshold integer;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT low_stock_threshold INTO category_threshold
    FROM public.categories
    WHERE id = NEW.category_id;
  END IF;

  stock_threshold := COALESCE(NEW.low_stock_threshold, category_threshold, 5);

  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity
     AND NEW.stock_quantity <= stock_threshold
     AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > stock_threshold) THEN
    BEGIN
      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object(
          'productName', NEW.name,
          'productId', NEW.id,
          'currentStock', NEW.stock_quantity,
          'threshold', stock_threshold,
          'sku', NEW.sku
        )::jsonb
      );
    EXCEPTION
      WHEN undefined_function OR invalid_schema_name THEN
        RAISE WARNING 'pg_net is unavailable; skipped low-stock notification for product %', NEW.id;
      WHEN others THEN
        RAISE WARNING 'Low-stock notification failed for product %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
