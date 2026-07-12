import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const viteConfig = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");

describe("vite chunking config", () => {
  it("keeps the Vite preload helper out of heavy vendor chunks", () => {
    expect(viteConfig).toContain('id.includes("vite/preload-helper")');
    expect(viteConfig).toContain('return "preload-helper"');
    expect(viteConfig).toContain('id.includes("commonjsHelpers")');
    expect(viteConfig).toContain('return "commonjs-helpers"');
  });

  it("keeps heavy reporting libraries in lazy vendor chunks", () => {
    expect(viteConfig).toContain('return "vendor-seo"');
    expect(viteConfig).toContain('return "vendor-ui-utils"');
    expect(viteConfig).toContain('return "vendor-pdf"');
    expect(viteConfig).toContain('return "vendor-excel"');
    expect(viteConfig).toContain('return "vendor-charts"');
  });
});
