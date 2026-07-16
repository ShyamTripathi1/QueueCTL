const Queue = require('../core/queue');

function list() {
  const queue = new Queue();
  queue.init();

  const jobs = queue.getJobsByState('dead');
  console.log('--- Dead Letter Queue (DLQ) ---');
  
  if (jobs.length === 0) {
    console.log('DLQ is empty.');
  } else {
    jobs.forEach(job => {
      console.log(`ID: ${job.id} | Command: "${job.command}" | Failed Attempts: ${job.attempts}`);
    });
  }

  queue.close();
}

function retry(jobId) {
  const queue = new Queue();
  queue.init();

  try {
    queue.retryDead(jobId);
    console.log(`Job ${jobId} moved from DLQ back to pending.`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  } finally {
    queue.close();
  }
}

module.exports = {
  list,
  retry
};
