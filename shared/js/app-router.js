/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/app-router.js
 * PURPOSE: Central role-based frontend routing
 * VERSION: 1.0.0
 * ============================================================
 */

const AppRouter = {

  ROLE_ROUTES: {
    Customer:
      "customer/home.html",

    "Food Partner":
      "food-partner/dashboard.html",

    Rider:
      "rider/dashboard.html"
  },


  getAppBaseUrl() {

    const url =
      new URL(
        window.location.href
      );

    const roleFolders = [
      "/customer/",
      "/food-partner/",
      "/rider/"
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


  getHomePath(role) {

    return this.ROLE_ROUTES[
      String(role || "")
    ] || "";
  },


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


  getPublicUrl(fileName) {

    return new URL(
      fileName,
      this.getAppBaseUrl()
    ).href;
  },


  isSupportedRole(role) {

    return Boolean(
      this.getHomePath(
        role
      )
    );
  },


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


    if (replace) {

      window.location.replace(
        destination
      );

    } else {

      window.location.href =
        destination;
    }
  },


  goToRoleSelection(
    replace = true
  ) {

    const destination =
      this.getPublicUrl(
        "role-selection.html"
      );


    if (replace) {

      window.location.replace(
        destination
      );

    } else {

      window.location.href =
        destination;
    }
  },


  goToLogin(
    role = "",
    replace = true
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
        role
      );
    }


    if (replace) {

      window.location.replace(
        url.href
      );

    } else {

      window.location.href =
        url.href;
    }
  },


  /*
   * Browser console:
   * AppRouter.test()
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
          "customer/home.html"
      },

      {
        role:
          "Food Partner",

        expected:
          "food-partner/dashboard.html"
      },

      {
        role:
          "Rider",

        expected:
          "rider/dashboard.html"
      },

      {
        role:
          "Admin",

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
        this.getAppBaseUrl()
          .href,

      results:
        results
    };
  }

};
