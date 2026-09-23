/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/role-home.js
 * PURPOSE: Fast secure role access and visible logout flow
 * VERSION: 1.2.0
 * ============================================================
 *
 * PERFORMANCE FLOW:
 *
 * 1. Read local session
 * 2. Validate local role
 * 3. Show page immediately
 * 4. Validate session in background
 * 5. Repeat backend validation only after five minutes
 * 6. Show clear logout progress and completion feedback
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

  LOGOUT_FEEDBACK_DELAY_MS:
    650,


  /*
   * ----------------------------------------------------------
   * STATE
   * ----------------------------------------------------------
   */

  requiredRole:
    "",

  validationRunning:
    false,

  logoutRunning:
    false,

  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  async init() {

    this.requiredRole =
      document.body.dataset.requiredRole || "";

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

      logoutButtonText:
        document.getElementById(
          "logoutButtonText"
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
        reason: "ROLE_PAGE_ELEMENTS_MISSING"
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
        reason: "REQUIRED_ROLE_MISSING"
      };
    }

    this.elements.logoutButton.addEventListener(
      "click",
      () => {
        this.logout();
      }
    );

    return this.validateAccess();
  },


  /*
   * ----------------------------------------------------------
   * REQUIRED ELEMENTS
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
     * redirect to login with current URL as return URL.
     */

    if (!localSession) {

      AppRouter.goToLogin(
        this.requiredRole,
        true,
        window.location.href
      );

      return {
        success: false,
        reason: "LOCAL_SESSION_NOT_FOUND"
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
     * Do not display a protected page belonging
     * to another user role.
     */

    if (
      !localUser.role ||
      localUser.role !== this.requiredRole
    ) {

      this.handleRoleMismatch(
        localUser.role || ""
      );

      return {
        success: false,
        reason: "ROLE_ACCESS_DENIED",
        requiredRole: this.requiredRole,
        actualRole: localUser.role || ""
      };
    }

    /*
     * Valid local session:
     * display the protected page immediately.
     */

    this.showHome(
      localUser
    );

    console.log(
      this.requiredRole +
      " Home Access: PASS"
    );

    /*
     * Avoid another backend request during
     * recent page-to-page navigation.
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
        authenticated: true,
        role: localUser.role,
        user: localUser,
        source: "LOCAL_RECENT"
      };
    }

    /*
     * Backend validation does not block
     * the protected page.
     */

    this.validateSessionInBackground(
      localSession
    );

    return {
      success: true,
      authenticated: true,
      role: localUser.role,
      user: localUser,
      source: "LOCAL_BACKGROUND_VALIDATION"
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
        reason: "VALIDATION_ALREADY_RUNNING"
      };
    }

    this.validationRunning = true;

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
          user.role !== this.requiredRole
        ) {

          this.handleRoleMismatch(
            user ? user.role : ""
          );

          return {
            success: false,
            reason: "ROLE_ACCESS_DENIED"
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
          authenticated: true,
          user
        };
      }

      /*
       * A temporary transport failure does not
       * prove that the local session is invalid.
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
          retryable: true,
          reason:
            restoration.reason ||
            "SESSION_VALIDATION_PENDING"
        };
      }

      /*
       * The backend explicitly rejected,
       * expired or revoked the session.
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
        error.code === "NETWORK_ERROR" ||
        error.code === "REQUEST_TIMEOUT" ||
        error.code === "HTTP_ERROR"
      ) {

        this.showOfflineMessage();

        console.warn(
          "Background Session Validation: NETWORK PENDING",
          error
        );

        return {
          success: false,
          retryable: true,
          reason:
            error.code ||
            "SESSION_VALIDATION_PENDING"
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

      this.validationRunning = false;
    }
  },


  /*
   * ----------------------------------------------------------
   * VALIDATION AGE
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
      record.sessionId !== currentSessionId
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
      Date.now() - validatedAt
    ) >= this.VALIDATION_INTERVAL_MS;
  },


  /*
   * ----------------------------------------------------------
   * VALIDATION STORAGE
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


  clearValidationRecord() {

    AppStorage.remove(
      this.VALIDATION_STORAGE_KEY
    );
  },


  /*
   * ----------------------------------------------------------
   * WRONG ROLE HANDLING
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
   * DISPLAY PROTECTED PAGE
   * ----------------------------------------------------------
   */

  showHome(
    user,
    offline = false
  ) {

    this.updateUserDetails(
      user
    );

    this.elements.loader.classList.add(
      "hidden"
    );

    this.elements.content.classList.remove(
      "hidden"
    );

    if (offline) {
      this.showOfflineMessage();
    }
  },


  updateUserDetails(user) {

    this.elements.userRole.textContent =
      user && user.role
        ? user.role
        : this.requiredRole;

    this.elements.userMobile.textContent =
      user && user.mobile
        ? "+91 " + user.mobile
        : "Verified user";
  },


  /*
   * ----------------------------------------------------------
   * PAGE MESSAGES
   * ----------------------------------------------------------
   */

  showMessage(message) {

    if (!this.elements.message) {
      return false;
    }

    this.elements.message.textContent =
      message || "";

    this.elements.message.classList.remove(
      "hidden"
    );

    return true;
  },


  clearMessage() {

    if (!this.elements.message) {
      return false;
    }

    this.elements.message.textContent = "";

    this.elements.message.classList.add(
      "hidden"
    );

    return true;
  },


  showOfflineMessage() {

    this.showMessage(
      "Offline mode: some live features may be unavailable."
    );
  },


  showError(message) {

    if (this.elements.loader) {

      this.elements.loader.classList.add(
        "hidden"
      );
    }

    this.showMessage(
      message
    );
  },


  /*
   * ----------------------------------------------------------
   * LOGOUT BUTTON LABEL
   * ----------------------------------------------------------
   */

  setLogoutButtonLabel(label) {

    if (this.elements.logoutButtonText) {

      this.elements.logoutButtonText.textContent =
        label;

      return;
    }

    this.elements.logoutButton.textContent =
      label;
  },


  /*
   * ----------------------------------------------------------
   * PRIVATE CACHE CLEARING
   * ----------------------------------------------------------
   */

  clearPrivateCaches() {

    const privateCacheKeys = [
      "apnabite_food_partner_dashboard",
      "apnabite_food_partner_products",
      "apnabite_home_kitchen_discovery",
      "apnabite_home_resolved_location"
    ];

    privateCacheKeys.forEach(
      (key) => {
        AppStorage.remove(key);
      }
    );

    return true;
  },


  /*
   * ----------------------------------------------------------
   * WAIT FOR VISIBLE UI FEEDBACK
   * ----------------------------------------------------------
   */

  wait(milliseconds) {

    return new Promise(
      (resolve) => {
        window.setTimeout(
          resolve,
          milliseconds
        );
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * LOGOUT WITH VISIBLE FEEDBACK
   * ----------------------------------------------------------
   */

  async logout() {

    if (this.logoutRunning) {

      return {
        success: false,
        reason: "LOGOUT_ALREADY_RUNNING"
      };
    }

    this.logoutRunning = true;

    const logoutButton =
      this.elements.logoutButton;

    logoutButton.disabled = true;

    logoutButton.setAttribute(
      "aria-busy",
      "true"
    );

    this.setLogoutButtonLabel(
      "Logging out..."
    );

    this.showMessage(
      "Logging out securely..."
    );

    let logoutResult = null;
    let localOnly = false;

    try {

      logoutResult =
        await Auth.logout();

      this.showMessage(
        "Logged out successfully. Redirecting..."
      );

    } catch (error) {

      /*
       * Local logout must still complete if
       * backend logout is temporarily unavailable.
       */

      localOnly = true;

      SessionManager.clear();

      this.showMessage(
        "Logged out from this device. Redirecting..."
      );

      console.warn(
        "Backend logout unavailable; local logout completed.",
        error
      );

    } finally {

      this.clearValidationRecord();

      AppStorage.remove(
        "apnabite_selected_role"
      );

      this.clearPrivateCaches();

      /*
       * Allow the success message to become
       * visible before leaving the page.
       */

      await this.wait(
        this.LOGOUT_FEEDBACK_DELAY_MS
      );

      window.location.replace(
        AppRouter.getPublicUrl(
          "index.html"
        )
      );
    }

    return {
      success: true,
      loggedOut: true,
      localOnly,
      result: logoutResult
    };
  },


  /*
   * ----------------------------------------------------------
   * ROLE ACCESS TEST
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
      !this.elements.content.classList.contains(
        "hidden"
      );

    const loaderHidden =
      this.elements.loader.classList.contains(
        "hidden"
      );

    const validationRequired =
      localSession
        ? this.needsBackendValidation(
            localSession
          )
        : true;

    const logoutFeedbackSupported =
      typeof this.setLogoutButtonLabel ===
        "function" &&
      typeof this.clearPrivateCaches ===
        "function" &&
      Number(this.LOGOUT_FEEDBACK_DELAY_MS) > 0;

    const results = [
      {
        test: "Required role supported",
        expected: true,
        actual: supported,
        passed: supported === true
      },
      {
        test: "Local session available",
        expected: true,
        actual: Boolean(localSession),
        passed: Boolean(localSession)
      },
      {
        test: "Session role",
        expected: this.requiredRole,
        actual:
          user ? user.role : "",
        passed:
          Boolean(
            user &&
            user.role === this.requiredRole
          )
      },
      {
        test: "Content visible",
        expected: true,
        actual: contentVisible,
        passed: contentVisible === true
      },
      {
        test: "Loader hidden",
        expected: true,
        actual: loaderHidden,
        passed: loaderHidden === true
      },
      {
        test: "Logout feedback support",
        expected: true,
        actual: logoutFeedbackSupported,
        passed:
          logoutFeedbackSupported === true
      }
    ];

    const passed =
      results.every(
        (result) => result.passed
      );

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
      success: passed,
      status:
        passed ? "PASS" : "FAIL",
      requiredRole:
        this.requiredRole,
      sessionRole:
        user ? user.role : "",
      contentVisible,
      loaderHidden,
      backgroundValidationRequired:
        validationRequired,
      logoutFeedbackSupported,
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
