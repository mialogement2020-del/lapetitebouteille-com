import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260716093000_p12_commercial_opportunity_calendar.sql"),
  "utf8",
);

describe("P1.2 commercial opportunity calendar migration", () => {
  it("creates the commercial opportunity calendar tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_opportunity_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_opportunity_event_products");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_opportunity_event_categories");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_opportunity_campaigns");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_opportunity_missions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.commercial_opportunity_marketing_assets");
  });

  it("exposes advisor and admin views without needing finance data", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_commercial_opportunity_calendar");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_commercial_mission_board");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_commercial_opportunity_calendar_report");
    expect(migration).toContain("recommended_products");
    expect(migration).toContain("recommended_categories");
  });

  it("adds RLS and a dedicated admin permission", () => {
    expect(migration).toContain("ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'commercial_calendar'");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.commercial_calendar_is_admin");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Advisors read active commercial events");
    expect(migration).toContain("Commercial calendar admins manage events");
  });

  it("seeds the expected commercial opportunity templates", () => {
    [
      "nouvel-an",
      "saint-valentin",
      "journee-de-la-femme",
      "ramadan",
      "mariages",
      "anniversaires",
      "noel",
      "evenements-entreprises",
      "promotions-lpb",
    ].forEach((slug) => expect(migration).toContain(slug));
  });

  it("does not mutate P0 or financial/order state", () => {
    expect(migration).not.toMatch(/UPDATE\s+public\.wallets/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.commissions/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.commissions/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.orders/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.products/i);
    expect(migration).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.calculate_p0/i);
    expect(migration).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.generate_mlm_commissions/i);
  });
});
