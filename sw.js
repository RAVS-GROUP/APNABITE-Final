/**
 * ============================================================
 * APNABITE SERVICE WORKER
 * FILE: sw.js
 * VERSION: 3.0.0
 * ============================================================
 */

const CACHE_NAME =
  "apnabite-static-v3";


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
  "./shared/js/api.js",
  "./shared/js/session.js",
  "./shared/js/auth.js",
  "./shared/js/location.js",
  "./shared/js/service-location.js",
  "./shared/js/location-ui.js",
  "./shared/js/cart.js",
  "./shared/js/validation.js",
  "./shared/js/formatter.js",
  "./shared/js/notifications.js",
  "./shared/js/theme.js",
  "./shared/js/app.js"

];


self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then((cache) => {

          return cache.addAll(
            STATIC_ASSETS
          );
        })

        .then(() => {

          return self.skipWaiting();
        })
    );
  }
);


self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches
        .keys()

        .then((cacheNames) => {

          return Promise.all(

            cacheNames
              .filter(
                (cacheName) =>
                  cacheName !==
                  CACHE_NAME
              )

              .map(
                (cacheName) =>
                  caches.delete(
                    cacheName
                  )
              )
          );
        })

        .then(() => {

          return self.clients.claim();
        })
    );
  }
);


self.addEventListener(
  "fetch",
  (event) => {

    const request =
      event.request;

    if (
      request.method !== "GET"
    ) {
      return;
    }

    const requestUrl =
      new URL(
        request.url
      );

    if (
      requestUrl.origin !==
      self.location.origin
    ) {
      return;
    }

    event.respondWith(

      fetch(
        request,
        {
          cache: "no-cache"
        }
      )

        .then(
          (networkResponse) => {

            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type !==
                "opaque"
            ) {

              const responseClone =
                networkResponse.clone();

              caches
                .open(CACHE_NAME)

                .then((cache) => {

                  return cache.put(
                    request,
                    responseClone
                  );
                });
            }

            return networkResponse;
          }
        )

        .catch(
          async () => {

            const cachedResponse =
              await caches.match(
                request
              );

            if (cachedResponse) {

              return cachedResponse;
            }

            if (
              request.mode ===
              "navigate"
            ) {

              const cachedIndex =
                await caches.match(
                  "./index.html"
                );

              if (cachedIndex) {

                return cachedIndex;
              }
            }

            return new Response(
              "ApnaBite is currently offline.",
              {
                status: 503,
                statusText:
                  "Service Unavailable",
                headers: {
                  "Content-Type":
                    "text/plain;charset=utf-8"
                }
              }
            );
          }
        )
    );
  }
);
