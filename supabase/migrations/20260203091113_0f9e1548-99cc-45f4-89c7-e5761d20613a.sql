-- Create function to check and notify low stock
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-low-stock-alert';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
  stock_threshold INTEGER;
BEGIN
  -- Get the threshold (default to 5 if not set)
  stock_threshold := COALESCE(NEW.low_stock_threshold, 5);
  
  -- Only trigger if:
  -- 1. Stock quantity actually changed
  -- 2. New stock is at or below threshold
  -- 3. Old stock was above threshold (to avoid repeated alerts)
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity 
     AND NEW.stock_quantity <= stock_threshold
     AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > stock_threshold) THEN
    
    -- Call the edge function via pg_net
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on products table
DROP TRIGGER IF EXISTS trigger_low_stock_alert ON products;
CREATE TRIGGER trigger_low_stock_alert
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();