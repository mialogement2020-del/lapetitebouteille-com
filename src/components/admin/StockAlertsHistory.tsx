import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, XCircle, Mail, MailX, Package, RefreshCw, Filter, Download } from "lucide-react";
import { convertToCSV, downloadCSV, formatDateForCSV } from "@/lib/csvExport";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockAlert {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  stock_quantity: number;
  threshold: number;
  alert_type: string;
  sent_at: string;
  email_sent_to: string | null;
  email_status: string;
}

type AlertTypeFilter = "all" | "out_of_stock" | "low_stock";
type PeriodFilter = "all" | "today" | "week" | "month" | "3months";

export function StockAlertsHistory() {
  const [limit, setLimit] = useState(20);
  const [alertTypeFilter, setAlertTypeFilter] = useState<AlertTypeFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  const getDateFromPeriod = (period: PeriodFilter): Date | null => {
    const now = new Date();
    switch (period) {
      case "today":
        return subDays(now, 1);
      case "week":
        return subWeeks(now, 1);
      case "month":
        return subMonths(now, 1);
      case "3months":
        return subMonths(now, 3);
      default:
        return null;
    }
  };

  const { data: alerts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["stock-alerts-history", limit, alertTypeFilter, periodFilter],
    queryFn: async () => {
      let query = supabase
        .from("stock_alerts_history")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(limit);

      // Apply alert type filter
      if (alertTypeFilter !== "all") {
        query = query.eq("alert_type", alertTypeFilter);
      }

      // Apply period filter
      const dateFrom = getDateFromPeriod(periodFilter);
      if (dateFrom) {
        query = query.gte("sent_at", dateFrom.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StockAlert[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stock-alerts-stats", periodFilter],
    queryFn: async () => {
      let query = supabase
        .from("stock_alerts_history")
        .select("alert_type, email_status, sent_at");

      // Apply period filter to stats too
      const dateFrom = getDateFromPeriod(periodFilter);
      if (dateFrom) {
        query = query.gte("sent_at", dateFrom.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalAlerts = data?.length || 0;
      const outOfStock = data?.filter(a => a.alert_type === "out_of_stock").length || 0;
      const lowStock = data?.filter(a => a.alert_type === "low_stock").length || 0;
      const failed = data?.filter(a => a.email_status === "failed").length || 0;

      return { totalAlerts, outOfStock, lowStock, failed };
    },
  });

  const resetFilters = () => {
    setAlertTypeFilter("all");
    setPeriodFilter("all");
  };

  const hasActiveFilters = alertTypeFilter !== "all" || periodFilter !== "all";

  const handleExportCSV = () => {
    if (!alerts || alerts.length === 0) {
      toast({
        title: "Export impossible",
        description: "Aucune alerte à exporter",
        variant: "destructive",
      });
      return;
    }

    const columns = [
      { key: "sent_at" as const, header: "Date" },
      { key: "product_name" as const, header: "Produit" },
      { key: "product_sku" as const, header: "SKU" },
      { key: "alert_type" as const, header: "Type" },
      { key: "stock_quantity" as const, header: "Stock" },
      { key: "threshold" as const, header: "Seuil" },
      { key: "email_sent_to" as const, header: "Email" },
      { key: "email_status" as const, header: "Statut" },
    ];

    // Format data for export
    const exportData = alerts.map((alert) => ({
      ...alert,
      sent_at: formatDateForCSV(alert.sent_at),
      alert_type: alert.alert_type === "out_of_stock" ? "Rupture de stock" : "Stock faible",
      email_status: alert.email_status === "sent" ? "Envoyé" : "Échec",
    }));

    const csv = convertToCSV(exportData, columns);
    const filename = `alertes-stock-${format(new Date(), "yyyy-MM-dd")}.csv`;
    downloadCSV(csv, filename);

    toast({
      title: "Export réussi",
      description: `${alerts.length} alerte(s) exportée(s) en CSV`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 bg-cream/10" />
          ))}
        </div>
        <Skeleton className="h-96 bg-cream/10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-cream/60">Total alertes</CardDescription>
            <CardTitle className="text-2xl text-cream">{stats?.totalAlerts || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-noir/50 border-destructive/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-cream/60 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Ruptures
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats?.outOfStock || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-noir/50 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-cream/60 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Stocks faibles
            </CardDescription>
            <CardTitle className="text-2xl text-orange-500">{stats?.lowStock || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-noir/50 border-red-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-cream/60 flex items-center gap-1">
              <MailX className="h-3 w-3" /> Échecs envoi
            </CardDescription>
            <CardTitle className="text-2xl text-red-500">{stats?.failed || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* History Table */}
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-cream">Historique des alertes</CardTitle>
            <CardDescription className="text-cream/60">
              Toutes les alertes de stock envoyées par email
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Alert Type Filter */}
            <Select value={alertTypeFilter} onValueChange={(v) => setAlertTypeFilter(v as AlertTypeFilter)}>
              <SelectTrigger className="w-[160px] bg-noir border-gold/30 text-cream">
                <SelectValue placeholder="Type d'alerte" />
              </SelectTrigger>
              <SelectContent className="bg-noir border-gold/30">
                <SelectItem value="all" className="text-cream hover:bg-gold/10">Tous les types</SelectItem>
                <SelectItem value="out_of_stock" className="text-cream hover:bg-gold/10">Rupture de stock</SelectItem>
                <SelectItem value="low_stock" className="text-cream hover:bg-gold/10">Stock faible</SelectItem>
              </SelectContent>
            </Select>

            {/* Period Filter */}
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-[160px] bg-noir border-gold/30 text-cream">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent className="bg-noir border-gold/30">
                <SelectItem value="all" className="text-cream hover:bg-gold/10">Toute période</SelectItem>
                <SelectItem value="today" className="text-cream hover:bg-gold/10">Aujourd'hui</SelectItem>
                <SelectItem value="week" className="text-cream hover:bg-gold/10">7 derniers jours</SelectItem>
                <SelectItem value="month" className="text-cream hover:bg-gold/10">30 derniers jours</SelectItem>
                <SelectItem value="3months" className="text-cream hover:bg-gold/10">3 derniers mois</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-cream/60 hover:text-cream hover:bg-gold/10"
              >
                <Filter className="h-4 w-4 mr-1" />
                Réinitialiser
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!alerts || alerts.length === 0}
              className="border-gold/30 text-cream hover:bg-gold/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="border-gold/30 text-cream hover:bg-gold/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gold/20 hover:bg-transparent">
                      <TableHead className="text-cream/70">Date</TableHead>
                      <TableHead className="text-cream/70">Produit</TableHead>
                      <TableHead className="text-cream/70">Type</TableHead>
                      <TableHead className="text-cream/70 text-center">Stock</TableHead>
                      <TableHead className="text-cream/70 text-center">Seuil</TableHead>
                      <TableHead className="text-cream/70">Email</TableHead>
                      <TableHead className="text-cream/70">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id} className="border-gold/10 hover:bg-gold/5">
                        <TableCell className="text-cream/80 text-sm">
                          {format(new Date(alert.sent_at), "dd MMM yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-cream font-medium">{alert.product_name}</span>
                            {alert.product_sku && (
                              <span className="text-cream/50 text-xs">SKU: {alert.product_sku}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {alert.alert_type === "out_of_stock" ? (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rupture
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-orange-500/50 text-orange-400 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Stock faible
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${alert.stock_quantity === 0 ? "text-destructive" : "text-orange-400"}`}>
                            {alert.stock_quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-cream/60">
                          {alert.threshold}
                        </TableCell>
                        <TableCell className="text-cream/60 text-sm max-w-[150px] truncate">
                          {alert.email_sent_to}
                        </TableCell>
                        <TableCell>
                          {alert.email_status === "sent" ? (
                            <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              Envoyé
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <MailX className="h-3 w-3 mr-1" />
                              Échec
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              {alerts.length >= limit && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLimit(prev => prev + 20)}
                    className="border-gold/30 text-cream hover:bg-gold/10"
                  >
                    Charger plus
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-cream/50">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune alerte de stock {hasActiveFilters ? "pour ces critères" : "envoyée pour le moment"}</p>
              {hasActiveFilters ? (
                <Button
                  variant="link"
                  onClick={resetFilters}
                  className="text-gold hover:text-gold/80 mt-2"
                >
                  Réinitialiser les filtres
                </Button>
              ) : (
                <p className="text-sm mt-2">
                  Les alertes sont envoyées automatiquement quand le stock d'un produit passe sous le seuil configuré
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
