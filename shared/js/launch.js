/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/launch.js
 * PURPOSE: Fast splash and session-based launch routing
 * VERSION: 2.1.0
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


    /*
     * Splash par loading text aur spinner nahi dikhayenge.
     * Sirf ApnaBite branding approximately one second rahegi.
     */

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


    /*
     * Launch routing backend, API health check or location
     * detection ka wait nahi karti.
     */

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


    if (!session) {

      return this.getPublicUrl(
        "role-selection.html"
      );
    }


    const role =
      this.getSessionRole(
        session
      );


    if (
      !role ||
      !this.isSupportedRole(
        role
      )
    ) {

      return this.getPublicUrl(
        "role-selection.html"
      );
    }


    return this.getRoleHomeUrl(
      role
    );
  },


  /*
   * ----------------------------------------------------------
   * GET LOCAL SESSION
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
   * GET SESSION ROLE
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
   * FALLBACK ROLE PATH
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
   * ROUTING TEST
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


    const tests = [

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
      tests.map(
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

      destination:
        this.resolveDestination(),

      results:
        results
    };
  }

};


/*
 * ------------------------------------------------------------
 * START IMMEDIATELY WHEN DOM IS AVAILABLE
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
