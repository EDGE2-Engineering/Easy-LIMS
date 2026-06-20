// Auto-generated math pure functions for SBC Calculations
const DEFAULT_ROWS = [
  { id: 1, phi: '0', nc: '5.14', nq: '1.00', ngamma: '0.00' },
  { id: 2, phi: '5', nc: '6.49', nq: '1.57', ngamma: '0.45' },
  { id: 3, phi: '10', nc: '8.35', nq: '2.47', ngamma: '1.22' },
  { id: 4, phi: '15', nc: '10.98', nq: '3.94', ngamma: '2.65' },
  { id: 5, phi: '20', nc: '14.83', nq: '6.40', ngamma: '5.39' },
  { id: 6, phi: '25', nc: '20.72', nq: '10.66', ngamma: '10.88' },
  { id: 7, phi: '30', nc: '30.14', nq: '18.40', ngamma: '22.40' },
  { id: 8, phi: '35', nc: '46.12', nq: '33.30', ngamma: '48.03' },
  { id: 9, phi: '40', nc: '75.31', nq: '64.20', ngamma: '109.41' },
  { id: 10, phi: '45', nc: '138.88', nq: '134.88', ngamma: '271.76' },
  { id: 11, phi: '50', nc: '266.89', nq: '319.07', ngamma: '762.89' },
];

// ─── φ′ = tan⁻¹(0.67 × tan φ), φ in degrees ─────────────────────────────────
const derivePhiPrime = (phiDeg) => {
  const rad = (phiDeg * Math.PI) / 180;
  return (Math.atan(0.67 * Math.tan(rad)) * 180) / Math.PI;
};

// Linear interpolation on sorted { x, y } array
const interpolateY = (points, xVal) => {
  if (points.length < 2) return null;
  if (xVal <= points[0].x) {
    const [p0, p1] = [points[0], points[1]];
    if (p1.x === p0.x) return p0.y;
    return p0.y + ((xVal - p0.x) * (p1.y - p0.y)) / (p1.x - p0.x);
  }
  if (xVal >= points[points.length - 1].x) {
    const [p0, p1] = [points[points.length - 2], points[points.length - 1]];
    if (p1.x === p0.x) return p1.y;
    return p0.y + ((xVal - p0.x) * (p1.y - p0.y)) / (p1.x - p0.x);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1] = [points[i], points[i + 1]];
    if (xVal >= p0.x && xVal <= p1.x) {
      if (p1.x === p0.x) return p0.y;
      return p0.y + ((xVal - p0.x) * (p1.y - p0.y)) / (p1.x - p0.x);
    }
  }
  return null;
};

// Derive N′c, N′q, N′γ for one row given the base point arrays
const computeDerived = (phiStr, ncPts, nqPts, ngPts) => {
  const phi = parseFloat(phiStr);
  if (isNaN(phi)) return { phiPrime: null, ncPrime: null, nqPrime: null, ngPrime: null };
  const phiPrime = derivePhiPrime(phi);
  return {
    phiPrime,
    ncPrime: interpolateY(ncPts, phiPrime),
    nqPrime: interpolateY(nqPts, phiPrime),
    ngPrime: interpolateY(ngPts, phiPrime),
  };
};

const SETTLEMENT_DATA = [
  { n: 5, vals: [0.12, 0.14, 0.16, 0.17, 0.18, 0.18] },
  { n: 10, vals: [0.03, 0.032, 0.037, 0.039, 0.04, 0.04] },
  { n: 15, vals: [0.017, 0.018, 0.021, 0.022, 0.023, 0.023] },
  { n: 20, vals: [0.013, 0.014, 0.016, 0.016, 0.017, 0.017] },
  { n: 25, vals: [0.009, 0.01, 0.012, 0.013, 0.014, 0.014] },
  { n: 30, vals: [0.0075, 0.008, 0.009, 0.0094, 0.01, 0.01] },
  { n: 35, vals: [0.006, 0.0068, 0.0075, 0.008, 0.0082, 0.0085] },
  { n: 40, vals: [0.0054, 0.0059, 0.0065, 0.0069, 0.007, 0.007] },
  { n: 45, vals: [null, 0.0054, 0.0058, 0.006, 0.0061, 0.0062] },
  { n: 50, vals: [null, 0.0048, 0.0052, 0.0055, 0.0057, 0.0058] },
  { n: 55, vals: [null, 0.0043, 0.0047, 0.0049, 0.005, 0.005] },
  { n: 60, vals: [null, 0.0038, 0.0042, 0.0045, 0.0046, 0.0046] },
];

