-- Finance P3: expose active products that still miss purchase costs.
-- Read-only admin view: no product, order, wallet, or ledger data is mutated.

CREATE OR REPLACE VIEW public.admin_missing_purchase_costs AS
SELECT
  p.id AS product_id,
  p.name,
  p.slug,
  p.category_id,
  c.name AS category_name,
  p.price,
  p.purchase_price,
  p.stock_quantity,
  p.is_active,
  p.updated_at,
  COALESCE(snapshot_usage.snapshot_order_count, 0) AS snapshot_order_count,
  COALESCE(snapshot_usage.snapshot_units, 0) AS snapshot_units,
  COALESCE(snapshot_usage.snapshot_sales_total, 0) AS snapshot_sales_total,
  CASE
    WHEN COALESCE(snapshot_usage.snapshot_sales_total, 0) >= 100000 THEN 'critical'
    WHEN COALESCE(snapshot_usage.snapshot_order_count, 0) > 0 THEN 'high'
    WHEN COALESCE(p.price, 0) >= 50000 THEN 'high'
    WHEN COALESCE(p.price, 0) >= 15000 THEN 'medium'
    ELSE 'low'
  END AS priority
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN LATERAL (
  SELECT
    count(DISTINCT s.order_id) AS snapshot_order_count,
    COALESCE(sum(item.quantity), 0) AS snapshot_units,
    COALESCE(sum(item.line_subtotal), 0) AS snapshot_sales_total
  FROM public.order_accounting_snapshots s
  CROSS JOIN LATERAL jsonb_to_recordset(s.items) AS item(
    product_id uuid,
    quantity integer,
    line_subtotal numeric,
    cost_missing boolean
  )
  WHERE item.product_id = p.id
    AND COALESCE(item.cost_missing, false) = true
) AS snapshot_usage ON true
WHERE p.is_active = true
  AND (p.purchase_price IS NULL OR p.purchase_price <= 0)
  AND public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.admin_missing_purchase_costs TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
