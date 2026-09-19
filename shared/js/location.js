/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/location.js
 * PURPOSE: Device location, background refresh and proximity
 * VERSION: 2.0.0
 * ============================================================
 */

const LocationManager = {

  STORAGE_KEY:
    "apnabite_location",

  LOCATION_MAX_AGE_MS:
    5 * 60 * 1000,

  BACKGROUND_REFRESH_MS:
    5 * 60 * 1000,

  REQUEST_TIMEOUT_MS:
    10000,

  NEARBY_ADDRESS_METERS:
    500,

  current:
    null,

  backgroundInitialized:
    false,

  backgroundRequest:
    null,

  hiddenAt:
    0,

  visibilityHandler:
    null,


  /*
   * ----------------------------------------------------------
   * SUPPORT AND PERMISSION
   * ----------------------------------------------------------
   */

  isSupported() {

    return (
      "geolocation" in navigator
    );
  },


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
          name:
            "geolocation"
        });


      return result.state ||
        "unknown";

    } catch (error) {

      return "unknown";
    }
  },


  /*
   * ----------------------------------------------------------
   * COORDINATE VALIDATION
   * ----------------------------------------------------------
   */

  isValidCoordinates(
    latitude,
    longitude
  ) {

    const lat =
      Number(
        latitude
      );


    const lng =
      Number(
        longitude
      );


    return (
      Number.isFinite(
        lat
      ) &&
      Number.isFinite(
        lng
      ) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  },


  normalizeLocation(location) {

    if (
      !location ||
      typeof location !==
        "object" ||
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
      Number(
        location.accuracy
      );


    return {
      latitude:
        Number(
          location.latitude
        ),

      longitude:
        Number(
          location.longitude
        ),

      accuracy:
        Number.isFinite(
          accuracy
        ) &&
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
   * LOCAL LOCATION STORAGE
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
      Date.now() -
      capturedTime
    );
  },


  isFresh(
    location = null,
    maxAgeMs =
      this.LOCATION_MAX_AGE_MS
  ) {

    return (
      this.getAgeMs(
        location
      ) <= maxAgeMs
    );
  },


  /*
   * ----------------------------------------------------------
   * CURRENT DEVICE POSITION
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
      options.persist !==
        false;


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
   * BEST AVAILABLE LOCATION
   * ----------------------------------------------------------
   */

  async getBestAvailable(
    options = {}
  ) {

    const saved =
      this.getSaved();


    if (
      saved &&
      this.isFresh(
        saved
      ) &&
      options.force !== true
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
      options.allowRequest !==
        true
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
   * BACKGROUND REFRESH INITIALIZATION
   *
   * This does not force the browser permission popup.
   * ----------------------------------------------------------
   */

  initBackgroundRefresh(
    options = {}
  ) {

    if (this.backgroundInitialized) {

      return {
        success: true,

        initialized:
          true,

        alreadyInitialized:
          true
      };
    }


    this.backgroundInitialized =
      true;


    this.visibilityHandler =
      () => {

        this.handleVisibilityChange();
      };


    if (
      typeof document !==
        "undefined"
    ) {

      document.addEventListener(
        "visibilitychange",
        this.visibilityHandler
      );
    }


    /*
     * Page rendering is never awaited or blocked.
     */

    this.refreshInBackground({
      reason:
        "PAGE_OPEN",

      force:
        false,

      allowPrompt:
        options.allowPrompt ===
          true
    });


    return {
      success: true,

      initialized:
        true,

      alreadyInitialized:
        false
    };
  },


  /*
   * ----------------------------------------------------------
   * VISIBILITY / APP RESUME
   * ----------------------------------------------------------
   */

  handleVisibilityChange() {

    if (
      typeof document ===
        "undefined"
    ) {

      return;
    }


    if (
      document.visibilityState ===
        "hidden"
    ) {

      this.hiddenAt =
        Date.now();


      return;
    }


    if (
      document.visibilityState !==
        "visible"
    ) {

      return;
    }


    const backgroundDuration =
      this.hiddenAt
        ? Date.now() -
          this.hiddenAt
        : 0;


    this.hiddenAt =
      0;


    if (
      backgroundDuration >=
      this.BACKGROUND_REFRESH_MS
    ) {

      this.refreshInBackground({
        reason:
          "APP_RESUME",

        force:
          true,

        allowPrompt:
          false
      });
    }
  },


  /*
   * ----------------------------------------------------------
   * SAFE BACKGROUND LOCATION REFRESH
   * ----------------------------------------------------------
   */

  async refreshInBackground(
    options = {}
  ) {

    if (this.backgroundRequest) {

      return this.backgroundRequest;
    }


    this.backgroundRequest =
      this.performBackgroundRefresh(
        options
      );


    try {

      return await this.backgroundRequest;

    } finally {

      this.backgroundRequest =
        null;
    }
  },


  async performBackgroundRefresh(
    options = {}
  ) {

    const reason =
      options.reason ||
      "BACKGROUND_REFRESH";


    const force =
      options.force ===
      true;


    const allowPrompt =
      options.allowPrompt ===
      true;


    const saved =
      this.getSaved();


    /*
     * Fresh saved coordinates are immediately usable.
     */

    if (
      saved &&
      this.isFresh(
        saved
      ) &&
      !force
    ) {

      const result = {
        success: true,

        refreshed:
          false,

        source:
          "SAVED",

        reason:
          reason,

        location:
          saved
      };


      this.dispatchLocationEvent(
        "apnabite:background-location",
        result
      );


      return result;
    }


    const permission =
      await this.getPermissionState();


    if (
      permission === "denied"
    ) {

      const result = {
        success: false,

        refreshed:
          false,

        permission:
          permission,

        reason:
          "LOCATION_PERMISSION_DENIED",

        location:
          saved
      };


      this.dispatchLocationEvent(
        "apnabite:location-permission-denied",
        result
      );


      return result;
    }


    if (
      permission === "unsupported"
    ) {

      return {
        success: false,

        refreshed:
          false,

        permission:
          permission,

        reason:
          "LOCATION_UNSUPPORTED",

        location:
          saved
      };
    }


    /*
     * Do not trigger an unexpected browser popup.
     * Home UI will provide an explicit action button.
     */

    if (
      permission !== "granted" &&
      !allowPrompt
    ) {

      const result = {
        success: false,

        refreshed:
          false,

        permission:
          permission,

        reason:
          "LOCATION_PERMISSION_REQUIRED",

        location:
          saved
      };


      this.dispatchLocationEvent(
        "apnabite:location-permission-required",
        result
      );


      return result;
    }


    try {

      const location =
        await this.getCurrentPosition({
          persist:
            true,

          enableHighAccuracy:
            false,

          timeout:
            this.REQUEST_TIMEOUT_MS,

          maximumAge:
            force
              ? 0
              : this.LOCATION_MAX_AGE_MS
        });


      const result = {
        success: true,

        refreshed:
          true,

        permission:
          permission,

        source:
          "DEVICE",

        reason:
          reason,

        location:
          location
      };


      this.dispatchLocationEvent(
        "apnabite:background-location",
        result
      );


      return result;

    } catch (error) {

      const result = {
        success: false,

        refreshed:
          false,

        permission:
          permission,

        reason:
          error.code ||
          "LOCATION_ERROR",

        message:
          error.message,

        location:
          saved
      };


      this.dispatchLocationEvent(
        "apnabite:background-location-error",
        result
      );


      return result;
    }
  },


  /*
   * ----------------------------------------------------------
   * EXPLICIT USER LOCATION ACTION
   *
   * Home button can call this method.
   * Browser permission popup may appear.
   * ----------------------------------------------------------
   */

  async requestAfterUserAction() {

    return this.refreshInBackground({
      reason:
        "USER_ACTION",

      force:
        true,

      allowPrompt:
        true
    });
  },


  /*
   * ----------------------------------------------------------
   * CUSTOM EVENT
   * ----------------------------------------------------------
   */

  dispatchLocationEvent(
    eventName,
    detail
  ) {

    if (
      typeof document ===
        "undefined"
    ) {

      return;
    }


    document.dispatchEvent(
      new CustomEvent(
        eventName,
        {
          detail:
            detail
        }
      )
    );
  },


  /*
   * ----------------------------------------------------------
   * DISTANCE CALCULATION
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
        Number(
          toLatitude
        ) -
        Number(
          fromLatitude
        )
      );


    const longitudeDifference =
      toRadians(
        Number(
          toLongitude
        ) -
        Number(
          fromLongitude
        )
      );


    const firstLatitude =
      toRadians(
        Number(
          fromLatitude
        )
      );


    const secondLatitude =
      toRadians(
        Number(
          toLatitude
        )
      );


    const haversine =
      Math.sin(
        latitudeDifference / 2
      ) ** 2 +
      Math.cos(
        firstLatitude
      ) *
      Math.cos(
        secondLatitude
      ) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;


    const angularDistance =
      2 *
      Math.atan2(
        Math.sqrt(
          haversine
        ),
        Math.sqrt(
          1 - haversine
        )
      );


    return Number(
      (
        earthRadiusKm *
        angularDistance
      ).toFixed(
        3
      )
    );
  },


  calculateDistanceMeters(
    fromLatitude,
    fromLongitude,
    toLatitude,
    toLongitude
  ) {

    return Math.round(
      this.calculateDistanceKm(
        fromLatitude,
        fromLongitude,
        toLatitude,
        toLongitude
      ) *
      1000
    );
  },


  /*
   * ----------------------------------------------------------
   * FIND NEAREST SAVED ADDRESS
   * ----------------------------------------------------------
   */

  findNearestAddress(
    currentLocation,
    addresses,
    thresholdMeters =
      this.NEARBY_ADDRESS_METERS
  ) {

    if (
      !currentLocation ||
      !this.isValidCoordinates(
        currentLocation.latitude,
        currentLocation.longitude
      ) ||
      !Array.isArray(
        addresses
      )
    ) {

      return {
        matched: false,

        address:
          null,

        distanceMeters:
          null
      };
    }


    let nearestAddress =
      null;


    let nearestDistance =
      Infinity;


    addresses.forEach(
      (address) => {

        if (
          !address ||
          !this.isValidCoordinates(
            address.latitude,
            address.longitude
          )
        ) {

          return;
        }


        const distance =
          this.calculateDistanceMeters(
            currentLocation.latitude,
            currentLocation.longitude,
            address.latitude,
            address.longitude
          );


        if (
          distance <
          nearestDistance
        ) {

          nearestDistance =
            distance;


          nearestAddress =
            address;
        }
      }
    );


    const safeThreshold =
      Number.isFinite(
        Number(
          thresholdMeters
        )
      )
        ? Math.max(
            0,
            Number(
              thresholdMeters
            )
          )
        : this.NEARBY_ADDRESS_METERS;


    return {
      matched:
        nearestAddress !== null &&
        nearestDistance <=
          safeThreshold,

      address:
        nearestAddress !== null &&
        nearestDistance <=
          safeThreshold
          ? nearestAddress
          : null,

      nearestAddress:
        nearestAddress,

      distanceMeters:
        Number.isFinite(
          nearestDistance
        )
          ? nearestDistance
          : null,

      thresholdMeters:
        safeThreshold
    };
  },


  /*
   * ----------------------------------------------------------
   * GEOLOCATION ERRORS
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
   * TEST — STORAGE
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
        this.isFresh(
          fetched
        ) === true;


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
   * TEST — DISTANCE AND 500-METRE MATCH
   * ----------------------------------------------------------
   */

  testDistance() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE LOCATION PROXIMITY TEST"
    );

    console.log(
      "========================================"
    );


    try {

      const current = {
        latitude:
          28.5355,

        longitude:
          77.391
      };


      const addresses = [

        {
          addressId:
            "ADDR_NEAR",

          label:
            "Home",

          latitude:
            28.536,

          longitude:
            77.392
        },

        {
          addressId:
            "ADDR_FAR",

          label:
            "Work",

          latitude:
            28.5706,

          longitude:
            77.3272
        }
      ];


      const match =
        this.findNearestAddress(
          current,
          addresses,
          500
        );


      const passed =
        match.matched ===
          true &&
        match.address !==
          null &&
        match.address.addressId ===
          "ADDR_NEAR" &&
        match.distanceMeters <=
          500;


      console.log(
        "Nearest Address Result:",
        match
      );


      console.log(
        passed
          ? "Location Proximity Test: PASS"
          : "Location Proximity Test: FAIL"
      );


      return {
        success:
          passed,

        status:
          passed
            ? "PASS"
            : "FAIL",

        result:
          match
      };

    } catch (error) {

      console.error(
        "Location Proximity Test: FAIL",
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
  },


  /*
   * ----------------------------------------------------------
   * TEST — BACKGROUND CONFIGURATION
   * ----------------------------------------------------------
   */

  async testBackgroundConfiguration() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE BACKGROUND LOCATION TEST"
    );

    console.log(
      "========================================"
    );


    const permission =
      await this.getPermissionState();


    const passed =
      this.BACKGROUND_REFRESH_MS ===
        300000 &&
      this.NEARBY_ADDRESS_METERS ===
        500 &&
      typeof this
        .refreshInBackground ===
        "function" &&
      typeof this
        .requestAfterUserAction ===
        "function";


    console.log(
      "Permission:",
      permission
    );


    console.log(
      passed
        ? "Background Location Test: PASS"
        : "Background Location Test: FAIL"
    );


    return {
      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      permission:
        permission,

      refreshAfterMs:
        this.BACKGROUND_REFRESH_MS,

      nearbyAddressMeters:
        this.NEARBY_ADDRESS_METERS
    };
  },


  /*
   * ----------------------------------------------------------
   * TEST — LIVE DEVICE LOCATION
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

      const result =
        await this.requestAfterUserAction();


      const saved =
        this.getSaved();


      const passed =
        result.success ===
          true &&
        saved !== null &&
        this.isValidCoordinates(
          saved.latitude,
          saved.longitude
        );


      console.log(
        "Device Location Result:",
        result
      );


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

        result:
          result,

        saved:
          saved
      };

    } catch (error) {

      console.error(
        "Device Location Test: FAIL",
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
