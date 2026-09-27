import {
  calculateAacBlockCompressiveStrength,
  calculateAacBlockWaterAbsorption,
  calculateAacBlockDensity,
  calculateAacBlockMoistureContent,
  calculateAacBlockTest,
  SAMPLE_AAC_BLOCK_TEST_DATA,
} from '../ui/src/utils/aacBlockTestCalculation.js';

console.log('--- Testing AAC Block Calculations ---');

// ─── Test 1: Compressive Strength (PDF Page 1) ───────────────────────────────
// R1: 150x150x150, Load = 117.0 -> Area = 22500, Strength = 5.2
// R2: 150x150x150, Load = 129.0 -> Area = 22500, Strength = 5.7
// R3: 150x150x150, Load = 132.0 -> Area = 22500, Strength = 5.9
// Avg = 5.6
const compResult = calculateAacBlockCompressiveStrength(
  SAMPLE_AAC_BLOCK_TEST_DATA.compressive.observations
);

console.log('Comp R1 Area:', compResult.rows[0].areaFmt, 'Expected: 22500');
console.log('Comp R1 Strength:', compResult.rows[0].strengthFmt, 'Expected: 5.2');
console.log('Comp R2 Strength:', compResult.rows[1].strengthFmt, 'Expected: 5.7');
console.log('Comp R3 Strength:', compResult.rows[2].strengthFmt, 'Expected: 5.9');
console.log('Comp Avg Strength:', compResult.avgStrengthFmt, 'Expected: 5.6');

if (compResult.rows[0].areaFmt !== '22500') {
  throw new Error(`Comp R1 area mismatch: expected 22500, got ${compResult.rows[0].areaFmt}`);
}
if (compResult.rows[0].strengthFmt !== '5.2') {
  throw new Error(`Comp R1 strength mismatch: expected 5.2, got ${compResult.rows[0].strengthFmt}`);
}
if (compResult.rows[1].strengthFmt !== '5.7') {
  throw new Error(`Comp R2 strength mismatch: expected 5.7, got ${compResult.rows[1].strengthFmt}`);
}
if (compResult.rows[2].strengthFmt !== '5.9') {
  throw new Error(`Comp R3 strength mismatch: expected 5.9, got ${compResult.rows[2].strengthFmt}`);
}
if (compResult.avgStrengthFmt !== '5.6') {
  throw new Error(`Comp avg strength mismatch: expected 5.6, got ${compResult.avgStrengthFmt}`);
}

// ─── Test 2: Water Absorption (PDF Page 2) ───────────────────────────────────
// R1: A=187, B=158 -> 18.4%
// R2: A=179, B=157 -> 14.0%
// R3: A=180, B=152 -> 18.4%
// R4: A=178, B=158 -> 12.7%
// R5: A=187, B=165 -> 13.3%
// R6: A=198, B=166 -> 19.3%
// Avg = 16.0%
const waResult = calculateAacBlockWaterAbsorption(
  SAMPLE_AAC_BLOCK_TEST_DATA.waterAbsorption.observations
);

console.log('WA R1:', waResult.rows[0].waFmt, 'Expected: 18.4');
console.log('WA R2:', waResult.rows[1].waFmt, 'Expected: 14.0');
console.log('WA R3:', waResult.rows[2].waFmt, 'Expected: 18.4');
console.log('WA R4:', waResult.rows[3].waFmt, 'Expected: 12.7');
console.log('WA R5:', waResult.rows[4].waFmt, 'Expected: 13.3');
console.log('WA R6:', waResult.rows[5].waFmt, 'Expected: 19.3');
console.log('WA Avg:', waResult.avgWaFmt, 'Expected: 16.0');

