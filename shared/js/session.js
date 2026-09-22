/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/session.js
 * PURPOSE: Reliable frontend session storage and validation
 * VERSION: 1.2.0
 * ============================================================
 */

const SessionManager = {

  KEY:
    "apnabite_session",


  /*
   * ----------------------------------------------------------
   * AUTHORITATIVE INVALID SESSION CODES
   *
   * Only these backend decisions may remove a valid local
   * session automatically.
   * ----------------------------------------------------------
   */

  INVALID_SESSION_CODES: [

    "SESSION_NOT_FOUND",
    "SESSION_INVALID",
    "SESSION_EXPIRED",
    "SESSION_REVOKED",
    "USER_NOT_FOUND",
    "USER_INACTIVE",
    "ACCOUNT_INACTIVE",
    "ACCOUNT_SUSPENDED",
    "UNAUTHORIZED"

  ],


  /*
   * ----------------------------------------------------------
   * SAVE SESSION
   * ----------------------------------------------------------
   */

  set(session) {

    if (
      !session ||
      typeof session !==
        "object" ||
      !session.sessionId
    ) {

      throw new Error(
        "A valid session is required."
      );
    }


    const previousSession =
      this.get();


    const normalizedSession = {

      sessionId:
        String(
          session.sessionId
        ),

      userId:
        session.userId
          ? String(session.userId)
          : previousSession &&
            previousSession.userId
            ? String(
                previousSession.userId
              )
            : "",

      role:
        session.role
          ? String(session.role)
          : previousSession &&
            previousSession.role
            ? String(
                previousSession.role
              )
            : "",

      mobile:
        session.mobile
          ? String(session.mobile)
          : previousSession &&
            previousSession.mobile
            ? String(
                previousSession.mobile
              )
            : "",

      email:
        session.email
          ? String(session.email)
          : previousSession &&
            previousSession.email
            ? String(
                previousSession.email
              )
            : "",

      preferredLanguage:
        session.preferredLanguage ||
        (
          previousSession &&
          previousSession.preferredLanguage
        ) ||
        "en",

      accountStatus:
        session.accountStatus ||
        (
          previousSession &&
          previousSession.accountStatus
        ) ||
        "",

      verificationStatus:
        session.verificationStatus ||
        (
          previousSession &&
          previousSession.verificationStatus
        ) ||
        "",

      districtId:
        session.districtId
          ? String(session.districtId)
          : previousSession &&
            previousSession.districtId
            ? String(
                previousSession.districtId
              )
            : "",

      profileComplete:
        typeof session.profileComplete ===
          "boolean"
          ? session.profileComplete
          : Boolean(
              previousSession &&
              previousSession.profileComplete ===
                true
            ),

      onboardingRequired:
        typeof session.onboardingRequired ===
          "boolean"
          ? session.onboardingRequired
          : Boolean(
              previousSession &&
              previousSession.onboardingRequired ===
                true
            ),

      loginTime:
        session.loginTime ||
        (
          previousSession &&
          previousSession.loginTime
        ) ||
        "",

      /*
       * Login API returns sessionExpiryAt.
       * Validation API returns expiryAt.
       */

      expiryAt:
        session.expiryAt ||
        session.sessionExpiryAt ||
        (
          previousSession &&
          previousSession.expiryAt
        ) ||
        "",

      status:
        session.status ||
        (
          previousSession &&
          previousSession.status
        ) ||
        "Active",

      lastValidatedAt:
        session.lastValidatedAt ||
        (
          previousSession &&
          previousSession.lastValidatedAt
        ) ||
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
      typeof session !==
        "object" ||
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
   * SESSION ACCESS
   * ----------------------------------------------------------
   */

  getSessionId() {

    const session =
      this.get();


    return session
      ? session.sessionId
      : "";
  },


  getUserId() {

    const session =
      this.get();


    return session
      ? session.userId
      : "";
  },


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
      session ||
      this.get();


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


    if (
      Number.isNaN(
        expiryTime
      )
    ) {

      return true;
    }


    return (
      Date.now() >=
      expiryTime
    );
  },


  /*
   * ----------------------------------------------------------
   * LOCAL LOGIN CHECK
   * ----------------------------------------------------------
   */

  isLoggedIn() {

    const session =
      this.get();


    if (
      !session
    ) {

      return false;
    }


    if (
      this.isExpired(
        session
      )
    ) {

      this.clear();

      return false;
    }


    return true;
  },


  /*
   * ----------------------------------------------------------
   * RECENT VALIDATION CHECK
   * ----------------------------------------------------------
   */

  wasRecentlyValidated(
    maximumAgeMs = 60000
  ) {

    const session =
      this.get();


    if (
      !session ||
      !session.lastValidatedAt
    ) {

      return false;
    }


    const validationTime =
      new Date(
        session.lastValidatedAt
      ).getTime();


    if (
      Number.isNaN(
        validationTime
      )
    ) {

      return false;
    }


    return (
      Date.now() -
      validationTime <=
      Number(maximumAgeMs)
    );
  },


  /*
   * ----------------------------------------------------------
   * AUTHORITATIVE INVALID SESSION ERROR
   * ----------------------------------------------------------
   */

  isAuthoritativeSessionError(error) {

    const code =
      error &&
      error.code
        ? String(error.code)
            .trim()
            .toUpperCase()
        : "";


    return this.INVALID_SESSION_CODES
      .includes(
        code
      );
  },


  /*
   * ----------------------------------------------------------
   * RETRYABLE VALIDATION ERROR
   *
   * Temporary HTTP/deployment/network problems must never
   * automatically log out a locally valid user.
   * ----------------------------------------------------------
   */

  isRetryableValidationError(error) {

    const code =
      error &&
      error.code
        ? String(error.code)
            .trim()
            .toUpperCase()
        : "";


    return (
      code === "NETWORK_ERROR" ||
      code === "REQUEST_TIMEOUT" ||
      code === "HTTP_ERROR" ||
      code === "INVALID_JSON_RESPONSE" ||
      code === "INVALID_API_RESPONSE" ||
      code === "INVALID_RESPONSE_FORMAT"
    );
  },


  /*
   * ----------------------------------------------------------
   * BACKEND SESSION VALIDATION
   * ----------------------------------------------------------
   */

  async validate(
    options = {}
  ) {

    const session =
      this.get();


    if (
      !session
    ) {

      return {
        success: false,
        authenticated: false,
        retryable: false,
        reason:
          "LOCAL_SESSION_NOT_FOUND"
      };
    }


    if (
      this.isExpired(
        session
      )
    ) {

      this.clear();


      return {
        success: false,
        authenticated: false,
        retryable: false,
        reason:
          "LOCAL_SESSION_EXPIRED"
      };
    }


    const force =
      options.force === true;


    const maximumAgeMs =
      Number(
        options.maximumAgeMs
      ) || 60000;


    if (
      !force &&
      this.wasRecentlyValidated(
        maximumAgeMs
      )
    ) {

      return {
        success: true,
        authenticated: true,
        recent: true,
        session:
          session,
        requestId:
          ""
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

        const reason =
          String(
            data.reason ||
            "SESSION_INVALID"
          )
            .trim()
            .toUpperCase();


        if (
          this.INVALID_SESSION_CODES
            .includes(
              reason
            )
        ) {

          this.clear();
        }


        return {
          success: false,
          authenticated: false,
          retryable:
            !this.INVALID_SESSION_CODES
              .includes(
                reason
              ),
          reason:
            reason,
          requestId:
            response.requestId || ""
        };
      }


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

          mobile:
            data.mobile ||
            session.mobile,

          email:
            data.email ||
            session.email,

          preferredLanguage:
            data.preferredLanguage ||
            session.preferredLanguage,

          accountStatus:
            data.accountStatus ||
            session.accountStatus,

          verificationStatus:
            data.verificationStatus ||
            session.verificationStatus,

          districtId:
            data.districtId ||
            session.districtId,

          profileComplete:
            typeof data.profileComplete ===
              "boolean"
              ? data.profileComplete
              : session.profileComplete,

          onboardingRequired:
            typeof data.onboardingRequired ===
              "boolean"
              ? data.onboardingRequired
              : session.onboardingRequired,

          status:
            data.status ||
            session.status,

          expiryAt:
            data.expiryAt ||
            data.sessionExpiryAt ||
            session.expiryAt,

          lastValidatedAt:
            new Date().toISOString()

        });


      return {
        success: true,
        authenticated: true,
        recent: false,
        session:
          verifiedSession,
        requestId:
          response.requestId || ""
      };

    } catch (error) {

      if (
        this.isRetryableValidationError(
          error
        )
      ) {

        return {
          success: false,

          /*
           * Backend validation could not be confirmed,
           * but the unexpired local session is preserved.
           */

          authenticated:
            true,

          locallyAuthenticated:
            true,

          validationPending:
            true,

          retryable:
            true,

          reason:
            error.code ||
            "SESSION_VALIDATION_UNAVAILABLE",

          message:
            error.message ||
            "Session validation is temporarily unavailable.",

          httpStatus:
            error.httpStatus || 0,

          session:
            session,

          requestId:
            error.requestId || ""
        };
      }


      if (
        this.isAuthoritativeSessionError(
          error
        )
      ) {

        this.clear();


        return {
          success: false,
          authenticated: false,
          retryable: false,
          reason:
            error.code,
          message:
            error.message || "",
          requestId:
            error.requestId || ""
        };
      }


      /*
       * Unknown server errors do not prove that the
       * locally unexpired session is invalid.
       */

      return {
        success: false,
        authenticated: true,
        locallyAuthenticated: true,
        validationPending: true,
        retryable: true,
        reason:
          error.code ||
          "SESSION_VALIDATION_FAILED",
        message:
          error.message || "",
        session:
          session,
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


    if (
      !sessionId
    ) {

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
       * Explicit logout always removes the local session.
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
          error.message || "",
        requestId:
          error.requestId || ""
      };
    }
  },


  /*
   * ----------------------------------------------------------
   * LOCAL SESSION TEST
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
          mobile:
            "9876543210",
          email:
            "test@apnabite.test",
          preferredLanguage:
            "en",
          accountStatus:
            "ACTIVE",
          verificationStatus:
            "VERIFIED",
          districtId:
            "TEST_DISTRICT",
          profileComplete:
            true,
          onboardingRequired:
            false,
          expiryAt:
            futureExpiry
        });


      const fetched =
        this.get();


      const results = [

        {
          test:
            "Session saved",
          expected:
            "TEST_SESSION",
          actual:
            saved.sessionId,
          passed:
            saved.sessionId ===
            "TEST_SESSION"
        },

        {
          test:
            "User ID preserved",
          expected:
            "TEST_USER",
          actual:
            fetched
              ? fetched.userId
              : "",
          passed:
            Boolean(
              fetched &&
              fetched.userId ===
                "TEST_USER"
            )
        },

        {
          test:
            "Role preserved",
          expected:
            "Customer",
          actual:
            this.getRole(),
          passed:
            this.getRole() ===
            "Customer"
        },

        {
          test:
            "Email preserved",
          expected:
            "test@apnabite.test",
          actual:
            fetched
              ? fetched.email
              : "",
          passed:
            Boolean(
              fetched &&
              fetched.email ===
                "test@apnabite.test"
            )
        },

        {
          test:
            "District preserved",
          expected:
            "TEST_DISTRICT",
          actual:
            fetched
              ? fetched.districtId
              : "",
          passed:
            Boolean(
              fetched &&
              fetched.districtId ===
                "TEST_DISTRICT"
            )
        },

        {
          test:
            "Profile preserved",
          expected:
            true,
          actual:
            fetched
              ? fetched.profileComplete
              : false,
          passed:
            Boolean(
              fetched &&
              fetched.profileComplete ===
                true
            )
        },

        {
          test:
            "Locally logged in",
          expected:
            true,
          actual:
            this.isLoggedIn(),
          passed:
            this.isLoggedIn() ===
            true
        },

        {
          test:
            "Not expired",
          expected:
            false,
          actual:
            this.isExpired(
              fetched
            ),
          passed:
            this.isExpired(
              fetched
            ) === false
        }

      ];


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
          ? "Local Session Test: PASS"
          : "Local Session Test: FAIL"
      );


      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        saved:
          saved,
        fetched:
          fetched,
        results:
          results
      };

    } catch (error) {

      console.error(
        "Local Session Test: FAIL",
        error
      );


      return {
        success: false,
        status:
          "FAIL",
        error:
          error.message
      };

    } finally {

      this.clear();


      if (
        previousSession
      ) {

        AppStorage.set(
          this.KEY,
          previousSession
        );
      }
    }
  },


  /*
   * ----------------------------------------------------------
   * CURRENT BACKEND SESSION TEST
   *
   * This test does not create a login and does not logout.
   * Run only after normal login.
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
      "APNABITE CURRENT BACKEND SESSION TEST"
    );

    console.log(
      "========================================"
    );


    const before =
      this.get();


    if (
      !before
    ) {

      console.error(
        "Backend Session Test: LOGIN REQUIRED"
      );


      return {
        success: false,
        status:
          "LOGIN_REQUIRED",
        error:
          "Please login normally before running this test."
      };
    }


    try {

      const validation =
        await this.validate({
          force:
            true
        });


      const after =
        this.get();


      const passed =
        validation.authenticated ===
          true &&
        after !== null &&
        after.sessionId ===
          before.sessionId;


      const results = [

        {
          test:
            "Session available",
          expected:
            true,
          actual:
            after !== null,
          passed:
            after !== null
        },

        {
          test:
            "Authenticated",
          expected:
            true,
          actual:
            validation.authenticated,
          passed:
            validation.authenticated ===
              true
        },

        {
          test:
            "Session preserved",
          expected:
            before.sessionId,
          actual:
            after
              ? after.sessionId
              : "",
          passed:
            Boolean(
              after &&
              after.sessionId ===
                before.sessionId
            )
        }

      ];


      console.table(
        results
      );


      console.log(
        passed
          ? "Backend Session Test: PASS"
          : "Backend Session Test: FAIL"
      );


      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        validation:
          validation,
        session:
          after,
        results:
          results
      };

    } catch (error) {

      console.error(
        "Backend Session Test: FAIL",
        error
      );


      return {
        success: false,
        status:
          "FAIL",
        error:
          error.message,
        code:
          error.code || "",
        requestId:
          error.requestId || ""
      };
    }
  }

};
