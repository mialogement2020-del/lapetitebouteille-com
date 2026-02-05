-- ============================================
-- SECURITY FIX: Fix guest orders and order_items RLS policies
-- All policies must target explicit roles (anon/authenticated)
-- ============================================

-- ===========================================
-- FIX ORDERS TABLE FOR GUEST CHECKOUT
-- ===========================================

-- Drop existing guest policies on orders
DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can view their orders via token" ON public.orders;

-- Recreate guest INSERT policy targeting 'anon' role
CREATE POLICY "Guests can create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Recreate guest SELECT policy targeting 'anon' role
CREATE POLICY "Guests can view their orders via token"
ON public.orders
FOR SELECT
TO anon
USING (
  user_id IS NULL 
  AND order_lookup_token IS NOT NULL
);

-- ===========================================
-- FIX OTHER TABLES: Migrate from 'public' to explicit roles
-- ===========================================

-- CATEGORIES: Fix public role policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;

CREATE POLICY "Categories viewable by anon"
ON public.categories
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Categories viewable by authenticated"
ON public.categories
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- PRODUCTS: Fix public role policies
DROP POLICY IF EXISTS "Active products are viewable by everyone" ON public.products;

CREATE POLICY "Products viewable by anon"
ON public.products
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Products viewable by authenticated"
ON public.products
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- PROMO_CODES: Fix public role policies
DROP POLICY IF EXISTS "Active promo codes can be validated" ON public.promo_codes;

CREATE POLICY "Promo codes viewable by anon"
ON public.promo_codes
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Promo codes viewable by authenticated"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- REVIEWS: Fix public role policies
DROP POLICY IF EXISTS "Approved reviews are viewable by everyone" ON public.reviews;

CREATE POLICY "Reviews viewable by anon"
ON public.reviews
FOR SELECT
TO anon
USING (is_approved = true);

CREATE POLICY "Reviews viewable by authenticated"
ON public.reviews
FOR SELECT
TO authenticated
USING (is_approved = true OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- COMMISSION_RATES: Fix public role policies
DROP POLICY IF EXISTS "Commission rates are viewable by everyone" ON public.commission_rates;

CREATE POLICY "Commission rates viewable by anon"
ON public.commission_rates
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Commission rates viewable by authenticated"
ON public.commission_rates
FOR SELECT
TO authenticated
USING (true);

-- RANK_CONFIG: Fix public role policies
DROP POLICY IF EXISTS "Rank config is viewable by everyone" ON public.rank_config;

CREATE POLICY "Rank config viewable by anon"
ON public.rank_config
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Rank config viewable by authenticated"
ON public.rank_config
FOR SELECT
TO authenticated
USING (true);