/**
 * AAC Block Test Calculations
 * Standards:
 *  - IS 6441 (Part 5): 1972 (RA 2012) – Determination of Compressive Strength
 *  - IS 6598: 1972 – Determination of Water Absorption
 *  - IS 6441 (Part 1): 1972 – Determination of Unit Weight / Bulk Density (Clause 5.1.1)
 *  - IS 6441 (Part 1): 1972 – Determination of Moisture Content (Clause 5.2.1)
 *
 * Applicable for Material Type: "AAC Block" / "AAC"
 */

// ─── Grade & Density Class Options ───────────────────────────────────────────

export const AAC_BLOCK_GRADES = [
  { value: 'Grade 1', label: 'Grade 1 (Load Bearing - IS 2185 Part 3)' },
  { value: 'Grade 2', label: 'Grade 2 (Non-load Bearing - IS 2185 Part 3)' },
  { value: 'Standard', label: 'Standard AAC Block' },
];

export const AAC_BLOCK_DENSITY_CLASSES = [
  { value: 'Class 400', label: 'Class 400 (351 - 450 kg/m³)' },
  { value: 'Class 500', label: 'Class 500 (451 - 550 kg/m³)' },
  { value: 'Class 600', label: 'Class 600 (551 - 650 kg/m³)' },
  { value: 'Class 700', label: 'Class 700 (651 - 750 kg/m³)' },
  { value: 'Class 800', label: 'Class 800 (751 - 850 kg/m³)' },
];

// ─── Default Observation Templates ───────────────────────────────────────────

export const DEFAULT_AAC_COMP_OBS = {
  specimenId: '',
  length: '150',
  breadth: '150',
  height: '150',
  load: '', // Compressive Load in kN
};

export const DEFAULT_AAC_WA_OBS = {
  specimenId: '',
  specimenSize: '40*40*160',
  wetMass: '', // A in g
  dryMass: '', // B in g
};

export const DEFAULT_AAC_DENSITY_OBS = {
  specimenId: '',
  length: '100.0',
  breadth: '200.0',
  height: '50.0',
  weight: '', // Weight in kg
};

export const DEFAULT_AAC_MOISTURE_OBS = {
  specimenId: '',
  specimenSize: '150*150*150',
  wetMass: '', // Sample weight (A) in g
  dryMass: '', // Oven dry mass (B) in g
};

// ─── Default Initial Observation Lists ───────────────────────────────────────

export const DEFAULT_AAC_COMP_OBSERVATIONS = [
  { ...DEFAULT_AAC_COMP_OBS, specimenId: 'Specimen 1' },
  { ...DEFAULT_AAC_COMP_OBS, specimenId: 'Specimen 2' },
  { ...DEFAULT_AAC_COMP_OBS, specimenId: 'Specimen 3' },
];

export const DEFAULT_AAC_WA_OBSERVATIONS = [
  { ...DEFAULT_AAC_WA_OBS, specimenId: 'Specimen 1' },
  { ...DEFAULT_AAC_WA_OBS, specimenId: 'Specimen 2' },
  { ...DEFAULT_AAC_WA_OBS, specimenId: 'Specimen 3' },
  { ...DEFAULT_AAC_WA_OBS, specimenId: 'Specimen 4' },
  { ...DEFAULT_AAC_WA_OBS, specimenId: 'Specimen 5' },
  { ...DEFAULT_AAC_WA_OBS, specimenId: 'Specimen 6' },
];

export const DEFAULT_AAC_DENSITY_OBSERVATIONS = [
  { ...DEFAULT_AAC_DENSITY_OBS, specimenId: 'Specimen 1' },
  { ...DEFAULT_AAC_DENSITY_OBS, specimenId: 'Specimen 2' },
  { ...DEFAULT_AAC_DENSITY_OBS, specimenId: 'Specimen 3' },
];

export const DEFAULT_AAC_MOISTURE_OBSERVATIONS = [
  { ...DEFAULT_AAC_MOISTURE_OBS, specimenId: 'Specimen 1' },
  { ...DEFAULT_AAC_MOISTURE_OBS, specimenId: 'Specimen 2' },
  { ...DEFAULT_AAC_MOISTURE_OBS, specimenId: 'Specimen 3' },
];

