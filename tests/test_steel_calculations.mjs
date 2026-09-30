import assert from 'node:assert';
import {
  calculateSteelTest,
  DEFAULT_STEEL_OBSERVATION,
  DEFAULT_STEEL_OBSERVATIONS,
  SAMPLE_STEEL_TEST_DATA,
  STEEL_DENSITY_FACTOR,
} from '../ui/src/utils/steelTestCalculation.js';

console.log('=== Test 1: Check default structures ===');
assert.strictEqual(DEFAULT_STEEL_OBSERVATION.sampleId, '', 'sampleId must exist in default observation');
assert.strictEqual(DEFAULT_STEEL_OBSERVATION.heatNo, '', 'heatNo must exist in default observation');
assert.strictEqual(DEFAULT_STEEL_OBSERVATION.invoiceNo, '', 'invoiceNo must exist in default observation');
assert.strictEqual(DEFAULT_STEEL_OBSERVATION.vehicleNo, '', 'vehicleNo must exist in default observation');
assert.strictEqual(DEFAULT_STEEL_OBSERVATION.brand, '', 'brand must exist in default observation');
assert.strictEqual(DEFAULT_STEEL_OBSERVATION.grade, '', 'grade must exist in default observation');
assert.strictEqual(DEFAULT_STEEL_OBSERVATIONS.length, 3, 'Default observations should have 3 rows');
assert.strictEqual(DEFAULT_STEEL_OBSERVATIONS[0].sampleId, 'Sample 1', 'Default sampleId should be Sample 1');
console.log('✅ Default structures verified!');

console.log('\n=== Test 2: Calculate with Reference PDF Sample Data (6 bars) ===');
const result = calculateSteelTest(SAMPLE_STEEL_TEST_DATA.observations, {
  includeHeatNoInReport: SAMPLE_STEEL_TEST_DATA.includeHeatNoInReport,
  includeInvoiceNoInReport: SAMPLE_STEEL_TEST_DATA.includeInvoiceNoInReport,
  includeVehicleNoInReport: SAMPLE_STEEL_TEST_DATA.includeVehicleNoInReport,
  includeBrandInReport: SAMPLE_STEEL_TEST_DATA.includeBrandInReport,
  includeGradeInReport: SAMPLE_STEEL_TEST_DATA.includeGradeInReport,
});

assert.strictEqual(result.rows.length, 6, 'Must calculate 6 rows');
const r1 = result.rows[0];
console.log('Row 1 (8mm):', {
  sampleId: r1.sampleId,
  heatNo: r1.heatNo,
  invoiceNo: r1.invoiceNo,
  vehicleNo: r1.vehicleNo,
  brand: r1.brand,
  grade: r1.grade,
  nominalDia: r1.nominalDia,
  massPerMeter: r1.massPerMeterFmt,
  area: r1.areaFmt,
  yieldStress: r1.yieldStressFmt,
  tensileStrength: r1.tensileStrengthFmt,
  elongation: r1.elongationFmt,
});

assert.strictEqual(r1.sampleId, 'EESIPL/01/389(A)', 'Sample ID must match');
assert.strictEqual(r1.heatNo, '72142090', 'Heat No must match');
assert.strictEqual(r1.invoiceNo, 'CREDIT/2780', 'Invoice No must match');
assert.strictEqual(r1.vehicleNo, '', 'Vehicle No must be empty');
assert.strictEqual(r1.brand, 'TATA Tiscon', 'Brand must match');
assert.strictEqual(r1.grade, 'Fe 550D', 'Grade must match');
assert.strictEqual(r1.nominalDia, '8', 'Nominal Dia must be 8');
assert.strictEqual(r1.massPerMeterFmt, '0.396', 'Mass per meter must be 0.396 kg/m');
assert.strictEqual(r1.areaFmt, '50.45', 'Area must be 50.45 mm²');
assert.strictEqual(r1.yieldStressFmt, '1074.02', 'Yield stress must be ~1074 N/mm²');
assert.strictEqual(r1.tensileStrengthFmt, '1145.98', 'Tensile strength must be ~1146 N/mm²');
assert.strictEqual(r1.elongationFmt, '19.36', 'Elongation must be 19.36%');

console.log('Summary metrics:', result.summary);
// Requirement 1 checks
assert.strictEqual(result.summary.reportExcludeAverages, true, 'reportExcludeAverages must be true');
assert.strictEqual(result.summary.includeAveragesInReport, false, 'includeAveragesInReport must be false');
assert.strictEqual(result.summary.reportExcludeAvgYieldStress, true, 'reportExcludeAvgYieldStress must be true');
assert.strictEqual(result.summary.reportExcludeAvgTensileStrength, true, 'reportExcludeAvgTensileStrength must be true');
assert.strictEqual(result.summary.reportExcludeAvgElongation, true, 'reportExcludeAvgElongation must be true');

