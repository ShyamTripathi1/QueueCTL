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
  // We wait for the loop to naturally exit or just give it some time
  setTimeout(() => {
    queue.close();
    process.exit(0);
  }, 1500); // Give enough time for the current job to finish if it's quick, or wait longer.
  // Actually, wait for the worker loop to exit:
  // But wait, if processJob is running, we shouldn't exit until it's done.
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
