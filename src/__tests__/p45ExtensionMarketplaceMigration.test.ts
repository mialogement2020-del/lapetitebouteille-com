import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260719210000_p45_extension_marketplace_app_store.sql"),
  "utf8",
);

describe("P4.5 extension marketplace migration", () => {
  it("creates extension registry, versions, installations and append-only operations", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.extension_marketplace_extensions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.extension_marketplace_versions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.extension_marketplace_installations");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.extension_marketplace_operations");
    expect(migration).toContain("extension_marketplace_history_is_append_only");
  });

  it("reuses P4 registries and does not duplicate platform primitives", () => {
    expect(migration).toContain("platform_capability_registry");
    expect(migration).toContain("platform_event_catalog");
    expect(migration).toContain("api_gateway_endpoints");
    expect(migration).toContain("integration_hub_connectors");
    expect(migration).toContain("developer_portal_is_member");
    expect(migration).toContain("platform_feature_flags");
  });

  it("validates extension compatibility before installation", () => {
    expect(migration).toContain("admin_validate_extension_version");
    expect(migration).toContain("missing_capability");
    expect(migration).toContain("missing_api_endpoint");
    expect(migration).toContain("missing_connector");
    expect(migration).toContain("financial_surface_requested");
    expect(migration).toContain("extension_validation_failed");
  });

  it("supports sandbox and rollback without production side effects", () => {
    expect(migration).toContain("admin_run_extension_sandbox");
    expect(migration).toContain("admin_rollback_extension");
    expect(migration).toContain("'side_effects', 'none'");
    expect(migration).toContain("rollback_supported");
  });

  it("keeps P0 financial components isolated", () => {
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("UPDATE public.payments");
    expect(migration).not.toContain("UPDATE public.financial_ledger_entries");
    expect(migration).not.toContain("UPDATE public.order_accounting_snapshots");
  });
});