const expectedWa = ['18.4', '14.0', '18.4', '12.7', '13.3', '19.3'];
waResult.rows.forEach((row, i) => {
  if (row.waFmt !== expectedWa[i]) {
    throw new Error(`WA R${i + 1} mismatch: expected ${expectedWa[i]}, got ${row.waFmt}`);
  }
});
if (waResult.avgWaFmt !== '16.0') {
  throw new Error(`WA Avg mismatch: expected 16.0, got ${waResult.avgWaFmt}`);
}

// ─── Test 3: Density (PDF Page 3 & 4) ────────────────────────────────────────
// 100x200x50, Vol = 0.0010 m³
// R1: W = 0.648 kg -> Density = 648.000 kg/m³
// R2: W = 0.645 kg -> Density = 645.000 kg/m³
// R3: W = 0.640 kg -> Density = 640.000 kg/m³
// Avg = 644.33 kg/m³
const densResult = calculateAacBlockDensity(
  SAMPLE_AAC_BLOCK_TEST_DATA.density.observations
);

console.log('Dens R1 Volume:', densResult.rows[0].volumeFmt, 'Expected: 0.0010');
console.log('Dens R1 Density:', densResult.rows[0].densityFmt, 'Expected: 648.000');
console.log('Dens R2 Density:', densResult.rows[1].densityFmt, 'Expected: 645.000');
console.log('Dens R3 Density:', densResult.rows[2].densityFmt, 'Expected: 640.000');
console.log('Dens Avg Density:', densResult.avgDensityFmt, 'Expected: 644.33');

if (densResult.rows[0].volumeFmt !== '0.0010') {
  throw new Error(`Dens R1 volume mismatch: expected 0.0010, got ${densResult.rows[0].volumeFmt}`);
}
if (densResult.rows[0].densityFmt !== '648.000') {
  throw new Error(`Dens R1 density mismatch: expected 648.000, got ${densResult.rows[0].densityFmt}`);
}
if (densResult.rows[1].densityFmt !== '645.000') {
  throw new Error(`Dens R2 density mismatch: expected 645.000, got ${densResult.rows[1].densityFmt}`);
}
if (densResult.rows[2].densityFmt !== '640.000') {
  throw new Error(`Dens R3 density mismatch: expected 640.000, got ${densResult.rows[2].densityFmt}`);
}
if (densResult.avgDensityFmt !== '644.33') {
  throw new Error(`Dens Avg mismatch: expected 644.33, got ${densResult.avgDensityFmt}`);
}

// ─── Test 4: Moisture Content (PDF Page 5 & 6) ───────────────────────────────
// R1: 158 g / 143 g -> 10%
// R2: 156 g / 145 g -> 8%
// R3: 159 g / 146 g -> 9%
// Avg = 9%
const moistResult = calculateAacBlockMoistureContent(
  SAMPLE_AAC_BLOCK_TEST_DATA.moistureContent.observations
);

console.log('Moisture R1:', moistResult.rows[0].moistureFmt, 'Expected: 10');
console.log('Moisture R2:', moistResult.rows[1].moistureFmt, 'Expected: 8');
console.log('Moisture R3:', moistResult.rows[2].moistureFmt, 'Expected: 9');
console.log('Moisture Avg:', moistResult.avgMoistureFmt, 'Expected: 9');

if (moistResult.rows[0].moistureFmt !== '10') {
  throw new Error(`Moisture R1 mismatch: expected 10, got ${moistResult.rows[0].moistureFmt}`);
}
if (moistResult.rows[1].moistureFmt !== '8') {
  throw new Error(`Moisture R2 mismatch: expected 8, got ${moistResult.rows[1].moistureFmt}`);
}
if (moistResult.rows[2].moistureFmt !== '9') {
  throw new Error(`Moisture R3 mismatch: expected 9, got ${moistResult.rows[2].moistureFmt}`);
}
if (moistResult.avgMoistureFmt !== '9') {
  throw new Error(`Moisture Avg mismatch: expected 9, got ${moistResult.avgMoistureFmt}`);
}

console.log('ALL AAC BLOCK TESTS PASSED PERFECTLY!');
