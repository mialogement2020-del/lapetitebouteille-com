import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "src/components/admin/PlatformExtensionDashboard.tsx"), "utf8");
const analyzer = readFileSync(join(process.cwd(), "scripts/analyze-architecture.mjs"), "utf8");
const docsIndex = readFileSync(join(process.cwd(), "docs/architecture/README.md"), "utf8");

describe("P4.1 platform extension framework integration", () => {
  it("adds the technical admin dashboard behind the admin surface", () => {
    expect(adminPage).toContain("PlatformExtensionDashboard");
    expect(adminPage).toContain("platform-extension");
    expect(adminPage).toContain("Extensions");
    expect(dashboard).toContain("admin_platform_extension_overview");
    expect(dashboard).toContain("admin_platform_feature_flags");
    expect(dashboard).toContain("set_platform_feature_flag");
  });

  it("ships architecture documentation and dependency scan tooling", () => {
    expect(analyzer).toContain("architecture-scan.json");
    expect(analyzer).toContain("frontendRpcCalls");
    expect(analyzer).toContain("edgeFunctions");
    expect(docsIndex).toContain("P4.1");
    expect(docsIndex).toContain("Isolation P0");
  });
});
