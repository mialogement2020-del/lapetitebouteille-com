import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const mainEntry = readFileSync(join(process.cwd(), "src/main.tsx"), "utf8");

describe("runtime monitoring loading", () => {
  it("keeps analytics and performance monitoring out of the initial entry chunk", () => {
    expect(mainEntry).not.toContain('import { initPerfReporter } from "./lib/perfReporter"');
    expect(mainEntry).not.toContain('import { initAnalytics } from "./lib/analytics"');
    expect(mainEntry).toContain('import("./lib/perfReporter")');
    expect(mainEntry).toContain('import("./lib/analytics")');
  });

  it("starts monitoring after the app has rendered", () => {
    expect(mainEntry).toContain("requestIdleCallback");
    expect(mainEntry).toContain("scheduleMonitoring();");
  });
});
