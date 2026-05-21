-- ============================================================
-- vendor_shops
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendor_shops (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL UNIQUE, -- one shop per vendor
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description     text,
  logo_url        text,
  banner_url      text,
  city            text,
  country         text DEFAULT 'Cameroun',
  contact_email   text,
  contact_phone   text,
  is_active       boolean NOT NULL DEFAULT true,
  is_verified     boolean NOT NULL DEFAULT false,
  trust_score     numeric(4,2) NOT NULL DEFAULT 0,
  total_sales     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_shops_owner ON public.vendor_shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_vendor_shops_slug  ON public.vendor_shops(slug);

ALTER TABLE public.vendor_shops ENABLE ROW LEVEL SECURITY;

-- Public read of active shops
CREATE POLICY "Public can view active shops"
ON public.vendor_shops
FOR SELECT
USING (is_active = true OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Vendor can create their own shop (must have vendor role)
CREATE POLICY "Vendors create own shop"
ON public.vendor_shops
FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND public.has_role(auth.uid(), 'vendor'::app_role)
);

-- Vendor can update their own shop
CREATE POLICY "Vendors update own shop"
ON public.vendor_shops
FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Admins full control
CREATE POLICY "Admins manage all shops"
ON public.vendor_shops
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_vendor_shops_updated
BEFORE UPDATE ON public.vendor_shops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- products.vendor_id
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id);

-- Vendor-scoped product policies (add new policies; do not drop existing admin/public ones)
CREATE POLICY "Vendors insert own products"
ON public.products
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'vendor'::app_role)
  AND vendor_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.vendor_shops vs
    WHERE vs.id = vendor_id AND vs.owner_id = auth.uid()
  )
);

CREATE POLICY "Vendors update own products"
ON public.products
FOR UPDATE TO authenticated
USING (
  vendor_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.vendor_shops vs
    WHERE vs.id = vendor_id AND vs.owner_id = auth.uid()
  )
)
WITH CHECK (
  vendor_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.vendor_shops vs
    WHERE vs.id = vendor_id AND vs.owner_id = auth.uid()
  )
);

CREATE POLICY "Vendors delete own products"
ON public.products
FOR DELETE TO authenticated
USING (
  vendor_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.vendor_shops vs
    WHERE vs.id = vendor_id AND vs.owner_id = auth.uid()
  )
);

-- ============================================================
-- Helper: get current user's shop id (used by client and RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_shop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.vendor_shops WHERE owner_id = auth.uid() LIMIT 1;
$$;