CREATE TABLE public.home_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_fr text NOT NULL,
  title_en text NOT NULL DEFAULT '',
  description_fr text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  href text NOT NULL DEFAULT '/catalogue',
  display_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_categories TO authenticated;
GRANT ALL ON public.home_categories TO service_role;

ALTER TABLE public.home_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read home categories"
ON public.home_categories FOR SELECT
USING (true);

CREATE POLICY "Admins manage home categories"
ON public.home_categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER home_categories_updated_at
BEFORE UPDATE ON public.home_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.home_categories (slug, title_fr, title_en, description_fr, description_en, image_url, href, display_order)
VALUES
  ('vins', 'Vins', 'Wines', 'Grands crus et appellations prestigieuses', 'Grand crus and prestigious appellations', 'https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&q=72&w=520', '/catalogue?category=vins', 1),
  ('champagnes', 'Champagnes', 'Champagnes', 'Les plus grandes maisons françaises', 'The greatest French houses', 'https://images.unsplash.com/photo-1578911373434-0cb395d2cbfb?auto=format&fit=crop&q=72&w=520', '/catalogue?category=champagnes', 2),
  ('spiritueux', 'Spiritueux', 'Spirits', 'Whisky, Cognac, Rhum d''exception', 'Exceptional Whisky, Cognac, Rum', 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&q=72&w=520', '/catalogue?category=spiritueux', 3),
  ('vins-mousseux', 'Vins Mousseux', 'Sparkling Wines', 'Prosecco, Cava, Crémant et bulles du monde', 'Prosecco, Cava, Crémant and world sparkling', 'https://images.unsplash.com/photo-1549834125-82d3c48159a3?auto=format&fit=crop&q=72&w=520', '/catalogue?category=vins-mousseux', 4),
  ('coffrets', 'Coffrets Cadeaux', 'Gift Sets', 'L''art du cadeau raffiné', 'The art of refined gifting', 'https://images.unsplash.com/photo-1608885898957-a559228e8749?auto=format&fit=crop&q=72&w=520', '/catalogue?category=coffrets', 5);