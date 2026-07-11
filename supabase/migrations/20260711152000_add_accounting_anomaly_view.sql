-- Finance P2/P3: expose read-only accounting anomaly alerts for admins.
-- This migration is non-destructive: it creates a view only and does not mutate orders,
-- wallets, commissions, stock, snapshots, or ledger entries.

CREATE OR REPLACE VIEW public.admin_accounting_anomalies AS
WITH snapshot_items AS (
  SELECT
    s.id AS snapshot_id,
    s.order_id,
    count(*) FILTER (WHERE COALESCE(item.cost_missing, false)) AS cost_missing_count,
    COALESCE(sum(item.line_subtotal) FILTER (WHERE COALESCE(item.cost_missing, false)), 0) AS cost_missing_sales_total,
    COALESCE(sum(item.line_cost_total), 0) AS item_cost_total
  FROM public.order_accounting_snapshots s
  LEFT JOIN LATERAL jsonb_to_recordset(s.items) AS item(
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
  ) ON true
  GROUP BY s.id, s.order_id
),
ledger_rollup AS (
  SELECT
    order_id,
    count(*) FILTER (WHERE movement_type = 'order_created') AS order_created_entries,
    COALESCE(sum(amount) FILTER (WHERE movement_type = 'order_created'), 0) AS order_created_amount,
    count(*) FILTER (WHERE movement_type = 'refund_recorded') AS refund_entries,
    COALESCE(sum(amount) FILTER (WHERE movement_type = 'refund_recorded'), 0) AS refund_amount
  FROM public.financial_ledger_entries
  GROUP BY order_id
)
SELECT
  s.id AS snapshot_id,
  s.order_id,
  s.order_number,
  o.created_at AS order_created_at,
  o.status AS order_status,
  o.payment_status,
  o.payment_method,
  s.amount_including_tax,
  s.product_cost_total,
  s.estimated_net_margin,
  COALESCE(si.cost_missing_count, 0) AS cost_missing_count,
  COALESCE(si.cost_missing_sales_total, 0) AS cost_missing_sales_total,
  COALESCE(l.order_created_entries, 0) AS order_created_ledger_entries,
  COALESCE(l.order_created_amount, 0) AS order_created_ledger_amount,
  COALESCE(l.refund_entries, 0) AS refund_ledger_entries,
  COALESCE(l.refund_amount, 0) AS refund_ledger_amount,
  ARRAY_REMOVE(ARRAY[
    CASE
      WHEN COALESCE(si.cost_missing_count, 0) > 0
      THEN 'missing_purchase_cost'
    END,
    CASE
      WHEN s.amount_including_tax > 0
       AND COALESCE(s.product_cost_total, 0) = 0
      THEN 'zero_product_cost_total'
    END,
    CASE
      WHEN COALESCE(l.order_created_entries, 0) <> 1
      THEN 'order_created_ledger_count_mismatch'
    END,
    CASE
      WHEN COALESCE(l.order_created_amount, 0) <> s.amount_including_tax
      THEN 'order_created_ledger_amount_mismatch'
    END,
    CASE
      WHEN COALESCE(o.refunded_amount, 0) > 0
       AND COALESCE(l.refund_amount, 0) <> COALESCE(o.refunded_amount, 0)
      THEN 'refund_ledger_amount_mismatch'
    END,
    CASE
      WHEN o.payment_status = 'completed'
       AND o.status = 'cancelled'
       AND COALESCE(o.refunded_amount, 0) = 0
      THEN 'completed_cancelled_without_refund'
    END
  ], NULL) AS anomaly_codes,
  CASE
    WHEN COALESCE(si.cost_missing_count, 0) > 0
      OR (s.amount_including_tax > 0 AND COALESCE(s.product_cost_total, 0) = 0)
    THEN 'margin_unreliable'
    WHEN COALESCE(l.order_created_entries, 0) <> 1
      OR COALESCE(l.order_created_amount, 0) <> s.amount_including_tax
      OR (
        COALESCE(o.refunded_amount, 0) > 0
        AND COALESCE(l.refund_amount, 0) <> COALESCE(o.refunded_amount, 0)
      )
    THEN 'ledger_check_required'
    ELSE 'ok'
  END AS anomaly_status
FROM public.order_accounting_snapshots s
JOIN public.orders o ON o.id = s.order_id
LEFT JOIN snapshot_items si ON si.snapshot_id = s.id
LEFT JOIN ledger_rollup l ON l.order_id = s.order_id
WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    COALESCE(si.cost_missing_count, 0) > 0
    OR (s.amount_including_tax > 0 AND COALESCE(s.product_cost_total, 0) = 0)
    OR COALESCE(l.order_created_entries, 0) <> 1
    OR COALESCE(l.order_created_amount, 0) <> s.amount_including_tax
    OR (
      COALESCE(o.refunded_amount, 0) > 0
      AND COALESCE(l.refund_amount, 0) <> COALESCE(o.refunded_amount, 0)
    )
    OR (
      o.payment_status = 'completed'
      AND o.status = 'cancelled'
      AND COALESCE(o.refunded_amount, 0) = 0
    )
  );

GRANT SELECT ON public.admin_accounting_anomalies TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
