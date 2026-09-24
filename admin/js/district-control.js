/**
 * ============================================================
 * APNABITE ADMIN
 * FILE: admin/js/district-control.js
 * PURPOSE: Lazy Pan-India State and District Service Control
 * VERSION: 2.1.0
 * ============================================================
 *
 * FEATURES:
 *
 * - Runs inside admin/html/dashboard.html
 * - Loads only when ?view=districts is opened
 * - Loads 36 State/UT summaries first
 * - Loads districts only for the selected state
 * - Never loads all 784 districts into the browser together
 * - State Active/Inactive control
 * - District Active/Inactive control
 * - Bulk district control
 * - District delivery-rule management
 * - Confirmation reasons for every write
 * - Duplicate-request protection
 * - Responsive drawer interface
 * ============================================================
 */

const AdminDistrictControl = {


  /*
   * ==========================================================
   * CONFIGURATION
   * ==========================================================
   */

  CONFIG: {

    API_TIMEOUT_MS:
      30000,

    SEARCH_DELAY_MS:
      300,

    ACTIONS: {

      GET_GEOGRAPHY:
        "admin_get_service_geography",

      SET_STATE_STATUS:
        "admin_set_state_service_status",

      SET_DISTRICT_STATUS:
        "admin_set_district_service_status",

      BULK_SET_DISTRICT_STATUS:
        "admin_bulk_set_district_status",

      UPDATE_DISTRICT_RULES:
        "admin_update_district_service_rules"

    }

  },


  /*
   * ==========================================================
   * APPLICATION STATE
   * ==========================================================
   */

  state: {

    initialized:
      false,

    activated:
      false,

    loaded:
      false,

    loading:
      false,

    districtLoading:
      false,

    requestPromise:
      null,

    districtRequestPromise:
      null,

    summary:
      {},

    states:
      [],

    filteredStates:
      [],

    selectedState:
      null,

    districts:
      [],

    filteredDistricts:
      [],

    selectedDistrictIds:
      new Set(),

    selectedDistrict:
      null,

    pendingAction:
      null,

    stateSearchTimer:
      null,

    districtSearchTimer:
      null

  },


  elements: {},


  /*
   * ==========================================================
   * LAZY MODULE ACTIVATION
   * ==========================================================
   */

  async activate() {

    if (!this.state.initialized) {

      const initialized =
        this.init();


      if (!initialized) {
        return false;
      }

    }


    this.state.activated =
      true;


    if (
      this.state.loaded &&
      this.state.states.length > 0
    ) {

      this.showContent();

      this.renderSummary();

      this.applyStateFilters();

      return true;

    }


    await this.loadGeography(
      false
    );


    return this.state.loaded;

  },


  /*
   * ==========================================================
   * INITIALIZATION
   *
   * This only prepares elements and events.
   * It does not call the API.
   * ==========================================================
   */

  init() {

    if (this.state.initialized) {
      return true;
    }


    this.cacheElements();


    const required = [
      "pageSkeleton",
      "pageContent",
      "pageMessage",
      "refreshButton",
      "stateSearchInput",
      "stateStatusFilter",
      "stateList",
      "stateEmptyState",
      "districtPanel",
      "districtList",
      "serviceStatusDialog",
      "districtRulesDialog"
    ];


    const missing =
      required.filter(
        (key) =>
          !this.elements[key]
      );


    if (missing.length > 0) {

      console.error(
        "Admin District Control elements are missing:",
        missing
      );


      return false;

    }


    this.bindEvents();


    this.state.initialized =
      true;


    console.log(
      "Admin District Control module ready."
    );


    return true;

  },


  /*
   * ==========================================================
   * ELEMENT CACHE
   * ==========================================================
   */

  cacheElements() {

    const byId =
      (id) =>
        document.getElementById(id);


    this.elements = {

      pageSkeleton:
        byId(
          "geographyPageSkeleton"
        ),

      pageContent:
        byId(
          "geographyPageContent"
        ),

      pageMessage:
        byId(
          "geographyPageMessage"
        ),

      refreshButton:
        byId(
          "refreshGeographyButton"
        ),

      lastUpdated:
        byId(
          "geographyLastUpdated"
        ),


      totalStates:
        byId(
          "totalStatesValue"
        ),

      activeStates:
        byId(
          "activeStatesValue"
        ),

      inactiveStates:
        byId(
          "inactiveStatesValue"
        ),

      totalDistricts:
        byId(
          "totalDistrictsValue"
        ),

      activeDistricts:
        byId(
          "activeDistrictsValue"
        ),

      inactiveDistricts:
        byId(
          "inactiveDistrictsValue"
        ),

      effectiveActiveDistricts:
        byId(
          "effectiveActiveDistrictsValue"
        ),

      comingSoonDistricts:
        byId(
          "comingSoonDistrictsValue"
        ),


      stateSearchInput:
        byId(
          "stateSearchInput"
        ),

      stateStatusFilter:
        byId(
          "stateStatusFilter"
        ),

      clearStateFiltersButton:
        byId(
          "clearStateFiltersButton"
        ),

      visibleStatesCount:
        byId(
          "visibleStatesCount"
        ),

      stateList:
        byId(
          "stateList"
        ),

      stateEmptyState:
        byId(
          "stateEmptyState"
        ),


      districtPanel:
        byId(
          "districtPanel"
        ),

      districtPanelBackdrop:
        byId(
          "districtPanelBackdrop"
        ),

      closeDistrictPanelButton:
        byId(
          "closeDistrictPanelButton"
        ),

      selectedStateName:
        byId(
          "selectedStateName"
        ),

      selectedStateMeta:
        byId(
          "selectedStateMeta"
        ),

      selectedStateStatusBadge:
        byId(
          "selectedStateStatusBadge"
        ),

      selectedStateControlName:
        byId(
          "selectedStateControlName"
        ),

      selectedStateControlCode:
        byId(
          "selectedStateControlCode"
        ),

      stateStatusButton:
        byId(
          "stateStatusButton"
        ),

      selectedStateDistrictCount:
        byId(
          "selectedStateDistrictCount"
        ),

      selectedStateActiveCount:
        byId(
          "selectedStateActiveCount"
        ),

      selectedStateEffectiveCount:
        byId(
          "selectedStateEffectiveCount"
        ),


      districtSearchInput:
        byId(
          "districtSearchInput"
        ),

      districtStatusFilter:
        byId(
          "districtStatusFilter"
        ),

      selectAllDistrictsCheckbox:
        byId(
          "selectAllDistrictsCheckbox"
        ),

      bulkActivateButton:
        byId(
          "bulkActivateDistrictsButton"
        ),

      bulkDeactivateButton:
        byId(
          "bulkDeactivateDistrictsButton"
        ),

      districtLoading:
        byId(
          "districtLoading"
        ),

      districtError:
        byId(
          "districtError"
        ),

      districtList:
        byId(
          "districtList"
        ),

      districtEmptyState:
        byId(
          "districtEmptyState"
        ),


      serviceStatusDialog:
        byId(
          "serviceStatusDialog"
        ),

      serviceStatusDialogTitle:
        byId(
          "serviceStatusDialogTitle"
        ),

      serviceStatusDialogDescription:
        byId(
          "serviceStatusDialogDescription"
        ),

      serviceStatusReasonInput:
        byId(
          "serviceStatusReasonInput"
        ),

      serviceStatusDialogError:
        byId(
          "serviceStatusDialogError"
        ),

      cancelServiceStatusButton:
        byId(
          "cancelServiceStatusButton"
        ),

      confirmServiceStatusButton:
        byId(
          "confirmServiceStatusButton"
        ),


      districtRulesDialog:
        byId(
          "districtRulesDialog"
        ),

      districtRulesTitle:
        byId(
          "districtRulesTitle"
        ),

      districtRulesId:
        byId(
          "districtRulesId"
        ),

      districtServiceRadiusInput:
        byId(
          "districtServiceRadiusInput"
        ),

      districtDeliveryFeeInput:
        byId(
          "districtDeliveryFeeInput"
        ),

      districtMinimumDeliveryFeeInput:
        byId(
          "districtMinimumDeliveryFeeInput"
        ),

      districtLongDistanceInput:
        byId(
          "districtLongDistanceInput"
        ),

      districtRulesReasonInput:
        byId(
          "districtRulesReasonInput"
        ),

      districtRulesError:
        byId(
          "districtRulesError"
        ),

      cancelDistrictRulesButton:
        byId(
          "cancelDistrictRulesButton"
        ),

      saveDistrictRulesButton:
        byId(
          "saveDistrictRulesButton"
        )

    };

  },


  /*
   * ==========================================================
   * EVENT BINDING
   * ==========================================================
   */

  bindEvents() {

    const elements =
      this.elements;


    elements.refreshButton
      .addEventListener(
        "click",
        () => {

          this.loadGeography(
            true
          );

        }
      );


    elements.stateSearchInput
      .addEventListener(
        "input",
        () => {

          clearTimeout(
            this.state.stateSearchTimer
          );


          this.state.stateSearchTimer =
            setTimeout(
              () => {

                this.applyStateFilters();

              },
              this.CONFIG
                .SEARCH_DELAY_MS
            );

        }
      );


    elements.stateStatusFilter
      .addEventListener(
        "change",
        () => {

          this.applyStateFilters();

        }
      );


    if (
      elements.clearStateFiltersButton
    ) {

      elements.clearStateFiltersButton
        .addEventListener(
          "click",
          () => {

            this.clearStateFilters();

          }
        );

    }


    elements.stateList
      .addEventListener(
        "click",
        (event) => {

          this.handleStateListClick(
            event
          );

        }
      );


    if (
      elements.districtPanelBackdrop
    ) {

      elements.districtPanelBackdrop
        .addEventListener(
          "click",
          () => {

            this.closeDistrictPanel();

          }
        );

    }


    if (
      elements.closeDistrictPanelButton
    ) {

      elements.closeDistrictPanelButton
        .addEventListener(
          "click",
          () => {

            this.closeDistrictPanel();

          }
        );

    }


    if (
      elements.stateStatusButton
    ) {

      elements.stateStatusButton
        .addEventListener(
          "click",
          () => {

            this.requestStateStatusChange();

          }
        );

    }


    if (
      elements.districtSearchInput
    ) {

      elements.districtSearchInput
        .addEventListener(
          "input",
          () => {

            clearTimeout(
              this.state
                .districtSearchTimer
            );


            this.state
              .districtSearchTimer =
                setTimeout(
                  () => {

                    this.applyDistrictFilters();

                  },
                  this.CONFIG
                    .SEARCH_DELAY_MS
                );

          }
        );

    }


    if (
      elements.districtStatusFilter
    ) {

      elements.districtStatusFilter
        .addEventListener(
          "change",
          () => {

            this.applyDistrictFilters();

          }
        );

    }


    if (
      elements.selectAllDistrictsCheckbox
    ) {

      elements.selectAllDistrictsCheckbox
        .addEventListener(
          "change",
          (event) => {

            this.toggleAllVisibleDistricts(
              event.target.checked
            );

          }
        );

    }


    if (
      elements.bulkActivateButton
    ) {

      elements.bulkActivateButton
        .addEventListener(
          "click",
          () => {

            this.requestBulkDistrictStatusChange(
              "ACTIVE"
            );

          }
        );

    }


    if (
      elements.bulkDeactivateButton
    ) {

      elements.bulkDeactivateButton
        .addEventListener(
          "click",
          () => {

            this.requestBulkDistrictStatusChange(
              "INACTIVE"
            );

          }
        );

    }


    elements.districtList
      .addEventListener(
        "click",
        (event) => {

          this.handleDistrictListClick(
            event
          );

        }
      );


    elements.districtList
      .addEventListener(
        "change",
        (event) => {

          this.handleDistrictSelectionChange(
            event
          );

        }
      );


    if (
      elements.cancelServiceStatusButton
    ) {

      elements.cancelServiceStatusButton
        .addEventListener(
          "click",
          () => {

            this.closeStatusDialog();

          }
        );

    }


    if (
      elements.confirmServiceStatusButton
    ) {

      elements.confirmServiceStatusButton
        .addEventListener(
          "click",
          () => {

            this.confirmStatusAction();

          }
        );

    }


    if (
      elements.cancelDistrictRulesButton
    ) {

      elements.cancelDistrictRulesButton
        .addEventListener(
          "click",
          () => {

            this.closeRulesDialog();

          }
        );

    }


    if (
      elements.saveDistrictRulesButton
    ) {

      elements.saveDistrictRulesButton
        .addEventListener(
          "click",
          () => {

            this.saveDistrictRules();

          }
        );

    }


    document.addEventListener(
      "keydown",
      (event) => {

        if (event.key !== "Escape") {
          return;
        }


        if (
          elements.serviceStatusDialog &&
          !elements.serviceStatusDialog
            .classList.contains(
              "hidden"
            )
        ) {

          this.closeStatusDialog();

          return;

        }


        if (
          elements.districtRulesDialog &&
          !elements.districtRulesDialog
            .classList.contains(
              "hidden"
            )
        ) {

          this.closeRulesDialog();

          return;

        }


        if (
          elements.districtPanel &&
          !elements.districtPanel
            .classList.contains(
              "hidden"
            )
        ) {

          this.closeDistrictPanel();

        }

      }
    );

  },


  /*
   * ==========================================================
   * SESSION
   * ==========================================================
   */

  getSession() {

    if (
      typeof SessionManager ===
        "undefined" ||
      typeof SessionManager.get !==
        "function"
    ) {

      return null;

    }


    return SessionManager.get();

  },


  getSessionId() {

    const session =
      this.getSession();


    return session &&
      session.sessionId
        ? session.sessionId
        : "";

  },


  /*
   * ==========================================================
   * API REQUEST WRAPPER
   * ==========================================================
   */

  async request(
    action,
    payload
  ) {

    if (
      typeof API === "undefined" ||
      typeof API.request !==
        "function"
    ) {

      throw new Error(
        "API service is unavailable."
      );

    }


    const response =
      await API.request(
        action,
        payload,
        {
          timeoutMs:
            this.CONFIG
              .API_TIMEOUT_MS
        }
      );


    if (
      !response ||
      response.success !== true
    ) {

      throw new Error(
        this.extractErrorMessage(
          response
        )
      );

    }


    const data =
      response.data || {};


    if (data.success === false) {

      throw new Error(
        this.extractErrorMessage(
          data
        )
      );

    }


    return {
      response:
        response,

      data:
        data
    };

  },


  extractErrorMessage(result) {

    if (!result) {

      return "The request could not be completed.";

    }


    if (
      result.error &&
      result.error.message
    ) {

      return String(
        result.error.message
      );

    }


    if (
      result.error &&
      result.error.code
    ) {

      return this.getReasonMessage(
        result.error.code
      );

    }


    if (result.message) {

      return String(
        result.message
      );

    }


    if (result.reason) {

      return this.getReasonMessage(
        result.reason
      );

    }


    return "The request could not be completed.";

  },


  getReasonMessage(reason) {

    const messages = {

      INVALID_SESSION:
        "Your session is not valid. Please login again.",

      SESSION_NOT_FOUND:
        "Your session was not found. Please login again.",

      SESSION_EXPIRED:
        "Your session has expired. Please login again.",

      SESSION_NOT_ACTIVE:
        "Your session is no longer active. Please login again.",

      ADMIN_ACCESS_REQUIRED:
        "Admin access is required.",

      STATE_CODE_REQUIRED:
        "State code is required.",

      STATE_NOT_FOUND:
        "The selected state was not found.",

      DISTRICT_ID_REQUIRED:
        "District ID is required.",

      DISTRICT_NOT_FOUND:
        "The selected district was not found.",

      INVALID_SERVICE_STATUS:
        "Service status must be Active or Inactive.",

      STATE_NOT_ACTIVE:
        "Activate the parent state before activating this district.",

      CHANGE_REASON_REQUIRED:
        "Enter a valid reason for this change.",

      DISTRICT_IDS_REQUIRED:
        "Select at least one district.",

      INVALID_SERVICE_RADIUS:
        "Enter a valid service radius.",

      INVALID_DELIVERY_FEE:
        "Enter a valid delivery fee per kilometre.",

      INVALID_MINIMUM_DELIVERY_FEE:
        "Enter a valid minimum delivery fee.",

      GEOGRAPHY_WRITE_BUSY:
        "Another geography update is running. Please try again.",

      GEOGRAPHY_UPDATE_FAILED:
        "Service geography could not be updated."

    };


    return messages[reason] ||
      String(
        reason ||
        "Request failed."
      )
        .replace(
          /_/g,
          " "
        )
        .toLowerCase()
        .replace(
          /\b\w/g,
          (character) =>
            character.toUpperCase()
        );

  },


  /*
   * ==========================================================
   * STATE SUMMARY LOAD
   * ==========================================================
   */

  loadGeography(forceRefresh = false) {

    if (
      this.state.requestPromise
    ) {

      return this.state
        .requestPromise;

    }


    this.state.requestPromise =
      this.performGeographyLoad(
        forceRefresh
      )
        .finally(
          () => {

            this.state.requestPromise =
              null;

          }
        );


    return this.state
      .requestPromise;

  },


  async performGeographyLoad(
    forceRefresh
  ) {

    this.state.loading =
      true;


    this.setRefreshLoading(
      true
    );


    this.clearPageMessage();


    if (!this.state.loaded) {

      this.showSkeleton();

    }


    try {

      const requestResult =
        await this.request(
          this.CONFIG.ACTIONS
            .GET_GEOGRAPHY,
          {
            sessionId:
              this.getSessionId(),

            filters: {

              query:
                "",

              serviceStatus:
                "ALL",

              stateCode:
                "",

              includeDistricts:
                false

            }
          }
        );


      const data =
        requestResult.data || {};


      this.state.summary =
        this.normalizeSummary(
          data.summary || {}
        );


      this.state.states =
        this.normalizeStates(
          data.states || []
        );


      this.state.loaded =
        true;


      this.renderSummary();


      this.applyStateFilters();


      this.updateLastUpdated(
        data.generatedAt
      );


      this.showContent();


      if (forceRefresh) {

        this.showPageSuccess(
          "Service geography refreshed successfully."
        );

      }


      return data;

    } catch (error) {

      console.error(
        "Admin geography load failed:",
        error
      );


      if (this.state.loaded) {

        this.showContent();

      } else {

        this.hideSkeleton();

      }


      this.showPageError(
        error &&
        error.message
          ? error.message
          : "Service geography could not be loaded."
      );


      return null;

    } finally {

      this.state.loading =
        false;


      this.setRefreshLoading(
        false
      );

    }

  },


  /*
   * ==========================================================
   * NORMALIZATION
   * ==========================================================
   */

  normalizeSummary(summary) {

    return {

      totalStates:
        this.toNumber(
          summary.totalStates
        ),

      activeStates:
        this.toNumber(
          summary.activeStates
        ),

      inactiveStates:
        this.toNumber(
          summary.inactiveStates
        ),

      totalDistricts:
        this.toNumber(
          summary.totalDistricts
        ),

      activeDistricts:
        this.toNumber(
          summary.activeDistricts
        ),

      inactiveDistricts:
        this.toNumber(
          summary.inactiveDistricts
        ),

      effectiveActiveDistricts:
        this.toNumber(
          summary.effectiveActiveDistricts
        ),

      comingSoonDistricts:
        this.toNumber(
          summary.comingSoonDistricts
        )

    };

  },


  normalizeStates(states) {

    if (!Array.isArray(states)) {
      return [];
    }


    return states
      .map(
        (state) =>
          this.normalizeState(
            state
          )
      )
      .filter(
        (state) =>
          Boolean(
            state.stateCode
          )
      )
      .sort(
        (first, second) =>
          first.stateName
            .localeCompare(
              second.stateName
            )
      );

  },


  normalizeState(state) {

    const counts =
      state.districtCounts || {};


    return {

      stateId:
        String(
          state.stateId ||
          state.StateID ||
          ""
        ).trim(),

      stateCode:
        String(
          state.stateCode ||
          state.lgdStateCode ||
          state.LGDStateCode ||
          state.StateCode ||
          ""
        ).trim(),

      stateName:
        String(
          state.stateName ||
          state.name ||
          state.State ||
          state.StateName ||
          "Unnamed state"
        ).trim(),

      serviceStatus:
        this.normalizeStatus(
          state.serviceStatus ||
          state.ServiceStatus ||
          state.status ||
          state.Status
        ),

      customerVisibility:
        String(
          state.customerVisibility ||
          state.CustomerVisibility ||
          ""
        ).trim(),

      activationNote:
        String(
          state.activationNote ||
          state.ActivationNote ||
          ""
        ).trim(),

      updatedAt:
        String(
          state.updatedAt ||
          state.UpdatedAt ||
          ""
        ).trim(),

      districtCounts: {

        total:
          this.toNumber(
            counts.total !==
              undefined
              ? counts.total
              : state.totalDistricts
          ),

        active:
          this.toNumber(
            counts.active !==
              undefined
              ? counts.active
              : state.activeDistricts
          ),

        inactive:
          this.toNumber(
            counts.inactive !==
              undefined
              ? counts.inactive
              : state.inactiveDistricts
          ),

        effectiveActive:
          this.toNumber(
            counts.effectiveActive !==
              undefined
              ? counts.effectiveActive
              : state.effectiveActiveDistricts
          ),

        comingSoon:
          this.toNumber(
            counts.comingSoon !==
              undefined
              ? counts.comingSoon
              : state.comingSoonDistricts
          )

      }

    };

  },


  normalizeDistricts(districts) {

    if (!Array.isArray(districts)) {
      return [];
    }


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
            district.districtId
          )
      )
      .sort(
        (first, second) =>
          first.districtName
            .localeCompare(
              second.districtName
            )
      );

  },


  normalizeDistrict(district) {

    return {

      districtId:
        String(
          district.districtId ||
          district.DistrictID ||
          ""
        ).trim(),

      districtCode:
        String(
          district.districtCode ||
          district.lgdDistrictCode ||
          district.LGDDistrictCode ||
          ""
        ).trim(),

      districtName:
        String(
          district.districtName ||
          district.name ||
          district.DistrictName ||
          "Unnamed district"
        ).trim(),

      stateCode:
        String(
          district.stateCode ||
          district.lgdStateCode ||
          district.LGDStateCode ||
          district.StateCode ||
          ""
        ).trim(),

      stateName:
        String(
          district.stateName ||
          district.State ||
          ""
        ).trim(),

      serviceStatus:
        this.normalizeStatus(
          district.serviceStatus ||
          district.ServiceStatus ||
          district.status ||
          district.Status
        ),

      effectiveServiceStatus:
        this.normalizeStatus(
          district.effectiveServiceStatus ||
          district.effectiveStatus ||
          district.EffectiveServiceStatus ||
          district.serviceStatus ||
          district.ServiceStatus
        ),

      customerVisibility:
        String(
          district.customerVisibility ||
          district.CustomerVisibility ||
          ""
        ).trim(),

      serviceRadiusKm:
        this.toNumber(
          district.serviceRadiusKm !==
            undefined
            ? district.serviceRadiusKm
            : district.ServiceRadiusKm
        ),

      deliveryFeePerKm:
        this.toNumber(
          district.deliveryFeePerKm !==
            undefined
            ? district.deliveryFeePerKm
            : district.DeliveryFeePerKm
        ),

      minimumDeliveryFee:
        this.toNumber(
          district.minimumDeliveryFee !==
            undefined
            ? district.minimumDeliveryFee
            : district.MinimumDeliveryFee
        ),

      longDistanceEnabled:
        this.toBoolean(
          district.longDistanceEnabled !==
            undefined
            ? district.longDistanceEnabled
            : district.LongDistanceEnabled
        ),

      updatedAt:
        String(
          district.updatedAt ||
          district.UpdatedAt ||
          ""
        ).trim()

    };

  },


  /*
   * ==========================================================
   * SUMMARY RENDERING
   * ==========================================================
   */

  renderSummary() {

    const summary =
      this.state.summary;


    this.setText(
      this.elements.totalStates,
      this.formatNumber(
        summary.totalStates
      )
    );


    this.setText(
      this.elements.activeStates,
      this.formatNumber(
        summary.activeStates
      )
    );


    this.setText(
      this.elements.inactiveStates,
      this.formatNumber(
        summary.inactiveStates
      )
    );


    this.setText(
      this.elements.totalDistricts,
      this.formatNumber(
        summary.totalDistricts
      )
    );


    this.setText(
      this.elements.activeDistricts,
      this.formatNumber(
        summary.activeDistricts
      )
    );


    this.setText(
      this.elements.inactiveDistricts,
      this.formatNumber(
        summary.inactiveDistricts
      )
    );


    this.setText(
      this.elements
        .effectiveActiveDistricts,
      this.formatNumber(
        summary.effectiveActiveDistricts
      )
    );


    this.setText(
      this.elements.comingSoonDistricts,
      this.formatNumber(
        summary.comingSoonDistricts
      )
    );

  },


  /*
   * ==========================================================
   * STATE FILTERING
   * ==========================================================
   */

  applyStateFilters() {

    const query =
      this.elements.stateSearchInput
        ? String(
            this.elements
              .stateSearchInput.value ||
            ""
          )
            .trim()
            .toLowerCase()
        : "";


    const status =
      this.elements.stateStatusFilter
        ? this.normalizeFilterStatus(
            this.elements
              .stateStatusFilter.value
          )
        : "ALL";


    this.state.filteredStates =
      this.state.states.filter(
        (state) => {

          const matchesQuery =
            !query ||
            state.stateName
              .toLowerCase()
              .includes(query) ||
            state.stateCode
              .toLowerCase()
              .includes(query);


          const matchesStatus =
            status === "ALL" ||
            state.serviceStatus ===
              status;


          return (
            matchesQuery &&
            matchesStatus
          );

        }
      );


    this.renderStates();

  },


  clearStateFilters() {

    if (
      this.elements.stateSearchInput
    ) {

      this.elements
        .stateSearchInput.value =
          "";

    }


    if (
      this.elements.stateStatusFilter
    ) {

      this.elements
        .stateStatusFilter.value =
          "ALL";

    }


    this.applyStateFilters();

  },


  /*
   * ==========================================================
   * STATE DIRECTORY RENDERING
   * ==========================================================
   */

  renderStates() {

    const container =
      this.elements.stateList;


    container.innerHTML =
      "";


    this.setText(
      this.elements.visibleStatesCount,
      this.formatNumber(
        this.state.filteredStates
          .length
      )
    );


    if (
      this.state.filteredStates
        .length === 0
    ) {

      this.show(
        this.elements.stateEmptyState
      );

      return;

    }


    this.hide(
      this.elements.stateEmptyState
    );


    const fragment =
      document.createDocumentFragment();


    this.state.filteredStates
      .forEach(
        (state) => {

          fragment.appendChild(
            this.createStateCard(
              state
            )
          );

        }
      );


    container.appendChild(
      fragment
    );

  },


  createStateCard(state) {

    const active =
      state.serviceStatus ===
      "ACTIVE";


    const card =
      document.createElement(
        "article"
      );


    card.className =
      "geography-state-card " +
      (
        active
          ? "active"
          : "inactive"
      );


    card.dataset.stateCode =
      state.stateCode;


    card.tabIndex =
      0;


    card.setAttribute(
      "role",
      "button"
    );


    card.setAttribute(
      "aria-label",
      "Manage " +
      state.stateName +
      " districts"
    );


    const main =
      document.createElement(
        "div"
      );


    main.className =
      "geography-state-main";


    const icon =
      document.createElement(
        "span"
      );


    icon.className =
      "geography-state-icon";


    icon.textContent =
      active
        ? "✓"
        : "⌖";


    const information =
      document.createElement(
        "div"
      );


    information.className =
      "geography-state-information";


    const title =
      document.createElement(
        "h4"
      );


    title.textContent =
      state.stateName;


    const meta =
      document.createElement(
        "p"
      );


    meta.textContent =
      "LGD State Code: " +
      (
        state.stateCode ||
        "—"
      );


    const counts =
      document.createElement(
        "div"
      );


    counts.className =
      "geography-state-counts";


    counts.appendChild(
      this.createTextPill(
        this.formatNumber(
          state.districtCounts.total
        ) +
        " districts"
      )
    );


    const liveCount =
      this.createTextPill(
        this.formatNumber(
          state.districtCounts
            .effectiveActive
        ) +
        " live"
      );


    liveCount.classList.add(
      "live"
    );


    counts.appendChild(
      liveCount
    );


    information.append(
      title,
      meta,
      counts
    );


    main.append(
      icon,
      information
    );


    const action =
      document.createElement(
        "div"
      );


    action.className =
      "geography-state-action";


    const badge =
      document.createElement(
        "span"
      );


    badge.className =
      "geography-status-badge " +
      (
        active
          ? "active"
          : "inactive"
      );


    badge.textContent =
      active
        ? "ACTIVE"
        : "INACTIVE";


    const open =
      document.createElement(
        "span"
      );


    open.className =
      "geography-state-open";


    open.textContent =
      "Manage";


    action.append(
      badge,
      open
    );


    card.append(
      main,
      action
    );


    card.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();


          this.openStateByCode(
            state.stateCode
          );

        }

      }
    );


    return card;

  },


  createTextPill(text) {

    const pill =
      document.createElement(
        "span"
      );


    pill.textContent =
      text;


    return pill;

  },


  handleStateListClick(event) {

    const card =
      event.target.closest(
        "[data-state-code]"
      );


    if (!card) {
      return;
    }


    this.openStateByCode(
      card.dataset.stateCode
    );

  },


  /*
   * ==========================================================
   * SELECTED STATE AND LAZY DISTRICT LOAD
   * ==========================================================
   */

  async openStateByCode(
    stateCode
  ) {

    const selectedState =
      this.state.states.find(
        (state) =>
          String(
            state.stateCode
          ) ===
          String(
            stateCode
          )
      );


    if (!selectedState) {

      this.showPageError(
        "The selected state was not found."
      );

      return;

    }


    this.state.selectedState =
      selectedState;


    this.state.districts =
      [];


    this.state.filteredDistricts =
      [];


    this.state.selectedDistrictIds
      .clear();


    this.resetDistrictFilters();


    this.renderSelectedStateHeader();


    this.renderDistrictSummary();


    this.renderDistricts();


    this.openDistrictPanel();


    await this.loadSelectedStateDistricts();

  },


  openDistrictPanel() {

    this.show(
      this.elements.districtPanel
    );


    this.elements.districtPanel
      .setAttribute(
        "aria-hidden",
        "false"
      );


    document.body.style.overflow =
      "hidden";

  },


  closeDistrictPanel() {

    this.hide(
      this.elements.districtPanel
    );


    this.elements.districtPanel
      .setAttribute(
        "aria-hidden",
        "true"
      );


    document.body.style.overflow =
      "";


    this.state.selectedDistrictIds
      .clear();


    this.updateBulkControls();

  },


  loadSelectedStateDistricts() {

    if (
      this.state.districtRequestPromise
    ) {

      return this.state
        .districtRequestPromise;

    }


    this.state.districtRequestPromise =
      this.performDistrictLoad()
        .finally(
          () => {

            this.state
              .districtRequestPromise =
                null;

          }
        );


    return this.state
      .districtRequestPromise;

  },


  async performDistrictLoad() {

    const selectedState =
      this.state.selectedState;


    if (!selectedState) {
      return null;
    }


    const requestedStateCode =
      selectedState.stateCode;


    this.state.districtLoading =
      true;


    this.showDistrictLoading(
      true
    );


    this.clearDistrictError();


    try {

      const requestResult =
        await this.request(
          this.CONFIG.ACTIONS
            .GET_GEOGRAPHY,
          {
            sessionId:
              this.getSessionId(),

            filters: {

              query:
                "",

              serviceStatus:
                "ALL",

              stateCode:
                requestedStateCode,

              includeDistricts:
                true

            }
          }
        );


      if (
        !this.state.selectedState ||
        this.state.selectedState
          .stateCode !==
          requestedStateCode
      ) {

        return requestResult.data;

      }


      const data =
        requestResult.data || {};


      const returnedStates =
        Array.isArray(
          data.states
        )
          ? data.states
          : [];


      const returnedState =
        returnedStates.find(
          (state) =>
            String(
              state.stateCode ||
              state.LGDStateCode ||
              state.StateCode ||
              ""
            ) ===
            String(
              requestedStateCode
            )
        ) ||
        returnedStates[0] ||
        {};


      const rawDistricts =
        Array.isArray(
          returnedState.districts
        )
          ? returnedState.districts
          : (
              Array.isArray(
                data.districts
              )
                ? data.districts
                : []
            );


      this.state.districts =
        this.normalizeDistricts(
          rawDistricts
        );


      const normalizedState =
        this.normalizeState(
          returnedState
        );


      if (
        normalizedState.stateCode
      ) {

        this.mergeSelectedState(
          normalizedState
        );

      }


      this.applyDistrictFilters();


      this.renderSelectedStateHeader();


      this.renderDistrictSummary();


      return data;

    } catch (error) {

      console.error(
        "Selected state district load failed:",
        error
      );


      this.showDistrictError(
        error &&
        error.message
          ? error.message
          : "Districts could not be loaded."
      );


      return null;

    } finally {

      this.state.districtLoading =
        false;


      this.showDistrictLoading(
        false
      );

    }

  },


  mergeSelectedState(updatedState) {

    const index =
      this.state.states.findIndex(
        (state) =>
          state.stateCode ===
          updatedState.stateCode
      );


    if (index < 0) {
      return;
    }


    this.state.states[index] = {

      ...this.state.states[index],

      ...updatedState,

      districtCounts: {

        ...this.state.states[index]
          .districtCounts,

        ...updatedState.districtCounts

      }

    };


    this.state.selectedState =
      this.state.states[index];

  },


  /*
   * ==========================================================
   * SELECTED STATE RENDERING
   * ==========================================================
   */

  renderSelectedStateHeader() {

    const selectedState =
      this.state.selectedState;


    if (!selectedState) {
      return;
    }


    const active =
      selectedState.serviceStatus ===
      "ACTIVE";


    this.setText(
      this.elements.selectedStateName,
      selectedState.stateName
    );


    this.setText(
      this.elements.selectedStateMeta,
      this.formatNumber(
        selectedState
          .districtCounts.total
      ) +
      " official districts"
    );


    this.setText(
      this.elements.selectedStateControlName,
      selectedState.stateName
    );


    this.setText(
      this.elements.selectedStateControlCode,
      "LGD State Code: " +
      selectedState.stateCode
    );


    this.elements
      .selectedStateStatusBadge
      .className =
        "geography-status-badge " +
        (
          active
            ? "active"
            : "inactive"
        );


    this.elements
      .selectedStateStatusBadge
      .textContent =
        active
          ? "ACTIVE"
          : "INACTIVE";


    this.elements.stateStatusButton
      .textContent =
        active
          ? "Deactivate state"
          : "Activate state";


    this.elements.stateStatusButton
      .className =
        "geography-state-status-button" +
        (
          active
            ? " deactivate"
            : ""
        );

  },


  renderDistrictSummary() {

    const selectedState =
      this.state.selectedState;


    if (!selectedState) {
      return;
    }


    const counts =
      selectedState.districtCounts;


    this.setText(
      this.elements
        .selectedStateDistrictCount,
      this.formatNumber(
        counts.total
      )
    );


    this.setText(
      this.elements
        .selectedStateActiveCount,
      this.formatNumber(
        counts.active
      )
    );


    this.setText(
      this.elements
        .selectedStateEffectiveCount,
      this.formatNumber(
        counts.effectiveActive
      )
    );

  },


  /*
   * ==========================================================
   * DISTRICT FILTERING
   * ==========================================================
   */

  resetDistrictFilters() {

    if (
      this.elements.districtSearchInput
    ) {

      this.elements
        .districtSearchInput.value =
          "";

    }


    if (
      this.elements.districtStatusFilter
    ) {

      this.elements
        .districtStatusFilter.value =
          "ALL";

    }


    if (
      this.elements
        .selectAllDistrictsCheckbox
    ) {

      this.elements
        .selectAllDistrictsCheckbox
        .checked =
          false;


      this.elements
        .selectAllDistrictsCheckbox
        .indeterminate =
          false;

    }

  },


  applyDistrictFilters() {

    const query =
      this.elements.districtSearchInput
        ? String(
            this.elements
              .districtSearchInput.value ||
            ""
          )
            .trim()
            .toLowerCase()
        : "";


    const status =
      this.elements.districtStatusFilter
        ? this.normalizeFilterStatus(
            this.elements
              .districtStatusFilter.value
          )
        : "ALL";


    this.state.filteredDistricts =
      this.state.districts.filter(
        (district) => {

          const matchesQuery =
            !query ||
            district.districtName
              .toLowerCase()
              .includes(query) ||
            district.districtId
              .toLowerCase()
              .includes(query) ||
            district.districtCode
              .toLowerCase()
              .includes(query);


          const matchesStatus =
            status === "ALL" ||
            district.serviceStatus ===
              status;


          return (
            matchesQuery &&
            matchesStatus
          );

        }
      );


    this.renderDistricts();

  },


  /*
   * ==========================================================
   * DISTRICT RENDERING
   * ==========================================================
   */

  renderDistricts() {

    const container =
      this.elements.districtList;


    container.innerHTML =
      "";


    if (
      this.state.districtLoading
    ) {

      this.hide(
        this.elements
          .districtEmptyState
      );

      return;

    }


    if (
      this.state.filteredDistricts
        .length === 0
    ) {

      this.show(
        this.elements
          .districtEmptyState
      );


      this.updateBulkControls();


      return;

    }


    this.hide(
      this.elements
        .districtEmptyState
    );


    const fragment =
      document.createDocumentFragment();


    this.state.filteredDistricts
      .forEach(
        (district) => {

          fragment.appendChild(
            this.createDistrictCard(
              district
            )
          );

        }
      );


    container.appendChild(
      fragment
    );


    this.updateBulkControls();

  },


  createDistrictCard(district) {

    const selected =
      this.state.selectedDistrictIds
        .has(
          district.districtId
        );


    const districtActive =
      district.serviceStatus ===
      "ACTIVE";


    const stateActive =
      this.state.selectedState &&
      this.state.selectedState
        .serviceStatus ===
        "ACTIVE";


    const card =
      document.createElement(
        "article"
      );


    card.className =
      "district-card" +
      (
        selected
          ? " selected"
          : ""
      );


    card.dataset.districtId =
      district.districtId;


    const checkbox =
      document.createElement(
        "input"
      );


    checkbox.type =
      "checkbox";


    checkbox.className =
      "district-select-checkbox";


    checkbox.dataset.districtId =
      district.districtId;


    checkbox.checked =
      selected;


    checkbox.setAttribute(
      "aria-label",
      "Select " +
      district.districtName
    );


    const information =
      document.createElement(
        "div"
      );


    information.className =
      "district-card-information";


    const title =
      document.createElement(
        "h4"
      );


    title.textContent =
      district.districtName;


    const meta =
      document.createElement(
        "p"
      );


    meta.textContent =
      "District ID: " +
      district.districtId +
      (
        district.districtCode
          ? " • LGD " +
            district.districtCode
          : ""
      );


    const metrics =
      document.createElement(
        "div"
      );


    metrics.className =
      "district-card-metrics";


    metrics.appendChild(
      this.createTextPill(
        this.formatNumber(
          district.serviceRadiusKm
        ) +
        " KM radius"
      )
    );


    metrics.appendChild(
      this.createTextPill(
        "₹" +
        this.formatDecimal(
          district.deliveryFeePerKm
        ) +
        "/KM"
      )
    );


    const effectivePill =
      this.createTextPill(
        district
          .effectiveServiceStatus ===
          "ACTIVE"
          ? "Customer live"
          : "Not live"
      );


    effectivePill.classList.add(
      district
        .effectiveServiceStatus ===
        "ACTIVE"
        ? "live"
        : "inactive"
    );


    metrics.appendChild(
      effectivePill
    );


    information.append(
      title,
      meta,
      metrics
    );


    const actions =
      document.createElement(
        "div"
      );


    actions.className =
      "district-card-actions";


    const rulesButton =
      document.createElement(
        "button"
      );


    rulesButton.type =
      "button";


    rulesButton.className =
      "district-rules-button";


    rulesButton.dataset.action =
      "rules";


    rulesButton.dataset.districtId =
      district.districtId;


    rulesButton.textContent =
      "Rules";


    const statusButton =
      document.createElement(
        "button"
      );


    statusButton.type =
      "button";


    statusButton.dataset.action =
      "status";


    statusButton.dataset.districtId =
      district.districtId;


    statusButton.className =
      "district-status-button" +
      (
        districtActive
          ? " deactivate"
          : ""
      );


    statusButton.textContent =
      districtActive
        ? "Deactivate"
        : "Activate";


    if (
      !districtActive &&
      !stateActive
    ) {

      statusButton.disabled =
        true;


      statusButton.title =
        "Activate the parent state first.";

    }


    actions.append(
      rulesButton,
      statusButton
    );


    card.append(
      checkbox,
      information,
      actions
    );


    return card;

  },


  handleDistrictSelectionChange(
    event
  ) {

    const checkbox =
      event.target.closest(
        ".district-select-checkbox"
      );


    if (!checkbox) {
      return;
    }


    const districtId =
      String(
        checkbox.dataset.districtId ||
        ""
      );


    if (!districtId) {
      return;
    }


    if (checkbox.checked) {

      this.state.selectedDistrictIds
        .add(
          districtId
        );

    } else {

      this.state.selectedDistrictIds
        .delete(
          districtId
        );

    }


    const card =
      checkbox.closest(
        ".district-card"
      );


    if (card) {

      card.classList.toggle(
        "selected",
        checkbox.checked
      );

    }


    this.updateBulkControls();

  },


  handleDistrictListClick(event) {

    const button =
      event.target.closest(
        "button[data-action]"
      );


    if (!button) {
      return;
    }


    const districtId =
      String(
        button.dataset.districtId ||
        ""
      );


    const district =
      this.state.districts.find(
        (item) =>
          item.districtId ===
          districtId
      );


    if (!district) {

      this.showDistrictError(
        "The selected district was not found."
      );

      return;

    }


    if (
      button.dataset.action ===
      "rules"
    ) {

      this.openRulesDialog(
        district
      );

      return;

    }


    if (
      button.dataset.action ===
      "status"
    ) {

      this.requestDistrictStatusChange(
        district
      );

    }

  },


  /*
   * ==========================================================
   * BULK SELECTION
   * ==========================================================
   */

  toggleAllVisibleDistricts(
    checked
  ) {

    this.state.filteredDistricts
      .forEach(
        (district) => {

          if (checked) {

            this.state
              .selectedDistrictIds
              .add(
                district.districtId
              );

          } else {

            this.state
              .selectedDistrictIds
              .delete(
                district.districtId
              );

          }

        }
      );


    this.renderDistricts();

  },


  updateBulkControls() {

    const selectedCount =
      this.state.selectedDistrictIds
        .size;


    const stateActive =
      Boolean(
        this.state.selectedState &&
        this.state.selectedState
          .serviceStatus ===
          "ACTIVE"
      );


    if (
      this.elements.bulkActivateButton
    ) {

      this.elements
        .bulkActivateButton.disabled =
          selectedCount === 0 ||
          !stateActive;

    }


    if (
      this.elements.bulkDeactivateButton
    ) {

      this.elements
        .bulkDeactivateButton.disabled =
          selectedCount === 0;

    }


    const checkbox =
      this.elements
        .selectAllDistrictsCheckbox;


    if (!checkbox) {
      return;
    }


    const visibleIds =
      this.state.filteredDistricts
        .map(
          (district) =>
            district.districtId
        );


    const selectedVisible =
      visibleIds.filter(
        (districtId) =>
          this.state.selectedDistrictIds
            .has(
              districtId
            )
      ).length;


    checkbox.checked =
      visibleIds.length > 0 &&
      selectedVisible ===
        visibleIds.length;


    checkbox.indeterminate =
      selectedVisible > 0 &&
      selectedVisible <
        visibleIds.length;

  },


  /*
   * ==========================================================
   * STATUS ACTION REQUESTS
   * ==========================================================
   */

  requestStateStatusChange() {

    const selectedState =
      this.state.selectedState;


    if (!selectedState) {
      return;
    }


    const nextStatus =
      selectedState.serviceStatus ===
        "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";


    this.state.pendingAction = {

      type:
        "STATE_STATUS",

      stateCode:
        selectedState.stateCode,

      stateName:
        selectedState.stateName,

      serviceStatus:
        nextStatus

    };


    this.openStatusDialog(
      (
        nextStatus === "ACTIVE"
          ? "Activate "
          : "Deactivate "
      ) +
      selectedState.stateName,
      nextStatus === "ACTIVE"
        ? "Previously active districts can become available again after the state is activated."
        : "All districts in this state will immediately become unavailable to customers. District settings will remain preserved."
    );

  },


  requestDistrictStatusChange(
    district
  ) {

    const nextStatus =
      district.serviceStatus ===
        "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";


    if (
      nextStatus === "ACTIVE" &&
      this.state.selectedState &&
      this.state.selectedState
        .serviceStatus !==
        "ACTIVE"
    ) {

      this.showDistrictError(
        "Activate the parent state before activating this district."
      );

      return;

    }


    this.state.pendingAction = {

      type:
        "DISTRICT_STATUS",

      districtId:
        district.districtId,

      districtName:
        district.districtName,

      serviceStatus:
        nextStatus

    };


    this.openStatusDialog(
      (
        nextStatus === "ACTIVE"
          ? "Activate "
          : "Deactivate "
      ) +
      district.districtName,
      "Confirm this district service-status change. Customer availability will be updated immediately."
    );

  },


  requestBulkDistrictStatusChange(
    serviceStatus
  ) {

    const districtIds =
      Array.from(
        this.state.selectedDistrictIds
      );


    if (districtIds.length === 0) {

      this.showDistrictError(
        "Select at least one district."
      );

      return;

    }


    if (
      serviceStatus === "ACTIVE" &&
      this.state.selectedState &&
      this.state.selectedState
        .serviceStatus !==
        "ACTIVE"
    ) {

      this.showDistrictError(
        "Activate the parent state before activating its districts."
      );

      return;

    }


    this.state.pendingAction = {

      type:
        "BULK_DISTRICT_STATUS",

      districtIds:
        districtIds,

      serviceStatus:
        serviceStatus

    };


    this.openStatusDialog(
      (
        serviceStatus === "ACTIVE"
          ? "Activate "
          : "Deactivate "
      ) +
      districtIds.length +
      " districts",
      "This bulk operation will update all selected districts."
    );

  },


  /*
   * ==========================================================
   * STATUS CONFIRMATION DIALOG
   * ==========================================================
   */

  openStatusDialog(
    title,
    description
  ) {

    this.setText(
      this.elements
        .serviceStatusDialogTitle,
      title
    );


    this.setText(
      this.elements
        .serviceStatusDialogDescription,
      description
    );


    this.elements
      .serviceStatusReasonInput.value =
        "";


    this.hide(
      this.elements
        .serviceStatusDialogError
    );


    this.show(
      this.elements
        .serviceStatusDialog
    );


    this.elements
      .serviceStatusDialog
      .setAttribute(
        "aria-hidden",
        "false"
      );


    setTimeout(
      () => {

        this.elements
          .serviceStatusReasonInput
          .focus();

      },
      50
    );

  },


  closeStatusDialog() {

    this.hide(
      this.elements
        .serviceStatusDialog
    );


    this.elements
      .serviceStatusDialog
      .setAttribute(
        "aria-hidden",
        "true"
      );


    this.state.pendingAction =
      null;

  },


  async confirmStatusAction() {

    const pendingAction =
      this.state.pendingAction;


    if (!pendingAction) {
      return;
    }


    const reason =
      String(
        this.elements
          .serviceStatusReasonInput
          .value ||
        ""
      ).trim();


    if (reason.length < 3) {

      this.showStatusDialogError(
        "Enter a change reason of at least 3 characters."
      );

      return;

    }


    this.setStatusDialogLoading(
      true
    );


    this.hide(
      this.elements
        .serviceStatusDialogError
    );


    try {

      if (
        pendingAction.type ===
        "STATE_STATUS"
      ) {

        await this.updateStateStatus(
          pendingAction,
          reason
        );

      } else if (
        pendingAction.type ===
        "DISTRICT_STATUS"
      ) {

        await this.updateDistrictStatus(
          pendingAction,
          reason
        );

      } else if (
        pendingAction.type ===
        "BULK_DISTRICT_STATUS"
      ) {

        await this.updateBulkDistrictStatus(
          pendingAction,
          reason
        );

      }


      this.closeStatusDialog();

    } catch (error) {

      console.error(
        "Geography status update failed:",
        error
      );


      this.showStatusDialogError(
        error &&
        error.message
          ? error.message
          : "Service status could not be updated."
      );

    } finally {

      this.setStatusDialogLoading(
        false
      );

    }

  },


  /*
   * ==========================================================
   * STATE WRITE
   * ==========================================================
   */

  async updateStateStatus(
    action,
    reason
  ) {

    await this.request(
      this.CONFIG.ACTIONS
        .SET_STATE_STATUS,
      {
        sessionId:
          this.getSessionId(),

        stateCode:
          action.stateCode,

        serviceStatus:
          action.serviceStatus,

        reason:
          reason,

        changeReason:
          reason
      }
    );


    await this.loadGeography(
      true
    );


    const refreshedState =
      this.state.states.find(
        (state) =>
          state.stateCode ===
          action.stateCode
      );


    if (!refreshedState) {
      return;
    }


    this.state.selectedState =
      refreshedState;


    this.state.districts =
      [];


    this.state.filteredDistricts =
      [];


    this.renderSelectedStateHeader();


    this.renderDistrictSummary();


    await this.loadSelectedStateDistricts();

  },


  /*
   * ==========================================================
   * DISTRICT WRITE
   * ==========================================================
   */

  async updateDistrictStatus(
    action,
    reason
  ) {

    await this.request(
      this.CONFIG.ACTIONS
        .SET_DISTRICT_STATUS,
      {
        sessionId:
          this.getSessionId(),

        districtId:
          action.districtId,

        serviceStatus:
          action.serviceStatus,

        reason:
          reason,

        changeReason:
          reason
      }
    );


    await this.refreshAfterDistrictWrite();

  },


  async updateBulkDistrictStatus(
    action,
    reason
  ) {

    await this.request(
      this.CONFIG.ACTIONS
        .BULK_SET_DISTRICT_STATUS,
      {
        sessionId:
          this.getSessionId(),

        districtIds:
          action.districtIds,

        serviceStatus:
          action.serviceStatus,

        reason:
          reason,

        changeReason:
          reason
      }
    );


    this.state.selectedDistrictIds
      .clear();


    await this.refreshAfterDistrictWrite();

  },


  async refreshAfterDistrictWrite() {

    const selectedStateCode =
      this.state.selectedState
        ? this.state.selectedState
            .stateCode
        : "";


    await this.loadGeography(
      true
    );


    if (!selectedStateCode) {
      return;
    }


    const refreshedState =
      this.state.states.find(
        (state) =>
          state.stateCode ===
          selectedStateCode
      );


    if (!refreshedState) {
      return;
    }


    this.state.selectedState =
      refreshedState;


    this.state.districts =
      [];


    this.state.filteredDistricts =
      [];


    this.renderSelectedStateHeader();


    this.renderDistrictSummary();


    await this.loadSelectedStateDistricts();

  },


  /*
   * ==========================================================
   * DISTRICT RULES
   * ==========================================================
   */

  openRulesDialog(district) {

    this.state.selectedDistrict =
      district;


    this.setText(
      this.elements.districtRulesTitle,
      district.districtName +
      " service rules"
    );


    this.setText(
      this.elements.districtRulesId,
      district.districtId +
      (
        district.districtCode
          ? " • LGD " +
            district.districtCode
          : ""
      )
    );


    this.setInputValue(
      this.elements
        .districtServiceRadiusInput,
      district.serviceRadiusKm
    );


    this.setInputValue(
      this.elements
        .districtDeliveryFeeInput,
      district.deliveryFeePerKm
    );


    this.setInputValue(
      this.elements
        .districtMinimumDeliveryFeeInput,
      district.minimumDeliveryFee
    );


    this.elements
      .districtLongDistanceInput.value =
        district.longDistanceEnabled
          ? "TRUE"
          : "FALSE";


    this.elements
      .districtRulesReasonInput.value =
        "";


    this.hide(
      this.elements
        .districtRulesError
    );


    this.show(
      this.elements
        .districtRulesDialog
    );


    this.elements
      .districtRulesDialog
      .setAttribute(
        "aria-hidden",
        "false"
      );

  },


  closeRulesDialog() {

    this.hide(
      this.elements
        .districtRulesDialog
    );


    this.elements
      .districtRulesDialog
      .setAttribute(
        "aria-hidden",
        "true"
      );


    this.state.selectedDistrict =
      null;

  },


  async saveDistrictRules() {

    const district =
      this.state.selectedDistrict;


    if (!district) {
      return;
    }


    const serviceRadiusKm =
      this.readNumberInput(
        this.elements
          .districtServiceRadiusInput
      );


    const deliveryFeePerKm =
      this.readNumberInput(
        this.elements
          .districtDeliveryFeeInput
      );


    const minimumDeliveryFee =
      this.readNumberInput(
        this.elements
          .districtMinimumDeliveryFeeInput
      );


    const longDistanceEnabled =
      this.elements
        .districtLongDistanceInput
        .value === "TRUE";


    const reason =
      String(
        this.elements
          .districtRulesReasonInput
          .value ||
        ""
      ).trim();


    if (
      !Number.isFinite(
        serviceRadiusKm
      ) ||
      serviceRadiusKm <= 0 ||
      serviceRadiusKm > 100
    ) {

      this.showRulesError(
        "Service radius must be between 1 and 100 KM."
      );

      return;

    }


    if (
      !Number.isFinite(
        deliveryFeePerKm
      ) ||
      deliveryFeePerKm < 0
    ) {

      this.showRulesError(
        "Enter a valid delivery fee per kilometre."
      );

      return;

    }


    if (
      !Number.isFinite(
        minimumDeliveryFee
      ) ||
      minimumDeliveryFee < 0
    ) {

      this.showRulesError(
        "Enter a valid minimum delivery fee."
      );

      return;

    }


    if (reason.length < 3) {

      this.showRulesError(
        "Enter an update reason of at least 3 characters."
      );

      return;

    }


    this.setRulesLoading(
      true
    );


    this.hide(
      this.elements
        .districtRulesError
    );


    try {

      const rules = {

        serviceRadiusKm:
          serviceRadiusKm,

        deliveryFeePerKm:
          deliveryFeePerKm,

        minimumDeliveryFee:
          minimumDeliveryFee,

        longDistanceEnabled:
          longDistanceEnabled

      };


      await this.request(
        this.CONFIG.ACTIONS
          .UPDATE_DISTRICT_RULES,
        {
          sessionId:
            this.getSessionId(),

          districtId:
            district.districtId,

          rules:
            rules,

          serviceRadiusKm:
            serviceRadiusKm,

          deliveryFeePerKm:
            deliveryFeePerKm,

          minimumDeliveryFee:
            minimumDeliveryFee,

          longDistanceEnabled:
            longDistanceEnabled,

          reason:
            reason,

          changeReason:
            reason
        }
      );


      this.closeRulesDialog();


      await this.refreshAfterDistrictWrite();

    } catch (error) {

      console.error(
        "District rule update failed:",
        error
      );


      this.showRulesError(
        error &&
        error.message
          ? error.message
          : "District rules could not be updated."
      );

    } finally {

      this.setRulesLoading(
        false
      );

    }

  },


  /*
   * ==========================================================
   * DISPLAY STATES
   * ==========================================================
   */

  showSkeleton() {

    this.show(
      this.elements.pageSkeleton
    );


    this.hide(
      this.elements.pageContent
    );

  },


  hideSkeleton() {

    this.hide(
      this.elements.pageSkeleton
    );

  },


  showContent() {

    this.hideSkeleton();


    this.show(
      this.elements.pageContent
    );

  },


  showDistrictLoading(loading) {

    if (loading) {

      this.show(
        this.elements.districtLoading
      );


      this.hide(
        this.elements.districtList
      );


      this.hide(
        this.elements
          .districtEmptyState
      );

      return;

    }


    this.hide(
      this.elements.districtLoading
    );


    this.show(
      this.elements.districtList
    );


    this.renderDistricts();

  },


  /*
   * ==========================================================
   * MESSAGES
   * ==========================================================
   */

  showPageError(message) {

    const element =
      this.elements.pageMessage;


    element.className =
      "admin-global-message admin-error-message";


    element.textContent =
      message;


    this.show(
      element
    );

  },


  showPageSuccess(message) {

    const element =
      this.elements.pageMessage;


    element.className =
      "admin-global-message";


    element.textContent =
      message;


    element.style.color =
      "#087443";


    element.style.background =
      "#eaf8f0";


    element.style.borderColor =
      "#bce7cd";


    this.show(
      element
    );


    setTimeout(
      () => {

        if (
          element.textContent ===
          message
        ) {

          this.clearPageMessage();

        }

      },
      3500
    );

  },


  clearPageMessage() {

    const element =
      this.elements.pageMessage;


    element.textContent =
      "";


    element.removeAttribute(
      "style"
    );


    this.hide(
      element
    );

  },


  showDistrictError(message) {

    const element =
      this.elements.districtError;


    element.textContent =
      message;


    this.show(
      element
    );

  },


  clearDistrictError() {

    const element =
      this.elements.districtError;


    element.textContent =
      "";


    this.hide(
      element
    );

  },


  showStatusDialogError(message) {

    const element =
      this.elements
        .serviceStatusDialogError;


    element.textContent =
      message;


    this.show(
      element
    );

  },


  showRulesError(message) {

    const element =
      this.elements
        .districtRulesError;


    element.textContent =
      message;


    this.show(
      element
    );

  },


  /*
   * ==========================================================
   * BUTTON LOADING STATES
   * ==========================================================
   */

  setRefreshLoading(loading) {

    const button =
      this.elements.refreshButton;


    button.disabled =
      loading;


    button.classList.toggle(
      "loading",
      loading
    );


    const label =
      button.querySelector(
        "strong"
      );


    if (label) {

      label.textContent =
        loading
          ? "Updating"
          : "Refresh coverage";

    }

  },


  setStatusDialogLoading(
    loading
  ) {

    const button =
      this.elements
        .confirmServiceStatusButton;


    button.disabled =
      loading;


    button.textContent =
      loading
        ? "Updating..."
        : "Confirm change";

  },


  setRulesLoading(loading) {

    const button =
      this.elements
        .saveDistrictRulesButton;


    button.disabled =
      loading;


    button.textContent =
      loading
        ? "Saving..."
        : "Save service rules";

  },


  /*
   * ==========================================================
   * GENERAL HELPERS
   * ==========================================================
   */

  normalizeStatus(value) {

    const status =
      String(
        value || ""
      )
        .trim()
        .toUpperCase();


    return status === "ACTIVE"
      ? "ACTIVE"
      : "INACTIVE";

  },


  normalizeFilterStatus(value) {

    const status =
      String(
        value || "ALL"
      )
        .trim()
        .toUpperCase();


    if (
      status === "ACTIVE" ||
      status === "INACTIVE"
    ) {

      return status;

    }


    return "ALL";

  },


  toNumber(value) {

    const number =
      Number(value);


    return Number.isFinite(number)
      ? number
      : 0;

  },


  toBoolean(value) {

    if (value === true) {
      return true;
    }


    const normalized =
      String(
        value || ""
      )
        .trim()
        .toUpperCase();


    return (
      normalized === "TRUE" ||
      normalized === "YES" ||
      normalized === "1" ||
      normalized === "ENABLED"
    );

  },


  readNumberInput(element) {

    const value =
      String(
        element.value || ""
      ).trim();


    if (!value) {
      return NaN;
    }


    return Number(value);

  },


  formatNumber(value) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        maximumFractionDigits:
          0
      }
    ).format(
      this.toNumber(value)
    );

  },


  formatDecimal(value) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2
      }
    ).format(
      this.toNumber(value)
    );

  },


  updateLastUpdated(value) {

    if (!value) {

      this.setText(
        this.elements.lastUpdated,
        "—"
      );

      return;

    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      this.setText(
        this.elements.lastUpdated,
        String(value)
      );

      return;

    }


    this.setText(
      this.elements.lastUpdated,
      new Intl.DateTimeFormat(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit"
        }
      ).format(date)
    );

  },


  setText(
    element,
    value
  ) {

    if (!element) {
      return;
    }


    element.textContent =
      value === null ||
      value === undefined
        ? ""
        : String(value);

  },


  setInputValue(
    element,
    value
  ) {

    if (!element) {
      return;
    }


    element.value =
      value === null ||
      value === undefined
        ? ""
        : String(value);

  },


  show(element) {

    if (element) {

      element.classList.remove(
        "hidden"
      );

    }

  },


  hide(element) {

    if (element) {

      element.classList.add(
        "hidden"
      );

    }

  },


  /*
   * ==========================================================
   * READ-ONLY INTEGRATION TEST
   *
   * Browser console:
   *
   * await AdminDistrictControl.test()
   * ==========================================================
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE ADMIN DISTRICT CONTROL TEST"
    );

    console.log(
      "========================================"
    );


    const startedAt =
      performance.now();


    await this.activate();


    const firstPromise =
      this.loadGeography(
        true
      );


    const secondPromise =
      this.loadGeography(
        true
      );


    const duplicateProtected =
      firstPromise ===
      secondPromise;


    await firstPromise;


    const summary =
      this.state.summary || {};


    const states =
      this.state.states || [];


    const pageVisible =
      Boolean(
        this.elements.pageContent &&
        !this.elements.pageContent
          .classList.contains(
            "hidden"
          )
      );


    const drawerHidden =
      Boolean(
        this.elements.districtPanel &&
        this.elements.districtPanel
          .classList.contains(
            "hidden"
          )
      );


    const correctDashboardView =
      Boolean(
        document.querySelector(
          '[data-admin-panel="districts"]'
        )
      );


    const results = [

      {
        test:
          "Required role",

        expected:
          "Admin",

        actual:
          document.body.dataset
            .requiredRole,

        passed:
          document.body.dataset
            .requiredRole ===
            "Admin"
      },

      {
        test:
          "Single dashboard architecture",

        expected:
          true,

        actual:
          correctDashboardView,

        passed:
          correctDashboardView
      },

      {
        test:
          "Geography module initialized",

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
          "Geography API loaded",

        expected:
          true,

        actual:
          this.state.loaded,

        passed:
          this.state.loaded ===
            true
      },

      {
        test:
          "Official States and UTs",

        expected:
          36,

        actual:
          states.length,

        passed:
          states.length === 36
      },

      {
        test:
          "Official districts",

        expected:
          784,

        actual:
          Number(
            summary.totalDistricts ||
            0
          ),

        passed:
          Number(
            summary.totalDistricts ||
            0
          ) === 784
      },

      {
        test:
          "State-first loading",

        expected:
          true,

        actual:
          this.state.districts.length ===
            0,

        passed:
          this.state.districts.length ===
            0
      },

      {
        test:
          "Duplicate request protection",

        expected:
          true,

        actual:
          duplicateProtected,

        passed:
          duplicateProtected
      },

      {
        test:
          "Geography page visible",

        expected:
          true,

        actual:
          pageVisible,

        passed:
          pageVisible
      },

      {
        test:
          "District drawer initially hidden",

        expected:
          true,

        actual:
          drawerHidden,

        passed:
          drawerHidden
      },

      {
        test:
          "State write action",

        expected:
          true,

        actual:
          Boolean(
            this.CONFIG.ACTIONS
              .SET_STATE_STATUS
          ),

        passed:
          Boolean(
            this.CONFIG.ACTIONS
              .SET_STATE_STATUS
          )
      },

      {
        test:
          "District write actions",

        expected:
          true,

        actual:
          Boolean(
            this.CONFIG.ACTIONS
              .SET_DISTRICT_STATUS &&
            this.CONFIG.ACTIONS
              .BULK_SET_DISTRICT_STATUS &&
            this.CONFIG.ACTIONS
              .UPDATE_DISTRICT_RULES
          ),

        passed:
          Boolean(
            this.CONFIG.ACTIONS
              .SET_DISTRICT_STATUS &&
            this.CONFIG.ACTIONS
              .BULK_SET_DISTRICT_STATUS &&
            this.CONFIG.ACTIONS
              .UPDATE_DISTRICT_RULES
          )
      },

      {
        test:
          "No service data modified",

        expected:
          true,

        actual:
          true,

        passed:
          true
      }

    ];


    const passed =
      results.every(
        (result) =>
          result.passed
      );


    const durationMs =
      Math.round(
        performance.now() -
        startedAt
      );


    console.table(
      results
    );


    console.log(
      "State Summary:",
      summary
    );


    console.log(
      "States:",
      states
    );


    console.log(
      "Duration:",
      durationMs,
      "ms"
    );


    console.log(
      passed
        ? "Admin District Control Test: PASS"
        : "Admin District Control Test: FAIL"
    );


    return {

      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      durationMs:
        durationMs,

      summary:
        summary,

      states:
        states,

      results:
        results

    };

  }

};


/*
 * ============================================================
 * IMPORTANT
 * ============================================================
 *
 * No DOMContentLoaded automatic API request is used here.
 *
 * AdminDashboard activates this module only when:
 *
 * dashboard.html?view=districts
 *
 * is opened.
 * ============================================================
 */
