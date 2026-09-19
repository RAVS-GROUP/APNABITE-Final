/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/register-page.js
 * PURPOSE: Secure OTP registration and splash handoff
 * VERSION: 1.1.0
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

      goToLoginButton:
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
      this.elements.goToLoginButton &&
      this.elements.maskedMobile &&
      this.elements.testOtpBox &&
      this.elements.testOtpValue &&
      this.elements.successMessage &&
      this.elements.message
    );
  },


  /*
   * ----------------------------------------------------------
   * BIND EVENTS
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


    /*
     * Success screen button also passes through
     * the common splash before opening Login.
     */

    this.elements.goToLoginButton
      .addEventListener(
        "click",
        () => {

          window.clearTimeout(
            this.redirectTimer
          );


          this.openRegistrationSplash();
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
   * VALIDATE DATA
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
   * VERIFY AND REGISTER
   *
   * options.redirect:
   * true  = normal flow through common splash
   * false = integration test without navigation
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
        !registration.user
      ) {

        const registrationError =
          new Error(
            "Registration could not be completed."
          );


        registrationError.code =
          "REGISTRATION_FAILED";


        throw registrationError;
      }


      this.showSuccess(
        registration.user
      );


      /*
       * New registration is not logged in automatically.
       * Show common splash, then open Login with selected role.
       */

      if (
        options.redirect !== false
      ) {

        this.scheduleSplashRedirect(
          650
        );
      }


      return {
        success: true,

        verification:
          verification,

        registration:
          registration,

        splashUrl:
          this.getRegistrationSplashUrl(),

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
   * REGISTRATION SPLASH URL
   * ----------------------------------------------------------
   */

  getRegistrationSplashUrl() {

    let url;


    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .getPublicUrl ===
        "function"
    ) {

      url =
        new URL(
          AppRouter.getPublicUrl(
            "index.html"
          )
        );

    } else {

      url =
        new URL(
          "index.html",
          window.location.href
        );
    }


    url.searchParams.set(
      "source",
      "register"
    );


    url.searchParams.set(
      "next",
      "login"
    );


    const role =
      this.registrationData &&
      this.registrationData.role
        ? this.registrationData.role
        : "";


    if (role) {

      url.searchParams.set(
        "role",
        role
      );
    }


    return url.href;
  },


  /*
   * ----------------------------------------------------------
   * SCHEDULE SPLASH
   * ----------------------------------------------------------
   */

  scheduleSplashRedirect(
    delay = 650
  ) {

    window.clearTimeout(
      this.redirectTimer
    );


    this.redirectTimer =
      window.setTimeout(
        () => {

          this.openRegistrationSplash();
        },
        delay
      );
  },


  /*
   * ----------------------------------------------------------
   * OPEN COMMON SPLASH
   * ----------------------------------------------------------
   */

  openRegistrationSplash() {

    try {

      window.location.replace(
        this.getRegistrationSplashUrl()
      );

    } catch (error) {

      console.error(
        "Registration splash routing failed:",
        error
      );


      this.showError(
        "Account created, but the Login page could not be opened."
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * REGISTRATION STEP
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
   * SUCCESS STEP
   * ----------------------------------------------------------
   */

  showSuccess(user) {

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


    this.elements.successMessage
      .textContent =
        (
          user &&
          user.role
            ? user.role
            : "User"
        ) +
        " account verified successfully.";
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
      "APNABITE REGISTRATION AND SPLASH TEST"
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


      const splashUrl =
        this.getRegistrationSplashUrl();


      const splashConnected =
        splashUrl.includes(
          "/index.html"
        ) &&
        splashUrl.includes(
          "source=register"
        ) &&
        splashUrl.includes(
          "next=login"
        ) &&
        splashUrl.includes(
          "role=Customer"
        );


      const passed =
        registrationResult.success ===
          true &&
        splashConnected === true &&
        this.elements.successStep
          .classList.contains(
            "hidden"
          ) === false;


      const results = [

        {
          test:
            "Registration completed",

          expected:
            true,

          actual:
            registrationResult.success,

          passed:
            registrationResult.success ===
              true
        },

        {
          test:
            "Success screen",

          expected:
            true,

          actual:
            !this.elements.successStep
              .classList.contains(
                "hidden"
              ),

          passed:
            !this.elements.successStep
              .classList.contains(
                "hidden"
              )
        },

        {
          test:
            "Common splash connected",

          expected:
            true,

          actual:
            splashConnected,

          passed:
            splashConnected
        },

        {
          test:
            "Next destination",

          expected:
            "Login",

          actual:
            splashUrl.includes(
              "next=login"
            )
              ? "Login"
              : "Unknown",

          passed:
            splashUrl.includes(
              "next=login"
            )
        }
      ];


      console.table(
        results
      );


      console.log(
        passed
          ? "Registration and Splash Test: PASS"
          : "Registration and Splash Test: FAIL"
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

        splashUrl:
          splashUrl,

        result:
          registrationResult,

        results:
          results
      };

    } catch (error) {

      console.error(
        "Registration and Splash Test: FAIL",
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
