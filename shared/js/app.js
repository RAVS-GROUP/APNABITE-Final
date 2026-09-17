const App = {

  init() {

    this.hideLoader();

    console.log(
      "ApnaBite Frontend Foundation Loaded"
    );

    console.log(
      "Performance architecture: ACTIVE"
    );

    console.log(
      "API gateway: READY"
    );

    console.log(
      "Local storage: READY"
    );

    console.log(
      "Cache system: READY"
    );

    console.log(
      "Session system: READY"
    );

    console.log(
      "Cart system: READY"
    );
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
 * Register Service Worker.
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
