/**
 * Steel Bar / TMT Rebar Test Calculations
 * Standards: IS 1786: 2008 · IS 1608 (Part 1): 2022
 *
 * Column map:
 *  Sample ID (replaces Bar ID)
 *  Heat/ Lot No.                    — client reference dropdown (omitted from report if absent)
 *  Invoice No.                      — client reference dropdown (omitted from report if absent)
 *  Vehicle No.                      — client reference dropdown (omitted from report if absent)
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
 * Note: Avg. yield stress, avg. tensile strength, avg. elongation shall not appear in final report (individual results only).
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const STEEL_DENSITY_FACTOR = 0.00785; // kg / (mm² · m)

export const BEND_REBEND_OPTIONS = [
  { value: 'NCO', label: 'NCO – No Cracks Observed' },
  { value: 'CO',  label: 'CO – Cracks Observed'    },
];

/**
 * IS 1786: 2008 Table 1: Nominal Cross-Sectional Area and Mass (Clause 6.2)
 * Table 2: Tolerances on Nominal Mass (Clauses 6.2 and 7.2.2)
 * Individual Sample Tolerance:
 *   - Up to and including 10 mm: -8%
 *   - Over 10 up to and including 16 mm: -6%
 *   - Over 16 mm: -4%
 */
export const IS_1786_NOMINAL_PROPERTIES = {
  '4':  { dia: 4,  nominalArea: 12.6,   nominalMass: 0.099, tolerancePercent: -8 },
  '5':  { dia: 5,  nominalArea: 19.6,   nominalMass: 0.154, tolerancePercent: -8 },
  '6':  { dia: 6,  nominalArea: 28.3,   nominalMass: 0.222, tolerancePercent: -8 },
  '8':  { dia: 8,  nominalArea: 50.3,   nominalMass: 0.395, tolerancePercent: -8 },
  '10': { dia: 10, nominalArea: 78.6,   nominalMass: 0.617, tolerancePercent: -8 },
  '12': { dia: 12, nominalArea: 113.1,  nominalMass: 0.888, tolerancePercent: -6 },
  '16': { dia: 16, nominalArea: 201.2,  nominalMass: 1.58,  tolerancePercent: -6 },
  '20': { dia: 20, nominalArea: 314.3,  nominalMass: 2.47,  tolerancePercent: -4 },
  '25': { dia: 25, nominalArea: 491.1,  nominalMass: 3.85,  tolerancePercent: -4 },
  '28': { dia: 28, nominalArea: 615.8,  nominalMass: 4.83,  tolerancePercent: -4 },
  '32': { dia: 32, nominalArea: 804.6,  nominalMass: 6.31,  tolerancePercent: -4 },
  '36': { dia: 36, nominalArea: 1018.3, nominalMass: 7.99,  tolerancePercent: -4 },
  '40': { dia: 40, nominalArea: 1257.2, nominalMass: 9.86,  tolerancePercent: -4 },
};

export const NOMINAL_DIAMETERS = [
  '4', '5', '6', '8', '10', '12', '16', '20', '25', '28', '32', '36', '40'
];

/**
 * Retrieve IS 1786 nominal mass, area, individual sample tolerance %, and minimum allowable mass per metre.
 *
 * @param {string|number} diaInput Nominal diameter in mm
 * @returns {Object|null}
 */
export function getSteelToleranceInfo(diaInput) {
  const dia = parseFloat(diaInput);
  if (isNaN(dia) || dia <= 0) return null;

  const key = String(dia);
  let nominalMass = null;
  let nominalArea = null;

  if (IS_1786_NOMINAL_PROPERTIES[key]) {
    nominalMass = IS_1786_NOMINAL_PROPERTIES[key].nominalMass;
    nominalArea = IS_1786_NOMINAL_PROPERTIES[key].nominalArea;
  } else {
    nominalArea = (Math.PI * dia * dia) / 4;
    nominalMass = (dia * dia) / 162.28;
  }

  // Tolerance on nominal mass for individual sample per Table 2 (IS 1786: 2008):
  // i) Up to and including 10 mm: -8%
  // ii) Over 10 up to and including 16 mm: -6%
  // iii) Over 16 mm: -4%
  let tolerancePercent = -4;
  let clause = 'Over 16 mm';
  if (dia <= 10) {
    tolerancePercent = -8;
    clause = 'Up to and including 10 mm';
  } else if (dia <= 16) {
    tolerancePercent = -6;
    clause = 'Over 10 up to and including 16 mm';
  }

  // Minimum allowable mass per metre (lower limit tolerance)
  const minMassPerMeter = nominalMass * (1 + tolerancePercent / 100);

  return {
    dia,
    nominalMass,
    nominalMassFmt: fmt(nominalMass, 3),
    nominalArea,
    nominalAreaFmt: fmt(nominalArea, 2),
    tolerancePercent,
    clause,
    minMassPerMeter,
    minMassPerMeterFmt: fmt(minMassPerMeter, 3),
  };
}

