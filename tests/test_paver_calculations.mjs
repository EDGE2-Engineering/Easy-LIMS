import {
  calculatePaverBlockCompressiveStrength,
  calculatePaverBlockWaterAbsorption,
  calculatePaverBlockTest,
  getPaverCorrectionFactor,
  SAMPLE_PAVER_BLOCK_TEST_DATA,
  SAMPLE_CHAMFERED_PAVER_BLOCK_TEST_DATA,
} from '../ui/src/utils/paverBlockTestCalculation.js';

console.log('--- Testing Paver Block Calculations ---');

// Test 1: Plain Block (Existing sample data)
const plainResult = calculatePaverBlockCompressiveStrength(
  SAMPLE_PAVER_BLOCK_TEST_DATA.compressiveObservations,
  SAMPLE_PAVER_BLOCK_TEST_DATA.metadata
);
console.log('Plain Block Avg Compressive Strength:', plainResult.avgCompStrengthFormatted);
console.log('Plain Block Avg Corrected Strength:', plainResult.avgCorrectedStrengthFormatted);
console.log('Plain Block R1 Corrected Strength:', plainResult.rows[0].correctedStrengthFormatted);
if (plainResult.rows[0].correctedStrengthFormatted !== '40.5') {
  throw new Error(`Expected R1 to be 40.5, got ${plainResult.rows[0].correctedStrengthFormatted}`);
}

// Test 2: Chamfered Block (PDF Page 2)
// Row 1: m_sp = 1.74, m_std = 1.28, thickness = 60, load = 123.054 kN
// Area = Math.round(20000 * 1.74 / 1.28) = 27188
// Comp Strength = (123.054 * 1000 / 27188) = 4.526... -> 4.53
// Correction factor for 60mm chamfered = 1.06
// Corrected Strength = 4.53 * 1.06 = 4.8
const chamferedObservations = [
  { sampleId: 'R1', msp: '1.74', mstd: '1.28', thickness: '60', failureLoadKn: '123.054' },
  { sampleId: 'R2', msp: '1.68', mstd: '1.28', thickness: '60', failureLoadKn: '123.456' },
];
const chamferedMeta = { standard: 'IS 15658 : 2021', blockType: 'chamfered' };
const chamferedResult = calculatePaverBlockCompressiveStrength(chamferedObservations, chamferedMeta);

const r1 = chamferedResult.rows[0];
console.log('Chamfered R1 Area:', r1.area, 'Expected: 27188');
console.log('Chamfered R1 Comp Strength:', r1.compStrengthFormatted, 'Expected: 4.53');
console.log('Chamfered R1 Factor:', r1.correctionFactor, 'Expected: 1.06');
console.log('Chamfered R1 Corrected Strength:', r1.correctedStrengthFormatted, 'Expected: 4.8');

if (r1.area !== 27188) {
  throw new Error(`R1 Area expected 27188, got ${r1.area}`);
}
if (r1.compStrengthFormatted !== '4.53') {
  throw new Error(`R1 Comp Strength expected 4.53, got ${r1.compStrengthFormatted}`);
}
if (r1.correctionFactor !== 1.06) {
  throw new Error(`R1 Factor expected 1.06, got ${r1.correctionFactor}`);
}
if (r1.correctedStrengthFormatted !== '4.8') {
  throw new Error(`R1 Corrected Strength expected 4.8, got ${r1.correctedStrengthFormatted}`);
}

const r2 = chamferedResult.rows[1];
console.log('Chamfered R2 Area:', r2.area, 'Expected: 26250');
console.log('Chamfered R2 Comp Strength:', r2.compStrengthFormatted, 'Expected: 4.70');
if (r2.area !== 26250) {
  throw new Error(`R2 Area expected 26250, got ${r2.area}`);
}
if (r2.compStrengthFormatted !== '4.70') {
  throw new Error(`R2 Comp Strength expected 4.70, got ${r2.compStrengthFormatted}`);
}

// Test 3: Water absorption (PDF Page 3)
const waResult = calculatePaverBlockWaterAbsorption(
  SAMPLE_PAVER_BLOCK_TEST_DATA.waterAbsorptionObservations,
  SAMPLE_PAVER_BLOCK_TEST_DATA.metadata
);
console.log('Water Absorption Avg:', waResult.avgWaterAbsorptionFormatted, 'Expected: 4.1');
if (waResult.avgWaterAbsorptionFormatted !== '4.1') {
  throw new Error(`Expected 4.1, got ${waResult.avgWaterAbsorptionFormatted}`);
}

console.log('ALL PAVER BLOCK TESTS PASSED SUCCESSFULLY!');
