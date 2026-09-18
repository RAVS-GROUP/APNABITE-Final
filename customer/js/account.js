/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: customer/js/account.js
 * PURPOSE: Customer account page controller
 * VERSION: 1.0.0
 * ============================================================
 */

const CustomerAccount = {

  /*
   * ----------------------------------------------------------
   * DOM ELEMENTS
   * ----------------------------------------------------------
   */

  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    this.elements = {

      page:
        document.getElementById(
          "customerAccountPage"
        ),

      settingsButton:
        document.getElementById(
          "accountSettingsButton"
        ),

      profileButton:
        document.getElementById(
          "profileDetailsButton"
        ),

      addressesLink:
        document.getElementById(
          "savedAddressesLink"
        ),

      savedLocationLabel:
        document.getElementById(
          "savedLocationLabel"
        ),

      languageButton:
        document.getElementById(
          "languageButton"
        ),

      preferredLanguageLabel:
        document.getElementById(
          "preferredLanguageLabel"
        ),

      favouritesButton:
        document.getElementById(
          "favouritesButton"
        ),

      paymentsButton:
        document.getElementById(
          "paymentsButton"
        ),

      helpButton:
        document.getElementById(
          "helpSupportButton"
        ),

      privacyButton:
        document.getElementById(
          "privacyButton"
        ),

      aboutButton:
        document.getElementById(
          "aboutButton"
        ),

      message:
        document.getElementById(
          "roleHomeMessage"
        ),

      bottomNavigation:
        document.querySelector(
          ".customer-bottom-nav"
        )
    };


    if (!this.hasRequiredElements()) {

      console.warn(
        "Customer Account page elements were not found."
      );

      return false;
    }


    this.loadAccountPreferences();
    this.loadSavedLocation();
    this.bindEvents();


    console.log(
      "ApnaBite Customer Account initialized."
    );


    return true;
  },


  /*
   * ----------------------------------------------------------
   * CHECK REQUIRED ELEMENTS
   * ----------------------------------------------------------
   */

  hasRequiredElements() {

    return Boolean(
      this.elements.page &&
      this.elements.settingsButton &&
      this.elements.profileButton &&
      this.elements.savedLocationLabel &&
      this.elements.languageButton &&
      this.elements.preferredLanguageLabel &&
      this.elements.favouritesButton &&
      this.elements.paymentsButton &&
      this.elements.helpButton &&
      this.elements.privacyButton &&
      this.elements.aboutButton &&
      this.elements.message &&
      this.elements.bottomNavigation
    );
  },


  /*
   * ----------------------------------------------------------
   * BIND EVENTS
   * ----------------------------------------------------------
   */

  bindEvents() {

    this.elements.settingsButton
      .addEventListener(
        "click",
        () => {

          this.showNotice(
            "Account settings will be available in the profile details section."
          );
        }
      );


    this.elements.profileButton
      .addEventListener(
        "click",
        () => {

          this.showNotice(
            "Profile editing will be connected with the customer profile service."
          );
        }
      );


    this.elements.languageButton
      .addEventListener(
        "click",
        () => {

          this.toggleLanguage();
        }
      );


    this.elements.favouritesButton
      .addEventListener(
        "click",
        () => {

          this.showNotice(
            "Favourite kitchens will appear after kitchen discovery is connected."
          );
        }
      );


    this.elements.paymentsButton
      .addEventListener(
        "click",
        () => {

          this.showNotice(
            "Payment and refund history will appear after the Orders and Payments services are connected."
          );
        }
      );


    this.elements.helpButton
      .addEventListener(
        "click",
        () => {

          this.showNotice(
            "Customer support options will be connected in the support module."
          );
        }
      );


    this.elements.privacyButton
      .addEventListener(
        "click",
        () => {

          this.showNotice(
            "Your session and account information are securely managed by ApnaBite."
          );
        }
      );


    this.elements.aboutButton
      .addEventListener(
        "click",
        () => {

          this.showNotice(
            "ApnaBite — Apna Swaad, Apni Pasand."
          );
        }
      );
  },


  /*
   * ----------------------------------------------------------
   * LOAD ACCOUNT PREFERENCES
   * ----------------------------------------------------------
   */

  loadAccountPreferences() {

    const user =
      Auth.getUser();


    const language =
      user &&
      user.preferredLanguage
        ? user.preferredLanguage
        : "en";


    this.updateLanguageLabel(
      language
    );


    return {
      success: true,
      user:
        user,
      preferredLanguage:
        language
    };
  },


  /*
   * ----------------------------------------------------------
   * LOAD SAVED LOCATION
   * ----------------------------------------------------------
   */

  loadSavedLocation() {

    const manualLocation =
      ServiceLocation.getSaved();


    if (manualLocation) {

      const label =
        manualLocation.districtName +
        ", " +
        manualLocation.state;


      this.elements.savedLocationLabel
        .textContent =
          label;


      return {
        success: true,
        source:
          "MANUAL",
        label:
          label,
        location:
          manualLocation
      };
    }


    const deviceLocation =
      LocationManager.getSaved();


    if (
      deviceLocation &&
      LocationManager.isFresh(
        deviceLocation
      )
    ) {

      this.elements.savedLocationLabel
        .textContent =
          "Current device location";


      return {
        success: true,
        source:
          "DEVICE",
        label:
          "Current device location",
        location:
          deviceLocation
      };
    }


    this.elements.savedLocationLabel
      .textContent =
        "Add or manage your delivery locations";


    return {
      success: false,
      source:
        "NONE",
      label:
        "No saved location"
    };
  },


  /*
   * ----------------------------------------------------------
   * TOGGLE LANGUAGE
   *
   * This currently stores the local UI preference.
   * Backend profile update will be connected later.
   * ----------------------------------------------------------
   */

  toggleLanguage() {

    const current =
      AppStorage.get(
        "apnabite_customer_language"
      ) ||
      (
        Auth.getUser() &&
        Auth.getUser()
          .preferredLanguage
      ) ||
      "en";


    const next =
      current === "hi"
        ? "en"
        : "hi";


    AppStorage.set(
      "apnabite_customer_language",
      next
    );


    this.updateLanguageLabel(
      next
    );


    this.showNotice(
      next === "hi"
        ? "Preferred language changed to हिन्दी."
        : "Preferred language changed to English."
    );


    return {
      success: true,
      language:
        next
    };
  },


  /*
   * ----------------------------------------------------------
   * UPDATE LANGUAGE LABEL
   * ----------------------------------------------------------
   */

  updateLanguageLabel(language) {

    const savedLanguage =
      AppStorage.get(
        "apnabite_customer_language"
      );


    const selectedLanguage =
      savedLanguage ||
      language ||
      "en";


    this.elements.preferredLanguageLabel
      .textContent =
        selectedLanguage === "hi"
          ? "हिन्दी"
          : "English";
  },


  /*
   * ----------------------------------------------------------
   * SHOW PAGE NOTICE
   * ----------------------------------------------------------
   */

  showNotice(message) {

    this.elements.message
      .textContent =
        message;


    this.elements.message
      .classList.remove(
        "hidden"
      );


    this.elements.message
      .scrollIntoView({
        behavior:
          "smooth",
        block:
          "nearest"
      });


    window.clearTimeout(
      this.noticeTimer
    );


    this.noticeTimer =
      window.setTimeout(
        () => {

          this.clearNotice();
        },
        5000
      );
  },


  /*
   * ----------------------------------------------------------
   * CLEAR PAGE NOTICE
   * ----------------------------------------------------------
   */

  clearNotice() {

    this.elements.message
      .textContent =
        "";


    this.elements.message
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * ACCOUNT PAGE TEST
   *
   * Browser console:
   * CustomerAccount.test()
   * ----------------------------------------------------------
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE CUSTOMER ACCOUNT TEST"
    );

    console.log(
      "========================================"
    );


    try {

      const requiredRole =
        document.body.dataset
          .requiredRole;


      const user =
        Auth.getUser();


      const location =
        this.loadSavedLocation();


      const initialLanguage =
        AppStorage.get(
          "apnabite_customer_language"
        ) ||
        (
          user &&
          user.preferredLanguage
        ) ||
        "en";


      const languageLabel =
        this.elements
          .preferredLanguageLabel
          .textContent;


      const navigationItems =
        this.elements.bottomNavigation
          .querySelectorAll(
            ".customer-nav-item"
          )
          .length;


      const accountActive =
        Boolean(
          this.elements
            .bottomNavigation
            .querySelector(
              '.customer-nav-item[href="account.html"].is-active'
            )
        );


      const roleGuardReady =
        requiredRole ===
          "Customer";


      const passed =
        roleGuardReady &&
        user !== null &&
        user.role ===
          "Customer" &&
        Boolean(languageLabel) &&
        navigationItems === 4 &&
        accountActive === true;


      const results = [

        {
          test:
            "Required role",
          expected:
            "Customer",
          actual:
            requiredRole,
          passed:
            roleGuardReady
        },

        {
          test:
            "Session role",
          expected:
            "Customer",
          actual:
            user
              ? user.role
              : "",
          passed:
            Boolean(
              user &&
              user.role ===
                "Customer"
            )
        },

        {
          test:
            "Bottom navigation",
          expected:
            4,
          actual:
            navigationItems,
          passed:
            navigationItems === 4
        },

        {
          test:
            "Account navigation active",
          expected:
            true,
          actual:
            accountActive,
          passed:
            accountActive === true
        },

        {
          test:
            "Language label",
          expected:
            initialLanguage === "hi"
              ? "हिन्दी"
              : "English",
          actual:
            languageLabel,
          passed:
            Boolean(
              languageLabel
            )
        }
      ];


      console.table(
        results
      );


      console.log(
        "Account User:",
        user
      );


      console.log(
        "Saved Location:",
        location
      );


      console.log(
        passed
          ? "Customer Account Test: PASS"
          : "Customer Account Test: FAIL"
      );


      return {
        success:
          passed,
        status:
          passed
            ? "PASS"
            : "FAIL",
        user:
          user,
        location:
          location,
        language:
          initialLanguage,
        bottomNavigationItems:
          navigationItems,
        results:
          results
      };

    } catch (error) {

      console.error(
        "Customer Account Test: FAIL",
        error
      );


      return {
        success: false,
        status: "FAIL",
        error:
          error.message
      };
    }
  }

};


/*
 * ------------------------------------------------------------
 * INITIALIZE AFTER DOM IS READY
 * ------------------------------------------------------------
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    CustomerAccount.init();
  }
);
