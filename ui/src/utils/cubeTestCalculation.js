/**
 * Utility functions for Concrete Cube Compressive Strength Calculation
 * Standard: IS 516 (part 1/Sec 1): 2021 - Methods of Tests for Strength of Concrete (Compressive Strength of Concrete Cubes)
 *
 * Formulas & Guidelines from Standard and Document:
 * 1. Area (C5) = L x B (sq. mm)
 * 2. Age at test (C8) = Date of testing (C7) - Date of casting (C6) (in days)
 * 3. Compressive Strength (C11) = (Failure Load in kN / Area in sq. mm) * 1000 (N/mm²)
 * 4. Rounding rule: Individual compressive strength values are rounded to the nearest 0.5 N/mm².
 *    Formula: Math.round(val * 2) / 2
 *    Formatted to 2 decimal places.
 * 5. Average Compressive Strength = Mean of individual strengths, rounded to the nearest 0.5 N/mm².
 * 6. Decimal precision:
 *    - Weight (kg) (C9): 3 decimal places
 *    - Failure Load (kN) (C10): 3 decimal places
 *    - Compressive Strength (N/mm²) (C11): 2 decimal places
 * 7. Type of failure (C12): Satisfactory / Unsatisfactory
 * 8. Default requirement: 3 trials are required for concrete cube compressive strength test.
 */

export const DEFAULT_CUBE_METADATA = {
  standard: 'IS 516 (part 1/Sec 1): 2021',
  numberOfSamples: 3,
  gradeOfConcrete: 'M20',
};

export const DEFAULT_CUBE_OBSERVATION = {
  cubeId: '',
  length: '150',
  breadth: '150',
  height: '150',
  dateOfCasting: '',
  dateOfTesting: '',
  weightKg: '',
  failureLoadKn: '',
  failureType: 'Satisfactory',
};

export const DEFAULT_CUBE_OBSERVATIONS = [
  { ...DEFAULT_CUBE_OBSERVATION, cubeId: 'Cube 1' },
  { ...DEFAULT_CUBE_OBSERVATION, cubeId: 'Cube 2' },
  { ...DEFAULT_CUBE_OBSERVATION, cubeId: 'Cube 3' },
];

/**
 * Sample test data strictly following the handwriting example in Page 1, Page 2 and Page 3 of the PDF:
 * Specimen Batch: Slab Casting, 150x150x150, Area = 22500 mm²
 * Date of Casting: 19-08-2026, Date of Testing: 11-09-2026 (Age = 23 days)
 * Trial 1: Slab Casting, Weight: 8.416 kg, Failure Load: 537.680 kN -> 24.00 N/mm², Satisfactory
 * Trial 2: Slab Casting, Weight: 8.425 kg, Failure Load: 450.433 kN -> 20.00 N/mm², Satisfactory
 * Trial 3: Slab Casting, Weight: 8.102 kg, Failure Load: 749.686 kN -> 33.50 N/mm², Satisfactory
 *
 * Calculation per IS 516 (part 1/Sec 1): 2021 Clause 3.6:
 * Initial 3-specimen mean: (24.00 + 20.00 + 33.50) / 3 = 25.833... N/mm² (~25.8 N/mm²)
 * ±15% variation range: Lower = 21.93 to 21.96 N/mm², Upper = 29.67 to 29.71 N/mm²
 * 20.00 < Lower Limit & 33.50 > Upper Limit (Individual variation exceeds ±15%)
 * Two closest values: 20.00 and 24.00 N/mm²
 * Average of two closest values: (20.00 + 24.00) / 2 = 22.00 N/mm² -> Rounded to nearest 0.5 = 22.0 N/mm²
 */
export const SAMPLE_CUBE_TEST_DATA = {
  metadata: {
    standard: 'IS 516 (part 1/Sec 1): 2021',
    numberOfSamples: 3,
    gradeOfConcrete: 'M20',
  },
  observations: [
    {
      cubeId: 'Slab Casting',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2026-08-19',
      dateOfTesting: '2026-09-11',
      weightKg: '8.416',
      failureLoadKn: '537.680',
      failureType: 'Satisfactory',
    },
    {
      cubeId: 'Slab Casting',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2026-08-19',
      dateOfTesting: '2026-09-11',
      weightKg: '8.425',
      failureLoadKn: '450.433',
      failureType: 'Satisfactory',
    },
    {
      cubeId: 'Slab Casting',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2026-08-19',
      dateOfTesting: '2026-09-11',
      weightKg: '8.102',
      failureLoadKn: '749.686',
      failureType: 'Satisfactory',
    },
  ],
};

