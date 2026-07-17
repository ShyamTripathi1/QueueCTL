# QueueCTL

QueueCTL is a production-quality, CLI-based background job queue system built in Node.js. It features a persistent SQLite storage layer, robust job retry mechanisms with exponential backoff, a Dead Letter Queue (DLQ), and a concurrent multi-worker architecture with atomic locking.

## Setup Instructions

Ensure you have Node.js (v14+) installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ShyamTripathi1/QueueCTL.git
   cd QueueCTL
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Link the CLI command globally (optional but recommended):**
   ```bash
   npm link
   ```
   *If you skip `npm link`, you can replace `queuectl` in the commands below with `node bin/queuectl.js` (e.g., `node bin/queuectl.js status`). This is especially recommended for Windows users.*

## Usage Examples

The following commands use `node bin/queuectl.js` to ensure they work smoothly across all environments (especially Windows CMD/PowerShell) without needing to rely on a global `npm link`.

### 1. Configure the Queue
Configure global settings like retry limits and backoff base. These are persisted in the database.
```cmd
node bin/queuectl.js config set max-retries 3
node bin/queuectl.js config set backoff-base 2
```
*Output:*
```
Configuration updated: max-retries = 3
```

### 2. Enqueue a Job
Jobs are passed as JSON strings. 

**Windows CMD** — The safest way to enqueue from CMD is to create a small one-line JS helper:

```cmd
node -e "require('./src/cli/enqueue')('{\"id\":\"job1\",\"command\":\"echo Hello World\"}')"
```

Or, save the JSON to a file and pass it:
```cmd
echo {"id":"job1","command":"echo Hello World"} > job.json
node -e "require('./src/cli/enqueue')(require('fs').readFileSync('./job.json','utf8').trim())"
```

**Linux / Mac:**
```bash
node bin/queuectl.js enqueue '{"id":"job1","command":"echo Hello World"}'
```

*Output:*
```
Enqueued job: job1
```


### 3. Start Workers
Start N background worker processes to pull and execute jobs.
```cmd
node bin/queuectl.js worker start --count 3
```
*Output:*
```
Started 3 worker(s) in the background. PIDs: 1234, 1235, 1236
```

### 4. Check Status & List Jobs
View the queue health and list jobs by state.
```cmd
node bin/queuectl.js status
node bin/queuectl.js list --state pending
```
*Output:*
```
--- Queue Status ---
PENDING: 1 job(s)
PROCESSING: 0 job(s)
COMPLETED: 5 job(s)
FAILED: 0 job(s)
DEAD: 0 job(s)
```

### 5. Dead Letter Queue (DLQ)
Jobs that fail after exceeding `max-retries` are moved to the DLQ. You can list them and retry them.
```cmd
node bin/queuectl.js dlq list
node bin/queuectl.js dlq retry job1
```
*Output:*
```
Job job1 moved from DLQ back to pending.
```

### 6. Stop Workers
Gracefully stop all running workers. They will finish their current job before exiting.
```cmd
node bin/queuectl.js worker stop
```
*Output:*
```
Stopping 3 worker(s)...
Sent SIGTERM to worker 1234
Sent SIGTERM to worker 1235
Sent SIGTERM to worker 1236
All workers stopped (graceful shutdown initiated).
```

## Architecture Overview

### Persistence Design
`better-sqlite3` is used as the storage engine. It provides high-performance, synchronous database operations. The database runs in WAL (Write-Ahead Logging) mode, allowing concurrent reads and writes, essential for multiple background workers. Atomic transactions ensure zero data corruption during crashes.

### Job Lifecycle
```
[PENDING] --> (Worker Acquires) --> [PROCESSING]
     |                                    |
     |                                    +-- (Success) --> [COMPLETED]
     |                                    |
     +<-- (Retry scheduled after delay) <-+-- (Failure) --> [FAILED] (attempts++)
                                          |
                                          +-- (Max retries exceeded) --> [DEAD] (DLQ)
```

### Worker & Locking Logic
Workers are spawned as detached Node child processes running a polling loop. To prevent race conditions, workers acquire jobs using a strict atomic SQLite query with a `RETURNING *` clause:
```sql
UPDATE jobs 
SET state = 'processing', locked_by = ? 
WHERE id = (SELECT id FROM jobs WHERE state = 'pending' ORDER BY created_at ASC LIMIT 1) 
RETURNING *;
```
If multiple workers execute this exact millisecond, SQLite's locking mechanism strictly guarantees only one worker modifies the row and receives the result.

## Assumptions & Trade-offs
- **Process Management**: `queuectl worker start` spawns detached background Node processes and saves their PIDs to `data/workers.pid`. This is a simplified PID file approach. In a true production environment on Linux, `systemd` or `pm2` would be used, but this custom script satisfies the assignment requirements locally and works cross-platform.
- **Scheduled Delay vs Timer**: The prompt states "schedule next attempt after the computed delay, then back to pending". Instead of adding a `run_at` schema field (which was listed as a bonus), the worker calculates the delay, sets the job to `FAILED`, and triggers a `setTimeout` to push it back to `PENDING` later. This satisfies the core requirement simply without modifying the mandated schema.
- **DB Path**: The SQLite DB defaults to `./data/queuectl.db` relative to the current working directory.

## Testing Instructions
Run the integration & unit test suite, and check for lint errors:
```bash
npm run test
npm run lint
```

### What the tests prove:
1. **Basic job completes successfully:** Tests enqueueing, worker acquisition, execution, and state transition to `COMPLETED`.
2. **Failing job retries with correct exponential backoff and lands in DLQ:** Simulates a failing command, checks if attempts increment, waits for the computed delay, and verifies it lands in `DEAD` state when exceeding max retries.
3. **Multiple workers concurrency/race-condition:** Spawns 5 worker objects concurrently attempting to acquire a single job in the exact same millisecond. Proves only 1 worker successfully acquires it (SQLite lock robustness).
4. **Invalid command fails gracefully:** Verifies `exec` errors transition jobs correctly to `FAILED`.
5. **Job data survives a simulated restart:** Manually forces a job into a state, severs the DB connection to simulate a hard crash, re-initializes a fresh connection to the same file, and proves all states/locks survived intact on disk.

## Demo Video
Demo video: <link>
