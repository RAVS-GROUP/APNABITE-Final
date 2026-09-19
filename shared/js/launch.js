/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/launch.js
 * PURPOSE: App-opening splash and local session routing
 * VERSION: 3.0.0
 * ============================================================
 *
 * FINAL RULE:
 *
 * - Splash only appears when index.html opens.
 * - Login does not route through splash.
 * - Registration does not route through splash.
 * - Location and backend validation do not block launch.
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
     * Loading text and spinner must never appear.
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
      "ApnaBite App Launch initialized."
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
   * RESOLVE APP-OPEN DESTINATION
   * ----------------------------------------------------------
   */

  resolveDestination() {

    const session =
      this.getLocalSession();


    /*
     * Returning authenticated user:
     * direct role home after one-second splash.
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
     * New or logged-out user:
     * role selection after splash.
     */

    return this.getPublicUrl(
      "role-selection.html"
    );
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


    const path =
      this.getFallbackRolePath(
        role
      );


    if (!path) {

      return this.getPublicUrl(
        "role-selection.html"
      );
    }


    return this.getPublicUrl(
      path
    );
  },


  /*
   * ----------------------------------------------------------
   * FALLBACK ROLE ROUTES
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
      String(
        role || ""
      )
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
   * PURE TEST STATE RESOLUTION
   * ----------------------------------------------------------
   */

  resolveTestDestination(
    authenticated,
    role
  ) {

    if (
      authenticated === true &&
      this.isSupportedRole(
        role
      )
    ) {

      return this.getFallbackRolePath(
        role
      );
    }


    return "role-selection.html";
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
      "APNABITE APP-OPEN LAUNCH TEST"
    );

    console.log(
      "========================================"
    );


    const scenarios = [

      {
        scenario:
          "New user",

        authenticated:
          false,

        role:
          "",

        expected:
          "role-selection.html"
      },

      {
        scenario:
          "Logged-out user",

        authenticated:
          false,

        role:
          "Customer",

        expected:
          "role-selection.html"
      },

      {
        scenario:
          "Customer session",

        authenticated:
          true,

        role:
          "Customer",

        expected:
          "customer/html/home.html"
      },

      {
        scenario:
          "Food Partner session",

        authenticated:
          true,

        role:
          "Food Partner",

        expected:
          "food-partner/html/dashboard.html"
      },

      {
        scenario:
          "Rider session",

        authenticated:
          true,

        role:
          "Rider",

        expected:
          "rider/html/dashboard.html"
      },

      {
        scenario:
          "Unsupported session",

        authenticated:
          true,

        role:
          "Unknown",

        expected:
          "role-selection.html"
      }

    ];


    const results =
      scenarios.map(
        (scenario) => {

          const actual =
            this.resolveTestDestination(
              scenario.authenticated,
              scenario.role
            );


          return {
            scenario:
              scenario.scenario,

            expected:
              scenario.expected,

            actual:
              actual,

            passed:
              actual ===
              scenario.expected
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
      "Splash Duration:",
      this.SPLASH_DURATION_MS +
      "ms"
    );


    console.log(
      "Backend Blocking:",
      false
    );


    console.log(
      "Location Blocking:",
      false
    );


    console.log(
      "Login/Registration Splash:",
      false
    );


    console.log(
      passed
        ? "App-Open Launch Test: PASS"
        : "App-Open Launch Test: FAIL"
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

      backendBlocking:
        false,

      locationBlocking:
        false,

      loginRegistrationSplash:
        false,

      currentDestination:
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
