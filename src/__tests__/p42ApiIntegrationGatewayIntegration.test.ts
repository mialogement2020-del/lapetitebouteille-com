import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPage = readFileSync(join(process.cwd(), "src/pages/Admin.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "src/components/admin/ApiGatewayDashboard.tsx"), "utf8");
const edgeFunction = readFileSync(join(process.cwd(), "supabase/functions/api-gateway/index.ts"), "utf8");
const docs = readFileSync(join(process.cwd(), "docs/architecture/api-gateway.md"), "utf8");
const openapi = readFileSync(join(process.cwd(), "docs/api/openapi-lpb-gateway.json"), "utf8");

describe("P4.2 API Integration Gateway integration", () => {
  it("adds the admin dashboard and gateway views", () => {
    expect(adminPage).toContain("ApiGatewayDashboard");
    expect(adminPage).toContain("api-gateway");
    expect(dashboard).toContain("admin_api_gateway_overview");
    expect(dashboard).toContain("admin_api_gateway_endpoints");
    expect(dashboard).toContain("admin_api_gateway_openapi");
  });

  it("ships a guarded Edge Function gateway", () => {
    expect(edgeFunction).toContain("api_gateway_check_rate_limit");
    expect(edgeFunction).toContain("api_gateway_log_request");
    expect(edgeFunction).toContain("endpoint_not_registered");
    expect(edgeFunction).toContain("role_not_allowed");
  });

  it("documents the gateway and OpenAPI contract", () => {
    expect(docs).toContain("P4.2");
    expect(docs).toContain("Isolation P0");
    expect(openapi).toContain("La Petite Bouteille API Gateway");
    expect(openapi).toContain("/gateway/v1/health");
  });
});
