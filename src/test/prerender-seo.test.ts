import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readProjectFile = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("SEO prerender build integration", () => {
  it("runs prerender after the Vite build", () => {
    const pkg = JSON.parse(readProjectFile("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toContain("vite build");
    expect(pkg.scripts.build).toContain("node scripts/prerender-seo.mjs");
  });

  it("generates the priority category and product metadata primitives", () => {
    const script = readProjectFile("scripts/prerender-seo.mjs");
    expect(script).toContain('"spiritueux"');
    expect(script).toContain('"champagnes"');
    expect(script).toContain('"vins"');
    expect(script).toContain('"whiskies"');
    expect(script).toContain('"cognacs"');
    expect(script).toContain('"rhums"');
    expect(script).toContain('"@type": "Product"');
    expect(script).toContain('"@type": "CollectionPage"');
    expect(script).toContain('"@type": "BreadcrumbList"');
  });
});
