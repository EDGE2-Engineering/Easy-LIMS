import assert from 'node:assert';
import {
  calculateCubeTest,
  calculateAverageCompressiveStrength,
  calculateAgeInDays,
  formatDateDDMMYYYY,
  roundToNearestHalf,
  SAMPLE_CUBE_TEST_DATA,
} from '../ui/src/utils/cubeTestCalculation.js';

console.log('=== Test 1: Date formatting (YYYY/MM/DD and YYYY-MM-DD to DD/MM/YYYY) ===');
assert.strictEqual(formatDateDDMMYYYY('2026-08-01'), '01/08/2026', '2026-08-01 should format to 01/08/2026');
assert.strictEqual(formatDateDDMMYYYY('2026/08/01'), '01/08/2026', '2026/08/01 should format to 01/08/2026');
assert.strictEqual(formatDateDDMMYYYY('2026-09-22'), '22/09/2026', '2026-09-22 should format to 22/09/2026');
assert.strictEqual(formatDateDDMMYYYY('19-08-2026'), '19/08/2026', '19-08-2026 should format to 19/08/2026');
assert.strictEqual(formatDateDDMMYYYY('19/08/2026'), '19/08/2026', '19/08/2026 should remain 19/08/2026');
assert.strictEqual(formatDateDDMMYYYY(''), '-', 'empty string should format to -');
assert.strictEqual(formatDateDDMMYYYY(null), '-', 'null should format to -');
console.log('✅ Date formatting passed!');

console.log('\n=== Test 2: Age in days calculation ===');
const age1 = calculateAgeInDays('2026-08-19', '2026-09-11');
assert.strictEqual(age1, 23, '19-08-2026 to 11-09-2026 must be exactly 23 days per PDF Page 2');
const age2 = calculateAgeInDays('19-08-2026', '11-09-2026');
assert.strictEqual(age2, 23, '19-08-2026 to 11-09-2026 (DD-MM-YYYY) must be 23 days');
console.log('✅ Age in days calculation passed!');

console.log('\n=== Test 3: IS 516 Cl 3.6 calculation with exact PDF Page 2 & 3 handwritten example ===');
// Strengths: 24.00, 20.00, 33.50
// Initial mean: (24.00 + 20.00 + 33.50) / 3 = 25.833... N/mm² (~25.8 N/mm²)
// ±15% variation range:
// Lower limit = 25.833... * 0.85 = 21.958 N/mm²
// Upper limit = 25.833... * 1.15 = 29.708 N/mm²
// 20.00 < 21.958 & 33.50 > 29.708 -> Variation exceeds ±15%!
// Two closest values: 20.00 and 24.00 (diff = 4.00 vs 9.50 vs 13.50)
// Average of two closest = (20.00 + 24.00) / 2 = 22.00 N/mm²
// Rounded to nearest 0.5 = 22.0 N/mm²
const pdfResult = calculateAverageCompressiveStrength([24.00, 20.00, 33.50]);
console.log('PDF Example Result:', {
  initialAverage: pdfResult.initialAverageStrength?.toFixed(2),
  lowerLimit: pdfResult.lowerLimit15Percent?.toFixed(2),
  upperLimit: pdfResult.upperLimit15Percent?.toFixed(2),
  isOutlierClauseApplied: pdfResult.isOutlierClauseApplied,
  closestValues: pdfResult.closestValues,
  excludedValues: pdfResult.excludedValues,
  averageStrength: pdfResult.averageStrength,
  formatted: pdfResult.averageStrengthFormatted,
  note: pdfResult.clauseNote,
});

assert.strictEqual(pdfResult.isOutlierClauseApplied, true, 'Outlier clause must be applied');
assert.deepStrictEqual(pdfResult.closestValues, [24.00, 20.00], 'Closest values must be 24.00 and 20.00');
assert.deepStrictEqual(pdfResult.excludedValues, [33.50], 'Excluded value must be 33.50');
assert.strictEqual(pdfResult.averageStrength, 22.0, 'Average strength must be 22.0 N/mm²');
assert.strictEqual(pdfResult.averageStrengthFormatted, '22.0', 'Formatted average must be 22.0');
console.log('✅ PDF example calculation passed!');

console.log('\n=== Test 4: Full calculateCubeTest with SAMPLE_CUBE_TEST_DATA ===');
const fullTest = calculateCubeTest(SAMPLE_CUBE_TEST_DATA.observations, SAMPLE_CUBE_TEST_DATA.metadata);
console.log('Full Test Result Summary:', {
  count: fullTest.count,
  validStrengthCount: fullTest.validStrengthCount,
  averageStrength: fullTest.averageStrength,
  averageStrengthFormatted: fullTest.averageStrengthFormatted,
  isOutlierClauseApplied: fullTest.isOutlierClauseApplied,
  closestValues: fullTest.closestValues,
  averageWeight: fullTest.averageWeightFormatted,
  averageAge: fullTest.averageAgeFormatted,
  reportExcludeAvgWeight: fullTest.reportExcludeAvgWeight,
});

assert.strictEqual(fullTest.rows.length, 3, 'Must have 3 rows');
assert.strictEqual(fullTest.rows[0].ageDays, 23, 'Trial 1 age must be 23 days');
assert.strictEqual(fullTest.rows[0].strengthFormatted, '24.00', 'Trial 1 strength must be 24.00');
assert.strictEqual(fullTest.rows[1].strengthFormatted, '20.00', 'Trial 2 strength must be 20.00');
assert.strictEqual(fullTest.rows[2].strengthFormatted, '33.50', 'Trial 3 strength must be 33.50');
assert.strictEqual(fullTest.averageStrengthFormatted, '22.0', 'Batch average strength must be 22.0 N/mm² per PDF');
assert.strictEqual(fullTest.isOutlierClauseApplied, true, 'Clause 3.6 must be applied');
assert.strictEqual(fullTest.rows[2].isExcludedFromAverage, true, 'Row 3 (33.50) must be excluded from average');
assert.strictEqual(fullTest.reportExcludeAvgWeight, true, 'reportExcludeAvgWeight must be true');
console.log('✅ Full calculateCubeTest passed!');

console.log('\n=== Test 5: Standard batch where all values are within ±15% ===');
const normalResult = calculateAverageCompressiveStrength([25.00, 26.00, 25.50]);
// Mean = 25.50. ±15% = [21.675, 29.325]. All within range!
assert.strictEqual(normalResult.isOutlierClauseApplied, false, 'No outlier clause for normal batch');
assert.strictEqual(normalResult.averageStrength, 25.5, 'Normal batch average must be 25.5');
assert.strictEqual(normalResult.averageStrengthFormatted, '25.5');
console.log('✅ Normal batch calculation passed!');

console.log('\nALL TESTS PASSED SUCCESSFULLY! 🚀');
