import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const productsTable = readFileSync(
  join(process.cwd(), "src/components/admin/ProductsTable.tsx"),
  "utf8",
);

const useAdmin = readFileSync(
  join(process.cwd(), "src/hooks/useAdmin.ts"),
  "utf8",
);

describe("admin products missing cost workflow", () => {
  it("lets admins filter products without purchase costs", () => {
    expect(productsTable).toContain('statusFilter === "missing_cost"');
    expect(productsTable).toContain("Prix d'achat manquant");
    expect(productsTable).toContain("Voir les produits");
  });

  it("shows missing cost badges and exports margin status", () => {
    expect(productsTable).toContain("Coût manquant");
    expect(productsTable).toContain("marginStatus");
    expect(productsTable).toContain("purchasePrice");
  });

  it("types sensitive admin pricing fields on admin products", () => {
    expect(useAdmin).toContain("purchase_price?: number | null");
    expect(useAdmin).toContain("markup_percent_override?: number | null");
  });
});
