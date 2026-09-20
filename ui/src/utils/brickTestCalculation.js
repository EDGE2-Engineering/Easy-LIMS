/**
 * Utility functions for Brick Test Calculations
 *
 * Tests covered:
 *  1. Compressive Strength      – IS 3495 (Part 1)
 *  2. Water Absorption          – IS 3495 (Part 2): RA 2019
 *  3. Efflorescence             – IS 3495 (Part 3): RA 2019
 *  4. Dimensions of Brick       – IS 1077: RA 2021
 *
 * Formulas:
 *  Compressive Strength (N/mm²) = (Failure Load [kN] × 1000) / Area [mm²]
 *  Area (mm²) = Length (mm) × Width (mm)
 *  Average Compressive Strength: mean of individual values, reported to nearest 0.1 N/mm²
 *
 *  Water Absorption (%) = ((W1 – W2) / W2) × 100
 *  W1 = Wet Weight (g), W2 = Oven-Dry Weight (g)
 *  Average Water Absorption: mean, reported to 1 decimal place
 *
 *  Efflorescence: qualitative rating per IS 3495 Part 3
 *  Ratings: Nil | Slight | Moderate | Heavy | Serious
 *
 *  Dimensions: cumulative totals (sum of 20 brick measurements each for L, W, H)
 *  Average = Total / count
 */

// ─── Default observation shapes ────────────────────────────────────────────

export const DEFAULT_COMPRESSIVE_OBS = {
  brickId: '',
  length: '',
  width: '',
  height: '',
  failureLoadKn: '',
};

export const DEFAULT_WATER_ABS_OBS = {
  brickId: '',
  wetWeight: '',
  dryWeight: '',
};

export const DEFAULT_EFFLORESCENCE_OBS = {
  brickId: '',
  rating: 'Nil',
};

export const DEFAULT_DIMENSIONS_OBS = {
  brickId: '',
  length: '',
  width: '',
  height: '',
};

// ─── Default observation lists (5 specimens as per standard) ───────────────

export const DEFAULT_COMPRESSIVE_OBSERVATIONS = Array.from({ length: 5 }, (_, i) => ({
  ...DEFAULT_COMPRESSIVE_OBS,
  brickId: `Brick ${i + 1}`,
}));

export const DEFAULT_WATER_ABS_OBSERVATIONS = Array.from({ length: 5 }, (_, i) => ({
  ...DEFAULT_WATER_ABS_OBS,
  brickId: `Brick ${i + 1}`,
}));

export const DEFAULT_EFFLORESCENCE_OBSERVATIONS = Array.from({ length: 5 }, (_, i) => ({
  ...DEFAULT_EFFLORESCENCE_OBS,
  brickId: `Brick ${i + 1}`,
}));

export const DEFAULT_DIMENSIONS_OBSERVATIONS = Array.from({ length: 20 }, (_, i) => ({
  ...DEFAULT_DIMENSIONS_OBS,
  brickId: `Brick ${i + 1}`,
}));

// ─── Efflorescence rating options ──────────────────────────────────────────

export const EFFLORESCENCE_RATINGS = ['Nil', 'Slight', 'Moderate', 'Heavy', 'Serious'];

export const EFFLORESCENCE_DESCRIPTIONS = {
  Nil: 'No perceptible deposit of salt.',
  Slight: 'Not more than 10% of the brick surface covered with salt deposit.',
  Moderate: 'Deposit covering up to 50% of the brick surface, unaccompanied by powdering or flaking.',
  Heavy: 'Heavy deposit covering 50% or more of the exposed area, unaccompanied by powdering or flaking.',
  Serious: 'Heavy deposit accompanied by powdering and/or flaking of the exposed surface.',
};

// ─── Sample data (from the provided PDF example) ───────────────────────────

