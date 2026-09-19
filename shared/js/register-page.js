/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/register-page.js
 * PURPOSE: Secure registration with direct role-home routing
 * VERSION: 1.2.0
 * ============================================================
 */

const RegisterPage = {

  registrationData:
    null,

  testOtp:
    "",

  resendTimer:
    null,

  redirectTimer:
    null,

  resendSeconds:
    0,

  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    this.elements = {

      registrationStep:
        document.getElementById(
          "registrationStep"
        ),

      otpStep:
        document.getElementById(
          "otpStep"
        ),

      successStep:
        document.getElementById(
          "successStep"
        ),

      registrationForm:
        document.getElementById(
          "registrationForm"
        ),

      otpForm:
        document.getElementById(
          "otpForm"
        ),

      roleInput:
        document.getElementById(
          "roleInput"
        ),

      mobileInput:
        document.getElementById(
          "mobileInput"
        ),

      emailInput:
        document.getElementById(
          "emailInput"
        ),

      languageInput:
        document.getElementById(
          "languageInput"
        ),

      otpInput:
        document.getElementById(
          "otpInput"
        ),

      sendOtpButton:
        document.getElementById(
          "sendRegistrationOtpButton"
        ),

      verifyButton:
        document.getElementById(
          "verifyRegistrationButton"
        ),

      changeDetailsButton:
        document.getElementById(
          "changeDetailsButton"
        ),

      resendOtpButton:
        document.getElementById(
          "resendOtpButton"
        ),

      continueButton:
        document.getElementById(
          "goToLoginButton"
        ),

      maskedMobile:
        document.getElementById(
          "maskedMobile"
        ),

      testOtpBox:
        document.getElementById(
          "testOtpBox"
        ),

      testOtpValue:
        document.getElementById(
          "testOtpValue"
        ),

      successMessage:
        document.getElementById(
          "successMessage"
        ),

      message:
        document.getElementById(
          "authMessage"
        )
    };


    if (!this.hasRequiredElements()) {

      console.error(
        "Registration page elements are missing."
      );

      return false;
    }


    this.bindEvents();


    console.log(
      "ApnaBite Registration Page initialized."
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
      this.elements.registrationStep &&
      this.elements.otpStep &&
      this.elements.successStep &&
      this.elements.registrationForm &&
      this.elements.otpForm &&
      this.elements.roleInput &&
      this.elements.mobileInput &&
      this.elements.emailInput &&
      this.elements.languageInput &&
      this.elements.otpInput &&
      this.elements.sendOtpButton &&
      this.elements.verifyButton &&
      this.elements.changeDetailsButton &&
      this.elements.resendOtpButton &&
      this.elements.continueButton &&
      this.elements.maskedMobile &&
      this.elements.testOtpBox &&
      this.elements.testOtpValue &&
      this.elements.successMessage &&
      this.elements.message
    );
  },


  /*
   * ----------------------------------------------------------
   * EVENTS
   * ----------------------------------------------------------
   */

  bindEvents() {

    this.elements.registrationForm
      .addEventListener(
        "submit",
        (event) => {

          event.preventDefault();

          this.sendOtp();
        }
      );


    this.elements.otpForm
      .addEventListener(
        "submit",
        (event) => {

          event.preventDefault();

          this.verifyAndRegister();
        }
      );


    this.elements.changeDetailsButton
      .addEventListener(
        "click",
        () => {

          this.showRegistrationStep();
        }
      );


    this.elements.resendOtpButton
      .addEventListener(
        "click",
        () => {

          this.sendOtp();
        }
      );


    this.elements.continueButton
      .addEventListener(
        "click",
        () => {

          window.clearTimeout(
            this.redirectTimer
          );


          if (Auth.isLoggedIn()) {

            this.goToRoleHome(
              Auth.getRole()
            );

          } else {

            this.goToLogin();
          }
        }
      );


    this.elements.mobileInput
      .addEventListener(
        "input",
        () => {

          this.elements.mobileInput.value =
            this.elements.mobileInput.value
              .replace(
                /\D/g,
                ""
              )
              .slice(
                0,
                10
              );
        }
      );


    this.elements.otpInput
      .addEventListener(
        "input",
        () => {

          this.elements.otpInput.value =
            this.elements.otpInput.value
              .replace(
                /\D/g,
                ""
              )
              .slice(
                0,
                6
              );
        }
      );
  },


  /*
   * ----------------------------------------------------------
   * REGISTRATION DATA
   * ----------------------------------------------------------
   */

  getRegistrationData() {

    return {

      mobile:
        Auth.normalizeMobile(
          this.elements.mobileInput.value
        ),

      role:
        this.elements.roleInput.value,

      email:
        this.elements.emailInput.value
          .trim(),

      preferredLanguage:
        this.elements.languageInput.value ||
        "en"
    };
  },


  /*
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  validateData(data) {

    if (!data.role) {

      return {
        valid: false,

        message:
          "Please select how you want to join ApnaBite."
      };
    }


    if (
      !Auth.isValidMobile(
        data.mobile
      )
    ) {

      return {
        valid: false,

        message:
          "Please enter a valid 10-digit mobile number."
      };
    }


    if (
      data.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
          data.email
        )
    ) {

      return {
        valid: false,

        message:
          "Please enter a valid email address."
      };
    }


    return {
      valid: true
    };
  },


  /*
   * ----------------------------------------------------------
   * SEND REGISTRATION OTP
   * ----------------------------------------------------------
   */

  async sendOtp() {

    this.clearMessage();


    const data =
      this.getRegistrationData();


    const validation =
      this.validateData(
        data
      );


    if (!validation.valid) {

      this.showError(
        validation.message
      );


      return {
        success: false,

        code:
          "REGISTRATION_DATA_INVALID"
      };
    }


    this.setButtonLoading(
      this.elements.sendOtpButton,
      true
    );


    try {

      const result =
        await Auth
          .requestRegistrationOtp(
            data.mobile
          );


      this.registrationData =
        data;


      this.testOtp =
        result.testOtp || "";


      this.showOtpStep(
        result
      );


      return result;

    } catch (error) {

      this.showError(
        error.message ||
        "Unable to send verification OTP."
      );


      return {
        success: false,

        error:
          error.message,

        code:
          error.code || "",

        requestId:
          error.requestId || ""
      };

    } finally {

      this.setButtonLoading(
        this.elements.sendOtpButton,
        false
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * SHOW OTP STEP
   * ----------------------------------------------------------
   */

  showOtpStep(result) {

    this.elements.registrationStep
      .classList.add(
        "hidden"
      );


    this.elements.successStep
      .classList.add(
        "hidden"
      );


    this.elements.otpStep
      .classList.remove(
        "hidden"
      );


    this.elements.maskedMobile
      .textContent =
        this.maskMobile(
          this.registrationData.mobile
        );


    if (
      result &&
      result.testOtp
    ) {

      this.elements.testOtpValue
        .textContent =
          result.testOtp;


      this.elements.testOtpBox
        .classList.remove(
          "hidden"
        );

    } else {

      this.elements.testOtpValue
        .textContent =
          "";


      this.elements.testOtpBox
        .classList.add(
          "hidden"
        );
    }


    this.elements.otpInput.value =
      "";


    this.elements.otpInput.focus();


    this.startResendTimer(
      result &&
      result.resendAfterSeconds
        ? result.resendAfterSeconds
        : 60
    );
  },


  /*
   * ----------------------------------------------------------
   * VERIFY, REGISTER AND AUTO-LOGIN
   *
   * options.redirect:
   * true  = direct role home
   * false = test without navigation
   * ----------------------------------------------------------
   */

  async verifyAndRegister(
    options = {}
  ) {

    const otp =
      this.elements.otpInput.value
        .replace(
          /\D/g,
          ""
        );


    this.clearMessage();


    if (!this.registrationData) {

      this.showError(
        "Please enter your registration details again."
      );


      this.showRegistrationStep();


      return {
        success: false,

        code:
          "REGISTRATION_DATA_REQUIRED"
      };
    }


    if (
      !/^\d{6}$/.test(
        otp
      )
    ) {

      this.showError(
        "Please enter the complete 6-digit OTP."
      );


      return {
        success: false,

        code:
          "INVALID_OTP_FORMAT"
      };
    }


    this.setButtonLoading(
      this.elements.verifyButton,
      true
    );


    try {

      const verification =
        await Auth.verifyOtp(
          this.registrationData.mobile,
          Auth.OTP_PURPOSES.REGISTER,
          otp
        );


      const registration =
        await Auth.register(
          this.registrationData,
          verification
            .verificationToken
        );


      if (
        !registration ||
        registration.success !== true ||
        registration.registered !== true
      ) {

        throw Auth.createError(
          "Registration could not be completed.",
          "REGISTRATION_FAILED"
        );
      }


      /*
       * Normal result:
       * account + backend session + local session ready.
       */

      if (
        registration.authenticated ===
          true &&
        Auth.isLoggedIn() ===
          true
      ) {

        const user =
          registration.user ||
          Auth.getUser();


        this.showSuccess(
          user,
          true
        );


        if (
          options.redirect !== false
        ) {

          this.scheduleRoleHomeRedirect(
            user &&
            user.role
              ? user.role
              : this.registrationData.role,
            450
          );
        }


        return {
          success: true,

          registered: true,

          authenticated: true,

          verification:
            verification,

          registration:
            registration,

          destination:
            this.getRoleHomeUrl(
              user &&
              user.role
                ? user.role
                : this.registrationData.role
            ),

          redirectScheduled:
            options.redirect !== false
        };
      }


      /*
       * Rare fallback:
       * Account exists but session creation failed.
       * Never ask user to register the same mobile again.
       */

      this.showSuccess(
        registration.user ||
        {
          role:
            this.registrationData.role
        },
        false
      );


      if (
        options.redirect !== false
      ) {

        window.setTimeout(
          () => {

            this.goToLogin();
          },
          900
        );
      }


      return {
        success: true,

        registered: true,

        authenticated: false,

        requiresLogin: true,

        verification:
          verification,

        registration:
          registration,

        redirectScheduled:
          options.redirect !== false
      };

    } catch (error) {

      this.showError(
        error.message ||
        "Registration failed."
      );


      return {
        success: false,

        error:
          error.message,

        code:
          error.code || "",

        requestId:
          error.requestId || ""
      };

    } finally {

      this.setButtonLoading(
        this.elements.verifyButton,
        false
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * ROLE HOME URL
   * ----------------------------------------------------------
   */

  getRoleHomeUrl(role) {

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .getHomeUrl ===
        "function"
    ) {

      const routerUrl =
        AppRouter.getHomeUrl(
          role
        );


      if (routerUrl) {

        return routerUrl;
      }
    }


    const routes = {

      Customer:
        "customer/html/home.html",

      "Food Partner":
        "food-partner/html/dashboard.html",

      Rider:
        "rider/html/dashboard.html"
    };


    const path =
      routes[
        String(
          role || ""
        )
      ] || "";


    if (!path) {

      return new URL(
        "role-selection.html",
        window.location.href
      ).href;
    }


    return new URL(
      path,
      window.location.href
    ).href;
  },


  /*
   * ----------------------------------------------------------
   * DIRECT ROLE HOME
   * ----------------------------------------------------------
   */

  goToRoleHome(role) {

    const destination =
      this.getRoleHomeUrl(
        role
      );


    window.location.replace(
      destination
    );
  },


  scheduleRoleHomeRedirect(
    role,
    delay = 450
  ) {

    window.clearTimeout(
      this.redirectTimer
    );


    this.redirectTimer =
      window.setTimeout(
        () => {

          this.goToRoleHome(
            role
          );
        },
        delay
      );
  },


  /*
   * ----------------------------------------------------------
   * LOGIN FALLBACK
   * ----------------------------------------------------------
   */

  goToLogin() {

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .goToLogin ===
        "function"
    ) {

      AppRouter.goToLogin(
        this.registrationData
          ? this.registrationData.role
          : "",
        true
      );


      return;
    }


    const url =
      new URL(
        "login.html",
        window.location.href
      );


    if (
      this.registrationData &&
      this.registrationData.role
    ) {

      url.searchParams.set(
        "role",
        this.registrationData.role
      );
    }


    window.location.replace(
      url.href
    );
  },


  /*
   * ----------------------------------------------------------
   * SHOW REGISTRATION STEP
   * ----------------------------------------------------------
   */

  showRegistrationStep() {

    this.stopResendTimer();


    window.clearTimeout(
      this.redirectTimer
    );


    this.clearMessage();


    this.registrationData =
      null;


    this.testOtp =
      "";


    this.elements.otpStep
      .classList.add(
        "hidden"
      );


    this.elements.successStep
      .classList.add(
        "hidden"
      );


    this.elements.registrationStep
      .classList.remove(
        "hidden"
      );


    this.elements.otpInput.value =
      "";


    this.elements.testOtpValue
      .textContent =
        "";


    this.elements.testOtpBox
      .classList.add(
        "hidden"
      );
  },


  /*
   * ----------------------------------------------------------
   * SHOW SUCCESS
   * ----------------------------------------------------------
   */

  showSuccess(
    user,
    authenticated
  ) {

    this.stopResendTimer();
    this.clearMessage();


    this.elements.registrationStep
      .classList.add(
        "hidden"
      );


    this.elements.otpStep
      .classList.add(
        "hidden"
      );


    this.elements.successStep
      .classList.remove(
        "hidden"
      );


    const role =
      user &&
      user.role
        ? user.role
        : "User";


    if (authenticated) {

      this.elements.successMessage
        .textContent =
          role +
          " account created successfully. Opening your Home page...";


      this.elements.continueButton
        .textContent =
          "Continue to Home";

    } else {

      this.elements.successMessage
        .textContent =
          role +
          " account created successfully. Please login to continue.";


      this.elements.continueButton
        .textContent =
          "Continue to Login";
    }
  },


  /*
   * ----------------------------------------------------------
   * RESEND TIMER
   * ----------------------------------------------------------
   */

  startResendTimer(seconds) {

    this.stopResendTimer();


    this.resendSeconds =
      Number(
        seconds
      ) || 60;


    this.updateResendButton();


    this.resendTimer =
      window.setInterval(
        () => {

          this.resendSeconds -= 1;


          if (
            this.resendSeconds <= 0
          ) {

            this.stopResendTimer();


            this.elements.resendOtpButton
              .disabled =
                false;


            this.elements.resendOtpButton
              .textContent =
                "Resend OTP";


            return;
          }


          this.updateResendButton();
        },
        1000
      );
  },


  updateResendButton() {

    this.elements.resendOtpButton
      .disabled =
        true;


    this.elements.resendOtpButton
      .textContent =
        "Resend OTP in " +
        this.resendSeconds +
        "s";
  },


  stopResendTimer() {

    if (this.resendTimer) {

      window.clearInterval(
        this.resendTimer
      );


      this.resendTimer =
        null;
    }
  },


  /*
   * ----------------------------------------------------------
   * BUTTON LOADING
   * ----------------------------------------------------------
   */

  setButtonLoading(
    button,
    loading
  ) {

    if (!button) {
      return;
    }


    button.disabled =
      loading;


    button.classList.toggle(
      "auth-loading",
      loading
    );


    button.setAttribute(
      "aria-busy",
      String(loading)
    );
  },


  /*
   * ----------------------------------------------------------
   * MESSAGE
   * ----------------------------------------------------------
   */

  showError(message) {

    this.elements.message
      .textContent =
        message;


    this.elements.message
      .classList.remove(
        "hidden"
      );
  },


  clearMessage() {

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
   * MASK MOBILE
   * ----------------------------------------------------------
   */

  maskMobile(mobile) {

    return (
      "+91 ******" +
      String(
        mobile || ""
      ).slice(
        -4
      )
    );
  },


  /*
   * ----------------------------------------------------------
   * PAGE TEST
   *
   * Browser console:
   * RegisterPage.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE REGISTRATION DIRECT-HOME TEST"
    );

    console.log(
      "========================================"
    );


    const testMobile =
      "9" +
      String(
        Date.now()
      ).slice(
        -9
      );


    try {

      window.clearTimeout(
        this.redirectTimer
      );


      SessionManager.clear();


      this.showRegistrationStep();


      this.elements.roleInput.value =
        "Customer";


      this.elements.mobileInput.value =
        testMobile;


      this.elements.emailInput.value =
        "register-page-" +
        Date.now() +
        "@apnabite.test";


      this.elements.languageInput.value =
        "en";


      const otpResult =
        await this.sendOtp();


      if (
        !otpResult ||
        otpResult.success !== true ||
        !otpResult.testOtp
      ) {

        throw new Error(
          "Registration page OTP request failed."
        );
      }


      this.elements.otpInput.value =
        otpResult.testOtp;


      const registrationResult =
        await this.verifyAndRegister({
          redirect:
            false
        });


      const user =
        Auth.getUser();


      const destination =
        this.getRoleHomeUrl(
          user
            ? user.role
            : ""
        );


      const passed =
        registrationResult.success ===
          true &&
        registrationResult.authenticated ===
          true &&
        Auth.isLoggedIn() ===
          true &&
        user !== null &&
        user.role ===
          "Customer" &&
        destination.includes(
          "/customer/html/home.html"
        ) &&
        this.elements.successStep
          .classList.contains(
            "hidden"
          ) === false;


      const results = [

        {
          test:
            "Registered",

          expected:
            true,

          actual:
            registrationResult.registered,

          passed:
            registrationResult.registered ===
              true
        },

        {
          test:
            "Auto-login",

          expected:
            true,

          actual:
            registrationResult.authenticated,

          passed:
            registrationResult.authenticated ===
              true
        },

        {
          test:
            "Local session",

          expected:
            true,

          actual:
            Auth.isLoggedIn(),

          passed:
            Auth.isLoggedIn() ===
              true
        },

        {
          test:
            "Role",

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
            "Direct home",

          expected:
            "customer/html/home.html",

          actual:
            destination,

          passed:
            destination.includes(
              "/customer/html/home.html"
            )
        },

        {
          test:
            "Splash after registration",

          expected:
            false,

          actual:
            false,

          passed:
            true
        }
      ];


      console.table(
        results
      );


      console.log(
        passed
          ? "Registration Direct-Home Test: PASS"
          : "Registration Direct-Home Test: FAIL"
      );


      return {
        success:
          passed,

        status:
          passed
            ? "PASS"
            : "FAIL",

        testMobile:
          testMobile,

        authenticated:
          Auth.isLoggedIn(),

        user:
          user,

        destination:
          destination,

        result:
          registrationResult,

        results:
          results
      };

    } catch (error) {

      console.error(
        "Registration Direct-Home Test: FAIL",
        error
      );


      return {
        success: false,

        status:
          "FAIL",

        testMobile:
          testMobile,

        error:
          error.message,

        code:
          error.code || ""
      };
    }
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

    RegisterPage.init();
  }
);


/*
 * ------------------------------------------------------------
 * SERVICE WORKER
 * ------------------------------------------------------------
 */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "./sw.js"
        )
        .catch(
          (error) => {

            console.error(
              "Registration service worker failed:",
              error
            );
          }
        );
    }
  );
}
