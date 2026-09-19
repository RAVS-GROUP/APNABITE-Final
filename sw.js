/**
 * ============================================================
 * APNABITE SERVICE WORKER
 * FILE: sw.js
 * PURPOSE: Version-safe caching and offline support
 * VERSION: 9.0.0
 * ============================================================
 */

const CACHE_NAME =
  "apnabite-static-v9";


/*
 * ------------------------------------------------------------
 * MINIMUM OFFLINE SHELL
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
 * Delete every older ApnaBite cache so different JavaScript
 * versions can never run together.
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
     * Google Apps Script API and all external services
     * bypass the Service Worker completely.
     */

    if (
      requestUrl.origin !==
      self.location.origin
    ) {

      return;
    }


    /*
     * HTML navigation always checks latest deployment first.
     */

    if (
      request.mode === "navigate"
    ) {

      event.respondWith(
        networkFirst(
          request,
          true
        )
      );

      return;
    }


    const destination =
      request.destination;


    /*
     * JavaScript and CSS must always check the network first.
     * This prevents old/new frontend file combinations.
     */

    if (
      destination === "script" ||
      destination === "style"
    ) {

      event.respondWith(
        networkFirst(
          request,
          false
        )
      );

      return;
    }


    /*
     * Images and fonts rarely change and can safely use
     * cached copies for faster rendering.
     */

    if (
      destination === "image" ||
      destination === "font"
    ) {

      event.respondWith(
        cacheFirst(
          request
        )
      );

      return;
    }


    /*
     * Other same-origin GET requests use network-first.
     */

    event.respondWith(
      networkFirst(
        request,
        false
      )
    );
  }
);


/*
 * ------------------------------------------------------------
 * NETWORK-FIRST
 * ------------------------------------------------------------
 */

async function networkFirst(
  request,
  isNavigation
) {

  const cacheKey =
    getCacheKey(
      request
    );


  try {

    const response =
      await fetch(
        request,
        {
          cache:
            "no-store"
        }
      );


    if (
      response &&
      response.ok &&
      response.type !==
        "opaque"
    ) {

      const cache =
        await caches.open(
          CACHE_NAME
        );


      await cache.put(
        cacheKey,
        response.clone()
      );
    }


    return response;

  } catch (error) {

    const cachedResponse =
      await caches.match(
        cacheKey
      );


    if (cachedResponse) {

      return cachedResponse;
    }


    if (isNavigation) {

      const cachedIndex =
        await caches.match(
          getAbsoluteUrl(
            "./index.html"
          )
        );


      if (cachedIndex) {

        return cachedIndex;
      }
    }


    return createOfflineResponse();
  }
}


/*
 * ------------------------------------------------------------
 * CACHE-FIRST FOR IMAGES AND FONTS
 * ------------------------------------------------------------
 */

async function cacheFirst(request) {

  const cacheKey =
    getCacheKey(
      request
    );


  const cachedResponse =
    await caches.match(
      cacheKey
    );


  if (cachedResponse) {

    return cachedResponse;
  }


  try {

    const response =
      await fetch(
        request,
        {
          cache:
            "no-cache"
        }
      );


    if (
      response &&
      response.ok &&
      response.type !==
        "opaque"
    ) {

      const cache =
        await caches.open(
          CACHE_NAME
        );


      await cache.put(
        cacheKey,
        response.clone()
      );
    }


    return response;

  } catch (error) {

    return createOfflineResponse();
  }
}


/*
 * ------------------------------------------------------------
 * NORMALIZED CACHE KEY
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
 * ABSOLUTE URL
 * ------------------------------------------------------------
 */

function getAbsoluteUrl(path) {

  return new URL(
    path,
    self.location.href
  ).href;
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
      status:
        503,

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
