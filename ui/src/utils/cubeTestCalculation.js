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
 * Sample test data strictly following the handwriting example in Page 1 and Page 2 of the PDF:
 * Trial 1: Footing, 150x150x150, Casting: 05-01-2026, Testing: 12-01-2026 (7 days), Weight: 8.372 kg, Load: 396.160 kN -> 17.50 N/mm², Satisfactory
 * Trial 2: Footing, 150x150x150, Casting: 05-01-2026, Testing: 12-01-2026 (7 days), Weight: 8.552 kg, Load: 433.236 kN -> 19.50 N/mm², Satisfactory
 * Trial 3: Footing, 150x150x150, Casting: 05-01-2026, Testing: 12-01-2026 (7 days), Weight: 8.396 kg, Load: 440.967 kN -> 19.50 N/mm², Satisfactory
 * Average = (17.50 + 19.50 + 19.50) / 3 = 18.833... -> rounded to nearest 0.5 = 19.0 N/mm²
 */
export const SAMPLE_CUBE_TEST_DATA = {
  metadata: {
    standard: 'IS 516 (part 1/Sec 1): 2021',
    numberOfSamples: 3,
    gradeOfConcrete: 'M20',
  },
  observations: [
    {
      cubeId: 'Footing',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2026-01-05',
      dateOfTesting: '2026-01-12',
      weightKg: '8.372',
      failureLoadKn: '396.160',
      failureType: 'Satisfactory',
    },
    {
      cubeId: 'Footing',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2026-01-05',
      dateOfTesting: '2026-01-12',
      weightKg: '8.552',
      failureLoadKn: '433.236',
      failureType: 'Satisfactory',
    },
    {
      cubeId: 'Footing',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2026-01-05',
      dateOfTesting: '2026-01-12',
      weightKg: '8.396',
      failureLoadKn: '440.967',
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

  // Average Compressive Strength Calculation (rounded to nearest 0.5 N/mm² as per PDF note)
  let rawAverageStrength = null;
  let averageStrength = null;
  let averageStrengthFormatted = '';

  if (validStrengths.length > 0) {
    const sum = validStrengths.reduce((acc, v) => acc + v, 0);
    rawAverageStrength = sum / validStrengths.length;
    averageStrength = roundToNearestHalf(rawAverageStrength);
    averageStrengthFormatted = averageStrength.toFixed(1); // e.g. "19.0" as on page 2
  }

  // Average Weight
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
    rawAverageStrength,
    averageStrength,
    averageStrengthFormatted,
    averageWeightFormatted,
    averageAgeFormatted,
    generalErrors,
    gradeOfConcrete: metadata.gradeOfConcrete || 'M20',
    standard: metadata.standard || 'IS 516 (part 1/Sec 1): 2021',
  };
}
