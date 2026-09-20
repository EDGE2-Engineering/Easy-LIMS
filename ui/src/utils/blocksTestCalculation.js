/**
 * Solid or Hollow Blocks Test Calculations
 * Standard: IS 2185 (Part 1): 2005 (RA 2020)
 *
 * Tests covered:
 *  1. Compressive Strength  – Clauses 5.1, 5.2 & 9
 *  2. Water Absorption      – Clause 9.5
 *  3. Block Density         – Clause 5.2
 *
 * Formulas:
 *  Compressive Strength:
 *    Area (mm²)             = L × B
 *    σ (N/mm²)              = (P [kN] × 1000) / A [mm²]
 *    Average σ              = mean of individual values, reported to 1 decimal place
 *
 *  Water Absorption:
 *    WA (%)  = ((A − B) / B) × 100   A = Wet mass (kg), B = Oven-dry mass (kg)
 *    Average = mean, reported to 1 decimal place
 *
 *  Block Density:
 *    V (m³)  = (L/1000) × (B/1000) × (H/1000)
 *    ρ (kg/m³) = W [kg] / V [m³]
 *    Average = mean, rounded to nearest integer
 *
 * Grade requirements (informational):
 *  Grade C (5.0): Individual min 4.0 N/mm², Average min 5.0 N/mm²
 *  Grade C (4.0): Individual min 3.2 N/mm², Average min 4.0 N/mm²
 *  Water Absorption: Average of 3 samples ≤ 10%
 *  Block Density: ≥ 1800 kg/m³
 */

// ─── Grade options ────────────────────────────────────────────────────────────

export const BLOCK_GRADES = [
  { value: 'C5.0', label: 'Grade C (5.0) — Avg min 5.0 N/mm²',  minIndividual: 4.0, minAvg: 5.0 },
  { value: 'C4.0', label: 'Grade C (4.0) — Avg min 4.0 N/mm²',  minIndividual: 3.2, minAvg: 4.0 },
];

// ─── Default observation shapes ───────────────────────────────────────────────

export const DEFAULT_COMP_OBS = {
  blockId:      '',
  length:       '',
  width:        '',
  height:       '',
  load:         '',   // P in kN
};

export const DEFAULT_WA_OBS = {
  blockId:      '',
  idMark:       '',
  wetMass:      '',   // A kg
  dryMass:      '',   // B kg
};

export const DEFAULT_DENSITY_OBS = {
  blockId:      '',
  length:       '',
  width:        '',
  height:       '',
  mass:         '',   // W kg
};

// ─── Default lists ────────────────────────────────────────────────────────────

export const DEFAULT_COMP_OBSERVATIONS = Array.from({ length: 8 }, (_, i) => ({
  ...DEFAULT_COMP_OBS,
  blockId: `Block ${i + 1}`,
}));

export const DEFAULT_WA_OBSERVATIONS = Array.from({ length: 3 }, (_, i) => ({
  ...DEFAULT_WA_OBS,
  blockId: `Block ${i + 1}`,
}));

export const DEFAULT_DENSITY_OBSERVATIONS = Array.from({ length: 3 }, (_, i) => ({
  ...DEFAULT_DENSITY_OBS,
  blockId: `Block ${i + 1}`,
}));

// ─── Sample data (from provided spec) ────────────────────────────────────────

