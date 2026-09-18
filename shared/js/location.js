/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/location.js
 * PURPOSE: Device location and local location state
 * VERSION: 1.1.0
 * ============================================================
 *
 * IMPORTANT:
 * - Location is requested only after an explicit user action.
 * - This file does not automatically request permission.
 * - Backend will remain authoritative for service eligibility.
 * ============================================================
 */

const LocationManager = {

  STORAGE_KEY:
    "apnabite_location",

  LOCATION_MAX_AGE_MS:
    5 * 60 * 1000,

  REQUEST_TIMEOUT_MS:
    10000,

  current:
    null,


  /*
   * ----------------------------------------------------------
   * GEOLOCATION SUPPORT
   * ----------------------------------------------------------
   */

  isSupported() {

    return (
      "geolocation" in navigator
    );
  },


  /*
   * ----------------------------------------------------------
   * GET BROWSER PERMISSION STATE
   *
   * Possible values:
   * granted
   * prompt
   * denied
   * unsupported
   * unknown
   * ----------------------------------------------------------
   */

  async getPermissionState() {

    if (!this.isSupported()) {
      return "unsupported";
    }

    if (
      !navigator.permissions ||
      typeof navigator.permissions.query !==
        "function"
    ) {
      return "unknown";
    }

    try {

      const result =
        await navigator.permissions.query({
          name: "geolocation"
        });

      return result.state || "unknown";

    } catch (error) {

      return "unknown";
    }
  },


  /*
   * ----------------------------------------------------------
   * VALIDATE COORDINATES
   * ----------------------------------------------------------
   */

  isValidCoordinates(
    latitude,
    longitude
  ) {

    const lat =
      Number(latitude);

    const lng =
      Number(longitude);

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  },


  /*
   * ----------------------------------------------------------
   * NORMALIZE LOCATION
   * ----------------------------------------------------------
   */

  normalizeLocation(location) {

    if (
      !location ||
      typeof location !== "object" ||
      !this.isValidCoordinates(
        location.latitude,
        location.longitude
      )
    ) {
      throw this.createError(
        "Valid location coordinates are required.",
        "INVALID_LOCATION"
      );
    }

    const accuracy =
      Number(location.accuracy);

    return {
      latitude:
        Number(location.latitude),

      longitude:
        Number(location.longitude),

      accuracy:
        Number.isFinite(accuracy) &&
        accuracy >= 0
          ? accuracy
          : null,

      source:
        location.source ||
        "DEVICE",

      capturedAt:
        location.capturedAt ||
        new Date().toISOString()
    };
  },


  /*
   * ----------------------------------------------------------
   * SAVE LOCATION
   * ----------------------------------------------------------
   */

  save(location) {

    const normalized =
      this.normalizeLocation(
        location
      );

    AppStorage.set(
      this.STORAGE_KEY,
      normalized
    );

    this.current =
      normalized;

    return normalized;
  },


  /*
   * ----------------------------------------------------------
   * GET SAVED LOCATION
   * ----------------------------------------------------------
   */

  getSaved() {

    const location =
      AppStorage.get(
        this.STORAGE_KEY,
        null
      );

    if (!location) {
      return null;
    }

    try {

      const normalized =
        this.normalizeLocation(
          location
        );

      this.current =
        normalized;

      return normalized;

    } catch (error) {

      this.clear();

      return null;
    }
  },


  /*
   * ----------------------------------------------------------
   * CLEAR LOCATION
   * ----------------------------------------------------------
   */

  clear() {

    AppStorage.remove(
      this.STORAGE_KEY
    );

    this.current =
      null;

    return true;
  },


  /*
   * ----------------------------------------------------------
   * LOCATION AGE
   * ----------------------------------------------------------
   */

  getAgeMs(location = null) {

    const target =
      location ||
      this.getSaved();

    if (
      !target ||
      !target.capturedAt
    ) {
      return Infinity;
    }

    const capturedTime =
      new Date(
        target.capturedAt
      ).getTime();

    if (
      Number.isNaN(
        capturedTime
      )
    ) {
      return Infinity;
    }

    return Math.max(
      0,
      Date.now() - capturedTime
    );
  },


  /*
   * ----------------------------------------------------------
   * FRESH LOCATION CHECK
   * ----------------------------------------------------------
   */

  isFresh(
    location = null,
    maxAgeMs =
      this.LOCATION_MAX_AGE_MS
  ) {

    return (
      this.getAgeMs(location) <=
      maxAgeMs
    );
  },


  /*
   * ----------------------------------------------------------
   * GET CURRENT DEVICE POSITION
   *
   * Call this only after a user taps:
   * "Use Current Location"
   * ----------------------------------------------------------
   */

  async getCurrentPosition(
    options = {}
  ) {

    if (!this.isSupported()) {

      throw this.createError(
        "Location is not supported on this device.",
        "LOCATION_UNSUPPORTED"
      );
    }

    const persist =
      options.persist !== false;

    const enableHighAccuracy =
      options.enableHighAccuracy ===
      true;

    const timeout =
      Number.isFinite(
        options.timeout
      )
        ? options.timeout
        : this.REQUEST_TIMEOUT_MS;

    const maximumAge =
      Number.isFinite(
        options.maximumAge
      )
        ? options.maximumAge
        : this.LOCATION_MAX_AGE_MS;

    return new Promise(
      (resolve, reject) => {

        navigator.geolocation
          .getCurrentPosition(

            (position) => {

              try {

                const location =
                  this.normalizeLocation({
                    latitude:
                      position.coords.latitude,

                    longitude:
                      position.coords.longitude,

                    accuracy:
                      position.coords.accuracy,

                    source:
                      "DEVICE",

                    capturedAt:
                      new Date(
                        position.timestamp ||
                        Date.now()
                      ).toISOString()
                  });

                if (persist) {

                  this.save(
                    location
                  );

                } else {

                  this.current =
                    location;
                }

                resolve(
                  location
                );

              } catch (error) {

                reject(
                  error
                );
              }
            },

            (error) => {

              reject(
                this.normalizeGeolocationError(
                  error
                )
              );
            },

            {
              enableHighAccuracy:
                enableHighAccuracy,

              timeout:
                timeout,

              maximumAge:
                maximumAge
            }
          );
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * GET BEST AVAILABLE LOCATION
   *
   * Uses a fresh saved location first.
   * Does not open the permission prompt unless allowRequest=true.
   * ----------------------------------------------------------
   */

  async getBestAvailable(
    options = {}
  ) {

    const saved =
      this.getSaved();

    if (
      saved &&
      this.isFresh(saved)
    ) {
      return {
        success: true,
        location:
          saved,
        source:
          "SAVED"
      };
    }

    if (
      options.allowRequest !== true
    ) {
      return {
        success: false,
        location:
          saved,
        source:
          saved
            ? "STALE_SAVED"
            : "NONE",
        reason:
          saved
            ? "SAVED_LOCATION_STALE"
            : "LOCATION_NOT_AVAILABLE"
      };
    }

    try {

      const location =
        await this.getCurrentPosition(
          options
        );

      return {
        success: true,
        location:
          location,
        source:
          "DEVICE"
      };

    } catch (error) {

      return {
        success: false,
        location:
          saved,
        source:
          saved
            ? "STALE_SAVED"
            : "NONE",
        reason:
          error.code ||
          "LOCATION_ERROR",
        message:
          error.message
      };
    }
  },


  /*
   * ----------------------------------------------------------
   * GEOLOCATION ERROR NORMALIZATION
   * ----------------------------------------------------------
   */

  normalizeGeolocationError(error) {

    if (!error) {

      return this.createError(
        "Unable to access your location.",
        "LOCATION_ERROR"
      );
    }

    switch (error.code) {

      case 1:
        return this.createError(
          "Location permission was denied.",
          "LOCATION_PERMISSION_DENIED"
        );

      case 2:
        return this.createError(
          "Your current location is unavailable.",
          "LOCATION_UNAVAILABLE"
        );

      case 3:
        return this.createError(
          "Location request timed out.",
          "LOCATION_TIMEOUT"
        );

      default:
        return this.createError(
          error.message ||
          "Unable to access your location.",
          "LOCATION_ERROR"
        );
    }
  },


  /*
   * ----------------------------------------------------------
   * CREATE STANDARD LOCATION ERROR
   * ----------------------------------------------------------
   */

  createError(
    message,
    code
  ) {

    const error =
      new Error(
        message ||
        "Location error."
      );

    error.code =
      code ||
      "LOCATION_ERROR";

    return error;
  },


  /*
   * ----------------------------------------------------------
   * CALCULATE STRAIGHT-LINE DISTANCE
   *
   * Result is for frontend display only.
   * Backend will calculate authoritative delivery eligibility
   * and applicable charges.
   * ----------------------------------------------------------
   */

  calculateDistanceKm(
    fromLatitude,
    fromLongitude,
    toLatitude,
    toLongitude
  ) {

    if (
      !this.isValidCoordinates(
        fromLatitude,
        fromLongitude
      ) ||
      !this.isValidCoordinates(
        toLatitude,
        toLongitude
      )
    ) {
      throw this.createError(
        "Valid coordinates are required for distance calculation.",
        "INVALID_COORDINATES"
      );
    }

    const earthRadiusKm =
      6371;

    const toRadians =
      (degrees) =>
        degrees *
        (Math.PI / 180);

    const latitudeDifference =
      toRadians(
        Number(toLatitude) -
        Number(fromLatitude)
      );

    const longitudeDifference =
      toRadians(
        Number(toLongitude) -
        Number(fromLongitude)
      );

    const firstLatitude =
      toRadians(
        Number(fromLatitude)
      );

    const secondLatitude =
      toRadians(
        Number(toLatitude)
      );

    const haversine =
      Math.sin(
        latitudeDifference / 2
      ) ** 2 +
      Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

    const angularDistance =
      2 *
      Math.atan2(
        Math.sqrt(haversine),
        Math.sqrt(1 - haversine)
      );

    return Number(
      (
        earthRadiusKm *
        angularDistance
      ).toFixed(2)
    );
  },


  /*
   * ----------------------------------------------------------
   * TEST 1 — LOCATION STORAGE
   *
   * Browser console:
   * LocationManager.testStorage()
   * ----------------------------------------------------------
   */

  testStorage() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE LOCATION STORAGE TEST"
    );

    console.log(
      "========================================"
    );

    const previousLocation =
      this.getSaved();

    try {

      this.clear();

      const saved =
        this.save({
          latitude:
            28.5355,
          longitude:
            77.391,
          accuracy:
            25,
          source:
            "TEST"
        });

      const fetched =
        this.getSaved();

      const passed =
        fetched !== null &&
        fetched.latitude ===
          28.5355 &&
        fetched.longitude ===
          77.391 &&
        fetched.source ===
          "TEST" &&
        this.isFresh(fetched) ===
          true;

      console.log(
        "Saved Location:",
        saved
      );

      console.log(
        "Fetched Location:",
        fetched
      );

      console.log(
        passed
          ? "Location Storage Test: PASS"
          : "Location Storage Test: FAIL"
      );

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        saved:
          saved,
        fetched:
          fetched
      };

    } catch (error) {

      console.error(
        "Location Storage Test: FAIL",
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

      this.clear();

      if (previousLocation) {

        AppStorage.set(
          this.STORAGE_KEY,
          previousLocation
        );

        this.current =
          previousLocation;
      }
    }
  },


  /*
   * ----------------------------------------------------------
   * TEST 2 — DISTANCE CALCULATION
   *
   * Browser console:
   * LocationManager.testDistance()
   * ----------------------------------------------------------
   */

  testDistance() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE LOCATION DISTANCE TEST"
    );

    console.log(
      "========================================"
    );

    try {

      const samePointDistance =
        this.calculateDistanceKm(
          28.5355,
          77.391,
          28.5355,
          77.391
        );

      const nearbyDistance =
        this.calculateDistanceKm(
          28.5355,
          77.391,
          28.5706,
          77.3272
        );

      const passed =
        samePointDistance === 0 &&
        nearbyDistance > 0;

      console.log(
        "Same Point Distance:",
        samePointDistance,
        "km"
      );

      console.log(
        "Nearby Distance:",
        nearbyDistance,
        "km"
      );

      console.log(
        passed
          ? "Location Distance Test: PASS"
          : "Location Distance Test: FAIL"
      );

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        samePointDistance:
          samePointDistance,
        nearbyDistance:
          nearbyDistance
      };

    } catch (error) {

      console.error(
        "Location Distance Test: FAIL",
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
    }
  },


  /*
   * ----------------------------------------------------------
   * TEST 3 — LIVE DEVICE LOCATION
   *
   * This may show the browser location permission popup.
   *
   * Browser console:
   * LocationManager.testDeviceLocation()
   * ----------------------------------------------------------
   */

  async testDeviceLocation() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE DEVICE LOCATION TEST"
    );

    console.log(
      "========================================"
    );

    const previousLocation =
      this.getSaved();

    try {

      const permissionBefore =
        await this.getPermissionState();

      console.log(
        "Permission Before Request:",
        permissionBefore
      );

      const location =
        await this.getCurrentPosition({
          persist:
            true,
          enableHighAccuracy:
            false
        });

      console.log(
        "Device Location:",
        location
      );

      const saved =
        this.getSaved();

      const permissionAfter =
        await this.getPermissionState();

      console.log(
        "Permission After Request:",
        permissionAfter
      );

      const passed =
        this.isValidCoordinates(
          location.latitude,
          location.longitude
        ) &&
        saved !== null &&
        saved.latitude ===
          location.latitude &&
        saved.longitude ===
          location.longitude;

      console.log(
        passed
          ? "Device Location Test: PASS"
          : "Device Location Test: FAIL"
      );

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        permissionBefore:
          permissionBefore,
        permissionAfter:
          permissionAfter,
        location:
          location,
        saved:
          saved
      };

    } catch (error) {

      console.error(
        "Device Location Test: FAIL"
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
          error.code || ""
      };

    } finally {

      this.clear();

      if (previousLocation) {

        AppStorage.set(
          this.STORAGE_KEY,
          previousLocation
        );

        this.current =
          previousLocation;
      }
    }
  }

};
