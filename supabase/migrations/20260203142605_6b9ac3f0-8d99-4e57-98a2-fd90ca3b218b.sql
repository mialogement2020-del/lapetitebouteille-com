-- Add low_stock_threshold column to categories table
ALTER TABLE public.categories
ADD COLUMN low_stock_threshold integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.categories.low_stock_threshold IS 'Custom low stock threshold for all products in this category. If NULL, products use their own threshold or the global default.';

-- Update the notify_low_stock function to use category threshold as fallback
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
  category_threshold INTEGER;
BEGIN
  -- Get category threshold if product has a category
  IF NEW.category_id IS NOT NULL THEN
    SELECT low_stock_threshold INTO category_threshold
    FROM public.categories
    WHERE id = NEW.category_id;
  END IF;
  
  -- Priority: product threshold > category threshold > default (5)
  stock_threshold := COALESCE(NEW.low_stock_threshold, category_threshold, 5);
  
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