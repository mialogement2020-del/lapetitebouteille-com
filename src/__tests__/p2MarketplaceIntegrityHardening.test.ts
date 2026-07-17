import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260718093000_p2_marketplace_integrity_hardening.sql"),
  "utf8",
);

describe("P2-S1 Marketplace Integrity hardening", () => {
  it("forces marketplace image jobs without product_id to belong to the authenticated seller", () => {
    expect(migration).toContain("v_effective_vendor_id := CASE");
    expect(migration).toContain("ELSE auth.uid()");
    expect(migration).toContain("vendor_id_must_match_authenticated_user");
    expect(migration).toContain("product_not_owned_by_vendor");
  });

  it("removes direct seller writes on P2.2 computed coach scores and snapshots", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Vendors create own marketplace coach analyses"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Vendors create own marketplace coach snapshots"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Vendors insert own marketplace coach events"');
    expect(migration).toContain("REVOKE INSERT ON public.marketplace_coach_product_analyses FROM authenticated");
    expect(migration).toContain("REVOKE INSERT ON public.marketplace_coach_shop_snapshots FROM authenticated");
    expect(migration).toContain("REVOKE INSERT, UPDATE ON public.marketplace_coach_recommendations FROM authenticated");
  });

  it("removes direct seller writes on P2.3 SEO and discoverability scores", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Vendors insert own marketplace seo product scores"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Vendors insert own marketplace seo shop scores"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Authenticated insert marketplace seo proposal events"');
    expect(migration).toContain("REVOKE INSERT ON public.marketplace_seo_product_scores FROM authenticated");
    expect(migration).toContain("REVOKE INSERT ON public.marketplace_seo_shop_scores FROM authenticated");
    expect(migration).toContain("REVOKE INSERT ON public.marketplace_discoverability_events FROM authenticated");
  });

  it("hardens discoverability events with validation, consistency and anti-spam rules", () => {
    expect(migration).toContain("marketplace_discoverability_invalid_event_type");
    expect(migration).toContain("marketplace_discoverability_product_shop_mismatch");
    expect(migration).toContain("marketplace_discoverability_product_not_public");
    expect(migration).toContain("marketplace_discoverability_metadata_too_large");
    expect(migration).toContain("marketplace_discoverability_rate_limited");
    expect(migration).toContain("marketplace_discoverability_duplicate_rate_limited");
    expect(migration).toContain("- 'service_role'");
  });

  it("keeps P0 and financial flows frozen", () => {
    expect(migration).not.toMatch(/UPDATE\s+public\.wallets/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.wallets/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.commissions/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.commissions/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.orders/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.orders/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.payments/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.withdrawal/i);
    expect(migration).not.toContain("calculate_p0_revenue_observation");
    expect(migration).not.toContain("commission_pool_snapshots");
    expect(migration).not.toContain("revenue_engine_snapshots");
  });
});
