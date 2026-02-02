/**
 * Utility functions for exporting data to CSV format
 */

type CsvData = Record<string, unknown>;

/**
 * Convert an array of objects to CSV string
 */
export function convertToCSV<T extends CsvData>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return "";

  // Header row
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  // Data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        if (value === null || value === undefined) return '""';
        if (typeof value === "string") {
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (typeof value === "number" || typeof value === "boolean") {
          return `"${value}"`;
        }
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        // For objects/arrays, stringify
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return [headers, ...rows].join("\n");
}

/**
 * Download CSV content as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for CSV export
 */
export function formatDateForCSV(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format price for CSV export
 */
export function formatPriceForCSV(price: number): string {
  return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
}
