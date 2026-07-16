const Queue = require('../core/queue');

module.exports = function statusCmd() {
  const queue = new Queue();
  queue.init();

  const states = ['pending', 'processing', 'completed', 'failed', 'dead'];
  console.log('--- Queue Status ---');
  
  states.forEach(state => {
    const jobs = queue.getJobsByState(state);
    console.log(`${state.toUpperCase()}: ${jobs.length} job(s)`);
  });

  queue.close();
};
