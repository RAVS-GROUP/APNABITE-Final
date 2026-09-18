/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/location-ui.js
 * PURPOSE: Location screen UI controller
 * VERSION: 1.0.0
 * ============================================================
 */

const LocationUI = {

  elements: {
    screen: null,
    currentButton: null,
    manualButton: null,
    status: null
  },

  isRequestRunning: false,


  /*
   * ----------------------------------------------------------
   * INITIALIZE LOCATION SCREEN
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
      !this.elements.currentButton
    ) {
      console.warn(
        "Location UI elements were not found."
      );

      return false;
    }

    this.createStatusElement();

    this.elements.currentButton
      .addEventListener(
        "click",
        () => {
          this.handleCurrentLocation();
        }
      );

    this.restoreSavedLocationState();

    console.log(
      "ApnaBite Location UI initialized."
    );

    return true;
  },


  /*
   * ----------------------------------------------------------
   * CREATE ACCESSIBLE STATUS ELEMENT
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

      return existing;
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

    if (actions) {

      actions.insertAdjacentElement(
        "afterend",
        status
      );
    }

    this.elements.status =
      status;

    return status;
  },


  /*
   * ----------------------------------------------------------
   * RESTORE SAVED LOCATION UI
   * ----------------------------------------------------------
   */

  restoreSavedLocationState() {

    const savedLocation =
      LocationManager.getSaved();

    if (
      !savedLocation ||
      !LocationManager.isFresh(
        savedLocation
      )
    ) {
      return {
        restored: false
      };
    }

    this.setSuccess(
      "Location is ready. Nearby food options can now be shown."
    );

    this.setButtonLabel(
      "Update Current Location"
    );

    return {
      restored: true,
      location:
        savedLocation
    };
  },


  /*
   * ----------------------------------------------------------
   * CURRENT LOCATION BUTTON
   * ----------------------------------------------------------
   */

  async handleCurrentLocation() {

    if (this.isRequestRunning) {

      return {
        success: false,
        reason:
          "LOCATION_REQUEST_ALREADY_RUNNING"
      };
    }

    this.isRequestRunning =
      true;

    this.setLoading(true);

    this.clearStatus();

    try {

      const permissionState =
        await LocationManager
          .getPermissionState();

      if (
        permissionState ===
        "denied"
      ) {
        throw LocationManager.createError(
          "Location permission is blocked. Allow location access in your browser settings and try again.",
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
              10000,
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
        throw LocationManager.createError(
          "The device returned an invalid location.",
          "INVALID_LOCATION"
        );
      }

      this.setSuccess(
        "Location detected successfully. Nearby food options can now be shown."
      );

      this.setButtonLabel(
        "Update Current Location"
      );

      /*
       * Notify future customer/discovery modules.
       */
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

      const normalizedError =
        this.getDisplayError(
          error
        );

      this.setError(
        normalizedError.message
      );

      console.error(
        "Current Location Selection: FAIL",
        {
          code:
            normalizedError.code,
          message:
            normalizedError.message
        }
      );

      return {
        success: false,
        status: "FAIL",
        code:
          normalizedError.code,
        error:
          normalizedError.message
      };

    } finally {

      this.isRequestRunning =
        false;

      this.setLoading(false);
    }
  },


  /*
   * ----------------------------------------------------------
   * LOADING STATE
   * ----------------------------------------------------------
   */

  setLoading(isLoading) {

    const button =
      this.elements.currentButton;

    if (!button) {
      return;
    }

    button.disabled =
      isLoading;

    button.setAttribute(
      "aria-busy",
      String(isLoading)
    );

    if (isLoading) {

      button.classList.add(
        "is-loading"
      );

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

    button.classList.remove(
      "is-loading"
    );

    const savedLocation =
      LocationManager.getSaved();

    this.setButtonLabel(
      savedLocation
        ? "Update Current Location"
        : "Use Current Location"
    );
  },


  /*
   * ----------------------------------------------------------
   * UPDATE BUTTON LABEL
   * ----------------------------------------------------------
   */

  setButtonLabel(label) {

    const button =
      this.elements.currentButton;

    if (!button) {
      return;
    }

    button.innerHTML = `
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


  /*
   * ----------------------------------------------------------
   * STATUS STATES
   * ----------------------------------------------------------
   */

  clearStatus() {

    const status =
      this.elements.status;

    if (!status) {
      return;
    }

    status.className =
      "location-status hidden";

    status.textContent =
      "";
  },


  setSuccess(message) {

    const status =
      this.elements.status;

    if (!status) {
      return;
    }

    status.className =
      "location-status location-status-success";

    status.textContent =
      message;
  },


  setError(message) {

    const status =
      this.elements.status;

    if (!status) {
      return;
    }

    status.className =
      "location-status location-status-error";

    status.textContent =
      message;
  },


  /*
   * ----------------------------------------------------------
   * USER-FRIENDLY ERRORS
   * ----------------------------------------------------------
   */

  getDisplayError(error) {

    const code =
      error && error.code
        ? error.code
        : "LOCATION_ERROR";

    const messages = {

      LOCATION_PERMISSION_DENIED:
        "Location permission is blocked. Allow location access in your browser settings and try again.",

      LOCATION_UNAVAILABLE:
        "Your current location is unavailable. Check location services and try again.",

      LOCATION_TIMEOUT:
        "Location detection took too long. Please try again.",

      LOCATION_UNSUPPORTED:
        "Location is not supported on this device or browser.",

      INVALID_LOCATION:
        "The device returned an invalid location. Please try again.",

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
   * SAFE TEXT FOR GENERATED HTML
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
   * LIVE UI TEST
   *
   * Browser console:
   * LocationUI.testCurrentLocation()
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

    if (
      !this.elements.currentButton ||
      !this.elements.status
    ) {
      console.error(
        "Current Location UI Test: FAIL"
      );

      return {
        success: false,
        status: "FAIL",
        error:
          "LOCATION_UI_NOT_INITIALIZED"
      };
    }

    const result =
      await this.handleCurrentLocation();

    const savedLocation =
      LocationManager.getSaved();

    const passed =
      result.success === true &&
      savedLocation !== null &&
      LocationManager.isValidCoordinates(
        savedLocation.latitude,
        savedLocation.longitude
      ) &&
      this.elements.status.classList
        .contains(
          "location-status-success"
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
        savedLocation !== null,
      result:
        result
    };
  }

};


/*
 * ------------------------------------------------------------
 * INITIALIZE AFTER DOM LOAD
 * ------------------------------------------------------------
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    LocationUI.init();
  }
);
