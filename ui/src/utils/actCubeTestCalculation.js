import { formatDateDDMMYYYY, calculateAverageCompressiveStrength } from './cubeTestCalculation.js';

export { formatDateDDMMYYYY, calculateAverageCompressiveStrength };

/**
 * Utility functions for ACT (Accelerated Curing Test) Cube Compressive Strength Calculation
 * Standards:
 *  - IS 9013 (RA 2018): Method of Making, Curing and Determining Compressive Strength of Accelerated-Cured Concrete Test Specimens
 *  - IS 516 (part 1/Sec 1): 2021: Compressive Strength of Concrete
 *
 * Formulas & Guidelines from IS 9013, IS 516 and Document Specification:
 * 1. Cross-sectional Area (C5) = L x B (sq. mm)
 * 2. Age at test (C8) = Date of testing (C7) - Date of casting (C6) (in days, displayed as number under Age (days))
 * 3. Failure Load in kN (C10)
 * 4. ACT Compressive Strength (C11) = (Failure Load in kN / Area in sq. mm) * 1000 (N/mm²)
 *    Rounded to the nearest 0.5 N/mm² as per IS 516: Math.round(val * 2) / 2
 * 5. Predicted 28-day ACT Compressive Strength (C12) = (C11 * 1.64) + 8.09 (N/mm²)
 *    Per IS 9013 Clause 9 accelerated curing correlation equation: R₂₈ = 1.64 * Rₐ + 8.09
 *    Rounded to the nearest 0.5 N/mm² as per specification.
 * 6. Average Predicted 28-day ACT Compressive Strength (CR) = Mean of C12 values,
 *    rounded to the nearest 0.5 N/mm² (e.g. 35.50 N/mm²).
 * 7. Average ACT Compressive Strength = Mean of individual C11 strengths.
 * 8. Reporting Requirements:
 *    - Final report shall display ONLY "Predicted 28 days Compressive Strength".
 *    - Average weight and average ACT strength are recorded for testing data only and excluded from final report.
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
    let rawPredicted28Day = null;
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
        // Requirement 6: Round off the Predicted 28d Compressive Strength to the nearest 0.5
        rawPredicted28Day = roundedStrength * 1.64 + 8.09;
        predicted28DayStrength = roundToNearestHalf(rawPredicted28Day);
        predicted28DayFormatted = predicted28DayStrength % 1 === 0
          ? predicted28DayStrength.toFixed(1)
          : predicted28DayStrength.toFixed(2);
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
      dateOfCastingFormatted: formatDateDDMMYYYY(obs.dateOfCasting),
      dateOfTesting: obs.dateOfTesting || '',
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
      rawPredicted28Day,
      predicted28DayStrength,
      predicted28DayFormatted,
      density,
      densityFormatted,
      failureType: obs.failureType || 'Satisfactory',
      errors: rowErrors,
    });
  });

  // Helper for formatting strengths to nearest 0.5: integer -> 1 decimal (e.g. 34.0), half -> 2 decimals (e.g. 36.50, 15.50)
  const formatStrength = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '';
    return val % 1 === 0 ? val.toFixed(1) : val.toFixed(2);
  };

  // Representative Average Compressive Strength per IS 516 (part 1/Sec 1): 2021 Clause 3.6:
  // 1. Evaluate Predicted 28-day Compressive Strength (Primary report result)
  const avgPredictedResult = calculateAverageCompressiveStrength(validPredictedStrengths);

  // 2. Evaluate ACT Compressive Strength (Ra)
  const avgActResult = calculateAverageCompressiveStrength(validStrengths);

  const isOutlierClauseApplied = Boolean(
    avgPredictedResult.isOutlierClauseApplied || avgActResult.isOutlierClauseApplied
  );

  const rawAveragePredictedStrength = avgPredictedResult.rawAverageStrength;
  const averagePredictedStrength = avgPredictedResult.averageStrength;
  const averagePredictedStrengthFormatted = formatStrength(averagePredictedStrength);

  const rawAverageStrength = avgActResult.rawAverageStrength;
  const averageStrength = avgActResult.averageStrength;
  const averageStrengthFormatted = formatStrength(averageStrength);

  // Determine excluded indices: combine from both predicted strengths and ACT strengths
  const excludedPredictedIndices = avgPredictedResult.excludedIndices || [];
  const excludedActIndices = avgActResult.excludedIndices || [];
  const excludedIndices = Array.from(new Set([...excludedPredictedIndices, ...excludedActIndices]));

  // Mark rows that were excluded from the representative average due to > ±15% variation per IS 516 Cl 3.6
  if (isOutlierClauseApplied) {
    rows.forEach((r, idx) => {
      if (excludedIndices.length > 0) {
        r.isExcludedFromAverage = excludedIndices.includes(idx);
      } else {
        r.isExcludedFromAverage =
          Boolean(avgPredictedResult.excludedValues?.includes(r.predicted28DayStrength)) ||
          Boolean(avgActResult.excludedValues?.includes(r.roundedStrength));
      }
    });
  } else {
    rows.forEach((r) => {
      r.isExcludedFromAverage = false;
    });
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
    isOutlierClauseApplied,
    initialAverageStrength: avgActResult.initialAverageStrength,
    initialAveragePredictedStrength: avgPredictedResult.initialAverageStrength,
    lowerLimit15Percent: avgPredictedResult.lowerLimit15Percent,
    upperLimit15Percent: avgPredictedResult.upperLimit15Percent,
    lowerLimitAct15Percent: avgActResult.lowerLimit15Percent,
    upperLimitAct15Percent: avgActResult.upperLimit15Percent,
    closestValues: avgPredictedResult.closestValues,
    excludedValues: avgPredictedResult.excludedValues,
    closestActValues: avgActResult.closestValues,
    excludedActValues: avgActResult.excludedValues,
    calculationClauseNote: avgPredictedResult.clauseNote || avgActResult.clauseNote,
    averageWeightFormatted,
    averageAgeFormatted,
    // Requirement 7: Average weight and average ACT strength are testing data only, excluded from final report.
    // Final report shall display only "Predicted 28 days Compressive Strength".
    reportedStrength: averagePredictedStrengthFormatted || averageStrengthFormatted,
    finalReportResult: averagePredictedStrengthFormatted,
    finalReportResultLabel: 'Predicted 28 days Compressive Strength',
    finalReportResultUnit: 'N/mm²',
    reportExcludeAvgWeight: true,
    reportExcludeAvgActStrength: true,
    reportExcludeAvgStrength: true,
    includeAvgWeightInReport: false,
    includeAvgActStrengthInReport: false,
    includeAvgStrengthInReport: false,
    generalErrors,
    gradeOfConcrete: metadata.gradeOfConcrete || 'M25',
    standard: metadata.standard || 'IS 9013 (RA 2018), IS 516 (part 1/Sec 1) : 2021',
    waterAdditionDateTime: metadata.waterAdditionDateTime || '',
  };
}
