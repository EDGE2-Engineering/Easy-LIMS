import assert from 'assert';
import {
  roundToNearestHalf,
  calculateAgeInDays,
  formatDateDDMMYYYY,
  calculateActCubeTest,
  SAMPLE_ACT_CUBE_TEST_DATA,
} from '../ui/src/utils/actCubeTestCalculation.js';

console.log('=== Test 1: Date formatting (YYYY-MM-DD to DD/MM/YYYY) ===');
assert.strictEqual(formatDateDDMMYYYY('2026-09-21'), '21/09/2026', '2026-09-21 should format to 21/09/2026');
assert.strictEqual(formatDateDDMMYYYY('2026-09-22'), '22/09/2026', '2026-09-22 should format to 22/09/2026');
assert.strictEqual(formatDateDDMMYYYY('2026/09/21'), '21/09/2026', '2026/09/21 should format to 21/09/2026');
assert.strictEqual(formatDateDDMMYYYY('21/09/2026'), '21/09/2026', '21/09/2026 should remain 21/09/2026');
console.log('✅ Date formatting passed!');

console.log('\n=== Test 2: Age in days calculation without "d" suffix ===');
const age = calculateAgeInDays('2026-09-21', '2026-09-22');
assert.strictEqual(age, 1, 'Age between 2026-09-21 and 2026-09-22 should be 1');
console.log('✅ Age in days passed!');

console.log('\n=== Test 3: User Screenshot Batch Calculation ===');
// Screenshot data:
// Row 1: Area=22500, Load=352 kN, Comp Strength=15.50 N/mm², Predicted 28d raw = 33.51 -> rounded to nearest 0.5 = 33.50 N/mm²
// Row 2: Area=22500, Load=378 kN, Comp Strength=17.0 N/mm², Predicted 28d raw = 35.97 -> rounded to nearest 0.5 = 36.0 N/mm²
// Row 3: Area=22500, Load=389 kN, Comp Strength=17.50 N/mm², Predicted 28d raw = 36.79 -> rounded to nearest 0.5 = 37.0 N/mm²
const screenshotResult = calculateActCubeTest([
  {
    cubeId: 'TM 045',
    length: '150',
    breadth: '150',
    height: '150',
    dateOfCasting: '2026-09-21',
    dateOfTesting: '2026-09-22',
    weightKg: '8.250',
    failureLoadKn: '352',
    failureType: 'Satisfactory',
  },
  {
    cubeId: 'TM 045',
    length: '150',
    breadth: '150',
    height: '150',
    dateOfCasting: '2026-09-21',
    dateOfTesting: '2026-09-22',
    weightKg: '8.350',
    failureLoadKn: '378',
    failureType: 'Satisfactory',
  },
  {
    cubeId: 'TM 045',
    length: '150',
    breadth: '150',
    height: '150',
    dateOfCasting: '2026-09-21',
    dateOfTesting: '2026-09-22',
    weightKg: '8.296',
    failureLoadKn: '389',
    failureType: 'Satisfactory',
  },
]);

// Check date formatting in row outputs
assert.strictEqual(screenshotResult.rows[0].dateOfCastingFormatted, '21/09/2026');
assert.strictEqual(screenshotResult.rows[0].dateOfTestingFormatted, '22/09/2026');

// Check age formatted without "d"
assert.strictEqual(screenshotResult.rows[0].ageFormatted, '1');
assert.strictEqual(screenshotResult.rows[1].ageFormatted, '1');
assert.strictEqual(screenshotResult.rows[2].ageFormatted, '1');

// Check Compressive strength (C11: nearest 0.5)
// 352 / 22.5 = 15.644... -> round to nearest 0.5 = 15.5
assert.strictEqual(screenshotResult.rows[0].strengthFormatted, '15.50');
// 378 / 22.5 = 16.800... -> round to nearest 0.5 = 17.0
assert.strictEqual(screenshotResult.rows[1].strengthFormatted, '17.0');
// 389 / 22.5 = 17.288... -> round to nearest 0.5 = 17.5
assert.strictEqual(screenshotResult.rows[2].strengthFormatted, '17.50');

