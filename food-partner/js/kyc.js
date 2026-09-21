/**
 * APNABITE FOOD PARTNER KYC PAGE
 * FILE: food-partner/js/kyc.js
 * VERSION: 1.0.0
 */

const FoodPartnerKYC = {
  MAX_FILE_BYTES: 2 * 1024 * 1024,
  ALLOWED_TYPES: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  uploading: false,
  lastLoadError: null,
  elements: {},

  init() {
    const ids = {
      form: "kycForm", type: "documentTypeInput", number: "documentNumberInput",
      numberHint: "documentNumberHint",
      file: "documentFileInput", fileTitle: "filePickerTitle", fileSubtitle: "filePickerSubtitle",
      error: "kycError", uploadButton: "uploadKycButton", status: "overallKycStatus",
      list: "documentList", empty: "emptyDocuments", count: "documentCount", requirements: "requirementGrid"
    };
    Object.keys(ids).forEach((key) => { this.elements[key] = document.getElementById(ids[key]); });
    if (!Object.values(this.elements).every(Boolean)) {
      console.error("Food Partner KYC page elements are missing.");
      return false;
    }
    this.elements.form.addEventListener("submit", (event) => { event.preventDefault(); this.submit(); });
    this.elements.file.addEventListener("change", () => this.updateFileLabel());
    this.elements.type.addEventListener("change", () => this.handleDocumentTypeChange());
    this.load();
    console.log("ApnaBite Food Partner KYC initialized.");
    return true;
  },

  getSessionId() {
    const session = SessionManager.get();
    return session && session.sessionId ? session.sessionId : "";
  },

  async load() {
    this.clearError();
    try {
      const response = await API.request("get_food_partner_kyc", { sessionId: this.getSessionId() });
      this.lastLoadError = null;
      this.render(response.data || {});
      return response.data;
    } catch (error) {
      this.lastLoadError = error;
      console.error("Food Partner KYC load failed:", error);
      this.showError(error.message || "KYC details could not be loaded.");
      return null;
    }
  },

  render(data) {
    const documents = Array.isArray(data.documents) ? data.documents : [];
    this.elements.status.textContent = String(data.kycStatus || "NOT_SUBMITTED").replace(/_/g, " ");
    this.elements.count.textContent = String(documents.length);
    this.elements.list.innerHTML = "";
    documents.forEach((document) => this.elements.list.appendChild(this.createDocumentItem(document)));
    this.elements.empty.classList.toggle("hidden", documents.length > 0);
    this.renderRequirements(data.requirements || {});
  },

  createDocumentItem(document) {
    const item = window.document.createElement("article");
    item.className = "document-item";
    const icon = window.document.createElement("span");
    icon.textContent = "📄";
    const content = window.document.createElement("div");
    const title = window.document.createElement("strong");
    title.textContent = String(document.documentType || "Document").replace(/_/g, " ");
    const number = window.document.createElement("small");
    number.textContent = document.documentNumberMasked || "Number protected";
    content.append(title, number);
    const status = window.document.createElement("b");
    status.textContent = String(document.verificationStatus || "SUBMITTED").replace(/_/g, " ");
    item.append(icon, content, status);
    return item;
  },

  renderRequirements(requirements) {
    const values = {
      FSSAI: requirements.hasFssai === true,
      PAN: requirements.hasPan === true,
      IDENTITY_PROOF: requirements.hasIdentity === true,
      ADDRESS_PROOF: requirements.hasAddressProof === true,
      BANK_PROOF: requirements.hasBankProof === true,
      KITCHEN_PHOTO: Number(requirements.kitchenPhotoCount || 0) >= 1
    };
    Object.keys(values).forEach((key) => {
      const card = this.elements.requirements.querySelector('[data-requirement="' + key + '"]');
      if (!card) return;
      card.classList.toggle("complete", values[key]);
      card.querySelector("b").textContent = values[key] ? "Done" : "Required";
      card.querySelector(":scope > span").textContent = values[key] ? "✓" : ({ FSSAI: "1", PAN: "2", IDENTITY_PROOF: "3", ADDRESS_PROOF: "4", BANK_PROOF: "5", KITCHEN_PHOTO: "6" }[key]);
    });
  },

  handleDocumentTypeChange() {
    const isKitchenPhoto = this.elements.type.value.indexOf("KITCHEN_PHOTO_") === 0;
    this.elements.number.disabled = isKitchenPhoto;
    this.elements.number.required = !isKitchenPhoto;
    this.elements.number.value = isKitchenPhoto ? "" : this.elements.number.value;
    this.elements.number.placeholder = isKitchenPhoto ? "Not required for kitchen photos" : "Enter document number";
    this.elements.numberHint.textContent = isKitchenPhoto ? "(not required)" : "";
    this.elements.file.accept = isKitchenPhoto ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png,image/webp";
  },

  updateFileLabel() {
    const file = this.elements.file.files[0];
    if (!file) {
      this.elements.fileTitle.textContent = "Choose document file";
      this.elements.fileSubtitle.textContent = "Tap to select PDF or image";
      return;
    }
    this.elements.fileTitle.textContent = file.name;
    this.elements.fileSubtitle.textContent = this.formatBytes(file.size) + " • " + (file.type || "Unknown type");
  },

  validate(file) {
    if (!this.elements.type.value) return "Select the document type.";
    const isKitchenPhoto = this.elements.type.value.indexOf("KITCHEN_PHOTO_") === 0;
    if (!isKitchenPhoto && this.elements.number.value.trim().length < 3) return "Enter the document number.";
    if (!file) return "Choose a document file.";
    if (!this.ALLOWED_TYPES.includes(file.type)) return "Upload a PDF, JPG, PNG or WebP file.";
    if (isKitchenPhoto && file.type === "application/pdf") return "Kitchen photo must be a JPG, PNG or WebP image.";
    if (file.size <= 0 || file.size > this.MAX_FILE_BYTES) return "Document must be 2 MB or smaller.";
    return "";
  },

  async submit() {
    if (this.uploading) return;
    const file = this.elements.file.files[0];
    const validation = this.validate(file);
    if (validation) { this.showError(validation); return; }
    this.uploading = true;
    this.elements.uploadButton.disabled = true;
    this.elements.uploadButton.textContent = "Encrypting & Uploading...";
    this.clearError();
    try {
      const base64Data = await this.readFile(file);
      const response = await API.request("submit_food_partner_kyc", {
        sessionId: this.getSessionId(),
        document: {
          documentType: this.elements.type.value,
          documentNumber: this.elements.number.value.trim(),
          fileName: file.name,
          mimeType: file.type,
          base64Data: base64Data
        }
      }, { timeoutMs: 90000 });
      this.elements.form.reset();
      this.handleDocumentTypeChange();
      this.updateFileLabel();
      await this.load();
      this.showSuccess(response.data && response.data.kycStatus === "SUBMITTED" ? "All required KYC documents submitted for review." : "Document uploaded. Complete the remaining requirements.");
    } catch (error) {
      this.showError(error.message || "KYC document could not be uploaded.");
    } finally {
      this.uploading = false;
      this.elements.uploadButton.disabled = false;
      this.elements.uploadButton.textContent = "Upload Securely";
    }
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(new Error("The selected file could not be read."));
      reader.readAsDataURL(file);
    });
  },

  showError(message) {
    this.elements.error.textContent = message;
    this.elements.error.style.color = "";
    this.elements.error.style.background = "";
    this.elements.error.classList.remove("hidden");
  },
  showSuccess(message) {
    this.elements.error.textContent = message;
    this.elements.error.style.color = "#126638";
    this.elements.error.style.background = "#eaf8f0";
    this.elements.error.classList.remove("hidden");
  },
  clearError() {
    this.elements.error.textContent = "";
    this.elements.error.classList.add("hidden");
  },
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  },

  async test() {
    const data = await this.load();
    const results = [
      { test: "Required role", expected: "Food Partner", actual: document.body.dataset.requiredRole, passed: document.body.dataset.requiredRole === "Food Partner" },
      { test: "Live KYC API", expected: true, actual: Boolean(data && data.success), passed: Boolean(data && data.success) },
      { test: "Document array", expected: true, actual: Boolean(data && Array.isArray(data.documents)), passed: Boolean(data && Array.isArray(data.documents)) },
      { test: "2 MB frontend limit", expected: 2097152, actual: this.MAX_FILE_BYTES, passed: this.MAX_FILE_BYTES === 2097152 },
      { test: "Six mandatory requirements", expected: 6, actual: this.elements.requirements.children.length, passed: this.elements.requirements.children.length === 6 },
      { test: "Maximum kitchen photos", expected: 3, actual: this.elements.type.querySelectorAll('option[value^="KITCHEN_PHOTO_"]').length, passed: this.elements.type.querySelectorAll('option[value^="KITCHEN_PHOTO_"]').length === 3 }
    ];
    const passed = results.every((result) => result.passed);
    console.table(results);
    console.log(passed ? "Food Partner KYC Page Test: PASS" : "Food Partner KYC Page Test: FAIL");
    return { success: passed, status: passed ? "PASS" : "FAIL", data, results };
  }
};

document.addEventListener("DOMContentLoaded", () => FoodPartnerKYC.init());
