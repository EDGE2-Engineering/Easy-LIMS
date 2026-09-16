/**
 * Utility functions for Soil Atterberg Limits Calculation
 * Standard: IS:2720 (Part 5) - Methods of Test for Soils: Determination of Liquid and Plastic Limit
 * 
 * Methods Supported:
 * 1. Casagrande Apparatus Method:
 *    - Liquid Limit (LL): 5 trials. Semi-log regression of Water Content vs No. of Blows. LL is moisture content at 25 blows.
 *    - Plastic Limit (PL): 2 trials. Average water content of soil threads rolled to 3 mm diameter.
 *    - Plasticity Index (PI): PI = LL - PL
 * 
 * 2. Cone Penetration Method:
 *    - Liquid Limit (LL): 4 trials. Linear regression of Water Content vs Penetration (mm). LL is moisture content at 20 mm penetration.
 *    - Plastic Limit (PL): 'NP' (Non-Plastic)
 *    - Plasticity Index (PI): '-'
 */

export const ATTERBERG_METHODS = {
  CASAGRANDE: 'casagrande',
  CONE_PENETRATION: 'cone_penetration',
};

/**
 * Checks if a value is meaningfully filled (not null, undefined, empty string or dash)
 */
export const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';

/**
 * Parse a numeric float or return NaN
 */
export const parseNumber = (v) => (isPresent(v) ? parseFloat(v) : NaN);

/**
 * Calculate single moisture content trial
 * Formula:
 * - Ww (Weight of Water) = W2 (Cup + Wet Soil) - W3 (Cup + Dry Soil)
 * - Ws (Weight of Soil Solids) = W3 (Cup + Dry Soil) - W1 (Empty Cup)
 * - Water Content (%) = (Ww / Ws) * 100
 */
export function calculateMoistureTrial({ cupEmpty, cupWet, cupDry }) {
  const w1 = parseNumber(cupEmpty);
  const w2 = parseNumber(cupWet);
  const w3 = parseNumber(cupDry);

  if (isNaN(w1) || isNaN(w2) || isNaN(w3)) {
    return {
      isValid: false,
      waterWeight: null,
      solidsWeight: null,
      waterContent: null,
      error: null,
    };
  }

  if (w1 <= 0 || w2 <= 0 || w3 <= 0) {
    return {
      isValid: false,
      waterWeight: null,
      solidsWeight: null,
      waterContent: null,
      error: 'Weights must be greater than zero.',
    };
  }

  const waterWeight = w2 - w3;
  const solidsWeight = w3 - w1;

  if (solidsWeight <= 0) {
    return {
      isValid: false,
      waterWeight: Number(waterWeight.toFixed(3)),
      solidsWeight: Number(solidsWeight.toFixed(3)),
      waterContent: null,
      error: 'Cup with dry soil must be heavier than empty cup.',
    };
  }

  if (waterWeight < 0) {
    return {
      isValid: false,
      waterWeight: Number(waterWeight.toFixed(3)),
      solidsWeight: Number(solidsWeight.toFixed(3)),
      waterContent: null,
      error: 'Cup with wet soil must be heavier than cup with dry soil.',
    };
  }

  const waterContent = (waterWeight / solidsWeight) * 100;

  return {
    isValid: true,
    waterWeight: Number(waterWeight.toFixed(2)),
    solidsWeight: Number(solidsWeight.toFixed(2)),
    waterContent: Number(waterContent.toFixed(2)),
    rawWaterContent: waterContent,
    error: null,
  };
}

/**
 * Perform simple linear regression on (x, y) pairs:
 * y = m * x + c
 */
