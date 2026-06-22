import type { ReportColumn, ReportMeta } from "./types";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadReportCSV<T extends Record<string, any>>(
  meta: ReportMeta,
  columns: ReportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCSV(c.label)).join(","));
  rows.forEach((r) => {
    lines.push(
      columns
        .map((c) => escapeCSV(c.value ? c.value(r) : (r as any)[c.key]))
        .join(","),
    );
  });
  if (meta.totals) {
    lines.push(
      columns
        .map((c, i) => {
          if (i === 0 && !(c.key in meta.totals!)) return escapeCSV("TOTAL");
          return escapeCSV(meta.totals![c.key]);
        })
        .join(","),
    );
  }
  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}