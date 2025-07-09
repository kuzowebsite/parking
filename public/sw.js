const CACHE_NAME = "parking-app-v2"
const urlsToCache = [
  "/",
  "/login",
  "/manager",
  "/images/logo.png",
  "/images/background.webp",
  "/api/manifest",
  "/manifest.json",
]

// Install event - improved caching
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing...")
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("📦 Opened cache:", CACHE_NAME)
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log("✅ All resources cached successfully")
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("❌ Cache installation failed:", error)
      }),
  )
})

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker activating...")
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("✅ Service Worker activated")
        // Ensure the service worker takes control immediately
        return self.clients.claim()
      }),
  )
})

// Fetch event - improved caching strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response
        }

        // Fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          // Add to cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
      })
      .catch(() => {
        // Return offline page or default response if available
        if (event.request.destination === "document") {
          return caches.match("/")
        }
      }),
  )
})

// Push notification event
self.addEventListener("push", (event) => {
  console.log("📬 Push notification received")
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || "/images/logo.png",
      badge: "/images/logo.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification click received")
  event.notification.close()
  event.waitUntil(clients.openWindow("/"))
})

// Message event for communication with main thread
self.addEventListener("message", (event) => {
  console.log("💬 Message received:", event.data)
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
