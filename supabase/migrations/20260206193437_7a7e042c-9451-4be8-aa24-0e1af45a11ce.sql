
-- Modifier le trigger notify_order_status_change pour ajouter notifications in-app et push
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  customer_email TEXT;
  customer_name TEXT;
  function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-order-status-update';
  push_function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-order-push-notification';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
  status_label TEXT;
  status_emoji TEXT;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get customer email (from profiles or guest_email)
    IF NEW.user_id IS NOT NULL THEN
      SELECT email INTO customer_email FROM public.profiles WHERE id = NEW.user_id;
    ELSE
      customer_email := NEW.guest_email;
    END IF;
    
    customer_name := COALESCE(NEW.shipping_full_name, 'Client');
    
    -- Set status labels and emojis
    CASE NEW.status
      WHEN 'confirmed' THEN
        status_label := 'confirmée';
        status_emoji := '✅';
      WHEN 'processing' THEN
        status_label := 'en préparation';
        status_emoji := '📦';
      WHEN 'shipped' THEN
        status_label := 'en cours de livraison';
        status_emoji := '🚚';
      WHEN 'delivered' THEN
        status_label := 'livrée';
        status_emoji := '🎉';
      WHEN 'cancelled' THEN
        status_label := 'annulée';
        status_emoji := '❌';
      ELSE
        status_label := NEW.status::text;
        status_emoji := '📋';
    END CASE;
    
    notif_title := status_emoji || ' Commande ' || status_label;
    notif_message := 'Votre commande ' || NEW.order_number || ' est maintenant ' || status_label || '.';
    
    -- Create in-app notification for authenticated users
    IF NEW.user_id IS NOT NULL AND NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled') THEN
      INSERT INTO user_notifications (
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
        NEW.id::text
      );
      
      -- Send push notification to user
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
    END IF;
    
    -- Send email notification if email available
    IF customer_email IS NOT NULL AND customer_email != '' THEN
      IF NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled') THEN
        -- Call the email edge function via pg_net
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
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ajouter un commentaire explicatif
COMMENT ON FUNCTION public.notify_order_status_change IS 'Envoie des notifications multicanales (in-app, push, email) lors des changements de statut de commande.';
