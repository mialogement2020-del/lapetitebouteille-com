
CREATE TYPE public.product_moderation_verdict AS ENUM ('approved', 'review', 'rejected');
CREATE TYPE public.product_moderation_status AS ENUM ('pending', 'approved', 'flagged', 'rejected');

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS moderation_status public.product_moderation_status NOT NULL DEFAULT 'pending';

CREATE TABLE public.product_moderations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  quality_score INTEGER NOT NULL DEFAULT 0,
  verdict public.product_moderation_verdict NOT NULL DEFAULT 'review',
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  counterfeit_risk INTEGER NOT NULL DEFAULT 0,
  compliance_ok BOOLEAN NOT NULL DEFAULT true,
  analyzed_image_url TEXT,
  model_used TEXT,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_moderations_product ON public.product_moderations(product_id, created_at DESC);

ALTER TABLE public.product_moderations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage moderations" ON public.product_moderations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendors view own product moderations" ON public.product_moderations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendor_shops vs ON vs.id = p.vendor_id
    WHERE p.id = product_moderations.product_id
      AND vs.owner_id = auth.uid()
  ));
