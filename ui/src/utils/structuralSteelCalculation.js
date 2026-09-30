/**
 * Structural Steel Test Calculations
 * Standard: IS 1608 (Part 1) : 2022
 * "Metallic materials — Tensile testing — Part 1: Method of test at room temperature"
 *
 * Applicable for structural steel products such as:
 * - MS Plates
 * - W-Beam
 * - Channels
 * - Angles, Flats, Sections, etc.
 *
 * Columns:
 *  - Sample ID
 *  - Sample Name / Type (e.g. MS Plate, W-Beam, Channel, etc.)
 *  - Client reference columns: Heat/ Lot No., Invoice No., Vehicle No.
 *  - C1: Width (mm)                      — input
 *  - C2: Thickness (mm)                  — input
 *  - C3: Area (mm²)                      = C1 × C2 (Width × Thickness)              [3 dec / 2 dec]
 *  - C4: Yield Load (kN)                 — input
 *  - C5: Yield Stress (N/mm²)            = (C4 / C3) × 1000                         [2 dec]
 *  - C6: Ultimate Load (kN)              — input
 *  - C7: Ultimate Tensile Strength (N/mm²)= (C6 / C3) × 1000                        [2 dec]
 *  - C8: Initial Gauge Length (mm)       = 5.65 × √C3 (IS 1608 Part 1 Cl. D.2: 3.1) [2 dec]
 *  - C9: Final Gauge Length (mm)         — input
 *  - C10: Elongation (%)                 = ((C9 - C8) / C8) × 100                   [2 dec]
 *  - Bend Test                           — dropdown: NCO | CO (optional)
 *
 * Notes:
 *  - Yield stress and tensile strength are formatted to 2 decimal places per specification.
 *  - Average yield stress, tensile strength, and elongation are for testing data only and
 *    excluded from the final report (individual specimen results are reported).
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const BEND_OPTIONS = [
  { value: 'NCO', label: 'NCO – No Cracks Observed' },
  { value: 'CO',  label: 'CO – Cracks Observed'    },
];

export const REBEND_OPTIONS = [
  { value: 'NCO', label: 'NCO – No Cracks Observed' },
  { value: 'CO',  label: 'CO – Cracks Observed'    },
];

export const COMMON_STRUCTURAL_STEEL_TYPES = [
  'MS Plate',
  'W-Beam',
  'Channel',
  'Angle',
  'Flat Bar',
  'I-Beam',
  'SHS / RHS Section',
  'T-Section',
];

// ─── Default shapes ──────────────────────────────────────────────────────────

export const DEFAULT_STRUCTURAL_STEEL_OBSERVATION = {
  sampleId:         '',   // Sample ID / Specimen code
  sampleType:       '',   // Sample Name or Type (MS Plate, W-Beam, Channel, etc.)
  sampleName:       '',   // kept in sync with sampleType
  heatNo:           '',   // Heat / Lot No.
  invoiceNo:        '',   // Invoice No.
  vehicleNo:        '',   // Vehicle No.
  brand:            '',   // Brand
  grade:            '',   // Grade
  width:            '',   // C1 (mm) - input
  thickness:        '',   // C2 (mm) - input
  yieldLoad:        '',   // C4 (kN) - input
  ultimateLoad:     '',   // C6 (kN) - input
  finalGaugeLength: '',   // C9 (mm) - input
  bendTest:         'NCO',// Bend test
  rebendTest:       'NCO',// Rebend test
};

export const DEFAULT_STRUCTURAL_STEEL_OBSERVATIONS = [
  { ...DEFAULT_STRUCTURAL_STEEL_OBSERVATION, sampleId: 'Sample 1', sampleType: 'MS Plate', sampleName: 'MS Plate' },
  { ...DEFAULT_STRUCTURAL_STEEL_OBSERVATION, sampleId: 'Sample 2', sampleType: 'MS Plate', sampleName: 'MS Plate' },
  { ...DEFAULT_STRUCTURAL_STEEL_OBSERVATION, sampleId: 'Sample 3', sampleType: 'W-Beam', sampleName: 'W-Beam' },
];

// ─── Reference Sample Data (from engineering reference sheet) ────────────────

export const SAMPLE_STRUCTURAL_STEEL_TEST_DATA = {
  heatNoOptions: ['HT-2026-9081'],
  invoiceNoOptions: ['INV/2026/0442'],
  vehicleNoOptions: ['MH-12-RN-5521'],
  brandOptions: ['TATA Structura', 'SAIL', 'JSW Steel'],
  gradeOptions: ['IS 2062 E250', 'Fe 410', 'E350'],
  clientReferenceColumns: {
    heatNo: false,
    invoiceNo: false,
    vehicleNo: false,
    brand: true,
    grade: true,
    bend: false,
    rebend: false,
  },
  includeHeatNoInReport: false,
  includeInvoiceNoInReport: false,
  includeVehicleNoInReport: false,
  includeBrandInReport: true,
  includeGradeInReport: true,
  includeBendInReport: false,
  includeRebendInReport: false,
  observations: [
    {
      sampleId:         'Sample 1',
      sampleType:       'MS Plate',
      sampleName:       'MS Plate',
      heatNo:           '',
      invoiceNo:        '',
      vehicleNo:        '',
      brand:            'TATA Structura',
      grade:            'IS 2062 E250',
      width:            '20.000',
      thickness:        '12.3',
      yieldLoad:        '149.232',
      ultimateLoad:     '183.816',
      finalGaugeLength: '111.25',
      bendTest:         'NCO',
      rebendTest:       'NCO',
    },
    {
      sampleId:         'Sample 2',
      sampleType:       'MS Plate',
      sampleName:       'MS Plate',
      heatNo:           '',
      invoiceNo:        '',
      vehicleNo:        '',
      brand:            'TATA Structura',
      grade:            'IS 2062 E250',
      width:            '20.000',
      thickness:        '12.1',
      yieldLoad:        '159.816',
      ultimateLoad:     '195.864',
      finalGaugeLength: '110.89',
      bendTest:         'NCO',
      rebendTest:       'NCO',
    },
    {
      sampleId:         'Sample 3',
      sampleType:       'W-Beam',
      sampleName:       'W-Beam',
      heatNo:           '',
      invoiceNo:        '',
      vehicleNo:        '',
      brand:            'TATA Structura',
      grade:            'IS 2062 E250',
      width:            '20.000',
      thickness:        '16.01',
      yieldLoad:        '165.96',
      ultimateLoad:     '205.8',
      finalGaugeLength: '125.36',
      bendTest:         'NCO',
      rebendTest:       'NCO',
    },
    {
      sampleId:         'Sample 4',
      sampleType:       'Channel',
      sampleName:       'Channel',
      heatNo:           '',
      invoiceNo:        '',
      vehicleNo:        '',
      brand:            'TATA Structura',
      grade:            'IS 2062 E250',
      width:            '20.000',
      thickness:        '22.4',
      yieldLoad:        '297.528',
      ultimateLoad:     '297.552',
      finalGaugeLength: '148.96',
      bendTest:         'NCO',
      rebendTest:       'NCO',
    },
    {
      sampleId:         'Sample 5',
      sampleType:       'MS Plate',
      sampleName:       'MS Plate',
      heatNo:           '',
      invoiceNo:        '',
      vehicleNo:        '',
      brand:            'TATA Structura',
      grade:            'IS 2062 E250',
      width:            '20.000',
      thickness:        '25.1',
      yieldLoad:        '264.144',
      ultimateLoad:     '319.32',
      finalGaugeLength: '159.63',
      bendTest:         'NCO',
      rebendTest:       'NCO',
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
 * Calculate derived test values for structural steel observations per IS 1608 (Part 1): 2022.
 *
 * @param {Array} observations
 * @param {Object} metadata
 * @returns {{ rows: Array, summary: Object }}
 */
