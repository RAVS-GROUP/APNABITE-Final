const Validation = {

  required(value) {
    return (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    );
  },

  mobile(value) {
    return /^[6-9]\d{9}$/.test(
      String(value).trim()
    );
  },

  email(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      String(value).trim()
    );
  }
};
