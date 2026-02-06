-- =====================================================
-- FIX: Guest Order Data Exposure Vulnerability
-- =====================================================
-- Problem: The current RLS policy "Guests can view their orders by email or phone"
-- allows ANY anonymous user to SELECT all guest orders without credential verification.
-- This exposes customer names, phone numbers, addresses to the public.
--
-- Solution: Remove the permissive policy and create a SECURITY DEFINER function
-- that validates credentials before returning order data.
-- =====================================================

-- 1. Drop the vulnerable policy
DROP POLICY IF EXISTS "Guests can view their orders by email or phone" ON public.orders;

-- 2. Create a secure function to lookup guest orders with credential verification
CREATE OR REPLACE FUNCTION public.lookup_guest_order(
  _order_number TEXT,
  _identifier TEXT,
  _method TEXT DEFAULT 'phone'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
  _order_data JSONB;
  _items_data JSONB;
BEGIN
  -- Validate inputs
  IF _order_number IS NULL OR trim(_order_number) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order number is required');
  END IF;
  
  IF _identifier IS NULL OR trim(_identifier) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contact identifier is required');
  END IF;
  
  -- Sanitize order number (alphanumeric, dash, underscore only)
  IF _order_number !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid order number format');
  END IF;
  
  -- Look up order with credential verification
  -- Only guest orders (user_id IS NULL) can be looked up this way
  IF _method = 'phone' THEN
    SELECT id INTO _order_id
    FROM orders
    WHERE order_number = upper(trim(_order_number))
      AND user_id IS NULL
      AND (
        lower(trim(shipping_phone)) LIKE '%' || lower(trim(_identifier)) || '%'
        OR lower(trim(guest_phone)) LIKE '%' || lower(trim(_identifier)) || '%'
      );
  ELSIF _method = 'email' THEN
    SELECT id INTO _order_id
    FROM orders
    WHERE order_number = upper(trim(_order_number))
      AND user_id IS NULL
      AND lower(trim(guest_email)) LIKE '%' || lower(trim(_identifier)) || '%';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid method. Use phone or email.');
  END IF;
  
  -- If no order found, return error (don't reveal if order exists)
  IF _order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or credentials do not match');
  END IF;
  
  -- Fetch order data (excluding sensitive fields that guest shouldn't see)
  SELECT jsonb_build_object(
    'id', id,
    'order_number', order_number,
    'status', status,
    'total', total,
    'subtotal', subtotal,
    'delivery_fee', delivery_fee,
    'discount_amount', discount_amount,
    'shipping_full_name', shipping_full_name,
    'shipping_city', shipping_city,
    'shipping_neighborhood', shipping_neighborhood,
    'shipping_street', shipping_street,
    'created_at', created_at,
    'payment_method', payment_method,
    'payment_status', payment_status
  ) INTO _order_data
  FROM orders
  WHERE id = _order_id;
  
  -- Fetch order items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'product_name', product_name,
      'quantity', quantity,
      'unit_price', unit_price,
      'product_image', product_image
    )
  ), '[]'::jsonb) INTO _items_data
  FROM order_items
  WHERE order_id = _order_id;
  
  -- Return complete order data
  RETURN jsonb_build_object(
    'success', true,
    'order', _order_data,
    'items', _items_data
  );
END;
$$;

-- 3. Grant execute permission to anonymous users (for guest order tracking)
GRANT EXECUTE ON FUNCTION public.lookup_guest_order(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_guest_order(TEXT, TEXT, TEXT) TO authenticated;

-- 4. Add a comment explaining the security model
COMMENT ON FUNCTION public.lookup_guest_order IS 
'Securely looks up guest orders by verifying order number AND contact credentials. 
This replaces the vulnerable RLS policy that allowed unrestricted access to guest orders.
Uses SECURITY DEFINER to access orders table directly while validating credentials.';