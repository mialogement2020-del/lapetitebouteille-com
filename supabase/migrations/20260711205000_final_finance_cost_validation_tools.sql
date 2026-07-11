-- Final finance validation tools: product purchase-cost audit and controlled import.
-- Additive only: no historical orders, snapshots, ledger entries, wallets, or commissions are mutated.

CREATE TABLE IF NOT EXISTS public.product_cost_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'preview' CHECK (status IN ('preview', 'applied', 'cancelled')),
  source_filename text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_cost_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.product_cost_import_batches(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  sku text,
  nom_produit text,
  devise text DEFAULT 'XAF',
  fournisseur text,
  date_effet date,
  prix_achat numeric,
  frais_transport numeric NOT NULL DEFAULT 0,
  frais_douane numeric NOT NULL DEFAULT 0,
  autres_frais numeric NOT NULL DEFAULT 0,
  landed_purchase_price numeric,
  commentaire text,
  product_id uuid,
  product_name text,
  sale_price numeric,
  current_purchase_price numeric,
  stock_quantity integer,
  recent_sales_count integer NOT NULL DEFAULT 0,
  recent_revenue numeric NOT NULL DEFAULT 0,
  estimated_margin numeric,
  status text NOT NULL CHECK (status IN ('accepted', 'warning', 'rejected')),
  warnings text[] NOT NULL DEFAULT '{}',
  rejection_reasons text[] NOT NULL DEFAULT '{}',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_cost_import_rows_batch
  ON public.product_cost_import_rows(batch_id, line_number);

CREATE INDEX IF NOT EXISTS idx_product_cost_import_rows_product
  ON public.product_cost_import_rows(product_id);

ALTER TABLE public.product_cost_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_cost_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage product cost import batches" ON public.product_cost_import_batches;
CREATE POLICY "Admins manage product cost import batches"
ON public.product_cost_import_batches
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage product cost import rows" ON public.product_cost_import_rows;
CREATE POLICY "Admins manage product cost import rows"
ON public.product_cost_import_rows
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE VIEW public.admin_product_cost_validation_report AS
WITH recent_sales AS (
  SELECT
    item.product_id,
    count(DISTINCT s.order_id) AS recent_sales_count,
    COALESCE(sum(item.quantity), 0) AS recent_units_sold,
    COALESCE(sum(item.line_subtotal), 0) AS recent_revenue,
    max(o.created_at) AS last_sold_at,
    bool_or(COALESCE(item.cost_missing, false)) AS sold_with_missing_cost
  FROM public.order_accounting_snapshots s
  JOIN public.orders o ON o.id = s.order_id
  CROSS JOIN LATERAL jsonb_to_recordset(s.items) AS item(
    product_id uuid,
    quantity integer,
    line_subtotal numeric,
    cost_missing boolean
  )
  WHERE o.created_at >= now() - interval '90 days'
    AND o.status <> 'cancelled'
  GROUP BY item.product_id
)
SELECT
  p.id AS product_id,
  p.sku,
  p.name,
  c.name AS category_name,
  p.price AS sale_price,
  p.purchase_price,
  round(COALESCE(p.price, 0) - COALESCE(p.purchase_price, 0), 0) AS estimated_margin,
  CASE
    WHEN COALESCE(p.price, 0) > 0 AND COALESCE(p.purchase_price, 0) > 0
      THEN round(((p.price - p.purchase_price) / p.price) * 100, 2)
    ELSE NULL
  END AS estimated_margin_percent,
  p.stock_quantity,
  COALESCE(rs.recent_sales_count, 0) AS recent_sales_count,
  COALESCE(rs.recent_units_sold, 0) AS recent_units_sold,
  COALESCE(rs.recent_revenue, 0) AS recent_revenue,
  rs.last_sold_at,
  COALESCE(rs.sold_with_missing_cost, false) AS sold_recently_without_reliable_cost,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN p.purchase_price IS NULL THEN 'missing_purchase_cost' END,
    CASE WHEN p.purchase_price = 0 THEN 'zero_purchase_cost' END,
    CASE WHEN p.purchase_price > p.price THEN 'cost_above_sale_price' END,
    CASE WHEN p.purchase_price > 0 AND p.price - p.purchase_price < 0 THEN 'negative_margin' END,
    CASE WHEN p.purchase_price > 0 AND p.price > 0 AND ((p.price - p.purchase_price) / p.price) < 0.10 THEN 'low_margin_under_10_percent' END,
    CASE WHEN COALESCE(rs.sold_with_missing_cost, false) THEN 'recent_sale_without_reliable_cost' END,
    CASE WHEN COALESCE(p.stock_quantity, 0) > 0 AND (p.purchase_price IS NULL OR p.purchase_price <= 0) THEN 'stock_available_without_cost' END
  ], NULL) AS issues,
  CASE
    WHEN COALESCE(rs.sold_with_missing_cost, false) THEN 1
    WHEN COALESCE(rs.recent_sales_count, 0) > 0 AND (p.purchase_price IS NULL OR p.purchase_price <= 0) THEN 1
    WHEN p.purchase_price > p.price THEN 1
    WHEN p.purchase_price IS NULL OR p.purchase_price = 0 THEN 2
    WHEN COALESCE(p.stock_quantity, 0) > 0 AND p.price >= 50000 THEN 2
    WHEN COALESCE(rs.recent_sales_count, 0) > 0 THEN 3
    WHEN COALESCE(p.stock_quantity, 0) > 0 THEN 4
    ELSE 5
  END AS correction_priority,
  CASE
    WHEN COALESCE(rs.sold_with_missing_cost, false) THEN '1 vendu recemment sans cout fiable'
    WHEN COALESCE(rs.recent_sales_count, 0) > 0 THEN '2 vendu recemment'
    WHEN COALESCE(p.stock_quantity, 0) > 0 AND p.price >= 50000 THEN '3 stock disponible forte valeur'
    WHEN COALESCE(p.stock_quantity, 0) > 0 THEN '4 stock disponible'
    WHEN p.purchase_price IS NULL OR p.purchase_price <= 0 THEN '6 aucune donnee de cout'
    ELSE '5 controle standard'
  END AS correction_bucket
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN recent_sales rs ON rs.product_id = p.id
WHERE p.is_active = true
  AND public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.admin_product_cost_validation_report TO authenticated, service_role;

