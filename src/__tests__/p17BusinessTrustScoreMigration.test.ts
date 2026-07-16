import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260716210000_p17_business_trust_score.sql"),
  "utf8",
);

describe("P1.7 Business Score and Trust Score migration", () => {
  it("creates score profiles, snapshots, events, badges and recommendations", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_score_profiles");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_score_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_score_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_score_badges");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_score_user_badges");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_score_recommendations");
  });

  it("calculates business, trust and global scores in observation mode", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.calculate_business_trust_score");
    expect(migration).toContain("v_business_score");
    expect(migration).toContain("v_trust_score");
    expect(migration).toContain("v_global_score");
    expect(migration).toContain("'financial_impact', 'none'");
  });

  it("exposes user dashboards and admin reports", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_business_trust_score_dashboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_business_score_badges");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_business_score_recommendations");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_business_score_leaderboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_business_score_alerts");
  });

  it("adds automated badges and recommendation signals", () => {
    expect(migration).toContain("conseiller-actif");
    expect(migration).toContain("marketplace-premium");
    expect(migration).toContain("top-conseiller");
    expect(migration).toContain("partenaire-verifie");
    expect(migration).toContain("Completer les formations LPB");
  });

  it("protects score history and RLS access", () => {
    expect(migration).toContain("business_score_history_append_only");
    expect(migration).toContain("trg_business_score_snapshots_append_only");
    expect(migration).toContain("ALTER TABLE public.business_score_snapshots ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Business score own snapshots");
    expect(migration).toContain("Business score own recommendations");
  });

  it("does not mutate P0 or financial flows", () => {
    expect(migration).toContain("never mutates wallets, commissions, orders, Commission Pool, Revenue Engine or P0");
    expect(migration).not.toMatch(/UPDATE\s+public\.(wallets|orders|commissions|mlm_commissions|commission_pool_snapshots|revenue_engine_snapshots)/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.(wallets|commissions|mlm_commissions|orders|commission_pool_snapshots|revenue_engine_snapshots)/i);
    expect(migration).not.toContain("calculate_p0_revenue_observation");
    expect(migration).not.toContain("generate_mlm_commissions");
  });
});
