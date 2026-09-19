/**
 * ============================================================
 * APNABITE SERVICE WORKER
 * FILE: sw.js
 * PURPOSE: Fast PWA static loading and offline support
 * VERSION: 6.0.0
 * ============================================================
 */

const CACHE_NAME =
  "apnabite-static-v6";


/*
 * ------------------------------------------------------------
 * APPLICATION SHELL
 *
 * These files are cached individually. One missing optional
 * file will not prevent the complete service worker install.
 * ------------------------------------------------------------
 */

const STATIC_ASSETS = [

  "./",
  "./index.html",
  "./login.html",
  "./register.html",
  "./role-selection.html",
  "./manifest.json",

  /*
   * Shared CSS
   */

  "./shared/css/reset.css",
  "./shared/css/variables.css",
  "./shared/css/common.css",
  "./shared/css/components.css",
  "./shared/css/auth-pages.css",
  "./shared/css/responsive.css",

  /*
   * Shared JavaScript
   */

  "./shared/js/storage.js",
  "./shared/js/cache.js",
  "./shared/js/api.js",
  "./shared/js/session.js",
  "./shared/js/auth.js",
  "./shared/js/app-router.js",
  "./shared/js/role-home.js",
  "./shared/js/location.js",
  "./shared/js/service-location.js",
  "./shared/js/location-ui.js",
  "./shared/js/cart.js",
  "./shared/js/validation.js",
  "./shared/js/formatter.js",
  "./shared/js/notifications.js",
  "./shared/js/theme.js",
  "./shared/js/launch.js",
  "./shared/js/app.js",
  "./shared/js/login-page.js",
  "./shared/js/register-page.js",
  "./shared/js/role-selection.js",

  /*
   * Customer HTML
   */

  "./customer/html/home.html",
  "./customer/html/orders.html",
  "./customer/html/dine-in.html",
  "./customer/html/account.html",
  "./customer/html/addresses.html",

  /*
   * Customer CSS
   */

  "./customer/css/customer-common.css",
  "./customer/css/home.css",
  "./customer/css/orders.css",
  "./customer/css/dine-in.css",
  "./customer/css/account.css",
  "./customer/css/addresses.css",

  /*
   * Customer JavaScript
   */

  "./customer/js/home.js",
  "./customer/js/orders.js",
  "./customer/js/dine-in.js",
  "./customer/js/account.js",
  "./customer/js/addresses.js"
];


/*
 * ------------------------------------------------------------
 * INSTALL
 * ------------------------------------------------------------
 */

self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )

        .then(
          async (cache) => {

            /*
             * Cache files separately so one missing optional
             * asset does not fail the complete installation.
             */

            const results =
              await Promise.allSettled(

                STATIC_ASSETS.map(
                  (asset) => {

                    return cache.add(
                      new Request(
                        asset,
                        {
                          cache:
                            "reload"
                        }
                      )
                    );
                  }
                )
              );


            const failedAssets = [];


            results.forEach(
              (result, index) => {

                if (
                  result.status ===
                  "rejected"
                ) {

                  failedAssets.push(
                    STATIC_ASSETS[index]
                  );
                }
              }
            );


            if (
              failedAssets.length > 0
            ) {

              console.warn(
                "ApnaBite optional cache files skipped:",
                failedAssets
              );
            }
          }
        )

        .then(
          () => {

            return self.skipWaiting();
          }
        )
    );
  }
);


/*
 * ------------------------------------------------------------
 * ACTIVATE
 *
 * Delete older ApnaBite static caches.
 * ------------------------------------------------------------
 */

self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches
        .keys()

        .then(
          (cacheNames) => {

            return Promise.all(

              cacheNames
                .filter(
                  (cacheName) => {

                    return (
                      cacheName.indexOf(
                        "apnabite-static-"
                      ) === 0 &&
                      cacheName !==
                        CACHE_NAME
                    );
                  }
                )

                .map(
                  (cacheName) => {

                    return caches.delete(
                      cacheName
                    );
                  }
                )
            );
          }
        )

        .then(
          () => {

            return self.clients.claim();
          }
        )
    );
  }
);


