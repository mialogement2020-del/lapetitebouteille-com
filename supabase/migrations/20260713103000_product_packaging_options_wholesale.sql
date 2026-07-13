-- Product-level wholesale packaging options.
-- Additive migration: keeps legacy product case columns, stops relying on automatic global discounts.

CREATE TABLE IF NOT EXISTS public.product_packaging_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  packaging_type text NOT NULL CHECK (packaging_type IN ('carton', 'wooden_case', 'standard_case', 'custom')),
  packaging_label text NOT NULL,
  bottle_quantity integer NOT NULL CHECK (bottle_quantity > 0),
  pricing_mode text NOT NULL DEFAULT 'manual_total' CHECK (pricing_mode IN ('manual_total', 'discount_percent')),
  total_price numeric(12,2) NOT NULL CHECK (total_price > 0),
  discount_percent numeric(5,2) CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
  calculated_unit_price numeric(12,2),
  calculated_savings numeric(12,2),
  show_discount boolean NOT NULL DEFAULT true,
  stock_quantity integer CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  sku text,
  weight_kg numeric(10,3) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  discount_tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  CONSTRAINT product_packaging_discount_tiers_array CHECK (jsonb_typeof(discount_tiers) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_packaging_options_active_unique
  ON public.product_packaging_options(product_id, packaging_type, bottle_quantity, lower(packaging_label))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_packaging_options_product_active
  ON public.product_packaging_options(product_id, is_active);

CREATE OR REPLACE FUNCTION public.normalize_product_packaging_option()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_price numeric;
  v_expected_total numeric;
BEGIN
  SELECT price INTO v_unit_price FROM public.products WHERE id = NEW.product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF NEW.packaging_label IS NULL OR length(trim(NEW.packaging_label)) = 0 THEN
    NEW.packaging_label := CASE
      WHEN NEW.packaging_type = 'carton' THEN 'Carton de ' || NEW.bottle_quantity || ' bouteilles'
      WHEN NEW.packaging_type = 'wooden_case' THEN 'Caisse bois de ' || NEW.bottle_quantity || ' bouteilles'
      WHEN NEW.packaging_type = 'standard_case' THEN 'Caisse standard de ' || NEW.bottle_quantity || ' bouteilles'
      ELSE 'Conditionnement de ' || NEW.bottle_quantity || ' bouteilles'
    END;
  END IF;

  IF NEW.pricing_mode = 'discount_percent' THEN
    IF NEW.discount_percent IS NULL THEN
      RAISE EXCEPTION 'discount_percent_required';
    END IF;
    v_expected_total := round((v_unit_price * NEW.bottle_quantity) * (1 - (NEW.discount_percent / 100)), 0);
    IF NEW.total_price IS DISTINCT FROM v_expected_total THEN
      NEW.total_price := v_expected_total;
    END IF;
  ELSIF NEW.discount_percent IS NOT NULL THEN
    NEW.discount_percent := round(GREATEST(0, LEAST(100, (1 - (NEW.total_price / NULLIF(v_unit_price * NEW.bottle_quantity, 0))) * 100)), 2);
  END IF;

  NEW.calculated_unit_price := round(NEW.total_price / NEW.bottle_quantity, 0);
  NEW.calculated_savings := GREATEST(0, round((v_unit_price * NEW.bottle_quantity) - NEW.total_price, 0));
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_product_packaging_option ON public.product_packaging_options;
CREATE TRIGGER trg_normalize_product_packaging_option
BEFORE INSERT OR UPDATE ON public.product_packaging_options
FOR EACH ROW EXECUTE FUNCTION public.normalize_product_packaging_option();

ALTER TABLE public.product_packaging_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active packaging options" ON public.product_packaging_options;
DROP POLICY IF EXISTS "Admins manage packaging options" ON public.product_packaging_options;
CREATE POLICY "Public can read active packaging options"
ON public.product_packaging_options FOR SELECT
USING (is_active = true);
CREATE POLICY "Admins manage packaging options"
ON public.product_packaging_options FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE VIEW public.active_product_packaging_options AS
SELECT
  id, product_id, packaging_type, packaging_label, bottle_quantity, pricing_mode,
  total_price, discount_percent, calculated_unit_price, calculated_savings,
  show_discount, stock_quantity, sku, weight_kg, discount_tiers, is_active,
  created_at, updated_at
FROM public.product_packaging_options
WHERE is_active = true;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS packaging_option_id uuid REFERENCES public.product_packaging_options(id) ON DELETE SET NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS packaging_option_id uuid,
  ADD COLUMN IF NOT EXISTS packaging_type text,
  ADD COLUMN IF NOT EXISTS packaging_label text,
  ADD COLUMN IF NOT EXISTS packaging_bottle_quantity integer,
  ADD COLUMN IF NOT EXISTS packaging_units integer,
  ADD COLUMN IF NOT EXISTS packaging_unit_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS packaging_discount_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS packaging_discount_amount numeric(12,2);

GRANT SELECT ON public.active_product_packaging_options TO anon, authenticated;
GRANT SELECT ON public.product_packaging_options TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_packaging_options TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO service_role;
CREATE OR REPLACE FUNCTION public.create_order_from_checkout(
  _cart_items jsonb,
  _address jsonb,
  _payment_method public.payment_method,
  _code_type text DEFAULT NULL,
  _code text DEFAULT NULL,
  _gift_packaging_id uuid DEFAULT NULL,
  _gift_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_snapshot_id uuid;
  v_lookup_token text := gen_random_uuid()::text;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_discount_amount numeric := 0;
  v_discountable_subtotal numeric := 0;
  v_discount_cap numeric := 0;
  v_total numeric := 0;
  v_gift_price numeric := 0;
  v_service_fee numeric := 0;
  v_tax_rate numeric := 19.25;
  v_tax_amount numeric := 0;
  v_amount_excluding_tax numeric := 0;
  v_product_cost_total numeric := 0;
  v_gross_margin numeric := 0;
  v_estimated_net_margin numeric := 0;
  v_payment_provider_fee numeric := 0;
  v_platform_commission_amount numeric := 0;
  v_vendor_commission_amount numeric := 0;
  v_ambassador_commission_estimate numeric := 0;
  v_normalized_code text := NULLIF(upper(trim(COALESCE(_code, ''))), '');
  v_referrer_id uuid;
  v_promo public.promo_codes%ROWTYPE;
  v_delivery record;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_packaging_option_id uuid;
  v_packaging public.product_packaging_options%ROWTYPE;
  v_package_count integer;
  v_packaging_base_total numeric;
  v_packaging_discount_percent numeric;
  v_packaging_discount_amount numeric;
  v_line_total numeric;
  v_line_cost numeric;
  v_items_snapshot jsonb := '[]'::jsonb;
  v_rules jsonb;
  v_full_name text := NULLIF(trim(COALESCE(_address->>'fullName', '')), '');
  v_email text := NULLIF(trim(COALESCE(_address->>'email', '')), '');
  v_phone text := NULLIF(trim(COALESCE(_address->>'phone', '')), '');
  v_city text := NULLIF(trim(COALESCE(_address->>'city', '')), '');
  v_neighborhood text := NULLIF(trim(COALESCE(_address->>'neighborhood', '')), '');
  v_street text := NULLIF(trim(COALESCE(_address->>'streetAddress', '')), '');
  v_notes text := NULLIF(trim(COALESCE(_address->>'additionalInfo', '')), '');
  v_guest_identity_hash text;
  v_user_redemptions integer := 0;
  v_guest_redemptions integer := 0;
  v_has_previous_order boolean := false;
  i integer;
BEGIN
  IF jsonb_typeof(_cart_items) <> 'array' OR jsonb_array_length(_cart_items) = 0 THEN
    RAISE EXCEPTION 'cart_empty';
  END IF;

  IF v_full_name IS NULL OR v_phone IS NULL OR v_city IS NULL OR v_street IS NULL THEN
    RAISE EXCEPTION 'missing_shipping_fields';
  END IF;

  IF v_user_id IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'guest_email_required';
  END IF;

  IF _payment_method NOT IN ('mtn_money', 'orange_money', 'cash_on_delivery', 'credit_card') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  IF v_email IS NOT NULL OR v_phone IS NOT NULL THEN
    v_guest_identity_hash := encode(extensions.digest(lower(COALESCE(v_email, '')) || ':' || regexp_replace(COALESCE(v_phone, ''), '[^0-9+]', '', 'g'), 'sha256'), 'hex');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_cart_items)
  LOOP
    v_quantity := COALESCE((v_item->>'quantity')::integer, 0);
    v_packaging_option_id := NULLIF(v_item->>'packaging_option_id', '')::uuid;
    IF v_quantity <= 0 OR v_quantity > 999 THEN
      RAISE EXCEPTION 'invalid_quantity';
    END IF;

    SELECT
      p.id, p.name, p.image_url, p.price, p.stock_quantity,
      p.purchase_price, p.category_id, p.vendor_id
      INTO v_product
    FROM public.products p
    WHERE p.id = (v_item->>'product_id')::uuid
      AND p.is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_unavailable';
    END IF;

    v_packaging := NULL;
    v_package_count := NULL;
    v_packaging_base_total := NULL;
    v_packaging_discount_percent := 0;
    v_packaging_discount_amount := 0;

    IF v_packaging_option_id IS NOT NULL THEN
      SELECT * INTO v_packaging
      FROM public.product_packaging_options po
      WHERE po.id = v_packaging_option_id
        AND po.product_id = v_product.id
        AND po.is_active = true
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'packaging_option_unavailable';
      END IF;

      IF v_packaging.bottle_quantity <= 0 OR v_quantity % v_packaging.bottle_quantity <> 0 THEN
        RAISE EXCEPTION 'invalid_packaging_quantity';
      END IF;

      v_package_count := v_quantity / v_packaging.bottle_quantity;
      IF v_package_count <= 0 THEN
        RAISE EXCEPTION 'invalid_packaging_quantity';
      END IF;

      IF v_packaging.stock_quantity IS NOT NULL AND v_packaging.stock_quantity < v_package_count THEN
        RAISE EXCEPTION 'insufficient_packaging_stock';
      END IF;

      SELECT COALESCE((tier->>'discount_percent')::numeric, 0)
        INTO v_packaging_discount_percent
      FROM jsonb_array_elements(COALESCE(v_packaging.discount_tiers, '[]'::jsonb)) tier
      WHERE COALESCE((tier->>'min_quantity')::integer, 0) <= v_package_count
      ORDER BY COALESCE((tier->>'min_quantity')::integer, 0) DESC
      LIMIT 1;

      v_packaging_discount_percent := COALESCE(v_packaging_discount_percent, v_packaging.discount_percent, 0);
      IF v_packaging_discount_percent < 0 OR v_packaging_discount_percent > 100 THEN
        RAISE EXCEPTION 'invalid_packaging_discount';
      END IF;

      v_packaging_base_total := round(COALESCE(v_packaging.total_price, 0) * v_package_count, 0);
      v_packaging_discount_amount := round((v_packaging_base_total * v_packaging_discount_percent) / 100, 0);
      v_line_total := GREATEST(0, v_packaging_base_total - v_packaging_discount_amount);
    ELSE
      v_line_total := round(COALESCE(v_product.price, 0) * v_quantity, 0);
    END IF;

    IF COALESCE(v_product.stock_quantity, 0) < v_quantity THEN
      RAISE EXCEPTION 'insufficient_stock';
    END IF;

    v_line_cost := round(COALESCE(v_product.purchase_price, 0) * v_quantity, 0);
    v_subtotal := v_subtotal + v_line_total;
    v_product_cost_total := v_product_cost_total + v_line_cost;

    v_items_snapshot := v_items_snapshot || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'product_image', v_product.image_url,
      'category_id', v_product.category_id,
      'vendor_id', v_product.vendor_id,
      'quantity', v_quantity,
      'unit_price', CASE WHEN v_packaging_option_id IS NULL THEN round(v_product.price, 0) ELSE round(v_line_total / v_quantity, 0) END,
      'line_subtotal', v_line_total,
      'purchase_unit_cost', round(COALESCE(v_product.purchase_price, 0), 0),
      'line_cost_total', v_line_cost,
      'cost_missing', v_product.purchase_price IS NULL,
      'packaging_option_id', v_packaging_option_id,
      'packaging_type', CASE WHEN v_packaging_option_id IS NULL THEN NULL ELSE v_packaging.packaging_type END,
      'packaging_label', CASE WHEN v_packaging_option_id IS NULL THEN NULL ELSE v_packaging.packaging_label END,
      'packaging_bottle_quantity', CASE WHEN v_packaging_option_id IS NULL THEN NULL ELSE v_packaging.bottle_quantity END,
      'packaging_units', v_package_count,
      'packaging_total_price', CASE WHEN v_packaging_option_id IS NULL THEN NULL ELSE v_packaging.total_price END,
      'packaging_discount_percent', CASE WHEN v_packaging_option_id IS NULL THEN NULL ELSE v_packaging_discount_percent END,
      'packaging_discount_amount', CASE WHEN v_packaging_option_id IS NULL THEN NULL ELSE v_packaging_discount_amount END,
      'packaging_sku', CASE WHEN v_packaging_option_id IS NULL THEN NULL ELSE v_packaging.sku END
    );

    UPDATE public.products
    SET stock_quantity = COALESCE(stock_quantity, 0) - v_quantity
    WHERE id = v_product.id;

    IF v_packaging_option_id IS NOT NULL AND v_packaging.stock_quantity IS NOT NULL THEN
      UPDATE public.product_packaging_options
      SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_package_count),
          updated_at = now()
      WHERE id = v_packaging_option_id;
    END IF;
  END LOOP;

  SELECT *
    INTO v_delivery
  FROM public.resolve_delivery_zone(v_city, v_neighborhood, v_subtotal);
  v_delivery_fee := COALESCE(v_delivery.fee, 0);

  IF _gift_packaging_id IS NOT NULL THEN
    SELECT price INTO v_gift_price
    FROM public.gift_packaging_options
    WHERE id = _gift_packaging_id
      AND COALESCE(is_active, true) = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_gift_packaging';
    END IF;
    v_gift_price := round(COALESCE(v_gift_price, 0), 0);
  END IF;

  IF v_normalized_code IS NOT NULL AND _code_type = 'promo' THEN
    SELECT *
      INTO v_promo
    FROM public.promo_codes
    WHERE upper(code) = v_normalized_code
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_promo_code';
    END IF;

    IF v_promo.valid_from IS NOT NULL AND v_promo.valid_from > now() THEN
      RAISE EXCEPTION 'promo_not_started';
    END IF;

    IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < now() THEN
      RAISE EXCEPTION 'promo_expired';
    END IF;

    IF v_promo.usage_limit IS NOT NULL AND COALESCE(v_promo.used_count, 0) >= v_promo.usage_limit THEN
      RAISE EXCEPTION 'promo_limit_reached';
    END IF;

    IF v_promo.min_order_amount IS NOT NULL AND v_subtotal < v_promo.min_order_amount THEN
      RAISE EXCEPTION 'promo_minimum_not_reached';
    END IF;

    IF v_promo.eligible_user_ids IS NOT NULL
       AND (v_user_id IS NULL OR NOT (v_user_id = ANY(v_promo.eligible_user_ids))) THEN
      RAISE EXCEPTION 'promo_user_not_eligible';
    END IF;

    SELECT COALESCE(sum(x.line_subtotal), 0)
      INTO v_discountable_subtotal
    FROM jsonb_to_recordset(v_items_snapshot) AS x(
      product_id uuid,
      category_id uuid,
      line_subtotal numeric
    )
    WHERE (v_promo.eligible_product_ids IS NULL OR x.product_id = ANY(v_promo.eligible_product_ids))
      AND (v_promo.eligible_category_ids IS NULL OR x.category_id = ANY(v_promo.eligible_category_ids));

    IF v_discountable_subtotal <= 0 THEN
      IF v_promo.eligible_product_ids IS NOT NULL THEN
        RAISE EXCEPTION 'promo_product_not_eligible';
      END IF;
      IF v_promo.eligible_category_ids IS NOT NULL THEN
        RAISE EXCEPTION 'promo_category_not_eligible';
      END IF;
      RAISE EXCEPTION 'promo_no_discountable_items';
    END IF;

    IF v_promo.first_order_only THEN
      SELECT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE (
          (v_user_id IS NOT NULL AND o.user_id = v_user_id)
          OR (v_user_id IS NULL AND lower(COALESCE(o.guest_email, '')) = lower(COALESCE(v_email, '')))
        )
        AND o.status <> 'cancelled'
      ) INTO v_has_previous_order;
      IF v_has_previous_order THEN
        RAISE EXCEPTION 'promo_first_order_only';
      END IF;
    END IF;

    IF v_promo.max_uses_per_user IS NOT NULL THEN
      IF v_user_id IS NOT NULL THEN
        SELECT count(*) INTO v_user_redemptions
        FROM public.promo_redemptions
        WHERE promo_code_id = v_promo.id
          AND user_id = v_user_id;
        IF v_user_redemptions >= v_promo.max_uses_per_user THEN
          RAISE EXCEPTION 'promo_user_limit_reached';
        END IF;
      ELSE
        SELECT count(*) INTO v_guest_redemptions
        FROM public.promo_redemptions
        WHERE promo_code_id = v_promo.id
          AND guest_identity_hash = v_guest_identity_hash;
        IF v_guest_redemptions >= v_promo.max_uses_per_user THEN
          RAISE EXCEPTION 'promo_guest_limit_reached';
        END IF;
      END IF;
    END IF;

    IF v_promo.discount_type = 'percentage' THEN
      v_discount_amount := round((v_discountable_subtotal * v_promo.discount_value) / 100, 0);
      IF v_promo.max_discount_amount IS NOT NULL THEN
        v_discount_amount := LEAST(v_discount_amount, round(v_promo.max_discount_amount, 0));
      END IF;
    ELSE
      v_discount_amount := round(v_promo.discount_value, 0);
    END IF;

    v_discount_cap := round(v_discountable_subtotal * (COALESCE(v_promo.max_discount_percent, 100) / 100), 0);
    v_discount_amount := LEAST(v_discount_amount, v_discountable_subtotal, v_discount_cap);
  ELSIF v_normalized_code IS NOT NULL AND _code_type = 'referral' THEN
    SELECT user_id
      INTO v_referrer_id
    FROM public.referral_codes
    WHERE (upper(code) = v_normalized_code OR upper(COALESCE(custom_code, '')) = v_normalized_code)
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_referral_code';
    END IF;

    IF v_user_id IS NOT NULL AND v_referrer_id = v_user_id THEN
      RAISE EXCEPTION 'self_referral_not_allowed';
    END IF;
  ELSIF v_normalized_code IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_code_type';
  END IF;

  v_total := round(v_subtotal - v_discount_amount + v_gift_price + v_delivery_fee + v_service_fee, 0);
  IF v_total < 0 THEN
    RAISE EXCEPTION 'invalid_total';
  END IF;

  v_amount_excluding_tax := round(v_total / (1 + (v_tax_rate / 100)), 0);
  v_tax_amount := v_total - v_amount_excluding_tax;
  v_payment_provider_fee := CASE
    WHEN _payment_method IN ('mtn_money', 'orange_money') THEN round(v_total * 0.01, 0)
    ELSE 0
  END;
  v_gross_margin := round((v_subtotal - v_discount_amount) - v_product_cost_total, 0);
  v_estimated_net_margin := round(v_gross_margin + v_delivery_fee + v_service_fee - v_payment_provider_fee, 0);

  IF v_normalized_code IS NOT NULL
     AND _code_type = 'promo'
     AND NOT COALESCE(v_promo.allow_negative_margin, false)
     AND v_product_cost_total > 0
     AND v_estimated_net_margin < COALESCE(v_promo.min_margin_after_discount, 0) THEN
    RAISE EXCEPTION 'promo_margin_floor_reached';
  END IF;

  FOR i IN 1..10 LOOP
    v_order_number := public.generate_order_number();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
  END LOOP;

  INSERT INTO public.orders (
    user_id, order_number, subtotal, delivery_fee, discount_amount, total,
    status, payment_method, payment_status, shipping_full_name, shipping_phone,
    shipping_city, shipping_neighborhood, shipping_street, shipping_notes,
    guest_email, guest_phone, referral_code_used, referrer_id, gift_packaging_id,
    gift_message, gift_packaging_price, order_lookup_token, currency, service_fee,
    tax_amount, tax_rate, payment_provider_fee
  ) VALUES (
    v_user_id, v_order_number, v_subtotal, v_delivery_fee, v_discount_amount, v_total,
    'pending', _payment_method, 'pending', v_full_name, v_phone,
    v_city, v_neighborhood, v_street, v_notes,
    CASE WHEN v_user_id IS NULL THEN v_email ELSE NULL END,
    CASE WHEN v_user_id IS NULL THEN v_phone ELSE NULL END,
    v_normalized_code, v_referrer_id, _gift_packaging_id,
    NULLIF(trim(COALESCE(_gift_message, '')), ''), v_gift_price, v_lookup_token,
    'XAF', v_service_fee, v_tax_amount, v_tax_rate, v_payment_provider_fee
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, product_image, quantity, unit_price,
    total_price, vendor_id, category_id, purchase_unit_cost, line_cost_total,
    packaging_option_id, packaging_type, packaging_label, packaging_bottle_quantity,
    packaging_units, packaging_unit_price, packaging_discount_percent, packaging_discount_amount,
    accounting_metadata
  )
  SELECT
    v_order_id, x.product_id, x.product_name, x.product_image, x.quantity,
    x.unit_price, x.line_subtotal, x.vendor_id, x.category_id, x.purchase_unit_cost,
    x.line_cost_total, x.packaging_option_id, x.packaging_type, x.packaging_label,
    x.packaging_bottle_quantity, x.packaging_units,
    CASE WHEN x.packaging_units IS NULL OR x.packaging_units = 0 THEN NULL ELSE round(x.line_subtotal / x.packaging_units, 0) END,
    x.packaging_discount_percent, x.packaging_discount_amount,
    jsonb_build_object(
      'snapshot_created_at', now(),
      'cost_missing', x.cost_missing,
      'packaging_option_id', x.packaging_option_id,
      'packaging_label', x.packaging_label,
      'packaging_sku', x.packaging_sku
    )
  FROM jsonb_to_recordset(v_items_snapshot) AS x(
    product_id uuid,
    product_name text,
    product_image text,
    category_id uuid,
    vendor_id uuid,
    quantity integer,
    unit_price numeric,
    line_subtotal numeric,
    purchase_unit_cost numeric,
    line_cost_total numeric,
    cost_missing boolean,
    packaging_option_id uuid,
    packaging_type text,
    packaging_label text,
    packaging_bottle_quantity integer,
    packaging_units integer,
    packaging_total_price numeric,
    packaging_discount_percent numeric,
    packaging_discount_amount numeric,
    packaging_sku text
  );

  IF v_normalized_code IS NOT NULL AND _code_type = 'promo' THEN
    UPDATE public.promo_codes
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE id = v_promo.id;

    INSERT INTO public.promo_redemptions (
      promo_code_id, order_id, user_id, guest_email, guest_phone, guest_identity_hash,
      code, discount_amount, order_subtotal, metadata
    ) VALUES (
      v_promo.id, v_order_id, v_user_id, CASE WHEN v_user_id IS NULL THEN v_email ELSE NULL END,
      CASE WHEN v_user_id IS NULL THEN v_phone ELSE NULL END, v_guest_identity_hash,
      v_promo.code, v_discount_amount, v_subtotal,
      jsonb_build_object(
        'code_type', _code_type,
        'checkout_rpc_version', 'promo_discount_scope',
        'discountable_subtotal', v_discountable_subtotal,
        'discount_cap', v_discount_cap,
        'estimated_net_margin', v_estimated_net_margin
      )
    );
  ELSIF v_referrer_id IS NOT NULL THEN
    UPDATE public.referral_codes
    SET total_orders = COALESCE(total_orders, 0) + 1,
        total_revenue = COALESCE(total_revenue, 0) + v_total
    WHERE user_id = v_referrer_id;
  END IF;

  v_rules := jsonb_build_object(
    'checkout_rpc_version', 'promo_discount_scope',
    'tax_included_in_prices', true,
    'tax_rate', v_tax_rate,
    'delivery_zone_id', v_delivery.zone_id,
    'delivery_rule', v_delivery.matched_rule,
    'free_delivery_threshold', v_delivery.free_threshold,
    'payment_provider_fee_rate', CASE WHEN _payment_method IN ('mtn_money', 'orange_money') THEN 0.01 ELSE 0 END,
    'rounding', 'FCFA integer rounding',
    'promo_discount_scope', CASE WHEN _code_type = 'promo' THEN 'eligible_items_only' ELSE NULL END,
    'mlm_generation_rule', 'separate P0/P1 trigger only after payment_status completed'
  );

  INSERT INTO public.order_accounting_snapshots (
    order_id, order_number, user_id, guest_email, currency, items, rules,
    subtotal, discount_amount, promo_code, delivery_zone_id, delivery_fee,
    service_fee, amount_excluding_tax, tax_rate, tax_amount, amount_including_tax,
    product_cost_total, platform_commission_amount, vendor_commission_amount,
    ambassador_commission_estimate, payment_provider_fee, gross_margin,
    estimated_net_margin, refunded_amount, captured_amount, metadata
  ) VALUES (
    v_order_id, v_order_number, v_user_id, CASE WHEN v_user_id IS NULL THEN v_email ELSE NULL END,
    'XAF', v_items_snapshot, v_rules, v_subtotal, v_discount_amount,
    CASE WHEN _code_type = 'promo' THEN v_normalized_code ELSE NULL END,
    v_delivery.zone_id, v_delivery_fee, v_service_fee, v_amount_excluding_tax,
    v_tax_rate, v_tax_amount, v_total, v_product_cost_total,
    v_platform_commission_amount, v_vendor_commission_amount,
    v_ambassador_commission_estimate, v_payment_provider_fee, v_gross_margin,
    v_estimated_net_margin, 0, 0,
    jsonb_build_object(
      'payment_method', _payment_method,
      'delivery_estimated_delay', v_delivery.estimated_delay,
      'promo_discountable_subtotal', CASE WHEN _code_type = 'promo' THEN v_discountable_subtotal ELSE NULL END
    )
  )
  RETURNING id INTO v_snapshot_id;

  UPDATE public.orders
  SET accounting_snapshot_id = v_snapshot_id,
      accounting_snapshot_created_at = now()
  WHERE id = v_order_id;

  PERFORM public.log_financial_ledger_entry(
    'order_created',
    v_total,
    'order_created:' || v_order_id::text,
    v_order_id,
    v_user_id,
    NULL,
    NULL,
    'XAF',
    NULL,
    NULL,
    NULL,
    v_user_id,
    jsonb_build_object(
      'snapshot_id', v_snapshot_id,
      'subtotal', v_subtotal,
      'discount_amount', v_discount_amount,
      'delivery_fee', v_delivery_fee,
      'payment_status', 'pending'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount_amount', v_discount_amount,
    'gift_packaging_price', v_gift_price,
    'tax_amount', v_tax_amount,
    'payment_provider_fee', v_payment_provider_fee,
    'accounting_snapshot_id', v_snapshot_id,
    'total', v_total
  );
END;
$$;


NOTIFY pgrst, 'reload schema';

