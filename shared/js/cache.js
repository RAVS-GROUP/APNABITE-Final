const AppCache = {

  prefix: "apnabite_cache_",

  set(key, value, ttlMs = 300000) {

    AppStorage.set(this.prefix + key, {
      value: value,
      expiresAt: Date.now() + ttlMs
    });
  },

  get(key) {

    const cached = AppStorage.get(
      this.prefix + key,
      null
    );

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.remove(key);
      return null;
    }

    return cached.value;
  },

  remove(key) {
    AppStorage.remove(this.prefix + key);
  }
};
