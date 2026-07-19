import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260719193000_p44_developer_portal_sdk_platform.sql"),
  "utf8",
);

describe("P4.4 developer portal migration", () => {
  it("creates developer portal tables and append-only histories", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.developer_portal_members");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.developer_portal_apps");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.developer_portal_api_key_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.developer_portal_sandbox_runs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.developer_portal_sdk_packages");
    expect(migration).toContain("developer_portal_history_is_append_only");
  });

  it("reuses P4 registries, gateway and observability instead of duplicating them", () => {
    expect(migration).toContain("platform_capability_registry");
    expect(migration).toContain("platform_event_catalog");
    expect(migration).toContain("api_gateway_api_keys");
    expect(migration).toContain("api_gateway_endpoints");
    expect(migration).toContain("platform_observability_services");
    expect(migration).toContain("'p44_developer_portal'");
  });

  it("adds developer key lifecycle and sandbox RPCs", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.developer_create_api_key");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.developer_rotate_api_key");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.developer_revoke_api_key");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.developer_run_sandbox");
    expect(migration).toContain("secret_visible_once");
    expect(migration).toContain("'side_effects', 'none'");
  });

  it("exposes documentation, OpenAPI and SDK views", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.developer_portal_docs_catalog");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.developer_portal_openapi");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.developer_portal_sdk_packages_view");
    expect(migration).toContain("@lapetitebouteille/sdk");
  });

  it("keeps the financial P0 isolated", () => {
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("UPDATE public.payments");
    expect(migration).not.toContain("UPDATE public.financial_ledger_entries");
    expect(migration).not.toContain("UPDATE public.order_accounting_snapshots");
  });
});