// Check Requirement 6: Round off the Predicted 28d Compressive Strength to the nearest 0.5
// Row 1: 15.5 * 1.64 + 8.09 = 33.51 -> rounded to nearest 0.5 = 33.5 (formatted 33.50)
assert.strictEqual(screenshotResult.rows[0].predicted28DayStrength, 33.5);
assert.strictEqual(screenshotResult.rows[0].predicted28DayFormatted, '33.50');

// Row 2: 17.0 * 1.64 + 8.09 = 35.97 -> rounded to nearest 0.5 = 36.0 (formatted 36.0)
assert.strictEqual(screenshotResult.rows[1].predicted28DayStrength, 36.0);
assert.strictEqual(screenshotResult.rows[1].predicted28DayFormatted, '36.0');

// Row 3: 17.5 * 1.64 + 8.09 = 36.79 -> rounded to nearest 0.5 = 37.0 (formatted 37.0)
assert.strictEqual(screenshotResult.rows[2].predicted28DayStrength, 37.0);
assert.strictEqual(screenshotResult.rows[2].predicted28DayFormatted, '37.0');

// Check Average Predicted 28-day Compressive Strength
// Mean of (33.5, 36.0, 37.0) = 106.5 / 3 = 35.5 -> rounded to nearest 0.5 = 35.5 (formatted 35.50)
assert.strictEqual(screenshotResult.averagePredictedStrength, 35.5);
assert.strictEqual(screenshotResult.averagePredictedStrengthFormatted, '35.50');
assert.strictEqual(screenshotResult.averageStrengthFormatted, '16.50');

console.log('✅ Screenshot batch calculations passed!');

console.log('\n=== Test 4: Final Report Result & Exclusions (Requirement 7) ===');
assert.strictEqual(screenshotResult.finalReportResult, '35.50');
assert.strictEqual(screenshotResult.finalReportResultLabel, 'Predicted 28 days Compressive Strength');
assert.strictEqual(screenshotResult.reportExcludeAvgWeight, true);
assert.strictEqual(screenshotResult.reportExcludeAvgActStrength, true);
assert.strictEqual(screenshotResult.includeAvgWeightInReport, false);
assert.strictEqual(screenshotResult.includeAvgActStrengthInReport, false);
console.log('✅ Requirement 7 report exclusion flags passed!');

console.log('\n=== Test 5: SAMPLE_ACT_CUBE_TEST_DATA calculation ===');
const sampleResult = calculateActCubeTest(
  SAMPLE_ACT_CUBE_TEST_DATA.observations,
  SAMPLE_ACT_CUBE_TEST_DATA.metadata
);
assert.strictEqual(sampleResult.rows.length, 3);
// Row 1: 16.0 * 1.64 + 8.09 = 34.33 -> nearest 0.5 = 34.5
assert.strictEqual(sampleResult.rows[0].predicted28DayStrength, 34.5);
// Row 2: 15.0 * 1.64 + 8.09 = 32.69 -> nearest 0.5 = 32.5
assert.strictEqual(sampleResult.rows[1].predicted28DayStrength, 32.5);
// Row 3: 16.0 * 1.64 + 8.09 = 34.33 -> nearest 0.5 = 34.5
assert.strictEqual(sampleResult.rows[2].predicted28DayStrength, 34.5);
// Average: (34.5 + 32.5 + 34.5)/3 = 33.833... -> nearest 0.5 = 34.0
assert.strictEqual(sampleResult.averagePredictedStrength, 34.0);
assert.strictEqual(sampleResult.averagePredictedStrengthFormatted, '34.0');
console.log('✅ Sample ACT Cube test calculation passed!');

console.log('\nALL ACT CUBE TESTS PASSED SUCCESSFULLY! 🚀');
