-- ============================================
-- SECURITY FIX: Fix guest order_items creation policies
-- Guest policies must target 'anon' role explicitly
-- ============================================

-- Drop existing guest policies
DROP POLICY IF EXISTS "Guests can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Guests can view order items via order lookup" ON public.order_items;

-- Recreate guest INSERT policy targeting 'anon' role
CREATE POLICY "Guests can create order items"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id IS NULL
  )
);

-- Recreate guest SELECT policy targeting 'anon' role
CREATE POLICY "Guests can view order items via order lookup"
ON public.order_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id IS NULL
    AND orders.order_lookup_token IS NOT NULL
  )
);

-- Also update authenticated user policies to target 'authenticated' role
DROP POLICY IF EXISTS "Users can create order items for own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;

-- Recreate authenticated INSERT policy
CREATE POLICY "Users can create order items for own orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Recreate authenticated SELECT policy
CREATE POLICY "Users can view their order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Recreate admin ALL policy
CREATE POLICY "Admins can manage order items"
ON public.order_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));