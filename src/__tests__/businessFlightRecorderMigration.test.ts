import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260715153000_business_flight_recorder.sql"),
  "utf8",
);

describe("Business Flight Recorder migration", () => {
  it("creates append-only flight recorder memory", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_flight_recorder_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_flight_replay_runs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.business_engine_version_comparisons");
    expect(migration).toContain("business_flight_recorder_is_append_only");
    expect(migration).toContain("trg_bfr_events_immutable");
    expect(migration).toContain("trg_bfr_replay_runs_immutable");
    expect(migration).toContain("trg_bfr_version_comparisons_immutable");
  });

  it("records the full P0 reasoning chain for a replayed order", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_replay_business_flight_order");
    expect(migration).toContain("order_created");
    expect(migration).toContain("payment_status_checked");
    expect(migration).toContain("product_cost_loaded");
    expect(migration).toContain("margin_calculated");
    expect(migration).toContain("commission_pool_calculated");
    expect(migration).toContain("attribution_determined");
    expect(migration).toContain("fraud_checked");
    expect(migration).toContain("ai_governance_decision");
    expect(migration).toContain("trust_score");
    expect(migration).toContain("business_score");
  });

  it("adds version comparison without production mutation", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_compare_business_engine_versions");
    expect(migration).toContain("different_decision_count");
    expect(migration).toContain("margin_impact_total");
    expect(migration).toContain("commission_pool_impact_total");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("UPDATE public.products");
  });
});
