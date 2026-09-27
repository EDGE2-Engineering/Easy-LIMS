import assert from 'assert';
import {
  getStandardDiaFactor,
  roundToNearestHalf,
  calculateConcreteCoreTest,
  SAMPLE_CONCRETE_CORE_TEST_DATA,
} from '../ui/src/utils/concreteCoreTestCalculation.js';

console.log('--- Testing Concrete Core Calculations (IS 516 Part 4 : 2018 Clause 8.4.1) ---');

// Test 1: getStandardDiaFactor per Clause 8.4.1
console.log('Test 1: Diameter correction factor ranges...');
assert.strictEqual(getStandardDiaFactor(65), 1.06, 'D < 70mm should have CF 1.06');
assert.strictEqual(getStandardDiaFactor(69.9), 1.06, 'D < 70mm should have CF 1.06');
assert.strictEqual(getStandardDiaFactor(70), 1.03, 'D = 70mm should have CF 1.03');
assert.strictEqual(getStandardDiaFactor(75), 1.03, 'D = 75mm (75±5) should have CF 1.03');
assert.strictEqual(getStandardDiaFactor(80), 1.03, 'D = 80mm should have CF 1.03');
assert.strictEqual(getStandardDiaFactor(100), 1.00, 'D = 100mm should be restricted to 1.00');
assert.strictEqual(getStandardDiaFactor(145), 1.00, 'D = 145mm (> 100mm) should be restricted to 1.00');
assert.strictEqual(getStandardDiaFactor(150), 1.00, 'D = 150mm should be restricted to 1.00');
console.log('✓ getStandardDiaFactor passed.');

// Test 2: Sample Test Data with cores > 100mm (Dia CF = 1.00)
console.log('Test 2: Sample concrete core calculation with D > 100mm...');
const sampleResult = calculateConcreteCoreTest(
  SAMPLE_CONCRETE_CORE_TEST_DATA.observations,
  SAMPLE_CONCRETE_CORE_TEST_DATA.metadata
);

assert.strictEqual(sampleResult.rows.length, 2, 'Should have 2 specimen rows');
assert.strictEqual(sampleResult.rows[0].diaFactor, 1.00, 'Row 1 (D=145mm) diaFactor must be 1.00');
assert.strictEqual(sampleResult.rows[1].diaFactor, 1.00, 'Row 2 (D=141.92mm) diaFactor must be 1.00');

assert.strictEqual(sampleResult.rows[0].corrCylStrengthFormatted, '28.89', 'Row 1 Corr Cyl should be 28.89 N/mm²');
assert.strictEqual(sampleResult.rows[0].cubeStrengthFormatted, '36.0', 'Row 1 Eq Cube should be 36.0 N/mm²');

assert.strictEqual(sampleResult.rows[1].corrCylStrengthFormatted, '27.18', 'Row 2 Corr Cyl should be 27.18 N/mm²');
assert.strictEqual(sampleResult.rows[1].cubeStrengthFormatted, '34.0', 'Row 2 Eq Cube should be 34.0 N/mm²');

assert.strictEqual(sampleResult.averageCubeStrengthFormatted, '35.0', 'Average Eq Cube Compressive Strength should be 35.0 N/mm²');
assert.strictEqual(sampleResult.reportedStrength, '35.0', 'Reported strength must be 35.0 N/mm²');
assert.strictEqual(sampleResult.finalReportResult, '35.0', 'Final report result must be 35.0 N/mm²');
console.log('✓ Sample concrete core calculation passed.');

// Test 3: Final report result and exclusions per note
console.log('Test 3: Final report result and exclusion flags...');
assert.strictEqual(sampleResult.reportExcludeAvgWeight, true, 'reportExcludeAvgWeight must be true');
assert.strictEqual(sampleResult.reportExcludeAvgCorrCylStrength, true, 'reportExcludeAvgCorrCylStrength must be true');
assert.strictEqual(sampleResult.reportExcludeAvgLdRatio, true, 'reportExcludeAvgLdRatio must be true');
assert.strictEqual(sampleResult.includeAvgWeightInReport, false, 'includeAvgWeightInReport must be false');
assert.strictEqual(sampleResult.includeAvgCorrCylStrengthInReport, false, 'includeAvgCorrCylStrengthInReport must be false');
assert.strictEqual(sampleResult.includeAvgLdRatioInReport, false, 'includeAvgLdRatioInReport must be false');
assert.strictEqual(sampleResult.finalReportResultLabel, 'Average Equivalent Cube Compressive Strength');
console.log('✓ Final report exclusion flags verified.');

// Test 4: Small diameter core < 70mm (Dia CF = 1.06)
console.log('Test 4: Small diameter core < 70mm (1.06 CF)...');
const smallCoreResult = calculateConcreteCoreTest([
  {
    identification: 'Core A',
    length: '136.00',
    dia: '68.00',
    weightKg: '1.200',
    failureLoadKn: '100.000',
    failureType: 'Satisfactory',
  },
]);
assert.strictEqual(smallCoreResult.rows[0].diaFactor, 1.06, 'D=68mm should have Dia CF 1.06');
assert.strictEqual(smallCoreResult.rows[0].correctionFactorFormatted, '1.00', 'L/D=2.0 should have H/D CF 1.00');
// Cyl Str = (100 / (pi * 68^2 / 4)) * 1000 = 27.535... -> 27.54
// Corr Cyl = 27.54 * 1.00 * 1.06 = 29.1924 -> 29.19
assert.strictEqual(smallCoreResult.rows[0].corrCylStrengthFormatted, '29.19', 'Corr Cyl should be 29.19 N/mm²');
// Eq Cube = 29.19 * 1.25 = 36.4875 -> 36.5
assert.strictEqual(smallCoreResult.rows[0].cubeStrengthFormatted, '36.5', 'Eq Cube should be 36.5 N/mm²');
console.log('✓ Small diameter core test passed.');

// Test 5: Medium diameter core 75±5mm (Dia CF = 1.03)
console.log('Test 5: Medium diameter core 75±5mm (1.03 CF)...');
const medCoreResult = calculateConcreteCoreTest([
  {
    identification: 'Core B',
    length: '150.00',
    dia: '75.00',
    weightKg: '1.500',
    failureLoadKn: '120.000',
    failureType: 'Satisfactory',
  },
]);
assert.strictEqual(medCoreResult.rows[0].diaFactor, 1.03, 'D=75mm should have Dia CF 1.03');
assert.strictEqual(medCoreResult.rows[0].correctionFactorFormatted, '1.00', 'L/D=2.0 should have H/D CF 1.00');
// Cyl Str = (120 / (pi * 75^2 / 4)) * 1000 = 27.162... -> 27.16
// Corr Cyl = 27.16 * 1.00 * 1.03 = 27.9748 -> 27.97
assert.strictEqual(medCoreResult.rows[0].corrCylStrengthFormatted, '27.97', 'Corr Cyl should be 27.97 N/mm²');
// Eq Cube = 27.97 * 1.25 = 34.9625 -> 35.0
assert.strictEqual(medCoreResult.rows[0].cubeStrengthFormatted, '35.0', 'Eq Cube should be 35.0 N/mm²');
console.log('✓ Medium diameter core test passed.');

console.log('All Concrete Core tests passed successfully!');
