/**
 * Calculates exponential backoff delay
 * @param {number} attempts - Current number of attempts
 * @param {number} base - The exponential base
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attempts, base = 2) {
  // formula: base ^ attempts
  const delaySeconds = Math.pow(base, attempts);
  return delaySeconds * 1000;
}

module.exports = {
  calculateBackoff
};
