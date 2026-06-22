import * as XLSX from "xlsx";
import type { ReportColumn, ReportMeta } from "./types";

export function downloadReportXLSX<T extends Record<string, any>>(
  meta: ReportMeta,
  columns: ReportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const header = columns.map((c) => c.label);
  const data = rows.map((r) =>
    columns.map((c) => {
      const raw = c.value ? c.value(r) : (r as any)[c.key];
      return raw === null || raw === undefined ? "" : raw;
    }),
  );

  const aoa: any[][] = [];
  aoa.push([meta.title]);
  if (meta.subtitle) aoa.push([meta.subtitle]);
  aoa.push([`Généré le ${new Date().toLocaleString("fr-FR")}`]);
  if (meta.generatedBy) aoa.push([`Par ${meta.generatedBy}`]);
  aoa.push([]);
  aoa.push(header);
  data.forEach((row) => aoa.push(row));
  if (meta.totals) {
    aoa.push(
      columns.map((c, i) => {
        if (i === 0 && !(c.key in meta.totals!)) return "TOTAL";
        return meta.totals![c.key] ?? "";
      }),
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapport");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}