// ─── Sample Data (Strictly from the provided handwritten test sheet PDF) ──────

export const SAMPLE_AAC_BLOCK_TEST_DATA = {
  grade: 'Grade 1',
  sampleName: 'AAC Block (600 x 200 x 150 mm)',
  compressive: {
    observations: [
      { specimenId: 'Specimen 1', length: '150', breadth: '150', height: '150', load: '117.0' },
      { specimenId: 'Specimen 2', length: '150', breadth: '150', height: '150', load: '129.0' },
      { specimenId: 'Specimen 3', length: '150', breadth: '150', height: '150', load: '132.0' },
    ],
  },
  waterAbsorption: {
    observations: [
      { specimenId: 'Specimen 1', specimenSize: '40*40*160', wetMass: '187', dryMass: '158' },
      { specimenId: 'Specimen 2', specimenSize: '40*40*160', wetMass: '179', dryMass: '157' },
      { specimenId: 'Specimen 3', specimenSize: '40*40*160', wetMass: '180', dryMass: '152' },
      { specimenId: 'Specimen 4', specimenSize: '40*40*160', wetMass: '178', dryMass: '158' },
      { specimenId: 'Specimen 5', specimenSize: '40*40*160', wetMass: '187', dryMass: '165' },
      { specimenId: 'Specimen 6', specimenSize: '40*40*160', wetMass: '198', dryMass: '166' },
    ],
  },
  density: {
    observations: [
      { specimenId: 'Specimen 1', length: '100.0', breadth: '200.0', height: '50.0', weight: '0.648' },
      { specimenId: 'Specimen 2', length: '100.0', breadth: '200.0', height: '50.0', weight: '0.645' },
      { specimenId: 'Specimen 3', length: '100.0', breadth: '200.0', height: '50.0', weight: '0.640' },
    ],
  },
  moistureContent: {
    observations: [
      { specimenId: 'Specimen 1', specimenSize: '150*150*150', wetMass: '158', dryMass: '143' },
      { specimenId: 'Specimen 2', specimenSize: '150*150*150', wetMass: '156', dryMass: '145' },
      { specimenId: 'Specimen 3', specimenSize: '150*150*150', wetMass: '159', dryMass: '146' },
    ],
  },
};

// ─── Formatters & Helpers ───────────────────────────────────────────────────

function fmt1(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return Number(v).toFixed(1);
}

function fmt2(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return Number(v).toFixed(2);
}

function fmt3(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return Number(v).toFixed(3);
}

function fmtWhole(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return Math.round(Number(v)).toString();
}

function avg(arr) {
  const valid = arr.filter((v) => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// ─── 1. Compressive Strength (IS 6441 Part 5: 1972 RA 2012) ──────────────────

/**
 * Compressive strength calculation
 * Area = Length × Breadth (mm²)
 * Compressive Strength = (Load [kN] / Area [mm²]) × 1000  (N/mm²)
 * Individual reported to 1 decimal place.
 * Average reported to 1 decimal place.
 */
export function calculateAacBlockCompressiveStrength(observations = []) {
  const rows = [];
  const validStrengths = [];
  const errors = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const rowErrors = [];
    const l = parseFloat(obs.length);
    const b = parseFloat(obs.breadth ?? obs.width);
    const h = parseFloat(obs.height);
    const p = parseFloat(obs.load);

    let area = null;
    let areaFmt = '';
    if (!isNaN(l) && !isNaN(b) && l > 0 && b > 0) {
      area = Math.round(l * b);
      areaFmt = area.toString();
    } else if (obs.length !== '' || obs.breadth !== '' || obs.width !== '') {
      rowErrors.push('Length and Breadth must be positive numbers.');
    }

    let strength = null;
    let strengthFmt = '';
    if (!isNaN(p) && p > 0 && area && area > 0) {
      strength = (p / area) * 1000;
      strengthFmt = fmt1(strength);
      validStrengths.push(parseFloat(strengthFmt));
    } else if (obs.load !== '' && obs.load !== undefined) {
      if (isNaN(p) || p <= 0) {
        rowErrors.push('Compressive Load must be a positive number in kN.');
      }
    }

    rows.push({
      slNo,
      specimenId: obs.specimenId || `Specimen ${slNo}`,
      length: obs.length ?? '',
      breadth: obs.breadth ?? obs.width ?? '',
      height: obs.height ?? '',
      area,
      areaFmt,
      load: obs.load ?? '',
      strength,
      strengthFmt,
      errors: rowErrors,
    });
  });

  const avgStrengthRaw = avg(validStrengths);
  const avgStrengthFmt = avgStrengthRaw !== null ? fmt1(avgStrengthRaw) : '';

  if (observations.length < 3) {
    errors.push('Standard test procedure recommends 3 specimens.');
  }

  return {
    rows,
    avgStrength: avgStrengthRaw,
    avgStrengthFmt,
    errors,
  };
}

