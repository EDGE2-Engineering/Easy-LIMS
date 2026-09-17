/**
 * Utility functions for Soil Compaction Calculations
 * Standard:
 * - IS 2720 (Part 7): Light Compaction Test
 * - IS 2720 (Part 8): Heavy Compaction Test
 * 
 * Formulas:
 * R1: Determination No (1 to 6)
 * R2: Wt of Mould + wet Soil (W2) (gms) [Input]
 * R3: Wt of wet Soil (W2 - W1) (gms) [Calc]
 * R4: Bulk Density = R3 / Volume (g/cc) [Calc]
 * R5: Container No [Input]
 * R6: Wt of Container (gms) [Input]
 * R7: Wt of Container + wet Soil (gms) [Input]
 * R8: Wt of Container + dry Soil (gms) [Input]
 * R9: Wt of water = R7 - R8 (gms) [Calc]
 * R10: Wt of dry Soil = R8 - R6 (gms) [Calc]
 * R11: Moisture Content (%) = (R9 / R10) * 100 [Calc]
 * R12: Dry Density (g/cc) = Bulk Density / ((Moisture Content / 100) + 1) = R4 / (R11 / 100 + 1) [Calc]
 * 
 * Compaction Curve (Moisture Content vs Dry Density):
 * - Highest peak point on curve:
 *   - Maximum Dry Density (MDD) in g/cc (reported rounded to 2 decimal places)
 *   - Optimum Moisture Content (OMC) in %:
 *     - If < 5%: rounded to nearest 0.2%
 *     - If 5% to 10%: rounded to nearest 0.5%
 *     - If > 10%: rounded to nearest whole number (1%)
 */

export const COMPACTION_TYPES = {
  LIGHT: 'light',
  HEAVY: 'heavy',
};

export const MOULD_PRESETS = {
  LIGHT_STANDARD: {
    name: 'Standard Light Mould',
    volume: 997.46, // cm3 (per IS 2720 Part 7, or 1000 cm3)
    emptyWeight: 3989, // g
    diameter: 10, // cm
    length: 12.7, // cm
    area: 78.54, // cm2
    heightOfFall: 31, // cm
    blows: 25,
    layers: 3,
  },
  HEAVY_SMALL: {
    name: 'Small Mould (1000 cm³)',
    volume: 1000.0,
    emptyWeight: 3989,
    diameter: 10,
    length: 12.7,
    area: 78.54,
    heightOfFall: 45,
    blows: 25,
    layers: 5,
  },
  HEAVY_BIG: {
    name: 'Big Mould (2250 cm³)',
    volume: 2250.0,
    emptyWeight: 5774,
    diameter: 15,
    length: 12.7,
    area: 176.71,
    heightOfFall: 45,
    blows: 55,
    layers: 5,
  },
};

export const DEFAULT_COMPACTION_ROW = {
  mouldPlusWetSoil: '', // R2 (g)
  containerNo: '', // R5
  containerWeight: '', // R6 (g)
  containerPlusWetSoil: '', // R7 (g)
  containerPlusDrySoil: '', // R8 (g)
};

// Sample data from reference sheets
export const SAMPLE_HEAVY_COMPACTION_DATA = {
  mouldKey: 'HEAVY_SMALL',
  trials: [
    { mouldPlusWetSoil: '6098', containerNo: 'M', containerWeight: '72.33', containerPlusWetSoil: '220.07', containerPlusDrySoil: '211.71' },
    { mouldPlusWetSoil: '6292', containerNo: 'E', containerWeight: '72.91', containerPlusWetSoil: '173.17', containerPlusDrySoil: '165.65' },
    { mouldPlusWetSoil: '6394', containerNo: 'A', containerWeight: '73.15', containerPlusWetSoil: '191.37', containerPlusDrySoil: '181.50' },
    { mouldPlusWetSoil: '6405', containerNo: 'S', containerWeight: '72.70', containerPlusWetSoil: '209.93', containerPlusDrySoil: '190.48' },
    { mouldPlusWetSoil: '6354', containerNo: 'C', containerWeight: '17.16', containerPlusWetSoil: '75.61', containerPlusDrySoil: '69.24' },
  ],
};

