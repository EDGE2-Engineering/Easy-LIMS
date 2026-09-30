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
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.brand, '', 'brand must exist in default observation');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.grade, '', 'grade must exist in default observation');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.bendTest, 'NCO', 'bendTest must default to NCO');
assert.strictEqual(DEFAULT_STRUCTURAL_STEEL_OBSERVATION.rebendTest, 'NCO', 'rebendTest must default to NCO');
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
const result = calculateStructuralSteelTest(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.observations, {
  includeBrandInReport: SAMPLE_STRUCTURAL_STEEL_TEST_DATA.includeBrandInReport,
  includeGradeInReport: SAMPLE_STRUCTURAL_STEEL_TEST_DATA.includeGradeInReport,
  includeBendInReport: false,
  includeRebendInReport: false,
});

assert.strictEqual(result.rows.length, 5, 'Must calculate 5 rows');

// Row 1: Width 20.000, Thickness 12.3, Area 246.000, Yield Load 149.232, Ult Load 183.816, Final GL 111.25
const r1 = result.rows[0];
console.log('Row 1 (MS Plate):', {
  sampleType: r1.sampleType,
  brand: r1.brand,
  grade: r1.grade,
  area: r1.areaFmt,
  yieldStress: r1.yieldStressFmt,
  ultimateTensileStrength: r1.ultimateTensileStrengthFmt,
  initialGaugeLength: r1.iglFmt,
  elongation: r1.elongationFmt,
  bendTest: r1.bendTest,
  rebendTest: r1.rebendTest,
});
assert.strictEqual(r1.sampleType, 'MS Plate');
assert.strictEqual(r1.brand, 'TATA Structura', 'Brand must match');
assert.strictEqual(r1.grade, 'IS 2062 E250', 'Grade must match');
assert.strictEqual(r1.areaFmt, '246.000', 'Area must be 246.000 mm²');
assert.strictEqual(r1.yieldStressFmt, '606.63', 'Yield stress must be 606.63 N/mm² (2 decimals)');
assert.strictEqual(r1.ultimateTensileStrengthFmt, '747.22', 'Ultimate Tensile Strength must be 747.22 N/mm² (2 decimals)');
assert.strictEqual(r1.tensileStrengthFmt, '747.22', 'tensileStrengthFmt alias must match');
assert.strictEqual(r1.iglFmt, '88.62', 'Initial Gauge Length must be 88.62 mm (2 decimals)');
assert.strictEqual(r1.elongationFmt, '25.54', 'Elongation must be 25.54 % (2 decimals)');
assert.strictEqual(r1.bendTest, 'NCO', 'Bend test must be NCO');
assert.strictEqual(r1.rebendTest, 'NCO', 'Rebend test must be NCO');

// Row 2: Width 20.000, Thickness 12.1, Area 242.000, Yield Load 159.816, Ult Load 195.864, Final GL 110.89
const r2 = result.rows[1];
console.log('Row 2 (MS Plate):', {
  sampleType: r2.sampleType,
  area: r2.areaFmt,
  yieldStress: r2.yieldStressFmt,
  ultimateTensileStrength: r2.ultimateTensileStrengthFmt,
  initialGaugeLength: r2.iglFmt,
  elongation: r2.elongationFmt,
});
assert.strictEqual(r2.areaFmt, '242.000', 'Area must be 242.000 mm²');
assert.strictEqual(r2.yieldStressFmt, '660.40', 'Yield stress must be 660.40 N/mm²');
assert.strictEqual(r2.ultimateTensileStrengthFmt, '809.36', 'Tensile strength must be 809.36 N/mm²');
assert.strictEqual(r2.iglFmt, '87.89', 'Initial Gauge Length must be 87.89 mm');
assert.strictEqual(r2.elongationFmt, '26.16', 'Elongation must be 26.16 %');

// Row 3: Width 20.000, Thickness 16.01, Area 320.200, Yield Load 165.96, Ult Load 205.8, Final GL 125.36
const r3 = result.rows[2];
assert.strictEqual(r3.sampleType, 'W-Beam');
assert.strictEqual(r3.areaFmt, '320.200', 'Area must be 320.200 mm²');
assert.strictEqual(r3.yieldStressFmt, '518.30', 'Yield stress must be 518.30 N/mm²');
assert.strictEqual(r3.ultimateTensileStrengthFmt, '642.72', 'Tensile strength must be 642.72 N/mm²');
assert.strictEqual(r3.iglFmt, '101.10', 'Initial Gauge Length must be 101.10 mm');
assert.strictEqual(r3.elongationFmt, '23.99', 'Elongation must be 23.99 %');

// Row 4: Width 20.000, Thickness 22.4, Area 448.000, Yield Load 297.528, Ult Load 297.552, Final GL 148.96
const r4 = result.rows[3];
assert.strictEqual(r4.sampleType, 'Channel');
assert.strictEqual(r4.areaFmt, '448.000', 'Area must be 448.000 mm²');
assert.strictEqual(r4.yieldStressFmt, '664.13', 'Yield stress must be 664.13 N/mm²');
assert.strictEqual(r4.ultimateTensileStrengthFmt, '664.18', 'Tensile strength must be 664.18 N/mm²');
assert.strictEqual(r4.iglFmt, '119.59', 'Initial Gauge Length must be 119.59 mm');
assert.strictEqual(r4.elongationFmt, '24.56', 'Elongation must be 24.56 %');

// Row 5: Width 20.000, Thickness 25.1, Area 502.000, Yield Load 264.144, Ult Load 319.32, Final GL 159.63
const r5 = result.rows[4];
assert.strictEqual(r5.sampleType, 'MS Plate');
assert.strictEqual(r5.areaFmt, '502.000', 'Area must be 502.000 mm²');
assert.strictEqual(r5.yieldStressFmt, '526.18', 'Yield stress must be 526.18 N/mm²');
assert.strictEqual(r5.ultimateTensileStrengthFmt, '636.10', 'Tensile strength must be 636.10 N/mm²');
assert.strictEqual(r5.iglFmt, '126.59', 'Initial Gauge Length must be 126.59 mm');
assert.strictEqual(r5.elongationFmt, '26.10', 'Elongation must be 26.10 %');

console.log('\nSummary metrics:', result.summary);
assert.strictEqual(result.summary.reportExcludeAverages, true);
assert.strictEqual(result.summary.includeAveragesInReport, false);
assert.strictEqual(result.summary.standard, 'IS 1608 (Part 1) : 2022');
assert.strictEqual(result.summary.count, 5);
assert.strictEqual(result.summary.hasBrand, true);
assert.strictEqual(result.summary.hasGrade, true);
assert.strictEqual(result.summary.clientReferenceColumns.brand, true);
assert.strictEqual(result.summary.clientReferenceColumns.grade, true);
assert.strictEqual(result.summary.includeBendInReport, false);
assert.strictEqual(result.summary.includeRebendInReport, false);

console.log('\n=== Test 3: Custom Option to include Bend and Rebend in final report ===');
const reportWithBendResult = calculateStructuralSteelTest(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.observations, {
  includeBrandInReport: true,
  includeGradeInReport: true,
  includeBendInReport: true,
  includeRebendInReport: true,
});
assert.strictEqual(reportWithBendResult.summary.includeBendInReport, true);
assert.strictEqual(reportWithBendResult.summary.includeRebendInReport, true);
assert.strictEqual(reportWithBendResult.summary.clientReferenceColumns.bend, true);
assert.strictEqual(reportWithBendResult.summary.clientReferenceColumns.rebend, true);

console.log('\nALL STRUCTURAL STEEL TESTS PASSED! 🎉');
