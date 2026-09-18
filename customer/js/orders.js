/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: customer/js/orders.js
 * PURPOSE: Customer orders page controller
 * VERSION: 1.0.0
 * ============================================================
 *
 * CURRENT STATUS:
 * - Orders page UI is ready.
 * - Active, Past and Cancelled filters work.
 * - No fake orders are displayed.
 * - Backend Orders API will be connected later.
 * ============================================================
 */

const CustomerOrders = {

  /*
   * ----------------------------------------------------------
   * ORDER FILTERS
   * ----------------------------------------------------------
   */

  FILTERS: {
    ACTIVE: "ACTIVE",
    PAST: "PAST",
    CANCELLED: "CANCELLED"
  },


  /*
   * ----------------------------------------------------------
   * APPLICATION STATE
   * ----------------------------------------------------------
   */

  state: {
    selectedFilter: "ACTIVE",
    loading: false,
    orders: []
  },


  /*
   * ----------------------------------------------------------
   * DOM ELEMENTS
   * ----------------------------------------------------------
   */

  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    this.elements = {

      refreshButton:
        document.getElementById(
          "refreshOrdersButton"
        ),

      tabs:
        Array.from(
          document.querySelectorAll(
            "[data-order-filter]"
          )
        ),

      sectionTitle:
        document.getElementById(
          "ordersSectionTitle"
        ),

      sectionDescription:
        document.getElementById(
          "ordersSectionDescription"
        ),

      count:
        document.getElementById(
          "ordersCount"
        ),

      loading:
        document.getElementById(
          "ordersLoading"
        ),

      list:
        document.getElementById(
          "ordersList"
        ),

      empty:
        document.getElementById(
          "ordersEmpty"
        ),

      emptyIcon:
        document.getElementById(
          "ordersEmptyIcon"
        ),

      emptyTitle:
        document.getElementById(
          "ordersEmptyTitle"
        ),

      emptyDescription:
        document.getElementById(
          "ordersEmptyDescription"
        ),

      error:
        document.getElementById(
          "ordersError"
        ),

      errorMessage:
        document.getElementById(
          "ordersErrorMessage"
        ),

      retryButton:
        document.getElementById(
          "retryOrdersButton"
        ),

      browseFoodButton:
        document.getElementById(
          "browseFoodButton"
        ),

      bottomNavigation:
        document.querySelector(
          ".customer-bottom-nav"
        )
    };


    if (!this.hasRequiredElements()) {

      console.warn(
        "Customer Orders page elements were not found."
      );

      return false;
    }


    this.bindEvents();

    this.selectFilter(
      this.FILTERS.ACTIVE,
      {
        loadOrders: false
      }
    );

    this.loadOrders();


    console.log(
      "ApnaBite Customer Orders initialized."
    );


    return true;
  },


  /*
   * ----------------------------------------------------------
   * CHECK REQUIRED ELEMENTS
   * ----------------------------------------------------------
   */

  hasRequiredElements() {

    return Boolean(
      this.elements.refreshButton &&
      this.elements.tabs.length === 3 &&
      this.elements.sectionTitle &&
      this.elements.sectionDescription &&
      this.elements.count &&
      this.elements.loading &&
      this.elements.list &&
      this.elements.empty &&
      this.elements.emptyIcon &&
      this.elements.emptyTitle &&
      this.elements.emptyDescription &&
      this.elements.error &&
      this.elements.retryButton
    );
  },


  /*
   * ----------------------------------------------------------
   * BIND EVENTS
   * ----------------------------------------------------------
   */

  bindEvents() {

    this.elements.tabs.forEach(
      (tab) => {

        tab.addEventListener(
          "click",
          () => {

            const filter =
              tab.dataset.orderFilter;

            this.selectFilter(
              filter
            );
          }
        );
      }
    );


    this.elements.refreshButton
      .addEventListener(
        "click",
        () => {

          this.loadOrders();
        }
      );


    this.elements.retryButton
      .addEventListener(
        "click",
        () => {

          this.loadOrders();
        }
      );
  },


  /*
   * ----------------------------------------------------------
   * SELECT FILTER
   * ----------------------------------------------------------
   */

  selectFilter(
    filter,
    options = {}
  ) {

    if (
      !Object.values(
        this.FILTERS
      ).includes(
        filter
      )
    ) {

      return {
        success: false,
        reason:
          "INVALID_ORDER_FILTER"
      };
    }


    this.state.selectedFilter =
      filter;


    this.elements.tabs.forEach(
      (tab) => {

        const selected =
          tab.dataset.orderFilter ===
          filter;

        tab.classList.toggle(
          "is-active",
          selected
        );

        tab.setAttribute(
          "aria-pressed",
          String(selected)
        );
      }
    );


    this.updateSectionContent();


    if (
      options.loadOrders !== false
    ) {

      this.loadOrders();
    }


    return {
      success: true,
      selectedFilter:
        filter
    };
  },


  /*
   * ----------------------------------------------------------
   * UPDATE SECTION CONTENT
   * ----------------------------------------------------------
   */

  updateSectionContent() {

    const content = {

      ACTIVE: {
        title:
          "Active orders",

        description:
          "Orders currently being prepared or delivered",

        icon:
          "🧾",

        emptyTitle:
          "No active orders",

        emptyDescription:
          "Your active orders will appear here after you place an order.",

        showBrowseButton:
          true
      },


      PAST: {
        title:
          "Past orders",

        description:
          "Your successfully completed ApnaBite orders",

        icon:
          "✅",

        emptyTitle:
          "No past orders",

        emptyDescription:
          "Your completed orders will appear here.",

        showBrowseButton:
          true
      },


      CANCELLED: {
        title:
          "Cancelled orders",

        description:
          "Orders that were cancelled or not completed",

        icon:
          "↩️",

        emptyTitle:
          "No cancelled orders",

        emptyDescription:
          "You currently have no cancelled orders.",

        showBrowseButton:
          false
      }
    };


    const selected =
      content[
        this.state.selectedFilter
      ];


    this.elements.sectionTitle
      .textContent =
        selected.title;


    this.elements.sectionDescription
      .textContent =
        selected.description;


    this.elements.emptyIcon
      .textContent =
        selected.icon;


    this.elements.emptyTitle
      .textContent =
        selected.emptyTitle;


    this.elements.emptyDescription
      .textContent =
        selected.emptyDescription;


    if (this.elements.browseFoodButton) {

      this.elements.browseFoodButton
        .classList.toggle(
          "hidden",
          selected.showBrowseButton ===
            false
        );
    }
  },


  /*
   * ----------------------------------------------------------
   * LOAD ORDERS
   *
   * Backend Orders API is not connected yet.
   * Until then, this safely displays an empty state instead
   * of creating fake order records.
   * ----------------------------------------------------------
   */

  async loadOrders() {

    if (this.state.loading) {

      return {
        success: false,
        reason:
          "ORDER_REQUEST_ALREADY_RUNNING"
      };
    }


    this.state.loading =
      true;


    this.showLoading();


    try {

      /*
       * Backend connection point:
       *
       * const response =
       *   await API.request(
       *     "get_customer_orders",
       *     {
       *       status:
       *         this.state.selectedFilter
       *     }
       *   );
       *
       * const orders =
       *   response.data.orders || [];
       *
       * This will be enabled after the backend
       * Customer Orders service is created.
       */

      const orders = [];


      this.state.orders =
        orders;


      this.renderOrders(
        orders
      );


      return {
        success: true,
        filter:
          this.state.selectedFilter,
        count:
          orders.length,
        orders:
          orders,
        backendConnected:
          false
      };

    } catch (error) {

      this.showError(
        error.message ||
        "Unable to load your orders."
      );


      return {
        success: false,
        filter:
          this.state.selectedFilter,
        error:
          error.message,
        code:
          error.code || ""
      };

    } finally {

      this.state.loading =
        false;

      this.setRefreshLoading(
        false
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * RENDER ORDERS
   * ----------------------------------------------------------
   */

  renderOrders(orders) {

    const safeOrders =
      Array.isArray(orders)
        ? orders
        : [];


    this.hideLoading();
    this.hideError();


    this.elements.count
      .textContent =
        String(
          safeOrders.length
        );


    this.elements.list
      .innerHTML = "";


    if (
      safeOrders.length === 0
    ) {

      this.elements.list
        .classList.add(
          "hidden"
        );

      this.elements.empty
        .classList.remove(
          "hidden"
        );

      return;
    }


    safeOrders.forEach(
      (order) => {

        this.elements.list
          .appendChild(
            this.createOrderCard(
              order
            )
          );
      }
    );


    this.elements.empty
      .classList.add(
        "hidden"
      );

    this.elements.list
      .classList.remove(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * CREATE ORDER CARD
   *
   * Used after the backend Orders API is connected.
   * DOM methods are used to prevent unsafe HTML injection.
   * ----------------------------------------------------------
   */

  createOrderCard(order) {

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "order-card";


    const header =
      document.createElement(
        "div"
      );

    header.className =
      "order-card-header";


    const kitchen =
      document.createElement(
        "div"
      );

    kitchen.className =
      "order-card-kitchen";


    const kitchenName =
      document.createElement(
        "h3"
      );

    kitchenName.textContent =
      order.kitchenName ||
      "ApnaBite Kitchen";


    const orderTime =
      document.createElement(
        "p"
      );

    orderTime.textContent =
      this.formatOrderDate(
        order.createdAt
      );


    kitchen.appendChild(
      kitchenName
    );

    kitchen.appendChild(
      orderTime
    );


    const status =
      document.createElement(
        "span"
      );

    status.className =
      "order-status " +
      this.getStatusClass(
        order.status
      );

    status.textContent =
      this.getStatusLabel(
        order.status
      );


    header.appendChild(
      kitchen
    );

    header.appendChild(
      status
    );


    const body =
      document.createElement(
        "div"
      );

    body.className =
      "order-card-body";


    const items =
      document.createElement(
        "p"
      );

    items.className =
      "order-card-items";

    items.textContent =
      order.itemsSummary ||
      "Order details";


    const meta =
      document.createElement(
        "div"
      );

    meta.className =
      "order-card-meta";


    const orderNumber =
      document.createElement(
        "span"
      );

    orderNumber.className =
      "order-card-number";

    orderNumber.textContent =
      order.orderNumber
        ? "Order #" +
          order.orderNumber
        : "Order";


    const total =
      document.createElement(
        "strong"
      );

    total.className =
      "order-card-total";

    total.textContent =
      this.formatMoney(
        order.totalAmountPaise
      );


    meta.appendChild(
      orderNumber
    );

    meta.appendChild(
      total
    );


    body.appendChild(
      items
    );

    body.appendChild(
      meta
    );


    card.appendChild(
      header
    );

    card.appendChild(
      body
    );


    return card;
  },


  /*
   * ----------------------------------------------------------
   * SHOW LOADING
   * ----------------------------------------------------------
   */

  showLoading() {

    this.setRefreshLoading(
      true
    );


    this.elements.error
      .classList.add(
        "hidden"
      );

    this.elements.empty
      .classList.add(
        "hidden"
      );

    this.elements.list
      .classList.add(
        "hidden"
      );

    this.elements.loading
      .classList.remove(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * HIDE LOADING
   * ----------------------------------------------------------
   */

  hideLoading() {

    this.elements.loading
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * SHOW ERROR
   * ----------------------------------------------------------
   */

  showError(message) {

    this.hideLoading();


    this.elements.list
      .classList.add(
        "hidden"
      );

    this.elements.empty
      .classList.add(
        "hidden"
      );


    this.elements.errorMessage
      .textContent =
        message;


    this.elements.error
      .classList.remove(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * HIDE ERROR
   * ----------------------------------------------------------
   */

  hideError() {

    this.elements.error
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * REFRESH BUTTON STATE
   * ----------------------------------------------------------
   */

  setRefreshLoading(isLoading) {

    this.elements.refreshButton
      .disabled =
        isLoading;


    this.elements.refreshButton
      .classList.toggle(
        "is-loading",
        isLoading
      );


    this.elements.refreshButton
      .setAttribute(
        "aria-busy",
        String(isLoading)
      );
  },


  /*
   * ----------------------------------------------------------
   * STATUS HELPERS
   * ----------------------------------------------------------
   */

  getStatusClass(status) {

    const normalized =
      String(
        status || ""
      )
        .trim()
        .toUpperCase();


    if (
      normalized === "DELIVERED" ||
      normalized === "COMPLETED"
    ) {

      return "order-status-completed";
    }


    if (
      normalized === "CANCELLED" ||
      normalized === "REJECTED"
    ) {

      return "order-status-cancelled";
    }


    return "order-status-active";
  },


  getStatusLabel(status) {

    const normalized =
      String(
        status || "ACTIVE"
      )
        .trim()
        .toUpperCase();


    return normalized
      .replace(
        /_/g,
        " "
      );
  },


  /*
   * ----------------------------------------------------------
   * FORMAT MONEY
   *
   * Backend money values are stored in paise.
   * ----------------------------------------------------------
   */

  formatMoney(amountPaise) {

    const amount =
      Number(
        amountPaise
      );


    if (
      !Number.isFinite(amount)
    ) {

      return "₹0";
    }


    return new Intl
      .NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency: "INR",
          maximumFractionDigits:
            amount % 100 === 0
              ? 0
              : 2
        }
      )
      .format(
        amount / 100
      );
  },


  /*
   * ----------------------------------------------------------
   * FORMAT ORDER DATE
   * ----------------------------------------------------------
   */

  formatOrderDate(value) {

    if (!value) {

      return "Order date unavailable";
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "Order date unavailable";
    }


    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      )
      .format(
        date
      );
  },


  /*
   * ----------------------------------------------------------
   * PAGE INTEGRATION TEST
   *
   * Browser console:
   * CustomerOrders.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE CUSTOMER ORDERS TEST"
    );

    console.log(
      "========================================"
    );


    const previousFilter =
      this.state.selectedFilter;


    const results = [];


    try {

      const filters = [
        this.FILTERS.ACTIVE,
        this.FILTERS.PAST,
        this.FILTERS.CANCELLED
      ];


      for (
        const filter of filters
      ) {

        const selection =
          this.selectFilter(
            filter,
            {
              loadOrders: false
            }
          );


        const activeTab =
          this.elements.tabs.find(
            (tab) =>
              tab.classList.contains(
                "is-active"
              )
          );


        const passed =
          selection.success === true &&
          this.state.selectedFilter ===
            filter &&
          activeTab &&
          activeTab.dataset
            .orderFilter ===
            filter;


        results.push({
          filter:
            filter,
          selected:
            this.state.selectedFilter,
          passed:
            Boolean(passed)
        });
      }


      const loadResult =
        await this.loadOrders();


      const navigationItems =
        this.elements.bottomNavigation
          ? this.elements
              .bottomNavigation
              .querySelectorAll(
                ".customer-nav-item"
              )
              .length
          : 0;


      const ordersActive =
        Boolean(
          this.elements
            .bottomNavigation &&
          this.elements
            .bottomNavigation
            .querySelector(
              '.customer-nav-item[href="orders.html"].is-active'
            )
        );


      const passed =
        results.every(
          (result) =>
            result.passed
        ) &&
        loadResult.success === true &&
        Array.isArray(
          this.state.orders
        ) &&
        navigationItems === 4 &&
        ordersActive === true;


      console.table(
        results
      );


      console.log(
        "Loaded Orders:",
        loadResult
      );


      console.log(
        "Bottom Navigation Items:",
        navigationItems
      );


      console.log(
        passed
          ? "Customer Orders Test: PASS"
          : "Customer Orders Test: FAIL"
      );


      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        selectedFilter:
          this.state.selectedFilter,
        orderCount:
          this.state.orders.length,
        bottomNavigationItems:
          navigationItems,
        backendConnected:
          false,
        results:
          results
      };

    } catch (error) {

      console.error(
        "Customer Orders Test: FAIL",
        error
      );


      return {
        success: false,
        status: "FAIL",
        error:
          error.message
      };

    } finally {

      this.selectFilter(
        previousFilter,
        {
          loadOrders: false
        }
      );
    }
  }

};


/*
 * ------------------------------------------------------------
 * INITIALIZE AFTER DOM IS READY
 * ------------------------------------------------------------
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    CustomerOrders.init();
  }
);
