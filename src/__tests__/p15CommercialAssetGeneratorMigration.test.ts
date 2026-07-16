import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260716170000_p15_commercial_asset_generator.sql"),
  "utf8",
);

describe("P1.5 commercial asset generator migration", () => {
  it("creates reusable commercial asset templates, generations, exports and tracking", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_asset_templates");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_asset_generations");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_asset_exports");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_asset_events");
    expect(migration).toContain("commercial_asset_events_append_only");
  });

  it("supports generation, export requests and analytics reports", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.generate_commercial_asset");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.request_commercial_asset_export");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.record_commercial_asset_event");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_commercial_asset_dashboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_commercial_asset_report");
  });

  it("includes official reusable templates for key commercial use cases", () => {
    expect(migration).toContain("Promotion week-end WhatsApp");
    expect(migration).toContain("Story cadeau premium");
    expect(migration).toContain("Offre entreprise");
    expect(migration).toContain("Flyer mariage");
    expect(migration).toContain("Mini catalogue conseiller");
    expect(migration).toContain("Carte de visite digitale");
  });

  it("keeps advisors isolated with RLS and admin-only template management", () => {
    expect(migration).toContain("ALTER TABLE public.commercial_asset_templates ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.commercial_asset_generations ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("owner_id = auth.uid()");
    expect(migration).toContain("public.commercial_asset_is_admin()");
  });

  it("does not mutate financial or P0 objects", () => {
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("UPDATE public.products");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("calculate_p0");
    expect(migration).not.toContain("generate_mlm_commissions");
    expect(migration).not.toContain("commission_pool_snapshots");
    expect(migration).not.toContain("revenue_engine_snapshots");
  });
});
