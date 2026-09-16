/**
 * Utility functions for Soil Grain Size & Sieve Analysis Calculation
 * Standard: IS 2720 (Part 4) - Methods of Test for Soils: Grain Size Analysis
 * Classification: IS 1498 - Classification and Identification of Soils for General Engineering Purposes
 * 
 * Soil Fractions:
 * - Gravel (G): Particles retained on 4.75 mm IS Sieve and above (10 mm + 4.75 mm)
 * - Sand (S): Particles passing 4.75 mm and retained on 0.075 mm (75 µm) IS Sieve (2.36 mm to 0.075 mm)
 * - Silt & Clay (SC / Fines): Particles passing 0.075 mm (75 µm) IS Sieve (collected in Pan and washing loss)
 * 
 * Rule: % Gravel + % Sand + % Silt and Clay = 100.00%
 */

export const SIEVES_CONFIG = [
  { key: 'sieve0', label: '10 mm', size: 10, fraction: 'Gravel', fractionKey: 'G', category: 'gravel' },
  { key: 'sieve1', label: '4.75 mm', size: 4.75, fraction: 'Gravel', fractionKey: 'G', category: 'gravel' },
  { key: 'sieve2', label: '2.36 mm', size: 2.36, fraction: 'Sand (Coarse)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve3', label: '2 mm', size: 2, fraction: 'Sand (Coarse)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve4', label: '1.18 mm', size: 1.18, fraction: 'Sand (Medium)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve5', label: '0.60 mm', size: 0.6, fraction: 'Sand (Medium)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve6', label: '0.425 mm', size: 0.425, fraction: 'Sand (Medium)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve7', label: '0.30 mm', size: 0.3, fraction: 'Sand (Fine)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve8', label: '0.15 mm', size: 0.15, fraction: 'Sand (Fine)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve9', label: '0.075 mm', size: 0.075, fraction: 'Sand (Fine)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve10', label: 'Pan', size: null, fraction: 'Silt & Clay (Fines)', fractionKey: 'SC', category: 'fines' },
];

/**
 * Calculates Grain Size Distribution and sieve analysis table
 * @param {Object} params
 * @param {number|string} params.totalWeight - Total sample weight taken (g)
 * @param {Object} params.sieves - Map of sieve keys (sieve0..sieve10) to weights in grams
 * @returns {Object}
 */
