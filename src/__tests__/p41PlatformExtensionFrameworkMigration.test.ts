import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260719110000_p41_platform_extension_framework.sql"),
  "utf8",
);

describe("P4.1 platform extension framework migration", () => {
  it("creates extension registries and versioned contracts", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_extension_modules");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_capability_registry");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_event_catalog");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_rpc_contracts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_edge_function_contracts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_scheduled_task_registry");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_feature_flags");
  });

  it("keeps platform flags auditable and admin controlled", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_feature_flag_history");
    expect(migration).toContain("platform_extension_history_is_append_only");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.set_platform_feature_flag");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.is_platform_feature_enabled");
    expect(migration).toContain("admin_required");
  });

  it("documents P0 without mutating financial state", () => {
    expect(migration).toContain("'p0_finance_observation'");
    expect(migration).toContain("'p0.production_activation_guard'");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("DELETE FROM public.financial_ledger_entries");
    expect(migration).not.toContain("UPDATE public.order_accounting_snapshots");
  });

  it("exposes admin-only technical reports and observability integration", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_platform_extension_overview");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_platform_dependency_map");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_platform_compatibility_alerts");
    expect(migration).toContain("platform_observability_services");
    expect(migration).toContain("WHERE public.platform_extension_is_admin()");
  });
});
