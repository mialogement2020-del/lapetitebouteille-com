-- Move checkout financial calculations server-side.
-- The browser sends intent data only; Supabase re-reads product prices, coupon
-- rules and gift packaging before creating the order and its items.

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
  v_lookup_token text := gen_random_uuid()::text;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_discount_amount numeric := 0;
  v_total numeric := 0;
  v_gift_price numeric := 0;
  v_normalized_code text := NULLIF(upper(trim(COALESCE(_code, ''))), '');
  v_referrer_id uuid;
  v_promo record;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_items_snapshot jsonb := '[]'::jsonb;
  v_full_name text := NULLIF(trim(COALESCE(_address->>'fullName', '')), '');
  v_email text := NULLIF(trim(COALESCE(_address->>'email', '')), '');
  v_phone text := NULLIF(trim(COALESCE(_address->>'phone', '')), '');
  v_city text := NULLIF(trim(COALESCE(_address->>'city', '')), '');
  v_neighborhood text := NULLIF(trim(COALESCE(_address->>'neighborhood', '')), '');
  v_street text := NULLIF(trim(COALESCE(_address->>'streetAddress', '')), '');
  v_notes text := NULLIF(trim(COALESCE(_address->>'additionalInfo', '')), '');
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

  FOR v_item IN SELECT * FROM jsonb_array_elements(_cart_items)
  LOOP
    v_quantity := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_quantity <= 0 OR v_quantity > 99 THEN
      RAISE EXCEPTION 'invalid_quantity';
    END IF;

    SELECT id, name, image_url, price, stock_quantity
      INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_unavailable';
    END IF;

    IF COALESCE(v_product.stock_quantity, 0) < v_quantity THEN
      RAISE EXCEPTION 'insufficient_stock';
    END IF;

    v_subtotal := v_subtotal + (COALESCE(v_product.price, 0) * v_quantity);
    v_items_snapshot := v_items_snapshot || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'product_image', v_product.image_url,
      'quantity', v_quantity,
      'unit_price', v_product.price,
      'total_price', v_product.price * v_quantity
    );
  END LOOP;

  v_delivery_fee := CASE WHEN v_subtotal >= 50000 THEN 0 ELSE 2000 END;

  IF _gift_packaging_id IS NOT NULL THEN
    SELECT price INTO v_gift_price
    FROM public.gift_packaging_options
    WHERE id = _gift_packaging_id
      AND COALESCE(is_active, true) = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_gift_packaging';
    END IF;
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

    IF v_promo.discount_type = 'percentage' THEN
      v_discount_amount := (v_subtotal * v_promo.discount_value) / 100;
      IF v_promo.max_discount_amount IS NOT NULL THEN
        v_discount_amount := LEAST(v_discount_amount, v_promo.max_discount_amount);
      END IF;
    ELSE
      v_discount_amount := v_promo.discount_value;
    END IF;

    v_discount_amount := LEAST(v_discount_amount, v_subtotal);
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

  v_total := v_subtotal - v_discount_amount + v_gift_price + v_delivery_fee;
  IF v_total < 0 THEN
    RAISE EXCEPTION 'invalid_total';
  END IF;

  FOR i IN 1..10 LOOP
    v_order_number := public.generate_order_number();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
  END LOOP;

  INSERT INTO public.orders (
    user_id,
    order_number,
    subtotal,
    delivery_fee,
    discount_amount,
    total,
    status,
    payment_method,
    payment_status,
    shipping_full_name,
    shipping_phone,
    shipping_city,
    shipping_neighborhood,
    shipping_street,
    shipping_notes,
    guest_email,
    guest_phone,
    referral_code_used,
    referrer_id,
    gift_packaging_id,
    gift_message,
    gift_packaging_price,
    order_lookup_token
  ) VALUES (
    v_user_id,
    v_order_number,
    v_subtotal,
    v_delivery_fee,
    v_discount_amount,
    v_total,
    'pending',
    _payment_method,
    'pending',
    v_full_name,
    v_phone,
    v_city,
    v_neighborhood,
    v_street,
    v_notes,
    CASE WHEN v_user_id IS NULL THEN v_email ELSE NULL END,
    CASE WHEN v_user_id IS NULL THEN v_phone ELSE NULL END,
    v_normalized_code,
    v_referrer_id,
    _gift_packaging_id,
    NULLIF(trim(COALESCE(_gift_message, '')), ''),
    v_gift_price,
    v_lookup_token
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    product_image,
    quantity,
    unit_price,
    total_price
  )
  SELECT
    v_order_id,
    x.product_id,
    x.product_name,
    x.product_image,
    x.quantity,
    x.unit_price,
    x.total_price
  FROM jsonb_to_recordset(v_items_snapshot) AS x(
    product_id uuid,
    product_name text,
    product_image text,
    quantity integer,
    unit_price numeric,
    total_price numeric
  );

  IF v_normalized_code IS NOT NULL AND _code_type = 'promo' THEN
    UPDATE public.promo_codes
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE upper(code) = v_normalized_code;
  ELSIF v_referrer_id IS NOT NULL THEN
    UPDATE public.referral_codes
    SET
      total_orders = COALESCE(total_orders, 0) + 1,
      total_revenue = COALESCE(total_revenue, 0) + v_total
    WHERE user_id = v_referrer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount_amount', v_discount_amount,
    'gift_packaging_price', v_gift_price,
    'total', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_from_checkout(
  jsonb,
  jsonb,
  public.payment_method,
  text,
  text,
  uuid,
  text
) TO anon, authenticated, service_role;

-- The frontend now uses the RPC above. Remove broad client-side inserts where
-- policy names exist from older migration generations.
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items for own orders" ON public.order_items;
DROP POLICY IF EXISTS "Guests can create order items" ON public.order_items;
