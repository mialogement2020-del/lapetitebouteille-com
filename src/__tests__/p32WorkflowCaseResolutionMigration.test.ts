import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260718190000_p32_workflow_case_resolution.sql"),
  "utf8",
);

describe("P3.2 workflow case resolution migration", () => {
  it("extends P3.1 governance cases with workflow state without replacing detection", () => {
    expect(migration).toContain("ALTER TABLE public.marketplace_governance_cases");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS workflow_status_code");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS responsible_team_id");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS due_at");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_workflow_statuses");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_resolution_teams");
  });

  it("adds assignment, comments, checklist, escalation and append-only journal tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_case_assignments");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_case_comments");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_case_checklist_templates");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_case_checklist_items");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_case_escalations");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_case_workflow_events");
    expect(migration).toContain("marketplace_workflow_event_is_append_only");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.marketplace_workflow_append_only");
    expect(migration).toContain("trg_marketplace_workflow_events_append_only");
    expect(migration).toContain("trg_marketplace_case_comments_append_only");
  });

  it("adds controlled RPCs and keeps escalation as proposal only", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.initialize_marketplace_case_resolution");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.suggest_marketplace_case_assignees");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.assign_marketplace_governance_case");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.transition_marketplace_governance_case");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.add_marketplace_case_comment");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_marketplace_case_checklist_item");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.scan_marketplace_case_escalations");
    expect(migration).toContain("'mode', 'proposal_only'");
    expect(migration).not.toContain("auto_approve");
  });

  it("exposes separate admin and vendor scoped views", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_case_resolution_queue");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_case_resolution_overview");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_case_comments");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_marketplace_case_resolution_cases");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_marketplace_case_comments");
    expect(migration).toContain("cc.visibility = 'vendor'");
    expect(migration).toContain("c.vendor_owner_id = auth.uid()");
  });

  it("does not mutate P0 financial surfaces", () => {
    expect(migration).not.toMatch(/UPDATE public\.(wallets|commissions|orders|payments|withdrawal_requests|financial_ledger_entries|revenue_engine_snapshots|commission_pool_snapshots)/);
    expect(migration).not.toMatch(/INSERT INTO public\.(wallets|commissions|orders|payments|withdrawal_requests|financial_ledger_entries|revenue_engine_snapshots|commission_pool_snapshots)/);
    expect(migration).not.toMatch(/DELETE FROM public\.(wallets|commissions|orders|payments|withdrawal_requests|financial_ledger_entries|revenue_engine_snapshots|commission_pool_snapshots)/);
  });
});
