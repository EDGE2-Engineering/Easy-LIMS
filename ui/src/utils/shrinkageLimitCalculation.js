/**
 * Utility functions for Soil Shrinkage Limit Calculation
 * Standard: IS 2720 (Part 6) - Determination of Shrinkage Factors
 * 
 * Formulas:
 * 1. Weight of dry soil pat (W0) = M3 - M1
 * 2. Weight of wet soil pat (Mw) = M2 - M1
 * 3. Weight of water = M2 - M3
 * 4. Moisture content (%) = ((Mw - W0) / W0) * 100 = (Weight of water / W0) * 100
 * 5. Weight of mercury filling dish = Dish + Hg - Empty Dish (Row 10 - Row 11)
 * 6. Volume of wet soil pat (V) = Weight of mercury filling dish / 13.6
 * 7. Weight of mercury displaced = Cup + Hg - Cup + Hg after immersion (Row 16 - Row 17)
 * 8. Volume of dry soil pat (V0) = Weight of mercury displaced / 13.6
 * 9. Shrinkage limit (Ws %) = Moisture Content - ((V - V0) / W0) * 100
 * 10. Shrinkage Ratio (R) = W0 / V0
 * 
 * Rules:
 * - 3 trials recommended by IS standard (trials 1, 2, 3)
 * - Average SL = sum(trials) / count
 * - Each trial value must lie within ±2% of SL_avg:
 *   Lower limit = SL_avg - (SL_avg * 0.02)
 *   Upper limit = SL_avg + (SL_avg * 0.02)
 *   If an individual trial varies by > 2%, it should be flagged/repeated.
 */

export const MERCURY_SPECIFIC_GRAVITY = 13.6;

export const DEFAULT_SHRINKAGE_TRIAL = {
  dishNo: '',
  m1: '', // Empty weight of shrinkage dish (g)
  m2: '', // Weight of shrinkage dish + wet soil pat (g)
  m3: '', // Weight of shrinkage dish + dry soil pat (g)
  dishMercuryFilled: '', // Weight of shrinkage dish + mercury filled (g)
  cupNo: '', // Glass cup No
  emptyCupWeight: '', // Empty weight of glass cup (g)
  cupMercuryFilled: '', // Weight of glass cup + mercury fully filled (g)
  cupMercuryImmersed: '', // Weight of glass cup + mercury after dry pat immersion (g)
};

export const SAMPLE_SHRINKAGE_DATA = {
  trials: [
    {
      dishNo: '11',
      m1: '28.46',
      m2: '68.905',
      m3: '56.09',
      dishMercuryFilled: '345.68',
      cupNo: '1',
      emptyCupWeight: '37.61',
      cupMercuryFilled: '447.24',
      cupMercuryImmersed: '234.63',
    },
    {
      dishNo: '7',
      m1: '29.302',
      m2: '69.68',
      m3: '56.86',
      dishMercuryFilled: '349.1',
      cupNo: '1',
      emptyCupWeight: '37.61',
      cupMercuryFilled: '446.82',
      cupMercuryImmersed: '231.17',
    },
    {
      dishNo: '',
      m1: '',
      m2: '',
      m3: '',
      dishMercuryFilled: '',
      cupNo: '',
      emptyCupWeight: '',
      cupMercuryFilled: '',
      cupMercuryImmersed: '',
    },
  ],
};

export const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';

export const toNum = (v) => (isPresent(v) ? parseFloat(v) : NaN);

/**
 * Calculate single trial values
 * @param {Object} trial
 * @returns {Object}
 */
