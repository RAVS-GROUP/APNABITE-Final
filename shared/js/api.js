/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/api.js
 * PURPOSE: Central API communication layer
 * ============================================================
 */

const API = {

  BASE_URL:
    "https://script.google.com/macros/s/AKfycbzM-Y1Lc5G24lEmB4wVbK7dK0kD8ZjuEr_rCXM8Wt_qYrROdj2LTlvnZcDSbZY000AVsQ/exec",


  pendingRequests: new Map(),


  async request(action, payload = {}) {

    const requestBody = {
      action: action,
      payload: payload,
      requestId: this.createRequestId()
    };

    const requestKey =
      action + ":" + JSON.stringify(payload);


    /*
     * Prevent duplicate simultaneous requests.
     */
    if (
      this.pendingRequests.has(requestKey)
    ) {

      return this.pendingRequests.get(
        requestKey
      );
    }


    const requestPromise =
      this.executeRequest(requestBody);


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


  async executeRequest(requestBody) {

    const response = await fetch(
      this.BASE_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },

        body: JSON.stringify(requestBody)
      }
    );


    if (!response.ok) {

      throw new Error(
        "API request failed: " +
        response.status
      );
    }


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.error &&
        result.error.message
          ? result.error.message
          : "API request failed."
      );
    }


    return result;
  },


  createRequestId() {

    return (
      Date.now().toString(36) +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 10)
    );
  }

};
