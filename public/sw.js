// Service Worker for Push Notifications - La Petite Bouteille Admin

 const CACHE_NAME = "lpb-v2";
 const STATIC_ASSETS = [
   "/",
   "/index.html",
   "/manifest.json",
   "/favicon.ico"
 ];

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installed");
   event.waitUntil(
     caches.open(CACHE_NAME).then((cache) => {
       console.log("[SW] Caching static assets");
       return cache.addAll(STATIC_ASSETS);
     })
   );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activated");
   event.waitUntil(
     Promise.all([
       clients.claim(),
       // Clean old caches
       caches.keys().then((cacheNames) => {
         return Promise.all(
           cacheNames
             .filter((name) => name !== CACHE_NAME)
             .map((name) => caches.delete(name))
         );
       })
     ])
   );
});

 // Fetch event - Network first, fallback to cache
 self.addEventListener("fetch", (event) => {
   // Skip non-GET requests
   if (event.request.method !== "GET") return;
   
   // Skip API calls and external requests
   const url = new URL(event.request.url);
   if (url.pathname.startsWith("/api") || 
       url.pathname.startsWith("/rest") ||
       url.hostname.includes("supabase")) {
     return;
   }
   
   event.respondWith(
     fetch(event.request)
       .then((response) => {
         // Clone and cache successful responses
         if (response.status === 200) {
           const responseClone = response.clone();
           caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseClone);
           });
         }
         return response;
       })
       .catch(() => {
         // Fallback to cache
         return caches.match(event.request).then((cachedResponse) => {
           if (cachedResponse) {
             return cachedResponse;
           }
           // Return offline page for navigation requests
           if (event.request.mode === "navigate") {
             return caches.match("/");
           }
           return new Response("Offline", { status: 503 });
         });
       })
   );
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
