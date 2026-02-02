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

  // Subscribe to realtime updates
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

          setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep max 50 notifications
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
    markAsRead,
    markAllAsRead,
    clearAll,
    formatPrice,
  };
}
