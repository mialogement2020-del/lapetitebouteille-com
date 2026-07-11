import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711183000_harden_promo_discount_scope.sql"),
  "utf8"
);

describe("promo discount scope hardening", () => {
  it("adds configurable safety controls for promo discounts", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS max_discount_percent");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS min_margin_after_discount");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS allow_negative_margin");
  });

  it("calculates promo discounts only on eligible cart lines", () => {
    expect(migration).toContain("v_discountable_subtotal");
    expect(migration).toContain("WHERE (v_promo.eligible_product_ids IS NULL OR x.product_id = ANY(v_promo.eligible_product_ids))");
    expect(migration).toContain("AND (v_promo.eligible_category_ids IS NULL OR x.category_id = ANY(v_promo.eligible_category_ids))");
    expect(migration).toContain("promo_no_discountable_items");
    expect(migration).toContain("promo_discount_scope");
  });

  it("prevents promo discounts from exceeding configured caps or margin floor", () => {
    expect(migration).toContain("v_discount_cap");
    expect(migration).toContain("COALESCE(v_promo.max_discount_percent, 100)");
    expect(migration).toContain("promo_margin_floor_reached");
    expect(migration).toContain("NOT COALESCE(v_promo.allow_negative_margin, false)");
  });

  it("adds an admin anomaly view for suspicious promo redemptions", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_promo_code_anomalies");
    expect(migration).toContain("discount_exceeds_eligible_subtotal");
    expect(migration).toContain("negative_margin_after_discount");
    expect(migration).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
  });
});
