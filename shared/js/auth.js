/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/auth.js
 * PURPOSE: Frontend authentication orchestration
 * VERSION: 1.1.0
 * ============================================================
 *
 * DEPENDENCIES:
 * 1. shared/js/storage.js
 * 2. shared/js/api.js
 * 3. shared/js/session.js
 * 4. shared/js/auth.js
 *
 * RESPONSIBILITIES:
 * 1. User registration
 * 2. Mobile login
 * 3. Session persistence
 * 4. Session restoration
 * 5. User and role access
 * 6. Backend logout
 * 7. Authentication testing
 * ============================================================
 */

const Auth = {

  /*
   * ----------------------------------------------------------
   * SUPPORTED ROLES
   * ----------------------------------------------------------
   */

  ROLES: {
    CUSTOMER: "Customer",
    FOOD_PARTNER: "Food Partner",
    RIDER: "Rider",
    ADMIN: "Admin"
  },


  /*
   * ----------------------------------------------------------
   * NORMALIZE MOBILE
   * ----------------------------------------------------------
   */

  normalizeMobile(mobile) {

    return String(
      mobile || ""
    )
      .replace(/\D/g, "")
      .slice(-10);
  },


  /*
   * ----------------------------------------------------------
   * BASIC FRONTEND MOBILE VALIDATION
   *
   * Backend remains authoritative.
   * ----------------------------------------------------------
   */

  isValidMobile(mobile) {

    const normalized =
      this.normalizeMobile(
        mobile
      );

    return /^[6-9]\d{9}$/.test(
      normalized
    );
  },


  /*
   * ----------------------------------------------------------
   * SERVICE RESPONSE VALIDATION
   *
   * API.request() validates the outer API response.
   * This validates the service result inside response.data.
   * ----------------------------------------------------------
   */

  getResponseData(response) {

    if (
      !response ||
      typeof response !== "object" ||
      !response.data ||
      typeof response.data !== "object"
    ) {
      throw new Error(
        "Authentication returned an invalid response."
      );
    }

    return response.data;
  },


  /*
   * ----------------------------------------------------------
   * CREATE AUTHENTICATION ERROR
   * ----------------------------------------------------------
   */

  createError(
    message,
    code,
    requestId
  ) {

    const error =
      new Error(
        message ||
        "Authentication failed."
      );

    error.code =
      code ||
      "AUTH_ERROR";

    error.requestId =
      requestId || "";

    return error;
  },


  /*
   * ----------------------------------------------------------
   * REGISTER USER
   * ----------------------------------------------------------
   */

  async register(data) {

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      throw this.createError(
        "Registration data is required.",
        "INVALID_DATA"
      );
    }

    const mobile =
      this.normalizeMobile(
        data.mobile
      );

    const role =
      String(
        data.role || ""
      ).trim();

    const email =
      String(
        data.email || ""
      ).trim();

    const preferredLanguage =
      String(
        data.preferredLanguage ||
        "en"
      ).trim() || "en";

    if (!this.isValidMobile(mobile)) {
      throw this.createError(
        "Please enter a valid 10-digit mobile number.",
        "INVALID_MOBILE"
      );
    }

    if (!role) {
      throw this.createError(
        "Please select a user role.",
        "INVALID_ROLE"
      );
    }

    const response =
      await API.request(
        "register",
        {
          mobile:
            mobile,
          role:
            role,
          email:
            email,
          preferredLanguage:
            preferredLanguage
        }
      );

    const result =
      this.getResponseData(
        response
      );

    if (
      result.success !== true ||
      !result.userId
    ) {
      throw this.createError(
        result.reason ||
        "Registration failed.",
        result.reason ||
        "REGISTRATION_FAILED",
        response.requestId
      );
    }

    return {
      success: true,
      registered: true,
      user: {
        userId:
          result.userId,
        role:
          result.role,
        mobile:
          result.mobile,
        accountStatus:
          result.accountStatus,
        verificationStatus:
          result.verificationStatus,
        preferredLanguage:
          result.preferredLanguage || "en"
      },
      requestId:
        response.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * LOGIN WITH MOBILE
   * ----------------------------------------------------------
   */

  async login(mobile) {

    const normalizedMobile =
      this.normalizeMobile(
        mobile
      );

    if (
      !this.isValidMobile(
        normalizedMobile
      )
    ) {
      throw this.createError(
        "Please enter a valid 10-digit mobile number.",
        "INVALID_MOBILE"
      );
    }

    const response =
      await API.request(
        "login",
        {
          mobile:
            normalizedMobile
        }
      );

    const result =
      this.getResponseData(
        response
      );

    if (
      result.success !== true ||
      result.authenticated !== true ||
      !result.sessionId
    ) {
      throw this.createError(
        result.reason ||
        "Login failed.",
        result.reason ||
        "LOGIN_FAILED",
        response.requestId
      );
    }

    const session =
      SessionManager.set(
        result
      );

    return {
      success: true,
      authenticated: true,
      session:
        session,
      user:
        this.getUser(),
      requestId:
        response.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * RESTORE EXISTING LOGIN
   *
   * Used when the application opens again.
   * ----------------------------------------------------------
   */

  async restoreSession() {

    if (
      !SessionManager.get()
    ) {
      return {
        success: false,
        authenticated: false,
        reason:
          "LOCAL_SESSION_NOT_FOUND"
      };
    }

    const validation =
      await SessionManager.validate();

    if (
      validation.success !== true ||
      validation.authenticated !== true
    ) {
      return validation;
    }

    return {
      success: true,
      authenticated: true,
      session:
        validation.session,
      user:
        this.getUser(),
      requestId:
        validation.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * LOCAL LOGIN STATUS
   * ----------------------------------------------------------
   */

  isLoggedIn() {

    return SessionManager.isLoggedIn();
  },


  /*
   * ----------------------------------------------------------
   * GET CURRENT SESSION
   * ----------------------------------------------------------
   */

  getSession() {

    return SessionManager.get();
  },


  /*
   * ----------------------------------------------------------
   * GET CURRENT USER
   * ----------------------------------------------------------
   */

  getUser() {

    const session =
      SessionManager.get();

    if (!session) {
      return null;
    }

    return {
      userId:
        session.userId || "",
      role:
        session.role || "",
      mobile:
        session.mobile || "",
      preferredLanguage:
        session.preferredLanguage ||
        "en",
      accountStatus:
        session.accountStatus || "",
      verificationStatus:
        session.verificationStatus || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * GET CURRENT USER ID
   * ----------------------------------------------------------
   */

  getUserId() {

    return SessionManager.getUserId();
  },


  /*
   * ----------------------------------------------------------
   * GET CURRENT ROLE
   * ----------------------------------------------------------
   */

  getRole() {

    return SessionManager.getRole();
  },


  /*
   * ----------------------------------------------------------
   * ROLE CHECK
   * ----------------------------------------------------------
   */

  hasRole(role) {

    if (!role) {
      return false;
    }

    return (
      String(
        this.getRole()
      ).toLowerCase() ===
      String(role).toLowerCase()
    );
  },


  /*
   * ----------------------------------------------------------
   * LOGOUT
   * ----------------------------------------------------------
   */

  async logout() {

    return SessionManager.logout();
  },


  /*
   * ----------------------------------------------------------
   * TEST 1 — FRONTEND VALIDATION
   *
   * Browser console:
   * Auth.testValidation()
   * ----------------------------------------------------------
   */

  testValidation() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE AUTH VALIDATION TEST"
    );

    console.log(
      "========================================"
    );

    const mobileTests = [
      {
        input:
          "9876543210",
        expected:
          true
      },
      {
        input:
          "+91 98765 43210",
        expected:
          true
      },
      {
        input:
          "12345",
        expected:
          false
      },
      {
        input:
          "",
        expected:
          false
      }
    ];

    const results =
      mobileTests.map(
        (test) => {

          const actual =
            this.isValidMobile(
              test.input
            );

          return {
            input:
              test.input,
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
        ? "Auth Validation Test: PASS"
        : "Auth Validation Test: FAIL"
    );

    return {
      success:
        passed,
      status:
        passed
          ? "PASS"
          : "FAIL",
      results:
        results
    };
  },


  /*
   * ----------------------------------------------------------
   * TEST 2 — EXISTING USER AUTHENTICATION
   *
   * Uses existing test user:
   * 9876543210
   *
   * Browser console:
   * Auth.testExistingUser()
   * ----------------------------------------------------------
   */

  async testExistingUser() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE EXISTING USER AUTH TEST"
    );

    console.log(
      "========================================"
    );

    const previousSession =
      SessionManager.get();

    try {

      SessionManager.clear();

      const loginResult =
        await this.login(
          "9876543210"
        );

      console.log(
        "Login Result:",
        loginResult
      );

      if (
        loginResult.success !== true ||
        loginResult.authenticated !==
          true
      ) {
        throw new Error(
          "Existing user login failed."
        );
      }

      const user =
        this.getUser();

      console.log(
        "Current User:",
        user
      );

      if (
        !user ||
        !user.userId ||
        user.role !== "Customer"
      ) {
        throw new Error(
          "User or role detection failed."
        );
      }

      const restoreResult =
        await this.restoreSession();

      console.log(
        "Session Restore Result:",
        restoreResult
      );

      if (
        restoreResult.success !== true ||
        restoreResult.authenticated !==
          true
      ) {
        throw new Error(
          "Session restoration failed."
        );
      }

      const logoutResult =
        await this.logout();

      console.log(
        "Logout Result:",
        logoutResult
      );

      if (
        SessionManager.get() !== null
      ) {
        throw new Error(
          "Session was not cleared after logout."
        );
      }

      console.log(
        "Existing User Auth Test: PASS"
      );

      return {
        success: true,
        status: "PASS",
        login:
          loginResult,
        user:
          user,
        restored:
          restoreResult,
        logout:
          logoutResult
      };

    } catch (error) {

      console.error(
        "Existing User Auth Test: FAIL"
      );

      console.error(
        "Error:",
        error
      );

      if (
        SessionManager.getSessionId()
      ) {
        try {
          await SessionManager.logout();
        } catch (logoutError) {
          SessionManager.clear();
        }
      }

      return {
        success: false,
        status: "FAIL",
        error:
          error.message,
        code:
          error.code || "",
        requestId:
          error.requestId || ""
      };

    } finally {

      SessionManager.clear();

      if (previousSession) {
        AppStorage.set(
          SessionManager.KEY,
          previousSession
        );
      }
    }
  },


  /*
   * ----------------------------------------------------------
   * TEST 3 — REGISTRATION + LOGIN
   *
   * IMPORTANT:
   * This creates one new test user in the Users sheet.
   *
   * Browser console:
   * Auth.testRegistration()
   * ----------------------------------------------------------
   */

  async testRegistration() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE REGISTRATION AUTH TEST"
    );

    console.log(
      "========================================"
    );

    const previousSession =
      SessionManager.get();

    const testMobile =
      "9" +
      String(
        Date.now()
      ).slice(-9);

    const testEmail =
      "auth-test-" +
      Date.now() +
      "@apnabite.test";

    try {

      SessionManager.clear();

      const registrationResult =
        await this.register({
          mobile:
            testMobile,
          role:
            "Customer",
          email:
            testEmail,
          preferredLanguage:
            "en"
        });

      console.log(
        "Registration Result:",
        registrationResult
      );

      if (
        registrationResult.success !==
          true ||
        registrationResult.registered !==
          true ||
        !registrationResult.user.userId
      ) {
        throw new Error(
          "Registration failed."
        );
      }

      const loginResult =
        await this.login(
          testMobile
        );

      console.log(
        "Registered User Login:",
        loginResult
      );

      if (
        loginResult.success !== true ||
        loginResult.authenticated !==
          true
      ) {
        throw new Error(
          "Registered user login failed."
        );
      }

      const restoreResult =
        await this.restoreSession();

      console.log(
        "Registered User Session Restore:",
        restoreResult
      );

      if (
        restoreResult.success !== true ||
        restoreResult.authenticated !==
          true
      ) {
        throw new Error(
          "Registered user session restoration failed."
        );
      }

      const logoutResult =
        await this.logout();

      console.log(
        "Registered User Logout:",
        logoutResult
      );

      if (
        SessionManager.get() !== null
      ) {
        throw new Error(
          "Registered user session was not cleared."
        );
      }

      console.log(
        "Registration Auth Test: PASS"
      );

      return {
        success: true,
        status: "PASS",
        testMobile:
          testMobile,
        registration:
          registrationResult,
        login:
          loginResult,
        restored:
          restoreResult,
        logout:
          logoutResult
      };

    } catch (error) {

      console.error(
        "Registration Auth Test: FAIL"
      );

      console.error(
        "Error:",
        error
      );

      if (
        SessionManager.getSessionId()
      ) {
        try {
          await SessionManager.logout();
        } catch (logoutError) {
          SessionManager.clear();
        }
      }

      return {
        success: false,
        status: "FAIL",
        testMobile:
          testMobile,
        error:
          error.message,
        code:
          error.code || "",
        requestId:
          error.requestId || ""
      };

    } finally {

      SessionManager.clear();

      if (previousSession) {
        AppStorage.set(
          SessionManager.KEY,
          previousSession
        );
      }
    }
  }

};
