/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: customer/js/addresses.js
 * PURPOSE: Customer delivery address and map-pin management
 * VERSION: 2.2.0
 * ============================================================
 */

const CustomerAddresses = {

  SEARCH_DEBOUNCE_MS: 300,
  MAP_DRAG_DEBOUNCE_MS: 700,
  NEAREST_ADDRESS_THRESHOLD_METERS: 500,
  MAP_DEFAULT_ZOOM: 17,
  MAP_FALLBACK_LATITUDE: 28.6139,
  MAP_FALLBACK_LONGITUDE: 77.2090,

  state: {
    loading: false,
    saving: false,
    deviceRequestRunning: false,
    reverseGeocoding: false,
    addresses: [],
    districts: [],
    editingAddressId: "",
    searchTimer: null,
    mapDragTimer: null,
    map: null,
    marker: null,
    initialPinLocation: null,
    latestGeocodeRequest: 0,
    mapReady: false
  },

  elements: {},


  /* INITIALIZE */

  init() {

    this.elements = {
      refreshButton: document.getElementById("refreshAddressesButton"),
      deviceButton: document.getElementById("useDeviceLocationButton"),
      addButton: document.getElementById("addAddressButton"),
      emptyAddButton: document.getElementById("emptyAddAddressButton"),
      loading: document.getElementById("addressesLoading"),
      error: document.getElementById("addressesError"),
      errorMessage: document.getElementById("addressesErrorMessage"),
      retryButton: document.getElementById("retryAddressesButton"),
      list: document.getElementById("savedAddressesList"),
      empty: document.getElementById("addressesEmpty"),
      count: document.getElementById("addressesCount"),
      message: document.getElementById("roleHomeMessage"),
      dialog: document.getElementById("addressFormDialog"),
      closeDialogButton: document.getElementById("closeAddressFormButton"),
      formTitle: document.getElementById("addressFormTitle"),
      formDescription: document.getElementById("addressFormDescription"),
      form: document.getElementById("addressForm"),
      formError: document.getElementById("addressFormError"),
      saveButton: document.getElementById("saveAddressButton"),
      addressId: document.getElementById("addressIdInput"),
      latitude: document.getElementById("addressLatitudeInput"),
      longitude: document.getElementById("addressLongitudeInput"),
      locationSource: document.getElementById("addressLocationSourceInput"),
      placeProvider: document.getElementById("addressPlaceProviderInput"),
      placeReference: document.getElementById("addressPlaceReferenceInput"),
      accuracy: document.getElementById("addressAccuracyInput"),
      searchInput: document.getElementById("addressSearchInput"),
      searchSpinner: document.getElementById("addressSearchSpinner"),
      searchStatus: document.getElementById("addressSearchStatus"),
      suggestions: document.getElementById("addressSuggestions"),
      area: document.getElementById("addressAreaInput"),
      line1: document.getElementById("addressLine1Input"),
      line2: document.getElementById("addressLine2Input"),
      landmark: document.getElementById("addressLandmarkInput"),
      district: document.getElementById("addressDistrictSelect"),
      city: document.getElementById("addressCityInput"),
      state: document.getElementById("addressStateInput"),
      pincode: document.getElementById("addressPincodeInput"),
      receiverName: document.getElementById("receiverNameInput"),
      receiverMobile: document.getElementById("receiverMobileInput"),
      mapSection: document.getElementById("addressMapSection"),
      map: document.getElementById("addressMap"),
      mapLoading: document.getElementById("addressMapLoading"),
      mapStatus: document.getElementById("addressMapStatus"),
      recenterMapButton: document.getElementById("recenterAddressMapButton"),
      bottomNavigation: document.querySelector(".customer-bottom-nav")
    };

    if (!this.hasRequiredElements()) {
      console.error("Customer Addresses page elements are missing.");
      return false;
    }

    this.bindEvents();
    this.loadInitialData();

    console.log("ApnaBite Customer Addresses initialized.");
    return true;
  },


  hasRequiredElements() {

    const required = [
      "refreshButton", "deviceButton", "addButton", "emptyAddButton",
      "loading", "error", "errorMessage", "retryButton", "list",
      "empty", "count", "message", "dialog", "closeDialogButton",
      "formTitle", "form", "formError", "saveButton", "addressId",
      "latitude", "longitude", "locationSource", "placeProvider",
      "placeReference", "accuracy", "searchInput", "searchStatus",
      "suggestions", "area", "line1", "line2", "landmark", "district",
      "city", "state", "pincode", "receiverName", "receiverMobile",
      "mapSection", "map", "mapLoading", "mapStatus", "recenterMapButton"
    ];

    return required.every((name) => Boolean(this.elements[name]));
  },


  /* EVENTS */

  bindEvents() {

    this.elements.refreshButton.addEventListener("click", () => {
      this.loadAddresses();
    });

    this.elements.retryButton.addEventListener("click", () => {
      this.loadAddresses();
    });

    this.elements.deviceButton.addEventListener("click", () => {
      this.useCurrentLocation();
    });

    this.elements.addButton.addEventListener("click", () => {
      this.openCreateForm();
    });

    this.elements.emptyAddButton.addEventListener("click", () => {
      this.openCreateForm();
    });

    this.elements.recenterMapButton.addEventListener("click", () => {
      this.detectLocationForOpenForm();
    });

    this.elements.closeDialogButton.addEventListener("click", () => {
      this.closeForm();
    });

    this.elements.dialog.addEventListener("click", (event) => {
      if (event.target.dataset.closeAddressForm === "true") {
        this.closeForm();
      }
    });

    this.elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.saveAddress();
    });

    this.elements.list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-address-action]");

      if (!button) {
        return;
      }

      const action = button.dataset.addressAction;
      const addressId = button.dataset.addressId;

      if (action === "edit") {
        this.openEditForm(addressId);
      }

      if (action === "remove") {
        this.removeAddress(addressId);
      }
    });

    this.elements.searchInput.addEventListener("input", () => {
      this.handleAddressSearch();
    });

    this.elements.receiverMobile.addEventListener("input", () => {
      this.elements.receiverMobile.value = this.elements.receiverMobile.value
        .replace(/\D/g, "")
        .slice(0, 10);
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        !this.elements.dialog.classList.contains("hidden")
      ) {
        this.closeForm();
      }
    });
  },


  /* SESSION AND INITIAL DATA */

  getSessionId() {
    const session = SessionManager.get();
    return session && session.sessionId ? session.sessionId : "";
  },


  async loadInitialData() {

    this.setPageLoading(true);

    try {
      await Promise.all([
        this.loadDistricts(),
        this.loadAddresses({ manageLoading: false })
      ]);
    } finally {
      this.setPageLoading(false);
    }
  },


  /* DISTRICTS */

  async loadDistricts() {

    try {
      const result = await ServiceLocation.getAvailable();
      const districts = Array.isArray(result.districts)
        ? result.districts
        : [];

      this.state.districts = districts;
      this.renderDistrictOptions();

      return {
        success: true,
        count: districts.length,
        districts: districts
      };
    } catch (error) {
      console.error("Address districts failed:", error);
      this.state.districts = [];
      this.renderDistrictOptions();

      return {
        success: false,
        error: error.message,
        code: error.code || ""
      };
    }
  },


  renderDistrictOptions() {

    const selectedValue = this.elements.district.value;
    this.elements.district.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = this.state.districts.length > 0
      ? "Location will select service district"
      : "No active district available";

    this.elements.district.appendChild(placeholder);

    this.state.districts.forEach((district) => {
      const option = document.createElement("option");
      option.value = district.districtId;
      option.textContent = district.districtName + ", " + district.state;
      this.elements.district.appendChild(option);
    });

    if (selectedValue) {
      this.elements.district.value = selectedValue;
    }
  },


  /* SAVED ADDRESSES */

  async loadAddresses(options = {}) {

    if (this.state.loading) {
      return { success: false, reason: "ADDRESS_REQUEST_ALREADY_RUNNING" };
    }

    this.state.loading = true;

    if (options.manageLoading !== false) {
      this.setPageLoading(true);
    }

    this.clearMessage();
    this.hideError();

    try {
      const response = await API.request(
        "get_customer_addresses",
        { sessionId: this.getSessionId() }
      );

      const result = response.data || {};
      const addresses = Array.isArray(result.addresses)
        ? result.addresses
        : [];

      this.state.addresses = addresses;
      this.renderAddresses(addresses);

      return {
        success: true,
        count: addresses.length,
        addresses: addresses,
        requestId: response.requestId || ""
      };
    } catch (error) {
      this.showLoadError(error.message || "Unable to load your addresses.");
      return { success: false, error: error.message, code: error.code || "" };
    } finally {
      this.state.loading = false;

      if (options.manageLoading !== false) {
        this.setPageLoading(false);
      }
    }
  },


  renderAddresses(addresses) {

    const safeAddresses = Array.isArray(addresses) ? addresses : [];
    this.elements.count.textContent = String(safeAddresses.length);
    this.elements.list.innerHTML = "";
    this.elements.loading.classList.add("hidden");
    this.elements.error.classList.add("hidden");

    if (safeAddresses.length === 0) {
      this.elements.list.classList.add("hidden");
      this.elements.empty.classList.remove("hidden");
      return;
    }

    safeAddresses.forEach((address) => {
      this.elements.list.appendChild(this.createAddressCard(address));
    });

    this.elements.empty.classList.add("hidden");
    this.elements.list.classList.remove("hidden");
  },


  createAddressCard(address) {

    const card = document.createElement("article");
    card.className = "saved-address-card";
    card.dataset.savedAddressId = address.addressId || "";

    const main = document.createElement("div");
    main.className = "saved-address-main";

    const icon = document.createElement("div");
    icon.className = "saved-address-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = this.getAddressIcon(address.addressType);

    const content = document.createElement("div");
    content.className = "saved-address-content";

    const titleRow = document.createElement("div");
    titleRow.className = "saved-address-title-row";

    const title = document.createElement("h3");
    title.textContent = this.getAddressTypeLabel(address.addressType);
    titleRow.appendChild(title);

    const addressText = document.createElement("p");
    addressText.className = "saved-address-text";
    addressText.textContent = this.formatAddressText(address);

    content.appendChild(titleRow);
    content.appendChild(addressText);

    if (address.landmark) {
      const landmark = document.createElement("p");
      landmark.className = "saved-address-landmark";
      landmark.textContent = "Landmark: " + address.landmark;
      content.appendChild(landmark);
    }

    const receiver = document.createElement("div");
    receiver.className = "saved-address-receiver";

    const receiverName = document.createElement("span");
    receiverName.textContent = "👤 " + (address.receiverName || "Receiver");

    const receiverMobile = document.createElement("span");
    receiverMobile.textContent = "☎ +91 " + (address.receiverMobile || "");

    receiver.appendChild(receiverName);
    receiver.appendChild(receiverMobile);
    content.appendChild(receiver);

    const meta = document.createElement("div");
    meta.className = "saved-address-meta";

    const source = document.createElement("span");
    source.textContent = address.locationSource || "SAVED";

    const district = document.createElement("span");
    district.textContent = address.district || "District";

    meta.appendChild(source);
    meta.appendChild(district);
    content.appendChild(meta);
    main.appendChild(icon);
    main.appendChild(content);

    const actions = document.createElement("div");
    actions.className = "saved-address-actions";
    actions.appendChild(
      this.createCardButton("Edit", "edit", address.addressId)
    );
    actions.appendChild(
      this.createCardButton("Remove", "remove", address.addressId, true)
    );

    card.appendChild(main);
    card.appendChild(actions);
    return card;
  },


  createCardButton(text, action, addressId, danger = false) {

    const button = document.createElement("button");
    button.type = "button";
    button.className = "saved-address-button";

    if (danger) {
      button.classList.add("saved-address-button-danger");
    }

    button.dataset.addressAction = action;
    button.dataset.addressId = addressId;
    button.textContent = text;
    return button;
  },


  /* CREATE/EDIT FORM */

  openCreateForm(options = {}) {

    this.resetForm();
    this.state.editingAddressId = "";
    this.elements.formTitle.textContent = "Add delivery address";
    this.elements.formDescription.textContent =
      "Place the pin and complete the delivery details.";
    this.elements.saveButton.textContent = "Save Address";
    this.openForm();

    const suppliedLocation = options.location || null;
    const savedLocation = suppliedLocation || LocationManager.getSaved();

    if (this.isValidLocation(savedLocation)) {
      window.setTimeout(() => {
        this.placePin(savedLocation, {
          setAnchor: true,
          center: true
        });
        this.resolvePinLocation(savedLocation, {
          mode: "FULL",
          setAnchor: true
        });
      }, 120);
    } else {
      window.setTimeout(() => {
        this.initializeMap();
        this.setMapStatus(
          "Tap Current to detect your location and place the delivery pin.",
          ""
        );
      }, 120);
    }

    return { success: true, mode: "CREATE" };
  },


  openEditForm(addressId) {

    const address = this.state.addresses.find(
      (item) => item.addressId === addressId
    );

    if (!address) {
      this.showMessage("Saved address could not be found.", "error");
      return { success: false, reason: "ADDRESS_NOT_FOUND" };
    }

    this.resetForm();
    this.state.editingAddressId = addressId;
    this.elements.formTitle.textContent = "Edit delivery address";
    this.elements.formDescription.textContent =
      "Adjust the pin or update delivery details.";
    this.elements.saveButton.textContent = "Update Address";
    this.elements.addressId.value = address.addressId || "";
    this.setAddressType(address.addressType);
    this.elements.area.value = address.areaLocality || "";
    this.elements.line1.value = address.addressLine1 || "";
    this.elements.line2.value = address.addressLine2 || "";
    this.elements.landmark.value = address.landmark || "";
    this.elements.district.value = address.districtId || "";
    this.elements.city.value = address.city || "";
    this.elements.state.value = address.state || "";
    this.elements.pincode.value = address.pincode || "";
    this.elements.latitude.value = this.coordinateToInput(address.latitude);
    this.elements.longitude.value = this.coordinateToInput(address.longitude);
    this.elements.locationSource.value = address.locationSource || "MANUAL";
    this.elements.placeProvider.value = address.placeProvider || "";
    this.elements.placeReference.value = address.placeReference || "";
    this.elements.accuracy.value = address.locationAccuracyMeters ?? "";
    this.elements.receiverName.value = address.receiverName || "";
    this.elements.receiverMobile.value = address.receiverMobile || "";
    this.elements.searchInput.value = [
      address.areaLocality,
      address.city,
      address.district
    ].filter(Boolean).join(", ");

    this.openForm();

    const location = {
      latitude: Number(address.latitude),
      longitude: Number(address.longitude),
      accuracy: address.locationAccuracyMeters
    };

    window.setTimeout(() => {
      this.placePin(location, { setAnchor: true, center: true });
      this.setMapStatus(
        "Saved pin restored. Drag it to adjust the delivery point.",
        "success"
      );
    }, 120);

    return { success: true, mode: "EDIT", address: address };
  },


  openForm() {

    this.clearFormError();
    this.hideSuggestions();
    this.elements.dialog.classList.remove("hidden");
    document.body.classList.add("address-dialog-open");

    window.setTimeout(() => {
      this.initializeMap();
      if (this.state.map) {
        this.state.map.invalidateSize();
      }
    }, 80);
  },


  closeForm(force = false) {

    if (this.state.saving && force !== true) {
      return false;
    }

    window.clearTimeout(this.state.mapDragTimer);
    this.state.latestGeocodeRequest += 1;
    this.elements.dialog.classList.add("hidden");
    document.body.classList.remove("address-dialog-open");
    this.hideSuggestions();
    this.clearFormError();
    this.setMapLoading(false);
    return true;
  },


  resetForm() {

    this.elements.form.reset();
    this.elements.addressId.value = "";
    this.elements.latitude.value = "";
    this.elements.longitude.value = "";
    this.elements.locationSource.value = "MANUAL";
    this.elements.placeProvider.value = "";
    this.elements.placeReference.value = "";
    this.elements.accuracy.value = "";
    this.elements.searchInput.value = "";
    this.elements.searchStatus.textContent =
      "Search an active service district or use your current location.";
    this.elements.district.value = "";
    this.elements.state.value = "";
    this.elements.pincode.value = "";
    this.state.initialPinLocation = null;
    this.state.latestGeocodeRequest += 1;
    window.clearTimeout(this.state.mapDragTimer);
    this.setAddressType("HOME");
    this.hideSuggestions();
    this.clearFormError();
    this.setMapLoading(false);

    if (this.state.marker && this.state.map) {
      this.state.map.removeLayer(this.state.marker);
      this.state.marker = null;
    }

    this.setMapStatus(
      "Use current location or select a service area to place the pin.",
      ""
    );
  },


  /* MAP */

  initializeMap() {

    if (this.state.map) {
      this.state.map.invalidateSize();
      return true;
    }

    if (typeof window.L === "undefined") {
      this.setMapStatus(
        "Map could not be loaded. Check your connection and reopen the form.",
        "error"
      );
      return false;
    }

    this.state.map = L.map(this.elements.map, {
      zoomControl: true,
      attributionControl: true
    }).setView(
      [this.MAP_FALLBACK_LATITUDE, this.MAP_FALLBACK_LONGITUDE],
      5
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    ).addTo(this.state.map);

    this.state.map.on("click", (event) => {
      const location = {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        accuracy: ""
      };

      this.placePin(location, { center: false });
      this.schedulePinResolution(location);
    });

    this.state.mapReady = true;
    return true;
  },


  createMapPinIcon() {

    return L.divIcon({
      className: "address-map-pin-icon",
      html: '<div class="address-map-pin"><span>●</span></div>',
      iconSize: [42, 48],
      iconAnchor: [21, 44]
    });
  },


  placePin(location, options = {}) {

    if (!this.isValidLocation(location)) {
      return false;
    }

    if (!this.initializeMap()) {
      return false;
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    const latLng = L.latLng(latitude, longitude);

    if (!this.state.marker) {
      this.state.marker = L.marker(latLng, {
        draggable: true,
        icon: this.createMapPinIcon(),
        autoPan: true
      }).addTo(this.state.map);

      this.state.marker.on("dragend", () => {
        const markerLocation = this.state.marker.getLatLng();
        const draggedLocation = {
          latitude: markerLocation.lat,
          longitude: markerLocation.lng,
          accuracy: ""
        };

        this.writeCoordinates(draggedLocation, "MAP_PIN");
        this.schedulePinResolution(draggedLocation);
      });
    } else {
      this.state.marker.setLatLng(latLng);
    }

    this.writeCoordinates(location, options.source || "MAP_PIN");

    if (options.setAnchor === true) {
      this.state.initialPinLocation = {
        latitude: latitude,
        longitude: longitude
      };
    }

    if (options.center !== false) {
      this.state.map.setView(latLng, this.MAP_DEFAULT_ZOOM);
    }

    window.setTimeout(() => {
      this.state.map.invalidateSize();
    }, 50);

    return true;
  },


  schedulePinResolution(location) {

    window.clearTimeout(this.state.mapDragTimer);
    this.setMapStatus("Checking the selected pin location...", "");

    this.state.mapDragTimer = window.setTimeout(() => {
      const distanceMeters = this.getDistanceFromAnchor(location);
      const mode = distanceMeters <= this.NEAREST_ADDRESS_THRESHOLD_METERS
        ? "AREA_ONLY"
        : "FULL";

      this.resolvePinLocation(location, {
        mode: mode,
        distanceMeters: distanceMeters
      });
    }, this.MAP_DRAG_DEBOUNCE_MS);
  },


  getDistanceFromAnchor(location) {

    if (!this.isValidLocation(this.state.initialPinLocation)) {
      return Number.POSITIVE_INFINITY;
    }

    try {
      return LocationManager.calculateDistanceKm(
        this.state.initialPinLocation.latitude,
        this.state.initialPinLocation.longitude,
        location.latitude,
        location.longitude
      ) * 1000;
    } catch (error) {
      return this.calculateDistanceMeters(
        this.state.initialPinLocation,
        location
      );
    }
  },


  calculateDistanceMeters(first, second) {

    const earthRadius = 6371000;
    const toRadians = (value) => value * Math.PI / 180;
    const latitudeOne = toRadians(Number(first.latitude));
    const latitudeTwo = toRadians(Number(second.latitude));
    const latitudeDifference = toRadians(
      Number(second.latitude) - Number(first.latitude)
    );
    const longitudeDifference = toRadians(
      Number(second.longitude) - Number(first.longitude)
    );

    const value =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(latitudeOne) *
      Math.cos(latitudeTwo) *
      Math.sin(longitudeDifference / 2) ** 2;

    return earthRadius * 2 * Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value)
    );
  },


  async resolvePinLocation(location, options = {}) {

    if (!this.isValidLocation(location)) {
      return { success: false, reason: "INVALID_LOCATION" };
    }

    const requestNumber = this.state.latestGeocodeRequest + 1;
    this.state.latestGeocodeRequest = requestNumber;
    this.state.reverseGeocoding = true;
    this.setMapLoading(true);

    try {
      const response = await API.request(
        "reverse_geocode_location",
        {
          sessionId: this.getSessionId(),
          latitude: Number(location.latitude),
          longitude: Number(location.longitude)
        }
      );

      if (requestNumber !== this.state.latestGeocodeRequest) {
        return { success: false, reason: "STALE_GEOCODE_RESPONSE" };
      }

      const resolved = response.data || {};
      const mode = options.mode || "FULL";

      this.writeCoordinates(location, "MAP_PIN");

      if (mode === "AREA_ONLY") {
        this.applyAreaOnlyResult(resolved);
        this.setMapStatus(
          (resolved.label || "Pin adjusted") +
          " • Within 500m; only Area or locality was refreshed.",
          "success"
        );
      } else {
        const districtResult = this.applyFullGeocodeResult(resolved);

        if (!districtResult.matched) {
          this.setMapStatus(
            "This location is outside the currently matched ApnaBite service district.",
            "error"
          );
        } else {
          this.setMapStatus(
            resolved.label || "Delivery location identified.",
            "success"
          );
        }
      }

      if (options.setAnchor === true) {
        this.state.initialPinLocation = {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude)
        };
      }

      this.elements.searchInput.value =
        resolved.formattedAddress || resolved.label || "";
      this.elements.placeProvider.value =
        resolved.provider || "GOOGLE_APPS_SCRIPT_MAPS";
      this.elements.placeReference.value = "";

      return {
        success: true,
        mode: mode,
        resolved: resolved,
        requestId: response.requestId || ""
      };
    } catch (error) {
      if (requestNumber === this.state.latestGeocodeRequest) {
        this.setMapStatus(
          error.message || "Unable to identify this pin location.",
          "error"
        );
      }

      return {
        success: false,
        error: error.message,
        code: error.code || ""
      };
    } finally {
      if (requestNumber === this.state.latestGeocodeRequest) {
        this.state.reverseGeocoding = false;
        this.setMapLoading(false);
      }
    }
  },


  applyAreaOnlyResult(resolved) {

    const area =
      resolved.area ||
      resolved.locality ||
      resolved.placeName ||
      resolved.street ||
      resolved.label ||
      "";

    if (area) {
      this.elements.area.value = area;
    }

    return area;
  },


  applyFullGeocodeResult(resolved) {

    const area =
      resolved.area ||
      resolved.locality ||
      resolved.placeName ||
      resolved.street ||
      resolved.label ||
      "";

    if (area) {
      this.elements.area.value = area;
    }

    if (resolved.street) {
      this.elements.line2.value = resolved.street;
    }

    this.elements.city.value =
      resolved.city || resolved.locality || this.elements.city.value;
    this.elements.state.value = resolved.state || "";
    this.elements.pincode.value = String(resolved.pincode || "")
      .replace(/\D/g, "")
      .slice(0, 6);

    const matchedDistrict = this.matchServiceDistrict(resolved);
    this.elements.district.value = matchedDistrict
      ? matchedDistrict.districtId
      : "";

    return {
      matched: Boolean(matchedDistrict),
      district: matchedDistrict
    };
  },


  matchServiceDistrict(resolved) {

    const resolvedState = this.normalizeText(resolved.state);
    const locationNames = [
      resolved.district,
      resolved.city,
      resolved.locality,
      resolved.area,
      resolved.formattedAddress
    ].map((value) => this.normalizeText(value)).filter(Boolean);

    let match = this.state.districts.find((district) => {
      const districtName = this.normalizeText(district.districtName);
      const stateName = this.normalizeText(district.state);
      const stateMatches = !resolvedState || !stateName || stateName === resolvedState;
      const nameMatches = locationNames.some((name) =>
        name === districtName ||
        name.includes(districtName) ||
        districtName.includes(name)
      );

      return stateMatches && nameMatches;
    });

    if (match) {
      return match;
    }

    const savedDistrict = ServiceLocation.getSaved();

    if (savedDistrict) {
      const savedState = this.normalizeText(savedDistrict.state);
      const activeSavedDistrict = this.state.districts.find(
        (district) => district.districtId === savedDistrict.districtId
      );

      if (
        activeSavedDistrict &&
        (!resolvedState || !savedState || resolvedState === savedState)
      ) {
        return activeSavedDistrict;
      }
    }

    const sameStateDistricts = this.state.districts.filter((district) =>
      resolvedState && this.normalizeText(district.state) === resolvedState
    );

    if (sameStateDistricts.length === 1) {
      match = sameStateDistricts[0];
    }

    return match || null;
  },


  writeCoordinates(location, source) {

    this.elements.latitude.value = String(Number(location.latitude));
    this.elements.longitude.value = String(Number(location.longitude));
    this.elements.accuracy.value =
      location.accuracy === null || location.accuracy === undefined
        ? this.elements.accuracy.value
        : String(location.accuracy);
    this.elements.locationSource.value = source || "MAP_PIN";
  },


  setMapLoading(isLoading) {

    this.elements.mapLoading.classList.toggle("hidden", !isLoading);
    this.elements.recenterMapButton.disabled = isLoading;
  },


  setMapStatus(message, status) {

    this.elements.mapStatus.textContent = message || "";

    if (status) {
      this.elements.mapStatus.dataset.status = status;
    } else {
      delete this.elements.mapStatus.dataset.status;
    }
  },


  /* CURRENT LOCATION */

  async useCurrentLocation() {

    if (this.state.deviceRequestRunning) {
      return { success: false, reason: "LOCATION_REQUEST_ALREADY_RUNNING" };
    }

    this.state.deviceRequestRunning = true;
    this.setDeviceLoading(true);
    this.clearMessage();

    try {
      const location = await this.requestDeviceLocation();
      const nearestResult = await this.findNearestSavedAddress(location);

      if (nearestResult.matched && nearestResult.address) {
        await this.loadAddresses();
        this.highlightAddress(nearestResult.address.addressId);

        this.showMessage(
          "Nearby saved " +
          this.getAddressTypeLabel(nearestResult.address.addressType) +
          " address selected (" +
          Math.round(nearestResult.distanceMeters) +
          " metres away).",
          "success"
        );

        document.dispatchEvent(
          new CustomEvent("apnabite:address-selected", {
            detail: {
              source: "NEAREST_SAVED",
              address: nearestResult.address,
              distanceMeters: nearestResult.distanceMeters
            }
          })
        );

        return {
          success: true,
          matched: true,
          location: location,
          address: nearestResult.address,
          distanceMeters: nearestResult.distanceMeters
        };
      }

      this.openCreateForm({ location: location });
      this.showMessage(
        "Current location detected. Adjust the pin and complete the address.",
        "success"
      );

      return { success: true, matched: false, location: location };
    } catch (error) {
      const displayError = this.getLocationError(error);
      this.showMessage(displayError.message, "error");
      return { success: false, code: displayError.code, error: displayError.message };
    } finally {
      this.state.deviceRequestRunning = false;
      this.setDeviceLoading(false);
    }
  },


  async detectLocationForOpenForm() {

    if (this.state.deviceRequestRunning) {
      return { success: false, reason: "LOCATION_REQUEST_ALREADY_RUNNING" };
    }

    this.state.deviceRequestRunning = true;
    this.elements.recenterMapButton.disabled = true;
    this.setMapStatus("Detecting your current location...", "");

    try {
      const location = await this.requestDeviceLocation();
      this.placePin(location, { setAnchor: true, center: true, source: "DEVICE" });
      return await this.resolvePinLocation(location, {
        mode: "FULL",
        setAnchor: true
      });
    } catch (error) {
      const displayError = this.getLocationError(error);
      this.setMapStatus(displayError.message, "error");
      return { success: false, code: displayError.code, error: displayError.message };
    } finally {
      this.state.deviceRequestRunning = false;
      this.elements.recenterMapButton.disabled = false;
    }
  },


  async requestDeviceLocation() {

    const result = await LocationManager.requestAfterUserAction({
      persist: true,
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000
    });

    const location = result && result.location ? result.location : result;

    if (!this.isValidLocation(location)) {
      throw LocationManager.createError(
        "Invalid location received.",
        "INVALID_LOCATION"
      );
    }

    return location;
  },


  async findNearestSavedAddress(location) {

    const response = await API.request(
      "find_nearest_customer_address",
      {
        sessionId: this.getSessionId(),
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        thresholdMeters: this.NEAREST_ADDRESS_THRESHOLD_METERS
      }
    );

    const result = response.data || {};

    return {
      success: result.success === true,
      matched: result.matched === true,
      address: result.address || result.nearestAddress || null,
      distanceMeters: Number(result.distanceMeters || 0),
      thresholdMeters: Number(
        result.thresholdMeters || this.NEAREST_ADDRESS_THRESHOLD_METERS
      ),
      requestId: response.requestId || ""
    };
  },


  highlightAddress(addressId) {

    const cards = this.elements.list.querySelectorAll(".saved-address-card");
    cards.forEach((card) => card.classList.remove("is-nearest"));

    const target = Array.from(cards).find(
      (card) => card.dataset.savedAddressId === addressId
    );

    if (!target) {
      return false;
    }

    target.classList.add("is-nearest");
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      target.classList.remove("is-nearest");
    }, 2500);

    return true;
  },


  /* DISTRICT SEARCH */

  handleAddressSearch() {

    window.clearTimeout(this.state.searchTimer);
    const query = this.elements.searchInput.value.trim().toLowerCase();

    if (query.length < 2) {
      this.hideSuggestions();
      this.elements.searchStatus.textContent =
        "Type at least 2 characters to search service districts.";
      return;
    }

    this.state.searchTimer = window.setTimeout(() => {
      const matches = this.state.districts.filter((district) => {
        const searchable = (
          district.districtName + " " + district.state
        ).toLowerCase();
        return searchable.includes(query);
      }).slice(0, 6);

      this.renderSuggestions(matches);
    }, this.SEARCH_DEBOUNCE_MS);
  },


  renderSuggestions(districts) {

    this.elements.suggestions.innerHTML = "";

    if (districts.length === 0) {
      this.hideSuggestions();
      this.elements.searchStatus.textContent =
        "No active ApnaBite service district matched your search.";
      return;
    }

    districts.forEach((district) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "address-suggestion-button";
      button.setAttribute("role", "option");

      const icon = document.createElement("span");
      icon.className = "address-suggestion-icon";
      icon.textContent = "📍";

      const content = document.createElement("span");
      content.className = "address-suggestion-content";

      const title = document.createElement("strong");
      title.textContent = district.districtName;

      const state = document.createElement("small");
      state.textContent = district.state + " • ApnaBite service district";

      content.appendChild(title);
      content.appendChild(state);
      button.appendChild(icon);
      button.appendChild(content);
      button.addEventListener("click", () => {
        this.selectDistrictSuggestion(district);
      });
      this.elements.suggestions.appendChild(button);
    });

    this.elements.suggestions.classList.remove("hidden");
    this.elements.searchStatus.textContent =
      districts.length + " service location" +
      (districts.length === 1 ? "" : "s") + " found.";
  },


  selectDistrictSuggestion(district) {

    this.elements.district.value = district.districtId;
    this.elements.searchInput.value =
      district.districtName + ", " + district.state;
    this.elements.city.value = district.districtName || "";
    this.elements.state.value = district.state || "";
    this.elements.placeProvider.value = "APNABITE_DISTRICTS";
    this.elements.placeReference.value = district.districtId;
    this.hideSuggestions();

    const districtLocation = this.getDistrictCoordinates(district);

    if (districtLocation) {
      this.placePin(districtLocation, { setAnchor: true, center: true });
      this.resolvePinLocation(districtLocation, {
        mode: "FULL",
        setAnchor: true
      });
    } else {
      this.setMapStatus(
        "District selected. Tap Current to place the exact delivery pin.",
        ""
      );
    }

    this.elements.searchStatus.textContent =
      "Service district selected. Set the exact delivery pin.";
  },


  getDistrictCoordinates(district) {

    const latitude = Number(
      district.latitude || district.centerLatitude || district.Latitude
    );
    const longitude = Number(
      district.longitude || district.centerLongitude || district.Longitude
    );

    const location = { latitude: latitude, longitude: longitude, accuracy: "" };
    return this.isValidLocation(location) ? location : null;
  },


  /* FORM DATA */

  getFormData() {

    const selectedType = this.elements.form.querySelector(
      'input[name="addressType"]:checked'
    );
    const addressType = selectedType ? selectedType.value : "HOME";

    return {
      addressType: addressType,
      label: this.getAddressTypeLabel(addressType),
      addressLine1: this.elements.line1.value.trim(),
      addressLine2: this.elements.line2.value.trim(),
      landmark: this.elements.landmark.value.trim(),
      city: this.elements.city.value.trim(),
      districtId: this.elements.district.value,
      areaLocality: this.elements.area.value.trim(),
      pincode: this.elements.pincode.value.replace(/\D/g, ""),
      latitude: Number(this.elements.latitude.value),
      longitude: Number(this.elements.longitude.value),
      receiverName: this.elements.receiverName.value.trim(),
      receiverMobile: this.elements.receiverMobile.value.replace(/\D/g, ""),
      locationSource: this.elements.locationSource.value || "MAP_PIN",
      placeProvider: this.elements.placeProvider.value.trim(),
      placeReference: this.elements.placeReference.value.trim(),
      locationAccuracyMeters: this.elements.accuracy.value
        ? Number(this.elements.accuracy.value)
        : "",
      isDefault: false
    };
  },


  validateFormData(data) {

    if (!data.addressLine1 || data.addressLine1.length < 3) {
      return { valid: false, message: "Enter your house, flat or building details." };
    }

    if (!data.areaLocality || data.areaLocality.length < 2) {
      return { valid: false, message: "Enter your area or locality." };
    }

    if (!data.city) {
      return { valid: false, message: "Enter the city." };
    }

    if (!data.districtId) {
      return {
        valid: false,
        message: "The selected pin is not matched to an active ApnaBite service district."
      };
    }

    if (!data.pincode || !/^\d{6}$/.test(data.pincode)) {
      return {
        valid: false,
        message: "A valid pincode could not be detected for this pin location."
      };
    }

    if (!this.isValidLocation(data)) {
      return {
        valid: false,
        message: "Set the exact delivery location on the map before saving."
      };
    }

    if (!data.receiverName || data.receiverName.length < 2) {
      return { valid: false, message: "Enter the receiver name." };
    }

    if (!/^[6-9]\d{9}$/.test(data.receiverMobile)) {
      return {
        valid: false,
        message: "Enter a valid 10-digit receiver mobile number."
      };
    }

    return { valid: true };
  },


  /* SAVE/REMOVE */

  async saveAddress() {

    if (this.state.saving) {
      return { success: false, reason: "ADDRESS_SAVE_RUNNING" };
    }

    if (this.state.reverseGeocoding) {
      this.showFormError("Please wait while the selected pin location is verified.");
      return { success: false, reason: "LOCATION_LOOKUP_RUNNING" };
    }

    const data = this.getFormData();
    const validation = this.validateFormData(data);

    if (!validation.valid) {
      this.showFormError(validation.message);
      return { success: false, reason: "FORM_VALIDATION_FAILED" };
    }

    this.state.saving = true;
    this.setSaveLoading(true);
    this.clearFormError();

    try {
      const editing = Boolean(this.state.editingAddressId);
      const action = editing
        ? "update_customer_address"
        : "create_customer_address";
      const payload = editing
        ? {
            sessionId: this.getSessionId(),
            addressId: this.state.editingAddressId,
            updates: data
          }
        : {
            sessionId: this.getSessionId(),
            address: data
          };

      const response = await API.request(action, payload);
      this.closeForm(true);
      await this.loadAddresses();
      this.showMessage(
        editing
          ? "Delivery address updated successfully."
          : "Delivery address saved successfully.",
        "success"
      );

      document.dispatchEvent(
        new CustomEvent("apnabite:addresses-updated", {
          detail: {
            action: editing ? "UPDATED" : "CREATED",
            result: response.data
          }
        })
      );

      return { success: true, editing: editing, result: response.data };
    } catch (error) {
      this.showFormError(error.message || "Address could not be saved.");
      return { success: false, error: error.message, code: error.code || "" };
    } finally {
      this.state.saving = false;
      this.setSaveLoading(false);
    }
  },


  async removeAddress(addressId) {

    const address = this.state.addresses.find(
      (item) => item.addressId === addressId
    );

    if (!address) {
      return { success: false, reason: "ADDRESS_NOT_FOUND" };
    }

    const confirmed = window.confirm(
      "Remove " + this.getAddressTypeLabel(address.addressType) + " address?"
    );

    if (!confirmed) {
      return { success: false, reason: "USER_CANCELLED" };
    }

    try {
      const response = await API.request(
        "remove_customer_address",
        { sessionId: this.getSessionId(), addressId: addressId }
      );

      await this.loadAddresses();
      this.showMessage("Saved address removed.", "success");
      return { success: true, result: response.data };
    } catch (error) {
      this.showMessage(error.message || "Address could not be removed.", "error");
      return { success: false, error: error.message, code: error.code || "" };
    }
  },


  /* UI */

  setPageLoading(isLoading) {
    this.elements.refreshButton.disabled = isLoading;
    this.elements.refreshButton.classList.toggle("is-loading", isLoading);
    this.elements.loading.classList.toggle("hidden", !isLoading);

    if (isLoading) {
      this.elements.list.classList.add("hidden");
      this.elements.empty.classList.add("hidden");
      this.elements.error.classList.add("hidden");
    }
  },


  setDeviceLoading(isLoading) {
    this.elements.deviceButton.disabled = isLoading;
    const title = this.elements.deviceButton.querySelector("strong");

    if (title) {
      title.textContent = isLoading
        ? "Detecting location..."
        : "Use current location";
    }
  },


  setSaveLoading(isLoading) {
    this.elements.saveButton.disabled = isLoading;
    this.elements.saveButton.textContent = isLoading
      ? "Saving Address..."
      : this.state.editingAddressId
        ? "Update Address"
        : "Save Address";
  },


  showLoadError(message) {
    this.elements.loading.classList.add("hidden");
    this.elements.list.classList.add("hidden");
    this.elements.empty.classList.add("hidden");
    this.elements.errorMessage.textContent = message;
    this.elements.error.classList.remove("hidden");
  },


  hideError() {
    this.elements.error.classList.add("hidden");
  },


  showMessage(message, type = "success") {
    this.elements.message.textContent = message;
    this.elements.message.dataset.messageType = type;
    this.elements.message.classList.remove("hidden");
  },


  clearMessage() {
    this.elements.message.textContent = "";
    this.elements.message.classList.add("hidden");
    delete this.elements.message.dataset.messageType;
  },


  showFormError(message) {
    this.elements.formError.textContent = message;
    this.elements.formError.classList.remove("hidden");
    this.elements.formError.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },


  clearFormError() {
    this.elements.formError.textContent = "";
    this.elements.formError.classList.add("hidden");
  },


  hideSuggestions() {
    this.elements.suggestions.innerHTML = "";
    this.elements.suggestions.classList.add("hidden");
  },


  /* HELPERS */

  isValidLocation(location) {
    return Boolean(
      location &&
      LocationManager.isValidCoordinates(
        Number(location.latitude),
        Number(location.longitude)
      )
    );
  },


  normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },


  setAddressType(type) {
    const normalizedType = String(type || "HOME").toUpperCase();
    const input = this.elements.form.querySelector(
      'input[name="addressType"][value="' + normalizedType + '"]'
    );

    if (input) {
      input.checked = true;
    }
  },


  getAddressIcon(type) {
    const icons = { HOME: "🏠", WORK: "💼", OTHER: "📍" };
    return icons[String(type || "OTHER").toUpperCase()] || "📍";
  },


  getAddressTypeLabel(type) {
    const labels = { HOME: "Home", WORK: "Work", OTHER: "Other" };
    return labels[String(type || "OTHER").toUpperCase()] || "Address";
  },


  coordinateToInput(value) {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    return String(value);
  },


  formatAddressText(address) {
    return [
      address.addressLine1,
      address.areaLocality,
      address.addressLine2,
      address.city,
      address.district,
      address.state,
      address.pincode
    ].filter(Boolean).join(", ");
  },


  getLocationError(error) {

    const code = error && error.code ? error.code : "LOCATION_ERROR";
    const messages = {
      LOCATION_PERMISSION_DENIED:
        "Location permission is blocked. Allow location access in browser settings and try again.",
      LOCATION_UNAVAILABLE:
        "Your current location is unavailable. Check device location services.",
      LOCATION_NOT_AVAILABLE:
        "Your current location could not be detected.",
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
      code: code,
      message: messages[code] || error.message || messages.LOCATION_ERROR
    };
  },


  /* TEST */

  async test() {

    console.log("========================================");
    console.log("APNABITE CUSTOMER ADDRESSES MAP TEST");
    console.log("========================================");

    try {
      const districtResult = await this.loadDistricts();
      const addressResult = await this.loadAddresses();
      const requiredRole = document.body.dataset.requiredRole;
      const navigationItems = this.elements.bottomNavigation
        ? this.elements.bottomNavigation.querySelectorAll(".customer-nav-item").length
        : 0;
      const accountActive = Boolean(
        this.elements.bottomNavigation &&
        this.elements.bottomNavigation.querySelector(
          '.customer-nav-item[href="account.html"].is-active'
        )
      );
      const mapLibraryAvailable = typeof window.L !== "undefined";
      const reverseGeocodingSupported =
        typeof this.resolvePinLocation === "function";
      const pinRuleSupported =
        this.NEAREST_ADDRESS_THRESHOLD_METERS === 500 &&
        this.MAP_DRAG_DEBOUNCE_MS === 700;
      const lockedFields =
        this.elements.district.disabled === true &&
        this.elements.state.readOnly === true &&
        this.elements.pincode.readOnly === true;
      const cityEditable = this.elements.city.readOnly === false;

      const results = [
        {
          test: "Required role",
          expected: "Customer",
          actual: requiredRole,
          passed: requiredRole === "Customer"
        },
        {
          test: "Live address API",
          expected: true,
          actual: addressResult.success,
          passed: addressResult.success === true
        },
        {
          test: "Service districts",
          expected: "At least 1",
          actual: districtResult.count || 0,
          passed: districtResult.success === true && districtResult.count > 0
        },
        {
          test: "Leaflet map library",
          expected: true,
          actual: mapLibraryAvailable,
          passed: mapLibraryAvailable
        },
        {
          test: "Reverse geocoding support",
          expected: true,
          actual: reverseGeocodingSupported,
          passed: reverseGeocodingSupported
        },
        {
          test: "500m area-only pin rule",
          expected: true,
          actual: pinRuleSupported,
          passed: pinRuleSupported
        },
        {
          test: "District/state/pincode locked",
          expected: true,
          actual: lockedFields,
          passed: lockedFields
        },
        {
          test: "City editable",
          expected: true,
          actual: cityEditable,
          passed: cityEditable
        },
        {
          test: "Bottom navigation",
          expected: 4,
          actual: navigationItems,
          passed: navigationItems === 4
        },
        {
          test: "Account navigation active",
          expected: true,
          actual: accountActive,
          passed: accountActive
        }
      ];

      const passed = results.every((result) => result.passed);
      console.table(results);
      console.log("Loaded Addresses:", this.state.addresses);
      console.log(
        passed
          ? "Customer Addresses Map Test: PASS"
          : "Customer Addresses Map Test: FAIL"
      );

      return {
        success: passed,
        status: passed ? "PASS" : "FAIL",
        addressCount: this.state.addresses.length,
        districtCount: this.state.districts.length,
        results: results
      };
    } catch (error) {
      console.error("Customer Addresses Map Test: FAIL", error);
      return {
        success: false,
        status: "FAIL",
        error: error.message,
        code: error.code || ""
      };
    }
  }
};


document.addEventListener("DOMContentLoaded", () => {
  CustomerAddresses.init();
});
