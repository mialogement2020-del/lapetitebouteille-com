import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, Check, X, Clock, Eye, Building2, Phone, Mail, MapPin, {t("adminQuotes.dialog.message")}Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuoteRequests, useUpdateQuoteStatus } from "@/hooks/useWholesale";
import { toast } from "@/hooks/use-toast";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

const PACKAGING_LABELS: Record<string, string> = {
  carton_6: t("adminQuotes.packaging.carton_6"),
  carton_12: t("adminQuotes.packaging.carton_12"),
  palette: t("adminQuotes.packaging.palette"),
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  en_attente: { label: t("adminQuotes.status.en_attente"), className: "bg-warning/20 text-warning border-warning/30" },
  traite: { label: t("adminQuotes.status.traite"), className: "bg-green-500/20 text-green-400 border-green-500/30" },
  refuse: { label: t("adminQuotes.status.refuse"), className: "bg-destructive/20 text-destructive border-destructive/30" },
};

export function QuotesTable() {
  const { data: quotes = [], isLoading } = useQuoteRequests();
  const updateStatus = useUpdateQuoteStatus();
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status, notes: adminNotes });
      toast({
        title: "{t("adminQuotes.headerStatus")} mis à jour",
        description: `t("adminQuotes.dialog.updateDesc", { status: status === "traite" ? t("adminQuotes.dialog.statusTreated") : t("adminQuotes.dialog.statusRejected") })`,
      });
      setSelectedQuote(null);
      setAdminNotes("");
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const exportCSV = () => {
    const headers = ["{t("adminQuotes.headerDate")}", "Nom", "{t("adminQuotes.dialog.email")}", "{t("adminQuotes.dialog.phone")}", "{t("adminQuotes.dialog.company")}", "NIU", "{t("adminQuotes.dialog.city")}", "{t("adminQuotes.headerProduct")}", "{t("adminQuotes.headerPackaging")}", "Quantité", "Prix {t("adminQuotes.headerTotal")}", "{t("adminQuotes.headerStatus")}", "{t("adminQuotes.dialog.message")}"];
    const rows = quotes.map((q: any) => [
      new {t("adminQuotes.headerDate")}(q.created_at).toLocale{t("adminQuotes.headerDate")}String("fr-FR"),
      q.client_name,
      q.client_email,
      q.client_phone,
      q.company_name || "",
      q.niu || "",
      q.city,
      q.product_name,
      PACKAGING_LABELS[q.packaging_type] || q.packaging_type,
      q.quantity,
      q.total_price,
      q.status,
      q.message || "",
    ]);

    const csv = [headers.join(";"), ...rows.map((r: any[]) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devis_gros_${new {t("adminQuotes.headerDate")}().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingCount = quotes.filter((q: any) => q.status === "en_attente").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-display font-semibold text-cream">
            {t("adminQuotes.title")}
          </h2>
          {pendingCount > 0 && (
            <Badge className="bg-warning/20 text-warning border-warning/30">
              t(`adminQuotes.pending_${pendingCount === 1 ? "one" : "other"}`, { count: pendingCount })
            </Badge>
          )}
        </div>
        <Button
          onClick={exportCSV}
          variant="outline"
          size="sm"
          className="border-cream/20 text-cream hover:bg-cream/10 gap-2"
        >
          <Download className="h-4 w-4" />
          {t("adminQuotes.exportCSV")}
        </Button>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-12 text-cream/40">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("adminQuotes.noQuotes")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-cream/10 hover:bg-transparent">
                <TableHead className="text-cream/60">{t("adminQuotes.headerDate")}</TableHead>
                <TableHead className="text-cream/60">{t("adminQuotes.headerClient")}</TableHead>
                <TableHead className="text-cream/60">{t("adminQuotes.headerProduct")}</TableHead>
                <TableHead className="text-cream/60">{t("adminQuotes.headerPackaging")}</TableHead>
                <TableHead className="text-cream/60">{t("adminQuotes.headerTotal")}</TableHead>
                <TableHead className="text-cream/60">{t("adminQuotes.headerStatus")}</TableHead>
                <TableHead className="text-cream/60">{t("adminQuotes.headerActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote: any) => {
                const statusInfo = STATUS_BADGES[quote.status] || STATUS_BADGES.en_attente;
                return (
                  <TableRow key={quote.id} className="border-cream/10 hover:bg-cream/5">
                    <TableCell className="text-cream/70 text-sm">
                      {new {t("adminQuotes.headerDate")}(quote.created_at).toLocale{t("adminQuotes.headerDate")}String("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-cream font-medium text-sm">{quote.client_name}</p>
                        {quote.company_name && (
                          <p className="text-cream/50 text-xs flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {quote.company_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-cream text-sm">{quote.product_name}</TableCell>
                    <TableCell className="text-cream/70 text-sm">
                      {PACKAGING_LABELS[quote.packaging_type] || quote.packaging_type}
                    </TableCell>
                    <TableCell className="text-primary font-semibold text-sm">
                      {formatPrice(quote.total_price)} FCFA
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.className} text-xs`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedQuote(quote);
                          setAdminNotes(quote.admin_notes || "");
                        }}
                        className="text-cream/60 hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Quote Detail Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="bg-noir border-cream/10 text-cream max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("adminQuotes.dialog.title")}
            </DialogTitle>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-4">
              {/* {t("adminQuotes.headerClient")} Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-cream/5">
                  <p className="text-xs text-cream/50">{t("adminQuotes.headerClient")}</p>
                  <p className="font-medium text-sm">{selectedQuote.client_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-cream/5">
                  <p className="text-xs text-cream/50 flex items-center gap-1"><Phone className="h-3 w-3" /> {t("adminQuotes.dialog.phone")}</p>
                  <a href={`tel:${selectedQuote.client_phone}`} className="font-medium text-sm text-primary">
                    {selectedQuote.client_phone}
                  </a>
                </div>
                <div className="p-3 rounded-lg bg-cream/5">
                  <p className="text-xs text-cream/50 flex items-center gap-1"><Mail className="h-3 w-3" /> {t("adminQuotes.dialog.email")}</p>
                  <a href={`mailto:${selectedQuote.client_email}`} className="font-medium text-sm text-primary">
                    {selectedQuote.client_email}
                  </a>
                </div>
                <div className="p-3 rounded-lg bg-cream/5">
                  <p className="text-xs text-cream/50 flex items-center gap-1"><MapPin className="h-3 w-3" /> {t("adminQuotes.dialog.city")}</p>
                  <p className="font-medium text-sm">{selectedQuote.city}</p>
                </div>
              </div>

              {selectedQuote.company_name && (
                <div className="p-3 rounded-lg bg-cream/5">
                  <p className="text-xs text-cream/50">{t("adminQuotes.dialog.company")}</p>
                  <p className="font-medium text-sm">{selectedQuote.company_name}</p>
                  {selectedQuote.niu && <p className="text-xs text-cream/50 mt-1">t("adminQuotes.dialog.niu", { niu: selectedQuote.niu })</p>}
                </div>
              )}

              {/* Product Info */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <p className="font-medium">{selectedQuote.product_name}</p>
                <p className="text-sm text-cream/60">
                  t("adminQuotes.dialog.productInfo", { packaging: PACKAGING_LABELS[selectedQuote.packaging_type], count: selectedQuote.quantity })
                </p>
                <p className="font-bold text-primary mt-1">
                  {formatPrice(selectedQuote.total_price)} FCFA
                </p>
              </div>

              {selectedQuote.message && (
                <div className="p-3 rounded-lg bg-cream/5">
                  <p className="text-xs text-cream/50 flex items-center gap-1 mb-1">
                    <{t("adminQuotes.dialog.message")}Square className="h-3 w-3" /> {t("adminQuotes.dialog.message")}
                  </p>
                  <p className="text-sm text-cream/80">{selectedQuote.message}</p>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <p className="text-sm text-cream/60 mb-1">{t("adminQuotes.dialog.adminNotes")}</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("adminQuotes.dialog.adminNotesPlaceholder")}
                  rows={2}
                  className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30 resize-none"
                />
              </div>

              {/* {t("adminQuotes.headerActions")} */}
              {selectedQuote.status === "en_attente" && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleStatusChange(selectedQuote.id, "traite")}
                    disabled={updateStatus.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <Check className="h-4 w-4" /> {t("adminQuotes.dialog.markTreated")}
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(selectedQuote.id, "refuse")}
                    disabled={updateStatus.isPending}
                    variant="outline"
                    className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
                  >
                    <X className="h-4 w-4" /> {t("adminQuotes.dialog.reject")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
