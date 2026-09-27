/**
 * Fine Aggregate Test Calculations
 *
 * Tests covered:
 *  1. Sieve Analysis                      – IS 2386 (Part 1): 1963 RA 2021
 *  2. Specific Gravity & Water Absorption – IS 2386 (Part 3): 1963 RA 2021
 *  3. Bulk Density                        – IS 2386 (Part 3): 1963 RA 2021
 *  4. Silt Content                        – IS 2386 (Part 2): 1963 RA 2021
 *  5. Percentage finer than 75 micron     – IS 2386 (Part 1): 1963 RA 2021
 *
 * Formulas:
 *  Sieve Analysis:
 *    Cumulative Weight Retained = sum of all retained weights up to and including this sieve
 *    Cumulative % Retained = (Cumulative Weight Retained / Sample Weight) × 100
 *    % Passing = 100 − Cumulative % Retained
 *    Fineness Modulus = Σ(Cumulative % Retained for sieves ≥ 150 µm) / 100
 *
 *  Specific Gravity & Water Absorption (per trial):
 *    SSD Specific Gravity      = D / (A − (B − C))
 *    Apparent Specific Gravity = D / (D − (B − C))
 *    Water Absorption (%)      = 100 × (A − D) / D
 *    Averages = mean of valid trials
 *
 *  Bulk Density (per trial):
 *    Dry Compacted Bulk Density (kg/L) = M1 / V
 *    Dry Loose Bulk Density (kg/L)     = M2 / V
 *    Averages = mean of valid trials
 *
 *  Silt Content:
 *    Percentage of Silt (%) = (V1 / V2) × 100
 *    where:
 *      V1 = Volume of silt layer (ml) (silt settled over the sand layer)
 *      V2 = Total volume of sample (ml)
 *
 *  Percentage finer than 75 micron:
 *    Percentage finer than 75 micron (%) = ((W1 − W2) / W1) × 100
 *    where:
 *      W1 = Original dry weight / sample taken (g)
 *      W2 = Dry weight after washing (g)
 */

// ─── Standard sieve stack for fine aggregate ─────────────────────────────────

export const FINE_AGG_SIEVES = [
  { label: '10 mm',   key: '10mm'   },
  { label: '4.75 mm', key: '4_75mm' },
  { label: '2.36 mm', key: '2_36mm' },
  { label: '1.18 mm', key: '1_18mm' },
  { label: '600 µm',  key: '600um'  },
  { label: '300 µm',  key: '300um'  },
  { label: '150 µm',  key: '150um'  },
];

// Sieves whose cumulative % retained contributes to fineness modulus (≥ 150 µm)
const FM_SIEVE_KEYS = new Set(['10mm', '4_75mm', '2_36mm', '1_18mm', '600um', '300um', '150um']);

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SIEVE_ANALYSIS = {
  sampleWeight: '1000',
  retained: {
    '10mm':   '0',
    '4_75mm': '0',
    '2_36mm': '0',
    '1_18mm': '0',
    '600um':  '0',
    '300um':  '0',
    '150um':  '0',
  },
};

export const DEFAULT_FINER75 = {
  w1: '',  // original dry sample taken (g)
  w2: '',  // dry weight after washing (g)
};

export const DEFAULT_SILT_CONTENT = {
  v1: '',  // volume of silt layer (ml) (silt settled over the sand layer)
  v2: '',  // total volume of sample (ml)
};

export const DEFAULT_SG_TRIAL = { a: '', b: '', c: '', d: '' };

export const DEFAULT_SG_WA = {
  trials: [{ ...DEFAULT_SG_TRIAL }, { ...DEFAULT_SG_TRIAL }],
};

export const DEFAULT_BULK_DENSITY_TRIAL = {
  volume:           '',  // V litres
  mouldWeight:      '',  // kg
  compactedWeight:  '',  // M1 kg  (weight of compacted aggregate ONLY, mould already subtracted)
  looseWeight:      '',  // M2 kg  (weight of loose aggregate ONLY)
};

export const DEFAULT_BULK_DENSITY = {
  trials: [{ ...DEFAULT_BULK_DENSITY_TRIAL }, { ...DEFAULT_BULK_DENSITY_TRIAL }],
};

// ─── Sample data (from provided spec) ────────────────────────────────────────

