/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/role-home.js
 * PURPOSE: Secure role home initialization and access guard
 * VERSION: 1.0.0
 * ============================================================
 */

const RoleHome = {

  requiredRole:
    "",

  elements: {},


  async init() {

    this.requiredRole =
      document.body.dataset
        .requiredRole || "";


    this.elements = {

      loader:
        document.getElementById(
          "roleHomeLoader"
        ),

      content:
        document.getElementById(
          "roleHomeContent"
        ),

      userRole:
        document.getElementById(
          "roleHomeUserRole"
        ),

      userMobile:
        document.getElementById(
          "roleHomeUserMobile"
        ),

      logoutButton:
        document.getElementById(
          "roleLogoutButton"
        ),

      message:
        document.getElementById(
          "roleHomeMessage"
        )
    };


    this.elements.logoutButton
      .addEventListener(
        "click",
        () => {

          this.logout();
        }
      );


    await this.validateAccess();
  },


  async validateAccess() {

    const localSession =
      SessionManager.get();


    if (!localSession) {

      AppRouter.goToLogin(
        this.requiredRole
      );

      return {
        success: false,
        reason:
          "LOCAL_SESSION_NOT_FOUND"
      };
    }


    try {

      const restoration =
        await Auth.restoreSession();


      if (
        restoration.success !== true ||
        restoration.authenticated !== true
      ) {

        AppRouter.goToLogin(
          this.requiredRole
        );

        return {
          success: false,
          reason:
            restoration.reason ||
            "SESSION_INVALID"
        };
      }


      const user =
        restoration.user;


      if (
        !user ||
        user.role !==
          this.requiredRole
      ) {

        const actualRole =
          user
            ? user.role
            : "";


        if (
          AppRouter.isSupportedRole(
            actualRole
          )
        ) {

          AppRouter.goToRoleHome(
            actualRole
          );

        } else {

          AppRouter.goToRoleSelection();
        }


        return {
          success: false,
          reason:
            "ROLE_ACCESS_DENIED",
          requiredRole:
            this.requiredRole,
          actualRole:
            actualRole
        };
      }


      this.showHome(
        user
      );


      console.log(
        this.requiredRole +
        " Home Access: PASS"
      );


      return {
        success: true,
        authenticated: true,
        role:
          user.role,
        user:
          user
      };

    } catch (error) {

      /*
       * Network failure does not immediately destroy
       * a locally stored session.
       */

      if (
        error.code ===
          "NETWORK_ERROR" ||
        error.code ===
          "REQUEST_TIMEOUT"
      ) {

        const localUser =
          Auth.getUser();


        if (
          localUser &&
          localUser.role ===
            this.requiredRole
        ) {

          this.showHome(
            localUser,
            true
          );


          return {
            success: true,
            authenticated:
              true,
            offline:
              true,
            role:
              localUser.role
          };
        }
      }


      this.showError(
        error.message ||
        "Unable to verify your session."
      );


      return {
        success: false,
        error:
          error.message,
        code:
          error.code || ""
      };
    }
  },


  showHome(
    user,
    offline = false
  ) {

    this.elements.userRole
      .textContent =
        user.role ||
        this.requiredRole;


    this.elements.userMobile
      .textContent =
        user.mobile
          ? "+91 " +
            user.mobile
          : "Verified user";


    this.elements.loader
      .classList.add(
        "hidden"
      );


    this.elements.content
      .classList.remove(
        "hidden"
      );


    if (offline) {

      this.elements.message
        .textContent =
          "Offline mode: some live features may be unavailable.";

      this.elements.message
        .classList.remove(
          "hidden"
        );
    }
  },


  showError(message) {

    this.elements.loader
      .classList.add(
        "hidden"
      );


    this.elements.message
      .textContent =
        message;

    this.elements.message
      .classList.remove(
        "hidden"
      );
  },


  async logout() {

    this.elements.logoutButton
      .disabled =
        true;


    try {

      await Auth.logout();

    } finally {

      AppStorage.remove(
        "apnabite_selected_role"
      );

      window.location.replace(
        AppRouter.getPublicUrl(
          "index.html"
        )
      );
    }
  },


  /*
   * Browser console:
   * RoleHome.test()
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE ROLE HOME TEST"
    );

    console.log(
      "========================================"
    );


    const supported =
      AppRouter.isSupportedRole(
        this.requiredRole
      );


    const contentFound =
      Boolean(
        this.elements.content
      );


    const logoutFound =
      Boolean(
        this.elements.logoutButton
      );


    const passed =
      supported &&
      contentFound &&
      logoutFound;


    console.log(
      passed
        ? "Role Home Test: PASS"
        : "Role Home Test: FAIL"
    );


    return {
      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      requiredRole:
        this.requiredRole,

      sessionRole:
        Auth.getRole(),

      authenticated:
        Auth.isLoggedIn()
    };
  }

};


document.addEventListener(
  "DOMContentLoaded",
  () => {

    RoleHome.init();
  }
);
