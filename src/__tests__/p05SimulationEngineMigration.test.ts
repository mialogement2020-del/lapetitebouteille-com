import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260715113000_p05_simulation_engine.sql"),
  "utf8",
);

describe("P0.5 Simulation Engine migration", () => {
  it("creates simulation run and per-order comparison tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.p05_simulation_runs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.p05_simulation_order_results");
    expect(migration).toContain("simulation_accuracy");
    expect(migration).toContain("simulation_confidence_score");
    expect(migration).toContain("p05_simulation_results_are_append_only");
  });

  it("compares production calculations with P0 results without financial mutation", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.simulate_p05_order");
    expect(migration).toContain("production_commission");
    expect(migration).toContain("p0_commission_pool");
    expect(migration).toContain("theoretical_platform_profit");
    expect(migration).toContain("attribution_difference");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
  });

  it("adds historical replay and admin simulation reports", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.run_p05_simulation_replay");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_p05_simulation_dashboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_p05_simulation_vs_production");
    expect(migration).toContain("commandes_simulees");
    expect(migration).toContain("calcul_actuel");
    expect(migration).toContain("calcul_p0");
  });

  it("requires a super admin activation gate and never enables finance execution automatically", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.p05_engine_activation_controls");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.is_super_admin_for_p0");
    expect(migration).toContain("ap.permission = 'full_access'");
    expect(migration).toContain("not_enough_simulated_orders");
    expect(migration).toContain("simulation_confidence_too_low");
    expect(migration).toContain("is_financial_execution_enabled, metadata");
    expect(migration).toContain("false,");
  });
});
