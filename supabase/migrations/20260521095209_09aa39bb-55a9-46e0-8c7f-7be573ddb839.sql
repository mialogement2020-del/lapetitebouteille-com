
CREATE TABLE IF NOT EXISTS public.wholesaler_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  business_type text NOT NULL DEFAULT 'particulier',
  niu text,
  city text,
  address text,
  contact_phone text,
  contact_email text,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  payment_terms text DEFAULT 'prepaid',
  is_active boolean NOT NULL DEFAULT true,
  total_orders int NOT NULL DEFAULT 0,
  total_spent numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesaler_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers view own profile" ON public.wholesaler_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Wholesalers update own profile" ON public.wholesaler_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.wholesaler_profiles
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_wholesaler_profiles_updated
  BEFORE UPDATE ON public.wholesaler_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.wholesaler_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  business_type text NOT NULL DEFAULT 'particulier',
  niu text,
  city text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text,
  estimated_monthly_volume numeric(12,2),
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wholesaler_apps_user ON public.wholesaler_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_wholesaler_apps_status ON public.wholesaler_applications(status);

ALTER TABLE public.wholesaler_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own apps" ON public.wholesaler_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own apps" ON public.wholesaler_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage apps" ON public.wholesaler_applications
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_wholesaler_apps_updated
  BEFORE UPDATE ON public.wholesaler_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.approve_wholesaler_application(_app_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _app record;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  SELECT * INTO _app FROM public.wholesaler_applications WHERE id = _app_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;

  -- Create or update profile
  INSERT INTO public.wholesaler_profiles (user_id, company_name, business_type, niu, city, contact_phone, contact_email)
  VALUES (_app.user_id, _app.company_name, _app.business_type, _app.niu, _app.city, _app.contact_phone, _app.contact_email)
  ON CONFLICT (user_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    business_type = EXCLUDED.business_type,
    niu = EXCLUDED.niu,
    city = EXCLUDED.city,
    contact_phone = EXCLUDED.contact_phone,
    contact_email = EXCLUDED.contact_email,
    is_active = true,
    updated_at = now();

  -- Grant wholesaler role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_app.user_id, 'wholesaler')
  ON CONFLICT DO NOTHING;

  -- Mark application approved
  UPDATE public.wholesaler_applications
  SET status = 'approved', processed_at = now(), processed_by = auth.uid()
  WHERE id = _app_id;

  RETURN jsonb_build_object('success', true);
END;
$fn$;