// ─── 2. Water Absorption (IS 6598: 1972) ────────────────────────────────────

/**
 * Water absorption calculation
 * WA (%) = ((Wet Mass [A] - Oven Dry Mass [B]) / Oven Dry Mass [B]) × 100
 * Individual reported to 1 decimal place.
 * Average reported to 1 decimal place.
 */
export function calculateAacBlockWaterAbsorption(observations = []) {
  const rows = [];
  const validWa = [];
  const errors = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const rowErrors = [];
    const a = parseFloat(obs.wetMass);
    const b = parseFloat(obs.dryMass);

    let wa = null;
    let waFmt = '';
    if (!isNaN(a) && !isNaN(b) && b > 0) {
      if (a < b) {
        rowErrors.push('Wet mass cannot be less than oven dry mass.');
      } else {
        wa = ((a - b) / b) * 100;
        waFmt = fmt1(wa);
        validWa.push(parseFloat(waFmt));
      }
    } else if ((obs.wetMass !== '' && obs.wetMass !== undefined) ||
               (obs.dryMass !== '' && obs.dryMass !== undefined)) {
      if (isNaN(b) || b <= 0) {
        rowErrors.push('Oven-dry mass must be a positive number.');
      }
    }

    rows.push({
      slNo,
      specimenId: obs.specimenId || `Specimen ${slNo}`,
      specimenSize: obs.specimenSize ?? '40*40*160',
      wetMass: obs.wetMass ?? '',
      dryMass: obs.dryMass ?? '',
      wa,
      waFmt,
      errors: rowErrors,
    });
  });

  const avgWaRaw = avg(validWa);
  const avgWaFmt = avgWaRaw !== null ? fmt1(avgWaRaw) : '';

  return {
    rows,
    avgWa: avgWaRaw,
    avgWaFmt,
    errors,
  };
}

// ─── 3. Bulk Density (IS 6441 Part 1: 1972 Clause 5.1.1) ─────────────────────

/**
 * Bulk Density calculation
 * Volume (m³) = (L / 1000) × (B / 1000) × (H / 1000) = (L × B × H) / 10^9
 * Density (kg/m³) = Weight [kg] / Volume [m³]
 *
 * Per Clause 5.1.1:
 * "Bulk density of the individual specimen shall be calculated and reported within
 * the three decimal places, the mean value of the three specimen shall be within
 * two decimal places."
 */
