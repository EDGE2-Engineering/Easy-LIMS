import React, { useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  Calculator,
  Save,
  Search,
  Table as TableIcon,
} from 'lucide-react';
import FoundationCrossSectionVisualisation from './FoundationCrossSectionVisualisation';
import { useSettings } from '@/contexts/SettingsContext';

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

const SbcStateUpdater = ({
  value,
  onChange,
  computedQs,
  computedQa,
  computedQsafe,
  computedRecommendedSbc,
}) => {
  useEffect(() => {
    if (
      value.computedQs !== computedQs ||
      value.computedQa !== computedQa ||
      value.computedQsafe !== computedQsafe ||
      value.computedRecommendedSbc !== computedRecommendedSbc
    ) {
      const timer = setTimeout(() => {
        onChange({
          ...value,
          computedQs,
          computedQa,
          computedQsafe,
          computedRecommendedSbc,
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [computedQs, computedQa, computedQsafe, computedRecommendedSbc, value, onChange]);
  return null;
};

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

const SbcInputRow = ({
  label,
  symbol,
  unit,
  value,
  onChange,
  placeholder,
  readOnly,
  note,
  error,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-gray-500 leading-tight">
      {label}
      {symbol && <span className="ml-1 font-bold text-gray-700"> — {symbol}</span>}
      {unit && <span className="ml-1 text-[10px] text-gray-400">({unit})</span>}
    </label>
    <Input
      type="number"
      step="any"
      min="0"
      value={value}
      onChange={(e) => !readOnly && onChange(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full text-center rounded-xl h-9 text-sm font-mono ${readOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''} ${error ? 'border-red-400 bg-red-50' : ''}`}
    />
    {error && <p className="text-[10px] text-red-500">{error}</p>}
    {note && <p className="text-[10px] text-gray-400 italic">{note}</p>}
  </div>
);

const SbcResult = ({ label, symbol, unit, value, formula, highlight }) => (
  <div
    className={`rounded-xl border p-3 flex flex-col gap-0.5 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100'}`}
  >
    <p className="text-[10px] text-gray-400 leading-tight">
      {label}
      {symbol && (
        <>
          <span> — </span>
          <span className="font-bold text-gray-600">{symbol}</span>
        </>
      )}
      {unit && <span className="ml-1 text-gray-400">({unit})</span>}
    </p>
    {formula && <p className="text-[9px] text-gray-400 font-mono italic">{formula}</p>}
    <p
      className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${highlight ? 'text-primary' : value !== '—' ? 'text-gray-800' : 'text-gray-300'}`}
    >
      {value}
    </p>
  </div>
);

const fmtDec = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  if (v === 0) return '0';
  const absV = Math.abs(v);
  const places = Math.max(0, 6 - Math.floor(Math.log10(absV)) - 1);
  return parseFloat(v.toFixed(places)).toString();
};

export default function GeotechSoilSbcDetails({ value = {}, onChange }) {
  const { settings } = useSettings();

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

  const fmtV = (v, d = 4) => (v !== null && !isNaN(v) ? v.toFixed(d) : '—');
  const fmt = (v) => (v !== null && !isNaN(v) ? fmtDec(v) : '—');

  const regimeLabel = {
    local: 'Local Shear (φ ≤ 28°)',
    intermediate: 'Intermediate (28° < φ < 36°)',
    general: 'General Shear (φ ≥ 36°)',
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-sm p-6 space-y-6">
      {/* ── Common Inputs ── */}
      <div className="space-y-0">
        {/* <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                Common Inputs
              </h3> */}

        {/* Shape + Soil Type selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Shape of Footing</label>
            <Select value={sbcShape} onValueChange={setSbcShape}>
              <SelectTrigger className="rounded-xl h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="circle">Circle</SelectItem>
                <SelectItem value="strip">Strip</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Type of Soil</label>
            <Select value={soilTypeInput} onValueChange={setSoilTypeInput}>
              <SelectTrigger className="rounded-xl h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clay">Clay</SelectItem>
                <SelectItem value="aggregate-coarse">Aggregate (Coarse)</SelectItem>
                <SelectItem value="aggregate-fine">Aggregate (Fine)</SelectItem>
                <SelectItem value="cement">Cement</SelectItem>
                <SelectItem value="concrete">Concrete</SelectItem>
                <SelectItem value="soil">Soil</SelectItem>
                <SelectItem value="rock">Rock</SelectItem>
                <SelectItem value="bitumen">Bitumen</SelectItem>
                <SelectItem value="steel">Steel</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="tiles">Tiles</SelectItem>
                <SelectItem value="bricks">Bricks</SelectItem>
                <SelectItem value="soil-and-rock">Soil and Rock</SelectItem>
                <SelectItem value="sand">Sand</SelectItem>
                <SelectItem value="silt">Silt</SelectItem>
                <SelectItem value="gravel">Gravel</SelectItem>
                <SelectItem value="weathered-rock">Weathered Rock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SbcInputRow
            label="Width / Diameter"
            symbol="B"
            unit="m"
            value={sbcB}
            onChange={setSbcB}
            placeholder="e.g. 2.0"
          />
          {sbcShape === 'rectangle' && (
            <SbcInputRow
              label="Length"
              symbol="L"
              unit="m"
              value={sbcL}
              onChange={setSbcL}
              placeholder="e.g. 3.0"
            />
          )}
          {(sbcShape === 'square' || sbcShape === 'circle') && (
            <SbcInputRow
              label="Length (= B)"
              symbol="L"
              unit="m"
              value={sbcB}
              readOnly
              placeholder="same as B"
            />
          )}
          {sbcShape === 'strip' && (
            <SbcInputRow
              label="Length (= 100B)"
              symbol="L"
              unit="m"
              value={hasB ? fmtDec(sB * 100) : ''}
              readOnly
              placeholder="= 100 × B"
            />
          )}
          <SbcInputRow
            label="Depth of Foundation"
            symbol="D"
            unit="m"
            value={sbcD}
            onChange={setSbcD}
            placeholder="e.g. 1.5"
          />
          <SbcInputRow
            label="Scour Depth"
            symbol="ds"
            unit="m"
            value={sbcDs}
            onChange={setSbcDs}
            placeholder="0 if none"
            note="Defaults to 0 if blank"
          />
          <SbcInputRow
            label="Bulk Unit Weight"
            symbol="γ"
            unit="kN/m³"
            value={sbcGamma}
            onChange={setSbcGamma}
            placeholder="e.g. 18"
          />
        </div>

        {/* Computed: γsub, Df, q */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex flex-col gap-0.5">
            <p className="text-[10px] text-gray-400">
              Effective Unit Weight — γ<sub>sub</sub> (kN/m³)
            </p>
            <p className="text-sm font-bold font-mono text-primary tabular-nums">
              {gammaSub !== null ? fmtDec(gammaSub) : '—'}
            </p>
            {gammaSub !== null && (
              <p className="text-[9px] text-gray-400 italic">γ − 10 = {sbcGamma} − 10</p>
            )}
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex flex-col gap-0.5">
            <p className="text-[10px] text-gray-400">Depth below scour — Df (m)</p>
            <p className="text-sm font-bold font-mono text-primary tabular-nums">
              {sDf !== null ? fmtDec(sDf) : '—'}
            </p>
            {sDf !== null && (
              <p className="text-[9px] text-gray-400 italic">
                D − ds = {sbcD} − {sDs}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex flex-col gap-0.5">
            <p className="text-[10px] text-gray-400">Eff. Overburden Pressure — q (kN/m²)</p>
            <p className="text-sm font-bold font-mono text-primary tabular-nums">
              {sQ !== null ? fmtDec(sQ) : '—'}
            </p>
            {sQ !== null && <p className="text-[9px] text-gray-400 italic">γsub × Df</p>}
          </div>
        </div>
      </div>

      {/* ── Part 1 Specific Inputs ── */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
          Part 1 — Shear Criteria Inputs
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SbcInputRow
            label="Angle of Friction"
            symbol="φ"
            unit="°"
            value={sbcPhi}
            onChange={setSbcPhi}
            placeholder="e.g. 30"
          />
          <SbcInputRow
            label="Cohesion"
            symbol="c"
            unit="kN/m²"
            value={sbcC}
            onChange={setSbcC}
            placeholder="e.g. 20"
          />
          <SbcInputRow
            label="Inclination Angle"
            symbol="α"
            unit="°"
            value={sbcAlpha}
            onChange={setSbcAlpha}
            placeholder="e.g. 0"
          />
          <SbcInputRow
            label="Factor of Safety"
            symbol="FOS"
            unit="-"
            value={sbcFos}
            onChange={setSbcFos}
            placeholder="e.g. 3"
            error={fosOutOfRange ? 'FOS must be between 2.0 and 3.0' : null}
          />
        </div>
      </div>

      {/* ── Part 2 Specific Inputs ── */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
          Part 2 — Settlement Criteria Inputs
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">SPT Correction</label>
            <Select value={sbcCorrectionType} onValueChange={setSbcCorrectionType}>
              <SelectTrigger className="rounded-xl h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="overburden">Overburden only</SelectItem>
                <SelectItem value="dilatency">Dilatency only</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Footing Type</label>
            <Select value={sbcFootingType} onValueChange={setSbcFootingType}>
              <SelectTrigger className="rounded-xl h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="isolated">Isolated (25 mm)</SelectItem>
                <SelectItem value="raft">Raft (50 mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SbcInputRow
            label="Field SPT N-value"
            symbol="N"
            unit="-"
            value={sbcN}
            onChange={setSbcN}
            placeholder="e.g. 20"
          />
        </div>
      </div>

      {/* ── Part 3 Specific Inputs ── */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
          Part 3 — Consolidation Settlement Inputs
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SbcInputRow
            label="Pressure from Imposed Load (from Part 1 qs)"
            symbol="P"
            unit="kN/m²"
            value={qs_p1 !== null ? fmtV(qs_p1, 2) : ''}
            onChange={() => {}}
            readOnly
            placeholder="— computed from Part 1"
            note={qs_p1 === null ? 'Enter φ, c, α, FOS in Part 1 to derive qs' : null}
          />
          <SbcInputRow
            label="Height of Compressible Layer"
            symbol="Ht"
            unit="m"
            value={sbcHt}
            onChange={setSbcHt}
            placeholder="e.g. 4.0"
          />
          <SbcInputRow
            label="Liquid Limit"
            symbol="WL"
            unit="%"
            value={sbcWL}
            onChange={setSbcWL}
            placeholder="e.g. 45"
            error={wlErr ? 'WL must be ≥ 10%' : null}
          />
        </div>
      </div>

      {/* ════════════════════════ RESULTS ════════════════════════ */}

      {/* ── Part 1 Results ── */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">
          Part 1 — Shear Criteria Results
        </h3>

        {allP1 ? (
          <>
            {hasPhi && (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                  regime === 'local'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : regime === 'general'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}
              >
                {regimeLabel[regime]}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(regime === 'local' || regime === 'intermediate') && (
                <SbcResult
                  label="Ultimate BC (Local)"
                  symbol="qd_local"
                  unit="kN/m²"
                  value={fmtV(qdLocal, 2)}
                  formula="(2/3)·c·N′c·Sc·dc·ic + …"
                  highlight={regime === 'local'}
                />
              )}
              {(regime === 'general' || regime === 'intermediate') && (
                <SbcResult
                  label="Ultimate BC (General)"
                  symbol="qd_general"
                  unit="kN/m²"
                  value={fmtV(qdGeneral, 2)}
                  formula="c·Nc·Sc·dc·ic + …"
                  highlight={regime === 'general'}
                />
              )}
              {regime === 'intermediate' && (
                <SbcResult
                  label="Ultimate BC (Intermediate)"
                  symbol="qd"
                  unit="kN/m²"
                  value={fmtV(qdIntermed, 2)}
                  formula="½ × (qd_local + qd_general)"
                  highlight
                />
              )}
              <SbcResult
                label="Safe Bearing Capacity"
                symbol="qs"
                unit="kN/m²"
                value={hasFos ? fmtV(qs_p1, 2) : '— (enter FOS)'}
                formula={hasFos ? `qd / FOS = ${fmtV(qd, 2)} / ${sFos}` : 'qd / FOS'}
                highlight={hasFos}
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600 whitespace-pre-line leading-relaxed">
              {[
                `φ = ${sbcPhi}°  →  φ′ = ${fmt(phiPrime)}°  |  Regime: ${regimeLabel[regime]}`,
                `Shape factors:  Sc = ${fmt(Sc)},  Sq = ${fmt(Sq)},  Sγ = ${fmt(Sg)}`,
                `Depth factors:  dc = ${fmt(dc_v)},  dq = dγ = ${fmt(dqdg_v)}`,
                `Inclin. factors: ic = ${fmt(ic_v)},  iq = ${fmt(iq_v)},  iγ = ${fmt(ig_v)}`,
                `W′ = ${sW}${sQ !== null && sQ > 200 ? ' (capped, q > 200 kN/m²)' : ''}`,
                '',
                regime === 'local' || regime === 'intermediate'
                  ? `qd_local  = (2/3)×${fmt(sC)}×${fmt(NcP)}×${fmt(Sc)}×${fmt(dc_v)}×${fmt(ic_v)}\n          + ${fmt(sQ)}×(${fmt(NqP)}−1)×${fmt(Sq)}×${fmt(dqdg_v)}×${fmt(iq_v)}\n          + 0.5×${fmt(sGamma)}×${fmt(sB)}×${fmt(NgP)}×${fmt(Sg)}×${fmt(dqdg_v)}×${fmt(ig_v)}×${sW}\n          = ${fmtV(qdLocal, 2)} kN/m²`
                  : '',
                regime === 'general' || regime === 'intermediate'
                  ? `qd_general = ${fmt(sC)}×${fmt(Nc)}×${fmt(Sc)}×${fmt(dc_v)}×${fmt(ic_v)}\n           + ${fmt(sQ)}×(${fmt(Nq)}−1)×${fmt(Sq)}×${fmt(dqdg_v)}×${fmt(iq_v)}\n           + 0.5×${fmt(sGamma)}×${fmt(sB)}×${fmt(Ng)}×${fmt(Sg)}×${fmt(dqdg_v)}×${fmt(ig_v)}×${sW}\n           = ${fmtV(qdGeneral, 2)} kN/m²`
                  : '',
                regime === 'intermediate'
                  ? `qd_intermed = ½ × (${fmtV(qdLocal, 2)} + ${fmtV(qdGeneral, 2)}) = ${fmtV(qdIntermed, 2)} kN/m²`
                  : '',
                hasFos ? `qs = ${fmtV(qd, 2)} / ${sFos} = ${fmtV(qs_p1, 2)} kN/m²` : '',
              ]
                .filter(Boolean)
                .join('\n')}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400 italic py-2">
            Fill φ, c, α, FOS (plus B, L, D, γ from Common Inputs) to compute shear criteria.
          </p>
        )}
      </div>

      {/* ── Part 2 Results ── */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">
          Part 2 — Settlement Criteria Results
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SbcResult
            label="Corrected SPT"
            symbol="NR"
            unit="-"
            value={sNR !== null ? fmt(sNR) : '—'}
            formula={
              sbcCorrectionType === 'none'
                ? 'N (uncorrected)'
                : sbcCorrectionType === 'overburden'
                  ? 'N × CF'
                  : sbcCorrectionType === 'dilatency'
                    ? '(N+15)/2'
                    : '(N×CF+15)/2'
            }
          />
          <SbcResult
            label="Settlement per unit pressure"
            symbol="Sf"
            unit="m/(kg/cm²)"
            value={sSf !== null ? fmtDec(sSf) : '—'}
            formula="Bilinear interp. (NR × B table)"
          />
          <SbcResult
            label="Fox's Correction"
            symbol="If"
            unit="-"
            value={sIf !== null ? fmtV(sIf, 4) : '—'}
            formula="Interp. on D/√LB, L/B"
          />
          <SbcResult
            label="Immediate Settlement"
            symbol="Si"
            unit="mm"
            value={sSi_mm !== null ? fmtV(sSi_mm, 4) : '—'}
            formula="Sf × If × Rf × 1000"
          />
          <SbcResult
            label={`Allowable BC (${sbcFootingType}, ${allowS_mm} mm)`}
            symbol="qa"
            unit="kN/m²"
            value={qa_kNm2 !== null ? fmtV(qa_kNm2, 2) : '—'}
            formula={`${allowS_mm} / (Si × 1000) × 98.1`}
            highlight={qa_kNm2 !== null}
          />
        </div>
        {sNR !== null && hasB && hasD && hasL && (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600 whitespace-pre-line leading-relaxed">
            {[
              `N = ${sbcN}  →  NR = ${fmt(sNR)} (clamped [5,60])`,
              `Sf = ${sSf !== null ? fmtDec(sSf) : 'NA'}  (settlement per unit pressure, m/(kg/cm²))`,
              `If = ${sIf !== null ? fmtV(sIf, 4) : 'NA'}  (Fox's depth correction)`,
              `Si = Sf × If × Rf = ${sSf !== null ? fmtDec(sSf) : '?'} × ${sIf !== null ? fmtV(sIf, 4) : '?'} × ${RIGIDITY_FACTOR} = ${sSi !== null ? fmtV(sSi, 6) : 'NA'} m  (${sSi_mm !== null ? fmtV(sSi_mm, 4) : 'NA'} mm)`,
              qa_kgcm2 !== null
                ? `qa = ${allowS_mm} / (${sSi !== null ? fmtV(sSi, 6) : '?'} × 1000) = ${fmtV(qa_kgcm2, 4)} kg/cm²  →  ${fmtV(qa_kNm2, 2)} kN/m²`
                : '',
            ]
              .filter(Boolean)
              .join('\n')}
          </div>
        )}
      </div>

      {/* ── Part 3 Results ── */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">
          Part 3 — Consolidation Settlement Results
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SbcResult
            label="Compression Index"
            symbol="Cc"
            unit="-"
            value={sCc !== null ? fmt(sCc) : '—'}
            formula="0.009 × (WL − 10)"
          />
          <SbcResult
            label="Initial Overburden Pressure"
            symbol="Po"
            unit="kN/m²"
            value={sPo !== null ? fmt(sPo) : '—'}
            formula="γsub × (D + Ht/2)"
          />
          <SbcResult
            label="Area of Footing"
            symbol="A"
            unit="m²"
            value={sA !== null ? fmt(sA) : '—'}
            formula="B × L"
          />
          <SbcResult
            label="Width of Spread"
            symbol="Bo"
            unit="m"
            value={sBo !== null ? fmt(sBo) : '—'}
            formula="B + 2×(Ht/4)"
          />
          <SbcResult
            label="Length of Spread"
            symbol="Lo"
            unit="m"
            value={sLo !== null ? fmt(sLo) : '—'}
            formula="L + 2×(Ht/4)"
          />
          <SbcResult
            label="Area of Spread"
            symbol="Ao"
            unit="m²"
            value={sAo !== null ? fmt(sAo) : '—'}
            formula="Bo × Lo"
          />
          <SbcResult
            label="Pressure Intensity at Midlayer"
            symbol="ΔP"
            unit="kN/m²"
            value={sdP !== null ? fmt(sdP) : '—'}
            formula="(P × A) / Ao"
          />
          <SbcResult
            label="Consolidation Settlement"
            symbol="Scon"
            unit="mm"
            value={sScon !== null ? fmtV(sScon, 4) : '—'}
            formula="(Ht/(1+e₀)) × Cc × log₁₀((Po+ΔP)/Po)"
          />
          <SbcResult
            label="Total Consolidation Settlement"
            symbol="Stot"
            unit="mm"
            value={sStot !== null ? fmtV(sStot, 4) : '—'}
            formula="Scon × If × Rf"
          />
          <SbcResult
            label="Immediate Settlement (Si)"
            symbol="Si"
            unit="mm"
            value={sSi_mm !== null ? fmtV(sSi_mm, 4) : '—'}
            formula="from Part 2"
          />
          <SbcResult
            label="Final Settlement"
            symbol="Sfinal"
            unit="mm"
            value={sSfinal !== null ? fmtV(sSfinal, 4) : '—'}
            formula="Stot + Si"
            highlight={sSfinal !== null}
          />
        </div>

        {/* Safe Bearing Pressure prominent card */}
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex flex-col gap-1 mt-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Safe Bearing Pressure for 25 mm settlement — q<sub>safe</sub>
          </p>
          <p className="text-xs font-mono text-gray-500 mt-0.5">
            q<sub>safe</sub> = (P / S<sub>final</sub>) × 25
            {hasP && sSfinal !== null && (
              <>
                {' '}
                = ({fmtV(sP, 2)} / {fmt(sSfinal)}) × 25
              </>
            )}
          </p>
          <p className="text-2xl font-black font-mono tabular-nums mt-1 text-primary">
            {sqSafe !== null ? fmt(sqSafe) : '—'}
            {sqSafe !== null && (
              <span className="text-sm font-normal text-gray-400 ml-2">kN/m²</span>
            )}
          </p>
        </div>

        {sScon !== null && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
              Step-by-step computation (Part 3)
            </h4>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600 whitespace-pre-line leading-relaxed">
              {[
                `Constants: e₀ = ${EO},  Rf = ${RIGIDITY_FACTOR}`,
                `If = ${sIf !== null ? fmtV(sIf, 4) : 'NA'},  Si = ${sSi_mm !== null ? fmtV(sSi_mm, 4) : 'NA'} mm,  γsub = ${gammaSub !== null ? fmt(gammaSub) : 'NA'} kN/m³`,
                '',
                `Cc = 0.009 × (WL − 10) = 0.009 × (${sbcWL} − 10) = ${fmt(sCc)}`,
                `Po = γsub × (D + Ht/2) = ${fmt(gammaSub)} × (${sbcD} + ${sbcHt}/2) = ${fmt(sPo)} kN/m²`,
                `A  = B × L = ${sbcB} × ${sL !== null ? fmt(sL) : '?'} = ${fmt(sA)} m²`,
                `Bo = B + 2×(Ht/4) = ${sbcB} + ${sHt > 0 ? fmt(sHt / 2) : '?'} = ${fmt(sBo)} m`,
                `Lo = L + 2×(Ht/4) = ${sL !== null ? fmt(sL) : '?'} + ${sHt > 0 ? fmt(sHt / 2) : '?'} = ${fmt(sLo)} m`,
                `Ao = Bo × Lo = ${fmt(sBo)} × ${fmt(sLo)} = ${fmt(sAo)} m²`,
                `ΔP = (P × A) / Ao = (${fmtV(sP, 2)} × ${fmt(sA)}) / ${fmt(sAo)} = ${fmt(sdP)} kN/m²`,
                '',
                `Scon = (Ht/(1+e₀)) × Cc × log₁₀((Po+ΔP)/Po)`,
                `     = (${sbcHt}/(1+${EO})) × ${fmt(sCc)} × log₁₀((${fmt(sPo)} + ${fmt(sdP)}) / ${fmt(sPo)})`,
                `     = ${sScon !== null ? fmtV(sScon, 4) : 'NA'} mm`,
                '',
                `Stot   = Scon × If × Rf = ${sScon !== null ? fmtV(sScon, 4) : '?'} × ${sIf !== null ? fmtV(sIf, 4) : '?'} × ${RIGIDITY_FACTOR} = ${sStot !== null ? fmtV(sStot, 4) : 'NA'} mm`,
                `Sfinal = Stot + Si = ${sStot !== null ? fmtV(sStot, 4) : '?'} + ${sSi_mm !== null ? fmtV(sSi_mm, 4) : '?'} = ${sSfinal !== null ? fmtV(sSfinal, 4) : 'NA'} mm`,
                sqSafe !== null
                  ? `q_safe = (P / Sfinal) × 25 = (${fmtV(sP, 2)} / ${fmt(sSfinal)}) × 25 = ${fmt(sqSafe)} kN/m²`
                  : '',
              ]
                .filter((l) => l !== undefined)
                .join('\n')}
            </div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
        <p>All three parts share B, L, D, γ, shape, and ds from Common Inputs above.</p>
        <p>
          Part 1 additionally needs: φ, c, α, FOS (2.0–3.0) · Part 2: N, correction type, footing
          type · Part 3: P, Ht, WL
        </p>
        <p>e₀ = 0.8 (constant) · Rf = 0.8 (constant) · Cc = 0.009 × (WL − 10) (WL ≥ 10%)</p>
      </div>

      {/* ── Recommended Design SBC ── */}
      {(() => {
        const isClay = soilTypeInput === 'clay';

        // Part 1: SBC based on shear criteria
        const shearSBC = qs_p1; // kN/m²

        // Part 2/3: SBC based on settlement criteria
        // For clay: use sqSafe (Part 3 — consolidation settlement governs)
        // For non-clay: use qa_kNm2 (Part 2 — immediate settlement only)
        const settlementSBC = isClay ? sqSafe : qa_kNm2;

        // Recommended = 85% of the lesser of the two
        const recommended =
          shearSBC !== null && settlementSBC !== null
            ? 0.85 * Math.min(shearSBC, settlementSBC)
            : null;

        const fmtSBC = (v) => (v !== null && !isNaN(v) ? `${v.toFixed(2)} kN/m²` : '—');

        const ValueCell = ({ val, label, highlight }) => (
          <td
            className={`py-4 px-4 text-center border-r border-gray-100 ${highlight ? 'bg-primary/5' : ''}`}
          >
            <span
              className={`block text-base font-black font-mono tabular-nums ${highlight ? 'text-primary' : val !== null ? 'text-gray-800' : 'text-gray-300'}`}
            >
              {fmtSBC(val)}
            </span>
            {label && <span className="block text-[10px] text-gray-400 mt-0.5">{label}</span>}
          </td>
        );

        return (
          <div className="mt-6 rounded-xl border border-gray-100 overflow-hidden">
            <SbcStateUpdater
              value={value}
              onChange={onChange}
              computedQs={qs_p1}
              computedQa={qa_kNm2}
              computedQsafe={sqSafe}
              computedRecommendedSbc={recommended}
            />
            <div className="px-4 pt-3 pb-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Recommended Design SBC — IS 6403
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Soil type:{' '}
                <strong className="text-gray-600">
                  {isClay ? 'Clay' : 'Any soil other than clay'}
                </strong>
                {' · '}Settlement criteria uses{' '}
                {isClay ? 'Part 3 (consolidation Sf)' : 'Part 2 (immediate Si only)'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-center py-2 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100">
                      <span className="block normal-case font-normal text-[9px] text-gray-400 mb-0.5">
                        SBC based on Shear Criteria
                      </span>
                      q<sub>s</sub> — Part 1
                    </th>
                    <th className="text-center py-2 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100">
                      <span className="block normal-case font-normal text-[9px] text-gray-400 mb-0.5">
                        SBC based on Settlement Criteria
                      </span>
                      q<sub>a</sub> — {isClay ? 'Part 3' : 'Part 2'}
                    </th>
                    <th className="text-center py-2 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100">
                      <span className="block normal-case font-normal text-[9px] text-gray-400 mb-0.5">
                        Lesser of SBC based on Shear Criteria & SBC based on Settlement Criteria
                      </span>
                      minimum(q<sub>s</sub>, q<sub>a</sub>)
                    </th>
                    <th className="text-center py-2 px-3 font-bold text-primary uppercase tracking-widest text-[10px] bg-primary/5">
                      <span className="block normal-case font-normal text-[9px] text-primary/70 mb-0.5">
                        85% × minimum(SBC based on Shear Criteria, SBC based on Settlement Criteria)
                      </span>
                      Recommended Design SBC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <ValueCell val={shearSBC} label="from Part 1 qs" />
                    <ValueCell
                      val={settlementSBC}
                      label={isClay ? 'from Part 3 qsafe' : 'from Part 2 qa'}
                    />
                    <ValueCell
                      val={
                        shearSBC !== null && settlementSBC !== null
                          ? Math.min(shearSBC, settlementSBC)
                          : null
                      }
                      label={
                        shearSBC !== null && settlementSBC !== null
                          ? shearSBC <= settlementSBC
                            ? 'shear governs'
                            : 'settlement governs'
                          : null
                      }
                    />
                    <td className="py-4 px-4 text-center bg-primary/5">
                      <span
                        className={`block text-xl font-black font-mono tabular-nums ${recommended !== null ? 'text-primary' : 'text-gray-300'}`}
                      >
                        {fmtSBC(recommended)}
                      </span>
                      <span className="block text-[10px] text-primary/70 mt-0.5 font-mono">
                        kN/m²
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Foundation Cross-Section Visualisation ── */}
            <FoundationCrossSectionVisualisation
                        data={value}
                        computed={{ qs_p1, settlementSBC, recommended, shearSBC }}
                        isRock={false}
                      />
          </div>
        );
      })()}
    </div>
  );
}
