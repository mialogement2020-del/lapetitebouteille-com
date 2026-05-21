import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VendorFulfillmentStatus =
  | "pending"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface VendorOrderLine {
  item_id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  order_created_at: string;
  shipping_full_name: string | null;
  shipping_city: string | null;
  shipping_phone: string | null;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  vendor_status: VendorFulfillmentStatus;
  vendor_updated_at: string;
}

export const useVendorOrders = (shopId?: string) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["vendor-orders", shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_vendor_order_lines");
      if (error) throw error;
      return (data ?? []) as VendorOrderLine[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: VendorFulfillmentStatus }) => {
      const { error } = await supabase
        .from("order_items")
        .update({ vendor_status: status, vendor_updated_at: new Date().toISOString() })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-orders", shopId] });
      qc.invalidateQueries({ queryKey: ["my-vendor-shop"] });
    },
  });

  return { ...query, updateStatus };
};