const FOOTING_WIDTHS = [1.5, 2.0, 3.0, 4.0, 5.0, 6.0];

const FOX_DATASETS = [
  {
    label: 'L/B = 1',
    color: '#ef4444',
    data: [
      { x: 1.0, y: 0.0 },
      { x: 0.94, y: 0.2 },
      { x: 0.87, y: 0.4 },
      { x: 0.81, y: 0.6 },
      { x: 0.76, y: 0.8 },
      { x: 0.72, y: 1.0 },
      { x: 0.67, y: 1.2 },
      { x: 0.62, y: 1.4 },
      { x: 0.57, y: 1.6 },
      { x: 0.53, y: 1.8 },
      { x: 0.5, y: 2.0 },
    ],
  },
  {
    label: 'L/B = 9',
    color: '#22c55e',
    data: [
      { x: 1.0, y: 0.0 },
      { x: 0.91, y: 0.2 },
      { x: 0.83, y: 0.4 },
      { x: 0.77, y: 0.6 },
      { x: 0.73, y: 0.8 },
      { x: 0.72, y: 1.0 },
      { x: 0.7, y: 1.2 },
      { x: 0.67, y: 1.4 },
      { x: 0.63, y: 1.6 },
      { x: 0.58, y: 1.8 },
      { x: 0.5, y: 2.0 },
    ],
  },
  {
    label: 'L/B = 25',
    color: '#3b82f6',
    data: [
      { x: 1.0, y: 0.0 },
      { x: 0.88, y: 0.2 },
      { x: 0.8, y: 0.4 },
      { x: 0.75, y: 0.6 },
      { x: 0.72, y: 0.8 },
      { x: 0.72, y: 1.0 },
      { x: 0.71, y: 1.2 },
      { x: 0.69, y: 1.4 },
      { x: 0.66, y: 1.6 },
      { x: 0.61, y: 1.8 },
      { x: 0.5, y: 2.0 },
    ],
  },
  {
    label: 'L/B = 100',
    color: '#a855f7',
    data: [
      { x: 1.0, y: 0.0 },
      { x: 0.85, y: 0.2 },
      { x: 0.77, y: 0.4 },
      { x: 0.73, y: 0.6 },
      { x: 0.72, y: 0.8 },
      { x: 0.72, y: 1.0 },
      { x: 0.72, y: 1.2 },
      { x: 0.71, y: 1.4 },
      { x: 0.68, y: 1.6 },
      { x: 0.63, y: 1.8 },
      { x: 0.5, y: 2.0 },
    ],
  },
];

const ROCK_ELASTIC_OPTIONS = [
  { value: '20000000', label: 'Hard rock (E = 20,000,000 kN/m²)', E: 20000000, mu: 0.1 },
  { value: '10000000', label: 'Medium hard rock (E = 10,000,000 kN/m²)', E: 10000000, mu: 0.2 },
  { value: '5000000', label: 'Soft rock (E = 5,000,000 kN/m²)', E: 5000000, mu: 0.3 },
  { value: '1000000', label: 'Weathered rock (E = 1,000,000 kN/m²)', E: 1000000, mu: 0.4 },
];

