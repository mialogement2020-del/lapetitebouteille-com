import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260718113000_p24_catalogue_intelligence_engine.sql"),
  "utf8",
);

describe("P2.4 catalogue intelligence migration", () => {
  it("creates catalogue intelligence referentials, quality snapshots and proposals", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.catalogue_attribute_definitions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.catalogue_brand_references");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.catalogue_category_taxonomy");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.catalogue_product_variants");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.catalogue_product_quality_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.catalogue_ai_enrichment_proposals");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.catalogue_duplicate_candidates");
  });

  it("adds RPCs for analysis and traceable review decisions", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.analyze_catalogue_product");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_catalogue_enrichment_proposal_status");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_catalogue_duplicate_candidate_status");
    expect(migration).toContain("INSERT INTO public.catalogue_intelligence_events");
    expect(migration).toContain("product_analyzed");
    expect(migration).toContain("proposal_status_changed");
  });

  it("keeps marketplace catalogue intelligence away from P0 financial mutations", () => {
    expect(migration).toContain("no wallet, commission, order, payment, withdrawal, ledger or P0 mutation");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.wallets");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("INSERT INTO public.orders");
    expect(migration).not.toContain("UPDATE public.revenue_engine");
    expect(migration).not.toContain("UPDATE public.commission_pool");
  });

  it("protects data with RLS and vendor/admin scoped views", () => {
    expect(migration).toContain("ALTER TABLE public.catalogue_product_quality_snapshots ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("vendor_owner_id = auth.uid() OR public.catalogue_intelligence_is_admin()");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_catalogue_quality_latest");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_catalogue_intelligence_overview");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_catalogue_duplicate_candidates");
  });
});
