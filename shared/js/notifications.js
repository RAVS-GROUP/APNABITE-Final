const NotificationManager = {

  unreadCount: 0,

  setUnreadCount(count) {
    this.unreadCount = Number(count || 0);
  },

  getUnreadCount() {
    return this.unreadCount;
  }
};
