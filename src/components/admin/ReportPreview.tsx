import { useState, useEffect } from "react";
import { AlertTriangle, Package, TrendingUp, TrendingDown, Clock, RefreshCw, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface ProductStock {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  status: "out_of_stock" | "low_stock" | "critical" | "normal";
  price: number;
  dailySalesRate: number;
  daysUntilStockout: number | null;
}

interface ReportStats {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  criticalStock: number;
  totalAlertsThisWeek: number;
  previousWeekAlerts: number;
  trendPercentage: number;
}

export function ReportPreview() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [products, setProducts] = useState<ProductStock[]>([]);

  const fetchPreviewData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, sku, stock_quantity, low_stock_threshold, price, is_active")
        .eq("is_active", true)
        .order("stock_quantity", { ascending: true });

      if (productsError) throw productsError;

      // Fetch sales data for predictions
      const { data: salesData } = await supabase
        .from("order_items")
        .select(`
          product_id,
          quantity,
          created_at
        `)
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Calculate sales by product
      const salesByProduct: Record<string, { last30Days: number; last7Days: number }> = {};
      (salesData || []).forEach((item: any) => {
        const productId = item.product_id;
        if (!productId) return;

        const itemDate = new Date(item.created_at);
        if (!salesByProduct[productId]) {
          salesByProduct[productId] = { last30Days: 0, last7Days: 0 };
        }
        salesByProduct[productId].last30Days += item.quantity;
        if (itemDate >= sevenDaysAgo) {
          salesByProduct[productId].last7Days += item.quantity;
        }
      });

      // Fetch alert history
      const { data: currentWeekAlerts } = await supabase
        .from("stock_alerts_history")
        .select("id")
        .gte("sent_at", sevenDaysAgo.toISOString());

      const { data: previousWeekAlerts } = await supabase
        .from("stock_alerts_history")
        .select("id")
        .gte("sent_at", fourteenDaysAgo.toISOString())
        .lt("sent_at", sevenDaysAgo.toISOString());

      // Calculate stats
      const outOfStockProducts = productsData?.filter(p => (p.stock_quantity ?? 0) === 0) || [];
      const lowStockProducts = productsData?.filter(p => {
        const stock = p.stock_quantity ?? 0;
        const threshold = p.low_stock_threshold ?? 5;
        return stock > 0 && stock <= threshold;
      }) || [];
      const criticalStockProducts = productsData?.filter(p => {
        const stock = p.stock_quantity ?? 0;
        const threshold = p.low_stock_threshold ?? 5;
        return stock > threshold && stock <= threshold * 2;
      }) || [];

      const currentAlerts = currentWeekAlerts?.length || 0;
      const prevAlerts = previousWeekAlerts?.length || 0;
      const trendPercentage = prevAlerts > 0 
        ? Math.round(((currentAlerts - prevAlerts) / prevAlerts) * 100)
        : (currentAlerts > 0 ? 100 : 0);

      setStats({
        totalProducts: productsData?.length || 0,
        outOfStock: outOfStockProducts.length,
        lowStock: lowStockProducts.length,
        criticalStock: criticalStockProducts.length,
        totalAlertsThisWeek: currentAlerts,
        previousWeekAlerts: prevAlerts,
        trendPercentage
      });

      // Build product list with predictions
      const productsList: ProductStock[] = (productsData || [])
        .filter(p => (p.stock_quantity ?? 0) <= 10)
        .slice(0, 15)
        .map(p => {
          const stock = p.stock_quantity ?? 0;
          const threshold = p.low_stock_threshold ?? 5;
          const sales = salesByProduct[p.id] || { last30Days: 0, last7Days: 0 };
          
          const avgDaily30 = sales.last30Days / 30;
          const avgDaily7 = sales.last7Days / 7;
          const dailySalesRate = sales.last7Days > 0 
            ? (avgDaily7 * 2 + avgDaily30) / 3 
            : avgDaily30;

          const daysUntilStockout = dailySalesRate > 0 
            ? Math.floor(stock / dailySalesRate) 
            : null;

          let status: ProductStock["status"] = "normal";
          if (stock === 0) {
            status = "out_of_stock";
          } else if (stock <= threshold) {
            status = "low_stock";
          } else if (stock <= threshold * 2) {
            status = "critical";
          }

          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            stock_quantity: stock,
            low_stock_threshold: threshold,
            status,
            price: p.price,
            dailySalesRate: Math.round(dailySalesRate * 100) / 100,
            daysUntilStockout
          };
        });

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching preview data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreviewData();
    }
  }, [isOpen]);

  const getStatusBadge = (status: ProductStock["status"]) => {
    switch (status) {
      case "out_of_stock":
        return <Badge variant="destructive" className="text-xs">{t("adminReports.badgeOutOfStock")}</Badge>;
      case "low_stock":
        return <Badge className="bg-orange-500 text-xs">{t("adminReports.badgeLowStock")}</Badge>;
      case "critical":
        return <Badge className="bg-yellow-500 text-noir text-xs">{t("adminReports.badgeCritical")}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{t("adminReports.badgeOk")}</Badge>;
    }
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "fr-FR").format(price) + " FCFA";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-gold/30 hover:bg-cream/5 text-cream"
        >
          <Eye className="h-4 w-4 mr-2" />
          {t("adminReports.preview")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-noir border-gold/30">
        <DialogHeader>
          <DialogTitle className="text-cream flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("adminReports.previewTitle")}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            {t("adminReports.nextReportPreview")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-cream/60">{t("adminReports.loadingData")}</span>
          </div>
        ) : stats ? (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-cream/5 border border-destructive/30 rounded-lg p-4 text-center"
                >
                  <p className="text-3xl font-bold text-destructive">{stats.outOfStock}</p>
                  <p className="text-xs text-cream/60 uppercase mt-1">{t("adminReports.outOfStock")}</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-cream/5 border border-orange-500/30 rounded-lg p-4 text-center"
                >
                  <p className="text-3xl font-bold text-orange-500">{stats.lowStock}</p>
                  <p className="text-xs text-cream/60 uppercase mt-1">{t("adminReports.lowStockLabel")}</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-cream/5 border border-yellow-500/30 rounded-lg p-4 text-center"
                >
                  <p className="text-3xl font-bold text-yellow-500">{stats.criticalStock}</p>
                  <p className="text-xs text-cream/60 uppercase mt-1">{t("adminReports.critical")}</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`bg-cream/5 border rounded-lg p-4 text-center ${
                    stats.trendPercentage > 0 ? "border-destructive/30" : "border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {stats.trendPercentage > 0 ? (
                      <TrendingUp className="h-5 w-5 text-destructive" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-primary" />
                    )}
                    <p className={`text-2xl font-bold ${
                      stats.trendPercentage > 0 ? "text-destructive" : "text-primary"
                    }`}>
                      {stats.trendPercentage > 0 ? "+" : ""}{stats.trendPercentage}%
                    </p>
                  </div>
                  <p className="text-xs text-cream/60 uppercase mt-1">{t("adminReports.trend")}</p>
                </motion.div>
              </div>

              {/* Alert summary */}
              <div className="bg-cream/5 border border-gold/10 rounded-lg p-4">
                <p className="text-sm text-cream/70">
                  {t("adminReports.alertsThisWeek", { count: stats.totalAlertsThisWeek })} {t("adminReports.vsPrevWeek", { count: stats.previousWeekAlerts })}
                </p>
              </div>

              {/* Products Table */}
              {products.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-cream flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    {t("adminReports.needAttention", { count: products.length })}
                  </h3>
                  
                  <div className="border border-gold/20 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-cream/5">
                        <tr>
                          <th className="text-left text-xs font-medium text-cream/60 uppercase px-4 py-3">{t("adminReports.colProduct")}</th>
                          <th className="text-center text-xs font-medium text-cream/60 uppercase px-2 py-3">{t("adminReports.colStock")}</th>
                          <th className="text-center text-xs font-medium text-cream/60 uppercase px-2 py-3 hidden md:table-cell">{t("adminReports.colSalesDay")}</th>
                          <th className="text-center text-xs font-medium text-cream/60 uppercase px-2 py-3 hidden md:table-cell">{t("adminReports.colDaysLeft")}</th>
                          <th className="text-right text-xs font-medium text-cream/60 uppercase px-4 py-3">{t("adminReports.colStatus")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product, index) => (
                          <motion.tr
                            key={product.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`border-t border-gold/10 ${index % 2 === 0 ? "bg-noir" : "bg-cream/5"}`}
                          >
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-cream truncate max-w-[200px]">
                                {product.name}
                              </p>
                              {product.sku && (
                                <p className="text-xs text-cream/50">SKU: {product.sku}</p>
                              )}
                            </td>
                            <td className="text-center px-2 py-3">
                              <span className={`font-bold text-lg ${
                                product.stock_quantity === 0 ? "text-destructive" :
                                product.stock_quantity <= 5 ? "text-orange-500" : "text-yellow-500"
                              }`}>
                                {product.stock_quantity}
                              </span>
                            </td>
                            <td className="text-center px-2 py-3 text-sm text-cream/70 hidden md:table-cell">
                              {product.dailySalesRate > 0 ? product.dailySalesRate.toFixed(1) : "-"}
                            </td>
                            <td className="text-center px-2 py-3 hidden md:table-cell">
                              <span className={`text-sm ${
                                product.daysUntilStockout !== null && product.daysUntilStockout <= 7 
                                  ? "text-destructive font-bold" 
                                  : "text-cream/70"
                              }`}>
                                {product.daysUntilStockout !== null 
                                  ? (product.daysUntilStockout === 0 ? t("adminReports.exhausted") : t("adminReports.daysShort", { n: product.daysUntilStockout }))
                                  : "-"
                                }
                              </span>
                            </td>
                            <td className="text-right px-4 py-3">
                              {getStatusBadge(product.status)}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 text-center">
                  <p className="text-4xl mb-2">✓</p>
                  <p className="text-cream font-medium">{t("adminReports.stocksOk")}</p>
                  <p className="text-sm text-cream/60 mt-1">{t("adminReports.noAttentionNeeded")}</p>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">💡 {t("adminReports.recommendations")}</h4>
                <ul className="text-sm text-cream/70 space-y-1 list-disc list-inside">
                  {stats.outOfStock > 0 && (
                    <li>{t("adminReports.recoUrgent", { count: stats.outOfStock })}</li>
                  )}
                  {stats.lowStock > 0 && (
                    <li>{t("adminReports.recoLow", { count: stats.lowStock })}</li>
                  )}
                  {stats.trendPercentage > 30 && (
                    <li>{t("adminReports.recoTrend", { pct: stats.trendPercentage })}</li>
                  )}
                  {products.filter(p => p.daysUntilStockout !== null && p.daysUntilStockout <= 7 && p.daysUntilStockout > 0).length > 0 && (
                    <li>{t("adminReports.recoStockout", { count: products.filter(p => p.daysUntilStockout !== null && p.daysUntilStockout <= 7 && p.daysUntilStockout > 0).length })}</li>
                  )}
                  {stats.outOfStock === 0 && stats.lowStock === 0 && (
                    <li>{t("adminReports.recoExcellent")}</li>
                  )}
                </ul>
              </div>

              {/* Timestamp */}
              <div className="flex items-center justify-center gap-2 text-xs text-cream/50">
                <Clock className="h-3 w-3" />
                {t("adminReports.dataAt", { date: new Date().toLocaleDateString(i18n.language === "en" ? "en-US" : "fr-FR", { 
                  day: "numeric", 
                  month: "long", 
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                }) })}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-cream/60">
            {t("adminReports.loadDataError")}
          </div>
        )}

        {/* Refresh button */}
        <div className="flex justify-end pt-2 border-t border-gold/10">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPreviewData}
            disabled={isLoading}
            className="border-gold/30 hover:bg-cream/5 text-cream"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {t("adminReports.refresh")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