// ─── Default shapes ──────────────────────────────────────────────────────────

export const DEFAULT_STEEL_OBSERVATION = {
  sampleId:        '',   // "Sample ID" (replaces Bar ID)
  barId:           '',   // kept in sync for backward compatibility
  heatNo:          '',   // "Heat/ Lot No."
  invoiceNo:       '',   // "Invoice No."
  vehicleNo:       '',   // "Vehicle No."
  brand:           '',   // "Brand"
  grade:           '',   // "Grade"
  nominalDia:      '',   // C1
  weight:          '',   // C2 kg
  length:          '',   // C3 m
  massPerMeter:    '',   // C4 kg/m (can be entered or computed)
  yieldLoad:       '',   // C6 kN
  ultimateLoad:    '',   // C8 kN
  finalGaugeLength:'',   // C11 mm
  bendTest:        'NCO',// C13
  rebendTest:      'NCO',// C14
};

export const DEFAULT_STEEL_OBSERVATIONS = Array.from({ length: 3 }, (_, i) => ({
  ...DEFAULT_STEEL_OBSERVATION,
  sampleId: `Sample ${i + 1}`,
  barId: `Sample ${i + 1}`,
}));

// ─── Sample data (from reference report PDF: 8 to 25 mm with Heat & Invoice Nos) ────

