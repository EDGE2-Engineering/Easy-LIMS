/**
 * Utility functions for Paver Block Testing Calculations
 * Standard: IS 15658 : 2021 - Precast Concrete Blocks for Paving — Specification
 *
 * Requirements & Formulas:
 * 1. Compressive Strength Test:
 *    - Nominal Cross-Sectional Area (C4, mm²) = Length (C1) * Breadth (C2)
 *    - Compressive Strength (C6, N/mm²) = (Failure Load in kN / Area in mm²) * 1000
 *    - Correction factor for thickness and arris/chamfer (Table 5 from IS 15658: 2021):
 *        Thickness (mm) | Plain Block | Arris / Chamfered Block
 *        50             | 0.96        | 1.03
 *        60             | 1.00        | 1.06
 *        80             | 1.12        | 1.18
 *        100            | 1.18        | 1.24
 *        120            | 1.28        | 1.34
 *    - Corrected Compressive Strength (C7, N/mm²) = Compressive Strength (C6) * Correction Factor
 *    - Rounding: Individual and mean compressive strength rounded to the nearest 0.1 MPa (0.1 N/mm²).
 *
 * 2. Water Absorption Test:
 *    - Water Absorption (C6, %) = ((Wet Mass - Oven Dry Mass) / Oven Dry Mass) * 100
 *    - Rounding: Reported to 1 decimal place (e.g., 4.3%, 4.1% average).
 */

export const TABLE_5_CORRECTION_FACTORS = [
  { thickness: 50, plain: 0.96, chamfered: 1.03 },
  { thickness: 60, plain: 1.00, chamfered: 1.06 },
  { thickness: 80, plain: 1.12, chamfered: 1.18 },
  { thickness: 100, plain: 1.18, chamfered: 1.24 },
  { thickness: 120, plain: 1.28, chamfered: 1.34 },
];

export const DEFAULT_PAVER_BLOCK_METADATA = {
  standard: 'IS 15658 : 2021',
  shapeOfPaver: 'Type A',
  blockType: 'plain', // 'plain' or 'chamfered'
  numberOfSamplesComp: 8,
  numberOfSamplesWa: 3,
  periodOfTest: '04-06-2026',
};

export const DEFAULT_PAVER_COMP_OBSERVATION = {
  sampleId: '',
  length: '270',
  breadth: '200',
  thickness: '80',
  failureLoadKn: '',
};

export const DEFAULT_PAVER_COMP_OBSERVATIONS = Array.from({ length: 8 }, (_, i) => ({
  ...DEFAULT_PAVER_COMP_OBSERVATION,
  sampleId: `Sample ${i + 1}`,
}));

export const DEFAULT_PAVER_WA_OBSERVATION = {
  sampleId: '',
  length: '270',
  breadth: '200',
  thickness: '80',
  wetMassKg: '',
  dryMassKg: '',
};

export const DEFAULT_PAVER_WA_OBSERVATIONS = Array.from({ length: 3 }, (_, i) => ({
  ...DEFAULT_PAVER_WA_OBSERVATION,
  sampleId: `Sample ${i + 1}`,
}));

/**
 * Sample test data strictly following handwritten test sheet (Pages 3 & 6 of PDF)
 */
export const SAMPLE_PAVER_BLOCK_TEST_DATA = {
  metadata: {
    standard: 'IS 15658 : 2021',
    shapeOfPaver: 'Type A',
    blockType: 'plain',
    numberOfSamplesComp: 8,
    numberOfSamplesWa: 3,
    periodOfTest: '04-06-2026',
  },
  compressiveObservations: [
    { sampleId: 'R1', length: '270', breadth: '200', thickness: '80', failureLoadKn: '1950.485' },
    { sampleId: 'R2', length: '272', breadth: '192', thickness: '80', failureLoadKn: '1975.265' },
    { sampleId: 'R3', length: '269', breadth: '198', thickness: '80', failureLoadKn: '1980.124' },
    { sampleId: 'R4', length: '270', breadth: '197', thickness: '80', failureLoadKn: '1985.254' },
    { sampleId: 'R5', length: '268', breadth: '199', thickness: '80', failureLoadKn: '1979.668' },
    { sampleId: 'R6', length: '272', breadth: '198', thickness: '80', failureLoadKn: '1935.624' },
    { sampleId: 'R7', length: '269', breadth: '199', thickness: '80', failureLoadKn: '1945.263' },
    { sampleId: 'R8', length: '270', breadth: '200', thickness: '80', failureLoadKn: '1973.264' },
  ],
  waterAbsorptionObservations: [
    { sampleId: 'R1', length: '270', breadth: '200', thickness: '80', wetMassKg: '9.660', dryMassKg: '9.261' },
    { sampleId: 'R2', length: '270', breadth: '200', thickness: '80', wetMassKg: '9.758', dryMassKg: '9.364' },
    { sampleId: 'R3', length: '270', breadth: '200', thickness: '80', wetMassKg: '9.545', dryMassKg: '9.184' },
  ],
};

