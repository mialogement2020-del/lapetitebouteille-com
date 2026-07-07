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

/**
 * Compute the full pricing/points breakdown for a product.
 * - The "target sale price" is derived from purchase_price × (1 + markup) when a purchase
 *   price is set, so the ambassador reward stays anchored to the configured margin
 *   formula even if the admin later corrects the displayed price.
 * - Falls back to the displayed price when no purchase price is available.
 * - Points priority: product override → product tiers → category tiers → global tiers.
 */
export interface ProductPricingInput {
  price: number;
  purchase_price?: number | null;
  markup_percent_override?: number | null;
  points_override?: number | null;
  points_tiers_override?: PointsTier[] | null;
  category?: { points_tiers_override?: PointsTier[] | null } | null;
}

export function computeProductPricing(
  product: ProductPricingInput,
  config: PricingConfig | null | undefined,
) {
  const markup =
    product.markup_percent_override ?? config?.global_markup_percent ?? 0;
  const ambPercent = config?.ambassador_percent ?? 0;
  const hasPurchase =
    product.purchase_price !== null &&
    product.purchase_price !== undefined &&
    Number(product.purchase_price) > 0;
  const purchase = Number(product.purchase_price ?? 0);
  const targetSale = hasPurchase
    ? Math.round(purchase * (1 + Number(markup) / 100))
    : Number(product.price || 0);
  const b = hasPurchase
    ? computePricingBreakdown(purchase, Number(markup), Number(ambPercent))
    : {
        salePrice: targetSale,
        margin: 0,
        ambassadorEarning: Math.round((targetSale * Number(ambPercent)) / 100),
        platformEarning: 0,
      };

  const tiers =
    (product.points_tiers_override && product.points_tiers_override.length > 0
      ? product.points_tiers_override
      : product.category?.points_tiers_override &&
          product.category.points_tiers_override.length > 0
        ? product.category.points_tiers_override
        : config?.points_tiers) || [];
  const points =
    product.points_override != null && product.points_override >= 0
      ? product.points_override
      : computePointsForPrice(targetSale, tiers);

  return {
    hasPurchase,
    markupPercent: Number(markup),
    targetSalePrice: targetSale,
    salePrice: b.salePrice,
    margin: b.margin,
    ambassadorEarning: b.ambassadorEarning,
    platformEarning: b.platformEarning,
    points,
  };
}