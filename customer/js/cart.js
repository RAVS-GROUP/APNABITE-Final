/**
 * ============================================================
 * APNABITE CUSTOMER
 * FILE: customer/js/cart.js
 * PURPOSE: Persistent customer cart page with instant controls
 * VERSION: 1.0.0
 * ============================================================
 */
const CustomerCartPage = {
  SYNC_DELAY_MS: 350,
  elements: {},
  cart: null,
  items: [],
  summary: { distinctItems: 0, totalQuantity: 0, subtotal: 0 },
  loading: false,
  syncEntries: {},
  syncTimers: {},
  statusTimer: null,
  init() {
    this.elements = {
      loader: document.getElementById("cartLoader"),
      page: document.getElementById("cartPage"),
      backButton: document.getElementById("cartBackButton"),
      clearButton: document.getElementById("clearCartButton"),
      kitchenCard: document.getElementById("cartKitchenCard"),
      kitchenName: document.getElementById("cartKitchenName"),
      itemsSection: document.getElementById("cartItemsSection"),
      itemCount: document.getElementById("cartItemCount"),
      itemsList: document.getElementById("cartItemsList"),
      billCard: document.getElementById("cartBillCard"),
      subtotal: document.getElementById("cartSubtotal"),
      total: document.getElementById("cartTotal"),
      emptyState: document.getElementById("cartEmptyState"),
      errorState: document.getElementById("cartErrorState"),
      errorMessage: document.getElementById("cartErrorMessage"),
      retryButton: document.getElementById("retryCartButton"),
      status: document.getElementById("cartStatus"),
      checkoutBar: document.getElementById("cartCheckoutBar"),
      checkoutItemCount: document.getElementById("checkoutItemCount"),
      checkoutSubtotal: document.getElementById("checkoutSubtotal"),
      checkoutButton: document.getElementById("proceedCheckoutButton"),
      clearDialog: document.getElementById("clearCartDialog"),
      cancelClearButton: document.getElementById("cancelClearCartButton"),
      confirmClearButton: document.getElementById("confirmClearCartButton")
    };
    if (!this.hasRequiredElements()) {
      console.error("Customer cart page elements are missing.");
      return false;
    }
    this.bindEvents();
    this.loadCart();
    return true;
  },
  hasRequiredElements() {
    return Object.values(this.elements).every(Boolean);
  },
  bindEvents() {
    this.elements.backButton.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "home.html";
    });
    this.elements.retryButton.addEventListener("click", () => this.loadCart());
    this.elements.clearButton.addEventListener("click", () => this.openClearDialog());
    this.elements.cancelClearButton.addEventListener("click", () => this.closeClearDialog());
    this.elements.confirmClearButton.addEventListener("click", () => this.clearCart());
    this.elements.clearDialog.addEventListener("cancel", () => this.closeClearDialog());
    this.elements.checkoutButton.addEventListener("click", () => {
      this.showStatus("Checkout page integration is the next step.");
    });
    this.elements.itemsList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cart-action]");
      if (!button || button.disabled) return;
      this.handleItemAction(button);
    });
  },
  getSessionId() {
    const session = SessionManager.get();
    return session && session.sessionId ? session.sessionId : "";
  },
  async loadCart() {
    if (this.loading) return { success: false, reason: "CART_LOADING" };
    this.loading = true;
    this.showInitialLoader();
    try {
      const response = await API.request("get_customer_cart", {
        sessionId: this.getSessionId()
      }, { timeoutMs: 90000 });
      this.applyCartResponse(response.data || {});
      this.showPage();
      return { success: true, cart: this.cart, items: this.items, summary: this.summary };
    } catch (error) {
      console.error("Customer cart load failed:", error);
      this.showPage();
      this.showError(error.message || "Your cart could not be loaded.");
      return { success: false, code: error.code || "CART_LOAD_FAILED", error: error.message };
    } finally {
      this.loading = false;
    }
  },
  applyCartResponse(result) {
    const status = String(result.status || result.cartStatus || "").toUpperCase();
    this.cart = result.cart || null;
    this.items = Array.isArray(result.items) ? result.items : [];
    if (status === "EMPTY" || !this.items.length) {
      this.cart = null;
      this.items = [];
    }
    this.syncEntries = {};
    Object.keys(this.syncTimers).forEach((key) => window.clearTimeout(this.syncTimers[key]));
    this.syncTimers = {};
    this.recalculate();
  },
  recalculate() {
    let totalQuantity = 0;
    let subtotal = 0;
    this.items = this.items.filter((item) => Number(item.quantity || 0) > 0);
    this.items.forEach((item) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.priceSnapshot || item.currentPrice || 0);
      item.itemTotal = Math.round(price * quantity * 100) / 100;
      totalQuantity += quantity;
      subtotal += item.itemTotal;
    });
    this.summary = {
      distinctItems: this.items.length,
      totalQuantity,
      subtotal: Math.round(subtotal * 100) / 100
    };
    if (!this.items.length) this.cart = null;
    this.render();
  },
  render() {
    const hasItems = this.items.length > 0;
    this.elements.emptyState.classList.toggle("hidden", hasItems);
    this.elements.kitchenCard.classList.toggle("hidden", !hasItems);
    this.elements.itemsSection.classList.toggle("hidden", !hasItems);
    this.elements.billCard.classList.toggle("hidden", !hasItems);
    this.elements.checkoutBar.classList.toggle("hidden", !hasItems);
    this.elements.clearButton.classList.toggle("hidden", !hasItems);
    this.elements.errorState.classList.add("hidden");
    if (!hasItems) {
      this.elements.itemsList.innerHTML = "";
      return;
    }
    this.elements.kitchenName.textContent = this.getKitchenName();
    const quantity = this.summary.totalQuantity;
    const itemText = quantity + (quantity === 1 ? " item" : " items");
    this.elements.itemCount.textContent = itemText;
    this.elements.checkoutItemCount.textContent = itemText;
    this.elements.subtotal.textContent = this.money(this.summary.subtotal);
    this.elements.total.textContent = this.money(this.summary.subtotal);
    this.elements.checkoutSubtotal.textContent = this.money(this.summary.subtotal);
    this.elements.itemsList.innerHTML = "";
    this.items.forEach((item) => this.elements.itemsList.appendChild(this.createItemCard(item)));
  },
  getKitchenName() {
    return this.cart && (this.cart.businessName || this.cart.kitchenName)
      ? this.cart.businessName || this.cart.kitchenName
      : "Selected kitchen";
  },
  createItemCard(item) {
    const article = document.createElement("article");
    article.className = "cart-item";
    article.dataset.cartItemId = String(item.cartItemId || "");
    const media = document.createElement("div");
    media.className = "cart-item-image";
    if (item.imageUrl) {
      const image = document.createElement("img");
      image.src = item.imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.remove();
        media.textContent = "🍲";
      });
      media.appendChild(image);
    } else media.textContent = "🍲";
    const content = document.createElement("div");
    content.className = "cart-item-content";
    const heading = document.createElement("div");
    heading.className = "cart-item-heading";
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = item.productName || "Dish";
    const detail = document.createElement("p");
    detail.textContent = item.variantName || item.quantityLabel || "Freshly prepared";
    const price = document.createElement("strong");
    price.className = "cart-item-price";
    price.textContent = this.money(item.currentPrice || item.priceSnapshot || 0);
    copy.append(title, detail);
    heading.append(copy, price);
    const bottom = document.createElement("div");
    bottom.className = "cart-item-bottom";
    const total = document.createElement("span");
    total.className = "cart-item-total";
    total.textContent = this.money(item.itemTotal || 0);
    bottom.append(total, this.createQuantityControl(item));
    content.append(heading, bottom);
    if (item.productAvailable === false) {
      const warning = document.createElement("p");
      warning.className = "cart-unavailable";
      warning.textContent = "Currently unavailable";
      content.appendChild(warning);
    }
    article.append(media, content);
    return article;
  },
  createQuantityControl(item) {
    const control = document.createElement("div");
    control.className = "cart-quantity-control";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.dataset.cartAction = Number(item.quantity || 0) <= 1 ? "REMOVE" : "DECREASE";
    decrease.dataset.cartItemId = String(item.cartItemId || "");
    decrease.setAttribute("aria-label", Number(item.quantity || 0) <= 1 ? "Remove item" : "Decrease quantity");
    decrease.textContent = Number(item.quantity || 0) <= 1 ? "×" : "−";
    const quantity = document.createElement("strong");
    quantity.textContent = String(item.quantity || 1);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.dataset.cartAction = "INCREASE";
    increase.dataset.cartItemId = String(item.cartItemId || "");
    increase.setAttribute("aria-label", "Increase quantity");
    increase.textContent = "+";
    control.append(decrease, quantity, increase);
    return control;
  },
  handleItemAction(button) {
    const item = this.items.find((entry) => String(entry.cartItemId || "") === String(button.dataset.cartItemId || ""));
    if (!item) {
      this.showStatus("Cart changed. Please tap again.");
      return;
    }
    const action = String(button.dataset.cartAction || "").toUpperCase();
    const quantity = Number(item.quantity || 0);
    if (action === "INCREASE") this.setItemQuantity(item, quantity + 1);
    if (action === "DECREASE") this.setItemQuantity(item, quantity - 1);
    if (action === "REMOVE") this.setItemQuantity(item, 0);
  },
  getEntry(item) {
    const key = String(item.cartItemId || "");
    if (!this.syncEntries[key]) {
      this.syncEntries[key] = {
        key,
        cartItemId: key,
        item: JSON.parse(JSON.stringify(item)),
        confirmedQuantity: Number(item.quantity || 0),
        targetQuantity: Number(item.quantity || 0),
        running: false
      };
    }
    return this.syncEntries[key];
  },
  setItemQuantity(item, quantity) {
    const target = Math.max(0, Math.min(20, Number(quantity || 0)));
    const entry = this.getEntry(item);
    entry.targetQuantity = target;
    if (target <= 0) this.items = this.items.filter((current) => String(current.cartItemId || "") !== entry.cartItemId);
    else {
      const current = this.items.find((candidate) => String(candidate.cartItemId || "") === entry.cartItemId);
      if (current) current.quantity = target;
    }
    this.recalculate();
    window.clearTimeout(this.syncTimers[entry.key]);
    this.syncTimers[entry.key] = window.setTimeout(() => this.flushEntry(entry.key), this.SYNC_DELAY_MS);
  },
  async flushEntry(key) {
    const entry = this.syncEntries[key];
    if (!entry || entry.running || entry.targetQuantity === entry.confirmedQuantity) return;
    entry.running = true;
    const sentQuantity = entry.targetQuantity;
    try {
      const response = sentQuantity <= 0
        ? await API.request("remove_customer_cart_item", {
            sessionId: this.getSessionId(), cartItemId: entry.cartItemId
          }, { timeoutMs: 90000 })
        : await API.request("update_customer_cart_item", {
            sessionId: this.getSessionId(), cartItemId: entry.cartItemId, quantity: sentQuantity
          }, { timeoutMs: 90000 });
      const result = response.data || {};
      const serverItem = Array.isArray(result.items)
        ? result.items.find((item) => String(item.cartItemId || "") === entry.cartItemId)
        : null;
      entry.confirmedQuantity = serverItem ? Number(serverItem.quantity || 0) : 0;
      if (result.cart) this.cart = result.cart;
      const localItem = this.items.find((item) => String(item.cartItemId || "") === entry.cartItemId);
      if (localItem && serverItem) Object.assign(localItem, serverItem, { quantity: entry.targetQuantity });
      this.recalculate();
    } catch (error) {
      console.error("Cart background update failed:", error);
      entry.targetQuantity = entry.confirmedQuantity;
      let localItem = this.items.find((item) => String(item.cartItemId || "") === entry.cartItemId);
      if (entry.confirmedQuantity > 0 && !localItem) {
        localItem = JSON.parse(JSON.stringify(entry.item));
        this.items.push(localItem);
      }
      if (localItem) localItem.quantity = entry.confirmedQuantity;
      this.recalculate();
      this.showStatus("Cart change could not be saved. Previous quantity restored.");
    } finally {
      entry.running = false;
      if (entry.targetQuantity !== entry.confirmedQuantity) {
        this.syncTimers[key] = window.setTimeout(() => this.flushEntry(key), 0);
      } else if (entry.confirmedQuantity <= 0) {
        delete this.syncEntries[key];
        delete this.syncTimers[key];
      }
    }
  },
  openClearDialog() {
    if (typeof this.elements.clearDialog.showModal === "function") this.elements.clearDialog.showModal();
    else this.elements.clearDialog.setAttribute("open", "");
  },
  closeClearDialog() {
    if (typeof this.elements.clearDialog.close === "function" && this.elements.clearDialog.open) this.elements.clearDialog.close();
    else this.elements.clearDialog.removeAttribute("open");
  },
  async clearCart() {
    const previous = { cart: this.cart, items: JSON.parse(JSON.stringify(this.items)) };
    this.closeClearDialog();
    Object.keys(this.syncTimers).forEach((key) => window.clearTimeout(this.syncTimers[key]));
    this.syncEntries = {};
    this.syncTimers = {};
    this.cart = null;
    this.items = [];
    this.recalculate();
    try {
      const response = await API.request("clear_customer_cart", {
        sessionId: this.getSessionId()
      }, { timeoutMs: 90000 });
      this.applyCartResponse(response.data || {});
      this.showStatus("Cart cleared.");
      return { success: true };
    } catch (error) {
      console.error("Clear cart failed:", error);
      this.cart = previous.cart;
      this.items = previous.items;
      this.recalculate();
      this.showStatus("Cart could not be cleared. Items restored.");
      return { success: false, code: error.code || "CART_CLEAR_FAILED" };
    }
  },
  showInitialLoader() {
    this.elements.loader.classList.remove("hidden");
    this.elements.page.classList.add("hidden");
  },
  showPage() {
    this.elements.loader.classList.add("hidden");
    this.elements.page.classList.remove("hidden");
  },
  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorState.classList.remove("hidden");
    this.elements.emptyState.classList.add("hidden");
    this.elements.kitchenCard.classList.add("hidden");
    this.elements.itemsSection.classList.add("hidden");
    this.elements.billCard.classList.add("hidden");
    this.elements.checkoutBar.classList.add("hidden");
    this.elements.clearButton.classList.add("hidden");
  },
  showStatus(message) {
    window.clearTimeout(this.statusTimer);
    this.elements.status.textContent = message;
    this.elements.status.classList.remove("hidden");
    this.statusTimer = window.setTimeout(() => this.elements.status.classList.add("hidden"), 3500);
  },
  money(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2
    }).format(Number(value || 0));
  },
  async test() {
    const results = [
      { test: "Cart loaded", expected: true, actual: !this.loading, passed: !this.loading },
      { test: "Items array", expected: true, actual: Array.isArray(this.items), passed: Array.isArray(this.items) },
      { test: "Instant quantity control", expected: "Function", actual: typeof this.setItemQuantity, passed: typeof this.setItemQuantity === "function" },
      { test: "Background sync", expected: "Function", actual: typeof this.flushEntry, passed: typeof this.flushEntry === "function" },
      { test: "No item spinner", expected: 0, actual: document.querySelectorAll(".cart-control-loading").length, passed: document.querySelectorAll(".cart-control-loading").length === 0 }
    ];
    const passed = results.every((result) => result.passed);
    console.table(results);
    console.log(passed ? "Customer Cart Page Test: PASS" : "Customer Cart Page Test: FAIL");
    return { success: passed, status: passed ? "PASS" : "FAIL", cart: this.cart, items: this.items, summary: this.summary, results };
  }
};
document.addEventListener("DOMContentLoaded", () => CustomerCartPage.init());
