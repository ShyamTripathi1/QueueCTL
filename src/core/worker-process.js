const Worker = require('./worker');
const Queue = require('./queue');

const queue = new Queue();
queue.init();
const worker = new Worker(queue);

console.log(`[Worker Process] Started worker ${worker.workerId}`);

worker.start().catch(err => {
  console.error(`[Worker Process] Error: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
function shutdown() {
  console.log(`[Worker Process] Shutting down gracefully...`);
  worker.stop();
  // The worker.start() promise will resolve once the loop exits.
  // We poll until the worker's loop has naturally finished, then clean up.
  const check = setInterval(() => {
    if (!worker.isRunning && !worker.currentJobProcess) {
      clearInterval(check);
      queue.close();
      process.exit(0);
    }
  }, 200);

  // Safety net: force exit after 30 seconds if a job is stuck
  setTimeout(() => {
    console.error('[Worker Process] Forced exit after timeout.');
    queue.close();
    process.exit(1);
  }, 30000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
