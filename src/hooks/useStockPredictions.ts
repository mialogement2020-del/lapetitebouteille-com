import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AdminProduct } from "@/hooks/useAdmin";

export interface StockPrediction {
  product: AdminProduct;
  dailySalesRate: number;
  daysUntilStockout: number | null;
  predictedStockoutDate: Date | null;
  salesLast30Days: number;
  salesLast7Days: number;
  trend: "increasing" | "stable" | "decreasing";
  urgency: "critical" | "warning" | "moderate" | "safe";
}

interface SalesData {
  product_id: string;
  total_quantity: number;
  order_date: string;
}

export function useStockPredictions(products: AdminProduct[], enabled: boolean = true) {
  return useQuery({
    queryKey: ["stock-predictions", products.map(p => p.id).join(",")],
    queryFn: async (): Promise<StockPrediction[]> => {
      if (!products.length) return [];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch sales data for the last 30 days
      const { data: salesData, error } = await supabase
        .from("order_items")
        .select(`
          product_id,
          quantity,
          created_at,
          order:orders!inner(
            status,
            created_at
          )
        `)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .not("order.status", "eq", "cancelled");

      if (error) {
        console.error("Error fetching sales data:", error);
        throw error;
      }

      // Group sales by product
      const salesByProduct: Record<string, { last30Days: number; last7Days: number; dailyBreakdown: Record<string, number> }> = {};

      (salesData || []).forEach((item: any) => {
        const productId = item.product_id;
        if (!productId) return;

        const itemDate = new Date(item.created_at);
        const dateKey = itemDate.toISOString().split("T")[0];

        if (!salesByProduct[productId]) {
          salesByProduct[productId] = { last30Days: 0, last7Days: 0, dailyBreakdown: {} };
        }

        salesByProduct[productId].last30Days += item.quantity;
        salesByProduct[productId].dailyBreakdown[dateKey] = 
          (salesByProduct[productId].dailyBreakdown[dateKey] || 0) + item.quantity;

        if (itemDate >= sevenDaysAgo) {
          salesByProduct[productId].last7Days += item.quantity;
        }
      });

      // Calculate predictions for each product
      const predictions: StockPrediction[] = products
        .filter(p => p.is_active)
        .map((product) => {
          const sales = salesByProduct[product.id] || { last30Days: 0, last7Days: 0, dailyBreakdown: {} };
          const currentStock = product.stock_quantity ?? 0;

          // Calculate daily sales rate (weighted average: last 7 days weighted 2x)
          const avgDaily30 = sales.last30Days / 30;
          const avgDaily7 = sales.last7Days / 7;
          
          // Use weighted average if we have 7-day data, otherwise use 30-day
          const dailySalesRate = sales.last7Days > 0 
            ? (avgDaily7 * 2 + avgDaily30) / 3 
            : avgDaily30;

          // Calculate days until stockout
          let daysUntilStockout: number | null = null;
          let predictedStockoutDate: Date | null = null;

          if (dailySalesRate > 0) {
            daysUntilStockout = Math.floor(currentStock / dailySalesRate);
            predictedStockoutDate = new Date(now.getTime() + daysUntilStockout * 24 * 60 * 60 * 1000);
          } else if (currentStock === 0) {
            daysUntilStockout = 0;
            predictedStockoutDate = now;
          }

          // Determine trend
          let trend: StockPrediction["trend"] = "stable";
          if (sales.last7Days > 0 && sales.last30Days > 0) {
            const weeklyAvg = avgDaily7;
            const monthlyAvg = avgDaily30;
            const changePercent = ((weeklyAvg - monthlyAvg) / monthlyAvg) * 100;
            
            if (changePercent > 20) trend = "increasing";
            else if (changePercent < -20) trend = "decreasing";
          }

          // Determine urgency
          let urgency: StockPrediction["urgency"] = "safe";
          if (currentStock === 0) {
            urgency = "critical";
          } else if (daysUntilStockout !== null) {
            if (daysUntilStockout <= 3) urgency = "critical";
            else if (daysUntilStockout <= 7) urgency = "warning";
            else if (daysUntilStockout <= 14) urgency = "moderate";
          }

          return {
            product,
            dailySalesRate: Math.round(dailySalesRate * 100) / 100,
            daysUntilStockout,
            predictedStockoutDate,
            salesLast30Days: sales.last30Days,
            salesLast7Days: sales.last7Days,
            trend,
            urgency,
          };
        })
        // Sort by urgency and days until stockout
        .sort((a, b) => {
          const urgencyOrder = { critical: 0, warning: 1, moderate: 2, safe: 3 };
          if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
          }
          // Within same urgency, sort by days until stockout
          if (a.daysUntilStockout === null) return 1;
          if (b.daysUntilStockout === null) return -1;
          return a.daysUntilStockout - b.daysUntilStockout;
        });

      return predictions;
    },
    enabled: enabled && products.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
