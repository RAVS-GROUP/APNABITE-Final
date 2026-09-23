/**
 * ============================================================
 * APNABITE ADMIN
 * FILE: admin/js/dashboard.js
 * PURPOSE: Fast Founder, Finance and Operations dashboard
 * VERSION: 2.0.0
 * ============================================================
 *
 * FEATURES:
 *
 * - Secure live Admin dashboard API
 * - Cached dashboard data
 * - Background refresh
 * - Duplicate-request protection
 * - Founder / Finance / Operations / Growth views
 * - Support and district views
 * - Desktop sidebar and mobile navigation
 * - Loading skeleton
 * - Safe financial status handling
 * ============================================================
 */

const AdminDashboard = {

  CACHE_KEY:
    "apnabite_admin_dashboard_v2",

  CACHE_TTL_MS:
    5 * 60 * 1000,

  MAX_CACHE_AGE_MS:
    30 * 60 * 1000,

  ALLOWED_VIEWS: [
    "overview",
    "finance",
    "operations",
    "growth",
    "support",
    "districts"
  ],


  state: {

    loading:
      false,

    initialized:
      false,

    activeView:
      "overview",

    data:
      null,

    requestPromise:
      null,

    requestSequence:
      0,

    lastError:
      null
  },


  elements: {},


  /**
   * ==========================================================
   * INITIALIZE
   * ==========================================================
   */

  init() {

    if (this.state.initialized) {
      return true;
    }


    this.elements = {

      skeleton:
        document.getElementById(
          "adminDashboardSkeleton"
        ),

      content:
        document.getElementById(
          "adminDashboardContent"
        ),

      error:
        document.getElementById(
          "adminDashboardError"
        ),

      errorText:
        document.getElementById(
          "adminDashboardErrorText"
        ),

      retry:
        document.getElementById(
          "retryAdminDashboardButton"
        ),

      refresh:
        document.getElementById(
          "refreshAdminDashboardButton"
        ),

      mobileLogout:
        document.getElementById(
          "adminMobileLogoutButton"
        ),

      desktopLogout:
        document.getElementById(
          "roleLogoutButton"
        ),

      alertList:
        document.getElementById(
          "managementAlertList"
        ),

      alertEmpty:
        document.getElementById(
          "managementAlertEmpty"
        ),

      districtBody:
        document.getElementById(
          "districtPerformanceBody"
        ),

      districtEmpty:
        document.getElementById(
          "districtPerformanceEmpty"
        )
    };


    const required = [
      "skeleton",
      "content",
      "error",
      "errorText",
      "retry",
      "refresh",
      "mobileLogout",
      "desktopLogout",
      "alertList",
      "alertEmpty",
      "districtBody",
      "districtEmpty"
    ];


    const missing =
      required.filter(
        (key) =>
          !this.elements[key]
      );


    if (missing.length > 0) {

      console.error(
        "Admin dashboard elements are missing:",
        missing
      );

      return false;
    }


    this.bindEvents();


    this.state.activeView =
      this.getViewFromUrl();


    this.showView(
      this.state.activeView,
      false
    );


    const cached =
      this.readCache();


    if (cached) {

      this.state.data =
        cached.data;


      this.render(
        cached.data
      );


      this.showDashboard();


      this.load({
        force:
          false,

        silent:
          true
      });

    } else {

      this.showSkeleton();


      this.load({
        force:
          true,

        silent:
          false
      });
    }


    this.state.initialized =
      true;


    console.log(
      "ApnaBite Admin Dashboard initialized."
    );


    return true;
  },


  /**
   * ==========================================================
   * EVENTS
   * ==========================================================
   */

  bindEvents() {

    this.elements.refresh
      .addEventListener(
        "click",
        () => {

          this.load({
            force:
              true,

            silent:
              true
          });
        }
      );


    this.elements.retry
      .addEventListener(
        "click",
        () => {

          this.load({
            force:
              true,

            silent:
              false
          });
        }
      );


    this.elements.mobileLogout
      .addEventListener(
        "click",
        () => {

          this.elements.desktopLogout
            .click();
        }
      );


    document
      .querySelectorAll(
        "[data-admin-view]"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              this.showView(
                button.dataset.adminView,
                true
              );
            }
          );
        }
      );


    document
      .querySelectorAll(
        "[data-admin-view-target]"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              this.showView(
                button.dataset
                  .adminViewTarget,
                true
              );
            }
          );
        }
      );


    window.addEventListener(
      "popstate",
      () => {

        this.showView(
          this.getViewFromUrl(),
          false
        );
      }
    );


    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.visibilityState ===
          "visible" &&
          this.cacheNeedsRefresh()
        ) {

          this.load({
            force:
              false,

            silent:
              true
          });
        }
      }
    );
  },


  /**
   * ==========================================================
   * LOAD DASHBOARD
   * ==========================================================
   */

  async load(options = {}) {

    const force =
      options.force === true;

    const silent =
      options.silent === true;


    if (
      this.state.loading &&
      this.state.requestPromise
    ) {

      return this.state
        .requestPromise;
    }


    if (
      !force &&
      this.state.data &&
      !this.cacheNeedsRefresh()
    ) {

      return this.state.data;
    }


    this.state.loading =
      true;


    this.setRefreshLoading(
      true
    );


    if (
      !silent &&
      !this.state.data
    ) {

      this.showSkeleton();
    }


    this.hideError();


    const requestSequence =
      ++this.state
        .requestSequence;


    try {

      const data =
        await this.fetchSummary();


      if (
        requestSequence !==
        this.state.requestSequence
      ) {

        return data;
      }


      this.state.data =
        data;


      this.state.lastError =
        null;


      this.writeCache(
        data
      );


      this.render(
        data
      );


      this.showDashboard();


      return data;

    } catch (error) {

      this.state.lastError =
        error;


      console.error(
        "Admin dashboard load failed:",
        error
      );


      if (this.state.data) {

        this.showError(
          "Live update failed. Cached dashboard data is still visible."
        );

        this.showDashboard();

      } else {

        this.showError(
          error.message ||
          "Admin dashboard could not be loaded."
        );

        this.hideSkeleton();
      }


      return null;

    } finally {

      this.state.loading =
        false;


      this.state.requestPromise =
        null;


      this.setRefreshLoading(
        false
      );
    }
  },


  /**
   * ==========================================================
   * DUPLICATE-PROTECTED API REQUEST
   * ==========================================================
   */

  fetchSummary() {

    if (
      this.state.requestPromise
    ) {

      return this.state
        .requestPromise;
    }


    const session =
      SessionManager.get();


    if (
      !session ||
      !session.sessionId
    ) {

      return Promise.reject(
        new Error(
          "Admin session is unavailable."
        )
      );
    }


    this.state.requestPromise =
      API.request(
        "get_admin_dashboard_summary",
        {
          sessionId:
            session.sessionId
        }
      )
        .then(
          (response) => {

            const data =
              response &&
              response.data
                ? response.data
                : {};


            if (
              data.success !== true
            ) {

              throw new Error(
                "Admin dashboard returned an invalid response."
              );
            }


            return data;
          }
        )
        .catch(
          (error) => {

            this.state.requestPromise =
              null;

            throw error;
          }
        );


    return this.state
      .requestPromise;
  },


  /**
   * ==========================================================
   * CACHE
   * ==========================================================
   */

  getCacheKey() {

    const session =
      SessionManager.get();


    const identity =
      session &&
      (
        session.userId ||
        session.sessionId
      )
        ? (
            session.userId ||
            session.sessionId
          )
        : "anonymous";


    return (
      this.CACHE_KEY +
      "_" +
      identity
    );
  },


  readCache() {

    try {

      const record =
        AppStorage.get(
          this.getCacheKey()
        );


      if (
        !record ||
        typeof record !== "object" ||
        !record.data ||
        !record.savedAt
      ) {

        return null;
      }


      const age =
        Date.now() -
        Number(record.savedAt);


      if (
        !Number.isFinite(age) ||
        age < 0 ||
        age >
          this.MAX_CACHE_AGE_MS
      ) {

        this.clearCache();

        return null;
      }


      return record;

    } catch (error) {

      console.warn(
        "Admin dashboard cache unavailable:",
        error
      );


      return null;
    }
  },


  writeCache(data) {

    try {

      AppStorage.set(
        this.getCacheKey(),
        {
          savedAt:
            Date.now(),

          data:
            data
        }
      );

    } catch (error) {

      console.warn(
        "Admin dashboard cache write failed:",
        error
      );
    }
  },


  clearCache() {

    try {

      AppStorage.remove(
        this.getCacheKey()
      );

    } catch (error) {

      console.warn(
        "Admin dashboard cache clear failed:",
        error
      );
    }
  },


  cacheNeedsRefresh() {

    const record =
      this.readCache();


    if (!record) {
      return true;
    }


    return (
      Date.now() -
      Number(record.savedAt)
    ) >=
      this.CACHE_TTL_MS;
  },


  /**
   * ==========================================================
   * COMPLETE RENDER
   * ==========================================================
   */

  render(data) {

    const overview =
      data.overview || {};

    const finance =
      data.finance || {};

    const orders =
      data.orders || {};

    const payments =
      data.payments || {};

    const refunds =
      data.refunds || {};

    const partners =
      data.partners || {};

    const riders =
      data.riders || {};

    const users =
      data.users || {};

    const offers =
      data.offers || {};

    const support =
      data.support || {};

    const districts =
      data.districts || {};

    const dataQuality =
      data.dataQuality || {};


    /*
     * Founder Overview
     */

    this.setMoney(
      "totalGmvValue",
      overview.totalGmv
    );

    this.setMoney(
      "platformRevenueValue",
      overview.platformRevenue
    );

    this.setMoney(
      "estimatedContributionValue",
      overview.estimatedContribution
    );

    this.setNumber(
      "totalOrdersValue",
      overview.totalOrders
    );

    this.setNumber(
      "todayOrdersInline",
      overview.todayOrders
    );

    this.setMoney(
      "todayGmvValue",
      overview.todayGmv
    );

    this.setMoney(
      "averageOrderValue",
      overview.averageOrderValue
    );

    this.setNumber(
      "activeCustomersValue",
      overview.activeCustomers
    );

    this.setNumber(
      "activeKitchensValue",
      overview.activeKitchens
    );

    this.setNumber(
      "activeRidersValue",
      overview.activeRiders
    );

    this.setNumber(
      "openSupportValue",
      overview.openSupportTickets
    );


    /*
     * Orders
     */

    this.setNumber(
      "deliveredOrdersValue",
      orders.deliveredOrders
    );

    this.setNumber(
      "inProcessOrdersValue",
      orders.inProcessOrders
    );

    this.setNumber(
      "cancelledOrdersValue",
      orders.cancelledOrders
    );

    this.setNumber(
      "failedOrdersValue",
      orders.failedOrders
    );


    /*
     * Finance
     */

    this.setText(
      "profitLossStatus",
      finance.profitLossStatus ||
      "PRELIMINARY"
    );

    this.setText(
      "financeAuditMessage",
      finance.profitLossMessage ||
      "Final profit requires a complete expense ledger."
    );

    this.setMoney(
      "commissionRevenueValue",
      finance.commissionRevenue
    );

    this.setMoney(
      "platformFeeRevenueValue",
      finance.platformFeeRevenue
    );

    this.setMoney(
      "deliveryFeeCollectedValue",
      finance.deliveryFeeCollected
    );

    this.setMoney(
      "promotionCostValue",
      finance.promotionCost
    );

    this.setMoney(
      "refundOutflowValue",
      finance.refundOutflow
    );

    this.setMoney(
      "recordedExpensesValue",
      finance.recordedOperatingExpenses
    );

    this.setMoney(
      "partnerPayableValue",
      finance.partnerPayable
    );

    this.setMoney(
      "riderPayableValue",
      finance.riderPayable
    );

    this.setMoney(
      "pendingSettlementValue",
      finance.pendingSettlementAmount
    );


    /*
     * Payments and refunds
     */

    this.setNumber(
      "successfulPaymentsValue",
      payments.successfulPayments
    );

    this.setNumber(
      "pendingPaymentsValue",
      payments.pendingPayments
    );

    this.setNumber(
      "failedPaymentsValue",
      payments.failedPayments
    );

    this.setNumber(
      "pendingRefundsValue",
      refunds.pendingRefunds
    );


    /*
     * Partners and products
     */

    this.setNumber(
      "totalPartnersValue",
      partners.totalPartners
    );

    this.setNumber(
      "approvedPartnersValue",
      partners.approvedPartners
    );

    this.setNumber(
      "openKitchensValue",
      partners.openKitchens
    );

    this.setNumber(
      "closedKitchensValue",
      partners.closedKitchens
    );

    this.setNumber(
      "totalProductsValue",
      partners.totalProducts
    );

    this.setNumber(
      "availableProductsValue",
      partners.availableProducts
    );

    this.setNumber(
      "pendingPartnerApprovalValue",
      partners.pendingApproval
    );

    this.setNumber(
      "pendingPartnerKycValue",
      partners.pendingKyc
    );

    this.setNumber(
      "rejectedPartnersValue",
      partners.rejectedPartners
    );


    /*
     * Riders
     */

    this.setNumber(
      "totalRidersValue",
      riders.totalRiders
    );

    this.setNumber(
      "operatingRidersValue",
      riders.activeRiders
    );

    this.setNumber(
      "approvedRidersValue",
      riders.approvedRiders
    );

    this.setNumber(
      "pendingRiderApprovalValue",
      riders.pendingApproval
    );

    this.setNumber(
      "pendingRiderKycValue",
      riders.pendingKyc
    );


    /*
     * Offers
     */

    this.setNumber(
      "totalOffersValue",
      offers.totalOffers
    );

    this.setNumber(
      "activeOffersValue",
      offers.activeOffers
    );

    this.setNumber(
      "scheduledOffersValue",
      offers.scheduledOffers
    );

    this.setNumber(
      "expiredOffersValue",
      offers.expiredOffers
    );

    this.setNumber(
      "disabledOffersValue",
      offers.disabledOffers
    );


    /*
     * Support
     */

    this.setNumber(
      "totalTicketsValue",
      support.totalTickets
    );

    this.setNumber(
      "openTicketsValue",
      support.openTickets
    );

    this.setNumber(
      "highPriorityTicketsValue",
      support.highPriorityTickets
    );

    this.setNumber(
      "resolvedTicketsValue",
      support.resolvedTickets
    );

    this.setNumber(
      "closedTicketsValue",
      support.closedTickets
    );


    /*
     * Districts
     */

    this.setNumber(
      "totalDistrictsValue",
      districts.totalDistricts
    );

    this.setNumber(
      "activeDistrictsValue",
      districts.activeDistricts
    );

    this.setNumber(
      "inactiveDistrictsValue",
      districts.inactiveDistricts
    );


    /*
     * KYC indicators
     */

    const pendingKyc =
      this.safeNumber(
        overview.pendingKyc
      );


    this.setNumber(
      "sidebarKycCount",
      pendingKyc
    );

    this.setNumber(
      "managementKycCount",
      pendingKyc
    );


    /*
     * Updated time and status
     */

    this.setText(
      "adminLastUpdated",
      this.formatDateTime(
        data.generatedAt
      )
    );


    const finalProfitAvailable =
      dataQuality
        .finalProfitAvailable ===
      true;


    this.setText(
      "adminDataStatus",
      finalProfitAvailable
        ? "Audited financial data"
        : "Live operational data"
    );


    const notes =
      Array.isArray(
        dataQuality.notes
      )
        ? dataQuality.notes
        : [];


    this.setText(
      "adminDataQualityNote",
      notes.length > 0
        ? notes[0]
        : "Dashboard values are calculated from current records."
    );


    this.renderAlerts(
      data.alerts
    );


    this.renderDistricts(
      districts.performance
    );


    this.applyContributionStyle(
      overview.estimatedContribution
    );


    console.log(
      "Admin dashboard rendered:",
      {
        users:
          users.totalUsers || 0,

        orders:
          orders.totalOrders || 0,

        partners:
          partners.totalPartners || 0
      }
    );
  },


  /**
   * ==========================================================
   * ALERT RENDERING
   * ==========================================================
   */

  renderAlerts(alerts) {

    const safeAlerts =
      Array.isArray(alerts)
        ? alerts
        : [];


    this.elements.alertList
      .innerHTML = "";


    this.setNumber(
      "managementAlertCount",
      safeAlerts.length
    );


    safeAlerts.forEach(
      (alert) => {

        const item =
          document.createElement(
            "article"
          );


        const severity =
          String(
            alert.severity || ""
          ).trim().toLowerCase();


        item.className =
          "admin-alert-item" +
          (
            severity
              ? " " + severity
              : ""
          );


        const icon =
          document.createElement(
            "span"
          );


        icon.textContent =
          severity === "critical"
            ? "!"
            : severity === "high"
              ? "!"
              : "i";


        const content =
          document.createElement(
            "div"
          );


        const title =
          document.createElement(
            "strong"
          );


        title.textContent =
          alert.title ||
          "Management alert";


        const message =
          document.createElement(
            "p"
          );


        message.textContent =
          alert.message || "";


        content.append(
          title,
          message
        );


        item.append(
          icon,
          content
        );


        this.elements.alertList
          .appendChild(item);
      }
    );


    this.elements.alertEmpty
      .classList.toggle(
        "hidden",
        safeAlerts.length > 0
      );
  },


  /**
   * ==========================================================
   * DISTRICT RENDERING
   * ==========================================================
   */

  renderDistricts(performance) {

    const districts =
      Array.isArray(performance)
        ? performance
        : [];


    this.elements.districtBody
      .innerHTML = "";


    districts.forEach(
      (district) => {

        const row =
          document.createElement(
            "tr"
          );


        const districtName =
          this.createCell(
            district.districtName ||
            district.districtId ||
            "Unnamed district"
          );


        const state =
          this.createCell(
            district.state || "—"
          );


        const statusCell =
          document.createElement(
            "td"
          );


        const status =
          document.createElement(
            "span"
          );


        const statusValue =
          String(
            district.serviceStatus ||
            "INACTIVE"
          ).toUpperCase();


        status.className =
          "admin-table-status" +
          (
            [
              "ACTIVE",
              "ENABLED",
              "AVAILABLE"
            ].includes(statusValue)
              ? ""
              : " inactive"
          );


        status.textContent =
          this.prettyStatus(
            statusValue
          );


        statusCell.appendChild(
          status
        );


        const kitchens =
          this.createCell(
            this.formatNumber(
              district.kitchenCount
            )
          );


        const orders =
          this.createCell(
            this.formatNumber(
              district.orderCount
            )
          );


        const gmv =
          this.createCell(
            this.formatMoney(
              district.gmv
            )
          );


        row.append(
          districtName,
          state,
          statusCell,
          kitchens,
          orders,
          gmv
        );


        this.elements.districtBody
          .appendChild(row);
      }
    );


    this.elements.districtEmpty
      .classList.toggle(
        "hidden",
        districts.length > 0
      );
  },


  createCell(value) {

    const cell =
      document.createElement(
        "td"
      );


    cell.textContent =
      String(
        value === null ||
        value === undefined
          ? ""
          : value
      );


    return cell;
  },


  /**
   * ==========================================================
   * VIEW NAVIGATION
   * ==========================================================
   */

  showView(
    requestedView,
    updateUrl = true
  ) {

    const view =
      this.ALLOWED_VIEWS.includes(
        requestedView
      )
        ? requestedView
        : "overview";


    this.state.activeView =
      view;


    document
      .querySelectorAll(
        "[data-admin-panel]"
      )
      .forEach(
        (panel) => {

          panel.classList.toggle(
            "active",
            panel.dataset.adminPanel ===
              view
          );
        }
      );


    document
      .querySelectorAll(
        "[data-admin-view]"
      )
      .forEach(
        (button) => {

          const active =
            button.dataset.adminView ===
            view;


          button.classList.toggle(
            "active",
            active
          );


          if (active) {

            button.setAttribute(
              "aria-current",
              "page"
            );

          } else {

            button.removeAttribute(
              "aria-current"
            );
          }
        }
      );


    if (updateUrl) {

      this.updateViewUrl(
        view
      );
    }


    window.scrollTo({
      top:
        0,

      behavior:
        "smooth"
    });
  },


  getViewFromUrl() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const view =
      String(
        params.get("view") ||
        "overview"
      ).toLowerCase();


    return this.ALLOWED_VIEWS
      .includes(view)
        ? view
        : "overview";
  },


  updateViewUrl(view) {

    const url =
      new URL(
        window.location.href
      );


    if (view === "overview") {

      url.searchParams.delete(
        "view"
      );

    } else {

      url.searchParams.set(
        "view",
        view
      );
    }


    window.history.pushState(
      {
        adminView:
          view
      },
      "",
      url.toString()
    );
  },


  /**
   * ==========================================================
   * DISPLAY STATES
   * ==========================================================
   */

  showSkeleton() {

    this.elements.skeleton
      .classList.remove(
        "hidden"
      );


    this.elements.content
      .classList.add(
        "hidden"
      );
  },


  hideSkeleton() {

    this.elements.skeleton
      .classList.add(
        "hidden"
      );
  },


  showDashboard() {

    this.hideSkeleton();


    this.elements.content
      .classList.remove(
        "hidden"
      );
  },


  showError(message) {

    this.elements.errorText
      .textContent =
        message ||
        "Dashboard request failed.";


    this.elements.error
      .classList.remove(
        "hidden"
      );
  },


  hideError() {

    this.elements.error
      .classList.add(
        "hidden"
      );


    this.elements.errorText
      .textContent = "";
  },


  setRefreshLoading(loading) {

    this.elements.refresh
      .disabled =
        loading;


    this.elements.refresh
      .classList.toggle(
        "loading",
        loading
      );


    const label =
      this.elements.refresh
        .querySelector(
          "strong"
        );


    if (label) {

      label.textContent =
        loading
          ? "Updating"
          : "Refresh";
    }
  },


  applyContributionStyle(value) {

    const element =
      document.getElementById(
        "estimatedContributionValue"
      );


    if (!element) {
      return;
    }


    const amount =
      this.safeNumber(value);


    element.style.color =
      amount < 0
        ? "#c83228"
        : "";
  },


  /**
   * ==========================================================
   * VALUE HELPERS
   * ==========================================================
   */

  setText(id, value) {

    const element =
      document.getElementById(id);


    if (!element) {
      return;
    }


    element.textContent =
      String(
        value === null ||
        value === undefined
          ? ""
          : value
      );
  },


  setNumber(id, value) {

    this.setText(
      id,
      this.formatNumber(value)
    );
  },


  setMoney(id, value) {

    this.setText(
      id,
      this.formatMoney(value)
    );
  },


  safeNumber(value) {

    const number =
      Number(value);


    return Number.isFinite(number)
      ? number
      : 0;
  },


  formatNumber(value) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        maximumFractionDigits:
          0
      }
    ).format(
      this.safeNumber(value)
    );
  },


  formatMoney(value) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        style:
          "currency",

        currency:
          "INR",

        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2
      }
    ).format(
      this.safeNumber(value)
    );
  },


  formatDateTime(value) {

    if (!value) {
      return "—";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }


    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    ).format(date);
  },


  prettyStatus(value) {

    return String(value || "")
      .replace(
        /_/g,
        " "
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  },


  /**
   * ==========================================================
   * LIVE INTEGRATION TEST
   *
   * Browser console:
   *
   * AdminDashboard.test()
   * ==========================================================
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE ADMIN DASHBOARD INTEGRATION TEST"
    );

    console.log(
      "========================================"
    );


    const firstPromise =
      this.fetchSummary();


    const secondPromise =
      this.fetchSummary();


    const duplicateProtected =
      firstPromise ===
      secondPromise;


    let liveData = null;


    try {

      liveData =
        await firstPromise;

    } catch (error) {

      console.error(
        "Admin dashboard test API failed:",
        error
      );
    }


    if (liveData) {

      this.state.data =
        liveData;


      this.writeCache(
        liveData
      );


      this.render(
        liveData
      );


      this.showDashboard();
    }


    this.state.requestPromise =
      null;


    const cache =
      this.readCache();


    const views =
      document.querySelectorAll(
        "[data-admin-panel]"
      );


    const mobileButtons =
      document.querySelectorAll(
        ".admin-mobile-navigation [data-admin-view]"
      );


    const sidebarButtons =
      document.querySelectorAll(
        ".admin-sidebar [data-admin-view]"
      );


    const dashboardVisible =
      !this.elements.content
        .classList.contains(
          "hidden"
        );


    const results = [

      {
        test:
          "Required role",

        expected:
          "Admin",

        actual:
          document.body.dataset
            .requiredRole,

        passed:
          document.body.dataset
            .requiredRole ===
            "Admin"
      },

      {
        test:
          "Live Admin API",

        expected:
          true,

        actual:
          Boolean(
            liveData &&
            liveData.success
          ),

        passed:
          Boolean(
            liveData &&
            liveData.success
          )
      },

      {
        test:
          "Founder overview",

        expected:
          true,

        actual:
          Boolean(
            liveData &&
            liveData.overview
          ),

        passed:
          Boolean(
            liveData &&
            liveData.overview
          )
      },

      {
        test:
          "Finance summary",

        expected:
          true,

        actual:
          Boolean(
            liveData &&
            liveData.finance
          ),

        passed:
          Boolean(
            liveData &&
            liveData.finance
          )
      },

      {
        test:
          "Operations summary",

        expected:
          true,

        actual:
          Boolean(
            liveData &&
            liveData.partners &&
            liveData.riders
          ),

        passed:
          Boolean(
            liveData &&
            liveData.partners &&
            liveData.riders
          )
      },

      {
        test:
          "Dashboard cache",

        expected:
          true,

        actual:
          Boolean(
            cache &&
            cache.data
          ),

        passed:
          Boolean(
            cache &&
            cache.data
          )
      },

      {
        test:
          "Duplicate request protection",

        expected:
          true,

        actual:
          duplicateProtected,

        passed:
          duplicateProtected
      },

      {
        test:
          "Dashboard visible",

        expected:
          true,

        actual:
          dashboardVisible,

        passed:
          dashboardVisible
      },

      {
        test:
          "Admin views",

        expected:
          6,

        actual:
          views.length,

        passed:
          views.length === 6
      },

      {
        test:
          "Mobile navigation",

        expected:
          4,

        actual:
          mobileButtons.length,

        passed:
          mobileButtons.length === 4
      },

      {
        test:
          "Desktop main navigation",

        expected:
          4,

        actual:
          sidebarButtons.length,

        passed:
          sidebarButtons.length === 4
      },

      {
        test:
          "Financial safety",

        expected:
          "PRELIMINARY",

        actual:
          liveData &&
          liveData.finance
            ? liveData.finance
                .profitLossStatus
            : "",

        passed:
          Boolean(
            liveData &&
            liveData.finance &&
            liveData.finance
              .profitLossStatus ===
              "PRELIMINARY" &&
            liveData.finance
              .netProfit === null
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
      "Admin Dashboard Data:",
      liveData
    );


    console.log(
      passed
        ? "Admin Dashboard Integration Test: PASS"
        : "Admin Dashboard Integration Test: FAIL"
    );


    return {
      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      data:
        liveData,

      results:
        results
    };
  }

};


/**
 * ============================================================
 * INITIALIZE
 * ============================================================
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    AdminDashboard.init();
  }
);
