/**
 * Steel Bar / TMT Rebar Test Calculations
 * Standards: IS 1786: 2008 · IS 1608 (Part 1): 2022
 *
 * Column map:
 *  C1  Nominal Diameter (mm)        — input
 *  C2  Weight (kg)                  — input
 *  C3  Length (m)                   — input
 *  C4  Mass per Meter (kg/m)        = C2 / C3                        3 dec
 *  C5  Area (mm²)                   = C4 / (0.00785 × C3)            2 dec
 *  C6  Yield Load (kN)              — input
 *  C7  Yield Stress (N/mm²)         = (C6 / C5) × 1000               2 dec
 *  C8  Ultimate Load (kN)           — input
 *  C9  Tensile Strength (N/mm²)     = (C8 / C5) × 1000               2 dec
 *  C10 Initial Gauge Length (mm)    = 5.65 × √C5                     2 dec
 *  C11 Final Gauge Length (mm)      — input                           2 dec
 *  C12 Elongation (%)               = ((C11 - C10) / C10) × 100      2 dec
 *  C13 Bend Test                    — dropdown: NCO | CO
 *  C14 Rebend Test                  — dropdown: NCO | CO
 *
 * Density factor: 0.00785 kg/(mm²·m)
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const STEEL_DENSITY_FACTOR = 0.00785; // kg / (mm² · m)

export const BEND_REBEND_OPTIONS = [
  { value: 'NCO', label: 'NCO – No Cracks Observed' },
  { value: 'CO',  label: 'CO – Cracks Observed'    },
];

export const NOMINAL_DIAMETERS = ['8', '10', '12', '16', '20', '25', '32'];

// ─── Default shapes ──────────────────────────────────────────────────────────

export const DEFAULT_STEEL_OBSERVATION = {
  barId:           '',   // free-text label, e.g. "Sample 1"
  nominalDia:      '',   // C1
  weight:          '',   // C2 kg
  length:          '',   // C3 m
  yieldLoad:       '',   // C6 kN
  ultimateLoad:    '',   // C8 kN
  finalGaugeLength:'',   // C11 mm
  bendTest:        'NCO',// C13
  rebendTest:      'NCO',// C14
};

export const DEFAULT_STEEL_OBSERVATIONS = Array.from({ length: 3 }, (_, i) => ({
  ...DEFAULT_STEEL_OBSERVATION,
  barId: `Sample ${i + 1}`,
}));

// ─── Sample data (8 mm worked example from spec) ────────────────────────────

export const SAMPLE_STEEL_TEST_DATA = {
  observations: [
    {
      barId:           'Sample 1',
      nominalDia:      '8',
      weight:          '0.396',
      length:          '1',
      yieldLoad:       '45.68',
      ultimateLoad:    '58.26',
      finalGaugeLength:'48.32',
      bendTest:        'NCO',
      rebendTest:      'NCO',
    },
    {
      barId:           'Sample 2',
      nominalDia:      '8',
      weight:          '0.397',
      length:          '1',
      yieldLoad:       '46.10',
      ultimateLoad:    '58.90',
      finalGaugeLength:'48.10',
      bendTest:        'NCO',
      rebendTest:      'NCO',
    },
    {
      barId:           'Sample 3',
      nominalDia:      '8',
      weight:          '0.395',
      length:          '1',
      yieldLoad:       '45.50',
      ultimateLoad:    '57.95',
      finalGaugeLength:'47.90',
      bendTest:        'NCO',
      rebendTest:      'NCO',
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(val, dec) {
  if (val === null || val === undefined || isNaN(val)) return '';
  return val.toFixed(dec);
}

// ─── Main calculation ────────────────────────────────────────────────────────

/**
 * Calculate all derived steel test values for a list of observations.
 *
 * @param {Array} observations
 * @returns {{ rows: Array, summary: Object }}
 */