export function calculateLinearRegression(points) {
  if (!points || points.length < 2) {
    return null;
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const { x, y } = points[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) {
    return null; // Vertical line or identical x values
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Compute correlation coefficient R²
  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = points.reduce((acc, p) => {
    const pred = slope * p.x + intercept;
    return acc + Math.pow(p.y - pred, 2);
  }, 0);

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;

  return {
    slope,
    intercept,
    rSquared: Number(rSquared.toFixed(4)),
    pointCount: n,
  };
}

/**
 * Calculate Liquid Limit and Flow Curve for Casagrande Apparatus
 * X = log10(blows), Y = water content (%)
 * Liquid limit is evaluated at N = 25 blows -> X = log10(25)
 */
export function calculateCasagrandeLiquidLimit(trials = []) {
  const processedTrials = trials.map((t, idx) => {
    const blows = parseNumber(t.blows);
    const moisture = calculateMoistureTrial({
      cupEmpty: t.cupEmpty,
      cupWet: t.cupWet,
      cupDry: t.cupDry,
    });

    const hasValidBlows = !isNaN(blows) && blows > 0;
    const isValid = hasValidBlows && moisture.isValid;

    return {
      trialNo: idx + 1,
      cupNo: t.cupNo ?? '',
      blows: t.blows ?? '',
      cupEmpty: t.cupEmpty ?? '',
      cupWet: t.cupWet ?? '',
      cupDry: t.cupDry ?? '',
      waterWeight: moisture.waterWeight,
      solidsWeight: moisture.solidsWeight,
      waterContent: moisture.waterContent,
      rawWaterContent: moisture.rawWaterContent,
      logBlows: hasValidBlows ? Math.log10(blows) : null,
      isValid,
      error: moisture.error || (!hasValidBlows && isPresent(t.blows) ? 'Blows must be > 0' : null),
    };
  });

  const validPoints = processedTrials
    .filter((t) => t.isValid)
    .map((t) => ({
      x: t.logBlows,
      blows: parseNumber(t.blows),
      y: t.rawWaterContent,
      roundedY: t.waterContent,
    }));

  let regression = null;
  let rawLiquidLimit = null;
  let liquidLimit = null;
  let liquidLimitDisplay = '';

  if (validPoints.length >= 2) {
    regression = calculateLinearRegression(validPoints);
    if (regression) {
      const log25 = Math.log10(25);
      rawLiquidLimit = regression.slope * log25 + regression.intercept;
      // IS:2720 Part 5: Reported to nearest first decimal place
      liquidLimit = Number(rawLiquidLimit.toFixed(1));
      liquidLimitDisplay = rawLiquidLimit.toFixed(1);
    }
  }

  return {
    trials: processedTrials,
    validPoints,
    regression,
    rawLiquidLimit,
    liquidLimit,
    liquidLimitDisplay,
    flowIndex: regression ? Number((-regression.slope).toFixed(3)) : null, // Flow Index If = -slope
    isComplete: validPoints.length >= 4, // 5 trials recommended / required by IS code
  };
}

/**
 * Calculate Plastic Limit for Casagrande Method
 * Standard: 2 trials average water content
 */
export function calculatePlasticLimit(trials = []) {
  const processedTrials = trials.map((t, idx) => {
    const moisture = calculateMoistureTrial({
      cupEmpty: t.cupEmpty,
      cupWet: t.cupWet,
      cupDry: t.cupDry,
    });

    return {
      trialNo: idx + 1,
      cupNo: t.cupNo ?? '',
      cupEmpty: t.cupEmpty ?? '',
      cupWet: t.cupWet ?? '',
      cupDry: t.cupDry ?? '',
      waterWeight: moisture.waterWeight,
      solidsWeight: moisture.solidsWeight,
      waterContent: moisture.waterContent,
      rawWaterContent: moisture.rawWaterContent,
      isValid: moisture.isValid,
      error: moisture.error,
    };
  });

  const validTrials = processedTrials.filter((t) => t.isValid);

  let rawPlasticLimit = null;
  let plasticLimit = null;
  let plasticLimitDisplay = '';
  let plasticLimitWhole = '';

  if (validTrials.length > 0) {
    const sum = validTrials.reduce((acc, t) => acc + t.rawWaterContent, 0);
    rawPlasticLimit = sum / validTrials.length;
    plasticLimit = Number(rawPlasticLimit.toFixed(1));
    plasticLimitDisplay = rawPlasticLimit.toFixed(1);
    plasticLimitWhole = String(Math.round(rawPlasticLimit));
  }

  return {
    trials: processedTrials,
    validTrials,
    rawPlasticLimit,
    plasticLimit,
    plasticLimitDisplay,
    plasticLimitWhole,
    isComplete: validTrials.length >= 2,
  };
}

/**
 * Calculate Cone Penetration Liquid Limit
 * X = penetration (mm), Y = water content (%)
 * Liquid limit is evaluated at 20 mm penetration
 */
export function calculateConePenetrationLiquidLimit(trials = []) {
  const processedTrials = trials.map((t, idx) => {
    const penetration = parseNumber(t.penetration);
    const moisture = calculateMoistureTrial({
      cupEmpty: t.cupEmpty,
      cupWet: t.cupWet,
      cupDry: t.cupDry,
    });

    const hasValidPenetration = !isNaN(penetration) && penetration > 0;
    const isValid = hasValidPenetration && moisture.isValid;

    return {
      trialNo: idx + 1,
      cupNo: t.cupNo ?? '',
      penetration: t.penetration ?? '',
      cupEmpty: t.cupEmpty ?? '',
      cupWet: t.cupWet ?? '',
      cupDry: t.cupDry ?? '',
      waterWeight: moisture.waterWeight,
      solidsWeight: moisture.solidsWeight,
      waterContent: moisture.waterContent,
      rawWaterContent: moisture.rawWaterContent,
      isValid,
      error: moisture.error || (!hasValidPenetration && isPresent(t.penetration) ? 'Penetration must be > 0' : null),
    };
  });

  const validPoints = processedTrials
    .filter((t) => t.isValid)
    .map((t) => ({
      x: parseNumber(t.penetration),
      penetration: parseNumber(t.penetration),
      y: t.rawWaterContent,
      roundedY: t.waterContent,
    }));

  let regression = null;
  let rawLiquidLimit = null;
  let liquidLimit = null;
  let liquidLimitDisplay = '';

  if (validPoints.length >= 2) {
    regression = calculateLinearRegression(validPoints);
    if (regression) {
      rawLiquidLimit = regression.slope * 20.0 + regression.intercept;
      liquidLimit = Number(rawLiquidLimit.toFixed(1));
      liquidLimitDisplay = rawLiquidLimit.toFixed(1);
    }
  }

  return {
    trials: processedTrials,
    validPoints,
    regression,
    rawLiquidLimit,
    liquidLimit,
    liquidLimitDisplay,
    isComplete: validPoints.length >= 4, // 4 trials recommended per IS:2720 Part 5
  };
}

/**
 * Overall Atterberg Limits calculation engine supporting both methods
 */
export function calculateAtterbergLimits({
  method = ATTERBERG_METHODS.CASAGRANDE,
  casagrandeLiquidTrials = [],
  casagrandePlasticTrials = [],
  coneTrials = [],
  roundPlasticLimitToWhole = false,
}) {
  if (method === ATTERBERG_METHODS.CONE_PENETRATION) {
    const cone = calculateConePenetrationLiquidLimit(coneTrials);
    const ll = cone.liquidLimitDisplay || '';
    const pl = 'NP'; // Non-Plastic per standard
    const pi = '-';  // Hyphen / Dash per reference sheet

    return {
      method,
      cone,
      liquidLimit: ll,
      plasticLimit: pl,
      plasticityIndex: pi,
      rawLiquidLimit: cone.rawLiquidLimit,
      isComplete: cone.isComplete,
    };
  }

  // Casagrande Method
  const llCalc = calculateCasagrandeLiquidLimit(casagrandeLiquidTrials);
  const plCalc = calculatePlasticLimit(casagrandePlasticTrials);

  let finalPl = '';
  if (plCalc.rawPlasticLimit !== null) {
    finalPl = roundPlasticLimitToWhole ? plCalc.plasticLimitWhole : plCalc.plasticLimitDisplay;
  }

  let finalPi = '';
  if (llCalc.rawLiquidLimit !== null && plCalc.rawPlasticLimit !== null) {
    const numLl = parseFloat(llCalc.liquidLimitDisplay);
    const numPl = parseFloat(finalPl);
    if (!isNaN(numLl) && !isNaN(numPl)) {
      const diff = numLl - numPl;
      if (diff <= 0) {
        finalPi = '0'; // or 'NP'
      } else {
        finalPi = roundPlasticLimitToWhole ? String(Math.round(diff)) : diff.toFixed(1);
      }
    }
  }

  return {
    method,
    liquidLimitCalc: llCalc,
    plasticLimitCalc: plCalc,
    liquidLimit: llCalc.liquidLimitDisplay || '',
    plasticLimit: finalPl,
    plasticityIndex: finalPi,
    rawLiquidLimit: llCalc.rawLiquidLimit,
    rawPlasticLimit: plCalc.rawPlasticLimit,
    isComplete: llCalc.isComplete && plCalc.isComplete,
  };
}

/**
 * Initial empty templates for trials
 */
export const DEFAULT_CASAGRANDE_LL_TRIALS = [
  { cupNo: '', blows: '', cupEmpty: '', cupWet: '', cupDry: '' },
  { cupNo: '', blows: '', cupEmpty: '', cupWet: '', cupDry: '' },
  { cupNo: '', blows: '', cupEmpty: '', cupWet: '', cupDry: '' },
  { cupNo: '', blows: '', cupEmpty: '', cupWet: '', cupDry: '' },
  { cupNo: '', blows: '', cupEmpty: '', cupWet: '', cupDry: '' },
];

export const DEFAULT_CASAGRANDE_PL_TRIALS = [
  { cupNo: '', cupEmpty: '', cupWet: '', cupDry: '' },
  { cupNo: '', cupEmpty: '', cupWet: '', cupDry: '' },
];

export const DEFAULT_CONE_LL_TRIALS = [
  { cupNo: '', penetration: '', cupEmpty: '', cupWet: '', cupDry: '' },
  { cupNo: '', penetration: '', cupEmpty: '', cupWet: '', cupDry: '' },
  { cupNo: '', penetration: '', cupEmpty: '', cupWet: '', cupDry: '' },
  { cupNo: '', penetration: '', cupEmpty: '', cupWet: '', cupDry: '' },
];

/**
 * Pre-loaded sample reference datasets from the user's provided PDFs
 */
export const SAMPLE_CASAGRANDE_DATA = {
  liquidTrials: [
    { cupNo: '36', blows: '35', cupEmpty: '18.58', cupWet: '28.76', cupDry: '25.53' }, // w = 46.47%
    { cupNo: '8',  blows: '32', cupEmpty: '17.83', cupWet: '28.51', cupDry: '25.06' }, // w = 47.72%
    { cupNo: '10', blows: '29', cupEmpty: '17.89', cupWet: '28.20', cupDry: '24.83' }, // w = 48.56%
    { cupNo: '12', blows: '23', cupEmpty: '18.97', cupWet: '29.37', cupDry: '25.92' }, // w = 49.64%
    { cupNo: '13', blows: '16', cupEmpty: '18.36', cupWet: '28.38', cupDry: '25.01' }, // w = 50.68%
  ],
  plasticTrials: [
    { cupNo: '47', cupEmpty: '18.62', cupWet: '20.32', cupDry: '19.95' }, // w = 27.82%
    { cupNo: '50', cupEmpty: '18.53', cupWet: '19.82', cupDry: '19.53' }, // w = 29.00%
  ],
};

export const SAMPLE_CONE_PENETRATION_DATA = {
  trials: [
    { cupNo: '9',  penetration: '15.00', cupEmpty: '12.80', cupWet: '21.68', cupDry: '19.97' }, // w = 23.85%
    { cupNo: '5',  penetration: '19.00', cupEmpty: '13.77', cupWet: '22.71', cupDry: '20.90' }, // w = 25.39%
    { cupNo: '23', penetration: '24.00', cupEmpty: '13.13', cupWet: '22.93', cupDry: '20.85' }, // w = 26.94%
    { cupNo: '10', penetration: '28.00', cupEmpty: '12.80', cupWet: '23.11', cupDry: '20.83' }, // w = 28.39%
  ],
};
