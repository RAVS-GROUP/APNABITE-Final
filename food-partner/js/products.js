/**
 * ============================================================
 * APNABITE FOOD PARTNER
 * FILE: food-partner/js/products.js
 * PURPOSE: Fast cached Smart Menu management
 * VERSION: 4.0.0
 * ============================================================
 */

const FoodPartnerProducts = {
  CACHE_KEY: "apnabite_food_partner_products",
  CACHE_FRESH_MS: 5 * 60 * 1000,
  CACHE_MAX_AGE_MS: 24 * 60 * 60 * 1000,
  MAX_IMAGE_BYTES: 2097152,
  MAX_VARIANTS: 5,
  SEARCH_DEBOUNCE_MS: 200,
  IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],

  PRESETS: {
    CURRY_SABZI: { category: "HOME_FOOD", title: "Half / Full portions", rows: [["Half", "Half portion", "Serves 1–2"], ["Full", "Full portion", "Serves 3–4"]] },
    DAL: { category: "HOME_FOOD", title: "Half / Full portions", rows: [["Half", "Half portion", "Serves 1–2"], ["Full", "Full portion", "Serves 3–4"]] },
    RICE_BIRYANI: { category: "MEALS", title: "Half / Full portions", rows: [["Half", "Half portion", "Serves 1"], ["Full", "Full portion", "Serves 2–3"]] },
    THALI_COMBO: { category: "TIFFIN", title: "Thali sizes", rows: [["Regular", "1 thali", "Serves 1"], ["Large", "Large thali", "Serves 1–2"], ["Family", "Family pack", "Serves 3–4"]] },
    ROTI_BREAD: { category: "HOME_FOOD", title: "Piece / pack", rows: [["Single", "1 piece", "Serves 1"], ["Pack", "4 pieces", "Serves 1–2"]] },
    NOODLES_PASTA: { category: "MEALS", title: "Half / Full portions", rows: [["Half", "Half plate", "Serves 1"], ["Full", "Full plate", "Serves 2"]] },
    SNACK_STARTER: { category: "SNACKS", title: "Plate sizes", rows: [["Small Plate", "6 pieces", "Serves 1–2"], ["Large Plate", "12 pieces", "Serves 3–4"]] },
    PIZZA: { category: "MEALS", title: "Pizza sizes", rows: [["Small", "7 inch", "Serves 1"], ["Medium", "10 inch", "Serves 2"], ["Large", "13 inch", "Serves 3–4"]] },
    BURGER_SANDWICH_ROLL: { category: "SNACKS", title: "Item options", rows: [["Regular", "1 piece", "Serves 1"], ["Double Filling", "1 piece", "Serves 1"], ["Meal Combo", "Item + side + drink", "Serves 1"]] },
    SOUTH_INDIAN: { category: "MEALS", title: "Plate options", rows: [["Regular", "1 plate", "Serves 1"], ["Combo", "Combo plate", "Serves 1–2"]] },
    BREAKFAST: { category: "MEALS", title: "Breakfast portions", rows: [["Regular", "1 plate", "Serves 1"], ["Large", "Large plate", "Serves 2"]] },
    TEA_COFFEE: { category: "BEVERAGES", title: "Cup sizes", rows: [["Small", "100 ml", "1 cup"], ["Regular", "150 ml", "1 cup"], ["Large", "250 ml", "1 cup"]] },
    COLD_DRINK: { category: "BEVERAGES", title: "Bottle sizes", rows: [["Regular", "250 ml", "1 bottle"], ["Medium", "500 ml", "1 bottle"], ["Large", "1 litre", "1 bottle"]] },
    JUICE_SHAKE: { category: "BEVERAGES", title: "Glass sizes", rows: [["Small", "200 ml", "1 glass"], ["Regular", "300 ml", "1 glass"], ["Large", "500 ml", "1 glass"]] },
    SWEETS: { category: "SWEETS", title: "Weight options", rows: [["Quarter Kg", "250 g", "Serves 2–3"], ["Half Kg", "500 g", "Serves 4–6"], ["One Kg", "1 kg", "Serves 8–12"]] },
    CAKE_BAKERY: { category: "BAKERY", title: "Cake weights", rows: [["Half Kg", "500 g", "Serves 4–6"], ["One Kg", "1 kg", "Serves 8–12"], ["Two Kg", "2 kg", "Serves 16–24"]] },
    ICE_CREAM: { category: "SWEETS", title: "Scoop / tub options", rows: [["Single Scoop", "1 scoop", "Serves 1"], ["Double Scoop", "2 scoops", "Serves 1"], ["Family Tub", "500 ml", "Serves 4–5"]] },
    CUSTOM: { category: "OTHER", title: "Custom size or portion", rows: [["Regular", "1 portion", "Serves 1"]] }
  },

  state: {
    loading: false,
    saving: false,
    actionBusy: false,
    products: [],
    partner: null,
    editingId: "",
    previewUrl: "",
    loadRequest: null,
    searchTimer: null,
    lastUpdatedAt: 0,
    renderedFromCache: false
  },

  elements: {},

  init() {
    const ids = {
      kitchen: "kitchenName",
      count: "productCount",
      summaryTotal: "summaryTotalProducts",
      summaryAvailable: "summaryAvailableProducts",
      summaryOut: "summaryOutOfStockProducts",
      summaryFeatured: "summaryFeaturedProducts",
      liveDot: "menuLiveDot",
      kitchenStatus: "menuKitchenStatus",
      add: "addProductButton",
      emptyAdd: "emptyAddProductButton",
      refresh: "refreshProductsButton",
      retry: "retryProductsButton",
      search: "productSearchInput",
      availabilityFilter: "productAvailabilityFilter",
      filterTabs: "productFilterTabs",
      updateStatus: "productsUpdateStatus",
      lastUpdated: "productsLastUpdated",
      loading: "productsLoading",
      error: "productsError",
      errorMessage: "productsErrorMessage",
      list: "productList",
      empty: "productsEmpty",
      emptyTitle: "productsEmptyTitle",
      emptyMessage: "productsEmptyMessage",
      bottomNavigation: "partnerBottomNavigation",
      dialog: "productDialog",
      close: "closeProductButton",
      formTitle: "productFormTitle",
      form: "productForm",
      id: "productIdInput",
      type: "productTypeInput",
      name: "productNameInput",
      description: "productDescriptionInput",
      category: "productCategoryInput",
      foodType: "productFoodTypeInput",
      prep: "productPrepTimeInput",
      variantTitle: "variantPresetTitle",
      variantRows: "variantRows",
      addVariant: "addVariantButton",
      keywords: "productKeywordsInput",
      offer: "productOfferInput",
      image: "productImageInput",
      preview: "productImagePreview",
      imageIcon: "imagePickerIcon",
      imageTitle: "imagePickerTitle",
      imageRequirement: "imageRequirementText",
      formError: "productFormError",
      save: "saveProductButton"
    };

    Object.keys(ids).forEach((key) => {
      this.elements[key] = document.getElementById(ids[key]);
    });

    if (!Object.values(this.elements).every(Boolean)) {
      console.error("Smart product page elements are missing.");
      return false;
    }

    this.bindEvents();
    const cached = this.restoreCache();

    if (cached) {
      this.applyData(cached, { fromCache: true });
      this.load({ background: true });
    } else {
      this.showLoading(true);
      this.load();
    }

    console.log("ApnaBite Smart Products initialized.");
    return true;
  },

  bindEvents() {
    this.elements.add.addEventListener("click", () => this.openCreate());
    this.elements.emptyAdd.addEventListener("click", () => this.openCreate());
    this.elements.refresh.addEventListener("click", () => this.load({ force: true, background: true }));
    this.elements.retry.addEventListener("click", () => this.load({ force: true }));
    this.elements.close.addEventListener("click", () => this.closeForm());
    this.elements.dialog.addEventListener("click", (event) => {
      if (event.target.dataset.closeProduct) this.closeForm();
    });
    this.elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.save();
    });
    this.elements.type.addEventListener("change", () => this.applyPreset());
    this.elements.addVariant.addEventListener("click", () => {
      this.addVariant({
        variantName: "New size",
        quantityLabel: "1 portion",
        servingText: "Serves 1",
        price: "",
        availabilityStatus: "AVAILABLE"
      });
    });
    this.elements.variantRows.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-variant]");
      if (button && this.elements.variantRows.children.length > 1) {
        button.closest(".variant-row").remove();
      }
    });
    this.elements.image.addEventListener("change", () => this.updatePreview());
    this.elements.search.addEventListener("input", () => {
      window.clearTimeout(this.state.searchTimer);
      this.state.searchTimer = window.setTimeout(() => this.render(), this.SEARCH_DEBOUNCE_MS);
    });
    this.elements.availabilityFilter.addEventListener("change", () => this.render());
    this.elements.filterTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-product-filter]");
      if (!button) return;
      const filter = button.dataset.productFilter || "ALL";
      this.elements.availabilityFilter.value = filter;
      this.elements.filterTabs.querySelectorAll("[data-product-filter]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      this.render();
    });
    this.elements.list.addEventListener("click", (event) => this.handleProductAction(event));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.closeForm();
    });
  },

  sessionId() {
    const session = SessionManager.get();
    return session && session.sessionId ? session.sessionId : "";
  },

  cacheIdentity() {
    const session = SessionManager.get();
    return session ? String(session.userId || session.sessionId || "") : "";
  },

  restoreCache() {
    const cached = AppStorage.get(this.CACHE_KEY, null);
    if (!cached || typeof cached !== "object") return null;
    if (cached.identity !== this.cacheIdentity()) {
      this.clearCache();
      return null;
    }

    const savedAt = Number(cached.savedAt || 0);
    if (!savedAt || Date.now() - savedAt > this.CACHE_MAX_AGE_MS) {
      this.clearCache();
      return null;
    }

    if (!Array.isArray(cached.products)) return null;
    return cached;
  },

  saveCache() {
    AppStorage.set(this.CACHE_KEY, {
      identity: this.cacheIdentity(),
      products: this.state.products,
      partner: this.state.partner,
      savedAt: this.state.lastUpdatedAt || Date.now()
    });
    return true;
  },

  clearCache() {
    AppStorage.remove(this.CACHE_KEY);
    return true;
  },

  cacheIsFresh() {
    return Boolean(
      this.state.lastUpdatedAt &&
      Date.now() - this.state.lastUpdatedAt < this.CACHE_FRESH_MS
    );
  },

  load(options = {}) {
    if (this.state.loadRequest) return this.state.loadRequest;

    const background = options.background === true;
    const force = options.force === true;

    if (!force && this.cacheIsFresh() && !background) {
      return Promise.resolve({
        success: true,
        cached: true,
        products: this.state.products,
        partner: this.state.partner
      });
    }

    this.state.loadRequest = this.performLoad({ background })
      .finally(() => {
        this.state.loadRequest = null;
      });

    return this.state.loadRequest;
  },

  async performLoad(options = {}) {
    const background = options.background === true;
    this.state.loading = true;
    this.hidePageError();
    this.setUpdating(true);

    if (!background && this.state.products.length === 0) {
      this.showLoading(true);
    }

    try {
      const response = await API.request("get_food_partner_products", {
        sessionId: this.sessionId()
      });
      const data = response.data || {};
      this.applyData(data, { fromCache: false });
      return data;
    } catch (error) {
      if (this.state.products.length > 0) {
        this.setUpdateStatus("Live update failed — showing saved menu.", false);
      } else {
        this.showPageError(error.message || "Products could not be loaded.");
      }
      return null;
    } finally {
      this.state.loading = false;
      this.showLoading(false);
      this.setUpdating(false);
    }
  },

  applyData(data, options = {}) {
    this.state.products = Array.isArray(data.products) ? data.products : [];
    this.state.partner = data.partner || null;
    this.state.lastUpdatedAt = Number(data.savedAt || Date.now());
    this.state.renderedFromCache = options.fromCache === true;

    if (!options.fromCache) this.saveCache();
    this.render();
    this.updateLastUpdated();

    if (options.fromCache) {
      this.setUpdateStatus("Saved menu shown instantly. Checking for updates…", true);
    } else {
      this.setUpdateStatus("Menu is up to date.", false);
    }
  },

  render() {
    this.elements.kitchen.textContent =
      (this.state.partner && this.state.partner.businessName) || "Food products";

    this.updateSummary();
    this.updateKitchenStatus();
    const visibleProducts = this.filteredProducts();
    this.elements.list.innerHTML = "";

    this.groupProductsByCategory(visibleProducts).forEach((group) => {
      this.elements.list.appendChild(this.createCategorySection(group));
    });

    const hasAllProducts = this.state.products.length > 0;
    const hasVisibleProducts = visibleProducts.length > 0;
    const filtersActive = Boolean(
      this.normalize(this.elements.search.value) ||
      this.elements.availabilityFilter.value !== "ALL"
    );

    this.elements.list.classList.toggle("hidden", !hasVisibleProducts);
    this.elements.empty.classList.toggle("hidden", hasVisibleProducts);

    if (!hasVisibleProducts) {
      if (hasAllProducts && filtersActive) {
        this.elements.emptyTitle.textContent = "No matching products";
        this.elements.emptyMessage.textContent = "Try another search or change the availability filter.";
        this.elements.emptyAdd.classList.add("hidden");
      } else {
        this.elements.emptyTitle.textContent = "No products added";
        this.elements.emptyMessage.textContent = "Add your first dish to create the menu.";
        this.elements.emptyAdd.classList.remove("hidden");
      }
    }
  },

  updateSummary() {
    const products = this.state.products;
    const available = products.filter((item) => item.availabilityStatus === "AVAILABLE").length;
    const out = products.filter((item) => item.availabilityStatus !== "AVAILABLE").length;
    const featured = products.filter((item) => item.isFeatured === true).length;

    this.elements.count.textContent = String(products.length);
    this.elements.summaryTotal.textContent = String(products.length);
    this.elements.summaryAvailable.textContent = String(available);
    this.elements.summaryOut.textContent = String(out);
    this.elements.summaryFeatured.textContent = String(featured);
  },

  updateKitchenStatus() {
    const status = String(
      (this.state.partner && this.state.partner.operatingStatus) || ""
    ).toUpperCase();

    this.elements.liveDot.classList.remove("is-open", "is-closed");

    if (status === "OPEN") {
      this.elements.liveDot.classList.add("is-open");
      this.elements.kitchenStatus.textContent = "Kitchen is open";
      return;
    }

    if (status === "CLOSED") {
      this.elements.liveDot.classList.add("is-closed");
      this.elements.kitchenStatus.textContent = "Kitchen is closed";
      return;
    }

    this.elements.kitchenStatus.textContent = "Manage item availability";
  },

  filteredProducts() {
    const query = this.normalize(this.elements.search.value).toLowerCase();
    const availability = this.elements.availabilityFilter.value;

    return this.state.products.filter((product) => {
      if (availability === "FEATURED" && product.isFeatured !== true) return false;
      if (
        availability !== "ALL" &&
        availability !== "FEATURED" &&
        product.availabilityStatus !== availability
      ) return false;
      if (!query) return true;

      const searchable = [
        product.productName,
        product.description,
        product.category,
        product.productType,
        product.foodType,
        ...(Array.isArray(product.keywords) ? product.keywords : [])
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  },

  groupProductsByCategory(products) {
    const order = [
      "HOME_FOOD",
      "MEALS",
      "TIFFIN",
      "SNACKS",
      "BAKERY",
      "SWEETS",
      "BEVERAGES",
      "OTHER"
    ];
    const groups = new Map();

    products.forEach((product) => {
      const category = String(product.category || "OTHER").toUpperCase();
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(product);
    });

    return Array.from(groups.entries())
      .sort((first, second) => {
        const firstIndex = order.indexOf(first[0]);
        const secondIndex = order.indexOf(second[0]);
        return (firstIndex < 0 ? 999 : firstIndex) - (secondIndex < 0 ? 999 : secondIndex);
      })
      .map(([category, items]) => ({ category, items }));
  },

  createCategorySection(group) {
    const section = document.createElement("section");
    section.className = "menu-category-section";
    section.dataset.category = group.category;

    const header = document.createElement("div");
    header.className = "menu-category-header";
    const heading = document.createElement("div");
    heading.className = "menu-category-heading";
    const title = document.createElement("h3");
    title.textContent = this.categoryLabel(group.category);
    const copy = document.createElement("p");
    copy.textContent = group.items.length + (group.items.length === 1 ? " item" : " items");
    heading.append(title, copy);

    const count = document.createElement("span");
    count.className = "menu-category-count";
    count.textContent = String(group.items.length);

    const toggle = document.createElement("button");
    toggle.className = "menu-category-toggle";
    toggle.type = "button";
    toggle.textContent = "⌄";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Collapse " + this.categoryLabel(group.category));

    const items = document.createElement("div");
    items.className = "menu-category-items";
    group.items.forEach((product) => items.appendChild(this.createCard(product)));

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      items.classList.toggle("hidden", expanded);
    });

    header.append(heading, count, toggle);
    section.append(header, items);
    return section;
  },

  categoryLabel(category) {
    const labels = {
      HOME_FOOD: "Home Food",
      MEALS: "Main Course & Meals",
      TIFFIN: "Thali & Combos",
      SNACKS: "Snacks & Starters",
      BAKERY: "Bakery",
      SWEETS: "Desserts & Sweets",
      BEVERAGES: "Beverages",
      OTHER: "Other Items"
    };
    return labels[category] || this.pretty(category);
  },

  createCard(product) {
    const card = document.createElement("article");
    card.className = "menu-product-item" + (product.isFeatured ? " featured" : "");
    card.dataset.productId = product.productId || "";

    const mediaWrap = document.createElement("div");
    mediaWrap.className = "menu-product-image-wrap";
    const media = this.createProductMedia(product);
    mediaWrap.appendChild(media);
    const foodMarker = document.createElement("span");
    foodMarker.className = "menu-food-marker " +
      (String(product.foodType || "").toUpperCase() === "NON_VEG" ? "non-veg" : "veg");
    foodMarker.setAttribute("aria-label", this.pretty(product.foodType || "VEG"));
    mediaWrap.appendChild(foodMarker);
    const content = document.createElement("div");
    content.className = "menu-product-content";

    const title = document.createElement("div");
    title.className = "menu-product-top";
    const heading = document.createElement("h3");
    heading.className = "menu-product-title";
    heading.textContent = product.productName || "Unnamed product";
    title.appendChild(heading);

    if (product.isFeatured) {
      const badge = document.createElement("span");
      badge.className = "menu-featured-label";
      badge.textContent = "FEATURED";
      title.appendChild(badge);
    }

    const description = document.createElement("p");
    description.className = "menu-product-description";
    description.textContent = product.description || "No description added.";

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const prices = variants.map((variant) => Number(variant.price)).filter((price) => Number.isFinite(price) && price > 0);
    const price = document.createElement("strong");
    price.className = "menu-product-price";
    price.textContent = prices.length ? "₹" + this.money(Math.min(...prices)) + (prices.length > 1 ? " onwards" : "") : "Price not set";

    const meta = document.createElement("div");
    meta.className = "menu-product-meta";
    const optionMeta = document.createElement("span");
    optionMeta.textContent = variants.length + (variants.length === 1 ? " option" : " options");
    const prepMeta = document.createElement("span");
    prepMeta.textContent = Number(product.preparationTimeMinutes || 0) > 0
      ? "• " + Number(product.preparationTimeMinutes) + " min"
      : "";
    meta.append(optionMeta, prepMeta);

    const actions = document.createElement("div");
    actions.className = "menu-product-actions";
    this.addAction(actions, "Edit", "edit", product);
    const availabilityLabel = document.createElement("span");
    availabilityLabel.className = "menu-availability-control";
    availabilityLabel.textContent = product.availabilityStatus === "AVAILABLE" ? "Available" : "Unavailable";
    const availability = document.createElement("button");
    availability.type = "button";
    availability.className = "menu-switch" + (product.availabilityStatus === "AVAILABLE" ? " is-available" : "");
    availability.dataset.action = "availability";
    availability.dataset.id = product.productId;
    availability.setAttribute("role", "switch");
    availability.setAttribute("aria-checked", String(product.availabilityStatus === "AVAILABLE"));
    availability.setAttribute("aria-label", "Change availability for " + (product.productName || "item"));
    availabilityLabel.appendChild(availability);
    actions.appendChild(availabilityLabel);
    this.addAction(actions, product.isFeatured ? "★" : "☆", "featured", product, "menu-more-button");

    content.append(title, description, price, meta, actions);
    card.append(mediaWrap, content);
    return card;
  },

  createProductMedia(product) {
    if (!product.imageUrl) {
      const fallback = document.createElement("div");
      fallback.className = "product-card-image-fallback";
      fallback.textContent = "🍲";
      return fallback;
    }

    const image = document.createElement("img");
    image.src = product.imageUrl;
    image.alt = product.productName || "Product";
    image.className = "menu-product-image";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      const fallback = document.createElement("div");
      fallback.className = "product-card-image-fallback";
      fallback.textContent = "🍲";
      image.replaceWith(fallback);
    }, { once: true });
    return image;
  },

  addAction(parent, label, action, product, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = product.productId;
    button.className = className || "menu-edit-button";
    if (action === "featured") {
      button.setAttribute("aria-label", product.isFeatured ? "Remove from featured" : "Mark as featured");
      button.title = product.isFeatured ? "Remove from featured" : "Mark as featured";
    }
    parent.appendChild(button);
  },

  async handleProductAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button || this.state.actionBusy) return;
    const product = this.state.products.find((item) => item.productId === button.dataset.id);
    if (!product) return;

    const action = button.dataset.action;
    if (action === "edit") return this.openEdit(product);
    if (action === "availability") return this.toggleAvailability(product);
    if (action === "featured") return this.updateOrder(product, "TOGGLE_FEATURED", "");
  },

  openCreate() {
    this.resetForm();
    this.state.editingId = "";
    this.elements.formTitle.textContent = "Add Product";
    this.elements.imageRequirement.textContent = "(required)";
    this.elements.save.textContent = "Save Product";
    this.showDialog();
  },

  openEdit(product) {
    this.resetForm();
    this.state.editingId = product.productId;
    this.elements.id.value = product.productId;
    this.elements.type.value = product.productType || "CUSTOM";
    this.elements.name.value = product.productName || "";
    this.elements.description.value = product.description || "";
    this.elements.category.value = product.category || "";
    this.elements.foodType.value = product.foodType || "";
    this.elements.prep.value = product.preparationTimeMinutes || "";
    this.elements.keywords.value = (product.keywords || []).join(", ");
    this.elements.offer.checked = product.offerEligible === true;
    this.elements.variantTitle.textContent =
      (this.PRESETS[this.elements.type.value] || this.PRESETS.CUSTOM).title;
    this.elements.variantRows.innerHTML = "";
    (product.variants || []).forEach((variant) => this.addVariant(variant));
    if (this.elements.variantRows.children.length === 0) this.addVariant({ isDefault: true });
    this.elements.formTitle.textContent = "Edit Product";
    this.elements.imageRequirement.textContent = "(optional when editing)";
    this.elements.imageTitle.textContent = "Choose a new photo or keep current";
    if (product.imageUrl) this.setPreview(product.imageUrl);
    this.elements.save.textContent = "Update Product";
    this.showDialog();
  },

  showDialog() {
    this.clearFormError();
    this.elements.dialog.classList.remove("hidden");
    this.elements.dialog.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => this.elements.type.focus(), 50);
  },

  closeForm(force = false) {
    if (this.state.saving && !force) return;
    this.elements.dialog.classList.add("hidden");
    this.elements.dialog.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    this.revokePreview();
  },

  resetForm() {
    this.elements.form.reset();
    this.elements.id.value = "";
    this.elements.variantRows.innerHTML = "";
    this.elements.preview.classList.add("hidden");
    this.elements.preview.removeAttribute("src");
    this.elements.imageIcon.classList.remove("hidden");
    this.elements.imageTitle.textContent = "Choose product photo";
    this.revokePreview();
    this.clearFormError();
  },

  applyPreset() {
    const preset = this.PRESETS[this.elements.type.value];
    if (!preset) return;
    this.elements.category.value = preset.category;
    this.elements.variantTitle.textContent = preset.title;
    this.elements.variantRows.innerHTML = "";
    preset.rows.forEach((row, index) => {
      this.addVariant({
        variantName: row[0],
        quantityLabel: row[1],
        servingText: row[2],
        price: "",
        isDefault: index === 0,
        availabilityStatus: "AVAILABLE"
      });
    });
  },

  addVariant(variant = {}) {
    if (this.elements.variantRows.children.length >= this.MAX_VARIANTS) return;
    const row = document.createElement("div");
    row.className = "variant-row";
    row.innerHTML =
      '<input data-field="name" maxlength="50" aria-label="Size name" placeholder="Size name">' +
      '<input data-field="quantity" maxlength="50" aria-label="Quantity" placeholder="Quantity">' +
      '<input data-field="serving" maxlength="60" aria-label="Serving" placeholder="Serving">' +
      '<input data-field="price" type="number" min="1" max="100000" step="0.01" placeholder="₹ Price" aria-label="Price">' +
      '<div class="variant-row-footer">' +
        '<label class="default-radio"><input data-field="default" type="radio" name="defaultVariant"> Default</label>' +
        '<select data-field="availability" aria-label="Availability">' +
          '<option value="AVAILABLE">Available</option>' +
          '<option value="OUT_OF_STOCK">Out of stock</option>' +
        '</select>' +
        '<button class="remove-variant" data-remove-variant="true" type="button">Remove</button>' +
      '</div>';

    row.querySelector('[data-field="name"]').value = variant.variantName || "";
    row.querySelector('[data-field="quantity"]').value = variant.quantityLabel || "";
    row.querySelector('[data-field="serving"]').value = variant.servingText || "";
    row.querySelector('[data-field="price"]').value = variant.price || "";
    row.querySelector('[data-field="default"]').checked = variant.isDefault === true;
    row.querySelector('[data-field="availability"]').value = variant.availabilityStatus || "AVAILABLE";
    this.elements.variantRows.appendChild(row);

    if (!this.elements.variantRows.querySelector('[data-field="default"]:checked')) {
      row.querySelector('[data-field="default"]').checked = true;
    }
  },

  variants() {
    return Array.from(this.elements.variantRows.querySelectorAll(".variant-row"))
      .map((row, index) => ({
        variantName: row.querySelector('[data-field="name"]').value.trim(),
        quantityLabel: row.querySelector('[data-field="quantity"]').value.trim(),
        servingText: row.querySelector('[data-field="serving"]').value.trim(),
        price: Number(row.querySelector('[data-field="price"]').value),
        isDefault: row.querySelector('[data-field="default"]').checked,
        displayOrder: index + 1,
        availabilityStatus: row.querySelector('[data-field="availability"]').value
      }));
  },

  formData() {
    return {
      productId: this.state.editingId,
      productType: this.elements.type.value,
      productName: this.elements.name.value.trim(),
      description: this.elements.description.value.trim(),
      category: this.elements.category.value,
      foodType: this.elements.foodType.value,
      preparationTimeMinutes: Number(this.elements.prep.value),
      variants: this.variants(),
      keywords: this.elements.keywords.value.split(",").map((item) => item.trim()).filter(Boolean),
      offerEligible: this.elements.offer.checked
    };
  },

  validate(data, file) {
    if (!data.productType) return "Select a product type first.";
    if (data.productName.length < 2) return "Enter the product name.";
    if (data.description.length < 5) return "Enter a short description.";
    if (!data.category || !data.foodType) return "Select category and food type.";
    if (!Number.isFinite(data.preparationTimeMinutes) || data.preparationTimeMinutes < 1) return "Enter valid preparation time.";
    if (!data.variants.length) return "Add at least one size.";
    if (data.variants.filter((variant) => variant.isDefault).length !== 1) return "Select one default size.";
    if (data.variants.some((variant) => !variant.variantName || !variant.quantityLabel || !Number.isFinite(variant.price) || variant.price < 1)) {
      return "Complete name, quantity and price for every size.";
    }
    if (!data.productId && !file) return "Select a product image.";
    if (file && !this.IMAGE_TYPES.includes(file.type)) return "Upload JPG, PNG or WebP.";
    if (file && (file.size < 1 || file.size > this.MAX_IMAGE_BYTES)) return "Image must be 2 MB or smaller.";
    return "";
  },

  async save() {
    if (this.state.saving) return { success: false, reason: "PRODUCT_SAVE_RUNNING" };
    const data = this.formData();
    const file = this.elements.image.files[0];
    const validationError = this.validate(data, file);

    if (validationError) {
      this.showFormError(validationError);
      return { success: false, reason: "VALIDATION_ERROR" };
    }

    this.state.saving = true;
    this.elements.save.disabled = true;
    this.elements.save.textContent = "Saving...";
    this.clearFormError();

    try {
      if (file) {
        data.fileName = file.name;
        data.mimeType = file.type;
        data.base64Data = await this.fileToBase64(file);
      }

      const response = await API.request("save_food_partner_product", {
        sessionId: this.sessionId(),
        product: data
      });

      this.closeForm(true);
      this.clearCache();
      await this.load({ force: true, background: this.state.products.length > 0 });
      return { success: true, result: response.data };
    } catch (error) {
      this.showFormError(error.message || "Product could not be saved.");
      return { success: false, error: error.message, code: error.code || "" };
    } finally {
      this.state.saving = false;
      this.elements.save.disabled = false;
      this.elements.save.textContent = this.state.editingId ? "Update Product" : "Save Product";
    }
  },

  async toggleAvailability(product) {
    if (this.state.actionBusy) return;
    const next = product.availabilityStatus === "AVAILABLE" ? "OUT_OF_STOCK" : "AVAILABLE";
    const previous = product.availabilityStatus;
    this.state.actionBusy = true;
    product.availabilityStatus = next;
    this.render();
    this.saveCache();

    try {
      await API.request("set_food_partner_product_availability", {
        sessionId: this.sessionId(),
        productId: product.productId,
        availabilityStatus: next
      });
      this.setUpdateStatus("Product availability updated.", false);
      this.load({ force: true, background: true });
    } catch (error) {
      product.availabilityStatus = previous;
      this.render();
      this.saveCache();
      this.showPageError(error.message || "Availability could not be updated.", true);
    } finally {
      this.state.actionBusy = false;
    }
  },

  async updateOrder(product, operation, direction) {
    if (this.state.actionBusy) return;
    this.state.actionBusy = true;
    this.setUpdateStatus("Updating menu order…", true);

    try {
      await API.request("update_food_partner_product_order", {
        sessionId: this.sessionId(),
        productId: product.productId,
        operation,
        direction
      });
      await this.load({ force: true, background: true });
    } catch (error) {
      this.showPageError(error.message || "Product order could not be updated.", true);
    } finally {
      this.state.actionBusy = false;
    }
  },

  updatePreview() {
    const file = this.elements.image.files[0];
    if (!file) return;
    this.elements.imageTitle.textContent = file.name + " • " + (file.size / 1048576).toFixed(2) + " MB";
    this.revokePreview();
    this.state.previewUrl = URL.createObjectURL(file);
    this.setPreview(this.state.previewUrl);
  },

  setPreview(url) {
    this.elements.preview.src = url;
    this.elements.preview.classList.remove("hidden");
    this.elements.imageIcon.classList.add("hidden");
  },

  revokePreview() {
    if (this.state.previewUrl) {
      URL.revokeObjectURL(this.state.previewUrl);
      this.state.previewUrl = "";
    }
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(new Error("Image could not be read."));
      reader.readAsDataURL(file);
    });
  },

  showLoading(show) {
    this.elements.loading.classList.toggle("hidden", !show);
    if (show) {
      this.elements.list.classList.add("hidden");
      this.elements.empty.classList.add("hidden");
    }
  },

  setUpdating(updating) {
    this.elements.refresh.disabled = updating;
    this.elements.refresh.classList.toggle("is-loading", updating);
    this.elements.refresh.setAttribute("aria-busy", String(updating));
  },

  setUpdateStatus(message, updating) {
    this.elements.updateStatus.textContent = message || "";
    this.elements.updateStatus.classList.toggle("is-updating", updating === true);
  },

  updateLastUpdated() {
    if (!this.state.lastUpdatedAt) {
      this.elements.lastUpdated.textContent = "";
      return;
    }

    const date = new Date(this.state.lastUpdatedAt);
    this.elements.lastUpdated.textContent = Number.isNaN(date.getTime())
      ? ""
      : "Last updated " + date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  },

  showFormError(message) {
    this.elements.formError.textContent = message;
    this.elements.formError.classList.remove("hidden");
    this.elements.formError.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },

  clearFormError() {
    this.elements.formError.textContent = "";
    this.elements.formError.classList.add("hidden");
  },

  showPageError(message, temporary = false) {
    if (temporary && this.state.products.length > 0) {
      this.setUpdateStatus(message || "Request failed.", false);
      return;
    }
    this.elements.errorMessage.textContent = message || "Request failed.";
    this.elements.error.classList.remove("hidden");
    this.elements.list.classList.add("hidden");
    this.elements.empty.classList.add("hidden");
  },

  hidePageError() {
    this.elements.error.classList.add("hidden");
    this.elements.errorMessage.textContent = "";
  },

  normalize(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
  },

  pretty(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  },

  money(value) {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(2);
  },

  async test() {
    console.log("========================================");
    console.log("APNABITE FAST SMART PRODUCTS PAGE TEST");
    console.log("========================================");

    const firstRequest = this.load({ force: true, background: true });
    const secondRequest = this.load({ force: true, background: true });
    const duplicateProtected = firstRequest === secondRequest;
    const data = await firstRequest;
    const cached = this.restoreCache();
    const bottomItems = this.elements.bottomNavigation.querySelectorAll("a").length;

    const results = [
      { test: "Required role", expected: "Food Partner", actual: document.body.dataset.requiredRole, passed: document.body.dataset.requiredRole === "Food Partner" },
      { test: "Live products API", expected: true, actual: Boolean(data && data.success), passed: Boolean(data && data.success) },
      { test: "Product array", expected: true, actual: Array.isArray(this.state.products), passed: Array.isArray(this.state.products) },
      { test: "Products cache", expected: true, actual: Boolean(cached), passed: Boolean(cached) },
      { test: "Duplicate request protection", expected: true, actual: duplicateProtected, passed: duplicateProtected === true },
      { test: "18 product types", expected: 18, actual: Object.keys(this.PRESETS).length, passed: Object.keys(this.PRESETS).length === 18 },
      { test: "Dynamic variants", expected: true, actual: Boolean(this.elements.variantRows && this.elements.addVariant), passed: Boolean(this.elements.variantRows && this.elements.addVariant) },
      { test: "Bottom navigation", expected: 4, actual: bottomItems, passed: bottomItems === 4 },
      { test: "Category grouping", expected: true, actual: typeof this.groupProductsByCategory === "function", passed: typeof this.groupProductsByCategory === "function" },
      { test: "No category arrow controls", expected: 0, actual: document.querySelectorAll('[data-action="cat-up"], [data-action="cat-down"]').length, passed: document.querySelectorAll('[data-action="cat-up"], [data-action="cat-down"]').length === 0 },
      { test: "Search and filter", expected: true, actual: Boolean(this.elements.search && this.elements.availabilityFilter), passed: Boolean(this.elements.search && this.elements.availabilityFilter) },
      { test: "2 MB image limit", expected: 2097152, actual: this.MAX_IMAGE_BYTES, passed: this.MAX_IMAGE_BYTES === 2097152 }
    ];

    const passed = results.every((result) => result.passed);
    console.table(results);
    console.log("Products:", this.state.products);
    console.log(passed ? "Fast Smart Products Page Test: PASS" : "Fast Smart Products Page Test: FAIL");

    return {
      success: passed,
      status: passed ? "PASS" : "FAIL",
      productCount: this.state.products.length,
      cached: Boolean(cached),
      results
    };
  }
};

document.addEventListener("DOMContentLoaded", () => {
  FoodPartnerProducts.init();
});