export function calculateSteelTest(observations = []) {
  const rows = [];
  const validYieldStresses   = [];
  const validTensileStrengths= [];
  const validElongations     = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const errors = [];

    const weight   = parseFloat(obs.weight);    // C2 kg
    const length   = parseFloat(obs.length);    // C3 m
    const yieldKn  = parseFloat(obs.yieldLoad); // C6 kN
    const ultKn    = parseFloat(obs.ultimateLoad);// C8 kN
    const fgl      = parseFloat(obs.finalGaugeLength); // C11 mm

    // C4 Mass per Meter = C2 / C3   (3 dec)
    let massPerMeter = null;
    let massPerMeterFmt = '';
    if (!isNaN(weight) && weight > 0 && !isNaN(length) && length > 0) {
      massPerMeter = weight / length;
      massPerMeterFmt = fmt(massPerMeter, 3);
    } else if (obs.weight !== '' || obs.length !== '') {
      errors.push('Weight and Length must be positive numbers.');
    }

    // C5 Area = C4 / (0.00785 × C3)   (2 dec)
    let area = null;
    let areaFmt = '';
    if (massPerMeter !== null && !isNaN(length) && length > 0) {
      area = massPerMeter / (STEEL_DENSITY_FACTOR * length);
      areaFmt = fmt(area, 2);
    }

    // C7 Yield Stress = (C6 / C5) × 1000   (2 dec)
    let yieldStress = null;
    let yieldStressFmt = '';
    if (!isNaN(yieldKn) && yieldKn > 0 && area && area > 0) {
      yieldStress = (yieldKn / area) * 1000;
      yieldStressFmt = fmt(yieldStress, 2);
      validYieldStresses.push(yieldStress);
    } else if (obs.yieldLoad !== '' && obs.yieldLoad !== undefined) {
      if (isNaN(yieldKn) || yieldKn <= 0) errors.push('Yield Load must be a positive number.');
    }

    // C9 Tensile Strength = (C8 / C5) × 1000   (2 dec)
    let tensileStrength = null;
    let tensileStrengthFmt = '';
    if (!isNaN(ultKn) && ultKn > 0 && area && area > 0) {
      tensileStrength = (ultKn / area) * 1000;
      tensileStrengthFmt = fmt(tensileStrength, 2);
      validTensileStrengths.push(tensileStrength);
    } else if (obs.ultimateLoad !== '' && obs.ultimateLoad !== undefined) {
      if (isNaN(ultKn) || ultKn <= 0) errors.push('Ultimate Load must be a positive number.');
    }

    // C10 Initial Gauge Length = 5.65 × √C5   (2 dec)
    let igl = null;
    let iglFmt = '';
    if (area && area > 0) {
      igl = 5.65 * Math.sqrt(area);
      iglFmt = fmt(igl, 2);
    }

    // C12 Elongation = ((C11 - C10) / C10) × 100   (2 dec)
    let elongation = null;
    let elongationFmt = '';
    if (!isNaN(fgl) && fgl > 0 && igl && igl > 0) {
      if (fgl < igl) {
        errors.push('Final Gauge Length cannot be less than Initial Gauge Length.');
      } else {
        elongation = ((fgl - igl) / igl) * 100;
        elongationFmt = fmt(elongation, 2);
        validElongations.push(elongation);
      }
    } else if (obs.finalGaugeLength !== '' && obs.finalGaugeLength !== undefined) {
      if (isNaN(fgl) || fgl <= 0) errors.push('Final Gauge Length must be a positive number.');
    }

    rows.push({
      slNo,
      barId:              obs.barId || `Sample ${slNo}`,
      nominalDia:         obs.nominalDia || '',
      weight:             obs.weight || '',
      length:             obs.length || '',
      massPerMeter,       massPerMeterFmt,         // C4
      area,               areaFmt,                 // C5
      yieldLoad:          obs.yieldLoad || '',      // C6 (input)
      yieldStress,        yieldStressFmt,           // C7
      ultimateLoad:       obs.ultimateLoad || '',   // C8 (input)
      tensileStrength,    tensileStrengthFmt,       // C9
      igl,                iglFmt,                  // C10
      finalGaugeLength:   obs.finalGaugeLength || '',// C11 (input)
      finalGaugeLengthFmt: !isNaN(fgl) && fgl > 0 ? fmt(fgl, 2) : '',
      elongation,         elongationFmt,            // C12
      bendTest:           obs.bendTest  || 'NCO',   // C13
      rebendTest:         obs.rebendTest || 'NCO',  // C14
      errors,
    });
  });

  // ── Summary averages ───────────────────────────────────────────────────────
  const avg = (arr) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

  const avgYieldStress       = avg(validYieldStresses);
  const avgTensileStrength   = avg(validTensileStrengths);
  const avgElongation        = avg(validElongations);

  return {
    rows,
    summary: {
      avgYieldStress,
      avgYieldStressFmt:      fmt(avgYieldStress,    2),
      avgTensileStrength,
      avgTensileStrengthFmt:  fmt(avgTensileStrength, 2),
      avgElongation,
      avgElongationFmt:       fmt(avgElongation,      2),
      count: rows.length,
    },
  };
}
