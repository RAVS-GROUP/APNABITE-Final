/**
 * ============================================================
 * APNABITE SERVICE WORKER
 * FILE: sw.js
 * PURPOSE: Fast application shell and safe offline support
 * VERSION: 8.0.0
 * ============================================================
 */

const CACHE_NAME =
  "apnabite-static-v8";


/*
 * ------------------------------------------------------------
 * MINIMUM APPLICATION SHELL
 *
 * Sirf guaranteed launch files pre-cache honge.
 * Other pages open hone par automatically runtime-cache honge.
 * ------------------------------------------------------------
 */

const STATIC_ASSETS = [

  "./",
  "./index.html",
  "./manifest.json",

  "./shared/assets/images/apnabite-logo.webp",

  "./shared/css/reset.css",
  "./shared/css/variables.css",
  "./shared/css/common.css",
  "./shared/css/components.css",
  "./shared/css/launch.css",
  "./shared/css/responsive.css",

  "./shared/js/storage.js",
  "./shared/js/session.js",
  "./shared/js/app-router.js",
  "./shared/js/launch.js"

];


/*
 * ------------------------------------------------------------
 * INSTALL
 * ------------------------------------------------------------
 */

self.addEventListener(
  "install",
  function(event) {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )

        .then(
          function(cache) {

            return cache.addAll(
              STATIC_ASSETS
            );
          }
        )

        .then(
          function() {

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
 * Remove only older ApnaBite caches.
 * ------------------------------------------------------------
 */

self.addEventListener(
  "activate",
  function(event) {

    event.waitUntil(

      caches
        .keys()

        .then(
          function(cacheNames) {

            return Promise.all(

              cacheNames
                .filter(
                  function(cacheName) {

                    return (
                      cacheName.startsWith(
                        "apnabite-"
                      ) &&
                      cacheName !==
                        CACHE_NAME
                    );
                  }
                )

                .map(
                  function(cacheName) {

                    return caches.delete(
                      cacheName
                    );
                  }
                )
            );
          }
        )

        .then(
          function() {

            return self.clients.claim();
          }
        )
    );
  }
);


/*
 * ------------------------------------------------------------
 * FETCH
 * ------------------------------------------------------------
 */

self.addEventListener(
  "fetch",
  function(event) {

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
     * Google Apps Script and all external API requests
     * are never intercepted or cached.
     */

    if (
      requestUrl.origin !==
      self.location.origin
    ) {

      return;
    }


    /*
     * Navigation requests:
     * network-first ensures latest deployed HTML.
     */

    if (
      request.mode === "navigate"
    ) {

      event.respondWith(
        handleNavigationRequest(
          request
        )
      );

      return;
    }


    /*
     * Same-origin CSS, JS, images and other static files:
     * cached response first, network update in background.
     */

    event.respondWith(
      handleStaticRequest(
        request
      )
    );
  }
);


/*
 * ------------------------------------------------------------
 * NAVIGATION REQUEST
 * ------------------------------------------------------------
 */

async function handleNavigationRequest(
  request
) {

  try {

    const networkResponse =
      await fetch(
        request,
        {
          cache:
            "no-cache"
        }
      );


    if (
      networkResponse &&
      networkResponse.ok
    ) {

      const cache =
        await caches.open(
          CACHE_NAME
        );


      await cache.put(
        getCacheKey(
          request
        ),
        networkResponse.clone()
      );
    }


    return networkResponse;

  } catch (error) {

    const cachedPage =
      await caches.match(
        getCacheKey(
          request
        )
      );


    if (cachedPage) {

      return cachedPage;
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


    return createOfflineResponse();
  }
}


/*
 * ------------------------------------------------------------
 * STATIC REQUEST
 * ------------------------------------------------------------
 */

async function handleStaticRequest(
  request
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
        async function(networkResponse) {

          if (
            networkResponse &&
            networkResponse.ok &&
            networkResponse.type !==
              "opaque"
          ) {

            const cache =
              await caches.open(
                CACHE_NAME
              );


            await cache.put(
              cacheKey,
              networkResponse.clone()
            );
          }


          return networkResponse;
        }
      )

      .catch(
        function() {

          return null;
        }
      );


  if (cachedResponse) {

    return cachedResponse;
  }


  const networkResponse =
    await networkPromise;


  if (networkResponse) {

    return networkResponse;
  }


  return createOfflineResponse();
}


/*
 * ------------------------------------------------------------
 * NORMALIZED CACHE KEY
 *
 * Query strings such as ?v=123 are removed so duplicate
 * cached copies are not created.
 * ------------------------------------------------------------
 */

function getCacheKey(request) {

  const url =
    new URL(
      request.url
    );


  url.search = "";
  url.hash = "";


  return url.href;
}


/*
 * ------------------------------------------------------------
 * OFFLINE RESPONSE
 * ------------------------------------------------------------
 */

function createOfflineResponse() {

  return new Response(
    "ApnaBite is currently offline. Please check your internet connection and try again.",
    {
      status: 503,

      statusText:
        "Service Unavailable",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8",

        "Cache-Control":
          "no-store"
      }
    }
  );
}
