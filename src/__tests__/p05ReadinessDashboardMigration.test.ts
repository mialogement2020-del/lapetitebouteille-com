import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260715143000_p05_readiness_dashboard.sql"),
  "utf8",
);

describe("P0.5 readiness dashboard migration", () => {
  it("adds readiness reporting without mutating financial state", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_p05_readiness_dashboard");
    expect(migration).toContain("p0_readiness_components");
    expect(migration).toContain("go_live_score");
    expect(migration).toContain("confidence_explanations");
    expect(migration).toContain("production_blockers");
    expect(migration).toContain("action_plan");
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
  });

  it("keeps activation manual and auditable by super admin", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.p05_activation_audit_logs");
    expect(migration).toContain("p05_activation_audit_is_append_only");
    expect(migration).toContain("automatic_activation_allowed");
    expect(migration).toContain("super_admin_full_access_required");
    expect(migration).toContain("JE CONFIRME QUE LES COMMISSIONS DEVIENDRONT EXECUTOIRES SOUS CONTROLE SUPER ADMIN");
    expect(migration).toContain("is_financial_execution_enabled, metadata");
    expect(migration).toContain("false,");
  });
});
