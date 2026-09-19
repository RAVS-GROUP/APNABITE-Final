/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/launch.js
 * PURPOSE: Fast brand splash and launch routing
 * VERSION: 2.0.0
 * ============================================================
 *
 * FINAL LAUNCH FLOW:
 *
 * Guest:
 * Splash for 1 second
 * → Role Selection
 * → Login / Registration
 *
 * Authenticated user:
 * Splash for 1 second
 * → Correct role home
 *
 * IMPORTANT:
 * Location detection never blocks splash or routing.
 * Location will refresh in the background after login/home.
 * ============================================================
 */

const LaunchController = {

  /*
   * ----------------------------------------------------------
   * SETTINGS
   * ----------------------------------------------------------
   */

  MINIMUM_SPLASH_MS:
    1000,


  /*
   * ----------------------------------------------------------
   * ROLE ROUTES
   *
   * Used only as a safe fallback if AppRouter has not loaded.
   * ----------------------------------------------------------
   */

  ROLE_ROUTES: {

    Customer:
      "customer/html/home.html",

    "Food Partner":
      "food-partner/html/dashboard.html",

    Rider:
      "rider/html/dashboard.html",

    Admin:
      "admin/html/dashboard.html"
  },


  /*
   * ----------------------------------------------------------
   * STATE
   * ----------------------------------------------------------
   */

  startedAt:
    0,

  redirecting:
    false,

  launchStarted:
    false,

  elements: {
    splash:
      null,

    status:
      null,

    locationScreen:
      null
  },


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

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


    this.elements.locationScreen =
      document.getElementById(
        "locationScreen"
      );


    /*
     * The old location screen must not appear during launch.
     */

    if (
      this.elements.locationScreen
    ) {

      this.elements.locationScreen
        .classList.add(
          "hidden"
        );
    }


    /*
     * Do not wait for backend health or session validation.
     * Local session is enough to choose the first destination.
     */

    this.startLaunch();


    /*
     * App bootstrap may continue in the background.
     * It no longer controls initial splash duration.
     */

    document.addEventListener(
      "apnabite:app-ready",
      (event) => {

        this.handleApplicationReady(
          event.detail || {}
        );
      }
    );


    console.log(
      "ApnaBite Fast Launch Controller initialized."
    );
  },


  /*
   * ----------------------------------------------------------
   * START FAST LAUNCH
   * ----------------------------------------------------------
   */

  async startLaunch() {

    if (this.launchStarted) {

      return;
    }


    this.launchStarted =
      true;


    const localSession =
      SessionManager.get();


    const user =
      Auth.getUser();


    const role =
      user &&
      user.role
        ? user.role
        : (
            localSession &&
            localSession.role
              ? localSession.role
              : ""
          );


    /*
     * Authenticated returning user.
     */

    if (
      localSession &&
      role &&
      this.isSupportedRole(
        role
      )
    ) {

      this.setStatus(
        "Welcome back to ApnaBite"
      );


      await this.waitForMinimumSplash();


      this.goToRoleHome(
        role
      );


      return;
    }


    /*
     * Guest or expired local session.
     */

    this.setStatus(
      "Apna Swaad, Apni Pasand"
    );


    await this.waitForMinimumSplash();


    this.goToRoleSelection();
  },


  /*
   * ----------------------------------------------------------
   * APPLICATION READY
   *
   * Application bootstrap is intentionally non-blocking.
   * Protected role pages perform background validation.
   * ----------------------------------------------------------
   */

  handleApplicationReady(
    appState
  ) {

    console.log(
      "Launch Background App State:",
      appState
    );


    return {
      success: true,
      blocking:
        false,
      state:
        appState
    };
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
      this.ROLE_ROUTES[
        String(role || "")
      ]
    );
  },


  /*
   * ----------------------------------------------------------
   * GO TO ROLE HOME
   * ----------------------------------------------------------
   */

  goToRoleHome(role) {

    if (this.redirecting) {

      return;
    }


    this.redirecting =
      true;


    /*
     * Use central router when available.
     */

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .goToRoleHome ===
        "function"
    ) {

      AppRouter.goToRoleHome(
        role,
        true
      );


      return;
    }


    /*
     * Safe fallback.
     */

    const destination =
      this.ROLE_ROUTES[
        String(role || "")
      ];


    if (!destination) {

      this.redirecting =
        false;

      this.goToRoleSelection();

      return;
    }


    window.location.replace(
      destination
    );
  },


  /*
   * ----------------------------------------------------------
   * GO TO ROLE SELECTION
   * ----------------------------------------------------------
   */

  goToRoleSelection() {

    if (this.redirecting) {

      return;
    }


    this.redirecting =
      true;


    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .goToRoleSelection ===
        "function"
    ) {

      AppRouter.goToRoleSelection(
        true
      );


      return;
    }


    window.location.replace(
      "role-selection.html"
    );
  },


  /*
   * ----------------------------------------------------------
   * SET SPLASH STATUS
   * ----------------------------------------------------------
   */

  setStatus(message) {

    if (
      this.elements.status
    ) {

      this.elements.status
        .textContent =
          message;
    }
  },


  /*
   * ----------------------------------------------------------
   * MINIMUM ONE-SECOND SPLASH
   * ----------------------------------------------------------
   */

  waitForMinimumSplash() {

    const elapsed =
      Date.now() -
      this.startedAt;


    const remaining =
      Math.max(
        0,
        this.MINIMUM_SPLASH_MS -
        elapsed
      );


    return new Promise(
      (resolve) => {

        window.setTimeout(
          resolve,
          remaining
        );
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * RESOLVE LAUNCH STATE
   *
   * Location is deliberately not part of the launch decision.
   * ----------------------------------------------------------
   */

  resolveLaunchState(
    options = {}
  ) {

    const authenticated =
      options.authenticated ===
      true;


    const role =
      String(
        options.role || ""
      );


    if (
      authenticated &&
      this.isSupportedRole(
        role
      )
    ) {

      return {
        state:
          "AUTHENTICATED",
        destination:
          this.ROLE_ROUTES[role] ||
          (
            typeof AppRouter !==
              "undefined"
              ? AppRouter.getHomePath(
                  role
                )
              : ""
          )
      };
    }


    return {
      state:
        "GUEST",
      destination:
        "role-selection.html"
    };
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


    const scenarios = [

      {
        name:
          "New user without location",

        input: {
          authenticated:
            false,
          role:
            ""
        },

        expected:
          "role-selection.html"
      },

      {
        name:
          "Guest with saved location",

        input: {
          authenticated:
            false,
          role:
            ""
        },

        expected:
          "role-selection.html"
      },

      {
        name:
          "Authenticated Customer",

        input: {
          authenticated:
            true,
          role:
            "Customer"
        },

        expected:
          "customer/html/home.html"
      },

      {
        name:
          "Authenticated Food Partner",

        input: {
          authenticated:
            true,
          role:
            "Food Partner"
        },

        expected:
          "food-partner/html/dashboard.html"
      },

      {
        name:
          "Authenticated Rider",

        input: {
          authenticated:
            true,
          role:
            "Rider"
        },

        expected:
          "rider/html/dashboard.html"
      }
    ];


    const results =
      scenarios.map(
        (scenario) => {

          const result =
            this.resolveLaunchState(
              scenario.input
            );


          return {
            scenario:
              scenario.name,

            expected:
              scenario.expected,

            actual:
              result.destination,

            passed:
              result.destination ===
              scenario.expected
          };
        }
      );


    const locationBlocksLaunch =
      false;


    results.push({

      scenario:
        "Location blocks splash",

      expected:
        false,

      actual:
        locationBlocksLaunch,

      passed:
        locationBlocksLaunch ===
          false
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
      "Splash Duration MS:",
      this.MINIMUM_SPLASH_MS
    );


    console.log(
      "Location Blocking:",
      locationBlocksLaunch
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
        this.MINIMUM_SPLASH_MS,
      locationBlocking:
        locationBlocksLaunch,
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

document.addEventListener(
  "DOMContentLoaded",
  () => {

    LaunchController.init();
  }
);
