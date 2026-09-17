import assert from 'node:assert';
import {
  calculateSingleShrinkageTrial,
  calculateShrinkageLimits,
  SAMPLE_SHRINKAGE_DATA,
} from '../ui/src/utils/shrinkageLimitCalculation.js';

import {
  calculateCompactionTest,
  roundOmcByISCode,
  SAMPLE_HEAVY_COMPACTION_DATA,
  SAMPLE_LIGHT_COMPACTION_DATA,
} from '../ui/src/utils/compactionCalculation.js';

console.log('====================================================');
console.log('Testing Shrinkage Limit Calculation (IS 2720 Part 6)');
console.log('====================================================');

// Test Trial 1 from reference sheet:
// M1 = 28.46, M2 = 68.905, M3 = 56.09, dishHg = 345.68, cupHg = 447.24, cupImmersed = 234.63
const t1 = calculateSingleShrinkageTrial(SAMPLE_SHRINKAGE_DATA.trials[0]);
console.log('Trial 1 outputs:', {
  w0: t1.w0,
  mw: t1.mw,
  waterWeight: t1.waterWeight,
  moistureContent: t1.moistureContent,
  mercuryInDish: t1.mercuryInDish,
  v: t1.v,
  mercuryDisplaced: t1.mercuryDisplaced,
  v0: t1.v0,
  shrinkageLimit: t1.shrinkageLimit,
  shrinkageRatio: t1.shrinkageRatio,
});

assert.strictEqual(t1.w0, 27.63, 'W0 should be 27.63 g');
assert.strictEqual(t1.mw, 40.445, 'Mw should be 40.445 g');
assert.strictEqual(t1.waterWeight, 12.815, 'Water weight should be 12.815 g');
assert(Math.abs(t1.moistureContent - 46.380) < 0.01, 'Moisture content should be approx 46.380%');
assert.strictEqual(t1.mercuryInDish, 317.22, 'Mercury in dish should be 317.22 g');
assert(Math.abs(t1.v - 23.325) < 0.01, 'Volume V should be approx 23.325 ml');
assert.strictEqual(t1.mercuryDisplaced, 212.61, 'Displaced mercury should be 212.61 g');
assert(Math.abs(t1.v0 - 15.63) < 0.02, 'Dry volume V0 should be approx 15.63 ml');
assert(Math.abs(t1.shrinkageLimit - 18.529) < 0.05, 'Shrinkage limit should be approx 18.53%');
assert(Math.abs(t1.shrinkageRatio - 1.76) < 0.02, 'Shrinkage ratio should be approx 1.76');

// Test Trial 2 from reference sheet:
const t2 = calculateSingleShrinkageTrial(SAMPLE_SHRINKAGE_DATA.trials[1]);
console.log('Trial 2 outputs:', {
  w0: t2.w0,
  mw: t2.mw,
  waterWeight: t2.waterWeight,
  moistureContent: t2.moistureContent,
  v: t2.v,
  v0: t2.v0,
  shrinkageLimit: t2.shrinkageLimit,
  shrinkageRatio: t2.shrinkageRatio,
});

assert.strictEqual(t2.w0, 27.558, 'W0 should be 27.558 g (rounds to 27.56)');
assert.strictEqual(t2.mw, 40.378, 'Mw should be 40.378 g');
assert.strictEqual(t2.waterWeight, 12.82, 'Water weight should be 12.82 g');
assert(Math.abs(t2.shrinkageLimit - 18.700) < 0.05, 'Shrinkage limit should be approx 18.700%');
assert(Math.abs(t2.shrinkageRatio - 1.73) < 0.02, 'Shrinkage ratio should be approx 1.73');

// Test Multi-trial calculation and 2% validation
const shrinkageOverall = calculateShrinkageLimits(SAMPLE_SHRINKAGE_DATA.trials);
console.log('Shrinkage Overall:', {
  validCount: shrinkageOverall.validCount,
  averageSl: shrinkageOverall.averageSl,
  averageRatio: shrinkageOverall.averageRatio,
  lowerLimit: shrinkageOverall.lowerLimit,
  upperLimit: shrinkageOverall.upperLimit,
  isCompliant: shrinkageOverall.isCompliant,
});

assert.strictEqual(shrinkageOverall.validCount, 2, 'Should have 2 valid trials');
assert(Math.abs(shrinkageOverall.averageSl - 18.614) < 0.05, 'Average SL should be approx 18.61%');
assert.strictEqual(shrinkageOverall.isCompliant, true, 'Both trials should be within ±2%');

