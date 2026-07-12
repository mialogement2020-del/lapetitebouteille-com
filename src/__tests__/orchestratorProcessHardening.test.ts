import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const edgeFunction = readFileSync(
  join(process.cwd(), "supabase/functions/orchestrator-process/index.ts"),
  "utf8"
);

const dashboard = readFileSync(
  join(process.cwd(), "src/components/admin/OrchestrationDashboard.tsx"),
  "utf8"
);

describe("orchestrator process hardening", () => {
  it("requires either an internal secret or an authenticated admin", () => {
    expect(edgeFunction).toContain("ORCHESTRATOR_INTERNAL_SECRET");
    expect(edgeFunction).toContain("x-orchestrator-secret");
    expect(edgeFunction).toContain('eq("role", "admin")');
    expect(edgeFunction).toContain("admin_required");
  });

  it("adds retry, lock, and dead-letter handling for failed events", () => {
    expect(edgeFunction).toContain("MAX_ATTEMPTS");
    expect(edgeFunction).toContain("attempt_count");
    expect(edgeFunction).toContain("locked_at");
    expect(edgeFunction).toContain("next_attempt_at");
    expect(edgeFunction).toContain("dead_letter");
    expect(edgeFunction).toContain("retryDelayMinutes");
  });

  it("surfaces failed and dead-letter statuses in the admin dashboard", () => {
    expect(dashboard).toContain("dead_letter");
    expect(dashboard).toContain('e.status === "pending" || e.status === "failed"');
    expect(dashboard).toContain("attempt_count");
  });
});
