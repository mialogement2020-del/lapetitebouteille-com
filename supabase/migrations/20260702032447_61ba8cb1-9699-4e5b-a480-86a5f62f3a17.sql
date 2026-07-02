
-- Categories
CREATE TABLE public.media_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.media_categories TO anon, authenticated;
GRANT ALL ON public.media_categories TO service_role;
ALTER TABLE public.media_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories public read" ON public.media_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.media_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Articles
CREATE TABLE public.media_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category_id UUID REFERENCES public.media_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published | archived
  published_at TIMESTAMPTZ,
  reading_time_minutes INT NOT NULL DEFAULT 3,
  view_count INT NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_articles_status_published ON public.media_articles(status, published_at DESC);
CREATE INDEX idx_media_articles_category ON public.media_articles(category_id);
CREATE INDEX idx_media_articles_featured ON public.media_articles(featured) WHERE featured = true;

GRANT SELECT ON public.media_articles TO anon, authenticated;
GRANT ALL ON public.media_articles TO service_role;
ALTER TABLE public.media_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published articles are public" ON public.media_articles FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage articles" ON public.media_articles FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_media_categories_updated_at BEFORE UPDATE ON public.media_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_media_articles_updated_at BEFORE UPDATE ON public.media_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public view increment (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_article_views(_slug TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.media_articles
  SET view_count = view_count + 1
  WHERE slug = _slug AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_article_views(TEXT) TO anon, authenticated;

-- Seed default categories
INSERT INTO public.media_categories (name, slug, description, display_order) VALUES
  ('Vins & Terroirs', 'vins-terroirs', 'Découvertes de domaines et cépages', 1),
  ('Guides & Conseils', 'guides-conseils', 'Accords mets-vins, dégustation, service', 2),
  ('Actualités LPB', 'actualites', 'Nouveautés et coulisses de La Petite Bouteille', 3),
  ('Art de Vivre', 'art-de-vivre', 'Culture, gastronomie et lifestyle premium', 4);
