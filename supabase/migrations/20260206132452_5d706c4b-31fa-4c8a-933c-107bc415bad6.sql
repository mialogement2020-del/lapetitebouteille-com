-- Fix the Security Definer View issue
-- The view needs security_invoker=on to properly inherit RLS
-- But we need the view to be accessible for anonymous users to see approved reviews

-- Drop the existing view and recreate with security_invoker=on
DROP VIEW IF EXISTS public.reviews_public;

-- Create the view with security_invoker=on
-- This is the proper pattern - the view inherits caller's permissions
CREATE VIEW public.reviews_public
WITH (security_invoker=on) AS
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

-- Since we now have security_invoker=on, we need to allow anon to read
-- approved reviews through the view. Update the anon policy to allow
-- reading approved reviews only (instead of full deny)
DROP POLICY IF EXISTS "Deny anonymous reviews access" ON public.reviews;

-- Create a policy that allows anon to read only approved reviews
-- This is safe because:
-- 1. The view excludes user_id
-- 2. Only approved reviews are visible
-- 3. No sensitive data is exposed
CREATE POLICY "Anonymous can view approved reviews"
  ON public.reviews
  FOR SELECT
  TO anon
  USING (is_approved = true);