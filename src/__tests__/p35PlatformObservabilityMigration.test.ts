import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260719003000_p35_platform_observability_health.sql"),
  "utf8",
);

describe("P3.5 platform observability migration", () => {
  it("creates observability registry, metrics, logs, alerts and scan runs", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_observability_services");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_observability_metrics");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_observability_logs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_observability_alert_rules");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_observability_alerts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_observability_runs");
  });

  it("keeps observability history append-only where it matters", () => {
    expect(migration).toContain("platform_observability_history_is_append_only");
    expect(migration).toContain("trg_platform_observability_metrics_append_only_update");
    expect(migration).toContain("trg_platform_observability_logs_append_only_delete");
  });

  it("adds admin-only views and RPCs", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_platform_observability_overview");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_platform_observability_services");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_platform_observability_recent_alerts");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.scan_platform_observability");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.acknowledge_platform_observability_alert");
    expect(migration).toContain("public.platform_observability_is_admin()");
  });

  it("observes P1/P2/P3 components without mutating P0 financial tables", () => {
    expect(migration).toContain("'public.marketplace_image_studio_jobs'");
    expect(migration).toContain("'public.marketplace_workflow_automation_queue'");
    expect(migration).toContain("'public.marketplace_compliance_findings'");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("UPDATE public.financial_ledger_entries");
    expect(migration).not.toContain("UPDATE public.order_accounting_snapshots");
  });
});
