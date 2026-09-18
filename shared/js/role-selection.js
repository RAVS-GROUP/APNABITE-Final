/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/role-selection.js
 * PURPOSE: User role selection screen controller
 * VERSION: 1.0.0
 * ============================================================
 */

const RoleSelection = {

  STORAGE_KEY:
    "apnabite_selected_role",

  ALLOWED_ROLES: [
    "Customer",
    "Food Partner",
    "Rider"
  ],

  selectedRole:
    "",

  elements: {},


  init() {

    this.elements = {

      cards:
        Array.from(
          document.querySelectorAll(
            ".role-card"
          )
        ),

      actions:
        document.getElementById(
          "roleActions"
        ),

      selectedRoleText:
        document.getElementById(
          "selectedRoleText"
        ),

      loginButton:
        document.getElementById(
          "roleLoginButton"
        ),

      registerButton:
        document.getElementById(
          "roleRegisterButton"
        ),

      message:
        document.getElementById(
          "roleMessage"
        )
    };


    this.elements.cards.forEach(
      (card) => {

        card.addEventListener(
          "click",
          () => {

            this.selectRole(
              card.dataset.role
            );
          }
        );
      }
    );


    this.elements.loginButton
      .addEventListener(
        "click",
        () => {

          this.goToLogin();
        }
      );


    this.elements.registerButton
      .addEventListener(
        "click",
        () => {

          this.goToRegistration();
        }
      );


    const savedRole =
      this.getSavedRole();


    if (
      savedRole &&
      this.isAllowedRole(
        savedRole.role
      )
    ) {

      this.selectRole(
        savedRole.role
      );
    }


    console.log(
      "ApnaBite Role Selection initialized."
    );
  },


  isAllowedRole(role) {

    return this.ALLOWED_ROLES
      .includes(
        String(role || "")
      );
  },


  selectRole(role) {

    if (
      !this.isAllowedRole(
        role
      )
    ) {

      this.showError(
        "Please select a valid ApnaBite role."
      );

      return {
        success: false,
        reason: "INVALID_ROLE"
      };
    }


    this.clearMessage();

    this.selectedRole =
      role;


    this.elements.cards.forEach(
      (card) => {

        const selected =
          card.dataset.role ===
          role;

        card.classList.toggle(
          "selected",
          selected
        );

        card.setAttribute(
          "aria-pressed",
          selected
            ? "true"
            : "false"
        );
      }
    );


    AppStorage.set(
      this.STORAGE_KEY,
      {
        role:
          role,

        selectedAt:
          new Date().toISOString()
      }
    );


    this.elements.selectedRoleText
      .textContent =
        "Selected role: " +
        this.getRoleLabel(
          role
        );


    this.elements.actions
      .classList.remove(
        "hidden"
      );


    return {
      success: true,
      selected: true,
      role:
        role
    };
  },


  getSavedRole() {

    const saved =
      AppStorage.get(
        this.STORAGE_KEY,
        null
      );


    if (
      !saved ||
      typeof saved !== "object"
    ) {

      return null;
    }


    return saved;
  },


  getSelectedRole() {

    return this.selectedRole ||
      (
        this.getSavedRole()
          ? this.getSavedRole().role
          : ""
      );
  },


  clearSelectedRole() {

    this.selectedRole =
      "";

    AppStorage.remove(
      this.STORAGE_KEY
    );


    this.elements.cards.forEach(
      (card) => {

        card.classList.remove(
          "selected"
        );

        card.setAttribute(
          "aria-pressed",
          "false"
        );
      }
    );


    this.elements.actions
      .classList.add(
        "hidden"
      );
  },


  goToLogin() {

    const role =
      this.getSelectedRole();


    if (!role) {

      this.showError(
        "Please select your role first."
      );

      return;
    }


    window.location.href =
      "login.html?role=" +
      encodeURIComponent(
        role
      );
  },


  goToRegistration() {

    const role =
      this.getSelectedRole();


    if (!role) {

      this.showError(
        "Please select your role first."
      );

      return;
    }


    window.location.href =
      "register.html?role=" +
      encodeURIComponent(
        role
      );
  },


  getRoleLabel(role) {

    if (
      role === "Food Partner"
    ) {

      return "Food Partner";
    }


    if (
      role === "Rider"
    ) {

      return "Delivery Partner";
    }


    return "Customer";
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


  /**
   * Browser console:
   *
   * RoleSelection.test()
   */

  test() {

    console.log(
      "========================================"
    );

    console.log(
      "APNABITE ROLE SELECTION TEST"
    );

    console.log(
      "========================================"
    );


    const roles = [
      "Customer",
      "Food Partner",
      "Rider"
    ];


    const results =
      roles.map(
        (role) => {

          const selection =
            this.selectRole(
              role
            );


          const saved =
            this.getSavedRole();


          const passed =
            selection.success === true &&
            saved &&
            saved.role === role &&
            this.getSelectedRole() ===
              role;


          return {
            role:
              role,

            selected:
              selection.success,

            savedRole:
              saved
                ? saved.role
                : "",

            passed:
              passed
          };
        }
      );


    const passed =
      results.every(
        (result) =>
          result.passed
      );


    this.selectRole(
      "Customer"
    );


    console.table(
      results
    );


    console.log(
      passed
        ? "Role Selection Test: PASS"
        : "Role Selection Test: FAIL"
    );


    return {
      success:
        passed,

      status:
        passed
          ? "PASS"
          : "FAIL",

      selectedRole:
        this.getSelectedRole(),

      results:
        results
    };
  }

};


document.addEventListener(
  "DOMContentLoaded",
  () => {

    RoleSelection.init();
  }
);
