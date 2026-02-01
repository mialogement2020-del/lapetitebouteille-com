import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export function useProfile() {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

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
  }, [user]);

  const fetchProfile = async () => {
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
  };

  const fetchOrders = async () => {
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
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          return {
            ...order,
            items: items || [],
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

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
    } catch (error: any) {
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
