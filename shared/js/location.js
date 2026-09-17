const LocationManager = {

  current: null,

  async getCurrentPosition() {

    if (!navigator.geolocation) {
      throw new Error(
        "Location is not supported on this device."
      );
    }

    return new Promise((resolve, reject) => {

      navigator.geolocation.getCurrentPosition(
        position => {

          this.current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          resolve(this.current);
        },

        error => {
          reject(error);
        },

        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000
        }
      );
    });
  }
};

