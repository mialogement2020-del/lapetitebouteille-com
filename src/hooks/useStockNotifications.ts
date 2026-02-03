import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type UserNotification = Database["public"]["Tables"]["user_notifications"]["Row"];

export interface StockNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  productId: string | null;
  createdAt: string;
  isRead: boolean;
}

export function useStockNotifications(enabled: boolean = true) {
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("type", "stock_alert")
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, []);

  // Clear all stock notifications
  const clearAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "stock_alert");

    if (!error) {
      setNotifications([]);
    }
  }, []);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications]);

  // Fetch stock notifications on mount
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_notifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("type", "stock_alert")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching stock notifications:", error);
          return;
        }

        if (data && data.length > 0) {
          const stockNotifications: StockNotification[] = data.map((notif) => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            productId: notif.reference_id,
            createdAt: notif.created_at,
            isRead: notif.is_read ?? false,
          }));

          setNotifications(stockNotifications);
        }
      } catch (err) {
        console.error("Error in fetchNotifications:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [enabled]);

  // Subscribe to realtime updates for NEW stock notifications
  useEffect(() => {
    if (!enabled) return;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("admin-stock-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as UserNotification;

            // Only add stock alerts
            if (newNotif.type !== "stock_alert") return;

            const notification: StockNotification = {
              id: newNotif.id,
              title: newNotif.title,
              message: newNotif.message,
              type: newNotif.type,
              productId: newNotif.reference_id,
              createdAt: newNotif.created_at,
              isRead: newNotif.is_read ?? false,
            };

            // Add new notification at the top, avoiding duplicates
            setNotifications((prev) => {
              const exists = prev.some((n) => n.id === notification.id);
              if (exists) return prev;
              return [notification, ...prev.slice(0, 49)];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [enabled]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
