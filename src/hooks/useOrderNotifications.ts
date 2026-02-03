import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export interface OrderNotification {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  createdAt: string;
  isRead: boolean;
}

export function useOrderNotifications(enabled: boolean = true) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications]);

  // Fetch recent orders (last 24 hours) on mount
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const fetchRecentOrders = async () => {
      try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data, error } = await supabase
          .from("orders")
          .select("id, order_number, shipping_full_name, total, created_at")
          .gte("created_at", twentyFourHoursAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching recent orders:", error);
          return;
        }

        if (data && data.length > 0) {
          const recentNotifications: OrderNotification[] = data.map((order) => ({
            id: order.id,
            orderNumber: order.order_number,
            customerName: order.shipping_full_name || "Client",
            total: order.total,
            createdAt: order.created_at || new Date().toISOString(),
            isRead: false, // Mark as unread initially
          }));

          setNotifications(recentNotifications);
        }
      } catch (err) {
        console.error("Error in fetchRecentOrders:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentOrders();
  }, [enabled]);

  // Subscribe to realtime updates for NEW orders
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("admin-order-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newOrder = payload.new as Order;

          const notification: OrderNotification = {
            id: newOrder.id,
            orderNumber: newOrder.order_number,
            customerName: newOrder.shipping_full_name || "Client",
            total: newOrder.total,
            createdAt: newOrder.created_at || new Date().toISOString(),
            isRead: false,
          };

          // Add new notification at the top, avoiding duplicates
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === notification.id);
            if (exists) return prev;
            return [notification, ...prev.slice(0, 49)]; // Keep max 50 notifications
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
    formatPrice,
  };
}
