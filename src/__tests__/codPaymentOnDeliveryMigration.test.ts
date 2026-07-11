import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711143000_mark_cod_paid_on_delivery.sql"),
  "utf8"
);

describe("cash-on-delivery payment completion migration", () => {
  it("marks only COD orders as completed when delivered by admin", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_update_order_status");
    expect(migration).toContain("_new_status = 'delivered'");
    expect(migration).toContain("v_payment_method = 'cash_on_delivery'");
    expect(migration).toContain("v_payment_status = 'pending'");
    expect(migration).toContain("v_next_payment_status := 'completed'");
    expect(migration).toContain("'cod:' || v_order_number");
  });

  it("does not auto-complete mobile money payments", () => {
    expect(migration).not.toContain("v_payment_method = 'mtn_money'");
    expect(migration).not.toContain("v_payment_method = 'orange_money'");
    expect(migration).toContain("Mobile Money remains confirmed only through provider/webhook proof");
  });
});
