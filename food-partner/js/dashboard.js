/**
 * ============================================================
 * APNABITE FOOD PARTNER
 * FILE: food-partner/js/dashboard.js
 * PURPOSE: Real Food Partner onboarding gate and status dashboard
 * VERSION: 1.0.0
 * ============================================================
 */

const FoodPartnerDashboard = {
  map: null,
  marker: null,
  profile: null,
  saving: false,
  elements: {},

  init() {
    const ids = {
      loading: "profileLoadingState", onboarding: "onboardingSection", dashboard: "dashboardSection",
      form: "partnerOnboardingForm", businessName: "businessNameInput", businessType: "businessTypeInput",
      ownerName: "ownerNameInput", email: "partnerEmailInput", foodType: "foodTypeInput",
      description: "descriptionInput", currentButton: "useCurrentLocationButton", map: "partnerMap",
      mapStatus: "mapStatus", latitude: "latitudeInput", longitude: "longitudeInput",
      address: "businessAddressInput", district: "districtInput", error: "formError",
      saveButton: "savePartnerButton", businessNameDisplay: "dashboardBusinessName",
      addressDisplay: "dashboardAddress", kycStatus: "kycStatus", approvalStatus: "approvalStatus",
      operatingStatus: "operatingStatus", editButton: "editProfileButton"
    };
    Object.keys(ids).forEach((key) => { this.elements[key] = document.getElementById(ids[key]); });
    if (!Object.values(this.elements).every(Boolean)) {
      console.error("Food Partner dashboard elements are missing.");
      return false;
    }
    this.bindEvents();
    this.start();
    console.log("ApnaBite Food Partner Dashboard initialized.");
    return true;
  },

  bindEvents() {
    this.elements.form.addEventListener("submit", (event) => { event.preventDefault(); this.saveOnboarding(); });
    this.elements.currentButton.addEventListener("click", () => this.useCurrentLocation());
    this.elements.editButton.addEventListener("click", () => this.showOnboarding(this.profile));
  },

  getSessionId() {
    const session = SessionManager.get();
    return session && session.sessionId ? session.sessionId : "";
  },

  async start() {
    this.showOnly("loading");
    try {
      await this.loadDistricts();
      const response = await API.request("get_food_partner_profile", { sessionId: this.getSessionId() });
      const data = response.data || {};
      this.profile = data.profile || null;
      if (data.onboardingComplete === true && this.profile) this.showDashboard(this.profile);
      else this.showOnboarding();
    } catch (error) {
      this.showOnly("onboarding");
      this.showError(error.message || "Food Partner profile could not be loaded.");
    }
  },

  async loadDistricts() {
    const result = await ServiceLocation.getAvailable();
    this.elements.district.innerHTML = '<option value="">Select service district</option>';
    result.districts.forEach((district) => {
      const option = document.createElement("option");
      option.value = district.districtId;
      option.textContent = district.districtName + ", " + district.state;
      this.elements.district.appendChild(option);
    });
    return result;
  },

  showOnly(name) {
    this.elements.loading.classList.toggle("hidden", name !== "loading");
    this.elements.onboarding.classList.toggle("hidden", name !== "onboarding");
    this.elements.dashboard.classList.toggle("hidden", name !== "dashboard");
  },

  showOnboarding(profile = null) {
    this.showOnly("onboarding");
    this.clearError();
    if (profile) this.fillForm(profile);
    window.setTimeout(() => this.initializeMap(profile), 40);
  },

  initializeMap(profile) {
    if (typeof L === "undefined") {
      this.elements.mapStatus.textContent = "Map could not load. Check your connection and refresh.";
      return;
    }
    const saved = LocationManager.getSaved();
    const latitude = Number(profile && profile.latitude) || Number(saved && saved.latitude) || 28.5355;
    const longitude = Number(profile && profile.longitude) || Number(saved && saved.longitude) || 77.391;
    if (!this.map) {
      this.map = L.map(this.elements.map).setView([latitude, longitude], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(this.map);
      this.marker = L.marker([latitude, longitude], { draggable: true }).addTo(this.map);
      this.marker.on("dragend", () => {
        const point = this.marker.getLatLng();
        this.setCoordinates(point.lat, point.lng);
        this.reverseGeocode(point.lat, point.lng);
      });
    } else {
      this.map.setView([latitude, longitude], 15);
      this.marker.setLatLng([latitude, longitude]);
      this.map.invalidateSize();
    }
    this.setCoordinates(latitude, longitude);
  },

  async useCurrentLocation() {
    this.elements.currentButton.disabled = true;
    this.elements.currentButton.textContent = "Detecting...";
    this.clearError();
    try {
      const result = await LocationManager.requestAfterUserAction({ persist: true, enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
      const location = result && result.location ? result.location : result;
      if (!location || !LocationManager.isValidCoordinates(location.latitude, location.longitude)) throw new Error("Invalid device location received.");
      this.setCoordinates(location.latitude, location.longitude);
      if (this.map && this.marker) {
        this.map.setView([location.latitude, location.longitude], 17);
        this.marker.setLatLng([location.latitude, location.longitude]);
      }
      await this.reverseGeocode(location.latitude, location.longitude);
    } catch (error) {
      this.showError(error.message || "Current location could not be detected.");
    } finally {
      this.elements.currentButton.disabled = false;
      this.elements.currentButton.textContent = "⌖ Current";
    }
  },

  setCoordinates(latitude, longitude) {
    this.elements.latitude.value = Number(latitude).toFixed(7);
    this.elements.longitude.value = Number(longitude).toFixed(7);
    this.elements.mapStatus.textContent = "Pin set. Drag it to the exact kitchen entrance if needed.";
  },

  async reverseGeocode(latitude, longitude) {
    this.elements.mapStatus.textContent = "Reading this location...";
    try {
      const response = await API.request("reverse_geocode_location", {
        sessionId: this.getSessionId(), latitude: Number(latitude), longitude: Number(longitude)
      });
      const location = response.data || {};
      if (location.formattedAddress) this.elements.address.value = location.formattedAddress;
      this.elements.mapStatus.textContent = location.label ? "Location: " + location.label : "Kitchen location selected.";
      return location;
    } catch (error) {
      this.elements.mapStatus.textContent = "Pin selected. Enter the complete address below.";
      return null;
    }
  },

  fillForm(profile) {
    this.elements.businessName.value = profile.businessName || "";
    this.elements.businessType.value = profile.businessType || "";
    this.elements.ownerName.value = profile.ownerName || "";
    this.elements.email.value = profile.email || "";
    this.elements.foodType.value = profile.foodType || "";
    this.elements.description.value = profile.description || "";
    this.elements.address.value = profile.address || "";
    this.elements.district.value = profile.districtId || "";
    this.elements.latitude.value = profile.latitude || "";
    this.elements.longitude.value = profile.longitude || "";
  },

  getFormData() {
    return {
      businessName: this.elements.businessName.value.trim(),
      businessType: this.elements.businessType.value,
      ownerName: this.elements.ownerName.value.trim(),
      email: this.elements.email.value.trim(),
      foodType: this.elements.foodType.value,
      description: this.elements.description.value.trim(),
      address: this.elements.address.value.trim(),
      districtId: this.elements.district.value,
      latitude: Number(this.elements.latitude.value),
      longitude: Number(this.elements.longitude.value)
    };
  },

  validate(data) {
    if (data.businessName.length < 2) return "Enter your kitchen or business name.";
    if (!data.businessType) return "Select the business type.";
    if (data.ownerName.length < 2) return "Enter the owner name.";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Enter a valid email address.";
    if (!data.foodType) return "Select the food type.";
    if (!LocationManager.isValidCoordinates(data.latitude, data.longitude)) return "Use Current location or place the pin on the map.";
    if (data.address.length < 5) return "Enter the complete business address.";
    if (!data.districtId) return "Select the ApnaBite service district.";
    return "";
  },

  async saveOnboarding() {
    if (this.saving) return;
    const partner = this.getFormData();
    const errorMessage = this.validate(partner);
    if (errorMessage) { this.showError(errorMessage); return; }
    this.saving = true;
    this.elements.saveButton.disabled = true;
    this.elements.saveButton.textContent = "Submitting Kitchen...";
    this.clearError();
    try {
      const response = await API.request("save_food_partner_onboarding", { sessionId: this.getSessionId(), partner });
      const data = response.data || {};
      this.profile = data.profile || null;
      if (!this.profile) throw new Error("Saved partner profile was not returned.");
      this.showDashboard(this.profile);
    } catch (error) {
      this.showError(error.message || "Kitchen details could not be saved.");
    } finally {
      this.saving = false;
      this.elements.saveButton.disabled = false;
      this.elements.saveButton.textContent = this.profile ? "Update Kitchen Details" : "Submit Kitchen Details";
    }
  },

  showDashboard(profile) {
    this.showOnly("dashboard");
    this.elements.businessNameDisplay.textContent = profile.businessName || "Your Kitchen";
    this.elements.addressDisplay.textContent = profile.address || "";
    this.elements.kycStatus.textContent = String(profile.kycStatus || "NOT_SUBMITTED").replace(/_/g, " ");
    this.elements.approvalStatus.textContent = String(profile.approvalStatus || "PENDING").replace(/_/g, " ");
    this.elements.operatingStatus.textContent = String(profile.operatingStatus || "CLOSED").replace(/_/g, " ");
  },

  showError(message) {
    this.elements.error.textContent = message;
    this.elements.error.classList.remove("hidden");
    this.elements.error.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },
  clearError() {
    this.elements.error.textContent = "";
    this.elements.error.classList.add("hidden");
  },

  async test() {
    const response = await API.request("get_food_partner_profile", { sessionId: this.getSessionId() });
    const data = response.data || {};
    const results = [
      { test: "Required role", expected: "Food Partner", actual: document.body.dataset.requiredRole, passed: document.body.dataset.requiredRole === "Food Partner" },
      { test: "Live profile API", expected: true, actual: data.success, passed: data.success === true },
      { test: "District options", expected: "At least 1", actual: this.elements.district.options.length - 1, passed: this.elements.district.options.length > 1 },
      { test: "Leaflet map", expected: true, actual: typeof L !== "undefined", passed: typeof L !== "undefined" },
      { test: "Onboarding state", expected: "Known", actual: data.onboardingComplete, passed: typeof data.onboardingComplete === "boolean" }
    ];
    const passed = results.every((result) => result.passed);
    console.table(results);
    console.log(passed ? "Food Partner Dashboard Test: PASS" : "Food Partner Dashboard Test: FAIL");
    return { success: passed, status: passed ? "PASS" : "FAIL", onboardingComplete: data.onboardingComplete, profile: data.profile || null, results };
  }
};

document.addEventListener("DOMContentLoaded", () => FoodPartnerDashboard.init());
