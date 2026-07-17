const { exec } = require('child_process');
const Queue = require('./queue');
const { calculateBackoff } = require('./backoff');
const ConfigManager = require('../config/configManager');
const crypto = require('crypto');

class Worker {
  constructor(queue = new Queue()) {
    this.workerId = crypto.randomUUID();
    this.queue = queue;
    this.isRunning = false;
    this.currentJobProcess = null;
    this.pollInterval = 1000;
    this.configManager = new ConfigManager(queue.store);
  }

  async start() {
    this.isRunning = true;
    await this.loop();
  }

  stop() {
    this.isRunning = false;
    // Note: We don't kill currentJobProcess to allow graceful shutdown
  }

  async loop() {
    while (this.isRunning) {
      try {
        const job = this.queue.acquire(this.workerId);
        
        if (job) {
          await this.processJob(job);
        } else {
          // Wait before polling again
          await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }
      } catch (err) {
        console.error(`[Worker ${this.workerId}] Error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
  }

  processJob(job) {
    return new Promise((resolve) => {
      this.currentJobProcess = exec(job.command, (error) => {
        this.currentJobProcess = null;
        
        if (error) {
          this.handleFailure(job).then(resolve);
        } else {
          this.queue.complete(job.id);
          resolve();
        }
      });
    });
  }

  async handleFailure(job) {
    const newState = this.queue.fail(job.id);
    
    if (newState === 'failed') {
      const base = parseInt(this.configManager.get('backoff-base', 2), 10);
      const delayMs = calculateBackoff(job.attempts, base);
      
      // Schedule transition back to pending
      setTimeout(() => {
        try {
          this.queue.retryFailed(job.id);
        } catch {
          // Job might have been modified or deleted
        }
      }, delayMs);
    }
  }
}

module.exports = Worker;
