import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuthContext } from "@/contexts/AuthContext";
import { playNotificationSound, isAmbassadorSoundEnabled } from "@/lib/notificationSound";

type UserNotification = Database["public"]["Tables"]["user_notifications"]["Row"];

export interface AmbassadorNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
  isRead: boolean;
}

export function useAmbassadorNotifications(enabled: boolean = true) {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<AmbassadorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoadRef = useRef(true);

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
    if (!user) return;

    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("type", ["commission", "bonus", "referral"])
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }, [user]);

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

  // Clear all ambassador notifications
  const clearAll = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("user_id", user.id)
      .in("type", ["commission", "bonus", "referral"]);

    if (!error) {
      setNotifications([]);
    }
  }, [user]);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications]);

  // Fetch notifications on mount
  useEffect(() => {
    if (!enabled || !user) {
      setIsLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("user_notifications")
          .select("*")
          .eq("user_id", user.id)
          .in("type", ["commission", "bonus", "referral"])
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching ambassador notifications:", error);
          return;
        }

        if (data) {
          const ambassadorNotifications: AmbassadorNotification[] = data.map((notif) => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            referenceId: notif.reference_id,
            referenceType: notif.reference_type,
            createdAt: notif.created_at,
            isRead: notif.is_read ?? false,
          }));

          setNotifications(ambassadorNotifications);
        }
      } catch (err) {
        console.error("Error in fetchNotifications:", err);
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    fetchNotifications();
  }, [enabled, user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!enabled || !user) return;

    const channel = supabase
      .channel("ambassador-notifications")
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

          // Only add ambassador-related notifications
          if (!["commission", "bonus", "referral"].includes(newNotif.type)) return;

          const notification: AmbassadorNotification = {
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
            referenceId: newNotif.reference_id,
            referenceType: newNotif.reference_type,
            createdAt: newNotif.created_at,
            isRead: newNotif.is_read ?? false,
          };

          // Play notification sound for new notifications
          if (!isInitialLoadRef.current && isAmbassadorSoundEnabled()) {
            const soundType = newNotif.type === "commission" ? "commission" : "info";
            playNotificationSound(soundType);
          }

          // Add new notification at the top
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
  }, [enabled, user]);

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
