import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readProjectFile = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("public routing and indexability", () => {
  it("exposes clean catalogue category routes", () => {
    const app = readProjectFile("src/App.tsx");
    expect(app).toContain('path="/catalogue/:categorySlug"');
  });

  it("keeps legal pages routed", () => {
    const app = readProjectFile("src/App.tsx");
    expect(app).toContain('path="/conditions"');
    expect(app).toContain('path="/confidentialite"');
    expect(app).toContain('path="/mentions-legales"');
    expect(app).toContain('path="/livraison"');
  });

  it("keeps checkout private for crawlers", () => {
    const robots = readProjectFile("public/robots.txt");
    expect(robots).toContain("Disallow: /checkout");
    expect(robots).toContain("Disallow: /admin");
  });

  it("defines production security headers for static hosting", () => {
    const headers = readProjectFile("public/_headers");
    expect(headers).toContain("Content-Security-Policy");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("Permissions-Policy");
    expect(headers).toContain("X-Frame-Options: DENY");
  });
});
