import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260715103000_p0_revenue_pool_attribution_observation.sql"),
  "utf8",
);

describe("P0 revenue, pool and attribution observation migration", () => {
  it("adds append-only observation tables for revenue, commission pool and attribution", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.revenue_engine_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commission_pool_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.attribution_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.order_attributions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.governance_decision_logs");
    expect(migration).toContain("p0_observation_history_is_append_only");
  });

  it("keeps P0 in observation mode and does not mutate existing wallets or commissions", () => {
    expect(migration).toContain("mode text NOT NULL DEFAULT 'observation'");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.calculate_p0_revenue_observation");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
  });

  it("blocks commissions when payment, cost or margin rules are unsafe", () => {
    expect(migration).toContain("payment_not_completed");
    expect(migration).toContain("missing_purchase_cost");
    expect(migration).toContain("minimum_platform_margin_not_met");
    expect(migration).toContain("commission_pool_not_positive");
    expect(migration).toContain("order_refunded");
  });

  it("logs AI Governance explanations for important decisions", () => {
    expect(migration).toContain("AI Governance Engine");
    expect(migration).toContain("data_used");
    expect(migration).toContain("rules_applied");
    expect(migration).toContain("estimated_impacts");
    expect(migration).toContain("alternatives");
  });

  it("exposes admin-only reports and restricts direct execution", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_p0_revenue_observation_report");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_p0_governance_decision_report");
    expect(migration).toContain("WHERE public.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.calculate_p0_revenue_observation(uuid) FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.calculate_p0_revenue_observation(uuid) TO service_role");
  });
});
