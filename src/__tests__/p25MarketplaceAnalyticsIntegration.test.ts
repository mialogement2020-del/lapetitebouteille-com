import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const vendorPage = readFileSync(join(process.cwd(), "src/pages/Vendeur.tsx"), "utf8");
const permissions = readFileSync(join(process.cwd(), "src/hooks/useAdminPermissions.ts"), "utf8");
const adminDashboard = readFileSync(join(process.cwd(), "src/components/admin/MarketplaceAnalyticsDashboard.tsx"), "utf8");
const vendorPanel = readFileSync(join(process.cwd(), "src/components/vendor/VendorMarketplaceAnalyticsPanel.tsx"), "utf8");

describe("P2.5 marketplace analytics UI wiring", () => {
  it("adds admin and vendor dashboard entries", () => {
    expect(adminPage).toContain("MarketplaceAnalyticsDashboard");
    expect(adminPage).toContain("marketplace-analytics");
    expect(vendorPage).toContain("VendorMarketplaceAnalyticsPanel");
    expect(vendorPage).toContain("Insights");
  });

  it("adds a dedicated delegated permission", () => {
    expect(permissions).toContain("'marketplace_analytics'");
    expect(permissions).toContain("'marketplace-analytics': ['marketplace_analytics'");
    expect(permissions).toContain("Marketplace Analytics & Insights");
  });

  it("supports exports from scoped RPCs", () => {
    expect(adminDashboard).toContain("export_marketplace_analytics");
    expect(vendorPanel).toContain("export_marketplace_analytics");
    expect(adminDashboard).toContain("_scope: \"admin_overview\"");
    expect(vendorPanel).toContain("_scope: \"vendor_dashboard\"");
    expect(adminDashboard).toContain("CSV");
    expect(adminDashboard).toContain("XLSX");
    expect(adminDashboard).toContain("PDF");
  });

  it("does not expose financial mutations in P2.5 UI", () => {
    expect(adminDashboard).not.toContain("wallet");
    expect(adminDashboard).not.toContain("commission");
    expect(vendorPanel).not.toContain("wallet");
    expect(vendorPanel).not.toContain("commission");
    expect(vendorPanel).not.toContain("payment_status");
  });
});
