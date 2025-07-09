const CACHE_NAME = "parking-app-v1"
const urlsToCache = [
  "/",
  "/login",
  "/manager",
  "/manifest.json",
  "/images/logo.png",
  "/images/background.webp",
  // Add other static assets
]

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache")
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error("Cache addAll failed:", error)
      }),
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response
        }
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
      })
      .catch(() => {
        // Return offline page if available
        if (event.request.destination === "document") {
          return caches.match("/")
        }
      }),
  )
})

// Background sync
self.addEventListener("sync", (event) => {
  console.log("Background sync:", event.tag)
})

// Push notifications
self.addEventListener("push", (event) => {
  console.log("Push received:", event)

  const options = {
    body: event.data ? event.data.text() : "Шинэ мэдэгдэл",
    icon: "/images/logo.png",
    badge: "/images/logo.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  }

  event.waitUntil(self.registration.showNotification("Зогсоолын систем", options))
})
