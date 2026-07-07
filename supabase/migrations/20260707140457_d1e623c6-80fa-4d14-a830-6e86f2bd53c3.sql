
-- Add purchase price & optional markup override to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS purchase_price numeric,
  ADD COLUMN IF NOT EXISTS markup_percent_override numeric,
  ADD COLUMN IF NOT EXISTS available_as_case boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS units_per_case integer,
  ADD COLUMN IF NOT EXISTS case_price numeric;

-- Pricing / commission / points configuration (single active row)
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  global_markup_percent numeric NOT NULL DEFAULT 30,
  ambassador_percent numeric NOT NULL DEFAULT 5,
  platform_percent numeric NOT NULL DEFAULT 95,
  points_tiers jsonb NOT NULL DEFAULT '[
    {"max": 5000, "points": 5},
    {"max": 20000, "points": 15},
    {"max": 50000, "points": 40},
    {"max": null, "points": 80}
  ]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_config TO anon, authenticated;
GRANT ALL ON public.pricing_config TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.pricing_config TO authenticated;

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active pricing config"
  ON public.pricing_config FOR SELECT
  USING (true);

CREATE POLICY "Admins manage pricing config"
  ON public.pricing_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.pricing_config_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_pricing_config_touch ON public.pricing_config;
CREATE TRIGGER trg_pricing_config_touch
BEFORE UPDATE ON public.pricing_config
FOR EACH ROW EXECUTE FUNCTION public.pricing_config_touch();

-- Seed default row if empty
INSERT INTO public.pricing_config (is_active)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_config);

-- Insert 'Caisse' category if missing
INSERT INTO public.categories (name, slug, description, is_active)
SELECT 'Caisse', 'caisse', 'Produits disponibles en caisse ou carton', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'caisse');