export function calculateAacBlockDensity(observations = []) {
  const rows = [];
  const validDensities = [];
  const errors = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const rowErrors = [];
    const l = parseFloat(obs.length);
    const b = parseFloat(obs.breadth ?? obs.width);
    const h = parseFloat(obs.height);
    const w = parseFloat(obs.weight ?? obs.mass);

    let volume = null;
    let volumeFmt = '';
    if (!isNaN(l) && !isNaN(b) && !isNaN(h) && l > 0 && b > 0 && h > 0) {
      volume = (l * b * h) / 1000000000;
      volumeFmt = volume.toFixed(4);
    } else if (obs.length !== '' || obs.breadth !== '' || obs.height !== '') {
      rowErrors.push('Length, Breadth and Height must be positive numbers.');
    }

    let density = null;
    let densityFmt = '';
    if (!isNaN(w) && w > 0 && volume && volume > 0) {
      density = w / volume;
      densityFmt = fmt3(density);
      validDensities.push(parseFloat(densityFmt));
    } else if (obs.weight !== '' && obs.weight !== undefined) {
      if (isNaN(w) || w <= 0) {
        rowErrors.push('Weight must be a positive number in kg.');
      }
    }

    rows.push({
      slNo,
      specimenId: obs.specimenId || `Specimen ${slNo}`,
      length: obs.length ?? '',
      breadth: obs.breadth ?? obs.width ?? '',
      height: obs.height ?? '',
      volume,
      volumeFmt,
      weight: obs.weight ?? obs.mass ?? '',
      density,
      densityFmt,
      errors: rowErrors,
    });
  });

  const avgDensityRaw = avg(validDensities);
  const avgDensityFmt = avgDensityRaw !== null ? fmt2(avgDensityRaw) : '';

  return {
    rows,
    avgDensity: avgDensityRaw,
    avgDensityFmt,
    errors,
  };
}

// ─── 4. Moisture Content (IS 6441 Part 1: 1972 Clause 5.2.1) ─────────────────

/**
 * Moisture Content calculation
 * Moisture Content (%) = ((Sample Weight [A] - Oven Dry Mass [B]) / Oven Dry Mass [B]) × 100
 *
 * Per Clause 5.2.1:
 * "Moisture content of individual shall be stated in whole percent."
 * "The mean value of three specimen shall also be stated in whole percent."
 */
export function calculateAacBlockMoistureContent(observations = []) {
  const rows = [];
  const validMoisture = [];
  const errors = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const rowErrors = [];
    const a = parseFloat(obs.wetMass ?? obs.sampleWeight);
    const b = parseFloat(obs.dryMass);

    let moisture = null;
    let moistureFmt = '';
    if (!isNaN(a) && !isNaN(b) && b > 0) {
      if (a < b) {
        rowErrors.push('Sample weight cannot be less than oven dry mass.');
      } else {
        moisture = ((a - b) / b) * 100;
        moistureFmt = fmtWhole(moisture);
        validMoisture.push(parseFloat(moistureFmt));
      }
    } else if ((obs.wetMass !== '' && obs.wetMass !== undefined) ||
               (obs.sampleWeight !== '' && obs.sampleWeight !== undefined) ||
               (obs.dryMass !== '' && obs.dryMass !== undefined)) {
      if (isNaN(b) || b <= 0) {
        rowErrors.push('Oven dry mass must be a positive number.');
      }
    }

    rows.push({
      slNo,
      specimenId: obs.specimenId || `Specimen ${slNo}`,
      specimenSize: obs.specimenSize ?? '150*150*150',
      wetMass: obs.wetMass ?? obs.sampleWeight ?? '',
      dryMass: obs.dryMass ?? '',
      moisture,
      moistureFmt,
      errors: rowErrors,
    });
  });

  const avgMoistureRaw = avg(validMoisture);
  const avgMoistureFmt = avgMoistureRaw !== null ? fmtWhole(avgMoistureRaw) : '';

  return {
    rows,
    avgMoisture: avgMoistureRaw,
    avgMoistureFmt,
    errors,
  };
}

// ─── 5. Combined AAC Block Test Calculation ──────────────────────────────────

export function calculateAacBlockTest(
  compObs = [],
  waObs = [],
  densObs = [],
  moistObs = [],
  metadata = {}
) {
  const compressive = calculateAacBlockCompressiveStrength(compObs);
  const waterAbsorption = calculateAacBlockWaterAbsorption(waObs);
  const density = calculateAacBlockDensity(densObs);
  const moistureContent = calculateAacBlockMoistureContent(moistObs);

  return {
    metadata,
    compressive,
    waterAbsorption,
    density,
    moistureContent,
  };
}
