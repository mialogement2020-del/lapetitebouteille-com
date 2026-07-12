import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, FileDown, Printer } from "lucide-react";
import type { ReportColumn, ReportMeta } from "@/lib/reporting/types";

interface Props<T extends Record<string, any>> {
  meta: ReportMeta;
  columns: ReportColumn<T>[];
  rows: T[];
  filename: string;
  size?: "sm" | "default";
  disabled?: boolean;
}

export function ExportButtonGroup<T extends Record<string, any>>({
  meta,
  columns,
  rows,
  filename,
  size = "sm",
  disabled,
}: Props<T>) {
  const [busyFormat, setBusyFormat] = useState<"pdf" | "xlsx" | "csv" | "print" | null>(null);
  const isEmpty = disabled || rows.length === 0;

  const runExport = async (format: "pdf" | "xlsx" | "csv" | "print") => {
    setBusyFormat(format);
    try {
      if (format === "pdf") {
        const { downloadReportPDF } = await import("@/lib/reporting/pdfGenerator");
        downloadReportPDF(meta, columns, rows, filename);
      } else if (format === "xlsx") {
        const { downloadReportXLSX } = await import("@/lib/reporting/excelExporter");
        downloadReportXLSX(meta, columns, rows, filename);
      } else if (format === "csv") {
        const { downloadReportCSV } = await import("@/lib/reporting/csvExporter");
        downloadReportCSV(meta, columns, rows, filename);
      } else {
        const { printReport } = await import("@/lib/reporting/printReport");
        printReport(meta, columns, rows);
      }
    } finally {
      setBusyFormat(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={isEmpty || busyFormat !== null}
        onClick={() => void runExport("pdf")}
      >
        <FileText className="h-4 w-4 mr-1.5" /> {busyFormat === "pdf" ? "PDF..." : "PDF"}
      </Button>
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={isEmpty || busyFormat !== null}
        onClick={() => void runExport("xlsx")}
      >
        <FileSpreadsheet className="h-4 w-4 mr-1.5" /> {busyFormat === "xlsx" ? "Excel..." : "Excel"}
      </Button>
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={isEmpty || busyFormat !== null}
        onClick={() => void runExport("csv")}
      >
        <FileDown className="h-4 w-4 mr-1.5" /> {busyFormat === "csv" ? "CSV..." : "CSV"}
      </Button>
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={isEmpty || busyFormat !== null}
        onClick={() => void runExport("print")}
      >
        <Printer className="h-4 w-4 mr-1.5" /> {busyFormat === "print" ? "Impression..." : "Imprimer"}
      </Button>
    </div>
  );
}
