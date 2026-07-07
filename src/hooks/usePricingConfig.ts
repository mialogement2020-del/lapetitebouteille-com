import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PointsTier {
  max: number | null; // upper bound (inclusive). null = infinity
  points: number;
}

export interface PricingConfig {
  id: string;
  is_active: boolean;
  global_markup_percent: number;
  ambassador_percent: number;
  platform_percent: number;
  points_tiers: PointsTier[];
}

export function usePricingConfig() {
  return useQuery<PricingConfig | null>({
    queryKey: ["pricing-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_config")
        .select("id,is_active,global_markup_percent,ambassador_percent,platform_percent,points_tiers")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        points_tiers: (data.points_tiers as unknown as PointsTier[]) || [],
      };
    },
  });
}

export function useUpdatePricingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<PricingConfig, "id" | "is_active">> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase
        .from("pricing_config")
        .update(rest as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-config"] });
      toast({ title: "Configuration enregistrée" });
    },
    onError: (e: Error) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });
}

/** Compute derived pricing from a purchase price */
export function computePricingBreakdown(
  purchasePrice: number,
  markupPercent: number,
  ambassadorPercent: number,
) {
  const salePrice = Math.round(purchasePrice * (1 + markupPercent / 100));
  const margin = salePrice - purchasePrice;
  const ambassadorEarning = Math.round((salePrice * ambassadorPercent) / 100);
  const platformEarning = margin - ambassadorEarning;
  return { salePrice, margin, ambassadorEarning, platformEarning };
}

/** Compute points earned for a given sale price using tiers */
export function computePointsForPrice(price: number, tiers: PointsTier[]): number {
  if (!tiers || tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => {
    const am = a.max ?? Number.POSITIVE_INFINITY;
    const bm = b.max ?? Number.POSITIVE_INFINITY;
    return am - bm;
  });
  for (const t of sorted) {
    const max = t.max ?? Number.POSITIVE_INFINITY;
    if (price <= max) return t.points;
  }
  return sorted[sorted.length - 1]?.points ?? 0;
}