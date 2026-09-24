/**
 * ============================================================
 * APNABITE SHARED
 * FILE: shared/js/service-location.js
 * PURPOSE: Customer service-location and district validation
 * VERSION: 2.0.0
 * ============================================================
 *
 * FEATURES:
 *
 * - Public active district search
 * - State-aware district validation
 * - Saved district management
 * - Automatic inactive-location rejection
 * - Duplicate validation protection
 * - Service rule normalization
 * - Backward-compatible public methods
 * - Non-destructive integration test
 * ============================================================
 */

const ServiceLocation = {

  STORAGE_KEY:
    "apnabite_service_location",

  VALIDATION_CACHE_MS:
    60 * 1000,


  state: {

    validationPromise:
      null,

    lastValidatedDistrictId:
      "",

    lastValidatedAt:
      0
  },


  /**
   * ==========================================================
   * NORMALIZE DISTRICT
   * ==========================================================
   */

  normalizeDistrict(district) {

    if (
      !district ||
      typeof district !== "object"
    ) {
      return null;
    }


    const districtId =
      String(
        district.districtId ||
        district.DistrictID ||
        ""
      ).trim();


    const districtName =
      String(
        district.districtName ||
        district.DistrictName ||
        ""
      ).trim();


    const state =
      String(
        district.state ||
        district.State ||
        ""
      ).trim();


    if (
      !districtId ||
      !districtName ||
      !state
    ) {
      return null;
    }


    const serviceStatus =
      String(
        district.serviceStatus ||
        district.ServiceStatus ||
        "INACTIVE"
      )
        .trim()
        .toUpperCase();


    const effectiveServiceStatus =
      String(
        district.effectiveServiceStatus ||
        district.EffectiveServiceStatus ||
        serviceStatus
      )
        .trim()
        .toUpperCase();


    const customerVisibility =
      String(
        district.customerVisibility ||
        district.CustomerVisibility ||
        (
          effectiveServiceStatus === "ACTIVE"
            ? "LIVE"
            : "COMING_SOON"
        )
      )
        .trim()
        .toUpperCase();


    return {

      districtId:
        districtId,

     stateCode:
  this.resolveStateCode(
    district
  ),

      state:
        state,

      districtName:
        districtName,

      serviceStatus:
        serviceStatus,

      effectiveServiceStatus:
        effectiveServiceStatus,

      customerVisibility:
        customerVisibility,

      serviceRadiusKm:
        this.safeNumber(
          district.serviceRadiusKm ??
          district.ServiceRadiusKm
        ),

      deliveryFeePerKm:
        this.safeNumber(
          district.deliveryFeePerKm ??
          district.DeliveryFeePerKm
        ),

      minimumDeliveryFee:
        this.safeNumber(
          district.minimumDeliveryFee ??
          district.MinimumDeliveryFee
        ),

      longDistanceEnabled:
        this.toBoolean(
          district.longDistanceEnabled ??
          district.LongDistanceEnabled
        ),

      lgdStateCode:
        String(
          district.lgdStateCode ||
          district.LGDStateCode ||
          ""
        ).trim(),

      lgdDistrictCode:
        String(
          district.lgdDistrictCode ||
          district.LGDDistrictCode ||
          ""
        ).trim(),

      selectionSource:
        String(
          district.selectionSource ||
          "SERVICE_DIRECTORY"
        ).trim(),

      selectedAt:
        district.selectedAt ||
        "",

      validatedAt:
        district.validatedAt ||
        ""
    };
  },


  /**
   * ==========================================================
   * SAVE LOCATION
   * ==========================================================
   */

  save(district) {

    const normalized =
      this.normalizeDistrict(
        district
      );


    if (!normalized) {

      throw this.createError(
        "INVALID_DISTRICT",
        "A valid service district is required."
      );
    }


    if (
      normalized.effectiveServiceStatus !==
        "ACTIVE" ||
      normalized.customerVisibility !==
        "LIVE"
    ) {

      throw this.createError(
        "DISTRICT_NOT_ACTIVE",
        "Service is currently unavailable in this district."
      );
    }


    const existing =
      this.getSaved();


    const savedDistrict = {

      ...normalized,

      selectionSource:
        normalized.selectionSource ||
        (
          existing
            ? existing.selectionSource
            : "MANUAL"
        ),

      selectedAt:
        normalized.selectedAt ||
        (
          existing
            ? existing.selectedAt
            : ""
        ) ||
        new Date().toISOString(),

      validatedAt:
        normalized.validatedAt ||
        new Date().toISOString()
    };


    AppStorage.set(
      this.STORAGE_KEY,
      savedDistrict
    );


    return savedDistrict;
  },


  /**
   * ==========================================================
   * GET SAVED LOCATION
   * ==========================================================
   */

  getSaved() {

    try {

      const saved =
        AppStorage.get(
          this.STORAGE_KEY
        );


      if (
        !saved ||
        typeof saved !== "object"
      ) {
        return null;
      }


      return this.normalizeDistrict(
        saved
      );

    } catch (error) {

      console.warn(
        "Saved service location could not be read:",
        error
      );


      return null;
    }
  },


  /**
   * ==========================================================
   * CLEAR LOCATION
   * ==========================================================
   */

  clear(options = {}) {

    const previousDistrict =
      this.getSaved();


    try {

      AppStorage.remove(
        this.STORAGE_KEY
      );

    } catch (error) {

      console.warn(
        "Service location could not be cleared:",
        error
      );
    }


    this.state.lastValidatedDistrictId =
      "";

    this.state.lastValidatedAt =
      0;


    if (options.notify === true) {

      this.dispatch(
        "apnabite:service-location-invalid",
        {
          reason:
            options.reason ||
            "SERVICE_LOCATION_CLEARED",

          district:
            previousDistrict
        }
      );
    }


    return true;
  },


  /**
   * ==========================================================
   * SELECTION STATUS
   * ==========================================================
   */

  isSelected() {

    const saved =
      this.getSaved();


    return Boolean(
      saved &&
      saved.districtId
    );
  },


  /**
   * ==========================================================
   * PUBLIC DISTRICT SEARCH
   * ==========================================================
   */

  async search(query = "") {

    const response =
      await API.request(
        "search_service_locations",
        {
          query:
            String(query || "")
              .trim()
        },
        {
          timeoutMs:
            30000
        }
      );


    const data =
      this.getResponseData(
        response
      );


    if (
      data.success !== true
    ) {

      throw this.createError(
        data.reason ||
        data.error ||
        "DISTRICT_SEARCH_FAILED",

        data.message ||
        "Service locations could not be loaded."
      );
    }


    const districts =
      Array.isArray(data.districts)
        ? data.districts
        : [];


    return districts
      .map(
        (district) =>
          this.normalizeDistrict(
            district
          )
      )
      .filter(
        (district) =>
          Boolean(
            district &&
            district.effectiveServiceStatus ===
              "ACTIVE" &&
            district.customerVisibility ===
              "LIVE"
          )
      );
  },


  /**
   * ==========================================================
   * GET ALL AVAILABLE DISTRICTS
   *
   * Existing customer pages use this method.
   * ==========================================================
   */

  getAvailable() {

    return this.search("");
  },


  /**
   * ==========================================================
   * GET AUTHORITATIVE DISTRICT
   * ==========================================================
   */

  async getDistrict(districtId) {

    const normalizedId =
      String(
        districtId || ""
      ).trim();


    if (!normalizedId) {

      throw this.createError(
        "DISTRICT_ID_REQUIRED",
        "District ID is required."
      );
    }


    let response;


    try {

      response =
        await API.request(
          "get_district_service",
          {
            districtId:
              normalizedId
          },
          {
            timeoutMs:
              30000
          }
        );

    } catch (error) {

      throw this.normalizeApiError(
        error,
        "DISTRICT_NOT_ACTIVE",
        "Service is currently unavailable in this district."
      );
    }


    const data =
      this.getResponseData(
        response
      );


    if (
      data.success !== true
    ) {

      throw this.createError(
        data.reason ||
        data.error ||
        "DISTRICT_NOT_ACTIVE",

        data.message ||
        "Service is currently unavailable in this district.",

        data
      );
    }


    const normalized =
      this.normalizeDistrict(
        data.district || data
      );


    if (!normalized) {

      throw this.createError(
        "INVALID_DISTRICT_RESPONSE",
        "District service response is invalid."
      );
    }


    if (
      normalized.effectiveServiceStatus !==
        "ACTIVE" ||
      normalized.customerVisibility !==
        "LIVE"
    ) {

      throw this.createError(
        "DISTRICT_NOT_ACTIVE",
        "Service is currently unavailable in this district.",
        {
          district:
            normalized
        }
      );
    }


    return normalized;
  },


  /**
   * ==========================================================
   * SELECT DISTRICT
   * ==========================================================
   */

  async selectDistrict(
    districtId,
    options = {}
  ) {

    const district =
      await this.getDistrict(
        districtId
      );


    const saved =
      this.save({
        ...district,

        selectionSource:
          options.source ||
          district.selectionSource ||
          "MANUAL",

        selectedAt:
          new Date().toISOString(),

        validatedAt:
          new Date().toISOString()
      });


    this.state.lastValidatedDistrictId =
      saved.districtId;

    this.state.lastValidatedAt =
      Date.now();


    this.dispatch(
      "apnabite:service-location-ready",
      {
        district:
          saved,

        revalidated:
          false
      }
    );


    return saved;
  },


  /**
   * ==========================================================
   * VALIDATE SAVED DISTRICT
   *
   * This method must be called when a customer-facing page
   * opens.
   *
   * It checks the saved district against live Admin controls.
   * ==========================================================
   */

  async validateSaved(options = {}) {

    const saved =
      this.getSaved();


    if (!saved) {

      return {
        success:
          true,

        selected:
          false,

        valid:
          false,

        cleared:
          false,

        reason:
          "NO_SAVED_DISTRICT",

        district:
          null
      };
    }


    const force =
      options.force === true;


    const clearInvalid =
      options.clearInvalid !== false;


    const recentlyValidated =
      !force &&
      this.state.lastValidatedDistrictId ===
        saved.districtId &&
      (
        Date.now() -
        this.state.lastValidatedAt
      ) <
        this.VALIDATION_CACHE_MS;


    if (recentlyValidated) {

      return {
        success:
          true,

        selected:
          true,

        valid:
          true,

        cleared:
          false,

        cached:
          true,

        reason:
          "",

        district:
          saved
      };
    }


    if (
      this.state.validationPromise
    ) {

      return this.state
        .validationPromise;
    }


    this.state.validationPromise =
      this.performSavedValidation(
        saved,
        {
          clearInvalid:
            clearInvalid
        }
      )
        .finally(
          () => {

            this.state.validationPromise =
              null;
          }
        );


    return this.state
      .validationPromise;
  },


  async performSavedValidation(
    saved,
    options
  ) {

    try {

      const authoritative =
        await this.getDistrict(
          saved.districtId
        );


      const validated =
        this.save({
          ...authoritative,

          selectionSource:
            saved.selectionSource ||
            authoritative.selectionSource ||
            "SAVED_LOCATION",

          selectedAt:
            saved.selectedAt ||
            new Date().toISOString(),

          validatedAt:
            new Date().toISOString()
        });


      this.state.lastValidatedDistrictId =
        validated.districtId;

      this.state.lastValidatedAt =
        Date.now();


      this.dispatch(
        "apnabite:service-location-ready",
        {
          district:
            validated,

          revalidated:
            true
        }
      );


      return {
        success:
          true,

        selected:
          true,

        valid:
          true,

        cleared:
          false,

        cached:
          false,

        reason:
          "",

        district:
          validated
      };

    } catch (error) {

      const reason =
        error.code ||
        error.reason ||
        "DISTRICT_NOT_ACTIVE";


      if (
        options.clearInvalid === true
      ) {

        this.clear({
          notify:
            false
        });
      }


      this.dispatch(
        "apnabite:service-location-invalid",
        {
          reason:
            reason,

          message:
            error.message ||
            "Service is no longer available in the selected district.",

          district:
            saved,

          cleared:
            options.clearInvalid === true
        }
      );


      return {
        success:
          true,

        selected:
          true,

        valid:
          false,

        cleared:
          options.clearInvalid === true,

        cached:
          false,

        reason:
          reason,

        message:
          error.message ||
          "Service is no longer available in the selected district.",

        district:
          saved
      };
    }
  },


  /**
   * ==========================================================
   * REQUIRE VALID SAVED LOCATION
   *
   * Useful before checkout, placing an order or loading
   * district-specific inventory.
   * ==========================================================
   */

  async requireValidSaved(options = {}) {

    const result =
      await this.validateSaved({
        force:
          options.force !== false,

        clearInvalid:
          options.clearInvalid !== false
      });


    if (
      result.valid !== true ||
      !result.district
    ) {

      throw this.createError(
        result.reason ||
        "SERVICE_LOCATION_REQUIRED",

        result.message ||
        "Please select an available service district.",

        result
      );
    }


    return result.district;
  },


  /**
   * ==========================================================
   * RESPONSE HELPERS
   * ==========================================================
   */

  getResponseData(response) {

    if (
      response &&
      response.data &&
      typeof response.data === "object"
    ) {
      return response.data;
    }


    if (
      response &&
      typeof response === "object"
    ) {
      return response;
    }


    return {};
  },


  normalizeApiError(
    error,
    fallbackCode,
    fallbackMessage
  ) {

    if (
      error &&
      error.code
    ) {
      return error;
    }


    const code =
      error &&
      (
        error.reason ||
        error.error ||
        (
          error.data &&
          (
            error.data.reason ||
            error.data.error
          )
        )
      )
        ? (
            error.reason ||
            error.error ||
            error.data.reason ||
            error.data.error
          )
        : fallbackCode;


    const message =
      error &&
      error.message
        ? error.message
        : fallbackMessage;


    return this.createError(
      code,
      message,
      error
    );
  },


  createError(
    code,
    message,
    details = null
  ) {

    const error =
      new Error(
        message ||
        code ||
        "Service location error."
      );


    error.code =
      code ||
      "SERVICE_LOCATION_ERROR";


    error.reason =
      error.code;


    error.details =
      details;


    return error;
  },


  /**
   * ==========================================================
   * EVENT HELPER
   * ==========================================================
   */

  dispatch(
    eventName,
    detail
  ) {

    try {

      window.dispatchEvent(
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
        "Service location event could not be dispatched:",
        error
      );
    }
  },

  /**
   * ==========================================================
   * RESOLVE STATE CODE
   * ==========================================================
   */

  resolveStateCode(district) {

    if (
      !district ||
      typeof district !== "object"
    ) {
      return "";
    }


    const directCode =
      String(
        district.stateCode ||
        district.StateCode ||
        district.state_code ||
        district.STATE_CODE ||
        ""
      )
        .trim()
        .toUpperCase();


    if (directCode) {
      return directCode;
    }


    const stateId =
      String(
        district.stateId ||
        district.StateID ||
        district.stateID ||
        district.STATE_ID ||
        ""
      )
        .trim()
        .toUpperCase();


    if (
      stateId.startsWith(
        "STATE_"
      )
    ) {

      return stateId
        .replace(
          /^STATE_/,
          ""
        )
        .trim();
    }


    const stateName =
      String(
        district.state ||
        district.State ||
        ""
      )
        .trim()
        .toLowerCase();


    const stateCodes = {

      "andaman and nicobar islands": "AN",
      "andhra pradesh": "AP",
      "arunachal pradesh": "AR",
      "assam": "AS",
      "bihar": "BR",
      "chandigarh": "CH",
      "chhattisgarh": "CG",
      "dadra and nagar haveli and daman and diu": "DN",
      "delhi": "DL",
      "goa": "GA",
      "gujarat": "GJ",
      "haryana": "HR",
      "himachal pradesh": "HP",
      "jammu and kashmir": "JK",
      "jharkhand": "JH",
      "karnataka": "KA",
      "kerala": "KL",
      "ladakh": "LA",
      "lakshadweep": "LD",
      "madhya pradesh": "MP",
      "maharashtra": "MH",
      "manipur": "MN",
      "meghalaya": "ML",
      "mizoram": "MZ",
      "nagaland": "NL",
      "odisha": "OD",
      "puducherry": "PY",
      "punjab": "PB",
      "rajasthan": "RJ",
      "sikkim": "SK",
      "tamil nadu": "TN",
      "telangana": "TS",
      "tripura": "TR",
      "uttar pradesh": "UP",
      "uttarakhand": "UK",
      "west bengal": "WB"
    };


    return stateCodes[stateName] || "";
  },
  
  /**
   * ==========================================================
   * VALUE HELPERS
   * ==========================================================
   */

  safeNumber(value) {

    const number =
      Number(value);


    return Number.isFinite(number)
      ? number
      : 0;
  },


  toBoolean(value) {

    if (
      value === true ||
      value === 1
    ) {
      return true;
    }


    const normalized =
      String(value || "")
        .trim()
        .toUpperCase();


    return [
      "TRUE",
      "YES",
      "Y",
      "1",
      "ENABLED",
      "ACTIVE"
    ].includes(normalized);
  },


  /**
   * ==========================================================
   * LIVE INTEGRATION TEST
   *
   * Browser console:
   *
   * await ServiceLocation.test()
   * ==========================================================
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE PHASE 4 SERVICE LOCATION TEST"
    );

    console.log(
      "========================================"
    );


    let previousRecord =
      null;


    let previousRecordExists =
      false;


    try {

      previousRecord =
        AppStorage.get(
          this.STORAGE_KEY
        );


      previousRecordExists =
        Boolean(previousRecord);

    } catch (error) {

      console.warn(
        "Previous service location snapshot unavailable:",
        error
      );
    }


    let districts = [];

    let authoritativeDistrict =
      null;

    let savedDistrict =
      null;

    let validationResult =
      null;

    let testError =
      null;


    try {

      districts =
        await this.getAvailable();


      const sampleDistrict =
        districts.length > 0
          ? districts[0]
          : null;


      if (sampleDistrict) {

        authoritativeDistrict =
          await this.getDistrict(
            sampleDistrict.districtId
          );


        savedDistrict =
          this.save({
            ...authoritativeDistrict,

            selectionSource:
              "PHASE_4_TEST",

            selectedAt:
              new Date().toISOString()
          });


        validationResult =
          await this.validateSaved({
            force:
              true,

            clearInvalid:
              false
          });
      }

    } catch (error) {

      testError =
        error;


      console.error(
        "Service location test failed:",
        error
      );

    } finally {

      try {

        if (
          previousRecordExists &&
          previousRecord
        ) {

          AppStorage.set(
            this.STORAGE_KEY,
            previousRecord
          );

        } else {

          AppStorage.remove(
            this.STORAGE_KEY
          );
        }

      } catch (restoreError) {

        console.warn(
          "Previous service location could not be restored:",
          restoreError
        );
      }


      this.state.validationPromise =
        null;

      this.state.lastValidatedDistrictId =
        "";

      this.state.lastValidatedAt =
        0;
    }


    const sample =
      districts.length > 0
        ? districts[0]
        : null;


    const results = [

      {
        test:
          "Public district search",

        expected:
          true,

        actual:
          testError === null,

        passed:
          testError === null
      },

      {
        test:
          "Active districts available",

        expected:
          true,

        actual:
          districts.length,

        passed:
          districts.length > 0
      },

      {
        test:
          "District StateCode",

        expected:
          true,

        actual:
          Boolean(
            sample &&
            sample.stateCode
          ),

        passed:
          Boolean(
            sample &&
            sample.stateCode
          )
      },

      {
        test:
          "Effective active status",

        expected:
          "ACTIVE",

        actual:
          sample
            ? sample.effectiveServiceStatus
            : "",

        passed:
          Boolean(
            sample &&
            sample.effectiveServiceStatus ===
              "ACTIVE"
          )
      },

      {
        test:
          "Customer visibility",

        expected:
          "LIVE",

        actual:
          sample
            ? sample.customerVisibility
            : "",

        passed:
          Boolean(
            sample &&
            sample.customerVisibility ===
              "LIVE"
          )
      },

      {
        test:
          "Authoritative lookup",

        expected:
          true,

        actual:
          Boolean(
            authoritativeDistrict &&
            authoritativeDistrict.districtId
          ),

        passed:
          Boolean(
            authoritativeDistrict &&
            authoritativeDistrict.districtId
          )
      },

      {
        test:
          "Saved location",

        expected:
          true,

        actual:
          Boolean(
            savedDistrict &&
            savedDistrict.districtId
          ),

        passed:
          Boolean(
            savedDistrict &&
            savedDistrict.districtId
          )
      },

      {
        test:
          "Saved location revalidation",

        expected:
          true,

        actual:
          Boolean(
            validationResult &&
            validationResult.valid
          ),

        passed:
          Boolean(
            validationResult &&
            validationResult.valid
          )
      },

      {
        test:
          "Previous selection restored",

        expected:
          true,

        actual:
          previousRecordExists
            ? Boolean(
                AppStorage.get(
                  this.STORAGE_KEY
                )
              )
            : !AppStorage.get(
                this.STORAGE_KEY
              ),

        passed:
          previousRecordExists
            ? Boolean(
                AppStorage.get(
                  this.STORAGE_KEY
                )
              )
            : !AppStorage.get(
                this.STORAGE_KEY
              )
      }

    ];


    const passed =
      results.every(
        (result) =>
          result.passed
      );


    console.table(
      results
    );


    console.log(
      "Public Districts:",
      districts
    );


    console.log(
      "Authoritative District:",
      authoritativeDistrict
    );


    console.log(
      "Validation Result:",
      validationResult
    );


    console.log(
      passed
        ? "Phase 4 Service Location Test: PASS"
        : "Phase 4 Service Location Test: FAIL"
    );


    return {

      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      publicDistrictCount:
        districts.length,

      sampleDistrict:
        sample,

      authoritativeDistrict:
        authoritativeDistrict,

      validation:
        validationResult,

      error:
        testError
          ? {
              code:
                testError.code || "",

              message:
                testError.message || ""
            }
          : null,

      results:
        results
    };
  }

};
