import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260716230000_p18_business_assistant.sql"),
  "utf8",
);

describe("P1.8 Business Assistant migration", () => {
  it("creates assistant snapshots, recommendations, alerts, Q&A and summaries", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_assistant_context_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_assistant_recommendations");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_assistant_alerts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_assistant_questions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_assistant_summaries");
  });

  it("orchestrates existing P1 modules without replacing them", () => {
    expect(migration).toContain("public.business_assistant_source_context");
    expect(migration).toContain("crm_dashboard_summary");
    expect(migration).toContain("advisor_ai_goals_summary");
    expect(migration).toContain("my_business_trust_score_dashboard");
    expect(migration).toContain("advisor_commercial_opportunity_calendar");
    expect(migration).toContain("academy_courses");
    expect(migration).toContain("commercial_asset_generations");
  });

  it("provides explainable snapshots, summaries and Q&A", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.generate_business_assistant_snapshot");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.ask_business_assistant");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.generate_business_assistant_summary");
    expect(migration).toContain("data_used");
    expect(migration).toContain("rules_applied");
    expect(migration).toContain("recommended_actions");
  });

  it("exposes user and admin dashboards with RLS", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_business_assistant_dashboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_business_assistant_recommendations");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_business_assistant_alerts");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_business_assistant_overview");
    expect(migration).toContain("ALTER TABLE public.business_assistant_context_snapshots ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Business assistant own snapshots");
  });

  it("keeps history append-only where decisions must be auditable", () => {
    expect(migration).toContain("business_assistant_history_is_append_only");
    expect(migration).toContain("trg_business_assistant_snapshots_append_only");
    expect(migration).toContain("trg_business_assistant_questions_append_only");
  });

  it("does not mutate P0 or financial flows", () => {
    expect(migration).toContain("never mutates wallets, commissions, orders, Commission Pool, Revenue Engine or P0");
    expect(migration).toContain("'financial_impact', 'none'");
    expect(migration).toContain("'p0_access', 'forbidden'");
    expect(migration).not.toMatch(/UPDATE\s+public\.(wallets|orders|commissions|mlm_commissions|commission_pool_snapshots|revenue_engine_snapshots)/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.(wallets|commissions|mlm_commissions|orders|commission_pool_snapshots|revenue_engine_snapshots)/i);
    expect(migration).not.toContain("calculate_p0_revenue_observation");
    expect(migration).not.toContain("generate_mlm_commissions");
  });
});
