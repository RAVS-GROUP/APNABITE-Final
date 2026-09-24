/**
 * ============================================================
 * APNABITE CUSTOMER
 * FILE: customer/js/serviceability-guard.js
 * PURPOSE: Validate customer service district on page startup
 * VERSION: 1.0.0
 * ============================================================
 *
 * - Validates saved district against live Admin controls
 * - Clears district when state/district becomes inactive
 * - Prevents stale district service
 * - Updates customer location display
 * - Notifies CustomerHome after validation
 * - Duplicate initialization protected
 * ============================================================
 */

const CustomerServiceabilityGuard = {

  state: {

    initialized:
      false,

    validating:
      false,

    ready:
      false,

    result:
      null,

    promise:
      null
  },


  elements: {},


  /**
   * ==========================================================
   * INITIALIZE
   * ==========================================================
   */

  init() {

    if (
      this.state.initialized &&
      this.state.promise
    ) {
      return this.state.promise;
    }


    this.state.initialized =
      true;


    this.elements = {

      locationButton:
        document.getElementById(
          "customerLocationButton"
        ),

      locationText:
        document.getElementById(
          "customerLocationText"
        ),

      message:
        document.getElementById(
          "roleHomeMessage"
        ),

      kitchenList:
        document.getElementById(
          "kitchenList"
        ),

      kitchenEmptyState:
        document.getElementById(
          "kitchenEmptyState"
        ),

      kitchenEmptyTitle:
        document.getElementById(
          "kitchenEmptyTitle"
        ),

      kitchenEmptyDescription:
        document.getElementById(
          "kitchenEmptyDescription"
        ),

      kitchenCount:
        document.getElementById(
          "nearbyKitchenCount"
        ),

      loadMoreWrap:
        document.getElementById(
          "kitchenLoadMoreWrap"
        )
    };


    this.bindEvents();


    this.state.promise =
      this.validate();


    window.CustomerServiceabilityReady =
      this.state.promise;


    return this.state.promise;
  },


  /**
   * ==========================================================
   * EVENTS
   * ==========================================================
   */

  bindEvents() {

    window.addEventListener(
      "apnabite:service-location-ready",
      (event) => {

        const detail =
          event.detail || {};


        if (detail.district) {

          this.applyValidDistrict(
            detail.district
          );
        }
      }
    );


    window.addEventListener(
      "apnabite:service-location-invalid",
      (event) => {

        this.applyInvalidDistrict(
          event.detail || {}
        );
      }
    );


    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.visibilityState ===
          "visible" &&
          this.state.ready
        ) {

          this.validate({
            force:
              true,

            background:
              true
          });
        }
      }
    );
  },


  /**
   * ==========================================================
   * VALIDATE
   * ==========================================================
   */

  async validate(options = {}) {

    if (
      this.state.validating &&
      this.state.promise
    ) {
      return this.state.promise;
    }


    if (
      typeof ServiceLocation ===
      "undefined" ||
      typeof ServiceLocation
        .validateSaved !==
        "function"
    ) {

      const unavailableResult = {

        success:
          false,

        valid:
          false,

        selected:
          false,

        reason:
          "SERVICE_LOCATION_MODULE_UNAVAILABLE"
      };


      this.complete(
        unavailableResult
      );


      return unavailableResult;
    }


    this.state.validating =
      true;


    try {

      const result =
        await ServiceLocation
          .validateSaved({
            force:
              options.force === true,

            clearInvalid:
              true
          });


      this.state.result =
        result;


      if (
        result &&
        result.valid === true &&
        result.district
      ) {

        this.applyValidDistrict(
          result.district
        );

      } else if (
        result &&
        result.selected === true
      ) {

        this.applyInvalidDistrict({
          reason:
            result.reason,

          message:
            result.message,

          district:
            result.district,

          cleared:
            result.cleared
        });

      } else {

        this.applyNoDistrict();
      }


      this.complete(
        result
      );


      return result;

    } catch (error) {

      console.error(
        "Customer serviceability validation failed:",
        error
      );


      const failedResult = {

        success:
          false,

        valid:
          false,

        selected:
          Boolean(
            ServiceLocation.getSaved()
          ),

        reason:
          error.code ||
          "SERVICEABILITY_VALIDATION_FAILED",

        message:
          error.message ||
          "Service location could not be verified."
      };


      /*
       * Network failure does not automatically clear a valid
       * local selection. Only authoritative inactive response
       * clears it through ServiceLocation.validateSaved().
       */

      this.showMessage(
        "Service area could not be refreshed. Please check your connection.",
        "warning"
      );


      this.complete(
        failedResult
      );


      return failedResult;

    } finally {

      this.state.validating =
        false;
    }
  },


  /**
   * ==========================================================
   * VALID DISTRICT
   * ==========================================================
   */

  applyValidDistrict(district) {

    const normalized =
      ServiceLocation.normalizeDistrict(
        district
      );


    if (!normalized) {
      return;
    }


    const label =
      [
        normalized.districtName,
        normalized.state
      ]
        .filter(Boolean)
        .join(", ");


    if (
      this.elements.locationText &&
      label
    ) {

      this.elements.locationText
        .textContent =
          label;
    }


    if (
      this.elements.locationButton
    ) {

      this.elements.locationButton
        .classList.remove(
          "service-location-invalid"
        );


      this.elements.locationButton
        .setAttribute(
          "data-serviceable",
          "true"
        );


      this.elements.locationButton
        .setAttribute(
          "aria-label",
          "Delivering to " + label
        );
    }


    document.documentElement
      .setAttribute(
        "data-serviceability",
        "active"
      );


    this.dispatchDocumentEvent(
      "apnabite:customer-serviceability-ready",
      {
        success:
          true,

        valid:
          true,

        district:
          normalized
      }
    );
  },


  /**
   * ==========================================================
   * INVALID DISTRICT
   * ==========================================================
   */

  applyInvalidDistrict(detail = {}) {

    this.clearCustomerLocationCaches();


    if (
      this.elements.locationText
    ) {

      this.elements.locationText
        .textContent =
          "Select an available location";
    }


    if (
      this.elements.locationButton
    ) {

      this.elements.locationButton
        .classList.add(
          "service-location-invalid"
        );


      this.elements.locationButton
        .setAttribute(
          "data-serviceable",
          "false"
        );


      this.elements.locationButton
        .setAttribute(
          "aria-label",
          "Select an available delivery location"
        );
    }


    document.documentElement
      .setAttribute(
        "data-serviceability",
        "inactive"
      );


    this.clearKitchenDisplay();


    this.showMessage(
      "ApnaBite service is currently unavailable in your previous district. Please select an active location.",
      "warning"
    );


    this.dispatchDocumentEvent(
      "apnabite:customer-serviceability-invalid",
      {
        success:
          true,

        valid:
          false,

        reason:
          detail.reason ||
          "DISTRICT_NOT_ACTIVE",

        district:
          detail.district ||
          null,

        cleared:
          detail.cleared === true
      }
    );
  },


  /**
   * ==========================================================
   * NO SAVED DISTRICT
   * ==========================================================
   */

  applyNoDistrict() {

    if (
      this.elements.locationButton
    ) {

      this.elements.locationButton
        .setAttribute(
          "data-serviceable",
          "unknown"
        );
    }


    document.documentElement
      .setAttribute(
        "data-serviceability",
        "unselected"
      );


    this.dispatchDocumentEvent(
      "apnabite:customer-serviceability-unselected",
      {
        success:
          true,

        valid:
          false,

        reason:
          "NO_SAVED_DISTRICT"
      }
    );
  },


  /**
   * ==========================================================
   * CLEAR STALE CUSTOMER CACHE
   * ==========================================================
   */

  clearCustomerLocationCaches() {

    const keys = [

      "apnabite_home_resolved_location",

      "apnabite_home_kitchen_discovery"

    ];


    keys.forEach(
      (key) => {

        try {

          AppStorage.remove(
            key
          );

        } catch (error) {

          console.warn(
            "Customer location cache could not be cleared:",
            key,
            error
          );
        }
      }
    );
  },


  /**
   * ==========================================================
   * CLEAR STALE KITCHEN DISPLAY
   * ==========================================================
   */

  clearKitchenDisplay() {

    if (
      this.elements.kitchenList
    ) {

      this.elements.kitchenList
        .innerHTML = "";
    }


    if (
      this.elements.kitchenCount
    ) {

      this.elements.kitchenCount
        .textContent =
          "0";


      this.elements.kitchenCount
        .classList.add(
          "hidden"
        );
    }


    if (
      this.elements.loadMoreWrap
    ) {

      this.elements.loadMoreWrap
        .classList.add(
          "hidden"
        );
    }


    if (
      this.elements.kitchenEmptyTitle
    ) {

      this.elements.kitchenEmptyTitle
        .textContent =
          "Select an active service location";
    }


    if (
      this.elements.kitchenEmptyDescription
    ) {

      this.elements.kitchenEmptyDescription
        .textContent =
          "Available kitchens will appear after you select an active district.";
    }


    if (
      this.elements.kitchenEmptyState
    ) {

      this.elements.kitchenEmptyState
        .classList.remove(
          "hidden"
        );
    }
  },


  /**
   * ==========================================================
   * MESSAGE
   * ==========================================================
   */

  showMessage(
    message,
    type = "info"
  ) {

    if (
      !this.elements.message
    ) {
      return;
    }


    this.elements.message
      .textContent =
        message;


    this.elements.message
      .classList.remove(
        "hidden",
        "success",
        "error",
        "warning"
      );


    this.elements.message
      .classList.add(
        type
      );
  },


  /**
   * ==========================================================
   * COMPLETE
   * ==========================================================
   */

  complete(result) {

    this.state.ready =
      true;


    this.state.result =
      result;


    document.documentElement
      .setAttribute(
        "data-serviceability-ready",
        "true"
      );
  },


  /**
   * ==========================================================
   * DOCUMENT EVENT
   * ==========================================================
   */

  dispatchDocumentEvent(
    eventName,
    detail
  ) {

    try {

      document.dispatchEvent(
        new CustomEvent(
          eventName,
          {
            detail:
              detail || {}
          }
        )
      );

    } catch (error) {

      console.warn(
        "Customer serviceability event failed:",
        error
      );
    }
  },


  /**
   * ==========================================================
   * TEST
   *
   * Browser console:
   *
   * await CustomerServiceabilityGuard.test()
   * ==========================================================
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE CUSTOMER SERVICEABILITY GUARD TEST"
    );

    console.log(
      "========================================"
    );


    const result =
      await this.validate({
        force:
          true,

        background:
          false
      });


    const saved =
      ServiceLocation.getSaved();


    const results = [

      {
        test:
          "ServiceLocation module",

        expected:
          true,

        actual:
          typeof ServiceLocation !==
          "undefined",

        passed:
          typeof ServiceLocation !==
          "undefined"
      },

      {
        test:
          "Guard initialized",

        expected:
          true,

        actual:
          this.state.initialized,

        passed:
          this.state.initialized ===
          true
      },

      {
        test:
          "Guard ready",

        expected:
          true,

        actual:
          this.state.ready,

        passed:
          this.state.ready ===
          true
      },

      {
        test:
          "Validation completed",

        expected:
          true,

        actual:
          Boolean(result),

        passed:
          Boolean(result)
      },

      {
        test:
          "Saved district remains authoritative",

        expected:
          true,

        actual:
          !saved ||
          (
            saved.effectiveServiceStatus ===
              "ACTIVE" &&
            saved.customerVisibility ===
              "LIVE"
          ),

        passed:
          !saved ||
          (
            saved.effectiveServiceStatus ===
              "ACTIVE" &&
            saved.customerVisibility ===
              "LIVE"
          )
      },

      {
        test:
          "Page serviceability state",

        expected:
          true,

        actual:
          Boolean(
            document.documentElement
              .getAttribute(
                "data-serviceability"
              )
          ),

        passed:
          Boolean(
            document.documentElement
              .getAttribute(
                "data-serviceability"
              )
          )
      }

    ];


    const passed =
      results.every(
        (item) =>
          item.passed
      );


    console.table(
      results
    );


    console.log(
      passed
        ? "Customer Serviceability Guard Test: PASS"
        : "Customer Serviceability Guard Test: FAIL"
    );


    return {

      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      validation:
        result,

      savedDistrict:
        saved,

      pageState:
        document.documentElement
          .getAttribute(
            "data-serviceability"
          ),

      results:
        results
    };
  }

};


/**
 * ============================================================
 * START
 * ============================================================
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    CustomerServiceabilityGuard
      .init();
  }
);
