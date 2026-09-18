/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/api.js
 * PURPOSE: Central API communication layer
 * VERSION: 1.1.0
 * ============================================================
 *
 * RESPONSIBILITIES:
 * 1. Central API URL
 * 2. Standard API request structure
 * 3. Request ID generation
 * 4. Duplicate request protection
 * 5. Action-specific request timeout
 * 6. Response validation
 * 7. Standard error handling
 * 8. API health and configuration testing
 *
 * IMPORTANT:
 * - No secrets are stored here.
 * - Sensitive calculations remain on backend.
 * - OTP requests are not automatically retried.
 * ============================================================
 */

const API = {

  /*
   * ----------------------------------------------------------
   * LIVE APNABITE APPS SCRIPT WEB APP
   * ----------------------------------------------------------
   */

  BASE_URL:
    "https://script.google.com/macros/s/AKfycbzM-Y1Lc5G24lEmB4wVbK7dK0kD8ZjuEr_rCXM8Wt_qYrROdj2LTlvnZcDSbZY000AVsQ/exec",


  /*
   * ----------------------------------------------------------
   * REQUEST TIMEOUT SETTINGS
   * ----------------------------------------------------------
   *
   * Health:
   * Lightweight connectivity check.
   *
   * Default:
   * Normal application requests.
   *
   * Auth:
   * Google Apps Script cold starts and mobile networks can
   * require additional time for OTP/session operations.
   * ----------------------------------------------------------
   */

  HEALTH_REQUEST_TIMEOUT_MS:
    15000,

  DEFAULT_REQUEST_TIMEOUT_MS:
    20000,

  AUTH_REQUEST_TIMEOUT_MS:
    30000,


  /*
   * ----------------------------------------------------------
   * LONG-RUNNING AUTHENTICATION ACTIONS
   * ----------------------------------------------------------
   */

  AUTH_ACTIONS: [
    "request_otp",
    "verify_otp",
    "register",
    "login",
    "validate_session",
    "logout"
  ],


  /*
   * ----------------------------------------------------------
   * DUPLICATE REQUEST PROTECTION
   * ----------------------------------------------------------
   */

  pendingRequests:
    new Map(),


  /*
   * ----------------------------------------------------------
   * MAIN REQUEST METHOD
   * ----------------------------------------------------------
   */

  async request(
    action,
    payload = {},
    options = {}
  ) {

    if (
      !action ||
      typeof action !== "string"
    ) {

      throw this.createClientError(
        "API action is required.",
        "ACTION_REQUIRED"
      );
    }


    if (
      payload === null ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {

      throw this.createClientError(
        "API payload must be an object.",
        "INVALID_PAYLOAD"
      );
    }


    if (
      options === null ||
      typeof options !== "object" ||
      Array.isArray(options)
    ) {

      throw this.createClientError(
        "API request options must be an object.",
        "INVALID_OPTIONS"
      );
    }


    const normalizedAction =
      action.trim();


    if (!normalizedAction) {

      throw this.createClientError(
        "API action is required.",
        "ACTION_REQUIRED"
      );
    }


    const requestBody = {

      action:
        normalizedAction,

      payload:
        payload,

      requestId:
        options.requestId ||
        this.createRequestId()

    };


    const requestKey =
      this.createRequestKey(
        normalizedAction,
        payload
      );


    /*
     * If an identical request is already running,
     * return its existing Promise.
     */

    if (
      this.pendingRequests.has(
        requestKey
      )
    ) {

      console.warn(
        "Duplicate API request prevented:",
        normalizedAction
      );

      return this.pendingRequests.get(
        requestKey
      );
    }


    const timeoutMs =
      this.resolveTimeout(
        normalizedAction,
        options.timeoutMs
      );


    const requestPromise =
      this.executeRequest(
        requestBody,
        timeoutMs
      );


    this.pendingRequests.set(
      requestKey,
      requestPromise
    );


    try {

      return await requestPromise;

    } finally {

      this.pendingRequests.delete(
        requestKey
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * RESOLVE REQUEST TIMEOUT
   * ----------------------------------------------------------
   */

  resolveTimeout(
    action,
    customTimeout
  ) {

    const parsedCustomTimeout =
      Number(
        customTimeout
      );


    if (
      Number.isFinite(
        parsedCustomTimeout
      ) &&
      parsedCustomTimeout >= 1000
    ) {

      return parsedCustomTimeout;
    }


    if (
      action === "health"
    ) {

      return this
        .HEALTH_REQUEST_TIMEOUT_MS;
    }


    if (
      this.AUTH_ACTIONS.includes(
        action
      )
    ) {

      return this
        .AUTH_REQUEST_TIMEOUT_MS;
    }


    return this
      .DEFAULT_REQUEST_TIMEOUT_MS;
  },


  /*
   * ----------------------------------------------------------
   * EXECUTE HTTP REQUEST
   * ----------------------------------------------------------
   */

  async executeRequest(
    requestBody,
    timeoutMs
  ) {

    const controller =
      new AbortController();


    const timeoutId =
      window.setTimeout(
        () => {

          controller.abort();
        },
        timeoutMs
      );


    const startedAt =
      Date.now();


    try {

      const response =
        await fetch(
          this.BASE_URL,
          {

            method:
              "POST",

            headers: {

              /*
               * text/plain is intentional.
               * Apps Script accepts the JSON request body
               * without unnecessary CORS preflight.
               */

              "Content-Type":
                "text/plain;charset=utf-8"

            },

            body:
              JSON.stringify(
                requestBody
              ),

            signal:
              controller.signal,

            cache:
              "no-store",

            redirect:
              "follow"

          }
        );


      if (!response.ok) {

        const httpError =
          new Error(
            "API request failed. HTTP status: " +
            response.status
          );


        httpError.code =
          "HTTP_ERROR";

        httpError.httpStatus =
          response.status;

        httpError.requestId =
          requestBody.requestId;

        httpError.action =
          requestBody.action;


        throw httpError;
      }


      let result;


      try {

        result =
          await response.json();

      } catch (error) {

        const responseError =
          new Error(
            "ApnaBite server returned an invalid response."
          );


        responseError.code =
          "INVALID_JSON_RESPONSE";

        responseError.requestId =
          requestBody.requestId;

        responseError.action =
          requestBody.action;


        throw responseError;
      }


      this.validateResponse(
        result,
        requestBody
      );


      if (!result.success) {

        const errorCode =
          result.error &&
          result.error.code
            ? result.error.code
            : "API_ERROR";


        const errorMessage =
          result.error &&
          result.error.message
            ? result.error.message
            : "API request failed.";


        const apiError =
          new Error(
            errorMessage
          );


        apiError.code =
          errorCode;

        apiError.requestId =
          result.requestId ||
          requestBody.requestId;

        apiError.action =
          requestBody.action;


        throw apiError;
      }


      result.durationMs =
        Date.now() -
        startedAt;


      return result;

    } catch (error) {

      if (
        error &&
        error.name ===
          "AbortError"
      ) {

        const timeoutError =
          new Error(
            this.getTimeoutMessage(
              requestBody.action
            )
          );


        timeoutError.code =
          "REQUEST_TIMEOUT";

        timeoutError.requestId =
          requestBody.requestId;

        timeoutError.action =
          requestBody.action;

        timeoutError.timeoutMs =
          timeoutMs;


        throw timeoutError;
      }


      /*
       * Preserve errors already created by API layer
       * or returned by backend.
       */

      if (
        error &&
        error.code
      ) {

        throw error;
      }


      const networkError =
        new Error(
          "Unable to connect to ApnaBite. Please check your internet connection and try again."
        );


      networkError.code =
        "NETWORK_ERROR";

      networkError.requestId =
        requestBody.requestId;

      networkError.action =
        requestBody.action;

      networkError.originalMessage =
        error && error.message
          ? error.message
          : "";


      throw networkError;

    } finally {

      window.clearTimeout(
        timeoutId
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * RESPONSE VALIDATION
   * ----------------------------------------------------------
   */

  validateResponse(
    result,
    requestBody
  ) {

    if (
      !result ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {

      const error =
        new Error(
          "Invalid API response."
        );


      error.code =
        "INVALID_API_RESPONSE";

      error.requestId =
        requestBody.requestId;

      error.action =
        requestBody.action;


      throw error;
    }


    if (
      typeof result.success !==
        "boolean"
    ) {

      const error =
        new Error(
          "Invalid API response format."
        );


      error.code =
        "INVALID_RESPONSE_FORMAT";

      error.requestId =
        requestBody.requestId;

      error.action =
        requestBody.action;


      throw error;
    }
  },


  /*
   * ----------------------------------------------------------
   * ACTION-SPECIFIC TIMEOUT MESSAGE
   * ----------------------------------------------------------
   */

  getTimeoutMessage(action) {

    if (
      action === "request_otp"
    ) {

      return (
        "OTP request is taking longer than expected. " +
        "Please check your internet connection before trying again."
      );
    }


    if (
      action === "verify_otp"
    ) {

      return (
        "OTP verification is taking longer than expected. " +
        "Please check your connection and try again."
      );
    }


    if (
      this.AUTH_ACTIONS.includes(
        action
      )
    ) {

      return (
        "Secure login request is taking longer than expected. " +
        "Please try again."
      );
    }


    return (
      "Request is taking longer than expected. " +
      "Please try again."
    );
  },


  /*
   * ----------------------------------------------------------
   * CLIENT ERROR
   * ----------------------------------------------------------
   */

  createClientError(
    message,
    code
  ) {

    const error =
      new Error(
        message
      );


    error.code =
      code ||
      "CLIENT_ERROR";


    return error;
  },


  /*
   * ----------------------------------------------------------
   * REQUEST KEY
   * ----------------------------------------------------------
   */

  createRequestKey(
    action,
    payload
  ) {

    let payloadString;


    try {

      payloadString =
        JSON.stringify(
          payload
        );

    } catch (error) {

      payloadString =
        String(payload);
    }


    return (
      action +
      ":" +
      payloadString
    );
  },


  /*
   * ----------------------------------------------------------
   * REQUEST ID
   * ----------------------------------------------------------
   */

  createRequestId() {

    return (
      "REQ_" +
      Date.now()
        .toString(36)
        .toUpperCase() +
      "_" +
      Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()
    );
  },


  /*
   * ----------------------------------------------------------
   * HEALTH CHECK
   * ----------------------------------------------------------
   */

  async healthCheck() {

    return this.request(
      "health",
      {}
    );
  },


  /*
   * ----------------------------------------------------------
   * TEST 1 — API HEALTH
   *
   * Browser console:
   * API.testHealth()
   * ----------------------------------------------------------
   */

  async testHealth() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE FRONTEND API TEST"
    );

    console.log(
      "========================================"
    );


    try {

      const result =
        await this.healthCheck();


      console.log(
        "API URL:",
        this.BASE_URL
      );


      console.log(
        "Response:",
        result
      );


      const passed =
        result &&
        result.success === true &&
        result.data &&
        result.data.status ===
          "API_RUNNING";


      console.log(
        passed
          ? "Frontend API Test: PASS"
          : "Frontend API Test: FAIL"
      );


      return {
        success:
          passed,

        status:
          passed
            ? "PASS"
            : "FAIL",

        durationMs:
          result.durationMs,

        result:
          result
      };

    } catch (error) {

      console.error(
        "Frontend API Test: FAIL",
        error
      );


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
   * TEST 2 — TIMEOUT CONFIGURATION
   *
   * Browser console:
   * API.testTimeoutConfiguration()
   * ----------------------------------------------------------
   */

  testTimeoutConfiguration() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE API TIMEOUT CONFIGURATION TEST"
    );

    console.log(
      "========================================"
    );


    const tests = [

      {
        action:
          "health",

        expected:
          15000
      },

      {
        action:
          "search_service_locations",

        expected:
          20000
      },

      {
        action:
          "request_otp",

        expected:
          30000
      },

      {
        action:
          "verify_otp",

        expected:
          30000
      },

      {
        action:
          "login",

        expected:
          30000
      },

      {
        action:
          "validate_session",

        expected:
          30000
      }

    ];


    const results =
      tests.map(
        (test) => {

          const actual =
            this.resolveTimeout(
              test.action
            );


          return {
            action:
              test.action,

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
        ? "API Timeout Configuration Test: PASS"
        : "API Timeout Configuration Test: FAIL"
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
  }

};
