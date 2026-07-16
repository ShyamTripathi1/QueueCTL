/**
 * Abstract storage interface for QueueCTL
 */
class Store {
  async init() {
    throw new Error('Not implemented');
  }

  async saveJob(job) {
    throw new Error('Not implemented');
  }

  async getJob(id) {
    throw new Error('Not implemented');
  }

  async updateJobState(id, oldState, newState, additionalUpdates = {}) {
    throw new Error('Not implemented');
  }

  async getJobsByState(state) {
    throw new Error('Not implemented');
  }

  async acquireJob(workerId) {
    throw new Error('Not implemented');
  }

  async setConfig(key, value) {
    throw new Error('Not implemented');
  }

  async getConfig(key, defaultValue) {
    throw new Error('Not implemented');
  }
}

module.exports = Store;
