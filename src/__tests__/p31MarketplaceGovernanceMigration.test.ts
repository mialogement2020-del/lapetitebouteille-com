import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260718173000_p31_marketplace_governance_automation.sql"),
  "utf8",
);

describe("P3.1 marketplace governance migration", () => {
  it("creates governance cases, history, notifications and extensible case types", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_governance_case_types");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_governance_cases");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_governance_case_history");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_governance_notifications");
    expect(migration).toContain("non_compliant_image");
    expect(migration).toContain("probable_duplicate");
    expect(migration).toContain("seller_support_needed");
  });

  it("keeps governance history append-only", () => {
    expect(migration).toContain("marketplace_governance_history_is_append_only");
    expect(migration).toContain("BEFORE UPDATE OR DELETE ON public.marketplace_governance_case_history");
  });

  it("uses P2 sources but does not mutate P2 decision sources automatically", () => {
    expect(migration).toContain("FROM public.marketplace_analytics_alerts");
    expect(migration).toContain("FROM public.catalogue_duplicate_candidates");
    expect(migration).toContain("Decision automatique interdite");
    expect(migration).toContain("validation admin requise");
  });

  it("provides secure RPCs and admin/vendor views", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.scan_marketplace_governance_cases");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_marketplace_governance_case");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.comment_marketplace_governance_case");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_governance_queue");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_marketplace_governance_cases");
    expect(migration).toContain("public.marketplace_governance_is_admin()");
  });

  it("does not mutate frozen P0 financial surfaces", () => {
    expect(migration).not.toMatch(/UPDATE public\.(wallets|commissions|orders|payments|withdrawal|financial|ledger|revenue|commission_pool)/);
    expect(migration).not.toMatch(/INSERT INTO public\.(wallets|commissions|orders|payments|withdrawal|financial|ledger|revenue|commission_pool)/);
    expect(migration).not.toMatch(/DELETE FROM public\.(wallets|commissions|orders|payments|withdrawal|financial|ledger|revenue|commission_pool)/);
  });
});
