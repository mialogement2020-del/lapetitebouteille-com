import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711170000_harden_mlm_commission_reversals.sql"),
  "utf8"
);

describe("MLM commission reversal hardening", () => {
  it("reverses pending and completed commissions without deleting history", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS reversed_at");
    expect(migration).toContain("c.status IN ('pending', 'completed')");
    expect(migration).toContain("status = 'refunded'");
    expect(migration).not.toContain("DELETE FROM public.commissions");
  });

  it("does not allow wallet balances to become negative during completed commission recovery", () => {
    expect(migration).toContain("v_recoverable := LEAST(COALESCE(v_wallet.balance, 0), r.commission_amount)");
    expect(migration).toContain("balance = GREATEST(COALESCE(balance, 0) - v_recoverable, 0)");
    expect(migration).toContain("total_earned = GREATEST(COALESCE(total_earned, 0) - r.commission_amount, 0)");
    expect(migration).toContain("'adjustment'");
    expect(migration).toContain("-v_recoverable");
  });

  it("keeps reversal automatic when an order is cancelled or refunded", () => {
    expect(migration).toContain("NEW.payment_status = 'refunded' OR NEW.status = 'cancelled'");
    expect(migration).toContain("PERFORM public.reverse_mlm_commissions_for_order(NEW.id)");
    expect(migration).toContain("RAISE WARNING 'MLM commission reversal skipped");
  });

  it("adds an admin anomaly view for unrecovered or duplicate commissions", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_mlm_commission_anomalies");
    expect(migration).toContain("active_commission_on_invalid_order");
    expect(migration).toContain("commission_reversal_not_fully_recovered");
    expect(migration).toContain("duplicate_commission");
    expect(migration).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
  });
});
