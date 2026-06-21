import { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Calendar,
  Trophy,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportReportButton } from "./ExportReportButton";
import { useTranslation } from "react-i18next";
import type { AdminOrder, AdminProduct } from "@/hooks/useAdmin";

interface PerformanceChartsProps {
  orders: AdminOrder[];
  products: AdminProduct[];
}

type PeriodType = "7days" | "30days" | "3months";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function PerformanceCharts({ orders, products }: PerformanceChartsProps) {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<PeriodType>("7days");
  const chartsContainerRef = useRef<HTMLDivElement>(null);

  const periodLabels: Record<PeriodType, string> = {
    "7days": t("adminPerf.period7"),
    "30days": t("adminPerf.period30"),
    "3months": t("adminPerf.period3m"),
  };

  // Calculate sales data by period
  const salesData = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    
    if (period === "7days") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "30days") {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate.setMonth(now.getMonth() - 3);
    }

    // Filter orders by period and exclude cancelled
    const filteredOrders = orders.filter(order => {
      if (!order.created_at || order.status === "cancelled") return false;
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= now;
    });

    // Group by day or week depending on period
    const groupedData: Record<string, { date: string; revenue: number; orders: number }> = {};

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.created_at!);
      let key: string;
      let label: string;

      const locale = i18n.language === "en" ? "en-US" : "fr-FR";
      if (period === "3months") {
        // Group by week
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay());
        key = weekStart.toISOString().split("T")[0];
        label = t("adminPerf.weekPrefix", { date: weekStart.toLocaleDateString(locale, { day: "2-digit", month: "short" }) });
      } else {
        // Group by day
        key = orderDate.toISOString().split("T")[0];
        label = orderDate.toLocaleDateString(locale, { 
          weekday: period === "7days" ? "short" : undefined,
          day: "2-digit", 
          month: "short" 
        });
      }

      if (!groupedData[key]) {
        groupedData[key] = { date: label, revenue: 0, orders: 0 };
      }
      groupedData[key].revenue += order.total;
      groupedData[key].orders += 1;
    });

    // Sort by date and return array
    return Object.entries(groupedData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => data);
  }, [orders, period]);

  // Calculate popular products
  const popularProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

    // Only count non-cancelled orders
    orders
      .filter(order => order.status !== "cancelled")
      .forEach(order => {
        order.items.forEach(item => {
          const productId = item.product_name; // Using name as key since product_id might be null
          if (!productSales[productId]) {
            productSales[productId] = { 
              name: item.product_name.length > 20 
                ? item.product_name.substring(0, 20) + "..." 
                : item.product_name, 
              quantity: 0, 
              revenue: 0 
            };
          }
          productSales[productId].quantity += item.quantity;
          productSales[productId].revenue += item.total_price;
        });
      });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  // Calculate order status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach(order => {
      if (order.status && statusCounts[order.status] !== undefined) {
        statusCounts[order.status]++;
      }
    });

    const statusLabels: Record<string, string> = {
      pending: t("adminPerf.statusPending"),
      confirmed: t("adminPerf.statusConfirmed"),
      processing: t("adminPerf.statusProcessing"),
      shipped: t("adminPerf.statusShipped"),
      delivered: t("adminPerf.statusDelivered"),
      cancelled: t("adminPerf.statusCancelled"),
    };

    return Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
      }));
  }, [orders]);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "fr-FR", { notation: "compact" }).format(value) + " FCFA";
  };

  // Calculate stats for PDF export
  const statsForExport = useMemo(() => {
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach(order => {
      if (order.status && statusCounts[order.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[order.status as keyof typeof statusCounts]++;
      }
    });

    const totalRevenue = orders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0);

    const lowStockProducts = products.filter(
      p => (p.stock_quantity ?? 0) <= 5
    ).length;

    return {
      totalOrders: orders.length,
      pendingOrders: statusCounts.pending,
      confirmedOrders: statusCounts.confirmed,
      processingOrders: statusCounts.processing,
      shippedOrders: statusCounts.shipped,
      deliveredOrders: statusCounts.delivered,
      cancelledOrders: statusCounts.cancelled,
      totalRevenue,
      totalProducts: products.length,
      activeProducts: products.filter(p => p.is_active).length,
      lowStockProducts,
    };
  }, [orders, products]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-noir border border-gold/30 rounded-lg p-3 shadow-lg">
          <p className="text-cream font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === t("adminPerf.revenue") ? formatPrice(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-noir border border-gold/30 rounded-lg p-3 shadow-lg">
          <p className="text-cream font-medium">{payload[0].name}</p>
          <p className="text-sm text-cream/70">{t("adminPerf.ordersCount", { count: payload[0].value })}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-6"
    >
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-display font-semibold text-cream">
            {t("adminPerf.title")}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <ExportReportButton
            stats={statsForExport}
            salesData={salesData}
            popularProducts={popularProducts}
            statusDistribution={statusDistribution}
            periodLabel={periodLabels[period]}
            chartsContainerRef={chartsContainerRef}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gold/20 text-cream hover:bg-cream/10">
                <Calendar className="h-4 w-4 mr-2" />
                {periodLabels[period]}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-noir border-gold/20">
              <DropdownMenuItem 
                className="text-cream hover:bg-cream/10 cursor-pointer"
                onClick={() => setPeriod("7days")}
              >
                {t("adminPerf.period7")}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-cream hover:bg-cream/10 cursor-pointer"
                onClick={() => setPeriod("30days")}
              >
                {t("adminPerf.period30")}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-cream hover:bg-cream/10 cursor-pointer"
                onClick={() => setPeriod("3months")}
              >
                {t("adminPerf.period3m")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Charts Container for PDF export */}
      <div ref={chartsContainerRef} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream text-lg font-medium">
              {t("adminPerf.salesEvolution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--gold) / 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--cream) / 0.5)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="hsl(var(--cream) / 0.5)"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "fr-FR", { notation: "compact" }).format(value)}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--cream) / 0.5)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: "10px" }}
                    formatter={(value) => <span className="text-cream/70 text-sm">{value}</span>}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    name={t("adminPerf.revenue")}
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="orders" 
                    name={t("adminPerf.orders")}
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-cream/40">
                {t("adminPerf.noDataPeriod")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream text-lg font-medium">
              {t("adminPerf.statusDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend 
                    formatter={(value) => <span className="text-cream/70 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-cream/40">
                {t("adminPerf.noOrders")}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Popular Products */}
        <Card className="bg-noir/50 border-gold/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-cream text-lg font-medium flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {t("adminPerf.popularProducts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {popularProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={popularProducts} 
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--gold) / 0.1)" horizontal={false} />
                <XAxis 
                  type="number"
                  stroke="hsl(var(--cream) / 0.5)"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "fr-FR", { notation: "compact" }).format(value)}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--cream) / 0.5)"
                  fontSize={12}
                  tickLine={false}
                  width={150}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-cream/70 text-sm">{value}</span>}
                />
                <Bar 
                  dataKey="revenue" 
                  name={t("adminPerf.revenue")}
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
                <Bar 
                  dataKey="quantity" 
                  name={t("adminPerf.quantity")}
                  fill="hsl(var(--chart-2))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-cream/40">
              {t("adminPerf.noSales")}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </motion.div>
  );
}
