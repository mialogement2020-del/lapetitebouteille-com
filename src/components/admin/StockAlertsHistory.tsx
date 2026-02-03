import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, XCircle, Mail, MailX, Package, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

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

export function StockAlertsHistory() {
  const [limit, setLimit] = useState(20);

  const { data: alerts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["stock-alerts-history", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_alerts_history")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as StockAlert[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stock-alerts-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_alerts_history")
        .select("alert_type, email_status");

      if (error) throw error;

      const totalAlerts = data?.length || 0;
      const outOfStock = data?.filter(a => a.alert_type === "out_of_stock").length || 0;
      const lowStock = data?.filter(a => a.alert_type === "low_stock").length || 0;
      const failed = data?.filter(a => a.email_status === "failed").length || 0;

      return { totalAlerts, outOfStock, lowStock, failed };
    },
  });

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-cream">Historique des alertes</CardTitle>
            <CardDescription className="text-cream/60">
              Toutes les alertes de stock envoyées par email
            </CardDescription>
          </div>
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
              <p>Aucune alerte de stock envoyée pour le moment</p>
              <p className="text-sm mt-2">
                Les alertes sont envoyées automatiquement quand le stock d'un produit passe sous le seuil configuré
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
