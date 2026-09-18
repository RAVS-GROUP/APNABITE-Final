/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/app-router.js
 * PURPOSE: Central role-based frontend routing
 * VERSION: 1.1.0
 * ============================================================
 */

const AppRouter = {

  /*
   * ----------------------------------------------------------
   * ROLE HOME ROUTES
   *
   * All role HTML pages remain inside their respective
   * role/html folders.
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
   * FIND APPLICATION ROOT URL
   *
   * Examples:
   *
   * /APNABITE-Final/index.html
   * /APNABITE-Final/customer/html/orders.html
   * /APNABITE-Final/food-partner/html/dashboard.html
   *
   * All resolve to:
   *
   * /APNABITE-Final/
   * ----------------------------------------------------------
   */

  getAppBaseUrl() {

    const url =
      new URL(
        window.location.href
      );


    const roleFolders = [
      "/customer/",
      "/food-partner/",
      "/rider/",
      "/admin/"
    ];


    for (
      const folder of roleFolders
    ) {

      const position =
        url.pathname.indexOf(
          folder
        );


      if (
        position !== -1
      ) {

        url.pathname =
          url.pathname.substring(
            0,
            position + 1
          );

        url.search = "";
        url.hash = "";


        return url;
      }
    }


    url.pathname =
      url.pathname.substring(
        0,
        url.pathname.lastIndexOf("/") + 1
      );

    url.search = "";
    url.hash = "";


    return url;
  },


  /*
   * ----------------------------------------------------------
   * GET ROLE HOME PATH
   * ----------------------------------------------------------
   */

  getHomePath(role) {

    return this.ROLE_ROUTES[
      String(role || "")
        .trim()
    ] || "";
  },


  /*
   * ----------------------------------------------------------
   * GET ROLE HOME URL
   * ----------------------------------------------------------
   */

  getHomeUrl(role) {

    const path =
      this.getHomePath(
        role
      );


    if (!path) {

      return "";
    }


    return new URL(
      path,
      this.getAppBaseUrl()
    ).href;
  },


  /*
   * ----------------------------------------------------------
   * GET PUBLIC PAGE URL
   * ----------------------------------------------------------
   */

  getPublicUrl(fileName) {

    return new URL(
      String(fileName || ""),
      this.getAppBaseUrl()
    ).href;
  },


  /*
   * ----------------------------------------------------------
   * CHECK SUPPORTED ROLE
   * ----------------------------------------------------------
   */

  isSupportedRole(role) {

    return Boolean(
      this.getHomePath(
        role
      )
    );
  },


  /*
   * ----------------------------------------------------------
   * CHECK WHETHER URL BELONGS TO THIS APPLICATION
   * ----------------------------------------------------------
   */

  isInternalAppUrl(value) {

    if (!value) {

      return false;
    }


    try {

      const destination =
        new URL(
          value,
          this.getAppBaseUrl()
        );


      const appBase =
        this.getAppBaseUrl();


      return (
        destination.origin ===
          appBase.origin &&
        destination.pathname.indexOf(
          appBase.pathname
        ) === 0
      );

    } catch (error) {

      return false;
    }
  },


  /*
   * ----------------------------------------------------------
   * GET SAFE RETURN URL
   *
   * Prevents redirects outside ApnaBite.
   * ----------------------------------------------------------
   */

  getSafeReturnUrl(value) {

    if (
      !this.isInternalAppUrl(
        value
      )
    ) {

      return "";
    }


    const destination =
      new URL(
        value,
        this.getAppBaseUrl()
      );


    const loginUrl =
      this.getPublicUrl(
        "login.html"
      );


    /*
     * Never use the login page itself as a return destination.
     */

    if (
      destination.pathname ===
      new URL(loginUrl).pathname
    ) {

      return "";
    }


    return destination.href;
  },


  /*
   * ----------------------------------------------------------
   * GET RETURN URL FROM CURRENT QUERY STRING
   * ----------------------------------------------------------
   */

  getRequestedReturnUrl() {

    const currentUrl =
      new URL(
        window.location.href
      );


    const returnUrl =
      currentUrl.searchParams.get(
        "returnUrl"
      );


    return this.getSafeReturnUrl(
      returnUrl
    );
  },


  /*
   * ----------------------------------------------------------
   * GO TO ROLE HOME
   * ----------------------------------------------------------
   */

  goToRoleHome(
    role,
    replace = true
  ) {

    const destination =
      this.getHomeUrl(
        role
      );


    if (!destination) {

      throw new Error(
        "Unsupported user role: " +
        String(role || "")
      );
    }


    this.navigate(
      destination,
      replace
    );
  },


  /*
   * ----------------------------------------------------------
   * GO TO REQUESTED PAGE AFTER LOGIN
   *
   * If a valid returnUrl exists, the user returns to that page.
   * Otherwise, the correct role home page is opened.
   * ----------------------------------------------------------
   */

  goAfterLogin(
    role,
    replace = true
  ) {

    const returnUrl =
      this.getRequestedReturnUrl();


    if (returnUrl) {

      this.navigate(
        returnUrl,
        replace
      );

      return {
        success: true,
        destination:
          returnUrl,
        usedReturnUrl:
          true
      };
    }


    const homeUrl =
      this.getHomeUrl(
        role
      );


    if (!homeUrl) {

      throw new Error(
        "Unsupported user role: " +
        String(role || "")
      );
    }


    this.navigate(
      homeUrl,
      replace
    );


    return {
      success: true,
      destination:
        homeUrl,
      usedReturnUrl:
        false
    };
  },


  /*
   * ----------------------------------------------------------
   * GO TO ROLE SELECTION
   * ----------------------------------------------------------
   */

  goToRoleSelection(
    replace = true
  ) {

    const destination =
      this.getPublicUrl(
        "role-selection.html"
      );


    this.navigate(
      destination,
      replace
    );
  },


  /*
   * ----------------------------------------------------------
   * GO TO LOGIN
   *
   * Protected pages are stored as returnUrl so the user can
   * return to the same page after successful login.
   * ----------------------------------------------------------
   */

  goToLogin(
    role = "",
    replace = true,
    returnUrl = ""
  ) {

    const url =
      new URL(
        this.getPublicUrl(
          "login.html"
        )
      );


    if (role) {

      url.searchParams.set(
        "role",
        String(role)
      );
    }


    const requestedReturnUrl =
      returnUrl ||
      window.location.href;


    const safeReturnUrl =
      this.getSafeReturnUrl(
        requestedReturnUrl
      );


    if (safeReturnUrl) {

      url.searchParams.set(
        "returnUrl",
        safeReturnUrl
      );
    }


    this.navigate(
      url.href,
      replace
    );
  },


  /*
   * ----------------------------------------------------------
   * CENTRAL NAVIGATION
   * ----------------------------------------------------------
   */

  navigate(
    destination,
    replace = true
  ) {

    if (!destination) {

      throw new Error(
        "Navigation destination is required."
      );
    }


    if (replace) {

      window.location.replace(
        destination
      );

    } else {

      window.location.href =
        destination;
    }
  },


  /*
   * ----------------------------------------------------------
   * APP ROUTER TEST
   *
   * Browser console:
   * AppRouter.test()
   * ----------------------------------------------------------
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE APP ROUTER TEST"
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
          "Unknown",

        expected:
          ""
      }
    ];


    const results =
      tests.map(
        (test) => {

          const actual =
            this.getHomePath(
              test.role
            );


          return {
            role:
              test.role,

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


    const baseUrl =
      this.getAppBaseUrl();


    const customerHomeUrl =
      this.getHomeUrl(
        "Customer"
      );


    const baseUrlPassed =
      customerHomeUrl.indexOf(
        "/customer/html/home.html"
      ) !== -1;


    results.push({

      role:
        "Customer URL",

      expected:
        "/customer/html/home.html",

      actual:
        new URL(
          customerHomeUrl
        ).pathname,

      passed:
        baseUrlPassed
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
      "Application Base URL:",
      baseUrl.href
    );


    console.log(
      passed
        ? "App Router Test: PASS"
        : "App Router Test: FAIL"
    );


    return {

      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      baseUrl:
        baseUrl.href,

      results:
        results
    };
  }

};