/**
 * Rounds value to nearest 0.5 (as specified in IS 516 / PDF note)
 * @param {number} val
 * @returns {number}
 */
export function roundToNearestHalf(val) {
  if (typeof val !== 'number' || isNaN(val)) return NaN;
  return Math.round(val * 2) / 2;
}

/**
 * Calculate age in days between two date strings (YYYY-MM-DD or DD-MM-YYYY)
 * @param {string} castingDate
 * @param {string} testingDate
 * @returns {number|null}
 */
export function calculateAgeInDays(castingDate, testingDate) {
  if (!castingDate || !testingDate) return null;

  try {
    const parseDate = (dStr) => {
      if (!dStr) return null;
      // Handle DD-MM-YYYY or DD/MM/YYYY
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dStr.trim())) {
        const parts = dStr.trim().split(/[-/]/);
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
      return new Date(dStr);
    };

    const d1 = parseDate(castingDate);
    const d2 = parseDate(testingDate);

    if (!d1 || !d2 || isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

    // Reset time components for clean calendar day difference
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    const diffMs = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  } catch {
    return null;
  }
}

/**
 * Format date string to DD/MM/YYYY
 * Handles YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY and Date objects
 * @param {string|Date} dateVal
 * @returns {string} Formatted DD/MM/YYYY or '-' if empty/invalid
 */
