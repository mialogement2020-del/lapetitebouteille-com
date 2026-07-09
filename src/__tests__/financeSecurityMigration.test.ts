import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260709233000_finance_p0_p1_hardening.sql"),
  "utf8",
);

describe("finance P0/P1 hardening migration", () => {
  it("reserves withdrawal funds through an RPC and blocks direct user inserts", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.request_withdrawal");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("pending_withdrawal_balance");
    expect(migration).toContain('CREATE POLICY "Users request withdrawals through RPC only"');
    expect(migration).toContain("WITH CHECK (false)");
  });

  it("processes withdrawals atomically without bypassing admin authorization", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.process_withdrawal_request");
    expect(migration).toContain("public.has_role(v_admin_id, 'admin'::public.app_role)");
    expect(migration).toContain("withdrawal_status_change_trigger");
  });

  it("prevents duplicate MLM commissions for the same order, beneficiary and level", () => {
    expect(migration).toContain("commissions_order_beneficiary_level_unique");
    expect(migration).toContain("dedupe_key");
    expect(migration).toContain("ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING");
  });

  it("generates MLM commissions only for paid non-cancelled orders", () => {
    expect(migration).toContain("v_order.payment_status <> 'completed'");
    expect(migration).toContain("o.payment_status = 'completed'");
    expect(migration).toContain("trg_generate_commissions_on_paid_order");
    expect(migration).toContain("reverse_mlm_commissions_for_order");
  });

  it("keeps sensitive product pricing out of public reads", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.public_products");
    expect(migration).toContain("REVOKE SELECT (purchase_price, markup_percent_override, points_override) ON public.products FROM anon");
  });
});
