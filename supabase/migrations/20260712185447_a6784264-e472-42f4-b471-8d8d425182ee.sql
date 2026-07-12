CREATE TABLE public.product_image_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  previous_image_url TEXT,
  new_image_url TEXT NOT NULL,
  batch_id UUID,
  source TEXT NOT NULL DEFAULT 'bulk_zip',
  replaced_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_image_history_product ON public.product_image_history(product_id);
CREATE INDEX idx_product_image_history_batch ON public.product_image_history(batch_id);
CREATE INDEX idx_product_image_history_created ON public.product_image_history(created_at DESC);

GRANT SELECT, INSERT ON public.product_image_history TO authenticated;
GRANT ALL ON public.product_image_history TO service_role;

ALTER TABLE public.product_image_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view image history"
  ON public.product_image_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert image history"
  ON public.product_image_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND replaced_by = auth.uid()
  );