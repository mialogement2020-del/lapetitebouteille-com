import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FlashSale {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  banner_image_url: string | null;
}

export interface FlashSaleProduct {
  id: string;
  flash_sale_id: string;
  product_id: string;
  flash_price: number;
  max_quantity: number | null;
  sold_quantity: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    original_price: number | null;
    image_url: string | null;
    stock_quantity: number | null;
  };
}

type FlashSaleProductSummary = NonNullable<FlashSaleProduct["product"]>;

export function useActiveFlashSales() {
  return useQuery({
    queryKey: ["flash-sales-active"],
    queryFn: async (): Promise<FlashSale[]> => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("flash_sales")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .gt("ends_at", now)
        .order("ends_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useFlashSaleProducts(flashSaleId?: string) {
  return useQuery({
    queryKey: ["flash-sale-products", flashSaleId],
    queryFn: async (): Promise<FlashSaleProduct[]> => {
      if (!flashSaleId) return [];

      const { data, error } = await supabase
        .from("flash_sale_products")
        .select("*")
        .eq("flash_sale_id", flashSaleId);

      if (error) throw error;
      const rows = (data as FlashSaleProduct[]) || [];
      const productIds = rows.map((row) => row.product_id);
      if (productIds.length === 0) return rows;

      const { data: products, error: productsError } = await supabase
        .from("public_products" as never)
        .select("id, name, slug, price, original_price, image_url, stock_quantity")
        .in("id", productIds);
      if (productsError) throw productsError;

      const productById = new Map(
        ((products ?? []) as unknown as FlashSaleProductSummary[]).map((product) => [product.id, product]),
      );
      return rows.map((row) => ({ ...row, product: productById.get(row.product_id) }));
    },
    enabled: !!flashSaleId,
  });
}

export function useProductFlashPrice(productId: string) {
  return useQuery({
    queryKey: ["product-flash-price", productId],
    queryFn: async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("flash_sale_products")
        .select(`
          flash_price,
          flash_sale:flash_sales!inner (
            id,
            name,
            ends_at,
            is_active,
            starts_at
          )
        `)
        .eq("product_id", productId)
        .eq("flash_sale.is_active", true)
        .lte("flash_sale.starts_at", now)
        .gt("flash_sale.ends_at", now)
        .maybeSingle();

      if (error) return null;
      
      if (data) {
        const row = data as typeof data & {
          flash_sale: {
            id: string;
            name: string;
            ends_at: string;
            is_active: boolean;
            starts_at: string;
          };
        };
        return {
          flashPrice: data.flash_price,
          flashSale: row.flash_sale,
        };
      }
      
      return null;
    },
    enabled: !!productId,
  });
}
