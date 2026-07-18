import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260719143000_p42_api_integration_gateway.sql"),
  "utf8",
);

describe("P4.2 API Integration Gateway migration", () => {
  it("creates gateway registry, logs, rate limits and webhook engine", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.api_gateway_endpoints");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.api_gateway_api_keys");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.api_gateway_request_logs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.api_gateway_rate_limit_buckets");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.api_gateway_webhook_subscriptions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.api_gateway_webhook_deliveries");
  });

  it("reuses P4.1 registries instead of creating a parallel architecture", () => {
    expect(migration).toContain("platform_extension_modules");
    expect(migration).toContain("platform_capability_registry");
    expect(migration).toContain("platform_event_catalog");
    expect(migration).toContain("platform_rpc_contracts");
    expect(migration).toContain("platform_edge_function_contracts");
    expect(migration).toContain("'p42_api_integration_gateway'");
  });

  it("adds gateway RPCs, admin reports and observability integration", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_register_api_gateway_endpoint");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.api_gateway_check_rate_limit");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.api_gateway_log_request");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.api_gateway_enqueue_webhook_event");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_api_gateway_overview");
    expect(migration).toContain("platform_observability_services");
  });

  it("keeps P0 financial state untouched", () => {
    expect(migration).not.toContain("UPDATE public.wallets");
    expect(migration).not.toContain("INSERT INTO public.commissions");
    expect(migration).not.toContain("UPDATE public.commissions");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("DELETE FROM public.financial_ledger_entries");
    expect(migration).not.toContain("UPDATE public.order_accounting_snapshots");
  });
});
