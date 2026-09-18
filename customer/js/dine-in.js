/**
 * ============================================================
 * APNABITE CUSTOMER
 * FILE: customer/js/dine-in.js
 * PURPOSE: Customer Dine-In page controller
 * VERSION: 1.0.0
 * ============================================================
 */

const DineInPage = {

  /*
   * ----------------------------------------------------------
   * SETTINGS
   * ----------------------------------------------------------
   */

  SEARCH_DEBOUNCE_MS:
    300,

  RESTAURANT_PLACEHOLDER_DELAY_MS:
    800,


  /*
   * ----------------------------------------------------------
   * STATE
   * ----------------------------------------------------------
   */

  selectedFilter:
    "ALL",

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
          "dineInLocationButton"
        ),

      locationText:
        document.getElementById(
          "dineInLocationText"
        ),

      searchInput:
        document.getElementById(
          "dineInSearchInput"
        ),

      searchClearButton:
        document.getElementById(
          "dineInSearchClearButton"
        ),

      dateInput:
        document.getElementById(
          "dineInDateInput"
        ),

      timeInput:
        document.getElementById(
          "dineInTimeInput"
        ),

      guestInput:
        document.getElementById(
          "dineInGuestInput"
        ),

      findButton:
        document.getElementById(
          "findDineInButton"
        ),

      filterButtons:
        Array.from(
          document.querySelectorAll(
            ".dine-in-filter"
          )
        ),

      refreshButton:
        document.getElementById(
          "refreshDineInButton"
        ),

      restaurantList:
        document.getElementById(
          "dineInRestaurantList"
        ),

      emptyState:
        document.getElementById(
          "dineInEmptyState"
        ),

      message:
        document.getElementById(
          "dineInMessage"
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
      !this.elements.dateInput ||
      !this.elements.restaurantList
    ) {

      console.error(
        "Dine-In page elements are missing."
      );

      return false;
    }


    this.setBookingDefaults();
    this.restoreLocation();
    this.bindEvents();
    this.prepareRestaurantState();


    console.log(
      "ApnaBite Dine-In Page initialized."
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

            this.searchRestaurants();
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


    this.elements.findButton
      .addEventListener(
        "click",
        () => {

          this.findAvailableRestaurants();
        }
      );


    this.elements.filterButtons
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              this.selectFilter(
                button.dataset.filter
              );
            }
          );
        }
      );


    this.elements.refreshButton
      .addEventListener(
        "click",
        () => {

          this.findAvailableRestaurants();
        }
      );
  },


  /*
   * ----------------------------------------------------------
   * BOOKING DEFAULTS
   * ----------------------------------------------------------
   */

  setBookingDefaults() {

    const today =
      new Date();


    const minimumDate =
      this.formatLocalDate(
        today
      );


    this.elements.dateInput.min =
      minimumDate;


    if (
      !this.elements.dateInput.value
    ) {

      this.elements.dateInput.value =
        minimumDate;
    }


    if (
      !this.elements.timeInput.value
    ) {

      this.elements.timeInput.value =
        this.getDefaultBookingTime();
    }
  },


  /*
   * ----------------------------------------------------------
   * FORMAT LOCAL DATE
   *
   * Avoids UTC date shifting on Indian devices.
   * ----------------------------------------------------------
   */

  formatLocalDate(date) {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );


    return (
      year +
      "-" +
      month +
      "-" +
      day
    );
  },


  /*
   * ----------------------------------------------------------
   * DEFAULT BOOKING TIME
   * ----------------------------------------------------------
   */

  getDefaultBookingTime() {

    const now =
      new Date();


    let hour =
      now.getHours() + 1;


    if (hour >= 24) {

      hour = 23;
    }


    return (
      String(hour)
        .padStart(
          2,
          "0"
        ) +
      ":00"
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
        manualLocation.districtName;


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
      "Select your location to find nearby Dine-In restaurants."
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
        this.elements.searchInput
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

          this.searchRestaurants();
        },
        this.SEARCH_DEBOUNCE_MS
      );
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


    this.elements.searchInput.value =
      "";


    this.elements.searchClearButton
      .classList.add(
        "hidden"
      );


    this.clearMessage();
    this.elements.searchInput.focus();


    return this.searchRestaurants();
  },


  /*
   * ----------------------------------------------------------
   * SELECT QUICK FILTER
   * ----------------------------------------------------------
   */

  selectFilter(filter) {

    const allowedFilters = [
      "ALL",
      "NEARBY",
      "OFFERS",
      "TOP_RATED",
      "PURE_VEG"
    ];


    if (
      !allowedFilters.includes(
        filter
      )
    ) {

      return {
        success: false,
        reason:
          "INVALID_DINE_IN_FILTER"
      };
    }


    this.selectedFilter =
      filter;


    this.elements.filterButtons
      .forEach(
        (button) => {

          const selected =
            button.dataset.filter ===
            filter;


          button.classList.toggle(
            "active",
            selected
          );


          button.setAttribute(
            "aria-pressed",
            String(selected)
          );
        }
      );


    this.searchRestaurants();


    return {
      success: true,
      filter:
        filter
    };
  },


  /*
   * ----------------------------------------------------------
   * GET BOOKING PREFERENCES
   * ----------------------------------------------------------
   */

  getBookingPreferences() {

    return {

      date:
        this.elements.dateInput.value,

      time:
        this.elements.timeInput.value,

      guests:
        Number(
          this.elements.guestInput.value
        ) || 1,

      query:
        this.normalizeQuery(
          this.elements.searchInput
            .value
        ),

      filter:
        this.selectedFilter
    };
  },


  /*
   * ----------------------------------------------------------
   * VALIDATE BOOKING PREFERENCES
   * ----------------------------------------------------------
   */

  validateBookingPreferences(
    preferences
  ) {

    if (!preferences.date) {

      return {
        valid: false,
        reason:
          "BOOKING_DATE_REQUIRED",
        message:
          "Please select your Dine-In date."
      };
    }


    if (
      preferences.date <
      this.formatLocalDate(
        new Date()
      )
    ) {

      return {
        valid: false,
        reason:
          "PAST_BOOKING_DATE",
        message:
          "Dine-In date cannot be in the past."
      };
    }


    if (!preferences.time) {

      return {
        valid: false,
        reason:
          "BOOKING_TIME_REQUIRED",
        message:
          "Please select your preferred time."
      };
    }


    if (
      preferences.guests < 1 ||
      preferences.guests > 8
    ) {

      return {
        valid: false,
        reason:
          "INVALID_GUEST_COUNT",
        message:
          "Please select a valid guest count."
      };
    }


    return {
      valid: true
    };
  },


  /*
   * ----------------------------------------------------------
   * FIND AVAILABLE RESTAURANTS
   * ----------------------------------------------------------
   */

  findAvailableRestaurants() {

    const preferences =
      this.getBookingPreferences();


    const validation =
      this.validateBookingPreferences(
        preferences
      );


    if (!validation.valid) {

      this.showMessage(
        validation.message
      );


      return {
        success: false,
        reason:
          validation.reason
      };
    }


    this.clearMessage();
    this.showRestaurantSkeletons();


    console.log(
      "Dine-In Availability Request:",
      preferences
    );


    window.setTimeout(
      () => {

        this.showEmptyState();

        this.showMessage(
          "Dine-In restaurant API integration is the next backend module."
        );
      },
      this
        .RESTAURANT_PLACEHOLDER_DELAY_MS
    );


    return {
      success: true,
      preferences:
        preferences,
      integrationStatus:
        "DINE_IN_API_PENDING"
    };
  },


  /*
   * ----------------------------------------------------------
   * SEARCH RESTAURANTS
   * ----------------------------------------------------------
   */

  searchRestaurants() {

    const preferences =
      this.getBookingPreferences();


    console.log(
      "Dine-In Search:",
      preferences
    );


    return {
      success: true,
      preferences:
        preferences,
      integrationStatus:
        "DINE_IN_API_PENDING"
    };
  },


  /*
   * ----------------------------------------------------------
   * INITIAL RESTAURANT STATE
   * ----------------------------------------------------------
   */

  prepareRestaurantState() {

    this.showRestaurantSkeletons();


    window.setTimeout(
      () => {

        this.showEmptyState();
      },
      this
        .RESTAURANT_PLACEHOLDER_DELAY_MS
    );
  },


  /*
   * ----------------------------------------------------------
   * LOADING STATE
   * ----------------------------------------------------------
   */

  showRestaurantSkeletons() {

    this.elements.restaurantList
      .classList.remove(
        "hidden"
      );


    this.elements.emptyState
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * EMPTY STATE
   * ----------------------------------------------------------
   */

  showEmptyState() {

    this.elements.restaurantList
      .classList.add(
        "hidden"
      );


    this.elements.emptyState
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
   * NORMALIZE QUERY
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
   * DINE-IN PAGE TEST
   *
   * Browser console:
   * DineInPage.test()
   * ----------------------------------------------------------
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE DINE-IN PAGE TEST"
    );

    console.log(
      "========================================"
    );


    const locationResult =
      this.restoreLocation();


    const nearbyResult =
      this.selectFilter(
        "NEARBY"
      );


    const offersResult =
      this.selectFilter(
        "OFFERS"
      );


    const allResult =
      this.selectFilter(
        "ALL"
      );


    const preferences =
      this.getBookingPreferences();


    const validation =
      this.validateBookingPreferences(
        preferences
      );


    const passed =
      Boolean(
        this.elements.searchInput
      ) &&
      Boolean(
        this.elements.dateInput
      ) &&
      Boolean(
        this.elements.timeInput
      ) &&
      this.elements
        .filterButtons
        .length === 5 &&
      this.elements
        .bottomNavigation
        .length === 4 &&
      nearbyResult.success === true &&
      offersResult.success === true &&
      allResult.success === true &&
      validation.valid === true;


    console.log(
      "Location State:",
      locationResult
    );


    console.log(
      "Booking Preferences:",
      preferences
    );


    console.log(
      "Bottom Navigation Items:",
      this.elements
        .bottomNavigation
        .length
    );


    console.log(
      passed
        ? "Dine-In Page Test: PASS"
        : "Dine-In Page Test: FAIL"
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

      preferences:
        preferences,

      selectedFilter:
        this.selectedFilter,

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

    DineInPage.init();
  }
);
