const { v4: uuidv4 } = require('uuid');

const VALID_STATES = ['pending', 'processing', 'completed', 'failed', 'dead'];

class Job {
  /**
   * Creates a new job object
   * @param {string} command - The shell command to execute
   * @param {number} maxRetries - Maximum number of retries before marking as dead
   * @returns {Object} Job object
   */
  static create(command, maxRetries = 3) {
    if (!command || typeof command !== 'string') {
      throw new Error('Invalid command: must be a non-empty string');
    }

    const now = new Date().toISOString();
    return {
      id: uuidv4(),
      command,
      state: 'pending',
      attempts: 0,
      max_retries: maxRetries,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Validates a job object
   * @param {Object} job - The job object to validate
   * @returns {boolean} True if valid, throws error otherwise
   */
  static validate(job) {
    if (!job || typeof job !== 'object') {
      throw new Error('Invalid job object');
    }
    if (!job.id || typeof job.id !== 'string') {
      throw new Error('Invalid job: missing or invalid id');
    }
    if (!job.command || typeof job.command !== 'string') {
      throw new Error('Invalid job: missing or invalid command');
    }
    if (!VALID_STATES.includes(job.state)) {
      throw new Error(`Invalid job: state must be one of ${VALID_STATES.join(', ')}`);
    }
    if (typeof job.attempts !== 'number' || job.attempts < 0) {
      throw new Error('Invalid job: attempts must be a non-negative number');
    }
    if (typeof job.max_retries !== 'number' || job.max_retries < 0) {
      throw new Error('Invalid job: max_retries must be a non-negative number');
    }
    if (!job.created_at || typeof job.created_at !== 'string') {
      throw new Error('Invalid job: missing or invalid created_at');
    }
    if (!job.updated_at || typeof job.updated_at !== 'string') {
      throw new Error('Invalid job: missing or invalid updated_at');
    }
    return true;
  }
}

module.exports = Job;
