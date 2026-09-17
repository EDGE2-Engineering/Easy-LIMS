/**
 * Lab CBR (California Bearing Ratio) Test Calculation per IS 2720 (Part 16) - 1987
 * 
 * Key Specifications:
 * 1. Conversion Factor: 1 kN = 101.971621 kg (or kgf)
 * 2. Standard Loads:
 *    - At 2.5 mm penetration: 1370 kg (70 kg/cm²)
 *    - At 5.0 mm penetration: 2055 kg (105 kg/cm²)
 * 3. CBR Formulas:
 *    - CBR at 2.5 mm (%) = (Load at 2.5 mm / 1370) * 100
 *    - CBR at 5.0 mm (%) = (Load at 5.0 mm / 2055) * 100
 * 4. Initial Concavity Correction (Zero Offset Correction):
 *    - If the initial portion of the load-penetration curve is concave upward,
 *      a tangent is drawn from the point of greatest slope to intersect the X-axis at (a, 0).
 *    - The penetration depths shift to (a + 2.5 mm) and (a + 5.0 mm).
 *    - Corrected loads at these shifted penetrations are determined from the curve.
 */

export const KN_TO_KG = 101.971621;

export const STANDARD_LOAD_2_5_MM = 1370; // kg
export const STANDARD_LOAD_5_0_MM = 2055; // kg

export const STANDARD_PENETRATIONS = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.5, 10.0, 12.5];

export const DEFAULT_CBR_METADATA = {
  testStartDate: '',
  testCompletionDate: '',
  testNo: '',
  depth: '',
  condition: 'Soaked', // 'Soaked' | 'Unsoaked'
  soakingDays: '4',
  surchargeWeight: '5.0',
};

export const DEFAULT_CBR_OBSERVATIONS = STANDARD_PENETRATIONS.map((pen) => ({
  penetration: pen,
  loadKn: pen === 0 ? '0' : '',
  loadKg: pen === 0 ? '0' : '',
}));

// Sample 1: Convex curve start (No correction required) - from Page 2 & 3
export const SAMPLE_CBR_CONVEX = {
  metadata: {
    condition: 'Soaked',
    soakingDays: '4',
    surchargeWeight: '5.0',
  },
  observations: [
    { penetration: 0, loadKn: '0', loadKg: '0' },
    { penetration: 0.5, loadKn: '1.05', loadKg: '107.07' },
    { penetration: 1.0, loadKn: '1.68', loadKg: '171.31' },
    { penetration: 1.5, loadKn: '2.12', loadKg: '216.18' },
    { penetration: 2.0, loadKn: '2.50', loadKg: '254.93' },
    { penetration: 2.5, loadKn: '2.87', loadKg: '292.66' },
    { penetration: 3.0, loadKn: '3.12', loadKg: '318.15' },
    { penetration: 4.0, loadKn: '3.63', loadKg: '370.16' },
    { penetration: 5.0, loadKn: '4.03', loadKg: '410.95' },
    { penetration: 7.5, loadKn: '4.98', loadKg: '507.82' },
    { penetration: 10.0, loadKn: '5.65', loadKg: '576.14' },
    { penetration: 12.5, loadKn: '6.38', loadKg: '650.58' },
  ],
};

// Sample 2: Concave curve start (Correction required) - from Page 7 & 10
export const SAMPLE_CBR_CONCAVE = {
  metadata: {
    condition: 'Soaked',
    soakingDays: '4',
    surchargeWeight: '5.0',
  },
  observations: [
    { penetration: 0, loadKn: '0', loadKg: '0' },
    { penetration: 0.5, loadKn: '0.10', loadKg: '10.20' },
    { penetration: 1.0, loadKn: '0.23', loadKg: '23.45' },
    { penetration: 1.5, loadKn: '0.30', loadKg: '30.59' },
    { penetration: 2.0, loadKn: '0.45', loadKg: '45.89' },
    { penetration: 2.5, loadKn: '0.63', loadKg: '64.24' },
    { penetration: 3.0, loadKn: '0.80', loadKg: '81.58' },
    { penetration: 4.0, loadKn: '1.20', loadKg: '122.37' },
    { penetration: 5.0, loadKn: '1.65', loadKg: '168.25' },
    { penetration: 7.5, loadKn: '2.87', loadKg: '292.66' },
    { penetration: 10.0, loadKn: '4.51', loadKg: '459.89' },
    { penetration: 12.5, loadKn: '6.53', loadKg: '665.87' },
  ],
};

