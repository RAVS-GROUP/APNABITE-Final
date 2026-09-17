const API = {

  BASE_URL: "",

  pendingRequests: new Map(),

  async request(action, payload = {}, options = {}) {

    const method = options.method || "POST";

    const requestBody = {
      action: action,
      payload: payload,
      requestId: this.createRequestId()
    };

    const requestKey = JSON.stringify(requestBody);

    /*
     * Prevent duplicate simultaneous requests.
     */
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    const requestPromise = this.executeRequest(
      method,
      requestBody
    );

    this.pendingRequests.set(
      requestKey,
      requestPromise
    );

    try {
      return await requestPromise;

    } finally {
      this.pendingRequests.delete(requestKey);
    }
  },

  async executeRequest(method, body) {

    if (!this.BASE_URL) {

      throw new Error(
        "API endpoint is not configured yet."
      );
    }

    const response = await fetch(
      this.BASE_URL,
      {
        method: method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      throw new Error(
        "API request failed: " +
        response.status
      );
    }

    return response.json();
  },

  createRequestId() {

    return (
      Date.now().toString(36) +
      Math.random().toString(36).substring(2)
    );
  }
};