export const computeSoilSbcValues = (value, settings) => {
  if (!value)
    return {
      computedQs: null,
      computedQa: null,
      computedQsafe: null,
      computedRecommendedSbc: null,
    };
  const {
    sbcB = '',
    sbcL = '',
    sbcD = '',
    sbcDs = '',
    sbcShape = 'rectangle',
    sbcGamma = '',
    sbcN = '',
    sbcCorrectionType = 'none',
    sbcFootingType = 'isolated',
    sbcPhi = '',
    sbcC = '',
    sbcAlpha = '',
    sbcFos = '',
    sbcHt = '',
    sbcWL = '',
    sbcP = '',
    soilTypeInput = 'soil',
  } = value;

  const handleChange = (field, val) => {
    onChange({ ...value, [field]: val });
  };

  const setSbcB = (v) => handleChange('sbcB', v);
  const setSbcL = (v) => handleChange('sbcL', v);
  const setSbcD = (v) => handleChange('sbcD', v);
  const setSbcDs = (v) => handleChange('sbcDs', v);
  const setSbcShape = (v) => handleChange('sbcShape', v);
  const setSbcGamma = (v) => handleChange('sbcGamma', v);
  const setSbcN = (v) => handleChange('sbcN', v);
  const setSbcCorrectionType = (v) => handleChange('sbcCorrectionType', v);
  const setSbcFootingType = (v) => handleChange('sbcFootingType', v);
  const setSbcPhi = (v) => handleChange('sbcPhi', v);
  const setSbcC = (v) => handleChange('sbcC', v);
  const setSbcAlpha = (v) => handleChange('sbcAlpha', v);
  const setSbcFos = (v) => handleChange('sbcFos', v);
  const setSbcHt = (v) => handleChange('sbcHt', v);
  const setSbcWL = (v) => handleChange('sbcWL', v);
  const setSbcP = (v) => handleChange('sbcP', v);
  const setSoilTypeInput = (v) => handleChange('soilTypeInput', v);

  const SETTING_KEY = 'bearing_capacity_factors_data';
  const raw = settings?.[SETTING_KEY];
  let rows = DEFAULT_ROWS;
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) rows = parsed;
    } catch {}
  }

  const validRows = rows.filter(
    (r) =>
      r.phi !== '' &&
      r.nc !== '' &&
      r.nq !== '' &&
      r.ngamma !== '' &&
      !isNaN(parseFloat(r.phi)) &&
      !isNaN(parseFloat(r.nc)) &&
      !isNaN(parseFloat(r.nq)) &&
      !isNaN(parseFloat(r.ngamma))
  );
  const ncPts = validRows
    .map((r) => ({ x: parseFloat(r.phi), y: parseFloat(r.nc) }))
    .sort((a, b) => a.x - b.x);
  const nqPts = validRows
    .map((r) => ({ x: parseFloat(r.phi), y: parseFloat(r.nq) }))
    .sort((a, b) => a.x - b.x);
  const ngPts = validRows
    .map((r) => ({ x: parseFloat(r.phi), y: parseFloat(r.ngamma) }))
    .sort((a, b) => a.x - b.x);

  const EO = 0.8;
  const RIGIDITY_FACTOR = 0.8;
  const W_CONST = 0.5;
  const ALLOWABLE_SETTLEMENT = { isolated: 25, raft: 50 };

  // ── Parse shared inputs ──────────────────────────────────────────
  const sB_raw = parseFloat(sbcB);
  const sL_raw = parseFloat(sbcL);
  const sD = parseFloat(sbcD);
  const sDs = sbcDs !== '' && !isNaN(parseFloat(sbcDs)) ? parseFloat(sbcDs) : 0;
  const sGamma = parseFloat(sbcGamma);
  const sN = parseFloat(sbcN);
  const sPhi = parseFloat(sbcPhi);
  const sC = parseFloat(sbcC);
  const sAlpha = parseFloat(sbcAlpha);
  const sFos = parseFloat(sbcFos);
  const sHt = parseFloat(sbcHt);
  const sWL = parseFloat(sbcWL);
  // sP is derived from Part 1 qs — declared after qs_p1 below

  const hasB_raw = !isNaN(sB_raw) && sbcB !== '';
  const sB = hasB_raw ? sB_raw : null;
  const sL = (() => {
    if (sB === null) return null;
    switch (sbcShape) {
      case 'square':
        return sB;
      case 'circle':
        return sB;
      case 'strip':
        return 100 * sB;
      default:
        return !isNaN(sL_raw) && sbcL !== '' ? sL_raw : null;
    }
  })();
  const hasD = !isNaN(sD) && sbcD !== '';
  const hasGamma = !isNaN(sGamma) && sbcGamma !== '';
  const hasN = !isNaN(sN) && sbcN !== '';
  const hasPhi = !isNaN(sPhi) && sbcPhi !== '';
  const hasC = !isNaN(sC) && sbcC !== '';
  const hasAlpha = !isNaN(sAlpha) && sbcAlpha !== '';
  const fosInRange = !isNaN(sFos) && sFos >= 2 && sFos <= 3;
  const fosOutOfRange = !isNaN(sFos) && sbcFos !== '' && (sFos < 2 || sFos > 3);
  const hasFos = !isNaN(sFos) && sbcFos !== '' && fosInRange;
  const hasHt = !isNaN(sHt) && sbcHt !== '';
  const hasWL = !isNaN(sWL) && sbcWL !== '' && sWL >= 10;
  const wlErr = sbcWL !== '' && !isNaN(sWL) && sWL < 10;
  const hasB = sB !== null;
  const hasL = sL !== null;

  // ── Derived: γsub, Df, q ──────────────────────────────────────────
  const gammaSub = hasGamma ? Math.max(0, sGamma - 10) : null;
  const sDf = hasD ? Math.max(0, sD - sDs) : null;
  const sQ = gammaSub !== null && sDf !== null ? gammaSub * sDf : null;
  const sW = sQ !== null && sQ > 200 ? 0.75 : W_CONST;

  // ── Overburden correction factor ──────────────────────────────────
  const obRows = (() => {
    const raw = settings?.['overburden_correction_data'];
    if (!raw) return [];
    try {
      const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  })();
  const obPoints = obRows
    .filter(
      (r) =>
        r.pressure !== '' &&
        r.correction !== '' &&
        !isNaN(parseFloat(r.pressure)) &&
        !isNaN(parseFloat(r.correction))
    )
    .map((r) => ({ x: parseFloat(r.pressure), y: parseFloat(r.correction) }))
    .sort((a, b) => a.x - b.x);
  const needsOB = sbcCorrectionType === 'overburden' || sbcCorrectionType === 'both';
  const sCF = needsOB && sQ !== null && obPoints.length >= 2 ? interpolateY(obPoints, sQ) : null;

  // ── Corrected NR ─────────────────────────────────────────────────
  const NR_raw = (() => {
    if (!hasN) return null;
    switch (sbcCorrectionType) {
      case 'none':
        return sN;
      case 'overburden':
        return sCF !== null ? sN * sCF : null;
      case 'dilatency':
        return (sN + 15) / 2;
      case 'both':
        return sCF !== null ? (sN * sCF + 15) / 2 : null;
      default:
        return sN;
    }
  })();
  const sNR = NR_raw !== null ? Math.min(60, Math.max(5, NR_raw)) : null;

  // ── Part 1: Shear Criteria ────────────────────────────────────────
  const phiPrime = hasPhi ? derivePhiPrime(sPhi) : null;
  const Nc = hasPhi ? interpolateY(ncPts, sPhi) : null;
  const Nq = hasPhi ? interpolateY(nqPts, sPhi) : null;
  const Ng = hasPhi ? interpolateY(ngPts, sPhi) : null;
  const NcP = hasPhi ? interpolateY(ncPts, phiPrime) : null;
  const NqP = hasPhi ? interpolateY(nqPts, phiPrime) : null;
  const NgP = hasPhi ? interpolateY(ngPts, phiPrime) : null;

  const ratio = hasB && hasL ? sB / sL : null;
  const Sc = (() => {
    if (sbcShape === 'square' || sbcShape === 'circle') return 1.3;
    return ratio !== null ? 1 + 0.2 * ratio : null;
  })();
  const Sq = (() => {
    if (sbcShape === 'square' || sbcShape === 'circle') return 1.2;
    return ratio !== null ? 1 + 0.2 * ratio : null;
  })();
  const Sg = (() => {
    if (sbcShape === 'square') return 0.8;
    if (sbcShape === 'circle') return 0.6;
    return ratio !== null ? 1 - 0.4 * ratio : null;
  })();

  const tanT = hasPhi && hasB && hasD ? Math.tan(((45 + sPhi / 2) * Math.PI) / 180) : null;
  const dfbR = hasB && hasD ? sD / sB : null;
  const dc_v = tanT !== null ? 1 + 0.2 * dfbR * tanT : null;
  const dqdg_v = tanT !== null ? (sPhi <= 10 ? 1 : 1 + 0.1 * dfbR * tanT) : null;
  const ic_v = hasAlpha ? Math.pow(1 - sAlpha / 90, 2) : null;
  const iq_v = hasAlpha ? Math.pow(1 - sAlpha / 90, 2) : null;
  const ig_v = hasAlpha && hasPhi && sPhi !== 0 ? Math.pow(1 - sAlpha / sPhi, 2) : null;

  const allP1 =
    hasPhi &&
    hasB &&
    hasL &&
    hasD &&
    hasAlpha &&
    hasC &&
    sQ !== null &&
    hasGamma &&
    Nc !== null &&
    Nq !== null &&
    Ng !== null &&
    NcP !== null &&
    NqP !== null &&
    NgP !== null &&
    Sc !== null &&
    Sq !== null &&
    Sg !== null &&
    dc_v !== null &&
    dqdg_v !== null &&
    ic_v !== null &&
    iq_v !== null &&
    ig_v !== null;

  const p1LocalTerm1 = allP1 ? (2 / 3) * sC * NcP * Sc * dc_v * ic_v : null;
  const p1LocalTerm2 = allP1 ? sQ * (NqP - 1) * Sq * dqdg_v * iq_v : null;
  const p1LocalTerm3 = allP1 ? 0.5 * sGamma * sB * NgP * Sg * dqdg_v * ig_v * sW : null;
  const qdLocal = allP1 ? p1LocalTerm1 + p1LocalTerm2 + p1LocalTerm3 : null;
  const p1GenTerm1 = allP1 ? sC * Nc * Sc * dc_v * ic_v : null;
  const p1GenTerm2 = allP1 ? sQ * (Nq - 1) * Sq * dqdg_v * iq_v : null;
  const p1GenTerm3 = allP1 ? 0.5 * sGamma * sB * Ng * Sg * dqdg_v * ig_v * sW : null;
  const qdGeneral = allP1 ? p1GenTerm1 + p1GenTerm2 + p1GenTerm3 : null;
  const qdIntermed = allP1 ? 0.5 * (qdLocal + qdGeneral) : null;

  const regime = hasPhi ? (sPhi <= 28 ? 'local' : sPhi >= 36 ? 'general' : 'intermediate') : null;
  const qd =
    regime === 'local'
      ? qdLocal
      : regime === 'general'
        ? qdGeneral
        : regime === 'intermediate'
          ? qdIntermed
          : null;
  const qs_p1 = qd !== null && hasFos ? qd / sFos : null;

  // P (pressure from imposed load) is taken directly from Part 1 qs
  const sP = qs_p1;
  const hasP = sP !== null;

  // ── Part 2: Settlement Criteria ───────────────────────────────────
  const computeSfSBC = (n, b) => {
    if (isNaN(n) || isNaN(b) || n <= 0 || b <= 0) return null;
    const bC = Math.min(b, FOOTING_WIDTHS[FOOTING_WIDTHS.length - 1]);
    let bLi = FOOTING_WIDTHS.length - 2;
    for (let i = 0; i < FOOTING_WIDTHS.length - 1; i++) {
      if (bC >= FOOTING_WIDTHS[i] && bC <= FOOTING_WIDTHS[i + 1]) {
        bLi = i;
        break;
      }
    }
    const bHi = Math.min(bLi + 1, FOOTING_WIDTHS.length - 1);
    const b0 = FOOTING_WIDTHS[bLi],
      b1 = FOOTING_WIDTHS[bHi];
    const nRows = SETTLEMENT_DATA.map((r) => r.n);
    let nLi = 0;
    for (let i = 0; i < nRows.length - 1; i++) {
      if (n >= nRows[i] && n <= nRows[i + 1]) {
        nLi = i;
        break;
      }
    }
    if (n <= nRows[0]) nLi = 0;
    if (n >= nRows[nRows.length - 1]) nLi = nRows.length - 2;
    const nHi = Math.min(nLi + 1, nRows.length - 1);
    const v00 = SETTLEMENT_DATA[nLi].vals[bLi],
      v01 = SETTLEMENT_DATA[nLi].vals[bHi];
    const v10 = SETTLEMENT_DATA[nHi].vals[bLi],
      v11 = SETTLEMENT_DATA[nHi].vals[bHi];
    const r0 =
      v00 !== null && v01 !== null && b0 !== b1
        ? v00 + ((bC - b0) / (b1 - b0)) * (v01 - v00)
        : (v00 ?? v01);
    const r1 =
      v10 !== null && v11 !== null && b0 !== b1
        ? v10 + ((bC - b0) / (b1 - b0)) * (v11 - v10)
        : (v10 ?? v11);
    if (r0 === null || r1 === null) return null;
    const n0 = nRows[nLi],
      n1 = nRows[nHi];
    return n0 === n1 ? r0 : r0 + ((n - n0) / (n1 - n0)) * (r1 - r0);
  };
  const interpFoxSBC = (ds, dr) => {
    const pts = [...ds.data].sort((a, b) => a.y - b.y);
    if (!pts.length) return null;
    if (dr <= pts[0].y) return pts[0].x;
    if (dr >= pts[pts.length - 1].y) return pts[pts.length - 1].x;
    for (let i = 0; i < pts.length - 1; i++) {
      if (dr >= pts[i].y && dr <= pts[i + 1].y) {
        const t = (dr - pts[i].y) / (pts[i + 1].y - pts[i].y);
        return pts[i].x + t * (pts[i + 1].x - pts[i].x);
      }
    }
    return null;
  };
  const computeIfSBC = (D, L, B) => {
    if (isNaN(D) || isNaN(L) || isNaN(B) || L <= 0 || B <= 0) return null;
    const sqrtLB = Math.sqrt(L * B);
    if (sqrtLB === 0) return null;
    const dr = Math.min(D / sqrtLB, 2.0);
    const lbR = Math.max(1, Math.min(100, L / B));
    const lbVals = [1, 9, 25, 100];
    let lo = lbVals.length - 2;
    for (let i = 0; i < lbVals.length - 1; i++) {
      if (lbR >= lbVals[i] && lbR <= lbVals[i + 1]) {
        lo = i;
        break;
      }
    }
    const hi = Math.min(lo + 1, lbVals.length - 1);
    const ifLo = interpFoxSBC(FOX_DATASETS[lo], dr);
    const ifHi = interpFoxSBC(FOX_DATASETS[hi], dr);
    if (ifLo === null || ifHi === null) return null;
    const t = (lbR - lbVals[lo]) / (lbVals[hi] - lbVals[lo]);
    return ifLo + t * (ifHi - ifLo);
  };

  const sSf = sNR !== null && hasB ? computeSfSBC(sNR, sB) : null;
  const sIf = hasD && hasL && hasB ? computeIfSBC(sD, sL, sB) : null;
  const sSi = sSf !== null && sIf !== null ? sSf * sIf * RIGIDITY_FACTOR : null; // m (× 1000 = mm)
  const sSi_mm = sSi !== null ? sSi * 1000 : null;
  const allowS_mm = ALLOWABLE_SETTLEMENT[sbcFootingType];
  const qa_kgcm2 = sSi !== null && sSi > 0 ? allowS_mm / (sSi * 1000) : null;
  const qa_kNm2 = qa_kgcm2 !== null ? qa_kgcm2 * 98.1 : null;

  // ── Part 3: Consolidation Settlement ─────────────────────────────
  const sCc = hasWL ? 0.009 * (sWL - 10) : null;
  const sPo = gammaSub !== null && hasD && hasHt ? gammaSub * (sD + sHt / 2) : null;
  const sA = hasB && hasL ? sB * sL : null;
  const sBo = hasB && hasHt ? sB + 2 * (sHt / 4) : null;
  const sLo = hasL && hasHt ? sL + 2 * (sHt / 4) : null;
  const sAo = sBo !== null && sLo !== null ? sBo * sLo : null;
  const sdP = hasP && sA !== null && sAo !== null && sAo > 0 ? (sP * sA) / sAo : null;
  const sScon =
    sCc !== null && sPo !== null && sdP !== null && sHt > 0 && sPo > 0
      ? (sHt / (1 + EO)) * sCc * Math.log10((sPo + sdP) / sPo) * 1000
      : null;
  const sStot = sScon !== null && sIf !== null ? sScon * sIf * RIGIDITY_FACTOR : null;
  const sSfinal = sStot !== null && sSi_mm !== null ? sStot + sSi_mm : null;
  const sqSafe = sSfinal !== null && sSfinal > 0 && hasP ? (sP / sSfinal) * 25 : null;

  const isClay = soilTypeInput === 'clay';
  const shearSBC = qs_p1;
  const settlementSBC = isClay ? sqSafe : qa_kNm2;
  const recommended =
    shearSBC !== null && settlementSBC !== null ? 0.85 * Math.min(shearSBC, settlementSBC) : null;

  return {
    computedQs: qs_p1,
    computedQa: qa_kNm2,
    computedQsafe: sqSafe,
    computedRecommendedSbc: recommended,
  };
};

