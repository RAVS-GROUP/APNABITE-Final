/**
 * ============================================================
 * APNABITE FOOD PARTNER
 * FILE: food-partner/js/kyc.js
 * PURPOSE: Fast secure cached KYC verification page
 * VERSION: 2.0.0
 * ============================================================
 */

const FoodPartnerKYC = {
  CACHE_KEY: "apnabite_food_partner_kyc",
  CACHE_FRESH_MS: 5 * 60 * 1000,
  CACHE_MAX_AGE_MS: 24 * 60 * 60 * 1000,
  MAX_FILE_BYTES: 2 * 1024 * 1024,
  ALLOWED_TYPES: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp"
  ],

  uploading: false,
  loadRequest: null,
  lastLoadError: null,
  lastData: null,
  lastUpdatedAt: 0,
  elements: {},

  init() {
    const ids = {
      form: "kycForm",
      type: "documentTypeInput",
      number: "documentNumberInput",
      numberHint: "documentNumberHint",
      file: "documentFileInput",
      fileTitle: "filePickerTitle",
      fileSubtitle: "filePickerSubtitle",
      error: "kycError",
      uploadButton: "uploadKycButton",
      status: "overallKycStatus",
      list: "documentList",
      empty: "emptyDocuments",
      count: "documentCount",
      requirements: "requirementGrid",
      progressText: "kycProgressText",
      progressPercent: "kycProgressPercent",
      progressTrack: "kycProgressTrack",
      progressBar: "kycProgressBar",
      completedCount: "completedRequirementCount",
      refresh: "refreshKycButton",
      retry: "retryKycButton",
      updateStatus: "kycUpdateStatus",
      loading: "kycLoadingState",
      loadError: "kycLoadError",
      loadErrorMessage: "kycLoadErrorMessage",
      lastUpdated: "kycLastUpdated",
      bottomNavigation: "partnerBottomNavigation"
    };

    Object.keys(ids).forEach((key) => {
      this.elements[key] = document.getElementById(ids[key]);
    });

    if (!Object.values(this.elements).every(Boolean)) {
      console.error("Food Partner KYC page elements are missing.");
      return false;
    }

    this.bindEvents();
    const cached = this.restoreCache();

    if (cached) {
      this.applyData(cached.data, {
        fromCache: true,
        savedAt: cached.savedAt
      });
      this.load({ background: true });
    } else {
      this.showInitialLoading(true);
      this.load();
    }

    console.log("ApnaBite Food Partner KYC initialized.");
    return true;
  },

  bindEvents() {
    this.elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submit();
    });

    this.elements.file.addEventListener("change", () => {
      this.updateFileLabel();
    });

    this.elements.type.addEventListener("change", () => {
      this.handleDocumentTypeChange();
    });

    this.elements.refresh.addEventListener("click", () => {
      this.load({ force: true, background: Boolean(this.lastData) });
    });

    this.elements.retry.addEventListener("click", () => {
      this.load({ force: true });
    });
  },

  getSessionId() {
    const session = SessionManager.get();
    return session && session.sessionId ? session.sessionId : "";
  },

  cacheIdentity() {
    const session = SessionManager.get();
    return session
      ? String(session.userId || session.sessionId || "")
      : "";
  },

  restoreCache() {
    const cached = AppStorage.get(this.CACHE_KEY, null);

    if (!cached || typeof cached !== "object") {
      return null;
    }

    if (cached.identity !== this.cacheIdentity()) {
      this.clearCache();
      return null;
    }

    const savedAt = Number(cached.savedAt || 0);

    if (
      !savedAt ||
      Date.now() - savedAt > this.CACHE_MAX_AGE_MS ||
      !cached.data ||
      typeof cached.data !== "object"
    ) {
      this.clearCache();
      return null;
    }

    return cached;
  },

  saveCache(data) {
    const savedAt = Date.now();

    AppStorage.set(this.CACHE_KEY, {
      identity: this.cacheIdentity(),
      data: data,
      savedAt: savedAt
    });

    this.lastUpdatedAt = savedAt;
    return true;
  },

  clearCache() {
    AppStorage.remove(this.CACHE_KEY);
    return true;
  },

  cacheIsFresh() {
    return Boolean(
      this.lastData &&
      this.lastUpdatedAt &&
      Date.now() - this.lastUpdatedAt < this.CACHE_FRESH_MS
    );
  },

  load(options = {}) {
    if (this.loadRequest) {
      return this.loadRequest;
    }

    const force = options.force === true;
    const background = options.background === true;

    if (!force && this.cacheIsFresh() && !background) {
      return Promise.resolve(this.lastData);
    }

    this.loadRequest = this.performLoad({ background })
      .finally(() => {
        this.loadRequest = null;
      });

    return this.loadRequest;
  },

  async performLoad(options = {}) {
    const background = options.background === true;

    this.lastLoadError = null;
    this.hideLoadError();
    this.setRefreshing(true);

    if (!background && !this.lastData) {
      this.showInitialLoading(true);
    } else {
      this.setUpdateStatus(
        "Checking verification status…",
        true
      );
    }

    try {
      const response = await API.request(
        "get_food_partner_kyc",
        {
          sessionId: this.getSessionId()
        }
      );

      const data = response.data || {};
      this.saveCache(data);
      this.applyData(data, {
        fromCache: false,
        savedAt: this.lastUpdatedAt
      });

      return data;
    } catch (error) {
      this.lastLoadError = error;
      console.error("Food Partner KYC load failed:", error);

      if (this.lastData) {
        this.setUpdateStatus(
          "Live update failed — showing saved KYC details.",
          false
        );
      } else {
        this.showLoadError(
          error.message || "KYC details could not be loaded."
        );
      }

      return null;
    } finally {
      this.setRefreshing(false);
      this.showInitialLoading(false);
    }
  },

  applyData(data, options = {}) {
    this.lastData = data || {};
    this.lastUpdatedAt = Number(options.savedAt || Date.now());
    this.render(this.lastData);
    this.updateLastUpdated();

    if (options.fromCache) {
      this.setUpdateStatus(
        "Saved KYC details shown. Checking for updates…",
        true
      );
    } else {
      this.setUpdateStatus("KYC details are up to date.", false);
    }
  },

  render(data) {
    const documents = Array.isArray(data.documents)
      ? data.documents
      : [];

    const status = String(
      data.kycStatus || "NOT_SUBMITTED"
    ).trim().toUpperCase();

    this.renderStatus(status);
    this.elements.count.textContent = String(documents.length);
    this.elements.list.innerHTML = "";

    documents.forEach((documentItem) => {
      this.elements.list.appendChild(
        this.createDocumentItem(documentItem)
      );
    });

    this.elements.empty.classList.toggle(
      "hidden",
      documents.length > 0
    );

    this.renderRequirements(data.requirements || {});
  },

  renderStatus(status) {
    this.elements.status.textContent = this.prettyStatus(status);
    this.elements.status.classList.remove(
      "is-submitted",
      "is-pending",
      "is-verified",
      "is-rejected"
    );

    if (status === "VERIFIED" || status === "APPROVED") {
      this.elements.status.classList.add("is-verified");
      return;
    }

    if (status === "REJECTED") {
      this.elements.status.classList.add("is-rejected");
      return;
    }

    if (
      status === "SUBMITTED" ||
      status === "PENDING" ||
      status === "UNDER_REVIEW"
    ) {
      this.elements.status.classList.add("is-submitted");
    }
  },

  createDocumentItem(documentItem) {
    const item = document.createElement("article");
    const verificationStatus = String(
      documentItem.verificationStatus || "SUBMITTED"
    ).trim().toUpperCase();

    item.className = "document-item";

    if (
      verificationStatus === "VERIFIED" ||
      verificationStatus === "APPROVED"
    ) {
      item.classList.add("is-verified");
    }

    if (verificationStatus === "REJECTED") {
      item.classList.add("is-rejected");
    }

    const icon = document.createElement("span");
    icon.textContent = this.documentIcon(
      documentItem.documentType
    );

    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = this.documentLabel(
      documentItem.documentType
    );

    const number = document.createElement("small");
    number.textContent =
      documentItem.documentNumberMasked ||
      "Document number protected";

    content.append(title, number);

    const status = document.createElement("b");
    status.textContent = this.prettyStatus(verificationStatus);

    item.append(icon, content, status);
    return item;
  },

  documentIcon(documentType) {
    const type = String(documentType || "").toUpperCase();

    if (type.indexOf("KITCHEN_PHOTO") === 0) {
      return "📷";
    }

    if (type === "BANK_PROOF") {
      return "🏦";
    }

    if (type === "ADDRESS_PROOF") {
      return "📍";
    }

    return "📄";
  },

  documentLabel(documentType) {
    const labels = {
      FSSAI: "FSSAI licence",
      PAN: "PAN card",
      AADHAAR: "Aadhaar card",
      VOTER_ID: "Voter ID",
      DRIVING_LICENCE: "Driving licence",
      ADDRESS_PROOF: "Address proof",
      BANK_PROOF: "Bank proof",
      KITCHEN_PHOTO_1: "Kitchen photo 1",
      KITCHEN_PHOTO_2: "Kitchen photo 2",
      KITCHEN_PHOTO_3: "Kitchen photo 3"
    };

    return labels[documentType] || this.prettyStatus(documentType || "Document");
  },

  requirementValues(requirements) {
    return {
      FSSAI: requirements.hasFssai === true,
      PAN: requirements.hasPan === true,
      IDENTITY_PROOF: requirements.hasIdentity === true,
      ADDRESS_PROOF: requirements.hasAddressProof === true,
      BANK_PROOF: requirements.hasBankProof === true,
      KITCHEN_PHOTO:
        Number(requirements.kitchenPhotoCount || 0) >= 1
    };
  },

  renderRequirements(requirements) {
    const values = this.requirementValues(requirements);
    const numbers = {
      FSSAI: "1",
      PAN: "2",
      IDENTITY_PROOF: "3",
      ADDRESS_PROOF: "4",
      BANK_PROOF: "5",
      KITCHEN_PHOTO: "6"
    };

    Object.keys(values).forEach((key) => {
      const card = this.elements.requirements.querySelector(
        '[data-requirement="' + key + '"]'
      );

      if (!card) {
        return;
      }

      card.classList.toggle("complete", values[key]);
      card.querySelector("b").textContent =
        values[key] ? "Done" : "Required";
      card.querySelector(":scope > span").textContent =
        values[key] ? "✓" : numbers[key];
    });

    const completed = Object.keys(values).filter((key) => {
      return values[key] === true;
    }).length;

    this.renderProgress(completed, Object.keys(values).length);
  },

  renderProgress(completed, total) {
    const safeTotal = Math.max(1, Number(total || 0));
    const safeCompleted = Math.max(
      0,
      Math.min(safeTotal, Number(completed || 0))
    );
    const percentage = Math.round(
      safeCompleted / safeTotal * 100
    );

    this.elements.progressText.textContent =
      safeCompleted + " of " + safeTotal + " completed";
    this.elements.progressPercent.textContent = percentage + "%";
    this.elements.completedCount.textContent =
      safeCompleted + "/" + safeTotal;
    this.elements.progressBar.style.width = percentage + "%";
    this.elements.progressTrack.setAttribute(
      "aria-valuenow",
      String(percentage)
    );
  },

  handleDocumentTypeChange() {
    const isKitchenPhoto =
      this.elements.type.value.indexOf("KITCHEN_PHOTO_") === 0;

    this.elements.number.disabled = isKitchenPhoto;
    this.elements.number.required = !isKitchenPhoto;

    if (isKitchenPhoto) {
      this.elements.number.value = "";
    }

    this.elements.number.placeholder = isKitchenPhoto
      ? "Not required for kitchen photos"
      : "Enter document number";

    this.elements.numberHint.textContent = isKitchenPhoto
      ? "(not required)"
      : "";

    this.elements.file.accept = isKitchenPhoto
      ? "image/jpeg,image/png,image/webp"
      : "application/pdf,image/jpeg,image/png,image/webp";
  },

  updateFileLabel() {
    const file = this.elements.file.files[0];

    if (!file) {
      this.elements.fileTitle.textContent = "Choose document file";
      this.elements.fileSubtitle.textContent =
        "Tap to select PDF or image";
      return;
    }

    this.elements.fileTitle.textContent = file.name;
    this.elements.fileSubtitle.textContent =
      this.formatBytes(file.size) +
      " • " +
      (file.type || "Unknown type");
  },

  validate(file) {
    if (!this.elements.type.value) {
      return "Select the document type.";
    }

    const isKitchenPhoto =
      this.elements.type.value.indexOf("KITCHEN_PHOTO_") === 0;

    if (
      !isKitchenPhoto &&
      this.elements.number.value.trim().length < 3
    ) {
      return "Enter the document number.";
    }

    if (!file) {
      return "Choose a document file.";
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return "Upload a PDF, JPG, PNG or WebP file.";
    }

    if (
      isKitchenPhoto &&
      file.type === "application/pdf"
    ) {
      return "Kitchen photo must be a JPG, PNG or WebP image.";
    }

    if (
      file.size <= 0 ||
      file.size > this.MAX_FILE_BYTES
    ) {
      return "Document must be 2 MB or smaller.";
    }

    return "";
  },

  async submit() {
    if (this.uploading) {
      return {
        success: false,
        reason: "KYC_UPLOAD_RUNNING"
      };
    }

    const file = this.elements.file.files[0];
    const validation = this.validate(file);

    if (validation) {
      this.showError(validation);
      return {
        success: false,
        reason: "VALIDATION_ERROR"
      };
    }

    this.uploading = true;
    this.elements.uploadButton.disabled = true;
    this.elements.uploadButton.textContent =
      "Encrypting & Uploading...";
    this.clearError();

    try {
      const base64Data = await this.readFile(file);

      const response = await API.request(
        "submit_food_partner_kyc",
        {
          sessionId: this.getSessionId(),
          document: {
            documentType: this.elements.type.value,
            documentNumber: this.elements.number.value.trim(),
            fileName: file.name,
            mimeType: file.type,
            base64Data: base64Data
          }
        },
        {
          timeoutMs: 90000
        }
      );

      this.elements.form.reset();
      this.handleDocumentTypeChange();
      this.updateFileLabel();
      this.clearCache();

      const refreshed = await this.load({
        force: true,
        background: Boolean(this.lastData)
      });

      const latestStatus = String(
        (refreshed && refreshed.kycStatus) ||
        (response.data && response.data.kycStatus) ||
        ""
      ).toUpperCase();

      this.showSuccess(
        latestStatus === "SUBMITTED"
          ? "All required KYC documents have been submitted for review."
          : "Document uploaded. Complete the remaining requirements."
      );

      return {
        success: true,
        data: response.data || null
      };
    } catch (error) {
      this.showError(
        error.message || "KYC document could not be uploaded."
      );

      return {
        success: false,
        error: error.message,
        code: error.code || ""
      };
    } finally {
      this.uploading = false;
      this.elements.uploadButton.disabled = false;
      this.elements.uploadButton.textContent =
        "Upload Document Securely";
    }
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(
          String(reader.result || "").split(",")[1] || ""
        );
      };

      reader.onerror = () => {
        reject(
          new Error("The selected file could not be read.")
        );
      };

      reader.readAsDataURL(file);
    });
  },

  showInitialLoading(show) {
    this.elements.loading.classList.toggle("hidden", !show);

    this.elements.requirements.classList.toggle("hidden", show);

    document.querySelectorAll(".kyc-card").forEach((card) => {
      card.classList.toggle("hidden", show);
    });
  },

  setRefreshing(refreshing) {
    this.elements.refresh.disabled = refreshing;
    this.elements.refresh.classList.toggle(
      "is-loading",
      refreshing
    );
    this.elements.refresh.setAttribute(
      "aria-busy",
      String(refreshing)
    );
  },

  setUpdateStatus(message, updating) {
    this.elements.updateStatus.textContent = message || "";
    this.elements.updateStatus.classList.toggle(
      "is-updating",
      updating === true
    );
  },

  showLoadError(message) {
    this.elements.loadErrorMessage.textContent = message;
    this.elements.loadError.classList.remove("hidden");
  },

  hideLoadError() {
    this.elements.loadError.classList.add("hidden");
    this.elements.loadErrorMessage.textContent = "";
  },

  updateLastUpdated() {
    if (!this.lastUpdatedAt) {
      this.elements.lastUpdated.textContent = "";
      return;
    }

    const date = new Date(this.lastUpdatedAt);

    this.elements.lastUpdated.textContent = Number.isNaN(date.getTime())
      ? ""
      : "Last updated " + date.toLocaleString(
          "en-IN",
          {
            dateStyle: "medium",
            timeStyle: "short"
          }
        );
  },

  showError(message) {
    this.elements.error.textContent = message;
    this.elements.error.style.color = "";
    this.elements.error.style.background = "";
    this.elements.error.style.borderColor = "";
    this.elements.error.classList.remove("hidden");
    this.elements.error.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  },

  showSuccess(message) {
    this.elements.error.textContent = message;
    this.elements.error.style.color = "#126638";
    this.elements.error.style.background = "#eaf8f0";
    this.elements.error.style.borderColor = "#a9ddbe";
    this.elements.error.classList.remove("hidden");
  },

  clearError() {
    this.elements.error.textContent = "";
    this.elements.error.classList.add("hidden");
  },

  prettyStatus(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .trim();
  },

  formatBytes(bytes) {
    if (bytes < 1024) {
      return bytes + " B";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  },

  async test() {
    console.log("========================================");
    console.log("APNABITE FAST FOOD PARTNER KYC TEST");
    console.log("========================================");

    const firstRequest = this.load({
      force: true,
      background: true
    });

    const secondRequest = this.load({
      force: true,
      background: true
    });

    const duplicateProtected = firstRequest === secondRequest;
    const data = await firstRequest;
    const cached = this.restoreCache();
    const bottomItems =
      this.elements.bottomNavigation.querySelectorAll("a").length;

    const results = [
      {
        test: "Required role",
        expected: "Food Partner",
        actual: document.body.dataset.requiredRole,
        passed:
          document.body.dataset.requiredRole === "Food Partner"
      },
      {
        test: "Live KYC API",
        expected: true,
        actual: Boolean(data && data.success),
        passed: Boolean(data && data.success)
      },
      {
        test: "Document array",
        expected: true,
        actual: Boolean(data && Array.isArray(data.documents)),
        passed: Boolean(data && Array.isArray(data.documents))
      },
      {
        test: "KYC cache",
        expected: true,
        actual: Boolean(cached),
        passed: Boolean(cached)
      },
      {
        test: "Duplicate request protection",
        expected: true,
        actual: duplicateProtected,
        passed: duplicateProtected === true
      },
      {
        test: "2 MB frontend limit",
        expected: 2097152,
        actual: this.MAX_FILE_BYTES,
        passed: this.MAX_FILE_BYTES === 2097152
      },
      {
        test: "Six mandatory requirements",
        expected: 6,
        actual: this.elements.requirements.children.length,
        passed: this.elements.requirements.children.length === 6
      },
      {
        test: "Maximum kitchen photos",
        expected: 3,
        actual: this.elements.type.querySelectorAll(
          'option[value^="KITCHEN_PHOTO_"]'
        ).length,
        passed:
          this.elements.type.querySelectorAll(
            'option[value^="KITCHEN_PHOTO_"]'
          ).length === 3
      },
      {
        test: "KYC progress support",
        expected: true,
        actual: Boolean(
          this.elements.progressBar &&
          this.elements.progressTrack
        ),
        passed: Boolean(
          this.elements.progressBar &&
          this.elements.progressTrack
        )
      },
      {
        test: "Bottom navigation",
        expected: 4,
        actual: bottomItems,
        passed: bottomItems === 4
      }
    ];

    const passed = results.every((result) => result.passed);

    console.table(results);
    console.log("KYC Data:", data);
    console.log(
      passed
        ? "Fast Food Partner KYC Test: PASS"
        : "Fast Food Partner KYC Test: FAIL"
    );

    return {
      success: passed,
      status: passed ? "PASS" : "FAIL",
      cached: Boolean(cached),
      data: data,
      results: results
    };
  }
};

document.addEventListener("DOMContentLoaded", () => {
  FoodPartnerKYC.init();
});
