import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260712043000_harden_enterprise_orchestration_layer.sql"),
  "utf8"
);

describe("enterprise orchestration hardening migration", () => {
  it("removes hard-coded dispatch credentials from publish_event", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.publish_event");
    expect(migration).not.toContain("eyJhbGciOiJIUzI1Ni");
    expect(migration).not.toContain("bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/orchestrator-process");
    expect(migration).not.toContain("net.http_post");
  });

  it("adds queue safety metadata and admin health monitoring", () => {
    expect(migration).toContain("attempt_count");
    expect(migration).toContain("next_attempt_at");
    expect(migration).toContain("dead_letter_at");
    expect(migration).toContain("admin_orchestration_health");
    expect(migration).toContain("domain_events_processable_idx");
  });

  it("fixes MLM commission trust signals to use current commission schema", () => {
    expect(migration).toContain("NEW.status = 'completed'");
    expect(migration).toContain("NEW.beneficiary_id");
    expect(migration).toContain("NEW.commission_amount");
    expect(migration).toContain("'commission_completed'");
    expect(migration).not.toContain("NEW.ambassador_id");
    expect(migration).not.toContain("NEW.amount");
    expect(migration).not.toContain("NEW.status = 'paid'");
  });
});
