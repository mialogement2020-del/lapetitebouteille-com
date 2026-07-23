import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductPackagingOption } from "@/lib/packagingPricing";

export type ProductPackagingFormOption = Omit<
  ProductPackagingOption,
  "id" | "product_id" | "calculated_unit_price" | "calculated_savings"
> & {
  id?: string;
};

const packagingColumns = `
  id,
  product_id,
  packaging_type,
  packaging_label,
  bottle_quantity,
  pricing_mode,
  total_price,
  discount_percent,
  calculated_unit_price,
  calculated_savings,
  show_discount,
  stock_quantity,
  sku,
  weight_kg,
  discount_tiers,
  is_active
`;

const PUBLIC_PACKAGING_VIEW = "active_product_packaging_options" as never;
const ADMIN_PACKAGING_TABLE = "product_packaging_options" as never;

const normalizeOption = (option: unknown) => option as ProductPackagingOption;

export function useActiveProductPackagingOptions(productId?: string) {
  return useQuery({
    queryKey: ["active-product-packaging-options", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(PUBLIC_PACKAGING_VIEW)
        .select(packagingColumns)
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("packaging_type", { ascending: true })
        .order("bottle_quantity", { ascending: true });

      if (error) throw error;
      return (data || []).map(normalizeOption);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAdminProductPackagingOptions(productId?: string) {
  return useQuery({
    queryKey: ["admin-product-packaging-options", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(ADMIN_PACKAGING_TABLE)
        .select(packagingColumns)
        .eq("product_id", productId)
        .order("packaging_type", { ascending: true })
        .order("bottle_quantity", { ascending: true });

      if (error) throw error;
      return (data || []).map(normalizeOption);
    },
  });
}

export function useSaveProductPackagingOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      options,
    }: {
      productId: string;
      options: ProductPackagingFormOption[];
    }) => {
      const { error: deleteError } = await supabase
        .from(ADMIN_PACKAGING_TABLE)
        .delete()
        .eq("product_id", productId);
      if (deleteError) throw deleteError;

      if (options.length === 0) return;

      const rows = options.map((option) => ({
        product_id: productId,
        packaging_type: option.packaging_type,
        packaging_label: option.packaging_label,
        bottle_quantity: option.bottle_quantity,
        pricing_mode: option.pricing_mode,
        total_price: option.total_price,
        discount_percent: option.discount_percent,
        show_discount: option.show_discount,
        stock_quantity: option.stock_quantity,
        sku: option.sku,
        weight_kg: option.weight_kg,
        discount_tiers: option.discount_tiers || [],
        is_active: option.is_active,
      }));

      const { error } = await supabase.from(ADMIN_PACKAGING_TABLE).insert(rows as never);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-packaging-options", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["active-product-packaging-options", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}
