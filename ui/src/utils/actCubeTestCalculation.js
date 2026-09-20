/**
 * Utility functions for ACT (Accelerated Curing Test) Cube Compressive Strength Calculation
 * Standards:
 *  - IS 9013 (RA 2018): Method of Making, Curing and Determining Compressive Strength of Accelerated-Cured Concrete Test Specimens
 *  - IS 516 (part 1/Sec 1): 2021: Compressive Strength of Concrete
 *
 * Formulas & Guidelines from IS 9013, IS 516 and Document Specification:
 * 1. Cross-sectional Area (C5) = L x B (sq. mm)
 * 2. Age at test (C8) = Date of testing (C7) - Date of casting (C6) (in days)
 * 3. Compressive Strength (C11) = (Failure Load in kN / Area in sq. mm) * 1000 (N/mm²)
 *    Rounded to the nearest 0.5 N/mm² as per IS 516 / handwriting note:
 *    Formula: Math.round(val * 2) / 2
 * 4. Predicted 28-day ACT Compressive Strength (C12) = (C11 * 1.64) + 8.09 (N/mm²)
 *    Per IS 9013 Clause 9 accelerated curing correlation equation: R₂₈ = 1.64 * Rₐ + 8.09
 *    Formatted to 2 decimal places.
 * 5. Average Predicted 28-day ACT Compressive Strength (CR) = Mean of C12 values,
 *    rounded to the nearest 0.5 N/mm² (e.g. 33.78 -> 34.00 N/mm²).
 * 6. Average ACT Compressive Strength = Mean of individual C11 strengths.
 * 7. Type of failure (C13): Satisfactory / Unsatisfactory dropdown.
 * 8. Decimal precision:
 *    - Weight (kg) (C9): 3 decimal places
 *    - Failure Load (kN) (C10): 3 decimal places
 *    - Compressive Strength (N/mm²) (C11): 1-2 decimal places (nearest 0.5)
 *    - Predicted 28-day ACT Strength (N/mm²) (C12): 2 decimal places
 */

export const DEFAULT_ACT_CUBE_METADATA = {
  standard: 'IS 9013 (RA 2018), IS 516 (part 1/Sec 1) : 2021',
  numberOfSamples: 3,
  gradeOfConcrete: 'M25',
  waterAdditionDateTime: '',
};

