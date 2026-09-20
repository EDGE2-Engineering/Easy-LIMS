/**
 * Utility functions for Concrete Core Compressive Strength Calculation
 * Standard: IS 516 (part 4) : 2018 - Sampling, Prepared Specimen and Testing of Concrete (Cores)
 *
 * Formulas & Guidelines from IS 516 (Part 4): 2018 and Document Specification:
 * 1. Area of Core = (pi * D^2) / 4 (sq. mm)
 * 2. Cylinder Compressive Strength (C7) = (Failure Load in kN / Area of Core in sq. mm) * 1000 (N/mm²)
 * 3. L/D Ratio (C8) = Length (L) / Dia (D)
 * 4. H/D Ratio Correction Factor (C9) per IS 516 (Part 4) Clause 8.4.2:
 *    - If L/D >= 2.0: Correction Factor = 1.00
 *    - If L/D < 2.0: Correction Factor F = 0.11 * N + 0.78 (where N = L/D ratio)
 * 5. Diameter Correction Factor (Dia Factor) per IS 516 (Part 4) Clause 8.4:
 *    - For 75 ± 5 mm: 1.03
 *    - For < 70 mm: 1.06
 *    - Default template factor as used on Page 3: 1.03
 * 6. Corrected Cylinder Compressive Strength (C10) = Cylinder Strength (C7) * H/D Correction Factor (C9) * Dia Factor (N/mm²)
 * 7. Equivalent Cube Compressive Strength (C11) = Corrected Cylinder Strength (C10) * (5 / 4) (N/mm²)
 *    Rounded to the nearest 0.5 N/mm² per IS 516 / handwriting note:
 *    Formula: Math.round(val * 2) / 2
 * 8. Type of Failure (C12): Satisfactory / Unsatisfactory dropdown.
 * 9. Decimal precision:
 *    - Length & Dia: 2 decimal places
 *    - Weight (kg): 3 decimal places
 *    - Failure Load (kN): 3 decimal places
 *    - Strengths: 2 decimal places (C11 rounded to nearest 0.5)
 */

export const DEFAULT_CONCRETE_CORE_METADATA = {
  standard: 'IS 516 (part 4) : 2018',
  numberOfSamples: 2,
  gradeOfConcrete: 'M35',
  cappingMaterial: 'Epoxy, Ep 10',
  periodOfTest: 'Not furnished',
  diameterFactor: '1.03',
};

export const DEFAULT_CONCRETE_CORE_OBSERVATION = {
  identification: '',
  extractionDate: '',
  length: '198.00',
  dia: '145.00',
  weightKg: '',
  failureLoadKn: '',
  failureType: 'Satisfactory',
};

export const DEFAULT_CONCRETE_CORE_OBSERVATIONS = [
  { ...DEFAULT_CONCRETE_CORE_OBSERVATION, identification: 'Core 1' },
  { ...DEFAULT_CONCRETE_CORE_OBSERVATION, identification: 'Core 2' },
];

/**
 * Sample test data strictly following the handwriting example in Page 1, 2 and 3 of the PDF:
 * Standard: IS 516 (part 4) : 2018
 * Grade: M35 (or Not furnished)
 * Capping material: Epoxy, Ep 10
 * Period of test: Not furnished
 * Row 1: Identification: "Not furnished", Extraction Date: "Not furnished", L: 198.00, D: 145.00, Weight: 7.965 kg, Load: 512.910 kN
 *   -> Area = 16513 mm², Cyl Str: 31.05 N/mm², L/D: 1.37, CF: 0.93, Corr Cyl Str: 29.75 N/mm², Eq Cube Str: 37.00 N/mm², Satisfactory
 * Row 2: Identification: "Not furnished", Extraction Date: "Not furnished", L: 198.50, D: 141.92, Weight: 7.698 kg, Load: 462.322 kN
 *   -> Area = 15819 mm², Cyl Str: 29.13 N/mm², L/D: 1.40, CF: 0.93, Corr Cyl Str: 28.02 N/mm², Eq Cube Str: 35.00 N/mm², Satisfactory
 * Average Equivalent Cube Strength = (37.0 + 35.0) / 2 = 36.00 N/mm²
 */
export const SAMPLE_CONCRETE_CORE_TEST_DATA = {
  metadata: {
    standard: 'IS 516 (part 4) : 2018',
    numberOfSamples: 2,
    gradeOfConcrete: 'M35',
    cappingMaterial: 'Epoxy, Ep 10',
    periodOfTest: 'Not furnished',
    diameterFactor: '1.03',
  },
  observations: [
    {
      identification: 'Not furnished',
      extractionDate: 'Not furnished',
      length: '198.00',
      dia: '145.00',
      weightKg: '7.965',
      failureLoadKn: '512.910',
      failureType: 'Satisfactory',
    },
    {
      identification: 'Not furnished',
      extractionDate: 'Not furnished',
      length: '198.50',
      dia: '141.92',
      weightKg: '7.698',
      failureLoadKn: '462.322',
      failureType: 'Satisfactory',
    },
  ],
};

