import { describe, expect, it } from "vitest";
import {
  buildCategorySchemas,
  getCategoryPath,
  getCategorySeo,
  INDEXABLE_CATEGORY_SLUGS,
} from "./catalogSeo";
import type { Product } from "@/hooks/useProducts";

const sampleProduct = {
  id: "p1",
  name: "Rhum premium",
  slug: "rhum-premium",
  price: 12000,
  original_price: null,
  stock_quantity: 4,
  is_active: true,
  is_featured: false,
  description: null,
  short_description: null,
  category_id: "c1",
  alcohol_percentage: null,
  volume_ml: null,
  origin_country: null,
  region: null,
  grape_variety: null,
  vintage_year: null,
  tasting_notes: null,
  food_pairing: null,
  serving_temperature: null,
  image_url: null,
  gallery_urls: null,
  average_rating: 0,
  review_count: 0,
  created_at: "2026-01-01",
} satisfies Product;

describe("catalog SEO", () => {
  it("builds indexable category paths", () => {
    expect(INDEXABLE_CATEGORY_SLUGS).toContain("spiritueux");
    expect(getCategoryPath("spiritueux")).toBe("/catalogue/spiritueux");
    expect(getCategoryPath()).toBe("/catalogue");
  });

  it("generates accented category metadata", () => {
    const seo = getCategorySeo(null, "spiritueux");
    expect(seo.title).toContain("Spiritueux");
    expect(seo.description).toContain("à Yaoundé");
    expect(seo.description).toContain("livrés");
    expect(seo.path).toBe("/catalogue/spiritueux");
  });

  it("builds CollectionPage and breadcrumb schemas", () => {
    const schemas = buildCategorySchemas({
      slug: "rhums",
      products: [sampleProduct],
      total: 1,
    });

    expect(schemas[0]).toMatchObject({
      "@type": "CollectionPage",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: 1,
      },
    });
    expect(JSON.stringify(schemas)).toContain("/produit/rhum-premium");
    expect(JSON.stringify(schemas)).toContain("/catalogue/rhums");
  });
});

