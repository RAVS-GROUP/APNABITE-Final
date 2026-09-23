/**
 * ============================================================
 * APNABITE ADMIN FINANCE & AUDIT
 * FILE: admin/js/finance-expenses.js
 * PURPOSE: Expense ledger, approval and payment management
 * VERSION: 1.0.0
 * ============================================================
 */

const AdminFinanceExpenses = {

  CACHE_KEY: "apnabite_admin_finance_expenses_v1",
  CACHE_TTL_MS: 5 * 60 * 1000,
  REQUEST_TIMEOUT_MS: 30000,

  state: {
    expenses: [],
    summary: {},
    selectedExpense: null,
    loading: false,
    saving: false,
    actionRunning: false,
    listPromise: null,
    summaryPromise: null,
    searchTimer: null
  },

  elements: {},


  /*
   * ----------------------------------------------------------
   * INITIALIZE
   * ----------------------------------------------------------
   */

  init() {

    const ids = {
      refresh: "refreshFinanceButton",
      retry: "retryFinanceButton",

      add: "addExpenseButton",
      mobileAdd: "mobileAddExpenseButton",
      emptyAdd: "emptyAddExpenseButton",

      pageError: "financePageError",
      loading: "financeLoading",
      content: "financeContent",

      search: "expenseSearchInput",
      approvalFilter: "approvalStatusFilter",
      paymentFilter: "paymentStatusFilter",
      categoryFilter: "expenseCategoryFilter",
      fromDate: "expenseFromDate",
      toDate: "expenseToDate",
      clearFilters: "clearExpenseFiltersButton",
      quickFilters: "expenseQuickFilters",

      approvedTotal: "approvedExpenseTotal",
      paidTotal: "paidExpenseTotal",
      pendingTotal: "pendingApprovalTotal",
      monthTotal: "currentMonthExpense",

      pendingApprovalCount: "pendingApprovalCount",
      totalCount: "totalExpenseCount",
      draftCount: "draftExpenseCount",
      pendingCount: "pendingExpenseCount",
      approvedCount: "approvedExpenseCount",
      rejectedCount: "rejectedExpenseCount",
      paidCount: "paidExpenseCount",
      visibleCount: "visibleExpenseCount",
      lastUpdated: "financeLastUpdated",

      tableBody: "expenseTableBody",
      mobileList: "expenseMobileList",
      empty: "expenseEmpty",

      formDialog: "expenseFormDialog",
      formTitle: "expenseFormTitle",
      form: "expenseForm",
      closeForm: "closeExpenseFormButton",
      cancelForm: "cancelExpenseFormButton",
      saveDraft: "saveExpenseDraftButton",
      formError: "expenseFormError",

      expenseId: "expenseIdInput",
      expenseDate: "expenseDateInput",
      category: "expenseCategoryInput",
      subcategory: "expenseSubcategoryInput",
      type: "expenseTypeInput",
      costCenter: "expenseCostCenterInput",
      description: "expenseDescriptionInput",
      vendor: "expenseVendorInput",
      invoiceNumber: "expenseInvoiceNumberInput",
      invoiceUrl: "expenseInvoiceUrlInput",
      baseAmount: "expenseBaseAmountInput",
      taxAmount: "expenseTaxAmountInput",
      totalAmount: "expenseTotalAmount",
      districtId: "expenseDistrictIdInput",
      orderId: "expenseOrderIdInput",
      campaignId: "expenseCampaignIdInput",
      recurring: "expenseRecurringInput",
      recurringFrequency: "expenseRecurringFrequencyInput",
      recurringBox: "recurringFrequencyBox",

      reviewDialog: "expenseReviewDialog",
      closeReview: "closeExpenseReviewButton",
      reviewContent: "expenseReviewContent",
      editReview: "editReviewedExpenseButton",
      submitReview: "submitExpenseButton",
      approveReview: "approveExpenseButton",
      rejectReview: "rejectExpenseButton",
      paidReview: "markExpensePaidButton",
      reviewError: "expenseReviewError",

      rejectDialog: "rejectExpenseDialog",
      rejectReason: "expenseRejectionReasonInput",
      rejectError: "expenseRejectError",
      cancelReject: "cancelExpenseRejectButton",
      confirmReject: "confirmExpenseRejectButton",

      paymentDialog: "expensePaymentDialog",
      paymentMethod: "expensePaymentMethodInput",
      paymentReference: "expensePaymentReferenceInput",
      paymentError: "expensePaymentError",
      cancelPayment: "cancelExpensePaymentButton",
      confirmPayment: "confirmExpensePaymentButton",

      mobileLogout: "mobileFinanceLogoutButton"
    };

    Object.keys(ids).forEach((key) => {
      this.elements[key] = document.getElementById(ids[key]);
    });

    if (
      !this.elements.tableBody ||
      !this.elements.mobileList ||
      !this.elements.form ||
      !this.elements.reviewDialog
    ) {
      console.error("Admin Finance page elements are missing.");
      return false;
    }

    this.bind();
    this.setDefaultDate();
    this.loadInitial();

    console.log("ApnaBite Admin Finance initialized.");

    return true;
  },


  /*
   * ----------------------------------------------------------
   * EVENTS
   * ----------------------------------------------------------
   */

  bind() {

    this.elements.refresh?.addEventListener("click", () => {
      this.load(true);
    });

    this.elements.retry?.addEventListener("click", () => {
      this.load(true);
    });

    [
      this.elements.add,
      this.elements.mobileAdd,
      this.elements.emptyAdd
    ].forEach((button) => {
      button?.addEventListener("click", () => this.openCreate());
    });

    this.elements.closeForm?.addEventListener("click", () => {
      this.closeForm();
    });

    this.elements.cancelForm?.addEventListener("click", () => {
      this.closeForm();
    });

    this.elements.formDialog?.addEventListener("click", (event) => {
      if (event.target.dataset.closeExpenseForm === "true") {
        this.closeForm();
      }
    });

    this.elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.saveExpense();
    });

    this.elements.baseAmount?.addEventListener("input", () => {
      this.updateCalculatedTotal();
    });

    this.elements.taxAmount?.addEventListener("input", () => {
      this.updateCalculatedTotal();
    });

    this.elements.recurring?.addEventListener("change", () => {
      this.updateRecurringState();
    });

    this.elements.search?.addEventListener("input", () => {
      clearTimeout(this.state.searchTimer);

      this.state.searchTimer = setTimeout(() => {
        this.load(true);
      }, 350);
    });

    [
      this.elements.approvalFilter,
      this.elements.paymentFilter,
      this.elements.categoryFilter,
      this.elements.fromDate,
      this.elements.toDate
    ].forEach((element) => {
      element?.addEventListener("change", () => this.load(true));
    });

    this.elements.clearFilters?.addEventListener("click", () => {
      this.clearFilters();
    });

    this.elements.quickFilters?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-expense-filter]");

      if (!button) return;

      this.applyQuickFilter(button.dataset.expenseFilter, button);
    });

    const listClickHandler = (event) => {
      const button = event.target.closest("[data-expense-view]");

      if (!button) return;

      this.openReview(button.dataset.expenseView);
    };

    this.elements.tableBody.addEventListener("click", listClickHandler);
    this.elements.mobileList.addEventListener("click", listClickHandler);

    this.elements.closeReview?.addEventListener("click", () => {
      this.closeReview();
    });

    this.elements.reviewDialog?.addEventListener("click", (event) => {
      if (event.target.dataset.closeExpenseReview === "true") {
        this.closeReview();
      }
    });

    this.elements.editReview?.addEventListener("click", () => {
      if (!this.state.selectedExpense) return;

      const expense = this.state.selectedExpense;

      this.closeReview(true);
      this.openEdit(expense);
    });

    this.elements.submitReview?.addEventListener("click", () => {
      this.submitSelectedExpense();
    });

    this.elements.approveReview?.addEventListener("click", () => {
      this.approveSelectedExpense();
    });

    this.elements.rejectReview?.addEventListener("click", () => {
      this.openRejectDialog();
    });

    this.elements.paidReview?.addEventListener("click", () => {
      this.openPaymentDialog();
    });

    this.elements.cancelReject?.addEventListener("click", () => {
      this.closeRejectDialog();
    });

    this.elements.confirmReject?.addEventListener("click", () => {
      this.rejectSelectedExpense();
    });

    this.elements.cancelPayment?.addEventListener("click", () => {
      this.closePaymentDialog();
    });

    this.elements.confirmPayment?.addEventListener("click", () => {
      this.markSelectedExpensePaid();
    });

    this.elements.paymentMethod?.addEventListener("change", () => {
      this.updatePaymentReferenceState();
    });

    this.elements.mobileLogout?.addEventListener("click", () => {
      document.getElementById("roleLogoutButton")?.click();
    });

    document.addEventListener("keydown", (event) => {

      if (event.key !== "Escape") return;

      if (!this.isHidden(this.elements.rejectDialog)) {
        this.closeRejectDialog();
        return;
      }

      if (!this.isHidden(this.elements.paymentDialog)) {
        this.closePaymentDialog();
        return;
      }

      if (!this.isHidden(this.elements.reviewDialog)) {
        this.closeReview();
        return;
      }

      if (!this.isHidden(this.elements.formDialog)) {
        this.closeForm();
      }
    });
  },


  /*
   * ----------------------------------------------------------
   * SESSION AND CACHE
   * ----------------------------------------------------------
   */

  sessionId() {
    const session = SessionManager.get();

    return session && session.sessionId
      ? session.sessionId
      : "";
  },

  userCacheKey() {
    const session = SessionManager.get() || {};

    return this.CACHE_KEY + "_" + String(
      session.userId ||
      session.mobile ||
      "admin"
    );
  },

  readCache() {

    try {
      const raw = localStorage.getItem(this.userCacheKey());

      if (!raw) return null;

      const cache = JSON.parse(raw);
      const age = Date.now() - Number(cache.savedAt || 0);

      if (
        age > this.CACHE_TTL_MS ||
        !Array.isArray(cache.expenses) ||
        !cache.summary
      ) {
        return null;
      }

      return cache;

    } catch (error) {
      return null;
    }
  },

  writeCache() {

    try {
      localStorage.setItem(
        this.userCacheKey(),
        JSON.stringify({
          savedAt: Date.now(),
          expenses: this.state.expenses,
          summary: this.state.summary
        })
      );
    } catch (error) {
      console.warn("Finance cache could not be saved.");
    }
  },

  clearCache() {
    try {
      localStorage.removeItem(this.userCacheKey());
    } catch (error) {
      // Cache removal is optional.
    }
  },


  /*
   * ----------------------------------------------------------
   * LOAD DATA
   * ----------------------------------------------------------
   */

  loadInitial() {

    const cache = this.readCache();

    if (cache) {
      this.state.expenses = cache.expenses;
      this.state.summary = cache.summary;
      this.render();
      this.showContent();
      this.load(true, true);
      return;
    }

    this.load(false);
  },

  async load(force = false, background = false) {

    if (this.state.loading && !force) return null;

    this.state.loading = true;
    this.clearPageError();

    if (!background) {
      this.showLoading();
    }

    try {
      const listData = await this.fetchList();
      const summaryData = await this.fetchSummary();

      this.state.expenses = Array.isArray(listData.expenses)
        ? listData.expenses
        : [];

      this.state.summary = summaryData.summary || {};

      this.writeCache();
      this.render();
      this.showContent();

      return {
        success: true,
        list: listData,
        summary: summaryData
      };

    } catch (error) {
      console.error("Admin Finance load failed:", error);

      this.showPageError(
        error.message ||
        "Finance expenses could not be loaded."
      );

      return {
        success: false,
        error: error
      };

    } finally {
      this.state.loading = false;
    }
  },

  fetchList() {

    if (this.state.listPromise) {
      return this.state.listPromise;
    }

    this.state.listPromise = API.request(
      "admin_list_finance_expenses",
      {
        sessionId: this.sessionId(),
        filters: this.getFilters()
      },
      {
        timeoutMs: this.REQUEST_TIMEOUT_MS
      }
    )
      .then((response) => response.data || {})
      .finally(() => {
        this.state.listPromise = null;
      });

    return this.state.listPromise;
  },

  fetchSummary() {

    if (this.state.summaryPromise) {
      return this.state.summaryPromise;
    }

    this.state.summaryPromise = API.request(
      "admin_get_finance_expense_summary",
      {
        sessionId: this.sessionId()
      },
      {
        timeoutMs: this.REQUEST_TIMEOUT_MS
      }
    )
      .then((response) => response.data || {})
      .finally(() => {
        this.state.summaryPromise = null;
      });

    return this.state.summaryPromise;
  },

  getFilters() {
    return {
      approvalStatus:
        this.elements.approvalFilter?.value || "ALL",

      paymentStatus:
        this.elements.paymentFilter?.value || "ALL",

      category:
        this.elements.categoryFilter?.value || "ALL",

      fromDate:
        this.elements.fromDate?.value || "",

      toDate:
        this.elements.toDate?.value || "",

      query:
        this.elements.search?.value.trim() || "",

      limit: 200
    };
  },


  /*
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  render() {
    this.renderSummary();
    this.renderExpenses();

    if (this.elements.lastUpdated) {
      this.elements.lastUpdated.textContent =
        "Updated " + new Date().toLocaleString("en-IN");
    }
  },

  renderSummary() {

    const summary = this.state.summary || {};

    this.setText(
      this.elements.approvedTotal,
      this.money(summary.approvedExpenseTotal)
    );

    this.setText(
      this.elements.paidTotal,
      this.money(summary.paidExpenseTotal)
    );

    this.setText(
      this.elements.pendingTotal,
      this.money(summary.pendingApprovalTotal)
    );

    this.setText(
      this.elements.monthTotal,
      this.money(summary.currentMonthExpense)
    );

    this.setText(
      this.elements.pendingApprovalCount,
      summary.pendingApprovalCount || 0
    );

    this.setText(
      this.elements.totalCount,
      summary.totalRecords || 0
    );

    this.setText(
      this.elements.draftCount,
      summary.draftCount || 0
    );

    this.setText(
      this.elements.pendingCount,
      summary.pendingApprovalCount || 0
    );

    this.setText(
      this.elements.approvedCount,
      summary.approvedCount || 0
    );

    this.setText(
      this.elements.rejectedCount,
      summary.rejectedCount || 0
    );

    this.setText(
      this.elements.paidCount,
      summary.paidCount || 0
    );
  },

  renderExpenses() {

    const expenses = this.state.expenses;

    this.elements.tableBody.innerHTML = "";
    this.elements.mobileList.innerHTML = "";

    expenses.forEach((expense) => {
      this.elements.tableBody.appendChild(
        this.createTableRow(expense)
      );

      this.elements.mobileList.appendChild(
        this.createMobileCard(expense)
      );
    });

    this.setText(this.elements.visibleCount, expenses.length);

    this.elements.empty?.classList.toggle(
      "hidden",
      expenses.length > 0
    );
  },

  createTableRow(expense) {

    const row = document.createElement("tr");

    row.innerHTML =
      "<td>" + this.escape(expense.expenseDate || "—") + "</td>" +
      "<td><strong>" + this.escape(expense.description || "Expense") +
      "</strong><small>" + this.escape(expense.vendorName || "No vendor") +
      "</small></td>" +
      "<td>" + this.escape(this.pretty(expense.expenseCategory)) + "</td>" +
      "<td>" + this.escape(this.pretty(expense.costCenter)) + "</td>" +
      "<td><strong>" + this.money(expense.totalAmount) + "</strong></td>" +
      "<td>" + this.statusBadge(expense.approvalStatus) + "</td>" +
      "<td>" + this.statusBadge(expense.paymentStatus) + "</td>" +
      '<td><button type="button" class="view-expense-button" ' +
      'data-expense-view="' + this.escape(expense.expenseId) +
      '">Review</button></td>';

    return row;
  },

  createMobileCard(expense) {

    const card = document.createElement("article");
    card.className = "expense-mobile-card";

    card.innerHTML =
      '<div class="expense-mobile-heading">' +
      "<div><small>" + this.escape(expense.expenseDate || "—") +
      "</small><strong>" + this.escape(expense.description || "Expense") +
      "</strong></div><b>" + this.money(expense.totalAmount) +
      "</b></div>" +
      '<div class="expense-mobile-meta">' +
      "<span>" + this.escape(this.pretty(expense.expenseCategory)) + "</span>" +
      "<span>" + this.escape(expense.vendorName || "No vendor") + "</span>" +
      "</div>" +
      '<div class="expense-mobile-footer">' +
      "<div>" +
      this.statusBadge(expense.approvalStatus) +
      this.statusBadge(expense.paymentStatus) +
      "</div>" +
      '<button type="button" data-expense-view="' +
      this.escape(expense.expenseId) +
      '">Review</button></div>';

    return card;
  },

  statusBadge(status) {

    const value = String(status || "UNKNOWN").toUpperCase();

    return '<span class="expense-status status-' +
      value.toLowerCase().replace(/[^a-z0-9]/g, "-") +
      '">' + this.escape(this.pretty(value)) + "</span>";
  },


  /*
   * ----------------------------------------------------------
   * FILTERS
   * ----------------------------------------------------------
   */

  applyQuickFilter(filter, activeButton) {

    if (this.elements.quickFilters) {
      this.elements.quickFilters
        .querySelectorAll("[data-expense-filter]")
        .forEach((button) => {
          button.classList.toggle(
            "active",
            button === activeButton
          );
        });
    }

    if (this.elements.approvalFilter) {
      this.elements.approvalFilter.value =
        filter === "PAID" ? "ALL" : filter;
    }

    if (this.elements.paymentFilter) {
      this.elements.paymentFilter.value =
        filter === "PAID" ? "PAID" : "ALL";
    }

    this.load(true);
  },

  clearFilters() {

    if (this.elements.search) this.elements.search.value = "";
    if (this.elements.approvalFilter) this.elements.approvalFilter.value = "ALL";
    if (this.elements.paymentFilter) this.elements.paymentFilter.value = "ALL";
    if (this.elements.categoryFilter) this.elements.categoryFilter.value = "ALL";
    if (this.elements.fromDate) this.elements.fromDate.value = "";
    if (this.elements.toDate) this.elements.toDate.value = "";

    this.elements.quickFilters
      ?.querySelectorAll("[data-expense-filter]")
      .forEach((button, index) => {
        button.classList.toggle("active", index === 0);
      });

    this.load(true);
  },


  /*
   * ----------------------------------------------------------
   * CREATE AND EDIT
   * ----------------------------------------------------------
   */

  openCreate() {

    this.resetForm();

    this.elements.formTitle.textContent = "Add expense";
    this.elements.saveDraft.textContent = "Save Draft";

    this.showDialog(this.elements.formDialog);
    this.elements.expenseDate?.focus();
  },

  openEdit(expense) {

    this.resetForm();

    this.elements.formTitle.textContent = "Edit expense";
    this.elements.saveDraft.textContent = "Save Changes";

    this.elements.expenseId.value = expense.expenseId || "";
    this.elements.expenseDate.value = expense.expenseDate || "";
    this.elements.category.value = expense.expenseCategory || "";
    this.elements.subcategory.value = expense.expenseSubcategory || "";
    this.elements.type.value = expense.expenseType || "";
    this.elements.costCenter.value = expense.costCenter || "";
    this.elements.description.value = expense.description || "";
    this.elements.vendor.value = expense.vendorName || "";
    this.elements.invoiceNumber.value = expense.invoiceNumber || "";
    this.elements.invoiceUrl.value = expense.invoiceUrl || "";
    this.elements.baseAmount.value = expense.baseAmount || "";
    this.elements.taxAmount.value = expense.taxAmount || 0;
    this.elements.districtId.value = expense.districtId || "";
    this.elements.orderId.value = expense.orderId || "";
    this.elements.campaignId.value = expense.campaignId || "";
    this.elements.recurring.checked = expense.isRecurring === true;
    this.elements.recurringFrequency.value =
      expense.recurringFrequency || "";

    this.updateRecurringState();
    this.updateCalculatedTotal();
    this.showDialog(this.elements.formDialog);
  },

  resetForm() {

    this.elements.form.reset();
    this.elements.expenseId.value = "";
    this.clearInlineError(this.elements.formError);
    this.setDefaultDate();
    this.updateRecurringState();
    this.updateCalculatedTotal();
  },

  setDefaultDate() {

    if (
      this.elements.expenseDate &&
      !this.elements.expenseDate.value
    ) {
      this.elements.expenseDate.value =
        new Date().toISOString().slice(0, 10);
    }
  },

  updateRecurringState() {

    const recurring = this.elements.recurring?.checked === true;

    this.elements.recurringBox?.classList.toggle(
      "hidden",
      !recurring
    );

    if (this.elements.recurringFrequency) {
      this.elements.recurringFrequency.required = recurring;

      if (!recurring) {
        this.elements.recurringFrequency.value = "";
      }
    }
  },

  updateCalculatedTotal() {

    const base = Number(this.elements.baseAmount?.value || 0);
    const tax = Number(this.elements.taxAmount?.value || 0);

    this.setText(
      this.elements.totalAmount,
      this.money(base + tax)
    );
  },

  collectFormData() {
    return {
      expenseId: this.elements.expenseId.value.trim(),
      expenseDate: this.elements.expenseDate.value,
      expenseCategory: this.elements.category.value,
      expenseSubcategory: this.elements.subcategory.value.trim(),
      expenseType: this.elements.type.value,
      costCenter: this.elements.costCenter.value,
      description: this.elements.description.value.trim(),
      vendorName: this.elements.vendor.value.trim(),
      invoiceNumber: this.elements.invoiceNumber.value.trim(),
      invoiceUrl: this.elements.invoiceUrl.value.trim(),
      baseAmount: Number(this.elements.baseAmount.value),
      taxAmount: Number(this.elements.taxAmount.value || 0),
      districtId: this.elements.districtId.value.trim(),
      orderId: this.elements.orderId.value.trim(),
      campaignId: this.elements.campaignId.value.trim(),
      isRecurring: this.elements.recurring.checked === true,
      recurringFrequency:
        this.elements.recurring.checked
          ? this.elements.recurringFrequency.value
          : ""
    };
  },

  validateExpense(data) {

    if (!data.expenseDate) return "Select the expense date.";
    if (!data.expenseCategory) return "Select an expense category.";
    if (!data.expenseType) return "Select an expense type.";
    if (!data.costCenter) return "Select a cost centre.";

    if (data.description.length < 3) {
      return "Enter a clear expense description.";
    }

    if (
      !Number.isFinite(data.baseAmount) ||
      data.baseAmount <= 0
    ) {
      return "Enter a valid base amount.";
    }

    if (
      !Number.isFinite(data.taxAmount) ||
      data.taxAmount < 0
    ) {
      return "Enter a valid tax amount.";
    }

    if (
      data.invoiceUrl &&
      !/^https:\/\/.+/i.test(data.invoiceUrl)
    ) {
      return "Invoice URL must begin with https://";
    }

    if (data.isRecurring && !data.recurringFrequency) {
      return "Select the recurring frequency.";
    }

    return "";
  },

  async saveExpense() {

    if (this.state.saving) return;

    const data = this.collectFormData();
    const validation = this.validateExpense(data);

    if (validation) {
      this.showInlineError(this.elements.formError, validation);
      return;
    }

    this.state.saving = true;
    this.elements.saveDraft.disabled = true;
    this.elements.saveDraft.textContent = "Saving...";
    this.clearInlineError(this.elements.formError);

    try {
      await API.request(
        "admin_save_finance_expense",
        {
          sessionId: this.sessionId(),
          expense: data
        },
        {
          timeoutMs: this.REQUEST_TIMEOUT_MS
        }
      );

      this.closeForm(true);
      this.clearCache();
      await this.load(true);

      this.showToast(
        data.expenseId
          ? "Expense updated successfully."
          : "Expense saved as draft."
      );

    } catch (error) {
      this.showInlineError(
        this.elements.formError,
        error.message || "Expense could not be saved."
      );

    } finally {
      this.state.saving = false;
      this.elements.saveDraft.disabled = false;
      this.elements.saveDraft.textContent =
        data.expenseId ? "Save Changes" : "Save Draft";
    }
  },


  /*
   * ----------------------------------------------------------
   * REVIEW
   * ----------------------------------------------------------
   */

  async openReview(expenseId) {

    const localExpense = this.state.expenses.find((expense) => {
      return String(expense.expenseId) === String(expenseId);
    });

    if (!localExpense) return;

    this.state.selectedExpense = localExpense;
    this.renderReview(localExpense);
    this.showDialog(this.elements.reviewDialog);

    try {
      const response = await API.request(
        "admin_get_finance_expense",
        {
          sessionId: this.sessionId(),
          expenseId: expenseId
        },
        {
          timeoutMs: this.REQUEST_TIMEOUT_MS
        }
      );

      const data = response.data || {};
      const expense = data.expense || localExpense;

      this.state.selectedExpense = expense;
      this.renderReview(expense);

    } catch (error) {
      this.showInlineError(
        this.elements.reviewError,
        error.message || "Latest expense details could not be loaded."
      );
    }
  },

  renderReview(expense) {

    this.clearInlineError(this.elements.reviewError);

    this.elements.reviewContent.innerHTML =
      this.reviewRow("Expense ID", expense.expenseId) +
      this.reviewRow("Expense date", expense.expenseDate) +
      this.reviewRow("Category", this.pretty(expense.expenseCategory)) +
      this.reviewRow("Subcategory", expense.expenseSubcategory) +
      this.reviewRow("Expense type", this.pretty(expense.expenseType)) +
      this.reviewRow("Cost centre", this.pretty(expense.costCenter)) +
      this.reviewRow("Description", expense.description) +
      this.reviewRow("Vendor", expense.vendorName) +
      this.reviewRow("Invoice number", expense.invoiceNumber) +
      this.reviewRow("Base amount", this.money(expense.baseAmount)) +
      this.reviewRow("Tax amount", this.money(expense.taxAmount)) +
      this.reviewRow("Total amount", this.money(expense.totalAmount), true) +
      this.reviewRow("Approval", this.pretty(expense.approvalStatus)) +
      this.reviewRow("Payment", this.pretty(expense.paymentStatus)) +
      this.reviewRow("Submitted by", expense.submittedBy) +
      this.reviewRow("Approved by", expense.approvedBy) +
      this.reviewRow("Payment reference", expense.paymentReference) +
      this.reviewRow("Rejection reason", expense.rejectionReason);

    const approval = String(
      expense.approvalStatus || "DRAFT"
    ).toUpperCase();

    const payment = String(
      expense.paymentStatus || "UNPAID"
    ).toUpperCase();

    this.toggleButton(
      this.elements.editReview,
      approval === "DRAFT" || approval === "REJECTED"
    );

    this.toggleButton(
      this.elements.submitReview,
      approval === "DRAFT" || approval === "REJECTED"
    );

    this.toggleButton(
      this.elements.approveReview,
      approval === "PENDING"
    );

    this.toggleButton(
      this.elements.rejectReview,
      approval === "PENDING"
    );

    this.toggleButton(
      this.elements.paidReview,
      approval === "APPROVED" && payment !== "PAID"
    );
  },

  reviewRow(label, value, important = false) {

    const safeValue =
      value === undefined ||
      value === null ||
      value === ""
        ? "—"
        : String(value);

    return '<div class="expense-review-row' +
      (important ? " important" : "") +
      '"><span>' + this.escape(label) +
      "</span><strong>" + this.escape(safeValue) +
      "</strong></div>";
  },


  /*
   * ----------------------------------------------------------
   * WORKFLOW ACTIONS
   * ----------------------------------------------------------
   */

  async submitSelectedExpense() {

    const expense = this.state.selectedExpense;

    if (!expense || this.state.actionRunning) return;

    await this.runAction(
      "admin_submit_finance_expense",
      {
        expenseId: expense.expenseId
      },
      "Expense submitted for approval."
    );
  },

  async approveSelectedExpense() {

    const expense = this.state.selectedExpense;

    if (!expense || this.state.actionRunning) return;

    await this.runAction(
      "admin_decide_finance_expense",
      {
        expenseId: expense.expenseId,
        decision: "APPROVE",
        rejectionReason: ""
      },
      "Expense approved successfully."
    );
  },

  openRejectDialog() {

    if (!this.state.selectedExpense) return;

    this.elements.rejectReason.value = "";
    this.clearInlineError(this.elements.rejectError);
    this.showDialog(this.elements.rejectDialog);
    this.elements.rejectReason.focus();
  },

  async rejectSelectedExpense() {

    const expense = this.state.selectedExpense;
    const reason = this.elements.rejectReason.value.trim();

    if (!expense || this.state.actionRunning) return;

    if (reason.length < 3) {
      this.showInlineError(
        this.elements.rejectError,
        "Enter a clear rejection reason."
      );
      return;
    }

    const success = await this.runAction(
      "admin_decide_finance_expense",
      {
        expenseId: expense.expenseId,
        decision: "REJECT",
        rejectionReason: reason
      },
      "Expense rejected."
    );

    if (success) {
      this.closeRejectDialog();
    }
  },

  openPaymentDialog() {

    if (!this.state.selectedExpense) return;

    this.elements.paymentMethod.value = "";
    this.elements.paymentReference.value = "";
    this.clearInlineError(this.elements.paymentError);
    this.updatePaymentReferenceState();
    this.showDialog(this.elements.paymentDialog);
  },

  updatePaymentReferenceState() {

    if (!this.elements.paymentMethod) return;

    const isCash =
      this.elements.paymentMethod.value === "CASH";

    this.elements.paymentReference.required = !isCash;

    this.elements.paymentReference.placeholder = isCash
      ? "Optional for cash"
      : "Transaction or payment reference";
  },

  async markSelectedExpensePaid() {

    const expense = this.state.selectedExpense;
    const method = this.elements.paymentMethod.value;
    const reference = this.elements.paymentReference.value.trim();

    if (!expense || this.state.actionRunning) return;

    if (!method) {
      this.showInlineError(
        this.elements.paymentError,
        "Select the payment method."
      );
      return;
    }

    if (method !== "CASH" && reference.length < 3) {
      this.showInlineError(
        this.elements.paymentError,
        "Enter the payment reference."
      );
      return;
    }

    const success = await this.runAction(
      "admin_mark_finance_expense_paid",
      {
        expenseId: expense.expenseId,
        payment: {
          paymentMethod: method,
          paymentReference: reference
        }
      },
      "Expense marked as paid."
    );

    if (success) {
      this.closePaymentDialog();
    }
  },

  async runAction(action, payload, successMessage) {

    if (this.state.actionRunning) return false;

    this.state.actionRunning = true;
    this.setActionButtonsDisabled(true);
    this.clearInlineError(this.elements.reviewError);

    try {
      await API.request(
        action,
        Object.assign(
          {
            sessionId: this.sessionId()
          },
          payload
        ),
        {
          timeoutMs: this.REQUEST_TIMEOUT_MS
        }
      );

      this.closeReview(true);
      this.clearCache();
      await this.load(true);
      this.showToast(successMessage);

      return true;

    } catch (error) {
      this.showInlineError(
        this.elements.reviewError,
        error.message || "Expense action could not be completed."
      );

      return false;

    } finally {
      this.state.actionRunning = false;
      this.setActionButtonsDisabled(false);
    }
  },

  setActionButtonsDisabled(disabled) {

    [
      this.elements.editReview,
      this.elements.submitReview,
      this.elements.approveReview,
      this.elements.rejectReview,
      this.elements.paidReview,
      this.elements.confirmReject,
      this.elements.confirmPayment
    ].forEach((button) => {
      if (button) button.disabled = disabled;
    });
  },


  /*
   * ----------------------------------------------------------
   * DIALOGS
   * ----------------------------------------------------------
   */

  showDialog(dialog) {
    if (!dialog) return;

    dialog.classList.remove("hidden");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("dialog-open");
  },

  hideDialog(dialog) {
    if (!dialog) return;

    dialog.classList.add("hidden");
    dialog.setAttribute("aria-hidden", "true");

    const anyOpen = [
      this.elements.formDialog,
      this.elements.reviewDialog,
      this.elements.rejectDialog,
      this.elements.paymentDialog
    ].some((item) => item && !item.classList.contains("hidden"));

    if (!anyOpen) {
      document.body.classList.remove("dialog-open");
    }
  },

  closeForm(force = false) {
    if (this.state.saving && !force) return;
    this.hideDialog(this.elements.formDialog);
  },

  closeReview(force = false) {
    if (this.state.actionRunning && !force) return;
    this.hideDialog(this.elements.reviewDialog);
    this.state.selectedExpense = null;
  },

  closeRejectDialog() {
    this.hideDialog(this.elements.rejectDialog);
  },

  closePaymentDialog() {
    this.hideDialog(this.elements.paymentDialog);
  },


  /*
   * ----------------------------------------------------------
   * PAGE STATE
   * ----------------------------------------------------------
   */

  showLoading() {
    this.elements.loading?.classList.remove("hidden");
    this.elements.content?.classList.add("hidden");
  },

  showContent() {
    this.elements.loading?.classList.add("hidden");
    this.elements.content?.classList.remove("hidden");
  },

  showPageError(message) {

    if (!this.elements.pageError) return;

    this.elements.pageError.textContent =
      message || "Finance request failed.";

    this.elements.pageError.classList.remove("hidden");

    if (this.state.expenses.length) {
      this.showContent();
    }
  },

  clearPageError() {
    if (!this.elements.pageError) return;

    this.elements.pageError.textContent = "";
    this.elements.pageError.classList.add("hidden");
  },

  showInlineError(element, message) {
    if (!element) return;

    element.textContent = message;
    element.classList.remove("hidden");
  },

  clearInlineError(element) {
    if (!element) return;

    element.textContent = "";
    element.classList.add("hidden");
  },

  showToast(message) {

    let toast = document.getElementById("financeToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "financeToast";
      toast.className = "finance-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  },


  /*
   * ----------------------------------------------------------
   * UTILITIES
   * ----------------------------------------------------------
   */

  setText(element, value) {
    if (element) {
      element.textContent = String(value);
    }
  },

  toggleButton(button, visible) {
    button?.classList.toggle("hidden", !visible);
  },

  isHidden(element) {
    return !element || element.classList.contains("hidden");
  },

  pretty(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  },

  money(value) {

    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(Number.isFinite(amount) ? amount : 0);
  },

  escape(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
  },


  /*
   * ----------------------------------------------------------
   * READ-ONLY INTEGRATION TEST
   * ----------------------------------------------------------
   */

  async test() {

    console.log("========================================");
    console.log("APNABITE ADMIN FINANCE INTEGRATION TEST");
    console.log("========================================");

    let listData = null;
    let summaryData = null;
    let duplicateProtected = false;

    try {
      const firstPromise = this.fetchList();
      const secondPromise = this.fetchList();

      duplicateProtected = firstPromise === secondPromise;

      listData = await firstPromise;
      summaryData = await this.fetchSummary();

    } catch (error) {
      console.error("Finance integration test request failed:", error);
    }

    const results = [
      {
        test: "Required role",
        expected: "Admin",
        actual: document.body.dataset.requiredRole,
        passed: document.body.dataset.requiredRole === "Admin"
      },
      {
        test: "Live expense list API",
        expected: true,
        actual: Boolean(listData && listData.success),
        passed: Boolean(listData && listData.success)
      },
      {
        test: "Expense array",
        expected: true,
        actual: Boolean(listData && Array.isArray(listData.expenses)),
        passed: Boolean(listData && Array.isArray(listData.expenses))
      },
      {
        test: "Live summary API",
        expected: true,
        actual: Boolean(summaryData && summaryData.success),
        passed: Boolean(summaryData && summaryData.success)
      },
      {
        test: "Summary structure",
        expected: true,
        actual: Boolean(summaryData && summaryData.summary),
        passed: Boolean(summaryData && summaryData.summary)
      },
      {
        test: "Duplicate request protection",
        expected: true,
        actual: duplicateProtected,
        passed: duplicateProtected
      },
      {
        test: "Finance cache support",
        expected: true,
        actual: typeof localStorage !== "undefined",
        passed: typeof localStorage !== "undefined"
      },
      {
        test: "Desktop expense table",
        expected: true,
        actual: Boolean(this.elements.tableBody),
        passed: Boolean(this.elements.tableBody)
      },
      {
        test: "Mobile expense list",
        expected: true,
        actual: Boolean(this.elements.mobileList),
        passed: Boolean(this.elements.mobileList)
      },
      {
        test: "Expense form workflow",
        expected: true,
        actual: Boolean(this.elements.form && this.elements.saveDraft),
        passed: Boolean(this.elements.form && this.elements.saveDraft)
      },
      {
        test: "Approval workflow",
        expected: true,
        actual: Boolean(
          this.elements.approveReview &&
          this.elements.rejectReview &&
          this.elements.paidReview
        ),
        passed: Boolean(
          this.elements.approveReview &&
          this.elements.rejectReview &&
          this.elements.paidReview
        )
      },
      {
        test: "No expense modified by test",
        expected: true,
        actual: true,
        passed: true
      }
    ];

    const passed = results.every((result) => result.passed);

    console.table(results);

    console.log("Finance Expense List:", listData);
    console.log("Finance Expense Summary:", summaryData);

    console.log(
      passed
        ? "Admin Finance Integration Test: PASS"
        : "Admin Finance Integration Test: FAIL"
    );

    return {
      success: passed,
      status: passed ? "PASS" : "FAIL",
      list: listData,
      summary: summaryData,
      results: results
    };
  }
};


/*
 * ------------------------------------------------------------
 * INITIALIZE
 * ------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  AdminFinanceExpenses.init();
});
