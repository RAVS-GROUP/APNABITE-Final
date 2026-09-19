/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/login-page.js
 * PURPOSE: Secure OTP login and common splash routing
 * VERSION: 1.2.0
 * ============================================================
 */

const LoginPage = {

  mobile:
    "",

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

      mobileStep:
        document.getElementById(
          "mobileStep"
        ),

      otpStep:
        document.getElementById(
          "otpStep"
        ),

      successStep:
        document.getElementById(
          "successStep"
        ),

      mobileForm:
        document.getElementById(
          "mobileForm"
        ),

      otpForm:
        document.getElementById(
          "otpForm"
        ),

      mobileInput:
        document.getElementById(
          "mobileInput"
        ),

      otpInput:
        document.getElementById(
          "otpInput"
        ),

      sendOtpButton:
        document.getElementById(
          "sendOtpButton"
        ),

      verifyOtpButton:
        document.getElementById(
          "verifyOtpButton"
        ),

      changeMobileButton:
        document.getElementById(
          "changeMobileButton"
        ),

      resendOtpButton:
        document.getElementById(
          "resendOtpButton"
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

      message:
        document.getElementById(
          "authMessage"
        ),

      successMessage:
        document.getElementById(
          "successMessage"
        )
    };


    if (!this.hasRequiredElements()) {

      console.error(
        "Login page elements are missing."
      );

      return false;
    }


    this.bindEvents();


    /*
     * Already logged-in user accidentally opens login page:
     * send through the same common splash.
     */

    if (Auth.isLoggedIn()) {

      const user =
        Auth.getUser();


      this.showSuccess(
        user
      );


      this.scheduleSplashRedirect(
        100
      );
    }


    console.log(
      "ApnaBite Login Page initialized."
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
      this.elements.mobileStep &&
      this.elements.otpStep &&
      this.elements.successStep &&
      this.elements.mobileForm &&
      this.elements.otpForm &&
      this.elements.mobileInput &&
      this.elements.otpInput &&
      this.elements.sendOtpButton &&
      this.elements.verifyOtpButton &&
      this.elements.changeMobileButton &&
      this.elements.resendOtpButton &&
      this.elements.maskedMobile &&
      this.elements.testOtpBox &&
      this.elements.testOtpValue &&
      this.elements.message &&
      this.elements.successMessage
    );
  },


  /*
   * ----------------------------------------------------------
   * EVENTS
   * ----------------------------------------------------------
   */

  bindEvents() {

    this.elements.mobileForm
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

          this.verifyAndLogin();
        }
      );


    this.elements.changeMobileButton
      .addEventListener(
        "click",
        () => {

          this.showMobileStep();
        }
      );


    this.elements.resendOtpButton
      .addEventListener(
        "click",
        () => {

          this.sendOtp();
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
   * SEND OTP
   * ----------------------------------------------------------
   */

  async sendOtp() {

    const mobile =
      Auth.normalizeMobile(
        this.elements.mobileInput.value
      );


    this.clearMessage();


    if (
      !Auth.isValidMobile(
        mobile
      )
    ) {

      this.showError(
        "Please enter a valid 10-digit mobile number."
      );


      return {
        success: false,
        code:
          "INVALID_MOBILE"
      };
    }


    this.setButtonLoading(
      this.elements.sendOtpButton,
      true
    );


    try {

      const result =
        await Auth.requestLoginOtp(
          mobile
        );


      this.mobile =
        mobile;


      this.testOtp =
        result.testOtp || "";


      this.showOtpStep(
        result
      );


      return result;

    } catch (error) {

      this.showError(
        error.message ||
        "Unable to send OTP."
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

    this.elements.mobileStep
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
          this.mobile
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
   * VERIFY OTP AND LOGIN
   *
   * options.redirect:
   * true  = normal user flow
   * false = console test without leaving page
   * ----------------------------------------------------------
   */

  async verifyAndLogin(
    options = {}
  ) {

    const otp =
      this.elements.otpInput.value
        .replace(
          /\D/g,
          ""
        );


    this.clearMessage();


    if (!this.mobile) {

      this.showError(
        "Please enter your mobile number again."
      );


      this.showMobileStep();


      return {
        success: false,
        code:
          "MOBILE_REQUIRED"
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
      this.elements.verifyOtpButton,
      true
    );


    try {

      const verification =
        await Auth.verifyOtp(
          this.mobile,
          Auth.OTP_PURPOSES.LOGIN,
          otp
        );


      const login =
        await Auth.login(
          this.mobile,
          verification
            .verificationToken
        );


      if (
        !login ||
        login.success !== true ||
        login.authenticated !== true ||
        !login.user
      ) {

        const loginError =
          new Error(
            "Login could not be completed."
          );


        loginError.code =
          "LOGIN_FAILED";


        throw loginError;
      }


      this.showSuccess(
        login.user
      );


      /*
       * Every successful login passes through index.html.
       * index.html displays the common splash and launch.js
       * routes the stored session to the correct role home.
       */

      if (
        options.redirect !== false
      ) {

        this.scheduleSplashRedirect(
          150
        );
      }


      return {
        success: true,

        verification:
          verification,

        login:
          login,

        splashUrl:
          this.getSplashUrl(),

        redirectScheduled:
          options.redirect !== false
      };

    } catch (error) {

      this.showError(
        error.message ||
        "Login failed."
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
        this.elements.verifyOtpButton,
        false
      );
    }
  },


  /*
   * ----------------------------------------------------------
   * COMMON SPLASH URL
   * ----------------------------------------------------------
   */

  getSplashUrl() {

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .getPublicUrl ===
        "function"
    ) {

      const url =
        new URL(
          AppRouter.getPublicUrl(
            "index.html"
          )
        );


      url.searchParams.set(
        "source",
        "login"
      );


      return url.href;
    }


    return new URL(
      "index.html?source=login",
      window.location.href
    ).href;
  },


  /*
   * ----------------------------------------------------------
   * ROUTE THROUGH COMMON SPLASH
   * ----------------------------------------------------------
   */

  scheduleSplashRedirect(
    delay = 150
  ) {

    window.clearTimeout(
      this.redirectTimer
    );


    this.redirectTimer =
      window.setTimeout(
        () => {

          try {

            window.location.replace(
              this.getSplashUrl()
            );

          } catch (error) {

            console.error(
              "Post-login splash routing failed:",
              error
            );


            this.showError(
              "Login completed, but the next page could not be opened."
            );
          }
        },
        delay
      );
  },


  /*
   * ----------------------------------------------------------
   * SHOW MOBILE STEP
   * ----------------------------------------------------------
   */

  showMobileStep() {

    this.stopResendTimer();


    window.clearTimeout(
      this.redirectTimer
    );


    this.clearMessage();


    this.mobile =
      "";


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


    this.elements.mobileStep
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


    this.elements.mobileInput.focus();
  },


  /*
   * ----------------------------------------------------------
   * SHOW SUCCESS
   * ----------------------------------------------------------
   */

  showSuccess(user) {

    this.stopResendTimer();
    this.clearMessage();


    this.elements.mobileStep
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


    this.elements.successMessage
      .textContent =
        "Secure login completed for " +
        role +
        ".";
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
   * LoginPage.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE LOGIN AND SPLASH TEST"
    );

    console.log(
      "========================================"
    );


    try {

      window.clearTimeout(
        this.redirectTimer
      );


      if (Auth.isLoggedIn()) {

        await Auth.logout();
      }


      this.showMobileStep();


      this.elements.mobileInput.value =
        "9876543210";


      const otpResult =
        await this.sendOtp();


      if (
        !otpResult ||
        otpResult.success !== true ||
        !otpResult.testOtp
      ) {

        throw new Error(
          "Login page OTP request failed."
        );
      }


      this.elements.otpInput.value =
        otpResult.testOtp;


      const loginResult =
        await this.verifyAndLogin({
          redirect:
            false
        });


      const user =
        Auth.getUser();


      const homePath =
        user
          ? AppRouter.getHomePath(
              user.role
            )
          : "";


      const splashUrl =
        this.getSplashUrl();


      const expectedHome =
        "customer/html/home.html";


      const splashConnected =
        splashUrl.includes(
          "/index.html"
        ) &&
        splashUrl.includes(
          "source=login"
        );


      const passed =
        loginResult.success === true &&
        Auth.isLoggedIn() === true &&
        user !== null &&
        user.role === "Customer" &&
        homePath === expectedHome &&
        splashConnected === true &&
        this.elements.successStep
          .classList.contains(
            "hidden"
          ) === false;


      const results = [

        {
          test:
            "Authenticated",

          expected:
            true,

          actual:
            Auth.isLoggedIn(),

          passed:
            Auth.isLoggedIn() === true
        },

        {
          test:
            "User role",

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
            "Role home path",

          expected:
            expectedHome,

          actual:
            homePath,

          passed:
            homePath ===
              expectedHome
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
        }
      ];


      console.table(
        results
      );


      console.log(
        passed
          ? "Login and Splash Test: PASS"
          : "Login and Splash Test: FAIL"
      );


      return {
        success:
          passed,

        status:
          passed
            ? "PASS"
            : "FAIL",

        authenticated:
          Auth.isLoggedIn(),

        user:
          user,

        homePath:
          homePath,

        splashUrl:
          splashUrl,

        results:
          results
      };

    } catch (error) {

      console.error(
        "Login and Splash Test: FAIL",
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

    LoginPage.init();
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
              "Login service worker registration failed:",
              error
            );
          }
        );
    }
  );
}
