import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const indexPage = readFileSync(join(process.cwd(), "src/pages/Index.tsx"), "utf8");
const deferredSection = readFileSync(
  join(process.cwd(), "src/components/performance/DeferredSection.tsx"),
  "utf8"
);

describe("home page deferred sections", () => {
  it("keeps below-the-fold home sections out of the initial page chunk", () => {
    expect(indexPage).toContain("lazy(() => import(\"@/components/home/CategoriesSection\"))");
    expect(indexPage).toContain("lazy(() => import(\"@/components/home/FeaturedProducts\"))");
    expect(indexPage).toContain("lazy(() => import(\"@/components/home/MLMTeaser\"))");
    expect(indexPage).not.toContain("import CategoriesSection from \"@/components/home/CategoriesSection\"");
    expect(indexPage).not.toContain("import FeaturedProducts from \"@/components/home/FeaturedProducts\"");
    expect(indexPage).not.toContain("import MLMTeaser from \"@/components/home/MLMTeaser\"");
  });

  it("uses viewport or timeout based rendering so sections still appear without interaction", () => {
    expect(indexPage).toContain("<DeferredHomeSection");
    expect(deferredSection).toContain("IntersectionObserver");
    expect(deferredSection).toContain("window.setTimeout");
  });
});
