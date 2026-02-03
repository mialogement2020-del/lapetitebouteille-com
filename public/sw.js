// Service Worker for Push Notifications - La Petite Bouteille Admin

const CACHE_NAME = "lpb-admin-v1";

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installed");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activated");
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received:", event);

  let notificationData = {
    title: "La Petite Bouteille",
    body: "Nouvelle notification",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "default",
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (e) {
      console.error("[SW] Error parsing push data:", e);
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: "view",
        title: "Voir",
      },
      {
        action: "dismiss",
        title: "Ignorer",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === "dismiss") {
    return;
  }

  // Default action or "view" action - open the admin page
  const urlToOpen = notificationData.url || "/admin?tab=stock";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close handler
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event);
});