export const computeRockSbcValues = (value) => {
  if (!value)
    return {
      computedQs: null,
      computedQa: null,
      computedQsafe: null,
      computedRecommendedSbc: null,
    };
  const {
    rockTypeNj = '0.40',
    cw = '0.5',
    cj = '0.5',
    widthB = '',
    lengthL = '',
    qc = '',
    pli = '',
    usePli = false,
    rmrUCS = '12',
    rmrRQD = '17',
    rmrSpacing = '15',
    rmrCondition = '25',
    rmrGW = '15',
    rmrJoint = '0',
    designSbcMethod = 'least',
  } = value;

  const nj = parseFloat(rockTypeNj) || 0.4;
  const cwVal = parseFloat(cw) || 0.5;
  const cjVal = parseFloat(cj) || 0.5;

  let computedQc = 0;
  if (usePli) {
    computedQc = 22 * (parseFloat(pli) || 0);
  } else {
    computedQc = parseFloat(qc) || 0;
  }

  const qsNmm2 = computedQc * nj * cwVal * cjVal;
  const qsKnm2 = qsNmm2 * 1000;
  const designSbp = Math.floor((qsKnm2 * 0.85) / 10) * 10;

  const totalRMR =
    (parseFloat(rmrUCS) || 0) +
    (parseFloat(rmrRQD) || 0) +
    (parseFloat(rmrSpacing) || 0) +
    (parseFloat(rmrCondition) || 0) +
    (parseFloat(rmrGW) || 0) +
    (parseFloat(rmrJoint) || 0);

  const getQnbFromRmr = (rmr) => {
    const score = Math.max(0, Math.min(100, rmr));
    if (score >= 81) return 448 + ((score - 81) / 19) * 152;
    if (score >= 61) return 288 + ((score - 61) / 19) * 152;
    if (score >= 41) return 141 + ((score - 41) / 19) * 139;
    if (score >= 21) return 48 + ((score - 21) / 19) * 87;
    return 30 + (score / 20) * 15;
  };
  const qnb_kn_m2 = getQnbFromRmr(totalRMR) * 9.81;

  let recommendedSbc = 0;
  if (designSbcMethod === 'method1') recommendedSbc = designSbp;
  else if (designSbcMethod === 'method2') recommendedSbc = qnb_kn_m2;
  else recommendedSbc = Math.min(designSbp, qnb_kn_m2);

  return {
    computedQs: designSbp,
    computedQa: qnb_kn_m2,
    computedQsafe: null,
    computedRecommendedSbc: recommendedSbc,
  };
};
