class ConfigManager {
  constructor(store) {
    this.store = store;
  }

  set(key, value) {
    this.store.setConfig(key, value);
  }

  get(key, defaultValue = null) {
    return this.store.getConfig(key, defaultValue);
  }
}

module.exports = ConfigManager;