export const SAMPLE_BRICK_TEST_DATA = {
  compressiveStrength: {
    observations: [
      { brickId: 'Brick 1', length: '221', width: '107', height: '79',  failureLoadKn: '112.9' },
      { brickId: 'Brick 2', length: '219', width: '105', height: '79',  failureLoadKn: '128.3' },
      { brickId: 'Brick 3', length: '218', width: '103', height: '79',  failureLoadKn: '104.8' },
      { brickId: 'Brick 4', length: '221', width: '104', height: '84',  failureLoadKn: '120.5' },
      { brickId: 'Brick 5', length: '216', width: '101', height: '81',  failureLoadKn: '152.1' },
    ],
  },
  waterAbsorption: {
    observations: [
      { brickId: 'Brick 1', wetWeight: '3320.0', dryWeight: '2990.0' },
      { brickId: 'Brick 2', wetWeight: '3160.0', dryWeight: '2840.0' },
      { brickId: 'Brick 3', wetWeight: '3210.0', dryWeight: '2910.0' },
      { brickId: 'Brick 4', wetWeight: '3300.0', dryWeight: '2990.0' },
      { brickId: 'Brick 5', wetWeight: '3280.0', dryWeight: '2980.0' },
    ],
  },
  efflorescence: {
    observations: Array.from({ length: 5 }, (_, i) => ({
      brickId: `Brick ${i + 1}`,
      rating: 'Nil',
    })),
  },
  dimensions: {
    observations: [
      { brickId: 'Brick 1',  length: '220', width: '107', height: '81' },
      { brickId: 'Brick 2',  length: '221', width: '108', height: '82' },
      { brickId: 'Brick 3',  length: '218', width: '106', height: '81' },
      { brickId: 'Brick 4',  length: '222', width: '108', height: '82' },
      { brickId: 'Brick 5',  length: '219', width: '107', height: '81' },
      { brickId: 'Brick 6',  length: '221', width: '108', height: '82' },
      { brickId: 'Brick 7',  length: '220', width: '107', height: '82' },
      { brickId: 'Brick 8',  length: '219', width: '107', height: '81' },
      { brickId: 'Brick 9',  length: '222', width: '108', height: '82' },
      { brickId: 'Brick 10', length: '221', width: '108', height: '81' },
      { brickId: 'Brick 11', length: '220', width: '107', height: '82' },
      { brickId: 'Brick 12', length: '219', width: '107', height: '82' },
      { brickId: 'Brick 13', length: '221', width: '108', height: '81' },
      { brickId: 'Brick 14', length: '222', width: '107', height: '82' },
      { brickId: 'Brick 15', length: '218', width: '107', height: '82' },
      { brickId: 'Brick 16', length: '220', width: '108', height: '81' },
      { brickId: 'Brick 17', length: '221', width: '107', height: '82' },
      { brickId: 'Brick 18', length: '219', width: '108', height: '81' },
      { brickId: 'Brick 19', length: '222', width: '107', height: '82' },
      { brickId: 'Brick 20', length: '221', width: '108', height: '82' },
    ],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Round to 1 decimal place (for brick compressive strength & water absorption averages)
 */
export function roundTo1Decimal(val) {
  if (typeof val !== 'number' || isNaN(val)) return NaN;
  return Math.round(val * 10) / 10;
}

// ─── Compressive Strength Calculation ───────────────────────────────────────

/**
 * Calculate brick compressive strength for a list of observations.
 * @param {Array} observations
 * @returns {Object} rows, averages, errors
 */
export function calculateBrickCompressiveStrength(observations = []) {
  const rows = [];
  const validStrengths = [];

  observations.forEach((obs, i) => {
    const rowNum = i + 1;
    const errors = [];

    const l = parseFloat(obs.length);
    const w = parseFloat(obs.width);
    const h = parseFloat(obs.height);
    const loadKn = parseFloat(obs.failureLoadKn);

    // Area = L × W
    let area = null;
    let areaFormatted = '';
    if (!isNaN(l) && !isNaN(w) && l > 0 && w > 0) {
      area = l * w;
      areaFormatted = Math.round(area).toString();
    } else if (obs.length !== '' || obs.width !== '') {
      errors.push('Length and Width must be positive numbers.');
    }

    // Compressive Strength = (Load [kN] × 1000) / Area [mm²]
    let strength = null;
    let strengthFormatted = '';
    if (!isNaN(loadKn) && loadKn > 0 && area && area > 0) {
      strength = (loadKn * 1000) / area;
      strengthFormatted = roundTo1Decimal(strength).toFixed(1);
      validStrengths.push(roundTo1Decimal(strength));
    } else if (obs.failureLoadKn !== '' && obs.failureLoadKn !== undefined) {
      if (isNaN(loadKn) || loadKn <= 0) errors.push('Failure load must be a positive number.');
    }

    rows.push({
      slNo: rowNum,
      brickId: obs.brickId || `Brick ${rowNum}`,
      length: obs.length || '',
      width: obs.width || '',
      height: obs.height || '',
      area,
      areaFormatted,
      failureLoadKn: obs.failureLoadKn || '',
      strength,
      strengthFormatted,
      errors,
    });
  });

  let avgStrength = null;
  let avgStrengthFormatted = '';
  if (validStrengths.length > 0) {
    const sum = validStrengths.reduce((a, v) => a + v, 0);
    avgStrength = roundTo1Decimal(sum / validStrengths.length);
    avgStrengthFormatted = avgStrength.toFixed(1);
  }

  const generalErrors = [];
  if (observations.length < 3) {
    generalErrors.push('IS 3495 requires a minimum of 3 specimens for compressive strength testing.');
  }

  return { rows, avgStrength, avgStrengthFormatted, generalErrors };
}

// ─── Water Absorption Calculation ───────────────────────────────────────────

/**
 * Calculate water absorption for a list of observations.
 * S (%) = ((W1 - W2) / W2) × 100
 */
export function calculateWaterAbsorption(observations = []) {
  const rows = [];
  const validAbsorptions = [];

  observations.forEach((obs, i) => {
    const rowNum = i + 1;
    const errors = [];

    const w1 = parseFloat(obs.wetWeight);
    const w2 = parseFloat(obs.dryWeight);

    let absorption = null;
    let absorptionFormatted = '';

    if (!isNaN(w1) && !isNaN(w2) && w2 > 0) {
      if (w1 < w2) {
        errors.push('Wet weight cannot be less than dry weight.');
      } else {
        absorption = ((w1 - w2) / w2) * 100;
        absorptionFormatted = roundTo1Decimal(absorption).toFixed(1);
        validAbsorptions.push(roundTo1Decimal(absorption));
      }
    } else if ((obs.wetWeight !== '' && obs.wetWeight !== undefined) ||
               (obs.dryWeight !== '' && obs.dryWeight !== undefined)) {
      if (isNaN(w2) || w2 <= 0) errors.push('Oven-dry weight must be a positive number.');
    }

    rows.push({
      slNo: rowNum,
      brickId: obs.brickId || `Brick ${rowNum}`,
      wetWeight: obs.wetWeight || '',
      dryWeight: obs.dryWeight || '',
      absorption,
      absorptionFormatted,
      errors,
    });
  });

  let avgAbsorption = null;
  let avgAbsorptionFormatted = '';
  if (validAbsorptions.length > 0) {
    const sum = validAbsorptions.reduce((a, v) => a + v, 0);
    avgAbsorption = roundTo1Decimal(sum / validAbsorptions.length);
    avgAbsorptionFormatted = avgAbsorption.toFixed(1);
  }

  return { rows, avgAbsorption, avgAbsorptionFormatted };
}

// ─── Dimensions Calculation ──────────────────────────────────────────────────

/**
 * Calculate brick dimension statistics from a list of measurements.
 * Reports: sum total, average, and individual values.
 */
export function calculateBrickDimensions(observations = []) {
  const rows = [];
  let totalLength = 0, totalWidth = 0, totalHeight = 0;
  let countL = 0, countW = 0, countH = 0;

  observations.forEach((obs, i) => {
    const rowNum = i + 1;
    const l = parseFloat(obs.length);
    const w = parseFloat(obs.width);
    const h = parseFloat(obs.height);

    if (!isNaN(l) && l > 0) { totalLength += l; countL++; }
    if (!isNaN(w) && w > 0) { totalWidth += w; countW++; }
    if (!isNaN(h) && h > 0) { totalHeight += h; countH++; }

    rows.push({
      slNo: rowNum,
      brickId: obs.brickId || `Brick ${rowNum}`,
      length: obs.length || '',
      width: obs.width || '',
      height: obs.height || '',
    });
  });

  const avgLength  = countL > 0 ? roundTo1Decimal(totalLength / countL)  : null;
  const avgWidth   = countW > 0 ? roundTo1Decimal(totalWidth  / countW)  : null;
  const avgHeight  = countH > 0 ? roundTo1Decimal(totalHeight / countH)  : null;

  return {
    rows,
    totalLength:  countL > 0 ? Math.round(totalLength)  : null,
    totalWidth:   countW > 0 ? Math.round(totalWidth)   : null,
    totalHeight:  countH > 0 ? Math.round(totalHeight)  : null,
    avgLength,
    avgWidth,
    avgHeight,
    count: observations.length,
  };
}
