/**
 * Utility functions for exporting audit logs to CSV and PDF
 */

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { convertToCSV, downloadCSV, formatDateForCSV } from "./csvExport";
import type { AuditLog } from "@/hooks/useAuditLogs";

const actionLabels: Record<string, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  approve: "Approbation",
  reject: "Rejet",
  restock: "Réapprovisionnement",
  status_change: "Changement de statut",
  export: "Export",
  login: "Connexion",
};

const entityLabels: Record<string, string> = {
  product: "Produit",
  category: "Catégorie",
  order: "Commande",
  review: "Avis",
  promo_code: "Code promo",
  user: "Utilisateur",
  stock: "Stock",
  report: "Rapport",
  settings: "Paramètres",
};

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCSV(logs: AuditLog[]): void {
  const columns = [
    { key: "created_at" as keyof AuditLog, header: "Date/Heure" },
    { key: "action" as keyof AuditLog, header: "Action" },
    { key: "entity_type" as keyof AuditLog, header: "Type" },
    { key: "entity_name" as keyof AuditLog, header: "Élément" },
    { key: "user_email" as keyof AuditLog, header: "Utilisateur" },
    { key: "old_values" as keyof AuditLog, header: "Valeurs précédentes" },
    { key: "new_values" as keyof AuditLog, header: "Nouvelles valeurs" },
  ];

  // Transform logs for CSV export
  const transformedLogs = logs.map((log) => ({
    ...log,
    created_at: formatDateForCSV(log.created_at),
    action: actionLabels[log.action] || log.action,
    entity_type: entityLabels[log.entity_type] || log.entity_type,
    old_values: log.old_values ? JSON.stringify(log.old_values) : "",
    new_values: log.new_values ? JSON.stringify(log.new_values) : "",
  }));

  const csvContent = convertToCSV(transformedLogs, columns);
  const now = new Date();
  const filename = `journal-audit-${format(now, "yyyy-MM-dd-HHmm")}.csv`;
  downloadCSV(csvContent, filename);
}

/**
 * Export audit logs to PDF
 */
export function exportAuditLogsToPDF(logs: AuditLog[]): void {
  const pdf = new jsPDF({
    orientation: "landscape",
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
  pdf.rect(0, 0, pageWidth, 35, "F");

  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Journal d'Audit - Rapport de Conformité", margin, 18);

  const now = new Date();
  const dateStr = format(now, "d MMMM yyyy 'à' HH:mm", { locale: fr });

  pdf.setFontSize(10);
  pdf.setTextColor(200, 200, 200);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Généré le ${dateStr}`, margin, 28);
  pdf.text(`${logs.length} entrée${logs.length > 1 ? "s" : ""}`, pageWidth - margin - 40, 28);

  yPosition = 45;

  // Stats summary
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const entityCounts = logs.reduce((acc, log) => {
    acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Summary section
  pdf.setFillColor(248, 248, 248);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 3, 3, "F");

  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Résumé des actions", margin + 5, yPosition + 7);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  // Action stats
  let xOffset = margin + 5;
  Object.entries(actionCounts)
    .slice(0, 6)
    .forEach(([action, count]) => {
      const label = `${actionLabels[action] || action}: ${count}`;
      pdf.text(label, xOffset, yPosition + 14);
      xOffset += 45;
    });

  // Entity stats
  xOffset = margin + 5;
  Object.entries(entityCounts)
    .slice(0, 6)
    .forEach(([entity, count]) => {
      const label = `${entityLabels[entity] || entity}: ${count}`;
      pdf.text(label, xOffset, yPosition + 21);
      xOffset += 45;
    });

  yPosition += 35;

  // Table header
  pdf.setFillColor(40, 40, 40);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");

  const colWidths = [40, 35, 30, 55, 55, 50];
  const colHeaders = ["Date/Heure", "Action", "Type", "Élément", "Utilisateur", "Modifications"];

  let xPos = margin + 2;
  colHeaders.forEach((header, i) => {
    pdf.text(header, xPos, yPosition + 5.5);
    xPos += colWidths[i];
  });

  yPosition += 8;

  // Table rows
  pdf.setFont("helvetica", "normal");
  const rowHeight = 10;
  const maxRowsPerPage = Math.floor((pageHeight - yPosition - margin - 15) / rowHeight);

  logs.forEach((log, index) => {
    // Check for page break
    if (index > 0 && index % maxRowsPerPage === 0) {
      pdf.addPage();
      yPosition = margin;

      // Repeat header on new page
      pdf.setFillColor(40, 40, 40);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");

      xPos = margin + 2;
      colHeaders.forEach((header, i) => {
        pdf.text(header, xPos, yPosition + 5.5);
        xPos += colWidths[i];
      });

      yPosition += 8;
      pdf.setFont("helvetica", "normal");
    }

    // Alternate row background
    const bgColor = index % 2 === 0 ? 255 : 248;
    pdf.setFillColor(bgColor, bgColor, bgColor);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, "F");

    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(7);

    xPos = margin + 2;

    // Date
    pdf.text(
      format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: fr }),
      xPos,
      yPosition + 6
    );
    xPos += colWidths[0];

    // Action
    pdf.text(actionLabels[log.action] || log.action, xPos, yPosition + 6);
    xPos += colWidths[1];

    // Entity type
    pdf.text(entityLabels[log.entity_type] || log.entity_type, xPos, yPosition + 6);
    xPos += colWidths[2];

    // Entity name
    const entityName = log.entity_name || "-";
    pdf.text(entityName.substring(0, 35) + (entityName.length > 35 ? "..." : ""), xPos, yPosition + 6);
    xPos += colWidths[3];

    // User email
    const email = log.user_email || "Inconnu";
    pdf.text(email.substring(0, 35) + (email.length > 35 ? "..." : ""), xPos, yPosition + 6);
    xPos += colWidths[4];

    // Changes summary
    let changesSummary = "";
    if (log.old_values && log.new_values) {
      changesSummary = "Modifié";
    } else if (log.new_values) {
      changesSummary = "Nouvelles valeurs";
    } else if (log.old_values) {
      changesSummary = "Valeurs supprimées";
    }
    pdf.text(changesSummary, xPos, yPosition + 6);

    yPosition += rowHeight;
  });

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(`Page ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    pdf.text("Document confidentiel - Usage interne uniquement", margin, pageHeight - 8);
  }

  // Save
  const filename = `journal-audit-${format(now, "yyyy-MM-dd-HHmm")}.pdf`;
  pdf.save(filename);
}
