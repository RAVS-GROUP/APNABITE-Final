/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/api.js
 * PURPOSE: Reliable central API communication layer
 * VERSION: 1.3.0
 * ============================================================
 *
 * IMPORTANT:
 * - No secrets are stored here.
 * - Same requestId is retained during a transport retry.
 * - Backend idempotency prevents duplicate OTP/session/writes.
 * - API errors are not automatically retried.
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
   * TIMEOUT SETTINGS
   * ----------------------------------------------------------
   */

  HEALTH_REQUEST_TIMEOUT_MS:
    20000,

  DEFAULT_REQUEST_TIMEOUT_MS:
    45000,

  OTP_REQUEST_TIMEOUT_MS:
    90000,

  OTP_VERIFY_TIMEOUT_MS:
    90000,

  AUTH_REQUEST_TIMEOUT_MS:
    60000,


  /*
   * ----------------------------------------------------------
   * TRANSPORT RETRY
   *
   * Maximum 2 total attempts:
   * - First normal request
   * - One safe recovery attempt using the same requestId
   * ----------------------------------------------------------
   */

  MAX_TRANSPORT_ATTEMPTS:
    2,

  RETRY_DELAY_MS:
    750,


  /*
   * ----------------------------------------------------------
   * AUTHENTICATION ACTIONS
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
   * ACTIONS SAFE FOR ONE TRANSPORT RETRY
   *
   * Read operations are naturally safe.
   * Write operations are protected by backend idempotency.
   * ----------------------------------------------------------
   */

  RETRYABLE_ACTIONS: [

    "health",

    "request_otp",
    "verify_otp",
    "register",
    "login",
    "validate_session",
    "logout",

    "search_service_locations",
    "get_district_service",
    "reverse_geocode_location",
    "discover_kitchens",

    "get_food_partner_profile",
    "save_food_partner_onboarding",
    "get_food_partner_operating_status",
    "set_food_partner_operating_status",

    "get_food_partner_kyc",
    "submit_food_partner_kyc",

    "admin_list_food_partner_kyc",
    "admin_get_food_partner_kyc",
    "admin_decide_food_partner_kyc",

    "get_food_partner_products",
    "save_food_partner_product",
    "set_food_partner_product_availability",
    "update_food_partner_product_order",

    "get_customer_addresses",
    "get_customer_address",
    "create_customer_address",
    "update_customer_address",
    "set_default_customer_address",
    "remove_customer_address",
    "find_nearest_customer_address"

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
      typeof action !==
        "string"
    ) {

      throw this.createClientError(
        "API action is required.",
        "ACTION_REQUIRED"
      );
    }


    if (
      payload === null ||
      typeof payload !==
        "object" ||
      Array.isArray(
        payload
      )
    ) {

      throw this.createClientError(
        "API payload must be an object.",
        "INVALID_PAYLOAD"
      );
    }


    if (
      options === null ||
      typeof options !==
        "object" ||
      Array.isArray(
        options
      )
    ) {

      throw this.createClientError(
        "API request options must be an object.",
        "INVALID_OPTIONS"
      );
    }


    const normalizedAction =
      action.trim();


    if (
      !normalizedAction
    ) {

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
        timeoutMs,
        options
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
   * RESOLVE TIMEOUT
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
      parsedCustomTimeout >=
        1000
    ) {

      return parsedCustomTimeout;
    }


    if (
      action ===
        "health"
    ) {

      return this
        .HEALTH_REQUEST_TIMEOUT_MS;
    }


    if (
      action ===
        "request_otp"
    ) {

      return this
        .OTP_REQUEST_TIMEOUT_MS;
    }


    if (
      action ===
        "verify_otp"
    ) {

      return this
        .OTP_VERIFY_TIMEOUT_MS;
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
   * EXECUTE REQUEST WITH SAFE RECOVERY
   * ----------------------------------------------------------
   */

  async executeRequest(
    requestBody,
    timeoutMs,
    options = {}
  ) {

    const startedAt =
      Date.now();


    const allowRetry =
      options.retry !== false &&
      this.RETRYABLE_ACTIONS.includes(
        requestBody.action
      );


    const maximumAttempts =
      allowRetry
        ? this.MAX_TRANSPORT_ATTEMPTS
        : 1;


    let lastError =
      null;


    for (
      let attempt = 1;
      attempt <= maximumAttempts;
      attempt += 1
    ) {

      try {

        const result =
          await this.executeSingleAttempt(
            requestBody,
            timeoutMs,
            attempt
          );


        result.durationMs =
          Date.now() -
          startedAt;


        result.transportAttempts =
          attempt;


        result.recovered =
          attempt > 1;


        if (
          attempt > 1
        ) {

          console.info(
            "API request recovered safely:",
            requestBody.action,
            requestBody.requestId
          );
        }


        return result;

      } catch (error) {

        lastError =
          error;


        const shouldRetry =
          attempt <
            maximumAttempts &&
          this.shouldRetryTransportError(
            error
          );


        if (
          !shouldRetry
        ) {

          throw error;
        }


        console.warn(
          "Temporary API transport failure. Retrying safely:",
          {
            action:
              requestBody.action,

            requestId:
              requestBody.requestId,

            attempt:
              attempt,

            code:
              error.code || "",

            httpStatus:
              error.httpStatus || 0
          }
        );


        await this.wait(
          this.RETRY_DELAY_MS
        );
      }
    }


    throw lastError ||
      this.createClientError(
        "API request failed.",
        "API_REQUEST_FAILED"
      );
  },


  /*
   * ----------------------------------------------------------
   * EXECUTE ONE HTTP ATTEMPT
   * ----------------------------------------------------------
   */

  async executeSingleAttempt(
    requestBody,
    timeoutMs,
    attempt
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


    try {

      const response =
        await fetch(
          this.BASE_URL,
          {

            method:
              "POST",

            headers: {

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


      if (
        !response.ok
      ) {

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


        httpError.attempt =
          attempt;


        httpError.responseUrl =
          response.url || "";


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


        responseError.attempt =
          attempt;


        throw responseError;
      }


      this.validateResponse(
        result,
        requestBody
      );


      if (
        !result.success
      ) {

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


        apiError.attempt =
          attempt;


        /*
         * Standard backend API errors are deliberate business
         * decisions and must never be transport-retried.
         */

        apiError.isApiResponseError =
          true;


        throw apiError;
      }


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


        timeoutError.attempt =
          attempt;


        throw timeoutError;
      }


      if (
        error &&
        error.code
      ) {

        throw error;
      }


      const networkError =
        new Error(
          "Unable to connect to ApnaBite. Please check your connection and try again."
        );


      networkError.code =
        "NETWORK_ERROR";


      networkError.requestId =
        requestBody.requestId;


      networkError.action =
        requestBody.action;


      networkError.attempt =
        attempt;


      networkError.originalMessage =
        error &&
        error.message
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
   * CHECK RETRYABLE TRANSPORT FAILURE
   * ----------------------------------------------------------
   */

  shouldRetryTransportError(error) {

    if (
      !error ||
      error.isApiResponseError ===
        true
    ) {

      return false;
    }


    const code =
      String(
        error.code || ""
      ).toUpperCase();


    if (
      code ===
        "NETWORK_ERROR" ||
      code ===
        "REQUEST_TIMEOUT" ||
      code ===
        "INVALID_JSON_RESPONSE" ||
      code ===
        "INVALID_API_RESPONSE" ||
      code ===
        "INVALID_RESPONSE_FORMAT"
    ) {

      return true;
    }


    if (
      code ===
        "HTTP_ERROR"
    ) {

      const retryableStatuses = [

        404,
        408,
        425,
        429,
        500,
        502,
        503,
        504

      ];


      return retryableStatuses.includes(
        Number(
          error.httpStatus
        )
      );
    }


    return false;
  },


  /*
   * ----------------------------------------------------------
   * WAIT
   * ----------------------------------------------------------
   */

  wait(milliseconds) {

    return new Promise(
      (resolve) => {

        window.setTimeout(
          resolve,
          Math.max(
            0,
            Number(milliseconds) || 0
          )
        );
      }
    );
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
      typeof result !==
        "object" ||
      Array.isArray(
        result
      )
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
   * TIMEOUT MESSAGE
   * ----------------------------------------------------------
   */

  getTimeoutMessage(action) {

    if (
      action ===
        "request_otp"
    ) {

      return (
        "OTP server response could not be confirmed. " +
        "ApnaBite is safely recovering the same request."
      );
    }


    if (
      action ===
        "verify_otp"
    ) {

      return (
        "OTP verification response could not be confirmed. " +
        "ApnaBite is safely recovering the same request."
      );
    }


    if (
      this.AUTH_ACTIONS.includes(
        action
      )
    ) {

      return (
        "The secure request could not be confirmed. " +
        "Please wait before trying again."
      );
    }


    return (
      "The server response is taking longer than expected. " +
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
        String(
          payload
        );
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
        .substring(
          2,
          10
        )
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
        result.success ===
          true &&
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

        transportAttempts:
          result.transportAttempts,

        recovered:
          result.recovered,

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
        status:
          "FAIL",
        error:
          error.message,
        code:
          error.code || "",
        httpStatus:
          error.httpStatus || 0,
        requestId:
          error.requestId || ""
      };
    }
  },


  /*
   * ----------------------------------------------------------
   * TEST 2 — RETRY CONFIGURATION
   *
   * Browser console:
   * API.testRetryConfiguration()
   * ----------------------------------------------------------
   */

  testRetryConfiguration() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE API RETRY CONFIGURATION TEST"
    );

    console.log(
      "========================================"
    );


    const tests = [

      {
        test:
          "Maximum attempts",
        expected:
          2,
        actual:
          this.MAX_TRANSPORT_ATTEMPTS
      },

      {
        test:
          "HTTP 404 retryable",
        expected:
          true,
        actual:
          this.shouldRetryTransportError({
            code:
              "HTTP_ERROR",
            httpStatus:
              404
          })
      },

      {
        test:
          "Network error retryable",
        expected:
          true,
        actual:
          this.shouldRetryTransportError({
            code:
              "NETWORK_ERROR"
          })
      },

      {
        test:
          "Timeout retryable",
        expected:
          true,
        actual:
          this.shouldRetryTransportError({
            code:
              "REQUEST_TIMEOUT"
          })
      },

      {
        test:
          "Business error retryable",
        expected:
          false,
        actual:
          this.shouldRetryTransportError({
            code:
              "OTP_INCORRECT",
            isApiResponseError:
              true
          })
      },

      {
        test:
          "Login action protected",
        expected:
          true,
        actual:
          this.RETRYABLE_ACTIONS
            .includes(
              "login"
            )
      }

    ];


    const results =
      tests.map(
        (test) => ({

          test:
            test.test,

          expected:
            test.expected,

          actual:
            test.actual,

          passed:
            test.actual ===
            test.expected

        })
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
        ? "API Retry Configuration Test: PASS"
        : "API Retry Configuration Test: FAIL"
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
   * TEST 3 — LIVE BACKEND IDEMPOTENCY
   *
   * Uses health only. No data is changed.
   *
   * Browser console:
   * API.testBackendIdempotency()
   * ----------------------------------------------------------
   */

  async testBackendIdempotency() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE LIVE IDEMPOTENCY TEST"
    );

    console.log(
      "========================================"
    );


    const requestId =
      "LIVE_IDEMPOTENCY_" +
      Date.now();


    try {

      const first =
        await this.request(
          "health",
          {},
          {
            requestId:
              requestId,
            timeoutMs:
              60000
          }
        );


      const second =
        await this.request(
          "health",
          {},
          {
            requestId:
              requestId,
            timeoutMs:
              60000
          }
        );


      const sameRequestId =
        first.requestId ===
          requestId &&
        second.requestId ===
          requestId;


      const sameTimestamp =
        first.data &&
        second.data &&
        first.data.timestamp ===
          second.data.timestamp;


      const passed =
        first.success ===
          true &&
        second.success ===
          true &&
        sameRequestId &&
        sameTimestamp;


      const results = [

        {
          test:
            "First response",
          expected:
            true,
          actual:
            first.success,
          passed:
            first.success ===
              true
        },

        {
          test:
            "Second response",
          expected:
            true,
          actual:
            second.success,
          passed:
            second.success ===
              true
        },

        {
          test:
            "Same request ID",
          expected:
            true,
          actual:
            sameRequestId,
          passed:
            sameRequestId
        },

        {
          test:
            "Same cached response",
          expected:
            true,
          actual:
            sameTimestamp,
          passed:
            sameTimestamp
        }

      ];


      console.table(
        results
      );


      console.log(
        passed
          ? "Live Idempotency Test: PASS"
          : "Live Idempotency Test: FAIL"
      );


      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        requestId:
          requestId,
        first:
          first,
        second:
          second,
        results:
          results
      };

    } catch (error) {

      console.error(
        "Live Idempotency Test: FAIL",
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
        httpStatus:
          error.httpStatus || 0,
        requestId:
          error.requestId || ""
      };
    }
  }

};
