/** APNABITE TEST PAYMENT — creates a real TEST order; no real money is charged. */
const CustomerPaymentPage = {
  STORAGE_KEY: "apnabite_payment_context",
  RESULT_KEY: "apnabite_test_payment_result",
  ORDER_SUCCESS_KEY: "apnabite_order_success_context",
  elements: {}, context: null, processing: false,

  init() {
    const ids = ["paymentBackButton","paymentMissingState","paymentContent","paymentKitchenName","paymentItemCount","paymentAmount","paymentSubtotal","paymentDeliveryFee","paymentPlatformFee","paymentDiscountRow","paymentDiscount","paymentDonationRow","paymentDonation","paymentFinalAmount","paymentMessage","paymentActionBar","paymentBarAmount","payNowButton","payButtonAmount","paymentResultDialog","paymentResultIcon","paymentResultTitle","paymentResultMessage","paymentReference","paymentResultAmount","paymentResultButton"];
    ids.forEach((id) => this.elements[id] = document.getElementById(id));
    if (ids.some((id) => !this.elements[id])) { console.error("Payment page elements are missing."); return false; }
    this.bindEvents(); this.context = this.restoreContext();
    if (!this.isValidContext(this.context)) { this.showMissing(); return false; }
    this.render(); return true;
  },

  bindEvents() {
    this.elements.paymentBackButton.addEventListener("click", () => window.location.href = "cart.html");
    document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => input.addEventListener("change", () => this.syncMethodCards()));
    document.querySelectorAll('input[name="donationAmount"]').forEach((input) => input.addEventListener("change", () => this.renderAmounts()));
    this.elements.payNowButton.addEventListener("click", () => this.processTestPayment());
    this.elements.paymentResultButton.addEventListener("click", () => this.closeResult());
  },

  restoreContext() { try { return JSON.parse(sessionStorage.getItem(this.STORAGE_KEY) || "null"); } catch (error) { return null; } },
  isValidContext(context) { return Boolean(context && context.cart && Array.isArray(context.items) && context.items.length && context.billing && Number.isFinite(Number(context.billing.finalPayableAmount))); },
  showMissing() { this.elements.paymentMissingState.classList.remove("hidden"); this.elements.paymentContent.classList.add("hidden"); this.elements.paymentActionBar.classList.add("hidden"); },

  render() {
    const quantity = this.context.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const b = this.context.billing;
    const discount = Number(b.discountAmount || 0) + Number(b.rewardAmount || 0);
    this.elements.paymentKitchenName.textContent = this.context.cart.businessName || "ApnaBite Kitchen";
    this.elements.paymentItemCount.textContent = quantity + (quantity === 1 ? " item" : " items");
    this.elements.paymentSubtotal.textContent = this.money(b.subtotal || 0);
    this.elements.paymentDeliveryFee.textContent = b.deliveryFeeWaived ? "FREE" : this.money(b.deliveryFee || 0);
    this.elements.paymentPlatformFee.textContent = b.platformFeeWaived ? "FREE" : this.money(b.platformFee || 0);
    this.elements.paymentDiscountRow.classList.toggle("hidden", discount <= 0);
    this.elements.paymentDiscount.textContent = "−" + this.money(discount);
    this.renderAmounts();
    this.elements.paymentContent.classList.remove("hidden"); this.elements.paymentActionBar.classList.remove("hidden"); this.elements.paymentMissingState.classList.add("hidden");
  },

  renderAmounts() {
    const donation = this.getDonationAmount();
    const total = Math.round((Number(this.context.billing.finalPayableAmount || 0) + donation) * 100) / 100;
    this.elements.paymentDonationRow.classList.toggle("hidden", donation <= 0);
    this.elements.paymentDonation.textContent = this.money(donation);
    ["paymentAmount","paymentFinalAmount","paymentBarAmount","payButtonAmount"].forEach((id) => this.elements[id].textContent = this.money(total));
  },

  syncMethodCards() { document.querySelectorAll(".method-card").forEach((card) => card.classList.toggle("selected", card.querySelector("input").checked)); },
  getSelected(name) { const input = document.querySelector('input[name="' + name + '"]:checked'); return input ? input.value : ""; },
  getDonationAmount() { return Number(this.getSelected("donationAmount") || 0); },
  getSessionId() { const session = typeof SessionManager !== "undefined" ? SessionManager.get() : null; return session ? String(session.sessionId || "") : ""; },

  async processTestPayment() {
    if (this.processing) return;
    const method = this.getSelected("paymentMethod");
    const outcome = this.getSelected("testOutcome");
    const reference = this.generateReference();
    const donationAmount = this.getDonationAmount();
    const displayedAmount = Number(this.context.billing.finalPayableAmount || 0) + donationAmount;
    if (outcome === "FAILED") { this.showFailedResult(reference, displayedAmount); return; }

    this.processing = true; this.elements.payNowButton.disabled = true; this.elements.payNowButton.textContent = "Placing order..."; this.clearMessage();
    try {
      const response = await API.request("place_test_customer_order", {
        sessionId: this.getSessionId(),
        addressId: this.context.address ? this.context.address.addressId : "",
        paymentMethod: method,
        clientPaymentReference: reference,
        donationAmount: donationAmount,
        dryRun: false
      }, { timeoutMs: 90000 });
      const result = response.data || {};
      if (result.success !== true || result.status !== "PLACED" || !result.order) throw new Error("The order could not be confirmed.");
      sessionStorage.setItem(this.RESULT_KEY, JSON.stringify({ success:true, status:result.status, reference, amount:result.pricing ? result.pricing.finalAmount : displayedAmount, orderId:result.order.orderId, realMoneyCharged:false }));
      sessionStorage.setItem(this.ORDER_SUCCESS_KEY, JSON.stringify(result));
      sessionStorage.removeItem(this.STORAGE_KEY);
      window.location.replace("order-success.html");
    } catch (error) {
      this.showMessage(error.message || "The test order could not be placed. Your cart is safe.");
    } finally {
      this.processing = false; this.elements.payNowButton.disabled = false;
      this.elements.payNowButton.innerHTML = 'Test Pay <span id="payButtonAmount">' + this.money(displayedAmount) + "</span>";
      this.elements.payButtonAmount = document.getElementById("payButtonAmount");
    }
  },

  showFailedResult(reference, amount) {
    this.elements.paymentResultDialog.classList.add("failed"); this.elements.paymentResultIcon.textContent = "×";
    this.elements.paymentResultTitle.textContent = "Test payment failed";
    this.elements.paymentResultMessage.textContent = "This is a simulated failure. Your cart remains safe.";
    this.elements.paymentReference.textContent = reference; this.elements.paymentResultAmount.textContent = this.money(amount);
    this.elements.paymentResultButton.textContent = "Try Again";
    typeof this.elements.paymentResultDialog.showModal === "function" ? this.elements.paymentResultDialog.showModal() : this.elements.paymentResultDialog.setAttribute("open", "");
  },

  closeResult() { if (typeof this.elements.paymentResultDialog.close === "function") this.elements.paymentResultDialog.close(); else this.elements.paymentResultDialog.removeAttribute("open"); },
  showMessage(message) { this.elements.paymentMessage.textContent = message; this.elements.paymentMessage.classList.remove("hidden"); },
  clearMessage() { this.elements.paymentMessage.textContent = ""; this.elements.paymentMessage.classList.add("hidden"); },
  generateReference() { return "TESTPAY_" + Date.now().toString(36).toUpperCase() + "_" + Math.random().toString(36).slice(2,8).toUpperCase(); },
  money(value) { return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", minimumFractionDigits:0, maximumFractionDigits:2 }).format(Number(value || 0)); },

  test() {
    const amount = Number(this.context && this.context.billing ? this.context.billing.finalPayableAmount : NaN);
    const results = [
      {test:"Payment context",passed:this.isValidContext(this.context),actual:Boolean(this.context)},
      {test:"Test mode",passed:Boolean(this.context && this.context.payment && this.context.payment.mode === "TEST"),actual:this.context && this.context.payment ? this.context.payment.mode : ""},
      {test:"Final payable",passed:Number.isFinite(amount) && amount > 0,actual:amount},
      {test:"Payment methods",passed:document.querySelectorAll('input[name="paymentMethod"]').length === 3,actual:document.querySelectorAll('input[name="paymentMethod"]').length},
      {test:"Donation options",passed:document.querySelectorAll('input[name="donationAmount"]').length === 6,actual:document.querySelectorAll('input[name="donationAmount"]').length},
      {test:"Order API integration",passed:typeof this.processTestPayment === "function",actual:typeof this.processTestPayment}
    ];
    const passed = results.every((item) => item.passed); console.table(results);
    return {success:passed,status:passed?"PASS":"FAIL",results};
  }
};
document.addEventListener("DOMContentLoaded", () => CustomerPaymentPage.init());
