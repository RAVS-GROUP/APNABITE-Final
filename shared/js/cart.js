const CartManager = {

  KEY: "apnabite_cart",

  get() {
    return AppStorage.get(this.KEY, {
      chefId: null,
      items: []
    });
  },

  save(cart) {
    AppStorage.set(this.KEY, cart);
  },

  clear() {
    AppStorage.remove(this.KEY);
  }
};
