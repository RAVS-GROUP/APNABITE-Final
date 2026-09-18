/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/auth.js
 * PURPOSE: OTP-secured frontend authentication
 * VERSION: 2.0.0
 * ============================================================
 */

const Auth = {

  ROLES: {
    CUSTOMER:
      "Customer",

    FOOD_PARTNER:
      "Food Partner",

    RIDER:
      "Rider",

    ADMIN:
      "Admin"
  },


  OTP_PURPOSES: {
    LOGIN:
      "LOGIN",

    REGISTER:
      "REGISTER"
  },


  /*
   * ----------------------------------------------------------
   * MOBILE UTILITIES
   * ----------------------------------------------------------
   */

  normalizeMobile(mobile) {

    return String(
      mobile || ""
    )
      .replace(/\D/g, "")
      .slice(-10);
  },


  isValidMobile(mobile) {

    return /^[6-9]\d{9}$/.test(
      this.normalizeMobile(
        mobile
      )
    );
  },


  /*
   * ----------------------------------------------------------
   * RESPONSE UTILITIES
   * ----------------------------------------------------------
   */

  getResponseData(response) {

    if (
      !response ||
      typeof response !== "object" ||
      !response.data ||
      typeof response.data !== "object"
    ) {

      throw this.createError(
        "Authentication returned an invalid response.",
        "INVALID_AUTH_RESPONSE"
      );
    }

    return response.data;
  },


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
   * REQUEST OTP
   * ----------------------------------------------------------
   */

  async requestOtp(
    mobile,
    purpose
  ) {

    const normalizedMobile =
      this.normalizeMobile(
        mobile
      );

    const normalizedPurpose =
      String(
        purpose || ""
      )
        .trim()
        .toUpperCase();


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


    if (
      normalizedPurpose !==
        this.OTP_PURPOSES.LOGIN &&
      normalizedPurpose !==
        this.OTP_PURPOSES.REGISTER
    ) {

      throw this.createError(
        "Invalid OTP purpose.",
        "INVALID_OTP_PURPOSE"
      );
    }


    const response =
      await API.request(
        "request_otp",
        {
          mobile:
            normalizedMobile,

          purpose:
            normalizedPurpose
        }
      );


    const result =
      this.getResponseData(
        response
      );


    if (
      result.success !== true ||
      result.otpRequested !== true
    ) {

      throw this.createError(
        result.reason ||
        "Unable to request OTP.",
        result.reason ||
        "OTP_REQUEST_FAILED",
        response.requestId
      );
    }


    return {
      success: true,
      otpRequested: true,
      mobile:
        result.mobile,
      purpose:
        result.purpose,
      expiresInSeconds:
        result.expiresInSeconds,
      resendAfterSeconds:
        result.resendAfterSeconds,
      mode:
        result.mode || "",
      testOtp:
        result.testOtp || "",
      requestId:
        response.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * REQUEST LOGIN OTP
   * ----------------------------------------------------------
   */

  async requestLoginOtp(mobile) {

    return this.requestOtp(
      mobile,
      this.OTP_PURPOSES.LOGIN
    );
  },


  /*
   * ----------------------------------------------------------
   * REQUEST REGISTRATION OTP
   * ----------------------------------------------------------
   */

  async requestRegistrationOtp(
    mobile
  ) {

    return this.requestOtp(
      mobile,
      this.OTP_PURPOSES.REGISTER
    );
  },


  /*
   * ----------------------------------------------------------
   * VERIFY OTP
   * ----------------------------------------------------------
   */

  async verifyOtp(
    mobile,
    purpose,
    otp
  ) {

    const normalizedMobile =
      this.normalizeMobile(
        mobile
      );

    const normalizedPurpose =
      String(
        purpose || ""
      )
        .trim()
        .toUpperCase();

    const normalizedOtp =
      String(
        otp || ""
      )
        .replace(/\D/g, "");


    if (
      !this.isValidMobile(
        normalizedMobile
      )
    ) {

      throw this.createError(
        "Please enter a valid mobile number.",
        "INVALID_MOBILE"
      );
    }


    if (
      !/^\d{6}$/.test(
        normalizedOtp
      )
    ) {

      throw this.createError(
        "Please enter a valid 6-digit OTP.",
        "INVALID_OTP_FORMAT"
      );
    }


    const response =
      await API.request(
        "verify_otp",
        {
          mobile:
            normalizedMobile,

          purpose:
            normalizedPurpose,

          otp:
            normalizedOtp
        }
      );


    const result =
      this.getResponseData(
        response
      );


    if (
      result.success !== true ||
      result.verified !== true ||
      !result.verificationToken
    ) {

      throw this.createError(
        result.reason ||
        "OTP verification failed.",
        result.reason ||
        "OTP_VERIFICATION_FAILED",
        response.requestId
      );
    }


    return {
      success: true,
      verified: true,
      mobile:
        result.mobile,
      purpose:
        result.purpose,
      verificationToken:
        result.verificationToken,
      tokenExpiresInSeconds:
        result.tokenExpiresInSeconds,
      requestId:
        response.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * OTP-VERIFIED LOGIN
   * ----------------------------------------------------------
   */

  async login(
    mobile,
    verificationToken
  ) {

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
        "Please enter a valid mobile number.",
        "INVALID_MOBILE"
      );
    }


    if (!verificationToken) {

      throw this.createError(
        "OTP verification is required.",
        "VERIFICATION_TOKEN_REQUIRED"
      );
    }


    const response =
      await API.request(
        "login",
        {
          mobile:
            normalizedMobile,

          verificationToken:
            verificationToken
        }
      );


    const result =
      this.getResponseData(
        response
      );


    if (
      result.success !== true ||
      result.authenticated !== true ||
      result.otpVerified !== true ||
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
      otpVerified: true,
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
   * OTP-VERIFIED REGISTRATION
   * ----------------------------------------------------------
   */

  async register(
    data,
    verificationToken
  ) {

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


    if (
      !this.isValidMobile(
        mobile
      )
    ) {

      throw this.createError(
        "Please enter a valid mobile number.",
        "INVALID_MOBILE"
      );
    }


    if (!role) {

      throw this.createError(
        "Please select a user role.",
        "INVALID_ROLE"
      );
    }


    if (!verificationToken) {

      throw this.createError(
        "OTP verification is required.",
        "VERIFICATION_TOKEN_REQUIRED"
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
            preferredLanguage,

          verificationToken:
            verificationToken
        }
      );


    const result =
      this.getResponseData(
        response
      );


    if (
      result.success !== true ||
      result.registered !== true ||
      result.otpVerified !== true ||
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
      otpVerified: true,
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
          result.preferredLanguage ||
          "en"
      },
      requestId:
        response.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * SESSION RESTORATION
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
   * SESSION AND USER ACCESS
   * ----------------------------------------------------------
   */

  isLoggedIn() {

    return SessionManager
      .isLoggedIn();
  },


  getSession() {

    return SessionManager.get();
  },


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


  getUserId() {

    return SessionManager
      .getUserId();
  },


  getRole() {

    return SessionManager
      .getRole();
  },


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


  async logout() {

    return SessionManager.logout();
  },


  /*
   * ----------------------------------------------------------
   * FRONTEND VALIDATION TEST
   * ----------------------------------------------------------
   */

  testValidation() {

    const tests = [

      {
        mobile:
          "9876543210",
        expected:
          true
      },

      {
        mobile:
          "+91 98765 43210",
        expected:
          true
      },

      {
        mobile:
          "12345",
        expected:
          false
      }
    ];


    const results =
      tests.map(
        (test) => {

          const actual =
            this.isValidMobile(
              test.mobile
            );

          return {
            ...test,
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
   * LIVE OTP LOGIN TEST
   *
   * Browser console:
   * Auth.testOtpLogin()
   * ----------------------------------------------------------
   */

  async testOtpLogin() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE FRONTEND OTP LOGIN TEST"
    );

    console.log(
      "========================================"
    );


    const mobile =
      "9876543210";


    try {

      SessionManager.clear();


      const otpRequest =
        await this.requestLoginOtp(
          mobile
        );


      console.log(
        "Login OTP Request:",
        otpRequest
      );


      if (!otpRequest.testOtp) {

        throw new Error(
          "Test OTP was not returned."
        );
      }


      const verification =
        await this.verifyOtp(
          mobile,
          this.OTP_PURPOSES.LOGIN,
          otpRequest.testOtp
        );


      console.log(
        "Login OTP Verification:",
        verification
      );


      const loginResult =
        await this.login(
          mobile,
          verification
            .verificationToken
        );


      console.log(
        "OTP Login Result:",
        loginResult
      );


      const restoration =
        await this.restoreSession();


      console.log(
        "Session Restoration:",
        restoration
      );


      if (
        !loginResult.success ||
        !loginResult.authenticated ||
        !restoration.success ||
        !restoration.authenticated
      ) {

        throw new Error(
          "Frontend OTP login flow failed."
        );
      }


      const logoutResult =
        await this.logout();


      console.log(
        "Logout Result:",
        logoutResult
      );


      console.log(
        "Frontend OTP Login Test: PASS"
      );


      return {
        success: true,
        status: "PASS",
        otpRequest:
          otpRequest,
        verification:
          verification,
        login:
          loginResult,
        restoration:
          restoration,
        logout:
          logoutResult
      };

    } catch (error) {

      console.error(
        "Frontend OTP Login Test: FAIL",
        error
      );


      SessionManager.clear();


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
    }
  },


  /*
   * ----------------------------------------------------------
   * LIVE OTP REGISTRATION TEST
   *
   * Browser console:
   * Auth.testOtpRegistration()
   * ----------------------------------------------------------
   */

  async testOtpRegistration() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE FRONTEND OTP REGISTRATION TEST"
    );

    console.log(
      "========================================"
    );


    const mobile =
      "9" +
      String(
        Date.now()
      ).slice(-9);


    try {

      const otpRequest =
        await this
          .requestRegistrationOtp(
            mobile
          );


      console.log(
        "Registration OTP Request:",
        otpRequest
      );


      if (!otpRequest.testOtp) {

        throw new Error(
          "Registration test OTP was not returned."
        );
      }


      const verification =
        await this.verifyOtp(
          mobile,
          this.OTP_PURPOSES.REGISTER,
          otpRequest.testOtp
        );


      console.log(
        "Registration OTP Verification:",
        verification
      );


      const registration =
        await this.register(
          {
            mobile:
              mobile,

            role:
              "Customer",

            email:
              "frontend-otp-" +
              Date.now() +
              "@apnabite.test",

            preferredLanguage:
              "en"
          },

          verification
            .verificationToken
        );


      console.log(
        "OTP Registration Result:",
        registration
      );


      if (
        !registration.success ||
        !registration.registered ||
        !registration.otpVerified
      ) {

        throw new Error(
          "Frontend OTP registration failed."
        );
      }


      console.log(
        "Frontend OTP Registration Test: PASS"
      );


      return {
        success: true,
        status: "PASS",
        testMobile:
          mobile,
        otpRequest:
          otpRequest,
        verification:
          verification,
        registration:
          registration
      };

    } catch (error) {

      console.error(
        "Frontend OTP Registration Test: FAIL",
        error
      );


      return {
        success: false,
        status: "FAIL",
        testMobile:
          mobile,
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