export const DEFAULT_ACT_CUBE_OBSERVATION = {
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

export const DEFAULT_ACT_CUBE_OBSERVATIONS = [
  { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: 'ACT-1' },
  { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: 'ACT-2' },
  { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: 'ACT-3' },
];

/**
 * Sample test data strictly following the handwriting example in Page 1 and Page 2 of the PDF:
 * Grade: M25
 * Method: IS 9013 (RA 2018), IS 516 (part 1/Sec 1) : 2021
 * Date & Time of water addition: 03-06-2024 08:30
 * Row 1: M25, Tm-06, Cement - 80%, GGBS - 20%, 150x150x150, Casting: 03-06-2024, Testing: 04-06-2024 (1 day), Weight: 8.259 kg, Load: 365.250 kN -> 16.0 N/mm², Predicted 28-day: 34.33 N/mm², Satisfactory
 * Row 2: M25, Tm-06, Cement - 80%, GGBS - 20%, 150x150x150, Casting: 03-06-2024, Testing: 04-06-2024 (1 day), Weight: 8.274 kg, Load: 341.800 kN -> 15.0 N/mm², Predicted 28-day: 32.69 N/mm², Satisfactory
 * Row 3: M25, Tm-06, Cement - 80%, GGBS - 20%, 150x150x150, Casting: 03-06-2024, Testing: 04-06-2024 (1 day), Weight: 8.296 kg, Load: 359.605 kN -> 16.0 N/mm², Predicted 28-day: 34.33 N/mm², Satisfactory
 * Average Predicted 28-day ACT = (34.33 + 32.69 + 34.33) / 3 = 33.78 -> rounded to nearest 0.5 = 34.00 N/mm²
 */
export const SAMPLE_ACT_CUBE_TEST_DATA = {
  metadata: {
    standard: 'IS 9013 (RA 2018), IS 516 (part 1/Sec 1) : 2021',
    numberOfSamples: 3,
    gradeOfConcrete: 'M25',
    waterAdditionDateTime: '2024-06-03T08:30',
  },
  observations: [
    {
      cubeId: 'M25, Tm-06, Cement - 80%, GGBS - 20%',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2024-06-03',
      dateOfTesting: '2024-06-04',
      weightKg: '8.259',
      failureLoadKn: '365.250',
      failureType: 'Satisfactory',
    },
    {
      cubeId: 'M25, Tm-06, Cement - 80%, GGBS - 20%',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2024-06-03',
      dateOfTesting: '2024-06-04',
      weightKg: '8.274',
      failureLoadKn: '341.800',
      failureType: 'Satisfactory',
    },
    {
      cubeId: 'M25, Tm-06, Cement - 80%, GGBS - 20%',
      length: '150',
      breadth: '150',
      height: '150',
      dateOfCasting: '2024-06-03',
      dateOfTesting: '2024-06-04',
      weightKg: '8.296',
      failureLoadKn: '359.605',
      failureType: 'Satisfactory',
    },
  ],
};

/**
 * Rounds value to nearest 0.5 (as specified in IS 516 / IS 9013 PDF notes)
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
 * Perform real-time ACT cube compressive strength calculation
 *
 * @param {Array<Object>} observations List of observation objects
 * @param {Object} metadata Test metadata
 * @returns {Object} Calculated rows, averages, predicted strength, and errors
 */
export function calculateActCubeTest(observations = [], metadata = {}) {
  const rows = [];
  const validStrengths = [];
  const validPredictedStrengths = [];
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

    // 3. Weight validation: C9 (kg)
    let weightFormatted = '';
    if (!isNaN(weight) && weight > 0) {
      weightFormatted = weight.toFixed(3);
      validWeights.push(weight);
    } else if (obs.weightKg !== '' && obs.weightKg !== undefined && obs.weightKg !== null) {
      rowErrors.push('Weight must be a positive number.');
    }

    // 4. Failure Load validation & Compressive Strength calculation: C11 (N/mm²)
    let rawStrength = null;
    let roundedStrength = null;
    let strengthFormatted = '';
    let loadFormatted = '';
    let predicted28DayStrength = null;
    let predicted28DayFormatted = '';

    if (!isNaN(loadKn) && loadKn > 0) {
      loadFormatted = loadKn.toFixed(3);

      if (area && area > 0) {
        // C11 = (Load / Area) * 1000
        rawStrength = (loadKn / area) * 1000;
        // Rounded to nearest 0.5 N/mm² per IS 516
        roundedStrength = roundToNearestHalf(rawStrength);
        strengthFormatted = roundedStrength % 1 === 0 ? roundedStrength.toFixed(1) : roundedStrength.toFixed(2);
        validStrengths.push(roundedStrength);

        // 5. Predicted 28-day ACT compressive strength: C12 = (C11 * 1.64) + 8.09
        // Uses the rounded strength C11 as shown in Page 2 consideration: (16.0 * 1.64) + 8.09 = 34.33
        predicted28DayStrength = roundedStrength * 1.64 + 8.09;
        predicted28DayFormatted = predicted28DayStrength.toFixed(2);
        validPredictedStrengths.push(predicted28DayStrength);
      } else {
        rowErrors.push('Valid dimensions (L, B) required to calculate compressive strength.');
      }
    } else if (obs.failureLoadKn !== '' && obs.failureLoadKn !== undefined && obs.failureLoadKn !== null) {
      rowErrors.push('Failure load must be a positive number.');
    }

    // Density calculation (kg/m³): Weight (kg) / Volume (m³)
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
      cubeId: obs.cubeId || `ACT-${rowNum}`,
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
      predicted28DayStrength,
      predicted28DayFormatted,
      density,
      densityFormatted,
      failureType: obs.failureType || 'Satisfactory',
      errors: rowErrors,
    });
  });

  // Average ACT Compressive Strength
  let rawAverageStrength = null;
  let averageStrength = null;
  let averageStrengthFormatted = '';

  if (validStrengths.length > 0) {
    const sum = validStrengths.reduce((acc, v) => acc + v, 0);
    rawAverageStrength = sum / validStrengths.length;
    averageStrength = roundToNearestHalf(rawAverageStrength);
    averageStrengthFormatted = averageStrength % 1 === 0 ? averageStrength.toFixed(1) : averageStrength.toFixed(2);
  }

  // Average Predicted 28-day ACT Compressive Strength (CR)
  // Page 2 note: Average = (34.33 + 32.69 + 34.33) / 3 = 33.78 -> [33.78 is Round up nearest value = 34.00 N/mm²]
  let rawAveragePredictedStrength = null;
  let averagePredictedStrength = null;
  let averagePredictedStrengthFormatted = '';

  if (validPredictedStrengths.length > 0) {
    const sumP = validPredictedStrengths.reduce((acc, v) => acc + v, 0);
    rawAveragePredictedStrength = sumP / validPredictedStrengths.length;
    averagePredictedStrength = roundToNearestHalf(rawAveragePredictedStrength);
    averagePredictedStrengthFormatted = averagePredictedStrength % 1 === 0
      ? averagePredictedStrength.toFixed(1)
      : averagePredictedStrength.toFixed(2);
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
    generalErrors.push('IS 9013 / IS 516 requires a minimum of 3 trials for accelerated curing test cube specimens.');
  }

  return {
    rows,
    count: rows.length,
    validStrengthCount: validStrengths.length,
    rawAverageStrength,
    averageStrength,
    averageStrengthFormatted,
    rawAveragePredictedStrength,
    averagePredictedStrength,
    averagePredictedStrengthFormatted,
    averageWeightFormatted,
    averageAgeFormatted,
    generalErrors,
    gradeOfConcrete: metadata.gradeOfConcrete || 'M25',
    standard: metadata.standard || 'IS 9013 (RA 2018), IS 516 (part 1/Sec 1) : 2021',
    waterAdditionDateTime: metadata.waterAdditionDateTime || '',
  };
}
