const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const PID_FILE = path.join(process.cwd(), 'data', 'workers.pid');

function start(options) {
  const count = parseInt(options.count, 10);
  if (isNaN(count) || count < 1) {
    console.error('Count must be a positive integer');
    process.exit(1);
  }

  const pids = [];
  const workerScript = path.join(__dirname, '..', 'core', 'worker-process.js');

  for (let i = 0; i < count; i++) {
    const child = fork(workerScript, [], {
      detached: true,
      stdio: 'ignore' // run in background
    });
    
    pids.push(child.pid);
    child.disconnect(); // sever IPC to let parent exit
    child.unref(); // allow the main process to exit independently
  }

  // Save PIDs to file
  let existingPids = [];
  if (fs.existsSync(PID_FILE)) {
    try {
      existingPids = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
    } catch { /* ignore */ }
  }
  
  const allPids = existingPids.concat(pids);
  fs.writeFileSync(PID_FILE, JSON.stringify(allPids));
  
  console.log(`Started ${count} worker(s) in the background. PIDs: ${pids.join(', ')}`);
}

function stop() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('No workers are currently running (no PID file found).');
    return;
  }

  let pids = [];
  try {
    pids = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
  } catch {
    console.error('Failed to read PID file.');
    process.exit(1);
  }

  if (pids.length === 0) {
    console.log('No workers to stop.');
    return;
  }

  console.log(`Stopping ${pids.length} worker(s)...`);
  pids.forEach(pid => {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Sent SIGTERM to worker ${pid}`);
    } catch {
      console.log(`Worker ${pid} already stopped or not found.`);
    }
  });

  // Clear the PID file
  fs.unlinkSync(PID_FILE);
  console.log('All workers stopped (graceful shutdown initiated).');
}

module.exports = {
  start,
  stop
};
