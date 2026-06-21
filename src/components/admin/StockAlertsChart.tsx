import { useState, useEffect } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Bar, BarChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface AlertData {
  date: string;
  sent_at: string;
  alert_type: string;
}

interface ChartData {
  date: string;
  displayDate: string;
  low_stock: number;
  out_of_stock: number;
  total: number;
}

type PeriodOption = "7" | "14" | "30" | "90";

export function StockAlertsChart() {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<PeriodOption>("30");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    trend: 0, // percentage change vs previous period
  });

  const currentLocale = i18n.language === "fr" ? fr : enUS;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const days = parseInt(period);
      const endDate = new Date();
      const startDate = subDays(endDate, days);
      const previousStartDate = subDays(startDate, days);

      try {
        // Fetch current period data
        const { data: currentData, error } = await supabase
          .from("stock_alerts_history")
          .select("sent_at, alert_type")
          .gte("sent_at", startDate.toISOString())
          .lte("sent_at", endDate.toISOString())
          .order("sent_at", { ascending: true });

        if (error) throw error;

        // Fetch previous period data for trend calculation
        const { data: previousData } = await supabase
          .from("stock_alerts_history")
          .select("id")
          .gte("sent_at", previousStartDate.toISOString())
          .lt("sent_at", startDate.toISOString());

        // Generate all dates in the period
        const allDates = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Initialize data for each day
        const dateMap = new Map<string, { low_stock: number; out_of_stock: number }>();
        allDates.forEach((date) => {
          const key = format(date, "yyyy-MM-dd");
          dateMap.set(key, { low_stock: 0, out_of_stock: 0 });
        });

        // Populate with actual data
        let lowStockCount = 0;
        let outOfStockCount = 0;

        (currentData || []).forEach((alert: AlertData) => {
          const dateKey = format(new Date(alert.sent_at), "yyyy-MM-dd");
          const existing = dateMap.get(dateKey);
          if (existing) {
            if (alert.alert_type === "low_stock") {
              existing.low_stock++;
              lowStockCount++;
            } else if (alert.alert_type === "out_of_stock") {
              existing.out_of_stock++;
              outOfStockCount++;
            }
            dateMap.set(dateKey, existing);
          }
        });

        // Convert to chart data format
        const formattedData: ChartData[] = allDates.map((date) => {
          const key = format(date, "yyyy-MM-dd");
          const values = dateMap.get(key) || { low_stock: 0, out_of_stock: 0 };
          return {
            date: key,
            displayDate: format(date, "dd MMM", { locale: currentLocale }),
            low_stock: values.low_stock,
            out_of_stock: values.out_of_stock,
            total: values.low_stock + values.out_of_stock,
          };
        });

        // Calculate trend
        const currentTotal = lowStockCount + outOfStockCount;
        const previousTotal = previousData?.length || 0;
        const trend = previousTotal === 0 
          ? (currentTotal > 0 ? 100 : 0)
          : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);

        setChartData(formattedData);
        setStats({
          totalAlerts: currentTotal,
          lowStockCount,
          outOfStockCount,
          trend,
        });
      } catch (err) {
        console.error("Error fetching stock alerts data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period, currentLocale]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-noir border border-gold/30 rounded-lg p-3 shadow-lg">
          <p className="text-cream font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-cream/70">
                {entry.name === "low_stock" ? t("adminStock.lowStock") : t("adminStock.outOfStock")}:
              </span>
              <span className="text-cream font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-cream flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-warning" />
            {t("adminStock.evolution")}
          </CardTitle>
          <CardDescription className="text-cream/60">
            {t("adminStock.history")} ({period} {t("adminStock.days")})
          </CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
          <SelectTrigger className="w-[140px] border-gold/30 bg-noir text-cream">
            <Calendar className="h-4 w-4 mr-2 text-cream/60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-noir border-gold/30">
            <SelectItem value="7">7 {t("adminStock.days")}</SelectItem>
            <SelectItem value="14">14 {t("adminStock.days")}</SelectItem>
            <SelectItem value="30">30 {t("adminStock.days")}</SelectItem>
            <SelectItem value="90">90 {t("adminStock.days")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-warning/5 rounded-lg p-4 border border-warning/20">
                <div className="flex items-center gap-2 text-cream/60 text-sm mb-1">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {t("adminStock.lowStock")}
                </div>
                <p className="text-2xl font-bold text-warning">
                  {stats.lowStockCount}
                </p>
              </div>
              <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/20">
                <div className="flex items-center gap-2 text-cream/60 text-sm mb-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  {t("adminStock.outOfStock")}
                </div>
                <p className="text-2xl font-bold text-destructive">
                  {stats.outOfStockCount}
                </p>
              </div>
              <div className="bg-cream/5 rounded-lg p-4 border border-gold/10">
                <div className="flex items-center gap-2 text-cream/60 text-sm mb-1">
                  {stats.trend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-warning" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-success" />
                  )}
                  {t("adminStock.trend")}
                </div>
                <p className={`text-2xl font-bold ${
                  stats.trend >= 0 ? "text-warning" : "text-success"
                }`}>
                  {stats.trend >= 0 ? "+" : ""}{stats.trend}%
                </p>
                <p className="text-xs text-cream/40">{t("adminStock.vsPreviousPeriod")}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[300px]">
              {stats.totalAlerts === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-cream/40">
                  <AlertTriangle className="h-12 w-12 mb-3 opacity-30" />
                  <p>{t("adminStock.noAlertsInPeriod")}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                      interval={parseInt(period) > 14 ? Math.floor(parseInt(period) / 7) : 0}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      formatter={(value) => (
                        <span className="text-cream/70 text-sm">
                          {value === "low_stock" ? t("adminStock.lowStock") : t("adminStock.outOfStock")}
                        </span>
                      )}
                    />
                    <Bar 
                      dataKey="low_stock" 
                      stackId="a"
                      fill="#f97316" 
                      radius={[0, 0, 0, 0]}
                      name="low_stock"
                    />
                    <Bar 
                      dataKey="out_of_stock" 
                      stackId="a"
                      fill="#ef4444" 
                      radius={[4, 4, 0, 0]}
                      name="out_of_stock"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
