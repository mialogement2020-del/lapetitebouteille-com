export type ReportFormat = "pdf" | "xlsx" | "csv" | "print";

export interface ReportColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  value?: (row: T) => string | number | null | undefined;
  numeric?: boolean;
  width?: number;
}

export interface ReportMeta {
  title: string;
  subtitle?: string;
  generatedBy?: string;
  filters?: Record<string, string | number | undefined | null>;
  orientation?: "portrait" | "landscape";
  totals?: Record<string, string | number>;
}