/**
 * Returns correction factor from Table 5 based on thickness and block type.
 * Supports exact standard values and linear interpolation if an in-between thickness is used.
 */
export function getPaverCorrectionFactor(thickness, blockType = 'plain') {
  const t = parseFloat(thickness);
  if (isNaN(t) || t <= 0) return 1.0;

  const isChamfered = String(blockType).toLowerCase().includes('chamfer') || String(blockType).toLowerCase().includes('arris');
  const typeKey = isChamfered ? 'chamfered' : 'plain';

  // Exact match
  const exact = TABLE_5_CORRECTION_FACTORS.find((row) => Math.abs(row.thickness - t) < 0.1);
  if (exact) return exact[typeKey];

  // If outside bounds
  if (t <= TABLE_5_CORRECTION_FACTORS[0].thickness) {
    return TABLE_5_CORRECTION_FACTORS[0][typeKey];
  }
  const lastIndex = TABLE_5_CORRECTION_FACTORS.length - 1;
  if (t >= TABLE_5_CORRECTION_FACTORS[lastIndex].thickness) {
    return TABLE_5_CORRECTION_FACTORS[lastIndex][typeKey];
  }

  // Linear interpolation
  for (let i = 0; i < TABLE_5_CORRECTION_FACTORS.length - 1; i++) {
    const r1 = TABLE_5_CORRECTION_FACTORS[i];
    const r2 = TABLE_5_CORRECTION_FACTORS[i + 1];
    if (t >= r1.thickness && t <= r2.thickness) {
      const fraction = (t - r1.thickness) / (r2.thickness - r1.thickness);
      const interpolated = r1[typeKey] + fraction * (r2[typeKey] - r1[typeKey]);
      return parseFloat(interpolated.toFixed(3));
    }
  }

  return 1.0;
}

/**
 * Rounds value to nearest 0.1 (per IS 15658: 2021 specification)
 */
export function roundToNearestTenth(val) {
  if (typeof val !== 'number' || isNaN(val)) return NaN;
  return Math.round(val * 10) / 10;
}

/**
 * Calculate Compressive Strength Test per IS 15658: 2021 Table 5
 */
