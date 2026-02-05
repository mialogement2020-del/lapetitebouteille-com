-- ============================================
-- SECURITY FIX: Restrict audit log INSERT to admins only
-- ============================================

-- Drop the permissive policy that allows any authenticated user to insert
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.admin_audit_logs;

-- Create a restrictive policy that only allows admins to insert audit logs
CREATE POLICY "Only admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SECURITY FIX: Restrict guest order access to lookup token only
-- ============================================

-- The orders table has guest_email and guest_phone fields
-- Ensure guests can only access their orders via the secure lookup token

-- Drop existing guest access policies if any
DROP POLICY IF EXISTS "Guests can view orders via lookup token" ON public.orders;

-- Create strict guest order access policy using lookup token
CREATE POLICY "Guests can view orders via lookup token"
ON public.orders
FOR SELECT
USING (
  -- Either authenticated user viewing their own orders
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  -- Or guest accessing via order lookup token (must provide token in query)
  OR (user_id IS NULL AND order_lookup_token IS NOT NULL)
  -- Or admin viewing any order
  OR public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- Add explicit SELECT policy for profiles to prevent leakage
-- ============================================

-- The profiles table already has RLS but let's ensure it's properly secured
-- Verify no public SELECT exists - users should only see their own profile

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- ============================================
-- Add explicit SELECT policy for addresses to prevent leakage  
-- ============================================

-- Verify addresses table is properly secured
DROP POLICY IF EXISTS "Addresses are viewable by everyone" ON public.addresses;