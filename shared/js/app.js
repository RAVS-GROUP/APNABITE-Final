/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/app.js
 * PURPOSE: Application bootstrap and session restoration
 * VERSION: 1.1.0
 * ============================================================
 *
 * BOOTSTRAP FLOW:
 *
 * App Open
 *   ↓
 * Backend health check
 *   ↓
 * Local session check
 *   ↓
 * Backend session validation
 *   ↓
 * Authenticated / Guest / Session Pending
 *   ↓
 * Application ready
 * ============================================================
 */

const App = {

  /*
   * ----------------------------------------------------------
   * APPLICATION STATE
   * ----------------------------------------------------------
   */

  state: {
    status: "NOT_STARTED",
    authenticated: false,
    user: null,
    role: "",
    backendConnected: false,
    reason: ""
  },


  /*
   * ----------------------------------------------------------
   * APPLICATION INITIALIZATION
   * ----------------------------------------------------------
   */

  async init() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE APPLICATION BOOTSTRAP"
    );

    console.log(
      "========================================"
    );

    this.setState(
      "BOOTSTRAPPING",
      {
        authenticated: false,
        user: null,
        role: "",
        reason: ""
      }
    );

    try {

      /*
       * Health check and authentication bootstrap can run
       * together because neither depends on the other.
       */
      const results =
        await Promise.allSettled([
          this.testBackend(),
          this.bootstrapAuthentication()
        ]);

      const backendResult =
        results[0];

      const authResult =
        results[1];

      if (
        backendResult.status ===
        "rejected"
      ) {
        console.error(
          "Backend bootstrap check failed:",
          backendResult.reason
        );
      }

      if (
        authResult.status ===
        "rejected"
      ) {
        console.error(
          "Authentication bootstrap failed:",
          authResult.reason
        );

        this.setState(
          "GUEST",
          {
            authenticated: false,
            user: null,
            role: "",
            reason:
              "AUTH_BOOTSTRAP_FAILED"
          }
        );
      }

      console.log(
        "Application State:",
        this.state
      );

      console.log(
        "ApnaBite Application Bootstrap: COMPLETE"
      );

      return {
        success: true,
        state:
          this.getState()
      };

    } catch (error) {

      console.error(
        "Application Bootstrap: FAIL",
        error
      );

      this.setState(
        "BOOTSTRAP_ERROR",
        {
          authenticated: false,
          user: null,
          role: "",
          reason:
            error.message ||
            "BOOTSTRAP_FAILED"
        }
      );

      return {
        success: false,
        state:
          this.getState(),
        error:
          error.message
      };

    } finally {

      this.hideLoader();

      this.dispatchReadyEvent();
    }
  },


  /*
   * ----------------------------------------------------------
   * AUTHENTICATION BOOTSTRAP
   * ----------------------------------------------------------
   */

  async bootstrapAuthentication() {

    const localSession =
      SessionManager.get();

    /*
     * No local session means the visitor is a guest.
     */
    if (!localSession) {

      this.setState(
        "GUEST",
        {
          authenticated: false,
          user: null,
          role: "",
          reason:
            "LOCAL_SESSION_NOT_FOUND"
        }
      );

      console.log(
        "Authentication State: GUEST"
      );

      return {
        success: true,
        authenticated: false,
        status: "GUEST",
        reason:
          "LOCAL_SESSION_NOT_FOUND"
      };
    }

    /*
     * Validate the stored session with the backend.
     */
    const restoration =
      await Auth.restoreSession();

    if (
      restoration.success === true &&
      restoration.authenticated === true
    ) {

      const user =
        restoration.user;

      this.setState(
        "AUTHENTICATED",
        {
          authenticated: true,
          user:
            user,
          role:
            user && user.role
              ? user.role
              : "",
          reason: ""
        }
      );

      console.log(
        "Authentication State: AUTHENTICATED"
      );

      console.log(
        "Authenticated User:",
        user
      );

      return {
        success: true,
        authenticated: true,
        status:
          "AUTHENTICATED",
        user:
          user
      };
    }

    /*
     * Network failure does not prove the session is invalid.
     * SessionManager preserves the local session in this case.
     */
    if (
      restoration.retryable === true
    ) {

      this.setState(
        "SESSION_PENDING",
        {
          authenticated: false,
          user:
            Auth.getUser(),
          role:
            Auth.getRole(),
          reason:
            restoration.reason ||
            "SESSION_VALIDATION_PENDING"
        }
      );

      console.warn(
        "Authentication State: SESSION_PENDING"
      );

      return {
        success: false,
        authenticated: false,
        retryable: true,
        status:
          "SESSION_PENDING",
        reason:
          restoration.reason
      };
    }

    /*
     * Invalid, expired or revoked sessions become guest state.
     * SessionManager has already cleared the invalid session.
     */
    this.setState(
      "GUEST",
      {
        authenticated: false,
        user: null,
        role: "",
        reason:
          restoration.reason ||
          "SESSION_INVALID"
      }
    );

    console.log(
      "Authentication State: GUEST"
    );

    return {
      success: true,
      authenticated: false,
      status: "GUEST",
      reason:
        restoration.reason ||
        "SESSION_INVALID"
    };
  },


  /*
   * ----------------------------------------------------------
   * BACKEND CONNECTION CHECK
   * ----------------------------------------------------------
   */

  async testBackend() {

    try {

      const result =
        await API.healthCheck();

      this.state.backendConnected =
        true;

      console.log(
        "BACKEND CONNECTION: PASS",
        result
      );

      return {
        success: true,
        connected: true,
        result:
          result
      };

    } catch (error) {

      this.state.backendConnected =
        false;

      console.error(
        "BACKEND CONNECTION: FAIL",
        error
      );

      return {
        success: false,
        connected: false,
        error:
          error.message,
        code:
          error.code || ""
      };
    }
  },


  /*
   * ----------------------------------------------------------
   * UPDATE APPLICATION STATE
   * ----------------------------------------------------------
   */

  setState(
    status,
    values = {}
  ) {

    this.state = {
      ...this.state,
      ...values,
      status:
        status
    };

    if (document.body) {

      document.body.dataset.appState =
        status.toLowerCase();

      document.body.dataset.authenticated =
        String(
          this.state.authenticated
        );

      document.body.dataset.userRole =
        this.state.role || "";
    }

    return this.getState();
  },


  /*
   * ----------------------------------------------------------
   * GET SAFE STATE COPY
   * ----------------------------------------------------------
   */

  getState() {

    return {
      ...this.state,
      user:
        this.state.user
          ? {
              ...this.state.user
            }
          : null
    };
  },


  /*
   * ----------------------------------------------------------
   * APPLICATION READY EVENT
   *
   * Future pages/components can listen for:
   *
   * document.addEventListener(
   *   "apnabite:app-ready",
   *   event => console.log(event.detail)
   * );
   * ----------------------------------------------------------
   */

  dispatchReadyEvent() {

    document.dispatchEvent(
      new CustomEvent(
        "apnabite:app-ready",
        {
          detail:
            this.getState()
        }
      )
    );
  },


  /*
   * ----------------------------------------------------------
   * HIDE INITIAL LOADER
   * ----------------------------------------------------------
   */

  hideLoader() {

    const loader =
      document.getElementById(
        "appLoader"
      );

    if (loader) {

      loader.classList.add(
        "hidden"
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * TEST 1 — GUEST BOOTSTRAP
   *
   * Browser console:
   * App.testGuestBootstrap()
   * ----------------------------------------------------------
   */

  async testGuestBootstrap() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE GUEST BOOTSTRAP TEST"
    );

    console.log(
      "========================================"
    );

    const previousSession =
      SessionManager.get();

    try {

      SessionManager.clear();

      const result =
        await this.bootstrapAuthentication();

      console.log(
        "Guest Bootstrap Result:",
        result
      );

      const passed =
        result.status === "GUEST" &&
        result.authenticated === false &&
        this.state.status === "GUEST" &&
        SessionManager.get() === null;

      console.log(
        passed
          ? "Guest Bootstrap Test: PASS"
          : "Guest Bootstrap Test: FAIL"
      );

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        result:
          result,
        appState:
          this.getState()
      };

    } catch (error) {

      console.error(
        "Guest Bootstrap Test: FAIL",
        error
      );

      return {
        success: false,
        status: "FAIL",
        error:
          error.message
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
   * TEST 2 — AUTHENTICATED BOOTSTRAP
   *
   * Browser console:
   * App.testAuthenticatedBootstrap()
   * ----------------------------------------------------------
   */

  async testAuthenticatedBootstrap() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE AUTHENTICATED BOOTSTRAP TEST"
    );

    console.log(
      "========================================"
    );

    const previousSession =
      SessionManager.get();

    try {

      SessionManager.clear();

      const loginResult =
        await Auth.login(
          "9876543210"
        );

      console.log(
        "Login Result:",
        loginResult
      );

      const result =
        await this.bootstrapAuthentication();

      console.log(
        "Authenticated Bootstrap Result:",
        result
      );

      const passed =
        result.status ===
          "AUTHENTICATED" &&
        result.authenticated === true &&
        this.state.status ===
          "AUTHENTICATED" &&
        this.state.role ===
          "Customer" &&
        Auth.isLoggedIn() === true;

      console.log(
        passed
          ? "Authenticated Bootstrap Test: PASS"
          : "Authenticated Bootstrap Test: FAIL"
      );

      await Auth.logout();

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        result:
          result,
        appState:
          this.getState()
      };

    } catch (error) {

      console.error(
        "Authenticated Bootstrap Test: FAIL",
        error
      );

      if (
        SessionManager.getSessionId()
      ) {
        try {
          await Auth.logout();
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
          error.code || ""
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
   * TEST 3 — EXPIRED LOCAL SESSION
   *
   * Browser console:
   * App.testExpiredSession()
   * ----------------------------------------------------------
   */

  async testExpiredSession() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE EXPIRED SESSION TEST"
    );

    console.log(
      "========================================"
    );

    const previousSession =
      SessionManager.get();

    try {

      SessionManager.clear();

      SessionManager.set({
        sessionId:
          "EXPIRED_TEST_SESSION",
        userId:
          "EXPIRED_TEST_USER",
        role:
          "Customer",
        expiryAt:
          new Date(
            Date.now() -
            (60 * 1000)
          ).toISOString()
      });

      const result =
        await this.bootstrapAuthentication();

      console.log(
        "Expired Session Result:",
        result
      );

      const passed =
        result.status === "GUEST" &&
        result.authenticated === false &&
        result.reason ===
          "LOCAL_SESSION_EXPIRED" &&
        SessionManager.get() === null;

      console.log(
        passed
          ? "Expired Session Test: PASS"
          : "Expired Session Test: FAIL"
      );

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        result:
          result,
        localSession:
          SessionManager.get()
      };

    } catch (error) {

      console.error(
        "Expired Session Test: FAIL",
        error
      );

      return {
        success: false,
        status: "FAIL",
        error:
          error.message
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


/*
 * ------------------------------------------------------------
 * START APPLICATION AFTER DOM IS READY
 * ------------------------------------------------------------
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    App.init();
  }
);


/*
 * ------------------------------------------------------------
 * SERVICE WORKER REGISTRATION
 * ------------------------------------------------------------
 */

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js")
        .then(() => {

          console.log(
            "ApnaBite Service Worker registered."
          );

        })
        .catch((error) => {

          console.error(
            "Service Worker registration failed:",
            error
          );

        });
    }
  );
}
