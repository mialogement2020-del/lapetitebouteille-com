import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const vendorPage = readFileSync(join(process.cwd(), "src/pages/Vendeur.tsx"), "utf8");
const permissions = readFileSync(join(process.cwd(), "src/hooks/useAdminPermissions.ts"), "utf8");
const adminDashboard = readFileSync(join(process.cwd(), "src/components/admin/CatalogueIntelligenceDashboard.tsx"), "utf8");
const vendorPanel = readFileSync(join(process.cwd(), "src/components/vendor/VendorCatalogueIntelligencePanel.tsx"), "utf8");

describe("P2.4 catalogue intelligence UI wiring", () => {
  it("adds the admin dashboard behind a dedicated permission", () => {
    expect(adminPage).toContain("CatalogueIntelligenceDashboard");
    expect(adminPage).toContain("catalogue-intelligence");
    expect(permissions).toContain("'catalogue_intelligence'");
    expect(permissions).toContain("'catalogue-intelligence': ['catalogue_intelligence'");
  });

  it("adds a vendor catalogue intelligence panel without financial actions", () => {
    expect(vendorPage).toContain("VendorCatalogueIntelligencePanel");
    expect(vendorPage).toContain("Catalogue IA");
    expect(vendorPanel).toContain("analyze_catalogue_product");
    expect(vendorPanel).toContain("update_catalogue_enrichment_proposal_status");
    expect(vendorPanel).not.toContain("wallet");
    expect(vendorPanel).not.toContain("commission");
  });

  it("keeps admin actions catalogue-scoped", () => {
    expect(adminDashboard).toContain("admin_catalogue_intelligence_overview");
    expect(adminDashboard).toContain("admin_catalogue_duplicate_candidates");
    expect(adminDashboard).toContain("update_catalogue_duplicate_candidate_status");
    expect(adminDashboard).not.toContain("updateOrder");
    expect(adminDashboard).not.toContain("payment_status");
  });
});
