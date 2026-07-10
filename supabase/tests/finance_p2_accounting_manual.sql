-- Finance P2 manual verification script.
-- Run in a staging database after applying:
-- 20260710013000_finance_p2_accounting_snapshots.sql
--
-- This file is intentionally non-destructive by default. Replace placeholder ids
-- in a transaction, inspect results, then ROLLBACK.

BEGIN;

-- 1. Schema invariants.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_accounting_snapshots'
  ) THEN
    RAISE EXCEPTION 'missing order_accounting_snapshots';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'financial_ledger_entries'
  ) THEN
    RAISE EXCEPTION 'missing financial_ledger_entries';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'delivery_zones'
  ) THEN
    RAISE EXCEPTION 'missing delivery_zones';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'promo_redemptions'
  ) THEN
    RAISE EXCEPTION 'missing promo_redemptions';
  END IF;
END $$;

-- 2. Delivery zone examples.
SELECT * FROM public.resolve_delivery_zone('Yaoundé', 'Bastos', 10000);
SELECT * FROM public.resolve_delivery_zone('Yaounde', NULL, 60000);

-- Expected failure for uncovered city:
-- SELECT * FROM public.resolve_delivery_zone('Ville Inconnue', NULL, 10000);

-- 3. Checkout scenario template.
-- Replace <product_id> with an active product that has stock.
-- Replace auth context via Supabase dashboard authenticated session or service tests.
--
-- SELECT public.create_order_from_checkout(
--   jsonb_build_array(jsonb_build_object('product_id', '<product_id>'::uuid, 'quantity', 1)),
--   jsonb_build_object(
--     'fullName', 'Client Test',
--     'email', 'client.test@example.com',
--     'phone', '699000000',
--     'city', 'Yaoundé',
--     'neighborhood', 'Bastos',
--     'streetAddress', 'Rue Test',
--     'additionalInfo', ''
--   ),
--   'cash_on_delivery'::public.payment_method,
--   NULL,
--   NULL,
--   NULL,
--   NULL
-- );
--
-- Expected:
-- - one orders row
-- - one order_accounting_snapshots row
-- - one financial_ledger_entries row with movement_type='order_created'
-- - order_items.purchase_unit_cost and line_cost_total frozen from product purchase_price

-- 4. Immutability checks after creating an order:
-- UPDATE public.order_accounting_snapshots SET subtotal = subtotal + 1 WHERE order_id = '<order_id>'::uuid;
-- Expected: ERROR financial_history_is_append_only.
--
-- DELETE FROM public.financial_ledger_entries WHERE order_id = '<order_id>'::uuid;
-- Expected: ERROR financial_history_is_append_only.

-- 5. Promo concurrency checks:
-- Create a coupon with max_uses_per_user = 1, then run checkout twice with the
-- same authenticated user or same guest email/phone. Second run must fail with
-- promo_user_limit_reached or promo_guest_limit_reached.

-- 6. Price-change snapshot check:
-- After creating an order, update products.price and products.purchase_price for
-- that product, then compare order_accounting_snapshots.items. The item unit
-- price and purchase_unit_cost must remain unchanged.

-- 7. Refund/cancel checks:
-- Update a paid order to payment_status='refunded'. Expected:
-- - no snapshot rewrite
-- - financial_ledger_entries contains refund_recorded once
-- - P0/P1 trigger reverses pending MLM commissions
--
-- UPDATE public.orders SET payment_status='refunded' WHERE id='<order_id>'::uuid;
-- SELECT movement_type, amount FROM public.financial_ledger_entries WHERE order_id='<order_id>'::uuid;

ROLLBACK;
