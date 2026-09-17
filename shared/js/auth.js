const Auth = {

  isLoggedIn() {
    return SessionManager.isLoggedIn();
  },

  getUser() {
    const session = SessionManager.get();

    return session
      ? session.user
      : null;
  },

  logout() {
    SessionManager.clear();
  }
};

