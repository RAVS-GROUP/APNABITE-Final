/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/launch.js
 * PURPOSE: Splash and first-launch navigation controller
 * VERSION: 1.0.0
 * ============================================================
 */

const LaunchController = {

  MINIMUM_SPLASH_MS:
    1000,

  REDIRECT_DELAY_MS:
    500,

  startedAt:
    0,

  redirecting:
    false,

  elements: {
    splash: null,
    status: null,
    locationScreen: null
  },


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


    document.addEventListener(
      "apnabite:app-ready",
      (event) => {

        this.handleApplicationReady(
          event.detail || {}
        );
      }
    );


    document.addEventListener(
      "apnabite:location-ready",
      () => {

        this.handleLocationReady();
      }
    );


    this.connectManualLocationResult();


    console.log(
      "ApnaBite Launch Controller initialized."
    );
  },


  hasSavedLocation() {

    const manualLocation =
      ServiceLocation.getSaved();

    if (manualLocation) {
      return true;
    }


    const deviceLocation =
      LocationManager.getSaved();

    return Boolean(
      deviceLocation &&
      LocationManager.isFresh(
        deviceLocation
      )
    );
  },


  async handleApplicationReady(
    appState
  ) {

    if (this.redirecting) {
      return;
    }


    if (
      appState.authenticated === true
    ) {

      /*
       * Role home pages will be connected in Step 10D-B2.
       * Until then, preserve the authenticated session and
       * continue through the safe launch flow.
       */

      this.setStatus(
        "Welcome back to ApnaBite"
      );
    }


    if (
      this.hasSavedLocation()
    ) {

      this.setStatus(
        "Location ready"
      );

      await this.waitForMinimumSplash();

      this.goToRoleSelection();

      return;
    }


    this.setStatus(
      "Select your location to continue"
    );

    await this.waitForMinimumSplash();

    this.showLocationScreen();
  },


  handleLocationReady() {

    if (
      !this.hasSavedLocation()
    ) {
      return;
    }


    this.setStatus(
      "Location saved successfully"
    );


    window.setTimeout(
      () => {

        this.goToRoleSelection();
      },
      this.REDIRECT_DELAY_MS
    );
  },


  connectManualLocationResult() {

    if (
      typeof LocationUI ===
        "undefined" ||
      typeof LocationUI
        .handleManualSelection !==
        "function"
    ) {

      return;
    }


    const originalHandler =
      LocationUI
        .handleManualSelection
        .bind(
          LocationUI
        );


    LocationUI.handleManualSelection =
      async () => {

        const result =
          await originalHandler();


        if (
          result &&
          result.success === true
        ) {

          document.dispatchEvent(
            new CustomEvent(
              "apnabite:location-ready",
              {
                detail: {
                  source:
                    "MANUAL",

                  district:
                    result.district
                }
              }
            )
          );
        }


        return result;
      };
  },


  showLocationScreen() {

    if (
      this.elements.locationScreen
    ) {

      this.elements.locationScreen
        .classList.remove(
          "hidden"
        );
    }


    this.hideSplash();
  },


  hideSplash() {

    if (!this.elements.splash) {
      return;
    }


    this.elements.splash
      .classList.add(
        "launch-exit"
      );


    window.setTimeout(
      () => {

        this.elements.splash
          .classList.add(
            "hidden"
          );
      },
      300
    );
  },


  goToRoleSelection() {

    if (this.redirecting) {
      return;
    }


    this.redirecting =
      true;


    window.location.replace(
      "role-selection.html"
    );
  },


  setStatus(message) {

    if (
      this.elements.status
    ) {

      this.elements.status
        .textContent =
          message;
    }
  },


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


  resolveLaunchState(options = {}) {

    const authenticated =
      options.authenticated === true;

    const locationReady =
      options.locationReady === true;


    if (
      authenticated &&
      locationReady
    ) {

      return {
        state:
          "AUTHENTICATED_ROLE_PENDING",
        destination:
          "ROLE_HOME"
      };
    }


    if (locationReady) {

      return {
        state:
          "LOCATION_READY",
        destination:
          "role-selection.html"
      };
    }


    return {
      state:
        "LOCATION_REQUIRED",
      destination:
        "LOCATION_SCREEN"
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
      "APNABITE LAUNCH CONTROLLER TEST"
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

          locationReady:
            false
        },

        expected:
          "LOCATION_SCREEN"
      },

      {
        name:
          "Guest with saved location",

        input: {
          authenticated:
            false,

          locationReady:
            true
        },

        expected:
          "role-selection.html"
      },

      {
        name:
          "Authenticated returning user",

        input: {
          authenticated:
            true,

          locationReady:
            true
        },

        expected:
          "ROLE_HOME"
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
        ? "Launch Controller Test: PASS"
        : "Launch Controller Test: FAIL"
    );


    return {
      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      savedLocation:
        this.hasSavedLocation(),

      results:
        results
    };
  }

};


document.addEventListener(
  "DOMContentLoaded",
  () => {

    LaunchController.init();
  }
);
