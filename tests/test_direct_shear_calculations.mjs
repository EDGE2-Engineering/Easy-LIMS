import assert from 'assert';
import {
  calculateDsProperties,
  calculateUdsProperties,
  calculateReadingRow,
  calculateLoadTable,
  calculateDirectShearSummary,
  SAMPLE_DIRECT_SHEAR_DS,
  SAMPLE_DIRECT_SHEAR_UDS,
} from '../ui/src/utils/directShearCalculation.js';

console.log('--- Testing Direct Shear Calculations per IS: 2720 Part 13 ---');

// 1. Disturbed Sample (DS) Physical Properties (PDF Page 01)
console.log('1. Testing DS Physical Properties...');
const dsProps = calculateDsProperties({
  dryDensity: 1.54,
  initialWaterContent: 11.8,
  mouldVolume: 90,
});
assert.strictEqual(dsProps.initialMass, '138.60', `Expected initial mass 138.60, got ${dsProps.initialMass}`);
assert.strictEqual(dsProps.bulkDensity, '1.72', `Expected bulk density 1.72, got ${dsProps.bulkDensity}`);
console.log('✓ DS Physical Properties verified: Mass = 138.60g, Bulk Density = 1.72 g/cc');

// 2. Undisturbed Sample (UDS) Properties (PDF Page 10, 11, 12, 13)
console.log('2. Testing UDS Properties...');
const udsProps = calculateUdsProperties({
  containerEmptyWt: 20.63,
  containerWetSoilWt: 48.75,
  containerDrySoilWt: 45.98,
  udsTubeSoilWt: 10572,
  udsTubeEmptyWt: 5749,
  udsTubeLengthTotal: 450,
  udsTubeEmptyLength: 75,
  udsTubeDia: 100,
  mouldVolume: 90,
});
assert.strictEqual(udsProps.initialWaterContent, '10.93', `Expected moisture 10.93%, got ${udsProps.initialWaterContent}`);
assert.strictEqual(udsProps.soilWeight, '4823.00', `Expected soil wt 4823.00, got ${udsProps.soilWeight}`);
assert.strictEqual(udsProps.soilLengthCm, '37.50', `Expected soil length 37.50 cm, got ${udsProps.soilLengthCm}`);
assert.strictEqual(udsProps.bulkDensity, '1.64', `Expected bulk density 1.64 g/cc, got ${udsProps.bulkDensity}`);
assert.strictEqual(udsProps.dryDensity, '1.48', `Expected dry density 1.48 g/cc, got ${udsProps.dryDensity}`);
console.log('✓ UDS Properties verified: Water Content = 10.93%, Bulk Density = 1.64 g/cc, Dry Density = 1.48 g/cc');

// 3. Tabular Row Calculation (PDF Page 08 - Row 2, dial 30)
console.log('3. Testing Table Row Calculations...');
const row2 = calculateReadingRow({
  dialReading: '30.00',
  provingRingReading: '5.40',
  leastCount: 0.01,
  mouldDimension: 6.0,
  mouldArea: 36.0,
  provingRingConstant: 0.22285,
  provingRingMultiplier: 5,
});
assert.strictEqual(row2.c2, '0.030', `Expected C2 0.030, got ${row2.c2}`);
assert.strictEqual(row2.c3, '0.0050', `Expected C3 0.0050, got ${row2.c3}`);
assert.strictEqual(row2.c4, '35.82', `Expected C4 35.82, got ${row2.c4}`);
assert.strictEqual(row2.c6, '6.02', `Expected C6 6.02, got ${row2.c6}`);
assert.strictEqual(row2.c7, '0.168', `Expected C7 0.168, got ${row2.c7}`);
console.log('✓ Row 2 calculations verified: C2=0.03cm, C3=0.005, C4=35.82cm², C6=6.02kg, C7=0.168kg/cm²');

// 4. Test 3 Loads Peak Failure Shear Stresses (PDF Pages 03, 04, 05)
console.log('4. Testing Peak Failure Stresses for 3 loads...');
const load1Calc = calculateLoadTable(SAMPLE_DIRECT_SHEAR_DS.loads[0]);
const load2Calc = calculateLoadTable(SAMPLE_DIRECT_SHEAR_DS.loads[1]);
const load3Calc = calculateLoadTable(SAMPLE_DIRECT_SHEAR_DS.loads[2]);

assert.strictEqual(load1Calc.failureShearStress, '0.49', `Expected load 1 failure 0.49, got ${load1Calc.failureShearStress}`);
assert.strictEqual(load2Calc.failureShearStress, '0.96', `Expected load 2 failure 0.96, got ${load2Calc.failureShearStress}`);
assert.strictEqual(load3Calc.failureShearStress, '1.15', `Expected load 3 failure 1.15, got ${load3Calc.failureShearStress}`);
console.log('✓ Peak Failure Stresses verified: 0.5kg/cm² -> 0.49kg/cm², 1.0kg/cm² -> 0.96kg/cm², 1.5kg/cm² -> 1.15kg/cm²');

// 5. Linear Regression (PDF Page 06 & 07)
console.log('5. Testing Linear Regression & Failure Envelope...');
const summary = calculateDirectShearSummary([load1Calc, load2Calc, load3Calc]);
assert.strictEqual(summary.cValue, '0.21', `Expected Cohesion C 0.21 kg/cm², got ${summary.cValue}`);
assert.strictEqual(summary.phiValue, '33.50', `Expected Friction angle φ 33.50°, got ${summary.phiValue}`);
assert.strictEqual(summary.interceptC, '0.206', `Expected exact intercept 0.206, got ${summary.interceptC}`);
assert.strictEqual(summary.slopeTanPhi, '0.662', `Expected slope tan(φ) 0.662, got ${summary.slopeTanPhi}`);
console.log(`✓ Regression verified: C = ${summary.cValue} kg/cm² (exact ${summary.interceptC}), φ = ${summary.phiValue}° (tan φ = ${summary.slopeTanPhi})`);

console.log('ALL TESTS PASSED SUCCESSFULLY! 100% matched with PDF.');