export function calculateSingleShrinkageTrial(trial = {}) {
  const m1 = toNum(trial.m1);
  const m2 = toNum(trial.m2);
  const m3 = toNum(trial.m3);
  const dishHg = toNum(trial.dishMercuryFilled);
  const cupHg = toNum(trial.cupMercuryFilled);
  const cupImmersed = toNum(trial.cupMercuryImmersed);

  const errors = [];

  // 1. Dry soil pat W0 (g) = M3 - M1
  let w0 = null;
  if (!isNaN(m3) && !isNaN(m1)) {
    w0 = m3 - m1;
    if (w0 <= 0) errors.push('Dry soil weight (M3 - M1) must be positive.');
  }

  // 2. Wet soil pat Mw (g) = M2 - M1
  let mw = null;
  if (!isNaN(m2) && !isNaN(m1)) {
    mw = m2 - m1;
    if (mw <= 0) errors.push('Wet soil weight (M2 - M1) must be positive.');
  }

  // 3. Weight of water (g) = M2 - M3
  let waterWeight = null;
  if (!isNaN(m2) && !isNaN(m3)) {
    waterWeight = m2 - m3;
    if (waterWeight < 0) errors.push('Weight of water (M2 - M3) cannot be negative.');
  }

  // 4. Moisture content (%) = (waterWeight / w0) * 100
  let moistureContent = null;
  if (w0 !== null && waterWeight !== null && w0 > 0) {
    moistureContent = (waterWeight / w0) * 100;
  }

  // 5. Weight of mercury filling dish = dishHg - m1
  let mercuryInDish = null;
  if (!isNaN(dishHg) && !isNaN(m1)) {
    mercuryInDish = dishHg - m1;
  }

  // 6. Volume of wet soil pat V (ml) = mercuryInDish / 13.6
  let v = null;
  if (mercuryInDish !== null) {
    v = mercuryInDish / MERCURY_SPECIFIC_GRAVITY;
  }

  // 7. Weight of mercury displaced by dry pat = cupHg - cupImmersed
  let mercuryDisplaced = null;
  if (!isNaN(cupHg) && !isNaN(cupImmersed)) {
    mercuryDisplaced = cupHg - cupImmersed;
  }

  // 8. Volume of dry soil pat V0 (ml) = mercuryDisplaced / 13.6
  let v0 = null;
  if (mercuryDisplaced !== null) {
    v0 = mercuryDisplaced / MERCURY_SPECIFIC_GRAVITY;
  }

  // 9. Shrinkage limit Ws (%) = moistureContent - ((V - V0) / W0) * 100
  let shrinkageLimit = null;
  if (moistureContent !== null && v !== null && v0 !== null && w0 !== null && w0 > 0) {
    shrinkageLimit = moistureContent - ((v - v0) / w0) * 100;
  }

  // 10. Shrinkage Ratio R = W0 / V0
  let shrinkageRatio = null;
  if (w0 !== null && v0 !== null && v0 > 0) {
    shrinkageRatio = w0 / v0;
  }

  const isValid =
    shrinkageLimit !== null &&
    shrinkageRatio !== null &&
    !isNaN(shrinkageLimit) &&
    !isNaN(shrinkageRatio) &&
    errors.length === 0;

  return {
    w0: w0 !== null ? Number(w0.toFixed(3)) : null,
    mw: mw !== null ? Number(mw.toFixed(3)) : null,
    waterWeight: waterWeight !== null ? Number(waterWeight.toFixed(3)) : null,
    moistureContent: moistureContent !== null ? Number(moistureContent.toFixed(3)) : null,
    mercuryInDish: mercuryInDish !== null ? Number(mercuryInDish.toFixed(3)) : null,
    v: v !== null ? Number(v.toFixed(3)) : null,
    mercuryDisplaced: mercuryDisplaced !== null ? Number(mercuryDisplaced.toFixed(3)) : null,
    v0: v0 !== null ? Number(v0.toFixed(3)) : null,
    shrinkageLimit: shrinkageLimit !== null ? Number(shrinkageLimit.toFixed(3)) : null,
    shrinkageLimitFormatted: shrinkageLimit !== null ? shrinkageLimit.toFixed(2) : '',
    shrinkageRatio: shrinkageRatio !== null ? Number(shrinkageRatio.toFixed(2)) : null,
    shrinkageRatioFormatted: shrinkageRatio !== null ? shrinkageRatio.toFixed(2) : '',
    errors,
    isValid,
  };
}

/**
 * Calculate multi-trial shrinkage limits, average, and IS code 2% variation compliance
 * @param {Array<Object>} trials
 * @returns {Object}
 */
export function calculateShrinkageLimits(trials = []) {
  const trialResults = trials.map((t) => calculateSingleShrinkageTrial(t));
  const validTrials = trialResults.filter((t) => t.isValid);

  if (validTrials.length === 0) {
    return {
      trials: trialResults,
      validCount: 0,
      averageSl: '',
      averageSlFormatted: '',
      averageRatio: '',
      averageRatioFormatted: '',
      lowerLimit: null,
      upperLimit: null,
      isCompliant: true,
      deviatingTrialIndices: [],
      warningMessage: '',
    };
  }

  const sumSl = validTrials.reduce((acc, t) => acc + t.shrinkageLimit, 0);
  const rawAverageSl = sumSl / validTrials.length;
  const averageSl = Number(rawAverageSl.toFixed(3));
  const averageSlFormatted = rawAverageSl.toFixed(2);

  const sumRatio = validTrials.reduce((acc, t) => acc + t.shrinkageRatio, 0);
  const rawAverageRatio = sumRatio / validTrials.length;
  const averageRatio = Number(rawAverageRatio.toFixed(2));
  const averageRatioFormatted = rawAverageRatio.toFixed(2);

  // Per IS 2720 Part 6: each trial must lie within ±2% of SL_avg
  const lowerLimit = Number((averageSl - averageSl * 0.02).toFixed(3));
  const upperLimit = Number((averageSl + averageSl * 0.02).toFixed(3));

  const deviatingTrialIndices = [];
  trialResults.forEach((t, idx) => {
    if (t.isValid) {
      if (t.shrinkageLimit < lowerLimit || t.shrinkageLimit > upperLimit) {
        deviatingTrialIndices.push(idx);
      }
    }
  });

  const isCompliant = deviatingTrialIndices.length === 0;
  let warningMessage = '';
  if (!isCompliant) {
    const trialLabels = deviatingTrialIndices.map((i) => `Trial ${i + 1}`).join(', ');
    warningMessage = `${trialLabels} varies from average by more than ±2% (allowed range: ${lowerLimit.toFixed(2)}% - ${upperLimit.toFixed(2)}%). Per IS 2720 Part 6, the test should be repeated.`;
  }

  return {
    trials: trialResults,
    validCount: validTrials.length,
    averageSl,
    averageSlFormatted,
    averageRatio,
    averageRatioFormatted,
    lowerLimit,
    upperLimit,
    isCompliant,
    deviatingTrialIndices,
    warningMessage,
  };
}
