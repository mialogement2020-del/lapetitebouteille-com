-- Fix: Add explicit INSERT policy to prevent unauthorized role assignments
-- The handle_new_user trigger uses SECURITY DEFINER so it bypasses RLS

-- First, drop the ALL policy and replace with explicit policies for each operation
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Admins can SELECT all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can INSERT new roles (handle_new_user trigger bypasses RLS via SECURITY DEFINER)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can UPDATE roles
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can DELETE roles
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));