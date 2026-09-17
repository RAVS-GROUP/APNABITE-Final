const ThemeManager = {

  currentTheme: null,

  apply(theme) {

    this.currentTheme = theme || null;

    if (!theme) {
      return;
    }

    if (theme.primaryColor) {
      document.documentElement.style.setProperty(
        "--theme-primary",
        theme.primaryColor
      );
    }

    if (theme.secondaryColor) {
      document.documentElement.style.setProperty(
        "--theme-secondary",
        theme.secondaryColor
      );
    }
  }
};
