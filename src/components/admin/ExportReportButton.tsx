import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  generatePerformanceReportPDF,
  type ReportStats,
  type SalesDataPoint,
  type PopularProduct,
  type StatusDistribution,
} from "@/lib/pdfExport";

interface ExportReportButtonProps {
  stats: ReportStats;
  salesData: SalesDataPoint[];
  popularProducts: PopularProduct[];
  statusDistribution: StatusDistribution[];
  periodLabel: string;
  chartsContainerRef?: React.RefObject<HTMLElement>;
}

export function ExportReportButton({
  stats,
  salesData,
  popularProducts,
  statusDistribution,
  periodLabel,
  chartsContainerRef,
}: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { t } = useTranslation();

  const handleExport = async () => {
    setIsExporting(true);

    try {
      await generatePerformanceReportPDF(
        stats,
        salesData,
        popularProducts,
        statusDistribution,
        periodLabel,
        chartsContainerRef?.current
      );

      toast.success(t("exportReportButton.success"), {
        description: t("exportReportButton.successDesc"),
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(t("exportReportButton.error"), {
        description: t("exportReportButton.errorDesc"),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      className="border-gold/20 text-cream hover:bg-cream/10"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {t("exportReportButton.generating")}
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          {t("exportReportButton.exportPdf")}
        </>
      )}
    </Button>
  );
}
