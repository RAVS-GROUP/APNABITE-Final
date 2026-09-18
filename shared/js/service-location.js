/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/service-location.js
 * PURPOSE: Manual service-district selection
 * VERSION: 1.0.0
 * ============================================================
 */

const ServiceLocation = {

  STORAGE_KEY:
    "apnabite_service_location",


  /*
   * ----------------------------------------------------------
   * NORMALIZE DISTRICT
   * ----------------------------------------------------------
   */

  normalizeDistrict(district) {

    if (
      !district ||
      typeof district !== "object" ||
      !district.districtId ||
      !district.state ||
      !district.districtName
    ) {

      throw this.createError(
        "A valid service district is required.",
        "INVALID_SERVICE_DISTRICT"
      );
    }

    return {
      districtId:
        String(
          district.districtId
        ),

      state:
        String(
          district.state
        ),

      districtName:
        String(
          district.districtName
        ),

      serviceStatus:
        String(
          district.serviceStatus ||
          ""
        ),

      serviceRadiusKm:
        Number(
          district.serviceRadiusKm
        ) || 0,

      deliveryFeePerKm:
        Number(
          district.deliveryFeePerKm
        ) || 0,

      minimumDeliveryFee:
        Number(
          district.minimumDeliveryFee
        ) || 0,

      longDistanceEnabled:
        district.longDistanceEnabled ===
        true,

      selectionSource:
        district.selectionSource ||
        "MANUAL",

      selectedAt:
        district.selectedAt ||
        new Date().toISOString()
    };
  },


  /*
   * ----------------------------------------------------------
   * SAVE SELECTED DISTRICT
   * ----------------------------------------------------------
   */

  save(district) {

    const normalized =
      this.normalizeDistrict(
        district
      );

    AppStorage.set(
      this.STORAGE_KEY,
      normalized
    );

    return normalized;
  },


  /*
   * ----------------------------------------------------------
   * GET SAVED DISTRICT
   * ----------------------------------------------------------
   */

  getSaved() {

    const saved =
      AppStorage.get(
        this.STORAGE_KEY,
        null
      );

    if (!saved) {
      return null;
    }

    try {

      return this.normalizeDistrict(
        saved
      );

    } catch (error) {

      this.clear();

      return null;
    }
  },


  /*
   * ----------------------------------------------------------
   * CLEAR SELECTED DISTRICT
   * ----------------------------------------------------------
   */

  clear() {

    AppStorage.remove(
      this.STORAGE_KEY
    );

    return true;
  },


  /*
   * ----------------------------------------------------------
   * HAS SELECTED DISTRICT
   * ----------------------------------------------------------
   */

  isSelected() {

    return this.getSaved() !== null;
  },


  /*
   * ----------------------------------------------------------
   * SEARCH ACTIVE SERVICE DISTRICTS
   * ----------------------------------------------------------
   */

  async search(query = "") {

    const response =
      await API.request(
        "search_service_locations",
        {
          query:
            String(query || "")
              .trim()
        }
      );

    const data =
      this.getResponseData(
        response
      );

    if (
      data.success !== true ||
      !Array.isArray(
        data.districts
      )
    ) {

      throw this.createError(
        "Unable to load service locations.",
        "SERVICE_LOCATION_SEARCH_FAILED",
        response.requestId
      );
    }

    return {
      success: true,
      query:
        data.query || "",
      count:
        Number(data.count) || 0,
      districts:
        data.districts.map(
          (district) =>
            this.normalizeDistrict(
              district
            )
        ),
      requestId:
        response.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * GET ALL ACTIVE DISTRICTS
   * ----------------------------------------------------------
   */

  async getAvailable() {

    return this.search("");
  },


  /*
   * ----------------------------------------------------------
   * GET DISTRICT SERVICE CONFIGURATION
   * ----------------------------------------------------------
   */

  async getDistrict(districtId) {

    const safeDistrictId =
      String(
        districtId || ""
      ).trim();

    if (!safeDistrictId) {

      throw this.createError(
        "District ID is required.",
        "DISTRICT_ID_REQUIRED"
      );
    }

    const response =
      await API.request(
        "get_district_service",
        {
          districtId:
            safeDistrictId
        }
      );

    const data =
      this.getResponseData(
        response
      );

    if (
      data.success !== true ||
      !data.district
    ) {

      throw this.createError(
        "Unable to load district service.",
        "DISTRICT_SERVICE_FAILED",
        response.requestId
      );
    }

    return {
      success: true,
      district:
        this.normalizeDistrict(
          data.district
        ),
      requestId:
        response.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * SELECT AND SAVE DISTRICT
   *
   * Fetches the authoritative configuration before saving.
   * ----------------------------------------------------------
   */

  async selectDistrict(districtId) {

    const result =
      await this.getDistrict(
        districtId
      );

    const selected =
      this.save({
        ...result.district,

        selectionSource:
          "MANUAL",

        selectedAt:
          new Date().toISOString()
      });

    document.dispatchEvent(
      new CustomEvent(
        "apnabite:service-location-ready",
        {
          detail: {
            district:
              selected
          }
        }
      )
    );

    return {
      success: true,
      selected:
        true,
      district:
        selected,
      requestId:
        result.requestId || ""
    };
  },


  /*
   * ----------------------------------------------------------
   * STANDARD RESPONSE DATA
   * ----------------------------------------------------------
   */

  getResponseData(response) {

    if (
      !response ||
      typeof response !== "object" ||
      !response.data ||
      typeof response.data !== "object"
    ) {

      throw this.createError(
        "Service location returned an invalid response.",
        "INVALID_SERVICE_LOCATION_RESPONSE"
      );
    }

    return response.data;
  },


  /*
   * ----------------------------------------------------------
   * CREATE ERROR
   * ----------------------------------------------------------
   */

  createError(
    message,
    code,
    requestId
  ) {

    const error =
      new Error(
        message ||
        "Service location error."
      );

    error.code =
      code ||
      "SERVICE_LOCATION_ERROR";

    error.requestId =
      requestId || "";

    return error;
  },


  /*
   * ----------------------------------------------------------
   * LIVE DATA-LAYER TEST
   *
   * Browser console:
   * ServiceLocation.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE SERVICE LOCATION TEST"
    );

    console.log(
      "========================================"
    );

    const previousSelection =
      this.getSaved();

    try {

      this.clear();

      /*
       * Load active districts.
       */

      const available =
        await this.getAvailable();

      console.log(
        "Available Districts:",
        available
      );

      if (
        available.success !== true ||
        available.count < 1 ||
        !available.districts[0]
      ) {

        throw new Error(
          "No active service district was returned."
        );
      }

      const firstDistrict =
        available.districts[0];

      /*
       * Select district using authoritative API lookup.
       */

      const selection =
        await this.selectDistrict(
          firstDistrict.districtId
        );

      console.log(
        "District Selection:",
        selection
      );

      if (
        selection.success !== true ||
        selection.selected !== true
      ) {

        throw new Error(
          "District selection failed."
        );
      }

      /*
       * Verify local persistence.
       */

      const saved =
        this.getSaved();

      console.log(
        "Saved District:",
        saved
      );

      const passed =
        saved !== null &&
        saved.districtId ===
          firstDistrict.districtId &&
        saved.state ===
          "Uttar Pradesh" &&
        saved.districtName ===
          "Gautam Buddh Nagar" &&
        saved.serviceRadiusKm === 5 &&
        saved.deliveryFeePerKm === 8 &&
        saved.minimumDeliveryFee === 20 &&
        saved.longDistanceEnabled ===
          true;

      console.log(
        passed
          ? "Service Location Test: PASS"
          : "Service Location Test: FAIL"
      );

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        available:
          available,
        selection:
          selection,
        saved:
          saved
      };

    } catch (error) {

      console.error(
        "Service Location Test: FAIL"
      );

      console.error(
        "Error:",
        error
      );

      return {
        success: false,
        status: "FAIL",
        error:
          error.message,
        code:
          error.code || "",
        requestId:
          error.requestId || ""
      };

    } finally {

      this.clear();

      if (previousSelection) {

        AppStorage.set(
          this.STORAGE_KEY,
          previousSelection
        );
      }
    }
  }

};
