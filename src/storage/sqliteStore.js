const Database = require('better-sqlite3');
const path = require('path');
const Store = require('./store');

class SqliteStore extends Store {
  constructor(dbPath) {
    super();
    // Default to data/queuectl.db relative to the project root
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'queuectl.db');
    this.db = null;
  }

  init() {
    this.db = new Database(this.dbPath, { fileMustExist: false });
    this.db.pragma('journal_mode = WAL');

    // Create jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        state TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        locked_by TEXT
      );
    `);

    // Create config table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  saveJob(job) {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
      VALUES (@id, @command, @state, @attempts, @max_retries, @created_at, @updated_at)
    `);
    stmt.run(job);
    return job;
  }

  getJob(id) {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    return stmt.get(id);
  }

  updateJobState(id, newState, additionalUpdates = {}) {
    const sets = ['state = @state', 'updated_at = @updated_at'];
    
    // Add additional fields dynamically
    for (const key of Object.keys(additionalUpdates)) {
      sets.push(`${key} = @${key}`);
    }

    const query = `
      UPDATE jobs 
      SET ${sets.join(', ')} 
      WHERE id = @id
    `;

    const params = {
      id,
      state: newState,
      updated_at: new Date().toISOString(),
      ...additionalUpdates
    };

    const stmt = this.db.prepare(query);
    stmt.run(params);
  }

  getJobsByState(state) {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE state = ? ORDER BY created_at ASC');
    return stmt.all(state);
  }

  acquireJob(workerId) {
    // Atomic acquire using RETURNING clause
    const query = `
      UPDATE jobs 
      SET state = 'processing', locked_by = @workerId, updated_at = @updated_at
      WHERE id = (
        SELECT id FROM jobs 
        WHERE state = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 1
      )
      RETURNING *;
    `;
    const stmt = this.db.prepare(query);
    const result = stmt.get({ workerId, updated_at: new Date().toISOString() });
    return result || null;
  }

  setConfig(key, value) {
    const stmt = this.db.prepare(`
      INSERT INTO config (key, value) 
      VALUES (@key, @value)
      ON CONFLICT(key) DO UPDATE SET value = @value
    `);
    stmt.run({ key, value: String(value) });
  }

  getConfig(key, defaultValue = null) {
    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : defaultValue;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = SqliteStore;
