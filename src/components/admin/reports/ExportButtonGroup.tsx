import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, FileDown, Printer } from "lucide-react";
import {
  downloadReportPDF,
  downloadReportXLSX,
  downloadReportCSV,
  printReport,
  type ReportColumn,
  type ReportMeta,
} from "@/lib/reporting";

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
  const isEmpty = disabled || rows.length === 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={isEmpty}
        onClick={() => downloadReportPDF(meta, columns, rows, filename)}
      >
        <FileText className="h-4 w-4 mr-1.5" /> PDF
      </Button>
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={isEmpty}
        onClick={() => downloadReportXLSX(meta, columns, rows, filename)}
      >
        <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
      </Button>
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={isEmpty}
        onClick={() => downloadReportCSV(meta, columns, rows, filename)}
      >
        <FileDown className="h-4 w-4 mr-1.5" /> CSV
      </Button>
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={isEmpty}
        onClick={() => printReport(meta, columns, rows)}
      >
        <Printer className="h-4 w-4 mr-1.5" /> Imprimer
      </Button>
    </div>
  );
}