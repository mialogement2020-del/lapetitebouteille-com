-- Manual validation script for finance P0/P1 hardening.
-- Run in Supabase SQL Editor after applying 20260709233000_finance_p0_p1_hardening.sql.
-- This script is intentionally wrapped in a transaction and rolls back test data.

BEGIN;

-- Structural assertions: fail fast if the hardening migration is missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallets'
      AND column_name = 'pending_withdrawal_balance'
  ) THEN
    RAISE EXCEPTION 'missing pending_withdrawal_balance';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'commissions_order_beneficiary_level_unique'
  ) THEN
    RAISE EXCEPTION 'missing commission idempotency index';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'withdrawal_requests'
      AND policyname = 'Users can create withdrawal requests'
  ) THEN
    RAISE EXCEPTION 'direct user withdrawal insert policy still exists';
  END IF;
END $$;

-- RPC behavior assertions require authenticated JWT context and real test users.
-- Recommended checks in a staging project:
-- 1. As a normal user with wallet balance 10 000:
--    SELECT public.request_withdrawal(8000, '699000000', 'mtn_money');
--    Expected: wallet balance decreases by 8 000 and pending_withdrawal_balance increases by 8 000.
-- 2. Repeat immediately:
--    SELECT public.request_withdrawal(8000, '699000000', 'mtn_money');
--    Expected: ERROR insufficient_balance.
-- 3. As admin:
--    SELECT public.process_withdrawal_request('<withdrawal_id>', 'reject', 'test rollback', NULL);
--    Expected: pending_withdrawal_balance decreases and balance is restored.
-- 4. Run generate_mlm_commissions twice on the same paid order:
--    SELECT public.generate_mlm_commissions('<order_id>', '<referrer_id>', 10000);
--    SELECT public.generate_mlm_commissions('<order_id>', '<referrer_id>', 10000);
--    Expected: one commission row per (order_id, beneficiary_id, level).
-- 5. Run generate_mlm_commissions on a pending order.
--    Expected: success=false, error=order_not_commissionable, zero commission rows.
-- 6. Change the paid order to refunded/cancelled.
--    Expected: pending commissions become refunded and pending wallet balances decrease.

ROLLBACK;
