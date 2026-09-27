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
assert.strictEqual(DEFAULT_STEEL_OBSERVATIONS.length, 3, 'Default observations should have 3 rows');
assert.strictEqual(DEFAULT_STEEL_OBSERVATIONS[0].sampleId, 'Sample 1', 'Default sampleId should be Sample 1');
console.log('✅ Default structures verified!');

console.log('\n=== Test 2: Calculate with Reference PDF Sample Data (6 bars) ===');
const result = calculateSteelTest(SAMPLE_STEEL_TEST_DATA.observations, {
  includeHeatNoInReport: SAMPLE_STEEL_TEST_DATA.includeHeatNoInReport,
  includeInvoiceNoInReport: SAMPLE_STEEL_TEST_DATA.includeInvoiceNoInReport,
  includeVehicleNoInReport: SAMPLE_STEEL_TEST_DATA.includeVehicleNoInReport,
});

assert.strictEqual(result.rows.length, 6, 'Must calculate 6 rows');
const r1 = result.rows[0];
console.log('Row 1 (8mm):', {
  sampleId: r1.sampleId,
  heatNo: r1.heatNo,
  invoiceNo: r1.invoiceNo,
  vehicleNo: r1.vehicleNo,
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

// Requirement 3 checks: Heat No and Invoice No are present, Vehicle No is absent
assert.strictEqual(result.summary.hasHeatNo, true, 'Heat No is present');
assert.strictEqual(result.summary.hasInvoiceNo, true, 'Invoice No is present');
assert.strictEqual(result.summary.hasVehicleNo, false, 'Vehicle No is absent');
assert.strictEqual(result.summary.clientReferenceColumns.heatNo, true, 'Heat No column included');
assert.strictEqual(result.summary.clientReferenceColumns.invoiceNo, true, 'Invoice No column included');
assert.strictEqual(result.summary.clientReferenceColumns.vehicleNo, false, 'Vehicle No column excluded');
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

console.log('\nALL STEEL CALCULATION TESTS PASSED! 🎉');
