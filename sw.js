/**
 * ============================================================
 * APNABITE SERVICE WORKER
 * FILE: sw.js
 * PURPOSE: Fast PWA loading and offline support
 * VERSION: 7.0.0
 * ============================================================
 */

const CACHE_NAME =
  "apnabite-static-v7";


const STATIC_ASSETS = [

  "./",
  "./index.html",
  "./login.html",
  "./register.html",
  "./role-selection.html",
  "./manifest.json",

  "./shared/css/reset.css",
  "./shared/css/variables.css",
  "./shared/css/common.css",
  "./shared/css/components.css",
  "./shared/css/auth-pages.css",
  "./shared/css/responsive.css",

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

  "./customer/html/home.html",
  "./customer/html/orders.html",
  "./customer/html/dine-in.html",
  "./customer/html/account.html",
  "./customer/html/addresses.html",

  "./customer/css/customer-common.css",
  "./customer/css/home.css",
  "./customer/css/orders.css",
  "./customer/css/dine-in.css",
  "./customer/css/account.css",
  "./customer/css/addresses.css",

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
                "ApnaBite cache files skipped:",
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
 * A URL string is intentionally used here.
 * Creating a new Request with mode "navigate" causes browsers
 * to reject navigation and return ERR_FAILED.
 * ------------------------------------------------------------
 */

function getCacheKey(request) {

  const url =
    new URL(
      request.url
    );


  url.search =
    "";


  return url.href;
}


/*
 * ------------------------------------------------------------
 * SAVE SUCCESSFUL RESPONSE
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
        (error) => {

          console.warn(
            "Background network refresh failed:",
            request.url,
            error
          );


          return null;
        }
      );


  if (cachedResponse) {

    event.waitUntil(
      networkPromise
    );


    return cachedResponse;
  }


  return networkPromise;
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


  const indexUrl =
    new URL(
      "./index.html",
      self.location.href
    ).href;


  const cachedIndex =
    await caches.match(
      indexUrl
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
     * Do not cache Apps Script API or external requests.
     */

    if (
      requestUrl.origin !==
      self.location.origin
    ) {

      return;
    }


    /*
     * HTML navigation.
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

          .catch(
            () => {

              return getNavigationFallback(
                request
              );
            }
          )
      );


      return;
    }


    /*
     * Static application assets.
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
