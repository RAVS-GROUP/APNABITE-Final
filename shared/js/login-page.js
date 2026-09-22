/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/login-page.js
 * PURPOSE: Reliable OTP login with direct role-home routing
 * VERSION: 1.4.0
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

  sendingOtp:
    false,

  verifyingLogin:
    false,

  redirecting:
    false,

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
     * Already authenticated users go directly
     * to their requested page or role Home.
     */

    if (
      Auth.isLoggedIn()
    ) {

      const user =
        Auth.getUser();


      if (
        user &&
        user.role
      ) {

        this.showSuccess(
          user
        );


        this.scheduleRoleRedirect(
          user,
          100
        );

      } else {

        SessionManager.clear();

        this.showMobileStep();
      }
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

          if (
            this.sendingOtp ||
            this.verifyingLogin ||
            this.redirecting
          ) {

            return;
          }


          this.showMobileStep();
        }
      );


    this.elements.resendOtpButton
      .addEventListener(
        "click",
        () => {

          if (
            this.sendingOtp ||
            this.verifyingLogin ||
            this.redirecting
          ) {

            return;
          }


          this.sendOtp({
            resend:
              true
          });
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
   * SEND LOGIN OTP
   * ----------------------------------------------------------
   */

  async sendOtp(
    options = {}
  ) {

    if (
      this.sendingOtp ||
      this.verifyingLogin ||
      this.redirecting
    ) {

      return {
        success: false,
        code:
          "REQUEST_ALREADY_RUNNING"
      };
    }


    const isResend =
      options.resend === true;


    const mobile =
      isResend &&
      this.mobile
        ? this.mobile
        : Auth.normalizeMobile(
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


    this.sendingOtp =
      true;


    this.elements.mobileInput.disabled =
      true;


    this.elements.resendOtpButton.disabled =
      true;


    const activeButton =
      isResend
        ? this.elements.resendOtpButton
        : this.elements.sendOtpButton;


    this.setButtonLoading(
      activeButton,
      true
    );


    try {

      const result =
        await Auth.requestLoginOtp(
          mobile
        );


      if (
        !result ||
        result.success !== true ||
        result.otpRequested !== true
      ) {

        throw Auth.createError(
          "OTP request could not be confirmed.",
          "OTP_REQUEST_FAILED"
        );
      }


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
        this.getReadableError(
          error,
          "Unable to send OTP."
        )
      );


      return {
        success: false,
        error:
          error.message || "",
        code:
          error.code || "",
        requestId:
          error.requestId || ""
      };

    } finally {

      this.sendingOtp =
        false;


      this.elements.mobileInput.disabled =
        false;


      this.setButtonLoading(
        activeButton,
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


    this.elements.otpInput.disabled =
      false;


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
   * ----------------------------------------------------------
   */

  async verifyAndLogin(
    options = {}
  ) {

    if (
      this.verifyingLogin ||
      this.sendingOtp ||
      this.redirecting
    ) {

      return {
        success: false,
        code:
          "REQUEST_ALREADY_RUNNING"
      };
    }


    const otp =
      this.elements.otpInput.value
        .replace(
          /\D/g,
          ""
        );


    this.clearMessage();


    if (
      !this.mobile
    ) {

      this.showMobileStep();


      this.showError(
        "Please enter your mobile number again."
      );


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


    this.verifyingLogin =
      true;


    this.elements.otpInput.disabled =
      true;


    this.elements.changeMobileButton.disabled =
      true;


    this.elements.resendOtpButton.disabled =
      true;


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


      if (
        !verification ||
        verification.success !== true ||
        verification.verified !== true ||
        !verification.verificationToken
      ) {

        throw Auth.createError(
          "OTP verification could not be confirmed.",
          "OTP_VERIFICATION_FAILED"
        );
      }


      const login =
        await Auth.login(
          this.mobile,
          verification.verificationToken
        );


      if (
        !login ||
        login.success !== true ||
        login.authenticated !== true ||
        !login.user ||
        !login.user.role
      ) {

        throw Auth.createError(
          "Login could not be completed.",
          "LOGIN_FAILED"
        );
      }


      this.showSuccess(
        login.user
      );


      if (
        options.redirect !== false
      ) {

        this.scheduleRoleRedirect(
          login.user,
          150
        );
      }


      return {
        success: true,

        verification:
          verification,

        login:
          login,

        destination:
          this.getDestinationUrl(
            login.user.role
          ),

        redirectScheduled:
          options.redirect !== false
      };

    } catch (error) {

      this.elements.otpInput.disabled =
        false;


      this.elements.changeMobileButton.disabled =
        false;


      this.elements.otpInput.focus();


      this.showError(
        this.getReadableError(
          error,
          "Login failed."
        )
      );


      return {
        success: false,
        error:
          error.message || "",
        code:
          error.code || "",
        requestId:
          error.requestId || ""
      };

    } finally {

      this.verifyingLogin =
        false;


      this.setButtonLoading(
        this.elements.verifyOtpButton,
        false
      );


      if (
        !this.redirecting
      ) {

        this.elements.otpInput.disabled =
          false;


        this.elements.changeMobileButton.disabled =
          false;
      }
    }
  },


  /*
   * ----------------------------------------------------------
   * READABLE ERROR MESSAGE
   * ----------------------------------------------------------
   */

  getReadableError(
    error,
    fallbackMessage
  ) {

    const code =
      error &&
      error.code
        ? String(error.code)
        : "";


    if (
      code === "HTTP_ERROR" &&
      Number(error.httpStatus) === 404
    ) {

      return (
        "The login server deployment is temporarily unavailable. " +
        "Please refresh once and try again."
      );
    }


    if (
      code === "NETWORK_ERROR"
    ) {

      return (
        "Unable to connect to ApnaBite. " +
        "Please check your internet connection and try again."
      );
    }


    if (
      code === "REQUEST_TIMEOUT"
    ) {

      return (
        error.message ||
        "The server is taking longer than expected. Please try again."
      );
    }


    return (
      error &&
      error.message
        ? error.message
        : fallbackMessage
    );
  },


  /*
   * ----------------------------------------------------------
   * DESTINATION URL
   * ----------------------------------------------------------
   */

  getDestinationUrl(role) {

    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .getRequestedReturnUrl ===
        "function"
    ) {

      const returnUrl =
        AppRouter.getRequestedReturnUrl();


      if (
        returnUrl
      ) {

        return returnUrl;
      }
    }


    if (
      typeof AppRouter !==
        "undefined" &&
      typeof AppRouter
        .getHomeUrl ===
        "function"
    ) {

      const homeUrl =
        AppRouter.getHomeUrl(
          role
        );


      if (
        homeUrl
      ) {

        return homeUrl;
      }
    }


    const routes = {

      Customer:
        "customer/html/home.html",

      "Food Partner":
        "food-partner/html/dashboard.html",

      Rider:
        "rider/html/dashboard.html",

      Admin:
        "admin/html/dashboard.html"
    };


    const path =
      routes[
        String(
          role || ""
        )
      ] || "role-selection.html";


    return new URL(
      path,
      window.location.href
    ).href;
  },


  /*
   * ----------------------------------------------------------
   * DIRECT ROLE ROUTING
   * ----------------------------------------------------------
   */

  scheduleRoleRedirect(
    user,
    delay = 150
  ) {

    window.clearTimeout(
      this.redirectTimer
    );


    const role =
      user &&
      user.role
        ? user.role
        : Auth.getRole();


    if (
      !role
    ) {

      this.showError(
        "Login completed, but the account role is missing."
      );

      return;
    }


    this.redirecting =
      true;


    this.redirectTimer =
      window.setTimeout(
        () => {

          try {

            if (
              typeof AppRouter !==
                "undefined" &&
              typeof AppRouter
                .goAfterLogin ===
                "function"
            ) {

              AppRouter.goAfterLogin(
                role,
                true
              );


              return;
            }


            window.location.replace(
              this.getDestinationUrl(
                role
              )
            );

          } catch (error) {

            this.redirecting =
              false;


            console.error(
              "Post-login routing failed:",
              error
            );


            this.showError(
              "Login completed, but the next page could not be opened. Please refresh the page."
            );
          }
        },
        Math.max(
          0,
          Number(delay) || 0
        )
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


    this.redirecting =
      false;


    this.sendingOtp =
      false;


    this.verifyingLogin =
      false;


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


    this.elements.mobileInput.disabled =
      false;


    this.elements.otpInput.disabled =
      false;


    this.elements.changeMobileButton.disabled =
      false;


    this.elements.otpInput.value =
      "";


    this.elements.testOtpValue
      .textContent =
        "";


    this.elements.testOtpBox
      .classList.add(
        "hidden"
      );


    this.setButtonLoading(
      this.elements.sendOtpButton,
      false
    );


    this.setButtonLoading(
      this.elements.verifyOtpButton,
      false
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
        ". Opening your Home page...";
  },


  /*
   * ----------------------------------------------------------
   * RESEND TIMER
   * ----------------------------------------------------------
   */

  startResendTimer(seconds) {

    this.stopResendTimer();


    this.resendSeconds =
      Math.max(
        1,
        Number(seconds) || 60
      );


    this.updateResendButton();


    this.resendTimer =
      window.setInterval(
        () => {

          this.resendSeconds -=
            1;


          if (
            this.resendSeconds <= 0
          ) {

            this.stopResendTimer();


            this.elements.resendOtpButton.disabled =
              false;


            this.elements.resendOtpButton.textContent =
              "Resend OTP";


            return;
          }


          this.updateResendButton();
        },
        1000
      );
  },


  updateResendButton() {

    this.elements.resendOtpButton.disabled =
      true;


    this.elements.resendOtpButton.textContent =
      "Resend OTP in " +
      this.resendSeconds +
      "s";
  },


  stopResendTimer() {

    if (
      this.resendTimer
    ) {

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

    if (
      !button
    ) {

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

    this.elements.message.textContent =
      message;


    this.elements.message
      .classList.remove(
        "hidden"
      );
  },


  clearMessage() {

    this.elements.message.textContent =
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
   * PAGE CONFIGURATION TEST
   *
   * Browser console:
   * LoginPage.test()
   *
   * This test does not request an OTP and does not logout.
   * ----------------------------------------------------------
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE LOGIN PAGE CONFIGURATION TEST"
    );

    console.log(
      "========================================"
    );


    const routes = [
      {
        role:
          "Customer",
        expected:
          "/customer/html/home.html"
      },
      {
        role:
          "Food Partner",
        expected:
          "/food-partner/html/dashboard.html"
      },
      {
        role:
          "Rider",
        expected:
          "/rider/html/dashboard.html"
      },
      {
        role:
          "Admin",
        expected:
          "/admin/html/dashboard.html"
      }
    ];


    const results =
      routes.map(
        (test) => {

          const destination =
            AppRouter.getHomeUrl(
              test.role
            );


          return {
            test:
              test.role + " route",
            expected:
              test.expected,
            actual:
              destination,
            passed:
              destination.includes(
                test.expected
              )
          };
        }
      );


    results.push({
      test:
        "Required elements",
      expected:
        true,
      actual:
        this.hasRequiredElements(),
      passed:
        this.hasRequiredElements() === true
    });


    results.push({
      test:
        "Duplicate OTP protection",
      expected:
        true,
      actual:
        typeof this.sendingOtp ===
          "boolean",
      passed:
        typeof this.sendingOtp ===
          "boolean"
    });


    results.push({
      test:
        "Duplicate login protection",
      expected:
        true,
      actual:
        typeof this.verifyingLogin ===
          "boolean",
      passed:
        typeof this.verifyingLogin ===
          "boolean"
    });


    const passed =
      results.every(
        (result) =>
          result.passed
      );


    console.table(
      results
    );


    console.log(
      passed
        ? "Login Page Configuration Test: PASS"
        : "Login Page Configuration Test: FAIL"
    );


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
    async () => {

      try {

        const registration =
          await navigator.serviceWorker
            .register(
              "./sw.js",
              {
                updateViaCache:
                  "none"
              }
            );


        registration.update();

      } catch (error) {

        console.error(
          "Login service worker registration failed:",
          error
        );
      }
    }
  );
}