console.log('====================================================');
console.log('Testing Heavy Compaction (IS 2720 Part 8)');
console.log('====================================================');

const heavyResult = calculateCompactionTest({
  mouldType: 'HEAVY_SMALL',
  trials: SAMPLE_HEAVY_COMPACTION_DATA.trials,
});

console.log('Heavy Compaction Trials (Trial 1):', heavyResult.trials[0]);
console.log('Heavy Compaction Curve Peak:', {
  rawMdd: heavyResult.rawMdd,
  rawOmc: heavyResult.rawOmc,
  mdd: heavyResult.mdd,
  omc: heavyResult.omc,
});

// Check Trial 1 of Heavy Compaction
assert.strictEqual(heavyResult.trials[0].wetSoilWeight, 2109, 'Trial 1 wet soil weight should be 2109 g');
assert.strictEqual(heavyResult.trials[0].bulkDensity, 2.109, 'Trial 1 bulk density should be 2.109 g/cc');
assert.strictEqual(heavyResult.trials[0].waterWeight, 8.36, 'Trial 1 water weight should be 8.36 g');
assert.strictEqual(heavyResult.trials[0].drySoilWeight, 139.38, 'Trial 1 dry soil weight should be 139.38 g');
assert.strictEqual(heavyResult.trials[0].moistureContent, 6.00, 'Trial 1 moisture content should be 6.00%');
assert(Math.abs(heavyResult.trials[0].dryDensity - 1.99) < 0.01, 'Trial 1 dry density should be 1.99 g/cc');

// Check peak values: expected peak ~2.20 - 2.21 g/cc, OMC ~9.2 - 9.5%
assert(parseFloat(heavyResult.mdd) >= 2.18 && parseFloat(heavyResult.mdd) <= 2.23, 'MDD should be approx 2.20 g/cc');
console.log('Reported MDD:', heavyResult.mdd, 'g/cc, Reported OMC:', heavyResult.omc, '%');

console.log('====================================================');
console.log('Testing Light Compaction (IS 2720 Part 7)');
console.log('====================================================');

const lightResult = calculateCompactionTest({
  mouldType: 'LIGHT_STANDARD',
  trials: SAMPLE_LIGHT_COMPACTION_DATA.trials,
});

console.log('Light Compaction Trials (Trial 1):', lightResult.trials[0]);
console.log('Light Compaction Curve Peak:', {
  rawMdd: lightResult.rawMdd,
  rawOmc: lightResult.rawOmc,
  mdd: lightResult.mdd,
  omc: lightResult.omc,
});

assert.strictEqual(lightResult.trials[0].wetSoilWeight, 1949, 'Trial 1 wet soil weight should be 1949 g');
assert(Math.abs(lightResult.trials[0].bulkDensity - 1.954) < 0.01, 'Trial 1 bulk density should be approx 1.954 g/cc');
assert.strictEqual(lightResult.trials[0].waterWeight, 3.81, 'Trial 1 water weight should be 3.81 g');
assert.strictEqual(lightResult.trials[0].drySoilWeight, 44.58, 'Trial 1 dry soil weight should be 44.58 g');
assert(Math.abs(lightResult.trials[0].moistureContent - 8.55) < 0.02, 'Trial 1 MC should be 8.55%');
assert(Math.abs(lightResult.trials[0].dryDensity - 1.80) < 0.01, 'Trial 1 dry density should be 1.80 g/cc');

// Rounding rule test cases from reference sheet notes:
assert.strictEqual(roundOmcByISCode(4.36), '4.4', '4.36% should round to 4.4% (nearest 0.2% when < 5%)');
assert.strictEqual(roundOmcByISCode(7.28), '7.5', '7.28% should round to 7.5% (nearest 0.5% when 5-10%)');
assert.strictEqual(roundOmcByISCode(8.29), '8.5', '8.29% should round to 8.5% (nearest 0.5% when 5-10%)');
assert.strictEqual(roundOmcByISCode(11.8), '12', '11.8% should round to 12% (nearest whole integer when > 10%)');
assert.strictEqual(roundOmcByISCode(12.71), '13', '12.71% should round to 13% (nearest whole integer when > 10%)');

console.log('ALL TESTS PASSED SUCCESSFULLY! 🚀');
