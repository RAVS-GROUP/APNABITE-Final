/**
 * ============================================================
 * APNABITE CUSTOMER
 * FILE: customer/js/home.js
 * PURPOSE: Customer Home page controller
 * VERSION: 2.0.0
 * ============================================================
 *
 * LOCATION BEHAVIOUR:
 * - Home page location ke liye wait nahi karti.
 * - Saved location turant show hoti hai.
 * - Device location background mein refresh hoti hai.
 * - Permission prompt sirf user ke location button tap par aata hai.
 * - Background location failure Home ko block nahi karta.
 * ============================================================
 */

const CustomerHome = {

  /*
   * ----------------------------------------------------------
   * SETTINGS
   * ----------------------------------------------------------
   */

  SEARCH_DEBOUNCE_MS:
    300,

  DISCOVERY_PLACEHOLDER_DELAY_MS:
    800,


  /*
   * ----------------------------------------------------------
   * STATE
   * ----------------------------------------------------------
   */

  selectedFoodType:
    "ALL",

  selectedCategory:
    "",

  searchTimer:
    null,

  backgroundLocationStarted:
    false,

  locationState: {
    success: false,
    source: "NONE",
    label: "Select location",
    location: null,
    district: null
  },

  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    this.elements = {

      locationButton:
        document.getElementById(
          "customerLocationButton"
        ),

      locationText:
        document.getElementById(
          "customerLocationText"
        ),

      notificationButton:
        document.getElementById(
          "notificationButton"
        ),

      notificationDot:
        document.getElementById(
          "notificationDot"
        ),

      searchInput:
        document.getElementById(
          "customerSearchInput"
        ),

      searchClearButton:
        document.getElementById(
          "searchClearButton"
        ),

      foodTypeButtons:
        Array.from(
          document.querySelectorAll(
            ".food-type-chip"
          )
        ),

      categoryButtons:
        Array.from(
          document.querySelectorAll(
            ".category-item"
          )
        ),

      kitchenList:
        document.getElementById(
          "kitchenList"
        ),

      kitchenEmptyState:
        document.getElementById(
          "kitchenEmptyState"
        ),

      refreshKitchensButton:
        document.getElementById(
          "refreshKitchensButton"
        ),

      message:
        document.getElementById(
          "roleHomeMessage"
        ),

      bottomNavigation:
        Array.from(
          document.querySelectorAll(
            ".customer-nav-item"
          )
        )
    };


    if (!this.hasRequiredElements()) {

      console.error(
        "Customer Home elements are missing."
      );

      return false;
    }


    /*
     * Home UI is initialized immediately.
     * Background location is started afterwards without await.
     */

    this.bindEvents();

    this.locationState =
      this.restoreLocation();

    this.prepareDiscoveryState();

    this.startBackgroundLocation();


    console.log(
      "ApnaBite Customer Home initialized."
    );


    return true;
  },


  /*
   * ----------------------------------------------------------
   * REQUIRED ELEMENT CHECK
   * ----------------------------------------------------------
   */

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


  /*
   * ----------------------------------------------------------
   * EVENT BINDINGS
   * ----------------------------------------------------------
   */

  bindEvents() {

    this.elements.locationButton
      .addEventListener(
        "click",
        () => {

          this.handleLocationButton();
        }
      );


    this.elements.notificationButton
      .addEventListener(
        "click",
        () => {

          this.showMessage(
            "You have no new notifications."
          );
        }
      );


    this.elements.searchInput
      .addEventListener(
        "input",
        () => {

          this.handleSearchInput();
        }
      );


    this.elements.searchInput
      .addEventListener(
        "keydown",
        (event) => {

          if (
            event.key === "Enter"
          ) {

            event.preventDefault();

            window.clearTimeout(
              this.searchTimer
            );

            this.search(
              this.elements
                .searchInput
                .value
            );
          }
        }
      );


    this.elements.searchClearButton
      .addEventListener(
        "click",
        () => {

          this.clearSearch();
        }
      );


    this.elements.foodTypeButtons
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              this.selectFoodType(
                button.dataset
                  .foodType
              );
            }
          );
        }
      );


    this.elements.categoryButtons
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              this.selectCategory(
                button.dataset
                  .category
              );
            }
          );
        }
      );


    this.elements.refreshKitchensButton
      .addEventListener(
        "click",
        () => {

          this.loadNearbyKitchens();
        }
      );


    /*
     * LocationManager background events.
     */

    document.addEventListener(
      "apnabite:background-location",
      (event) => {

        this.handleBackgroundLocation(
          event.detail || {}
        );
      }
    );


    document.addEventListener(
      "apnabite:location-permission-required",
      () => {

        this.handleLocationPermissionRequired();
      }
    );


    document.addEventListener(
      "apnabite:location-permission-denied",
      () => {

        this.handleLocationPermissionDenied();
      }
    );


    document.addEventListener(
      "apnabite:background-location-error",
      (event) => {

        this.handleBackgroundLocationError(
          event.detail || {}
        );
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * RESTORE IMMEDIATE LOCATION
   *
   * This method is synchronous. It never waits for GPS.
   * ----------------------------------------------------------
   */

  restoreLocation() {

    const manualLocation =
      ServiceLocation.getSaved();


    if (manualLocation) {

      const locationParts = [
        manualLocation.districtName,
        manualLocation.state
      ]
        .filter(
          Boolean
        );


      const label =
        locationParts.length > 0
          ? locationParts.join(", ")
          : "Saved location";


      this.setLocationLabel(
        label
      );


      return {
        success: true,
        source:
          "MANUAL",
        label:
          label,
        district:
          manualLocation,
        location:
          LocationManager.getSaved()
      };
    }


    const deviceLocation =
      LocationManager.getSaved();


    if (deviceLocation) {

      this.setLocationLabel(
        "Current location"
      );


      return {
        success: true,
        source:
          LocationManager.isFresh(
            deviceLocation
          )
            ? "DEVICE"
            : "STALE_DEVICE",
        label:
          "Current location",
        location:
          deviceLocation,
        district:
          null
      };
    }


    this.setLocationLabel(
      "Select location"
    );


    return {
      success: false,
      source:
        "NONE",
      label:
        "Select location",
      location:
        null,
      district:
        null
    };
  },


  /*
   * ----------------------------------------------------------
   * START BACKGROUND LOCATION
   *
   * IMPORTANT:
   * This is intentionally not awaited by init().
   * ----------------------------------------------------------
   */

  startBackgroundLocation() {

    if (this.backgroundLocationStarted) {

      return {
        success: true,
        alreadyStarted: true
      };
    }


    if (
      typeof LocationManager ===
        "undefined" ||
      typeof LocationManager
        .initBackgroundRefresh !==
        "function"
    ) {

      console.warn(
        "Background location manager is unavailable."
      );

      return {
        success: false,
        reason:
          "BACKGROUND_LOCATION_UNAVAILABLE"
      };
    }


    this.backgroundLocationStarted =
      true;


    Promise.resolve(
      LocationManager
        .initBackgroundRefresh({
          allowPrompt:
            false
        })
    )
      .catch(
        (error) => {

          console.warn(
            "Background location initialization failed:",
            error
          );
        }
      );


    return {
      success: true,
      started: true
    };
  },


  /*
   * ----------------------------------------------------------
   * BACKGROUND LOCATION RECEIVED
   * ----------------------------------------------------------
   */

  handleBackgroundLocation(detail) {

    const location =
      detail.location ||
      (
        detail.result &&
        detail.result.location
      ) ||
      LocationManager.getSaved();


    if (!location) {

      return {
        success: false,
        reason:
          "LOCATION_NOT_FOUND"
      };
    }


    /*
     * A manually selected service district remains the visible
     * delivery label. Device coordinates are still refreshed
     * silently for later nearby discovery and 500m matching.
     */

    const manualLocation =
      ServiceLocation.getSaved();


    if (manualLocation) {

      const parts = [
        manualLocation.districtName,
        manualLocation.state
      ]
        .filter(
          Boolean
        );


      const label =
        parts.length > 0
          ? parts.join(", ")
          : "Saved location";


      this.setLocationLabel(
        label
      );


      this.locationState = {
        success: true,
        source:
          "MANUAL",
        label:
          label,
        district:
          manualLocation,
        location:
          location,
        backgroundRefreshed:
          true
      };

    } else {

      this.setLocationLabel(
        "Current location"
      );


      this.locationState = {
        success: true,
        source:
          "DEVICE",
        label:
          "Current location",
        district:
          null,
        location:
          location,
        backgroundRefreshed:
          true
      };
    }


    this.clearLocationMessage();


    console.log(
      "Customer background location updated:",
      this.locationState
    );


    return {
      success: true,
      locationState:
        this.locationState
    };
  },


  /*
   * ----------------------------------------------------------
   * PERMISSION REQUIRED
   *
   * No automatic browser permission popup is opened.
   * ----------------------------------------------------------
   */

  handleLocationPermissionRequired() {

    if (
      this.locationState.success ===
        true
    ) {

      return {
        success: true,
        locationAvailable:
          true
      };
    }


    this.setLocationLabel(
      "Enable location"
    );


    this.showMessage(
      "Tap Enable location to show nearby kitchens."
    );


    return {
      success: false,
      reason:
        "LOCATION_PERMISSION_REQUIRED"
    };
  },


  /*
   * ----------------------------------------------------------
   * PERMISSION DENIED
   * ----------------------------------------------------------
   */

  handleLocationPermissionDenied() {

    const restored =
      this.restoreLocation();


    if (!restored.success) {

      this.setLocationLabel(
        "Choose address"
      );


      this.showMessage(
        "Location permission is off. Tap Choose address to select your delivery area."
      );
    }


    return {
      success:
        restored.success,
      reason:
        "LOCATION_PERMISSION_DENIED",
      location:
        restored
    };
  },


  /*
   * ----------------------------------------------------------
   * BACKGROUND LOCATION ERROR
   * ----------------------------------------------------------
   */

  handleBackgroundLocationError(
    detail
  ) {

    console.warn(
      "Customer background location error:",
      detail
    );


    /*
     * Saved/manual location remains usable.
     * Do not replace the whole page with an error.
     */

    const restored =
      this.restoreLocation();


    if (!restored.success) {

      this.showMessage(
        "Current location is unavailable. Tap Select location to choose your area."
      );
    }


    return {
      success: false,
      reason:
        detail.reason ||
        detail.code ||
        "BACKGROUND_LOCATION_ERROR",
      savedLocationAvailable:
        restored.success
    };
  },


  /*
   * ----------------------------------------------------------
   * LOCATION BUTTON
   *
   * Browser permission may be requested only after this tap.
   * ----------------------------------------------------------
   */

  async handleLocationButton() {

    this.clearMessage();


    if (
      typeof LocationManager ===
        "undefined" ||
      typeof LocationManager
        .requestAfterUserAction !==
        "function"
    ) {

      this.openLocationSelection();

      return {
        success: false,
        reason:
          "LOCATION_MANAGER_UNAVAILABLE"
      };
    }


    const originalLabel =
      this.elements.locationText
        .textContent;


    this.setLocationLabel(
      "Detecting location..."
    );


    this.elements.locationButton
      .setAttribute(
        "aria-busy",
        "true"
      );


    try {

      const result =
        await LocationManager
          .requestAfterUserAction({
            persist:
              true,
            enableHighAccuracy:
              false
          });


      const location =
        result &&
        result.location
          ? result.location
          : LocationManager.getSaved();


      if (!location) {

        throw LocationManager
          .createError(
            "Location could not be detected.",
            "LOCATION_NOT_AVAILABLE"
          );
      }


      this.setLocationLabel(
        "Current location"
      );


      this.locationState = {
        success: true,
        source:
          "DEVICE",
        label:
          "Current location",
        location:
          location,
        district:
          null
      };


      this.showMessage(
        "Current location updated successfully."
      );


      this.loadNearbyKitchens();


      return {
        success: true,
        source:
          "DEVICE",
        location:
          location
      };

    } catch (error) {

      console.warn(
        "Customer location request failed:",
        error
      );


      const restored =
        this.restoreLocation();


      if (!restored.success) {

        this.setLocationLabel(
          originalLabel &&
          originalLabel !==
            "Detecting location..."
            ? originalLabel
            : "Choose address"
        );


        this.showMessage(
          error.code ===
            "LOCATION_PERMISSION_DENIED"
            ? "Location permission is off. Opening address selection."
            : "Current location is unavailable. Opening address selection."
        );


        window.setTimeout(
          () => {

            this.openLocationSelection();
          },
          500
        );
      }


      return {
        success: false,
        error:
          error.message,
        code:
          error.code ||
          "LOCATION_ERROR"
      };

    } finally {

      this.elements.locationButton
        .removeAttribute(
          "aria-busy"
        );
    }
  },


  /*
   * ----------------------------------------------------------
   * OPEN MANUAL LOCATION SELECTION
   * ----------------------------------------------------------
   */

  openLocationSelection() {

    window.location.href =
      "addresses.html";
  },


  /*
   * ----------------------------------------------------------
   * SET LOCATION LABEL
   * ----------------------------------------------------------
   */

  setLocationLabel(label) {

    this.elements.locationText
      .textContent =
        label || "Select location";
  },


  /*
   * ----------------------------------------------------------
   * CLEAR LOCATION-SPECIFIC MESSAGE
   * ----------------------------------------------------------
   */

  clearLocationMessage() {

    const message =
      this.elements.message
        .textContent;


    const locationMessages = [
      "Tap Enable location",
      "Location permission",
      "Current location is unavailable",
      "Select your location"
    ];


    const isLocationMessage =
      locationMessages.some(
        (text) =>
          message.includes(
            text
          )
      );


    if (isLocationMessage) {

      this.clearMessage();
    }
  },


  /*
   * ----------------------------------------------------------
   * SEARCH INPUT
   * ----------------------------------------------------------
   */

  handleSearchInput() {

    const query =
      this.normalizeQuery(
        this.elements
          .searchInput
          .value
      );


    this.elements.searchClearButton
      .classList.toggle(
        "hidden",
        query.length === 0
      );


    window.clearTimeout(
      this.searchTimer
    );


    this.searchTimer =
      window.setTimeout(
        () => {

          this.search(
            query
          );
        },
        this.SEARCH_DEBOUNCE_MS
      );
  },


  /*
   * ----------------------------------------------------------
   * SEARCH
   * ----------------------------------------------------------
   */

  search(query) {

    const normalizedQuery =
      this.normalizeQuery(
        query
      );


    console.log(
      "Customer Discovery Search:",
      {
        query:
          normalizedQuery,
        foodType:
          this.selectedFoodType,
        category:
          this.selectedCategory,
        locationSource:
          this.locationState.source
      }
    );


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
      query:
        normalizedQuery,
      foodType:
        this.selectedFoodType,
      category:
        this.selectedCategory,
      location:
        this.locationState,
      integrationStatus:
        "DISCOVERY_API_PENDING"
    };
  },


  /*
   * ----------------------------------------------------------
   * CLEAR SEARCH
   * ----------------------------------------------------------
   */

  clearSearch() {

    window.clearTimeout(
      this.searchTimer
    );


    this.elements.searchInput
      .value =
        "";


    this.elements.searchClearButton
      .classList.add(
        "hidden"
      );


    this.selectedCategory =
      "";


    this.clearMessage();


    this.elements.searchInput
      .focus();


    return this.search("");
  },


  /*
   * ----------------------------------------------------------
   * FOOD TYPE SELECTION
   * ----------------------------------------------------------
   */

  selectFoodType(foodType) {

    const allowedFoodTypes = [
      "ALL",
      "VEG",
      "NON_VEG"
    ];


    if (
      !allowedFoodTypes.includes(
        foodType
      )
    ) {

      return {
        success: false,
        reason:
          "INVALID_FOOD_TYPE"
      };
    }


    this.selectedFoodType =
      foodType;


    this.elements.foodTypeButtons
      .forEach(
        (button) => {

          const isSelected =
            button.dataset.foodType ===
            foodType;


          button.classList.toggle(
            "active",
            isSelected
          );


          button.setAttribute(
            "aria-pressed",
            String(
              isSelected
            )
          );
        }
      );


    this.search(
      this.elements.searchInput
        .value
    );


    return {
      success: true,
      foodType:
        foodType
    };
  },


  /*
   * ----------------------------------------------------------
   * CATEGORY SELECTION
   * ----------------------------------------------------------
   */

  selectCategory(category) {

    const normalizedCategory =
      this.normalizeQuery(
        category
      );


    if (!normalizedCategory) {

      return {
        success: false,
        reason:
          "CATEGORY_REQUIRED"
      };
    }


    this.selectedCategory =
      normalizedCategory;


    this.elements.searchInput
      .value =
        normalizedCategory;


    this.elements.searchClearButton
      .classList.remove(
        "hidden"
      );


    return this.search(
      normalizedCategory
    );
  },


  /*
   * ----------------------------------------------------------
   * INITIAL DISCOVERY STATE
   * ----------------------------------------------------------
   */

  prepareDiscoveryState() {

    this.showKitchenSkeletons();


    window.setTimeout(
      () => {

        this.showKitchenEmptyState();
      },
      this
        .DISCOVERY_PLACEHOLDER_DELAY_MS
    );
  },


  /*
   * ----------------------------------------------------------
   * LOAD NEARBY KITCHENS
   * ----------------------------------------------------------
   */

  loadNearbyKitchens() {

    this.clearMessage();
    this.showKitchenSkeletons();


    window.setTimeout(
      () => {

        this.showKitchenEmptyState();

        this.showMessage(
          "Nearby Kitchen Discovery API is the next backend module."
        );
      },
      this
        .DISCOVERY_PLACEHOLDER_DELAY_MS
    );


    return {
      success: true,
      status:
        "DISCOVERY_API_PENDING",
      location:
        this.locationState
    };
  },


  /*
   * ----------------------------------------------------------
   * SKELETON STATE
   * ----------------------------------------------------------
   */

  showKitchenSkeletons() {

    this.elements.kitchenList
      .classList.remove(
        "hidden"
      );


    this.elements.kitchenEmptyState
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * EMPTY STATE
   * ----------------------------------------------------------
   */

  showKitchenEmptyState() {

    this.elements.kitchenList
      .classList.add(
        "hidden"
      );


    this.elements.kitchenEmptyState
      .classList.remove(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * PAGE MESSAGE
   * ----------------------------------------------------------
   */

  showMessage(message) {

    if (!this.elements.message) {
      return;
    }


    this.elements.message
      .textContent =
        message;


    this.elements.message
      .classList.remove(
        "hidden"
      );
  },


  clearMessage() {

    if (!this.elements.message) {
      return;
    }


    this.elements.message
      .textContent =
        "";


    this.elements.message
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * NORMALIZE SEARCH
   * ----------------------------------------------------------
   */

  normalizeQuery(value) {

    return String(
      value || ""
    )
      .trim()
      .replace(
        /\s+/g,
        " "
      )
      .slice(
        0,
        100
      );
  },


  /*
   * ----------------------------------------------------------
   * CUSTOMER HOME TEST
   *
   * Browser console:
   * CustomerHome.test()
   * ----------------------------------------------------------
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE CUSTOMER HOME TEST"
    );

    console.log(
      "========================================"
    );


    const locationResult =
      this.restoreLocation();


    const backgroundResult =
      this.startBackgroundLocation();


    const vegResult =
      this.selectFoodType(
        "VEG"
      );


    const nonVegResult =
      this.selectFoodType(
        "NON_VEG"
      );


    const allResult =
      this.selectFoodType(
        "ALL"
      );


    const categoryResult =
      this.selectCategory(
        "Home Food"
      );


    this.clearSearch();


    const backgroundSupported =
      typeof LocationManager
        .initBackgroundRefresh ===
        "function";


    const userLocationSupported =
      typeof LocationManager
        .requestAfterUserAction ===
        "function";


    const passed =
      Boolean(
        this.elements.locationButton
      ) &&
      Boolean(
        this.elements.searchInput
      ) &&
      this.elements
        .foodTypeButtons
        .length === 3 &&
      this.elements
        .categoryButtons
        .length >= 1 &&
      this.elements
        .bottomNavigation
        .length === 4 &&
      backgroundSupported === true &&
      userLocationSupported === true &&
      backgroundResult.success ===
        true &&
      vegResult.success === true &&
      nonVegResult.success === true &&
      allResult.success === true &&
      categoryResult.success === true;


    const results = [

      {
        test:
          "Immediate location restore",
        expected:
          "Location state",
        actual:
          locationResult.source,
        passed:
          Boolean(
            locationResult.source
          )
      },

      {
        test:
          "Background refresh support",
        expected:
          true,
        actual:
          backgroundSupported,
        passed:
          backgroundSupported ===
            true
      },

      {
        test:
          "User location request support",
        expected:
          true,
        actual:
          userLocationSupported,
        passed:
          userLocationSupported ===
            true
      },

      {
        test:
          "Background location started",
        expected:
          true,
        actual:
          backgroundResult.success,
        passed:
          backgroundResult.success ===
            true
      },

      {
        test:
          "Bottom navigation items",
        expected:
          4,
        actual:
          this.elements
            .bottomNavigation
            .length,
        passed:
          this.elements
            .bottomNavigation
            .length === 4
      }
    ];


    console.table(
      results
    );


    console.log(
      "Location State:",
      locationResult
    );


    console.log(
      passed
        ? "Customer Home Test: PASS"
        : "Customer Home Test: FAIL"
    );


    return {
      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      location:
        locationResult,

      backgroundLocation:
        backgroundResult,

      selectedFoodType:
        this.selectedFoodType,

      bottomNavigationItems:
        this.elements
          .bottomNavigation
          .length,

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

    CustomerHome.init();
  }
);
