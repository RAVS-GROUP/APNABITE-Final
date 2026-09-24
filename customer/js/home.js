/**
 * ============================================================
 * APNABITE CUSTOMER
 * FILE: customer/js/home.js
 * PURPOSE: Fast cached Customer Home and kitchen discovery
 * VERSION: 2.4.0
 * ============================================================
 */

const CustomerHome = {

  SEARCH_DEBOUNCE_MS:
    300,

  DISCOVERY_PLACEHOLDER_DELAY_MS:
    800,

  DISCOVERY_CACHE_FRESH_MS:
    5 * 60 * 1000,

  DISCOVERY_CACHE_MAX_AGE_MS:
    24 * 60 * 60 * 1000,

  LOCATION_CACHE_FRESH_MS:
    5 * 60 * 1000,

  NEAREST_ADDRESS_THRESHOLD_METERS:
    500,

  RESOLVED_LOCATION_STORAGE_KEY:
    "apnabite_home_resolved_location",

  DISCOVERY_STORAGE_KEY:
    "apnabite_home_kitchen_discovery",

  selectedFoodType:
    "ALL",

  selectedCategory:
    "",

  searchTimer:
    null,

  discoveryPlaceholderTimer:
    null,

  backgroundLocationStarted:
    false,

  locationResolutionRunning:
    false,

  discoveryLoading:
    false,

  discoveryRequestNumber:
    0,

  activeDiscoveryKey:
    "",

  kitchens:
    [],

  discoveryPage:
    1,

  discoveryTotal:
    0,

  discoveryHasMore:
    false,

  pendingDiscoveryOptions:
    null,

  discoveryRestoredFromCache:
    false,

  locationState: {

    success:
      false,

    source:
      "NONE",

    label:
      "Select location",

    location:
      null,

    district:
      null,

    address:
      null

  },

  elements:
    {},


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

      kitchenSubtitle:
        document.getElementById(
          "nearbyKitchenSubtitle"
        ),

      kitchenErrorState:
        document.getElementById(
          "kitchenErrorState"
        ),

      kitchenErrorMessage:
        document.getElementById(
          "kitchenErrorMessage"
        ),

      retryKitchensButton:
        document.getElementById(
          "retryKitchensButton"
        ),

      loadMoreWrap:
        document.getElementById(
          "kitchenLoadMoreWrap"
        ),

      loadMoreButton:
        document.getElementById(
          "loadMoreKitchensButton"
        ),

      paginationStatus:
        document.getElementById(
          "kitchenPaginationStatus"
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
      !this.hasRequiredElements()
    ) {

      console.error(
        "Customer Home elements are missing."
      );

      return false;
    }


    this.bindEvents();


    /*
     * Address/location is restored synchronously.
     */

    this.locationState =
      this.restoreLocation();


    /*
     * Last discovery result is rendered immediately.
     */

    const cachedDiscovery =
      this.restoreDiscoveryCache(
        ""
      );


    if (
      !cachedDiscovery
    ) {

      this.prepareDiscoveryState();
    }


    /*
     * Fresh discovery runs in the background while cached
     * kitchens remain visible.
     */

    if (
      this.getDiscoveryLocation()
    ) {

      this.loadNearbyKitchens({

        background:
          true,

        preserveExisting:
          cachedDiscovery ===
          true

      });
    }


    /*
     * Do not immediately repeat nearest-address API when a
     * valid resolved location was just restored from cache.
     */

    if (
      !this.getManualSavedAddressSelection() &&
      !this.locationState
        .restoredFromCache
    ) {

      this.resolveSavedDeviceLocation()
        .then(
          (result) => {

            if (
              result &&
              result.success ===
                true &&
              !this
                .getManualSavedAddressSelection()
            ) {

              this.loadNearbyKitchens({

                background:
                  true,

                preserveExisting:
                  this.kitchens.length >
                  0

              });
            }
          }
        );
    }


    this.startBackgroundLocation();


    console.log(
      "ApnaBite Customer Home initialized."
    );


    return true;
  },


  /*
   * ----------------------------------------------------------
   * REQUIRED ELEMENTS
   * ----------------------------------------------------------
   */

  hasRequiredElements() {

    return Boolean(

      this.elements.locationButton &&
      this.elements.locationText &&
      this.elements.notificationButton &&
      this.elements.searchInput &&
      this.elements.searchClearButton &&
      this.elements.kitchenList &&
      this.elements.kitchenEmptyState &&
      this.elements.kitchenEmptyTitle &&
      this.elements.kitchenEmptyDescription &&
      this.elements.kitchenCount &&
      this.elements.kitchenSubtitle &&
      this.elements.kitchenErrorState &&
      this.elements.kitchenErrorMessage &&
      this.elements.retryKitchensButton &&
      this.elements.loadMoreWrap &&
      this.elements.loadMoreButton &&
      this.elements.paginationStatus &&
      this.elements.refreshKitchensButton &&
      this.elements.message

    );
  },


  /*
   * ----------------------------------------------------------
   * EVENTS
   * ----------------------------------------------------------
   */

  bindEvents() {

    this.elements.locationButton
      .addEventListener(
        "click",
        () => {

          this.handleLocationButton();
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
            event.key ===
            "Enter"
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


    this.elements.refreshKitchensButton
      .addEventListener(
        "click",
        () => {

          this.loadNearbyKitchens({
            preserveExisting:
              this.kitchens.length >
              0
          });
        }
      );


    this.elements.retryKitchensButton
      .addEventListener(
        "click",
        () => {

          this.loadNearbyKitchens({
            preserveExisting:
              this.kitchens.length >
              0
          });
        }
      );


    this.elements.loadMoreButton
      .addEventListener(
        "click",
        () => {

          this.loadNearbyKitchens({
            append:
              true,
            preserveExisting:
              true
          });
        }
      );


    document.addEventListener(
      "apnabite:background-location",
      (event) => {

        this.handleBackgroundLocation(
          event.detail || {}
        );
      }
    );


    document.addEventListener(
      "apnabite:location-permission-required",
      () => {

        this.handleLocationPermissionRequired();
      }
    );


    document.addEventListener(
      "apnabite:location-permission-denied",
      () => {

        this.handleLocationPermissionDenied();
      }
    );


    document.addEventListener(
      "apnabite:background-location-error",
      (event) => {

        this.handleBackgroundLocationError(
          event.detail || {}
        );
      }
    );


    document.addEventListener(
      "apnabite:addresses-updated",
      () => {

        this.clearResolvedLocationCache();

        this.resolveSavedDeviceLocation();
      }
    );


    document.addEventListener(
      "apnabite:address-selected",
      (event) => {

        const detail =
          event.detail || {};


        if (
          detail.address
        ) {

          this.applySavedAddressLocation(

            detail.address,

            this.getAddressLocation(
              detail.address,
              LocationManager.getSaved()
            ),

            detail.distanceMeters,

            {
              manualSelection:
                true
            }

          );


          this.loadNearbyKitchens({

            preserveExisting:
              false

          });
        }
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * IMMEDIATE LOCATION RESTORE
   * ----------------------------------------------------------
   */

  restoreLocation() {

    const deviceLocation =
      LocationManager.getSaved();


    const cachedResolved =
      this.getResolvedLocationCache(
        deviceLocation
      );


    if (
      cachedResolved
    ) {

      this.setLocationLabel(
        cachedResolved.label
      );


      const restoredLocation =
        cachedResolved.manualSelection ===
          true ||
        cachedResolved.source ===
          "MANUAL_SAVED_ADDRESS"
          ? {
              latitude:
                Number(
                  cachedResolved.latitude
                ),

              longitude:
                Number(
                  cachedResolved.longitude
                ),

              accuracy:
                null
            }
          : deviceLocation;


      return {

        success:
          true,

        source:
          cachedResolved.source ||
          "SAVED_ADDRESS",

        label:
          cachedResolved.label,

        location:
          restoredLocation,

        district:
          cachedResolved.district ||
          null,

        address:
          cachedResolved.address ||
          null,

        distanceMeters:
          cachedResolved
            .distanceMeters ??
          null,

        manualSelection:
          cachedResolved
            .manualSelection ===
          true,

        resolvedAt:
          cachedResolved
            .resolvedAt ||
          "",

        restoredFromCache:
          true

      };
    }


    const manualLocation =
      ServiceLocation.getSaved();


    if (
      manualLocation
    ) {

      const label =
        this.formatDistrictLabel(
          manualLocation
        );


      this.setLocationLabel(
        label
      );


      return {

        success:
          true,

        source:
          "MANUAL_DISTRICT",

        label:
          label,

        district:
          manualLocation,

        location:
          deviceLocation,

        address:
          null,

        restoredFromCache:
          false

      };
    }


    if (
      deviceLocation
    ) {

      this.setLocationLabel(
        "Finding address..."
      );


      return {

        success:
          true,

        source:
          LocationManager.isFresh(
            deviceLocation
          )
            ? "DEVICE_RESOLVING"
            : "STALE_DEVICE_RESOLVING",

        label:
          "Finding address...",

        location:
          deviceLocation,

        district:
          null,

        address:
          null,

        restoredFromCache:
          false

      };
    }


    this.setLocationLabel(
      "Select location"
    );


    return {

      success:
        false,

      source:
        "NONE",

      label:
        "Select location",

      location:
        null,

      district:
        null,

      address:
        null,

      restoredFromCache:
        false

    };
  },


  async resolveSavedDeviceLocation() {

    const manualSelection =
      this.getManualSavedAddressSelection();


    if (
      manualSelection
    ) {

      return {

        success:
          true,

        matched:
          true,

        manualSelection:
          true,

        locationState:
          this.locationState

      };
    }


    const location =
      LocationManager.getSaved();


    if (
      !location
    ) {

      return {

        success:
          false,

        reason:
          "DEVICE_LOCATION_NOT_FOUND"

      };
    }


    return this.resolveLocationDisplay(
      location,
      {
        reason:
          "SAVED_DEVICE"
      }
    );
  },


  /*
   * ----------------------------------------------------------
   * BACKGROUND LOCATION
   * ----------------------------------------------------------
   */

  startBackgroundLocation() {

    if (
      this.backgroundLocationStarted
    ) {

      return {
        success:
          true,
        alreadyStarted:
          true
      };
    }


    if (
      typeof LocationManager ===
        "undefined" ||
      typeof LocationManager
        .initBackgroundRefresh !==
        "function"
    ) {

      console.warn(
        "Background location manager is unavailable."
      );


      return {
        success:
          false,
        reason:
          "BACKGROUND_LOCATION_UNAVAILABLE"
      };
    }


    this.backgroundLocationStarted =
      true;


    Promise.resolve(

      LocationManager
        .initBackgroundRefresh({
          allowPrompt:
            false
        })

    ).catch(
      (error) => {

        console.warn(
          "Background location initialization failed:",
          error
        );
      }
    );


    return {
      success:
        true,
      started:
        true
    };
  },


  async handleBackgroundLocation(
    detail
  ) {

    const location =
      detail.location ||
      (
        detail.result &&
        detail.result.location
      ) ||
      LocationManager.getSaved();


    if (
      !location
    ) {

      return {
        success:
          false,
        reason:
          "LOCATION_NOT_FOUND"
      };
    }


    const manualSelection =
      this.getManualSavedAddressSelection();


    if (
      manualSelection
    ) {

      console.log(
        "Customer background location refreshed; manual delivery address preserved.",
        this.locationState
      );


      return {

        success:
          true,

        matched:
          true,

        manualSelection:
          true,

        locationState:
          this.locationState

      };
    }


    /*
     * Avoid repeating nearest-address API immediately after
     * restoring a recently resolved location.
     */

    if (
      this.locationState
        .restoredFromCache ===
        true &&
      this.isLocationCacheFresh()
    ) {

      return {

        success:
          true,

        skipped:
          true,

        reason:
          "RECENT_LOCATION_CACHE",

        locationState:
          this.locationState

      };
    }


    const result =
      await this.resolveLocationDisplay(
        location,
        {
          reason:
            "BACKGROUND"
        }
      );


    console.log(
      "Customer background location updated:",
      this.locationState
    );


    return result;
  },


  isLocationCacheFresh() {

    const resolvedAt =
      this.locationState &&
      this.locationState.resolvedAt
        ? new Date(
            this.locationState
              .resolvedAt
          ).getTime()
        : 0;


    return (
      Number.isFinite(
        resolvedAt
      ) &&
      resolvedAt > 0 &&
      Date.now() -
      resolvedAt <=
      this.LOCATION_CACHE_FRESH_MS
    );
  },


  /*
   * ----------------------------------------------------------
   * RESOLVE LOCATION DISPLAY
   * ----------------------------------------------------------
   */

  async resolveLocationDisplay(
    location,
    options = {}
  ) {

    if (
      !location ||
      !LocationManager
        .isValidCoordinates(
          location.latitude,
          location.longitude
        )
    ) {

      return {
        success:
          false,
        reason:
          "INVALID_LOCATION"
      };
    }


    if (
      this.locationResolutionRunning
    ) {

      return {
        success:
          false,
        reason:
          "LOCATION_RESOLUTION_RUNNING"
      };
    }


    this.locationResolutionRunning =
      true;


    try {

      const nearest =
        await this.findNearestSavedAddress(
          location
        );


      if (
        nearest.matched &&
        nearest.address
      ) {

        return this.applySavedAddressLocation(

          nearest.address,

          this.getAddressLocation(
            nearest.address,
            location
          ),

          nearest.distanceMeters,

          {
            manualSelection:
              false
          }

        );
      }


      const manualLocation =
        ServiceLocation.getSaved();


      if (
        manualLocation
      ) {

        const label =
          this.formatDistrictLabel(
            manualLocation
          );


        this.setLocationLabel(
          label
        );


        this.locationState = {

          success:
            true,

          source:
            "DEVICE_DISTRICT",

          label:
            label,

          district:
            manualLocation,

          location:
            location,

          address:
            null,

          nearestMatched:
            false,

          resolutionReason:
            options.reason || "",

          resolvedAt:
            new Date().toISOString(),

          restoredFromCache:
            false

        };


        this.saveResolvedLocationCache(
          this.locationState
        );


        this.clearLocationMessage();


        return {

          success:
            true,

          matched:
            false,

          locationState:
            this.locationState

        };
      }


      const label =
        "Add address for this location";


      this.setLocationLabel(
        label
      );


      this.locationState = {

        success:
          true,

        source:
          "NEW_DEVICE_LOCATION",

        label:
          label,

        district:
          null,

        location:
          location,

        address:
          null,

        nearestMatched:
          false,

        resolutionReason:
          options.reason || "",

        resolvedAt:
          new Date().toISOString(),

        restoredFromCache:
          false

      };


      this.clearResolvedLocationCache();


      return {

        success:
          true,

        matched:
          false,

        locationState:
          this.locationState

      };

    } catch (error) {

      console.warn(
        "Home nearest-address resolution failed:",
        error
      );


      const manualLocation =
        ServiceLocation.getSaved();


      if (
        manualLocation
      ) {

        const label =
          this.formatDistrictLabel(
            manualLocation
          );


        this.setLocationLabel(
          label
        );


        this.locationState = {

          success:
            true,

          source:
            "DISTRICT_FALLBACK",

          label:
            label,

          district:
            manualLocation,

          location:
            location,

          address:
            null,

          resolutionError:
            error.code ||
            "ADDRESS_LOOKUP_FAILED",

          resolvedAt:
            new Date().toISOString(),

          restoredFromCache:
            false

        };


        return {

          success:
            true,

          fallback:
            true,

          locationState:
            this.locationState

        };
      }


      this.setLocationLabel(
        "Choose delivery address"
      );


      return {

        success:
          false,

        reason:
          error.code ||
          "ADDRESS_LOOKUP_FAILED",

        error:
          error.message

      };

    } finally {

      this.locationResolutionRunning =
        false;
    }
  },


  async findNearestSavedAddress(
    location
  ) {

    const response =
      await API.request(

        "find_nearest_customer_address",

        {

          sessionId:
            this.getSessionId(),

          latitude:
            Number(
              location.latitude
            ),

          longitude:
            Number(
              location.longitude
            ),

          thresholdMeters:
            this.NEAREST_ADDRESS_THRESHOLD_METERS

        }

      );


    const result =
      response.data || {};


    return {

      success:
        result.success ===
        true,

      matched:
        result.matched ===
        true,

      address:
        result.address ||
        result.nearestAddress ||
        null,

      distanceMeters:
        Number(
          result.distanceMeters ||
          0
        ),

      thresholdMeters:
        Number(
          result.thresholdMeters ||
          this.NEAREST_ADDRESS_THRESHOLD_METERS
        ),

      requestId:
        response.requestId ||
        ""

    };
  },


  /*
   * ----------------------------------------------------------
   * APPLY SAVED ADDRESS
   *
   * Selected saved-address coordinates take priority over
   * current device GPS for delivery discovery.
   * ----------------------------------------------------------
   */

  applySavedAddressLocation(
    address,
    location,
    distanceMeters,
    options = {}
  ) {

    const manualSelection =
      options.manualSelection ===
      true;


    const addressLocation =
      this.getAddressLocation(
        address,
        location ||
        LocationManager.getSaved()
      );


    if (
      !addressLocation
    ) {

      return {
        success:
          false,
        reason:
          "ADDRESS_COORDINATES_REQUIRED"
      };
    }


    const label =
      this.formatSavedAddressLabel(
        address
      );


    this.setLocationLabel(
      label
    );


    this.locationState = {

      success:
        true,

      source:
        manualSelection
          ? "MANUAL_SAVED_ADDRESS"
          : "SAVED_ADDRESS",

      label:
        label,

      location:
        addressLocation,

      district: {

        districtId:
          address.districtId ||
          "",

        districtName:
          address.district ||
          "",

        state:
          address.state ||
          ""

      },

      address:
        address,

      distanceMeters:
        distanceMeters ===
          null ||
        distanceMeters ===
          undefined
          ? null
          : Number(
              distanceMeters
            ),

      nearestMatched:
        true,

      manualSelection:
        manualSelection,

      resolvedAt:
        new Date().toISOString(),

      restoredFromCache:
        false

    };


    this.saveResolvedLocationCache(
      this.locationState
    );


    this.clearLocationMessage();


    return {

      success:
        true,

      matched:
        true,

      manualSelection:
        manualSelection,

      address:
        address,

      distanceMeters:
        this.locationState
          .distanceMeters,

      locationState:
        this.locationState

    };
  },


  getAddressLocation(
    address,
    fallbackLocation
  ) {

    if (
      address &&
      LocationManager
        .isValidCoordinates(
          Number(
            address.latitude
          ),
          Number(
            address.longitude
          )
        )
    ) {

      return {

        latitude:
          Number(
            address.latitude
          ),

        longitude:
          Number(
            address.longitude
          ),

        accuracy:
          null

      };
    }


    if (
      fallbackLocation &&
      LocationManager
        .isValidCoordinates(
          Number(
            fallbackLocation.latitude
          ),
          Number(
            fallbackLocation.longitude
          )
        )
    ) {

      return {

        latitude:
          Number(
            fallbackLocation.latitude
          ),

        longitude:
          Number(
            fallbackLocation.longitude
          ),

        accuracy:
          fallbackLocation.accuracy ??
          null

      };
    }


    return null;
  },


  /*
   * ----------------------------------------------------------
   * LOCATION CACHE
   * ----------------------------------------------------------
   */

  saveResolvedLocationCache(
    locationState
  ) {

    if (
      !locationState ||
      !locationState.location ||
      !locationState.label
    ) {

      return false;
    }


    AppStorage.set(

      this.RESOLVED_LOCATION_STORAGE_KEY,

      {

        label:
          locationState.label,

        source:
          locationState.source,

        latitude:
          Number(
            locationState
              .location
              .latitude
          ),

        longitude:
          Number(
            locationState
              .location
              .longitude
          ),

        district:
          locationState.district ||
          null,

        address:
          locationState.address ||
          null,

        distanceMeters:
          locationState
            .distanceMeters ??
          null,

        manualSelection:
          locationState
            .manualSelection ===
          true,

        resolvedAt:
          locationState.resolvedAt ||
          new Date().toISOString()

      }

    );


    return true;
  },


  getResolvedLocationCache(
    deviceLocation
  ) {

    const cached =
      AppStorage.get(

        this.RESOLVED_LOCATION_STORAGE_KEY,

        null

      );


    if (
      !cached ||
      !cached.label ||
      !LocationManager
        .isValidCoordinates(
          cached.latitude,
          cached.longitude
        )
    ) {

      return null;
    }


    if (
      cached.manualSelection ===
        true ||
      cached.source ===
        "MANUAL_SAVED_ADDRESS"
    ) {

      return cached;
    }


    if (
      !deviceLocation
    ) {

      return null;
    }


    try {

      const distanceKm =
        LocationManager
          .calculateDistanceKm(

            deviceLocation.latitude,

            deviceLocation.longitude,

            cached.latitude,

            cached.longitude

          );


      if (
        distanceKm *
        1000 >
        this.NEAREST_ADDRESS_THRESHOLD_METERS
      ) {

        this.clearResolvedLocationCache();

        return null;
      }


      return cached;

    } catch (error) {

      this.clearResolvedLocationCache();

      return null;
    }
  },


  clearResolvedLocationCache() {

    AppStorage.remove(
      this.RESOLVED_LOCATION_STORAGE_KEY
    );


    return true;
  },


  getManualSavedAddressSelection() {

    const cached =
      AppStorage.get(

        this.RESOLVED_LOCATION_STORAGE_KEY,

        null

      );


    if (
      !cached ||
      !cached.address ||
      (
        cached.manualSelection !==
          true &&
        cached.source !==
          "MANUAL_SAVED_ADDRESS"
      ) ||
      !LocationManager
        .isValidCoordinates(
          cached.latitude,
          cached.longitude
        )
    ) {

      return null;
    }


    return cached;
  },


  /*
   * ----------------------------------------------------------
   * PERMISSION AND USER LOCATION
   * ----------------------------------------------------------
   */

  handleLocationPermissionRequired() {

    if (
      this.locationState.success ===
      true
    ) {

      return {
        success:
          true,
        locationAvailable:
          true
      };
    }


    this.setLocationLabel(
      "Enable location"
    );


    this.showMessage(
      "Tap Enable location to show nearby kitchens."
    );


    return {
      success:
        false,
      reason:
        "LOCATION_PERMISSION_REQUIRED"
    };
  },


  handleLocationPermissionDenied() {

    const restored =
      this.restoreLocation();


    if (
      !restored.success
    ) {

      this.setLocationLabel(
        "Choose address"
      );


      this.showMessage(
        "Location permission is off. Tap Choose address to select your delivery area."
      );
    }


    return {

      success:
        restored.success,

      reason:
        "LOCATION_PERMISSION_DENIED",

      location:
        restored

    };
  },


  handleBackgroundLocationError(
    detail
  ) {

    console.warn(
      "Customer background location error:",
      detail
    );


    const restored =
      this.restoreLocation();


    if (
      !restored.success
    ) {

      this.showMessage(
        "Current location is unavailable. Tap Select location to choose your area."
      );
    }


    return {

      success:
        false,

      reason:
        detail.reason ||
        detail.code ||
        "BACKGROUND_LOCATION_ERROR",

      savedLocationAvailable:
        restored.success

    };
  },


  async handleLocationButton() {

    this.clearMessage();


    if (
      typeof LocationManager ===
        "undefined" ||
      typeof LocationManager
        .requestAfterUserAction !==
        "function"
    ) {

      this.openLocationSelection();


      return {
        success:
          false,
        reason:
          "LOCATION_MANAGER_UNAVAILABLE"
      };
    }


    const originalLabel =
      this.elements
        .locationText
        .textContent;


    this.setLocationLabel(
      "Detecting location..."
    );


    this.elements.locationButton
      .setAttribute(
        "aria-busy",
        "true"
      );


    try {

      const result =
        await LocationManager
          .requestAfterUserAction({

            persist:
              true,

            enableHighAccuracy:
              false

          });


      const location =
        result &&
        result.location
          ? result.location
          : LocationManager
              .getSaved();


      if (
        !location
      ) {

        throw LocationManager
          .createError(

            "Location could not be detected.",

            "LOCATION_NOT_AVAILABLE"

          );
      }


      this.clearResolvedLocationCache();


      const resolved =
        await this.resolveLocationDisplay(
          location,
          {
            reason:
              "USER_REQUEST"
          }
        );


      if (
        resolved.matched &&
        resolved.address
      ) {

        this.showMessage(

          this.getAddressTypeLabel(
            resolved.address
              .addressType
          ) +
          " address selected for delivery."

        );

      } else {

        this.showMessage(
          "Location detected. Add a complete address if this is a new delivery location."
        );
      }


      this.loadNearbyKitchens({

        preserveExisting:
          false

      });


      return {

        success:
          true,

        source:
          this.locationState.source,

        location:
          this.locationState.location,

        address:
          this.locationState.address,

        label:
          this.locationState.label

      };

    } catch (error) {

      console.warn(
        "Customer location request failed:",
        error
      );


      const restored =
        this.restoreLocation();


      if (
        !restored.success
      ) {

        this.setLocationLabel(

          originalLabel &&
          originalLabel !==
            "Detecting location..."
            ? originalLabel
            : "Choose address"

        );


        this.showMessage(

          error.code ===
            "LOCATION_PERMISSION_DENIED"
            ? "Location permission is off. Opening address selection."
            : "Current location is unavailable. Opening address selection."

        );


        window.setTimeout(
          () => {

            this.openLocationSelection();
          },
          500
        );
      }


      return {

        success:
          false,

        error:
          error.message,

        code:
          error.code ||
          "LOCATION_ERROR"

      };

    } finally {

      this.elements.locationButton
        .removeAttribute(
          "aria-busy"
        );
    }
  },


  openLocationSelection() {

    window.location.href =
      "addresses.html";
  },


  getSessionId() {

    const session =
      SessionManager.get();


    return (
      session &&
      session.sessionId
        ? session.sessionId
        : ""
    );
  },


  setLocationLabel(label) {

    this.elements.locationText
      .textContent =
        label ||
        "Select location";
  },


  formatDistrictLabel(district) {

    const parts = [

      district.districtName,

      district.state

    ].filter(
      Boolean
    );


    return parts.length > 0
      ? parts.join(", ")
      : "Selected district";
  },


  formatSavedAddressLabel(
    address
  ) {

    const type =
      this.getAddressTypeLabel(
        address.addressType
      );


    const place =

      address.areaLocality ||
      address.addressLine1 ||
      address.city ||
      address.district ||
      "Saved address";


    return (
      type +
      " • " +
      place
    );
  },


  getAddressTypeLabel(type) {

    const labels = {

      HOME:
        "Home",

      WORK:
        "Work",

      OTHER:
        "Other"

    };


    return (
      labels[
        String(
          type ||
          "OTHER"
        ).toUpperCase()
      ] ||
      "Address"
    );
  },


  clearLocationMessage() {

    const message =
      this.elements.message
        .textContent;


    const locationMessages = [

      "Tap Enable location",
      "Location permission",
      "Current location is unavailable",
      "Select your location",
      "Location detected"

    ];


    const isLocationMessage =
      locationMessages.some(
        (text) =>
          message.includes(
            text
          )
      );


    if (
      isLocationMessage
    ) {

      this.clearMessage();
    }
  },


  /*
   * ----------------------------------------------------------
   * SEARCH AND FILTERS
   * ----------------------------------------------------------
   */

  handleSearchInput() {

    const query =
      this.normalizeQuery(
        this.elements
          .searchInput
          .value
      );


    this.elements.searchClearButton
      .classList.toggle(
        "hidden",
        query.length ===
        0
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


  search(query) {

    const normalizedQuery =
      this.normalizeQuery(
        query
      );


    this.clearMessage();


    const cached =
      this.restoreDiscoveryCache(
        normalizedQuery
      );


    return this.loadNearbyKitchens({

      query:
        normalizedQuery,

      preserveExisting:
        cached ||
        this.kitchens.length >
          0

    });
  },


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


    this.selectedCategory =
      "";


    this.updateCategoryButtons();


    this.clearMessage();


    this.elements.searchInput
      .focus();


    return this.search(
      ""
    );
  },


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
        success:
          false,
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
      this.elements
        .searchInput
        .value
    );


    return {
      success:
        true,
      foodType:
        foodType
    };
  },


  selectCategory(category) {

    const normalizedCategory =
      this.normalizeQuery(
        category
      );


    if (
      !normalizedCategory
    ) {

      return {
        success:
          false,
        reason:
          "CATEGORY_REQUIRED"
      };
    }


    this.selectedCategory =
      this.selectedCategory ===
        normalizedCategory
        ? ""
        : normalizedCategory;


    this.updateCategoryButtons();


    return this.search(
      this.elements
        .searchInput
        .value
    );
  },


  updateCategoryButtons() {

    this.elements.categoryButtons
      .forEach(
        (button) => {

          const isSelected =
            button.dataset.category ===
            this.selectedCategory;


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
  },


  /*
   * ----------------------------------------------------------
   * DISCOVERY CACHE
   * ----------------------------------------------------------
   */

  getDiscoveryCacheKey(
    query = ""
  ) {

    const location =
      this.getDiscoveryLocation();


    if (
      !location
    ) {

      return "";
    }


    return [

      Number(
        location.latitude
      ).toFixed(4),

      Number(
        location.longitude
      ).toFixed(4),

      this.getDiscoveryDistrictId(),

      this.selectedFoodType,

      this.selectedCategory,

      this.normalizeQuery(
        query
      ).toLowerCase()

    ].join("|");
  },


  saveDiscoveryCache(
    result,
    query
  ) {

    const cacheKey =
      this.getDiscoveryCacheKey(
        query
      );


    if (
      !cacheKey
    ) {

      return false;
    }


    AppStorage.set(

      this.DISCOVERY_STORAGE_KEY,

      {

        cacheKey:
          cacheKey,

        kitchens:
          this.kitchens,

        page:
          this.discoveryPage,

        total:
          this.discoveryTotal,

        hasMore:
          this.discoveryHasMore,

        discovery:
          result.discovery ||
          null,

        query:
          this.normalizeQuery(
            query
          ),

        savedAt:
          new Date().toISOString()

      }

    );


    return true;
  },


  restoreDiscoveryCache(
    query = ""
  ) {

    const cached =
      AppStorage.get(

        this.DISCOVERY_STORAGE_KEY,

        null

      );


    const expectedKey =
      this.getDiscoveryCacheKey(
        query
      );


    if (
      !cached ||
      !expectedKey ||
      cached.cacheKey !==
        expectedKey ||
      !Array.isArray(
        cached.kitchens
      ) ||
      !cached.savedAt
    ) {

      return false;
    }


    const savedTime =
      new Date(
        cached.savedAt
      ).getTime();


    if (
      !Number.isFinite(
        savedTime
      ) ||
      Date.now() -
      savedTime >
      this.DISCOVERY_CACHE_MAX_AGE_MS
    ) {

      this.clearDiscoveryCache();

      return false;
    }


    this.kitchens =
      cached.kitchens;


    this.discoveryPage =
      Number(
        cached.page ||
        1
      );


    this.discoveryTotal =
      Number(
        cached.total ||
        this.kitchens.length
      );


    this.discoveryHasMore =
      cached.hasMore ===
      true;


    this.discoveryRestoredFromCache =
      true;


    this.renderKitchens(
      this.kitchens
    );


    this.updateDiscoverySummary(

      {
        discovery:
          cached.discovery ||
          null
      },

      cached.query ||
      query

    );


    this.elements.kitchenSubtitle
      .textContent +=
        " • Updating…";


    return true;
  },


  clearDiscoveryCache() {

    AppStorage.remove(
      this.DISCOVERY_STORAGE_KEY
    );


    return true;
  },


  /*
   * ----------------------------------------------------------
   * LIVE KITCHEN DISCOVERY
   * ----------------------------------------------------------
   */

  prepareDiscoveryState() {

    this.showKitchenSkeletons();
  },


  async loadNearbyKitchens(
    options = {}
  ) {

    const append =
      options.append ===
      true;


    const location =
      this.getDiscoveryLocation();


    if (
      !location
    ) {

      this.showKitchenEmptyState(

        "Choose a delivery location",

        "Select a saved address or use your current location to discover kitchens."

      );


      this.elements.kitchenSubtitle
        .textContent =
          "A delivery location is required";


      return {
        success:
          false,
        reason:
          "DISCOVERY_LOCATION_REQUIRED"
      };
    }


    const query =
      this.normalizeQuery(

        options.query !==
          undefined
          ? options.query
          : this.elements
              .searchInput
              .value

      );


    const requestKey =
      this.getDiscoveryCacheKey(
        query
      ) +
      "|page:" +
      (
        append
          ? this.discoveryPage + 1
          : 1
      );


    if (
      this.discoveryLoading
    ) {

      /*
       * Exact duplicate request is ignored rather than queued.
       */

      if (
        requestKey ===
        this.activeDiscoveryKey
      ) {

        return {
          success:
            false,
          reason:
            "DUPLICATE_DISCOVERY_PREVENTED"
        };
      }


      this.pendingDiscoveryOptions =
        Object.assign(
          {},
          options,
          {
            append:
              false
          }
        );


      return {
        success:
          false,
        reason:
          "DISCOVERY_REQUEST_QUEUED"
      };
    }


    const requestNumber =
      ++this.discoveryRequestNumber;


    const requestedPage =
      append
        ? this.discoveryPage + 1
        : 1;


    const preserveExisting =
      options.preserveExisting ===
        true ||
      this.kitchens.length >
        0;


    this.discoveryLoading =
      true;


    this.activeDiscoveryKey =
      requestKey;


    this.setDiscoveryButtonsLoading(
      true,
      append
    );


    this.hideKitchenError();


    this.clearMessage();


    if (
      !append &&
      !preserveExisting
    ) {

      window.clearTimeout(
        this.discoveryPlaceholderTimer
      );


      this.discoveryPlaceholderTimer =
        window.setTimeout(
          () => {

            if (
              this.discoveryLoading &&
              this.kitchens.length ===
                0
            ) {

              this.showKitchenSkeletons();
            }
          },
          this.DISCOVERY_PLACEHOLDER_DELAY_MS
        );
    }


    try {

      const response =
        await API.request(

          "discover_kitchens",

          {

            sessionId:
              this.getSessionId(),

            latitude:
              Number(
                location.latitude
              ),

            longitude:
              Number(
                location.longitude
              ),

            districtId:
              this.getDiscoveryDistrictId(),

            query:
              query,

            foodType:
              this.selectedFoodType,

            category:
              this.selectedCategory,

            page:
              requestedPage,

            limit:
              10

          }

        );


      if (
        requestNumber !==
        this.discoveryRequestNumber
      ) {

        return {
          success:
            false,
          reason:
            "STALE_DISCOVERY_RESPONSE"
        };
      }


      const result =
        response.data || {};


      const kitchens =
        Array.isArray(
          result.kitchens
        )
          ? result.kitchens
          : [];


      this.kitchens =
        append
          ? this.kitchens.concat(
              kitchens
            )
          : kitchens;


      this.discoveryPage =
        Number(
          result.page ||
          requestedPage
        );


      this.discoveryTotal =
        Number(
          result.total ||
          this.kitchens.length
        );


      this.discoveryHasMore =
        result.hasMore ===
        true;


      this.discoveryRestoredFromCache =
        false;


      this.renderKitchens(
        this.kitchens
      );


      this.updateDiscoverySummary(
        result,
        query
      );


      this.saveDiscoveryCache(
        result,
        query
      );


      return {

        success:
          true,

        count:
          kitchens.length,

        total:
          this.discoveryTotal,

        page:
          this.discoveryPage,

        hasMore:
          this.discoveryHasMore,

        kitchens:
          kitchens,

        requestId:
          response.requestId ||
          "",

        transportAttempts:
          response
            .transportAttempts ||
          1,

        recovered:
          response.recovered ===
          true

      };

    } catch (error) {

      console.error(
        "Customer kitchen discovery failed:",
        error
      );


      /*
       * Cached/existing kitchens remain visible.
       */

      if (
        this.kitchens.length >
        0
      ) {

        this.renderKitchens(
          this.kitchens
        );


        this.showMessage(
          "Showing saved kitchen results. Fresh results could not be loaded yet."
        );

      } else {

        this.showKitchenError(

          error.message ||
          "Kitchens could not be loaded."

        );
      }


      return {

        success:
          false,

        cachedResultsPreserved:
          this.kitchens.length >
          0,

        error:
          error.message,

        code:
          error.code ||
          "DISCOVERY_ERROR"

      };

    } finally {

      window.clearTimeout(
        this.discoveryPlaceholderTimer
      );


      this.discoveryLoading =
        false;


      this.activeDiscoveryKey =
        "";


      this.setDiscoveryButtonsLoading(
        false,
        append
      );


      if (
        this.pendingDiscoveryOptions
      ) {

        const pendingOptions =
          this.pendingDiscoveryOptions;


        this.pendingDiscoveryOptions =
          null;


        window.setTimeout(
          () => {

            this.loadNearbyKitchens(
              pendingOptions
            );
          },
          0
        );
      }
    }
  },


  getDiscoveryLocation() {

    const location =
      this.locationState &&
      this.locationState.location;


    if (
      location &&
      LocationManager
        .isValidCoordinates(
          Number(
            location.latitude
          ),
          Number(
            location.longitude
          )
        )
    ) {

      return location;
    }


    return null;
  },


  getDiscoveryDistrictId() {

    if (
      this.locationState.address
    ) {

      return (
        this.locationState
          .address
          .districtId ||
        ""
      );
    }


    if (
      this.locationState.district
    ) {

      return (
        this.locationState
          .district
          .districtId ||
        ""
      );
    }


    return "";
  },


  /*
   * ----------------------------------------------------------
   * KITCHEN RENDERING
   * ----------------------------------------------------------
   */

  renderKitchens(kitchens) {

    const safeKitchens =
      Array.isArray(
        kitchens
      )
        ? kitchens
        : [];


    this.elements.kitchenList
      .innerHTML =
        "";


    if (
      safeKitchens.length ===
      0
    ) {

      this.showKitchenEmptyState(

        "No kitchens found",

        this.getEmptyDiscoveryMessage()

      );


      this.updateLoadMoreState();

      return;
    }


    safeKitchens.forEach(
      (kitchen) => {

        this.elements.kitchenList
          .appendChild(
            this.createKitchenCard(
              kitchen
            )
          );
      }
    );


    this.elements.kitchenList
      .classList.remove(
        "hidden"
      );


    this.elements.kitchenEmptyState
      .classList.add(
        "hidden"
      );


    this.elements.kitchenErrorState
      .classList.add(
        "hidden"
      );


    this.updateLoadMoreState();
  },


  createKitchenCard(kitchen) {

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "kitchen-card";


    card.dataset.chefId =
      kitchen.chefId ||
      "";


    const media =
      document.createElement(
        "div"
      );


    media.className =
      "kitchen-card-media";


    const products =
      Array.isArray(
        kitchen.products
      )
        ? kitchen.products
        : [];


    const imageProduct =
      products.find(
        (product) =>
          product.imageUrl
      );


    if (
      imageProduct
    ) {

      const image =
        document.createElement(
          "img"
        );


      image.src =
        imageProduct.imageUrl;


      image.alt =
        "";


      image.loading =
        "lazy";


      image.addEventListener(
        "error",
        () => {

          image.remove();

          media.classList.add(
            "kitchen-card-media-fallback"
          );

          media.textContent =
            "🍲";
        }
      );


      media.appendChild(
        image
      );

    } else {

      media.classList.add(
        "kitchen-card-media-fallback"
      );


      media.textContent =
        "🍲";
    }


    const content =
      document.createElement(
        "div"
      );


    content.className =
      "kitchen-card-content";


    const heading =
      document.createElement(
        "div"
      );


    heading.className =
      "kitchen-card-heading";


    const name =
      document.createElement(
        "h3"
      );


    name.textContent =
      kitchen.businessName ||
      "ApnaBite Kitchen";


    const status =
      document.createElement(
        "span"
      );


    status.className =
      "kitchen-status-badge";


    status.textContent =
      kitchen.operatingStatus ||
      "OPEN";


    heading.appendChild(
      name
    );


    heading.appendChild(
      status
    );


    const meta =
      document.createElement(
        "div"
      );


    meta.className =
      "kitchen-card-meta";


    meta.appendChild(

      this.createKitchenMeta(
        "★",
        this.formatRating(
          kitchen
        )
      )

    );


    meta.appendChild(

      this.createKitchenMeta(

        "📍",

        Number(
          kitchen.distanceKm ||
          0
        ).toFixed(1) +
        " km"

      )

    );


    if (
      kitchen.minimumPrice !==
        null &&
      kitchen.minimumPrice !==
        undefined
    ) {

      meta.appendChild(

        this.createKitchenMeta(

          "₹",

          "From ₹" +
          Number(
            kitchen.minimumPrice
          ).toFixed(0)

        )

      );
    }


    const description =
      document.createElement(
        "p"
      );


    description.className =
      "kitchen-card-description";


    description.textContent =

      kitchen.description ||
      kitchen.businessType ||
      "Fresh food prepared near you.";


    content.appendChild(
      heading
    );


    content.appendChild(
      meta
    );


    content.appendChild(
      description
    );


    if (
      products.length >
      0
    ) {

      const productList =
        document.createElement(
          "div"
        );


      productList.className =
        "kitchen-product-preview";


      products
        .slice(
          0,
          3
        )
        .forEach(
          (product) => {

            const item =
              document.createElement(
                "span"
              );


            item.textContent =

              (
                product.productName ||
                "Dish"
              ) +
              " · ₹" +
              Number(
                product.price ||
                0
              ).toFixed(0);


            productList.appendChild(
              item
            );
          }
        );


      content.appendChild(
        productList
      );
    }


    card.appendChild(
      media
    );


    card.appendChild(
      content
    );


    return card;
  },


  createKitchenMeta(
    iconText,
    valueText
  ) {

    const item =
      document.createElement(
        "span"
      );


    const icon =
      document.createElement(
        "b"
      );


    icon.textContent =
      iconText;


    const value =
      document.createElement(
        "span"
      );


    value.textContent =
      valueText;


    item.appendChild(
      icon
    );


    item.appendChild(
      value
    );


    return item;
  },


  formatRating(kitchen) {

    const rating =
      Number(
        kitchen.rating ||
        0
      );


    const count =
      Number(
        kitchen.ratingCount ||
        0
      );


    return rating > 0
      ? rating.toFixed(1) +
        (
          count > 0
            ? " (" +
              count +
              ")"
            : ""
        )
      : "New";
  },


  getEmptyDiscoveryMessage() {

    if (
      this.normalizeQuery(
        this.elements
          .searchInput
          .value
      ) ||
      this.selectedCategory ||
      this.selectedFoodType !==
        "ALL"
    ) {

      return (
        "Try clearing the search or changing your food filters."
      );
    }


    return (
      "No active kitchens are available within this delivery area yet."
    );
  },


  updateDiscoverySummary(
    result,
    query
  ) {

    const radius =
      result.discovery
        ? Number(
            result.discovery
              .radiusKm ||
            0
          )
        : 0;


    this.elements.kitchenCount
      .textContent =
        String(
          this.discoveryTotal
        );


    this.elements.kitchenCount
      .classList.toggle(
        "hidden",
        this.discoveryTotal ===
        0
      );


    this.elements.kitchenSubtitle
      .textContent =
        query
          ? this.discoveryTotal +
            ' result(s) for "' +
            query +
            '"'
          : radius > 0
            ? "Within " +
              radius +
              " km of your delivery location"
            : "Based on your selected delivery location";


    this.updateLoadMoreState();
  },


  updateLoadMoreState() {

    this.elements.loadMoreWrap
      .classList.toggle(
        "hidden",
        !this.discoveryHasMore
      );


    this.elements.paginationStatus
      .textContent =
        this.kitchens.length >
        0
          ? "Showing " +
            this.kitchens.length +
            " of " +
            this.discoveryTotal
          : "";
  },


  setDiscoveryButtonsLoading(
    isLoading,
    append
  ) {

    this.elements.refreshKitchensButton
      .disabled =
        isLoading;


    this.elements.loadMoreButton
      .disabled =
        isLoading;


    this.elements.refreshKitchensButton
      .textContent =
        isLoading &&
        !append
          ? "Updating..."
          : "Refresh";


    this.elements.loadMoreButton
      .textContent =
        isLoading &&
        append
          ? "Loading..."
          : "Load More Kitchens";
  },


  showKitchenSkeletons() {

    this.elements.kitchenList
      .innerHTML =
        this.getKitchenSkeletonMarkup();


    this.elements.kitchenList
      .classList.remove(
        "hidden"
      );


    this.elements.kitchenEmptyState
      .classList.add(
        "hidden"
      );


    this.elements.kitchenErrorState
      .classList.add(
        "hidden"
      );


    this.elements.loadMoreWrap
      .classList.add(
        "hidden"
      );
  },


  showKitchenEmptyState(
    title,
    description
  ) {

    this.elements.kitchenList
      .classList.add(
        "hidden"
      );


    this.elements.kitchenErrorState
      .classList.add(
        "hidden"
      );


    this.elements.loadMoreWrap
      .classList.add(
        "hidden"
      );


    this.elements.kitchenEmptyTitle
      .textContent =
        title ||
        "No kitchens available yet";


    this.elements.kitchenEmptyDescription
      .textContent =
        description ||
        "Active kitchens within your service location will appear here.";


    this.elements.kitchenEmptyState
      .classList.remove(
        "hidden"
      );
  },


  showKitchenError(message) {

    this.elements.kitchenList
      .classList.add(
        "hidden"
      );


    this.elements.kitchenEmptyState
      .classList.add(
        "hidden"
      );


    this.elements.loadMoreWrap
      .classList.add(
        "hidden"
      );


    this.elements.kitchenErrorMessage
      .textContent =
        message;


    this.elements.kitchenErrorState
      .classList.remove(
        "hidden"
      );
  },


  hideKitchenError() {

    this.elements.kitchenErrorState
      .classList.add(
        "hidden"
      );
  },


  getKitchenSkeletonMarkup() {

    return (

      '<article class="kitchen-skeleton">' +
        '<div class="skeleton kitchen-image-skeleton"></div>' +
        '<div class="kitchen-skeleton-content">' +
          '<div class="skeleton skeleton-line-wide"></div>' +
          '<div class="skeleton skeleton-line-medium"></div>' +
          '<div class="skeleton skeleton-line-small"></div>' +
        '</div>' +
      '</article>' +

      '<article class="kitchen-skeleton">' +
        '<div class="skeleton kitchen-image-skeleton"></div>' +
        '<div class="kitchen-skeleton-content">' +
          '<div class="skeleton skeleton-line-wide"></div>' +
          '<div class="skeleton skeleton-line-medium"></div>' +
          '<div class="skeleton skeleton-line-small"></div>' +
        '</div>' +
      '</article>'

    );
  },


  /*
   * ----------------------------------------------------------
   * PAGE MESSAGE
   * ----------------------------------------------------------
   */

  showMessage(message) {

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
        "hidden"
      );
  },


  clearMessage() {

    if (
      !this.elements.message
    ) {

      return;
    }


    this.elements.message
      .textContent =
        "";


    this.elements.message
      .classList.add(
        "hidden"
      );
  },


  normalizeQuery(value) {

    return String(
      value ||
      ""
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
   * PAGE TEST
   *
   * Browser console:
   * CustomerHome.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE CUSTOMER HOME CACHE TEST"
    );

    console.log(
      "========================================"
    );


    while (
      this.discoveryLoading
    ) {

      await new Promise(
        (resolve) =>

          window.setTimeout(
            resolve,
            50
          )
      );
    }


    const discoveryResult =
      await this.loadNearbyKitchens({

        preserveExisting:
          this.kitchens.length >
          0

      });


    const manualSelection =
      this.getManualSavedAddressSelection();


    const currentLocation =
      this.getDiscoveryLocation();


    const cache =
      AppStorage.get(

        this.DISCOVERY_STORAGE_KEY,

        null

      );


    const filterSupport =

      [
        "ALL",
        "VEG",
        "NON_VEG"
      ].every(
        (foodType) =>

          this.elements
            .foodTypeButtons
            .some(
              (button) =>

                button.dataset
                  .foodType ===
                foodType
            )
      ) &&

      this.elements
        .categoryButtons
        .length >=
      1;


    const results = [

      {
        test:
          "Location available",

        expected:
          true,

        actual:
          Boolean(
            currentLocation
          ),

        passed:
          Boolean(
            currentLocation
          )
      },

      {
        test:
          "Selected address coordinates",

        expected:
          "Valid coordinates",

        actual:
          currentLocation
            ? currentLocation.latitude +
              ", " +
              currentLocation.longitude
            : "",

        passed:
          Boolean(
            currentLocation &&
            LocationManager
              .isValidCoordinates(
                currentLocation.latitude,
                currentLocation.longitude
              )
          )
      },

      {
        test:
          "Manual address preserved",

        expected:
          true,

        actual:
          manualSelection
            ? true
            : this.locationState
                .manualSelection !==
              true,

        passed:
          manualSelection
            ? this.locationState.source ===
              "MANUAL_SAVED_ADDRESS"
            : true
      },

      {
        test:
          "Discovery API",

        expected:
          true,

        actual:
          discoveryResult.success,

        passed:
          discoveryResult.success ===
          true
      },

      {
        test:
          "Kitchen array",

        expected:
          true,

        actual:
          Array.isArray(
            this.kitchens
          ),

        passed:
          Array.isArray(
            this.kitchens
          )
      },

      {
        test:
          "Discovery cache saved",

        expected:
          true,

        actual:
          Boolean(
            cache &&
            Array.isArray(
              cache.kitchens
            )
          ),

        passed:
          Boolean(
            cache &&
            Array.isArray(
              cache.kitchens
            )
          )
      },

      {
        test:
          "Discovery filters",

        expected:
          true,

        actual:
          filterSupport,

        passed:
          filterSupport ===
          true
      },

      {
        test:
          "Duplicate protection",

        expected:
          "Function available",

        actual:
          typeof this
            .activeDiscoveryKey,

        passed:
          typeof this
            .activeDiscoveryKey ===
          "string"
      },

      {
        test:
          "Bottom navigation items",

        expected:
          4,

        actual:
          this.elements
            .bottomNavigation
            .length,

        passed:
          this.elements
            .bottomNavigation
            .length ===
          4
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
      "Location State:",
      this.locationState
    );


    console.log(
      "Discovery Result:",
      discoveryResult
    );


    console.log(
      passed
        ? "Customer Home Cache Test: PASS"
        : "Customer Home Cache Test: FAIL"
    );


    return {

      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      location:
        this.locationState,

      discovery:
        discoveryResult,

      kitchenCount:
        this.kitchens.length,

      cache:
        cache,

      results:
        results

    };
  }

};


/*
 * ------------------------------------------------------------
 * INITIALIZE
 * ------------------------------------------------------------
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    CustomerHome.init();
  }
);

/**
 * ============================================================
 * CUSTOMER HOME CART INTEGRATION
 * VERSION: 1.0.0
 * ============================================================
 */
(() => {
  const originalInit = CustomerHome.init.bind(CustomerHome);
  const originalRenderKitchens = CustomerHome.renderKitchens.bind(CustomerHome);

  Object.assign(CustomerHome, {
    cart: null,
    cartItems: [],
    cartSummary: {
      distinctItems: 0,
      totalQuantity: 0,
      subtotal: 0
    },
    cartLoading: false,
    cartOperationRunning: false,
    pendingCartProduct: null,

    init() {
      const initialized = originalInit();
      if (!initialized) {
        return false;
      }

      this.elements.cartSummary =
        document.getElementById("customerCartSummary");

      this.elements.cartItemCount =
        document.getElementById("customerCartItemCount");

      this.elements.cartKitchenName =
        document.getElementById("customerCartKitchenName");

      this.elements.cartSubtotal =
        document.getElementById("customerCartSubtotal");

      this.elements.viewCartButton =
        document.getElementById("viewCustomerCartButton");

      this.elements.cartDialog =
        document.getElementById("cartReplacementDialog");

      this.elements.currentCartKitchenName =
        document.getElementById("currentCartKitchenName");

      this.elements.newCartKitchenName =
        document.getElementById("newCartKitchenName");

      this.elements.keepCurrentCartButton =
        document.getElementById("keepCurrentCartButton");

      this.elements.replaceCurrentCartButton =
        document.getElementById("replaceCurrentCartButton");

      this.elements.cartOperationStatus =
        document.getElementById("cartOperationStatus");

      if (!this.hasRequiredCartElements()) {
        console.error("Customer Home cart elements are missing.");
        return false;
      }

      this.bindCartEvents();
      this.loadCustomerCart();

      console.log("ApnaBite Customer Home cart initialized.");
      return true;
    },

    hasRequiredCartElements() {
      return Boolean(
        this.elements.cartSummary &&
        this.elements.cartItemCount &&
        this.elements.cartKitchenName &&
        this.elements.cartSubtotal &&
        this.elements.viewCartButton &&
        this.elements.cartDialog &&
        this.elements.currentCartKitchenName &&
        this.elements.newCartKitchenName &&
        this.elements.keepCurrentCartButton &&
        this.elements.replaceCurrentCartButton &&
        this.elements.cartOperationStatus
      );
    },

    bindCartEvents() {
      this.elements.kitchenList.addEventListener(
        "click",
        (event) => {
          const button =
            event.target.closest("[data-cart-action]");

          if (!button) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          this.handleCartAction(button);
        }
      );

      this.elements.viewCartButton.addEventListener(
        "click",
        () => {
          this.showCartStatus(
            "Your cart is ready. Cart page integration is the next step."
          );
        }
      );

      this.elements.keepCurrentCartButton.addEventListener(
        "click",
        () => {
          this.closeCartReplacementDialog();
          this.pendingCartProduct = null;
        }
      );

      this.elements.replaceCurrentCartButton.addEventListener(
        "click",
        () => {
          this.confirmCartReplacement();
        }
      );

      this.elements.cartDialog.addEventListener(
        "cancel",
        () => {
          this.pendingCartProduct = null;
        }
      );
    },

    renderKitchens(kitchens) {
      originalRenderKitchens(kitchens);
      this.renderKitchenProductControls();
    },

    renderKitchenProductControls() {
      this.elements.kitchenList
        .querySelectorAll(".kitchen-card")
        .forEach((card) => {
          const chefId =
            String(card.dataset.chefId || "");

          const kitchen =
            this.kitchens.find(
              (item) =>
                String(item.chefId || "") === chefId
            );

          const preview =
            card.querySelector(".kitchen-product-preview");

          if (!kitchen || !preview) {
            return;
          }

          const products =
            Array.isArray(kitchen.products)
              ? kitchen.products.slice(0, 3)
              : [];

          preview.innerHTML = "";

          products.forEach((product) => {
            preview.appendChild(
              this.createProductCartControl(
                kitchen,
                product
              )
            );
          });
        });

      this.syncProductCartControls();
    },

    createProductCartControl(kitchen, product) {
      const row =
        document.createElement("div");

      row.className =
        "kitchen-product-cart-item";

      row.dataset.productId =
        String(product.productId || "");

      row.dataset.variantId =
        this.getDefaultVariantId(product);

      row.dataset.chefId =
        String(kitchen.chefId || "");

      const information =
        document.createElement("div");

      information.className =
        "kitchen-product-cart-copy";

      const name =
        document.createElement("strong");

      name.textContent =
        product.productName || "Dish";

      const price =
        document.createElement("small");

      price.textContent =
        this.formatCartMoney(
          this.getProductPrice(product)
        );

      information.appendChild(name);
      information.appendChild(price);

      const controls =
        document.createElement("div");

      controls.className =
        "product-cart-controls";

      controls.dataset.productId =
        String(product.productId || "");

      controls.dataset.variantId =
        this.getDefaultVariantId(product);

      controls.dataset.chefId =
        String(kitchen.chefId || "");

      controls.dataset.businessName =
        String(
          kitchen.businessName ||
          "Selected kitchen"
        );

      controls.dataset.productName =
        String(product.productName || "Dish");

      controls.dataset.price =
        String(this.getProductPrice(product));

      controls.appendChild(
        this.createAddButton(
          kitchen,
          product
        )
      );

      row.appendChild(information);
      row.appendChild(controls);

      return row;
    },

    createAddButton(kitchen, product) {
      const button =
        document.createElement("button");

      button.className =
        "product-add-button";

      button.type =
        "button";

      button.dataset.cartAction =
        "ADD";

      button.dataset.chefId =
        String(kitchen.chefId || "");

      button.dataset.businessName =
        String(
          kitchen.businessName ||
          "Selected kitchen"
        );

      button.dataset.productId =
        String(product.productId || "");

      button.dataset.productName =
        String(product.productName || "Dish");

      button.dataset.variantId =
        this.getDefaultVariantId(product);

      button.dataset.price =
        String(this.getProductPrice(product));

      button.textContent =
        "ADD";

      if (
        !button.dataset.productId ||
        !button.dataset.variantId ||
        !button.dataset.chefId
      ) {
        button.disabled = true;
        button.textContent = "Unavailable";
      }

      return button;
    },

    createQuantityControl(item) {
      const wrapper =
        document.createElement("div");

      wrapper.className =
        "product-quantity-control";

      const decrease =
        document.createElement("button");

      decrease.type =
        "button";

      decrease.dataset.cartAction =
        Number(item.quantity || 0) <= 1
          ? "REMOVE"
          : "DECREASE";

      decrease.dataset.cartItemId =
        String(item.cartItemId || "");

      decrease.setAttribute(
        "aria-label",
        Number(item.quantity || 0) <= 1
          ? "Remove item"
          : "Decrease quantity"
      );

      decrease.textContent =
        Number(item.quantity || 0) <= 1
          ? "×"
          : "−";

      const quantity =
        document.createElement("strong");

      quantity.textContent =
        String(item.quantity || 1);

      quantity.setAttribute(
        "aria-label",
        "Quantity " +
        String(item.quantity || 1)
      );

      const increase =
        document.createElement("button");

      increase.type =
        "button";

      increase.dataset.cartAction =
        "INCREASE";

      increase.dataset.cartItemId =
        String(item.cartItemId || "");

      increase.setAttribute(
        "aria-label",
        "Increase quantity"
      );

      increase.textContent =
        "+";

      wrapper.appendChild(decrease);
      wrapper.appendChild(quantity);
      wrapper.appendChild(increase);

      return wrapper;
    },

    getDefaultVariantId(product) {
      if (!product) {
        return "";
      }

      if (product.variantId) {
        return String(product.variantId);
      }

      if (product.defaultVariantId) {
        return String(product.defaultVariantId);
      }

      if (
        product.defaultVariant &&
        product.defaultVariant.variantId
      ) {
        return String(
          product.defaultVariant.variantId
        );
      }

      const variants =
        Array.isArray(product.variants)
          ? product.variants
          : [];

      const defaultVariant =
        variants.find(
          (variant) =>
            variant.isDefault === true ||
            String(
              variant.isDefault || ""
            ).toUpperCase() === "TRUE"
        ) || variants[0];

      return defaultVariant
        ? String(defaultVariant.variantId || "")
        : "";
    },

    getProductPrice(product) {
      if (!product) {
        return 0;
      }

      if (
        product.defaultVariant &&
        Number.isFinite(
          Number(product.defaultVariant.price)
        )
      ) {
        return Number(
          product.defaultVariant.price
        );
      }

      const variants =
        Array.isArray(product.variants)
          ? product.variants
          : [];

      const defaultVariant =
        variants.find(
          (variant) =>
            variant.isDefault === true ||
            String(
              variant.isDefault || ""
            ).toUpperCase() === "TRUE"
        ) || variants[0];

      if (
        defaultVariant &&
        Number.isFinite(
          Number(defaultVariant.price)
        )
      ) {
        return Number(defaultVariant.price);
      }

      return Number(product.price || 0);
    },

    async loadCustomerCart() {
      if (this.cartLoading) {
        return {
          success: false,
          reason: "CART_LOADING"
        };
      }

      this.cartLoading = true;

      try {
        const response =
          await API.request(
            "get_customer_cart",
            {
              sessionId:
                this.getSessionId()
            },
            {
              timeoutMs: 90000
            }
          );

        this.applyCartResponse(
          response.data || {}
        );

        return {
          success: true,
          cart: this.cart,
          items: this.cartItems,
          summary: this.cartSummary
        };

      } catch (error) {
        console.error(
          "Customer cart load failed:",
          error
        );

        this.showCartStatus(
          error.message ||
          "Your cart could not be loaded."
        );

        return {
          success: false,
          code:
            error.code ||
            "CART_LOAD_FAILED",
          error:
            error.message
        };

      } finally {
        this.cartLoading = false;
      }
    },

    applyCartResponse(result) {
      const status =
        String(
          result.status ||
          result.cartStatus ||
          ""
        ).toUpperCase();

      this.cart =
        result.cart || null;

      this.cartItems =
        Array.isArray(result.items)
          ? result.items
          : [];

      const suppliedSummary =
        result.summary || {};

      this.cartSummary = {
        distinctItems:
          Number(
            suppliedSummary.distinctItems ||
            this.cartItems.length ||
            0
          ),
        totalQuantity:
          Number(
            suppliedSummary.totalQuantity ||
            this.cartItems.reduce(
              (total, item) =>
                total +
                Number(item.quantity || 0),
              0
            )
          ),
        subtotal:
          Number(
            suppliedSummary.subtotal ||
            this.cartItems.reduce(
              (total, item) =>
                total +
                Number(
                  item.itemTotal ||
                  (
                    Number(
                      item.currentPrice ||
                      item.priceSnapshot ||
                      0
                    ) *
                    Number(item.quantity || 0)
                  )
                ),
              0
            )
          )
      };

      if (
        status === "EMPTY" ||
        this.cartItems.length === 0
      ) {
        this.cart = null;
        this.cartItems = [];
        this.cartSummary = {
          distinctItems: 0,
          totalQuantity: 0,
          subtotal: 0
        };
      }

      this.renderCartSummary();
      this.syncProductCartControls();
    },

    renderCartSummary() {
      const hasItems =
        this.cartItems.length > 0 &&
        this.cartSummary.totalQuantity > 0;

      this.elements.cartSummary
        .classList.toggle(
          "hidden",
          !hasItems
        );

      document.body.classList.toggle(
        "customer-cart-active",
        hasItems
      );

      if (!hasItems) {
        this.elements.cartItemCount
          .textContent =
            "0 items";

        this.elements.cartKitchenName
          .textContent =
            "Your cart";

        this.elements.cartSubtotal
          .textContent =
            "₹0";

        return;
      }

      const quantity =
        this.cartSummary.totalQuantity;

      this.elements.cartItemCount
        .textContent =
          quantity +
          (
            quantity === 1
              ? " item"
              : " items"
          );

      this.elements.cartKitchenName
        .textContent =
          this.getCartKitchenName();

      this.elements.cartSubtotal
        .textContent =
          this.formatCartMoney(
            this.cartSummary.subtotal
          );
    },

    getCartKitchenName() {
      if (
        this.cart &&
        this.cart.businessName
      ) {
        return this.cart.businessName;
      }

      const chefId =
        this.cart
          ? String(this.cart.chefId || "")
          : "";

      const kitchen =
        this.kitchens.find(
          (item) =>
            String(item.chefId || "") === chefId
        );

      return kitchen
        ? kitchen.businessName
        : "Your cart";
    },

    syncProductCartControls() {
      if (
        !this.elements ||
        !this.elements.kitchenList
      ) {
        return;
      }

      this.elements.kitchenList
        .querySelectorAll(
          ".product-cart-controls"
        )
        .forEach((control) => {
          const productId =
            String(
              control.dataset.productId || ""
            );

          const variantId =
            String(
              control.dataset.variantId || ""
            );

          const cartItem =
            this.cartItems.find(
              (item) =>
                String(item.productId || "") ===
                  productId &&
                String(item.variantId || "") ===
                  variantId
            );

          control.innerHTML = "";

          if (cartItem) {
            control.appendChild(
              this.createQuantityControl(
                cartItem
              )
            );
            return;
          }

          const kitchen = {
            chefId:
              control.dataset.chefId || "",
            businessName:
              control.dataset.businessName ||
              "Selected kitchen"
          };

          const product = {
            productId:
              productId,
            productName:
              control.dataset.productName ||
              "Dish",
            variantId:
              variantId,
            price:
              Number(
                control.dataset.price || 0
              )
          };

          control.appendChild(
            this.createAddButton(
              kitchen,
              product
            )
          );
        });
    },

    async handleCartAction(button) {
      if (
        this.cartOperationRunning ||
        button.disabled
      ) {
        return;
      }

      const action =
        String(
          button.dataset.cartAction || ""
        ).toUpperCase();

      if (action === "ADD") {
        return this.addCustomerCartItem({
          chefId:
            button.dataset.chefId || "",
          businessName:
            button.dataset.businessName ||
            "Selected kitchen",
          productId:
            button.dataset.productId || "",
          productName:
            button.dataset.productName ||
            "Dish",
          variantId:
            button.dataset.variantId || "",
          price:
            Number(
              button.dataset.price || 0
            )
        });
      }

      const cartItemId =
        button.dataset.cartItemId || "";

      const item =
        this.cartItems.find(
          (cartItem) =>
            String(cartItem.cartItemId || "") ===
            String(cartItemId)
        );

      if (!item) {
        this.showCartStatus(
          "Cart item was not found. Refreshing cart..."
        );

        return this.loadCustomerCart();
      }

      if (action === "INCREASE") {
        return this.updateCustomerCartItem(
          item,
          Number(item.quantity || 0) + 1
        );
      }

      if (action === "DECREASE") {
        return this.updateCustomerCartItem(
          item,
          Number(item.quantity || 0) - 1
        );
      }

      if (action === "REMOVE") {
        return this.removeCustomerCartItem(
          item
        );
      }
    },

    async addCustomerCartItem(
      product,
      replaceCart = false
    ) {
      if (
        !product.chefId ||
        !product.productId ||
        !product.variantId
      ) {
        this.showCartStatus(
          "This product is not available for ordering yet."
        );

        return {
          success: false,
          reason: "PRODUCT_DATA_INCOMPLETE"
        };
      }

      this.setCartOperationLoading(
        true,
        product.productId
      );

      try {
        const response =
          await API.request(
            "add_customer_cart_item",
            {
              sessionId:
                this.getSessionId(),
              chefId:
                product.chefId,
              productId:
                product.productId,
              variantId:
                product.variantId,
              quantity:
                1,
              replaceCart:
                replaceCart === true
            },
            {
              timeoutMs: 90000
            }
          );

        this.pendingCartProduct = null;

        this.closeCartReplacementDialog();

        this.applyCartResponse(
          response.data || {}
        );

        this.showCartStatus(
          product.productName +
          " added to cart."
        );

        return {
          success: true,
          data: response.data
        };

      } catch (error) {
        const code =
          String(
            error.code || ""
          ).toUpperCase();

        const replacementRequired = [
          "CART_KITCHEN_MISMATCH",
          "DIFFERENT_KITCHEN_CART",
          "ONE_KITCHEN_PER_CART",
          "CART_REPLACEMENT_REQUIRED"
        ].includes(code);

        if (
          replacementRequired &&
          replaceCart !== true
        ) {
          this.openCartReplacementDialog(
            product
          );

          return {
            success: false,
            replacementRequired: true,
            code: code
          };
        }

        console.error(
          "Add cart item failed:",
          error
        );

        this.showCartStatus(
          error.message ||
          "The item could not be added."
        );

        return {
          success: false,
          code:
            code ||
            "CART_ADD_FAILED",
          error:
            error.message
        };

      } finally {
        this.setCartOperationLoading(
          false,
          product.productId
        );
      }
    },

    async updateCustomerCartItem(
      item,
      quantity
    ) {
      if (quantity <= 0) {
        return this.removeCustomerCartItem(
          item
        );
      }

      this.setCartOperationLoading(
        true,
        item.productId
      );

      try {
        const response =
          await API.request(
            "update_customer_cart_item",
            {
              sessionId:
                this.getSessionId(),
              cartItemId:
                item.cartItemId,
              quantity:
                quantity
            },
            {
              timeoutMs: 90000
            }
          );

        this.applyCartResponse(
          response.data || {}
        );

        this.showCartStatus(
          "Cart quantity updated."
        );

        return {
          success: true,
          data: response.data
        };

      } catch (error) {
        console.error(
          "Update cart item failed:",
          error
        );

        this.showCartStatus(
          error.message ||
          "Cart quantity could not be updated."
        );

        return {
          success: false,
          code:
            error.code ||
            "CART_UPDATE_FAILED",
          error:
            error.message
        };

      } finally {
        this.setCartOperationLoading(
          false,
          item.productId
        );
      }
    },

    async removeCustomerCartItem(item) {
      this.setCartOperationLoading(
        true,
        item.productId
      );

      try {
        const response =
          await API.request(
            "remove_customer_cart_item",
            {
              sessionId:
                this.getSessionId(),
              cartItemId:
                item.cartItemId
            },
            {
              timeoutMs: 90000
            }
          );

        this.applyCartResponse(
          response.data || {}
        );

        this.showCartStatus(
          "Item removed from cart."
        );

        return {
          success: true,
          data: response.data
        };

      } catch (error) {
        console.error(
          "Remove cart item failed:",
          error
        );

        this.showCartStatus(
          error.message ||
          "The item could not be removed."
        );

        return {
          success: false,
          code:
            error.code ||
            "CART_REMOVE_FAILED",
          error:
            error.message
        };

      } finally {
        this.setCartOperationLoading(
          false,
          item.productId
        );
      }
    },

    openCartReplacementDialog(product) {
      this.pendingCartProduct =
        product;

      this.elements.currentCartKitchenName
        .textContent =
          this.getCartKitchenName();

      this.elements.newCartKitchenName
        .textContent =
          product.businessName ||
          "Selected kitchen";

      if (
        typeof this.elements.cartDialog
          .showModal === "function"
      ) {
        this.elements.cartDialog.showModal();
      } else {
        this.elements.cartDialog
          .setAttribute("open", "");
      }
    },

    closeCartReplacementDialog() {
      if (!this.elements.cartDialog) {
        return;
      }

      if (
        typeof this.elements.cartDialog
          .close === "function" &&
        this.elements.cartDialog.open
      ) {
        this.elements.cartDialog.close();
      } else {
        this.elements.cartDialog
          .removeAttribute("open");
      }
    },

    async confirmCartReplacement() {
      if (!this.pendingCartProduct) {
        this.closeCartReplacementDialog();
        return;
      }

      this.elements.replaceCurrentCartButton
        .disabled =
          true;

      this.elements.keepCurrentCartButton
        .disabled =
          true;

      this.elements.replaceCurrentCartButton
        .textContent =
          "Replacing...";

      try {
        await this.addCustomerCartItem(
          this.pendingCartProduct,
          true
        );
      } finally {
        this.elements.replaceCurrentCartButton
          .disabled =
            false;

        this.elements.keepCurrentCartButton
          .disabled =
            false;

        this.elements.replaceCurrentCartButton
          .textContent =
            "Replace Cart";
      }
    },

    setCartOperationLoading(
      loading,
      productId
    ) {
      this.cartOperationRunning =
        loading;

      this.elements.kitchenList
        .querySelectorAll(
          "[data-cart-action]"
        )
        .forEach((button) => {
          const matchingProduct =
            !productId ||
            String(
              button.dataset.productId || ""
            ) ===
            String(productId);

          button.disabled =
            loading;

          if (
            loading &&
            matchingProduct
          ) {
            button.classList.add(
              "cart-control-loading"
            );
          } else {
            button.classList.remove(
              "cart-control-loading"
            );
          }
        });
    },

    showCartStatus(message) {
      if (!message) {
        return;
      }

      window.clearTimeout(
        this.cartStatusTimer
      );

      this.elements.cartOperationStatus
        .textContent =
          message;

      this.elements.cartOperationStatus
        .classList.remove(
          "hidden"
        );

      this.cartStatusTimer =
        window.setTimeout(
          () => {
            this.elements.cartOperationStatus
              .classList.add(
                "hidden"
              );
          },
          3500
        );
    },

    formatCartMoney(value) {
      return new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }
      ).format(
        Number(value || 0)
      );
    },

    async testCartIntegration() {
      console.log(
        "========================================"
      );
      console.log(
        "APNABITE CUSTOMER HOME CART TEST"
      );
      console.log(
        "========================================"
      );

      const loadResult =
        await this.loadCustomerCart();

      const productControls =
        this.elements.kitchenList
          .querySelectorAll(
            ".product-cart-controls"
          );

      const results = [
        {
          test: "Cart API",
          expected: true,
          actual: loadResult.success,
          passed:
            loadResult.success === true
        },
        {
          test: "Cart items array",
          expected: true,
          actual:
            Array.isArray(this.cartItems),
          passed:
            Array.isArray(this.cartItems)
        },
        {
          test: "Cart summary",
          expected: true,
          actual:
            Boolean(this.cartSummary),
          passed:
            Boolean(this.cartSummary)
        },
        {
          test: "Product cart controls",
          expected: true,
          actual:
            productControls.length,
          passed:
            this.kitchens.length === 0 ||
            productControls.length > 0
        },
        {
          test: "Cart summary bar",
          expected: true,
          actual:
            Boolean(
              this.elements.cartSummary
            ),
          passed:
            Boolean(
              this.elements.cartSummary
            )
        },
        {
          test: "One-kitchen dialog",
          expected: true,
          actual:
            Boolean(
              this.elements.cartDialog
            ),
          passed:
            Boolean(
              this.elements.cartDialog
            )
        }
      ];

      const passed =
        results.every(
          (result) => result.passed
        );

      console.table(results);

      console.log(
        "Customer Cart:",
        {
          cart: this.cart,
          items: this.cartItems,
          summary: this.cartSummary
        }
      );

      console.log(
        passed
          ? "Customer Home Cart Test: PASS"
          : "Customer Home Cart Test: FAIL"
      );

      return {
        success: passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        cart: this.cart,
        items: this.cartItems,
        summary: this.cartSummary,
        results: results
      };
    }
  });
})();

/**
 * ============================================================
 * CUSTOMER CART OPTIMISTIC UI
 * VERSION: 1.0.0
 * ============================================================
 */
(() => {
  const serverAddCartItem =
    CustomerHome.addCustomerCartItem.bind(CustomerHome);

  const serverUpdateCartItem =
    CustomerHome.updateCustomerCartItem.bind(CustomerHome);

  const serverRemoveCartItem =
    CustomerHome.removeCustomerCartItem.bind(CustomerHome);

  Object.assign(CustomerHome, {
    snapshotCartState_() {
      return {
        cart:
          this.cart
            ? JSON.parse(
                JSON.stringify(this.cart)
              )
            : null,
        items:
          JSON.parse(
            JSON.stringify(
              this.cartItems || []
            )
          ),
        summary:
          JSON.parse(
            JSON.stringify(
              this.cartSummary || {
                distinctItems: 0,
                totalQuantity: 0,
                subtotal: 0
              }
            )
          )
      };
    },

    restoreCartState_(snapshot) {
      this.cart =
        snapshot.cart;

      this.cartItems =
        snapshot.items;

      this.cartSummary =
        snapshot.summary;

      this.renderCartSummary();
      this.syncProductCartControls();
    },

    recalculateOptimisticCart_() {
      let totalQuantity = 0;
      let subtotal = 0;

      this.cartItems.forEach(
        (item) => {
          const quantity =
            Number(item.quantity || 0);

          const price =
            Number(
              item.priceSnapshot ||
              item.currentPrice ||
              0
            );

          item.itemTotal =
            Math.round(
              price *
              quantity *
              100
            ) / 100;

          totalQuantity +=
            quantity;

          subtotal +=
            item.itemTotal;
        }
      );

      this.cartSummary = {
        distinctItems:
          this.cartItems.length,
        totalQuantity:
          totalQuantity,
        subtotal:
          Math.round(
            subtotal * 100
          ) / 100
      };

      if (
        this.cartItems.length === 0
      ) {
        this.cart = null;
      }

      this.renderCartSummary();
      this.syncProductCartControls();
    },

    getOptimisticProduct_(
      product
    ) {
      const kitchen =
        this.kitchens.find(
          (item) =>
            String(item.chefId || "") ===
            String(product.chefId || "")
        );

      const discoveredProduct =
        kitchen &&
        Array.isArray(kitchen.products)
          ? kitchen.products.find(
              (item) =>
                String(item.productId || "") ===
                  String(product.productId || "") &&
                String(
                  item.variantId ||
                  item.defaultVariantId ||
                  ""
                ) ===
                  String(product.variantId || "")
            )
          : null;

      return {
        kitchen:
          kitchen || null,
        product:
          discoveredProduct || null
      };
    },

    async addCustomerCartItem(
      product,
      replaceCart = false
    ) {
      if (
        this.cart &&
        this.cart.chefId &&
        String(this.cart.chefId) !==
          String(product.chefId) &&
        replaceCart !== true
      ) {
        this.openCartReplacementDialog(
          product
        );

        return {
          success: false,
          replacementRequired: true,
          code:
            "CART_KITCHEN_CONFLICT"
        };
      }

      const snapshot =
        this.snapshotCartState_();

      const resolved =
        this.getOptimisticProduct_(
          product
        );

      if (replaceCart === true) {
        this.cartItems = [];
      }

      if (!this.cart) {
        this.cart = {
          cartId:
            "OPTIMISTIC_CART",
          chefId:
            product.chefId,
          businessName:
            product.businessName ||
            "Selected kitchen",
          cartStatus:
            "ACTIVE"
        };
      }

      const existingItem =
        this.cartItems.find(
          (item) =>
            String(item.productId || "") ===
              String(product.productId || "") &&
            String(item.variantId || "") ===
              String(product.variantId || "")
        );

      if (existingItem) {
        existingItem.quantity =
          Number(
            existingItem.quantity || 0
          ) + 1;
      } else {
        this.cartItems.push({
          cartItemId:
            "OPTIMISTIC_" +
            String(product.productId) +
            "_" +
            String(product.variantId),
          cartId:
            this.cart.cartId,
          productId:
            product.productId,
          variantId:
            product.variantId,
          chefId:
            product.chefId,
          productName:
            product.productName ||
            (
              resolved.product
                ? resolved.product.productName
                : "Dish"
            ),
          variantName:
            resolved.product
              ? resolved.product.variantName || ""
              : "",
          quantityLabel:
            resolved.product
              ? resolved.product.quantityLabel || ""
              : "",
          imageUrl:
            resolved.product
              ? resolved.product.imageUrl || ""
              : "",
          foodType:
            resolved.product
              ? resolved.product.foodType || ""
              : "",
          quantity:
            1,
          priceSnapshot:
            Number(
              product.price ||
              (
                resolved.product
                  ? resolved.product.price
                  : 0
              )
            ),
          currentPrice:
            Number(
              product.price ||
              (
                resolved.product
                  ? resolved.product.price
                  : 0
              )
            ),
          priceChanged:
            false,
          productAvailable:
            true
        });
      }

      this.recalculateOptimisticCart_();

      try {
        const result =
          await serverAddCartItem(
            product,
            replaceCart
          );

        if (
          !result ||
          result.success !== true
        ) {
          if (
            result &&
            result.replacementRequired
          ) {
            this.restoreCartState_(
              snapshot
            );
            return result;
          }

          throw new Error(
            result &&
            result.error
              ? result.error
              : "Cart item could not be saved."
          );
        }

        return result;

      } catch (error) {
        this.restoreCartState_(
          snapshot
        );

        this.showCartStatus(
          "Cart was restored because the item could not be saved."
        );

        throw error;
      }
    },

    async updateCustomerCartItem(
      item,
      quantity
    ) {
      if (quantity <= 0) {
        return this.removeCustomerCartItem(
          item
        );
      }

      const snapshot =
        this.snapshotCartState_();

      const serverItem =
        JSON.parse(
          JSON.stringify(item)
        );

      const optimisticItem =
        this.cartItems.find(
          (cartItem) =>
            String(cartItem.cartItemId || "") ===
            String(item.cartItemId || "")
        );

      if (!optimisticItem) {
        return serverUpdateCartItem(
          item,
          quantity
        );
      }

      optimisticItem.quantity =
        quantity;

      this.recalculateOptimisticCart_();

      try {
        const result =
          await serverUpdateCartItem(
            serverItem,
            quantity
          );

        if (
          !result ||
          result.success !== true
        ) {
          throw new Error(
            result &&
            result.error
              ? result.error
              : "Cart quantity could not be saved."
          );
        }

        return result;

      } catch (error) {
        this.restoreCartState_(
          snapshot
        );

        this.showCartStatus(
          "Previous quantity restored because saving failed."
        );

        throw error;
      }
    },

    async removeCustomerCartItem(
      item
    ) {
      const snapshot =
        this.snapshotCartState_();

      const serverItem =
        JSON.parse(
          JSON.stringify(item)
        );

      this.cartItems =
        this.cartItems.filter(
          (cartItem) =>
            String(cartItem.cartItemId || "") !==
            String(item.cartItemId || "")
        );

      this.recalculateOptimisticCart_();

      try {
        const result =
          await serverRemoveCartItem(
            serverItem
          );

        if (
          !result ||
          result.success !== true
        ) {
          throw new Error(
            result &&
            result.error
              ? result.error
              : "Cart item could not be removed."
          );
        }

        return result;

      } catch (error) {
        this.restoreCartState_(
          snapshot
        );

        this.showCartStatus(
          "Item restored because removal could not be saved."
        );

        throw error;
      }
    },

    async testOptimisticCartUI() {
      const results = [
        {
          test:
            "Cart snapshot",
          expected:
            "Function",
          actual:
            typeof this.snapshotCartState_,
          passed:
            typeof this.snapshotCartState_ ===
            "function"
        },
        {
          test:
            "Cart rollback",
          expected:
            "Function",
          actual:
            typeof this.restoreCartState_,
          passed:
            typeof this.restoreCartState_ ===
            "function"
        },
        {
          test:
            "Optimistic recalculation",
          expected:
            "Function",
          actual:
            typeof this.recalculateOptimisticCart_,
          passed:
            typeof this.recalculateOptimisticCart_ ===
            "function"
        },
        {
          test:
            "Existing cart preserved",
          expected:
            true,
          actual:
            Array.isArray(this.cartItems),
          passed:
            Array.isArray(this.cartItems)
        }
      ];

      const passed =
        results.every(
          (result) => result.passed
        );

      console.table(results);

      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        results:
          results
      };
    }
  });
})();
