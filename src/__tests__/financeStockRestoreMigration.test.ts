import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711093000_restore_stock_on_failed_or_cancelled_orders.sql"),
  "utf8"
);
const triggerFixMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711102000_fix_stock_restore_trigger_before_update.sql"),
  "utf8"
);
const resilientStatusMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711113000_make_admin_order_status_updates_resilient.sql"),
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
    expect(triggerFixMigration).toContain("NEW.status = 'cancelled'");
    expect(triggerFixMigration).toContain("NEW.payment_status = 'failed'");
    expect(triggerFixMigration).toContain("v_reason := 'order_cancelled'");
    expect(triggerFixMigration).toContain("v_reason := 'payment_failed'");
  });

  it("records an idempotent ledger entry for auditability", () => {
    expect(migration).toContain("'stock_restored'");
    expect(migration).toContain("'stock_restored:' || v_order.id::text");
    expect(migration).toContain("restored_units");
  });

  it("uses a before update trigger to avoid recursive order updates", () => {
    expect(triggerFixMigration).toContain("BEFORE UPDATE OF status, payment_status ON public.orders");
    expect(triggerFixMigration).toContain("NEW.stock_restored_at := now()");
    expect(triggerFixMigration).toContain("NEW.stock_restore_reason := v_reason");
    expect(triggerFixMigration).toContain("'trigger_timing', 'before_update'");
    expect(triggerFixMigration).not.toContain("PERFORM public.restore_order_stock_once(NEW.id");
  });

  it("keeps admin status updates resilient when side effects fail", () => {
    expect(resilientStatusMigration).toContain("CREATE OR REPLACE FUNCTION public.log_order_status_change");
    expect(resilientStatusMigration).toContain("CREATE OR REPLACE FUNCTION public.notify_order_status_change");
    expect(resilientStatusMigration).toContain("CREATE OR REPLACE FUNCTION public.trg_restore_stock_on_order_failure");
    expect(resilientStatusMigration).toContain("CREATE OR REPLACE FUNCTION public.refresh_order_accounting_on_status_change");
    expect(resilientStatusMigration).toContain("RAISE WARNING 'Order status history logging failed");
    expect(resilientStatusMigration).toContain("RAISE WARNING 'Order in-app notification insert failed");
    expect(resilientStatusMigration).toContain("RAISE WARNING 'Stock restore ledger logging failed");
    expect(resilientStatusMigration).toContain("'ledger_mode', 'best_effort'");
  });
});
