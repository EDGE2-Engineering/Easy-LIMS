/**
 * Utility functions for Uniaxial / Unconfined Compressive Strength (UCS) of Rock
 * Standard: IS 9143 - Method for Determination of Unconfined Compressive Strength of Rock Materials
 * 
 * Formulas:
 * 1. Area, A (mm²) = (π / 4) * D²
 * 2. Volume, V (mm³) = A * L
 * 3. Density (g/cc) = (Weight * 1000) / Volume
 * 4. Length-to-Diameter ratio (L/D) = L / D
 * 5. Correction Factor (CF):
 *    - If L/D < 2: CF = (0.11 * (L/D)) + 0.78
 *    - If L/D >= 2: CF = 1.00
 * 6. Compressive Strength (N/mm² = MPa) = (Load_kN * 1000 * CF) / Area
 * 
 * Note: All calculated values in observation sheet should be rounded to 2 decimal places.
 */

export const DEFAULT_ROCK_UCS_METADATA = {
  dateOfTesting: new Date().toISOString().split('T')[0],
  testingType: 'Unsoaked', // 'Unsoaked' | 'Soaked'
  soakingPeriodHrs: '',
  boreholeNo: 'BH-1',
};

export const DEFAULT_ROCK_UCS_OBSERVATIONS = [
  {
    coreNo: '1',
    depthFrom: '',
    depthTo: '',
    dia: '',
    length: '',
    weight: '',
    loadKn: '',
  },
];

export const SAMPLE_ROCK_UCS_DATA = {
  metadata: {
    dateOfTesting: new Date().toISOString().split('T')[0],
    testingType: 'Unsoaked',
    soakingPeriodHrs: '',
    boreholeNo: 'BH-1',
  },
  observations: [
    {
      coreNo: '1',
      depthFrom: '6.00',
      depthTo: '7.50',
      dia: '57.04',
      length: '110.04',
      weight: '740.50',
      loadKn: '39.35',
    },
    {
      coreNo: '2',
      depthFrom: '7.50',
      depthTo: '9.00',
      dia: '56.98',
      length: '115.64',
      weight: '753.00',
      loadKn: '56.16',
    },
  ],
};

export const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';
export const toNum = (v) => (isPresent(v) ? parseFloat(v) : NaN);

/**
 * Calculate single core piece row values for Rock UCS
 * @param {Object} row
 * @returns {Object}
 */
export function calculateSingleRockUcsRow(row = {}) {
  const d = toNum(row.dia);
  const l = toNum(row.length);
  const w = toNum(row.weight);
  const loadKn = toNum(row.loadKn);

  let area = null;
  let volume = null;
  let density = null;
  let ldRatio = null;
  let correctionFactor = null;
  let ucs = null;

  // 1. Area A = (π / 4) * D²
  if (!isNaN(d) && d > 0) {
    area = (Math.PI / 4) * Math.pow(d, 2);
  }

  // 2. Volume V = A * L
  if (area !== null && !isNaN(l) && l > 0) {
    volume = area * l;
  }

  // 3. Density = (Weight * 1000) / Volume
  if (volume !== null && volume > 0 && !isNaN(w) && w > 0) {
    density = (w * 1000) / volume;
  }

  // 4. L/D ratio
  if (!isNaN(l) && l > 0 && !isNaN(d) && d > 0) {
    ldRatio = l / d;
    // 5. Correction Factor: (0.11 * (L/D)) + 0.78 if L/D < 2, else 1.00
    if (ldRatio < 2) {
      correctionFactor = 0.11 * ldRatio + 0.78;
    } else {
      correctionFactor = 1.0;
    }
  }

  // 6. Compressive Strength = (Load * 1000 * CF) / Area
  if (
    !isNaN(loadKn) &&
    loadKn > 0 &&
    correctionFactor !== null &&
    area !== null &&
    area > 0
  ) {
    ucs = (loadKn * 1000 * correctionFactor) / area;
  }

  return {
    ...row,
    area: area !== null ? area.toFixed(2) : '',
    volume: volume !== null ? volume.toFixed(2) : '',
    density: density !== null ? density.toFixed(2) : '',
    ldRatio: ldRatio !== null ? ldRatio.toFixed(2) : '',
    correctionFactor: correctionFactor !== null ? correctionFactor.toFixed(2) : '',
    ucs: ucs !== null ? ucs.toFixed(2) : '',
    areaNum: area,
    volumeNum: volume,
    densityNum: density,
    ldRatioNum: ldRatio,
    correctionFactorNum: correctionFactor,
    ucsNum: ucs,
    isValid: ucs !== null,
  };
}

/**
 * Calculate overall test results across all observation rows
 * @param {Array} observations
 * @param {Object} metadata
 * @returns {Object}
 */
export function calculateRockUcsTest(observations = [], metadata = {}) {
  const calculatedRows = observations.map((row) => calculateSingleRockUcsRow(row));

  const validUcsRows = calculatedRows.filter((r) => r.ucsNum !== null && !isNaN(r.ucsNum));
  const validDensityRows = calculatedRows.filter((r) => r.densityNum !== null && !isNaN(r.densityNum));

  const avgUcs =
    validUcsRows.length > 0
      ? (validUcsRows.reduce((sum, r) => sum + r.ucsNum, 0) / validUcsRows.length).toFixed(2)
      : null;

  const avgDensity =
    validDensityRows.length > 0
      ? (validDensityRows.reduce((sum, r) => sum + r.densityNum, 0) / validDensityRows.length).toFixed(2)
      : null;

  const representativeUcs = avgUcs || (validUcsRows.length > 0 ? validUcsRows[0].ucs : null);

  return {
    metadata: { ...DEFAULT_ROCK_UCS_METADATA, ...metadata },
    rows: calculatedRows,
    avgUcs,
    avgDensity,
    representativeUcs,
    validCount: validUcsRows.length,
    totalCount: observations.length,
    hasValidResults: validUcsRows.length > 0,
  };
}