// Client reference checks: Heat No, Invoice No, Brand, Grade are present, Vehicle No is absent
assert.strictEqual(result.summary.hasHeatNo, true, 'Heat No is present');
assert.strictEqual(result.summary.hasInvoiceNo, true, 'Invoice No is present');
assert.strictEqual(result.summary.hasVehicleNo, false, 'Vehicle No is absent');
assert.strictEqual(result.summary.hasBrand, true, 'Brand is present');
assert.strictEqual(result.summary.hasGrade, true, 'Grade is present');
assert.strictEqual(result.summary.clientReferenceColumns.heatNo, true, 'Heat No column included');
assert.strictEqual(result.summary.clientReferenceColumns.invoiceNo, true, 'Invoice No column included');
assert.strictEqual(result.summary.clientReferenceColumns.vehicleNo, false, 'Vehicle No column excluded');
assert.strictEqual(result.summary.clientReferenceColumns.brand, true, 'Brand column included');
assert.strictEqual(result.summary.clientReferenceColumns.grade, true, 'Grade column included');
console.log('✅ Reference PDF calculations and exclusion flags verified!');

console.log('\n=== Test 3: Client with Heat No and Vehicle No (no Invoice No) ===');
const customObs = [
  {
    sampleId: 'S-01',
    heatNo: 'HEAT-999',
    invoiceNo: '',
    vehicleNo: 'KA-01-1234',
    nominalDia: '12',
    weight: '0.888',
    length: '1',
    yieldLoad: '50',
    ultimateLoad: '65',
    finalGaugeLength: '65',
  },
];
const customResult = calculateSteelTest(customObs);
assert.strictEqual(customResult.summary.hasHeatNo, true, 'Heat No is present');
assert.strictEqual(customResult.summary.hasInvoiceNo, false, 'Invoice No is absent');
assert.strictEqual(customResult.summary.hasVehicleNo, true, 'Vehicle No is present');
assert.strictEqual(customResult.summary.clientReferenceColumns.heatNo, true);
assert.strictEqual(customResult.summary.clientReferenceColumns.invoiceNo, false);
assert.strictEqual(customResult.summary.clientReferenceColumns.vehicleNo, true);
console.log('✅ Dynamic presence for Heat No + Vehicle No verified!');

console.log('\n=== Test 4: Client with NONE of the client references given ===');
const plainObs = [
  {
    sampleId: 'Plain-1',
    nominalDia: '10',
    weight: '0.617',
    length: '1',
    yieldLoad: '35',
    ultimateLoad: '45',
    finalGaugeLength: '55',
  },
];
const plainResult = calculateSteelTest(plainObs);
assert.strictEqual(plainResult.summary.hasHeatNo, false, 'Heat No is absent');
assert.strictEqual(plainResult.summary.hasInvoiceNo, false, 'Invoice No is absent');
assert.strictEqual(plainResult.summary.hasVehicleNo, false, 'Vehicle No is absent');
assert.strictEqual(plainResult.summary.clientReferenceColumns.heatNo, false);
assert.strictEqual(plainResult.summary.clientReferenceColumns.invoiceNo, false);
assert.strictEqual(plainResult.summary.clientReferenceColumns.vehicleNo, false);
console.log('✅ Absence of all 3 client reference columns verified!');

console.log('\n=== Test 5: IS 1786: 2008 Table 1 & Table 2 Nominal Mass and Tolerance Checks ===');
import {
  IS_1786_NOMINAL_PROPERTIES,
  getSteelToleranceInfo,
  NOMINAL_DIAMETERS,
} from '../ui/src/utils/steelTestCalculation.js';

// Verify all 13 diameters from Table 1 exist in NOMINAL_DIAMETERS
const expectedDias = ['4', '5', '6', '8', '10', '12', '16', '20', '25', '28', '32', '36', '40'];
expectedDias.forEach(d => {
  assert.ok(NOMINAL_DIAMETERS.includes(d), `NOMINAL_DIAMETERS must contain diameter ${d} mm`);
});

