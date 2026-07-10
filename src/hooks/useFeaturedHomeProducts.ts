import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedProduct {
  id: string;
  category_id: string | null;
  [key: string]: unknown;
}

export interface FeaturedRow {
  id: string;
  product_id: string;
  display_order: number;
  is_visible: boolean;
  custom_title_fr: string | null;
  custom_title_en: string | null;
  custom_price: number | null;
  product?: FeaturedProduct & { category?: unknown };
}

export function useFeaturedHomeProducts(opts: { visibleOnly?: boolean } = {}) {
  return useQuery({
    queryKey: ["home_featured_products", opts],
    queryFn: async () => {
      let q = supabase
        .from("home_featured_products")
        .select("*")
        .order("display_order", { ascending: true });
      if (opts.visibleOnly) q = q.eq("is_visible", true);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as FeaturedRow[];
      const productIds = rows.map((row) => row.product_id);
      if (productIds.length === 0) return rows;

      const { data: products, error: productsError } = await supabase
        .from("public_products" as never)
        .select("*")
        .in("id", productIds);
      if (productsError) throw productsError;

      const safeProducts = (products ?? []) as unknown as FeaturedProduct[];
      const categoryIds = [...new Set(safeProducts.map((product) => product.category_id).filter(Boolean))] as string[];
      const { data: categories } = categoryIds.length
        ? await supabase.from("categories").select("*").in("id", categoryIds)
        : { data: [] };
      const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
      const productById = new Map(
        safeProducts.map((product) => [
          product.id,
          {
            ...product,
            category: product.category_id ? categoryById.get(product.category_id) : undefined,
          },
        ]),
      );

      return rows.map((row) => ({ ...row, product: productById.get(row.product_id) }));
    },
  });
}

export function useSaveFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FeaturedRow> & { product_id: string }) => {
      if (input.id) {
        const { id, product: _product, ...rest } = input;
        const { error } = await supabase.from("home_featured_products").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { product: _product, ...rest } = input;
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
