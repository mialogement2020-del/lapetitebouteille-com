import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const vendorPage = readFileSync(join(process.cwd(), "src/pages/Vendeur.tsx"), "utf8");
const permissions = readFileSync(join(process.cwd(), "src/hooks/useAdminPermissions.ts"), "utf8");
const adminComponent = readFileSync(join(process.cwd(), "src/components/admin/MarketplaceGovernanceDashboard.tsx"), "utf8");
const vendorComponent = readFileSync(join(process.cwd(), "src/components/vendor/VendorMarketplaceGovernancePanel.tsx"), "utf8");

describe("P3.1 marketplace governance UI integration", () => {
  it("adds an admin governance tab protected by the new permission", () => {
    expect(adminPage).toContain("MarketplaceGovernanceDashboard");
    expect(adminPage).toContain("marketplace-governance");
    expect(permissions).toContain("| 'marketplace_governance'");
    expect(permissions).toContain("'marketplace-governance': ['marketplace_governance'");
  });

  it("adds a vendor governance panel with read/comment workflow", () => {
    expect(vendorPage).toContain("VendorMarketplaceGovernancePanel");
    expect(vendorPage).toContain('value="governance"');
    expect(vendorComponent).toMatch(/my_marketplace_(governance_cases|case_resolution_cases)/);
    expect(vendorComponent).toMatch(/(comment_marketplace_governance_case|add_marketplace_case_comment)/);
    expect(vendorComponent).not.toContain("update_marketplace_governance_case");
  });

  it("admin UI scans, reviews and updates cases without direct table writes", () => {
    expect(adminComponent).toContain("scan_marketplace_governance_cases");
    expect(adminComponent).toMatch(/(update_marketplace_governance_case|transition_marketplace_governance_case)/);
    expect(adminComponent).toMatch(/(admin_marketplace_governance_queue|admin_marketplace_case_resolution_queue)/);
    expect(adminComponent).not.toContain('.from("marketplace_governance_cases").update');
    expect(adminComponent).not.toContain('.from("marketplace_governance_cases").insert');
  });

  it("contains no P0 financial mutation code in governance components", () => {
    const combined = `${adminComponent}\n${vendorComponent}`;
    expect(combined).not.toMatch(/wallets|commissions|payments|withdrawal|ledger|Revenue Engine|Commission Pool/);
  });
});
