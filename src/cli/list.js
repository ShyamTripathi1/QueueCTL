const Queue = require('../core/queue');

module.exports = function listCmd(options) {
  const queue = new Queue();
  queue.init();

  const state = options.state;
  const validStates = ['pending', 'processing', 'completed', 'failed', 'dead'];
  
  if (!validStates.includes(state)) {
    console.error(`Invalid state. Must be one of: ${validStates.join(', ')}`);
    process.exit(1);
  }

  const jobs = queue.getJobsByState(state);
  console.log(`--- ${state.toUpperCase()} Jobs ---`);
  
  if (jobs.length === 0) {
    console.log('No jobs found.');
  } else {
    jobs.forEach(job => {
      console.log(`ID: ${job.id} | Command: "${job.command}" | Attempts: ${job.attempts} | Updated: ${job.updated_at}`);
    });
  }

  queue.close();
};
