import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "src/components/admin/ExtensionMarketplaceDashboard.tsx"), "utf8");
const audit = readFileSync(join(process.cwd(), "docs/p45-extension-marketplace-audit.md"), "utf8");
const architecture = readFileSync(join(process.cwd(), "docs/architecture/extension-marketplace.md"), "utf8");

describe("P4.5 extension marketplace integration", () => {
  it("exposes the extension marketplace in the admin navigation", () => {
    expect(adminPage).toContain("ExtensionMarketplaceDashboard");
    expect(adminPage).toContain("extension-marketplace");
    expect(adminPage).toContain("App Store");
  });

  it("loads the admin marketplace views", () => {
    expect(dashboard).toContain("admin_extension_marketplace_overview");
    expect(dashboard).toContain("admin_extension_marketplace_catalog");
    expect(dashboard).toContain("admin_extension_marketplace_versions");
    expect(dashboard).toContain("admin_extension_marketplace_installations");
    expect(dashboard).toContain("admin_extension_marketplace_operations");
    expect(dashboard).toContain("admin_extension_marketplace_health");
    expect(dashboard).toContain("admin_extension_marketplace_security_findings");
  });

  it("connects controlled admin actions to P4.5 RPCs", () => {
    expect(dashboard).toContain("admin_validate_extension_version");
    expect(dashboard).toContain("admin_run_extension_sandbox");
    expect(dashboard).toContain("admin_install_extension");
    expect(dashboard).toContain("admin_set_extension_installation_status");
    expect(dashboard).toContain("admin_rollback_extension");
  });

  it("documents P0 isolation and GO with reserves", () => {
    expect(audit).toContain("GO avec reserves");
    expect(audit).toContain("Le P0 financier reste isole");
    expect(architecture).toContain("Le module ne modifie jamais");
    expect(architecture).toContain("wallets");
    expect(architecture).toContain("Commission Pool");
  });
});
