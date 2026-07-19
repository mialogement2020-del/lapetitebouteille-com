import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "src/components/admin/IntegrationHubDashboard.tsx"), "utf8");
const docs = readFileSync(join(process.cwd(), "docs/architecture/integration-hub.md"), "utf8");

describe("P4.3 Integration Hub integration", () => {
  it("exposes a dedicated admin tab and lazy dashboard", () => {
    expect(adminPage).toContain("IntegrationHubDashboard");
    expect(adminPage).toContain("integration-hub");
    expect(adminPage).toContain("Connecteurs");
  });

  it("loads admin-only P4.3 views and operational RPCs", () => {
    expect(dashboard).toContain("admin_integration_hub_overview");
    expect(dashboard).toContain("admin_integration_hub_connectors");
    expect(dashboard).toContain("admin_integration_hub_sync_jobs");
    expect(dashboard).toContain("admin_integration_hub_lifecycle_events");
    expect(dashboard).toContain("admin_check_integration_connector_compatibility");
    expect(dashboard).toContain("admin_schedule_integration_connector_sync");
  });

  it("documents framework-only scope and P0 isolation", () => {
    expect(docs).toContain("Il ne contient pas de connecteur ERP, CRM, paiement, logistique ou IA specifique");
    expect(docs).toContain("Non-regression P0");
    expect(docs).toContain("wallets");
    expect(docs).toContain("GO AVEC RESERVES");
  });
});
