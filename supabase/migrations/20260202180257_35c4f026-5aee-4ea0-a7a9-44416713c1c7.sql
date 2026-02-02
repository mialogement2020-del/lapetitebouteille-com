-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
DROP FUNCTION IF EXISTS public.notify_order_status_change();

-- Recreate the function with correct pg_net syntax
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $$
DECLARE
  customer_email TEXT;
  function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-order-status-update';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get customer email (from profiles or guest_email)
    IF NEW.user_id IS NOT NULL THEN
      SELECT email INTO customer_email FROM public.profiles WHERE id = NEW.user_id;
    ELSE
      customer_email := NEW.guest_email;
    END IF;
    
    -- Skip if no email available
    IF customer_email IS NULL OR customer_email = '' THEN
      RETURN NEW;
    END IF;
    
    -- Only send for specific status changes
    IF NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled') THEN
      -- Call the edge function via net.http_post (pg_net extension)
      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object(
          'orderNumber', NEW.order_number,
          'customerName', COALESCE(NEW.shipping_full_name, 'Client'),
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
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();