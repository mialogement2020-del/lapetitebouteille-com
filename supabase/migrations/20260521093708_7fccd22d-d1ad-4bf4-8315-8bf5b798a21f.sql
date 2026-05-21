-- Extend app_role enum with marketplace roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ambassador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'wholesaler';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- Helper: get all roles of current user (cached per-statement)
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS SETOF public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- Helper: check if current user has ANY of the given roles
CREATE OR REPLACE FUNCTION public.has_any_role(_roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = ANY(_roles)
  );
$$;