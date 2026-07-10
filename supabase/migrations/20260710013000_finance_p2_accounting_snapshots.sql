-- Finance P2 hardening: immutable order accounting snapshots, delivery zones,
-- promotion redemptions and append-only financial ledger.
-- Additive migration. Does not recalculate historical orders.

CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  neighborhood text,
  delivery_fee numeric(12,2) NOT NULL CHECK (delivery_fee >= 0),
  free_delivery_threshold numeric(12,2) CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold >= 0),
  estimated_delay text,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  valid_from timestamptz,
  valid_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS delivery_zones_unique_rule
  ON public.delivery_zones (lower(city), lower(COALESCE(neighborhood, '')), priority);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_lookup
  ON public.delivery_zones (lower(city), lower(COALESCE(neighborhood, '')), is_active, priority);

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS max_uses_per_user integer CHECK (max_uses_per_user IS NULL OR max_uses_per_user > 0),
  ADD COLUMN IF NOT EXISTS max_uses_per_order integer NOT NULL DEFAULT 1 CHECK (max_uses_per_order = 1),
  ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eligible_product_ids uuid[],
  ADD COLUMN IF NOT EXISTS eligible_category_ids uuid[],
  ADD COLUMN IF NOT EXISTS eligible_user_ids uuid[],
  ADD COLUMN IF NOT EXISTS incompatible_coupon_ids uuid[],
  ADD COLUMN IF NOT EXISTS stackable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email text,
  guest_phone text,
  guest_identity_hash text,
  code text NOT NULL,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  order_subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (order_subtotal >= 0),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_redemptions_one_per_order
  ON public.promo_redemptions(order_id, promo_code_id)
  WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user
  ON public.promo_redemptions(promo_code_id, user_id, redeemed_at)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_guest_hash
  ON public.promo_redemptions(promo_code_id, guest_identity_hash, redeemed_at)
  WHERE guest_identity_hash IS NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS purchase_unit_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS line_cost_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accounting_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'XAF',
  ADD COLUMN IF NOT EXISTS service_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate numeric(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_provider_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accounting_snapshot_id uuid,
  ADD COLUMN IF NOT EXISTS accounting_snapshot_created_at timestamptz;

CREATE TABLE IF NOT EXISTS public.order_accounting_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  user_id uuid,
  guest_email text,
  currency text NOT NULL DEFAULT 'XAF',
  items jsonb NOT NULL,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  promo_code text,
  delivery_zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  service_fee numeric(12,2) NOT NULL DEFAULT 0,
  amount_excluding_tax numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(8,4) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  amount_including_tax numeric(12,2) NOT NULL DEFAULT 0,
  product_cost_total numeric(12,2) NOT NULL DEFAULT 0,
  platform_commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  vendor_commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  ambassador_commission_estimate numeric(12,2) NOT NULL DEFAULT 0,
  payment_provider_fee numeric(12,2) NOT NULL DEFAULT 0,
  gross_margin numeric(12,2) NOT NULL DEFAULT 0,
  estimated_net_margin numeric(12,2) NOT NULL DEFAULT 0,
  refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
  captured_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_accounting_snapshots_created
  ON public.order_accounting_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  debit_wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  credit_wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  balance_before numeric(14,2),
  balance_after numeric(14,2),
  payment_reference text,
  actor_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS financial_ledger_entries_idempotency_key
  ON public.financial_ledger_entries(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_order
  ON public.financial_ledger_entries(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_wallet
  ON public.financial_ledger_entries(COALESCE(debit_wallet_id, credit_wallet_id), created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_financial_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'financial_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_order_accounting_snapshots_immutable_update ON public.order_accounting_snapshots;
CREATE TRIGGER trg_order_accounting_snapshots_immutable_update
BEFORE UPDATE OR DELETE ON public.order_accounting_snapshots
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_history_mutation();

DROP TRIGGER IF EXISTS trg_financial_ledger_entries_immutable_update ON public.financial_ledger_entries;
CREATE TRIGGER trg_financial_ledger_entries_immutable_update
BEFORE UPDATE OR DELETE ON public.financial_ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_history_mutation();

CREATE OR REPLACE FUNCTION public.log_financial_ledger_entry(
  _movement_type text,
  _amount numeric,
  _idempotency_key text,
  _order_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _debit_wallet_id uuid DEFAULT NULL,
  _credit_wallet_id uuid DEFAULT NULL,
  _currency text DEFAULT 'XAF',
  _balance_before numeric DEFAULT NULL,
  _balance_after numeric DEFAULT NULL,
  _payment_reference text DEFAULT NULL,
  _actor_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _amount IS NULL OR _amount < 0 THEN
    RAISE EXCEPTION 'invalid_ledger_amount';
  END IF;
  IF NULLIF(trim(COALESCE(_movement_type, '')), '') IS NULL THEN
    RAISE EXCEPTION 'missing_movement_type';
  END IF;
  IF NULLIF(trim(COALESCE(_idempotency_key, '')), '') IS NULL THEN
    RAISE EXCEPTION 'missing_idempotency_key';
  END IF;

  INSERT INTO public.financial_ledger_entries (
    movement_type, order_id, user_id, debit_wallet_id, credit_wallet_id,
    amount, currency, balance_before, balance_after, payment_reference,
    actor_id, metadata, idempotency_key
  ) VALUES (
    _movement_type, _order_id, _user_id, _debit_wallet_id, _credit_wallet_id,
    round(_amount, 0), COALESCE(NULLIF(_currency, ''), 'XAF'), _balance_before,
    _balance_after, _payment_reference, _actor_id, COALESCE(_metadata, '{}'::jsonb),
    _idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.financial_ledger_entries
    WHERE idempotency_key = _idempotency_key;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_delivery_zone(
  _city text,
  _neighborhood text,
  _subtotal numeric
)
RETURNS TABLE (
  zone_id uuid,
  fee numeric,
  free_threshold numeric,
  estimated_delay text,
  matched_rule text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city text := lower(trim(COALESCE(_city, '')));
  v_neighborhood text := lower(trim(COALESCE(_neighborhood, '')));
  v_zone public.delivery_zones%ROWTYPE;
BEGIN
  IF v_city = '' THEN
    RAISE EXCEPTION 'delivery_city_required';
  END IF;

  SELECT *
    INTO v_zone
  FROM public.delivery_zones dz
  WHERE dz.is_active = true
    AND lower(dz.city) = v_city
    AND (dz.valid_from IS NULL OR dz.valid_from <= now())
    AND (dz.valid_until IS NULL OR dz.valid_until >= now())
    AND (
      lower(COALESCE(dz.neighborhood, '')) = v_neighborhood
      OR dz.neighborhood IS NULL
      OR trim(dz.neighborhood) = ''
    )
  ORDER BY
    CASE WHEN lower(COALESCE(dz.neighborhood, '')) = v_neighborhood AND v_neighborhood <> '' THEN 0 ELSE 1 END,
    dz.priority ASC,
    dz.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delivery_zone_unavailable';
  END IF;

  zone_id := v_zone.id;
  free_threshold := v_zone.free_delivery_threshold;
  estimated_delay := v_zone.estimated_delay;
  matched_rule := CASE
    WHEN lower(COALESCE(v_zone.neighborhood, '')) = v_neighborhood AND v_neighborhood <> '' THEN 'neighborhood'
    ELSE 'city'
  END;
  fee := CASE
    WHEN v_zone.free_delivery_threshold IS NOT NULL
      AND COALESCE(_subtotal, 0) >= v_zone.free_delivery_threshold THEN 0
    ELSE v_zone.delivery_fee
  END;
  RETURN NEXT;
END;
$$;

INSERT INTO public.delivery_zones (city, neighborhood, delivery_fee, free_delivery_threshold, estimated_delay, priority, metadata)
VALUES
  ('Yaoundé', NULL, 2000, 50000, '24h', 100, '{"seeded":true}'::jsonb),
  ('Yaounde', NULL, 2000, 50000, '24h', 101, '{"seeded":true,"alias":"Yaoundé"}'::jsonb),
  ('Douala', NULL, 2000, 50000, '24h-48h', 100, '{"seeded":true}'::jsonb)
ON CONFLICT DO NOTHING;

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
    IF v_quantity <= 0 OR v_quantity > 99 THEN
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

    IF COALESCE(v_product.stock_quantity, 0) < v_quantity THEN
      RAISE EXCEPTION 'insufficient_stock';
    END IF;

    v_line_total := round(COALESCE(v_product.price, 0) * v_quantity, 0);
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
      'unit_price', round(v_product.price, 0),
      'line_subtotal', v_line_total,
      'purchase_unit_cost', round(COALESCE(v_product.purchase_price, 0), 0),
      'line_cost_total', v_line_cost,
      'cost_missing', v_product.purchase_price IS NULL
    );

    UPDATE public.products
    SET stock_quantity = COALESCE(stock_quantity, 0) - v_quantity
    WHERE id = v_product.id;
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

    IF v_promo.eligible_product_ids IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(v_items_snapshot) AS x(product_id uuid)
      WHERE x.product_id = ANY(v_promo.eligible_product_ids)
    ) THEN
      RAISE EXCEPTION 'promo_product_not_eligible';
    END IF;

    IF v_promo.eligible_category_ids IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(v_items_snapshot) AS x(category_id uuid)
      WHERE x.category_id = ANY(v_promo.eligible_category_ids)
    ) THEN
      RAISE EXCEPTION 'promo_category_not_eligible';
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
      v_discount_amount := round((v_subtotal * v_promo.discount_value) / 100, 0);
      IF v_promo.max_discount_amount IS NOT NULL THEN
        v_discount_amount := LEAST(v_discount_amount, round(v_promo.max_discount_amount, 0));
      END IF;
    ELSE
      v_discount_amount := round(v_promo.discount_value, 0);
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
    accounting_metadata
  )
  SELECT
    v_order_id, x.product_id, x.product_name, x.product_image, x.quantity,
    x.unit_price, x.line_subtotal, x.vendor_id, x.category_id, x.purchase_unit_cost,
    x.line_cost_total, jsonb_build_object('snapshot_created_at', now(), 'cost_missing', x.cost_missing)
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
    cost_missing boolean
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
      jsonb_build_object('code_type', _code_type, 'checkout_rpc_version', 'finance_p2')
    );
  ELSIF v_referrer_id IS NOT NULL THEN
    UPDATE public.referral_codes
    SET total_orders = COALESCE(total_orders, 0) + 1,
        total_revenue = COALESCE(total_revenue, 0) + v_total
    WHERE user_id = v_referrer_id;
  END IF;

  v_rules := jsonb_build_object(
    'checkout_rpc_version', 'finance_p2_accounting_snapshots',
    'tax_included_in_prices', true,
    'tax_rate', v_tax_rate,
    'delivery_zone_id', v_delivery.zone_id,
    'delivery_rule', v_delivery.matched_rule,
    'free_delivery_threshold', v_delivery.free_threshold,
    'payment_provider_fee_rate', CASE WHEN _payment_method IN ('mtn_money', 'orange_money') THEN 0.01 ELSE 0 END,
    'rounding', 'FCFA integer rounding',
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
    jsonb_build_object('payment_method', _payment_method, 'delivery_estimated_delay', v_delivery.estimated_delay)
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

CREATE OR REPLACE FUNCTION public.refresh_order_accounting_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric := 0;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    IF NEW.payment_status = 'refunded' THEN
      UPDATE public.orders
      SET refunded_amount = COALESCE(NULLIF(NEW.refunded_amount, 0), NEW.total)
      WHERE id = NEW.id;
    END IF;
  END IF;

  IF NEW.payment_status = 'completed' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    PERFORM public.log_financial_ledger_entry(
      'payment_captured',
      NEW.total,
      'payment_captured:' || NEW.id::text,
      NEW.id,
      NEW.user_id,
      NULL,
      NULL,
      COALESCE(NEW.currency, 'XAF'),
      NULL,
      NULL,
      NEW.payment_reference,
      auth.uid(),
      jsonb_build_object('payment_method', NEW.payment_method)
    );
  END IF;

  IF NEW.payment_status = 'refunded' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    v_delta := COALESCE(NULLIF(NEW.refunded_amount, 0), NEW.total);
    PERFORM public.log_financial_ledger_entry(
      'refund_recorded',
      v_delta,
      'refund_recorded:' || NEW.id::text,
      NEW.id,
      NEW.user_id,
      NULL,
      NULL,
      COALESCE(NEW.currency, 'XAF'),
      NULL,
      NULL,
      NEW.payment_reference,
      auth.uid(),
      jsonb_build_object('previous_payment_status', OLD.payment_status)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_order_accounting_status ON public.orders;
CREATE TRIGGER trg_refresh_order_accounting_status
AFTER UPDATE OF payment_status, status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.refresh_order_accounting_on_status_change();

CREATE OR REPLACE VIEW public.admin_accounting_report AS
SELECT
  s.id AS snapshot_id,
  s.order_id,
  s.order_number,
  o.created_at AS order_created_at,
  o.status AS order_status,
  o.payment_status,
  o.payment_method,
  o.shipping_city,
  s.currency,
  s.subtotal AS gross_sales,
  CASE WHEN o.payment_status = 'completed' THEN s.amount_including_tax ELSE 0 END AS paid_sales,
  CASE WHEN o.payment_status = 'pending' THEN s.amount_including_tax ELSE 0 END AS pending_sales,
  s.discount_amount,
  s.delivery_fee,
  s.service_fee,
  s.tax_amount,
  s.amount_excluding_tax,
  s.amount_including_tax,
  s.payment_provider_fee,
  s.product_cost_total,
  s.gross_margin,
  s.estimated_net_margin,
  COALESCE(NULLIF(o.refunded_amount, 0), s.refunded_amount) AS refunded_amount,
  COALESCE(c.commission_total, 0) AS mlm_commissions,
  COALESCE(w.pending_withdrawal_total, 0) AS pending_withdrawals,
  COALESCE(w.completed_withdrawal_total, 0) AS completed_withdrawals,
  s.created_at AS snapshot_created_at
FROM public.order_accounting_snapshots s
JOIN public.orders o ON o.id = s.order_id
LEFT JOIN (
  SELECT order_id, sum(commission_amount) AS commission_total
  FROM public.commissions
  WHERE status <> 'refunded'
  GROUP BY order_id
) c ON c.order_id = s.order_id
LEFT JOIN (
  SELECT
    sum(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending_withdrawal_total,
    sum(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS completed_withdrawal_total
  FROM public.withdrawal_requests
) w ON true
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.admin_accounting_report TO authenticated, service_role;
GRANT SELECT ON public.delivery_zones TO authenticated, service_role;
GRANT SELECT ON public.order_accounting_snapshots TO authenticated, service_role;
GRANT SELECT ON public.financial_ledger_entries TO authenticated, service_role;
GRANT SELECT ON public.promo_redemptions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_delivery_zone(text,text,numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_financial_ledger_entry(text,numeric,text,uuid,uuid,uuid,uuid,text,numeric,numeric,text,uuid,jsonb) TO service_role;

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_accounting_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage delivery zones" ON public.delivery_zones;
CREATE POLICY "Admins manage delivery zones"
ON public.delivery_zones FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can read active delivery zones" ON public.delivery_zones;
CREATE POLICY "Users can read active delivery zones"
ON public.delivery_zones FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins read promo redemptions" ON public.promo_redemptions;
CREATE POLICY "Admins read promo redemptions"
ON public.promo_redemptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read accounting snapshots" ON public.order_accounting_snapshots;
CREATE POLICY "Admins read accounting snapshots"
ON public.order_accounting_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users read own accounting snapshots" ON public.order_accounting_snapshots;
CREATE POLICY "Users read own accounting snapshots"
ON public.order_accounting_snapshots FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read financial ledger" ON public.financial_ledger_entries;
CREATE POLICY "Admins read financial ledger"
ON public.financial_ledger_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

NOTIFY pgrst, 'reload schema';
