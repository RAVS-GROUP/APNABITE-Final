/**
 * ============================================================
 * APNABITE FOOD PARTNER
 * FILE: food-partner/js/kitchen-status.js
 * PURPOSE: Cached kitchen Open / Close control
 * VERSION: 2.0.0
 * ============================================================
 */

const FoodPartnerKitchenStatus = {

  busy: false,
  state: null,
  loadRequest: null,
  initialized: false,
  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    if (this.initialized) {
      return true;
    }

    const dashboard =
      document.getElementById(
        "dashboardSection"
      );

    const statusGrid =
      dashboard
        ? dashboard.querySelector(
            ".status-grid"
          )
        : null;

    if (
      !dashboard ||
      !statusGrid
    ) {
      console.error(
        "Kitchen status dashboard elements are missing."
      );

      return false;
    }

    let card =
      document.querySelector(
        ".kitchen-operating-card"
      );

    if (!card) {

      card =
        document.createElement(
          "section"
        );

      card.className =
        "kitchen-operating-card";

      card.innerHTML = `
        <div class="kitchen-operating-copy">

          <span
            class="kitchen-live-dot"
            id="kitchenLiveDot"
            aria-hidden="true"
          ></span>

          <div>
            <h2 id="kitchenOperatingTitle">
              Kitchen is closed
            </h2>

            <p id="kitchenOperatingMessage">
              Checking whether your kitchen can open...
            </p>
          </div>

        </div>

        <button
          id="toggleKitchenButton"
          type="button"
          disabled
        >
          Checking...
        </button>

        <div
          class="kitchen-operating-error hidden"
          id="kitchenOperatingError"
          role="alert"
          aria-live="polite"
        ></div>
      `;

      statusGrid.insertAdjacentElement(
        "afterend",
        card
      );
    }

    this.elements = {
      card,
      dot:
        document.getElementById(
          "kitchenLiveDot"
        ),
      title:
        document.getElementById(
          "kitchenOperatingTitle"
        ),
      message:
        document.getElementById(
          "kitchenOperatingMessage"
        ),
      button:
        document.getElementById(
          "toggleKitchenButton"
        ),
      error:
        document.getElementById(
          "kitchenOperatingError"
        ),
      dashboardStatus:
        document.getElementById(
          "operatingStatus"
        )
    };

    if (
      !this.elements.dot ||
      !this.elements.title ||
      !this.elements.message ||
      !this.elements.button ||
      !this.elements.error
    ) {
      console.error(
        "Kitchen status control elements are missing."
      );

      return false;
    }

    this.elements.button.addEventListener(
      "click",
      () => {
        this.toggle();
      }
    );

    document.addEventListener(
      "apnabite:food-partner-dashboard-summary",
      (event) => {
        this.applyDashboardSummary(
          event.detail || {}
        );
      }
    );

    this.initialized = true;
    this.syncWithDashboard();

    console.log(
      "ApnaBite Kitchen Status initialized."
    );

    return true;
  },


  /*
   * ----------------------------------------------------------
   * SESSION
   * ----------------------------------------------------------
   */

  sessionId() {

    const session =
      SessionManager.get();

    return (
      session &&
      session.sessionId
        ? session.sessionId
        : ""
    );
  },


  /*
   * ----------------------------------------------------------
   * USE DASHBOARD SUMMARY FIRST
   * ----------------------------------------------------------
   */

  async syncWithDashboard() {

    if (
      typeof FoodPartnerDashboard !==
        "undefined" &&
      FoodPartnerDashboard.summary
    ) {
      return this.applyDashboardSummary(
        FoodPartnerDashboard.summary
      );
    }

    if (
      typeof FoodPartnerDashboard !==
        "undefined" &&
      FoodPartnerDashboard.summaryRequest
    ) {
      try {

        await FoodPartnerDashboard
          .summaryRequest;

        if (
          FoodPartnerDashboard.summary
        ) {
          return this.applyDashboardSummary(
            FoodPartnerDashboard.summary
          );
        }

      } catch (error) {
        console.warn(
          "Dashboard status synchronization failed:",
          error
        );
      }
    }

    return this.load();
  },


  applyDashboardSummary(summary) {

    const operating =
      summary && summary.operating
        ? summary.operating
        : null;

    if (!operating) {
      return {
        success: false,
        reason:
          "OPERATING_SUMMARY_NOT_FOUND"
      };
    }

    this.state = {
      success: true,
      chefId:
        summary.chefId || "",
      operatingStatus:
        String(
          operating.operatingStatus ||
          "CLOSED"
        ).toUpperCase(),
      canOpen:
        operating.canOpen === true,
      approvalStatus:
        operating.approvalStatus ||
        "PENDING",
      kycStatus:
        operating.kycStatus ||
        "NOT_SUBMITTED",
      availableProductCount:
        Number(
          operating.availableProductCount ||
          0
        )
    };

    this.render();

    return {
      success: true,
      source: "DASHBOARD_SUMMARY",
      state: this.state
    };
  },


  /*
   * ----------------------------------------------------------
   * LOAD STATUS API
   * ----------------------------------------------------------
   */

  load() {

    if (this.loadRequest) {
      return this.loadRequest;
    }

    this.loadRequest =
      this.executeLoad()
        .finally(() => {
          this.loadRequest = null;
        });

    return this.loadRequest;
  },


  async executeLoad() {

    this.clearError();

    try {

      const response =
        await API.request(
          "get_food_partner_operating_status",
          {
            sessionId:
              this.sessionId()
          }
        );

      this.state =
        response.data || null;

      if (!this.state) {
        throw new Error(
          "Kitchen operating status was not returned."
        );
      }

      this.render();

      return this.state;

    } catch (error) {

      this.showError(
        error.message ||
        "Kitchen status could not be loaded."
      );

      this.elements.button.disabled =
        true;

      this.elements.button.textContent =
        "Unavailable";

      return null;
    }
  },


  /*
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  render() {

    if (!this.state) {
      return;
    }

    const open =
      String(
        this.state.operatingStatus ||
        "CLOSED"
      ).toUpperCase() === "OPEN";

    this.elements.card.classList.toggle(
      "is-open",
      open
    );

    this.elements.dot.classList.toggle(
      "is-open",
      open
    );

    this.elements.title.textContent =
      open
        ? "Kitchen is open"
        : "Kitchen is closed";

    if (this.elements.dashboardStatus) {
      this.elements.dashboardStatus.textContent =
        open
          ? "OPEN"
          : "CLOSED";
    }

    if (open) {

      this.elements.message.textContent =
        "Customers can discover your available products near this kitchen.";

      this.elements.button.textContent =
        "Close Kitchen";

      this.elements.button.disabled =
        false;

      return;
    }

    if (
      this.state.canOpen === true
    ) {

      this.elements.message.textContent =
        String(
          this.state.availableProductCount ||
          0
        ) +
        " available product(s). You can start accepting orders.";

      this.elements.button.textContent =
        "Open Kitchen";

      this.elements.button.disabled =
        false;

      return;
    }

    this.elements.message.textContent =
      this.blockedMessage();

    this.elements.button.textContent =
      "Open Kitchen";

    this.elements.button.disabled =
      true;
  },


  /*
   * ----------------------------------------------------------
   * BLOCKED MESSAGE
   * ----------------------------------------------------------
   */

  blockedMessage() {

    if (
      String(
        this.state.kycStatus || ""
      ).toUpperCase() !== "VERIFIED"
    ) {
      return (
        "Complete and verify KYC " +
        "before opening the kitchen."
      );
    }

    if (
      String(
        this.state.approvalStatus || ""
      ).toUpperCase() !== "APPROVED"
    ) {
      return (
        "Admin approval is required " +
        "before opening the kitchen."
      );
    }

    if (
      Number(
        this.state.availableProductCount ||
        0
      ) < 1
    ) {
      return (
        "Add at least one active and " +
        "available product before opening."
      );
    }

    return (
      "Kitchen cannot be opened right now."
    );
  },


  /*
   * ----------------------------------------------------------
   * OPEN / CLOSE
   * ----------------------------------------------------------
   */

  async toggle() {

    if (
      this.busy ||
      !this.state
    ) {
      return {
        success: false,
        reason:
          "KITCHEN_STATUS_BUSY"
      };
    }

    const nextStatus =
      this.state.operatingStatus ===
        "OPEN"
        ? "CLOSED"
        : "OPEN";

    const confirmationMessage =
      nextStatus === "OPEN"
        ? (
            "Open your kitchen now? " +
            "Nearby customers will be able " +
            "to discover your available products."
          )
        : (
            "Close your kitchen now? " +
            "Customers will not be able " +
            "to place new orders."
          );

    if (
      !window.confirm(
        confirmationMessage
      )
    ) {
      return {
        success: false,
        cancelled: true
      };
    }

    this.busy = true;
    this.clearError();

    this.elements.button.disabled =
      true;

    this.elements.button.textContent =
      nextStatus === "OPEN"
        ? "Opening..."
        : "Closing...";

    try {

      const response =
        await API.request(
          "set_food_partner_operating_status",
          {
            sessionId:
              this.sessionId(),
            operatingStatus:
              nextStatus
          }
        );

      this.state =
        response.data || null;

      if (!this.state) {
        throw new Error(
          "Updated kitchen status was not returned."
        );
      }

      this.render();
      this.updateDashboardState();

      document.dispatchEvent(
        new CustomEvent(
          "apnabite:kitchen-status-updated",
          {
            detail: {
              operatingStatus:
                this.state.operatingStatus,
              state:
                this.state
            }
          }
        )
      );

      console.log(
        "Kitchen Operating Status:",
        this.state.operatingStatus
      );

      return {
        success: true,
        operatingStatus:
          this.state.operatingStatus
      };

    } catch (error) {

      this.showError(
        error.message ||
        "Kitchen status could not be changed."
      );

      this.render();

      return {
        success: false,
        error:
          error.message,
        code:
          error.code || "",
        requestId:
          error.requestId || ""
      };

    } finally {
      this.busy = false;
    }
  },


  updateDashboardState() {

    if (
      typeof FoodPartnerDashboard ===
        "undefined"
    ) {
      return;
    }

    FoodPartnerDashboard.updateOperatingStatus(
      this.state.operatingStatus
    );
  },


  /*
   * ----------------------------------------------------------
   * ERRORS
   * ----------------------------------------------------------
   */

  showError(message) {

    this.elements.error.textContent =
      message;

    this.elements.error.classList.remove(
      "hidden"
    );
  },


  clearError() {

    this.elements.error.textContent = "";

    this.elements.error.classList.add(
      "hidden"
    );
  },


  /*
   * ----------------------------------------------------------
   * TEST
   *
   * Browser console:
   * FoodPartnerKitchenStatus.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE KITCHEN STATUS INTEGRATION TEST"
    );

    console.log(
      "========================================"
    );

    const syncResult =
      await this.syncWithDashboard();

    const duplicateOne =
      this.load();

    const duplicateTwo =
      this.load();

    const duplicateProtected =
      duplicateOne === duplicateTwo;

    const liveData =
      await duplicateOne;

    const data =
      liveData || this.state;

    const results = [
      {
        test: "Dashboard synchronization",
        expected: true,
        actual:
          Boolean(
            syncResult &&
            syncResult.success === true
          ),
        passed:
          Boolean(
            syncResult &&
            syncResult.success === true
          )
      },
      {
        test: "Live operating API",
        expected: true,
        actual:
          Boolean(
            data &&
            data.success === true
          ),
        passed:
          Boolean(
            data &&
            data.success === true
          )
      },
      {
        test: "Operating status",
        expected: "OPEN or CLOSED",
        actual:
          data
            ? data.operatingStatus
            : "",
        passed:
          Boolean(
            data &&
            ["OPEN", "CLOSED"].includes(
              data.operatingStatus
            )
          )
      },
      {
        test: "Available product count",
        expected: "Number",
        actual:
          data
            ? data.availableProductCount
            : "",
        passed:
          Boolean(
            data &&
            Number.isFinite(
              Number(
                data.availableProductCount
              )
            )
          )
      },
      {
        test: "Duplicate load protection",
        expected: true,
        actual:
          duplicateProtected,
        passed:
          duplicateProtected === true
      },
      {
        test: "Toggle control",
        expected: true,
        actual:
          Boolean(
            this.elements.button
          ),
        passed:
          Boolean(
            this.elements.button
          )
      }
    ];

    const passed =
      results.every(
        (result) => result.passed
      );

    console.table(results);

    console.log(
      "Kitchen Status:",
      data
    );

    console.log(
      passed
        ? "Kitchen Status Integration Test: PASS"
        : "Kitchen Status Integration Test: FAIL"
    );

    return {
      success: passed,
      status: passed ? "PASS" : "FAIL",
      data,
      results
    };
  }
};


document.addEventListener(
  "DOMContentLoaded",
  () => {
    FoodPartnerKitchenStatus.init();
  }
);
