import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260716190000_p16_academy_certification.sql"),
  "utf8",
);

describe("P1.6 Academy and Certification migration", () => {
  it("creates learning paths, courses, quiz, progress and certification tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.academy_learning_paths");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.academy_courses");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.academy_lessons");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.academy_quizzes");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.academy_quiz_attempts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.academy_user_progress");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.academy_certifications");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.academy_user_certifications");
  });

  it("supports start, completion, quiz submission and certification evaluation", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.academy_start_course");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.academy_complete_course");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.academy_submit_quiz_attempt");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.academy_evaluate_certifications");
    expect(migration).toContain("academy_quiz_attempt_limit_reached");
    expect(migration).toContain("certificate_code");
  });

  it("adds advisor and admin reporting views", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_academy_dashboard");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_academy_summary");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.advisor_academy_certifications");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_academy_report");
  });

  it("enforces RLS and append-only activity history", () => {
    expect(migration).toContain("ALTER TABLE public.academy_user_progress ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Academy own progress");
    expect(migration).toContain("Academy certifications admin manage");
    expect(migration).toContain("academy_activity_log_append_only");
    expect(migration).toContain("trg_academy_activity_no_update");
  });

  it("keeps P0 and financial flows frozen", () => {
    expect(migration).toContain("no wallet, commission, order, P0 or accounting mutation");
    expect(migration).not.toMatch(/UPDATE\s+public\.(wallets|orders|commissions|mlm_commissions)/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.(wallets|commissions|mlm_commissions|orders)/i);
    expect(migration).not.toContain("calculate_p0_revenue_observation");
    expect(migration).not.toContain("generate_mlm_commissions");
  });
});
