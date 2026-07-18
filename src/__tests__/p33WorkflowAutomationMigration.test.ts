import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260718210000_p33_workflow_automation_orchestration.sql"),
  "utf8",
);

describe("P3.3 workflow automation orchestration migration", () => {
  it("creates the automation rule, queue, execution, task and scheduler layer", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_rules");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_queue");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_executions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_tasks");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_schedules");
  });

  it("keeps execution history append-only and admin visible", () => {
    expect(migration).toContain("marketplace_workflow_automation_history_is_append_only");
    expect(migration).toContain("trg_marketplace_workflow_automation_executions_append_only");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_workflow_automation_executions");
    expect(migration).toContain("WHERE public.marketplace_workflow_automation_is_admin()");
  });

  it("only allows non-sensitive orchestration actions", () => {
    expect(migration).toContain("'send_notification'");
    expect(migration).toContain("'create_task'");
    expect(migration).toContain("'schedule_reminder'");
    expect(migration).toContain("'assign_checklist'");
    expect(migration).toContain("'request_information'");
    expect(migration).toContain("'propose_escalation'");
    expect(migration).toContain("'open_sub_case'");
    expect(migration).toContain("marketplace_workflow_automation_forbidden_action");
  });

  it("does not mutate P0 financial tables", () => {
    expect(migration).not.toMatch(/UPDATE public\.(wallets|commissions|orders|payments|withdrawal_requests|financial_ledger_entries|revenue_engine_snapshots|commission_pool_snapshots)/);
    expect(migration).not.toMatch(/INSERT INTO public\.(wallets|commissions|orders|payments|withdrawal_requests|financial_ledger_entries|revenue_engine_snapshots|commission_pool_snapshots)/);
    expect(migration).not.toContain("capture_escrow");
    expect(migration).not.toContain("refund_escrow");
  });

  it("exposes explicit admin and service processing RPCs", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_create_marketplace_workflow_automation_rule");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_toggle_marketplace_workflow_automation_rule");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.process_marketplace_workflow_automation_queue");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.process_marketplace_workflow_scheduler");
  });
});
