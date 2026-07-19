import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260719170000_p43_integration_hub_connector_framework.sql"),
  "utf8",
);

describe("P4.3 Integration Hub migration", () => {
  it("creates the generic connector registry, configuration, scheduler and logs", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.integration_hub_connectors");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.integration_hub_connector_configs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.integration_hub_sync_jobs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.integration_hub_sync_runs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.integration_hub_lifecycle_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.integration_hub_compatibility_findings");
  });

  it("keeps history append-only and secrets out of plain config storage", () => {
    expect(migration).toContain("integration_hub_history_is_append_only");
    expect(migration).toContain("trg_integration_hub_sync_runs_append_only_update");
    expect(migration).toContain("trg_integration_hub_lifecycle_append_only_delete");
    expect(migration).toContain("secret_refs jsonb NOT NULL DEFAULT '{}'::jsonb");
    expect(migration).toContain("secret_inline_risk");
  });

  it("registers P4.3 in P4.1 and integrates P4.2/P3.5 without provider-specific connectors", () => {
    expect(migration).toContain("'p43_integration_hub'");
    expect(migration).toContain("platform_capability_registry");
    expect(migration).toContain("platform_event_catalog");
    expect(migration).toContain("platform_observability_services");
    expect(migration).toContain("p42_api_integration_gateway");
    expect(migration).toContain("api-gateway");
    expect(migration).not.toContain("stripe");
    expect(migration).not.toContain("dhl");
  });

  it("adds admin-only RPCs, views and RLS policies", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_register_integration_connector");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_set_integration_connector_status");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_schedule_integration_connector_sync");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_check_integration_connector_compatibility");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_integration_hub_overview");
    expect(migration).toContain("ALTER TABLE public.integration_hub_connectors ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("integration_hub_is_admin()");
  });

  it("keeps P0 financial state untouched", () => {
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("DELETE FROM public.financial_ledger_entries");
    expect(migration).not.toContain("UPDATE public.order_accounting_snapshots");
  });
});
