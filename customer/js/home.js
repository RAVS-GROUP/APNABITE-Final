/**
 * ============================================================
 * APNABITE CUSTOMER
 * FILE: customer/js/home.js
 * PURPOSE: Customer Home page controller
 * VERSION: 2.2.0
 * ============================================================
 */

const CustomerHome = {

  SEARCH_DEBOUNCE_MS: 300,
  DISCOVERY_PLACEHOLDER_DELAY_MS: 800,
  NEAREST_ADDRESS_THRESHOLD_METERS: 500,
  RESOLVED_LOCATION_STORAGE_KEY: "apnabite_home_resolved_location",

  selectedFoodType: "ALL",
  selectedCategory: "",
  searchTimer: null,
  backgroundLocationStarted: false,
  locationResolutionRunning: false,

  locationState: {
    success: false,
    source: "NONE",
    label: "Select location",
    location: null,
    district: null,
    address: null
  },

  elements: {},


  /* INITIALIZE */

  init() {

    this.elements = {
      locationButton: document.getElementById("customerLocationButton"),
      locationText: document.getElementById("customerLocationText"),
      notificationButton: document.getElementById("notificationButton"),
      notificationDot: document.getElementById("notificationDot"),
      searchInput: document.getElementById("customerSearchInput"),
      searchClearButton: document.getElementById("searchClearButton"),
      foodTypeButtons: Array.from(document.querySelectorAll(".food-type-chip")),
      categoryButtons: Array.from(document.querySelectorAll(".category-item")),
      kitchenList: document.getElementById("kitchenList"),
      kitchenEmptyState: document.getElementById("kitchenEmptyState"),
      refreshKitchensButton: document.getElementById("refreshKitchensButton"),
      message: document.getElementById("roleHomeMessage"),
      bottomNavigation: Array.from(
        document.querySelectorAll(".customer-nav-item")
      )
    };

    if (!this.hasRequiredElements()) {
      console.error("Customer Home elements are missing.");
      return false;
    }

    this.bindEvents();
    this.locationState = this.restoreLocation();
    this.prepareDiscoveryState();

    /*
     * Resolve the already-saved device coordinates immediately.
     * Home rendering does not wait for this request.
     */
    this.resolveSavedDeviceLocation();
    this.startBackgroundLocation();

    console.log("ApnaBite Customer Home initialized.");
    return true;
  },


  hasRequiredElements() {

    return Boolean(
      this.elements.locationButton &&
      this.elements.locationText &&
      this.elements.notificationButton &&
      this.elements.searchInput &&
      this.elements.searchClearButton &&
      this.elements.kitchenList &&
      this.elements.kitchenEmptyState &&
      this.elements.refreshKitchensButton &&
      this.elements.message
    );
  },


  /* EVENTS */

  bindEvents() {

    this.elements.locationButton.addEventListener("click", () => {
      this.handleLocationButton();
    });

    this.elements.notificationButton.addEventListener("click", () => {
      this.showMessage("You have no new notifications.");
    });

    this.elements.searchInput.addEventListener("input", () => {
      this.handleSearchInput();
    });

    this.elements.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        window.clearTimeout(this.searchTimer);
        this.search(this.elements.searchInput.value);
      }
    });

    this.elements.searchClearButton.addEventListener("click", () => {
      this.clearSearch();
    });

    this.elements.foodTypeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectFoodType(button.dataset.foodType);
      });
    });

    this.elements.categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectCategory(button.dataset.category);
      });
    });

    this.elements.refreshKitchensButton.addEventListener("click", () => {
      this.loadNearbyKitchens();
    });

    document.addEventListener("apnabite:background-location", (event) => {
      this.handleBackgroundLocation(event.detail || {});
    });

    document.addEventListener("apnabite:location-permission-required", () => {
      this.handleLocationPermissionRequired();
    });

    document.addEventListener("apnabite:location-permission-denied", () => {
      this.handleLocationPermissionDenied();
    });

    document.addEventListener("apnabite:background-location-error", (event) => {
      this.handleBackgroundLocationError(event.detail || {});
    });

    document.addEventListener("apnabite:addresses-updated", () => {
      this.clearResolvedLocationCache();
      this.resolveSavedDeviceLocation();
    });

    document.addEventListener("apnabite:address-selected", (event) => {
      const detail = event.detail || {};

      if (detail.address) {
        this.applySavedAddressLocation(
          detail.address,
          LocationManager.getSaved(),
          detail.distanceMeters
        );
      }
    });
  },


  /* IMMEDIATE LOCATION RESTORE */

  restoreLocation() {

    const deviceLocation = LocationManager.getSaved();
    const cachedResolved = this.getResolvedLocationCache(deviceLocation);

    if (cachedResolved) {
      this.setLocationLabel(cachedResolved.label);

      const restoredLocation =
        cachedResolved.manualSelection === true ||
        cachedResolved.source === "MANUAL_SAVED_ADDRESS"
          ? {
              latitude: Number(cachedResolved.latitude),
              longitude: Number(cachedResolved.longitude),
              accuracy: null
            }
          : deviceLocation;

      return {
        success: true,
        source: cachedResolved.source || "SAVED_ADDRESS",
        label: cachedResolved.label,
        location: restoredLocation,
        district: cachedResolved.district || null,
        address: cachedResolved.address || null,
        distanceMeters: cachedResolved.distanceMeters ?? null,
        restoredFromCache: true
      };
    }

    const manualLocation = ServiceLocation.getSaved();

    if (manualLocation) {
      const label = this.formatDistrictLabel(manualLocation);
      this.setLocationLabel(label);

      return {
        success: true,
        source: "MANUAL_DISTRICT",
        label: label,
        district: manualLocation,
        location: deviceLocation,
        address: null
      };
    }

    if (deviceLocation) {
      this.setLocationLabel("Finding address...");

      return {
        success: true,
        source: LocationManager.isFresh(deviceLocation)
          ? "DEVICE_RESOLVING"
          : "STALE_DEVICE_RESOLVING",
        label: "Finding address...",
        location: deviceLocation,
        district: null,
        address: null
      };
    }

    this.setLocationLabel("Select location");

    return {
      success: false,
      source: "NONE",
      label: "Select location",
      location: null,
      district: null,
      address: null
    };
  },


  async resolveSavedDeviceLocation() {

    const manualSelection = this.getManualSavedAddressSelection();

    if (manualSelection) {
      return {
        success: true,
        matched: true,
        manualSelection: true,
        locationState: this.locationState
      };
    }

    const location = LocationManager.getSaved();

    if (!location) {
      return {
        success: false,
        reason: "DEVICE_LOCATION_NOT_FOUND"
      };
    }

    return this.resolveLocationDisplay(location, {
      reason: "SAVED_DEVICE"
    });
  },


  /* BACKGROUND LOCATION */

  startBackgroundLocation() {

    if (this.backgroundLocationStarted) {
      return {
        success: true,
        alreadyStarted: true
      };
    }

    if (
      typeof LocationManager === "undefined" ||
      typeof LocationManager.initBackgroundRefresh !== "function"
    ) {
      console.warn("Background location manager is unavailable.");

      return {
        success: false,
        reason: "BACKGROUND_LOCATION_UNAVAILABLE"
      };
    }

    this.backgroundLocationStarted = true;

    Promise.resolve(
      LocationManager.initBackgroundRefresh({ allowPrompt: false })
    ).catch((error) => {
      console.warn("Background location initialization failed:", error);
    });

    return {
      success: true,
      started: true
    };
  },


  async handleBackgroundLocation(detail) {

    const location =
      detail.location ||
      (detail.result && detail.result.location) ||
      LocationManager.getSaved();

    if (!location) {
      return {
        success: false,
        reason: "LOCATION_NOT_FOUND"
      };
    }

    /*
     * Background GPS may refresh silently, but it must not replace a
     * saved address that the customer selected manually for delivery.
     */
    const manualSelection = this.getManualSavedAddressSelection();

    if (manualSelection) {
      console.log(
        "Customer background location refreshed; manual delivery address preserved.",
        this.locationState
      );

      return {
        success: true,
        matched: true,
        manualSelection: true,
        locationState: this.locationState
      };
    }

    const result = await this.resolveLocationDisplay(location, {
      reason: "BACKGROUND"
    });

    console.log("Customer background location updated:", this.locationState);
    return result;
  },


  /*
   * Location display priority:
   * 1. Saved address within 500 metres
   * 2. Selected service district name
   * 3. Clear instruction to add an address
   */
  async resolveLocationDisplay(location, options = {}) {

    if (
      !location ||
      !LocationManager.isValidCoordinates(
        location.latitude,
        location.longitude
      )
    ) {
      return {
        success: false,
        reason: "INVALID_LOCATION"
      };
    }

    if (this.locationResolutionRunning) {
      return {
        success: false,
        reason: "LOCATION_RESOLUTION_RUNNING"
      };
    }

    this.locationResolutionRunning = true;

    try {
      const nearest = await this.findNearestSavedAddress(location);

      if (nearest.matched && nearest.address) {
        return this.applySavedAddressLocation(
          nearest.address,
          location,
          nearest.distanceMeters
        );
      }

      const manualLocation = ServiceLocation.getSaved();

      if (manualLocation) {
        const label = this.formatDistrictLabel(manualLocation);

        this.setLocationLabel(label);

        this.locationState = {
          success: true,
          source: "DEVICE_DISTRICT",
          label: label,
          district: manualLocation,
          location: location,
          address: null,
          nearestMatched: false,
          resolutionReason: options.reason || ""
        };

        this.saveResolvedLocationCache(this.locationState);
        this.clearLocationMessage();

        return {
          success: true,
          matched: false,
          locationState: this.locationState
        };
      }

      const label = "Add address for this location";
      this.setLocationLabel(label);

      this.locationState = {
        success: true,
        source: "NEW_DEVICE_LOCATION",
        label: label,
        district: null,
        location: location,
        address: null,
        nearestMatched: false,
        resolutionReason: options.reason || ""
      };

      this.clearResolvedLocationCache();

      return {
        success: true,
        matched: false,
        locationState: this.locationState
      };

    } catch (error) {
      console.warn("Home nearest-address resolution failed:", error);

      const manualLocation = ServiceLocation.getSaved();

      if (manualLocation) {
        const label = this.formatDistrictLabel(manualLocation);
        this.setLocationLabel(label);

        this.locationState = {
          success: true,
          source: "DISTRICT_FALLBACK",
          label: label,
          district: manualLocation,
          location: location,
          address: null,
          resolutionError: error.code || "ADDRESS_LOOKUP_FAILED"
        };

        return {
          success: true,
          fallback: true,
          locationState: this.locationState
        };
      }

      this.setLocationLabel("Choose delivery address");

      return {
        success: false,
        reason: error.code || "ADDRESS_LOOKUP_FAILED",
        error: error.message
      };

    } finally {
      this.locationResolutionRunning = false;
    }
  },


  async findNearestSavedAddress(location) {

    const response = await API.request(
      "find_nearest_customer_address",
      {
        sessionId: this.getSessionId(),
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        thresholdMeters: this.NEAREST_ADDRESS_THRESHOLD_METERS
      }
    );

    const result = response.data || {};

    return {
      success: result.success === true,
      matched: result.matched === true,
      address: result.address || result.nearestAddress || null,
      distanceMeters: Number(result.distanceMeters || 0),
      thresholdMeters: Number(
        result.thresholdMeters || this.NEAREST_ADDRESS_THRESHOLD_METERS
      ),
      requestId: response.requestId || ""
    };
  },


  applySavedAddressLocation(address, location, distanceMeters) {

    const label = this.formatSavedAddressLabel(address);
    this.setLocationLabel(label);

    this.locationState = {
      success: true,
      source: "SAVED_ADDRESS",
      label: label,
      location: location || LocationManager.getSaved(),
      district: {
        districtId: address.districtId || "",
        districtName: address.district || "",
        state: address.state || ""
      },
      address: address,
      distanceMeters:
        distanceMeters === null || distanceMeters === undefined
          ? null
          : Number(distanceMeters),
      nearestMatched: true
    };

    this.saveResolvedLocationCache(this.locationState);
    this.clearLocationMessage();

    return {
      success: true,
      matched: true,
      address: address,
      distanceMeters: this.locationState.distanceMeters,
      locationState: this.locationState
    };
  },


  /* LOCATION CACHE */

  saveResolvedLocationCache(locationState) {

    if (!locationState || !locationState.location || !locationState.label) {
      return false;
    }

    AppStorage.set(this.RESOLVED_LOCATION_STORAGE_KEY, {
      label: locationState.label,
      source: locationState.source,
      latitude: Number(locationState.location.latitude),
      longitude: Number(locationState.location.longitude),
      district: locationState.district || null,
      address: locationState.address || null,
      distanceMeters: locationState.distanceMeters ?? null,
      resolvedAt: new Date().toISOString()
    });

    return true;
  },


  getResolvedLocationCache(deviceLocation) {

    const cached = AppStorage.get(
      this.RESOLVED_LOCATION_STORAGE_KEY,
      null
    );

    if (
      !cached ||
      !cached.label ||
      !LocationManager.isValidCoordinates(
        cached.latitude,
        cached.longitude
      )
    ) {
      return null;
    }

    if (
      cached.manualSelection === true ||
      cached.source === "MANUAL_SAVED_ADDRESS"
    ) {
      return cached;
    }

    if (!deviceLocation) {
      return null;
    }

    try {
      const distanceKm = LocationManager.calculateDistanceKm(
        deviceLocation.latitude,
        deviceLocation.longitude,
        cached.latitude,
        cached.longitude
      );

      if (
        distanceKm * 1000 >
        this.NEAREST_ADDRESS_THRESHOLD_METERS
      ) {
        this.clearResolvedLocationCache();
        return null;
      }

      return cached;
    } catch (error) {
      this.clearResolvedLocationCache();
      return null;
    }
  },


  clearResolvedLocationCache() {
    AppStorage.remove(this.RESOLVED_LOCATION_STORAGE_KEY);
    return true;
  },


  getManualSavedAddressSelection() {

    const cached = AppStorage.get(
      this.RESOLVED_LOCATION_STORAGE_KEY,
      null
    );

    if (
      !cached ||
      !cached.address ||
      (
        cached.manualSelection !== true &&
        cached.source !== "MANUAL_SAVED_ADDRESS"
      ) ||
      !LocationManager.isValidCoordinates(
        cached.latitude,
        cached.longitude
      )
    ) {
      return null;
    }

    return cached;
  },


  /* PERMISSION AND USER LOCATION */

  handleLocationPermissionRequired() {

    if (this.locationState.success === true) {
      return {
        success: true,
        locationAvailable: true
      };
    }

    this.setLocationLabel("Enable location");
    this.showMessage("Tap Enable location to show nearby kitchens.");

    return {
      success: false,
      reason: "LOCATION_PERMISSION_REQUIRED"
    };
  },


  handleLocationPermissionDenied() {

    const restored = this.restoreLocation();

    if (!restored.success) {
      this.setLocationLabel("Choose address");
      this.showMessage(
        "Location permission is off. Tap Choose address to select your delivery area."
      );
    }

    return {
      success: restored.success,
      reason: "LOCATION_PERMISSION_DENIED",
      location: restored
    };
  },


  handleBackgroundLocationError(detail) {

    console.warn("Customer background location error:", detail);
    const restored = this.restoreLocation();

    if (!restored.success) {
      this.showMessage(
        "Current location is unavailable. Tap Select location to choose your area."
      );
    }

    return {
      success: false,
      reason: detail.reason || detail.code || "BACKGROUND_LOCATION_ERROR",
      savedLocationAvailable: restored.success
    };
  },


  async handleLocationButton() {

    this.clearMessage();

    if (
      typeof LocationManager === "undefined" ||
      typeof LocationManager.requestAfterUserAction !== "function"
    ) {
      this.openLocationSelection();

      return {
        success: false,
        reason: "LOCATION_MANAGER_UNAVAILABLE"
      };
    }

    const originalLabel = this.elements.locationText.textContent;
    this.setLocationLabel("Detecting location...");
    this.elements.locationButton.setAttribute("aria-busy", "true");

    try {
      const result = await LocationManager.requestAfterUserAction({
        persist: true,
        enableHighAccuracy: false
      });

      const location = result && result.location
        ? result.location
        : LocationManager.getSaved();

      if (!location) {
        throw LocationManager.createError(
          "Location could not be detected.",
          "LOCATION_NOT_AVAILABLE"
        );
      }

      this.clearResolvedLocationCache();

      const resolved = await this.resolveLocationDisplay(location, {
        reason: "USER_REQUEST"
      });

      if (resolved.matched && resolved.address) {
        this.showMessage(
          this.getAddressTypeLabel(resolved.address.addressType) +
          " address selected for delivery."
        );
      } else {
        this.showMessage(
          "Location detected. Add a complete address if this is a new delivery location."
        );
      }

      this.loadNearbyKitchens();

      return {
        success: true,
        source: this.locationState.source,
        location: location,
        address: this.locationState.address,
        label: this.locationState.label
      };

    } catch (error) {
      console.warn("Customer location request failed:", error);
      const restored = this.restoreLocation();

      if (!restored.success) {
        this.setLocationLabel(
          originalLabel && originalLabel !== "Detecting location..."
            ? originalLabel
            : "Choose address"
        );

        this.showMessage(
          error.code === "LOCATION_PERMISSION_DENIED"
            ? "Location permission is off. Opening address selection."
            : "Current location is unavailable. Opening address selection."
        );

        window.setTimeout(() => {
          this.openLocationSelection();
        }, 500);
      }

      return {
        success: false,
        error: error.message,
        code: error.code || "LOCATION_ERROR"
      };

    } finally {
      this.elements.locationButton.removeAttribute("aria-busy");
    }
  },


  openLocationSelection() {
    window.location.href = "addresses.html";
  },


  getSessionId() {

    const session = SessionManager.get();
    return session && session.sessionId ? session.sessionId : "";
  },


  setLocationLabel(label) {
    this.elements.locationText.textContent = label || "Select location";
  },


  formatDistrictLabel(district) {

    const parts = [district.districtName, district.state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Selected district";
  },


  formatSavedAddressLabel(address) {

    const type = this.getAddressTypeLabel(address.addressType);
    const place =
      address.areaLocality ||
      address.addressLine1 ||
      address.city ||
      address.district ||
      "Saved address";

    return type + " • " + place;
  },


  getAddressTypeLabel(type) {

    const labels = {
      HOME: "Home",
      WORK: "Work",
      OTHER: "Other"
    };

    return labels[String(type || "OTHER").toUpperCase()] || "Address";
  },


  clearLocationMessage() {

    const message = this.elements.message.textContent;
    const locationMessages = [
      "Tap Enable location",
      "Location permission",
      "Current location is unavailable",
      "Select your location",
      "Location detected"
    ];

    const isLocationMessage = locationMessages.some((text) =>
      message.includes(text)
    );

    if (isLocationMessage) {
      this.clearMessage();
    }
  },


  /* SEARCH AND FILTERS */

  handleSearchInput() {

    const query = this.normalizeQuery(this.elements.searchInput.value);
    this.elements.searchClearButton.classList.toggle(
      "hidden",
      query.length === 0
    );

    window.clearTimeout(this.searchTimer);

    this.searchTimer = window.setTimeout(() => {
      this.search(query);
    }, this.SEARCH_DEBOUNCE_MS);
  },


  search(query) {

    const normalizedQuery = this.normalizeQuery(query);

    console.log("Customer Discovery Search:", {
      query: normalizedQuery,
      foodType: this.selectedFoodType,
      category: this.selectedCategory,
      locationSource: this.locationState.source,
      locationLabel: this.locationState.label,
      addressId: this.locationState.address
        ? this.locationState.address.addressId
        : ""
    });

    if (normalizedQuery) {
      this.showMessage(
        'Searching for "' +
        normalizedQuery +
        '" will be connected with the Discovery API.'
      );
    } else {
      this.clearMessage();
    }

    return {
      success: true,
      query: normalizedQuery,
      foodType: this.selectedFoodType,
      category: this.selectedCategory,
      location: this.locationState,
      integrationStatus: "DISCOVERY_API_PENDING"
    };
  },


  clearSearch() {

    window.clearTimeout(this.searchTimer);
    this.elements.searchInput.value = "";
    this.elements.searchClearButton.classList.add("hidden");
    this.selectedCategory = "";
    this.clearMessage();
    this.elements.searchInput.focus();

    return this.search("");
  },


  selectFoodType(foodType) {

    const allowedFoodTypes = ["ALL", "VEG", "NON_VEG"];

    if (!allowedFoodTypes.includes(foodType)) {
      return {
        success: false,
        reason: "INVALID_FOOD_TYPE"
      };
    }

    this.selectedFoodType = foodType;

    this.elements.foodTypeButtons.forEach((button) => {
      const isSelected = button.dataset.foodType === foodType;
      button.classList.toggle("active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });

    this.search(this.elements.searchInput.value);

    return {
      success: true,
      foodType: foodType
    };
  },


  selectCategory(category) {

    const normalizedCategory = this.normalizeQuery(category);

    if (!normalizedCategory) {
      return {
        success: false,
        reason: "CATEGORY_REQUIRED"
      };
    }

    this.selectedCategory = normalizedCategory;
    this.elements.searchInput.value = normalizedCategory;
    this.elements.searchClearButton.classList.remove("hidden");

    return this.search(normalizedCategory);
  },


  /* DISCOVERY PLACEHOLDER */

  prepareDiscoveryState() {

    this.showKitchenSkeletons();

    window.setTimeout(() => {
      this.showKitchenEmptyState();
    }, this.DISCOVERY_PLACEHOLDER_DELAY_MS);
  },


  loadNearbyKitchens() {

    this.clearMessage();
    this.showKitchenSkeletons();

    window.setTimeout(() => {
      this.showKitchenEmptyState();
      this.showMessage(
        "Nearby Kitchen Discovery API is the next backend module."
      );
    }, this.DISCOVERY_PLACEHOLDER_DELAY_MS);

    return {
      success: true,
      status: "DISCOVERY_API_PENDING",
      location: this.locationState
    };
  },


  showKitchenSkeletons() {
    this.elements.kitchenList.classList.remove("hidden");
    this.elements.kitchenEmptyState.classList.add("hidden");
  },


  showKitchenEmptyState() {
    this.elements.kitchenList.classList.add("hidden");
    this.elements.kitchenEmptyState.classList.remove("hidden");
  },


  /* PAGE MESSAGE */

  showMessage(message) {

    if (!this.elements.message) {
      return;
    }

    this.elements.message.textContent = message;
    this.elements.message.classList.remove("hidden");
  },


  clearMessage() {

    if (!this.elements.message) {
      return;
    }

    this.elements.message.textContent = "";
    this.elements.message.classList.add("hidden");
  },


  normalizeQuery(value) {

    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 100);
  },


  /* TEST */

  async test() {

    console.log("========================================");
    console.log("APNABITE CUSTOMER HOME LOCATION TEST");
    console.log("========================================");

    const locationResult = this.restoreLocation();
    const backgroundResult = this.startBackgroundLocation();
    const deviceLocation = LocationManager.getSaved();

    let resolutionResult = {
      success: false,
      reason: "DEVICE_LOCATION_NOT_FOUND"
    };

    if (deviceLocation) {
      resolutionResult = await this.resolveLocationDisplay(deviceLocation, {
        reason: "TEST"
      });
    }

    const vegResult = this.selectFoodType("VEG");
    const nonVegResult = this.selectFoodType("NON_VEG");
    const allResult = this.selectFoodType("ALL");
    const categoryResult = this.selectCategory("Home Food");
    this.clearSearch();

    const backgroundSupported =
      typeof LocationManager.initBackgroundRefresh === "function";
    const userLocationSupported =
      typeof LocationManager.requestAfterUserAction === "function";
    const nearestSupported =
      typeof this.findNearestSavedAddress === "function" &&
      this.NEAREST_ADDRESS_THRESHOLD_METERS === 500;
    const readableLabel =
      Boolean(this.locationState.label) &&
      this.locationState.label !== "Current location";

    const results = [
      {
        test: "Immediate location restore",
        expected: "Location state",
        actual: locationResult.source,
        passed: Boolean(locationResult.source)
      },
      {
        test: "Background refresh support",
        expected: true,
        actual: backgroundSupported,
        passed: backgroundSupported === true
      },
      {
        test: "User location request support",
        expected: true,
        actual: userLocationSupported,
        passed: userLocationSupported === true
      },
      {
        test: "500m nearest-address support",
        expected: true,
        actual: nearestSupported,
        passed: nearestSupported === true
      },
      {
        test: "Readable location label",
        expected: "Not Current location",
        actual: this.locationState.label,
        passed: readableLabel
      },
      {
        test: "Background location started",
        expected: true,
        actual: backgroundResult.success,
        passed: backgroundResult.success === true
      },
      {
        test: "Bottom navigation items",
        expected: 4,
        actual: this.elements.bottomNavigation.length,
        passed: this.elements.bottomNavigation.length === 4
      }
    ];

    const passed =
      results.every((result) => result.passed) &&
      vegResult.success === true &&
      nonVegResult.success === true &&
      allResult.success === true &&
      categoryResult.success === true;

    console.table(results);
    console.log("Location State:", this.locationState);
    console.log("Location Resolution:", resolutionResult);
    console.log(
      passed ? "Customer Home Location Test: PASS" : "Customer Home Location Test: FAIL"
    );

    return {
      success: passed,
      status: passed ? "PASS" : "FAIL",
      location: this.locationState,
      resolution: resolutionResult,
      backgroundLocation: backgroundResult,
      selectedFoodType: this.selectedFoodType,
      bottomNavigationItems: this.elements.bottomNavigation.length,
      results: results
    };
  }
};


document.addEventListener("DOMContentLoaded", () => {
  CustomerHome.init();
});
