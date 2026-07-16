const Job = require('./job');
const SqliteStore = require('../storage/sqliteStore');


class Queue {
  constructor(store = new SqliteStore()) {
    this.store = store;
  }

  init() {
    this.store.init();
  }

  /**
   * Enqueues a new job
   * @param {string} command - The command to run
   * @param {number} maxRetries - Max retries from config
   * @returns {Object} The created job
   */
  enqueue(command, maxRetries = 3) {
    const job = Job.create(command, maxRetries);
    Job.validate(job);
    return this.store.saveJob(job);
  }

  /**
   * Attempts to acquire a pending job for processing
   * @param {string} workerId - Unique ID of the worker
   * @returns {Object|null} The acquired job, or null if none available
   */
  acquire(workerId) {
    return this.store.acquireJob(workerId);
  }

  /**
   * Marks a job as completed
   * @param {string} jobId 
   */
  complete(jobId) {
    this.store.updateJobState(jobId, 'completed');
  }

  /**
   * Marks a job as failed, or dead if retries exceeded
   * @param {string} jobId 
   * @returns {string} The new state ('failed' or 'dead')
   */
  fail(jobId) {
    const job = this.store.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const newAttempts = job.attempts + 1;
    let newState = 'failed';
    
    if (newAttempts >= job.max_retries) {
      newState = 'dead';
    }

    this.store.updateJobState(jobId, newState, { attempts: newAttempts });
    return newState;
  }

  /**
   * Resets a failed job back to pending
   * @param {string} jobId 
   */
  retryFailed(jobId) {
    const job = this.store.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.state !== 'failed') throw new Error(`Job ${jobId} is not in failed state`);
    
    this.store.updateJobState(jobId, 'pending', { locked_by: null });
  }

  /**
   * Resets a dead job back to pending (DLQ retry)
   * @param {string} jobId 
   */
  retryDead(jobId) {
    const job = this.store.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.state !== 'dead') throw new Error(`Job ${jobId} is not in dead state`);
    
    this.store.updateJobState(jobId, 'pending', { 
      locked_by: null,
      attempts: 0 // Reset attempts when reviving from DLQ
    });
  }

  getJobsByState(state) {
    return this.store.getJobsByState(state);
  }

  getJob(jobId) {
    return this.store.getJob(jobId);
  }

  close() {
    this.store.close();
  }
}

module.exports = Queue;