/**
 * Convert kN to kg using the constant factor 101.971621
 */
export function convertKnToKg(knVal) {
  if (knVal === '' || knVal === null || knVal === undefined || isNaN(knVal)) return '';
  const num = parseFloat(knVal);
  if (num === 0) return '0';
  return (num * KN_TO_KG).toFixed(2);
}

/**
 * Linear interpolation to find Y (load in kg) at any given penetration X (mm)
 */
export function interpolateLoad(points, targetPenetration) {
  if (!points || points.length === 0) return 0;
  if (targetPenetration <= points[0].x) return points[0].y;
  if (targetPenetration >= points[points.length - 1].x) {
    // Extrapolate slope from last 2 points if slightly beyond
    if (points.length >= 2) {
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      const slope = (p2.y - p1.y) / (p2.x - p1.x);
      return Math.max(0, p2.y + slope * (targetPenetration - p2.x));
    }
    return points[points.length - 1].y;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (targetPenetration >= p1.x && targetPenetration <= p2.x) {
      if (p2.x === p1.x) return p1.y;
      const ratio = (targetPenetration - p1.x) / (p2.x - p1.x);
      return p1.y + ratio * (p2.y - p1.y);
    }
  }
  return 0;
}

/**
 * Analyze load-penetration curve and perform IS 2720 Part 16 calculations
 */