/*
 * ------------------------------------------------------------
 * MESSAGE CONTROL
 * ------------------------------------------------------------
 */

self.addEventListener(
  "message",
  (event) => {

    if (
      event.data &&
      event.data.type ===
        "SKIP_WAITING"
    ) {

      self.skipWaiting();
    }
  }
);


/*
 * ------------------------------------------------------------
 * NORMALIZED CACHE KEY
 *
 * Query parameters such as ?v=123 do not create duplicate
 * static cache entries.
 * ------------------------------------------------------------
 */

function getCacheKey(request) {

  const url =
    new URL(
      request.url
    );


  url.search =
    "";


  return new Request(
    url.href,
    {
      method:
        "GET",
      headers:
        request.headers,
      mode:
        request.mode,
      credentials:
        request.credentials,
      redirect:
        request.redirect
    }
  );
}


/*
 * ------------------------------------------------------------
 * SAFE CACHE UPDATE
 * ------------------------------------------------------------
 */

async function updateCache(
  request,
  response
) {

  if (
    !response ||
    response.status !== 200 ||
    response.type === "opaque"
  ) {

    return;
  }


  const cache =
    await caches.open(
      CACHE_NAME
    );


  await cache.put(
    getCacheKey(
      request
    ),
    response.clone()
  );
}


/*
 * ------------------------------------------------------------
 * STALE-WHILE-REVALIDATE
 *
 * Cached page/assets return immediately.
 * Latest version downloads in the background.
 * ------------------------------------------------------------
 */

async function staleWhileRevalidate(
  request,
  event
) {

  const cacheKey =
    getCacheKey(
      request
    );


  const cachedResponse =
    await caches.match(
      cacheKey
    );


  const networkPromise =
    fetch(
      request,
      {
        cache:
          "no-cache"
      }
    )

      .then(
        async (networkResponse) => {

          await updateCache(
            request,
            networkResponse
          );


          return networkResponse;
        }
      )

      .catch(
        () => null
      );


  if (cachedResponse) {

    event.waitUntil(
      networkPromise
    );


    return cachedResponse;
  }


  const networkResponse =
    await networkPromise;


  if (networkResponse) {

    return networkResponse;
  }


  return null;
}


/*
 * ------------------------------------------------------------
 * OFFLINE NAVIGATION FALLBACK
 * ------------------------------------------------------------
 */

async function getNavigationFallback(
  request
) {

  const requestedPage =
    await caches.match(
      getCacheKey(
        request
      )
    );


  if (requestedPage) {

    return requestedPage;
  }


  const cachedIndex =
    await caches.match(
      new URL(
        "./index.html",
        self.location.href
      ).href
    );


  if (cachedIndex) {

    return cachedIndex;
  }


  return new Response(
    "ApnaBite is currently offline.",
    {
      status:
        503,
      statusText:
        "Service Unavailable",
      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      }
    }
  );
}


/*
 * ------------------------------------------------------------
 * FETCH
 * ------------------------------------------------------------
 */

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


    /*
     * Apps Script API and other external services must never
     * be cached by this service worker.
     */

    if (
      requestUrl.origin !==
      self.location.origin
    ) {

      return;
    }


    /*
     * Browser page navigation:
     * return cached HTML immediately when available and
     * refresh it silently in the background.
     */

    if (
      request.mode === "navigate"
    ) {

      event.respondWith(

        staleWhileRevalidate(
          request,
          event
        )

          .then(
            (response) => {

              if (response) {

                return response;
              }


              return getNavigationFallback(
                request
              );
            }
          )
      );


      return;
    }


    /*
     * Same-origin CSS, JavaScript, manifest and image files:
     * serve cache immediately and update in background.
     */

    const cacheableDestinations = [
      "style",
      "script",
      "image",
      "font",
      "manifest"
    ];


    if (
      cacheableDestinations.includes(
        request.destination
      )
    ) {

      event.respondWith(

        staleWhileRevalidate(
          request,
          event
        )

          .then(
            (response) => {

              if (response) {

                return response;
              }


              return new Response(
                "",
                {
                  status:
                    504,
                  statusText:
                    "Gateway Timeout"
                }
              );
            }
          )
      );
    }
  }
);
