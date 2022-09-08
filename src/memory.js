module.exports = class Memory {

  constructor() {
    this.ALERTS = {}
  }

  async get(key) {
    return this.ALERTS[key];
  }

  async getAll() {
    return { ...this.ALERTS };
  }

  set(key, value) {
    this.ALERTS[key] = value;
  }

  unset(key) {
    delete this.ALERTS[key];
  }

  async search(keys) {
    return this.getAll(...keys);
  }
}