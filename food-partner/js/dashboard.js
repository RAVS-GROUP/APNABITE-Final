/**
 * ============================================================
 * APNABITE FOOD PARTNER
 * FILE: food-partner/js/dashboard.js
 * PURPOSE: Onboarding and live Food Partner dashboard
 * VERSION: 2.1.0
 * ============================================================
 */

const FoodPartnerDashboard = {

  CACHE_KEY: "apnabite_food_partner_dashboard",
  CACHE_FRESH_MS: 5 * 60 * 1000,
  CACHE_MAX_AGE_MS: 24 * 60 * 60 * 1000,

  map: null,
  marker: null,
  profile: null,
  summary: null,
  saving: false,
  summaryRequest: null,
  activeTab: "overview",
  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    const ids = {
      loading: "profileLoadingState",
      onboarding: "onboardingSection",
      dashboard: "dashboardSection",
      bottomNavigation: "partnerBottomNavigation",

      form: "partnerOnboardingForm",
      businessName: "businessNameInput",
      businessType: "businessTypeInput",
      ownerName: "ownerNameInput",
      email: "partnerEmailInput",
      foodType: "foodTypeInput",
      description: "descriptionInput",
      currentButton: "useCurrentLocationButton",
      map: "partnerMap",
      mapStatus: "mapStatus",
      latitude: "latitudeInput",
      longitude: "longitudeInput",
      address: "businessAddressInput",
      district: "districtInput",
      error: "formError",
      saveButton: "savePartnerButton",

      businessNameDisplay: "dashboardBusinessName",
      addressDisplay: "dashboardAddress",
      rating: "dashboardRating",
      foodTypeDisplay: "dashboardFoodType",
      liveBadge: "dashboardLiveBadge",

      kycStatus: "kycStatus",
      approvalStatus: "approvalStatus",
      operatingStatus: "operatingStatus",
      kycStatusCard: "kycStatusCard",
      approvalStatusCard: "approvalStatusCard",
      operatingStatusCard: "operatingStatusCard",

      complianceAlert: "dashboardComplianceAlert",
      alertTitle: "dashboardAlertTitle",
      alertMessage: "dashboardAlertMessage",
      alertLink: "dashboardAlertLink",

      dataSkeleton: "dashboardDataSkeleton",
      todayEarnings: "todayEarnings",
      totalEarnings: "totalEarnings",
      pendingEarnings: "pendingEarnings",
      todayOrders: "todayOrders",
      inProcessOrders: "inProcessOrders",
      deliveredOrders: "deliveredOrders",
      totalProducts: "totalProducts",

      totalOrders: "totalOrders",
      ordersTabToday: "ordersTabToday",
      ordersTabInProcess: "ordersTabInProcess",
      ordersTabDelivered: "ordersTabDelivered",
      cancelledOrders: "cancelledOrders",

      productsTabTotal: "productsTabTotal",
      activeProducts: "activeProducts",
      availableProducts: "availableProducts",
      outOfStockProducts: "outOfStockProducts",

      recentOrdersList: "recentOrdersList",
      updatedTime: "dashboardUpdatedTime",

      dashboardOwnerName: "dashboardOwnerName",
      dashboardCommissionRate: "dashboardCommissionRate",
      dashboardChefId: "dashboardChefId",

      dashboardRefreshButton: "dashboardRefreshButton",
      earningsRefreshButton: "earningsRefreshButton",
      viewAllOrdersButton: "viewAllOrdersButton",

      editButton: "editProfileButton",
      kycStepCard: "kycStepCard",
      kycStepTitle: "kycStepTitle",
      kycStepCopy: "kycStepCopy",
      menuStepCard: "menuStepCard",
      menuStepCopy: "menuStepCopy"
    };

    Object.keys(ids).forEach((key) => {
      this.elements[key] =
        document.getElementById(ids[key]);
    });

    this.elements.tabButtons = Array.from(
      document.querySelectorAll("[data-dashboard-tab]")
    );

    this.elements.tabPanels = Array.from(
      document.querySelectorAll("[data-dashboard-panel]")
    );

    this.elements.bottomTabButtons = Array.from(
      document.querySelectorAll("[data-dashboard-tab-target]")
    );

    if (!this.hasRequiredElements()) {
      console.error(
        "Food Partner dashboard elements are missing."
      );

      return false;
    }

    this.bindEvents();
    this.start();

    console.log(
      "ApnaBite Food Partner Dashboard initialized."
    );

    return true;
  },


  hasRequiredElements() {

    const required = [
      "loading",
      "onboarding",
      "dashboard",
      "bottomNavigation",
      "form",
      "businessName",
      "businessType",
      "ownerName",
      "email",
      "foodType",
      "description",
      "currentButton",
      "map",
      "mapStatus",
      "latitude",
      "longitude",
      "address",
      "district",
      "error",
      "saveButton",
      "businessNameDisplay",
      "addressDisplay",
      "kycStatus",
      "approvalStatus",
      "operatingStatus",
      "todayEarnings",
      "totalEarnings",
      "pendingEarnings",
      "todayOrders",
      "inProcessOrders",
      "deliveredOrders",
      "totalProducts",
      "recentOrdersList",
      "editButton"
    ];

    return required.every(
      (key) => Boolean(this.elements[key])
    );
  },


  /*
   * ----------------------------------------------------------
   * EVENTS
   * ----------------------------------------------------------
   */

  bindEvents() {

    this.elements.form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        this.saveOnboarding();
      }
    );

    this.elements.currentButton.addEventListener(
      "click",
      () => this.useCurrentLocation()
    );

    this.elements.editButton.addEventListener(
      "click",
      () => this.editProfile()
    );

    this.elements.dashboardRefreshButton.addEventListener(
      "click",
      () => this.refreshDashboard()
    );

    this.elements.earningsRefreshButton.addEventListener(
      "click",
      () => this.refreshDashboard()
    );

    this.elements.viewAllOrdersButton.addEventListener(
      "click",
      () => this.selectTab("orders")
    );

    this.elements.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectTab(button.dataset.dashboardTab);
      });
    });

    this.elements.bottomTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectTab(
          button.dataset.dashboardTabTarget,
          true
        );
      });
    });

    window.addEventListener(
      "popstate",
      () => {
        this.selectTab(
          this.getTabFromUrl(),
          false,
          false
        );
      }
    );

    document.addEventListener(
      "apnabite:kitchen-status-updated",
      (event) => {
        const detail = event.detail || {};

        if (detail.operatingStatus) {
          this.updateOperatingStatus(
            detail.operatingStatus
          );
        }
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * SESSION
   * ----------------------------------------------------------
   */

  getSession() {
    return SessionManager.get();
  },


  getSessionId() {

    const session = this.getSession();

    return session && session.sessionId
      ? session.sessionId
      : "";
  },


  /*
   * ----------------------------------------------------------
   * START
   * ----------------------------------------------------------
   */

  async start() {

    const cached = this.restoreDashboardCache();

    if (cached) {
      this.summary = cached.data;
      this.profile = cached.data.profile || null;
      this.showDashboard(this.profile, cached.data);

      this.loadDashboardSummary({
        background: true
      });

      return {
        success: true,
        source: "CACHE"
      };
    }

    this.showOnly("loading");

    const result =
      await this.loadDashboardSummary({
        initial: true
      });

    if (
      result.success === false &&
      result.code === "FOOD_PARTNER_PROFILE_REQUIRED"
    ) {
      await this.prepareOnboarding();
    }

    return result;
  },


  /*
   * ----------------------------------------------------------
   * LIVE DASHBOARD DATA
   * ----------------------------------------------------------
   */

  loadDashboardSummary(options = {}) {

    if (this.summaryRequest) {
      return this.summaryRequest;
    }

    this.summaryRequest =
      this.executeDashboardSummaryRequest(options)
        .finally(() => {
          this.summaryRequest = null;
        });

    return this.summaryRequest;
  },


  async executeDashboardSummaryRequest(options = {}) {

    const initial = options.initial === true;
    const background = options.background === true;

    if (initial && !this.summary) {
      this.showOnly("loading");
    }

    if (!background && this.summary) {
      this.setDashboardRefreshing(true);
    }

    try {

      const response = await API.request(
        "get_food_partner_dashboard_summary",
        {
          sessionId: this.getSessionId()
        }
      );

      const data = response.data || {};

      if (
        data.success !== true ||
        !data.profile
      ) {
        throw this.createError(
          "Dashboard summary was not returned.",
          "DASHBOARD_DATA_MISSING"
        );
      }

      this.summary = data;
      this.profile = data.profile;
      this.saveDashboardCache(data);
      this.showDashboard(data.profile, data);

      document.dispatchEvent(
        new CustomEvent(
          "apnabite:food-partner-dashboard-summary",
          {
            detail: data
          }
        )
      );

      return {
        success: true,
        source: "LIVE",
        data,
        requestId: response.requestId || ""
      };

    } catch (error) {

      const code =
        error.code ||
        "DASHBOARD_LOAD_FAILED";

      if (
        code === "FOOD_PARTNER_PROFILE_REQUIRED"
      ) {
        this.clearDashboardCache();

        return {
          success: false,
          code,
          error: error.message
        };
      }

      if (this.summary) {
        this.showDashboardMessage(
          "Live update is temporarily unavailable. Showing saved dashboard data."
        );

        return {
          success: false,
          cached: true,
          code,
          error: error.message
        };
      }

      this.showOnly("onboarding");

      await this.loadDistrictsSafe();

      this.showError(
        error.message ||
        "Food Partner dashboard could not be loaded."
      );

      return {
        success: false,
        code,
        error: error.message
      };

    } finally {
      this.setDashboardRefreshing(false);
    }
  },


  async refreshDashboard() {

    const result =
      await this.loadDashboardSummary({
        force: true
      });

    if (result.success) {
      this.showDashboardMessage(
        "Dashboard updated successfully.",
        2200
      );
    }

    return result;
  },


  setDashboardRefreshing(refreshing) {

    [
      this.elements.dashboardRefreshButton,
      this.elements.earningsRefreshButton
    ].forEach((button) => {
      if (button) {
        button.disabled = refreshing;
      }
    });

    if (this.elements.dashboardRefreshButton) {
      this.elements.dashboardRefreshButton.textContent =
        refreshing ? "…" : "↻";
    }

    if (this.elements.earningsRefreshButton) {
      this.elements.earningsRefreshButton.textContent =
        refreshing ? "Updating..." : "Refresh";
    }
  },


  /*
   * ----------------------------------------------------------
   * CACHE
   * ----------------------------------------------------------
   */

  saveDashboardCache(data) {

    const session = this.getSession();

    if (
      !data ||
      !data.chefId ||
      !session ||
      !session.sessionId
    ) {
      return false;
    }

    AppStorage.set(
      this.CACHE_KEY,
      {
        sessionId: session.sessionId,
        chefId: data.chefId,
        savedAt: Date.now(),
        data
      }
    );

    return true;
  },


  restoreDashboardCache() {

    const session = this.getSession();

    const cached =
      AppStorage.get(
        this.CACHE_KEY,
        null
      );

    if (
      !cached ||
      !cached.data ||
      !cached.savedAt ||
      !session ||
      cached.sessionId !== session.sessionId
    ) {
      return null;
    }

    const age =
      Date.now() -
      Number(cached.savedAt);

    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age > this.CACHE_MAX_AGE_MS
    ) {
      this.clearDashboardCache();
      return null;
    }

    return {
      data: cached.data,
      age,
      fresh:
        age <= this.CACHE_FRESH_MS
    };
  },


  clearDashboardCache() {

    AppStorage.remove(
      this.CACHE_KEY
    );

    return true;
  },


  /*
   * ----------------------------------------------------------
   * RENDER DASHBOARD
   * ----------------------------------------------------------
   */

  showDashboard(profile, summary = null) {

    if (!profile) {
      return false;
    }

    this.profile = profile;
    this.showOnly("dashboard");

    this.elements.businessNameDisplay.textContent =
      profile.businessName || "Your Kitchen";

    this.elements.addressDisplay.textContent =
      profile.address || "Kitchen address unavailable";

    this.elements.kycStatus.textContent =
      this.readableStatus(
        profile.kycStatus || "NOT_SUBMITTED"
      );

    this.elements.approvalStatus.textContent =
      this.readableStatus(
        profile.approvalStatus || "PENDING"
      );

    this.updateOperatingStatus(
      profile.operatingStatus || "CLOSED"
    );

    this.renderStatusCards(profile);
    this.renderCompliance(profile);
    this.renderProfileActions(profile);

    if (summary) {
      this.renderSummary(summary);
    }

    this.selectTab(
      this.getTabFromUrl(),
      false,
      false
    );

    return true;
  },


  renderSummary(data) {

    const profile = data.profile || {};
    const earnings = data.earnings || {};
    const orders = data.orders || {};
    const products = data.products || {};

    this.setText(
      this.elements.todayEarnings,
      this.formatCurrency(earnings.todayEarnings)
    );

    this.setText(
      this.elements.totalEarnings,
      this.formatCurrency(earnings.totalEarnings)
    );

    this.setText(
      this.elements.pendingEarnings,
      this.formatCurrency(earnings.pendingEarnings)
    );

    this.setText(
      this.elements.todayOrders,
      this.formatCount(orders.todayOrders)
    );

    this.setText(
      this.elements.inProcessOrders,
      this.formatCount(orders.inProcessOrders)
    );

    this.setText(
      this.elements.deliveredOrders,
      this.formatCount(orders.deliveredOrders)
    );

    this.setText(
      this.elements.totalProducts,
      this.formatCount(products.totalProducts)
    );

    this.setText(
      this.elements.totalOrders,
      this.formatCount(orders.totalOrders)
    );

    this.setText(
      this.elements.ordersTabToday,
      this.formatCount(orders.todayOrders)
    );

    this.setText(
      this.elements.ordersTabInProcess,
      this.formatCount(orders.inProcessOrders)
    );

    this.setText(
      this.elements.ordersTabDelivered,
      this.formatCount(orders.deliveredOrders)
    );

    this.setText(
      this.elements.cancelledOrders,
      this.formatCount(orders.cancelledOrders)
    );

    this.setText(
      this.elements.productsTabTotal,
      this.formatCount(products.totalProducts)
    );

    this.setText(
      this.elements.activeProducts,
      this.formatCount(products.activeProducts)
    );

    this.setText(
      this.elements.availableProducts,
      this.formatCount(products.availableProducts)
    );

    this.setText(
      this.elements.outOfStockProducts,
      this.formatCount(products.outOfStockProducts)
    );

    this.setText(
      this.elements.dashboardOwnerName,
      profile.ownerName || "—"
    );

    this.setText(
      this.elements.dashboardCommissionRate,
      this.formatNumber(profile.commissionRate) + "%"
    );

    this.setText(
      this.elements.dashboardChefId,
      data.chefId || profile.chefId || "—"
    );

    this.setText(
      this.elements.foodTypeDisplay,
      this.readableStatus(
        profile.foodType || "Food Partner"
      )
    );

    this.renderRating(
      profile.rating,
      profile.ratingCount
    );

    this.renderRecentOrders(
      data.recentOrders
    );

    this.elements.updatedTime.textContent =
      "Updated " +
      this.formatDateTime(
        data.generatedAt ||
        new Date().toISOString()
      );

    this.elements.dataSkeleton.classList.add(
      "hidden"
    );
  },


  renderRating(rating, count) {

    const numericRating =
      Number(rating || 0);

    const numericCount =
      Number(count || 0);

    this.elements.rating.textContent =
      numericRating > 0
        ? numericRating.toFixed(1) +
          (
            numericCount > 0
              ? " (" + numericCount + ")"
              : ""
          )
        : "New";
  },


  renderStatusCards(profile) {

    this.applyStatusClass(
      this.elements.kycStatusCard,
      String(profile.kycStatus || "").toUpperCase() ===
        "VERIFIED"
    );

    this.applyStatusClass(
      this.elements.approvalStatusCard,
      String(profile.approvalStatus || "").toUpperCase() ===
        "APPROVED"
    );

    this.applyStatusClass(
      this.elements.operatingStatusCard,
      String(profile.operatingStatus || "").toUpperCase() ===
        "OPEN"
    );
  },


  applyStatusClass(card, successful) {

    if (!card) {
      return;
    }

    card.classList.toggle(
      "is-success",
      successful
    );

    card.classList.toggle(
      "is-warning",
      !successful
    );
  },


  renderCompliance(profile) {

    const verified =
      String(profile.kycStatus || "").toUpperCase() ===
      "VERIFIED";

    const approved =
      String(profile.approvalStatus || "").toUpperCase() ===
      "APPROVED";

    if (verified && approved) {
      this.elements.complianceAlert.classList.add(
        "hidden"
      );

      return;
    }

    this.elements.complianceAlert.classList.remove(
      "hidden"
    );

    if (!verified) {
      this.elements.alertTitle.textContent =
        "Complete Food Partner KYC";

      this.elements.alertMessage.textContent =
        "Upload and verify all required documents before opening your kitchen.";

      this.elements.alertLink.textContent =
        "Complete KYC";

      this.elements.alertLink.href =
        "kyc.html";

      return;
    }

    this.elements.alertTitle.textContent =
      "Admin approval pending";

    this.elements.alertMessage.textContent =
      "Your KYC is verified. Kitchen activation is awaiting Admin approval.";

    this.elements.alertLink.textContent =
      "View status";

    this.elements.alertLink.href =
      "kyc.html";
  },


  renderProfileActions(profile) {

    const verified =
      String(profile.kycStatus || "").toUpperCase() ===
      "VERIFIED";

    const approved =
      String(profile.approvalStatus || "").toUpperCase() ===
      "APPROVED";

    const menuUnlocked =
      verified && approved;

    this.elements.menuStepCard.classList.toggle(
      "locked",
      !menuUnlocked
    );

    this.elements.menuStepCard.setAttribute(
      "aria-disabled",
      String(!menuUnlocked)
    );

    this.elements.menuStepCopy.textContent =
      menuUnlocked
        ? "Add dishes, prices, photos and control availability."
        : "Available after KYC verification and Admin approval.";

    this.elements.kycStepTitle.textContent =
      verified
        ? "KYC verified"
        : "Complete Food Partner KYC";

    this.elements.kycStepCopy.textContent =
      verified
        ? "Your documents have been verified successfully."
        : "Upload all mandatory documents for verification.";
  },


  updateOperatingStatus(status) {

    const normalized =
      String(status || "CLOSED")
        .trim()
        .toUpperCase();

    this.elements.operatingStatus.textContent =
      normalized === "OPEN"
        ? "OPEN"
        : "CLOSED";

    this.elements.liveBadge.classList.toggle(
      "is-open",
      normalized === "OPEN"
    );

    const badgeText =
      this.elements.liveBadge.querySelector(
        "span"
      );

    if (badgeText) {
      badgeText.textContent =
        normalized === "OPEN"
          ? "Kitchen open"
          : "Kitchen closed";
    }

    this.applyStatusClass(
      this.elements.operatingStatusCard,
      normalized === "OPEN"
    );

    if (this.profile) {
      this.profile.operatingStatus =
        normalized;
    }

    if (
      this.summary &&
      this.summary.profile
    ) {
      this.summary.profile.operatingStatus =
        normalized;

      if (this.summary.operating) {
        this.summary.operating.operatingStatus =
          normalized;
      }

      this.saveDashboardCache(
        this.summary
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * RECENT ORDERS
   * ----------------------------------------------------------
   */

  renderRecentOrders(orders) {

    const safeOrders =
      Array.isArray(orders)
        ? orders
        : [];

    this.elements.recentOrdersList.innerHTML =
      "";

    if (safeOrders.length === 0) {

      const empty =
        document.createElement("div");

      empty.className =
        "recent-orders-empty";

      empty.innerHTML =
        "<span aria-hidden=\"true\">🧾</span>" +
        "<strong>No orders yet</strong>" +
        "<p>New customer orders will appear here.</p>";

      this.elements.recentOrdersList.appendChild(
        empty
      );

      return;
    }

    safeOrders.forEach((order) => {
      this.elements.recentOrdersList.appendChild(
        this.createRecentOrderCard(order)
      );
    });
  },


  createRecentOrderCard(order) {

    const card =
      document.createElement("article");

    card.className =
      "recent-order-card";

    const icon =
      document.createElement("span");

    icon.className =
      "recent-order-icon";

    icon.setAttribute(
      "aria-hidden",
      "true"
    );

    icon.textContent =
      "🧾";

    const information =
      document.createElement("div");

    information.className =
      "recent-order-information";

    const orderId =
      document.createElement("strong");

    orderId.textContent =
      order.orderId || "Order";

    const orderTime =
      document.createElement("small");

    orderTime.textContent =
      this.formatDateTime(order.createdAt);

    information.appendChild(orderId);
    information.appendChild(orderTime);

    const value =
      document.createElement("div");

    value.className =
      "recent-order-value";

    const amount =
      document.createElement("strong");

    amount.textContent =
      this.formatCurrency(order.finalAmount);

    const status =
      document.createElement("span");

    status.className =
      "order-status-badge " +
      this.getOrderStatusClass(
        order.orderStatus
      );

    status.textContent =
      this.readableStatus(
        order.orderStatus || "PENDING"
      );

    value.appendChild(amount);
    value.appendChild(status);

    card.appendChild(icon);
    card.appendChild(information);
    card.appendChild(value);

    return card;
  },


  getOrderStatusClass(status) {

    const normalized =
      String(status || "")
        .toUpperCase();

    if (
      ["DELIVERED", "COMPLETED"]
        .includes(normalized)
    ) {
      return "completed";
    }

    if (
      [
        "CANCELLED",
        "CANCELED",
        "REJECTED",
        "FAILED",
        "REFUNDED"
      ].includes(normalized)
    ) {
      return "cancelled";
    }

    return "";
  },


  /*
   * ----------------------------------------------------------
   * DASHBOARD TABS
   * ----------------------------------------------------------
   */

  getAllowedTabs() {

    return [
      "overview",
      "orders",
      "products",
      "profile"
    ];
  },


  getTabFromUrl() {

    try {
      const parameters =
        new URLSearchParams(
          window.location.search
        );

      const requested =
        String(
          parameters.get("tab") ||
          "overview"
        )
          .trim()
          .toLowerCase();

      return this.getAllowedTabs().includes(
        requested
      )
        ? requested
        : "overview";

    } catch (error) {
      return "overview";
    }
  },


  updateTabUrl(tabName) {

    if (
      !window.history ||
      typeof window.history.pushState !==
        "function"
    ) {
      return false;
    }

    const url =
      new URL(
        window.location.href
      );

    if (tabName === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set(
        "tab",
        tabName
      );
    }

    const nextUrl =
      url.pathname +
      url.search +
      url.hash;

    const currentUrl =
      window.location.pathname +
      window.location.search +
      window.location.hash;

    if (nextUrl === currentUrl) {
      return true;
    }

    window.history.pushState(
      {
        dashboardTab: tabName
      },
      "",
      nextUrl
    );

    return true;
  },


  selectTab(
    tabName,
    scrollToTabs = false,
    updateUrl = true
  ) {

    const allowed =
      this.getAllowedTabs();

    if (!allowed.includes(tabName)) {
      return {
        success: false,
        reason: "INVALID_DASHBOARD_TAB"
      };
    }

    this.activeTab =
      tabName;

    if (updateUrl) {
      this.updateTabUrl(tabName);
    }

    this.elements.tabButtons.forEach((button) => {

      const selected =
        button.dataset.dashboardTab ===
        tabName;

      button.classList.toggle(
        "active",
        selected
      );

      button.setAttribute(
        "aria-selected",
        String(selected)
      );
    });

    this.elements.tabPanels.forEach((panel) => {

      panel.classList.toggle(
        "hidden",
        panel.dataset.dashboardPanel !==
          tabName
      );
    });

    this.elements.bottomTabButtons.forEach((button) => {

      button.classList.toggle(
        "active",
        button.dataset.dashboardTabTarget ===
          tabName
      );
    });

    if (scrollToTabs) {

      const tabs =
        document.getElementById(
          "dashboardTabs"
        );

      if (tabs) {
        tabs.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }

    return {
      success: true,
      tab: tabName
    };
  },


  /*
   * ----------------------------------------------------------
   * ONBOARDING
   * ----------------------------------------------------------
   */

  async prepareOnboarding(profile = null) {

    this.showOnly("loading");

    await this.loadDistrictsSafe();

    this.showOnboarding(profile);

    return {
      success: true
    };
  },


  async loadDistrictsSafe() {

    try {
      return await this.loadDistricts();
    } catch (error) {

      this.elements.district.innerHTML =
        '<option value="">Service districts unavailable</option>';

      return {
        success: false,
        error: error.message
      };
    }
  },


  async loadDistricts() {

    const result =
      await ServiceLocation.getAvailable();

    this.elements.district.innerHTML =
      '<option value="">Select service district</option>';

    const districts =
      Array.isArray(result.districts)
        ? result.districts
        : [];

    districts.forEach((district) => {

      const option =
        document.createElement("option");

      option.value =
        district.districtId;

      option.textContent =
        district.districtName +
        ", " +
        district.state;

      this.elements.district.appendChild(
        option
      );
    });

    return result;
  },


  showOnboarding(profile = null) {

    this.showOnly("onboarding");
    this.clearError();

    if (profile) {
      this.fillForm(profile);
    }

    window.setTimeout(
      () => this.initializeMap(profile),
      80
    );
  },


  async editProfile() {

    this.showOnly("loading");

    try {

      await this.loadDistrictsSafe();

      const response =
        await API.request(
          "get_food_partner_profile",
          {
            sessionId:
              this.getSessionId()
          }
        );

      const data =
        response.data || {};

      const fullProfile =
        data.profile || this.profile;

      if (!fullProfile) {
        throw new Error(
          "Food Partner profile was not returned."
        );
      }

      this.profile =
        fullProfile;

      this.showOnboarding(
        fullProfile
      );

      return {
        success: true,
        profile: fullProfile
      };

    } catch (error) {

      this.showDashboard(
        this.profile,
        this.summary
      );

      this.showDashboardMessage(
        error.message ||
        "Kitchen profile could not be opened."
      );

      return {
        success: false,
        error: error.message
      };
    }
  },


  initializeMap(profile) {

    if (typeof L === "undefined") {

      this.elements.mapStatus.textContent =
        "Map could not load. Check your connection and refresh.";

      return;
    }

    const saved =
      LocationManager.getSaved();

    const latitude =
      Number(profile && profile.latitude) ||
      Number(saved && saved.latitude) ||
      28.5355;

    const longitude =
      Number(profile && profile.longitude) ||
      Number(saved && saved.longitude) ||
      77.391;

    if (!this.map) {

      this.map =
        L.map(
          this.elements.map
        ).setView(
          [latitude, longitude],
          15
        );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap"
        }
      ).addTo(this.map);

      this.marker =
        L.marker(
          [latitude, longitude],
          {
            draggable: true
          }
        ).addTo(this.map);

      this.marker.on(
        "dragend",
        () => {

          const point =
            this.marker.getLatLng();

          this.setCoordinates(
            point.lat,
            point.lng
          );

          this.reverseGeocode(
            point.lat,
            point.lng
          );
        }
      );

    } else {

      this.map.setView(
        [latitude, longitude],
        15
      );

      this.marker.setLatLng(
        [latitude, longitude]
      );
    }

    window.setTimeout(
      () => this.map.invalidateSize(),
      100
    );

    this.setCoordinates(
      latitude,
      longitude
    );
  },


  async useCurrentLocation() {

    this.elements.currentButton.disabled =
      true;

    this.elements.currentButton.textContent =
      "Detecting...";

    this.clearError();

    try {

      const result =
        await LocationManager.requestAfterUserAction({
          persist: true,
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 60000
        });

      const location =
        result && result.location
          ? result.location
          : result;

      if (
        !location ||
        !LocationManager.isValidCoordinates(
          location.latitude,
          location.longitude
        )
      ) {
        throw new Error(
          "Invalid device location received."
        );
      }

      this.setCoordinates(
        location.latitude,
        location.longitude
      );

      if (this.map && this.marker) {

        this.map.setView(
          [
            location.latitude,
            location.longitude
          ],
          17
        );

        this.marker.setLatLng(
          [
            location.latitude,
            location.longitude
          ]
        );
      }

      await this.reverseGeocode(
        location.latitude,
        location.longitude
      );

    } catch (error) {

      this.showError(
        error.message ||
        "Current location could not be detected."
      );

    } finally {

      this.elements.currentButton.disabled =
        false;

      this.elements.currentButton.textContent =
        "⌖ Current";
    }
  },


  setCoordinates(latitude, longitude) {

    this.elements.latitude.value =
      Number(latitude).toFixed(7);

    this.elements.longitude.value =
      Number(longitude).toFixed(7);

    this.elements.mapStatus.textContent =
      "Pin set. Drag it to the exact kitchen entrance if needed.";
  },


  async reverseGeocode(latitude, longitude) {

    this.elements.mapStatus.textContent =
      "Reading this location...";

    try {

      const response =
        await API.request(
          "reverse_geocode_location",
          {
            sessionId: this.getSessionId(),
            latitude: Number(latitude),
            longitude: Number(longitude)
          }
        );

      const location =
        response.data || {};

      if (location.formattedAddress) {
        this.elements.address.value =
          location.formattedAddress;
      }

      this.elements.mapStatus.textContent =
        location.label
          ? "Location: " + location.label
          : "Kitchen location selected.";

      return location;

    } catch (error) {

      this.elements.mapStatus.textContent =
        "Pin selected. Enter the complete address below.";

      return null;
    }
  },


  fillForm(profile) {

    this.elements.businessName.value =
      profile.businessName || "";

    this.elements.businessType.value =
      profile.businessType || "";

    this.elements.ownerName.value =
      profile.ownerName || "";

    this.elements.email.value =
      profile.email || "";

    this.elements.foodType.value =
      profile.foodType || "";

    this.elements.description.value =
      profile.description || "";

    this.elements.address.value =
      profile.address || "";

    this.elements.district.value =
      profile.districtId || "";

    this.elements.latitude.value =
      profile.latitude || "";

    this.elements.longitude.value =
      profile.longitude || "";
  },


  getFormData() {

    return {
      businessName:
        this.elements.businessName.value.trim(),

      businessType:
        this.elements.businessType.value,

      ownerName:
        this.elements.ownerName.value.trim(),

      email:
        this.elements.email.value.trim(),

      foodType:
        this.elements.foodType.value,

      description:
        this.elements.description.value.trim(),

      address:
        this.elements.address.value.trim(),

      districtId:
        this.elements.district.value,

      latitude:
        Number(this.elements.latitude.value),

      longitude:
        Number(this.elements.longitude.value)
    };
  },


  validate(data) {

    if (data.businessName.length < 2) {
      return "Enter your kitchen or business name.";
    }

    if (!data.businessType) {
      return "Select the business type.";
    }

    if (data.ownerName.length < 2) {
      return "Enter the owner name.";
    }

    if (
      data.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        data.email
      )
    ) {
      return "Enter a valid email address.";
    }

    if (!data.foodType) {
      return "Select the food type.";
    }

    if (
      !LocationManager.isValidCoordinates(
        data.latitude,
        data.longitude
      )
    ) {
      return "Use Current location or place the pin on the map.";
    }

    if (data.address.length < 5) {
      return "Enter the complete business address.";
    }

    if (!data.districtId) {
      return "Select the ApnaBite service district.";
    }

    return "";
  },


  async saveOnboarding() {

    if (this.saving) {
      return {
        success: false,
        reason: "ONBOARDING_SAVE_BUSY"
      };
    }

    const partner =
      this.getFormData();

    const errorMessage =
      this.validate(partner);

    if (errorMessage) {
      this.showError(errorMessage);

      return {
        success: false,
        reason: "VALIDATION_ERROR"
      };
    }

    this.saving = true;
    this.elements.saveButton.disabled = true;
    this.elements.saveButton.textContent =
      "Saving Kitchen...";

    this.clearError();

    try {

      const response =
        await API.request(
          "save_food_partner_onboarding",
          {
            sessionId: this.getSessionId(),
            partner
          }
        );

      const data =
        response.data || {};

      if (!data.profile) {
        throw new Error(
          "Saved partner profile was not returned."
        );
      }

      this.profile =
        data.profile;

      this.clearDashboardCache();

      return await this.loadDashboardSummary({
        initial: true
      });

    } catch (error) {

      this.showError(
        error.message ||
        "Kitchen details could not be saved."
      );

      return {
        success: false,
        error: error.message
      };

    } finally {

      this.saving = false;
      this.elements.saveButton.disabled = false;
      this.elements.saveButton.textContent =
        this.profile
          ? "Update Kitchen Details"
          : "Submit Kitchen Details";
    }
  },


  /*
   * ----------------------------------------------------------
   * VISIBILITY
   * ----------------------------------------------------------
   */

  showOnly(name) {

    this.elements.loading.classList.toggle(
      "hidden",
      name !== "loading"
    );

    this.elements.onboarding.classList.toggle(
      "hidden",
      name !== "onboarding"
    );

    this.elements.dashboard.classList.toggle(
      "hidden",
      name !== "dashboard"
    );

    this.elements.bottomNavigation.classList.toggle(
      "hidden",
      name !== "dashboard"
    );
  },


  /*
   * ----------------------------------------------------------
   * MESSAGES
   * ----------------------------------------------------------
   */

  showError(message) {

    this.elements.error.textContent =
      message;

    this.elements.error.classList.remove(
      "hidden"
    );

    this.elements.error.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  },


  clearError() {

    this.elements.error.textContent = "";

    this.elements.error.classList.add(
      "hidden"
    );
  },


  showDashboardMessage(message, duration = 0) {

    const messageBox =
      document.getElementById(
        "roleHomeMessage"
      );

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      message;

    messageBox.classList.remove(
      "hidden"
    );

    if (duration > 0) {

      window.setTimeout(() => {

        if (
          messageBox.textContent ===
          message
        ) {
          messageBox.textContent = "";
          messageBox.classList.add(
            "hidden"
          );
        }

      }, duration);
    }
  },


  /*
   * ----------------------------------------------------------
   * FORMATTERS
   * ----------------------------------------------------------
   */

  setText(element, value) {

    if (element) {
      element.textContent =
        value;
    }
  },


  formatCurrency(value) {

    const amount =
      Number(value || 0);

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits:
          Number.isInteger(amount)
            ? 0
            : 2
      }
    ).format(
      Number.isFinite(amount)
        ? amount
        : 0
    );
  },


  formatCount(value) {

    const count =
      Number(value || 0);

    return new Intl.NumberFormat(
      "en-IN"
    ).format(
      Number.isFinite(count)
        ? count
        : 0
    );
  },


  formatNumber(value) {

    const number =
      Number(value || 0);

    return Number.isFinite(number)
      ? String(number)
      : "0";
  },


  formatDateTime(value) {

    if (!value) {
      return "just now";
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
        dateStyle: "medium",
        timeStyle: "short"
      }
    ).format(date);
  },


  readableStatus(value) {

    return String(value || "")
      .trim()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ");
  },


  createError(message, code) {

    const error =
      new Error(message);

    error.code =
      code;

    return error;
  },


  /*
   * ----------------------------------------------------------
   * DASHBOARD TEST
   *
   * Browser console:
   * FoodPartnerDashboard.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE FOOD PARTNER LIVE DASHBOARD TEST"
    );

    console.log(
      "========================================"
    );

    const firstRequest =
      this.loadDashboardSummary({
        force: true
      });

    const duplicateRequest =
      this.loadDashboardSummary({
        force: true
      });

    const sameRequest =
      firstRequest === duplicateRequest;

    const firstResult =
      await firstRequest;

    const cached =
      this.restoreDashboardCache();

    const data =
      this.summary || {};

    const results = [
      {
        test: "Live dashboard API",
        expected: true,
        actual: firstResult.success,
        passed: firstResult.success === true
      },
      {
        test: "Earning summary",
        expected: true,
        actual: Boolean(data.earnings),
        passed: Boolean(data.earnings)
      },
      {
        test: "Order summary",
        expected: true,
        actual: Boolean(data.orders),
        passed: Boolean(data.orders)
      },
      {
        test: "Product summary",
        expected: true,
        actual: Boolean(data.products),
        passed: Boolean(data.products)
      },
      {
        test: "Recent orders array",
        expected: true,
        actual: Array.isArray(data.recentOrders),
        passed: Array.isArray(data.recentOrders)
      },
      {
        test: "Dashboard cache",
        expected: true,
        actual: Boolean(cached),
        passed: Boolean(cached)
      },
      {
        test: "Duplicate request protection",
        expected: true,
        actual: sameRequest,
        passed: sameRequest === true
      },
      {
        test: "Dashboard visible",
        expected: true,
        actual:
          !this.elements.dashboard.classList.contains(
            "hidden"
          ),
        passed:
          !this.elements.dashboard.classList.contains(
            "hidden"
          )
      },
      {
        test: "Dashboard tabs",
        expected: 4,
        actual: this.elements.tabButtons.length,
        passed:
          this.elements.tabButtons.length === 4
      },
      {
        test: "Bottom navigation",
        expected: 4,
        actual:
          document.querySelectorAll(
            ".partner-nav-item"
          ).length,
        passed:
          document.querySelectorAll(
            ".partner-nav-item"
          ).length === 4
      },
      {
        test: "URL tab support",
        expected: true,
        actual:
          typeof this.getTabFromUrl ===
            "function" &&
          typeof this.updateTabUrl ===
            "function",
        passed:
          typeof this.getTabFromUrl ===
            "function" &&
          typeof this.updateTabUrl ===
            "function"
      },
      {
        test: "Allowed dashboard tabs",
        expected: 4,
        actual:
          this.getAllowedTabs().length,
        passed:
          this.getAllowedTabs().length === 4
      }
    ];

    const passed =
      results.every(
        (result) => result.passed
      );

    console.table(results);

    console.log(
      "Dashboard Summary:",
      data
    );

    console.log(
      passed
        ? "Food Partner Live Dashboard Test: PASS"
        : "Food Partner Live Dashboard Test: FAIL"
    );

    return {
      success: passed,
      status: passed ? "PASS" : "FAIL",
      data,
      cache: cached,
      results
    };
  }
};


document.addEventListener(
  "DOMContentLoaded",
  () => {
    FoodPartnerDashboard.init();
  }
);