export function calculatePaverBlockCompressiveStrength(observations = [], metadata = {}) {
  const rows = [];
  const validCompStrengths = [];
  const validCorrectedStrengths = [];
  const rowErrors = [];

  const blockType = metadata.blockType || 'plain';

  observations.forEach((obs, index) => {
    const rowNum = index + 1;
    const l = parseFloat(obs.length);
    const b = parseFloat(obs.breadth);
    const t = parseFloat(obs.thickness);
    const loadKn = parseFloat(obs.failureLoadKn);

    // 1. Nominal Cross Sectional Area (sq. mm) = Length * Breadth
    let area = null;
    let areaFormatted = '';
    if (!isNaN(l) && !isNaN(b) && l > 0 && b > 0) {
      area = Math.round(l * b);
      areaFormatted = String(area);
    }

    // 2. Compressive Strength (N/mm²) = (Load kN / Area mm²) * 1000
    let compStrength = null;
    let compStrengthFormatted = '';
    if (area && !isNaN(loadKn) && loadKn > 0) {
      compStrength = (loadKn / area) * 1000;
      compStrengthFormatted = compStrength.toFixed(2);
      validCompStrengths.push(compStrength);
    }

    // 3. Correction Factor (Table 5)
    const factor = getPaverCorrectionFactor(t, blockType);

    // 4. Corrected Compressive Strength (N/mm²) = compStrength * factor (rounded to nearest 0.1)
    let correctedStrength = null;
    let correctedStrengthFormatted = '';
    if (compStrength !== null && !isNaN(factor)) {
      const rawCorrected = compStrength * factor;
      correctedStrength = roundToNearestTenth(rawCorrected);
      correctedStrengthFormatted = correctedStrength.toFixed(1);
      validCorrectedStrengths.push(correctedStrength);
    }

    rows.push({
      ...obs,
      rowNum,
      sampleId: obs.sampleId || `Sample ${rowNum}`,
      area,
      areaFormatted,
      compStrength,
      compStrengthFormatted,
      correctionFactor: factor,
      correctedStrength,
      correctedStrengthFormatted,
    });
  });

  // Averages
  let avgCompStrength = null;
  let avgCompStrengthFormatted = '';
  if (validCompStrengths.length > 0) {
    const sum = validCompStrengths.reduce((acc, v) => acc + v, 0);
    avgCompStrength = sum / validCompStrengths.length;
    avgCompStrengthFormatted = roundToNearestTenth(avgCompStrength).toFixed(1);
  }

  let avgCorrectedStrength = null;
  let avgCorrectedStrengthFormatted = '';
  if (validCorrectedStrengths.length > 0) {
    const sum = validCorrectedStrengths.reduce((acc, v) => acc + v, 0);
    avgCorrectedStrength = sum / validCorrectedStrengths.length;
    avgCorrectedStrengthFormatted = roundToNearestTenth(avgCorrectedStrength).toFixed(1);
  }

  return {
    rows,
    avgCompStrength,
    avgCompStrengthFormatted,
    avgCorrectedStrength,
    avgCorrectedStrengthFormatted,
    reportedStrength: avgCorrectedStrengthFormatted,
    totalValid: validCorrectedStrengths.length,
    errors: rowErrors,
  };
}

/**
 * Calculate Water Absorption Test per IS 15658: 2021
 */
export function calculatePaverBlockWaterAbsorption(observations = [], metadata = {}) {
  const rows = [];
  const validAbsorptions = [];

  observations.forEach((obs, index) => {
    const rowNum = index + 1;
    const l = parseFloat(obs.length);
    const b = parseFloat(obs.breadth);
    const t = parseFloat(obs.thickness);
    const wetMass = parseFloat(obs.wetMassKg);
    const dryMass = parseFloat(obs.dryMassKg);

    let waterAbsorption = null;
    let waterAbsorptionFormatted = '';

    if (!isNaN(wetMass) && !isNaN(dryMass) && dryMass > 0) {
      waterAbsorption = ((wetMass - dryMass) / dryMass) * 100;
      waterAbsorptionFormatted = roundToNearestTenth(waterAbsorption).toFixed(1);
      validAbsorptions.push(parseFloat(waterAbsorptionFormatted));
    }

    rows.push({
      ...obs,
      rowNum,
      sampleId: obs.sampleId || `Sample ${rowNum}`,
      waterAbsorption,
      waterAbsorptionFormatted,
    });
  });

  let avgWaterAbsorption = null;
  let avgWaterAbsorptionFormatted = '';
  if (validAbsorptions.length > 0) {
    const sum = validAbsorptions.reduce((acc, v) => acc + v, 0);
    avgWaterAbsorption = sum / validAbsorptions.length;
    avgWaterAbsorptionFormatted = roundToNearestTenth(avgWaterAbsorption).toFixed(1);
  }

  return {
    rows,
    avgWaterAbsorption,
    avgWaterAbsorptionFormatted,
    totalValid: validAbsorptions.length,
  };
}

/**
 * Complete Paver Block Test Calculation
 */
export function calculatePaverBlockTest(compObs = [], waObs = [], metadata = {}) {
  const compressive = calculatePaverBlockCompressiveStrength(compObs, metadata);
  const waterAbsorption = calculatePaverBlockWaterAbsorption(waObs, metadata);

  return {
    metadata: {
      ...DEFAULT_PAVER_BLOCK_METADATA,
      ...metadata,
    },
    compressive,
    waterAbsorption,
    isComplete: compressive.totalValid > 0 || waterAbsorption.totalValid > 0,
    reportedStrength: compressive.reportedStrength || '-',
    reportedWaterAbsorption: waterAbsorption.avgWaterAbsorptionFormatted || '-',
  };
}
