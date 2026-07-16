const fs = require('fs');
const path = require('path');
const SqliteStore = require('../../src/storage/sqliteStore');
const Queue = require('../../src/core/queue');
const Worker = require('../../src/core/worker');
const Job = require('../../src/core/job');

const TEST_DB_PATH = path.join(__dirname, 'test.db');

describe('QueueCTL Core Logic', () => {
  let queue;
  let store;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    store = new SqliteStore(TEST_DB_PATH);
    queue = new Queue(store);
    queue.init();
    queue.store.setConfig('max-retries', '2'); // lower max retries for faster tests
    queue.store.setConfig('backoff-base', '1'); // base 1 -> 1s delay
  });

  afterEach(() => {
    queue.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch (e) {} // ignore locked file errors on windows if any
    }
  });

  test('1. A basic job completes successfully', async () => {
    const job = queue.enqueue('echo "hello world"');
    expect(job.state).toBe('pending');

    const worker = new Worker(queue);
    
    // Acquire manually and process
    const acquiredJob = queue.acquire(worker.workerId);
    expect(acquiredJob.id).toBe(job.id);
    expect(acquiredJob.state).toBe('processing');

    await worker.processJob(acquiredJob);
    
    const finalJob = queue.getJob(job.id);
    expect(finalJob.state).toBe('completed');
  });

  test('4. An invalid/non-existent command fails gracefully', async () => {
    const job = queue.enqueue('non_existent_command_123');
    const worker = new Worker(queue);
    
    const acquiredJob = queue.acquire(worker.workerId);
    await worker.processJob(acquiredJob);
    
    const finalJob = queue.getJob(job.id);
    expect(finalJob.state).toBe('failed');
    expect(finalJob.attempts).toBe(1);
  });

  test('2. A failing job retries with correct exponential backoff and lands in DLQ', async () => {
    const job = queue.enqueue('exit 1', 2);
    const worker = new Worker(queue);

    // Attempt 1
    let acquiredJob = queue.acquire(worker.workerId);
    await worker.processJob(acquiredJob);
    let state = queue.getJob(job.id);
    expect(state.state).toBe('failed');
    expect(state.attempts).toBe(1);

    // Backoff delay is 1^1 = 1 second. Wait for setTimeout in worker to fire.
    await new Promise(r => setTimeout(r, 1100));

    // Attempt 2
    acquiredJob = queue.acquire(worker.workerId);
    expect(acquiredJob).not.toBeNull();
    await worker.processJob(acquiredJob);
    
    state = queue.getJob(job.id);
    expect(state.state).toBe('dead');
    expect(state.attempts).toBe(2);
  }, 10000);

  test('3. Multiple workers running concurrently never process the same job twice (race condition)', async () => {
    const job = queue.enqueue('sleep 1');
    
    // Simulate 5 workers trying to acquire at the exact same millisecond
    const workers = Array.from({ length: 5 }, () => new Worker(queue));
    
    // Try to acquire the single job from all 5 workers simultaneously
    const acquiredJobs = workers.map(w => queue.acquire(w.workerId));
    
    // Only one worker should have got the job (not null)
    const successfulAcquires = acquiredJobs.filter(j => j !== null);
    
    expect(successfulAcquires.length).toBe(1);
    expect(successfulAcquires[0].id).toBe(job.id);
  });

  test('5. Job data survives a simulated restart', () => {
    // 1. Enqueue job
    const job = queue.enqueue('echo "test"');
    queue.store.updateJobState(job.id, 'processing', { locked_by: 'worker-1' });
    
    // 2. Simulate crash by closing DB connection without processing
    queue.close();
    
    // 3. Restart process (new store instance pointing to same file)
    const newStore = new SqliteStore(TEST_DB_PATH);
    const newQueue = new Queue(newStore);
    newQueue.init();
    
    const recoveredJob = newQueue.getJob(job.id);
    expect(recoveredJob).toBeDefined();
    expect(recoveredJob.state).toBe('processing');
    expect(recoveredJob.locked_by).toBe('worker-1');
    
    newQueue.close();
  });
});
