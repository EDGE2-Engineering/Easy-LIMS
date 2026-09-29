import assert from 'node:assert';
import {
  SIEVES_CONFIG,
  FULL_SIEVES_CONFIG,
  calculateGrainSizeFromSieve,
  HYDROMETER_DEFAULTS,
  DEFAULT_HYDROMETER_TIMES,
  getWaterDensity,
  getDistilledWaterReading,
  getWaterViscosity,
  calculateEffectiveDepth,
  calculateFactorK,
  calculateParticleDiameter,
  calculatePercentageFiner,
  calculateHydrometerAnalysis,
  PDF_SAMPLE_DATA,
} from '../ui/src/utils/grainSizeCalculation.js';

console.log('====================================================');
console.log('Testing Grain Size & Hydrometer Analysis (IS 2720: Part 4)');
console.log('====================================================');

// 1. Sieve Analysis from PDF Page 1 & 2
const sieveResult = calculateGrainSizeFromSieve({
  totalWeight: PDF_SAMPLE_DATA.sieve.totalWeight,
  sieves: PDF_SAMPLE_DATA.sieve,
});

console.log('Sieve Retained Sum:', sieveResult.sumRetained);
console.log('Gravel %:', sieveResult.gravel);
console.log('Sand %:', sieveResult.sand);
console.log('Silt & Clay %:', sieveResult.siltAndClay);
console.log('Passing 75µ %:', sieveResult.passing75um);

// Assert sum retained matches Page 1 (198.85 g)
assert.strictEqual(sieveResult.sumRetained, 198.85, 'Sum of retained weights should be 198.85 g');
assert(Math.abs(sieveResult.passing75um - 75.24) < 0.05, 'Passing 75µ should be approx 75.24%');
assert.strictEqual(sieveResult.requiresHydrometer, true, 'Passing 75µ > 10% requires Hydrometer analysis');

// Sand Bifurcation check
// Coarse: 98.80 - 95.37 = 3.43%
// Medium: 95.37 - 90.69 = 4.68%
// Fine: 90.69 - 75.24 = 15.45%
console.log('Sand Bifurcation:', sieveResult.sandBifurcation);
assert(Math.abs(sieveResult.sandBifurcation.coarse - 3.43) < 0.05, 'Coarse sand should be approx 3.43%');
assert(Math.abs(sieveResult.sandBifurcation.medium - 4.68) < 0.05, 'Medium sand should be approx 4.68%');
assert(Math.abs(sieveResult.sandBifurcation.fine - 15.45) < 0.05, 'Fine sand should be approx 15.45%');

// 2. Reference Tables Check
// Density of water: 28°C -> 0.99616030, 26°C -> 0.99667180, 25°C -> 0.99692755
assert(Math.abs(getWaterDensity(28) - 0.99616030) < 0.00001, 'Water density at 28°C should match Table 1');
assert(Math.abs(getWaterDensity(26) - 0.99667180) < 0.00001, 'Water density at 26°C should match Table 1');
assert(Math.abs(getWaterDensity(25) - 0.99692755) < 0.00001, 'Water density at 25°C should match Table 1');

// Distilled water HM reading: 28°C -> 0.9995, 26°C -> 1.0000, 25°C -> 1.0005
assert.strictEqual(getDistilledWaterReading(28), 0.9995, 'Distilled water reading at 28°C should be 0.9995');
assert.strictEqual(getDistilledWaterReading(26), 1.0000, 'Distilled water reading at 26°C should be 1.0000');
assert.strictEqual(getDistilledWaterReading(25), 1.0005, 'Distilled water reading at 25°C should be 1.0005');

// Viscosity of water: 28°C -> 0.0083864, 26°C -> 0.0087948, 25°C -> 0.0089990
assert(Math.abs(getWaterViscosity(28) - 0.0083864) < 0.00001, 'Viscosity at 28°C should match Table 3');
assert(Math.abs(getWaterViscosity(26) - 0.0087948) < 0.00001, 'Viscosity at 26°C should match Table 3');
assert(Math.abs(getWaterViscosity(25) - 0.0089990) < 0.00001, 'Viscosity at 25°C should match Table 3');

// 3. Hydrometer Analysis Calculations (Pages 19-25)
const hydroResult = calculateHydrometerAnalysis({
  readings: PDF_SAMPLE_DATA.hydrometer.readings,
  sieveTotalWeight: PDF_SAMPLE_DATA.sieve.totalWeight,
  finesPassing75um: sieveResult.passing75um,
  specificGravitySoil: 2.55,
  drySampleWeight: 50.0,
});