// Verify Table 1 nominal mass and Table 2 tolerances
const table1Expected = {
  '4':  { mass: 0.099, tol: -8, minMass: 0.099 * 0.92 },
  '5':  { mass: 0.154, tol: -8, minMass: 0.154 * 0.92 },
  '6':  { mass: 0.222, tol: -8, minMass: 0.222 * 0.92 },
  '8':  { mass: 0.395, tol: -8, minMass: 0.395 * 0.92 },
  '10': { mass: 0.617, tol: -8, minMass: 0.617 * 0.92 },
  '12': { mass: 0.888, tol: -6, minMass: 0.888 * 0.94 },
  '16': { mass: 1.58,  tol: -6, minMass: 1.58 * 0.94 },
  '20': { mass: 2.47,  tol: -4, minMass: 2.47 * 0.96 },
  '25': { mass: 3.85,  tol: -4, minMass: 3.85 * 0.96 },
  '28': { mass: 4.83,  tol: -4, minMass: 4.83 * 0.96 },
  '32': { mass: 6.31,  tol: -4, minMass: 6.31 * 0.96 },
  '36': { mass: 7.99,  tol: -4, minMass: 7.99 * 0.96 },
  '40': { mass: 9.86,  tol: -4, minMass: 9.86 * 0.96 },
};

Object.entries(table1Expected).forEach(([diaStr, exp]) => {
  const info = getSteelToleranceInfo(diaStr);
  assert.ok(info !== null, `Tolerance info for dia ${diaStr} must not be null`);
  assert.strictEqual(info.nominalMass, exp.mass, `Nominal mass for dia ${diaStr} must be ${exp.mass}`);
  assert.strictEqual(info.tolerancePercent, exp.tol, `Individual sample tolerance for dia ${diaStr} must be ${exp.tol}%`);
  assert.ok(Math.abs(info.minMassPerMeter - exp.minMass) < 1e-6, `Min mass per meter for dia ${diaStr} must be ~${exp.minMass}`);
});
console.log('✅ All 13 nominal diameters and individual sample tolerances verified!');

console.log('\n=== Test 6: Detect Mass per Metre Below Lower Limit Tolerance ===');
// 8mm bar: nominal mass = 0.395 kg/m, min allowable = 0.395 * 0.92 = 0.3634 kg/m
// 1) Test with weight = 0.350 kg, length = 1 m -> massPerMeter = 0.350 kg/m (BELOW limit)
const failingObs = [
  {
    sampleId: 'FAIL-8mm',
    nominalDia: '8',
    weight: '0.350',
    length: '1',
    yieldLoad: '50',
    ultimateLoad: '60',
    finalGaugeLength: '50',
  },
  {
    sampleId: 'PASS-8mm',
    nominalDia: '8',
    weight: '0.370',
    length: '1',
    yieldLoad: '50',
    ultimateLoad: '60',
    finalGaugeLength: '50',
  },
];
const failResult = calculateSteelTest(failingObs);
assert.strictEqual(failResult.rows[0].isBelowMassTolerance, true, 'Row 0 (0.350 kg/m) must be detected as below mass tolerance');
assert.strictEqual(failResult.rows[0].minMassPerMeterFmt, '0.363', 'Lower limit must format to 0.363');
assert.ok(failResult.rows[0].errors.some(e => e.includes('below IS 1786')), 'Row 0 errors must contain IS 1786 lower limit warning');
assert.strictEqual(failResult.rows[1].isBelowMassTolerance, false, 'Row 1 (0.370 kg/m) must be conforming');
assert.strictEqual(failResult.summary.hasBelowMassTolerance, true, 'Summary must flag that a row is below mass tolerance');
assert.strictEqual(failResult.summary.belowMassToleranceRows.length, 1, 'Summary must count exactly 1 below tolerance row');
console.log('✅ Below-tolerance detection and error reporting verified!');

console.log('\n=== Test 7: Direct mass per meter insertion ===');
const directObs = [
  {
    sampleId: 'DIRECT-12mm-FAIL',
    nominalDia: '12',
    massPerMeter: '0.800', // Nominal 0.888, -6% -> Min = 0.835 kg/m. 0.800 is BELOW
    length: '1',
    yieldLoad: '80',
    ultimateLoad: '95',
    finalGaugeLength: '65',
  },
];
const directResult = calculateSteelTest(directObs);
assert.strictEqual(directResult.rows[0].massPerMeterFmt, '0.800', 'Mass per meter must be 0.800');
assert.strictEqual(directResult.rows[0].isBelowMassTolerance, true, 'Direct mass 0.800 must be below 0.835 limit for 12mm');
assert.strictEqual(directResult.rows[0].toleranceInfo.tolerancePercent, -6, '12mm tolerance must be -6%');
console.log('✅ Direct mass per meter input verified!');

console.log('\nALL STEEL CALCULATION TESTS PASSED! 🎉');
