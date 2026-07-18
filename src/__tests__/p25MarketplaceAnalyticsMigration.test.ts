import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260718150000_p25_marketplace_analytics_insights.sql"),
  "utf8",
);

describe("P2.5 marketplace analytics migration", () => {
  it("creates analytics snapshots, alerts and export logs", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_analytics_daily_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_analytics_alerts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_analytics_export_logs");
    expect(migration).toContain("UNIQUE (vendor_shop_id, snapshot_date)");
  });

  it("aggregates P2.1 to P2.4 sources without creating P0 dependencies", () => {
    expect(migration).toContain("marketplace_image_studio_jobs");
    expect(migration).toContain("marketplace_coach_recommendations");
    expect(migration).toContain("marketplace_seo_product_scores");
    expect(migration).toContain("catalogue_product_quality_snapshots");
    expect(migration).toContain("catalogue_duplicate_candidates");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
  });

  it("exposes scoped dashboard, trend, alert and export RPCs", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.calculate_marketplace_analytics_snapshot");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.export_marketplace_analytics");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_marketplace_analytics_dashboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_marketplace_analytics_trends");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_analytics_overview");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_analytics_trends");
  });

  it("protects analytics with vendor/admin RLS", () => {
    expect(migration).toContain("ALTER TABLE public.marketplace_analytics_daily_snapshots ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("vendor_owner_id = auth.uid() OR public.marketplace_analytics_is_admin()");
    expect(migration).toContain("requested_by = auth.uid() OR public.marketplace_analytics_is_admin()");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.export_marketplace_analytics");
  });
});