export function formatDateDDMMYYYY(dateVal) {
  if (!dateVal) return '-';
  const str = String(dateVal).trim();
  if (!str) return '-';

  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Calculates representative average compressive strength per IS 516 (part 1/Sec 1): 2021 Clause 3.6:
 *
 * Clause 3.6 Rule:
 * 1. Average of three values shall be taken as the representative of the batch provided the individual
 *    variation is not more than ±15 percent of the average.
 * 2. Otherwise, the average of two closest values may be taken as the average result.
 * 3. Strength values are rounded to the nearest 0.5 N/mm².
 *
 * @param {Array<number>} validStrengths Individual rounded compressive strengths
 * @returns {Object} IS 516 Cl 3.6 calculation result
 */
export function calculateAverageCompressiveStrength(validStrengths = []) {
  if (!validStrengths || validStrengths.length === 0) {
    return {
      rawAverageStrength: null,
      averageStrength: null,
      averageStrengthFormatted: '',
      isOutlierClauseApplied: false,
      initialAverageStrength: null,
      lowerLimit15Percent: null,
      upperLimit15Percent: null,
      closestValues: [],
      excludedValues: [],
      closestIndices: [],
      excludedIndices: [],
      clauseNote: '',
    };
  }

  // 1 specimen
  if (validStrengths.length === 1) {
    const rounded = roundToNearestHalf(validStrengths[0]);
    return {
      rawAverageStrength: validStrengths[0],
      averageStrength: rounded,
      averageStrengthFormatted: rounded.toFixed(1),
      isOutlierClauseApplied: false,
      initialAverageStrength: validStrengths[0],
      lowerLimit15Percent: validStrengths[0] * 0.85,
      upperLimit15Percent: validStrengths[0] * 1.15,
      closestValues: [validStrengths[0]],
      excludedValues: [],
      closestIndices: [0],
      excludedIndices: [],
      clauseNote: 'Single specimen tested.',
    };
  }

  // 2 specimens
  if (validStrengths.length === 2) {
    const mean2 = (validStrengths[0] + validStrengths[1]) / 2;
    const rounded = roundToNearestHalf(mean2);
    return {
      rawAverageStrength: mean2,
      averageStrength: rounded,
      averageStrengthFormatted: rounded.toFixed(1),
      isOutlierClauseApplied: false,
      initialAverageStrength: mean2,
      lowerLimit15Percent: mean2 * 0.85,
      upperLimit15Percent: mean2 * 1.15,
      closestValues: [...validStrengths],
      excludedValues: [],
      closestIndices: [0, 1],
      excludedIndices: [],
      clauseNote: 'Average of 2 specimens taken.',
    };
  }

  // 3 specimens (Standard IS 516 batch)
  if (validStrengths.length === 3) {
    const sum3 = validStrengths[0] + validStrengths[1] + validStrengths[2];
    const initialMean = sum3 / 3;
    const lowerLimit = initialMean * 0.85;
    const upperLimit = initialMean * 1.15;
    const EPS = 1e-6;

    const hasOutlier = validStrengths.some(
      (s) => s < lowerLimit - EPS || s > upperLimit + EPS
    );

    if (!hasOutlier) {
      const rounded = roundToNearestHalf(initialMean);
      return {
        rawAverageStrength: initialMean,
        averageStrength: rounded,
        averageStrengthFormatted: rounded.toFixed(1),
        isOutlierClauseApplied: false,
        initialAverageStrength: initialMean,
        lowerLimit15Percent: lowerLimit,
        upperLimit15Percent: upperLimit,
        closestValues: [...validStrengths],
        excludedValues: [],
        closestIndices: [0, 1, 2],
        excludedIndices: [],
        clauseNote: 'IS 516 Cl 3.6: All individual strengths within ±15% of average.',
      };
    }

    // Individual variation exceeds ±15% -> Average of two closest values per IS 516 Cl 3.6
    const s0 = validStrengths[0];
    const s1 = validStrengths[1];
    const s2 = validStrengths[2];

    const d01 = Math.abs(s0 - s1);
    const d12 = Math.abs(s1 - s2);
    const d02 = Math.abs(s0 - s2);

    let closestPair = [];
    let excluded = [];
    let closestIndices = [];
    let excludedIndices = [];

    const minDiff = Math.min(d01, d12, d02);
    if (Math.abs(d01 - minDiff) < EPS) {
      closestPair = [s0, s1];
      excluded = [s2];
      closestIndices = [0, 1];
      excludedIndices = [2];
    } else if (Math.abs(d12 - minDiff) < EPS) {
      closestPair = [s1, s2];
      excluded = [s0];
      closestIndices = [1, 2];
      excludedIndices = [0];
    } else {
      closestPair = [s0, s2];
      excluded = [s1];
      closestIndices = [0, 2];
      excludedIndices = [1];
    }

    const closestMean = (closestPair[0] + closestPair[1]) / 2;
    const rounded = roundToNearestHalf(closestMean);

    return {
      rawAverageStrength: closestMean,
      averageStrength: rounded,
      averageStrengthFormatted: rounded.toFixed(1),
      isOutlierClauseApplied: true,
      initialAverageStrength: initialMean,
      lowerLimit15Percent: lowerLimit,
      upperLimit15Percent: upperLimit,
      closestValues: closestPair,
      excludedValues: excluded,
      closestIndices,
      excludedIndices,
      clauseNote: `IS 516 Cl 3.6: Variation > ±15% of average (${initialMean.toFixed(1)} N/mm²); average of two closest values (${closestPair[0].toFixed(2)}, ${closestPair[1].toFixed(2)}) applied.`,
    };
  }

  // More than 3 specimens
  const sumN = validStrengths.reduce((acc, v) => acc + v, 0);
  const initialMean = sumN / validStrengths.length;
  const lowerLimit = initialMean * 0.85;
  const upperLimit = initialMean * 1.15;
  const EPS = 1e-6;

  const hasOutlier = validStrengths.some(
    (s) => s < lowerLimit - EPS || s > upperLimit + EPS
  );

  if (!hasOutlier) {
    const rounded = roundToNearestHalf(initialMean);
    return {
      rawAverageStrength: initialMean,
      averageStrength: rounded,
      averageStrengthFormatted: rounded.toFixed(1),
      isOutlierClauseApplied: false,
      initialAverageStrength: initialMean,
      lowerLimit15Percent: lowerLimit,
      upperLimit15Percent: upperLimit,
      closestValues: [...validStrengths],
      excludedValues: [],
      closestIndices: validStrengths.map((_, idx) => idx),
      excludedIndices: [],
      clauseNote: 'IS 516 Cl 3.6: All individual strengths within ±15% of average.',
    };
  }

  // Find pair with minimal difference
  let minDiff = Infinity;
  let bestPair = [validStrengths[0], validStrengths[1]];
  let closestIndices = [0, 1];
  for (let i = 0; i < validStrengths.length; i++) {
    for (let j = i + 1; j < validStrengths.length; j++) {
      const diff = Math.abs(validStrengths[i] - validStrengths[j]);
      if (diff < minDiff) {
        minDiff = diff;
        bestPair = [validStrengths[i], validStrengths[j]];
        closestIndices = [i, j];
      }
    }
  }

  const closestMean = (bestPair[0] + bestPair[1]) / 2;
  const rounded = roundToNearestHalf(closestMean);
  const excludedIndices = validStrengths
    .map((_, idx) => idx)
    .filter((idx) => !closestIndices.includes(idx));
  const excluded = excludedIndices.map((idx) => validStrengths[idx]);

  return {
    rawAverageStrength: closestMean,
    averageStrength: rounded,
    averageStrengthFormatted: rounded.toFixed(1),
    isOutlierClauseApplied: true,
    initialAverageStrength: initialMean,
    lowerLimit15Percent: lowerLimit,
    upperLimit15Percent: upperLimit,
    closestValues: bestPair,
    excludedValues: excluded,
    closestIndices,
    excludedIndices,
    clauseNote: `IS 516 Cl 3.6: Variation > ±15% of average (${initialMean.toFixed(1)} N/mm²); average of two closest values (${bestPair[0].toFixed(2)}, ${bestPair[1].toFixed(2)}) applied.`,
  };
}

/**
 * Perform real-time concrete cube compressive strength calculation
 *
 * @param {Array<Object>} observations List of observation objects
 * @param {Object} metadata Test metadata
 * @returns {Object} Calculated rows, averages, summary and errors
 */
export function calculateCubeTest(observations = [], metadata = {}) {
  const rows = [];
  const validStrengths = [];
  const validWeights = [];
  const validAges = [];
  const generalErrors = [];

  observations.forEach((obs, index) => {
    const rowNum = index + 1;
    const rowErrors = [];

    const l = parseFloat(obs.length);
    const b = parseFloat(obs.breadth);
    const h = parseFloat(obs.height);
    const weight = parseFloat(obs.weightKg);
    const loadKn = parseFloat(obs.failureLoadKn);

    // 1. Cross-sectional Area: C5 = L * B (mm²)
    let area = null;
    let areaFormatted = '';
    if (!isNaN(l) && !isNaN(b) && l > 0 && b > 0) {
      area = l * b;
      areaFormatted = area % 1 === 0 ? String(area) : area.toFixed(2);
    } else if (obs.length !== '' || obs.breadth !== '') {
      rowErrors.push('Dimensions (Length & Breadth) must be positive numbers.');
    }

    // 2. Age at test: C8 = Testing Date - Casting Date (in days)
    const ageDays = calculateAgeInDays(obs.dateOfCasting, obs.dateOfTesting);
    let ageFormatted = '';
    if (ageDays !== null) {
      ageFormatted = String(ageDays);
      validAges.push(ageDays);
    } else if (obs.dateOfCasting && obs.dateOfTesting) {
      rowErrors.push('Testing date cannot be earlier than Casting date.');
    }

    // 3. Weight validation
    let weightFormatted = '';
    if (!isNaN(weight) && weight > 0) {
      weightFormatted = weight.toFixed(3);
      validWeights.push(weight);
    } else if (obs.weightKg !== '' && obs.weightKg !== undefined && obs.weightKg !== null) {
      rowErrors.push('Weight must be a positive number.');
    }

    // 4. Failure Load validation & Compressive Strength calculation
    let rawStrength = null;
    let roundedStrength = null;
    let strengthFormatted = '';
    let loadFormatted = '';

    if (!isNaN(loadKn) && loadKn > 0) {
      loadFormatted = loadKn.toFixed(3);

      if (area && area > 0) {
        // C11 = (Load / Area) * 1000
        rawStrength = (loadKn / area) * 1000;
        // Rounded to nearest 0.5 N/mm²
        roundedStrength = roundToNearestHalf(rawStrength);
        strengthFormatted = roundedStrength.toFixed(2);
        validStrengths.push(roundedStrength);
      } else {
        rowErrors.push('Valid dimensions (L, B) required to calculate compressive strength.');
      }
    } else if (obs.failureLoadKn !== '' && obs.failureLoadKn !== undefined && obs.failureLoadKn !== null) {
      rowErrors.push('Failure load must be a positive number.');
    }

    // Density calculation (kg/m³) as helpful secondary property: Weight (kg) / Volume (m³)
    let density = null;
    let densityFormatted = '';
    if (!isNaN(weight) && weight > 0 && area && !isNaN(h) && h > 0) {
      const volumeM3 = (l * b * h) * 1e-9;
      if (volumeM3 > 0) {
        density = weight / volumeM3;
        densityFormatted = density.toFixed(1);
      }
    }

    rows.push({
      trialNo: rowNum,
      cubeId: obs.cubeId || `Cube ${rowNum}`,
      length: obs.length ?? '150',
      breadth: obs.breadth ?? '150',
      height: obs.height ?? '150',
      area,
      areaFormatted,
      dateOfCasting: obs.dateOfCasting || '',
      dateOfTesting: obs.dateOfTesting || '',
      dateOfCastingFormatted: formatDateDDMMYYYY(obs.dateOfCasting),
      dateOfTestingFormatted: formatDateDDMMYYYY(obs.dateOfTesting),
      ageDays,
      ageFormatted,
      weightKg: obs.weightKg || '',
      weightFormatted,
      failureLoadKn: obs.failureLoadKn || '',
      loadFormatted,
      rawStrength,
      roundedStrength,
      strengthFormatted,
      density,
      densityFormatted,
      failureType: obs.failureType || 'Satisfactory',
      errors: rowErrors,
    });
  });

  // Representative Average Compressive Strength per IS 516 (part 1/Sec 1): 2021 Clause 3.6
  const avgStrengthResult = calculateAverageCompressiveStrength(validStrengths);

  // Mark rows that were excluded from the representative average due to > ±15% variation
  if (avgStrengthResult.isOutlierClauseApplied && avgStrengthResult.excludedValues.length > 0) {
    rows.forEach((r) => {
      r.isExcludedFromAverage = avgStrengthResult.excludedValues.includes(r.roundedStrength);
    });
  } else {
    rows.forEach((r) => {
      r.isExcludedFromAverage = false;
    });
  }

  // Average Weight (testing data only - not required in final report)
  let averageWeightFormatted = '';
  if (validWeights.length > 0) {
    const sumW = validWeights.reduce((acc, v) => acc + v, 0);
    averageWeightFormatted = (sumW / validWeights.length).toFixed(3);
  }

  // Average Age
  let averageAgeFormatted = '';
  if (validAges.length > 0) {
    const sumAge = validAges.reduce((acc, v) => acc + v, 0);
    averageAgeFormatted = Math.round(sumAge / validAges.length).toString();
  }

  // Check 3 trials requirement note from PDF
  if (observations.length < 3) {
    generalErrors.push('IS 516 requires a minimum of 3 trials for Concrete Cube Compressive Strength testing.');
  }

  return {
    rows,
    count: rows.length,
    validStrengthCount: validStrengths.length,
    rawAverageStrength: avgStrengthResult.rawAverageStrength,
    averageStrength: avgStrengthResult.averageStrength,
    averageStrengthFormatted: avgStrengthResult.averageStrengthFormatted,
    isOutlierClauseApplied: avgStrengthResult.isOutlierClauseApplied,
    initialAverageStrength: avgStrengthResult.initialAverageStrength,
    lowerLimit15Percent: avgStrengthResult.lowerLimit15Percent,
    upperLimit15Percent: avgStrengthResult.upperLimit15Percent,
    closestValues: avgStrengthResult.closestValues,
    excludedValues: avgStrengthResult.excludedValues,
    calculationClauseNote: avgStrengthResult.clauseNote,
    averageWeightFormatted,
    averageAgeFormatted,
    // Requirement 5: Average weight is for testing data only and not required in final report
    reportExcludeAvgWeight: true,
    includeAvgWeightInReport: false,
    generalErrors,
    gradeOfConcrete: metadata.gradeOfConcrete || 'M20',
    standard: metadata.standard || 'IS 516 (part 1/Sec 1): 2021',
  };
}
