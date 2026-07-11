import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711152000_add_accounting_anomaly_view.sql"),
  "utf8"
);

const financialReports = readFileSync(
  join(process.cwd(), "src/components/admin/reports/FinancialReports.tsx"),
  "utf8"
);

describe("admin accounting anomalies", () => {
  it("creates a read-only admin anomaly view without mutating financial state", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_accounting_anomalies");
    expect(migration).toContain("FROM public.order_accounting_snapshots s");
    expect(migration).toContain("FROM public.financial_ledger_entries");
    expect(migration).toContain("WHERE public.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(migration).toContain("GRANT SELECT ON public.admin_accounting_anomalies");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("DELETE FROM");
  });

  it("flags missing cost and ledger mismatch anomalies", () => {
    expect(migration).toContain("missing_purchase_cost");
    expect(migration).toContain("zero_product_cost_total");
    expect(migration).toContain("order_created_ledger_count_mismatch");
    expect(migration).toContain("order_created_ledger_amount_mismatch");
    expect(migration).toContain("refund_ledger_amount_mismatch");
    expect(migration).toContain("completed_cancelled_without_refund");
  });

  it("surfaces anomaly warnings in the financial report", () => {
    expect(financialReports).toContain('"admin_accounting_anomalies" as never');
    expect(financialReports).toContain("anomalie(s) comptable(s)");
    expect(financialReports).toContain("marge(s) peu fiable(s)");
    expect(financialReports).toContain("Coûts d'achat manquants");
  });
});
