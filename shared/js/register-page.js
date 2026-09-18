/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/register-page.js
 * PURPOSE: Secure OTP registration page
 * VERSION: 1.0.0
 * ============================================================
 */

const RegisterPage = {

  registrationData:
    null,

  testOtp:
    "",

  resendTimer:
    null,

  resendSeconds:
    0,

  elements: {},


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


    this.elements.goToLoginButton
      .addEventListener(
        "click",
        () => {

          window.location.href =
            "login.html";
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


    console.log(
      "ApnaBite Registration Page initialized."
    );
  },


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
        .test(data.email)
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
        success: false
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


  async verifyAndRegister() {

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


      this.showSuccess(
        registration.user
      );


      return {
        success: true,
        verification:
          verification,
        registration:
          registration
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
          error.code || ""
      };

    } finally {

      this.setButtonLoading(
        this.elements.verifyButton,
        false
      );
    }
  },


  showRegistrationStep() {

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

    this.elements.registrationStep
      .classList.remove(
        "hidden"
      );
  },


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
          user.role ||
          "User"
        ) +
        " account verified successfully.";
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
   * RegisterPage.test()
   * ----------------------------------------------------------
   */

  async test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE REGISTRATION PAGE TEST"
    );

    console.log(
      "========================================"
    );


    const testMobile =
      "9" +
      String(
        Date.now()
      ).slice(-9);


    try {

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
        !otpResult.success ||
        !otpResult.testOtp
      ) {

        throw new Error(
          "Registration page OTP request failed."
        );
      }


      this.elements.otpInput.value =
        otpResult.testOtp;


      const registrationResult =
        await this.verifyAndRegister();


      const passed =
        registrationResult.success ===
          true &&
        this.elements.successStep
          .classList.contains(
            "hidden"
          ) === false;


      console.log(
        passed
          ? "Registration Page Test: PASS"
          : "Registration Page Test: FAIL"
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
        result:
          registrationResult
      };

    } catch (error) {

      console.error(
        "Registration Page Test: FAIL",
        error
      );


      return {
        success: false,
        status: "FAIL",
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


document.addEventListener(
  "DOMContentLoaded",
  () => {

    RegisterPage.init();
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