export const SAMPLE_LIGHT_COMPACTION_DATA = {
  mouldKey: 'LIGHT_STANDARD',
  trials: [
    { mouldPlusWetSoil: '5938', containerNo: '102', containerWeight: '17.22', containerPlusWetSoil: '65.61', containerPlusDrySoil: '61.80' },
    { mouldPlusWetSoil: '5986', containerNo: '104', containerWeight: '17.17', containerPlusWetSoil: '67.04', containerPlusDrySoil: '62.45' },
    { mouldPlusWetSoil: '6061', containerNo: '107', containerWeight: '15.56', containerPlusWetSoil: '61.67', containerPlusDrySoil: '56.65' },
    { mouldPlusWetSoil: '6130', containerNo: '103', containerWeight: '17.07', containerPlusWetSoil: '62.17', containerPlusDrySoil: '56.45' },
    { mouldPlusWetSoil: '6107', containerNo: '106', containerWeight: '17.37', containerPlusWetSoil: '74.10', containerPlusDrySoil: '66.15' },
  ],
};

export const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';
export const toNum = (v) => (isPresent(v) ? parseFloat(v) : NaN);

/**
 * Apply IS code rounding rules for Optimum Moisture Content (OMC)
 * - < 5%: nearest 0.2%
 * - 5% to 10%: nearest 0.5%
 * - > 10%: nearest whole number (1%)
 */
export function roundOmcByISCode(omc) {
  if (omc === null || omc === undefined || isNaN(omc)) return '';
  const val = Number(omc);
  if (val < 5) {
    const rounded = Math.round(val / 0.2) * 0.2;
    return rounded.toFixed(1);
  } else if (val <= 10) {
    const rounded = Math.round(val / 0.5) * 0.5;
    return rounded.toFixed(1);
  } else {
    return Math.round(val).toFixed(0);
  }
}

/**
 * Calculate single trial values
 * @param {Object} trial - { mouldPlusWetSoil, containerNo, containerWeight, containerPlusWetSoil, containerPlusDrySoil }
 * @param {Object} mould - { volume, emptyWeight }
 * @returns {Object}
 */
