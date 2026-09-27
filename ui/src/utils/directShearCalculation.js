/**
 * Calculations for Direct Shear Test per IS: 2720 (Part 13)
 * Supports:
 * 1. Disturbed Samples (DS)
 * 2. Undisturbed Samples (UDS)
 *
 * Tabular columns:
 * C1: Shear displacement dial reading (div, standard 0 to 1200 in steps of 30)
 * C2: Shear displacement (cm) = (C1 * leastCount) / 10
 * C3: Shear strain = C2 / mouldDimension
 * C4: Corrected area (cm²) = mouldArea * (1 - C3)
 * C5: Proving ring reading (div) [User input]
 * C6: Shear force (kg) = C5 * provingRingConstant * provingRingMultiplier
 * C7: Shear stress (kg/cm²) = C6 / C4
 *
 * Peak shear failure stress is max(C7) for each normal stress load.
 * Cohesion (C) and Angle of Internal Friction (φ) derived from linear regression:
 * τ = C + σ * tan(φ)
 */

export const STANDARD_DIAL_READINGS = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450,
  480, 510, 540, 570, 600, 630, 660, 690, 720, 750, 780, 810, 840, 870, 900,
  930, 960, 990, 1020, 1050, 1080, 1110, 1140, 1170, 1200,
];

export const DIRECT_SHEAR_DEFAULTS = {
  mouldDimensionL: '6.0',
  mouldDimensionB: '6.0',
  mouldThickness: '2.5',
  mouldArea: '36.0',
  mouldVolume: '90.0',
  provingRingConstant: '0.22285',
  provingRingMultiplier: '5',
  leastCountDialGauge: '0.01',
  defaultNormalStresses: ['0.50', '1.00', '1.50'],
};

/**
 * Generate standard blank readings for a direct shear load determination.
 */
export function createDefaultReadings() {
  return STANDARD_DIAL_READINGS.map((dial) => ({
    dialReading: dial.toFixed(2),
    provingRingReading: '',
  }));
}

/**
 * Create a new default load test entry (e.g. for 0.50, 1.00, or 1.50 kg/cm²).
 */
export function createDefaultLoadEntry(normalStress = '0.50') {
  return {
    normalStress: String(normalStress),
    finalWaterContent: '',
    readings: createDefaultReadings(),
  };
}

/**
 * Create a fresh direct shear sample record.
 */
export function createDefaultDirectShearSample(sampleIndex = 0, depth = '') {
  return {
    sampleType: 'DS', // 'DS' | 'UDS'
    shearBoxSize: '6 x 6 cm',
    depthOfSample: depth ? String(depth) : '',
    dateOfTesting: '',
    location: '',
    mouldDimensionL: DIRECT_SHEAR_DEFAULTS.mouldDimensionL,
    mouldDimensionB: DIRECT_SHEAR_DEFAULTS.mouldDimensionB,
    mouldThickness: DIRECT_SHEAR_DEFAULTS.mouldThickness,
    mouldArea: DIRECT_SHEAR_DEFAULTS.mouldArea,
    mouldVolume: DIRECT_SHEAR_DEFAULTS.mouldVolume,
    provingRingConstant: DIRECT_SHEAR_DEFAULTS.provingRingConstant,
    provingRingMultiplier: DIRECT_SHEAR_DEFAULTS.provingRingMultiplier,
    leastCountDialGauge: DIRECT_SHEAR_DEFAULTS.leastCountDialGauge,
    // DS specific
    initialWaterContent: '',
    dryDensity: '',
    initialMass: '',
    bulkDensity: '',
    finalWaterContent: '',
    // UDS specific
    udsId: '',
    containerEmptyWt: '',
    containerWetSoilWt: '',
    containerDrySoilWt: '',
    udsTubeSoilWt: '',
    udsTubeEmptyWt: '',
    udsTubeLengthTotal: '450',
    udsTubeEmptyLength: '75',
    udsTubeDia: '100',
    // 3 standard loads (0.5, 1.0, 1.5 kg/cm²)
    loads: [
      createDefaultLoadEntry('0.50'),
      createDefaultLoadEntry('1.00'),
      createDefaultLoadEntry('1.50'),
    ],
    // Computed values
    cValue: '',
    phiValue: '',
    cValueKPa: '',
    stressReadings: [
      { normalStress: '0.50', shearStress: '' },
      { normalStress: '1.00', shearStress: '' },
      { normalStress: '1.50', shearStress: '' },
    ],
  };
}

