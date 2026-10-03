import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateCbrTest, STANDARD_LOAD_2_5_MM, STANDARD_LOAD_5_0_MM } from './fieldCbrCalculation.js';

test('field CBR calculation matches standard lab CBR loading rules', () => {
  const result = calculateCbrTest([
    { penetration: 0, loadKg: '0' },
    { penetration: 0.5, loadKg: '10.20' },
    { penetration: 1.0, loadKg: '23.45' },
    { penetration: 1.5, loadKg: '30.59' },
    { penetration: 2.0, loadKg: '45.89' },
    { penetration: 2.5, loadKg: '64.24' },
    { penetration: 3.0, loadKg: '81.58' },
    { penetration: 4.0, loadKg: '122.37' },
    { penetration: 5.0, loadKg: '168.25' },
    { penetration: 7.5, loadKg: '292.66' },
    { penetration: 10.0, loadKg: '459.89' },
    { penetration: 12.5, loadKg: '665.87' },
  ]);

  assert.equal(STANDARD_LOAD_2_5_MM, 1370);
  assert.equal(STANDARD_LOAD_5_0_MM, 2055);
  assert.equal(result.isValid, true);
  assert.equal(result.isCorrectionNeeded, true);
  assert.equal(result.isCorrectionApplied, true);
  assert.ok(result.effectiveZeroOffset > 0);
  assert.ok(result.active.reportedCbr > 0);
});
