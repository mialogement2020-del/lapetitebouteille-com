import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const vendorPage = readFileSync(join(process.cwd(), "src/pages/Vendeur.tsx"), "utf8");
const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const permissions = readFileSync(join(process.cwd(), "src/hooks/useAdminPermissions.ts"), "utf8");
const vendorSeoPanel = readFileSync(join(process.cwd(), "src/components/vendor/VendorMarketplaceSeoPanel.tsx"), "utf8");
const adminSeoPanel = readFileSync(join(process.cwd(), "src/components/admin/MarketplaceSeoDashboard.tsx"), "utf8");
const boutiquePage = readFileSync(join(process.cwd(), "src/pages/Boutique.tsx"), "utf8");
const sitemap = readFileSync(join(process.cwd(), "scripts/generate-sitemap.mjs"), "utf8");

describe("P2.3 Marketplace SEO integration", () => {
  it("adds a seller SEO Marketplace panel", () => {
    expect(vendorPage).toContain("VendorMarketplaceSeoPanel");
    expect(vendorPage).toContain('value="seo"');
    expect(vendorSeoPanel).toContain("my_marketplace_seo_latest_products");
    expect(vendorSeoPanel).toContain("calculate_marketplace_product_seo");
    expect(vendorSeoPanel).toContain("generate_marketplace_seo_product_proposals");
    expect(vendorSeoPanel).toContain("Aucune publication automatique");
  });

  it("adds an admin SEO Marketplace console and permission", () => {
    expect(adminPage).toContain("MarketplaceSeoDashboard");
    expect(adminPage).toContain("marketplace-seo");
    expect(permissions).toContain("'marketplace_seo'");
    expect(adminSeoPanel).toContain("admin_marketplace_seo_overview");
    expect(adminSeoPanel).toContain("marketplace_search_synonyms");
  });

  it("improves public shop SEO and sitemap coverage", () => {
    expect(boutiquePage).toContain('"@type": "Store"');
    expect(boutiquePage).toContain('"@type": "BreadcrumbList"');
    expect(boutiquePage).toContain('"@type": "ItemList"');
    expect(sitemap).toContain("public_marketplace_sitemap_entries");
    expect(sitemap).toContain("marketplaceRoutes");
  });
});