export function calculateStructuralSteelTest(observations = [], metadata = {}) {
  const rows = [];
  const validYieldStresses    = [];
  const validTensileStrengths = [];
  const validElongations      = [];

  observations.forEach((obs, i) => {
    const slNo = i + 1;
    const errors = [];

    const sampleId   = obs.sampleId || `Sample ${slNo}`;
    const sampleType = obs.sampleType || obs.sampleName || '';
    const heatNo     = obs.heatNo !== undefined && obs.heatNo !== null ? String(obs.heatNo).trim() : '';
    const invoiceNo  = obs.invoiceNo !== undefined && obs.invoiceNo !== null ? String(obs.invoiceNo).trim() : '';
    const vehicleNo  = obs.vehicleNo !== undefined && obs.vehicleNo !== null ? String(obs.vehicleNo).trim() : '';
    const brand      = obs.brand !== undefined && obs.brand !== null ? String(obs.brand).trim() : '';
    const grade      = obs.grade !== undefined && obs.grade !== null ? String(obs.grade).trim() : '';

    const width     = parseFloat(obs.width);            // C1 (mm)
    const thickness = parseFloat(obs.thickness);        // C2 (mm)
    const yieldKn   = parseFloat(obs.yieldLoad);        // C4 (kN)
    const ultKn     = parseFloat(obs.ultimateLoad);     // C6 (kN)
    const fgl       = parseFloat(obs.finalGaugeLength); // C9 (mm)

    // C3: Area (mm²) = width × thickness (formatted to 3 decimals or 2 decimals)
    let area = null;
    let areaFmt = '';
    if (!isNaN(width) && width > 0 && !isNaN(thickness) && thickness > 0) {
      area = width * thickness;
      areaFmt = fmt(area, 3);
    } else if (obs.width !== '' || obs.thickness !== '') {
      errors.push('Width and Thickness must be positive numbers.');
    }

    // C5: Yield Stress (N/mm²) = (Yield Load / Area) × 1000 [2 decimals]
    let yieldStress = null;
    let yieldStressFmt = '';
    if (!isNaN(yieldKn) && yieldKn > 0 && area && area > 0) {
      yieldStress = (yieldKn * 1000) / area;
      yieldStressFmt = fmt(yieldStress, 2);
      validYieldStresses.push(yieldStress);
    } else if (obs.yieldLoad !== '' && obs.yieldLoad !== undefined) {
      if (isNaN(yieldKn) || yieldKn <= 0) errors.push('Yield Load must be a positive number.');
    }

    // C7: Ultimate Tensile Strength (N/mm²) = (Ultimate Load / Area) × 1000 [2 decimals]
    let tensileStrength = null;
    let tensileStrengthFmt = '';
    if (!isNaN(ultKn) && ultKn > 0 && area && area > 0) {
      tensileStrength = (ultKn * 1000) / area;
      tensileStrengthFmt = fmt(tensileStrength, 2);
      validTensileStrengths.push(tensileStrength);
    } else if (obs.ultimateLoad !== '' && obs.ultimateLoad !== undefined) {
      if (isNaN(ultKn) || ultKn <= 0) errors.push('Ultimate Load must be a positive number.');
    }

    // C8: Initial Gauge Length (mm) = 5.65 × √Area (IS 1608 Part 1 Cl. D.2: 3.1) [2 decimals]
    let igl = null;
    let iglFmt = '';
    if (area && area > 0) {
      igl = 5.65 * Math.sqrt(area);
      iglFmt = fmt(igl, 2);
    }

    // C10: Elongation (%) = ((Final Gauge Length - Initial Gauge Length) / Initial Gauge Length) × 100 [2 decimals]
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
      sampleType,
      sampleName: sampleType,
      heatNo,
      invoiceNo,
      vehicleNo,
      brand,
      grade,
      width:            obs.width || '',
      widthFmt:         !isNaN(width) && width > 0 ? fmt(width, 3) : '',
      thickness:        obs.thickness || '',
      thicknessFmt:     !isNaN(thickness) && thickness > 0 ? fmt(thickness, 2) : '',
      area,             areaFmt,                 // C3
      yieldLoad:        obs.yieldLoad || '',      // C4 (kN)
      yieldStress,      yieldStressFmt,           // C5 (N/mm²)
      ultimateLoad:     obs.ultimateLoad || '',   // C6 (kN)
      tensileStrength,  tensileStrengthFmt,       // C7 (N/mm²)
      ultimateTensileStrength: tensileStrength,
      ultimateTensileStrengthFmt: tensileStrengthFmt,
      igl,              iglFmt,                  // C8 (mm)
      finalGaugeLength: obs.finalGaugeLength || '', // C9 (mm)
      finalGaugeLengthFmt: !isNaN(fgl) && fgl > 0 ? fmt(fgl, 2) : '',
      elongation,       elongationFmt,            // C10 (%)
      bendTest:         obs.bendTest || 'NCO',
      rebendTest:       obs.rebendTest || 'NCO',
      errors,
    });
  });

  // ── Summary averages ───────────────────────────────────────────────────────
  const avg = (arr) => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

  const avgYieldStress     = avg(validYieldStresses);
  const avgTensileStrength = avg(validTensileStrengths);
  const avgElongation      = avg(validElongations);

  // Client reference presence
  const hasHeatNo    = rows.some((r) => r.heatNo && r.heatNo.length > 0);
  const hasInvoiceNo = rows.some((r) => r.invoiceNo && r.invoiceNo.length > 0);
  const hasVehicleNo = rows.some((r) => r.vehicleNo && r.vehicleNo.length > 0);
  const hasBrand     = rows.some((r) => r.brand && r.brand.length > 0);
  const hasGrade     = rows.some((r) => r.grade && r.grade.length > 0);
  const hasBend      = rows.some((r) => r.bendTest && r.bendTest.length > 0);
  const hasRebend    = rows.some((r) => r.rebendTest && r.rebendTest.length > 0);

  const includeBendInReport = metadata?.includeBendInReport ?? (metadata?.customOptions?.includeBendInReport ?? (metadata?.clientReferenceColumns?.bend ?? false));
  const includeRebendInReport = metadata?.includeRebendInReport ?? (metadata?.customOptions?.includeRebendInReport ?? (metadata?.clientReferenceColumns?.rebend ?? false));

  const clientReferenceColumns = {
    heatNo:    metadata?.includeHeatNoInReport ?? (metadata?.clientReferenceColumns?.heatNo ?? hasHeatNo),
    invoiceNo: metadata?.includeInvoiceNoInReport ?? (metadata?.clientReferenceColumns?.invoiceNo ?? hasInvoiceNo),
    vehicleNo: metadata?.includeVehicleNoInReport ?? (metadata?.clientReferenceColumns?.vehicleNo ?? hasVehicleNo),
    brand:     metadata?.includeBrandInReport ?? (metadata?.clientReferenceColumns?.brand ?? hasBrand),
    grade:     metadata?.includeGradeInReport ?? (metadata?.clientReferenceColumns?.grade ?? hasGrade),
    bend:      includeBendInReport,
    rebend:    includeRebendInReport,
  };

  return {
    rows,
    summary: {
      avgYieldStress,
      avgYieldStressFmt:             fmt(avgYieldStress, 2),
      avgTensileStrength,
      avgTensileStrengthFmt:         fmt(avgTensileStrength, 2),
      avgUltimateTensileStrength:     avgTensileStrength,
      avgUltimateTensileStrengthFmt: fmt(avgTensileStrength, 2),
      avgElongation,
      avgElongationFmt:              fmt(avgElongation, 2),
      count:                         rows.length,
      standard:                      'IS 1608 (Part 1) : 2022',
      reportExcludeAverages:         true,
      reportExcludeAvgYieldStress:   true,
      reportExcludeAvgTensileStrength: true,
      reportExcludeAvgElongation:    true,
      includeAveragesInReport:       false,
      reportClauseNote:
        'Avg. yield stress, avg. tensile strength, and avg. elongation are for testing data only and shall not appear in the final report; only individual specimen results are required.',
      hasHeatNo,
      hasInvoiceNo,
      hasVehicleNo,
      hasBrand,
      hasGrade,
      hasBend,
      hasRebend,
      includeBendInReport,
      includeRebendInReport,
      customOptions: {
        includeBendInReport,
        includeRebendInReport,
      },
      clientReferenceColumns,
    },
  };
}
