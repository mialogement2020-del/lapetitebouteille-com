import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260717093000_p21_marketplace_image_studio.sql"),
  "utf8",
);

describe("P2.1 marketplace image studio migration", () => {
  it("creates the visual compliance pipeline tables and reports", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_image_studio_rules");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_image_studio_jobs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_image_studio_events");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_marketplace_image_studio_queue");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.marketplace_image_studio_dashboard");
  });

  it("stores official LPB visual rules and compliance thresholds", () => {
    expect(migration).toContain("target_width integer NOT NULL DEFAULT 900");
    expect(migration).toContain("target_height integer NOT NULL DEFAULT 1200");
    expect(migration).toContain("background_hex text NOT NULL DEFAULT '#FFFFFF'");
    expect(migration).toContain("WHEN _score >= 90 THEN 'auto_publish'");
    expect(migration).toContain("WHEN _score >= 75 THEN 'auto_correct_publish'");
    expect(migration).toContain("WHEN _score >= 50 THEN 'manual_review'");
    expect(migration).toContain("watermark");
    expect(migration).toContain("qr_code");
    expect(migration).toContain("numero_whatsapp");
    expect(migration).toContain("personne");
  });

  it("keeps an append-only event history for visual decisions", () => {
    expect(migration).toContain("marketplace_image_studio_events_append_only");
    expect(migration).toContain("trg_marketplace_image_studio_events_append_only_update");
    expect(migration).toContain("trg_marketplace_image_studio_events_append_only_delete");
    expect(migration).toContain("analysis_recorded");
    expect(migration).toContain("new_image_requested");
  });

  it("protects seller and admin access with RLS", () => {
    expect(migration).toContain("ALTER TABLE public.marketplace_image_studio_jobs ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Sellers view own marketplace image jobs");
    expect(migration).toContain("Admins manage marketplace image jobs");
    expect(migration).toContain("marketplace_image_studio_is_admin");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.marketplace_image_studio_review_job");
  });

  it("does not mutate P0 or finance ledgers", () => {
    expect(migration).not.toMatch(/UPDATE\s+public\.wallets/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.wallets/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.commissions/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.commissions/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.orders/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.orders/i);
    expect(migration).not.toContain("calculate_p0_revenue_observation");
    expect(migration).not.toContain("generate_mlm_commissions");
    expect(migration).not.toContain("commission_pool_snapshots");
    expect(migration).not.toContain("revenue_engine_snapshots");
  });
});