export function calculateCompactionTrial(trial = {}, mould = {}) {
  const emptyMould = toNum(mould.emptyWeight);
  const mouldVolume = toNum(mould.volume);

  const w2 = toNum(trial.mouldPlusWetSoil);
  const r6 = toNum(trial.containerWeight);
  const r7 = toNum(trial.containerPlusWetSoil);
  const r8 = toNum(trial.containerPlusDrySoil);

  // R3: Wt of wet Soil = W2 - W1
  let wetSoilWeight = null;
  if (!isNaN(w2) && !isNaN(emptyMould)) {
    wetSoilWeight = w2 - emptyMould;
  }

  // R4: Bulk Density = R3 / volume
  let bulkDensity = null;
  if (wetSoilWeight !== null && !isNaN(mouldVolume) && mouldVolume > 0) {
    bulkDensity = wetSoilWeight / mouldVolume;
  }

  // R9: Wt of water = R7 - R8
  let waterWeight = null;
  if (!isNaN(r7) && !isNaN(r8)) {
    waterWeight = r7 - r8;
  }

  // R10: Wt of dry Soil = R8 - R6
  let drySoilWeight = null;
  if (!isNaN(r8) && !isNaN(r6)) {
    drySoilWeight = r8 - r6;
  }

  // R11: Moisture Content % = (R9 / R10) * 100
  let moistureContent = null;
  if (waterWeight !== null && drySoilWeight !== null && drySoilWeight > 0) {
    moistureContent = (waterWeight / drySoilWeight) * 100;
  }

  // R12: Dry Density = Bulk Density / ((Moisture Content / 100) + 1)
  let dryDensity = null;
  if (bulkDensity !== null && moistureContent !== null) {
    dryDensity = bulkDensity / (moistureContent / 100 + 1);
  }

  const isValid =
    moistureContent !== null &&
    dryDensity !== null &&
    !isNaN(moistureContent) &&
    !isNaN(dryDensity) &&
    moistureContent >= 0 &&
    dryDensity > 0;

  return {
    determinationNo: trial.determinationNo || '',
    mouldPlusWetSoil: trial.mouldPlusWetSoil || '',
    wetSoilWeight: wetSoilWeight !== null ? Number(wetSoilWeight.toFixed(2)) : null,
    bulkDensity: bulkDensity !== null ? Number(bulkDensity.toFixed(3)) : null,
    bulkDensityFormatted: bulkDensity !== null ? bulkDensity.toFixed(3) : '',
    containerNo: trial.containerNo || '',
    containerWeight: trial.containerWeight || '',
    containerPlusWetSoil: trial.containerPlusWetSoil || '',
    containerPlusDrySoil: trial.containerPlusDrySoil || '',
    waterWeight: waterWeight !== null ? Number(waterWeight.toFixed(2)) : null,
    drySoilWeight: drySoilWeight !== null ? Number(drySoilWeight.toFixed(2)) : null,
    moistureContent: moistureContent !== null ? Number(moistureContent.toFixed(2)) : null,
    moistureContentFormatted: moistureContent !== null ? moistureContent.toFixed(2) : '',
    dryDensity: dryDensity !== null ? Number(dryDensity.toFixed(3)) : null,
    dryDensityFormatted: dryDensity !== null ? dryDensity.toFixed(2) : '',
    isValid,
  };
}

/**
 * Fit a 2nd degree polynomial (parabola): y = a*x^2 + b*x + c
 * using Ordinary Least Squares regression or 3-point exact fit.
 * Returns coefficients { a, b, c, peakX, peakY } or null.
 */
export function fitParabola(points = []) {
  if (points.length < 3) return null;

  // If exactly 3 points, solve directly
  if (points.length === 3) {
    const [p1, p2, p3] = points;
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;

    const denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
    if (Math.abs(denom) < 1e-9) return null;

    const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
    const b = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom;
    const c = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;

    let peakX = null;
    let peakY = null;
    if (a < 0) {
      peakX = -b / (2 * a);
      peakY = a * peakX * peakX + b * peakX + c;
    }
    return { a, b, c, peakX, peakY };
  }

  const n = points.length;
  let sumX = 0;
  let sumX2 = 0;
  let sumX3 = 0;
  let sumX4 = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2Y = 0;

  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    const x2 = x * x;
    sumX += x;
    sumX2 += x2;
    sumX3 += x2 * x;
    sumX4 += x2 * x2;
    sumY += y;
    sumXY += x * y;
    sumX2Y += x2 * y;
  }

  const A = [
    [sumX4, sumX3, sumX2, sumX2Y],
    [sumX3, sumX2, sumX, sumXY],
    [sumX2, sumX, n, sumY],
  ];

  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = A[i];
    A[i] = A[maxRow];
    A[maxRow] = temp;

    if (Math.abs(A[i][i]) < 1e-12) return null;

    for (let k = i + 1; k < 3; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j <= 3; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  const xSolution = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let sum = A[i][3];
    for (let j = i + 1; j < 3; j++) {
      sum -= A[i][j] * xSolution[j];
    }
    xSolution[i] = sum / A[i][i];
  }

  const a = xSolution[0];
  const b = xSolution[1];
  const c = xSolution[2];

  let peakX = null;
  let peakY = null;
  if (a < 0) {
    peakX = -b / (2 * a);
    peakY = a * peakX * peakX + b * peakX + c;
  }

  return { a, b, c, peakX, peakY };
}