export function calculateGrainSizeFromSieve({ totalWeight, sieves = {} }) {
  const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';
  const numTotalWeight = isPresent(totalWeight) ? parseFloat(totalWeight) : NaN;

  // Extract weights for each sieve
  let sumRetained = 0;
  let hasAnyInput = false;

  const parsedWeights = {};
  SIEVES_CONFIG.forEach((s) => {
    const raw = sieves[s.key] ?? sieves[s.key.replace('sieve', 'sieve_')] ?? sieves[s.label];
    const val = isPresent(raw) ? parseFloat(raw) : NaN;
    if (!isNaN(val) && val >= 0) {
      parsedWeights[s.key] = val;
      sumRetained += val;
      if (val > 0) hasAnyInput = true;
    } else {
      parsedWeights[s.key] = 0;
    }
  });

  const effectiveTotal = !isNaN(numTotalWeight) && numTotalWeight > 0 ? numTotalWeight : sumRetained;

  // Compute table rows
  let cumWt = 0;
  let cumPctRetainedAcc = 0;
  const sieveRows = SIEVES_CONFIG.map((s) => {
    const wt = parsedWeights[s.key];
    cumWt += wt;

    const pctRetained = effectiveTotal > 0 ? (wt / effectiveTotal) * 100 : 0;
    cumPctRetainedAcc += pctRetained;
    const cumPctRetained = Math.min(100, cumPctRetainedAcc);
    const finesPassing = Math.max(0, 100 - cumPctRetained);

    return {
      ...s,
      wt,
      rawInput: sieves[s.key] ?? '',
      pctRetained: Number(pctRetained.toFixed(2)),
      cumPctRetained: Number(cumPctRetained.toFixed(2)),
      finesPassing: Number(finesPassing.toFixed(2)),
    };
  });

  // Gravel fraction: >= 4.75 mm (sieve0 + sieve1)
  const gravelWeight = parsedWeights.sieve0 + parsedWeights.sieve1;
  const rawGravelPct = effectiveTotal > 0 ? (gravelWeight / effectiveTotal) * 100 : 0;
  const gravelPct = Number(rawGravelPct.toFixed(2));

  // Sand fraction: 4.75 mm to 0.075 mm (sieve2 through sieve9)
  const sandWeight =
    parsedWeights.sieve2 +
    parsedWeights.sieve3 +
    parsedWeights.sieve4 +
    parsedWeights.sieve5 +
    parsedWeights.sieve6 +
    parsedWeights.sieve7 +
    parsedWeights.sieve8 +
    parsedWeights.sieve9;
  const rawSandPct = effectiveTotal > 0 ? (sandWeight / effectiveTotal) * 100 : 0;
  const sandPct = Number(rawSandPct.toFixed(2));

  // Silt & Clay fraction (SC / Fines): < 0.075 mm (passing 75 µm sieve)
  // Ensures G% + S% + SC% = 100.00%
  const panWeight = parsedWeights.sieve10;
  let siltAndClayPct = 0;
  if (effectiveTotal > 0 && (gravelPct > 0 || sandPct > 0 || panWeight > 0 || sumRetained > 0)) {
    siltAndClayPct = Number(Math.max(0, 100 - gravelPct - sandPct).toFixed(2));
  }

  // Mass recovery & balance
  const massLoss = !isNaN(numTotalWeight) && numTotalWeight > 0 ? numTotalWeight - sumRetained : 0;
  const recoveryPercent = effectiveTotal > 0 ? (sumRetained / effectiveTotal) * 100 : 0;

  // Validation Warnings & Errors
  const warnings = [];
  const errors = [];

  if (!isNaN(numTotalWeight) && numTotalWeight > 0) {
    if (sumRetained > 0 && sumRetained < numTotalWeight * 0.01) {
      warnings.push(
        `Sum of retained weights (${sumRetained.toFixed(2)} g) is less than 1% of the total sample weight (${numTotalWeight.toFixed(2)} g). Minimum required per IS code: ${(numTotalWeight * 0.01).toFixed(2)} g.`
      );
    }
    if (sumRetained > numTotalWeight * 1.01) {
      warnings.push(
        `Sum of retained weights (${sumRetained.toFixed(2)} g) exceeds the total sample weight (${numTotalWeight.toFixed(2)} g) by ${(sumRetained - numTotalWeight).toFixed(2)} g.`
      );
    }
  }

  const hasData = hasAnyInput || (!isNaN(numTotalWeight) && numTotalWeight > 0);

  return {
    totalWeight: !isNaN(numTotalWeight) ? numTotalWeight : '',
    sumRetained: Number(sumRetained.toFixed(2)),
    effectiveTotal: Number(effectiveTotal.toFixed(2)),
    massLoss: Number(massLoss.toFixed(2)),
    recoveryPercent: Number(recoveryPercent.toFixed(2)),
    sieveRows,
    gravelWeight: Number(gravelWeight.toFixed(2)),
    sandWeight: Number(sandWeight.toFixed(2)),
    panWeight: Number(panWeight.toFixed(2)),
    gravel: hasData ? gravelPct.toFixed(2) : '',
    sand: hasData ? sandPct.toFixed(2) : '',
    siltAndClay: hasData ? siltAndClayPct.toFixed(2) : '',
    rawGravel: gravelPct,
    rawSand: sandPct,
    rawSiltAndClay: siltAndClayPct,
    hasData,
    warnings,
    errors,
  };
}
