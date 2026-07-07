
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS points_override integer,
  ADD COLUMN IF NOT EXISTS points_tiers_override jsonb;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS points_tiers_override jsonb;

COMMENT ON COLUMN public.products.points_override IS 'Optional fixed number of ambassador points earned when this product is sold (overrides tiers).';
COMMENT ON COLUMN public.products.points_tiers_override IS 'Optional per-product tier array [{max, points}] overriding global pricing_config.points_tiers.';
COMMENT ON COLUMN public.categories.points_tiers_override IS 'Optional per-category tier array [{max, points}] overriding global tiers when a product has no override.';
