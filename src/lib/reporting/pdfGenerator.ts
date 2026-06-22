import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportColumn, ReportMeta } from "./types";

const GOLD: [number, number, number] = [212, 175, 55];
const DARK: [number, number, number] = [20, 20, 20];

export function generateReportPDF<T extends Record<string, any>>(
  meta: ReportMeta,
  columns: ReportColumn<T>[],
  rows: T[],
): jsPDF {
  const orientation = meta.orientation ?? "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 14;

  // Header band
  pdf.setFillColor(...DARK);
  pdf.rect(0, 0, pageWidth, 28, "F");
  pdf.setTextColor(...GOLD);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("LA PETITE BOUTEILLE", margin, 12);
  pdf.setTextColor(230, 230, 230);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(meta.title, margin, 20);
  if (meta.subtitle) {
    pdf.setFontSize(9);
    pdf.setTextColor(180, 180, 180);
    pdf.text(meta.subtitle, margin, 25);
  }

  const now = new Date();
  const dateStr = now.toLocaleString("fr-FR");
  pdf.setFontSize(8);
  pdf.setTextColor(200, 200, 200);
  pdf.text(`Généré le ${dateStr}`, pageWidth - margin, 12, { align: "right" });
  if (meta.generatedBy) {
    pdf.text(`Par ${meta.generatedBy}`, pageWidth - margin, 17, { align: "right" });
  }

  let cursorY = 34;

  // Filters block
  if (meta.filters && Object.keys(meta.filters).length > 0) {
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(9);
    const parts = Object.entries(meta.filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}: ${v}`);
    if (parts.length > 0) {
      pdf.text(parts.join("   •   "), margin, cursorY);
      cursorY += 5;
    }
  }

  const head = [columns.map((c) => c.label)];
  const body = rows.map((row) =>
    columns.map((c) => {
      const raw = c.value ? c.value(row) : (row as any)[c.key];
      return raw === null || raw === undefined ? "" : String(raw);
    }),
  );

  // Totals row
  if (meta.totals) {
    body.push(
      columns.map((c, i) => {
        if (i === 0 && !(c.key in meta.totals!)) return "TOTAL";
        const v = meta.totals![c.key];
        return v === undefined ? "" : String(v);
      }),
    );
  }

  autoTable(pdf, {
    head,
    body,
    startY: cursorY + 2,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: GOLD, textColor: DARK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: columns.reduce<Record<number, any>>((acc, c, i) => {
      if (c.numeric) acc[i] = { halign: "right" };
      if (c.width) acc[i] = { ...(acc[i] || {}), cellWidth: c.width };
      return acc;
    }, {}),
    didDrawPage: (data) => {
      const pageCount = pdf.getNumberOfPages();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `Page ${data.pageNumber} / ${pageCount}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: "right" },
      );
      pdf.text(
        "La Petite Bouteille — Rapport confidentiel",
        margin,
        pageHeight - 8,
      );
    },
  });

  // Signature area on last page
  const lastY = (pdf as any).lastAutoTable?.finalY ?? cursorY + 10;
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (lastY < pageHeight - 40) {
    pdf.setDrawColor(...GOLD);
    pdf.line(margin, pageHeight - 25, margin + 60, pageHeight - 25);
    pdf.line(pageWidth - margin - 60, pageHeight - 25, pageWidth - margin, pageHeight - 25);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Préparé par", margin, pageHeight - 20);
    pdf.text("Approuvé par", pageWidth - margin - 60, pageHeight - 20);
  }

  return pdf;
}

export function downloadReportPDF<T extends Record<string, any>>(
  meta: ReportMeta,
  columns: ReportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const pdf = generateReportPDF(meta, columns, rows);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}