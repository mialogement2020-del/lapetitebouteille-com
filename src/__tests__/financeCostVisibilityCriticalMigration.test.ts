import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260710123000_lock_sensitive_cost_visibility.sql"),
  "utf8",
);

const useProducts = readFileSync(join(process.cwd(), "src/hooks/useProducts.ts"), "utf8");
const useProfile = readFileSync(join(process.cwd(), "src/hooks/useProfile.ts"), "utf8");
const useReviews = readFileSync(join(process.cwd(), "src/hooks/useReviews.ts"), "utf8");
const useAdmin = readFileSync(join(process.cwd(), "src/hooks/useAdmin.ts"), "utf8");
const prerender = readFileSync(join(process.cwd(), "scripts/prerender-seo.mjs"), "utf8");
const sitemap = readFileSync(join(process.cwd(), "scripts/generate-sitemap.mjs"), "utf8");

const section = (start: string, end: string) => {
  const startIndex = migration.indexOf(start);
  const endIndex = migration.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return migration.slice(startIndex, endIndex);
};

describe("critical cost visibility hardening", () => {
  it("removes cost and margin fields from public products and locks product grants", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.public_products");
    const publicProducts = section(
      "CREATE OR REPLACE VIEW public.public_products",
      "CREATE OR REPLACE VIEW public.customer_order_items",
    );
    expect(publicProducts).not.toContain("purchase_price");
    expect(publicProducts).not.toContain("markup_percent_override");
    expect(migration).toContain("REVOKE SELECT ON public.products FROM anon, authenticated");
    expect(migration).toContain("REVOKE SELECT (purchase_price, markup_percent_override, points_override)");
    expect(migration).toContain("REVOKE UPDATE (purchase_price, markup_percent_override, points_override, points_tiers_override)");
    expect(migration).toContain("REVOKE INSERT (purchase_price, markup_percent_override, points_override, points_tiers_override)");
  });

  it("uses safe public product reads for browser catalogue and SEO generation", () => {
    expect(useProducts).toContain('"public_products" as never');
    expect(useProducts).not.toContain('.from("products")');
    expect(prerender).toContain('supabaseFetch("public_products"');
    expect(sitemap).toContain("/rest/v1/public_products");
  });

  it("moves customer order item reads to a safe view without cost columns", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.customer_order_items");
    const customerItems = section(
      "CREATE OR REPLACE VIEW public.customer_order_items",
      "CREATE OR REPLACE VIEW public.customer_order_accounting_summary",
    );
    expect(customerItems).not.toContain("purchase_unit_cost");
    expect(customerItems).not.toContain("line_cost_total");
    expect(migration).toContain('DROP POLICY IF EXISTS "Anyone can view order items"');
    expect(migration).toContain("REVOKE SELECT (purchase_unit_cost, line_cost_total, accounting_metadata)");
    expect(useProfile).toContain('"customer_order_items" as never');
    expect(useReviews).toContain('"customer_order_items" as never');
  });

  it("removes customer access to complete accounting snapshots", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Users read own accounting snapshots"');
    expect(migration).toContain("REVOKE SELECT ON public.order_accounting_snapshots FROM anon, authenticated");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.customer_order_accounting_summary");
    const customerSummary = section(
      "CREATE OR REPLACE VIEW public.customer_order_accounting_summary",
      "CREATE OR REPLACE VIEW public.admin_products_secure",
    );
    expect(customerSummary).not.toContain("product_cost_total");
    expect(customerSummary).not.toContain("gross_margin");
    expect(customerSummary).not.toContain("estimated_net_margin");
  });

  it("keeps admin and service-role access through explicit server-side paths", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_products_secure");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_set_product_sensitive_pricing");
    expect(migration).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(migration).toContain("GRANT SELECT, UPDATE ON public.products TO service_role");
    expect(useAdmin).toContain('"admin_products_secure" as never');
    expect(useAdmin).toContain("admin_set_product_sensitive_pricing");
  });
});
