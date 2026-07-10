-- Manual post-migration checks for 20260710123000_lock_sensitive_cost_visibility.sql.
-- Run in Supabase SQL Editor after applying the migration.
-- This script is read-only and fails fast if a sensitive cost/margin path is exposed.

DO $$
DECLARE
  sensitive_column text;
BEGIN
  IF to_regclass('public.public_products') IS NULL THEN
    RAISE EXCEPTION 'public_products view is missing';
  END IF;

  IF to_regclass('public.customer_order_items') IS NULL THEN
    RAISE EXCEPTION 'customer_order_items view is missing';
  END IF;

  IF to_regclass('public.customer_order_accounting_summary') IS NULL THEN
    RAISE EXCEPTION 'customer_order_accounting_summary view is missing';
  END IF;

  IF to_regclass('public.admin_products_secure') IS NULL THEN
    RAISE EXCEPTION 'admin_products_secure view is missing';
  END IF;

  FOREACH sensitive_column IN ARRAY ARRAY[
    'purchase_price',
    'markup_percent_override',
    'points_override',
    'purchase_unit_cost',
    'line_cost_total',
    'product_cost_total',
    'gross_margin',
    'gross_margin_percent',
    'estimated_net_margin',
    'accounting_metadata'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('public_products', 'customer_order_items', 'customer_order_accounting_summary')
        AND column_name = sensitive_column
    ) THEN
      RAISE EXCEPTION 'Sensitive column % is exposed by a customer-facing view', sensitive_column;
    END IF;
  END LOOP;

  IF has_column_privilege('anon', 'public.products', 'purchase_price', 'SELECT') THEN
    RAISE EXCEPTION 'anon can still select products.purchase_price';
  END IF;

  IF has_column_privilege('authenticated', 'public.products', 'purchase_price', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated can still select products.purchase_price';
  END IF;

  IF has_column_privilege('anon', 'public.products', 'markup_percent_override', 'SELECT') THEN
    RAISE EXCEPTION 'anon can still select products.markup_percent_override';
  END IF;

  IF has_column_privilege('authenticated', 'public.products', 'markup_percent_override', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated can still select products.markup_percent_override';
  END IF;

  IF has_column_privilege('anon', 'public.products', 'points_override', 'SELECT') THEN
    RAISE EXCEPTION 'anon can still select products.points_override';
  END IF;

  IF has_column_privilege('authenticated', 'public.products', 'points_override', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated can still select products.points_override';
  END IF;

  IF has_column_privilege('anon', 'public.order_items', 'purchase_unit_cost', 'SELECT') THEN
    RAISE EXCEPTION 'anon can still select order_items.purchase_unit_cost';
  END IF;

  IF has_column_privilege('authenticated', 'public.order_items', 'purchase_unit_cost', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated can still select order_items.purchase_unit_cost';
  END IF;

  IF has_column_privilege('anon', 'public.order_items', 'line_cost_total', 'SELECT') THEN
    RAISE EXCEPTION 'anon can still select order_items.line_cost_total';
  END IF;

  IF has_column_privilege('authenticated', 'public.order_items', 'line_cost_total', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated can still select order_items.line_cost_total';
  END IF;

  IF has_table_privilege('anon', 'public.public_products', 'SELECT') IS NOT TRUE THEN
    RAISE EXCEPTION 'anon cannot select public_products';
  END IF;

  IF has_table_privilege('authenticated', 'public.public_products', 'SELECT') IS NOT TRUE THEN
    RAISE EXCEPTION 'authenticated cannot select public_products';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'Anyone can view order items'
  ) THEN
    RAISE EXCEPTION 'Unsafe order_items public policy still exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_accounting_snapshots'
      AND policyname = 'Users read own accounting snapshots'
  ) THEN
    RAISE EXCEPTION 'Users can still read own accounting snapshots directly';
  END IF;
END $$;

SELECT
  'finance_cost_visibility_manual_checks_passed' AS status,
  now() AS checked_at;
