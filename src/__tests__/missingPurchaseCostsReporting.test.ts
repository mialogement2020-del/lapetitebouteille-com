import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const report = readFileSync(
  join(process.cwd(), "src/components/admin/reports/FinancialReports.tsx"),
  "utf8"
);

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711193000_admin_missing_purchase_costs.sql"),
  "utf8"
);

describe("missing purchase costs reporting", () => {
  it("exposes an admin-only view for active products without purchase costs", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_missing_purchase_costs");
    expect(migration).toContain("p.purchase_price IS NULL OR p.purchase_price <= 0");
    expect(migration).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(migration).toContain("snapshot_sales_total");
  });

  it("shows missing purchase cost alerts in financial reports", () => {
    expect(report).toContain("admin_missing_purchase_costs");
    expect(report).toContain("produit(s) actif(s) sans prix d'achat");
    expect(report).toContain("topProducts");
  });

  it("excludes cancelled orders from pending accounting sales", () => {
    expect(report).toContain('r.order_status !== "cancelled"');
    expect(report).toContain('o.payment_status === "pending" && o.status !== "cancelled"');
  });
});
