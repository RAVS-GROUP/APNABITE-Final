/**
 * ============================================================
 * APNABITE SERVICE WORKER
 * FILE: sw.js
 * PURPOSE: Version-safe caching and offline support
 * VERSION: 10.0.0
 * ============================================================
 */

const CACHE_NAME =
  "apnabite-static-v10";


/*
 * ------------------------------------------------------------
 * OFFLINE APPLICATION SHELL
 * ------------------------------------------------------------
 */

const STATIC_ASSETS = [

  "./",
  "./index.html",
  "./manifest.json",

  /*
   * Shared image
   */

  "./shared/assets/images/apnabite-logo.webp",

  /*
   * Shared CSS
   */

  "./shared/css/reset.css",
  "./shared/css/variables.css",
  "./shared/css/common.css",
  "./shared/css/components.css",
  "./shared/css/launch.css",
  "./shared/css/responsive.css",

  /*
   * Shared JavaScript
   */

  "./shared/js/storage.js",
  "./shared/js/cache.js",
  "./shared/js/api.js",
  "./shared/js/session.js",
  "./shared/js/auth.js",
  "./shared/js/location.js",
  "./shared/js/service-location.js",
  "./shared/js/app-router.js",
  "./shared/js/role-home.js",
  "./shared/js/launch.js",

  /*
   * Customer pages
   */

  "./customer/html/home.html",
  "./customer/html/addresses.html",
  "./customer/html/orders.html",
  "./customer/html/dine-in.html",
  "./customer/html/account.html",

  /*
   * Customer CSS
   */

  "./customer/css/customer-common.css",
  "./customer/css/home.css",
  "./customer/css/addresses.css",
  "./customer/css/orders.css",
  "./customer/css/dine-in.css",
  "./customer/css/account.css",

  /*
   * Customer JavaScript
   */

  "./customer/js/serviceability-guard.js",
  "./customer/js/home.js",
  "./customer/js/addresses.js",
  "./customer/js/orders.js",
  "./customer/js/dine-in.js",
  "./customer/js/account.js"

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
 * Delete older ApnaBite caches so different frontend versions
 * cannot run together.
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
      request.method !==
      "GET"
    ) {
      return;
    }


    const requestUrl =
      new URL(
        request.url
      );


    /*
     * Google Apps Script API and all external services bypass
     * the Service Worker.
     */

    if (
      requestUrl.origin !==
      self.location.origin
    ) {
      return;
    }


    /*
     * HTML navigation always checks the latest deployment.
     */

    if (
      request.mode ===
      "navigate"
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
     * JavaScript and CSS use network-first to prevent mixed
     * frontend versions.
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
     * Images and fonts use cache-first.
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
 * CACHE-FIRST
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


  url.search =
    "";

  url.hash =
    "";


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
