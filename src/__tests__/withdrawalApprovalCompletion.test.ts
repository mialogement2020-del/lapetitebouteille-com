import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711161000_separate_withdrawal_approval_completion.sql"),
  "utf8"
);

const mlmDashboard = readFileSync(
  join(process.cwd(), "src/components/admin/MLMDashboard.tsx"),
  "utf8"
);

describe("withdrawal approval and completion flow", () => {
  it("separates approval from payout completion in the RPC", () => {
    expect(migration).toContain("WHEN _action = 'approve' THEN 'approved'::public.withdrawal_status");
    expect(migration).toContain("WHEN _action = 'complete' THEN 'completed'::public.withdrawal_status");
    expect(migration).toContain("missing_transaction_reference");
    expect(migration).toContain("OLD.status NOT IN ('pending', 'approved')");
    expect(migration).toContain("IF NEW.status = 'approved' THEN");
  });

  it("moves reserved balance only when withdrawal is completed or rejected", () => {
    expect(migration).toContain("pending_withdrawal_balance = pending_withdrawal_balance - NEW.amount");
    expect(migration).toContain("total_withdrawn = COALESCE(total_withdrawn, 0) + NEW.amount");
    expect(migration).toContain("balance = balance + NEW.amount");
    expect(migration).toContain("Retrait payé via");
  });

  it("requires admins to mark approved withdrawals as paid with a transaction reference", () => {
    expect(mlmDashboard).toContain('action: "complete"');
    expect(mlmDashboard).toContain("transactionReference");
    expect(mlmDashboard).toContain("Marquer payé");
    expect(mlmDashboard).toContain("Référence transaction Mobile Money");
  });
});
