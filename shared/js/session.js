const SessionManager = {

  KEY: "apnabite_session",

  set(session) {
    AppStorage.set(this.KEY, session);
  },

  get() {
    return AppStorage.get(this.KEY, null);
  },

  clear() {
    AppStorage.remove(this.KEY);
  },

  isLoggedIn() {
    return !!this.get();
  }
};
