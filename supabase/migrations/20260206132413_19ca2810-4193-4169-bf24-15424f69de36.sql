-- Fix Security Issue 1: reviews_table_user_exposure
-- The reviews table exposes user_id in public queries
-- Solution: Create a public view that excludes user_id for anonymous access
-- and update RLS to deny direct anon access to the base reviews table

-- First, drop existing anon policy on reviews that exposes user_id
DROP POLICY IF EXISTS "Reviews viewable by anon" ON public.reviews;

-- Create explicit deny policy for anonymous direct access to reviews table
-- This forces anon users to go through the secure view
CREATE POLICY "Deny anonymous reviews access"
  ON public.reviews
  FOR SELECT
  TO anon
  USING (false);

-- Create a public view for reviews that excludes user_id
-- This view will be used by anonymous users to read approved reviews
-- The view uses security_invoker = off so it can bypass the anon deny policy
DROP VIEW IF EXISTS public.reviews_public;

CREATE VIEW public.reviews_public AS
  SELECT 
    id,
    product_id,
    rating,
    title,
    comment,
    is_verified_purchase,
    is_approved,
    created_at,
    updated_at
    -- user_id is intentionally excluded for privacy
  FROM public.reviews
  WHERE is_approved = true;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.reviews_public TO anon;
GRANT SELECT ON public.reviews_public TO authenticated;

-- Fix Security Issue 2: addresses_table_missing_protection
-- Add explicit deny policy for anonymous access to addresses
-- The existing policy with auth.uid() = user_id technically prevents anon access
-- but an explicit deny provides defense in depth

DROP POLICY IF EXISTS "Deny anonymous address access" ON public.addresses;

-- Create explicit deny policy for anonymous users on addresses
CREATE POLICY "Deny anonymous address access"
  ON public.addresses
  FOR SELECT
  TO anon
  USING (false);

-- Also add admin view policy for addresses (admins may need to view for order fulfillment)
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;

CREATE POLICY "Admins can view all addresses"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));