const Queue = require('../core/queue');
const ConfigManager = require('../config/configManager');

module.exports = function enqueueCmd(jobJsonString) {
  try {
    // Normalize: replace smart-quotes, trim whitespace
    let raw = jobJsonString.trim();

    // On Windows CMD, single-quotes are passed literally — convert them to double-quotes
    // Only do this if the string starts with single-quote (Windows CMD won't strip them)
    if (raw.startsWith("'") && raw.endsWith("'")) {
      raw = raw.slice(1, -1);
    }

    // Attempt to parse as JSON
    let jobData;
    try {
      jobData = JSON.parse(raw);
    } catch {
      // If it still fails, wrap as a plain command (user passed just the command string)
      console.error('Failed to enqueue job: Invalid JSON. Make sure to pass a valid JSON string.');
      console.error('Example (Windows CMD): node bin/queuectl.js enqueue "{\\"id\\":\\"job1\\",\\"command\\":\\"echo hello\\"}"');
      console.error('Example (Linux/Mac):   node bin/queuectl.js enqueue \'{"id":"job1","command":"echo hello"}\'');
      process.exit(1);
    }

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