export const SAMPLE_BLOCKS_TEST_DATA = {
  grade: 'C5.0',
  sampleName: 'Solid blocks (8" x 16" x 4")',
  compressiveStrength: {
    observations: [
      { blockId: 'Block 1', length: '400', width: '200', height: '200', load: '530.171' },
      { blockId: 'Block 2', length: '400', width: '200', height: '201', load: '617.196' },
      { blockId: 'Block 3', length: '400', width: '200', height: '199', load: '569.392' },
      { blockId: 'Block 4', length: '400', width: '200', height: '200', load: '600.256' },
      { blockId: 'Block 5', length: '400', width: '200', height: '198', load: '624.300' },
      { blockId: 'Block 6', length: '400', width: '200', height: '199', load: '589.300' },
      { blockId: 'Block 7', length: '400', width: '200', height: '200', load: '521.300' },
      { blockId: 'Block 8', length: '400', width: '200', height: '201', load: '620.256' },
    ],
  },
  waterAbsorption: {
    observations: [
      { blockId: 'Block 1', idMark: 'Not Furnished', wetMass: '34.050', dryMass: '32.879' },
      { blockId: 'Block 2', idMark: 'Not Furnished', wetMass: '32.950', dryMass: '31.480' },
      { blockId: 'Block 3', idMark: 'Not Furnished', wetMass: '33.560', dryMass: '32.040' },
    ],
  },
  blockDensity: {
    observations: [
      { blockId: 'Block 1', length: '400', width: '200', height: '200', mass: '32.28' },
      { blockId: 'Block 2', length: '400', width: '200', height: '200', mass: '32.80' },
      { blockId: 'Block 3', length: '400', width: '200', height: '200', mass: '32.32' },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt1(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return v.toFixed(1);
}

function fmt2(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return v.toFixed(2);
}

function avg(arr) {
  const valid = arr.filter((v) => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// ─── 1. Compressive Strength ──────────────────────────────────────────────────

/**
 * @param {Array} observations
 * @param {string} grade  – 'C5.0' | 'C4.0'
 * @returns {{ rows, avgStrength, avgStrengthFmt, gradeInfo, generalErrors }}
 */
export function calculateBlocksCompressiveStrength(observations = [], grade = 'C5.0') {
  const rows = [];
  const validStrengths = [];
  const generalErrors = [];

  observations.forEach((obs, i) => {
    const slNo  = i + 1;
    const errors = [];
    const l = parseFloat(obs.length);
    const b = parseFloat(obs.width);
    const p = parseFloat(obs.load);

    // Area = L × B
    let area = null, areaFmt = '';
    if (!isNaN(l) && !isNaN(b) && l > 0 && b > 0) {
      area = l * b;
      areaFmt = Math.round(area).toString();
    } else if (obs.length !== '' || obs.width !== '') {
      errors.push('Length and Width must be positive numbers.');
    }

    // σ = (P × 1000) / A
    let strength = null, strengthFmt = '';
    if (!isNaN(p) && p > 0 && area && area > 0) {
      strength = (p * 1000) / area;
      strengthFmt = fmt1(strength);
      validStrengths.push(parseFloat(fmt1(strength)));
    } else if (obs.load !== '' && obs.load !== undefined) {
      if (isNaN(p) || p <= 0) errors.push('Load must be a positive number.');
    }

    rows.push({
      slNo, blockId: obs.blockId || `Block ${slNo}`,
      length: obs.length || '', width: obs.width || '', height: obs.height || '',
      area, areaFmt,
      load: obs.load || '',
      strength, strengthFmt,
      errors,
    });
  });

  const avgStrength = avg(validStrengths);
  const avgStrengthFmt = fmt1(avgStrength);

  const gradeInfo = BLOCK_GRADES.find((g) => g.value === grade) || BLOCK_GRADES[0];
  if (observations.length < 3) {
    generalErrors.push('IS 2185 requires a minimum of 3 specimens.');
  }

  return { rows, avgStrength, avgStrengthFmt, gradeInfo, generalErrors };
}

// ─── 2. Water Absorption ──────────────────────────────────────────────────────

/**
 * @param {Array} observations  [{ blockId, idMark, wetMass, dryMass }]
 * @returns {{ rows, avgWa, avgWaFmt }}
 */
export function calculateBlocksWaterAbsorption(observations = []) {
  const rows = [];
  const validWa = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const errors = [];
    const a = parseFloat(obs.wetMass);
    const b = parseFloat(obs.dryMass);

    let wa = null, waFmt = '';
    if (!isNaN(a) && !isNaN(b) && b > 0) {
      if (a < b) {
        errors.push('Wet mass cannot be less than dry mass.');
      } else {
        wa = ((a - b) / b) * 100;
        waFmt = fmt1(wa);
        validWa.push(parseFloat(fmt1(wa)));
      }
    } else if ((obs.wetMass !== '' && obs.wetMass !== undefined) ||
               (obs.dryMass !== '' && obs.dryMass !== undefined)) {
      if (isNaN(b) || b <= 0) errors.push('Oven-dry mass must be a positive number.');
    }

    rows.push({
      slNo, blockId: obs.blockId || `Block ${slNo}`,
      idMark: obs.idMark || '',
      wetMass: obs.wetMass || '',
      dryMass: obs.dryMass || '',
      wa, waFmt, errors,
    });
  });

  const avgWa = avg(validWa);
  const avgWaFmt = fmt1(avgWa);

  return { rows, avgWa, avgWaFmt };
}

// ─── 3. Block Density ─────────────────────────────────────────────────────────

/**
 * @param {Array} observations  [{ blockId, length, width, height, mass }]
 * @returns {{ rows, avgDensity, avgDensityFmt }}
 */
export function calculateBlockDensity(observations = []) {
  const rows = [];
  const validDensities = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const errors = [];
    const l = parseFloat(obs.length);
    const b = parseFloat(obs.width);
    const h = parseFloat(obs.height);
    const w = parseFloat(obs.mass);

    // V (m³) = (L/1000) × (B/1000) × (H/1000)
    let volume = null, volumeFmt = '';
    if (!isNaN(l) && !isNaN(b) && !isNaN(h) && l > 0 && b > 0 && h > 0) {
      volume = (l / 1000) * (b / 1000) * (h / 1000);
      volumeFmt = volume.toFixed(5);
    } else if (obs.length !== '' || obs.width !== '' || obs.height !== '') {
      errors.push('Length, Width and Height must be positive numbers.');
    }

    // ρ = W / V
    let density = null, densityFmt = '';
    if (!isNaN(w) && w > 0 && volume && volume > 0) {
      density = w / volume;
      densityFmt = Math.round(density).toString();
      validDensities.push(Math.round(density));
    } else if (obs.mass !== '' && obs.mass !== undefined) {
      if (isNaN(w) || w <= 0) errors.push('Mass must be a positive number.');
    }

    rows.push({
      slNo, blockId: obs.blockId || `Block ${slNo}`,
      length: obs.length || '', width: obs.width || '', height: obs.height || '',
      mass: obs.mass || '',
      volume, volumeFmt,
      density, densityFmt,
      errors,
    });
  });

  const avgDensityRaw = avg(validDensities);
  const avgDensity = avgDensityRaw !== null ? Math.round(avgDensityRaw) : null;
  const avgDensityFmt = avgDensity !== null ? avgDensity.toString() : '';

  return { rows, avgDensity, avgDensityFmt };
}

// ─── Solid/Hollow Blocks Aliases (for explicit naming convention) ──────────────

export const SOLID_HOLLOW_BLOCK_GRADES = BLOCK_GRADES;
export const DEFAULT_SOLID_HOLLOW_COMP_OBS = DEFAULT_COMP_OBS;
export const DEFAULT_SOLID_HOLLOW_WA_OBS = DEFAULT_WA_OBS;
export const DEFAULT_SOLID_HOLLOW_DENSITY_OBS = DEFAULT_DENSITY_OBS;
export const DEFAULT_SOLID_HOLLOW_COMP_OBSERVATIONS = DEFAULT_COMP_OBSERVATIONS;
export const DEFAULT_SOLID_HOLLOW_WA_OBSERVATIONS = DEFAULT_WA_OBSERVATIONS;
export const DEFAULT_SOLID_HOLLOW_DENSITY_OBSERVATIONS = DEFAULT_DENSITY_OBSERVATIONS;
export const SAMPLE_SOLID_HOLLOW_BLOCKS_TEST_DATA = SAMPLE_BLOCKS_TEST_DATA;

export const calculateSolidHollowBlocksCompressiveStrength = calculateBlocksCompressiveStrength;
export const calculateSolidHollowBlocksWaterAbsorption = calculateBlocksWaterAbsorption;
export const calculateSolidHollowBlockDensity = calculateBlockDensity;
