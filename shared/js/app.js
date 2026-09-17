/**
 * ============================================================
 * APNABITE FRONTEND
 * FILE: shared/js/app.js
 * PURPOSE: Application bootstrap and API connection test
 * ============================================================
 */

const App = {

  async init() {

    this.hideLoader();

    console.log(
      "ApnaBite Frontend Foundation Loaded"
    );

    console.log(
      "Testing Backend API..."
    );

    await this.testBackend();

  },


  async testBackend() {

    try {

      const result =
        await API.request("health");

      console.log(
        "BACKEND CONNECTION: PASS",
        result
      );

    } catch (error) {

      console.error(
        "BACKEND CONNECTION: FAIL",
        error
      );
    }
  },


  hideLoader() {

    const loader =
      document.getElementById("appLoader");

    if (loader) {

      loader.classList.add("hidden");
    }
  }

};


document.addEventListener(
  "DOMContentLoaded",
  () => {
    App.init();
  }
);


/*
 * Service Worker
 */
if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js")
        .then(() => {

          console.log(
            "ApnaBite Service Worker registered."
          );

        })
        .catch(error => {

          console.error(
            "Service Worker registration failed:",
            error
          );

        });

    }
  );
}
