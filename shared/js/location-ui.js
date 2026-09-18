/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/location-ui.js
 * PURPOSE: Device and manual location UI controller
 * VERSION: 2.0.0
 * ============================================================
 */

const LocationUI = {

  elements: {
    screen: null,
    currentButton: null,
    manualButton: null,
    status: null,
    manualDialog: null,
    districtSelect: null,
    manualSubmitButton: null,
    manualError: null
  },

  isCurrentRequestRunning: false,
  isManualRequestRunning: false,


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    this.elements.screen =
      document.getElementById(
        "locationScreen"
      );

    this.elements.currentButton =
      document.getElementById(
        "useCurrentLocationButton"
      );

    this.elements.manualButton =
      document.getElementById(
        "enterLocationButton"
      );

    if (
      !this.elements.screen ||
      !this.elements.currentButton ||
      !this.elements.manualButton
    ) {

      console.warn(
        "Location UI elements were not found."
      );

      return false;
    }

    this.createStatusElement();
    this.createManualDialog();

    this.elements.currentButton
      .addEventListener(
        "click",
        () => {
          this.handleCurrentLocation();
        }
      );

    this.elements.manualButton
      .addEventListener(
        "click",
        () => {
          this.openManualDialog();
        }
      );

    this.restoreSavedState();

    console.log(
      "ApnaBite Location UI initialized."
    );

    return true;
  },


  /*
   * ----------------------------------------------------------
   * CREATE STATUS
   * ----------------------------------------------------------
   */

  createStatusElement() {

    const existing =
      document.getElementById(
        "locationStatus"
      );

    if (existing) {

      this.elements.status =
        existing;

      return;
    }

    const status =
      document.createElement(
        "div"
      );

    status.id =
      "locationStatus";

    status.className =
      "location-status hidden";

    status.setAttribute(
      "role",
      "status"
    );

    status.setAttribute(
      "aria-live",
      "polite"
    );

    const actions =
      document.querySelector(
        ".location-actions"
      );

    actions.insertAdjacentElement(
      "afterend",
      status
    );

    this.elements.status =
      status;
  },


  /*
   * ----------------------------------------------------------
   * CREATE MANUAL LOCATION DIALOG
   * ----------------------------------------------------------
   */

  createManualDialog() {

    const existing =
      document.getElementById(
        "manualLocationDialog"
      );

    if (existing) {

      this.elements.manualDialog =
        existing;

      this.elements.districtSelect =
        document.getElementById(
          "serviceDistrictSelect"
        );

      this.elements.manualSubmitButton =
        document.getElementById(
          "confirmManualLocationButton"
        );

      this.elements.manualError =
        document.getElementById(
          "manualLocationError"
        );

      return;
    }

    const dialog =
      document.createElement(
        "div"
      );

    dialog.id =
      "manualLocationDialog";

    dialog.className =
      "manual-location-dialog hidden";

    dialog.setAttribute(
      "role",
      "dialog"
    );

    dialog.setAttribute(
      "aria-modal",
      "true"
    );

    dialog.setAttribute(
      "aria-labelledby",
      "manualLocationTitle"
    );

    dialog.innerHTML = `
      <div
        class="manual-location-backdrop"
        data-close-manual-location="true"
      ></div>

      <div class="manual-location-sheet">

        <div class="manual-location-handle"></div>

        <div class="manual-location-header">

          <div>
            <h2 id="manualLocationTitle">
              Select service location
            </h2>

            <p>
              Choose an active district where ApnaBite service
              is currently available.
            </p>
          </div>

          <button
            class="manual-location-close"
            id="closeManualLocationButton"
            type="button"
            aria-label="Close manual location"
          >
            &times;
          </button>

        </div>

        <div
          class="manual-location-loading hidden"
          id="manualLocationLoading"
        >
          <span
            class="manual-location-spinner"
            aria-hidden="true"
          ></span>

          <span>
            Loading service locations...
          </span>
        </div>

        <div
          class="manual-location-form"
          id="manualLocationForm"
        >
          <label for="serviceDistrictSelect">
            Service district
          </label>

          <select
            class="location-select"
            id="serviceDistrictSelect"
          >
            <option value="">
              Select your district
            </option>
          </select>

          <p
            class="manual-location-error hidden"
            id="manualLocationError"
            role="alert"
          ></p>

          <button
            class="app-button app-button-primary"
            id="confirmManualLocationButton"
            type="button"
          >
            Confirm Location
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(
      dialog
    );

    this.elements.manualDialog =
      dialog;

    this.elements.districtSelect =
      document.getElementById(
        "serviceDistrictSelect"
      );

    this.elements.manualSubmitButton =
      document.getElementById(
        "confirmManualLocationButton"
      );

    this.elements.manualError =
      document.getElementById(
        "manualLocationError"
      );

    document
      .getElementById(
        "closeManualLocationButton"
      )
      .addEventListener(
        "click",
        () => {
          this.closeManualDialog();
        }
      );

    dialog.addEventListener(
      "click",
      (event) => {

        if (
          event.target.dataset
            .closeManualLocation ===
          "true"
        ) {

          this.closeManualDialog();
        }
      }
    );

    this.elements.manualSubmitButton
      .addEventListener(
        "click",
        () => {
          this.handleManualSelection();
        }
      );

    document.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Escape" &&
          !dialog.classList.contains(
            "hidden"
          )
        ) {

          this.closeManualDialog();
        }
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * RESTORE SAVED STATE
   * ----------------------------------------------------------
   */

  restoreSavedState() {

    const savedDistrict =
      ServiceLocation.getSaved();

    if (savedDistrict) {

      this.setManualButtonLabel(
        savedDistrict.districtName
      );

      this.setSuccess(
        savedDistrict.districtName +
        ", " +
        savedDistrict.state +
        " selected."
      );

      return {
        restored: true,
        mode: "MANUAL",
        district:
          savedDistrict
      };
    }

    const savedDeviceLocation =
      LocationManager.getSaved();

    if (
      savedDeviceLocation &&
      LocationManager.isFresh(
        savedDeviceLocation
      )
    ) {

      this.setCurrentButtonLabel(
        "Update Current Location"
      );

      this.setSuccess(
        "Location is ready. Nearby food options can now be shown."
      );

      return {
        restored: true,
        mode: "DEVICE",
        location:
          savedDeviceLocation
      };
    }

    return {
      restored: false
    };
  },


  /*
   * ----------------------------------------------------------
   * CURRENT DEVICE LOCATION
   * ----------------------------------------------------------
   */

  async handleCurrentLocation() {

    if (
      this.isCurrentRequestRunning
    ) {

      return {
        success: false,
        reason:
          "LOCATION_REQUEST_ALREADY_RUNNING"
      };
    }

    this.isCurrentRequestRunning =
      true;

    this.setCurrentLoading(true);
    this.clearStatus();

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
            persist: true,
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000
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
       * Device location becomes the current selection.
       * Clear an older manual selection.
       */

      ServiceLocation.clear();

      this.setManualButtonLabel(
        "Enter Location Manually"
      );

      this.setCurrentButtonLabel(
        "Update Current Location"
      );

      this.setSuccess(
        "Location detected successfully. Nearby food options can now be shown."
      );

      document.dispatchEvent(
        new CustomEvent(
          "apnabite:location-ready",
          {
            detail: {
              source:
                "DEVICE",
              location:
                location
            }
          }
        )
      );

      console.log(
        "Current Location Selection: PASS"
      );

      return {
        success: true,
        status: "PASS",
        location:
          location
      };

    } catch (error) {

      const displayError =
        this.getLocationError(
          error
        );

      this.setError(
        displayError.message
      );

      console.error(
        "Current Location Selection: FAIL",
        displayError
      );

      return {
        success: false,
        status: "FAIL",
        code:
          displayError.code,
        error:
          displayError.message
      };

    } finally {

      this.isCurrentRequestRunning =
        false;

      this.setCurrentLoading(false);
    }
  },


  /*
   * ----------------------------------------------------------
   * OPEN MANUAL LOCATION
   * ----------------------------------------------------------
   */

  async openManualDialog() {

    const dialog =
      this.elements.manualDialog;

    if (!dialog) {
      return;
    }

    dialog.classList.remove(
      "hidden"
    );

    document.body.classList.add(
      "dialog-open"
    );

    this.clearManualError();

    await this.loadServiceDistricts();
  },


  /*
   * ----------------------------------------------------------
   * CLOSE MANUAL LOCATION
   * ----------------------------------------------------------
   */

  closeManualDialog() {

    if (
      this.isManualRequestRunning
    ) {
      return;
    }

    this.elements.manualDialog
      .classList.add(
        "hidden"
      );

    document.body.classList.remove(
      "dialog-open"
    );

    this.clearManualError();
  },


  /*
   * ----------------------------------------------------------
   * LOAD ACTIVE SERVICE DISTRICTS
   * ----------------------------------------------------------
   */

  async loadServiceDistricts() {

    const loading =
      document.getElementById(
        "manualLocationLoading"
      );

    const form =
      document.getElementById(
        "manualLocationForm"
      );

    loading.classList.remove(
      "hidden"
    );

    form.classList.add(
      "hidden"
    );

    try {

      const result =
        await ServiceLocation
          .getAvailable();

      this.renderDistrictOptions(
        result.districts
      );

      loading.classList.add(
        "hidden"
      );

      form.classList.remove(
        "hidden"
      );

      return result;

    } catch (error) {

      loading.classList.add(
        "hidden"
      );

      form.classList.remove(
        "hidden"
      );

      this.setManualError(
        "Unable to load service locations. Please try again."
      );

      return {
        success: false,
        error:
          error.message
      };
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

    placeholder.value = "";
    placeholder.textContent =
      "Select your district";

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

    const saved =
      ServiceLocation.getSaved();

    if (saved) {

      select.value =
        saved.districtId;
    }
  },


  /*
   * ----------------------------------------------------------
   * CONFIRM MANUAL SELECTION
   * ----------------------------------------------------------
   */

  async handleManualSelection() {

    if (
      this.isManualRequestRunning
    ) {

      return {
        success: false,
        reason:
          "MANUAL_LOCATION_REQUEST_RUNNING"
      };
    }

    const districtId =
      this.elements
        .districtSelect
        .value;

    if (!districtId) {

      this.setManualError(
        "Please select a service district."
      );

      return {
        success: false,
        reason:
          "DISTRICT_REQUIRED"
      };
    }

    this.isManualRequestRunning =
      true;

    this.clearManualError();
    this.setManualLoading(true);

    try {

      const result =
        await ServiceLocation
          .selectDistrict(
            districtId
          );

      const district =
        result.district;

      /*
       * Manual selection becomes current.
       * Remove older device coordinates.
       */

      LocationManager.clear();

      this.setCurrentButtonLabel(
        "Use Current Location"
      );

      this.setManualButtonLabel(
        district.districtName
      );

      this.setSuccess(
        district.districtName +
        ", " +
        district.state +
        " selected successfully."
      );

      this.closeManualDialog();

      console.log(
        "Manual Location Selection: PASS"
      );

      return {
        success: true,
        status: "PASS",
        district:
          district
      };

    } catch (error) {

      this.setManualError(
        error.message ||
        "Unable to select this district."
      );

      console.error(
        "Manual Location Selection: FAIL",
        error
      );

      return {
        success: false,
        status: "FAIL",
        code:
          error.code || "",
        error:
          error.message
      };

    } finally {

      this.isManualRequestRunning =
        false;

      this.setManualLoading(false);
    }
  },


  /*
   * ----------------------------------------------------------
   * BUTTON STATES
   * ----------------------------------------------------------
   */

  setCurrentLoading(isLoading) {

    const button =
      this.elements.currentButton;

    button.disabled =
      isLoading;

    button.setAttribute(
      "aria-busy",
      String(isLoading)
    );

    if (isLoading) {

      button.innerHTML = `
        <span class="location-button-content">
          <span
            class="button-spinner"
            aria-hidden="true"
          ></span>

          <span>
            Detecting Location...
          </span>
        </span>
      `;

      return;
    }

    const saved =
      LocationManager.getSaved();

    this.setCurrentButtonLabel(
      saved
        ? "Update Current Location"
        : "Use Current Location"
    );
  },


  setCurrentButtonLabel(label) {

    this.elements.currentButton
      .innerHTML = `
        <span class="location-button-content">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="3"
            ></circle>

            <path d="M12 2v3"></path>
            <path d="M12 19v3"></path>
            <path d="M2 12h3"></path>
            <path d="M19 12h3"></path>
          </svg>

          <span>
            ${this.escapeHTML(label)}
          </span>

        </span>
      `;
  },


  setManualButtonLabel(label) {

    this.elements.manualButton
      .innerHTML = `
        <span class="location-button-content">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h10"></path>
          </svg>

          <span>
            ${this.escapeHTML(label)}
          </span>

        </span>
      `;
  },


  setManualLoading(isLoading) {

    const button =
      this.elements
        .manualSubmitButton;

    button.disabled =
      isLoading;

    button.textContent =
      isLoading
        ? "Saving Location..."
        : "Confirm Location";
  },


  /*
   * ----------------------------------------------------------
   * MAIN STATUS
   * ----------------------------------------------------------
   */

  clearStatus() {

    this.elements.status.className =
      "location-status hidden";

    this.elements.status.textContent =
      "";
  },


  setSuccess(message) {

    this.elements.status.className =
      "location-status location-status-success";

    this.elements.status.textContent =
      message;
  },


  setError(message) {

    this.elements.status.className =
      "location-status location-status-error";

    this.elements.status.textContent =
      message;
  },


  /*
   * ----------------------------------------------------------
   * MANUAL FORM ERROR
   * ----------------------------------------------------------
   */

  clearManualError() {

    this.elements.manualError
      .classList.add(
        "hidden"
      );

    this.elements.manualError
      .textContent = "";
  },


  setManualError(message) {

    this.elements.manualError
      .textContent =
        message;

    this.elements.manualError
      .classList.remove(
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
      error && error.code
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
        "Unable to detect your location. Please try again."
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
   * SAFE HTML
   * ----------------------------------------------------------
   */

  escapeHTML(value) {

    return String(
      value || ""
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },


  /*
   * ----------------------------------------------------------
   * CURRENT LOCATION TEST
   * ----------------------------------------------------------
   */

  async testCurrentLocation() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE CURRENT LOCATION UI TEST"
    );

    console.log(
      "========================================"
    );

    const result =
      await this.handleCurrentLocation();

    const saved =
      LocationManager.getSaved();

    const passed =
      result.success === true &&
      saved !== null &&
      LocationManager
        .isValidCoordinates(
          saved.latitude,
          saved.longitude
        );

    console.log(
      passed
        ? "Current Location UI Test: PASS"
        : "Current Location UI Test: FAIL"
    );

    return {
      success:
        passed,
      status:
        passed
          ? "PASS"
          : "FAIL",
      permission:
        await LocationManager
          .getPermissionState(),
      locationSaved:
        saved !== null
    };
  },


  /*
   * ----------------------------------------------------------
   * MANUAL LOCATION TEST
   *
   * Browser console:
   * LocationUI.testManualLocation()
   * ----------------------------------------------------------
   */

  async testManualLocation() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE MANUAL LOCATION UI TEST"
    );

    console.log(
      "========================================"
    );

    const previousManual =
      ServiceLocation.getSaved();

    const previousDevice =
      LocationManager.getSaved();

    try {

      const available =
        await ServiceLocation
          .getAvailable();

      if (
        available.count < 1
      ) {

        throw new Error(
          "No active district available."
        );
      }

      const district =
        available.districts[0];

      const result =
        await ServiceLocation
          .selectDistrict(
            district.districtId
          );

      const saved =
        ServiceLocation.getSaved();

      const passed =
        result.success === true &&
        saved !== null &&
        saved.districtName ===
          "Gautam Buddh Nagar" &&
        saved.state ===
          "Uttar Pradesh";

      console.log(
        "Manual District:",
        saved
      );

      console.log(
        passed
          ? "Manual Location UI Test: PASS"
          : "Manual Location UI Test: FAIL"
      );

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        selected:
          saved
      };

    } catch (error) {

      console.error(
        "Manual Location UI Test: FAIL",
        error
      );

      return {
        success: false,
        status: "FAIL",
        error:
          error.message,
        code:
          error.code || ""
      };

    } finally {

      ServiceLocation.clear();
      LocationManager.clear();

      if (previousManual) {

        AppStorage.set(
          ServiceLocation.STORAGE_KEY,
          previousManual
        );
      }

      if (previousDevice) {

        AppStorage.set(
          LocationManager.STORAGE_KEY,
          previousDevice
        );

        LocationManager.current =
          previousDevice;
      }

      this.restoreSavedState();
    }
  }

};


document.addEventListener(
  "DOMContentLoaded",
  () => {

    LocationUI.init();
  }
);
