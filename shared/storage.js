const AppStorage = {

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);

      return value === null
        ? defaultValue
        : JSON.parse(value);

    } catch (error) {
      console.error("Storage read error:", error);
      return defaultValue;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  }
};
