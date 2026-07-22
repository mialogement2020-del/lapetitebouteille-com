# Supplier Cost Control Queries

These SQL queries are read-only diagnostics for production.

They must not update products, orders, wallets, commissions, ledgers or snapshots.

## 1. Active product cost coverage

```sql
SELECT
  count(*) AS active_products,
  count(*) FILTER (WHERE purchase_price IS NULL) AS purchase_price_null,
  count(*) FILTER (WHERE purchase_price = 0) AS purchase_price_zero,
  count(*) FILTER (WHERE purchase_price > 0) AS purchase_price_present
FROM public.products
WHERE is_active = true;
```

## 2. Margin health summary

Change `0.10` if the minimum retail margin threshold changes.

```sql
WITH active_products AS (
  SELECT
    id,
    name,
    sku,
    category_id,
    price,
    purchase_price,
    CASE
      WHEN purchase_price IS NULL OR purchase_price <= 0 THEN NULL
      ELSE round(((price - purchase_price) / purchase_price) * 100, 2)
    END AS margin_percent
  FROM public.products
  WHERE is_active = true
)
SELECT
  count(*) AS active_products,
  count(*) FILTER (WHERE purchase_price IS NULL) AS missing_purchase_price,
  count(*) FILTER (WHERE purchase_price = 0) AS zero_purchase_price,
  count(*) FILTER (WHERE purchase_price > 0 AND price < purchase_price) AS negative_margin_products,
  count(*) FILTER (WHERE purchase_price > 0 AND price >= purchase_price AND ((price - purchase_price) / purchase_price) < 0.10) AS below_10_percent_margin,
  round(avg(margin_percent), 2) AS average_margin_percent,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY margin_percent) AS median_margin_percent
FROM active_products;
```

## 3. Products with negative or weak margin

```sql
SELECT
  p.id,
  p.name,
  p.sku,
  c.name AS category_name,
  p.price,
  p.purchase_price,
  round(p.price - p.purchase_price, 0) AS margin_amount,
  round(((p.price - p.purchase_price) / NULLIF(p.purchase_price, 0)) * 100, 2) AS margin_percent
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE p.is_active = true
  AND p.purchase_price IS NOT NULL
  AND p.purchase_price > 0
  AND (
    p.price < p.purchase_price
    OR ((p.price - p.purchase_price) / p.purchase_price) < 0.10
  )
ORDER BY margin_percent ASC, p.name ASC;
```

## 4. Margin distribution by category

```sql
SELECT
  COALESCE(c.name, 'Sans categorie') AS category_name,
  count(*) AS active_products,
  count(*) FILTER (WHERE p.purchase_price IS NULL OR p.purchase_price <= 0) AS missing_or_zero_cost,
  count(*) FILTER (WHERE p.purchase_price > 0 AND p.price < p.purchase_price) AS negative_margin,
  round(avg(((p.price - p.purchase_price) / NULLIF(p.purchase_price, 0)) * 100), 2) AS average_margin_percent,
  percentile_cont(0.5) WITHIN GROUP (
    ORDER BY ((p.price - p.purchase_price) / NULLIF(p.purchase_price, 0)) * 100
  ) AS median_margin_percent
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE p.is_active = true
GROUP BY COALESCE(c.name, 'Sans categorie')
ORDER BY missing_or_zero_cost DESC, average_margin_percent ASC NULLS LAST;
```

## 5. Sold products still missing purchase cost in snapshots

This detects historical or current accounting snapshots that cannot explain margin.

```sql
SELECT
  s.order_number,
  s.created_at,
  s.status,
  s.payment_status,
  s.product_cost_total,
  s.estimated_net_margin,
  s.items
FROM public.order_accounting_snapshots s
WHERE s.items::text ILIKE '%"cost_missing":true%'
   OR COALESCE(s.product_cost_total, 0) <= 0
ORDER BY s.created_at DESC
LIMIT 100;
```

## 6. Current products referenced by recent order items with missing purchase price

```sql
SELECT DISTINCT
  p.id,
  p.name,
  p.sku,
  p.price,
  p.purchase_price,
  o.order_number,
  o.created_at
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
JOIN public.products p ON p.id = oi.product_id
WHERE o.created_at >= now() - interval '90 days'
  AND (p.purchase_price IS NULL OR p.purchase_price <= 0)
ORDER BY o.created_at DESC, p.name ASC;
```

Expected current production result after supplier price completion:

- active products with `purchase_price NULL`: 0
- active products with `purchase_price = 0`: 0
- negative margin products: 0 unless manually justified
- recent sold products with missing current purchase price: 0
