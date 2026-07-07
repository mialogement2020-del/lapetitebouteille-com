import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedRow {
  id: string;
  product_id: string;
  display_order: number;
  is_visible: boolean;
  custom_title_fr: string | null;
  custom_title_en: string | null;
  custom_price: number | null;
  product?: any;
}

export function useFeaturedHomeProducts(opts: { visibleOnly?: boolean } = {}) {
  return useQuery({
    queryKey: ["home_featured_products", opts],
    queryFn: async () => {
      let q = supabase
        .from("home_featured_products")
        .select("*, product:products(*, category:categories(*))")
        .order("display_order", { ascending: true });
      if (opts.visibleOnly) q = q.eq("is_visible", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FeaturedRow[];
    },
  });
}

export function useSaveFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FeaturedRow> & { product_id: string }) => {
      if (input.id) {
        const { id, product, ...rest } = input as any;
        const { error } = await supabase.from("home_featured_products").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { product, ...rest } = input as any;
        const { error } = await supabase.from("home_featured_products").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_featured_products"] }),
  });
}

export function useDeleteFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_featured_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_featured_products"] }),
  });
}