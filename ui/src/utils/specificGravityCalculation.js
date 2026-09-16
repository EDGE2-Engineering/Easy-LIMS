/**
 * Utility functions for Soil Specific Gravity (SG) Calculation
 * Method: Density Bottle / Pycnometer Method (IS:2720 Part III)
 * 
 * General Formula:
 * SG = (M2 - M1) / ((M4 - M1) - (M3 - M2))
 * 
 * Where:
 * - M1: Mass of Density Bottle (g)
 * - M2: Mass of Density Bottle + Dry Soil (g)
 * - M3: Mass of Density Bottle + Soil + Water (g)
 * - M4: Mass of Density Bottle + Full Water (g)
 * 
 * Rules:
 * - Two trials (determinations) conducted per depth
 * - Values rounded to 2 decimal places
 * - Difference between SG1 and SG2 should not exceed 0.03
 * - Average SG = (SG1 + SG2) / 2
 */

/**
 * Calculate single trial specific gravity
 * @param {Object} params
 * @param {number|string} params.m1
 * @param {number|string} params.m2
 * @param {number|string} params.m3
 * @param {number|string} params.m4
 * @returns {Object}
 */
export function calculateSingleTrialSG({ m1, m2, m3, m4 }) {
  const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';
  const numM1 = isPresent(m1) ? parseFloat(m1) : NaN;
  const numM2 = isPresent(m2) ? parseFloat(m2) : NaN;
  const numM3 = isPresent(m3) ? parseFloat(m3) : NaN;
  const numM4 = isPresent(m4) ? parseFloat(m4) : NaN;

  const hasAny = isPresent(m1) || isPresent(m2) || isPresent(m3) || isPresent(m4);
  const hasAll = !isNaN(numM1) && !isNaN(numM2) && !isNaN(numM3) && !isNaN(numM4);
  if (!hasAll) {
    const errors = [];
    if (hasAny) {
      errors.push('All 4 mass measurements (M₁ to M₄) are required for a complete determination.');
    }
    return {
      sg: '',
      rawSg: null,
      errors,
      isValid: false,
    };
  }

  const errors = [];
  if (numM2 <= numM1) {
    errors.push('Dry soil mass with bottle (M2) must be greater than empty bottle (M1).');
  }
  if (numM4 <= numM1) {
    errors.push('Bottle with full water (M4) must be greater than empty bottle (M1).');
  }

  const numerator = numM2 - numM1;
  const denominator = (numM4 - numM1) - (numM3 - numM2);

  if (denominator <= 0) {
    errors.push('Invalid measurement combination: denominator ((M4 - M1) - (M3 - M2)) must be greater than 0.');
    return {
      sg: '',
      rawSg: null,
      errors,
      isValid: false,
    };
  }

  const rawSg = numerator / denominator;
  const roundedSg = rawSg.toFixed(2);

  return {
    sg: roundedSg,
    rawSg,
    numerator: Number(numerator.toFixed(4)),
    denominator: Number(denominator.toFixed(4)),
    errors,
    isValid: errors.length === 0,
  };
}

/**
 * Calculate combined Specific Gravity across two trials
 * @param {Object} params
 * @param {Object} params.trial1 - { m1, m2, m3, m4 }
 * @param {Object} params.trial2 - { m1, m2, m3, m4 }
 * @returns {Object}
 */
export function calculateSpecificGravity({ trial1 = {}, trial2 = {} }) {
  const t1 = calculateSingleTrialSG(trial1);
  const t2 = calculateSingleTrialSG(trial2);

  let diff = null;
  let diffFormatted = '';
  let averageSg = '';
  let rawAverageSg = null;
  let isDiffExceeded = false;
  const warnings = [];

  if (t1.isValid && t2.isValid) {
    // Both trials are valid
    const sg1Val = parseFloat(t1.sg);
    const sg2Val = parseFloat(t2.sg);

    const rawDiff = Math.abs(sg1Val - sg2Val);
    diffFormatted = rawDiff.toFixed(2);
    diff = parseFloat(diffFormatted);

    // Rule: difference should not exceed 0.03
    if (diff > 0.03) {
      isDiffExceeded = true;
      warnings.push(
        `The difference between SG₁ (${t1.sg}) and SG₂ (${t2.sg}) is ${diffFormatted}, which exceeds the permissible limit of 0.03.`
      );
    }

    rawAverageSg = (sg1Val + sg2Val) / 2;
    averageSg = rawAverageSg.toFixed(2);
  } else if (t1.isValid) {
    // Only trial 1 completed
    averageSg = t1.sg;
  } else if (t2.isValid) {
    // Only trial 2 completed
    averageSg = t2.sg;
  }

  return {
    t1: {
      ...trial1,
      sg: t1.sg,
      rawSg: t1.rawSg,
      errors: t1.errors,
      isValid: t1.isValid,
    },
    t2: {
      ...trial2,
      sg: t2.sg,
      rawSg: t2.rawSg,
      errors: t2.errors,
      isValid: t2.isValid,
    },
    diff: diffFormatted,
    diffNum: diff,
    averageSg,
    rawAverageSg,
    isDiffExceeded,
    warnings,
    isComplete: t1.isValid && t2.isValid,
  };
}