/**
 * Calculate complete compaction dataset including trials, curve, and peak MDD/OMC
 * @param {Object} params
 * @param {string} params.mouldType - key in MOULD_PRESETS or custom
 * @param {Object} params.customMould - optional custom mould overrides
 * @param {Array<Object>} params.trials - list of trial row inputs
 * @param {number|null} params.manualMdd - optional user override for MDD
 * @param {number|null} params.manualOmc - optional user override for OMC
 * @returns {Object}
 */
export function calculateCompactionTest({
  mouldType = 'LIGHT_STANDARD',
  customMould = {},
  trials = [],
  manualMdd = null,
  manualOmc = null,
}) {
  const baseMould = MOULD_PRESETS[mouldType] || MOULD_PRESETS.LIGHT_STANDARD;
  const mould = { ...baseMould, ...customMould };

  const calculatedTrials = trials.map((t, idx) =>
    calculateCompactionTrial({ ...t, determinationNo: idx + 1 }, mould)
  );

  const validPoints = calculatedTrials
    .filter((t) => t.isValid)
    .map((t) => ({
      determinationNo: t.determinationNo,
      x: t.moistureContent,
      y: t.dryDensity,
    }))
    .sort((p1, p2) => p1.x - p2.x);

  let rawMdd = null;
  let rawOmc = null;
  let curveFit = null;

  if (validPoints.length >= 3) {
    // 1. Find point with highest dry density
    let maxIdx = 0;
    for (let i = 1; i < validPoints.length; i++) {
      if (validPoints[i].y > validPoints[maxIdx].y) {
        maxIdx = i;
      }
    }

    // 2. If the maximum point is an interior point with points on both sides,
    // fit local 3-point parabola for the sharp peak reading standard in geotechnical engineering
    if (maxIdx > 0 && maxIdx < validPoints.length - 1) {
      const peakTriplet = [validPoints[maxIdx - 1], validPoints[maxIdx], validPoints[maxIdx + 1]];
      const localFit = fitParabola(peakTriplet);
      if (localFit && localFit.a < 0 && localFit.peakX !== null) {
        curveFit = localFit;
        rawOmc = localFit.peakX;
        rawMdd = Math.max(localFit.peakY, validPoints[maxIdx].y);
      }
    }

    // 3. If local fit wasn't applicable, try global fit across all points
    if (!curveFit) {
      const globalFit = fitParabola(validPoints);
      if (globalFit && globalFit.a < 0 && globalFit.peakX !== null) {
        const minX = validPoints[0].x;
        const maxX = validPoints[validPoints.length - 1].x;
        if (globalFit.peakX >= minX - 2 && globalFit.peakX <= maxX + 2) {
          curveFit = globalFit;
          rawOmc = globalFit.peakX;
          rawMdd = Math.max(globalFit.peakY, validPoints[maxIdx].y);
        }
      }
    }
  }

  // Fallback to highest test point if curve fit is unavailable
  if (rawMdd === null && validPoints.length > 0) {
    let maxPt = validPoints[0];
    for (const pt of validPoints) {
      if (pt.y > maxPt.y) {
        maxPt = pt;
      }
    }
    rawMdd = maxPt.y;
    rawOmc = maxPt.x;
  }

  // Apply manual overrides if provided
  const effectiveRawMdd = manualMdd !== null && !isNaN(manualMdd) ? Number(manualMdd) : rawMdd;
  const effectiveRawOmc = manualOmc !== null && !isNaN(manualOmc) ? Number(manualOmc) : rawOmc;

  const mddDisplay = effectiveRawMdd !== null ? effectiveRawMdd.toFixed(2) : '';
  const omcDisplay = effectiveRawOmc !== null ? roundOmcByISCode(effectiveRawOmc) : '';

  return {
    mould,
    trials: calculatedTrials,
    validPoints,
    curveFit,
    rawMdd: effectiveRawMdd,
    rawOmc: effectiveRawOmc,
    mdd: mddDisplay,
    omc: omcDisplay,
    mddFormatted: mddDisplay ? `${mddDisplay} g/cc` : '',
    omcFormatted: omcDisplay ? `${omcDisplay}%` : '',
  };
}
