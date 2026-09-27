import assert from 'node:assert';
import {
  calculateStructuralSteelTest,
  DEFAULT_STRUCTURAL_STEEL_OBSERVATION,
  DEFAULT_STRUCTURAL_STEEL_OBSERVATIONS,
  SAMPLE_STRUCTURAL_STEEL_TEST_DATA,
  COMMON_STRUCTURAL_STEEL_TYPES,
} from '../ui/src/utils/structuralSteelCalculation.js';

console.log('=== Test 1: Check default structures ===');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.sampleId, '', 'sampleId must exist in default observation');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.sampleType, '', 'sampleType must exist in default observation');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.width, '', 'width must exist');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.thickness, '', 'thickness must exist');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.yieldLoad, '', 'yieldLoad must exist');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.ultimateLoad, '', 'ultimateLoad must exist');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.finalGaugeLength, '', 'finalGaugeLength must exist');
assert(COMMON_STRUCTURAL_STEEL_TYPES.includes('MS Plate'), 'Must have MS Plate');
assert(COMMON_STRUCTURAL_STEEL_TYPES.includes('W-Beam'), 'Must have W-Beam');
assert(COMMON_STRUCTURAL_STEEL_TYPES.includes('Channel'), 'Must have Channel');
console.log('✅ Default structures verified!');

console.log('\n=== Test 2: Calculate with PDF Reference Sample Data (5 specimens) ===');
const result = calculateStructuralSteelTest(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.observations);

assert.strictEqual(result.rows.length, 5, 'Must calculate 5 rows');

// Row 1: Width 20.000, Thickness 12.3, Area 246.000, Yield Load 149.232, Ult Load 183.816, Final GL 111.25
const r1 = result.rows[0];
console.log('Row 1 (MS Plate):', {
  sampleType: r1.sampleType,
  area: r1.areaFmt,
  yieldStress: r1.yieldStressFmt,
  ultimateTensileStrength: r1.tensileStrengthFmt,
  initialGaugeLength: r1.iglFmt,
  elongation: r1.elongationFmt,
});
assert.strictEqual(r1.sampleType, 'MS Plate');
assert.strictEqual(r1.areaFmt, '246.000', 'Area must be 246.000 mm²');
assert.strictEqual(r1.yieldStressFmt, '606.63', 'Yield stress must be 606.63 N/mm² (2 decimals)');
assert.strictEqual(r1.tensileStrengthFmt, '747.22', 'Tensile strength must be 747.22 N/mm² (2 decimals)');
assert.strictEqual(r1.iglFmt, '88.62', 'Initial Gauge Length must be 88.62 mm (2 decimals)');
assert.strictEqual(r1.elongationFmt, '25.54', 'Elongation must be 25.54 % (2 decimals)');

// Row 2: Width 20.000, Thickness 12.1, Area 242.000, Yield Load 159.816, Ult Load 195.864, Final GL 110.89
const r2 = result.rows[1];
console.log('Row 2 (MS Plate):', {
  sampleType: r2.sampleType,
  area: r2.areaFmt,
  yieldStress: r2.yieldStressFmt,
  ultimateTensileStrength: r2.tensileStrengthFmt,
  initialGaugeLength: r2.iglFmt,
  elongation: r2.elongationFmt,
});
assert.strictEqual(r2.areaFmt, '242.000', 'Area must be 242.000 mm²');
assert.strictEqual(r2.yieldStressFmt, '660.40', 'Yield stress must be 660.40 N/mm²');
assert.strictEqual(r2.tensileStrengthFmt, '809.36', 'Tensile strength must be 809.36 N/mm²');
assert.strictEqual(r2.iglFmt, '87.89', 'Initial Gauge Length must be 87.89 mm');
assert.strictEqual(r2.elongationFmt, '26.16', 'Elongation must be 26.16 %');

// Row 3: Width 20.000, Thickness 16.01, Area 320.200, Yield Load 165.96, Ult Load 205.8, Final GL 125.36
const r3 = result.rows[2];
console.log('Row 3 (W-Beam):', {
  sampleType: r3.sampleType,
  area: r3.areaFmt,
  yieldStress: r3.yieldStressFmt,
  ultimateTensileStrength: r3.tensileStrengthFmt,
  initialGaugeLength: r3.iglFmt,
  elongation: r3.elongationFmt,
});
assert.strictEqual(r3.sampleType, 'W-Beam');
assert.strictEqual(r3.areaFmt, '320.200', 'Area must be 320.200 mm²');
assert.strictEqual(r3.yieldStressFmt, '518.30', 'Yield stress must be 518.30 N/mm²');
assert.strictEqual(r3.tensileStrengthFmt, '642.72', 'Tensile strength must be 642.72 N/mm²');
assert.strictEqual(r3.iglFmt, '101.10', 'Initial Gauge Length must be 101.10 mm');
assert.strictEqual(r3.elongationFmt, '23.99', 'Elongation must be 23.99 %');

// Row 4: Width 20.000, Thickness 22.4, Area 448.000, Yield Load 297.528, Ult Load 297.552, Final GL 148.96
const r4 = result.rows[3];
console.log('Row 4 (Channel):', {
  sampleType: r4.sampleType,
  area: r4.areaFmt,
  yieldStress: r4.yieldStressFmt,
  ultimateTensileStrength: r4.tensileStrengthFmt,
  initialGaugeLength: r4.iglFmt,
  elongation: r4.elongationFmt,
});
assert.strictEqual(r4.sampleType, 'Channel');
assert.strictEqual(r4.areaFmt, '448.000', 'Area must be 448.000 mm²');
assert.strictEqual(r4.yieldStressFmt, '664.13', 'Yield stress must be 664.13 N/mm²');
assert.strictEqual(r4.tensileStrengthFmt, '664.18', 'Tensile strength must be 664.18 N/mm²');
assert.strictEqual(r4.iglFmt, '119.59', 'Initial Gauge Length must be 119.59 mm');
assert.strictEqual(r4.elongationFmt, '24.56', 'Elongation must be 24.56 %');

// Row 5: Width 20.000, Thickness 25.1, Area 502.000, Yield Load 264.144, Ult Load 319.32, Final GL 159.63
const r5 = result.rows[4];
console.log('Row 5 (MS Plate):', {
  sampleType: r5.sampleType,
  area: r5.areaFmt,
  yieldStress: r5.yieldStressFmt,
  ultimateTensileStrength: r5.tensileStrengthFmt,
  initialGaugeLength: r5.iglFmt,
  elongation: r5.elongationFmt,
});
assert.strictEqual(r5.sampleType, 'MS Plate');
assert.strictEqual(r5.areaFmt, '502.000', 'Area must be 502.000 mm²');
assert.strictEqual(r5.yieldStressFmt, '526.18', 'Yield stress must be 526.18 N/mm²');
assert.strictEqual(r5.tensileStrengthFmt, '636.10', 'Tensile strength must be 636.10 N/mm²');
assert.strictEqual(r5.iglFmt, '126.59', 'Initial Gauge Length must be 126.59 mm');
assert.strictEqual(r5.elongationFmt, '26.10', 'Elongation must be 26.10 %');

console.log('\nSummary metrics:', result.summary);
assert.strictEqual(result.summary.reportExcludeAverages, true);
assert.strictEqual(result.summary.includeAveragesInReport, false);
assert.strictEqual(result.summary.standard, 'IS 1608 (Part 1) : 2022');
assert.strictEqual(result.summary.count, 5);

console.log('\nALL STRUCTURAL STEEL TESTS PASSED! 🎉');
