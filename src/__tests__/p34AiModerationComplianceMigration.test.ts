import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260718230000_p34_ai_moderation_compliance_engine.sql"),
  "utf8",
);

describe("P3.4 AI moderation compliance migration", () => {
  it("creates the compliance policy, finding, score and append-only event layer", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_compliance_policies");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_compliance_findings");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_compliance_scores");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_compliance_events");
    expect(migration).toContain("marketplace_compliance_history_is_append_only");
  });

  it("separates compliance score from business, trust and catalogue quality scores", () => {
    expect(migration).toContain("catalogue_compliance_score");
    expect(migration).toContain("image_compliance_score");
    expect(migration).toContain("seo_compliance_score");
    expect(migration).toContain("marketplace_compliance_score");
    expect(migration).toContain("global_compliance_score");
    expect(migration).not.toContain("UPDATE public.business_score");
    expect(migration).not.toContain("UPDATE public.trust_score");
    expect(migration).not.toContain("UPDATE public.catalogue_product_quality_snapshots");
  });

  it("creates detections and human moderation queues without destructive decisions", () => {
    expect(migration).toContain("scan_marketplace_compliance");
    expect(migration).toContain("update_marketplace_compliance_finding_status");
    expect(migration).toContain("rejection_proposed");
    expect(migration).toContain("human_review_only");
    expect(migration).not.toContain("DELETE FROM public.products");
    expect(migration).not.toContain("SET is_active = false");
  });

  it("does not mutate P0 financial tables", () => {
    expect(migration).not.toMatch(/UPDATE public\.(wallets|commissions|orders|payments|withdrawal_requests|financial_ledger_entries|revenue_engine_snapshots|commission_pool_snapshots)/);
    expect(migration).not.toMatch(/INSERT INTO public\.(wallets|commissions|orders|payments|withdrawal_requests|financial_ledger_entries|revenue_engine_snapshots|commission_pool_snapshots)/);
    expect(migration).not.toContain("capture_escrow");
    expect(migration).not.toContain("refund_escrow");
  });

  it("exposes admin and seller-safe views through RLS", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_compliance_overview");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_compliance_queue");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.my_marketplace_compliance_findings");
    expect(migration).toContain("marketplace_compliance_owns_shop");
  });
});
