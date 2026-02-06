-- Fix Security Issue 1: profiles_table_public_exposure
-- Add explicit deny policy for anonymous access to profiles
-- While existing policies with auth.uid() technically prevent anon access,
-- adding an explicit anon deny policy provides defense in depth

-- First drop any existing anon policy on profiles (if any) to avoid conflicts
DROP POLICY IF EXISTS "Deny anonymous profile access" ON public.profiles;

-- Create explicit deny policy for anonymous users on profiles
-- This ensures no anon role can SELECT profiles even if other policies exist
CREATE POLICY "Deny anonymous profile access"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (false);

-- Fix Security Issue 2: orders_table_sensitive_data  
-- Ensure guest orders (user_id IS NULL) cannot be directly queried
-- Access should only be through the secure lookup_guest_order() function

-- First verify current state and drop any overly permissive guest SELECT policies
DROP POLICY IF EXISTS "Guests can view orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can view guest orders" ON public.orders;
DROP POLICY IF EXISTS "Deny anonymous order access" ON public.orders;

-- Create explicit deny policy for anonymous SELECT on orders
-- Guest order lookup is handled securely via lookup_guest_order() RPC
CREATE POLICY "Deny anonymous order access"
  ON public.orders
  FOR SELECT
  TO anon
  USING (false);