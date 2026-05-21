
-- Vendor status enum for order lines
DO $$ BEGIN
  CREATE TYPE public.vendor_fulfillment_status AS ENUM ('pending','preparing','shipped','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_status public.vendor_fulfillment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS vendor_updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_order_items_vendor ON public.order_items(vendor_id);

-- Backfill vendor_id from products
UPDATE public.order_items oi
SET vendor_id = p.vendor_id
FROM public.products p
WHERE oi.product_id = p.id AND oi.vendor_id IS NULL AND p.vendor_id IS NOT NULL;

-- Auto-fill vendor_id on insert
CREATE OR REPLACE FUNCTION public.set_order_item_vendor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.vendor_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT vendor_id INTO NEW.vendor_id FROM public.products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_set_order_item_vendor ON public.order_items;
CREATE TRIGGER trg_set_order_item_vendor
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_order_item_vendor();

-- Vendor RLS
DROP POLICY IF EXISTS "Vendors view own order items" ON public.order_items;
CREATE POLICY "Vendors view own order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (vendor_id IS NOT NULL AND vendor_id = public.get_my_shop_id());

DROP POLICY IF EXISTS "Vendors update own order items" ON public.order_items;
CREATE POLICY "Vendors update own order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (vendor_id IS NOT NULL AND vendor_id = public.get_my_shop_id())
  WITH CHECK (vendor_id IS NOT NULL AND vendor_id = public.get_my_shop_id());

-- Trust score recompute
CREATE OR REPLACE FUNCTION public.recompute_vendor_trust_score(_shop_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _total int;
  _delivered int;
  _cancelled int;
  _avg_rating numeric;
  _delivery_rate numeric;
  _score numeric;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE vendor_status = 'delivered'),
    COUNT(*) FILTER (WHERE vendor_status = 'cancelled')
  INTO _total, _delivered, _cancelled
  FROM public.order_items
  WHERE vendor_id = _shop_id;

  SELECT COALESCE(AVG(average_rating), 0)
  INTO _avg_rating
  FROM public.products
  WHERE vendor_id = _shop_id AND review_count > 0;

  IF _total = 0 THEN
    _delivery_rate := 0;
  ELSE
    _delivery_rate := _delivered::numeric / _total::numeric;
  END IF;

  -- 60% delivery rate, 30% avg rating (0..5 → 0..1), 10% volume bonus (cap at 50 sales)
  _score := ROUND(
    (_delivery_rate * 60)
    + ((_avg_rating / 5.0) * 30)
    + (LEAST(_delivered, 50)::numeric / 50.0 * 10),
    2
  );

  UPDATE public.vendor_shops
  SET trust_score = _score,
      total_sales = _delivered,
      updated_at = now()
  WHERE id = _shop_id;

  RETURN _score;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.trg_recompute_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _shop uuid;
BEGIN
  _shop := COALESCE(NEW.vendor_id, OLD.vendor_id);
  IF _shop IS NOT NULL AND (TG_OP = 'DELETE' OR NEW.vendor_status IS DISTINCT FROM OLD.vendor_status OR TG_OP = 'INSERT') THEN
    PERFORM public.recompute_vendor_trust_score(_shop);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$fn$;

DROP TRIGGER IF EXISTS trg_order_items_trust ON public.order_items;
CREATE TRIGGER trg_order_items_trust
  AFTER INSERT OR UPDATE OF vendor_status OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_trust_score();

-- Vendor orders RPC
CREATE OR REPLACE FUNCTION public.get_vendor_order_lines()
RETURNS TABLE (
  item_id uuid,
  order_id uuid,
  order_number text,
  order_status text,
  order_created_at timestamptz,
  shipping_full_name text,
  shipping_city text,
  shipping_phone text,
  product_id uuid,
  product_name text,
  product_image text,
  quantity int,
  unit_price numeric,
  total_price numeric,
  vendor_status public.vendor_fulfillment_status,
  vendor_updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    oi.id,
    o.id,
    o.order_number,
    o.status::text,
    o.created_at,
    o.shipping_full_name,
    o.shipping_city,
    o.shipping_phone,
    oi.product_id,
    oi.product_name,
    oi.product_image,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.vendor_status,
    oi.vendor_updated_at
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.vendor_id = public.get_my_shop_id()
  ORDER BY o.created_at DESC;
$fn$;
