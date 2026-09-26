/**
 * ============================================================
 * APNABITE CUSTOMER ORDER SUCCESS
 * FILE: customer/js/order-success.js
 * PURPOSE:
 * - Display server-created TEST order
 * - Refresh order and rider tracking
 * - Cancel order within server cancellation window
 * - Submit checkout feedback to Ratings sheet
 * VERSION: 1.3.0
 * ============================================================
 */

const CustomerOrderSuccessPage = {

  STORAGE_KEY:
    "apnabite_order_success_context",

  data: null,
  rating: 0,
  timer: null,

  trackingLoading: false,
  cancelling: false,
  feedbackSubmitting: false,

  elements: {},


  /**
   * ==========================================================
   * INITIALIZE PAGE
   * ==========================================================
   */

  init() {

    const ids = [
      "successMissing",
      "successContent",
      "confetti",
      "successOrderId",
      "successStatus",
      "trackOrderButton",
      "orderActionStatus",
      "cancelCard",
      "cancelCountdown",
      "cancelText",
      "cancelOrderButton",
      "successAmount",
      "successReward",
      "impactCard",
      "impactAmount",
      "impactCause",
      "ratingButtons",
      "feedbackText",
      "submitFeedbackButton",
      "feedbackStatus"
    ];

    ids.forEach((id) => {
      this.elements[id] =
        document.getElementById(id);
    });

    const missingElements = ids.filter(
      (id) => !this.elements[id]
    );

    if (missingElements.length > 0) {
      console.error(
        "Order success page elements are missing:",
        missingElements
      );

      return false;
    }

    try {
      this.data = JSON.parse(
        sessionStorage.getItem(
          this.STORAGE_KEY
        ) || "null"
      );
    } catch (error) {
      console.error(
        "Order success data could not be read:",
        error
      );

      this.data = null;
    }

    if (
      !this.data ||
      this.data.success !== true ||
      !this.data.order ||
      !this.data.order.orderId
    ) {
      this.showMissing();

      return false;
    }

    this.bindEvents();
    this.render();
    this.launchConfetti();
    this.startCancellationClock();

    return true;
  },


  /**
   * ==========================================================
   * EVENTS
   * ==========================================================
   */

  bindEvents() {

    this.elements.trackOrderButton
      .addEventListener(
        "click",
        () => this.refreshOrderStatus()
      );

    this.elements.cancelOrderButton
      .addEventListener(
        "click",
        () => this.cancelOrder()
      );

    this.elements.ratingButtons
      .querySelectorAll("button")
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {
            this.selectRating(
              Number(
                button.dataset.rating || 0
              )
            );
          }
        );
      });

    this.elements.submitFeedbackButton
      .addEventListener(
        "click",
        () => this.submitFeedback()
      );
  },


  /**
   * ==========================================================
   * RENDER ORDER
   * ==========================================================
   */

  render() {

    const order =
      this.data.order || {};

    const pricing =
      this.data.pricing || {};

    const reward =
      this.data.rewardPreview || {};

    const impact =
      this.data.impact || {};

    this.elements.successOrderId
      .textContent =
        order.orderId || "—";

    this.elements.successStatus
      .textContent =
        this.statusLabel(
          order.orderStatus ||
          this.data.status ||
          "PLACED"
        );

    this.elements.successAmount
      .textContent =
        this.money(
          pricing.finalAmount || 0
        );

    this.elements.successReward
      .textContent =
        String(
          reward.pointsOnCompletion || 0
        ) + " points";

    if (impact.contributionMade) {

      this.elements.impactCard
        .classList.remove("hidden");

      this.elements.impactAmount
        .textContent =
          this.money(
            impact.amount || 0
          );

      this.elements.impactCause
        .textContent =
          impact.causeName ||
          "Underprivileged Student Support";

    } else {
      this.elements.impactCard
        .classList.add("hidden");
    }

    this.elements.successContent
      .classList.remove("hidden");

    this.elements.successMissing
      .classList.add("hidden");
  },


  showMissing() {

    this.elements.successMissing
      .classList.remove("hidden");

    this.elements.successContent
      .classList.add("hidden");
  },


  /**
   * ==========================================================
   * ORDER STATUS / RIDER TRACKING
   * ==========================================================
   */

  async refreshOrderStatus() {

    if (this.trackingLoading) {
      return;
    }

    this.trackingLoading = true;

    this.elements.trackOrderButton
      .disabled = true;

    this.elements.trackOrderButton
      .textContent = "Refreshing...";

    this.showOrderStatus(
      "Checking the latest order status..."
    );

    try {

      const response = await API.request(
        "get_customer_order_status",
        {
          sessionId:
            this.getSessionId(),

          orderId:
            this.data.order.orderId
        },
        {
          timeoutMs: 90000
        }
      );

      const result =
        response.data || {};

      if (
        result.success !== true ||
        !result.order
      ) {
        throw new Error(
          "Order status could not be refreshed."
        );
      }

      this.data.order =
        Object.assign(
          {},
          this.data.order,
          result.order
        );

      sessionStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.data)
      );

      this.elements.successStatus
        .textContent =
          this.statusLabel(
            result.order.orderStatus
          );

      if (
        result.rider &&
        result.rider.assigned
      ) {

        let message =
          (
            result.rider.name ||
            "Delivery partner"
          ) +
          " is assigned.";

        if (
          result.rider.trackingAvailable
        ) {

          message +=
            " Latest rider location received at " +
            this.formatTime(
              result.rider.recordedAt
            ) +
            ".";

        } else {

          message +=
            " Waiting for the rider's first live location.";
        }

        this.showOrderStatus(message);

      } else {

        this.showOrderStatus(
          "A rider has not been assigned yet. Tracking will activate after rider assignment."
        );
      }

      if (
        result.order
          .cancellationAvailable === false
      ) {
        this.expireCancellation(
          "Cancellation is no longer available for this order."
        );
      }

    } catch (error) {

      this.showOrderStatus(
        error.message ||
          "Order status could not be refreshed.",
        true
      );

    } finally {

      this.trackingLoading = false;

      this.elements.trackOrderButton
        .disabled = false;

      this.elements.trackOrderButton
        .textContent = "Refresh Tracking";
    }
  },


  /**
   * ==========================================================
   * CANCEL ORDER
   * ==========================================================
   */

  async cancelOrder() {

    if (
      this.cancelling ||
      this.elements.cancelOrderButton
        .disabled
    ) {
      return;
    }

    this.cancelling = true;

    this.elements.cancelOrderButton
      .disabled = true;

    this.elements.cancelOrderButton
      .textContent = "Cancelling...";

    this.showOrderStatus(
      "Cancelling your order..."
    );

    try {

      const response = await API.request(
        "cancel_customer_order",
        {
          sessionId:
            this.getSessionId(),

          orderId:
            this.data.order.orderId,

          reason:
            "CUSTOMER_CANCELLED_WITHIN_WINDOW"
        },
        {
          timeoutMs: 90000
        }
      );

      const result =
        response.data || {};

      if (
        result.success !== true ||
        result.status !== "CANCELLED"
      ) {
        throw new Error(
          "Order could not be cancelled."
        );
      }

      clearInterval(this.timer);

      this.data.order.orderStatus =
        "CANCELLED";

      this.data.order.paymentStatus =
        result.paymentStatus ||
        "REFUNDED";

      this.data.order
        .cancellationAvailable = false;

      sessionStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.data)
      );

      this.elements.successStatus
        .textContent =
          this.statusLabel("CANCELLED");

      this.elements.cancelCountdown
        .textContent = "CANCELLED";

      this.elements.cancelText
        .textContent =
          "Order cancelled successfully. No real money was charged in TEST mode.";

      this.elements.cancelOrderButton
        .textContent = "Cancelled";

      this.showOrderStatus(
        "Order cancelled successfully and TEST payment marked as refunded."
      );

    } catch (error) {

      this.elements.cancelOrderButton
        .disabled = false;

      this.elements.cancelOrderButton
        .textContent = "Cancel Order";

      this.showOrderStatus(
        error.message ||
          "Order could not be cancelled.",
        true
      );

    } finally {
      this.cancelling = false;
    }
  },


  /**
   * ==========================================================
   * CANCELLATION TIMER
   * ==========================================================
   */

  startCancellationClock() {

    clearInterval(this.timer);

    const order =
      this.data.order || {};

    if (
      String(
        order.orderStatus || ""
      ).toUpperCase() === "CANCELLED"
    ) {

      this.elements.cancelCountdown
        .textContent = "CANCELLED";

      this.elements.cancelText
        .textContent =
          "This order has been cancelled.";

      this.elements.cancelOrderButton
        .disabled = true;

      this.elements.cancelOrderButton
        .textContent = "Cancelled";

      return;
    }

    const deadline =
      Date.parse(
        order.cancellationDeadlineAt ||
        ""
      );

    if (!Number.isFinite(deadline)) {

      this.expireCancellation(
        "Cancellation deadline is unavailable."
      );

      return;
    }

    const tick = () => {

      const remaining =
        Math.max(
          0,
          deadline - Date.now()
        );

      const seconds =
        Math.ceil(
          remaining / 1000
        );

      const minutesPart =
        Math.floor(
          seconds / 60
        );

      const secondsPart =
        seconds % 60;

      this.elements.cancelCountdown
        .textContent =
          String(minutesPart)
            .padStart(2, "0") +
          ":" +
          String(secondsPart)
            .padStart(2, "0");

      if (remaining <= 0) {

        this.expireCancellation(
          "The free cancellation window has ended."
        );
      }
    };

    tick();

    if (
      !this.elements.cancelOrderButton
        .disabled
    ) {
      this.timer =
        setInterval(tick, 1000);
    }
  },


  expireCancellation(message) {

    clearInterval(this.timer);

    this.timer = null;

    this.elements.cancelCountdown
      .textContent = "00:00";

    this.elements.cancelOrderButton
      .disabled = true;

    this.elements.cancelOrderButton
      .textContent = "Cancel Order";

    this.elements.cancelText
      .textContent =
        message ||
        "The free cancellation window has ended.";
  },


  /**
   * ==========================================================
   * FEEDBACK
   * ==========================================================
   */

  selectRating(rating) {

    if (
      !Number.isFinite(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return;
    }

    this.rating = rating;

    this.elements.ratingButtons
      .querySelectorAll("button")
      .forEach((button) => {

        button.classList.toggle(
          "selected",
          Number(
            button.dataset.rating
          ) <= rating
        );
      });

    this.showFeedbackStatus(
      rating +
      " star rating selected."
    );
  },


  async submitFeedback() {

    if (this.feedbackSubmitting) {
      return;
    }

    if (!this.rating) {

      this.showFeedbackStatus(
        "Please select a star rating first.",
        true
      );

      return;
    }

    const feedback =
      String(
        this.elements.feedbackText
          .value || ""
      ).trim();

    this.feedbackSubmitting = true;

    this.elements.submitFeedbackButton
      .disabled = true;

    this.elements.submitFeedbackButton
      .textContent = "Submitting...";

    this.showFeedbackStatus(
      "Saving your feedback..."
    );

    try {

      const response = await API.request(
        "submit_customer_order_feedback",
        {
          sessionId:
            this.getSessionId(),

          orderId:
            this.data.order.orderId,

          rating:
            this.rating,

          feedback:
            feedback
        },
        {
          timeoutMs: 90000
        }
      );

      const result =
        response.data || {};

      if (result.success !== true) {
        throw new Error(
          "Feedback could not be saved."
        );
      }

      localStorage.removeItem(
        "apnabite_pending_order_feedback"
      );

      this.elements.feedbackText
        .disabled = true;

      this.elements.ratingButtons
        .querySelectorAll("button")
        .forEach((button) => {
          button.disabled = true;
        });

      this.elements.submitFeedbackButton
        .textContent =
          "Feedback Submitted";

      this.showFeedbackStatus(
        "Thank you! Your feedback has been saved."
      );

    } catch (error) {

      this.elements.submitFeedbackButton
        .disabled = false;

      this.elements.submitFeedbackButton
        .textContent =
          "Submit Feedback";

      this.showFeedbackStatus(
        error.message ||
          "Feedback could not be saved.",
        true
      );

    } finally {
      this.feedbackSubmitting = false;
    }
  },


  /**
   * ==========================================================
   * UI HELPERS
   * ==========================================================
   */

  showOrderStatus(
    message,
    isError
  ) {

    this.elements.orderActionStatus
      .textContent = message;

    this.elements.orderActionStatus
      .classList.remove("hidden");

    this.elements.orderActionStatus
      .classList.toggle(
        "error",
        isError === true
      );
  },


  showFeedbackStatus(
    message,
    isError
  ) {

    this.elements.feedbackStatus
      .textContent = message;

    this.elements.feedbackStatus
      .classList.remove("hidden");

    this.elements.feedbackStatus
      .classList.toggle(
        "error",
        isError === true
      );
  },


  getSessionId() {

    const session =
      typeof SessionManager !==
        "undefined"
        ? SessionManager.get()
        : null;

    return session
      ? String(
          session.sessionId || ""
        )
      : "";
  },


  statusLabel(status) {

    const labels = {

      PLACED:
        "Order placed • Kitchen confirmation pending",

      ACCEPTED:
        "Kitchen accepted your order",

      PREPARING:
        "Your meal is being prepared",

      READY_FOR_PICKUP:
        "Ready for rider pickup",

      RIDER_ASSIGNED:
        "Rider assigned",

      PICKED_UP:
        "Order picked up",

      OUT_FOR_DELIVERY:
        "Order is on the way",

      DELIVERED:
        "Order delivered",

      COMPLETED:
        "Order completed",

      CANCELLED:
        "Order cancelled"
    };

    const normalized =
      String(
        status || ""
      ).trim().toUpperCase();

    return labels[normalized] ||
      normalized ||
      "Order update";
  },


  launchConfetti() {

    const colors = [
      "#ef5b00",
      "#ffb000",
      "#16864a",
      "#e94178",
      "#5b65e8"
    ];

    for (
      let index = 0;
      index < 48;
      index++
    ) {

      const piece =
        document.createElement("i");

      piece.style.left =
        Math.random() * 100 + "%";

      piece.style.background =
        colors[
          index % colors.length
        ];

      piece.style.animationDelay =
        Math.random() * 0.8 + "s";

      piece.style.setProperty(
        "--drift",
        (
          Math.random() * 160 - 80
        ) + "px"
      );

      this.elements.confetti
        .appendChild(piece);
    }

    window.setTimeout(
      () => {
        this.elements.confetti
          .replaceChildren();
      },
      3800
    );
  },


  formatTime(value) {

    const date =
      new Date(value);

    if (
      !Number.isFinite(
        date.getTime()
      )
    ) {
      return "just now";
    }

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  },


  money(value) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    ).format(
      Number(value || 0)
    );
  },


  /**
   * ==========================================================
   * PAGE TEST
   * ==========================================================
   */

  test() {

    const deadline =
      Date.parse(
        this.data &&
        this.data.order
          ? this.data.order
              .cancellationDeadlineAt
          : ""
      );

    const results = [
      {
        test:
          "Server order",
        passed:
          Boolean(
            this.data &&
            this.data.order &&
            this.data.order.orderId
          ),
        actual:
          this.data &&
          this.data.order
            ? this.data.order.orderId
            : ""
      },
      {
        test:
          "Tracking API",
        passed:
          typeof this
            .refreshOrderStatus ===
          "function",
        actual:
          typeof this
            .refreshOrderStatus
      },
      {
        test:
          "Cancellation API",
        passed:
          typeof this.cancelOrder ===
          "function",
        actual:
          typeof this.cancelOrder
      },
      {
        test:
          "Feedback API",
        passed:
          typeof this
            .submitFeedback ===
          "function",
        actual:
          typeof this.submitFeedback
      },
      {
        test:
          "Server cancellation deadline",
        passed:
          Number.isFinite(deadline),
        actual:
          this.data &&
          this.data.order
            ? this.data.order
                .cancellationDeadlineAt
            : ""
      },
      {
        test:
          "Reward preview",
        passed:
          Boolean(
            this.data &&
            this.data.rewardPreview
          ),
        actual:
          Boolean(
            this.data &&
            this.data.rewardPreview
          )
      }
    ];

    const passed =
      results.every(
        (item) => item.passed
      );

    console.table(results);

    return {
      success: passed,
      status:
        passed
          ? "PASS"
          : "FAIL",
      results:
        results
    };
  }
};


document.addEventListener(
  "DOMContentLoaded",
  () => {
    CustomerOrderSuccessPage.init();
  }
);
