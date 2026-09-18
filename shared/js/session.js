/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/session.js
 * PURPOSE: Frontend session storage and validation
 * VERSION: 1.1.0
 * ============================================================
 */

const SessionManager = {

  KEY: "apnabite_session",


  /*
   * ----------------------------------------------------------
   * SAVE SESSION
   * ----------------------------------------------------------
   */

  set(session) {

    if (
      !session ||
      typeof session !== "object" ||
      !session.sessionId
    ) {
      throw new Error(
        "A valid session is required."
      );
    }

    const normalizedSession = {

      sessionId:
        String(session.sessionId),

      userId:
        session.userId
          ? String(session.userId)
          : "",

      role:
        session.role
          ? String(session.role)
          : "",

      mobile:
        session.mobile
          ? String(session.mobile)
          : "",

      preferredLanguage:
        session.preferredLanguage ||
        "en",

      accountStatus:
        session.accountStatus || "",

      verificationStatus:
        session.verificationStatus || "",

      loginTime:
        session.loginTime || "",

      /*
       * Login API returns sessionExpiryAt.
       * Validation API returns expiryAt.
       */
      expiryAt:
        session.expiryAt ||
        session.sessionExpiryAt ||
        "",

      savedAt:
        new Date().toISOString()

    };

    AppStorage.set(
      this.KEY,
      normalizedSession
    );

    return normalizedSession;
  },


  /*
   * ----------------------------------------------------------
   * GET SESSION
   * ----------------------------------------------------------
   */

  get() {

    const session =
      AppStorage.get(
        this.KEY,
        null
      );

    if (
      !session ||
      typeof session !== "object" ||
      !session.sessionId
    ) {
      return null;
    }

    return session;
  },


  /*
   * ----------------------------------------------------------
   * CLEAR SESSION
   * ----------------------------------------------------------
   */

  clear() {

    AppStorage.remove(
      this.KEY
    );

    return true;
  },


  /*
   * ----------------------------------------------------------
   * GET SESSION ID
   * ----------------------------------------------------------
   */

  getSessionId() {

    const session =
      this.get();

    return session
      ? session.sessionId
      : "";
  },


  /*
   * ----------------------------------------------------------
   * GET USER ID
   * ----------------------------------------------------------
   */

  getUserId() {

    const session =
      this.get();

    return session
      ? session.userId
      : "";
  },


  /*
   * ----------------------------------------------------------
   * GET USER ROLE
   * ----------------------------------------------------------
   */

  getRole() {

    const session =
      this.get();

    return session
      ? session.role
      : "";
  },


  /*
   * ----------------------------------------------------------
   * LOCAL EXPIRY CHECK
   * ----------------------------------------------------------
   */

  isExpired(session = null) {

    const currentSession =
      session || this.get();

    if (
      !currentSession ||
      !currentSession.expiryAt
    ) {
      return true;
    }

    const expiryTime =
      new Date(
        currentSession.expiryAt
      ).getTime();

    if (Number.isNaN(expiryTime)) {
      return true;
    }

    return Date.now() >= expiryTime;
  },


  /*
   * ----------------------------------------------------------
   * LOCAL LOGIN CHECK
   *
   * This does not replace backend validation.
   * ----------------------------------------------------------
   */

  isLoggedIn() {

    const session =
      this.get();

    if (!session) {
      return false;
    }

    if (this.isExpired(session)) {

      this.clear();

      return false;
    }

    return true;
  },


  /*
   * ----------------------------------------------------------
   * BACKEND SESSION VALIDATION
   * ----------------------------------------------------------
   */

  async validate() {

    const session =
      this.get();

    if (!session) {

      return {
        success: false,
        authenticated: false,
        reason: "LOCAL_SESSION_NOT_FOUND"
      };
    }

    if (this.isExpired(session)) {

      this.clear();

      return {
        success: false,
        authenticated: false,
        reason: "LOCAL_SESSION_EXPIRED"
      };
    }

    try {

      const response =
        await API.request(
          "validate_session",
          {
            sessionId:
              session.sessionId
          }
        );

      const data =
        response.data || {};

      if (
        data.success !== true ||
        data.authenticated !== true ||
        !data.sessionId
      ) {

        this.clear();

        return {
          success: false,
          authenticated: false,
          reason:
            data.reason ||
            "SESSION_INVALID"
        };
      }

      /*
       * Refresh locally stored verified values.
       */
      const verifiedSession =
        this.set({
          ...session,

          sessionId:
            data.sessionId,

          userId:
            data.userId ||
            session.userId,

          role:
            data.role ||
            session.role,

          expiryAt:
            data.expiryAt ||
            session.expiryAt
        });

      return {
        success: true,
        authenticated: true,
        session:
          verifiedSession,
        requestId:
          response.requestId || ""
      };

    } catch (error) {

      /*
       * A network failure does not prove that the
       * backend session is invalid. Preserve it so
       * the user can retry after connectivity returns.
       */
      if (
        error.code === "NETWORK_ERROR" ||
        error.code === "REQUEST_TIMEOUT"
      ) {

        return {
          success: false,
          authenticated: false,
          retryable: true,
          reason:
            error.code,
          message:
            error.message,
          requestId:
            error.requestId || ""
        };
      }

      /*
       * Backend rejected the session.
       */
      this.clear();

      return {
        success: false,
        authenticated: false,
        retryable: false,
        reason:
          error.code ||
          "SESSION_VALIDATION_FAILED",
        message:
          error.message,
        requestId:
          error.requestId || ""
      };
    }
  },


  /*
   * ----------------------------------------------------------
   * LOGOUT
   * ----------------------------------------------------------
   */

  async logout() {

    const sessionId =
      this.getSessionId();

    if (!sessionId) {

      this.clear();

      return {
        success: true,
        loggedOut: true,
        localOnly: true
      };
    }

    try {

      const response =
        await API.request(
          "logout",
          {
            sessionId:
              sessionId
          }
        );

      this.clear();

      return {
        success: true,
        loggedOut: true,
        localOnly: false,
        data:
          response.data || {},
        requestId:
          response.requestId || ""
      };

    } catch (error) {

      /*
       * Always remove the local session when the
       * user explicitly chooses logout.
       */
      this.clear();

      return {
        success: false,
        loggedOut: true,
        localOnly: true,
        reason:
          error.code ||
          "LOGOUT_API_FAILED",
        message:
          error.message,
        requestId:
          error.requestId || ""
      };
    }
  },


  /*
   * ----------------------------------------------------------
   * TEST 1 — LOCAL SESSION
   *
   * Browser console:
   * SessionManager.testLocal()
   * ----------------------------------------------------------
   */

  testLocal() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE LOCAL SESSION TEST"
    );

    console.log(
      "========================================"
    );

    const previousSession =
      this.get();

    try {

      const futureExpiry =
        new Date(
          Date.now() +
          (60 * 60 * 1000)
        ).toISOString();

      const saved =
        this.set({
          sessionId:
            "TEST_SESSION",
          userId:
            "TEST_USER",
          role:
            "Customer",
          expiryAt:
            futureExpiry
        });

      const fetched =
        this.get();

      const passed =
        saved.sessionId ===
          "TEST_SESSION" &&
        fetched &&
        fetched.userId ===
          "TEST_USER" &&
        this.getRole() ===
          "Customer" &&
        this.isLoggedIn() === true &&
        this.isExpired(fetched) ===
          false;

      console.log(
        "Saved Session:",
        saved
      );

      console.log(
        "Fetched Session:",
        fetched
      );

      console.log(
        passed
          ? "Local Session Test: PASS"
          : "Local Session Test: FAIL"
      );

      return {
        success: passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        saved:
          saved,
        fetched:
          fetched
      };

    } catch (error) {

      console.error(
        "Local Session Test: FAIL"
      );

      console.error(
        "Error:",
        error
      );

      return {
        success: false,
        status: "FAIL",
        error:
          error.message
      };

    } finally {

      this.clear();

      if (previousSession) {
        AppStorage.set(
          this.KEY,
          previousSession
        );
      }
    }
  },


  /*
   * ----------------------------------------------------------
   * TEST 2 — LIVE BACKEND SESSION
   *
   * This creates a real test login session, validates it,
   * logs out and confirms local clearing.
   *
   * Browser console:
   * SessionManager.testBackend()
   * ----------------------------------------------------------
   */

  async testBackend() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE BACKEND SESSION TEST"
    );

    console.log(
      "========================================"
    );

    const previousSession =
      this.get();

    let testSessionCreated =
      false;

    try {

      this.clear();

      const loginResponse =
        await API.request(
          "login",
          {
            mobile:
              "9876543210"
          }
        );

      const loginData =
        loginResponse.data || {};

      if (
        loginData.success !== true ||
        loginData.authenticated !== true ||
        !loginData.sessionId
      ) {
        throw new Error(
          "Live login did not return a valid session."
        );
      }

      const savedSession =
        this.set(
          loginData
        );

      testSessionCreated =
        true;

      console.log(
        "Saved Login Session:",
        savedSession
      );

      const validation =
        await this.validate();

      console.log(
        "Validation Result:",
        validation
      );

      if (
        validation.success !== true ||
        validation.authenticated !== true
      ) {
        throw new Error(
          "Backend session validation failed."
        );
      }

      const logoutResult =
        await this.logout();

      console.log(
        "Logout Result:",
        logoutResult
      );

      const sessionAfterLogout =
        this.get();

      if (
        sessionAfterLogout !== null
      ) {
        throw new Error(
          "Local session still exists after logout."
        );
      }

      console.log(
        "Backend Session Test: PASS"
      );

      return {
        success: true,
        status: "PASS",
        login:
          loginData,
        validation:
          validation,
        logout:
          logoutResult,
        sessionAfterLogout:
          sessionAfterLogout
      };

    } catch (error) {

      console.error(
        "Backend Session Test: FAIL"
      );

      console.error(
        "Error:",
        error
      );

      /*
       * Try to revoke the test session if it was
       * created before the test failed.
       */
      if (
        testSessionCreated &&
        this.getSessionId()
      ) {
        try {
          await this.logout();
        } catch (logoutError) {
          this.clear();
        }
      } else {
        this.clear();
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

      this.clear();

      if (previousSession) {
        AppStorage.set(
          this.KEY,
          previousSession
        );
      }
    }
  }

};
