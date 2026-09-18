/**
 * ============================================================
 * APNABITE CUSTOMER
 * FILE: customer/js/home.js
 * PURPOSE: Customer Home page controller
 * VERSION: 1.0.0
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


    if (
      !this.elements.locationButton ||
      !this.elements.searchInput ||
      !this.elements.kitchenList
    ) {

      console.error(
        "Customer Home elements are missing."
      );

      return false;
    }


    this.bindEvents();
    this.restoreLocation();
    this.prepareDiscoveryState();


    console.log(
      "ApnaBite Customer Home initialized."
    );


    return true;
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

          this.openLocationSelection();
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


    this.elements
      .refreshKitchensButton
      .addEventListener(
        "click",
        () => {

          this.loadNearbyKitchens();
        }
      );
  },


  /*
   * ----------------------------------------------------------
   * RESTORE LOCATION
   * ----------------------------------------------------------
   */

  restoreLocation() {

    const manualLocation =
      ServiceLocation.getSaved();


    if (manualLocation) {

      const label =
        manualLocation.districtName +
        ", " +
        manualLocation.state;


      this.elements.locationText
        .textContent =
          label;


      return {
        success: true,
        source:
          "MANUAL",
        label:
          label,
        district:
          manualLocation
      };
    }


    const deviceLocation =
      LocationManager.getSaved();


    if (
      deviceLocation &&
      LocationManager.isFresh(
        deviceLocation
      )
    ) {

      this.elements.locationText
        .textContent =
          "Current location";


      return {
        success: true,
        source:
          "DEVICE",
        label:
          "Current location",
        location:
          deviceLocation
      };
    }


    this.elements.locationText
      .textContent =
        "Select location";


    this.showMessage(
      "Select your location to discover nearby kitchens."
    );


    return {
      success: false,
      source:
        "NONE"
    };
  },


  /*
   * ----------------------------------------------------------
   * OPEN LOCATION SELECTION
   *
   * Launch Controller will read changeLocation=1 in the
   * location-routing update.
   * ----------------------------------------------------------
   */

  openLocationSelection() {

    window.location.href =
      "../../index.html?changeLocation=1";
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


    this.elements
      .searchClearButton
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
   *
   * Discovery API will be connected later.
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
          this.selectedCategory
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
   *
   * Real API integration will replace this placeholder.
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
        "DISCOVERY_API_PENDING"
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

    this.elements.message
      .textContent =
        message;


    this.elements.message
      .classList.remove(
        "hidden"
      );
  },


  clearMessage() {

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
      vegResult.success === true &&
      nonVegResult.success === true &&
      allResult.success === true &&
      categoryResult.success === true;


    console.log(
      "Location State:",
      locationResult
    );


    console.log(
      "Bottom Navigation Items:",
      this.elements
        .bottomNavigation
        .length
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

      selectedFoodType:
        this.selectedFoodType,

      bottomNavigationItems:
        this.elements
          .bottomNavigation
          .length
    };
  }

};


document.addEventListener(
  "DOMContentLoaded",
  () => {

    CustomerHome.init();
  }
);
