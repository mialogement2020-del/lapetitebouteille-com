import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const vendorPage = readFileSync(join(process.cwd(), "src/pages/Vendeur.tsx"), "utf8");
const adminComponent = readFileSync(join(process.cwd(), "src/components/admin/MarketplaceGovernanceDashboard.tsx"), "utf8");
const vendorComponent = readFileSync(join(process.cwd(), "src/components/vendor/VendorMarketplaceGovernancePanel.tsx"), "utf8");

describe("P3.2 workflow case resolution UI integration", () => {
  it("keeps the existing P3 governance entry points while upgrading the workflow content", () => {
    expect(adminPage).toContain("MarketplaceGovernanceDashboard");
    expect(adminPage).toContain("marketplace-governance");
    expect(vendorPage).toContain("VendorMarketplaceGovernancePanel");
    expect(vendorPage).toContain('value="governance"');
    expect(adminComponent).toContain("P3.2 Workflow & Case Resolution");
    expect(vendorComponent).toContain("Workflow Marketplace");
  });

  it("admin UI uses P3.2 resolution views and RPCs", () => {
    expect(adminComponent).toContain("admin_marketplace_case_resolution_overview");
    expect(adminComponent).toContain("admin_marketplace_case_resolution_queue");
    expect(adminComponent).toContain("admin_marketplace_case_comments");
    expect(adminComponent).toContain("admin_marketplace_case_checklist_items");
    expect(adminComponent).toContain("admin_marketplace_case_escalations");
    expect(adminComponent).toContain("initialize_marketplace_case_resolution");
    expect(adminComponent).toContain("suggest_marketplace_case_assignees");
    expect(adminComponent).toContain("transition_marketplace_governance_case");
    expect(adminComponent).toContain("scan_marketplace_case_escalations");
    expect(adminComponent).toContain("update_marketplace_case_checklist_item");
  });

  it("vendor UI uses only vendor-scoped P3.2 views and cannot update workflow decisions", () => {
    expect(vendorComponent).toContain("my_marketplace_case_resolution_cases");
    expect(vendorComponent).toContain("my_marketplace_case_comments");
    expect(vendorComponent).toContain("my_marketplace_case_checklist_items");
    expect(vendorComponent).toContain("add_marketplace_case_comment");
    expect(vendorComponent).not.toContain("admin_marketplace_case_comments");
    expect(vendorComponent).not.toContain("transition_marketplace_governance_case");
    expect(vendorComponent).not.toContain("update_marketplace_case_checklist_item");
  });

  it("does not add P0 financial mutation code to workflow components", () => {
    const combined = `${adminComponent}\n${vendorComponent}`;
    expect(combined).not.toMatch(/from\("wallets"\)|from\("commissions"\)|from\("orders"\)|from\("payments"\)|from\("withdrawal_requests"\)/);
    expect(combined).not.toContain("Revenue Engine");
    expect(combined).not.toContain("Commission Pool");
  });
});
