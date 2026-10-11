// Minimal service worker for Oficio: PWA installability + Web Push delivery.
// Hand-written rather than generated, so it stays easy to read and audit;
// see README "PWA & Web Push" for how it's wired up.

const CACHE_NAME = "oficio-shell-v1";
const SHELL_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => void 0),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let data = { title: "Oficio", body: "Tienes un recordatorio.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // non-JSON payload; keep defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
