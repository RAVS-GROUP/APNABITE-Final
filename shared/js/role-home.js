/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/role-home.js
 * PURPOSE: Fast secure role-page access guard
 * VERSION: 1.1.0
 * ============================================================
 *
 * PERFORMANCE FLOW:
 *
 * 1. Read local session
 * 2. Validate local role
 * 3. Show page immediately
 * 4. Validate session in background
 * 5. Repeat backend validation only after five minutes
 * ============================================================
 */

const RoleHome = {

  /*
   * ----------------------------------------------------------
   * SETTINGS
   * ----------------------------------------------------------
   */

  VALIDATION_STORAGE_KEY:
    "apnabite_session_validation",

  VALIDATION_INTERVAL_MS:
    5 * 60 * 1000,


  /*
   * ----------------------------------------------------------
   * STATE
   * ----------------------------------------------------------
   */

  requiredRole:
    "",

  validationRunning:
    false,

  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

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


    if (!this.hasRequiredElements()) {

      console.error(
        "Role page access elements are missing."
      );

      return {
        success: false,
        reason:
          "ROLE_PAGE_ELEMENTS_MISSING"
      };
    }


    if (!this.requiredRole) {

      this.showError(
        "This page does not have a required role configuration."
      );


      console.error(
        "Required role is missing from the body element."
      );


      return {
        success: false,
        reason:
          "REQUIRED_ROLE_MISSING"
      };
    }


    this.elements.logoutButton
      .addEventListener(
        "click",
        () => {

          this.logout();
        }
      );


    return this.validateAccess();
  },


  /*
   * ----------------------------------------------------------
   * CHECK REQUIRED ELEMENTS
   * ----------------------------------------------------------
   */

  hasRequiredElements() {

    return Boolean(
      this.elements.loader &&
      this.elements.content &&
      this.elements.userRole &&
      this.elements.userMobile &&
      this.elements.logoutButton &&
      this.elements.message
    );
  },


  /*
   * ----------------------------------------------------------
   * FAST ACCESS VALIDATION
   * ----------------------------------------------------------
   */

  async validateAccess() {

    const localSession =
      SessionManager.get();


    /*
     * No local session:
     * redirect to Login with the current page as returnUrl.
     */

    if (!localSession) {

      AppRouter.goToLogin(
        this.requiredRole,
        true,
        window.location.href
      );


      return {
        success: false,
        reason:
          "LOCAL_SESSION_NOT_FOUND"
      };
    }


    const localUser =
      Auth.getUser() || {
        userId:
          localSession.userId || "",

        role:
          localSession.role || "",

        mobile:
          localSession.mobile || "",

        preferredLanguage:
          localSession.preferredLanguage ||
          "en",

        accountStatus:
          localSession.accountStatus || "",

        verificationStatus:
          localSession.verificationStatus || ""
      };


    /*
     * Local role mismatch:
     * do not show a protected page for another role.
     */

    if (
      !localUser.role ||
      localUser.role !==
        this.requiredRole
    ) {

      this.handleRoleMismatch(
        localUser.role || ""
      );


      return {
        success: false,
        reason:
          "ROLE_ACCESS_DENIED",
        requiredRole:
          this.requiredRole,
        actualRole:
          localUser.role || ""
      };
    }


    /*
     * Valid local session:
     * display the page immediately.
     */

    this.showHome(
      localUser
    );


    console.log(
      this.requiredRole +
      " Home Access: PASS"
    );


    /*
     * A recently validated session does not need another
     * backend request during page-to-page navigation.
     */

    if (
      !this.needsBackendValidation(
        localSession
      )
    ) {

      console.log(
        "Session Validation: RECENT"
      );


      return {
        success: true,
        authenticated:
          true,
        role:
          localUser.role,
        user:
          localUser,
        source:
          "LOCAL_RECENT"
      };
    }


    /*
     * Backend validation runs without blocking the page.
     */

    this.validateSessionInBackground(
      localSession
    );


    return {
      success: true,
      authenticated:
        true,
      role:
        localUser.role,
      user:
        localUser,
      source:
        "LOCAL_BACKGROUND_VALIDATION"
    };
  },


  /*
   * ----------------------------------------------------------
   * BACKGROUND SESSION VALIDATION
   * ----------------------------------------------------------
   */

  async validateSessionInBackground(
    localSession
  ) {

    if (this.validationRunning) {

      return {
        success: false,
        reason:
          "VALIDATION_ALREADY_RUNNING"
      };
    }


    this.validationRunning =
      true;


    try {

      const restoration =
        await Auth.restoreSession();


      if (
        restoration.success === true &&
        restoration.authenticated === true
      ) {

        const user =
          restoration.user;


        if (
          !user ||
          user.role !==
            this.requiredRole
        ) {

          this.handleRoleMismatch(
            user
              ? user.role
              : ""
          );


          return {
            success: false,
            reason:
              "ROLE_ACCESS_DENIED"
          };
        }


        this.markSessionValidated(
          localSession
        );


        this.updateUserDetails(
          user
        );


        console.log(
          "Background Session Validation: PASS"
        );


        return {
          success: true,
          authenticated:
            true,
          user:
            user
        };
      }


      /*
       * Network failure does not prove that the session
       * is invalid. Keep the locally authenticated page open.
       */

      if (
        restoration.retryable === true
      ) {

        this.showOfflineMessage();


        console.warn(
          "Background Session Validation: PENDING"
        );


        return {
          success: false,
          retryable:
            true,
          reason:
            restoration.reason ||
            "SESSION_VALIDATION_PENDING"
        };
      }


      /*
       * Expired, revoked or invalid session:
       * SessionManager has cleared invalid local data.
       */

      this.clearValidationRecord();


      AppRouter.goToLogin(
        this.requiredRole,
        true,
        window.location.href
      );


      return {
        success: false,
        reason:
          restoration.reason ||
          "SESSION_INVALID"
      };

    } catch (error) {

      if (
        error.code ===
          "NETWORK_ERROR" ||
        error.code ===
          "REQUEST_TIMEOUT"
      ) {

        this.showOfflineMessage();


        console.warn(
          "Background Session Validation: NETWORK PENDING",
          error
        );


        return {
          success: false,
          retryable:
            true,
          reason:
            error.code
        };
      }


      console.error(
        "Background Session Validation: FAIL",
        error
      );


      return {
        success: false,
        reason:
          error.code ||
          "SESSION_VALIDATION_FAILED"
      };

    } finally {

      this.validationRunning =
        false;
    }
  },


  /*
   * ----------------------------------------------------------
   * CHECK VALIDATION AGE
   * ----------------------------------------------------------
   */

  needsBackendValidation(
    localSession
  ) {

    const record =
      AppStorage.get(
        this.VALIDATION_STORAGE_KEY
      );


    if (
      !record ||
      typeof record !== "object"
    ) {

      return true;
    }


    const currentSessionId =
      localSession.sessionId || "";


    if (
      !record.sessionId ||
      record.sessionId !==
        currentSessionId
    ) {

      return true;
    }


    const validatedAt =
      Number(
        record.validatedAt
      );


    if (
      !Number.isFinite(
        validatedAt
      )
    ) {

      return true;
    }


    return (
      Date.now() -
      validatedAt
    ) >=
      this.VALIDATION_INTERVAL_MS;
  },


  /*
   * ----------------------------------------------------------
   * SAVE VALIDATION TIME
   * ----------------------------------------------------------
   */

  markSessionValidated(
    localSession
  ) {

    AppStorage.set(
      this.VALIDATION_STORAGE_KEY,
      {
        sessionId:
          localSession.sessionId || "",

        validatedAt:
          Date.now()
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * CLEAR VALIDATION RECORD
   * ----------------------------------------------------------
   */

  clearValidationRecord() {

    AppStorage.remove(
      this.VALIDATION_STORAGE_KEY
    );
  },


  /*
   * ----------------------------------------------------------
   * HANDLE WRONG ROLE
   * ----------------------------------------------------------
   */

  handleRoleMismatch(
    actualRole
  ) {

    if (
      AppRouter.isSupportedRole(
        actualRole
      )
    ) {

      AppRouter.goToRoleHome(
        actualRole,
        true
      );


      return;
    }


    AppRouter.goToRoleSelection(
      true
    );
  },


  /*
   * ----------------------------------------------------------
   * DISPLAY PAGE
   * ----------------------------------------------------------
   */

  showHome(
    user,
    offline = false
  ) {

    this.updateUserDetails(
      user
    );


    this.elements.loader
      .classList.add(
        "hidden"
      );


    this.elements.content
      .classList.remove(
        "hidden"
      );


    if (offline) {

      this.showOfflineMessage();
    }
  },


  /*
   * ----------------------------------------------------------
   * UPDATE USER INFORMATION
   * ----------------------------------------------------------
   */

  updateUserDetails(user) {

    this.elements.userRole
      .textContent =
        user &&
        user.role
          ? user.role
          : this.requiredRole;


    this.elements.userMobile
      .textContent =
        user &&
        user.mobile
          ? "+91 " +
            user.mobile
          : "Verified user";
  },


  /*
   * ----------------------------------------------------------
   * OFFLINE MESSAGE
   * ----------------------------------------------------------
   */

  showOfflineMessage() {

    this.elements.message
      .textContent =
        "Offline mode: some live features may be unavailable.";


    this.elements.message
      .classList.remove(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * SHOW ERROR
   * ----------------------------------------------------------
   */

  showError(message) {

    if (this.elements.loader) {

      this.elements.loader
        .classList.add(
          "hidden"
        );
    }


    if (this.elements.message) {

      this.elements.message
        .textContent =
          message;


      this.elements.message
        .classList.remove(
          "hidden"
        );
    }
  },


  /*
   * ----------------------------------------------------------
   * LOGOUT
   * ----------------------------------------------------------
   */

  async logout() {

    this.elements.logoutButton
      .disabled =
        true;


    try {

      await Auth.logout();

    } catch (error) {

      /*
       * Local logout must still complete if the
       * backend is temporarily unavailable.
       */

      SessionManager.clear();

    } finally {

      this.clearValidationRecord();


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
   * ----------------------------------------------------------
   * PERFORMANCE TEST
   *
   * Browser console:
   * RoleHome.test()
   * ----------------------------------------------------------
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE FAST ROLE ACCESS TEST"
    );

    console.log(
      "========================================"
    );


    const localSession =
      SessionManager.get();


    const user =
      Auth.getUser();


    const supported =
      AppRouter.isSupportedRole(
        this.requiredRole
      );


    const contentVisible =
      !this.elements.content
        .classList.contains(
          "hidden"
        );


    const loaderHidden =
      this.elements.loader
        .classList.contains(
          "hidden"
        );


    const validationRequired =
      localSession
        ? this.needsBackendValidation(
            localSession
          )
        : true;


    const passed =
      supported &&
      Boolean(localSession) &&
      Boolean(user) &&
      user.role ===
        this.requiredRole &&
      contentVisible &&
      loaderHidden;


    const results = [

      {
        test:
          "Required role supported",
        expected:
          true,
        actual:
          supported,
        passed:
          supported
      },

      {
        test:
          "Local session available",
        expected:
          true,
        actual:
          Boolean(localSession),
        passed:
          Boolean(localSession)
      },

      {
        test:
          "Session role",
        expected:
          this.requiredRole,
        actual:
          user
            ? user.role
            : "",
        passed:
          Boolean(
            user &&
            user.role ===
              this.requiredRole
          )
      },

      {
        test:
          "Content visible",
        expected:
          true,
        actual:
          contentVisible,
        passed:
          contentVisible
      },

      {
        test:
          "Loader hidden",
        expected:
          true,
        actual:
          loaderHidden,
        passed:
          loaderHidden
      }
    ];


    console.table(
      results
    );


    console.log(
      "Background Validation Required:",
      validationRequired
    );


    console.log(
      passed
        ? "Fast Role Access Test: PASS"
        : "Fast Role Access Test: FAIL"
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
        user
          ? user.role
          : "",
      contentVisible:
        contentVisible,
      loaderHidden:
        loaderHidden,
      backgroundValidationRequired:
        validationRequired,
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

    RoleHome.init();
  }
);
