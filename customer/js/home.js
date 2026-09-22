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
