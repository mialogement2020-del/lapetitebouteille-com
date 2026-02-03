/**
 * Utility functions for generating PDF reports
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ReportStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface PopularProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
}

/**
 * Format price for PDF
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
};

/**
 * Generate performance report PDF
 */
export async function generatePerformanceReportPDF(
  stats: ReportStats,
  salesData: SalesDataPoint[],
  popularProducts: PopularProduct[],
  statusDistribution: StatusDistribution[],
  periodLabel: string,
  chartsContainerRef?: HTMLElement | null
): Promise<void> {
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
  const primaryColor: [number, number, number] = [212, 175, 55]; // Gold
  const textColor: [number, number, number] = [30, 30, 30];
  const mutedColor: [number, number, number] = [100, 100, 100];

  // Header
  pdf.setFillColor(20, 20, 20);
  pdf.rect(0, 0, pageWidth, 40, "F");

  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("Rapport de Performance", margin, 22);

  pdf.setFontSize(12);
  pdf.setTextColor(200, 200, 200);
  pdf.setFont("helvetica", "normal");
  pdf.text(periodLabel, margin, 32);

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  pdf.setFontSize(10);
  pdf.text(`Généré le ${dateStr}`, pageWidth - margin - 60, 32);

  yPosition = 55;

  // Section: Key Metrics
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Indicateurs Clés", margin, yPosition);
  yPosition += 10;

  // Revenue box
  pdf.setFillColor(248, 248, 248);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 3, 3, "F");

  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatPrice(stats.totalRevenue), margin + 5, yPosition + 15);

  pdf.setFontSize(10);
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text("Chiffre d'affaires total", margin + 5, yPosition + 22);

  yPosition += 35;

  // Stats grid
  const statsGrid = [
    { label: "Total commandes", value: stats.totalOrders.toString() },
    { label: "Commandes livrées", value: stats.deliveredOrders.toString() },
    { label: "En cours", value: (stats.confirmedOrders + stats.processingOrders + stats.shippedOrders).toString() },
    { label: "En attente", value: stats.pendingOrders.toString() },
    { label: "Annulées", value: stats.cancelledOrders.toString() },
    { label: "Produits actifs", value: `${stats.activeProducts}/${stats.totalProducts}` },
  ];

  const colWidth = (pageWidth - 2 * margin) / 3;
  const boxHeight = 20;

  statsGrid.forEach((stat, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + col * colWidth;
    const y = yPosition + row * (boxHeight + 5);

    pdf.setFillColor(248, 248, 248);
    pdf.roundedRect(x, y, colWidth - 3, boxHeight, 2, 2, "F");

    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(stat.value, x + 5, y + 10);

    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.setFont("helvetica", "normal");
    pdf.text(stat.label, x + 5, y + 16);
  });

  yPosition += 2 * (boxHeight + 5) + 15;

  // Section: Order Status Distribution
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Répartition des Commandes", margin, yPosition);
  yPosition += 8;

  if (statusDistribution.length > 0) {
    const total = statusDistribution.reduce((sum, item) => sum + item.value, 0);

    statusDistribution.forEach((status, index) => {
      const percentage = total > 0 ? ((status.value / total) * 100).toFixed(1) : "0";
      const barWidth = total > 0 ? ((status.value / total) * (pageWidth - 2 * margin - 50)) : 0;

      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(status.name, margin, yPosition + 5);

      // Progress bar background
      pdf.setFillColor(230, 230, 230);
      pdf.roundedRect(margin + 50, yPosition, pageWidth - 2 * margin - 80, 6, 1, 1, "F");

      // Progress bar fill
      const colors: [number, number, number][] = [
        [212, 175, 55],
        [76, 175, 80],
        [103, 58, 183],
        [33, 150, 243],
        [255, 152, 0],
        [244, 67, 54],
      ];
      const color = colors[index % colors.length];
      pdf.setFillColor(color[0], color[1], color[2]);
      if (barWidth > 0) {
        pdf.roundedRect(margin + 50, yPosition, barWidth, 6, 1, 1, "F");
      }

      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.text(`${status.value} (${percentage}%)`, pageWidth - margin - 25, yPosition + 5);

      yPosition += 12;
    });
  } else {
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.setFontSize(10);
    pdf.text("Aucune donnée disponible", margin, yPosition);
    yPosition += 10;
  }

  yPosition += 10;

  // Section: Top Products
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Produits les Plus Vendus", margin, yPosition);
  yPosition += 8;

  if (popularProducts.length > 0) {
    // Table header
    pdf.setFillColor(40, 40, 40);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Produit", margin + 3, yPosition + 5.5);
    pdf.text("Quantité", margin + 90, yPosition + 5.5);
    pdf.text("Chiffre d'affaires", margin + 120, yPosition + 5.5);
    
    yPosition += 8;

    popularProducts.forEach((product, index) => {
      const bgColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(bgColor, bgColor, bgColor);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(product.name, margin + 3, yPosition + 5.5);
      pdf.text(product.quantity.toString(), margin + 90, yPosition + 5.5);
      pdf.text(formatPrice(product.revenue), margin + 120, yPosition + 5.5);

      yPosition += 8;
    });
  } else {
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.setFontSize(10);
    pdf.text("Aucune vente enregistrée", margin, yPosition);
    yPosition += 10;
  }

  yPosition += 15;

  // Section: Sales Evolution (Data Table)
  if (salesData.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Évolution des Ventes", margin, yPosition);
    yPosition += 8;

    // Table header
    pdf.setFillColor(40, 40, 40);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Période", margin + 3, yPosition + 5.5);
    pdf.text("Commandes", margin + 70, yPosition + 5.5);
    pdf.text("Chiffre d'affaires", margin + 110, yPosition + 5.5);
    
    yPosition += 8;

    // Limit to last 10 entries for readability
    const displayData = salesData.slice(-10);

    displayData.forEach((point, index) => {
      const bgColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(bgColor, bgColor, bgColor);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(point.date, margin + 3, yPosition + 5.5);
      pdf.text(point.orders.toString(), margin + 70, yPosition + 5.5);
      pdf.text(formatPrice(point.revenue), margin + 110, yPosition + 5.5);

      yPosition += 8;
    });

    // Summary row
    const totalSalesRevenue = salesData.reduce((sum, p) => sum + p.revenue, 0);
    const totalSalesOrders = salesData.reduce((sum, p) => sum + p.orders, 0);

    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");
    
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFont("helvetica", "bold");
    pdf.text("Total période", margin + 3, yPosition + 5.5);
    pdf.text(totalSalesOrders.toString(), margin + 70, yPosition + 5.5);
    pdf.text(formatPrice(totalSalesRevenue), margin + 110, yPosition + 5.5);
  }

  // Capture charts if container is provided
  if (chartsContainerRef) {
    try {
      pdf.addPage();
      yPosition = margin;

      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Graphiques", margin, yPosition);
      yPosition += 10;

      const canvas = await html2canvas(chartsContainerRef, {
        backgroundColor: "#1a1a1a",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if image fits on page
      const maxHeight = pageHeight - yPosition - margin;
      const finalHeight = Math.min(imgHeight, maxHeight);
      const finalWidth = (finalHeight / imgHeight) * imgWidth;

      pdf.addImage(imgData, "PNG", margin, yPosition, finalWidth, finalHeight);
    } catch (error) {
      console.error("Error capturing charts:", error);
    }
  }

  // Footer on last page
  const lastPageNum = pdf.getNumberOfPages();
  for (let i = 1; i <= lastPageNum; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(
      `Page ${i} / ${lastPageNum}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // Save the PDF
  const fileName = `rapport-performance-${now.toISOString().split("T")[0]}.pdf`;
  pdf.save(fileName);
}
