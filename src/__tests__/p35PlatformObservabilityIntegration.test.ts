import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "src/components/admin/PlatformObservabilityDashboard.tsx"), "utf8");

describe("P3.5 platform observability integration", () => {
  it("exposes a dedicated admin dashboard tab", () => {
    expect(adminPage).toContain("PlatformObservabilityDashboard");
    expect(adminPage).toContain("platform-observability");
    expect(adminPage).toContain("Observabilit");
  });

  it("loads admin-only observability views and scan RPC", () => {
    expect(dashboard).toContain("admin_platform_observability_overview");
    expect(dashboard).toContain("admin_platform_observability_services");
    expect(dashboard).toContain("admin_platform_observability_recent_alerts");
    expect(dashboard).toContain("admin_platform_observability_recent_logs");
    expect(dashboard).toContain("scan_platform_observability");
    expect(dashboard).toContain("acknowledge_platform_observability_alert");
  });

  it("does not expose vendor-facing P3.5 observability data", () => {
    expect(dashboard).not.toContain("my_platform_observability");
    expect(dashboard).not.toContain("vendor_platform_observability");
  });
});
