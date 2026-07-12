import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");

describe("Admin tab code splitting", () => {
  it("lazy-loads heavy admin sections instead of importing every tab eagerly", () => {
    expect(adminPage).toContain("lazy(() => import(\"@/components/admin/OrchestrationDashboard\")");
    expect(adminPage).toContain("lazy(() => import(\"@/components/admin/reports/FinancialReports\")");
    expect(adminPage).toContain("lazy(() => import(\"@/components/admin/MLMDashboard\")");
    expect(adminPage).not.toContain("import { OrchestrationDashboard } from \"@/components/admin/OrchestrationDashboard\"");
    expect(adminPage).not.toContain("import FinancialReports from \"@/components/admin/reports/FinancialReports\"");
  });

  it("renders lazy tabs and dialogs behind suspense boundaries", () => {
    expect(adminPage).toContain("<Suspense fallback={<AdminModuleFallback />}>");
    expect(adminPage).toContain("<Suspense fallback={null}>");
    expect(adminPage).toContain("{isProductDialogOpen && (");
    expect(adminPage).toContain("{showVerifyDialog && (");
  });
});