export function calculateCbrTest(observations = [], options = {}) {
  const {
    isCorrectionOverridden = false,
    correctionEnabled = false,
    customZeroOffset = null,
  } = options;

  // Filter valid numeric points
  const validPoints = observations
    .map((obs) => {
      const x = parseFloat(obs.penetration);
      let y = parseFloat(obs.loadKg);
      if (isNaN(y) && obs.loadKn !== '' && obs.loadKn !== null && !isNaN(obs.loadKn)) {
        y = parseFloat(obs.loadKn) * KN_TO_KG;
      }
      return { x, y: isNaN(y) ? null : y, kn: parseFloat(obs.loadKn) || 0 };
    })
    .filter((p) => !isNaN(p.x) && p.y !== null && !isNaN(p.y))
    .sort((a, b) => a.x - b.x);

  if (validPoints.length < 3) {
    return {
      isValid: false,
      validPoints: [],
      error: 'Enter at least 3 valid observations to calculate CBR',
      uncorrected: { load25: 0, load50: 0, cbr25: 0, cbr50: 0 },
      corrected: { load25: 0, load50: 0, cbr25: 0, cbr50: 0, zeroOffset: 0 },
      isCorrectionNeeded: false,
      isCorrectionApplied: false,
      tangentLine: null,
      recommendedReportedCbr: 0,
    };
  }

  // Raw / Uncorrected Loads at 2.5 mm and 5.0 mm
  const uncorrectedLoad25 = interpolateLoad(validPoints, 2.5);
  const uncorrectedLoad50 = interpolateLoad(validPoints, 5.0);

  const uncorrectedCbr25 = (uncorrectedLoad25 / STANDARD_LOAD_2_5_MM) * 100;
  const uncorrectedCbr50 = (uncorrectedLoad50 / STANDARD_LOAD_5_0_MM) * 100;

  // Detect concavity and calculate Tangent for Zero Correction (IS 2720 Part 16)
  // Calculate slopes between consecutive points in early region (up to 4mm)
  let maxSlope = 0;
  let maxSlopeIdx = 0;
  let isConcaveStart = false;

  const slopes = [];
  for (let i = 0; i < validPoints.length - 1; i++) {
    const dx = validPoints[i + 1].x - validPoints[i].x;
    const dy = validPoints[i + 1].y - validPoints[i].y;
    const slope = dx > 0 ? dy / dx : 0;
    slopes.push({ idx: i, x1: validPoints[i].x, x2: validPoints[i + 1].x, slope });

    // Focus on initial penetration region for max slope tangent
    if (validPoints[i + 1].x <= 5.0 && slope > maxSlope) {
      maxSlope = slope;
      maxSlopeIdx = i;
    }
  }

  // Check if slopes are increasing in early segment (concave upward)
  if (slopes.length >= 2) {
    if (slopes[0].slope < slopes[1].slope && slopes[1].slope > 10) {
      isConcaveStart = true;
    }
    if (slopes.length >= 3 && slopes[0].slope < slopes[2].slope && slopes[1].slope < slopes[2].slope) {
      isConcaveStart = true;
    }
  }

  // Derive Tangent Line at the point of greatest slope
  // Midpoint or point of greatest slope segment
  let autoZeroOffset = 0;
  let tangentLine = null;

  if (maxSlope > 0 && maxSlopeIdx < validPoints.length - 1) {
    const pMidX = (validPoints[maxSlopeIdx].x + validPoints[maxSlopeIdx + 1].x) / 2;
    const pMidY = (validPoints[maxSlopeIdx].y + validPoints[maxSlopeIdx + 1].y) / 2;

    // Line: y - pMidY = maxSlope * (x - pMidX) => x_intercept = pMidX - (pMidY / maxSlope)
    const xIntercept = pMidX - pMidY / maxSlope;
    if (xIntercept > 0.05) {
      autoZeroOffset = Math.round(xIntercept * 100) / 100;
    }

    // Tangent line coordinates for plotting
    const tanX0 = Math.max(0, autoZeroOffset);
    const tanX1 = Math.min(12.5, tanX0 + 6);
    const tanY0 = 0;
    const tanY1 = maxSlope * (tanX1 - tanX0);

    tangentLine = {
      slope: maxSlope,
      xIntercept: autoZeroOffset,
      point1: { x: tanX0, y: tanY0 },
      point2: { x: tanX1, y: tanY1 },
    };
  }

  // Decide whether correction is applied
  const applyCorrection = isCorrectionOverridden
    ? correctionEnabled
    : isConcaveStart && autoZeroOffset > 0;

  const effectiveZeroOffset =
    customZeroOffset !== null && !isNaN(customZeroOffset)
      ? parseFloat(customZeroOffset)
      : autoZeroOffset;

  // Corrected calculations if applied
  let correctedLoad25 = uncorrectedLoad25;
  let correctedLoad50 = uncorrectedLoad50;
  let correctedCbr25 = uncorrectedCbr25;
  let correctedCbr50 = uncorrectedCbr50;

  if (applyCorrection && effectiveZeroOffset > 0) {
    const shiftedPen25 = effectiveZeroOffset + 2.5;
    const shiftedPen50 = effectiveZeroOffset + 5.0;

    correctedLoad25 = interpolateLoad(validPoints, shiftedPen25);
    correctedLoad50 = interpolateLoad(validPoints, shiftedPen50);

    correctedCbr25 = (correctedLoad25 / STANDARD_LOAD_2_5_MM) * 100;
    correctedCbr50 = (correctedLoad50 / STANDARD_LOAD_5_0_MM) * 100;
  }

  // Active CBR values
  const activeCbr25 = applyCorrection ? correctedCbr25 : uncorrectedCbr25;
  const activeCbr50 = applyCorrection ? correctedCbr50 : uncorrectedCbr50;

  // Recommended Reported CBR per IS 2720 Part 16:
  // Usually CBR at 2.5 mm is higher and reported.
  // If CBR at 5.0 mm is higher, the test shall be repeated; if still higher, 5.0 mm value is reported.
  let recommendedReportedCbr = activeCbr25;
  let recommendationNote = 'CBR at 2.5mm is reported (standard).';

  if (activeCbr50 > activeCbr25) {
    recommendedReportedCbr = activeCbr50;
    recommendationNote =
      'CBR at 5.0mm is higher than 2.5mm. Per IS 2720 (Part 16), repeat test recommended. If still higher, report 5.0mm value.';
  }

  return {
    isValid: true,
    validPoints,
    isConcaveStart,
    isCorrectionNeeded: isConcaveStart && autoZeroOffset > 0,
    isCorrectionApplied: applyCorrection,
    autoZeroOffset,
    effectiveZeroOffset,
    tangentLine,
    uncorrected: {
      load25: uncorrectedLoad25,
      load50: uncorrectedLoad50,
      cbr25: uncorrectedCbr25,
      cbr50: uncorrectedCbr50,
    },
    corrected: {
      zeroOffset: effectiveZeroOffset,
      shiftedPen25: effectiveZeroOffset + 2.5,
      shiftedPen50: effectiveZeroOffset + 5.0,
      load25: correctedLoad25,
      load50: correctedLoad50,
      cbr25: correctedCbr25,
      cbr50: correctedCbr50,
    },
    active: {
      cbr25: activeCbr25,
      cbr50: activeCbr50,
      reportedCbr: recommendedReportedCbr,
      recommendationNote,
    },
  };
}
