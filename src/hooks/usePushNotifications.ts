import { useState, useEffect, useCallback, useRef } from "react";
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  registerServiceWorker,
} from "@/lib/pushNotifications";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

// Key to track if we've attempted auto-subscription
const AUTO_SUBSCRIBE_KEY = "push_auto_subscribe_attempted";

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>(() => 
    isPushSupported() ? getPushPermission() : "denied"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  // Start with false so button is interactive immediately
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const autoSubscribeAttempted = useRef(false);
  const initializationRef = useRef(false);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      const subscription = await subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        setPermission("granted");
        return true;
      }
      setPermission(getPushPermission());
      return false;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Check subscription status on mount (non-blocking)
  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initializationRef.current) return;
    initializationRef.current = true;

    const checkSubscription = async () => {
      if (!isSupported) {
        setIsInitialized(true);
        return;
      }

      try {
        // Register service worker in background (non-blocking)
        registerServiceWorker().catch(console.error);
        
        // Check if already subscribed
        const subscribed = await isSubscribedToPush();
        setIsSubscribed(subscribed);
        setIsInitialized(true);
        
        // Auto-subscribe logic (in background, doesn't block UI)
        const hasAttempted = localStorage.getItem(AUTO_SUBSCRIBE_KEY) === "true";
        const currentPermission = getPushPermission();
        
        if (!subscribed && currentPermission !== "denied" && !hasAttempted && !autoSubscribeAttempted.current) {
          autoSubscribeAttempted.current = true;
          localStorage.setItem(AUTO_SUBSCRIBE_KEY, "true");
          
          // Small delay to let UI render first
          setTimeout(async () => {
            console.log("Attempting auto-subscribe to push notifications...");
            const result = await subscribe();
            if (result) {
              console.log("Auto-subscribed to push notifications successfully");
            }
          }, 2000);
        }
      } catch (error) {
        console.error("Error checking push subscription:", error);
        setIsInitialized(true);
      }
    };

    checkSubscription();
  }, [isSupported, subscribe]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
