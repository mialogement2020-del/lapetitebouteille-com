-- ============================================================
-- SECURITY FIX: Function search_path hardening
-- ============================================================

-- Fix 1: notify_order_status_change - remove 'extensions' from search_path
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_email TEXT;
  customer_name TEXT;
  function_url TEXT;
  push_function_url TEXT;
  anon_key TEXT;
  status_label TEXT;
  status_emoji TEXT;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get Supabase config
    function_url := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-order-status-update';
    push_function_url := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-order-push-notification';
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';

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
      
      -- Send push notification to user
      PERFORM extensions.http_post(
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
        PERFORM extensions.http_post(
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
$$;

-- Fix 2: notify_low_stock - remove 'net' and 'extensions' from search_path
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url TEXT;
  anon_key TEXT;
  stock_threshold INTEGER;
  category_threshold INTEGER;
BEGIN
  function_url := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-low-stock-alert';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';

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
    
    -- Call the edge function via pg_net (using fully qualified name)
    PERFORM extensions.http_post(
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
$$;

-- Fix 3: increment_asset_download - add search_path
CREATE OR REPLACE FUNCTION public.increment_asset_download(asset_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shareable_assets 
  SET download_count = download_count + 1 
  WHERE id = asset_uuid;
END;
$$;

-- Fix 4: update_updated_at_column - add search_path (not SECURITY DEFINER, just basic trigger)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- SECURITY FIX: Reviews table - block direct anonymous access
-- Force use of reviews_public view which excludes user_id
-- ============================================================

-- Drop existing anonymous SELECT policy on reviews
DROP POLICY IF EXISTS "Anonymous can view approved reviews" ON public.reviews;

-- Create restrictive policy that blocks all direct anonymous SELECT
-- Anonymous users must use the reviews_public view instead
CREATE POLICY "Deny anonymous direct review access"
ON public.reviews
FOR SELECT
TO anon
USING (false);

-- Verify reviews_public view exists and is properly configured
-- (This view was created in earlier migration with security_invoker=on and excludes user_id)
-- Re-create to ensure it's correctly configured
DROP VIEW IF EXISTS public.reviews_public;

CREATE VIEW public.reviews_public
WITH (security_invoker = on)
AS
  SELECT 
    id,
    product_id,
    rating,
    title,
    comment,
    is_approved,
    is_verified_purchase,
    created_at,
    updated_at
    -- user_id is intentionally excluded for privacy
  FROM public.reviews
  WHERE is_approved = true;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.reviews_public TO anon;
GRANT SELECT ON public.reviews_public TO authenticated;