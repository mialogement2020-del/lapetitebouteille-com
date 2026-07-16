import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260716143000_p14_conversation_coach.sql"),
  "utf8",
);

describe("P1.4 conversation coach migration", () => {
  it("creates conversation coach tables, scripts and dashboard views", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.coach_conversation_sessions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.coach_response_variants");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.coach_script_templates");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_conversation_coach_dashboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_conversation_coach_report");
  });

  it("supports analysis, product suggestions, response variants and feedback", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.coach_analyze_conversation");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.coach_record_feedback");
    expect(migration).toContain("FOREACH v_type IN ARRAY ARRAY['short', 'professional', 'warm', 'premium', 'whatsapp', 'email', 'sms']");
    expect(migration).toContain("Reponse objection prix");
    expect(migration).toContain("first_contact");
    expect(migration).toContain("abandoned_cart");
    expect(migration).toContain("wholesale");
  });

  it("keeps advisor data private with RLS and append-only activity logs", () => {
    expect(migration).toContain("ALTER TABLE public.coach_conversation_sessions ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("advisor_id = auth.uid()");
    expect(migration).toContain("coach_session_access_denied");
    expect(migration).toContain("coach_activity_log_append_only");
  });

  it("does not mutate P0, wallets, orders, products or commissions", () => {
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("UPDATE public.products");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("calculate_p0");
    expect(migration).not.toContain("generate_mlm_commissions");
  });

  it("does not expose forbidden financial internals to the coach", () => {
    expect(migration).not.toContain("purchase_price");
    expect(migration).not.toContain("gross_margin");
    expect(migration).not.toContain("commission_pool_snapshots");
    expect(migration).not.toContain("revenue_engine_snapshots");
    expect(migration).toContain("data_sources_forbidden");
  });
});
