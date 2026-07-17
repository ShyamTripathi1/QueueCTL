const { calculateBackoff } = require('../../src/core/backoff');

describe('Backoff Calculator', () => {
  test('Calculates correctly with base 2', () => {
    expect(calculateBackoff(0, 2)).toBe(1000); // 2^0 = 1s = 1000ms
    expect(calculateBackoff(1, 2)).toBe(2000); // 2^1 = 2s = 2000ms
    expect(calculateBackoff(2, 2)).toBe(4000); // 2^2 = 4s = 4000ms
    expect(calculateBackoff(3, 2)).toBe(8000); // 2^3 = 8s = 8000ms
  });

  test('Calculates correctly with base 3', () => {
    expect(calculateBackoff(0, 3)).toBe(1000);
    expect(calculateBackoff(1, 3)).toBe(3000);
    expect(calculateBackoff(2, 3)).toBe(9000);
  });
});