CREATE OR REPLACE VIEW public.admin_product_cost_import_template AS
SELECT
  COALESCE(p.sku, p.slug) AS sku,
  p.name AS nom_produit,
  NULL::numeric AS prix_achat,
  'XAF'::text AS devise,
  NULL::text AS fournisseur,
  CURRENT_DATE AS date_effet,
  0::numeric AS frais_transport,
  0::numeric AS frais_douane,
  0::numeric AS autres_frais,
  NULL::text AS commentaire
FROM public.products p
WHERE p.is_active = true
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
ORDER BY p.name;

GRANT SELECT ON public.admin_product_cost_import_template TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.safe_numeric_from_text(_value text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NULLIF(trim(COALESCE(_value, '')), '') IS NULL THEN NULL
    WHEN replace(trim(_value), ',', '.') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN replace(trim(_value), ',', '.')::numeric
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.safe_date_from_text(_value text)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NULLIF(trim(COALESCE(_value, '')), '') IS NULL THEN NULL
    WHEN trim(_value) ~ '^\d{4}-\d{2}-\d{2}$'
      THEN trim(_value)::date
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_preview_product_cost_import(
  _rows jsonb,
  _source_filename text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid;
  v_summary jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF jsonb_typeof(_rows) <> 'array' THEN
    RAISE EXCEPTION 'rows_must_be_json_array';
  END IF;

  INSERT INTO public.product_cost_import_batches(created_by, source_filename)
  VALUES (auth.uid(), _source_filename)
  RETURNING id INTO v_batch_id;

  WITH input_rows AS (
    SELECT
      row_number() OVER ()::integer AS line_number,
      NULLIF(trim(x.sku), '') AS sku,
      NULLIF(trim(COALESCE(x.nom_produit, x.name)), '') AS nom_produit,
      NULLIF(trim(COALESCE(x.devise, 'XAF')), '') AS devise,
      NULLIF(trim(x.fournisseur), '') AS fournisseur,
      NULLIF(trim(x.date_effet), '') AS date_effet_raw,
      public.safe_date_from_text(x.date_effet) AS date_effet,
      NULLIF(trim(COALESCE(x.prix_achat, x.purchase_price)), '') AS prix_achat_raw,
      NULLIF(trim(x.frais_transport), '') AS frais_transport_raw,
      NULLIF(trim(x.frais_douane), '') AS frais_douane_raw,
      NULLIF(trim(x.autres_frais), '') AS autres_frais_raw,
      public.safe_numeric_from_text(COALESCE(x.prix_achat, x.purchase_price)) AS prix_achat,
      COALESCE(public.safe_numeric_from_text(x.frais_transport), 0) AS frais_transport,
      COALESCE(public.safe_numeric_from_text(x.frais_douane), 0) AS frais_douane,
      COALESCE(public.safe_numeric_from_text(x.autres_frais), 0) AS autres_frais,
      NULLIF(trim(x.commentaire), '') AS commentaire
    FROM jsonb_to_recordset(_rows) AS x(
      sku text,
      nom_produit text,
      name text,
      prix_achat text,
      purchase_price text,
      devise text,
      fournisseur text,
      date_effet text,
      frais_transport text,
      frais_douane text,
      autres_frais text,
      commentaire text
    )
  ),
  duplicate_keys AS (
    SELECT
      COALESCE(lower(sku), 'name:' || lower(nom_produit)) AS row_key,
      count(*) AS duplicate_count
    FROM input_rows
    GROUP BY COALESCE(lower(sku), 'name:' || lower(nom_produit))
  ),
  resolved AS (
    SELECT
      i.*,
      p.id AS product_id,
      p.name AS product_name,
      p.price AS sale_price,
      p.purchase_price AS current_purchase_price,
      p.stock_quantity,
      COALESCE(u.recent_sales_count, 0) AS recent_sales_count,
      COALESCE(u.recent_revenue, 0) AS recent_revenue,
      i.prix_achat + i.frais_transport + i.frais_douane + i.autres_frais AS landed_purchase_price,
      dk.duplicate_count
    FROM input_rows i
    LEFT JOIN public.products p ON (
      (i.sku IS NOT NULL AND lower(p.sku) = lower(i.sku))
      OR (i.sku IS NULL AND i.nom_produit IS NOT NULL AND lower(p.name) = lower(i.nom_produit))
    )
    LEFT JOIN public.admin_product_cost_validation_report u ON u.product_id = p.id
    LEFT JOIN duplicate_keys dk ON dk.row_key = COALESCE(lower(i.sku), 'name:' || lower(i.nom_produit))
  ),
  classified AS (
    SELECT
      r.*,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN r.duplicate_count > 1 THEN 'duplicate_import_row' END,
        CASE WHEN r.product_id IS NULL THEN 'unknown_product' END,
        CASE WHEN r.prix_achat IS NULL THEN 'missing_purchase_price' END,
        CASE WHEN r.prix_achat_raw IS NOT NULL AND r.prix_achat IS NULL THEN 'invalid_purchase_price' END,
        CASE WHEN r.frais_transport_raw IS NOT NULL AND public.safe_numeric_from_text(r.frais_transport_raw) IS NULL THEN 'invalid_transport_fee' END,
        CASE WHEN r.frais_douane_raw IS NOT NULL AND public.safe_numeric_from_text(r.frais_douane_raw) IS NULL THEN 'invalid_customs_fee' END,
        CASE WHEN r.autres_frais_raw IS NOT NULL AND public.safe_numeric_from_text(r.autres_frais_raw) IS NULL THEN 'invalid_other_fee' END,
        CASE WHEN r.date_effet_raw IS NOT NULL AND r.date_effet IS NULL THEN 'invalid_effective_date' END,
        CASE WHEN r.prix_achat < 0 OR r.frais_transport < 0 OR r.frais_douane < 0 OR r.autres_frais < 0 THEN 'negative_amount' END
      ], NULL) AS rejection_reasons,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN r.prix_achat = 0 THEN 'zero_purchase_price' END,
        CASE WHEN r.landed_purchase_price > r.sale_price THEN 'cost_above_sale_price' END,
        CASE WHEN r.landed_purchase_price > 0 AND r.sale_price > 0 AND ((r.sale_price - r.landed_purchase_price) / r.sale_price) < 0.10 THEN 'low_margin_under_10_percent' END,
        CASE WHEN COALESCE(r.devise, 'XAF') <> 'XAF' THEN 'non_xaf_currency_verify_conversion' END
      ], NULL) AS warnings
    FROM resolved r
  )
  INSERT INTO public.product_cost_import_rows (
    batch_id, line_number, sku, nom_produit, devise, fournisseur, date_effet,
    prix_achat, frais_transport, frais_douane, autres_frais, landed_purchase_price,
    commentaire, product_id, product_name, sale_price, current_purchase_price,
    stock_quantity, recent_sales_count, recent_revenue, estimated_margin,
    status, warnings, rejection_reasons
  )
  SELECT
    v_batch_id, line_number, sku, nom_produit, COALESCE(devise, 'XAF'), fournisseur, date_effet,
    prix_achat, frais_transport, frais_douane, autres_frais, landed_purchase_price,
    commentaire, product_id, product_name, sale_price, current_purchase_price,
    stock_quantity, recent_sales_count, recent_revenue,
    CASE WHEN product_id IS NULL OR landed_purchase_price IS NULL THEN NULL ELSE sale_price - landed_purchase_price END,
    CASE
      WHEN cardinality(rejection_reasons) > 0 THEN 'rejected'
      WHEN cardinality(warnings) > 0 THEN 'warning'
      ELSE 'accepted'
    END,
    warnings,
    rejection_reasons
  FROM classified;

  SELECT jsonb_build_object(
    'batch_id', v_batch_id,
    'total_rows', count(*),
    'accepted_rows', count(*) FILTER (WHERE status IN ('accepted', 'warning')),
    'rejected_rows', count(*) FILTER (WHERE status = 'rejected'),
    'warning_rows', count(*) FILTER (WHERE status = 'warning'),
    'unknown_products', count(*) FILTER (WHERE 'unknown_product' = ANY(rejection_reasons)),
    'duplicate_rows', count(*) FILTER (WHERE 'duplicate_import_row' = ANY(rejection_reasons)),
    'zero_cost_warnings', count(*) FILTER (WHERE 'zero_purchase_price' = ANY(warnings)),
    'cost_above_sale_warnings', count(*) FILTER (WHERE 'cost_above_sale_price' = ANY(warnings))
  )
  INTO v_summary
  FROM public.product_cost_import_rows
  WHERE batch_id = v_batch_id;

  UPDATE public.product_cost_import_batches
  SET summary = v_summary
  WHERE id = v_batch_id;

  RETURN v_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_apply_product_cost_import(_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.product_cost_import_batches%ROWTYPE;
  r public.product_cost_import_rows%ROWTYPE;
  v_old_purchase numeric;
  v_applied integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT * INTO v_batch
  FROM public.product_cost_import_batches
  WHERE id = _batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'batch_not_found';
  END IF;

  IF v_batch.status <> 'preview' THEN
    RAISE EXCEPTION 'batch_already_processed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.product_cost_import_rows
    WHERE batch_id = _batch_id
      AND status = 'rejected'
  ) THEN
    RAISE EXCEPTION 'batch_contains_rejected_rows';
  END IF;

  FOR r IN
    SELECT *
    FROM public.product_cost_import_rows
    WHERE batch_id = _batch_id
      AND status IN ('accepted', 'warning')
      AND product_id IS NOT NULL
    ORDER BY line_number
  LOOP
    SELECT purchase_price INTO v_old_purchase
    FROM public.products
    WHERE id = r.product_id
    FOR UPDATE;

    UPDATE public.products
    SET purchase_price = round(r.landed_purchase_price, 0),
        updated_at = now()
    WHERE id = r.product_id;

    UPDATE public.product_cost_import_rows
    SET current_purchase_price = v_old_purchase,
        applied_at = now()
    WHERE id = r.id;

    INSERT INTO public.admin_audit_logs (
      user_id, user_email, action, entity_type, entity_id, entity_name, old_values, new_values, created_at
    )
    SELECT
      auth.uid(),
      au.email,
      'update',
      'product',
      r.product_id,
      r.product_name,
      jsonb_build_object('purchase_price', v_old_purchase),
      jsonb_build_object(
        'purchase_price', round(r.landed_purchase_price, 0),
        'batch_id', _batch_id,
        'source', 'product_cost_import',
        'line_number', r.line_number,
        'fournisseur', r.fournisseur,
        'date_effet', r.date_effet,
        'commentaire', r.commentaire
      ),
      now()
    FROM auth.users au
    WHERE au.id = auth.uid();

    v_applied := v_applied + 1;
  END LOOP;

  UPDATE public.product_cost_import_batches
  SET status = 'applied',
      applied_at = now(),
      summary = summary || jsonb_build_object('applied_rows', v_applied, 'applied_at', now())
  WHERE id = _batch_id;

  RETURN jsonb_build_object('batch_id', _batch_id, 'applied_rows', v_applied);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_preview_product_cost_import(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_product_cost_import(uuid) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.product_cost_import_batches TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.product_cost_import_rows TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
