/**
 * ============================================================
 * APNABITE FOOD PARTNER
 * FILE: food-partner/js/kitchen-status.js
 * PURPOSE: Kitchen Open / Close control
 * VERSION: 1.0.0
 * ============================================================
 */

const FoodPartnerKitchenStatus = {

  busy: false,

  state: null,

  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

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


    const card =
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
      ></div>

    `;


    statusGrid.insertAdjacentElement(
      "afterend",
      card
    );


    this.elements = {

      card:
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


    this.elements.button
      .addEventListener(
        "click",
        () => {

          this.toggle();
        }
      );


    this.load();


    console.log(
      "ApnaBite Kitchen Status initialized."
    );


    return true;
  },


  /*
   * ----------------------------------------------------------
   * SESSION ID
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
   * LOAD CURRENT STATUS
   * ----------------------------------------------------------
   */

  async load() {

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
      this.state.operatingStatus ===
        "OPEN";


    this.elements.card
      .classList.toggle(
        "is-open",
        open
      );


    this.elements.dot
      .classList.toggle(
        "is-open",
        open
      );


    this.elements.title.textContent =
      open
        ? "Kitchen is open"
        : "Kitchen is closed";


    if (
      this.elements.dashboardStatus
    ) {

      this.elements.dashboardStatus
        .textContent =
          open
            ? "OPEN"
            : "CLOSED";
    }


    if (open) {

      this.elements.message
        .textContent =
          "Customers can discover your available products near this kitchen.";


      this.elements.button
        .textContent =
          "Close Kitchen";


      this.elements.button.disabled =
        false;


      return;
    }


    if (
      this.state.canOpen ===
        true
    ) {

      this.elements.message
        .textContent =
          String(
            this.state
              .availableProductCount || 0
          ) +
          " available product(s). You can start accepting orders.";


      this.elements.button
        .textContent =
          "Open Kitchen";


      this.elements.button.disabled =
        false;


      return;
    }


    this.elements.message
      .textContent =
        this.blockedMessage();


    this.elements.button
      .textContent =
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
      this.state.kycStatus !==
        "VERIFIED"
    ) {

      return (
        "Complete and verify KYC " +
        "before opening the kitchen."
      );
    }


    if (
      this.state.approvalStatus !==
        "APPROVED"
    ) {

      return (
        "Admin approval is required " +
        "before opening the kitchen."
      );
    }


    if (
      Number(
        this.state
          .availableProductCount || 0
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
   * OPEN / CLOSE KITCHEN
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
            "Customers nearby will be able " +
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


    this.busy =
      true;


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

      this.busy =
        false;
    }
  },


  /*
   * ----------------------------------------------------------
   * ERROR MESSAGE
   * ----------------------------------------------------------
   */

  showError(message) {

    this.elements.error
      .textContent =
        message;


    this.elements.error
      .classList.remove(
        "hidden"
      );
  },


  clearError() {

    this.elements.error
      .textContent =
        "";


    this.elements.error
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * PAGE TEST
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
      "APNABITE KITCHEN STATUS PAGE TEST"
    );

    console.log(
      "========================================"
    );


    const data =
      await this.load();


    const results = [

      {
        test:
          "Required role",

        expected:
          "Food Partner",

        actual:
          document.body.dataset
            .requiredRole,

        passed:
          document.body.dataset
            .requiredRole ===
              "Food Partner"
      },

      {
        test:
          "Live operating API",

        expected:
          true,

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
        test:
          "Operating status",

        expected:
          "OPEN or CLOSED",

        actual:
          data
            ? data.operatingStatus
            : "",

        passed:
          Boolean(
            data &&
            [
              "OPEN",
              "CLOSED"
            ].includes(
              data.operatingStatus
            )
          )
      },

      {
        test:
          "Toggle control",

        expected:
          true,

        actual:
          Boolean(
            this.elements.button
          ),

        passed:
          Boolean(
            this.elements.button
          )
      },

      {
        test:
          "Available product count",

        expected:
          "Number",

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
        ? "Kitchen Status Page Test: PASS"
        : "Kitchen Status Page Test: FAIL"
    );


    return {
      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      data:
        data,

      results:
        results
    };
  }

};


/*
 * ------------------------------------------------------------
 * INITIALIZE
 * ------------------------------------------------------------
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    FoodPartnerKitchenStatus.init();
  }
);
