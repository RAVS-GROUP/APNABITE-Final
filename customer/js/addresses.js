/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: customer/js/addresses.js
 * PURPOSE: Customer delivery location management
 * VERSION: 1.0.0
 * ============================================================
 */

const CustomerAddresses = {

  /*
   * ----------------------------------------------------------
   * STATE
   * ----------------------------------------------------------
   */

  state: {
    loading:
      false,

    deviceRequestRunning:
      false,

    districtRequestRunning:
      false,

    currentSource:
      "NONE"
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
          "refreshAddressesButton"
        ),

      deviceButton:
        document.getElementById(
          "useDeviceLocationButton"
        ),

      districtButton:
        document.getElementById(
          "chooseDistrictButton"
        ),

      loading:
        document.getElementById(
          "addressesLoading"
        ),

      addressCard:
        document.getElementById(
          "savedAddressCard"
        ),

      addressIcon:
        document.getElementById(
          "savedAddressIcon"
        ),

      addressTitle:
        document.getElementById(
          "savedAddressTitle"
        ),

      addressDescription:
        document.getElementById(
          "savedAddressDescription"
        ),

      addressSource:
        document.getElementById(
          "savedAddressSource"
        ),

      empty:
        document.getElementById(
          "addressesEmpty"
        ),

      updateButton:
        document.getElementById(
          "updateAddressButton"
        ),

      removeButton:
        document.getElementById(
          "removeAddressButton"
        ),

      message:
        document.getElementById(
          "roleHomeMessage"
        ),

      dialog:
        document.getElementById(
          "districtDialog"
        ),

      dialogCloseButton:
        document.getElementById(
          "closeDistrictDialogButton"
        ),

      dialogLoading:
        document.getElementById(
          "districtDialogLoading"
        ),

      dialogForm:
        document.getElementById(
          "districtDialogForm"
        ),

      districtSelect:
        document.getElementById(
          "addressDistrictSelect"
        ),

      dialogError:
        document.getElementById(
          "districtDialogError"
        ),

      confirmDistrictButton:
        document.getElementById(
          "confirmDistrictButton"
        ),

      bottomNavigation:
        document.querySelector(
          ".customer-bottom-nav"
        )
    };


    if (!this.hasRequiredElements()) {

      console.warn(
        "Customer Addresses page elements were not found."
      );

      return false;
    }


    this.bindEvents();
    this.refreshAddressState();


    console.log(
      "ApnaBite Customer Addresses initialized."
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
      this.elements.deviceButton &&
      this.elements.districtButton &&
      this.elements.loading &&
      this.elements.addressCard &&
      this.elements.addressTitle &&
      this.elements.addressDescription &&
      this.elements.addressSource &&
      this.elements.empty &&
      this.elements.updateButton &&
      this.elements.removeButton &&
      this.elements.message &&
      this.elements.dialog &&
      this.elements.dialogCloseButton &&
      this.elements.dialogLoading &&
      this.elements.dialogForm &&
      this.elements.districtSelect &&
      this.elements.dialogError &&
      this.elements.confirmDistrictButton
    );
  },


  /*
   * ----------------------------------------------------------
   * BIND EVENTS
   * ----------------------------------------------------------
   */

  bindEvents() {

    this.elements.refreshButton
      .addEventListener(
        "click",
        () => {

          this.refreshAddressState();
        }
      );


    this.elements.deviceButton
      .addEventListener(
        "click",
        () => {

          this.useCurrentLocation();
        }
      );


    this.elements.districtButton
      .addEventListener(
        "click",
        () => {

          this.openDistrictDialog();
        }
      );


    this.elements.updateButton
      .addEventListener(
        "click",
        () => {

          if (
            this.state.currentSource ===
            "MANUAL"
          ) {

            this.openDistrictDialog();

          } else {

            this.useCurrentLocation();
          }
        }
      );


    this.elements.removeButton
      .addEventListener(
        "click",
        () => {

          this.removeSavedLocation();
        }
      );


    this.elements.dialogCloseButton
      .addEventListener(
        "click",
        () => {

          this.closeDistrictDialog();
        }
      );


    this.elements.dialog
      .addEventListener(
        "click",
        (event) => {

          if (
            event.target.dataset
              .closeAddressDialog ===
            "true"
          ) {

            this.closeDistrictDialog();
          }
        }
      );


    this.elements.confirmDistrictButton
      .addEventListener(
        "click",
        () => {

          this.confirmDistrict();
        }
      );


    document.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Escape" &&
          !this.elements.dialog
            .classList.contains(
              "hidden"
            )
        ) {

          this.closeDistrictDialog();
        }
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * REFRESH SAVED LOCATION STATE
   * ----------------------------------------------------------
   */

  refreshAddressState() {

    this.setPageLoading(
      true
    );


    try {

      const manualLocation =
        ServiceLocation.getSaved();


      if (manualLocation) {

        this.state.currentSource =
          "MANUAL";


        this.renderManualLocation(
          manualLocation
        );


        return {
          success: true,
          source:
            "MANUAL",
          location:
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

        this.state.currentSource =
          "DEVICE";


        this.renderDeviceLocation(
          deviceLocation
        );


        return {
          success: true,
          source:
            "DEVICE",
          location:
            deviceLocation
        };
      }


      this.state.currentSource =
        "NONE";


      this.renderEmptyState();


      return {
        success: false,
        source:
          "NONE",
        location:
          null
      };

    } finally {

      this.setPageLoading(
        false
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * RENDER MANUAL LOCATION
   * ----------------------------------------------------------
   */

  renderManualLocation(location) {

    this.elements.addressIcon
      .textContent =
        "📍";


    this.elements.addressTitle
      .textContent =
        location.districtName ||
        "Selected district";


    this.elements.addressDescription
      .textContent =
        location.state
          ? location.districtName +
            ", " +
            location.state
          : location.districtName;


    this.elements.addressSource
      .textContent =
        "Selected service district";


    this.elements.updateButton
      .textContent =
        "Change District";


    this.showAddressCard();
  },


  /*
   * ----------------------------------------------------------
   * RENDER DEVICE LOCATION
   * ----------------------------------------------------------
   */

  renderDeviceLocation(location) {

    this.elements.addressIcon
      .textContent =
        "🎯";


    this.elements.addressTitle
      .textContent =
        "Current device location";


    this.elements.addressDescription
      .textContent =
        "Latitude " +
        Number(
          location.latitude
        ).toFixed(5) +
        ", Longitude " +
        Number(
          location.longitude
        ).toFixed(5);


    this.elements.addressSource
      .textContent =
        "Detected from this device";


    this.elements.updateButton
      .textContent =
        "Update Location";


    this.showAddressCard();
  },


  /*
   * ----------------------------------------------------------
   * SHOW SAVED ADDRESS CARD
   * ----------------------------------------------------------
   */

  showAddressCard() {

    this.elements.empty
      .classList.add(
        "hidden"
      );


    this.elements.addressCard
      .classList.remove(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * SHOW EMPTY STATE
   * ----------------------------------------------------------
   */

  renderEmptyState() {

    this.elements.addressCard
      .classList.add(
        "hidden"
      );


    this.elements.empty
      .classList.remove(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * USE CURRENT DEVICE LOCATION
   * ----------------------------------------------------------
   */

  async useCurrentLocation() {

    if (
      this.state.deviceRequestRunning
    ) {

      return {
        success: false,
        reason:
          "LOCATION_REQUEST_ALREADY_RUNNING"
      };
    }


    this.state.deviceRequestRunning =
      true;


    this.clearMessage();
    this.setDeviceLoading(
      true
    );


    try {

      const permissionState =
        await LocationManager
          .getPermissionState();


      if (
        permissionState === "denied"
      ) {

        throw LocationManager
          .createError(
            "Location permission is blocked.",
            "LOCATION_PERMISSION_DENIED"
          );
      }


      const location =
        await LocationManager
          .getCurrentPosition({
            persist:
              true,
            enableHighAccuracy:
              false,
            timeout:
              15000,
            maximumAge:
              300000
          });


      if (
        !LocationManager
          .isValidCoordinates(
            location.latitude,
            location.longitude
          )
      ) {

        throw LocationManager
          .createError(
            "Invalid location received.",
            "INVALID_LOCATION"
          );
      }


      /*
       * Device location becomes active.
       * Clear any older manual district.
       */

      ServiceLocation.clear();


      this.state.currentSource =
        "DEVICE";


      this.renderDeviceLocation(
        location
      );


      this.showMessage(
        "Current device location saved successfully.",
        "success"
      );


      this.dispatchLocationReady(
        "DEVICE",
        location
      );


      console.log(
        "Customer Device Address: PASS"
      );


      return {
        success: true,
        status:
          "PASS",
        source:
          "DEVICE",
        location:
          location
      };

    } catch (error) {

      const displayError =
        this.getLocationError(
          error
        );


      this.showMessage(
        displayError.message,
        "error"
      );


      console.error(
        "Customer Device Address: FAIL",
        displayError
      );


      return {
        success: false,
        status:
          "FAIL",
        code:
          displayError.code,
        error:
          displayError.message
      };

    } finally {

      this.state.deviceRequestRunning =
        false;


      this.setDeviceLoading(
        false
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * OPEN DISTRICT DIALOG
   * ----------------------------------------------------------
   */

  async openDistrictDialog() {

    this.elements.dialog
      .classList.remove(
        "hidden"
      );


    document.body
      .classList.add(
        "address-dialog-open"
      );


    this.clearDialogError();


    await this.loadDistricts();
  },


  /*
   * ----------------------------------------------------------
   * CLOSE DISTRICT DIALOG
   * ----------------------------------------------------------
   */

  closeDistrictDialog() {

    if (
      this.state.districtRequestRunning
    ) {

      return false;
    }


    this.elements.dialog
      .classList.add(
        "hidden"
      );


    document.body
      .classList.remove(
        "address-dialog-open"
      );


    this.clearDialogError();


    return true;
  },


  /*
   * ----------------------------------------------------------
   * LOAD ACTIVE SERVICE DISTRICTS
   * ----------------------------------------------------------
   */

  async loadDistricts() {

    this.elements.dialogLoading
      .classList.remove(
        "hidden"
      );


    this.elements.dialogForm
      .classList.add(
        "hidden"
      );


    try {

      const result =
        await ServiceLocation
          .getAvailable();


      const districts =
        Array.isArray(
          result.districts
        )
          ? result.districts
          : [];


      this.renderDistrictOptions(
        districts
      );


      return {
        success: true,
        count:
          districts.length,
        districts:
          districts
      };

    } catch (error) {

      this.setDialogError(
        error.message ||
        "Unable to load service districts."
      );


      return {
        success: false,
        error:
          error.message,
        code:
          error.code || ""
      };

    } finally {

      this.elements.dialogLoading
        .classList.add(
          "hidden"
        );


      this.elements.dialogForm
        .classList.remove(
          "hidden"
        );
    }
  },


  /*
   * ----------------------------------------------------------
   * RENDER DISTRICT OPTIONS
   * ----------------------------------------------------------
   */

  renderDistrictOptions(districts) {

    const select =
      this.elements.districtSelect;


    select.innerHTML = "";


    const placeholder =
      document.createElement(
        "option"
      );


    placeholder.value =
      "";

    placeholder.textContent =
      districts.length > 0
        ? "Select your district"
        : "No service district available";


    select.appendChild(
      placeholder
    );


    districts.forEach(
      (district) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          district.districtId;


        option.textContent =
          district.districtName +
          ", " +
          district.state;


        select.appendChild(
          option
        );
      }
    );


    const savedDistrict =
      ServiceLocation.getSaved();


    if (savedDistrict) {

      select.value =
        savedDistrict.districtId;
    }
  },


  /*
   * ----------------------------------------------------------
   * CONFIRM MANUAL DISTRICT
   * ----------------------------------------------------------
   */

  async confirmDistrict() {

    if (
      this.state.districtRequestRunning
    ) {

      return {
        success: false,
        reason:
          "DISTRICT_REQUEST_ALREADY_RUNNING"
      };
    }


    const districtId =
      this.elements
        .districtSelect
        .value;


    if (!districtId) {

      this.setDialogError(
        "Please select a service district."
      );


      return {
        success: false,
        reason:
          "DISTRICT_REQUIRED"
      };
    }


    this.state.districtRequestRunning =
      true;


    this.clearDialogError();
    this.setDistrictLoading(
      true
    );


    try {

      const result =
        await ServiceLocation
          .selectDistrict(
            districtId
          );


      const district =
        result.district;


      /*
       * Manual district becomes active.
       * Clear older device coordinates.
       */

      LocationManager.clear();


      this.state.currentSource =
        "MANUAL";


      this.renderManualLocation(
        district
      );


      this.showMessage(
        district.districtName +
        ", " +
        district.state +
        " saved as your delivery location.",
        "success"
      );


      this.dispatchLocationReady(
        "MANUAL",
        district
      );


      console.log(
        "Customer Manual Address: PASS"
      );


      return {
        success: true,
        status:
          "PASS",
        source:
          "MANUAL",
        district:
          district
      };

    } catch (error) {

      this.setDialogError(
        error.message ||
        "Unable to save this district."
      );


      console.error(
        "Customer Manual Address: FAIL",
        error
      );


      return {
        success: false,
        status:
          "FAIL",
        code:
          error.code || "",
        error:
          error.message
      };

    } finally {

      this.state.districtRequestRunning =
        false;


      this.setDistrictLoading(
        false
      );


      if (
        this.state.currentSource ===
        "MANUAL"
      ) {

        this.closeDistrictDialog();
      }
    }
  },


  /*
   * ----------------------------------------------------------
   * REMOVE SAVED LOCATION
   * ----------------------------------------------------------
   */

  removeSavedLocation() {

    ServiceLocation.clear();
    LocationManager.clear();


    this.state.currentSource =
      "NONE";


    this.renderEmptyState();


    this.showMessage(
      "Saved delivery location removed.",
      "success"
    );


    document.dispatchEvent(
      new CustomEvent(
        "apnabite:location-removed"
      )
    );


    return {
      success: true,
      removed:
        true
    };
  },


  /*
   * ----------------------------------------------------------
   * LOCATION READY EVENT
   * ----------------------------------------------------------
   */

  dispatchLocationReady(
    source,
    location
  ) {

    document.dispatchEvent(
      new CustomEvent(
        "apnabite:location-ready",
        {
          detail: {
            source:
              source,
            location:
              location
          }
        }
      )
    );
  },


  /*
   * ----------------------------------------------------------
   * BUTTON LOADING STATES
   * ----------------------------------------------------------
   */

  setPageLoading(isLoading) {

    this.state.loading =
      isLoading;


    this.elements.refreshButton
      .disabled =
        isLoading;


    this.elements.refreshButton
      .classList.toggle(
        "is-loading",
        isLoading
      );


    this.elements.loading
      .classList.toggle(
        "hidden",
        !isLoading
      );
  },


  setDeviceLoading(isLoading) {

    this.elements.deviceButton
      .disabled =
        isLoading;


    const title =
      this.elements.deviceButton
        .querySelector(
          "strong"
        );


    if (title) {

      title.textContent =
        isLoading
          ? "Detecting location..."
          : "Use current location";
    }
  },


  setDistrictLoading(isLoading) {

    this.elements.confirmDistrictButton
      .disabled =
        isLoading;


    this.elements.confirmDistrictButton
      .textContent =
        isLoading
          ? "Saving Location..."
          : "Save Delivery Location";
  },


  /*
   * ----------------------------------------------------------
   * PAGE MESSAGE
   * ----------------------------------------------------------
   */

  showMessage(
    message,
    type = "success"
  ) {

    this.elements.message
      .textContent =
        message;


    this.elements.message
      .classList.remove(
        "hidden"
      );


    this.elements.message
      .dataset.messageType =
        type;
  },


  clearMessage() {

    this.elements.message
      .textContent =
        "";


    this.elements.message
      .classList.add(
        "hidden"
      );


    delete this.elements
      .message
      .dataset
      .messageType;
  },


  /*
   * ----------------------------------------------------------
   * DIALOG ERROR
   * ----------------------------------------------------------
   */

  setDialogError(message) {

    this.elements.dialogError
      .textContent =
        message;


    this.elements.dialogError
      .classList.remove(
        "hidden"
      );
  },


  clearDialogError() {

    this.elements.dialogError
      .textContent =
        "";


    this.elements.dialogError
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * LOCATION ERROR MAPPING
   * ----------------------------------------------------------
   */

  getLocationError(error) {

    const code =
      error &&
      error.code
        ? error.code
        : "LOCATION_ERROR";


    const messages = {

      LOCATION_PERMISSION_DENIED:
        "Location permission is blocked. Allow location access in browser settings and try again.",

      LOCATION_UNAVAILABLE:
        "Your current location is unavailable. Check location services and try again.",

      LOCATION_TIMEOUT:
        "Location detection took too long. Please try again.",

      LOCATION_UNSUPPORTED:
        "Location is not supported on this device or browser.",

      INVALID_LOCATION:
        "The device returned an invalid location.",

      LOCATION_ERROR:
        "Unable to detect your current location."
    };


    return {
      code:
        code,
      message:
        messages[code] ||
        messages.LOCATION_ERROR
    };
  },


  /*
   * ----------------------------------------------------------
   * PAGE INTEGRATION TEST
   *
   * Browser console:
   * CustomerAddresses.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE CUSTOMER ADDRESSES TEST"
    );

    console.log(
      "========================================"
    );


    try {

      const requiredRole =
        document.body.dataset
          .requiredRole;


      const addressState =
        this.refreshAddressState();


      const available =
        await ServiceLocation
          .getAvailable();


      const districts =
        Array.isArray(
          available.districts
        )
          ? available.districts
          : [];


      this.renderDistrictOptions(
        districts
      );


      const optionCount =
        this.elements
          .districtSelect
          .options
          .length;


      const navigationItems =
        this.elements.bottomNavigation
          ? this.elements
              .bottomNavigation
              .querySelectorAll(
                ".customer-nav-item"
              )
              .length
          : 0;


      const accountActive =
        Boolean(
          this.elements
            .bottomNavigation &&
          this.elements
            .bottomNavigation
            .querySelector(
              '.customer-nav-item[href="account.html"].is-active'
            )
        );


      const passed =
        requiredRole ===
          "Customer" &&
        districts.length > 0 &&
        optionCount ===
          districts.length + 1 &&
        navigationItems === 4 &&
        accountActive === true;


      const results = [

        {
          test:
            "Required role",
          expected:
            "Customer",
          actual:
            requiredRole,
          passed:
            requiredRole ===
              "Customer"
        },

        {
          test:
            "Service districts",
          expected:
            "At least 1",
          actual:
            districts.length,
          passed:
            districts.length > 0
        },

        {
          test:
            "District options",
          expected:
            districts.length + 1,
          actual:
            optionCount,
          passed:
            optionCount ===
              districts.length + 1
        },

        {
          test:
            "Bottom navigation",
          expected:
            4,
          actual:
            navigationItems,
          passed:
            navigationItems === 4
        },

        {
          test:
            "Account navigation active",
          expected:
            true,
          actual:
            accountActive,
          passed:
            accountActive === true
        }
      ];


      console.table(
        results
      );


      console.log(
        "Current Address State:",
        addressState
      );


      console.log(
        "Available Districts:",
        districts
      );


      console.log(
        passed
          ? "Customer Addresses Test: PASS"
          : "Customer Addresses Test: FAIL"
      );


      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        currentAddress:
          addressState,
        districtCount:
          districts.length,
        bottomNavigationItems:
          navigationItems,
        results:
          results
      };

    } catch (error) {

      console.error(
        "Customer Addresses Test: FAIL",
        error
      );


      return {
        success: false,
        status:
          "FAIL",
        error:
          error.message,
        code:
          error.code || ""
      };
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

    CustomerAddresses.init();
  }
);
