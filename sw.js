const CACHE_NAME = "apnabite-static-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  "./shared/css/reset.css",
  "./shared/css/variables.css",
  "./shared/css/common.css",
  "./shared/css/components.css",
  "./shared/css/responsive.css",

  "./shared/js/storage.js",
  "./shared/js/cache.js",
  "./shared/js/session.js",
  "./shared/js/auth.js",
  "./shared/js/api.js",
  "./shared/js/location.js",
  "./shared/js/cart.js",
  "./shared/js/validation.js",
  "./shared/js/formatter.js",
  "./shared/js/notifications.js",
  "./shared/js/theme.js",
  "./shared/js/app.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {

            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type === "opaque"
            ) {
              return networkResponse;
            }

            const responseClone = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseClone);
              });

            return networkResponse;
          });
      })
  );
});

