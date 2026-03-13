
-- Table for wholesale pricing per product (optional overrides)
CREATE TABLE public.wholesale_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  packaging_type text NOT NULL CHECK (packaging_type IN ('carton_6', 'carton_12', 'palette')),
  quantity integer NOT NULL,
  discount_percentage numeric NOT NULL DEFAULT 0,
  custom_price integer, -- nullable: if null, price is auto-calculated from unit price
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, packaging_type)
);

-- Table for quote requests
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  company_name text,
  niu text,
  city text NOT NULL,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  packaging_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  total_price integer NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'traite', 'refuse')),
  user_id uuid,
  processed_at timestamptz,
  processed_by uuid,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wholesale_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for wholesale_pricing
CREATE POLICY "Anyone can view active wholesale pricing" ON public.wholesale_pricing
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Admins can manage wholesale pricing" ON public.wholesale_pricing
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for quote_requests
CREATE POLICY "Anyone can create quote requests" ON public.quote_requests
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Users can view their own quote requests" ON public.quote_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all quote requests" ON public.quote_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow anonymous to view their own quotes (none, but needed for insert)
CREATE POLICY "Anon can create quote requests" ON public.quote_requests
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
