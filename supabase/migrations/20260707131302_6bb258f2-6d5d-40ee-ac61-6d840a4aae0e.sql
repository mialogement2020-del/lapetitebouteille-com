-- Hero config (single row, id=1 by convention)
CREATE TABLE public.hero_config (
  id int PRIMARY KEY DEFAULT 1,
  published jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT hero_config_singleton CHECK (id = 1)
);

GRANT SELECT ON public.hero_config TO anon, authenticated;
GRANT INSERT, UPDATE ON public.hero_config TO authenticated;
GRANT ALL ON public.hero_config TO service_role;
ALTER TABLE public.hero_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hero" ON public.hero_config FOR SELECT USING (true);
CREATE POLICY "Admins insert hero" ON public.hero_config FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update hero" ON public.hero_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.hero_config (id, published, draft) VALUES (
  1,
  jsonb_build_object(
    'media_type', 'image',
    'background_url', '',
    'video_url', '',
    'badge_fr', 'Sélection prestigieuse',
    'badge_en', 'Prestigious selection',
    'title_line1_fr', 'L''Art de la',
    'title_line1_en', 'The Art of',
    'title_highlight_fr', 'Petite Bouteille',
    'title_highlight_en', 'La Petite Bouteille',
    'subtitle_fr', 'Découvrez notre collection exclusive.',
    'subtitle_en', 'Discover our exclusive collection.',
    'cta_primary_label_fr', 'Explorer',
    'cta_primary_label_en', 'Explore',
    'cta_primary_link', '/catalogue',
    'cta_secondary_label_fr', 'Devenir ambassadeur',
    'cta_secondary_label_en', 'Become ambassador',
    'cta_secondary_link', '/ambassadeur'
  ),
  '{}'::jsonb
);

-- Featured products (Nouveautés)
CREATE TABLE public.home_featured_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  custom_title_fr text,
  custom_title_en text,
  custom_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

GRANT SELECT ON public.home_featured_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_featured_products TO authenticated;
GRANT ALL ON public.home_featured_products TO service_role;
ALTER TABLE public.home_featured_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read featured" ON public.home_featured_products FOR SELECT USING (true);
CREATE POLICY "Admins manage featured" ON public.home_featured_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER home_featured_products_updated_at
BEFORE UPDATE ON public.home_featured_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- History for home_categories
CREATE TABLE public.home_categories_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid,
  action text NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.home_categories_history TO authenticated;
GRANT ALL ON public.home_categories_history TO service_role;
ALTER TABLE public.home_categories_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read history" ON public.home_categories_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert history" ON public.home_categories_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_home_category_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.home_categories_history (category_id, action, snapshot, changed_by)
    VALUES (OLD.id, 'delete', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.home_categories_history (category_id, action, snapshot, changed_by)
    VALUES (NEW.id, 'update', row_to_json(OLD)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.home_categories_history (category_id, action, snapshot, changed_by)
    VALUES (NEW.id, 'insert', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_home_categories_history
AFTER INSERT OR UPDATE OR DELETE ON public.home_categories
FOR EACH ROW EXECUTE FUNCTION public.log_home_category_change();