/**
 * Rounds value to nearest 0.5 (as specified in IS 516)
 * @param {number} val
 * @returns {number}
 */
export function roundToNearestHalf(val) {
  if (typeof val !== 'number' || isNaN(val)) return NaN;
  return Math.round(val * 2) / 2;
}

/**
 * Determines default diameter correction factor based on core diameter
 * @param {number} dia Diameter in mm
 * @returns {number}
 */
export function getStandardDiaFactor(dia) {
  if (isNaN(dia) || dia <= 0) return 1.03;
  if (dia < 70) return 1.06;
  if (dia <= 80) return 1.03;
  // If dia >= 100mm, standard allows 1.00, but document notes use 1.03 default template factor
  return 1.03;
}

/**
 * Real-time Concrete Core calculation per IS 516 (Part 4) : 2018
 *
 * @param {Array<Object>} observations Observation rows
 * @param {Object} metadata Test metadata
 * @returns {Object} Calculated rows and summary results
 */
export function calculateConcreteCoreTest(observations = [], metadata = {}) {
  const rows = [];
  const validCylStrengths = [];
  const validCorrCylStrengths = [];
  const validCubeStrengths = [];
  const validWeights = [];
  const validLdRatios = [];
  const generalErrors = [];

  const defaultDiaFactor = parseFloat(metadata.diameterFactor) || 1.03;

  observations.forEach((obs, index) => {
    const rowNum = index + 1;
    const rowErrors = [];

    const l = parseFloat(obs.length);
    const d = parseFloat(obs.dia);
    const weight = parseFloat(obs.weightKg);
    const loadKn = parseFloat(obs.failureLoadKn);

    // 1. Cross-sectional Area: (pi * D^2) / 4 (sq. mm)
    let area = null;
    let areaFormatted = '';
    if (!isNaN(d) && d > 0) {
      area = (Math.PI * Math.pow(d, 2)) / 4;
      areaFormatted = area % 1 === 0 ? String(area) : area.toFixed(2);
    } else if (obs.dia !== '' && obs.dia !== undefined && obs.dia !== null) {
      rowErrors.push('Diameter must be a positive number.');
    }

    // 2. L/D ratio: C8 = L / D
    let ldRatio = null;
    let ldRatioFormatted = '';
    if (!isNaN(l) && l > 0 && !isNaN(d) && d > 0) {
      ldRatio = l / d;
      ldRatioFormatted = ldRatio.toFixed(2);
      validLdRatios.push(ldRatio);
    } else if (obs.length !== '' && obs.dia !== '') {
      rowErrors.push('Valid Length and Diameter required.');
    }

    // 3. H/D Ratio Correction Factor: C9 per IS 516 (Part 4) Clause 8.4.2
    let correctionFactor = null;
    let correctionFactorFormatted = '';
    if (ldRatio !== null) {
      if (ldRatio >= 2.0) {
        correctionFactor = 1.00;
      } else {
        // F = 0.11 * N + 0.78
        // When using rounded 2-decimal L/D (e.g. 1.37): 0.11 * 1.37 + 0.78 = 0.9307 -> 0.93
        const nVal = parseFloat(ldRatioFormatted);
        correctionFactor = 0.11 * nVal + 0.78;
      }
      correctionFactorFormatted = correctionFactor.toFixed(2);
    }

    // 4. Weight validation: C5 (kg)
    let weightFormatted = '';
    if (!isNaN(weight) && weight > 0) {
      weightFormatted = weight.toFixed(3);
      validWeights.push(weight);
    } else if (obs.weightKg !== '' && obs.weightKg !== undefined && obs.weightKg !== null) {
      rowErrors.push('Weight must be a positive number.');
    }

    // 5. Cylinder Compressive Strength: C7 (N/mm²)
    let cylStrength = null;
    let cylStrengthFormatted = '';
    let loadFormatted = '';

    if (!isNaN(loadKn) && loadKn > 0) {
      loadFormatted = loadKn.toFixed(3);

      if (area && area > 0) {
        cylStrength = (loadKn / area) * 1000;
        cylStrengthFormatted = cylStrength.toFixed(2);
        validCylStrengths.push(cylStrength);
      } else {
        rowErrors.push('Valid diameter required to calculate area.');
      }
    } else if (obs.failureLoadKn !== '' && obs.failureLoadKn !== undefined && obs.failureLoadKn !== null) {
      rowErrors.push('Failure load must be a positive number.');
    }

    // 6. Corrected Cylinder Compressive Strength: C10 (N/mm²)
    // C10 = C7 * C9 * DiaFactor
    let corrCylStrength = null;
    let corrCylStrengthFormatted = '';
    const rowDiaFactor = defaultDiaFactor;

    if (cylStrength !== null && correctionFactor !== null) {
      // Use standard rounding to 2 decimals at each step as in handwritten consideration:
      const c7Val = parseFloat(cylStrengthFormatted);
      const c9Val = parseFloat(correctionFactorFormatted);
      corrCylStrength = c7Val * c9Val * rowDiaFactor;
      corrCylStrengthFormatted = corrCylStrength.toFixed(2);
      validCorrCylStrengths.push(corrCylStrength);
    }

    // 7. Equivalent Cube Compressive Strength: C11 (N/mm²)
    // C11 = C10 * (5/4) = C10 * 1.25, rounded to nearest 0.5
    let rawCubeStrength = null;
    let roundedCubeStrength = null;
    let cubeStrengthFormatted = '';

    if (corrCylStrength !== null) {
      const c10Val = parseFloat(corrCylStrengthFormatted);
      rawCubeStrength = c10Val * 1.25;
      roundedCubeStrength = roundToNearestHalf(rawCubeStrength);
      cubeStrengthFormatted = roundedCubeStrength % 1 === 0 ? roundedCubeStrength.toFixed(1) : roundedCubeStrength.toFixed(2);
      validCubeStrengths.push(roundedCubeStrength);
    }

    // Density calculation: Weight / Volume (kg/m³)
    let density = null;
    let densityFormatted = '';
    if (!isNaN(weight) && weight > 0 && area && !isNaN(l) && l > 0) {
      const volumeM3 = area * l * 1e-9;
      if (volumeM3 > 0) {
        density = weight / volumeM3;
        densityFormatted = density.toFixed(1);
      }
    }

    rows.push({
      trialNo: rowNum,
      identification: obs.identification || `Core ${rowNum}`,
      extractionDate: obs.extractionDate || 'Not furnished',
      length: obs.length ?? '198.00',
      dia: obs.dia ?? '145.00',
      area,
      areaFormatted,
      weightKg: obs.weightKg || '',
      weightFormatted,
      failureLoadKn: obs.failureLoadKn || '',
      loadFormatted,
      cylStrength,
      cylStrengthFormatted,
      ldRatio,
      ldRatioFormatted,
      correctionFactor,
      correctionFactorFormatted,
      diaFactor: rowDiaFactor,
      corrCylStrength,
      corrCylStrengthFormatted,
      rawCubeStrength,
      roundedCubeStrength,
      cubeStrengthFormatted,
      density,
      densityFormatted,
      failureType: obs.failureType || 'Satisfactory',
      errors: rowErrors,
    });
  });

  // Average Equivalent Cube Compressive Strength
  let rawAverageCubeStrength = null;
  let averageCubeStrength = null;
  let averageCubeStrengthFormatted = '';

  if (validCubeStrengths.length > 0) {
    const sum = validCubeStrengths.reduce((acc, v) => acc + v, 0);
    rawAverageCubeStrength = sum / validCubeStrengths.length;
    averageCubeStrength = roundToNearestHalf(rawAverageCubeStrength);
    averageCubeStrengthFormatted = averageCubeStrength % 1 === 0 ? averageCubeStrength.toFixed(1) : averageCubeStrength.toFixed(2);
  }

  // Average Corrected Cylinder Strength
  let averageCorrCylStrengthFormatted = '';
  if (validCorrCylStrengths.length > 0) {
    const sumCorr = validCorrCylStrengths.reduce((acc, v) => acc + v, 0);
    averageCorrCylStrengthFormatted = (sumCorr / validCorrCylStrengths.length).toFixed(2);
  }

  // Average Cylinder Strength
  let averageCylStrengthFormatted = '';
  if (validCylStrengths.length > 0) {
    const sumCyl = validCylStrengths.reduce((acc, v) => acc + v, 0);
    averageCylStrengthFormatted = (sumCyl / validCylStrengths.length).toFixed(2);
  }

  // Average Weight
  let averageWeightFormatted = '';
  if (validWeights.length > 0) {
    const sumW = validWeights.reduce((acc, v) => acc + v, 0);
    averageWeightFormatted = (sumW / validWeights.length).toFixed(3);
  }

  // Average L/D ratio
  let averageLdRatioFormatted = '';
  if (validLdRatios.length > 0) {
    const sumLd = validLdRatios.reduce((acc, v) => acc + v, 0);
    averageLdRatioFormatted = (sumLd / validLdRatios.length).toFixed(2);
  }

  if (observations.length === 0) {
    generalErrors.push('At least one concrete core specimen is required.');
  }

  return {
    rows,
    count: rows.length,
    validStrengthCount: validCubeStrengths.length,
    rawAverageCubeStrength,
    averageCubeStrength,
    averageCubeStrengthFormatted,
    averageCorrCylStrengthFormatted,
    averageCylStrengthFormatted,
    averageWeightFormatted,
    averageLdRatioFormatted,
    generalErrors,
    gradeOfConcrete: metadata.gradeOfConcrete || 'M35',
    standard: metadata.standard || 'IS 516 (part 4) : 2018',
    cappingMaterial: metadata.cappingMaterial || 'Epoxy, Ep 10',
    periodOfTest: metadata.periodOfTest || 'Not furnished',
    diameterFactor: defaultDiaFactor,
  };
}
