const Queue = require('../core/queue');
const ConfigManager = require('../config/configManager');

module.exports = function enqueueCmd(jobJsonString) {
  try {
    const jobData = JSON.parse(jobJsonString);
    if (!jobData.command) {
      console.error('Error: Job JSON must contain a "command" field.');
      process.exit(1);
    }

    const queue = new Queue();
    queue.init();
    
    const config = new ConfigManager(queue.store);
    const maxRetries = parseInt(config.get('max-retries', 3), 10);

    // Create job using core logic
    const Job = require('../core/job');
    const job = Job.create(jobData.command, maxRetries);
    
    // Override ID if user provided one
    if (jobData.id) {
      job.id = jobData.id;
    }

    // Save to queue
    const savedJob = queue.store.saveJob(job);
    console.log(`Enqueued job: ${savedJob.id}`);
    
    queue.close();
  } catch (err) {
    console.error(`Failed to enqueue job: ${err.message}`);
    process.exit(1);
  }
};
