import { useState, useRef } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

interface StockAlertsPDFExportProps {
  chartRef?: React.RefObject<HTMLDivElement>;
  period?: string;
}

interface AlertStats {
  totalAlerts: number;
  lowStockCount: number;
  outOfStockCount: number;
  trend: number;
}

interface ProductStock {
  name: string;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  status: "out_of_stock" | "low_stock" | "critical";
}

export function StockAlertsPDFExport({ chartRef, period = "30" }: StockAlertsPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const days = parseInt(period);
      const endDate = new Date();
      const startDate = subDays(endDate, days);
      const previousStartDate = subDays(startDate, days);

      // Fetch alert history data
      const { data: alertsData } = await supabase
        .from("stock_alerts_history")
        .select("*")
        .gte("sent_at", startDate.toISOString())
        .lte("sent_at", endDate.toISOString())
        .order("sent_at", { ascending: false });

      // Fetch previous period for trend
      const { data: previousData } = await supabase
        .from("stock_alerts_history")
        .select("id")
        .gte("sent_at", previousStartDate.toISOString())
        .lt("sent_at", startDate.toISOString());

      // Fetch current low stock products
      const { data: productsData } = await supabase
        .from("products")
        .select("name, sku, stock_quantity, low_stock_threshold, is_active")
        .eq("is_active", true)
        .or("stock_quantity.lte.10");

      // Calculate stats
      const lowStockCount = (alertsData || []).filter(a => a.alert_type === "low_stock").length;
      const outOfStockCount = (alertsData || []).filter(a => a.alert_type === "out_of_stock").length;
      const totalAlerts = lowStockCount + outOfStockCount;
      const previousTotal = previousData?.length || 0;
      const trend = previousTotal === 0 
        ? (totalAlerts > 0 ? 100 : 0)
        : Math.round(((totalAlerts - previousTotal) / previousTotal) * 100);

      const stats: AlertStats = {
        totalAlerts,
        lowStockCount,
        outOfStockCount,
        trend,
      };

      // Categorize products
      const productsList: ProductStock[] = (productsData || [])
        .filter(p => (p.stock_quantity ?? 0) <= 10)
        .map(p => {
          const stock = p.stock_quantity ?? 0;
          const threshold = p.low_stock_threshold ?? 5;
          let status: "out_of_stock" | "low_stock" | "critical";
          if (stock === 0) {
            status = "out_of_stock";
          } else if (stock <= threshold) {
            status = "low_stock";
          } else {
            status = "critical";
          }
          return {
            name: p.name,
            sku: p.sku,
            stock_quantity: stock,
            low_stock_threshold: threshold,
            status,
          };
        })
        .sort((a, b) => a.stock_quantity - b.stock_quantity);

      // Generate PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Colors
      const primaryColor: [number, number, number] = [212, 175, 55];
      const textColor: [number, number, number] = [30, 30, 30];
      const mutedColor: [number, number, number] = [100, 100, 100];
      const dangerColor: [number, number, number] = [239, 68, 68];
      const warningColor: [number, number, number] = [249, 115, 22];
      const cautionColor: [number, number, number] = [234, 179, 8];

      // Header
      pdf.setFillColor(20, 20, 20);
      pdf.rect(0, 0, pageWidth, 45, "F");

      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("Rapport d'Alertes de Stock", margin, 22);

      pdf.setFontSize(12);
      pdf.setTextColor(200, 200, 200);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Période: ${days} derniers jours`, margin, 32);

      const now = new Date();
      const dateStr = format(now, "dd MMMM yyyy 'à' HH:mm", { locale: fr });
      pdf.setFontSize(10);
      pdf.text(`Généré le ${dateStr}`, margin, 40);

      yPosition = 55;

      // Summary Section
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Résumé des Alertes", margin, yPosition);
      yPosition += 10;

      // Stats boxes
      const boxWidth = (pageWidth - 2 * margin - 10) / 3;
      const boxHeight = 30;

      // Box 1: Out of Stock
      pdf.setFillColor(254, 226, 226);
      pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, "F");
      pdf.setDrawColor(dangerColor[0], dangerColor[1], dangerColor[2]);
      pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, "S");

      pdf.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(stats.outOfStockCount.toString(), margin + 5, yPosition + 15);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("Ruptures de stock", margin + 5, yPosition + 24);

      // Box 2: Low Stock
      const box2X = margin + boxWidth + 5;
      pdf.setFillColor(255, 237, 213);
      pdf.roundedRect(box2X, yPosition, boxWidth, boxHeight, 3, 3, "F");
      pdf.setDrawColor(warningColor[0], warningColor[1], warningColor[2]);
      pdf.roundedRect(box2X, yPosition, boxWidth, boxHeight, 3, 3, "S");

      pdf.setTextColor(warningColor[0], warningColor[1], warningColor[2]);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(stats.lowStockCount.toString(), box2X + 5, yPosition + 15);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("Alertes stock faible", box2X + 5, yPosition + 24);

      // Box 3: Trend
      const box3X = margin + 2 * boxWidth + 10;
      const trendPositive = stats.trend >= 0;
      const trendBgColor = trendPositive ? [255, 237, 213] : [220, 252, 231];
      const trendTextColor: [number, number, number] = trendPositive ? warningColor : [34, 197, 94];

      pdf.setFillColor(trendBgColor[0], trendBgColor[1], trendBgColor[2]);
      pdf.roundedRect(box3X, yPosition, boxWidth, boxHeight, 3, 3, "F");
      pdf.setDrawColor(trendTextColor[0], trendTextColor[1], trendTextColor[2]);
      pdf.roundedRect(box3X, yPosition, boxWidth, boxHeight, 3, 3, "S");

      pdf.setTextColor(trendTextColor[0], trendTextColor[1], trendTextColor[2]);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${trendPositive ? "+" : ""}${stats.trend}%`, box3X + 5, yPosition + 15);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("Tendance vs période préc.", box3X + 5, yPosition + 24);

      yPosition += boxHeight + 15;

      // Products Table
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Produits en Alerte", margin, yPosition);
      yPosition += 8;

      if (productsList.length > 0) {
        // Table header
        pdf.setFillColor(40, 40, 40);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Produit", margin + 3, yPosition + 5.5);
        pdf.text("SKU", margin + 80, yPosition + 5.5);
        pdf.text("Stock", margin + 110, yPosition + 5.5);
        pdf.text("Seuil", margin + 130, yPosition + 5.5);
        pdf.text("Statut", margin + 150, yPosition + 5.5);

        yPosition += 8;

        productsList.slice(0, 20).forEach((product, index) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }

          const bgColor = index % 2 === 0 ? 248 : 255;
          pdf.setFillColor(bgColor, bgColor, bgColor);
          pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

          pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");

          // Truncate product name if too long
          const productName = product.name.length > 35 
            ? product.name.substring(0, 35) + "..." 
            : product.name;
          pdf.text(productName, margin + 3, yPosition + 5.5);
          pdf.text(product.sku || "-", margin + 80, yPosition + 5.5);
          pdf.text(product.stock_quantity.toString(), margin + 110, yPosition + 5.5);
          pdf.text(product.low_stock_threshold.toString(), margin + 130, yPosition + 5.5);

          // Status badge
          let statusText = "";
          let statusColor: [number, number, number];
          if (product.status === "out_of_stock") {
            statusText = "Rupture";
            statusColor = dangerColor;
          } else if (product.status === "low_stock") {
            statusText = "Stock faible";
            statusColor = warningColor;
          } else {
            statusText = "Critique";
            statusColor = cautionColor;
          }

          pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          pdf.setFont("helvetica", "bold");
          pdf.text(statusText, margin + 150, yPosition + 5.5);

          yPosition += 8;
        });

        if (productsList.length > 20) {
          yPosition += 3;
          pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "italic");
          pdf.text(`... et ${productsList.length - 20} autres produits`, margin, yPosition + 5);
          yPosition += 10;
        }
      } else {
        pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        pdf.setFontSize(10);
        pdf.text("Aucun produit en alerte actuellement", margin, yPosition + 5);
        yPosition += 15;
      }

      yPosition += 10;

      // Recent Alerts Table
      if (alertsData && alertsData.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Historique des Alertes Récentes", margin, yPosition);
        yPosition += 8;

        // Table header
        pdf.setFillColor(40, 40, 40);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Date", margin + 3, yPosition + 5.5);
        pdf.text("Produit", margin + 40, yPosition + 5.5);
        pdf.text("Type", margin + 120, yPosition + 5.5);
        pdf.text("Stock", margin + 155, yPosition + 5.5);

        yPosition += 8;

        alertsData.slice(0, 15).forEach((alert, index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }

          const bgColor = index % 2 === 0 ? 248 : 255;
          pdf.setFillColor(bgColor, bgColor, bgColor);
          pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

          pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");

          const alertDate = format(new Date(alert.sent_at), "dd/MM/yy HH:mm", { locale: fr });
          const productName = alert.product_name.length > 30 
            ? alert.product_name.substring(0, 30) + "..." 
            : alert.product_name;

          pdf.text(alertDate, margin + 3, yPosition + 5.5);
          pdf.text(productName, margin + 40, yPosition + 5.5);

          const alertTypeColor: [number, number, number] = alert.alert_type === "out_of_stock" 
            ? dangerColor 
            : warningColor;
          pdf.setTextColor(alertTypeColor[0], alertTypeColor[1], alertTypeColor[2]);
          pdf.setFont("helvetica", "bold");
          pdf.text(alert.alert_type === "out_of_stock" ? "Rupture" : "Stock faible", margin + 120, yPosition + 5.5);

          pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
          pdf.setFont("helvetica", "normal");
          pdf.text(alert.stock_quantity.toString(), margin + 155, yPosition + 5.5);

          yPosition += 8;
        });
      }

      // Capture chart if available
      if (chartRef?.current) {
        try {
          pdf.addPage();
          yPosition = margin;

          pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text("Graphique d'Évolution des Alertes", margin, yPosition);
          yPosition += 10;

          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: "#1a1a1a",
            scale: 2,
            logging: false,
            useCORS: true,
          });

          const imgData = canvas.toDataURL("image/png");
          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          const maxHeight = pageHeight - yPosition - margin;
          const finalHeight = Math.min(imgHeight, maxHeight);
          const finalWidth = (finalHeight / imgHeight) * imgWidth;

          pdf.addImage(imgData, "PNG", margin, yPosition, finalWidth, finalHeight);
        } catch (error) {
          console.error("Error capturing chart:", error);
        }
      }

      // Footer on all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        pdf.text(
          `Page ${i} / ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
      }

      // Save PDF
      const fileName = `rapport-alertes-stock-${format(now, "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Rapport généré",
        description: `Le fichier ${fileName} a été téléchargé`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le rapport PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={isGenerating}
      className="bg-gradient-gold text-noir font-semibold hover:opacity-90"
    >
      {isGenerating ? (
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
