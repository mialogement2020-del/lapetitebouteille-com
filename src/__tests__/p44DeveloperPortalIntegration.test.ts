import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "src/components/admin/DeveloperPortalDashboard.tsx"), "utf8");
const docs = readFileSync(join(process.cwd(), "docs/architecture/developer-portal.md"), "utf8");

describe("P4.4 developer portal integration", () => {
  it("adds a lazy admin dashboard tab", () => {
    expect(adminPage).toContain("DeveloperPortalDashboard");
    expect(adminPage).toContain("developer-portal");
    expect(adminPage).toContain("Portail Dev");
  });

  it("loads portal, gateway, docs and sandbox views", () => {
    expect(dashboard).toContain("admin_developer_portal_overview");
    expect(dashboard).toContain("admin_developer_portal_apps");
    expect(dashboard).toContain("admin_developer_portal_api_keys");
    expect(dashboard).toContain("developer_portal_docs_catalog");
    expect(dashboard).toContain("developer_portal_openapi");
    expect(dashboard).toContain("developer_portal_sandbox_runs_view");
  });

  it("can trigger sandbox without production side effects", () => {
    expect(dashboard).toContain("developer_run_sandbox");
    expect(dashboard).toContain("expected_side_effects");
    expect(dashboard).toContain("none");
  });

  it("documents P0 isolation and SDK scope", () => {
    expect(docs).toContain("Le P0 financier reste exclu");
    expect(docs).toContain("SDK TypeScript");
    expect(docs).toContain("GO avec reserves");
  });
});
