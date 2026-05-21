import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cohort {
  cohort_month: string;
  cohort_size: number;
  retained_m1: number;
  retained_m3: number;
  retained_m6: number;
  total_revenue: number;
}

export interface CustomerLTV {
  customer_key: string;
  customer_label: string;
  user_id: string | null;
  order_count: number;
  total_spent: number;
  avg_order_value: number;
  first_order_at: string;
  last_order_at: string;
  days_active: number;
}

export interface MLMAttributionRow {
  level: number;
  ambassador_count: number;
  commission_count: number;
  total_commissions: number;
  total_attributed_revenue: number;
  avg_commission: number;
}

export interface RevenueBreakdownRow {
  day: string;
  total_revenue: number;
  order_count: number;
  referral_revenue: number;
  marketplace_revenue: number;
  direct_revenue: number;
}

export interface TopAmbassador {
  ambassador_id: string;
  ambassador_name: string;
  ambassador_email: string;
  referral_count: number;
  total_commissions: number;
  attributed_revenue: number;
  conversion_rate: number;
}

export function useBusinessAnalytics(daysWindow: number = 90) {
  const cohortsQuery = useQuery({
    queryKey: ["analytics-cohorts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_customer_cohorts" as any, {
        _months_back: 12,
      });
      if (error) throw error;
      return (data ?? []) as unknown as Cohort[];
    },
  });

  const ltvQuery = useQuery({
    queryKey: ["analytics-ltv"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_customer_ltv" as any, {
        _limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as unknown as CustomerLTV[];
    },
  });

  const attributionQuery = useQuery({
    queryKey: ["analytics-mlm-attribution", daysWindow],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_mlm_attribution" as any, {
        _days: daysWindow,
      });
      if (error) throw error;
      return (data ?? []) as unknown as MLMAttributionRow[];
    },
  });

  const revenueQuery = useQuery({
    queryKey: ["analytics-revenue-breakdown", daysWindow],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_revenue_breakdown" as any, {
        _days: daysWindow,
      });
      if (error) throw error;
      return (data ?? []) as unknown as RevenueBreakdownRow[];
    },
  });

  const topAmbassadorsQuery = useQuery({
    queryKey: ["analytics-top-ambassadors", daysWindow],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_top_ambassadors" as any, {
        _days: daysWindow,
        _limit: 20,
      });
      if (error) throw error;
      return (data ?? []) as unknown as TopAmbassador[];
    },
  });

  return {
    cohorts: cohortsQuery.data ?? [],
    cohortsLoading: cohortsQuery.isLoading,
    ltv: ltvQuery.data ?? [],
    ltvLoading: ltvQuery.isLoading,
    attribution: attributionQuery.data ?? [],
    attributionLoading: attributionQuery.isLoading,
    revenue: revenueQuery.data ?? [],
    revenueLoading: revenueQuery.isLoading,
    topAmbassadors: topAmbassadorsQuery.data ?? [],
    topAmbassadorsLoading: topAmbassadorsQuery.isLoading,
  };
}