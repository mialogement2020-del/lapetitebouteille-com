import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

      toast.success("Rapport PDF généré avec succès", {
        description: "Le téléchargement devrait commencer automatiquement",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF", {
        description: "Veuillez réessayer",
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
          Génération...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          Exporter PDF
        </>
      )}
    </Button>
  );
}
