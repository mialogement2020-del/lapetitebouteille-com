import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260717170000_p23_marketplace_seo_discoverability.sql"),
  "utf8",
);

describe("P2.3 Marketplace SEO & Discoverability migration", () => {
  it("adds advisory SEO, discoverability and proposal tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_seo_product_scores");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_seo_shop_scores");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_seo_content_proposals");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_search_synonyms");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_discoverability_events");
    expect(migration).toContain("marketplace_seo_history_append_only");
  });

  it("calculates SEO scores and proposals without publishing automatically", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.calculate_marketplace_product_seo");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.calculate_marketplace_shop_seo");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.generate_marketplace_seo_product_proposals");
    expect(migration).toContain("Propositions SEO créées sans publication automatique");
    expect(migration).toContain("status text NOT NULL DEFAULT 'draft'");
  });

  it("exposes seller, admin and sitemap views", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_marketplace_seo_latest_products");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_marketplace_seo_shop_score");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_seo_overview");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.public_marketplace_sitemap_entries");
    expect(migration).toContain("GRANT SELECT ON public.public_marketplace_sitemap_entries TO anon, authenticated");
  });

  it("keeps P0 finance untouched", () => {
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("CREATE OR REPLACE FUNCTION public.create_order_from_checkout");
  });
});
