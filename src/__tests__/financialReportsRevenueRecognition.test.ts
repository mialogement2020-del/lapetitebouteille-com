import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const financialReports = readFileSync(
  join(process.cwd(), "src/components/admin/reports/FinancialReports.tsx"),
  "utf8"
);

describe("admin financial reports revenue recognition", () => {
  it("recognizes only completed payments as revenue", () => {
    expect(financialReports).toContain(
      'filteredAccounting.filter((r) => r.payment_status === "completed")'
    );
    expect(financialReports).toContain(
      'filteredOrders.filter((o) => o.payment_status === "completed")'
    );
    expect(financialReports).not.toContain(
      "const revenue = filteredAccounting.reduce((s, r) => s + Number(r.amount_including_tax ?? 0), 0)"
    );
  });

  it("keeps pending sales visible but not recognized as revenue", () => {
    expect(financialReports).toContain("Ventes en attente non reconnues");
    expect(financialReports).toContain("pendingSales");
    expect(financialReports).toContain("Math.max(0, paidSales - refunds)");
  });
});