/**
 * Calculate DS Physical Parameters:
 * Initial mass (g) = dryDensity * volume
 * Bulk density (g/cc) = dryDensity * (1 + initialWater / 100)
 */
export function calculateDsProperties({
  dryDensity,
  initialWaterContent,
  mouldVolume = 90,
}) {
  const dd = parseFloat(dryDensity);
  const w = parseFloat(initialWaterContent);
  const v = parseFloat(mouldVolume) || 90;

  let initialMass = null;
  let bulkDensity = null;

  if (!isNaN(dd) && dd > 0) {
    initialMass = dd * v;
    if (!isNaN(w) && w >= 0) {
      bulkDensity = dd * (1 + w / 100);
    }
  }

  return {
    initialMass: initialMass !== null ? initialMass.toFixed(2) : '',
    bulkDensity: bulkDensity !== null ? bulkDensity.toFixed(2) : '',
  };
}

/**
 * Calculate UDS Moisture Content & Bulk Density:
 * Moisture Content w = ((w2 - w3) / (w3 - w1)) * 100
 * Soil Wt = tubeSoilWt - tubeEmptyWt
 * Soil Length = lengthTotal - emptyLength
 * Soil Volume = (π * dia² / 4) * soilLength
 * Bulk Density = soilWt / soilVolume
 * Dry Density = bulkDensity / (1 + w / 100)
 */
export function calculateUdsProperties({
  containerEmptyWt,
  containerWetSoilWt,
  containerDrySoilWt,
  udsTubeSoilWt,
  udsTubeEmptyWt,
  udsTubeLengthTotal = 450,
  udsTubeEmptyLength = 75,
  udsTubeDia = 100,
  mouldVolume = 90,
}) {
  const w1 = parseFloat(containerEmptyWt);
  const w2 = parseFloat(containerWetSoilWt);
  const w3 = parseFloat(containerDrySoilWt);

  let initialWaterContent = null;
  if (!isNaN(w1) && !isNaN(w2) && !isNaN(w3) && w3 > w1 && w2 >= w3) {
    initialWaterContent = ((w2 - w3) / (w3 - w1)) * 100;
  }

  const twSoil = parseFloat(udsTubeSoilWt);
  const twEmpty = parseFloat(udsTubeEmptyWt);
  let soilWeight = null;
  if (!isNaN(twSoil) && !isNaN(twEmpty) && twSoil > twEmpty) {
    soilWeight = twSoil - twEmpty;
  }

  const lTotal = parseFloat(udsTubeLengthTotal);
  const lEmpty = parseFloat(udsTubeEmptyLength);
  let soilLengthMm = null;
  let soilLengthCm = null;
  if (!isNaN(lTotal) && !isNaN(lEmpty) && lTotal > lEmpty) {
    soilLengthMm = lTotal - lEmpty;
    soilLengthCm = soilLengthMm / 10;
  }

  const diaMm = parseFloat(udsTubeDia);
  let soilVolume = null;
  if (!isNaN(diaMm) && diaMm > 0 && soilLengthCm !== null) {
    const diaCm = diaMm / 10;
    soilVolume = (Math.PI * Math.pow(diaCm, 2) / 4) * soilLengthCm;
  }

  let bulkDensity = null;
  let dryDensity = null;
  let initialMass = null;

  if (soilWeight !== null && soilVolume !== null && soilVolume > 0) {
    bulkDensity = soilWeight / soilVolume;
    if (initialWaterContent !== null) {
      dryDensity = bulkDensity / (1 + initialWaterContent / 100);
      const v = parseFloat(mouldVolume) || 90;
      initialMass = dryDensity * v;
    }
  }

  return {
    initialWaterContent:
      initialWaterContent !== null ? initialWaterContent.toFixed(2) : '',
    soilWeight: soilWeight !== null ? soilWeight.toFixed(2) : '',
    soilLengthMm: soilLengthMm !== null ? soilLengthMm.toFixed(1) : '',
    soilLengthCm: soilLengthCm !== null ? soilLengthCm.toFixed(2) : '',
    soilVolume: soilVolume !== null ? soilVolume.toFixed(2) : '',
    bulkDensity: bulkDensity !== null ? bulkDensity.toFixed(2) : '',
    dryDensity: dryDensity !== null ? dryDensity.toFixed(2) : '',
    initialMass: initialMass !== null ? initialMass.toFixed(2) : '',
  };
}

