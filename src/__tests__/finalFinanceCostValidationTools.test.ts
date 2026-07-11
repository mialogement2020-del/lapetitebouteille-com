import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711205000_final_finance_cost_validation_tools.sql"),
  "utf8",
);

const csvTemplate = readFileSync(
  join(process.cwd(), "docs/product-cost-import-template.csv"),
  "utf8",
);

describe("final finance cost validation tools", () => {
  it("adds an admin-only catalogue cost validation report", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.admin_product_cost_validation_report");
    expect(migration).toContain("missing_purchase_cost");
    expect(migration).toContain("cost_above_sale_price");
    expect(migration).toContain("low_margin_under_10_percent");
    expect(migration).toContain("recent_sale_without_reliable_cost");
    expect(migration).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
  });

  it("stages purchase-cost imports before applying them", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.product_cost_import_batches");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.product_cost_import_rows");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_preview_product_cost_import");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_apply_product_cost_import");
    expect(migration).toContain("batch_contains_rejected_rows");
  });

  it("rejects dangerous import lines and warns on risky costs", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.safe_numeric_from_text");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.safe_date_from_text");
    expect(migration).toContain("duplicate_import_row");
    expect(migration).toContain("unknown_product");
    expect(migration).toContain("negative_amount");
    expect(migration).toContain("invalid_purchase_price");
    expect(migration).toContain("invalid_effective_date");
    expect(migration).toContain("zero_purchase_price");
    expect(migration).toContain("cost_above_sale_price");
  });

  it("does not mutate historical accounting data", () => {
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("UPDATE public.order_accounting_snapshots");
    expect(migration).not.toContain("UPDATE public.financial_ledger_entries");
  });

  it("ships a CSV template with the required columns", () => {
    expect(csvTemplate.split("\n")[0]).toBe(
      "sku,nom_produit,prix_achat,devise,fournisseur,date_effet,frais_transport,frais_douane,autres_frais,commentaire",
    );
  });
});