export const SAMPLE_STEEL_TEST_DATA = {
  heatNoOptions: ['72142090'],
  invoiceNoOptions: ['CREDIT/2780', 'CREDIT/2778'],
  vehicleNoOptions: [],
  brandOptions: ['TATA Tiscon'],
  gradeOptions: ['Fe 550D'],
  clientReferenceColumns: {
    heatNo: true,
    invoiceNo: true,
    vehicleNo: false,
    brand: true,
    grade: true,
  },
  includeHeatNoInReport: true,
  includeInvoiceNoInReport: true,
  includeVehicleNoInReport: false,
  includeBrandInReport: true,
  includeGradeInReport: true,
  observations: [
    {
      sampleId:        'EESIPL/01/389(A)',
      barId:           'EESIPL/01/389(A)',
      heatNo:          '72142090',
      invoiceNo:       'CREDIT/2780',
      vehicleNo:       '',
      brand:           'TATA Tiscon',
      grade:           'Fe 550D',
      nominalDia:      '8',
      weight:          '0.396',
      length:          '1',
      yieldLoad:       '54.18',
      ultimateLoad:    '57.81',
      finalGaugeLength:'47.90',
      bendTest:        'NCO',
      rebendTest:      'NCO',
    },
    {
      sampleId:        'EESIPL/01/389(B)',
      barId:           'EESIPL/01/389(B)',
      heatNo:          '72142090',
      invoiceNo:       'CREDIT/2778',
      vehicleNo:       '',
      brand:           'TATA Tiscon',
      grade:           'Fe 550D',
      nominalDia:      '10',
      weight:          '0.614',
      length:          '1',
      yieldLoad:       '66.57',
      ultimateLoad:    '72.99',
      finalGaugeLength:'59.98',
      bendTest:        'NCO',
      rebendTest:      'NCO',
    },
    {
      sampleId:        'EESIPL/01/389(C)',
      barId:           'EESIPL/01/389(C)',
      heatNo:          '72142090',
      invoiceNo:       'CREDIT/2780',
      vehicleNo:       '',
      brand:           'TATA Tiscon',
      grade:           'Fe 550D',
      nominalDia:      '12',
      weight:          '0.879',
      length:          '1',
      yieldLoad:       '89.69',
      ultimateLoad:    '101.11',
      finalGaugeLength:'70.76',
      bendTest:        'NCO',
      rebendTest:      'NCO',
    },
    {
      sampleId:        'EESIPL/01/389(D)',
      barId:           'EESIPL/01/389(D)',
      heatNo:          '72142090',
      invoiceNo:       'CREDIT/2778',
      vehicleNo:       '',
      brand:           'TATA Tiscon',
      grade:           'Fe 550D',
      nominalDia:      '16',
      weight:          '1.545',
      length:          '1',
      yieldLoad:       '124.19',
      ultimateLoad:    '142.70',
      finalGaugeLength:'93.41',
      bendTest:        'NCO',
      rebendTest:      'NCO',
    },
    {
      sampleId:        'EESIPL/01/389(E)',
      barId:           'EESIPL/01/389(E)',
      heatNo:          '72142090',
      invoiceNo:       'CREDIT/2780',
      vehicleNo:       '',
      brand:           'TATA Tiscon',
      grade:           'Fe 550D',
      nominalDia:      '20',
      weight:          '2.472',
      length:          '1',
      yieldLoad:       '195.55',
      ultimateLoad:    '228.93',
      finalGaugeLength:'117.72',
      bendTest:        'NCO',
      rebendTest:      'NCO',
    },
    {
      sampleId:        'EESIPL/01/389(F)',
      barId:           'EESIPL/01/389(F)',
      heatNo:          '72142090',
      invoiceNo:       'CREDIT/2778',
      vehicleNo:       '',
      brand:           'TATA Tiscon',
      grade:           'Fe 550D',
      nominalDia:      '25',
      weight:          '3.827',
      length:          '1',
      yieldLoad:       '297.40',
      ultimateLoad:    '351.02',
      finalGaugeLength:'145.45',
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
 * @param {Object} metadata
 * @returns {{ rows: Array, summary: Object }}
 */
export function calculateSteelTest(observations = [], metadata = {}) {
  const rows = [];
  const validYieldStresses   = [];
  const validTensileStrengths= [];
  const validElongations     = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const errors = [];

    const sampleId = obs.sampleId || obs.barId || `Sample ${slNo}`;
    const heatNo   = obs.heatNo !== undefined && obs.heatNo !== null ? String(obs.heatNo).trim() : '';
    const invoiceNo= obs.invoiceNo !== undefined && obs.invoiceNo !== null ? String(obs.invoiceNo).trim() : '';
    const vehicleNo= obs.vehicleNo !== undefined && obs.vehicleNo !== null ? String(obs.vehicleNo).trim() : '';
    const brand    = obs.brand !== undefined && obs.brand !== null ? String(obs.brand).trim() : '';
    const grade    = obs.grade !== undefined && obs.grade !== null ? String(obs.grade).trim() : '';

    const weight   = parseFloat(obs.weight);    // C2 kg
    const length   = parseFloat(obs.length);    // C3 m
    const yieldKn  = parseFloat(obs.yieldLoad); // C6 kN
    const ultKn    = parseFloat(obs.ultimateLoad);// C8 kN
    const fgl      = parseFloat(obs.finalGaugeLength); // C11 mm

    // C4 Mass per Meter = C2 / C3   (3 dec)
    let massPerMeter = null;
    let massPerMeterFmt = '';
    const directMass = parseFloat(obs.massPerMeter);

    if (!isNaN(weight) && weight > 0 && !isNaN(length) && length > 0) {
      massPerMeter = weight / length;
      massPerMeterFmt = fmt(massPerMeter, 3);
    } else if (!isNaN(directMass) && directMass > 0) {
      massPerMeter = directMass;
      massPerMeterFmt = fmt(massPerMeter, 3);
    } else if (obs.weight !== '' || obs.length !== '' || (obs.massPerMeter !== undefined && obs.massPerMeter !== '')) {
      errors.push('Weight and Length (or Mass per Meter) must be positive numbers.');
    }

    // Tolerance verification per IS 1786: 2008 Table 1 & Table 2
    const toleranceInfo = getSteelToleranceInfo(obs.nominalDia);
    let isBelowMassTolerance = false;
    let massToleranceWarning = '';

    if (toleranceInfo && massPerMeter !== null) {
      // Check if massPerMeter is below lower limit tolerance per Table 2 Individual Sample
      if (massPerMeter < toleranceInfo.minMassPerMeter - 1e-6) {
        isBelowMassTolerance = true;
        massToleranceWarning = `Mass per meter (${massPerMeterFmt} kg/m) is below IS 1786: 2008 lower limit tolerance (${toleranceInfo.minMassPerMeterFmt} kg/m, ${toleranceInfo.tolerancePercent}% tolerance on nominal ${toleranceInfo.nominalMassFmt} kg/m for dia ${toleranceInfo.dia} mm).`;
        errors.push(massToleranceWarning);
      }
    }

    // C5 Area = C4 / (0.00785 × C3)   (2 dec)
    let area = null;
    let areaFmt = '';
    const effLength = (!isNaN(length) && length > 0) ? length : 1;
    if (massPerMeter !== null) {
      area = massPerMeter / (STEEL_DENSITY_FACTOR * effLength);
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
      sampleId,
      barId:              sampleId, // backward compatibility
      heatNo,
      invoiceNo,
      vehicleNo,
      brand,
      grade,
      nominalDia:         obs.nominalDia || '',
      weight:             obs.weight || '',
      length:             obs.length || '',
      massPerMeter,       massPerMeterFmt,         // C4
      toleranceInfo,
      isBelowMassTolerance,
      massToleranceWarning,
      minMassPerMeter:    toleranceInfo ? toleranceInfo.minMassPerMeter : null,
      minMassPerMeterFmt: toleranceInfo ? toleranceInfo.minMassPerMeterFmt : '',
      nominalMass:        toleranceInfo ? toleranceInfo.nominalMass : null,
      nominalMassFmt:     toleranceInfo ? toleranceInfo.nominalMassFmt : '',
      massTolerancePercent: toleranceInfo ? toleranceInfo.tolerancePercent : null,
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

  const belowMassToleranceRows = rows.filter((r) => r.isBelowMassTolerance);
  const hasBelowMassTolerance = belowMassToleranceRows.length > 0;

  // Client reference presence
  const hasHeatNo = rows.some((r) => r.heatNo && r.heatNo.length > 0);
  const hasInvoiceNo = rows.some((r) => r.invoiceNo && r.invoiceNo.length > 0);
  const hasVehicleNo = rows.some((r) => r.vehicleNo && r.vehicleNo.length > 0);
  const hasBrand = rows.some((r) => r.brand && r.brand.length > 0);
  const hasGrade = rows.some((r) => r.grade && r.grade.length > 0);

  const clientReferenceColumns = {
    heatNo: metadata?.includeHeatNoInReport ?? (metadata?.clientReferenceColumns?.heatNo ?? hasHeatNo),
    invoiceNo: metadata?.includeInvoiceNoInReport ?? (metadata?.clientReferenceColumns?.invoiceNo ?? hasInvoiceNo),
    vehicleNo: metadata?.includeVehicleNoInReport ?? (metadata?.clientReferenceColumns?.vehicleNo ?? hasVehicleNo),
    brand: metadata?.includeBrandInReport ?? (metadata?.clientReferenceColumns?.brand ?? hasBrand),
    grade: metadata?.includeGradeInReport ?? (metadata?.clientReferenceColumns?.grade ?? hasGrade),
  };

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
      hasBelowMassTolerance,
      belowMassToleranceRows,
      // Requirement 1: Averages shall not appear in final report, only individual results
      reportExcludeAverages: true,
      reportExcludeAvgYieldStress: true,
      reportExcludeAvgTensileStrength: true,
      reportExcludeAvgElongation: true,
      includeAveragesInReport: false,
      reportClauseNote: 'Avg. yield stress, avg. tensile strength, and avg. elongation are for testing data only and shall not appear in the final report; only individual results are required.',
      // Requirement 3: Client reference presence flags
      hasHeatNo,
      hasInvoiceNo,
      hasVehicleNo,
      hasBrand,
      hasGrade,
      clientReferenceColumns,
    },
  };
}
