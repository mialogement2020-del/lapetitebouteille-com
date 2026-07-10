-- Lock sensitive cost and margin visibility.
-- Additive security migration: no data deletion, no snapshot recalculation.

CREATE OR REPLACE VIEW public.public_products AS
SELECT
  id,
  name,
  slug,
  description,
  short_description,
  category_id,
  price,
  original_price,
  stock_quantity,
  is_active,
  is_featured,
  alcohol_percentage,
  volume_ml,
  origin_country,
  region,
  grape_variety,
  vintage_year,
  tasting_notes,
  food_pairing,
  serving_temperature,
  image_url,
  gallery_urls,
  average_rating,
  review_count,
  created_at,
  updated_at,
  points_tiers_override,
  available_as_case,
  units_per_case,
  case_price,
  vendor_id
FROM public.products
WHERE is_active = true;

CREATE OR REPLACE VIEW public.customer_order_items AS
SELECT
  id,
  order_id,
  product_id,
  product_name,
  product_image,
  quantity,
  unit_price,
  total_price,
  vendor_id,
  vendor_status,
  vendor_updated_at,
  created_at
FROM public.order_items oi
WHERE (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = oi.order_id
      AND o.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    oi.vendor_id IS NOT NULL
    AND oi.vendor_id = public.get_my_shop_id()
  )
);

CREATE OR REPLACE VIEW public.customer_order_accounting_summary AS
SELECT
  s.order_id,
  s.order_number,
  s.user_id,
  s.guest_email,
  s.currency,
  s.subtotal,
  s.discount_amount,
  s.delivery_fee,
  s.service_fee,
  s.amount_excluding_tax,
  s.tax_rate,
  s.tax_amount,
  s.amount_including_tax,
  s.refunded_amount,
  s.captured_amount,
  o.payment_status,
  o.status,
  o.created_at
FROM public.order_accounting_snapshots s
JOIN public.orders o ON o.id = s.order_id
WHERE (
  o.user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE OR REPLACE VIEW public.admin_products_secure AS
SELECT
  p.*,
  CASE
    WHEN c.id IS NULL THEN NULL
    ELSE jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
  END AS category
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

CREATE OR REPLACE FUNCTION public.admin_set_product_sensitive_pricing(
  _product_id uuid,
  _purchase_price numeric DEFAULT NULL,
  _markup_percent_override numeric DEFAULT NULL,
  _points_override integer DEFAULT NULL,
  _points_tiers_override jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  UPDATE public.products
  SET
    purchase_price = CASE WHEN _purchase_price IS NULL THEN NULL ELSE round(_purchase_price, 0) END,
    markup_percent_override = _markup_percent_override,
    points_override = _points_override,
    points_tiers_override = _points_tiers_override,
    updated_at = now()
  WHERE id = _product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Guests can view order items via order lookup" ON public.order_items;
DROP POLICY IF EXISTS "Vendors view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;

CREATE POLICY "Users can read own safe order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Guests can read safe order items through lookup"
ON public.order_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id IS NULL
      AND o.order_lookup_token IS NOT NULL
  )
);

CREATE POLICY "Vendors read own non-cost order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  vendor_id IS NOT NULL
  AND vendor_id = public.get_my_shop_id()
);

CREATE POLICY "Admins manage order items"
ON public.order_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users read own accounting snapshots" ON public.order_accounting_snapshots;
DROP POLICY IF EXISTS "Admins read accounting snapshots" ON public.order_accounting_snapshots;
CREATE POLICY "Admins read accounting snapshots"
ON public.order_accounting_snapshots
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (
  id, name, slug, description, short_description, category_id, vendor_id,
  price, original_price, stock_quantity, is_active, is_featured,
  alcohol_percentage, volume_ml, origin_country, region, grape_variety,
  vintage_year, tasting_notes, food_pairing, serving_temperature, image_url,
  gallery_urls, average_rating, review_count, created_at, updated_at,
  points_tiers_override, available_as_case, units_per_case, case_price
) ON public.products TO anon, authenticated;
REVOKE SELECT (purchase_price, markup_percent_override, points_override)
  ON public.products FROM anon, authenticated;
REVOKE UPDATE (purchase_price, markup_percent_override, points_override, points_tiers_override)
  ON public.products FROM anon, authenticated;
REVOKE INSERT (purchase_price, markup_percent_override, points_override, points_tiers_override)
  ON public.products FROM anon, authenticated;

REVOKE SELECT ON public.order_items FROM anon, authenticated;
GRANT SELECT (
  id, order_id, product_id, product_name, product_image, quantity, unit_price,
  total_price, vendor_id, vendor_status, vendor_updated_at, created_at
) ON public.order_items TO anon, authenticated;
REVOKE SELECT (purchase_unit_cost, line_cost_total, accounting_metadata)
  ON public.order_items FROM anon, authenticated;

REVOKE SELECT ON public.order_accounting_snapshots FROM anon, authenticated;
GRANT SELECT ON public.order_accounting_snapshots TO authenticated;

GRANT SELECT ON public.public_products TO anon, authenticated;
GRANT SELECT ON public.customer_order_items TO anon, authenticated;
GRANT SELECT ON public.customer_order_accounting_summary TO authenticated;
GRANT SELECT ON public.admin_products_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_product_sensitive_pricing(uuid,numeric,numeric,integer,jsonb)
  TO authenticated, service_role;

GRANT SELECT, UPDATE ON public.products TO service_role;
GRANT SELECT, UPDATE, INSERT, DELETE ON public.order_items TO service_role;
GRANT SELECT ON public.order_accounting_snapshots TO service_role;

NOTIFY pgrst, 'reload schema';
