import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711124500_fix_admin_storage_and_order_status_rpc.sql"),
  "utf8"
);

describe("admin storage and order status migration", () => {
  it("allows admins to manage product image uploads without opening writes publicly", () => {
    expect(migration).toContain("VALUES ('product-images', 'product-images', true)");
    expect(migration).toContain("CREATE POLICY \"Public can read product images\"");
    expect(migration).toContain("CREATE POLICY \"Admins can insert product images\"");
    expect(migration).toContain("CREATE POLICY \"Admins can update product images\"");
    expect(migration).toContain("CREATE POLICY \"Admins can delete product images\"");
    expect(migration).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
  });

  it("creates a guarded admin RPC for order status updates", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_update_order_status");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("RAISE EXCEPTION 'admin_required'");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("UPDATE public.orders");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.admin_update_order_status");
  });
});
