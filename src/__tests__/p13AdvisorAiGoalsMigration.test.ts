import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260716113000_p13_advisor_ai_goals.sql"),
  "utf8",
);

describe("P1.3 advisor AI goals migration", () => {
  it("creates the advisor goals foundation tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.advisor_goal_profiles");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.advisor_goal_templates");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.advisor_goal_assignments");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.advisor_goal_progress_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.advisor_goal_generation_runs");
  });

  it("connects CRM and commercial calendar context without financial mutation", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_ai_goal_source_context");
    expect(migration).toContain("public.crm_dashboard_summary");
    expect(migration).toContain("public.advisor_commercial_opportunity_calendar");
    expect(migration).toContain("source_event_id uuid REFERENCES public.commercial_opportunity_events");
  });

  it("generates personalized daily and weekly goals", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_generate_advisor_ai_goals");
    expect(migration).toContain("public.ai_goals_target_for_profile");
    expect(migration).toContain("advisor_level");
    expect(migration).toContain("specialties");
    expect(migration).toContain("availability");
    expect(migration).toContain("trust_score");
    expect(migration).toContain("business_score");
  });

  it("tracks progress and exposes dashboards", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.advisor_update_ai_goal_progress");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_ai_goals_dashboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_ai_goals_summary");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_ai_goals_effectiveness_report");
  });

  it("adds RLS and a dedicated admin permission", () => {
    expect(migration).toContain("ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'ai_goals'");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.ai_goals_is_admin");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Advisors read own assignments");
    expect(migration).toContain("AI goals admins manage templates");
  });

  it("seeds daily and weekly objective models", () => {
    expect(migration).toContain("daily_share_3_products");
    expect(migration).toContain("daily_follow_up_2_prospects");
    expect(migration).toContain("daily_call_company");
    expect(migration).toContain("weekly_qualified_conversations");
    expect(migration).toContain("weekly_company_client");
    expect(migration).toContain("weekly_academy_module");
  });

  it("does not mutate P0 or financial/order state", () => {
    expect(migration).not.toMatch(/UPDATE\s+public\.wallets/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.commissions/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.commissions/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.orders/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.products/i);
    expect(migration).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.calculate_p0/i);
    expect(migration).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.generate_mlm_commissions/i);
  });
});
