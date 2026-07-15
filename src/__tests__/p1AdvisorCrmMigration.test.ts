import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260715165000_p1_advisor_crm.sql"),
  "utf8",
);

describe("P1 advisor CRM migration", () => {
  it("creates autonomous CRM tables for contacts, preferences, tasks and opportunities", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.crm_contacts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.crm_contact_preferences");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.crm_notes");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.crm_tasks");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.crm_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.crm_opportunities");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.crm_activity_log");
  });

  it("keeps the CRM separated from P0 financial mutation paths", () => {
    expect(migration).not.toMatch(/UPDATE\s+public\.wallets/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.commissions/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.commissions/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.orders/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.products/i);
  });

  it("enforces advisor ownership, admin transfer and append-only CRM audit logs", () => {
    expect(migration).toContain("owner_advisor_id = auth.uid() OR public.crm_is_admin()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_transfer_crm_contact");
    expect(migration).toContain("crm_activity_log_is_append_only");
    expect(migration).toContain("CREATE TRIGGER trg_crm_activity_immutable_update");
    expect(migration).toContain("CREATE TRIGGER trg_crm_activity_immutable_delete");
  });

  it("protects private notes and avoids exposing accounting or margin data in CRM order summaries", () => {
    expect(migration).toContain("public.crm_is_admin() AND is_sensitive = false");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.crm_contact_order_summary");
    expect(migration).not.toContain("purchase_price");
    expect(migration).not.toContain("gross_margin");
    expect(migration).not.toContain("estimated_net_margin");
    expect(migration).not.toContain("accounting_snapshot");
  });

  it("prepares duplicate detection and manual consent-safe follow-ups", () => {
    expect(migration).toContain("crm_duplicate_candidates");
    expect(migration).toContain("consent_status");
    expect(migration).toContain("do_not_contact");
    expect(migration).toContain("task_type IN ('follow_up', 'birthday', 'wedding'");
  });
});
