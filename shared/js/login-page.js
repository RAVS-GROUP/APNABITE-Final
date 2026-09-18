/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/login-page.js
 * PURPOSE: Secure OTP login page controller
 * VERSION: 1.0.0
 * ============================================================
 */

const LoginPage = {

  mobile:
    "",

  testOtp:
    "",

  resendTimer:
    null,

  resendSeconds:
    0,

  elements: {},


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
              .replace(/\D/g, "")
              .slice(0, 10);
        }
      );


    this.elements.otpInput
      .addEventListener(
        "input",
        () => {

          this.elements.otpInput.value =
            this.elements.otpInput.value
              .replace(/\D/g, "")
              .slice(0, 6);
        }
      );


    if (Auth.isLoggedIn()) {

      this.showSuccess(
        Auth.getUser()
      );
    }


    console.log(
      "ApnaBite Login Page initialized."
    );
  },


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

      return;
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
          error.code || ""
      };

    } finally {

      this.setButtonLoading(
        this.elements.sendOtpButton,
        false
      );
    }
  },


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


    if (result.testOtp) {

      this.elements.testOtpValue
        .textContent =
          result.testOtp;

      this.elements.testOtpBox
        .classList.remove(
          "hidden"
        );

    } else {

      this.elements.testOtpBox
        .classList.add(
          "hidden"
        );
    }


    this.elements.otpInput.value =
      "";

    this.elements.otpInput.focus();


    this.startResendTimer(
      result.resendAfterSeconds ||
      60
    );
  },


  async verifyAndLogin() {

    const otp =
      this.elements.otpInput.value
        .replace(/\D/g, "");


    this.clearMessage();


    if (
      !/^\d{6}$/.test(
        otp
      )
    ) {

      this.showError(
        "Please enter the complete 6-digit OTP."
      );

      return;
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


      this.showSuccess(
        login.user
      );


      return {
        success: true,
        verification:
          verification,
        login:
          login
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
          error.code || ""
      };

    } finally {

      this.setButtonLoading(
        this.elements.verifyOtpButton,
        false
      );
    }
  },


  showMobileStep() {

    this.stopResendTimer();
    this.clearMessage();


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

    this.elements.mobileInput.focus();
  },


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
      user && user.role
        ? user.role
        : "User";


    this.elements.successMessage
      .textContent =
        "Secure login completed for " +
        role +
        ".";
  },


  startResendTimer(seconds) {

    this.stopResendTimer();


    this.resendSeconds =
      Number(seconds) || 60;


    this.updateResendButton();


    this.resendTimer =
      setInterval(
        () => {

          this.resendSeconds -= 1;

          this.updateResendButton();


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
          }
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

      clearInterval(
        this.resendTimer
      );

      this.resendTimer =
        null;
    }
  },


  setButtonLoading(
    button,
    loading
  ) {

    button.disabled =
      loading;

    button.classList.toggle(
      "auth-loading",
      loading
    );
  },


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


  maskMobile(mobile) {

    return (
      "+91 ******" +
      String(mobile)
        .slice(-4)
    );
  },


  /*
   * ----------------------------------------------------------
   * PAGE INTEGRATION TEST
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
      "APNABITE LOGIN PAGE TEST"
    );

    console.log(
      "========================================"
    );


    try {

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
        !otpResult.success ||
        !otpResult.testOtp
      ) {

        throw new Error(
          "Login page OTP request failed."
        );
      }


      this.elements.otpInput.value =
        otpResult.testOtp;


      const loginResult =
        await this.verifyAndLogin();


      const passed =
        loginResult.success === true &&
        Auth.isLoggedIn() === true &&
        this.elements.successStep
          .classList.contains(
            "hidden"
          ) === false;


      console.log(
        passed
          ? "Login Page Test: PASS"
          : "Login Page Test: FAIL"
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
          Auth.getUser()
      };

    } catch (error) {

      console.error(
        "Login Page Test: FAIL",
        error
      );


      return {
        success: false,
        status: "FAIL",
        error:
          error.message,
        code:
          error.code || ""
      };
    }
  }

};


document.addEventListener(
  "DOMContentLoaded",
  () => {

    LoginPage.init();
  }
);


if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js");
    }
  );
}
