const CACHE_NAME = "iams-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/favicon/favicon.svg",
  "/favicon/web-app-manifest-192x192.png",
];

// Install event - cache necessary files
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install event");
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[ServiceWorker] Caching app assets");
      await Promise.all(
        ASSETS_TO_CACHE.map((asset) =>
          cache.add(asset).catch((error) => {
            console.warn("[ServiceWorker] Failed to cache asset:", asset, error);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate event");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[ServiceWorker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push notification event
self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push event received");

  let notificationData = {
    title: "IAMS Notification",
    body: "You have a new notification",
    icon: "/favicon/web-app-manifest-192x192.png",
    badge: "/favicon/web-app-manifest-192x192.png",
    tag: "iams-notification",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: data.data || {},
      };
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }

  const unreadCount = notificationData.data?.unreadCount || notificationData.data?.unread_count;

  const showNotificationPromise = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: false,
    data: notificationData.data,
  });

  const setBadgePromise = (async () => {
    if ("setAppBadge" in self.navigator) {
      try {
        const count = typeof unreadCount === "number" ? unreadCount : 1;
        if (count > 0) {
          await self.navigator.setAppBadge(count);
        } else if ("clearAppBadge" in self.navigator) {
          await self.navigator.clearAppBadge();
        }
      } catch (e) {
        console.debug("[SW] Failed to set app badge:", e);
      }
    }
  })();

  event.waitUntil(Promise.all([showNotificationPromise, setBadgePromise]));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[ServiceWorker] Notification clicked:", event.notification.tag);

  event.notification.close();

  if ("clearAppBadge" in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const notificationUrl =
    event.notification.data?.url ||
    event.notification.data?.action_url ||
    "/";
  const urlToOpen = new URL(notificationUrl, self.location.origin);

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen.toString() && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen.toString());
        }
      })
  );
});

// Message event - handle messages from app
self.addEventListener("message", (event) => {
  console.log("[ServiceWorker] Message received:", event.data);

  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { notification } = event.data;
    event.waitUntil(
      self.registration.showNotification(notification.title, notification.options)
    );
  } else if (event.data && event.data.type === "UPDATE_BADGE") {
    const count = event.data.unreadCount ?? 0;
    if ("setAppBadge" in self.navigator) {
      if (count > 0) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else if ("clearAppBadge" in self.navigator) {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  }
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip API calls - always go to network
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => {
          // Return offline response if needed
          return new Response("Network error", { status: 503 });
        })
    );
    return;
  }

  // HTML/navigation requests must always go to the network first — caching
  // index.html stale is what causes it to reference deleted JS chunk hashes
  // after a new deploy ("Failed to fetch dynamically imported module").
  const isNavigation =
    event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html");
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response("You are offline", { status: 503 })))
    );
    return;
  }

  // Hashed build assets (/assets/*.js, *.css, etc.) are immutable per filename,
  // so cache-first is safe and fast here.
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return a basic offline page if both cache and network fail
          return new Response("You are offline", { status: 503 });
        });
    })
  );
});
