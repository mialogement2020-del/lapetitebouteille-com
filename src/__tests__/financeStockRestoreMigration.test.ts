import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711093000_restore_stock_on_failed_or_cancelled_orders.sql"),
  "utf8"
);

describe("finance stock restoration migration", () => {
  it("restores reserved stock only once for failed or cancelled orders", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.restore_order_stock_once");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("IF v_order.stock_restored_at IS NOT NULL");
    expect(migration).toContain("stock_restored_at = now()");
    expect(migration).toContain("trg_restore_stock_on_order_failure");
  });

  it("restores stock on cancelled orders and failed payments", () => {
    expect(migration).toContain("NEW.status = 'cancelled'");
    expect(migration).toContain("NEW.payment_status = 'failed'");
    expect(migration).toContain("public.restore_order_stock_once(NEW.id, 'order_cancelled')");
    expect(migration).toContain("public.restore_order_stock_once(NEW.id, 'payment_failed')");
  });

  it("records an idempotent ledger entry for auditability", () => {
    expect(migration).toContain("'stock_restored'");
    expect(migration).toContain("'stock_restored:' || v_order.id::text");
    expect(migration).toContain("restored_units");
  });
});
