import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713103000_product_packaging_options_wholesale.sql"),
  "utf8",
);

describe("product packaging wholesale migration", () => {
  it("creates configurable product packaging options instead of automatic global tiers", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.product_packaging_options");
    expect(migration).toContain("packaging_type text NOT NULL CHECK");
    expect(migration).toContain("discount_tiers jsonb NOT NULL DEFAULT '[]'::jsonb");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.active_product_packaging_options");
  });

  it("extends cart and order snapshots with packaging metadata", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS packaging_option_id uuid REFERENCES public.product_packaging_options");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS packaging_discount_amount numeric");
    expect(migration).toContain("'packaging_option_id', v_packaging_option_id");
    expect(migration).toContain("'packaging_label', CASE WHEN v_packaging_option_id IS NULL THEN NULL ELSE v_packaging.packaging_label END");
  });

  it("forces server-side checkout validation and pricing", () => {
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("RAISE EXCEPTION 'packaging_option_unavailable'");
    expect(migration).toContain("RAISE EXCEPTION 'invalid_packaging_quantity'");
    expect(migration).toContain("RAISE EXCEPTION 'insufficient_packaging_stock'");
    expect(migration).toContain("v_packaging_base_total := round(COALESCE(v_packaging.total_price, 0) * v_package_count, 0)");
  });

  it("decrements global bottle stock, not just package stock", () => {
    expect(migration).toContain("IF COALESCE(v_product.stock_quantity, 0) < v_quantity THEN");
    expect(migration).toContain("SET stock_quantity = COALESCE(stock_quantity, 0) - v_quantity");
    expect(migration).toContain("SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_package_count)");
  });
});
