const Formatter = {

  currency(value) {

    const amount = Number(value || 0);

    return "₹" +
      amount.toLocaleString("en-IN", {
        maximumFractionDigits: 2
      });
  },

  distance(km) {

    const value = Number(km || 0);

    return value < 1
      ? Math.round(value * 1000) + " m"
      : value.toFixed(1) + " km";
  }
};