console.log('Sample passed 75µ (Md):', hydroResult.samplePassed75um, 'g (Expected: 150.47)');
console.log('Sample retained on 75µ:', hydroResult.sampleRetained75um, 'g (Expected: 49.53)');
assert(Math.abs(hydroResult.samplePassed75um - 150.47) < 0.05, 'Md should be approx 150.47 g');
assert(Math.abs(hydroResult.sampleRetained75um - 49.53) < 0.05, 'Sample retained 75µ should be approx 49.53 g');

// Check Row 1 (t = 0.5 min, T = 28°C, Rh = 1.0115)
const r1 = hydroResult.rows[0];
console.log('Row 1 (t=0.5):', {
  correctedRh: r1.correctedRh,
  tempCrctnCt: r1.tempCrctnCt,
  rhCtCd: r1.rhTotalCorrection,
  effectiveDepthHe: r1.effectiveDepthHe,
  factorK: r1.factorKDisplay,
  diaParticleD: r1.diaParticleD,
  percentageFinerN: r1.percentageFinerN,
  massPassed75um: r1.massPassed75um,
  combinedPercentageFiner: r1.combinedPercentageFiner,
});

assert(Math.abs(r1.correctedRh - 1.0120) < 0.0001, 'Row 1 Rh should be 1.0120');
assert(Math.abs(r1.tempCrctnCt - 3.34) < 0.02, 'Row 1 Ct should be approx 3.34');
assert(Math.abs(r1.rhTotalCorrection - 12.84) < 0.05, 'Row 1 Rh+Ct-Cd should be approx 12.84');
assert(Math.abs(r1.effectiveDepthHe - 14.88) < 0.05, 'Row 1 He should be approx 14.88 cm');
assert.strictEqual(r1.factorKDisplay, 1287, 'Row 1 Factor K should display as 1287');
assert(Math.abs(r1.diaParticleD - 0.070) < 0.005, 'Row 1 D should be approx 0.070 mm');
assert(Math.abs(r1.percentageFinerN - 42.25) < 0.05, 'Row 1 N should be approx 42.25%');
assert(Math.abs(r1.combinedPercentageFiner - 31.78) < 0.05, 'Row 1 combined % finer should be approx 31.78%');

// Check Row 5 (t = 8 min, T = 28°C, Rh = 1.0110) - Equation 2 for He (t > 4 min)
const r5 = hydroResult.rows[4];
console.log('Row 5 (t=8):', {
  effectiveDepthHe: r5.effectiveDepthHe,
  diaParticleD: r5.diaParticleD,
  combinedPercentageFiner: r5.combinedPercentageFiner,
});
assert(Math.abs(r5.effectiveDepthHe - 16.48) < 0.05, 'Row 5 He should be approx 16.48 cm');
assert(Math.abs(r5.diaParticleD - 0.018) < 0.005, 'Row 5 D should be approx 0.018 mm');
assert(Math.abs(r5.combinedPercentageFiner - 30.55) < 0.1, 'Row 5 combined % finer should be approx 30.55%');

// Check Row 12 (t = 1380 min, T = 25°C, Rh = 1.0070)
const r12 = hydroResult.rows[11];
console.log('Row 12 (t=1380):', {
  effectiveDepthHe: r12.effectiveDepthHe,
  diaParticleD: r12.diaParticleD,
  combinedPercentageFiner: r12.combinedPercentageFiner,
});
assert(Math.abs(r12.effectiveDepthHe - 17.96) < 0.05, 'Row 12 He should be approx 17.96 cm');
assert(Math.abs(r12.diaParticleD - 0.002) < 0.001, 'Row 12 D should be approx 0.002 mm');
assert(Math.abs(r12.combinedPercentageFiner - 21.22) < 0.1, 'Row 12 combined % finer should be approx 21.22%');

// 4. Check Silt & Clay Bifurcation
// Silt: 51.5%, Clay: 23.7% (Clay is % finer at 0.002 mm)
console.log('Silt & Clay Bifurcation:', hydroResult.bifurcation);
assert(Math.abs(hydroResult.bifurcation.clay - 23.7) < 3.0, 'Clay fraction should be approx 21-24%');
assert(Math.abs(hydroResult.bifurcation.silt + hydroResult.bifurcation.clay - sieveResult.passing75um) < 0.1, 'Silt + Clay must equal % passing 75µ');

console.log('ALL GRAIN SIZE & HYDROMETER TESTS PASSED! 🚀');
