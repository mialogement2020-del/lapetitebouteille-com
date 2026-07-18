import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminDashboard = readFileSync(
  join(process.cwd(), "src/components/admin/MarketplaceGovernanceDashboard.tsx"),
  "utf8",
);

const vendorPanel = readFileSync(
  join(process.cwd(), "src/components/vendor/VendorMarketplaceGovernancePanel.tsx"),
  "utf8",
);

describe("P3.4 AI moderation compliance integration", () => {
  it("adds an admin compliance cockpit backed by P3.4 views and RPCs", () => {
    expect(adminDashboard).toContain("P3.4 AI Moderation & Compliance Engine");
    expect(adminDashboard).toContain("admin_marketplace_compliance_overview");
    expect(adminDashboard).toContain("admin_marketplace_compliance_queue");
    expect(adminDashboard).toContain("admin_marketplace_compliance_policy_stats");
    expect(adminDashboard).toContain("admin_marketplace_compliance_shop_stats");
    expect(adminDashboard).toContain("scan_marketplace_compliance");
    expect(adminDashboard).toContain("update_marketplace_compliance_finding_status");
  });

  it("keeps admin moderation decisions explicit and human controlled", () => {
    expect(adminDashboard).toContain("Aucune suppression automatique");
    expect(adminDashboard).toContain("Rejet propose");
    expect(adminDashboard).toContain("Ouvrir dossier");
    expect(adminDashboard).not.toContain("deleteProduct");
    expect(adminDashboard).not.toContain("suspendShop");
  });

  it("adds a seller-safe read-only compliance panel", () => {
    expect(vendorPanel).toContain("my_marketplace_compliance_findings");
    expect(vendorPanel).toContain("Conformite");
    expect(vendorPanel).toContain("Actions attendues");
    expect(vendorPanel).not.toContain("scan_marketplace_compliance");
    expect(vendorPanel).not.toContain("update_marketplace_compliance_finding_status");
  });
});
