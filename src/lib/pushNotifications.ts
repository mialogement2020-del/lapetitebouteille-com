// Push Notification utilities for admin stock alerts
import { supabase } from "@/integrations/supabase/client";

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Get push notification permission status
export function getPushPermission(): NotificationPermission {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

// Request push notification permission
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported");
    return "denied";
  }
  
  const permission = await Notification.requestPermission();
  return permission;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("Service Worker registered:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

// Get VAPID public key from edge function
async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-vapid-keys", {
      method: "POST",
    });

    if (error) {
      console.error("Error getting VAPID keys:", error);
      return null;
    }

    if (data?.publicKey) {
      return data.publicKey;
    }

    return null;
  } catch (error) {
    console.error("Error fetching VAPID public key:", error);
    return null;
  }
}

// Convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported");
    return null;
  }

  const permission = await requestPushPermission();
  if (permission !== "granted") {
    console.warn("Push notification permission denied");
    return null;
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    console.error("No service worker registration");
    return null;
  }

  // Get VAPID public key
  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) {
    console.error("Could not get VAPID public key");
    return null;
  }

  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
      console.log("New push subscription created");
    }

    // Save subscription to database
    await saveSubscriptionToDatabase(subscription);

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return null;
  }
}

// Save subscription to Supabase
async function saveSubscriptionToDatabase(subscription: PushSubscription): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("No user logged in");
    return;
  }

  const subscriptionJson = subscription.toJSON();
  const p256dh = subscriptionJson.keys?.p256dh || "";
  const auth = subscriptionJson.keys?.auth || "";

  // Upsert subscription
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        is_active: true,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("Error saving subscription:", error);
  } else {
    console.log("Push subscription saved to database");
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }

      // Unsubscribe
      await subscription.unsubscribe();
      console.log("Unsubscribed from push notifications");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error unsubscribing:", error);
    return false;
  }
}

// Check if currently subscribed
export async function isSubscribedToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error("Error checking subscription:", error);
    return false;
  }
}
