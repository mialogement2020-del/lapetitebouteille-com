import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminDashboard = readFileSync(
  join(process.cwd(), "src/components/admin/MarketplaceGovernanceDashboard.tsx"),
  "utf8",
);

const vendorDashboard = readFileSync(
  join(process.cwd(), "src/components/vendor/VendorMarketplaceDashboard.tsx"),
  "utf8",
);

describe("P3.3 workflow automation admin integration", () => {
  it("adds an admin automation cockpit backed by P3.3 views", () => {
    expect(adminDashboard).toContain("P3.3 Workflow Automation & Orchestration");
    expect(adminDashboard).toContain("admin_marketplace_workflow_automation_overview");
    expect(adminDashboard).toContain("admin_marketplace_workflow_automation_rules");
    expect(adminDashboard).toContain("admin_marketplace_workflow_automation_queue");
    expect(adminDashboard).toContain("admin_marketplace_workflow_automation_executions");
    expect(adminDashboard).toContain("admin_marketplace_workflow_automation_tasks");
  });

  it("uses explicit admin RPCs for creation, toggling and queue processing", () => {
    expect(adminDashboard).toContain("admin_create_marketplace_workflow_automation_rule");
    expect(adminDashboard).toContain("admin_toggle_marketplace_workflow_automation_rule");
    expect(adminDashboard).toContain("process_marketplace_workflow_automation_queue");
  });

  it("keeps automation actions non-sensitive in the UI", () => {
    expect(adminDashboard).toContain("send_notification");
    expect(adminDashboard).toContain("create_task");
    expect(adminDashboard).toContain("schedule_reminder");
    expect(adminDashboard).toContain("assign_checklist");
    expect(adminDashboard).toContain("request_information");
    expect(adminDashboard).toContain("propose_escalation");
    expect(adminDashboard).not.toContain("suspend_shop");
    expect(adminDashboard).not.toContain("delete_product");
    expect(adminDashboard).not.toContain("capture_escrow");
  });

  it("does not expose P3.3 automation controls in the vendor dashboard", () => {
    expect(vendorDashboard).not.toContain("marketplace_workflow_automation");
    expect(vendorDashboard).not.toContain("process_marketplace_workflow_automation_queue");
    expect(vendorDashboard).not.toContain("admin_create_marketplace_workflow_automation_rule");
  });
});
