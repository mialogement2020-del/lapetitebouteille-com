import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711133000_make_final_order_status_triggers_non_blocking.sql"),
  "utf8"
);

describe("final order status triggers migration", () => {
  it("keeps delivered and cancelled side effects from blocking status updates", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.award_loyalty_points");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.trust_signal_on_order");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.event_order_changes");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.trg_generate_commissions_on_paid_order");
    expect(migration).toContain("RAISE WARNING 'Loyalty award skipped");
    expect(migration).toContain("RAISE WARNING 'Trust signal skipped");
    expect(migration).toContain("RAISE WARNING 'Domain event skipped");
    expect(migration).toContain("RAISE WARNING 'MLM commission reversal skipped");
  });

  it("does not change the stock decrement business rule", () => {
    expect(migration).not.toContain("stock_quantity = COALESCE(stock_quantity, 0) -");
    expect(migration).not.toContain("NEW.status = 'confirmed'");
  });
});
