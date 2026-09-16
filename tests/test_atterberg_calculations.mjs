import assert from 'node:assert';
import {
  calculateCasagrandeLiquidLimit,
  calculatePlasticLimit,
  calculateConePenetrationLiquidLimit,
  calculateAtterbergLimits,
  ATTERBERG_METHODS,
  SAMPLE_CASAGRANDE_DATA,
  SAMPLE_CONE_PENETRATION_DATA,
} from '../ui/src/utils/atterbergCalculation.js';

console.log('--- Testing Casagrande Method ---');
const casagrandeLL = calculateCasagrandeLiquidLimit(SAMPLE_CASAGRANDE_DATA.liquidTrials);
console.log('Casagrande LL Trials:', casagrandeLL.trials.map(t => ({
  blows: t.blows,
  w: t.waterContent,
  waterWeight: t.waterWeight,
  solidsWeight: t.solidsWeight,
})));
console.log('Casagrande LL Result:', {
  slope: casagrandeLL.regression?.slope,
  intercept: casagrandeLL.regression?.intercept,
  r2: casagrandeLL.regression?.rSquared,
  rawLL: casagrandeLL.rawLiquidLimit,
  displayLL: casagrandeLL.liquidLimitDisplay,
});

assert(casagrandeLL.trials.length === 5, 'Must have 5 trials');
assert(casagrandeLL.trials.every(t => t.isValid), 'All 5 sample trials must be valid');
// Trial 1: (3.23 / 6.95) * 100 = 46.47%
assert.strictEqual(casagrandeLL.trials[0].waterContent, 46.47);
// Trial 2: (3.45 / 7.23) * 100 = 47.72%
assert.strictEqual(casagrandeLL.trials[1].waterContent, 47.72);
// Trial 3: (3.37 / 6.94) * 100 = 48.56%
assert.strictEqual(casagrandeLL.trials[2].waterContent, 48.56);
// Trial 4: (3.45 / 6.95) * 100 = 49.64%
assert.strictEqual(casagrandeLL.trials[3].waterContent, 49.64);
// Trial 5: (3.37 / 6.65) * 100 = 50.68%
assert.strictEqual(casagrandeLL.trials[4].waterContent, 50.68);

// LL at 25 blows: approx 48.8% -> matches graphical read of ~49.0%
assert(casagrandeLL.liquidLimit >= 48.5 && casagrandeLL.liquidLimit <= 49.2, 'LL should be around 48.8 - 49.0%');

const casagrandePL = calculatePlasticLimit(SAMPLE_CASAGRANDE_DATA.plasticTrials);
console.log('Casagrande PL Result:', {
  t1: casagrandePL.trials[0].waterContent,
  t2: casagrandePL.trials[1].waterContent,
  rawPL: casagrandePL.rawPlasticLimit,
  displayPL: casagrandePL.plasticLimitDisplay,
  wholePL: casagrandePL.plasticLimitWhole,
});
// Trial 1: 0.37 / 1.33 = 27.82%
assert.strictEqual(casagrandePL.trials[0].waterContent, 27.82);
// Trial 2: 0.29 / 1.00 = 29.00%
assert.strictEqual(casagrandePL.trials[1].waterContent, 29.00);
// Average: (27.82 + 29.00) / 2 = 28.41% -> display 28.4%
assert.strictEqual(casagrandePL.plasticLimitDisplay, '28.4');

const overallCasagrande = calculateAtterbergLimits({
  method: ATTERBERG_METHODS.CASAGRANDE,
  casagrandeLiquidTrials: SAMPLE_CASAGRANDE_DATA.liquidTrials,
  casagrandePlasticTrials: SAMPLE_CASAGRANDE_DATA.plasticTrials,
});
console.log('Overall Casagrande:', {
  LL: overallCasagrande.liquidLimit,
  PL: overallCasagrande.plasticLimit,
  PI: overallCasagrande.plasticityIndex,
});
assert.strictEqual(overallCasagrande.plasticLimit, '28.4');
// PI = 48.8 - 28.4 = 20.4
assert(parseFloat(overallCasagrande.plasticityIndex) > 20.0, 'PI should be around 20.4');

console.log('\n--- Testing Cone Penetration Method ---');
const coneCalc = calculateConePenetrationLiquidLimit(SAMPLE_CONE_PENETRATION_DATA.trials);
console.log('Cone Trials:', coneCalc.trials.map(t => ({
  pen: t.penetration,
  w: t.waterContent,
  waterWeight: t.waterWeight,
  solidsWeight: t.solidsWeight,
})));
console.log('Cone LL Result:', {
  slope: coneCalc.regression?.slope,
  intercept: coneCalc.regression?.intercept,
  r2: coneCalc.regression?.rSquared,
  rawLL: coneCalc.rawLiquidLimit,
  displayLL: coneCalc.liquidLimitDisplay,
});

assert.strictEqual(coneCalc.trials.length, 4);
assert.strictEqual(coneCalc.trials[0].waterContent, 23.85);
assert.strictEqual(coneCalc.trials[1].waterContent, 25.39);
assert.strictEqual(coneCalc.trials[2].waterContent, 26.94);
assert.strictEqual(coneCalc.trials[3].waterContent, 28.39);

// LL at 20 mm penetration: approx 25.6% - 25.8%
assert(coneCalc.liquidLimit >= 25.5 && coneCalc.liquidLimit <= 25.9, 'Cone LL should be around 25.6 - 25.8%');

const overallCone = calculateAtterbergLimits({
  method: ATTERBERG_METHODS.CONE_PENETRATION,
  coneTrials: SAMPLE_CONE_PENETRATION_DATA.trials,
});
console.log('Overall Cone Penetration:', {
  LL: overallCone.liquidLimit,
  PL: overallCone.plasticLimit,
  PI: overallCone.plasticityIndex,
});
assert.strictEqual(overallCone.plasticLimit, 'NP');
assert.strictEqual(overallCone.plasticityIndex, '-');

console.log('\n✅ All Atterberg calculation tests passed successfully!');
