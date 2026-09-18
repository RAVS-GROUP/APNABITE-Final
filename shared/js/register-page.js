/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/register-page.js
 * PURPOSE: Secure OTP registration page controller
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
          "registrationOtpStep"
        ),

      successStep:
        document.getElementById(
          "registrationSuccessStep"
        ),

      registrationForm:
        document.getElementById(
          "registrationForm"
        ),

      otpForm:
        document.getElementById(
          "registrationOtpForm"
        ),

      mobile:
        document.getElementById(
          "registrationMobile"
        ),

      role:
        document.getElementById(
          "registrationRole"
        ),

      email:
        document.getElementById(
          "registrationEmail"
        ),

      language:
        document.getElementById(
          "registrationLanguage"
        ),

      otp:
        document.getElementById(
          "registrationOtp"
        ),

      requestButton:
        document.getElementById(
          "requestRegistrationOtpButton"
        ),

      verifyButton:
        document.getElementById(
          "verifyRegistrationOtpButton"
        ),

      editButton:
        document.getElementById(
          "editRegistrationButton"
        ),

      resendButton:
        document.getElementById(
          "resendRegistrationOtpButton"
        ),

      maskedMobile:
        document.getElementById(
          "registrationMaskedMobile"
        ),

      testOtpBox:
        document.getElementById(
          "registrationTestOtpBox"
        ),

      testOtpValue:
        document.getElementById(
          "registrationTestOtpValue"
        ),

      successMessage:
        document.getElementById(
          "registrationSuccessMessage"
        ),

      message:
        document.getElementById(
          "registrationMessage"
        ),

      loginButton:
        document.getElementById(
          "goToLoginButton"
        )
    };


    this.elements.registrationForm
      .addEventListener(
        "submit",
        (event) => {

          event.preventDefault();
          this.requestOtp();
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


    this.elements.editButton
      .addEventListener(
        "click",
        () => {

          this.showRegistrationStep();
        }
      );


    this.elements.resendButton
      .addEventListener(
        "click",
        () => {

          this.requestOtp();
        }
      );


    this.elements.loginButton
      .addEventListener(
        "click",
        () => {

          window.location.href =
            "login.html";
        }
      );


    this.elements.mobile
      .addEventListener(
        "input",
        () => {

          this.elements.mobile.value =
            this.elements.mobile.value
              .replace(/\D/g, "")
              .slice(0, 10);
        }
      );


    this.elements.otp
      .addEventListener(
        "input",
        () => {

          this.elements.otp.value =
            this.elements.otp.value
              .replace(/\D/g, "")
              .slice(0, 6);
        }
      );


    console.log(
      "ApnaBite Registration Page initialized."
    );
  },


  getFormData() {

    return {
      mobile:
        Auth.normalizeMobile(
          this.elements.mobile.value
        ),

      role:
        this.elements.role.value,

      email:
        this.elements.email.value
          .trim(),

      preferredLanguage:
        this.elements.language.value ||
        "en"
    };
  },


  validateForm(data) {

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


    if (!data.role) {

      return {
        valid: false,
        message:
          "Please select your role."
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


  async requestOtp() {

    const data =
      this.getFormData();


    const validation =
      this.validateForm(
        data
      );


    this.clearMessage();


    if (!validation.valid) {

      this.showError(
        validation.message
      );

      return {
        success: false
      };
    }


    this.setButtonLoading(
      this.elements.requestButton,
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
        "Unable to send registration OTP."
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
        this.elements.requestButton,
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


    this.elements.otp.value =
      "";

    this.elements.otp.focus();


    this.startResendTimer(
      result.resendAfterSeconds ||
      60
    );
  },


  async verifyAndRegister() {

    const otp =
      this.elements.otp.value
        .replace(/\D/g, "");


    this.clearMessage();


    if (
      !this.registrationData
    ) {

      this.showError(
        "Registration details are missing."
      );

      return;
    }


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
        "Verified " +
        user.role +
        " account created successfully.";
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

            this.elements.resendButton
              .disabled =
                false;

            this.elements.resendButton
              .textContent =
                "Resend OTP";
          }
        },
        1000
      );
  },


  updateResendButton() {

    this.elements.resendButton
      .disabled =
        true;

    this.elements.resendButton
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
      "auth
