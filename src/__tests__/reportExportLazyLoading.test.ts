import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const exportButtonGroup = readFileSync(
  join(process.cwd(), "src/components/admin/reports/ExportButtonGroup.tsx"),
  "utf8"
);

const viteConfig = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");

describe("report export lazy loading", () => {
  it("does not statically load heavy PDF and spreadsheet exporters", () => {
    expect(exportButtonGroup).not.toContain('from "@/lib/reporting"');
    expect(exportButtonGroup).not.toContain("downloadReportPDF,");
    expect(exportButtonGroup).not.toContain("downloadReportXLSX,");
    expect(exportButtonGroup).toContain('await import("@/lib/reporting/pdfGenerator")');
    expect(exportButtonGroup).toContain('await import("@/lib/reporting/excelExporter")');
  });

  it("keeps heavy export dependencies in dedicated chunks", () => {
    expect(viteConfig).toContain('"vendor-pdf"');
    expect(viteConfig).toContain('"vendor-excel"');
    expect(viteConfig).toContain("jspdf|jspdf-autotable|html2canvas");
    expect(viteConfig).toContain("[\\\\/]xlsx[\\\\/]");
  });
});
