import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260710013000_finance_p2_accounting_snapshots.sql"),
  "utf8"
);

describe("finance P2 accounting migration", () => {
  it("adds immutable accounting snapshots and append-only ledger", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.order_accounting_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.financial_ledger_entries");
    expect(migration).toContain("financial_history_is_append_only");
    expect(migration).toContain("trg_order_accounting_snapshots_immutable_update");
    expect(migration).toContain("trg_financial_ledger_entries_immutable_update");
    expect(migration).toContain("ON CONFLICT (idempotency_key) DO NOTHING");
  });

  it("moves delivery fee rules to server-side delivery zones", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.delivery_zones");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.resolve_delivery_zone");
    expect(migration).toContain("delivery_zone_unavailable");
    expect(migration).not.toContain("v_delivery_fee := CASE WHEN v_subtotal >= 50000 THEN 0 ELSE 2000 END");
  });

  it("records promotion redemptions with concurrency-friendly limits", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.promo_redemptions");
    expect(migration).toContain("max_uses_per_user");
    expect(migration).toContain("promo_user_limit_reached");
    expect(migration).toContain("promo_guest_limit_reached");
    expect(migration).toContain("FOR UPDATE");
  });

  it("keeps MLM P0/P1 generation rules untouched", () => {
    expect(migration).not.toContain("CREATE OR REPLACE FUNCTION public.generate_mlm_commissions");
    expect(migration).toContain("mlm_generation_rule");
  });

  it("creates admin accounting reports from snapshots instead of live product prices", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_accounting_report");
    expect(migration).toContain("FROM public.order_accounting_snapshots s");
    expect(migration).toContain("WHERE public.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(migration).toContain("product_cost_total");
    expect(migration).toContain("estimated_net_margin");
  });
});
