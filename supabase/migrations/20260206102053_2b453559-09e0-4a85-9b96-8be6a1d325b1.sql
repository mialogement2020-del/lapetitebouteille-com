-- Create enum for admin permissions
CREATE TYPE public.admin_permission AS ENUM (
  'orders',
  'products', 
  'categories',
  'promo_codes',
  'stock',
  'audit',
  'mlm',
  'reviews',
  'full_access'
);

-- Create admin_permissions table
CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission admin_permission NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Function to check if user has full_access (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_full_admin_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id
    AND permission = 'full_access'
  )
$$;

-- Function to check if user has a specific admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id UUID, _permission admin_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id
    AND (permission = _permission OR permission = 'full_access')
  )
$$;

-- Policy: Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Super admins can view all permissions
CREATE POLICY "Super admins can view all permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (public.has_full_admin_access(auth.uid()));

-- Policy: Super admins can insert permissions
CREATE POLICY "Super admins can insert permissions"
ON public.admin_permissions
FOR INSERT
TO authenticated
WITH CHECK (public.has_full_admin_access(auth.uid()));

-- Policy: Super admins can update permissions
CREATE POLICY "Super admins can update permissions"
ON public.admin_permissions
FOR UPDATE
TO authenticated
USING (public.has_full_admin_access(auth.uid()));

-- Policy: Super admins can delete permissions
CREATE POLICY "Super admins can delete permissions"
ON public.admin_permissions
FOR DELETE
TO authenticated
USING (public.has_full_admin_access(auth.uid()));