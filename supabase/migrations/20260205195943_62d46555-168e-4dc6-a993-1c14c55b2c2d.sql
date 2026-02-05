-- ============================================
-- FIX: Ensure guest order policies are PERMISSIVE
-- Drop and recreate with explicit PERMISSIVE mode
-- ============================================

-- Drop existing guest INSERT policy
DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;

-- Recreate as PERMISSIVE (default but explicit)
CREATE POLICY "Guests can create orders"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Also ensure order_items guest policy is PERMISSIVE
DROP POLICY IF EXISTS "Guests can create order items" ON public.order_items;

CREATE POLICY "Guests can create order items"
ON public.order_items
AS PERMISSIVE
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id IS NULL
  )
);