import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260717113000_p22_marketplace_coach.sql"),
  "utf8",
);

describe("P2.2 marketplace coach migration", () => {
  it("creates the marketplace coach intelligence tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_coach_product_analyses");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_coach_recommendations");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_coach_shop_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_coach_events");
    expect(migration).toContain("marketplace_coach_history_append_only");
  });

  it("adds advisory functions for product analysis, shop snapshots and recommendation status", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.analyze_marketplace_product");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.generate_marketplace_coach_shop_snapshot");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_marketplace_coach_recommendation_status");
    expect(migration).toContain("recommendation_type text NOT NULL CHECK");
    expect(migration).toContain("justification text NOT NULL");
  });

  it("uses marketplace quality signals without changing financial flows", () => {
    expect(migration).toContain("marketplace_image_studio_jobs");
    expect(migration).toContain("business_scores");
    expect(migration).toContain("analytics_events");
    expect(migration).toContain("reviews");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.wallets");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("INSERT INTO public.orders");
    expect(migration).not.toContain("calculate_p0_revenue_observation");
    expect(migration).not.toContain("generate_mlm_commissions");
    expect(migration).not.toContain("commission_pool_snapshots");
    expect(migration).not.toContain("revenue_engine_snapshots");
  });

  it("enforces vendor or admin visibility with RLS and admin permission", () => {
    expect(migration).toContain("ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'marketplace_coach'");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("vendor_owner_id = auth.uid()");
    expect(migration).toContain("public.marketplace_coach_is_admin()");
    expect(migration).toContain("vs.name AS shop_name");
    expect(migration).not.toContain("vs.shop_name");
    expect(migration).toContain("GRANT SELECT ON public.my_marketplace_coach_dashboard TO authenticated");
    expect(migration).toContain("GRANT SELECT ON public.admin_marketplace_coach_overview TO authenticated");
  });
});
