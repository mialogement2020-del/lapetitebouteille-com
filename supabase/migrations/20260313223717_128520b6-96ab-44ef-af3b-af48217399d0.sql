
CREATE TABLE public.wholesale_tier_config (
  id text PRIMARY KEY DEFAULT 'default',
  visible_tiers text[] NOT NULL DEFAULT ARRAY['carton_6']::text[],
  card_tiers text[] NOT NULL DEFAULT ARRAY['carton_6']::text[],
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wholesale_tier_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view wholesale tier config"
ON public.wholesale_tier_config
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage wholesale tier config"
ON public.wholesale_tier_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.wholesale_tier_config (id, visible_tiers, card_tiers) 
VALUES ('default', ARRAY['carton_6']::text[], ARRAY['carton_6']::text[]);