/**
 * Calculate row outputs for a single row in the Direct Shear reading table (Page 8):
 * C1: Shear displacement dial reading
 * C2: Shear displacement (cm) = (C1 * leastCount) / 10
 * C3: Shear strain = C2 / mouldDimensionL
 * C4: Corrected Area (cm²) = mouldArea * (1 - C3)
 * C5: Proving ring reading (div)
 * C6: Shear force (kg) = C5 * provingRingConstant * multiplier
 * C7: Shear stress (kg/cm²) = C6 / C4
 */
export function calculateReadingRow({
  dialReading,
  provingRingReading,
  leastCount = 0.01,
  mouldDimension = 6.0,
  mouldArea = 36.0,
  provingRingConstant = 0.22285,
  provingRingMultiplier = 5,
}) {
  const c1 = parseFloat(dialReading);
  const lc = parseFloat(leastCount) || 0.01;
  const l = parseFloat(mouldDimension) || 6.0;
  const area = parseFloat(mouldArea) || 36.0;
  const prConst = parseFloat(provingRingConstant) || 0.22285;
  const prMult = parseFloat(provingRingMultiplier) || 5;

  if (isNaN(c1)) {
    return {
      c1: '',
      c2: '',
      c3: '',
      c4: '',
      c5: '',
      c6: '',
      c7: '',
      c7Num: 0,
    };
  }

  // C2 = (C1 * lc) / 10
  const c2 = (c1 * lc) / 10;
  // C3 = C2 / mouldDimension
  const c3 = l > 0 ? c2 / l : 0;
  // C4 = Area * (1 - C3)
  const c4 = Math.max(0.001, area * (1 - c3));

  const c5Raw = provingRingReading;
  const c5 = parseFloat(c5Raw);

  let c6 = 0;
  let c7 = 0;

  if (!isNaN(c5) && c5 > 0) {
    // C6 = C5 * provingRingConstant * multiplier
    c6 = c5 * prConst * prMult;
    // C7 = C6 / C4
    c7 = c4 > 0 ? c6 / c4 : 0;
  }

  return {
    c1: c1.toFixed(2),
    c2: c2.toFixed(3),
    c3: c3.toFixed(4),
    c4: c4.toFixed(2),
    c5: c5Raw !== undefined && c5Raw !== null ? String(c5Raw) : '',
    c6: c6 > 0 ? c6.toFixed(2) : '0.00',
    c7: c7 > 0 ? c7.toFixed(3) : '0.000',
    c7Num: c7,
  };
}

/**
 * Calculate full table and peak failure shear stress for a load test.
 */
export function calculateLoadTable(
  loadEntry,
  {
    leastCount = 0.01,
    mouldDimension = 6.0,
    mouldArea = 36.0,
    provingRingConstant = 0.22285,
    provingRingMultiplier = 5,
  } = {}
) {
  const readings = loadEntry?.readings || [];
  let maxShearStress = 0;
  let maxRowIndex = -1;

  const calculatedRows = readings.map((row, idx) => {
    const calc = calculateReadingRow({
      dialReading: row.dialReading,
      provingRingReading: row.provingRingReading,
      leastCount,
      mouldDimension,
      mouldArea,
      provingRingConstant,
      provingRingMultiplier,
    });

    if (calc.c7Num > maxShearStress) {
      maxShearStress = calc.c7Num;
      maxRowIndex = idx;
    }

    return {
      ...row,
      ...calc,
    };
  });

  return {
    normalStress: loadEntry?.normalStress || '0.50',
    finalWaterContent: loadEntry?.finalWaterContent || '',
    calculatedRows,
    failureShearStress: maxShearStress > 0 ? maxShearStress.toFixed(2) : '',
    exactFailureShearStress: maxShearStress,
    maxRowIndex,
  };
}

/**
 * Perform Linear Regression on (Normal Stress, Failure Shear Stress) points
 * Model: τ = C + σ * tan(φ)
 * Intercept C: Cohesion in kg/cm²
 * Slope m: tan(φ)
 * Angle of Internal Friction φ = atan(m) in degrees
 *
 * Per IS: 2720 Part 13 and PDF notes:
 * Results reported with 2 decimal places.
 */
