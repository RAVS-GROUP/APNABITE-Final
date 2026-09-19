/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/launch.js
 * PURPOSE: Fast splash and safe launch routing
 * VERSION: 2.2.0
 * ============================================================
 */

const LaunchController = {

  SPLASH_DURATION_MS:
    1000,

  started:
    false,

  redirecting:
    false,

  startedAt:
    0,

  elements: {
    splash: null,
    status: null,
    spinner: null
  },


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    if (this.started) {
      return;
    }


    this.started =
      true;

    this.startedAt =
      Date.now();


    this.elements.splash =
      document.getElementById(
        "launchSplash"
      );

    this.elements.status =
      document.getElementById(
        "launchStatusText"
      );

    this.elements.spinner =
      document.querySelector(
        ".launch-spinner"
      );


    if (
      this.elements.status &&
      this.elements.status.parentElement
    ) {

      this.elements.status
        .parentElement
        .style.display =
          "none";
    }


    if (this.elements.spinner) {

      this.elements.spinner
        .style.display =
          "none";
    }


    console.log(
      "ApnaBite Fast Launch initialized."
    );


    this.startRouting();
  },


  /*
   * ----------------------------------------------------------
   * START ROUTING
   * ----------------------------------------------------------
   */

  startRouting() {

    const destination =
      this.resolveDestination();


    const elapsed =
      Date.now() -
      this.startedAt;


    const remaining =
      Math.max(
        0,
        this.SPLASH_DURATION_MS -
        elapsed
      );


    window.setTimeout(
      () => {

        this.redirect(
          destination
        );
      },
      remaining
    );
  },


  /*
   * ----------------------------------------------------------
   * RESOLVE DESTINATION
   * ----------------------------------------------------------
   */

  resolveDestination() {

    const session =
      this.getLocalSession();


    /*
     * Valid authenticated users always go to
     * their own role home.
     */

    if (session) {

      const role =
        this.getSessionRole(
          session
        );


      if (
        role &&
        this.isSupportedRole(
          role
        )
      ) {

        return this.getRoleHomeUrl(
          role
        );
      }
    }


    /*
     * Safe post-registration route:
     *
     * index.html?source=register&next=login&role=Customer
     *
     * Only the fixed "login" destination is supported.
     * Arbitrary external redirect URLs are never accepted.
     */

    const launchRequest =
      this.getLaunchRequest();


    if (
      launchRequest.next ===
        "login"
    ) {

      return this.getLoginUrl(
        launchRequest.role
      );
    }


    /*
     * Normal guest launch.
     */

    return this.getPublicUrl(
      "role-selection.html"
    );
  },


  /*
   * ----------------------------------------------------------
   * LAUNCH QUERY REQUEST
   * ----------------------------------------------------------
   */

  getLaunchRequest() {

    const parameters =
      new URLSearchParams(
        window.location.search
      );


    const next =
      String(
        parameters.get(
          "next"
        ) || ""
      )
        .trim()
        .toLowerCase();


    const role =
      String(
        parameters.get(
          "role"
        ) || ""
      )
        .trim();


    return {
      source:
        String(
          parameters.get(
            "source"
          ) || ""
        )
          .trim()
          .toLowerCase(),

      next:
        next === "login"
          ? "login"
          : "",

      role:
        this.isSupportedRole(
          role
        )
          ? role
          : ""
    };
  },


  /*
   * ----------------------------------------------------------
   * LOCAL SESSION
   * ----------------------------------------------------------
   */

  getLocalSession() {

    try {

      if (
        typeof SessionManager ===
          "undefined" ||
        typeof SessionManager.get !==
          "function"
      ) {

        return null;
      }


      return SessionManager.get();

    } catch (error) {

      console.warn(
        "Local session could not be restored:",
        error
      );


      return null;
    }
  },


  /*
   * ----------------------------------------------------------
   * SESSION ROLE
   * ----------------------------------------------------------
   */

  getSessionRole(session) {

    if (!session) {
      return "";
    }


    if (session.role) {

      return String(
        session.role
      );
    }


    if (
      session.user &&
      session.user.role
    ) {

      return String(
        session.user.role
      );
    }


    return "";
  },


  /*
   * ----------------------------------------------------------
   * SUPPORTED ROLE
   * ----------------------------------------------------------
   */

  isSupportedRole(role) {

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .isSupportedRole ===
        "function"
    ) {

      return AppRouter
        .isSupportedRole(
          role
        );
    }


    return Boolean(
      this.getFallbackRolePath(
        role
      )
    );
  },


  /*
   * ----------------------------------------------------------
   * ROLE HOME URL
   * ----------------------------------------------------------
   */

  getRoleHomeUrl(role) {

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .getHomeUrl ===
        "function"
    ) {

      const routerUrl =
        AppRouter.getHomeUrl(
          role
        );


      if (routerUrl) {

        return routerUrl;
      }
    }


    const fallbackPath =
      this.getFallbackRolePath(
        role
      );


    if (!fallbackPath) {

      return this.getPublicUrl(
        "role-selection.html"
      );
    }


    return this.getPublicUrl(
      fallbackPath
    );
  },


  /*
   * ----------------------------------------------------------
   * LOGIN URL
   * ----------------------------------------------------------
   */

  getLoginUrl(role = "") {

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .getPublicUrl ===
        "function"
    ) {

      const url =
        new URL(
          AppRouter.getPublicUrl(
            "login.html"
          )
        );


      if (
        role &&
        this.isSupportedRole(
          role
        )
      ) {

        url.searchParams.set(
          "role",
          role
        );
      }


      return url.href;
    }


    const url =
      new URL(
        "login.html",
        window.location.href
      );


    if (
      role &&
      this.isSupportedRole(
        role
      )
    ) {

      url.searchParams.set(
        "role",
        role
      );
    }


    return url.href;
  },


  /*
   * ----------------------------------------------------------
   * FALLBACK ROLE PATHS
   * ----------------------------------------------------------
   */

  getFallbackRolePath(role) {

    const routes = {

      Customer:
        "customer/html/home.html",

      "Food Partner":
        "food-partner/html/dashboard.html",

      Rider:
        "rider/html/dashboard.html",

      Admin:
        "admin/html/dashboard.html"
    };


    return routes[
      String(role || "")
    ] || "";
  },


  /*
   * ----------------------------------------------------------
   * PUBLIC URL
   * ----------------------------------------------------------
   */

  getPublicUrl(path) {

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .getPublicUrl ===
        "function"
    ) {

      return AppRouter
        .getPublicUrl(
          path
        );
    }


    return new URL(
      path,
      window.location.href
    ).href;
  },


  /*
   * ----------------------------------------------------------
   * REDIRECT
   * ----------------------------------------------------------
   */

  redirect(destination) {

    if (
      this.redirecting ||
      !destination
    ) {

      return;
    }


    this.redirecting =
      true;


    window.location.replace(
      destination
    );
  },


  /*
   * ----------------------------------------------------------
   * TEST
   *
   * Browser console:
   * LaunchController.test()
   * ----------------------------------------------------------
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE FAST LAUNCH TEST"
    );

    console.log(
      "========================================"
    );


    const routeTests = [

      {
        role:
          "Customer",

        expected:
          "customer/html/home.html"
      },

      {
        role:
          "Food Partner",

        expected:
          "food-partner/html/dashboard.html"
      },

      {
        role:
          "Rider",

        expected:
          "rider/html/dashboard.html"
      },

      {
        role:
          "Admin",

        expected:
          "admin/html/dashboard.html"
      },

      {
        role:
          "",

        expected:
          ""
      }

    ];


    const results =
      routeTests.map(
        (test) => {

          const actual =
            this.getFallbackRolePath(
              test.role
            );


          return {
            role:
              test.role ||
              "Guest",

            expected:
              test.expected,

            actual:
              actual,

            passed:
              actual ===
              test.expected
          };
        }
      );


    const loginUrl =
      this.getLoginUrl(
        "Customer"
      );


    const registrationRoutePassed =
      loginUrl.includes(
        "/login.html"
      ) &&
      loginUrl.includes(
        "role=Customer"
      );


    results.push({

      role:
        "Registration handoff",

      expected:
        "login.html?role=Customer",

      actual:
        loginUrl,

      passed:
        registrationRoutePassed
    });


    const passed =
      results.every(
        (result) =>
          result.passed
      );


    console.table(
      results
    );


    console.log(
      passed
        ? "Fast Launch Test: PASS"
        : "Fast Launch Test: FAIL"
    );


    return {
      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      splashDurationMs:
        this.SPLASH_DURATION_MS,

      waitsForBackend:
        false,

      waitsForLocation:
        false,

      registrationHandoff:
        registrationRoutePassed,

      destination:
        this.resolveDestination(),

      results:
        results
    };
  }

};


/*
 * ------------------------------------------------------------
 * INITIALIZE
 * ------------------------------------------------------------
 */

if (
  document.readyState ===
    "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      LaunchController.init();
    },
    {
      once: true
    }
  );

} else {

  LaunchController.init();
}
