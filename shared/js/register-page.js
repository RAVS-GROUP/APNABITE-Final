/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/register-page.js
 * PURPOSE: Secure OTP registration and direct role routing
 * VERSION: 1.3.0
 * ============================================================
 */

const RegisterPage = {
  registrationData: null,
  resendTimer: null,
  redirectTimer: null,
  resendSeconds: 0,
  elements: {},

  init() {
    const ids = {
      registrationStep: "registrationStep", otpStep: "otpStep", successStep: "successStep",
      registrationForm: "registrationForm", otpForm: "otpForm", roleInput: "roleInput",
      mobileInput: "mobileInput", emailInput: "emailInput", consentInput: "registrationConsentInput",
      otpInput: "otpInput", sendOtpButton: "sendRegistrationOtpButton",
      verifyButton: "verifyRegistrationButton", changeDetailsButton: "changeDetailsButton",
      resendOtpButton: "resendOtpButton", continueButton: "goToLoginButton",
      maskedMobile: "maskedMobile", testOtpBox: "testOtpBox", testOtpValue: "testOtpValue",
      successMessage: "successMessage", message: "authMessage"
    };

    Object.keys(ids).forEach((key) => {
      this.elements[key] = document.getElementById(ids[key]);
    });

    if (!Object.values(this.elements).every(Boolean)) {
      console.error("Registration page elements are missing.");
      return false;
    }

    this.bindEvents();
    this.applyRoleFromUrl();
    console.log("ApnaBite Registration Page initialized.");
    return true;
  },

  bindEvents() {
    this.elements.registrationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.sendOtp();
    });
    this.elements.otpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.verifyAndRegister();
    });
    this.elements.changeDetailsButton.addEventListener("click", () => this.showRegistrationStep());
    this.elements.resendOtpButton.addEventListener("click", () => this.sendOtp());
    this.elements.continueButton.addEventListener("click", () => {
      window.clearTimeout(this.redirectTimer);
      Auth.isLoggedIn() ? this.goToRoleHome(Auth.getRole()) : this.goToLogin();
    });
    this.elements.mobileInput.addEventListener("input", () => {
      this.elements.mobileInput.value = this.elements.mobileInput.value.replace(/\D/g, "").slice(0, 10);
    });
    this.elements.otpInput.addEventListener("input", () => {
      this.elements.otpInput.value = this.elements.otpInput.value.replace(/\D/g, "").slice(0, 6);
    });
  },

  applyRoleFromUrl() {
    const role = new URL(window.location.href).searchParams.get("role");
    if (["Customer", "Food Partner", "Rider"].includes(role)) {
      this.elements.roleInput.value = role;
    }
  },

  getRegistrationData() {
    return {
      mobile: Auth.normalizeMobile(this.elements.mobileInput.value),
      role: this.elements.roleInput.value,
      email: this.elements.emailInput.value.trim(),
      preferredLanguage: "en",
      consentAccepted: this.elements.consentInput.checked === true,
      consentLanguage: "en-hi",
      consentVersion: "REGISTRATION_CONSENT_V1"
    };
  },

  validateData(data) {
    if (!data.role) return { valid: false, message: "Please select how you want to join ApnaBite." };
    if (!Auth.isValidMobile(data.mobile)) return { valid: false, message: "Please enter a valid 10-digit mobile number." };
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { valid: false, message: "Please enter a valid email address." };
    if (!data.consentAccepted) return { valid: false, message: "Please accept the registration consent to continue." };
    return { valid: true };
  },

  async sendOtp() {
    this.clearMessage();
    const data = this.getRegistrationData();
    const validation = this.validateData(data);
    if (!validation.valid) {
      this.showError(validation.message);
      return { success: false, code: "REGISTRATION_DATA_INVALID" };
    }

    this.setButtonLoading(this.elements.sendOtpButton, true);
    try {
      const result = await Auth.requestRegistrationOtp(data.mobile);
      this.registrationData = data;
      this.showOtpStep(result);
      return result;
    } catch (error) {
      this.showError(error.message || "Unable to send verification OTP.");
      return { success: false, error: error.message, code: error.code || "", requestId: error.requestId || "" };
    } finally {
      this.setButtonLoading(this.elements.sendOtpButton, false);
    }
  },

  showOtpStep(result) {
    this.elements.registrationStep.classList.add("hidden");
    this.elements.successStep.classList.add("hidden");
    this.elements.otpStep.classList.remove("hidden");
    this.elements.maskedMobile.textContent = this.maskMobile(this.registrationData.mobile);
    const testOtp = result && result.testOtp ? result.testOtp : "";
    this.elements.testOtpValue.textContent = testOtp;
    this.elements.testOtpBox.classList.toggle("hidden", !testOtp);
    this.elements.otpInput.value = "";
    this.elements.otpInput.focus();
    this.startResendTimer(result && result.resendAfterSeconds ? result.resendAfterSeconds : 60);
  },

  async verifyAndRegister(options = {}) {
    const otp = this.elements.otpInput.value.replace(/\D/g, "");
    this.clearMessage();
    if (!this.registrationData) {
      this.showError("Please enter your registration details again.");
      this.showRegistrationStep();
      return { success: false, code: "REGISTRATION_DATA_REQUIRED" };
    }
    if (!/^\d{6}$/.test(otp)) {
      this.showError("Please enter the complete 6-digit OTP.");
      return { success: false, code: "INVALID_OTP_FORMAT" };
    }

    this.setButtonLoading(this.elements.verifyButton, true);
    try {
      const verification = await Auth.verifyOtp(this.registrationData.mobile, Auth.OTP_PURPOSES.REGISTER, otp);
      const registration = await Auth.register(this.registrationData, verification.verificationToken);
      if (!registration || registration.success !== true || registration.registered !== true) {
        throw Auth.createError("Registration could not be completed.", "REGISTRATION_FAILED");
      }

      if (registration.authenticated === true && Auth.isLoggedIn() === true) {
        const user = registration.user || Auth.getUser();
        const role = user && user.role ? user.role : this.registrationData.role;
        this.showSuccess(user, true);
        if (options.redirect !== false) this.scheduleRoleHomeRedirect(role, 450);
        return { success: true, registered: true, authenticated: true, verification, registration, destination: this.getRoleHomeUrl(role), redirectScheduled: options.redirect !== false };
      }

      this.showSuccess(registration.user || { role: this.registrationData.role }, false);
      if (options.redirect !== false) window.setTimeout(() => this.goToLogin(), 900);
      return { success: true, registered: true, authenticated: false, requiresLogin: true, verification, registration, redirectScheduled: options.redirect !== false };
    } catch (error) {
      this.showError(error.message || "Registration failed.");
      return { success: false, error: error.message, code: error.code || "", requestId: error.requestId || "" };
    } finally {
      this.setButtonLoading(this.elements.verifyButton, false);
    }
  },

  getRoleHomeUrl(role) {
    const routerUrl = typeof AppRouter !== "undefined" && typeof AppRouter.getHomeUrl === "function" ? AppRouter.getHomeUrl(role) : "";
    if (routerUrl) return routerUrl;
    const routes = { Customer: "customer/html/home.html", "Food Partner": "food-partner/html/dashboard.html", Rider: "rider/html/dashboard.html" };
    return new URL(routes[String(role || "")] || "role-selection.html", window.location.href).href;
  },

  goToRoleHome(role) { window.location.replace(this.getRoleHomeUrl(role)); },
  scheduleRoleHomeRedirect(role, delay = 450) {
    window.clearTimeout(this.redirectTimer);
    this.redirectTimer = window.setTimeout(() => this.goToRoleHome(role), delay);
  },
  goToLogin() {
    if (typeof AppRouter !== "undefined" && typeof AppRouter.goToLogin === "function") {
      AppRouter.goToLogin(this.registrationData ? this.registrationData.role : "", true);
      return;
    }
    window.location.replace(new URL("login.html", window.location.href).href);
  },

  showRegistrationStep() {
    this.stopResendTimer();
    window.clearTimeout(this.redirectTimer);
    this.clearMessage();
    this.registrationData = null;
    this.elements.otpStep.classList.add("hidden");
    this.elements.successStep.classList.add("hidden");
    this.elements.registrationStep.classList.remove("hidden");
    this.elements.otpInput.value = "";
    this.elements.testOtpValue.textContent = "";
    this.elements.testOtpBox.classList.add("hidden");
  },

  showSuccess(user, authenticated) {
    this.stopResendTimer();
    this.clearMessage();
    this.elements.registrationStep.classList.add("hidden");
    this.elements.otpStep.classList.add("hidden");
    this.elements.successStep.classList.remove("hidden");
    const role = user && user.role ? user.role : "User";
    this.elements.successMessage.textContent = authenticated ? role + " account created successfully. Opening your Home page..." : role + " account created successfully. Please login to continue.";
    this.elements.continueButton.textContent = authenticated ? "Continue to Home" : "Continue to Login";
  },

  startResendTimer(seconds) {
    this.stopResendTimer();
    this.resendSeconds = Number(seconds) || 60;
    this.updateResendButton();
    this.resendTimer = window.setInterval(() => {
      this.resendSeconds -= 1;
      if (this.resendSeconds <= 0) {
        this.stopResendTimer();
        this.elements.resendOtpButton.disabled = false;
        this.elements.resendOtpButton.textContent = "Resend OTP";
        return;
      }
      this.updateResendButton();
    }, 1000);
  },
  updateResendButton() {
    this.elements.resendOtpButton.disabled = true;
    this.elements.resendOtpButton.textContent = "Resend OTP in " + this.resendSeconds + "s";
  },
  stopResendTimer() {
    if (this.resendTimer) window.clearInterval(this.resendTimer);
    this.resendTimer = null;
  },
  setButtonLoading(button, loading) {
    button.disabled = loading;
    button.classList.toggle("auth-loading", loading);
    button.setAttribute("aria-busy", String(loading));
  },
  showError(message) {
    this.elements.message.textContent = message;
    this.elements.message.classList.remove("hidden");
  },
  clearMessage() {
    this.elements.message.textContent = "";
    this.elements.message.classList.add("hidden");
  },
  maskMobile(mobile) { return "+91 ******" + String(mobile || "").slice(-4); },

  test() {
    const data = this.getRegistrationData();
    const results = [
      { test: "Language selector removed", expected: true, actual: !document.getElementById("languageInput"), passed: !document.getElementById("languageInput") },
      { test: "English stored internally", expected: "en", actual: data.preferredLanguage, passed: data.preferredLanguage === "en" },
      { test: "Bilingual consent present", expected: true, actual: Boolean(this.elements.consentInput), passed: Boolean(this.elements.consentInput) },
      { test: "Food Partner route", expected: "food-partner/html/dashboard.html", actual: this.getRoleHomeUrl("Food Partner"), passed: this.getRoleHomeUrl("Food Partner").includes("/food-partner/html/dashboard.html") }
    ];
    const passed = results.every((result) => result.passed);
    console.table(results);
    console.log(passed ? "Registration Configuration Test: PASS" : "Registration Configuration Test: FAIL");
    return { success: passed, status: passed ? "PASS" : "FAIL", results };
  }
};

document.addEventListener("DOMContentLoaded", () => RegisterPage.init());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((error) => console.error("Registration service worker failed:", error)));
}
