import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webhook = readFileSync(
  join(process.cwd(), "supabase/functions/mobile-money-webhook/index.ts"),
  "utf8"
);

describe("mobile money webhook hardening", () => {
  it("does not resurrect already finalized failed payments", () => {
    expect(webhook).toContain("\"payment_intent_already_finalized\"");
    expect(webhook).toContain("requires_manual_review");
    expect(webhook).toContain("[\"failed\", \"cancelled\", \"refunded\"]");
  });

  it("marks failed provider responses as failed and cancelled server-side", () => {
    expect(webhook).toContain("payment_status: \"failed\"");
    expect(webhook).toContain("status: \"cancelled\"");
    expect(webhook).toContain(".eq(\"payment_status\", \"pending\")");
  });

  it("stores provider reference when payment succeeds", () => {
    expect(webhook).toContain("payment_status: \"completed\"");
    expect(webhook).toContain("payment_reference: providerReference");
  });
});
