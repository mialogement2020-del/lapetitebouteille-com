import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Order = Tables<"orders">;
type CustomerOrderItem = Pick<
  Tables<"order_items">,
  | "id"
  | "order_id"
  | "product_id"
  | "product_name"
  | "product_image"
  | "quantity"
  | "unit_price"
  | "total_price"
  | "vendor_id"
  | "vendor_status"
  | "vendor_updated_at"
  | "created_at"
>;

export interface OrderWithItems extends Order {
  items: CustomerOrderItem[];
}

export function useProfile() {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch order items for each order
      const ordersWithItems: OrderWithItems[] = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from("customer_order_items" as never)
            .select("*")
            .eq("order_id", order.id);

          return {
            ...order,
            items: (items || []) as unknown as CustomerOrderItem[],
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrders();
    } else {
      setProfile(null);
      setOrders([]);
      setLoading(false);
      setOrdersLoading(false);
    }
  }, [fetchOrders, fetchProfile, user]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: { message: "Non authentifié" } };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return { error: null };
    } catch (error: unknown) {
      return { error };
    }
  }, [user]);

  return {
    profile,
    orders,
    loading,
    ordersLoading,
    updateProfile,
    refetchProfile: fetchProfile,
    refetchOrders: fetchOrders,
  };
}
