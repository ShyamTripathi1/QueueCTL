#!/usr/bin/env node

const { Command } = require('commander');
const packageJson = require('../package.json');

// Command handlers
const enqueueCmd = require('../src/cli/enqueue');
const workerCmd = require('../src/cli/worker');
const statusCmd = require('../src/cli/status');
const listCmd = require('../src/cli/list');
const dlqCmd = require('../src/cli/dlq');
const configCmd = require('../src/cli/config');

const program = new Command();

program
  .name('queuectl')
  .description('A robust CLI-based background job queue system')
  .version(packageJson.version);

// Enqueue command
program
  .command('enqueue')
  .description('Enqueue a new job')
  .argument('<jobJson>', 'JSON string of the job to enqueue (e.g. \'{"id":"job1","command":"sleep 2"}\')')
  .action(enqueueCmd);

// Worker commands
const worker = program.command('worker').description('Manage worker processes');

worker
  .command('start')
  .description('Start worker processes')
  .option('-c, --count <number>', 'Number of worker processes to start', '1')
  .action(workerCmd.start);

worker
  .command('stop')
  .description('Stop all running workers gracefully')
  .action(workerCmd.stop);

// Status command
program
  .command('status')
  .description('View overall queue status')
  .action(statusCmd);

// List command
program
  .command('list')
  .description('List jobs by state')
  .option('-s, --state <state>', 'State to filter by (pending, processing, completed, failed, dead)', 'pending')
  .action(listCmd);

// DLQ commands
const dlq = program.command('dlq').description('Manage the Dead Letter Queue (DLQ)');

dlq
  .command('list')
  .description('List all jobs in the DLQ')
  .action(dlqCmd.list);

dlq
  .command('retry')
  .description('Retry a specific job from the DLQ')
  .argument('<jobId>', 'ID of the job to retry')
  .action(dlqCmd.retry);

// Config commands
const config = program.command('config').description('Manage queue configuration');

config
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Configuration key (max-retries, backoff-base)')
  .argument('<value>', 'Configuration value')
  .action(configCmd.set);

program.parse(process.argv);
