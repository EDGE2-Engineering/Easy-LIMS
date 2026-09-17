/**
 * Utility functions for Point Load Index (PLI) Strength of Rock
 * Standard: IS 8764 - Method for Determination of Point Load Strength Index of Rocks
 * 
 * Formulas:
 * 1. Area, A (mm²) = (π / 4) * D²
 * 2. Volume, V (mm³) = A * L
 * 3. Density (g/cc) = (Weight * 1000) / Volume
 * 4. Point Load Index Strength, Is(50) (N/mm² = MPa) = (Load_kN * 1000) / (D^1.5 * sqrt(50))
 * 
 * Note: All calculated values in observation sheet should be rounded to 2 decimal places.
 */

export const DEFAULT_PLI_METADATA = {
  dateOfTesting: new Date().toISOString().split('T')[0],
  testingType: 'Unsoaked', // 'Unsoaked' | 'Soaked'
  soakingPeriodHrs: '',
  boreholeNo: 'BH-1',
};

export const DEFAULT_PLI_OBSERVATIONS = [
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

export const SAMPLE_PLI_DATA = {
  metadata: {
    dateOfTesting: new Date().toISOString().split('T')[0],
    testingType: 'Unsoaked',
    soakingPeriodHrs: '',
    boreholeNo: 'BH-1',
  },
  observations: [
    {
      coreNo: '1',
      depthFrom: '4.50',
      depthTo: '6.00',
      dia: '57.49',
      length: '73.71',
      weight: '441.00',
      loadKn: '3.62',
    },
    {
      coreNo: '2',
      depthFrom: '7.50',
      depthTo: '9.00',
      dia: '56.95',
      length: '62.08',
      weight: '368.50',
      loadKn: '2.88',
    },
  ],
};

export const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';
export const toNum = (v) => (isPresent(v) ? parseFloat(v) : NaN);

/**
 * Calculate single core piece row values for Point Load Index
 * @param {Object} row
 * @returns {Object}
 */
export function calculateSinglePliRow(row = {}) {
  const d = toNum(row.dia);
  const l = toNum(row.length);
  const w = toNum(row.weight);
  const loadKn = toNum(row.loadKn);

  let area = null;
  let volume = null;
  let density = null;
  let pli = null;

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

  // 4. Point Load Index Strength = (Load * 1000) / (D^1.5 * sqrt(50))
  if (!isNaN(loadKn) && loadKn > 0 && !isNaN(d) && d > 0) {
    const denominator = Math.pow(d, 1.5) * Math.sqrt(50);
    if (denominator > 0) {
      pli = (loadKn * 1000) / denominator;
    }
  }

  return {
    ...row,
    area: area !== null ? area.toFixed(2) : '',
    volume: volume !== null ? volume.toFixed(2) : '',
    density: density !== null ? density.toFixed(2) : '',
    pli: pli !== null ? pli.toFixed(2) : '',
    areaNum: area,
    volumeNum: volume,
    densityNum: density,
    pliNum: pli,
    isValid: pli !== null,
  };
}

/**
 * Calculate overall test results across all observation rows
 * @param {Array} observations
 * @param {Object} metadata
 * @returns {Object}
 */
export function calculatePointLoadIndexTest(observations = [], metadata = {}) {
  const calculatedRows = observations.map((row) => calculateSinglePliRow(row));

  const validPliRows = calculatedRows.filter((r) => r.pliNum !== null && !isNaN(r.pliNum));
  const validDensityRows = calculatedRows.filter((r) => r.densityNum !== null && !isNaN(r.densityNum));

  const avgPli =
    validPliRows.length > 0
      ? (validPliRows.reduce((sum, r) => sum + r.pliNum, 0) / validPliRows.length).toFixed(2)
      : null;

  const avgDensity =
    validDensityRows.length > 0
      ? (validDensityRows.reduce((sum, r) => sum + r.densityNum, 0) / validDensityRows.length).toFixed(2)
      : null;

  const representativePli = avgPli || (validPliRows.length > 0 ? validPliRows[0].pli : null);

  return {
    metadata: { ...DEFAULT_PLI_METADATA, ...metadata },
    rows: calculatedRows,
    avgPli,
    avgDensity,
    representativePli,
    validCount: validPliRows.length,
    totalCount: observations.length,
    hasValidResults: validPliRows.length > 0,
  };
}
