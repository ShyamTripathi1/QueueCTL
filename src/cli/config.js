const Queue = require('../core/queue');
const ConfigManager = require('../config/configManager');

function setConfig(key, value) {
  const validKeys = ['max-retries', 'backoff-base'];
  
  if (!validKeys.includes(key)) {
    console.error(`Invalid config key. Must be one of: ${validKeys.join(', ')}`);
    process.exit(1);
  }

  // Basic validation that value is a number
  const numValue = parseInt(value, 10);
  if (isNaN(numValue) || numValue < 0) {
    console.error('Value must be a non-negative integer.');
    process.exit(1);
  }

  const queue = new Queue();
  queue.init();
  
  const config = new ConfigManager(queue.store);
  config.set(key, String(numValue));
  
  console.log(`Configuration updated: ${key} = ${numValue}`);
  
  queue.close();
}

function getConfig(key) {
  const validKeys = ['max-retries', 'backoff-base'];
  const defaults = { 'max-retries': '3', 'backoff-base': '2' };

  if (!validKeys.includes(key)) {
    console.error(`Invalid config key. Must be one of: ${validKeys.join(', ')}`);
    process.exit(1);
  }

  const queue = new Queue();
  queue.init();

  const config = new ConfigManager(queue.store);
  const value = config.get(key, defaults[key]);

  console.log(`${key} = ${value}`);

  queue.close();
}

module.exports = {
  set: setConfig,
  get: getConfig
};
