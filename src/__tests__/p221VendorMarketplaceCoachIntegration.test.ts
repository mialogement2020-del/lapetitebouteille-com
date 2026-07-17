import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const vendorPage = readFileSync(join(process.cwd(), "src/pages/Vendeur.tsx"), "utf8");
const vendorCoachPanel = readFileSync(
  join(process.cwd(), "src/components/vendor/VendorMarketplaceCoachPanel.tsx"),
  "utf8",
);

describe("P2.2.1 vendor marketplace coach integration", () => {
  it("exposes the marketplace coach from the vendor space", () => {
    expect(vendorPage).toContain("VendorMarketplaceCoachPanel");
    expect(vendorPage).toContain("Coach Marketplace");
    expect(vendorPage).toContain("<TabsContent value=\"coach\">");
  });

  it("uses only authenticated vendor-scoped P2.2 views and RPCs", () => {
    expect(vendorCoachPanel).toContain("my_marketplace_coach_dashboard");
    expect(vendorCoachPanel).toContain("my_marketplace_coach_recommendations");
    expect(vendorCoachPanel).toContain("my_marketplace_coach_product_analyses");
    expect(vendorCoachPanel).toContain("generate_marketplace_coach_shop_snapshot");
    expect(vendorCoachPanel).toContain("analyze_marketplace_product");
    expect(vendorCoachPanel).toContain("update_marketplace_coach_recommendation_status");
    expect(vendorCoachPanel).not.toContain("vendor_owner_id");
  });

  it("does not touch P0 or financial flows from the vendor coach UI", () => {
    const combined = `${vendorPage}\n${vendorCoachPanel}`;
    expect(combined).not.toContain("wallets");
    expect(combined).not.toContain("commissions");
    expect(combined).not.toContain("revenue_engine");
    expect(combined).not.toContain("commission_pool");
    expect(combined).not.toContain("withdrawal_requests");
    expect(combined).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(combined).not.toContain("service_role");
  });
});
