/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/api.js
 * PURPOSE: Central API communication layer
 * VERSION: 1.0.0
 * ============================================================
 *
 * RESPONSIBILITIES:
 * 1. Central API URL
 * 2. Standard API request structure
 * 3. Request ID generation
 * 4. Duplicate request protection
 * 5. Request timeout
 * 6. Response validation
 * 7. Standard error handling
 * 8. API health testing
 *
 * IMPORTANT:
 * - No secrets are stored here.
 * - Sensitive calculations remain on backend.
 * - Frontend receives only required API data.
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
   * REQUEST SETTINGS
   * ----------------------------------------------------------
   */

  REQUEST_TIMEOUT_MS: 10000,


  /*
   * ----------------------------------------------------------
   * DUPLICATE REQUEST PROTECTION
   *
   * Same action + same payload already running:
   * return the existing Promise instead of creating
   * another API call.
   * ----------------------------------------------------------
   */

  pendingRequests: new Map(),


  /*
   * ----------------------------------------------------------
   * MAIN REQUEST METHOD
   * ----------------------------------------------------------
   */

  async request(action, payload = {}) {

    if (
      !action ||
      typeof action !== "string"
    ) {

      throw new Error(
        "API action is required."
      );
    }


    if (
      payload === null ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {

      throw new Error(
        "API payload must be an object."
      );
    }


    /*
     * Create complete request body.
     */
    const requestBody = {

      action: action,

      payload: payload,

      requestId: this.createRequestId()

    };


    /*
     * Create duplicate-request key.
     *
     * Example:
     * login:{"mobile":"9876543210"}
     */
    const requestKey =
      this.createRequestKey(
        action,
        payload
      );


    /*
     * If same request is already running,
     * return the existing Promise.
     */
    if (
      this.pendingRequests.has(
        requestKey
      )
    ) {

      return this.pendingRequests.get(
        requestKey
      );
    }


    /*
     * Start request.
     */
    const requestPromise =
      this.executeRequest(
        requestBody
      );


    /*
     * Store active request.
     */
    this.pendingRequests.set(
      requestKey,
      requestPromise
    );


    try {

      return await requestPromise;

    } finally {

      /*
       * Remove request after completion,
       * success OR failure.
       */
      this.pendingRequests.delete(
        requestKey
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * EXECUTE HTTP REQUEST
   * ----------------------------------------------------------
   */

  async executeRequest(requestBody) {

    const controller =
      new AbortController();


    /*
     * Automatic timeout.
     */
    const timeoutId =
      setTimeout(
        function() {

          controller.abort();

        },
        this.REQUEST_TIMEOUT_MS
      );


    try {

      const response =
        await fetch(
          this.BASE_URL,
          {

            method: "POST",

            headers: {

              /*
               * text/plain is intentional.
               * Apps Script Web App handles this reliably
               * for our JSON request body.
               */
              "Content-Type":
                "text/plain;charset=utf-8"

            },

            body:
              JSON.stringify(
                requestBody
              ),

            signal:
              controller.signal

          }
        );


      /*
       * HTTP-level validation.
       */
      if (!response.ok) {

        throw new Error(
          "API request failed. HTTP status: " +
          response.status
        );
      }


      /*
       * Parse JSON response.
       */
      let result;

      try {

        result =
          await response.json();

      } catch (error) {

        throw new Error(
          "API returned an invalid response."
        );
      }


      /*
       * Basic response structure validation.
       */
      if (
        !result ||
        typeof result !== "object"
      ) {

        throw new Error(
          "Invalid API response."
        );
      }


      /*
       * Backend must return success flag.
       */
      if (
        typeof result.success !==
        "boolean"
      ) {

        throw new Error(
          "Invalid API response format."
        );
      }


      /*
       * Backend business/API error.
       */
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


        /*
         * Preserve backend error information
         * for future UI handling.
         */
        apiError.code =
          errorCode;


        apiError.requestId =
          result.requestId || "";


        throw apiError;
      }


      /*
       * Successful response.
       */
      return result;


    } catch (error) {

      /*
       * Convert AbortController timeout
       * into a user-friendly error.
       */
      if (
        error &&
        error.name === "AbortError"
      ) {

        const timeoutError =
          new Error(
            "Request timed out. Please try again."
          );


        timeoutError.code =
          "REQUEST_TIMEOUT";


        timeoutError.requestId =
          requestBody.requestId;


        throw timeoutError;
      }


      /*
       * Preserve already-created API errors.
       */
      if (
        error &&
        error.code
      ) {

        throw error;
      }


      /*
       * Network / unknown error.
       */
      const networkError =
        new Error(
          error &&
          error.message
            ? error.message
            : "Unable to connect to ApnaBite."
        );


      networkError.code =
        "NETWORK_ERROR";


      networkError.requestId =
        requestBody.requestId;


      throw networkError;


    } finally {

      clearTimeout(
        timeoutId
      );

    }
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
   * FRONTEND API TEST
   *
   * Browser console test:
   *
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


      if (
        result &&
        result.success === true &&
        result.data &&
        result.data.status ===
          "API_RUNNING"
      ) {

        console.log(
          "Frontend API Test: PASS"
        );


        return {
          success: true,
          status: "PASS",
          result: result
        };

      }


      console.error(
        "Frontend API Test: FAIL"
      );


      return {
        success: false,
        status: "FAIL",
        result: result
      };


    } catch (error) {

      console.error(
        "Frontend API Test: FAIL"
      );


      console.error(
        "Error:",
        error
      );


      return {
        success: false,
        status: "FAIL",
        error: error.message,
        code: error.code || "",
        requestId:
          error.requestId || ""
      };
    }
  }

};