export function calculateDirectShearSummary(loadsData = []) {
  const validPoints = [];

  loadsData.forEach((load) => {
    const ns = parseFloat(load.normalStress);
    const ss = parseFloat(load.failureShearStress);
    if (!isNaN(ns) && !isNaN(ss) && ss > 0) {
      validPoints.push({
        normalStress: ns,
        shearStress: ss,
        exactShearStress: load.exactFailureShearStress || ss,
      });
    }
  });

  if (validPoints.length < 2) {
    return {
      isValid: false,
      points: validPoints,
      cValue: '',
      phiValue: '',
      cValueKPa: '',
      interceptC: null,
      slopeTanPhi: null,
      formula: '',
    };
  }

  const n = validPoints.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  validPoints.forEach((p) => {
    const x = p.normalStress;
    const y = p.exactShearStress || p.shearStress;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const meanX = sumX / n;
  const meanY = sumY / n;

  const denominator = sumXX - n * meanX * meanX;
  if (Math.abs(denominator) < 1e-9) {
    return {
      isValid: false,
      points: validPoints,
      cValue: '',
      phiValue: '',
      cValueKPa: '',
      interceptC: null,
      slopeTanPhi: null,
      formula: 'Points are vertically aligned',
    };
  }

  const slope = (sumXY - n * meanX * meanY) / denominator;
  const intercept = meanY - slope * meanX;

  const slope3 = Number(slope.toFixed(3));
  // Friction angle φ in degrees per PDF Page 7: φ = tan⁻¹(slope)
  const phiRad = Math.atan(Math.max(0, slope3));
  const phiDeg = (phiRad * 180) / Math.PI;

  // Cohesion C (kg/cm²)
  const cohesionKgCm2 = Math.max(0, intercept);
  // Cohesion in kN/m² (1 kg/cm² = 98.0665 kN/m² ~ approx 100 kN/m²)
  const cohesionKNm2 = cohesionKgCm2 * 98.0665;

  return {
    isValid: true,
    points: validPoints,
    slopeTanPhi: slope.toFixed(3),
    interceptC: cohesionKgCm2.toFixed(3),
    // Per PDF requirement: "after decimal give 2 digits"
    cValue: cohesionKgCm2.toFixed(2), // e.g. 0.21 kg/cm²
    phiValue: phiDeg.toFixed(2), // e.g. 33.50°
    cValueKPa: cohesionKNm2.toFixed(2), // e.g. 20.60 kN/m²
    formula: `τ = ${cohesionKgCm2.toFixed(3)} + σ × tan(${phiDeg.toFixed(2)}°) [slope = ${slope.toFixed(3)}]`,
  };
}

/**
 * Sample test data from the PDF for verification and quick-fill.
 */
export const SAMPLE_DIRECT_SHEAR_DS = {
  sampleType: 'DS',
  shearBoxSize: '6 x 6 cm',
  depthOfSample: '0.5',
  dateOfTesting: '06/05/2026',
  location: 'BH 1, 0.5m',
  mouldDimensionL: '6.0',
  mouldDimensionB: '6.0',
  mouldThickness: '2.5',
  mouldArea: '36.0',
  mouldVolume: '90.0',
  provingRingConstant: '0.22285',
  provingRingMultiplier: '5',
  leastCountDialGauge: '0.01',
  initialWaterContent: '11.8',
  dryDensity: '1.54',
  initialMass: '138.60',
  bulkDensity: '1.72',
  finalWaterContent: '',
  loads: [
    {
      normalStress: '0.50',
      finalWaterContent: '',
      readings: [
        { dialReading: '0.00', provingRingReading: '0.00' },
        { dialReading: '30.00', provingRingReading: '5.40' },
        { dialReading: '60.00', provingRingReading: '6.40' },
        { dialReading: '90.00', provingRingReading: '7.40' },
        { dialReading: '120.00', provingRingReading: '8.40' },
        { dialReading: '150.00', provingRingReading: '9.20' },
        { dialReading: '180.00', provingRingReading: '9.80' },
        { dialReading: '210.00', provingRingReading: '10.20' },
        { dialReading: '240.00', provingRingReading: '10.40' },
        { dialReading: '270.00', provingRingReading: '10.80' },
        { dialReading: '300.00', provingRingReading: '11.00' },
        { dialReading: '330.00', provingRingReading: '11.20' },
        { dialReading: '360.00', provingRingReading: '11.20' },
        { dialReading: '390.00', provingRingReading: '11.40' },
        { dialReading: '420.00', provingRingReading: '11.80' },
        { dialReading: '450.00', provingRingReading: '12.20' },
        { dialReading: '480.00', provingRingReading: '12.60' },
        { dialReading: '510.00', provingRingReading: '13.00' },
        { dialReading: '540.00', provingRingReading: '13.40' },
        { dialReading: '570.00', provingRingReading: '13.80' },
        { dialReading: '600.00', provingRingReading: '14.20' },
        { dialReading: '630.00', provingRingReading: '14.20' },
      ],
    },
    {
      normalStress: '1.00',
      finalWaterContent: '',
      readings: [
        { dialReading: '0.00', provingRingReading: '0.00' },
        { dialReading: '30.00', provingRingReading: '7.60' },
        { dialReading: '60.00', provingRingReading: '10.80' },
        { dialReading: '90.00', provingRingReading: '13.00' },
        { dialReading: '120.00', provingRingReading: '15.20' },
        { dialReading: '150.00', provingRingReading: '16.80' },
        { dialReading: '180.00', provingRingReading: '18.40' },
        { dialReading: '210.00', provingRingReading: '19.40' },
        { dialReading: '240.00', provingRingReading: '20.80' },
        { dialReading: '270.00', provingRingReading: '21.60' },
        { dialReading: '300.00', provingRingReading: '22.40' },
        { dialReading: '330.00', provingRingReading: '23.80' },
        { dialReading: '360.00', provingRingReading: '24.40' },
        { dialReading: '390.00', provingRingReading: '24.80' },
        { dialReading: '420.00', provingRingReading: '25.20' },
        { dialReading: '450.00', provingRingReading: '25.60' },
        { dialReading: '480.00', provingRingReading: '26.00' },
        { dialReading: '510.00', provingRingReading: '26.60' },
        { dialReading: '540.00', provingRingReading: '27.00' },
        { dialReading: '570.00', provingRingReading: '27.00' },
        { dialReading: '600.00', provingRingReading: '27.20' },
        { dialReading: '630.00', provingRingReading: '27.20' },
        { dialReading: '660.00', provingRingReading: '27.40' },
        { dialReading: '690.00', provingRingReading: '27.40' },
      ],
    },
    {
      normalStress: '1.50',
      finalWaterContent: '',
      readings: [
        { dialReading: '0.00', provingRingReading: '0.00' },
        { dialReading: '30.00', provingRingReading: '7.20' },
        { dialReading: '60.00', provingRingReading: '10.20' },
        { dialReading: '90.00', provingRingReading: '13.60' },
        { dialReading: '120.00', provingRingReading: '15.80' },
        { dialReading: '150.00', provingRingReading: '17.80' },
        { dialReading: '180.00', provingRingReading: '18.80' },
        { dialReading: '210.00', provingRingReading: '20.40' },
        { dialReading: '240.00', provingRingReading: '21.60' },
        { dialReading: '270.00', provingRingReading: '22.80' },
        { dialReading: '300.00', provingRingReading: '23.80' },
        { dialReading: '330.00', provingRingReading: '25.00' },
        { dialReading: '360.00', provingRingReading: '26.20' },
        { dialReading: '390.00', provingRingReading: '27.40' },
        { dialReading: '420.00', provingRingReading: '28.60' },
        { dialReading: '450.00', provingRingReading: '29.20' },
        { dialReading: '480.00', provingRingReading: '29.80' },
        { dialReading: '510.00', provingRingReading: '30.60' },
        { dialReading: '540.00', provingRingReading: '31.00' },
        { dialReading: '570.00', provingRingReading: '31.20' },
        { dialReading: '600.00', provingRingReading: '31.40' },
        { dialReading: '630.00', provingRingReading: '31.60' },
        { dialReading: '660.00', provingRingReading: '31.80' },
        { dialReading: '690.00', provingRingReading: '32.00' },
        { dialReading: '720.00', provingRingReading: '32.40' },
        { dialReading: '750.00', provingRingReading: '32.40' },
        { dialReading: '780.00', provingRingReading: '32.40' },
      ],
    },
  ],
};

export const SAMPLE_DIRECT_SHEAR_UDS = {
  sampleType: 'UDS',
  udsId: '01',
  shearBoxSize: '6 x 6 cm',
  depthOfSample: '2.0',
  dateOfTesting: '08/05/2026',
  location: 'GAIL, Mangalore',
  mouldDimensionL: '6.0',
  mouldDimensionB: '6.0',
  mouldThickness: '2.5',
  mouldArea: '36.0',
  mouldVolume: '90.0',
  provingRingConstant: '0.22285',
  provingRingMultiplier: '5',
  leastCountDialGauge: '0.01',
  containerEmptyWt: '20.63',
  containerWetSoilWt: '48.75',
  containerDrySoilWt: '45.98',
  udsTubeSoilWt: '10572',
  udsTubeEmptyWt: '5749',
  udsTubeLengthTotal: '450',
  udsTubeEmptyLength: '75',
  udsTubeDia: '100',
  initialWaterContent: '10.93',
  bulkDensity: '1.64',
  dryDensity: '1.48',
  initialMass: '133.20',
  loads: SAMPLE_DIRECT_SHEAR_DS.loads,
};
