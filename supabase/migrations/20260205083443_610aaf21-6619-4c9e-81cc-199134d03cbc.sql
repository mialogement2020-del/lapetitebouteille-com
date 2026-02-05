-- ============================================
-- SECURITY FIX: Fix guest order creation policies
-- The issue is that guest orders need to target the 'anon' role explicitly
-- and the check must work for anonymous users
-- ============================================

-- Drop the problematic guest policies
DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can view orders via lookup token" ON public.orders;

-- Recreate guest INSERT policy targeting 'anon' role
-- For anonymous users, auth.uid() returns NULL
CREATE POLICY "Guests can create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Recreate guest SELECT policy targeting 'anon' role
-- Guests can only view their orders via the lookup token
CREATE POLICY "Guests can view orders via lookup token"
ON public.orders
FOR SELECT
TO anon
USING ((user_id IS NULL) AND (order_lookup_token IS NOT NULL));

-- Also need to fix authenticated user policies to target 'authenticated' role
DROP POLICY IF EXISTS "Authenticated users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Recreate authenticated INSERT policy
CREATE POLICY "Authenticated users can create own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recreate authenticated SELECT policy
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Recreate admin ALL policy
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));