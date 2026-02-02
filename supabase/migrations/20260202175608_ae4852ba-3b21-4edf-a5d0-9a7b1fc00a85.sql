-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send status update email via edge function
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  customer_email TEXT;
  function_url TEXT;
  anon_key TEXT;
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
      -- Get Supabase URL and anon key from environment
      function_url := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-order-status-update';
      anon_key := current_setting('app.settings.supabase_anon_key', true);
      
      -- If anon_key not set in config, use a fallback approach
      IF anon_key IS NULL OR anon_key = '' THEN
        anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
      END IF;
      
      -- Call the edge function via pg_net
      PERFORM extensions.http_post(
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
          'newStatus', NEW.status,
          'shippingCity', COALESCE(NEW.shipping_city, ''),
          'shippingNeighborhood', COALESCE(NEW.shipping_neighborhood, ''),
          'shippingStreet', COALESCE(NEW.shipping_street, ''),
          'total', NEW.total
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();