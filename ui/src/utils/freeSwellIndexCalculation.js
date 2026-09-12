/**
 * Utility functions for Soil Free Swell Index (FSI) Calculation
 * Standard: IS 2720 (Part 40) - Determination of Free Swell Index of Soils
 * 
 * Formula:
 * FSI = ((Vd - Vk) / Vk) * 100
 * 
 * Where:
 * - Vd: Volume of soil specimen read from the graduated cylinder containing distilled water after 24 hrs
 * - Vk: Volume of soil specimen read from the graduated cylinder containing kerosene after 24 hrs
 * - Mass of dry soil passing 425-micron IS sieve: usually 10.000 g
 * 
 * Rules:
 * - Two trials (determinations) conducted per depth
 * - Values rounded to 2 decimal places (e.g. 20.00, 13.00, 10.00)
 * - Average FSI = (FSI1 + FSI2) / 2
 */

/**
 * Calculate single trial Free Swell Index
 * @param {Object} params
 * @param {number|string} params.soilMass - Mass of dry soil passing sieve (g)
 * @param {number|string} params.vd - Volume in water after 24 hrs (ml or cm³)
 * @param {number|string} params.vk - Volume in kerosene after 24 hrs (ml or cm³)
 * @returns {Object}
 */
export function calculateSingleTrialFSI({ soilMass, vd, vk }) {
  const numVd = vd !== '' && vd !== null && vd !== undefined ? parseFloat(vd) : NaN;
  const numVk = vk !== '' && vk !== null && vk !== undefined ? parseFloat(vk) : NaN;
  const numSoilMass = soilMass !== '' && soilMass !== null && soilMass !== undefined ? parseFloat(soilMass) : NaN;

  const hasVolumes = !isNaN(numVd) && !isNaN(numVk);
  if (!hasVolumes) {
    return {
      fsi: '',
      rawFsi: null,
      errors: [],
      isValid: false,
    };
  }

  const errors = [];
  if (numVk <= 0) {
    errors.push('Volume in kerosene (Vk) must be greater than 0.');
    return {
      fsi: '',
      rawFsi: null,
      errors,
      isValid: false,
    };
  }

  if (numVd < 0) {
    errors.push('Volume in water (Vd) cannot be negative.');
  }

  const rawFsi = ((numVd - numVk) / numVk) * 100;
  const roundedFsi = rawFsi.toFixed(2);

  return {
    fsi: roundedFsi,
    rawFsi,
    soilMass: !isNaN(numSoilMass) ? numSoilMass : '',
    vd: numVd,
    vk: numVk,
    errors,
    isValid: errors.length === 0,
  };
}

/**
 * Calculate combined Free Swell Index across two trials
 * @param {Object} params
 * @param {Object} params.trial1 - { soilMass, vd, vk }
 * @param {Object} params.trial2 - { soilMass, vd, vk }
 * @returns {Object}
 */
export function calculateFreeSwellIndex({ trial1 = {}, trial2 = {} }) {
  const t1 = calculateSingleTrialFSI(trial1);
  const t2 = calculateSingleTrialFSI(trial2);

  let averageFsi = '';
  let rawAverageFsi = null;

  if (t1.isValid && t2.isValid) {
    const fsi1Val = parseFloat(t1.fsi);
    const fsi2Val = parseFloat(t2.fsi);
    rawAverageFsi = (fsi1Val + fsi2Val) / 2;
    averageFsi = rawAverageFsi.toFixed(2);
  } else if (t1.isValid) {
    averageFsi = t1.fsi;
  } else if (t2.isValid) {
    averageFsi = t2.fsi;
  }

  // Degree of Expansiveness according to IS 2720 Part 40 / IS 1498:
  // < 50%: Low (Negligible)
  // 50% - 100%: Medium
  // 100% - 200%: High
  // > 200%: Very High
  let expansiveness = '';
  if (averageFsi !== '') {
    const val = parseFloat(averageFsi);
    if (val < 50) expansiveness = 'Low';
    else if (val <= 100) expansiveness = 'Medium';
    else if (val <= 200) expansiveness = 'High';
    else expansiveness = 'Very High';
  }

  return {
    t1: {
      ...trial1,
      fsi: t1.fsi,
      rawFsi: t1.rawFsi,
      errors: t1.errors,
      isValid: t1.isValid,
    },
    t2: {
      ...trial2,
      fsi: t2.fsi,
      rawFsi: t2.rawFsi,
      errors: t2.errors,
      isValid: t2.isValid,
    },
    averageFsi,
    rawAverageFsi,
    expansiveness,
    isComplete: t1.isValid && t2.isValid,
  };
}