export const SAMPLE_FINE_AGG_DATA = {
  sieveAnalysis: {
    sampleWeight: '1000',
    retained: {
      '10mm':   '0',
      '4_75mm': '60',
      '2_36mm': '120',
      '1_18mm': '178',
      '600um':  '162',
      '300um':  '352',
      '150um':  '110',
    },
  },
  finer75: { w1: '500', w2: '457' },
  siltContent: { v1: '4', v2: '90' },
  sgWa: {
    trials: [
      { a: '505.00', b: '1890.00', c: '1576.00', d: '495.50' },
      { a: '505.00', b: '1890.00', c: '1576.00', d: '495.50' },
    ],
  },
  bulkDensity: {
    trials: [
      { volume: '3', mouldWeight: '2.67', compactedWeight: '5.36', looseWeight: '4.90' },
      { volume: '3', mouldWeight: '2.67', compactedWeight: '5.36', looseWeight: '4.90' },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt2(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return v.toFixed(2);
}

function avg(arr) {
  const valid = arr.filter((v) => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// ─── 1. Sieve Analysis ────────────────────────────────────────────────────────

/**
 * @param {Object} data  { sampleWeight, retained: { [key]: string } }
 * @returns {{ rows, finenessModulus, finenessModulusFmt, errors }}
 */
export function calculateSieveAnalysis(data) {
  const sampleWeight = parseFloat(data?.sampleWeight);
  let retained = data?.retained;
  if (!retained && Array.isArray(data?.rows)) {
    retained = {};
    data.rows.forEach((r, idx) => {
      const sieveDef = FINE_AGG_SIEVES.find((s) => s.key === r.key || s.label === r.sieve) || FINE_AGG_SIEVES[idx];
      if (sieveDef) {
        retained[sieveDef.key] = String(r.weightRetained ?? r.weightRetainedFmt ?? '0');
      }
    });
  }
  retained = retained || {};
  const errors = [];
  const rows = [];

  if (isNaN(sampleWeight) || sampleWeight <= 0) {
    errors.push('Sample weight must be a positive number.');
  }

  let cumulative = 0;
  let fmSum = 0;

  FINE_AGG_SIEVES.forEach(({ label, key }) => {
    const wRet = parseFloat(retained[key] ?? '0') || 0;
    cumulative += wRet;

    let cumPctRetained = null;
    let pctPassing = null;
    let cumPctRetainedFmt = '';
    let pctPassingFmt = '';

    if (!isNaN(sampleWeight) && sampleWeight > 0) {
      cumPctRetained = (cumulative / sampleWeight) * 100;
      pctPassing = 100 - cumPctRetained;
      cumPctRetainedFmt = fmt2(cumPctRetained);
      pctPassingFmt = fmt2(pctPassing);
    }

    if (FM_SIEVE_KEYS.has(key) && cumPctRetained !== null) {
      fmSum += cumPctRetained;
    }

    rows.push({
      sieve: label,
      key,
      weightRetained: wRet,
      weightRetainedFmt: wRet % 1 === 0 ? wRet.toFixed(1) : fmt2(wRet),
      cumulativeRetained: cumulative,
      cumulativeRetainedFmt: cumulative % 1 === 0 ? cumulative.toFixed(1) : fmt2(cumulative),
      cumPctRetained,
      cumPctRetainedFmt,
      pctPassing,
      pctPassingFmt,
    });
  });

  const finenessModulus = (!isNaN(sampleWeight) && sampleWeight > 0) ? fmSum / 100 : null;
  const finenessModulusFmt = finenessModulus !== null ? finenessModulus.toFixed(2) : '';

  return { rows, finenessModulus, finenessModulusFmt, errors };
}

// ─── 2. Percentage finer than 75 micron ───────────────────────────────────────

/**
 * Percentage finer than 75 micron per IS 2386 (Part 1): 1963 RA 2021
 * Formula: ((W1 − W2) / W1) × 100
 * where W1 = Original dry weight / sample taken (g), W2 = Dry weight after washing (g)
 * @param {{ w1: string, w2: string }} data
 * @returns {{ finerPct, finerPctFmt, errors }}
 */
export function calculateFiner75(data) {
  const w1 = parseFloat(data?.w1);
  const w2 = parseFloat(data?.w2);
  const errors = [];

  let finerPct = null;
  let finerPctFmt = '';

  if (!isNaN(w1) && !isNaN(w2)) {
    if (w1 <= 0) {
      errors.push('Original dry sample weight (W₁) must be greater than 0.');
    } else if (w2 < 0) {
      errors.push('Dry weight after washing (W₂) cannot be negative.');
    } else if (w1 < w2) {
      errors.push('Original dry sample weight (W₁) cannot be less than dry weight after washing (W₂).');
    } else {
      finerPct = ((w1 - w2) / w1) * 100;
      finerPctFmt = fmt2(finerPct);
    }
  }

  return { finerPct, finerPctFmt, errors };
}

// ─── 3. Specific Gravity & Water Absorption ───────────────────────────────────

/**
 * Calculate per-trial and averaged SG & WA values.
 * @param {{ trials: Array<{a,b,c,d}> }} data
 * @returns {{ trialResults, avgSgSsd, avgSgSsdFmt, avgSgApp, avgSgAppFmt, avgWa, avgWaFmt }}
 */
export function calculateSgWa(data) {
  const trials = data?.trials || [];
  const trialResults = [];
  const sgSsdArr = [], sgAppArr = [], waArr = [];

  trials.forEach((t, i) => {
    const a = parseFloat(t.a);
    const b = parseFloat(t.b);
    const c = parseFloat(t.c);
    const d = parseFloat(t.d);
    const errors = [];

    let sgSsd = null, sgSsdFmt = '';
    let sgApp = null, sgAppFmt = '';
    let wa   = null, waFmt   = '';

    if (!isNaN(a) && !isNaN(b) && !isNaN(c) && !isNaN(d)) {
      const bMinusC = b - c;
      const denomSsd = a - bMinusC;
      const denomApp = d - bMinusC;

      if (denomSsd <= 0) errors.push('Invalid inputs: A − (B − C) must be > 0.');
      else { sgSsd = d / denomSsd; sgSsdFmt = fmt2(sgSsd); sgSsdArr.push(sgSsd); }

      if (denomApp <= 0) errors.push('Invalid inputs: D − (B − C) must be > 0.');
      else { sgApp = d / denomApp; sgAppFmt = fmt2(sgApp); sgAppArr.push(sgApp); }

      if (d > 0) { wa = (100 * (a - d)) / d; waFmt = fmt2(wa); waArr.push(wa); }
    }

    trialResults.push({ trialNo: i + 1, sgSsd, sgSsdFmt, sgApp, sgAppFmt, wa, waFmt, errors });
  });

  const avgSgSsd = avg(sgSsdArr);
  const avgSgApp = avg(sgAppArr);
  const avgWa    = avg(waArr);

  return {
    trialResults,
    avgSgSsd,    avgSgSsdFmt: fmt2(avgSgSsd),
    avgSgApp,    avgSgAppFmt: fmt2(avgSgApp),
    avgWa,       avgWaFmt:    fmt2(avgWa),
  };
}

// ─── 4. Bulk Density ──────────────────────────────────────────────────────────

/**
 * @param {{ trials: Array<{volume, mouldWeight, compactedWeight, looseWeight}> }} data
 * @returns {{ trialResults, avgCompacted, avgCompactedFmt, avgLoose, avgLooseFmt }}
 */
export function calculateBulkDensity(data) {
  const trials = data?.trials || [];
  const trialResults = [];
  const compactedArr = [], looseArr = [];

  trials.forEach((t, i) => {
    const v  = parseFloat(t.volume);
    const m1 = parseFloat(t.compactedWeight);
    const m2 = parseFloat(t.looseWeight);
    const errors = [];

    let compacted = null, compactedFmt = '';
    let loose     = null, looseFmt     = '';

    if (!isNaN(v) && v > 0) {
      if (!isNaN(m1) && m1 >= 0) {
        compacted = m1 / v;
        compactedFmt = fmt2(compacted);
        compactedArr.push(compacted);
      }
      if (!isNaN(m2) && m2 >= 0) {
        loose = m2 / v;
        looseFmt = fmt2(loose);
        looseArr.push(loose);
      }
    } else if (t.volume !== '' && t.volume !== undefined) {
      errors.push('Volume must be a positive number.');
    }

    trialResults.push({ trialNo: i + 1, compacted, compactedFmt, loose, looseFmt, errors });
  });

  const avgCompacted = avg(compactedArr);
  const avgLoose     = avg(looseArr);

  return {
    trialResults,
    avgCompacted, avgCompactedFmt: fmt2(avgCompacted),
    avgLoose,     avgLooseFmt:     fmt2(avgLoose),
  };
}

// ─── 5. Silt Content ──────────────────────────────────────────────────────────

/**
 * Silt Content per IS 2386 (Part 2): 1963 RA 2021
 * Formula: (V1 / V2) × 100
 * where:
 *   V1 = Volume of silt layer (ml) (silt settled over the sand layer)
 *   V2 = Total volume of sample (ml)
 * @param {{ v1: string, v2: string }} data
 * @returns {{ siltPct, siltPctFmt, errors }}
 */
export function calculateSiltContent(data) {
  const v1 = parseFloat(data?.v1);
  const v2 = parseFloat(data?.v2);
  const errors = [];

  let siltPct = null;
  let siltPctFmt = '';

  if (!isNaN(v1) && !isNaN(v2)) {
    if (v2 <= 0) {
      errors.push('Total volume of sample (V₂) must be greater than 0.');
    } else if (v1 < 0) {
      errors.push('Volume of silt layer (V₁) cannot be negative.');
    } else if (v1 > v2) {
      errors.push('Volume of silt layer (V₁) cannot exceed total volume (V₂).');
    } else {
      siltPct = (v1 / v2) * 100;
      siltPctFmt = fmt2(siltPct);
    }
  }

  return { siltPct, siltPctFmt, errors };
}

