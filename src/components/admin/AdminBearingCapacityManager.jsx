import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Save, Plus, Trash2, Loader2, Mountain, Gem } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AdminOverburdenCorrectionManager from './AdminOverburdenCorrectionManager';
import AdminUnitWeightsManager from './AdminUnitWeightsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminRockBearingCapacity from './AdminRockBearingCapacity';
import {
  Chart,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
  LineController,
} from 'chart.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

Chart.register(
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend,
  LineController
);

const SETTING_KEY = 'bearing_capacity_factors_data';

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

// ─── Theme helpers ────────────────────────────────────────────────────────────
const getCSSVar = (varName, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (raw && raw.includes(' ')) return `hsl(${raw})`;
  return raw || fallback;
};
const buildChartColors = () => ({
  primary: getCSSVar('--primary', '#1a6b3c'),
  foreground: getCSSVar('--foreground', '#1a1a1a'),
  muted: getCSSVar('--muted-foreground', '#6b7280'),
  border: getCSSVar('--border', '#e5e7eb'),
  card: getCSSVar('--card', '#ffffff'),
  blue: '#3b82f6',
  orange: '#f97316',
  teal: '#14b8a6',
  violet: '#8b5cf6',
  rose: '#f43f5e',
});

// ─── Crosshair plugin ─────────────────────────────────────────────────────────
// basePts: [ncPts, nqPts, ngPts] — the raw table point arrays.
// Derived values are computed on the fly: φ′ = derivePhiPrime(φ), then
// interpolate each base array at φ′ — no pre-baked derived dataset used.
const makeCrosshairPlugin = (colors, basePts) => ({
  id: 'bearingCrosshair',
  _cursor: null,

  afterEvent(chart, args) {
    const e = args.event;
    this._cursor = e.type === 'mousemove' ? { x: e.x, y: e.y } : null;
    chart.draw();
  },

  afterDraw(chart) {
    const cursor = this._cursor;
    if (!cursor) return;
    const { ctx, chartArea, scales } = chart;
    const { left, right, top, bottom } = chartArea;
    if (cursor.x < left || cursor.x > right || cursor.y < top || cursor.y > bottom) return;

    const xVal = scales.x.getValueForPixel(cursor.x);
    const phiPrime = derivePhiPrime(xVal);
    const [ncPts, nqPts, ngPts] = basePts;

    const dsColors = [
      colors.primary,
      colors.blue,
      colors.orange,
      colors.teal,
      colors.violet,
      colors.rose,
    ];
    const labels = ['Nc', 'Nq', 'N\u03b3', 'N\u2019c', 'N\u2019q', 'N\u2019\u03b3'];

    // First 3: interpolate base table at φ directly.
    // Last 3:  interpolate base table at φ′ — exact same formula, correct source.
    const interpolated = [
      interpolateY(ncPts, xVal),
      interpolateY(nqPts, xVal),
      interpolateY(ngPts, xVal),
      interpolateY(ncPts, phiPrime),
      interpolateY(nqPts, phiPrime),
      interpolateY(ngPts, phiPrime),
    ];

    ctx.save();

    // Vertical crosshair
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.moveTo(cursor.x, top);
    ctx.lineTo(cursor.x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dots on each curve — for derived series (i≥3) the dot y comes from
    // interpolating the base array at φ′, matching the tooltip value exactly.
    interpolated.forEach((yVal, i) => {
      if (yVal === null) return;
      const yPx = scales.y.getPixelForValue(yVal);
      ctx.beginPath();
      ctx.arc(cursor.x, yPx, 5, 0, Math.PI * 2);
      ctx.fillStyle = dsColors[i];
      ctx.fill();
      ctx.strokeStyle = colors.card;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Tooltip box
    const fontSize = 11;
    ctx.font = `600 ${fontSize}px 'Poppins','Inter',sans-serif`;
    const pad = 8,
      lineH = fontSize + 5,
      margin = 10;

    const lines = [
      { text: `\u03c6: ${xVal.toFixed(1)}\u00b0`, color: colors.card },
      ...interpolated.slice(0, 3).map((v, i) => ({
        text: v !== null ? `${labels[i]}: ${v.toFixed(2)}` : `${labels[i]}: \u2014`,
        color: dsColors[i],
      })),
      { text: `\u03c6\u2032: ${phiPrime.toFixed(2)}\u00b0`, color: colors.card },
      ...interpolated.slice(3).map((v, i) => ({
        text: v !== null ? `${labels[i + 3]}: ${v.toFixed(2)}` : `${labels[i + 3]}: \u2014`,
        color: dsColors[i + 3],
      })),
    ];

    const boxW = Math.max(...lines.map((l) => ctx.measureText(l.text).width)) + pad * 2;
    const boxH = lineH * lines.length + pad * 2;

    let bx = cursor.x + margin;
    let by = top + margin;
    if (bx + boxW > right) bx = cursor.x - boxW - margin;

    const r = 6;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + boxW - r, by);
    ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
    ctx.lineTo(bx + boxW, by + boxH - r);
    ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
    ctx.lineTo(bx + r, by + boxH);
    ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fillStyle = colors.foreground;
    ctx.globalAlpha = 0.93;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Divider after 4th line (between original and derived groups)
    const divY = by + pad + lineH * 4 - lineH * 0.25;
    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 0.8;
    ctx.moveTo(bx + pad, divY);
    ctx.lineTo(bx + boxW - pad, divY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textBaseline = 'middle';
    lines.forEach(({ text, color }, i) => {
      ctx.fillStyle = color;
      ctx.fillText(text, bx + pad, by + pad + lineH * (i + 0.5));
    });

    ctx.restore();
  },
});

// ─── Stable sub-components (defined at module level to preserve focus) ────────

const BcInputRow = ({ description, symbol, unit, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-gray-500 dark:text-gray-400 leading-tight break-words">
      {description}
      <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
        — {symbol}
        {unit && <span className="font-normal text-gray-400 ml-0.5">({unit})</span>}
      </span>
    </label>
    <Input
      type="number"
      step="any"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-center rounded-xl h-9 text-sm font-mono"
    />
  </div>
);

const BcResultCard = ({ label, labelSub, formula, value, highlight }) => (
  <div
    className={`rounded-xl border p-4 flex flex-col gap-1 ${
      highlight
        ? 'bg-primary/5 border-primary/20'
        : 'bg-gray-50 dark:bg-gray-100 border-gray-100 dark:border-gray-700'
    }`}
  >
    <p
      className={`text-[10px] font-bold uppercase tracking-widest ${highlight ? 'text-primary' : 'text-gray-400'}`}
    >
      {label}
      {labelSub && <sub>{labelSub}</sub>}
    </p>
    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
      {formula}
    </p>
    <p
      className={`text-2xl font-black font-mono tabular-nums mt-1 ${
        highlight ? 'text-primary' : 'text-gray-900 dark:text-gray-100'
      }`}
    >
      {value}
    </p>
  </div>
);

// ─── Part 3 sub-components (module-level to preserve focus on re-render) ─────
const CsInputField = ({ label, symbol, unit, value, onChange, placeholder, error, note }) => (
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
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-center rounded-xl h-9 text-sm font-mono ${error ? 'border-red-400 bg-red-50' : ''}`}
    />
    {error && <p className="text-[10px] text-red-500">{error}</p>}
    {note && <p className="text-[10px] text-gray-400 italic">{note}</p>}
  </div>
);

const CsComputedRow = ({ label, symbol, unit, displayValue, formula, highlight }) => (
  <div
    className={`rounded-xl border p-3 flex flex-col gap-0.5 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100'}`}
  >
    <p className="text-[10px] text-gray-400 leading-tight">
      {label}
      {symbol && (
        <>
          {' '}
          — <span className="font-bold text-gray-600">{symbol}</span>
        </>
      )}
      {unit && <span className="ml-1 font-normal text-gray-400">({unit})</span>}
    </p>
    {formula && <p className="text-[9px] text-gray-400 font-mono italic">{formula}</p>}
    <p
      className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${highlight ? 'text-primary' : displayValue !== '—' ? 'text-gray-800' : 'text-gray-300'}`}
    >
      {displayValue}
    </p>
  </div>
);

// ─── SBC Calculator sub-components (module-level to preserve focus on re-render) ─
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

// ─── Component ────────────────────────────────────────────────────────────────
const AdminBearingCapacityManager = () => {
  const { settings, updateSetting, loading } = useSettings();
  const { toast } = useToast();

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [phiInput, setPhiInput] = useState('');
  const [bInput, setBInput] = useState('');
  const [lInput, setLInput] = useState('');
  const [shapeInput, setShapeInput] = useState('rectangle'); // rectangle | square | circle | strip
  const [dfInput, setDfInput] = useState('');
  const [alphaInput, setAlphaInput] = useState('');
  const [cInput, setCInput] = useState(''); // cohesion kN/m²
  const [gammaInput, setGammaInput] = useState(''); // bulk unit weight kN/m³
  // W′ (Water Table Correction) is a system-defined constant of 0.5
  const W_CONSTANT = 0.5;
  // Format a small decimal number without exponential notation.
  // Uses enough decimal places to show 6 significant figures, then strips trailing zeros.
  const fmtDec = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (v === 0) return '0';
    const absV = Math.abs(v);
    // enough decimal places to capture 6 significant figures
    const places = Math.max(0, 6 - Math.floor(Math.log10(absV)) - 1);
    return parseFloat(v.toFixed(places)).toString();
  };
  const [fosInput, setFosInput] = useState(''); // factor of safety
  const [foxDepthInput, setFoxDepthInput] = useState(''); // Fox interpolation calculator — D
  const [foxLengthInput, setFoxLengthInput] = useState(''); // Fox interpolation calculator — L
  const [foxWidthInput, setFoxWidthInput] = useState(''); // Fox interpolation calculator — B
  const [suptNInput, setSuptNInput] = useState(''); // Settlement per Unit Pressure calc — N
  const [suptBInput, setSuptBInput] = useState(''); // Settlement per Unit Pressure calc — B
  // Bearing Capacity Tester for Settlement
  const [bctNInput, setBctNInput] = useState(''); // Field SPT N-value
  const [bctCorrectionType, setBctCorrectionType] = useState('none'); // none | overburden | dilatency | both
  const [bctGammaInput, setBctGammaInput] = useState(''); // Bulk unit weight γ (kN/m³)
  const [bctDsInput, setBctDsInput] = useState(''); // Scour depth ds (m)
  const [bctBInput, setBctBInput] = useState(''); // Footing width / diameter B (m)
  const [bctDInput, setBctDInput] = useState(''); // Depth of footing D (m)
  const [bctLInput, setBctLInput] = useState(''); // Footing length L (m)
  const [bctShape, setBctShape] = useState('rectangle'); // rectangle | square | circle | strip
  const [bctFootingType, setBctFootingType] = useState('isolated'); // 'isolated' | 'raft'
  // Part 3 — Consolidation Settlement inputs
  const [csD, setCsD] = useState(''); // Depth of foundation (m)
  const [csB, setCsB] = useState(''); // Width of foundation (m)
  const [csL, setCsL] = useState(''); // Length of foundation (m)
  const [csP, setCsP] = useState(''); // Pressure due to imposed load qs (kN/m²)
  const [csHt, setCsHt] = useState(''); // Height of compressible layer (m)
  const [csWL, setCsWL] = useState(''); // Liquid Limit (%)

  // SBC Calculator — unified inputs
  const [sbcB, setSbcB] = useState(''); // Width of foundation B (m)
  const [sbcL, setSbcL] = useState(''); // Length of foundation L (m)
  const [sbcD, setSbcD] = useState(''); // Depth of foundation D (m)
  const [sbcDs, setSbcDs] = useState(''); // Scour depth ds (m)
  const [sbcShape, setSbcShape] = useState('rectangle'); // rectangle | square | circle | strip
  const [sbcGamma, setSbcGamma] = useState(''); // Bulk unit weight γ (kN/m³)
  const [sbcN, setSbcN] = useState(''); // Field SPT N-value
  const [sbcCorrectionType, setSbcCorrectionType] = useState('none'); // none | overburden | dilatency | both
  const [sbcFootingType, setSbcFootingType] = useState('isolated'); // isolated | raft
  const [sbcPhi, setSbcPhi] = useState(''); // Angle of friction φ (°)
  const [sbcC, setSbcC] = useState(''); // Cohesion c (kN/m²)
  const [sbcAlpha, setSbcAlpha] = useState(''); // Inclination angle α (°)
  const [sbcFos, setSbcFos] = useState(''); // Factor of Safety
  const [sbcHt, setSbcHt] = useState(''); // Height of compressible layer Ht (m)
  const [sbcWL, setSbcWL] = useState(''); // Liquid Limit WL (%)
  const [sbcP, setSbcP] = useState(''); // Pressure from imposed load P (kN/m²)
  const [soilTypeInput, setSoilTypeInput] = useState('non-clay'); // 'clay' | 'non-clay'

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const settlementChartRef = useRef(null);
  const settlementChartInstanceRef = useRef(null);
  const foxChartRef = useRef(null);
  const foxChartInstanceRef = useRef(null);
  const sptSettlementChartRef = useRef(null);
  const sptSettlementChartInstanceRef = useRef(null);

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!loading && settings && !hasInitialized) {
      const raw = settings[SETTING_KEY];
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed) && parsed.length > 0) setRows(parsed);
        } catch {
          /* keep defaults */
        }
      }
      setHasInitialized(true);
    }
  }, [loading, settings, hasInitialized]);

  // Base sorted point arrays
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

  // Derived point arrays (x = original φ, y = factor at φ′)
  const ncPrimePts = ncPts.map((p) => ({
    x: p.x,
    y: interpolateY(ncPts, derivePhiPrime(p.x)) ?? 0,
  }));
  const nqPrimePts = nqPts.map((p) => ({
    x: p.x,
    y: interpolateY(nqPts, derivePhiPrime(p.x)) ?? 0,
  }));
  const ngPrimePts = ngPts.map((p) => ({
    x: p.x,
    y: interpolateY(ngPts, derivePhiPrime(p.x)) ?? 0,
  }));

  const chartDataKey = JSON.stringify({ ncPts, nqPts, ngPts });

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    if (ncPts.length < 2) return;

    const colors = buildChartColors();

    const mkDataset = (label, data, color, dashed = false) => ({
      label,
      data,
      parsing: false,
      borderColor: color,
      backgroundColor: 'transparent',
      pointBackgroundColor: color,
      pointBorderColor: colors.card,
      pointBorderWidth: 2,
      pointRadius: dashed ? 4 : 5,
      pointHoverRadius: dashed ? 7 : 8,
      borderWidth: dashed ? 2 : 2.5,
      borderDash: dashed ? [6, 4] : [],
      tension: 0.35,
    });

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        datasets: [
          mkDataset('Nc', ncPts, colors.primary),
          mkDataset('Nq', nqPts, colors.blue),
          mkDataset('N\u03b3', ngPts, colors.orange),
          mkDataset('N\u2019c', ncPrimePts, colors.teal, true),
          mkDataset('N\u2019q', nqPrimePts, colors.violet, true),
          mkDataset('N\u2019\u03b3', ngPrimePts, colors.rose, true),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: colors.foreground,
              font: { size: 11, weight: '600' },
              boxWidth: 14,
              padding: 14,
              generateLabels(chart) {
                return chart.data.datasets.map((ds, i) => ({
                  text: ds.label,
                  fillStyle: 'transparent',
                  strokeStyle: ds.borderColor,
                  lineWidth: ds.borderWidth,
                  lineDash: ds.borderDash ?? [],
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i,
                  fontColor: colors.foreground,
                }));
              },
            },
          },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: 50,
            ticks: {
              color: colors.muted,
              font: { size: 10 },
              stepSize: 5,
              callback: (v) => `${v}\u00b0`,
            },
            title: {
              display: true,
              text: 'Friction Angle \u03c6 (degrees)  \u2192',
              color: colors.muted,
              font: { size: 11, weight: '600' },
              padding: { top: 8 },
            },
            grid: { color: colors.border, lineWidth: 1 },
            border: { color: colors.border },
          },
          y: {
            type: 'linear',
            min: 0,
            title: {
              display: true,
              text: 'Bearing Capacity Factor  \u2192',
              color: colors.muted,
              font: { size: 11, weight: '600' },
              padding: { bottom: 8 },
            },
            ticks: { color: colors.muted, font: { size: 10 } },
            grid: { color: colors.border, lineWidth: 1 },
            border: { color: colors.border },
          },
        },
      },
      plugins: [makeCrosshairPlugin(colors, [ncPts, nqPts, ngPts])],
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartDataKey, isDark]);

  // ── Allowable Bearing Capacity chart ─────────────────────────────────────────────
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

  useEffect(() => {
    if (!settlementChartRef.current) return;
    if (settlementChartInstanceRef.current) {
      settlementChartInstanceRef.current.destroy();
      settlementChartInstanceRef.current = null;
    }

    const colors = buildChartColors();
    const lineColors = [
      colors.primary,
      colors.blue,
      colors.orange,
      colors.teal,
      colors.violet,
      colors.rose,
    ];

    const datasets = FOOTING_WIDTHS.map((w, i) => ({
      label: `B = ${w} m`,
      data: SETTLEMENT_DATA.filter((row) => row.vals[i] !== null).map((row) => ({
        x: row.n,
        y: row.vals[i],
      })),
      parsing: false,
      borderColor: lineColors[i],
      backgroundColor: 'transparent',
      pointBackgroundColor: lineColors[i],
      pointBorderColor: colors.card,
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 7,
      borderWidth: 2,
      tension: 0.3,
    }));

    settlementChartInstanceRef.current = new Chart(settlementChartRef.current, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: colors.foreground,
              font: { size: 11, weight: '600' },
              boxWidth: 14,
              padding: 14,
              generateLabels(chart) {
                return chart.data.datasets.map((ds, idx) => ({
                  text: ds.label,
                  fillStyle: 'transparent',
                  strokeStyle: ds.borderColor,
                  lineWidth: ds.borderWidth,
                  lineDash: [],
                  hidden: !chart.isDatasetVisible(idx),
                  datasetIndex: idx,
                  fontColor: colors.foreground,
                }));
              },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: colors.foreground,
            titleColor: colors.card,
            bodyColor: colors.card,
            borderColor: colors.primary,
            borderWidth: 1.5,
            padding: 8,
            callbacks: {
              title: (items) => `N = ${items[0].parsed.x}`,
              label: (item) => ` ${item.dataset.label}: ${item.parsed.y}`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: 5,
            max: 60,
            ticks: {
              color: colors.muted,
              font: { size: 10 },
              stepSize: 5,
              callback: (v) => `N=${v}`,
            },
            title: {
              display: true,
              text: 'SPT N-value  \u2192',
              color: colors.muted,
              font: { size: 11, weight: '600' },
              padding: { top: 8 },
            },
            grid: { color: colors.border, lineWidth: 1 },
            border: { color: colors.border },
          },
          y: {
            type: 'linear',
            min: 0,
            ticks: {
              color: colors.muted,
              font: { size: 10 },
              callback: (v) => v.toFixed(3),
            },
            title: {
              display: true,
              text: 'Allowable Settlement (m/kN/m\u00b2)  \u2192',
              color: colors.muted,
              font: { size: 11, weight: '600' },
              padding: { bottom: 8 },
            },
            grid: { color: colors.border, lineWidth: 1 },
            border: { color: colors.border },
          },
        },
      },
    });

    return () => {
      if (settlementChartInstanceRef.current) {
        settlementChartInstanceRef.current.destroy();
        settlementChartInstanceRef.current = null;
      }
    };
  }, [isDark]);

  // ── Settlement per Unit Pressure chart — uses Allowable Bearing Capacity table data ──
  // B on X-axis, one curve per N-value (transposed from SETTLEMENT_DATA rows)
  const SPT_SETTLEMENT_COLORS = [
    '#e6194b',
    '#3cb44b',
    '#b5a800',
    '#4363d8',
    '#f58231',
    '#911eb4',
    '#0097a7',
    '#f032e6',
    '#a9a9a9',
    '#00bcd4',
    '#ff5722',
    '#8bc34a',
  ];

  useEffect(() => {
    if (!sptSettlementChartRef.current) return;
    if (sptSettlementChartInstanceRef.current) {
      sptSettlementChartInstanceRef.current.destroy();
      sptSettlementChartInstanceRef.current = null;
    }

    const colors = buildChartColors();

    // Build one dataset per N-value row in SETTLEMENT_DATA.
    // X = footing width B (from FOOTING_WIDTHS), Y = settlement value.
    // Skip null entries (NA) when plotting.
    const datasets = SETTLEMENT_DATA.map((row, rowIdx) => ({
      label: `N = ${row.n}`,
      data: FOOTING_WIDTHS.map((b, i) =>
        row.vals[i] !== null ? { x: b, y: row.vals[i] } : null
      ).filter(Boolean),
      parsing: false,
      borderColor: SPT_SETTLEMENT_COLORS[rowIdx % SPT_SETTLEMENT_COLORS.length],
      backgroundColor: 'transparent',
      pointBackgroundColor: SPT_SETTLEMENT_COLORS[rowIdx % SPT_SETTLEMENT_COLORS.length],
      pointBorderColor: colors.card,
      pointBorderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2,
      tension: 0.3,
      showLine: true,
    }));

    sptSettlementChartInstanceRef.current = new Chart(sptSettlementChartRef.current, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              color: colors.foreground,
              font: { size: 11, weight: '600' },
              boxWidth: 14,
              padding: 14,
              generateLabels(chart) {
                return chart.data.datasets.map((ds, idx) => ({
                  text: ds.label,
                  fillStyle: 'transparent',
                  strokeStyle: ds.borderColor,
                  lineWidth: ds.borderWidth,
                  lineDash: [],
                  hidden: !chart.isDatasetVisible(idx),
                  datasetIndex: idx,
                  fontColor: colors.foreground,
                }));
              },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: colors.foreground,
            titleColor: colors.card,
            bodyColor: colors.card,
            borderColor: colors.primary,
            borderWidth: 1.5,
            padding: 8,
            callbacks: {
              title: (items) => `B = ${items[0].parsed.x} m`,
              label: (item) => {
                const v = item.parsed.y;
                return ` ${item.dataset.label}: ${v.toFixed(4)} m  (${(v * 1000).toFixed(1)} mm)`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: 1.0,
            max: 6.5,
            ticks: {
              color: colors.muted,
              font: { size: 10 },
              stepSize: 0.5,
              callback: (v) => `${v} m`,
            },
            title: {
              display: true,
              text: "Width 'B' of Footing (Meters)  →",
              color: colors.muted,
              font: { size: 11, weight: '600' },
              padding: { top: 8 },
            },
            grid: { color: colors.border, lineWidth: 1 },
            border: { color: colors.border },
          },
          y: {
            type: 'logarithmic',
            min: 0.001,
            max: 0.5,
            ticks: {
              color: colors.muted,
              font: { size: 10 },
              // Return a label for every tick Chart.js generates so grid lines appear.
              // Major decades get a readable label; minor subdivisions get a dim tick mark.
              callback: (v) => {
                const decades = [0.1, 0.01, 0.001];
                const labels = { 0.1: '10⁻¹', 0.01: '10⁻²', 0.001: '10⁻³' };
                // Exact decade — show label
                for (const d of decades) {
                  if (Math.abs(v - d) / d < 1e-9) return labels[d];
                }
                // Minor log subdivision — show the raw value dimly so the grid line renders
                return v.toExponential(0);
              },
            },
            title: {
              display: true,
              text: 'Settlement per Unit Pressure (m / kN/m²)  →',
              color: colors.muted,
              font: { size: 11, weight: '600' },
              padding: { bottom: 8 },
            },
            // Major decade lines solid; minor subdivision lines lighter
            grid: {
              color: (ctx) => {
                const v = ctx.tick?.value;
                const decades = [0.1, 0.01, 0.001];
                const isMajor = decades.some((d) => v !== undefined && Math.abs(v - d) / d < 1e-9);
                return isMajor
                  ? colors.foreground + '33' // ~20% opacity solid line for decades
                  : colors.border; // normal faint line for subdivisions
              },
              lineWidth: (ctx) => {
                const v = ctx.tick?.value;
                const decades = [0.1, 0.01, 0.001];
                const isMajor = decades.some((d) => v !== undefined && Math.abs(v - d) / d < 1e-9);
                return isMajor ? 1.5 : 0.5;
              },
            },
            border: { color: colors.border },
          },
        },
      },
    });

    return () => {
      if (sptSettlementChartInstanceRef.current) {
        sptSettlementChartInstanceRef.current.destroy();
        sptSettlementChartInstanceRef.current = null;
      }
    };
  }, [isDark]);

  // ── Fox's Correction Curves chart ────────────────────────────────────────
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

  useEffect(() => {
    if (!foxChartRef.current) return;
    if (foxChartInstanceRef.current) {
      foxChartInstanceRef.current.destroy();
      foxChartInstanceRef.current = null;
    }

    const colors = buildChartColors();

    const datasets = FOX_DATASETS.map((ds) => ({
      label: ds.label,
      data: ds.data,
      parsing: false,
      borderColor: ds.color,
      backgroundColor: 'transparent',
      pointBackgroundColor: ds.color,
      pointBorderColor: colors.card,
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 7,
      borderWidth: 2,
      tension: 0.2,
      showLine: true,
    }));

    // Custom plugin: thick horizontal line at y = 1.0 (the mid-axis crossover)
    const midLinePlugin = {
      id: 'foxMidLine',
      afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const yPx = scales.y.getPixelForValue(1.0);
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = colors.foreground;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.moveTo(chartArea.left, yPx);
        ctx.lineTo(chartArea.right, yPx);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      },
    };

    foxChartInstanceRef.current = new Chart(foxChartRef.current, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: colors.foreground,
              font: { size: 11, weight: '600' },
              boxWidth: 14,
              padding: 14,
              generateLabels(chart) {
                return chart.data.datasets.map((d, i) => ({
                  text: d.label,
                  fillStyle: 'transparent',
                  strokeStyle: d.borderColor,
                  lineWidth: d.borderWidth,
                  lineDash: [],
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i,
                  fontColor: colors.foreground,
                }));
              },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: colors.foreground,
            titleColor: colors.card,
            bodyColor: colors.card,
            borderColor: colors.primary,
            borderWidth: 1.5,
            padding: 8,
            callbacks: {
              title: () => '',
              label: (item) => {
                const depthFactor = item.parsed.x.toFixed(2);
                const yRaw = item.parsed.y;
                const scaleLabel =
                  yRaw <= 1.0
                    ? `D/\u221aLB = ${yRaw.toFixed(1)}`
                    : `LB/\u221aD = ${(2.0 - yRaw).toFixed(1)}`;
                return ` ${item.dataset.label}  \u2502  Depth factor: ${depthFactor}  \u2502  ${scaleLabel}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            position: 'top',
            min: 0.5,
            max: 1.0,
            ticks: {
              color: colors.muted,
              font: { size: 10 },
              stepSize: 0.1,
            },
            title: {
              display: true,
              text: 'Depth Factor (If)  \u2192',
              color: colors.muted,
              font: { size: 11, weight: '600' },
              padding: { bottom: 8 },
            },
            grid: { color: colors.border, lineWidth: 1 },
            border: { color: colors.border },
          },
          y: {
            type: 'linear',
            min: 0.0,
            max: 2.0,
            reverse: true,
            ticks: {
              color: colors.muted,
              font: { size: 10 },
              stepSize: 0.2,
              callback: (value) => {
                if (value <= 1.0) return value.toFixed(1);
                return (2.0 - value).toFixed(1);
              },
            },
            title: {
              display: false,
            },
            grid: {
              color: (ctx) => (ctx.tick.value === 1.0 ? colors.foreground : colors.border),
              lineWidth: (ctx) => (ctx.tick.value === 1.0 ? 1.5 : 1),
            },
            border: { color: colors.border },
          },
        },
      },
      plugins: [midLinePlugin],
    });

    return () => {
      if (foxChartInstanceRef.current) {
        foxChartInstanceRef.current.destroy();
        foxChartInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  const handleChange = useCallback((id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const handleAddRow = () =>
    setRows((prev) => [...prev, { id: Date.now(), phi: '', nc: '', nq: '', ngamma: '' }]);

  const handleDeleteRow = useCallback((id) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [{ id: Date.now(), phi: '', nc: '', nq: '', ngamma: '' }];
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting(SETTING_KEY, JSON.stringify(rows));
      toast({ title: 'Saved', description: 'Bearing capacity factors data has been saved.' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to save bearing capacity factors.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !hasInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-500 font-medium">Loading data...</span>
      </div>
    );
  }

  const fmt = (v) => (v !== null && !isNaN(v) ? v.toFixed(2) : '—');

  return (
    <Tabs defaultValue="soil" className="w-full space-y-6">
      <div className="flex justify-center">
        <TabsList className="bg-white p-1 border border-gray-200 rounded-xl shadow-sm h-auto inline-flex flex-wrap justify-center">
          <TabsTrigger
            value="soil"
            className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
          >
            <Mountain className="w-4 h-4" /> Soil
          </TabsTrigger>
          <TabsTrigger
            value="rock"
            className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
          >
            <Gem className="w-4 h-4" /> Rock
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="soil">
        <div className="space-y-8 w-full pb-12">
          {/* ── Overburden Pressure Correction ── */}
          <AdminOverburdenCorrectionManager />

          {/* ── Unit Weights of Materials ── */}
          <AdminUnitWeightsManager />

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-2xl">
                  <Mountain className="w-6 h-6 text-primary" />
                </div>
                Bearing Capacity Factors
              </h1>
              <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
                N<sub>c</sub>, N<sub>q</sub>, N<sub>γ</sub> and derived N′<sub>c</sub>, N′
                <sub>q</sub>, N′<sub>γ</sub> vs. friction angle φ
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleAddRow}
                className="flex items-center gap-2 rounded-xl h-10 px-4 border-dashed border-2"
              >
                <Plus className="w-4 h-4" /> Add Row
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSave}
                    className="bg-primary hover:bg-primary-dark flex items-center text-white rounded-xl h-10 px-6 shadow-sm"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                  <p className="text-xs">Persist all bearing capacity factor values</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                {/* Group label row */}
                <tr className="border-b border-gray-100">
                  <th className="py-2" colSpan={2} />
                  <th
                    colSpan={3}
                    className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 border-r border-gray-100"
                  >
                    Original (φ)
                  </th>
                  <th
                    colSpan={4}
                    className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-900/20"
                  >
                    Derived — φ′ = tan⁻¹(0.67 · tan φ)
                  </th>
                  <th className="py-2" />
                </tr>
                {/* Column header row */}
                <tr className="bg-gray-50 border-b">
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] w-10">
                    #
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                    <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                      Considered Angle of Friction
                    </span>
                    φ (°)
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                    <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                      BC Factor — Cohesion
                    </span>
                    N<sub>c</sub>
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                    <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                      BC Factor — Surcharge
                    </span>
                    N<sub>q</sub>
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100">
                    <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                      BC Factor — Unit Weight
                    </span>
                    N<sub>γ</sub>
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-teal-600 dark:text-teal-300 uppercase tracking-widest text-[10px] bg-teal-50/50 dark:bg-teal-900/20">
                    <span className="block normal-case font-normal text-teal-500 dark:text-teal-400 text-[9px] leading-tight">
                      Reduced Angle of Friction
                    </span>
                    φ′ (°)
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-teal-600 dark:text-teal-300 uppercase tracking-widest text-[10px] bg-teal-50/50 dark:bg-teal-900/20">
                    <span className="block normal-case font-normal text-teal-500 dark:text-teal-400 text-[9px] leading-tight">
                      Reduced BC Factor — Cohesion
                    </span>
                    N′<sub>c</sub>
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-teal-600 dark:text-teal-300 uppercase tracking-widest text-[10px] bg-teal-50/50 dark:bg-teal-900/20">
                    <span className="block normal-case font-normal text-teal-500 dark:text-teal-400 text-[9px] leading-tight">
                      Reduced BC Factor — Surcharge
                    </span>
                    N′<sub>q</sub>
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-teal-600 dark:text-teal-300 uppercase tracking-widest text-[10px] bg-teal-50/50 dark:bg-teal-900/20">
                    <span className="block normal-case font-normal text-teal-500 dark:text-teal-400 text-[9px] leading-tight">
                      Reduced BC Factor — Unit Weight
                    </span>
                    N′<sub>γ</sub>
                  </th>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => {
                  const { phiPrime, ncPrime, nqPrime, ngPrime } = computeDerived(
                    row.phi,
                    ncPts,
                    nqPts,
                    ngPts
                  );
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-3 px-4 text-center text-gray-400 text-xs font-mono">
                        {idx + 1}
                      </td>

                      {/* φ */}
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            step="5"
                            min="0"
                            value={row.phi}
                            onChange={(e) => handleChange(row.id, 'phi', e.target.value)}
                            placeholder="30"
                            className="w-20 text-center rounded-xl h-9"
                          />
                        </div>
                      </td>

                      {/* Nc */}
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.nc}
                            onChange={(e) => handleChange(row.id, 'nc', e.target.value)}
                            placeholder="30.14"
                            className="w-24 text-center rounded-xl h-9"
                          />
                        </div>
                      </td>

                      {/* Nq */}
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.nq}
                            onChange={(e) => handleChange(row.id, 'nq', e.target.value)}
                            placeholder="18.40"
                            className="w-24 text-center rounded-xl h-9"
                          />
                        </div>
                      </td>

                      {/* Nγ */}
                      <td className="py-3 px-4 border-r border-gray-100">
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.ngamma}
                            onChange={(e) => handleChange(row.id, 'ngamma', e.target.value)}
                            placeholder="22.40"
                            className="w-24 text-center rounded-xl h-9"
                          />
                        </div>
                      </td>

                      {/* Derived — read-only */}
                      <td className="py-3 px-4 text-center text-xs font-mono font-semibold text-teal-700 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-900/20">
                        {phiPrime !== null ? phiPrime.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-mono font-semibold text-teal-700 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-900/20">
                        {fmt(ncPrime)}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-mono font-semibold text-teal-700 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-900/20">
                        {fmt(nqPrime)}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-mono font-semibold text-teal-700 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-900/20">
                        {fmt(ngPrime)}
                      </td>

                      {/* Delete */}
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRow(row.id)}
                            className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            disabled={rows.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            <div className="border-t border-dashed bg-gray-50/50">
              <button
                onClick={handleAddRow}
                className="w-full py-3 text-xs text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-3 h-3" /> Add another row
              </button>
            </div>
          </div>

          {/* ── Chart ── */}
          {ncPts.length >= 2 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Bearing Capacity Factor Curves
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Solid lines — original (φ) &nbsp;·&nbsp; Dashed lines — derived (φ′) &nbsp;·&nbsp;
                  Hover for interpolated values at any φ
                </p>
              </div>
              <div className="relative w-full" style={{ height: 440 }}>
                <canvas ref={chartRef} />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-10 text-gray-400 text-sm text-center space-y-1">
              <Mountain className="w-6 h-6 mx-auto opacity-30 mb-2" />
              <p>
                {ncPts.length === 1
                  ? 'Add at least 2 valid rows to display the chart.'
                  : 'Enter values in the table above to see the factor curves.'}
              </p>
            </div>
          )}

          {/* ── φ Calculator ── */}
          {ncPts.length >= 2 &&
            (() => {
              const phiVal = parseFloat(phiInput);
              const hasVal = !isNaN(phiVal) && phiInput !== '';
              const ncVal = hasVal ? interpolateY(ncPts, phiVal) : null;
              const nqVal = hasVal ? interpolateY(nqPts, phiVal) : null;
              const ngVal = hasVal ? interpolateY(ngPts, phiVal) : null;
              const phiPrime = hasVal ? derivePhiPrime(phiVal) : null;
              const ncPrime = hasVal ? interpolateY(ncPts, phiPrime) : null;
              const nqPrime = hasVal ? interpolateY(nqPts, phiPrime) : null;
              const ngPrime = hasVal ? interpolateY(ngPts, phiPrime) : null;

              // Find the bracketing rows used for interpolation (for formula display)
              const findBracket = (pts, x) => {
                if (!pts || pts.length < 2 || isNaN(x)) return null;
                if (x <= pts[0].x) return { lo: pts[0], hi: pts[1] };
                if (x >= pts[pts.length - 1].x)
                  return { lo: pts[pts.length - 2], hi: pts[pts.length - 1] };
                for (let i = 0; i < pts.length - 1; i++) {
                  if (x >= pts[i].x && x <= pts[i + 1].x) return { lo: pts[i], hi: pts[i + 1] };
                }
                return null;
              };

              const bNc = hasVal ? findBracket(ncPts, phiVal) : null;
              const bNq = hasVal ? findBracket(nqPts, phiVal) : null;
              const bNg = hasVal ? findBracket(ngPts, phiVal) : null;
              const bNcP = hasVal ? findBracket(ncPts, phiPrime) : null;
              const bNqP = hasVal ? findBracket(nqPts, phiPrime) : null;
              const bNgP = hasVal ? findBracket(ngPts, phiPrime) : null;

              const fmtN = (v) => (v !== null && !isNaN(v) ? v.toFixed(4) : '—');
              const fmtD = (v) => (v !== null && !isNaN(v) ? v.toFixed(2) : '—');

              // Build interpolation formula string
              const interpFormula = (b, xVal, yVal, label) => {
                if (!b) return null;
                const slope = ((b.hi.y - b.lo.y) / (b.hi.x - b.lo.x)).toFixed(4);
                return (
                  <span>
                    {label} = {b.lo.y.toFixed(4)} + (({b.hi.y.toFixed(4)} − {b.lo.y.toFixed(4)}) ÷ (
                    {b.hi.x.toFixed(2)} − {b.lo.x.toFixed(2)})) × ({xVal.toFixed(4)} −{' '}
                    {b.lo.x.toFixed(2)}){' '}
                    <span className="text-gray-400">
                      = <strong className="text-gray-700 dark:text-gray-200">{fmtN(yVal)}</strong>
                    </span>
                  </span>
                );
              };

              const ResultCard = ({ label, value, sub, teal }) => (
                <div
                  className={`rounded-xl border p-4 flex flex-col gap-1 ${
                    teal
                      ? 'bg-teal-50/50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800'
                      : 'bg-gray-50 dark:bg-gray-100 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest ${teal ? 'text-teal-600 dark:text-teal-300' : 'text-gray-400'}`}
                  >
                    {label}
                    {sub && <sub>{sub}</sub>}
                  </p>
                  <p
                    className={`text-2xl font-black font-mono tabular-nums ${teal ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'}`}
                  >
                    {value}
                  </p>
                </div>
              );

              return (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                  {/* Title + input */}
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div>
                      <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Bearing Capacity - Interpolation Calculator
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enter any φ to compute all factors with step-by-step formulae
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:ml-auto w-40">
                      <label className="text-xs text-gray-500 dark:text-gray-400 leading-tight w-40 break-words">
                        Considered Angle of Friction
                        <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                          — φ <span className="font-normal text-gray-400">(°)</span>
                        </span>
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="90"
                        value={phiInput}
                        onChange={(e) => setPhiInput(e.target.value)}
                        placeholder="e.g. 30.5"
                        className="w-40 text-center rounded-xl h-10 text-base font-mono"
                      />
                    </div>
                  </div>

                  {hasVal ? (
                    <>
                      {/* Result cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ResultCard label="Nc" value={fmtN(ncVal)} />
                        <ResultCard label="Nq" value={fmtN(nqVal)} />
                        <ResultCard label="Nγ" value={fmtN(ngVal)} />
                        <ResultCard label="φ′ (°)" value={fmtD(phiPrime)} teal />
                        <ResultCard label="N′" sub="c" value={fmtN(ncPrime)} teal />
                        <ResultCard label="N′" sub="q" value={fmtN(nqPrime)} teal />
                        <ResultCard label="N′" sub="γ" value={fmtN(ngPrime)} teal />
                      </div>

                      {/* Step-by-step formulae */}
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                          Step-by-step computation
                        </h3>

                        <div className="space-y-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                          {/* Nc */}
                          {bNc && (
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                              <p className="font-bold text-gray-500 dark:text-gray-400 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                                Nc — interpolated at φ = {fmtD(phiVal)}°
                              </p>
                              <p>{interpFormula(bNc, phiVal, ncVal, 'Nc')}</p>
                            </div>
                          )}

                          {/* Nq */}
                          {bNq && (
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                              <p className="font-bold text-gray-500 dark:text-gray-400 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                                Nq — interpolated at φ = {fmtD(phiVal)}°
                              </p>
                              <p>{interpFormula(bNq, phiVal, nqVal, 'Nq')}</p>
                            </div>
                          )}

                          {/* Nγ */}
                          {bNg && (
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                              <p className="font-bold text-gray-500 dark:text-gray-400 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                                Nγ — interpolated at φ = {fmtD(phiVal)}°
                              </p>
                              <p>{interpFormula(bNg, phiVal, ngVal, 'N\u03b3')}</p>
                            </div>
                          )}

                          {/* φ′ derivation */}
                          <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                            <p className="font-bold text-teal-600 dark:text-teal-400 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                              φ′ — derived friction angle
                            </p>
                            <p className="text-teal-700 dark:text-teal-300">
                              φ′ = tan⁻¹(0.67 × tan(φ)) = tan⁻¹(0.67 × tan({fmtD(phiVal)}°)) =
                              tan⁻¹(0.67 × {Math.tan((phiVal * Math.PI) / 180).toFixed(6)}) = tan⁻¹(
                              {(0.67 * Math.tan((phiVal * Math.PI) / 180)).toFixed(6)}) ={' '}
                              <strong>{fmtD(phiPrime)}°</strong>
                            </p>
                          </div>

                          {/* N′c */}
                          {bNcP && (
                            <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                              <p className="font-bold text-teal-600 dark:text-teal-400 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                                N′c — interpolated at φ′ = {fmtD(phiPrime)}°
                              </p>
                              <p className="text-teal-700 dark:text-teal-300">
                                {interpFormula(bNcP, phiPrime, ncPrime, 'N\u2019c')}
                              </p>
                            </div>
                          )}

                          {/* N′q */}
                          {bNqP && (
                            <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                              <p className="font-bold text-teal-600 dark:text-teal-400 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                                N′q — interpolated at φ′ = {fmtD(phiPrime)}°
                              </p>
                              <p className="text-teal-700 dark:text-teal-300">
                                {interpFormula(bNqP, phiPrime, nqPrime, 'N\u2019q')}
                              </p>
                            </div>
                          )}

                          {/* N′γ */}
                          {bNgP && (
                            <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                              <p className="font-bold text-teal-600 dark:text-teal-400 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                                N′γ — interpolated at φ′ = {fmtD(phiPrime)}°
                              </p>
                              <p className="text-teal-700 dark:text-teal-300">
                                {interpFormula(bNgP, phiPrime, ngPrime, 'N\u2019\u03b3')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Enter a φ value above to see computed results and formulae.
                    </div>
                  )}
                </div>
              );
            })()}

          {/* ── Info note ── */}
          <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
            <Mountain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>
                N<sub>c</sub>
              </strong>
              ,{' '}
              <strong>
                N<sub>q</sub>
              </strong>
              ,{' '}
              <strong>
                N<sub>γ</sub>
              </strong>{' '}
              are Terzaghi/Meyerhof bearing capacity factors for the entered φ. The teal columns use{' '}
              <strong>φ′ = tan⁻¹(0.67 × tan φ)</strong> and interpolate N′<sub>c</sub>, N′
              <sub>q</sub>, N′<sub>γ</sub> from the same table — these are the{' '}
              <em>local shear failure</em> factors per IS 6403. Hover the chart for{' '}
              <strong>interpolated values</strong>. Click <em>Save</em> to persist the base table.
            </p>
          </div>

          {/* ── Table: Shape Factors ── */}
          {(() => {
            // Derive effective B and L the same way as the IS 6403 calculator
            const B = parseFloat(bInput);
            const L_raw = parseFloat(lInput);
            const hasB = !isNaN(B) && bInput !== '';
            const L = (() => {
              if (!hasB) return null;
              switch (shapeInput) {
                case 'square':
                  return B;
                case 'circle':
                  return B;
                case 'strip':
                  return 100 * B;
                default:
                  return !isNaN(L_raw) && lInput !== '' ? L_raw : null;
              }
            })();
            const hasL = L !== null && L !== 0;
            const hasBL = hasB && hasL && L !== 0;
            const ratio = hasBL ? B / L : null;

            // Returns { formula, value } for a cell.
            // formula: always the symbolic expression
            // value: numeric result if B/L known, else null
            const cell = (sym, compute) => ({
              formula: sym,
              value: hasBL ? compute(ratio) : null,
            });

            const rows = [
              {
                sl: 'i)',
                shape: 'Continuous strip',
                sc: cell('1.00', () => 1.0),
                sq: cell('1.00', () => 1.0),
                sg: cell('1.00', () => 1.0),
              },
              {
                sl: 'ii)',
                shape: 'Rectangle',
                sc: cell('1 + 0.2·(B/L)', (r) => 1 + 0.2 * r),
                sq: cell('1 + 0.2·(B/L)', (r) => 1 + 0.2 * r),
                sg: cell('1 − 0.4·(B/L)', (r) => 1 - 0.4 * r),
              },
              {
                sl: 'iii)',
                shape: 'Square',
                sc: cell('1.3', () => 1.3),
                sq: cell('1.2', () => 1.2),
                sg: cell('0.8', () => 0.8),
              },
              {
                sl: 'iv)',
                shape: 'Circle',
                sc: cell('1.3', () => 1.3),
                sq: cell('1.2', () => 1.2),
                sg: cell('0.6', () => 0.6),
              },
            ];

            // Cell renderer — shows formula + computed value underneath when available
            const ShapeCell = ({ c }) => (
              <td className="py-3 px-4 text-center text-xs font-mono text-gray-700 align-top">
                <span>{c.formula}</span>
                {c.value !== null && (
                  <span className="block mt-0.5 text-[11px] font-semibold text-primary">
                    = {c.value.toFixed(4)}
                  </span>
                )}
              </td>
            );

            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header + B/L inputs */}
                <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-end gap-4 border-b border-gray-100">
                  <div className="flex-1">
                    <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                      Shape Factors Tester
                    </h2>
                    <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                      s<sub>c</sub>, s<sub>q</sub>, s<sub>γ</sub> for different foundation shapes
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
                    <div className="flex flex-col gap-1.5 w-40">
                      <label className="text-xs text-gray-500 leading-tight w-40 break-words">
                        Width — B <span className="font-normal text-gray-400">(m)</span>
                      </label>
                      <div className="w-40 text-center rounded-xl h-9 text-sm font-mono border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-600">
                        {hasB ? B.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 w-40">
                      <label className="text-xs text-gray-500 leading-tight w-40 break-words">
                        Length — L <span className="font-normal text-gray-400">(m)</span>
                        {shapeInput !== 'rectangle' && (
                          <span className="ml-1 text-[10px] text-primary capitalize">
                            ({shapeInput})
                          </span>
                        )}
                      </label>
                      <div className="w-40 text-center rounded-xl h-9 text-sm font-mono border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-600">
                        {hasL ? (shapeInput === 'strip' ? `100 × B` : L.toFixed(2)) : '—'}
                      </div>
                    </div>
                    {hasBL && (
                      <span className="text-xs font-mono text-gray-500 shrink-0 pb-2">
                        B/L = {ratio.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-100">
                      <th
                        rowSpan={2}
                        className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] w-12 border-r border-gray-100 align-middle"
                      >
                        Sl No.
                      </th>
                      <th
                        rowSpan={2}
                        className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100 align-middle"
                      >
                        Shape of Base
                      </th>
                      <th
                        colSpan={3}
                        className="text-center py-2 px-4 font-bold text-gray-500 uppercase tracking-widest text-[10px] border-b border-gray-100"
                      >
                        Shape Factor
                      </th>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-center py-2 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                        s<sub>c</sub>
                      </th>
                      <th className="text-center py-2 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                        s<sub>q</sub>
                      </th>
                      <th className="text-center py-2 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                        s<sub>γ</sub>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row) => (
                      <tr key={row.sl} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-center text-xs font-mono text-gray-400 border-r border-gray-100">
                          {row.sl}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 font-medium border-r border-gray-100">
                          {row.shape}
                        </td>
                        <ShapeCell c={row.sc} />
                        <ShapeCell c={row.sq} />
                        <ShapeCell c={row.sg} />
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-500 italic">
                    Note: For circular foundations, use <strong>B</strong> as the diameter in the
                    bearing capacity formula.{' '}
                    {!hasBL && (
                      <span className="text-gray-400">
                        Enter B and L above to compute numeric values.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Depth Factors ── */}
          {(() => {
            const Df = parseFloat(dfInput);
            const B = parseFloat(bInput); // reuse B from shape factors
            const phi = parseFloat(phiInput); // reuse φ from interpolation calculator

            const hasDf = !isNaN(Df) && dfInput !== '';
            const hasB = !isNaN(B) && bInput !== '';
            const hasPhi = !isNaN(phi) && phiInput !== '';
            const canCalc = hasDf && hasB && hasPhi && B !== 0;

            // tan(45 + φ/2) term
            const tanTerm = canCalc ? Math.tan(((45 + phi / 2) * Math.PI) / 180) : null;
            const dfbRatio = canCalc ? Df / B : null;

            const dc = canCalc ? 1 + 0.2 * dfbRatio * tanTerm : null;
            const dqdg = canCalc ? (phi <= 10 ? 1 : 1 + 0.1 * dfbRatio * tanTerm) : null;

            const fmtV = (v) => (v !== null && !isNaN(v) ? v.toFixed(4) : null);

            // A single result card matching the shape factors / calculator style
            const DepthCard = ({ label, sub, formula, value, teal }) => (
              <div
                className={`rounded-xl border p-4 flex flex-col gap-1 ${
                  teal
                    ? 'bg-teal-50/50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800'
                    : 'bg-gray-50 dark:bg-gray-100 border-gray-100 dark:border-gray-700'
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    teal ? 'text-teal-600 dark:text-teal-300' : 'text-gray-400'
                  }`}
                >
                  {label}
                  {sub && <sub>{sub}</sub>}
                </p>
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                  {formula}
                </p>
                {value !== null ? (
                  <p
                    className={`text-2xl font-black font-mono tabular-nums mt-1 ${
                      teal ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {value}
                  </p>
                ) : (
                  <p className="text-lg font-black font-mono tabular-nums mt-1 text-gray-300 dark:text-gray-600">
                    —
                  </p>
                )}
              </div>
            );

            // Step-by-step expansion strings (only when values available)
            const dcSteps = canCalc
              ? `dc = 1 + 0.2 × (${Df.toFixed(3)} / ${B.toFixed(3)}) × tan(45° + ${phi.toFixed(2)}°/2)
   = 1 + 0.2 × ${dfbRatio.toFixed(4)} × tan(${(45 + phi / 2).toFixed(4)}°)
   = 1 + 0.2 × ${dfbRatio.toFixed(4)} × ${tanTerm.toFixed(6)}
   = 1 + ${(0.2 * dfbRatio * tanTerm).toFixed(6)}
   = ${dc.toFixed(4)}`
              : null;

            const dqdgSteps = canCalc
              ? phi <= 10
                ? `φ = ${phi.toFixed(2)}° ≤ 10°  →  dq = dγ = 1.0000`
                : `φ = ${phi.toFixed(2)}° > 10°
dq = dγ = 1 + 0.1 × (${Df.toFixed(3)} / ${B.toFixed(3)}) × tan(45° + ${phi.toFixed(2)}°/2)
       = 1 + 0.1 × ${dfbRatio.toFixed(4)} × tan(${(45 + phi / 2).toFixed(4)}°)
       = 1 + 0.1 × ${dfbRatio.toFixed(4)} × ${tanTerm.toFixed(6)}
       = 1 + ${(0.1 * dfbRatio * tanTerm).toFixed(6)}
       = ${dqdg.toFixed(4)}`
              : null;

            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header + Df input */}
                <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-end gap-4 border-b border-gray-100">
                  <div className="flex-1">
                    <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                      Depth Factors Tester
                    </h2>
                    <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                      d<sub>c</sub>, d<sub>q</sub>, d<sub>γ</sub> — enter φ, B and D<sub>f</sub> to
                      compute
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
                    <div className="flex flex-col gap-1.5 w-40">
                      <label className="text-xs text-gray-500 leading-tight w-40 break-words">
                        Considered Angle of Friction
                        <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                          — φ <span className="font-normal text-gray-400">(°)</span>
                        </span>
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={phiInput}
                        onChange={(e) => setPhiInput(e.target.value)}
                        placeholder="e.g. 30"
                        className="w-40 text-center rounded-xl h-9 text-sm font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 w-40">
                      <label className="text-xs text-gray-500 leading-tight w-40 break-words">
                        Width of Foundation
                        <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                          — B <span className="font-normal text-gray-400">(m)</span>
                        </span>
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={bInput}
                        onChange={(e) => setBInput(e.target.value)}
                        placeholder="e.g. 2.0"
                        className="w-40 text-center rounded-xl h-9 text-sm font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 w-40">
                      <label className="text-xs text-gray-500 leading-tight w-40 break-words">
                        Depth of Foundation Below Scour Level
                        <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                          — D<sub>f</sub> <span className="font-normal text-gray-400">(m)</span>
                        </span>
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={dfInput}
                        onChange={(e) => setDfInput(e.target.value)}
                        placeholder="e.g. 1.5"
                        className="w-40 text-center rounded-xl h-9 text-sm font-mono"
                      />
                    </div>
                    {canCalc && (
                      <span className="text-xs font-mono text-gray-500 shrink-0 pb-2">
                        D<sub>f</sub>/B = {dfbRatio.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Result cards */}
                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <DepthCard label="dc" formula="1 + 0.2·(Df/B)·tan(45°+φ/2)" value={fmtV(dc)} />
                    <DepthCard
                      label="dq"
                      formula={
                        canCalc && phi <= 10
                          ? '1  [φ ≤ 10°]'
                          : '1 + 0.1·(Df/B)·tan(45°+φ/2)  [φ > 10°]'
                      }
                      value={fmtV(dqdg)}
                    />
                    <DepthCard
                      label="dγ"
                      formula={
                        canCalc && phi <= 10
                          ? '1  [φ ≤ 10°]'
                          : '1 + 0.1·(Df/B)·tan(45°+φ/2)  [φ > 10°]'
                      }
                      value={fmtV(dqdg)}
                    />
                  </div>

                  {/* Step-by-step */}
                  {canCalc && (
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                        Step-by-step computation
                      </h3>
                      <div className="space-y-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 whitespace-pre-line leading-relaxed">
                          <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                            dc
                          </p>
                          {dcSteps}
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 whitespace-pre-line leading-relaxed">
                          <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                            dq = dγ
                          </p>
                          {dqdgSteps}
                        </div>
                      </div>
                    </div>
                  )}

                  {!canCalc && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      Enter φ, B and D<sub>f</sub> above to compute depth factors.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Inclination Factors ── */}
          {(() => {
            const alpha = parseFloat(alphaInput);
            const phi = parseFloat(phiInput); // shared state

            const hasAlpha = !isNaN(alpha) && alphaInput !== '';
            const hasPhi = !isNaN(phi) && phiInput !== '';
            const canCalc = hasAlpha && hasPhi && phi !== 0;

            const ic = hasAlpha ? Math.pow(1 - alpha / 90, 2) : null;
            const iq = hasAlpha ? Math.pow(1 - alpha / 90, 2) : null;
            const igamma = canCalc ? Math.pow(1 - alpha / phi, 2) : null;

            const fmtV = (v) => (v !== null && !isNaN(v) ? v.toFixed(4) : null);

            const InclCard = ({ label, formula, value }) => (
              <div className="rounded-xl border p-4 flex flex-col gap-1 bg-gray-50 dark:bg-gray-100 border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {label}
                </p>
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                  {formula}
                </p>
                {value !== null ? (
                  <p className="text-2xl font-black font-mono tabular-nums mt-1 text-gray-900 dark:text-gray-100">
                    {value}
                  </p>
                ) : (
                  <p className="text-lg font-black font-mono tabular-nums mt-1 text-gray-300 dark:text-gray-600">
                    —
                  </p>
                )}
              </div>
            );

            const icSteps = hasAlpha
              ? `ic = (1 − α/90)²
   = (1 − ${alpha.toFixed(3)}/90)²
   = (1 − ${(alpha / 90).toFixed(6)})²
   = (${(1 - alpha / 90).toFixed(6)})²
   = ${ic.toFixed(4)}`
              : null;

            const iqSteps = hasAlpha
              ? `iq = (1 − α/90)²
   = (1 − ${alpha.toFixed(3)}/90)²
   = (1 − ${(alpha / 90).toFixed(6)})²
   = (${(1 - alpha / 90).toFixed(6)})²
   = ${iq.toFixed(4)}`
              : null;

            const igSteps = canCalc
              ? `iγ = (1 − α/φ)²
   = (1 − ${alpha.toFixed(3)}/${phi.toFixed(3)})²
   = (1 − ${(alpha / phi).toFixed(6)})²
   = (${(1 - alpha / phi).toFixed(6)})²
   = ${igamma.toFixed(4)}`
              : null;

            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header + inputs */}
                <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-end gap-4 border-b border-gray-100">
                  <div className="flex-1">
                    <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                      Inclination Factors Tester
                    </h2>
                    <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                      i<sub>c</sub>, i<sub>q</sub>, i<sub>γ</sub> — angle of inclination of
                      resultant load
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
                    <div className="flex flex-col gap-1.5 w-40">
                      <label className="text-xs text-gray-500 leading-tight w-40 break-words">
                        Considered Angle of Friction
                        <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                          — φ <span className="font-normal text-gray-400">(°)</span>
                        </span>
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={phiInput}
                        onChange={(e) => setPhiInput(e.target.value)}
                        placeholder="e.g. 30"
                        className="w-40 text-center rounded-xl h-9 text-sm font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 w-40">
                      <label className="text-xs text-gray-500 leading-tight w-40 break-words">
                        Angle of Inclination of Foundation
                        <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                          — α <span className="font-normal text-gray-400">(°)</span>
                        </span>
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="90"
                        value={alphaInput}
                        onChange={(e) => setAlphaInput(e.target.value)}
                        placeholder="e.g. 15"
                        className="w-40 text-center rounded-xl h-9 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Result cards */}
                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <InclCard label="ic" formula="(1 − α/90)²" value={fmtV(ic)} />
                    <InclCard label="iq" formula="(1 − α/90)²" value={fmtV(iq)} />
                    <InclCard label="iγ" formula="(1 − α/φ)²" value={fmtV(igamma)} />
                  </div>

                  {/* Step-by-step */}
                  {(hasAlpha || canCalc) && (
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                        Step-by-step computation
                      </h3>
                      <div className="space-y-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                        {icSteps && (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 whitespace-pre-line leading-relaxed">
                            <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                              ic
                            </p>
                            {icSteps}
                          </div>
                        )}
                        {iqSteps && (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 whitespace-pre-line leading-relaxed">
                            <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                              iq
                            </p>
                            {iqSteps}
                          </div>
                        )}
                        {igSteps ? (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 whitespace-pre-line leading-relaxed">
                            <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                              iγ
                            </p>
                            {igSteps}
                          </div>
                        ) : hasAlpha && !hasPhi ? (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                            <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                              iγ
                            </p>
                            <span className="text-gray-400">
                              Enter φ above to compute iγ = (1 − α/φ)²
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {!hasAlpha && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      Enter α (angle of inclination) above to compute inclination factors.
                    </p>
                  )}

                  <p className="text-xs text-gray-500 italic">
                    where α = angle of inclination of the resultant load with the vertical (degrees)
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Allowable Bearing Capacity ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                Allowable Bearing Capacity
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                Allowable bearing pressure (kN/m²) for 25 mm settlement — Teng&apos;s formula
                (IS:8009)
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2" />
                  <th
                    colSpan={6}
                    className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400"
                  >
                    Width of Footing (B) in m
                  </th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100">
                    <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                      Standard Penetration Test
                    </span>
                    N-value
                  </th>
                  {['1.5', '2.0', '3.0', '4.0', '5.0', '6.0'].map((w) => (
                    <th
                      key={w}
                      className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]"
                    >
                      {w} m
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { n: 5, vals: ['0.120', '0.140', '0.160', '0.170', '0.180', '0.180'] },
                  { n: 10, vals: ['0.030', '0.032', '0.037', '0.039', '0.040', '0.040'] },
                  { n: 15, vals: ['0.017', '0.018', '0.021', '0.022', '0.023', '0.023'] },
                  { n: 20, vals: ['0.013', '0.014', '0.016', '0.016', '0.017', '0.017'] },
                  { n: 25, vals: ['0.009', '0.010', '0.012', '0.013', '0.014', '0.014'] },
                  { n: 30, vals: ['0.0075', '0.008', '0.009', '0.0094', '0.010', '0.010'] },
                  { n: 35, vals: ['0.006', '0.0068', '0.0075', '0.008', '0.0082', '0.0085'] },
                  { n: 40, vals: ['0.0054', '0.0059', '0.0065', '0.0069', '0.007', '0.007'] },
                  { n: 45, vals: ['NA', '0.0054', '0.0058', '0.006', '0.0061', '0.0062'] },
                  { n: 50, vals: ['NA', '0.0048', '0.0052', '0.0055', '0.0057', '0.0058'] },
                  { n: 55, vals: ['NA', '0.0043', '0.0047', '0.0049', '0.005', '0.005'] },
                  { n: 60, vals: ['NA', '0.0038', '0.0042', '0.0045', '0.0046', '0.0046'] },
                ].map(({ n, vals }) => (
                  <tr key={n} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-center text-xs font-mono font-bold text-gray-700 border-r border-gray-100">
                      {n}
                    </td>
                    {vals.map((v, i) => (
                      <td
                        key={i}
                        className={`py-3 px-4 text-center text-xs font-mono tabular-nums ${
                          v === 'NA' ? 'text-gray-300 italic' : 'text-gray-700'
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500 italic">
                For any width of footing &gt; 6.0 m, settlement values that correspond to 6.0 m will
                be taken.
              </p>
            </div>
          </div>

          {/* ── Settlement per Unit Pressure — Chart ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Settlement per Unit Pressure Curves
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                IS : 8009 Part I – 1976 &nbsp;·&nbsp; Settlement vs. footing width &apos;B&apos; for
                varying N-values &nbsp;·&nbsp; Hover for interpolated values
              </p>
            </div>
            <div className="relative w-full" style={{ height: 420 }}>
              <canvas ref={sptSettlementChartRef} />
            </div>
            <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-3">
              Y-axis (log scale): settlement per unit pressure in m per kN/m². X-axis: width of
              footing B in metres. Each curve represents a constant SPT N-value. Data from the
              Allowable Bearing Capacity table above.
            </p>
          </div>

          {/* ── Settlement per Unit Pressure — Interpolation Calculator ── */}
          {(() => {
            const nVal = parseFloat(suptNInput);
            const bVal = parseFloat(suptBInput);

            // Bilinear interpolation on SETTLEMENT_DATA (rows = N, cols = FOOTING_WIDTHS)
            const computeSupt = (n, b) => {
              if (isNaN(n) || isNaN(b) || n <= 0 || b <= 0) return null;

              // Clamp B to table range [1.5, 6.0] — per table note, use 6.0 for B > 6.0
              const bClamped = Math.min(b, FOOTING_WIDTHS[FOOTING_WIDTHS.length - 1]);

              // Find surrounding B column indices
              let bLowIdx = 0;
              for (let i = 0; i < FOOTING_WIDTHS.length - 1; i++) {
                if (bClamped >= FOOTING_WIDTHS[i] && bClamped <= FOOTING_WIDTHS[i + 1]) {
                  bLowIdx = i;
                  break;
                }
                if (bClamped >= FOOTING_WIDTHS[FOOTING_WIDTHS.length - 1]) {
                  bLowIdx = FOOTING_WIDTHS.length - 1;
                }
              }
              const bHighIdx = Math.min(bLowIdx + 1, FOOTING_WIDTHS.length - 1);
              const b0 = FOOTING_WIDTHS[bLowIdx];
              const b1 = FOOTING_WIDTHS[bHighIdx];

              // Find surrounding N row indices
              const nRows = SETTLEMENT_DATA.map((r) => r.n);
              let nLowIdx = 0;
              for (let i = 0; i < nRows.length - 1; i++) {
                if (n >= nRows[i] && n <= nRows[i + 1]) {
                  nLowIdx = i;
                  break;
                }
              }
              if (n <= nRows[0]) nLowIdx = 0;
              if (n >= nRows[nRows.length - 1]) nLowIdx = nRows.length - 2;
              const nHighIdx = Math.min(nLowIdx + 1, nRows.length - 1);
              const n0 = nRows[nLowIdx];
              const n1 = nRows[nHighIdx];

              // Get the four corner values (skip null — treat as extrapolation edge)
              const getVal = (rowIdx, colIdx) => SETTLEMENT_DATA[rowIdx].vals[colIdx] ?? null;
              const v00 = getVal(nLowIdx, bLowIdx);
              const v01 = getVal(nLowIdx, bHighIdx);
              const v10 = getVal(nHighIdx, bLowIdx);
              const v11 = getVal(nHighIdx, bHighIdx);

              // Fall back to available edges if any corner is null (B=1.5 NA for N≥45)
              const safeV0 =
                v00 !== null && v01 !== null
                  ? b0 === b1
                    ? v00
                    : v00 + ((bClamped - b0) / (b1 - b0)) * (v01 - v00)
                  : (v00 ?? v01);
              const safeV1 =
                v10 !== null && v11 !== null
                  ? b0 === b1
                    ? v10
                    : v10 + ((bClamped - b0) / (b1 - b0)) * (v11 - v10)
                  : (v10 ?? v11);

              if (safeV0 === null || safeV1 === null) return null;

              // Interpolate over N
              return n0 === n1 ? safeV0 : safeV0 + ((n - n0) / (n1 - n0)) * (safeV1 - safeV0);
            };

            const result = computeSupt(nVal, bVal);
            const hasResult = result !== null;
            const bClamped = bVal > 6.0 ? 6.0 : bVal;
            const wasClamped = !isNaN(bVal) && bVal > 6.0;

            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                {/* Header */}
                <div>
                  <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Settlement per Unit Pressure — Interpolation Calculator
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Bilinear interpolation on the Allowable Bearing Capacity table &nbsp;·&nbsp;
                    Enter SPT N-value and footing width B to get settlement per unit pressure
                  </p>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 leading-tight">
                      SPT N-value
                      <span className="ml-1 font-bold text-gray-700"> — N</span>
                      <span className="ml-1 font-normal text-gray-400 text-[10px]">(5 – 60)</span>
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="5"
                      max="60"
                      value={suptNInput}
                      onChange={(e) => setSuptNInput(e.target.value)}
                      placeholder="e.g. 22"
                      className="w-full text-center rounded-xl h-9 text-sm font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 leading-tight">
                      Width of Footing
                      <span className="ml-1 font-bold text-gray-700"> — B</span>
                      <span className="ml-1 font-normal text-gray-400 text-[10px]">(m, ≥ 1.5)</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1.5"
                      value={suptBInput}
                      onChange={(e) => setSuptBInput(e.target.value)}
                      placeholder="e.g. 2.5"
                      className="w-full text-center rounded-xl h-9 text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Result */}
                {hasResult ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        Settlement per Unit Pressure — Sf
                      </p>
                      <p className="text-xs font-mono text-gray-500 leading-relaxed mt-0.5">
                        Bilinear interpolation at N = {nVal.toFixed(1)}, B = {bClamped.toFixed(2)} m
                        {wasClamped ? ' (clamped from ' + bVal.toFixed(2) + ' m)' : ''}
                      </p>
                      <p className="text-2xl font-black font-mono tabular-nums mt-1 text-primary">
                        Sf = {fmtDec(result)}
                        <span className="text-sm font-normal text-gray-400 ml-2">m</span>
                      </p>
                      <p className="text-base font-bold font-mono tabular-nums text-gray-500 mt-0.5">
                        = {(result * 1000).toFixed(4)}
                        <span className="text-xs font-normal text-gray-400 ml-2">mm</span>
                      </p>
                    </div>

                    {/* Step-by-step */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                        Interpolation steps
                      </h3>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600 whitespace-pre-line leading-relaxed">
                        {(() => {
                          const nRows = SETTLEMENT_DATA.map((r) => r.n);
                          let nLowIdx = 0;
                          for (let i = 0; i < nRows.length - 1; i++) {
                            if (nVal >= nRows[i] && nVal <= nRows[i + 1]) {
                              nLowIdx = i;
                              break;
                            }
                          }
                          if (nVal <= nRows[0]) nLowIdx = 0;
                          if (nVal >= nRows[nRows.length - 1]) nLowIdx = nRows.length - 2;
                          const nHighIdx = Math.min(nLowIdx + 1, nRows.length - 1);

                          let bLowIdx = 0;
                          for (let i = 0; i < FOOTING_WIDTHS.length - 1; i++) {
                            if (
                              bClamped >= FOOTING_WIDTHS[i] &&
                              bClamped <= FOOTING_WIDTHS[i + 1]
                            ) {
                              bLowIdx = i;
                              break;
                            }
                          }
                          if (bClamped >= FOOTING_WIDTHS[FOOTING_WIDTHS.length - 1])
                            bLowIdx = FOOTING_WIDTHS.length - 2;
                          const bHighIdx = Math.min(bLowIdx + 1, FOOTING_WIDTHS.length - 1);

                          const n0 = nRows[nLowIdx],
                            n1 = nRows[nHighIdx];
                          const b0 = FOOTING_WIDTHS[bLowIdx],
                            b1 = FOOTING_WIDTHS[bHighIdx];
                          const v00 = SETTLEMENT_DATA[nLowIdx].vals[bLowIdx];
                          const v01 = SETTLEMENT_DATA[nLowIdx].vals[bHighIdx];
                          const v10 = SETTLEMENT_DATA[nHighIdx].vals[bLowIdx];
                          const v11 = SETTLEMENT_DATA[nHighIdx].vals[bHighIdx];
                          const r0 =
                            v00 !== null && v01 !== null && b0 !== b1
                              ? v00 + ((bClamped - b0) / (b1 - b0)) * (v01 - v00)
                              : (v00 ?? v01);
                          const r1 =
                            v10 !== null && v11 !== null && b0 !== b1
                              ? v10 + ((bClamped - b0) / (b1 - b0)) * (v11 - v10)
                              : (v10 ?? v11);

                          return [
                            `Bracket N:  N₀ = ${n0},  N₁ = ${n1}`,
                            `Bracket B:  B₀ = ${b0} m,  B₁ = ${b1} m`,
                            ``,
                            `Table values at N = ${n0}:`,
                            `  Sf(N=${n0}, B=${b0}) = ${v00 ?? 'NA'}`,
                            `  Sf(N=${n0}, B=${b1}) = ${v01 ?? 'NA'}`,
                            `  → Interpolate B: Sf₀ = ${r0 !== null ? fmtDec(r0) : 'NA'}`,
                            ``,
                            `Table values at N = ${n1}:`,
                            `  Sf(N=${n1}, B=${b0}) = ${v10 ?? 'NA'}`,
                            `  Sf(N=${n1}, B=${b1}) = ${v11 ?? 'NA'}`,
                            `  → Interpolate B: Sf₁ = ${r1 !== null ? fmtDec(r1) : 'NA'}`,
                            ``,
                            `Interpolate N: Sf = Sf₀ + (N - N₀)/(N₁ - N₀) × (Sf₁ - Sf₀)`,
                            n0 !== n1
                              ? `  = ${fmtDec(r0)} + (${nVal} - ${n0})/(${n1} - ${n0}) × (${fmtDec(r1)} - ${fmtDec(r0)})`
                              : `  N is exactly on row ${n0}, no N-interpolation needed`,
                            `  Sf = ${fmtDec(result)} m`,
                          ].join('\n');
                        })()}
                      </div>
                    </div>

                    {wasClamped && (
                      <p className="text-[10px] text-amber-500 italic">
                        ⚠ B = {bVal.toFixed(2)} m exceeds table maximum of 6.0 m — settlement value
                        for B = 6.0 m was used as per IS:8009 note.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4 italic">
                    Enter N-value (5–60) and footing width B (≥ 1.5 m) to compute.
                  </p>
                )}
              </div>
            );
          })()}
          {/* <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Allowable Bearing Capacity Curves
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Allowable bearing pressure vs. SPT N-value for each footing width &nbsp;·&nbsp; Hover
            for interpolated values
          </p>
        </div>
        <div className="relative w-full" style={{ height: 380 }}>
          <canvas ref={settlementChartRef} />
        </div>
      </div> */}

          {/* ── Fox's Correction — Data Table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                Depth Factor — Fox&apos;s Correction
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                I<sub>f</sub> values vs. depth ratio &nbsp;·&nbsp; IS:8009 Part I – 1976
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                {/* Group label row */}
                <tr className="border-b border-gray-100">
                  <th className="py-2" colSpan={2} />
                  <th
                    colSpan={4}
                    className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400"
                  >
                    Depth Factor I<sub>f</sub> — by L/B ratio
                  </th>
                </tr>
                {/* Column headers */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100">
                    <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                      Scale
                    </span>
                    Region
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100">
                    <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                      D/√LB &nbsp;(top) &nbsp;/&nbsp; LB/√D &nbsp;(bottom)
                    </span>
                    Depth Ratio
                  </th>
                  {['L/B = 1', 'L/B = 9', 'L/B = 25', 'L/B = 100'].map((lbl) => (
                    <th
                      key={lbl}
                      className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]"
                    >
                      <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                        Depth Factor
                      </span>
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* ── Upper half: D/√LB ── */}
                {[
                  { ratio: '0.0', vals: [1.0, 1.0, 1.0, 1.0] },
                  { ratio: '0.2', vals: [0.94, 0.91, 0.88, 0.85] },
                  { ratio: '0.4', vals: [0.87, 0.83, 0.8, 0.77] },
                  { ratio: '0.6', vals: [0.81, 0.77, 0.75, 0.73] },
                  { ratio: '0.8', vals: [0.76, 0.73, 0.72, 0.72] },
                  { ratio: '1.0', vals: [0.72, 0.72, 0.72, 0.72] },
                ].map(({ ratio, vals }, i) => (
                  <tr key={`top-${i}`} className="hover:bg-gray-50/50 transition-colors">
                    {i === 0 && (
                      <td
                        rowSpan={6}
                        className="py-3 px-4 text-center text-xs font-mono font-bold text-gray-700 border-r border-gray-100 align-middle"
                      >
                        <span className="block font-sans text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                          Upper
                        </span>
                        <span className="block font-mono text-gray-500 mt-1 normal-case text-[11px]">
                          D / &radic;LB
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-4 text-center text-xs font-mono tabular-nums text-gray-700 border-r border-gray-100">
                      {ratio}
                    </td>
                    {vals.map((v, j) => (
                      <td
                        key={j}
                        className="py-3 px-4 text-center text-xs font-mono tabular-nums text-gray-700"
                      >
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* ── Divider row ── */}
                <tr className="bg-gray-100/20">
                  <td
                    colSpan={6}
                    className="py-0 px-4 text-center text-[10px] uppercase tracking-widest font-bold text-gray-400 border-y border-gray-200"
                  >
                    ── mid-point crossover ──
                  </td>
                </tr>

                {/* ── Lower half: LB/√D ── */}
                {[
                  { ratio: '0.8', vals: [0.67, 0.7, 0.71, 0.72] },
                  { ratio: '0.6', vals: [0.62, 0.67, 0.69, 0.71] },
                  { ratio: '0.4', vals: [0.57, 0.63, 0.66, 0.68] },
                  { ratio: '0.2', vals: [0.53, 0.58, 0.61, 0.63] },
                  { ratio: '0.0', vals: [0.5, 0.5, 0.5, 0.5] },
                ].map(({ ratio, vals }, i) => (
                  <tr key={`bot-${i}`} className="hover:bg-gray-50/50 transition-colors">
                    {i === 0 && (
                      <td
                        rowSpan={5}
                        className="py-3 px-4 text-center text-xs font-mono font-bold text-gray-700 border-r border-gray-100 align-middle"
                      >
                        <span className="block font-sans text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                          Lower
                        </span>
                        <span className="block font-mono text-gray-500 mt-1 normal-case text-[11px]">
                          LB / &radic;D
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-4 text-center text-xs font-mono tabular-nums text-gray-700 border-r border-gray-100">
                      {ratio}
                    </td>
                    {vals.map((v, j) => (
                      <td
                        key={j}
                        className="py-3 px-4 text-center text-xs font-mono tabular-nums text-gray-700"
                      >
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500 italic">
                Upper half: depth ratio = D/&radic;LB (depth ÷ square root of plan area). Lower
                half: depth ratio = LB/&radic;D (inverted scale). At the crossover (ratio = 1.0 /
                0.0) all curves converge at I<sub>f</sub> ≈ 0.72. At zero depth, I<sub>f</sub> =
                1.00; at maximum depth ratio, I<sub>f</sub> = 0.50.
              </p>
            </div>
          </div>

          {/* ── Fox's Correction Curves ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Depth Factor Curves
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Fox&apos;s Correction Curves &nbsp;·&nbsp; IS:8009 Part I – 1976 &nbsp;·&nbsp; Depth
                factor (I<sub>f</sub>) vs. depth ratio for varying L/B
              </p>
            </div>

            {/* Dual Y-axis labels rendered alongside the canvas */}
            <div className="flex gap-3 items-stretch">
              {/* Left label column */}
              <div className="flex flex-col justify-between items-end text-right w-20 shrink-0 pb-8">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
                    Top half
                  </p>
                  <p className="text-[10px] font-mono text-gray-500 mt-0.5">D / &radic;LB</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
                    <span key={v} className="text-[9px] font-mono text-gray-400 leading-none">
                      {v.toFixed(1)}
                    </span>
                  ))}
                </div>
                <div className="border-t border-gray-300 w-full my-1" />
                <div className="flex flex-col items-end gap-0.5">
                  {[0.8, 0.6, 0.4, 0.2, 0].map((v) => (
                    <span key={v} className="text-[9px] font-mono text-gray-400 leading-none">
                      {v.toFixed(1)}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
                    Bottom half
                  </p>
                  <p className="text-[10px] font-mono text-gray-500 mt-0.5">LB / &radic;D</p>
                </div>
              </div>

              {/* Chart */}
              <div className="relative flex-1" style={{ height: 440 }}>
                <canvas ref={foxChartRef} />
              </div>
            </div>

            <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-3">
              Upper half of chart: ordinate is D/&radic;LB (depth to equivalent square root of plan
              area). Lower half: ordinate is LB/&radic;D (inverted). The dashed horizontal line
              marks the crossover at the mid-point (value = 1.0 on both scales). Depth factor I
              <sub>f</sub> is read on the top axis.
            </p>
          </div>

          {/* ── Depth Factor Interpolation Calculator ── */}
          {(() => {
            // FOX_DATASETS is already defined above in this component scope.
            // Re-use the same data for interpolation here.

            // Interpolate If given a normalised y-axis value and L/B ratio.
            // The chart stores data as { x: If, y: depthRatio } so we need to
            // interpolate x (If) for a given y (depthRatio).
            const interpFox = (ds, depthRatio) => {
              // Sort by y ascending
              const pts = [...ds.data].sort((a, b) => a.y - b.y);
              if (pts.length === 0) return null;
              if (depthRatio <= pts[0].y) return pts[0].x;
              if (depthRatio >= pts[pts.length - 1].y) return pts[pts.length - 1].x;
              for (let i = 0; i < pts.length - 1; i++) {
                if (depthRatio >= pts[i].y && depthRatio <= pts[i + 1].y) {
                  const t = (depthRatio - pts[i].y) / (pts[i + 1].y - pts[i].y);
                  return pts[i].x + t * (pts[i + 1].x - pts[i].x);
                }
              }
              return null;
            };

            // Interpolate between two L/B curves for a given L/B ratio
            const interpBetweenCurves = (lbRatio, depthRatio) => {
              const lbValues = [1, 9, 25, 100];
              const clampedLB = Math.max(1, Math.min(100, lbRatio));

              // Find bounding L/B curves
              let loIdx = 0;
              for (let i = 0; i < lbValues.length - 1; i++) {
                if (clampedLB >= lbValues[i] && clampedLB <= lbValues[i + 1]) {
                  loIdx = i;
                  break;
                }
                if (clampedLB > lbValues[lbValues.length - 1]) loIdx = lbValues.length - 2;
              }

              const lbLo = lbValues[loIdx];
              const lbHi = lbValues[loIdx + 1];
              const dsLo = FOX_DATASETS[loIdx];
              const dsHi = FOX_DATASETS[loIdx + 1];

              const ifLo = interpFox(dsLo, depthRatio);
              const ifHi = interpFox(dsHi, depthRatio);

              if (ifLo === null || ifHi === null) return { value: null, lbLo, lbHi, ifLo, ifHi };

              const t = (clampedLB - lbLo) / (lbHi - lbLo);
              return { value: ifLo + t * (ifHi - ifLo), lbLo, lbHi, ifLo, ifHi, t };
            };

            const foxDInput = foxDepthInput ?? '';
            const foxLInput = foxLengthInput ?? '';
            const foxBInput = foxWidthInput ?? '';

            const D_fox = parseFloat(foxDInput);
            const L_fox = parseFloat(foxLInput);
            const B_fox = parseFloat(foxBInput);

            const hasD = !isNaN(D_fox) && foxDInput !== '';
            const hasL = !isNaN(L_fox) && foxLInput !== '';
            const hasB = !isNaN(B_fox) && foxBInput !== '';
            const canCalcFox = hasD && hasL && hasB && L_fox > 0 && B_fox > 0;

            // Compute depth ratio (normalised y) — upper half: D/√(L×B)
            const sqrtLB = canCalcFox ? Math.sqrt(L_fox * B_fox) : null;
            const depthRatioRaw = canCalcFox ? D_fox / sqrtLB : null;

            // Chart y-axis: upper half 0→1 maps to D/√LB 0→1; lower half 1→2 maps to LB/√D 0→1
            // For the upper half (D/√LB ≤ 1) the normalised y = depthRatio directly.
            // For the lower half (D/√LB > 1) we use 2 - LB/√D mapping, but typically
            // engineers read off the upper half when D/√LB ≤ 1.  Cap at the chart range.
            const normalizedY = canCalcFox ? Math.min(depthRatioRaw, 2.0) : null;

            const interpResult = canCalcFox
              ? interpBetweenCurves(L_fox / B_fox, normalizedY)
              : null;

            const If_value = interpResult?.value ?? null;
            const fmtIf = (v) => (v !== null && !isNaN(v) ? v.toFixed(3) : null);

            // Curve colors matching the chart
            const curveColors = { 1: '#ef4444', 9: '#22c55e', 25: '#3b82f6', 100: '#a855f7' };

            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div>
                    <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Depth Factor - Interpolation Calculator
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Fox&apos;s Correction &nbsp;·&nbsp; Enter D, L, B to read I<sub>f</sub> from
                      the chart curves
                    </p>
                  </div>

                  {/* Inputs */}
                  <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
                    {[
                      {
                        label: 'Depth of Foundation',
                        symbol: 'D',
                        unit: 'm',
                        val: foxDInput,
                        set: setFoxDepthInput,
                        placeholder: 'e.g. 1.5',
                      },
                      {
                        label: 'Length of Foundation',
                        symbol: 'L',
                        unit: 'm',
                        val: foxLInput,
                        set: setFoxLengthInput,
                        placeholder: 'e.g. 3.0',
                      },
                      {
                        label: 'Width of Foundation',
                        symbol: 'B',
                        unit: 'm',
                        val: foxBInput,
                        set: setFoxWidthInput,
                        placeholder: 'e.g. 2.0',
                      },
                    ].map(({ label, symbol, unit, val, set, placeholder }) => (
                      <div key={symbol} className="flex flex-col gap-1.5 w-36">
                        <label className="text-xs text-gray-500 leading-tight break-words">
                          {label}
                          <span className="ml-1 font-bold text-gray-700">
                            — {symbol} <span className="font-normal text-gray-400">({unit})</span>
                          </span>
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          placeholder={placeholder}
                          className="w-36 text-center rounded-xl h-9 text-sm font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {canCalcFox ? (
                  <div className="space-y-4">
                    {/* Result */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* D/√LB */}
                      <div className="rounded-xl border bg-gray-50 border-gray-100 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          D / &radic;LB
                        </p>
                        <p className="text-xs font-mono text-gray-500 mt-0.5">
                          {D_fox.toFixed(3)} / &radic;({L_fox.toFixed(3)} × {B_fox.toFixed(3)})
                        </p>
                        <p className="text-2xl font-black font-mono tabular-nums mt-1 text-gray-900">
                          {depthRatioRaw.toFixed(4)}
                        </p>
                      </div>

                      {/* L/B */}
                      <div className="rounded-xl border bg-gray-50 border-gray-100 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          L / B ratio
                        </p>
                        <p className="text-xs font-mono text-gray-500 mt-0.5">
                          {L_fox.toFixed(3)} / {B_fox.toFixed(3)}
                        </p>
                        <p className="text-2xl font-black font-mono tabular-nums mt-1 text-gray-900">
                          {(L_fox / B_fox).toFixed(4)}
                        </p>
                      </div>

                      {/* Depth factor If */}
                      <div className="col-span-2 rounded-xl border bg-primary/5 border-primary/20 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                          Depth Factor I<sub>f</sub>
                        </p>
                        <p className="text-xs font-mono text-gray-500 mt-0.5">
                          Interpolated from Fox&apos;s chart at D/&radic;LB ={' '}
                          {depthRatioRaw.toFixed(4)}, L/B = {(L_fox / B_fox).toFixed(2)}
                        </p>
                        {fmtIf(If_value) !== null ? (
                          <p className="text-3xl font-black font-mono tabular-nums mt-1 text-primary">
                            {fmtIf(If_value)}
                          </p>
                        ) : (
                          <p className="text-2xl font-black font-mono tabular-nums mt-1 text-gray-300">
                            —
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Step-by-step */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                        Step-by-step computation
                      </h3>

                      <div className="space-y-2 text-xs font-mono text-gray-600">
                        {/* Step 1: depth ratio */}
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <p className="font-bold text-gray-500 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                            Step 1 — Compute D / &radic;LB
                          </p>
                          <p>
                            D / &radic;LB = {D_fox.toFixed(3)} / &radic;({L_fox.toFixed(3)} ×{' '}
                            {B_fox.toFixed(3)}) = {D_fox.toFixed(3)} / {sqrtLB.toFixed(4)} ={' '}
                            <strong>{depthRatioRaw.toFixed(4)}</strong>
                            {depthRatioRaw > 1.0 && (
                              <span className="ml-2 text-amber-600">
                                ⚠ value &gt; 1 — reading from lower half of chart (LB/&radic;D
                                scale)
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Step 2: bounding curves */}
                        {interpResult && (
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="font-bold text-gray-500 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                              Step 2 — Identify bounding L/B curves
                            </p>
                            <p>
                              L/B = {(L_fox / B_fox).toFixed(2)} lies between{' '}
                              <span style={{ color: curveColors[interpResult.lbLo] }}>
                                L/B = {interpResult.lbLo}
                              </span>{' '}
                              and{' '}
                              <span style={{ color: curveColors[interpResult.lbHi] }}>
                                L/B = {interpResult.lbHi}
                              </span>
                            </p>
                          </div>
                        )}

                        {/* Step 3: read off each curve */}
                        {interpResult &&
                          interpResult.ifLo !== null &&
                          interpResult.ifHi !== null && (
                            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                              <p className="font-bold text-gray-500 mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                                Step 3 — Read I<sub>f</sub> from each bounding curve at D/&radic;LB
                                = {depthRatioRaw.toFixed(4)}
                              </p>
                              <p style={{ color: curveColors[interpResult.lbLo] }}>
                                I<sub>f</sub> (L/B = {interpResult.lbLo}) ={' '}
                                {interpResult.ifLo.toFixed(4)}
                              </p>
                              <p
                                style={{ color: curveColors[interpResult.lbHi] }}
                                className="mt-0.5"
                              >
                                I<sub>f</sub> (L/B = {interpResult.lbHi}) ={' '}
                                {interpResult.ifHi.toFixed(4)}
                              </p>
                            </div>
                          )}

                        {/* Step 4: linear interpolation between curves */}
                        {interpResult && interpResult.value !== null && (
                          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                            <p className="font-bold text-primary mb-1 non-italic font-sans text-[10px] uppercase tracking-widest">
                              Step 4 — Interpolate between curves
                            </p>
                            <p className="text-gray-600">
                              t = (L/B − {interpResult.lbLo}) / ({interpResult.lbHi} −{' '}
                              {interpResult.lbLo}) = ({(L_fox / B_fox).toFixed(4)} −{' '}
                              {interpResult.lbLo}) / {interpResult.lbHi - interpResult.lbLo} ={' '}
                              {interpResult.t.toFixed(6)}
                            </p>
                            <p className="text-gray-600 mt-0.5">
                              I<sub>f</sub> = {interpResult.ifLo.toFixed(4)} +{' '}
                              {interpResult.t.toFixed(6)} × ({interpResult.ifHi.toFixed(4)} −{' '}
                              {interpResult.ifLo.toFixed(4)}) ={' '}
                              <strong className="text-primary">{fmtIf(If_value)}</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Enter D, L, and B above to compute the depth factor I<sub>f</sub>.
                  </div>
                )}
              </div>
            );
          })()}
          {/* ── Bearing Capacity ── */}
          {(() => {
            // ── Pull all shared computed values ──────────────────────────────────
            const phi = parseFloat(phiInput);
            const B_raw = parseFloat(bInput);
            const alpha = parseFloat(alphaInput);

            const hasPhi = !isNaN(phi) && phiInput !== '';
            const hasB_raw = !isNaN(B_raw) && bInput !== '';
            const hasAlpha = !isNaN(alpha) && alphaInput !== '';

            // Derive effective L from shape
            const L_raw = parseFloat(lInput);
            const hasL_raw = !isNaN(L_raw) && lInput !== '' && L_raw !== 0;
            const B = hasB_raw ? B_raw : null;
            const L = (() => {
              if (B === null) return null;
              switch (shapeInput) {
                case 'square':
                  return B;
                case 'circle':
                  return B;
                case 'strip':
                  return 100 * B;
                default:
                  return hasL_raw ? L_raw : null;
              }
            })();
            const hasB = B !== null;
            const hasL = L !== null && L !== 0;

            // Interpolated factors (from base table)
            const phiPrime = hasPhi ? derivePhiPrime(phi) : null;
            const Nc = hasPhi ? interpolateY(ncPts, phi) : null;
            const Nq = hasPhi ? interpolateY(nqPts, phi) : null;
            const Ng = hasPhi ? interpolateY(ngPts, phi) : null;
            const NcP = hasPhi ? interpolateY(ncPts, phiPrime) : null;
            const NqP = hasPhi ? interpolateY(nqPts, phiPrime) : null;
            const NgP = hasPhi ? interpolateY(ngPts, phiPrime) : null; // N′γ

            // Shape factors
            const ratio = hasB && hasL ? B / L : null;
            const Sc = (() => {
              if (shapeInput === 'square' || shapeInput === 'circle') return 1.3;
              return ratio !== null ? 1 + 0.2 * ratio : null;
            })();
            const Sq = (() => {
              if (shapeInput === 'square' || shapeInput === 'circle') return 1.2;
              return ratio !== null ? 1 + 0.2 * ratio : null;
            })();
            const Sg = (() => {
              if (shapeInput === 'square') return 0.8;
              if (shapeInput === 'circle') return 0.6;
              return ratio !== null ? 1 - 0.4 * ratio : null;
            })();

            // Depth factors
            const Df = parseFloat(dfInput);
            const hasDf = !isNaN(Df) && dfInput !== '';
            const tanT =
              hasPhi && hasB && hasDf ? Math.tan(((45 + phi / 2) * Math.PI) / 180) : null;
            const dfbR = hasB && hasDf ? Df / B : null;
            const dc_v = tanT !== null ? 1 + 0.2 * dfbR * tanT : null;
            const dqdg_v = tanT !== null ? (phi <= 10 ? 1 : 1 + 0.1 * dfbR * tanT) : null;

            // Inclination factors
            const ic_v = hasAlpha ? Math.pow(1 - alpha / 90, 2) : null;
            const iq_v = hasAlpha ? Math.pow(1 - alpha / 90, 2) : null;
            const ig_v = hasAlpha && hasPhi && phi !== 0 ? Math.pow(1 - alpha / phi, 2) : null;

            // Additional inputs specific to bearing capacity
            const c = parseFloat(cInput);
            const gamma = parseFloat(gammaInput);
            const fos = parseFloat(fosInput);

            const hasC = !isNaN(c) && cInput !== '';
            const hasGamma = !isNaN(gamma) && gammaInput !== '';
            const fosInRange = !isNaN(fos) && fos >= 2 && fos <= 3;
            const fosOutOfRange = !isNaN(fos) && fosInput !== '' && (fos < 2 || fos > 3);
            const hasFos = !isNaN(fos) && fosInput !== '' && fosInRange;

            // Derived: effective unit weight and effective overburden pressure
            const gammaSub = hasGamma ? Math.max(0, gamma - 10) : null;
            const q = hasGamma && hasDf ? gammaSub * Df : null;
            const hasQ = q !== null;

            // W′ — system-defined constant 0.5; capped to 0.75 when q > 200 kN/m²
            const W = hasQ && q > 200 ? 0.75 : W_CONSTANT;
            const hasW = true;

            // All factors present for a full calculation
            const allFactors =
              hasPhi &&
              hasB &&
              hasL &&
              hasDf &&
              hasAlpha &&
              hasC &&
              hasQ &&
              hasGamma &&
              hasW &&
              Nc !== null &&
              Nq !== null &&
              Ng !== null &&
              NcP !== null &&
              NgP !== null &&
              Sc !== null &&
              Sq !== null &&
              Sg !== null &&
              dc_v !== null &&
              dqdg_v !== null &&
              ic_v !== null &&
              iq_v !== null &&
              ig_v !== null;

            // ── Formula terms ────────────────────────────────────────────────────
            // Local shear (uses N′ factors):
            //   (2/3)·c·N′c·Sc·dc·ic + q·(N′q−1)·Sq·dq·iq + 0.5·γ·B·N′γ·Sγ·dγ·iγ·W′
            // General shear (uses N factors):
            //   c·Nc·Sc·dc·ic + q·(Nq−1)·Sq·dq·iq + 0.5·γ·B·Nγ·Sγ·dγ·iγ·W′

            const localTerm1 = allFactors ? (2 / 3) * c * NcP * Sc * dc_v * ic_v : null;
            const localTerm2 = allFactors ? q * (NqP - 1) * Sq * dqdg_v * iq_v : null;
            const localTerm3 = allFactors ? 0.5 * gamma * B * NgP * Sg * dqdg_v * ig_v * W : null;
            const qdLocal = allFactors
              ? (2 / 3) * c * NcP * Sc * dc_v * ic_v +
                q * (NqP - 1) * Sq * dqdg_v * iq_v +
                0.5 * gamma * B * NgP * Sg * dqdg_v * ig_v * W
              : null;

            const genTerm1 = allFactors ? c * Nc * Sc * dc_v * ic_v : null;
            const genTerm2 = allFactors ? q * (Nq - 1) * Sq * dqdg_v * iq_v : null;
            const genTerm3 = allFactors ? 0.5 * gamma * B * Ng * Sg * dqdg_v * ig_v * W : null;
            const qdGeneral = allFactors ? genTerm1 + genTerm2 + genTerm3 : null;

            const qdIntermed = allFactors ? 0.5 * (qdLocal + qdGeneral) : null;

            // Which formula applies?
            const regime = hasPhi
              ? phi <= 28
                ? 'local'
                : phi >= 36
                  ? 'general'
                  : 'intermediate'
              : null;

            const qd =
              regime === 'local'
                ? qdLocal
                : regime === 'general'
                  ? qdGeneral
                  : regime === 'intermediate'
                    ? qdIntermed
                    : null;

            const qs = qd !== null && hasFos ? qd / fos : null;

            const fmtV4 = (v) => (v !== null && !isNaN(v) ? v.toFixed(4) : '—');
            const fmtV2 = (v) => (v !== null && !isNaN(v) ? v.toFixed(2) : '—');

            const regimeLabel = {
              local: 'Local Shear Failure (φ ≤ 28°)',
              intermediate: 'Intermediate Shear Failure (28° < φ < 36°)',
              general: 'General Shear Failure (φ ≥ 36°)',
            };

            const regimeColor = {
              local:
                'bg-amber-50/60 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300',
              intermediate:
                'bg-blue-50/60 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300',
              general:
                'bg-green-50/60 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-300',
            };

            return (
              <div className="hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                  <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                    Part 1. Bearing Capacity - Shear Critiria
                  </h2>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                    Ultimate q<sub>d</sub> and safe q<sub>s</sub> per IS 6403
                  </p>
                </div>

                <div className="px-6 py-5 space-y-6">
                  {/* ── Input grid ── */}
                  <div>
                    {/* <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Inputs — shared values auto-filled from above
                </p> */}
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
                    >
                      <BcInputRow
                        description="Considered Angle of Friction"
                        symbol="φ"
                        unit="°"
                        value={phiInput}
                        onChange={setPhiInput}
                        placeholder="e.g. 30"
                      />

                      <div className="col-span-full flex flex-col gap-1.5">
                        <label className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                          Type of Soil
                        </label>
                        <Select value={soilTypeInput} onValueChange={setSoilTypeInput}>
                          <SelectTrigger className="w-full rounded-xl h-9 text-sm font-mono">
                            <SelectValue placeholder="Select type of soil" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clay">Clay</SelectItem>
                            <SelectItem value="silt">Silt</SelectItem>
                            <SelectItem value="sand">Sand</SelectItem>
                            <SelectItem value="gravel">Gravel</SelectItem>
                            <SelectItem value="rock">Rock</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Shape of Footing — full-width row */}
                      <div className="col-span-full flex flex-col gap-1.5">
                        <label className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                          Shape of Footing
                        </label>
                        <Select value={shapeInput} onValueChange={setShapeInput}>
                          <SelectTrigger className="w-full rounded-xl h-9 text-sm font-mono">
                            <SelectValue placeholder="Select shape" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rectangle">Rectangle</SelectItem>
                            <SelectItem value="square">Square</SelectItem>
                            <SelectItem value="circle">Circle</SelectItem>
                            <SelectItem value="strip">Continuous Strip</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Shape-aware B / L inputs */}
                      {shapeInput === 'circle' ? (
                        <BcInputRow
                          description="Diameter of Foundation"
                          symbol="d"
                          unit="m"
                          value={bInput}
                          onChange={setBInput}
                          placeholder="e.g. 1.5"
                        />
                      ) : shapeInput === 'strip' ? (
                        <BcInputRow
                          description="Strip Width"
                          symbol="B"
                          unit="m"
                          value={bInput}
                          onChange={setBInput}
                          placeholder="e.g. 2.0"
                        />
                      ) : (
                        <>
                          <BcInputRow
                            description="Width of Foundation"
                            symbol="B"
                            unit="m"
                            value={bInput}
                            onChange={setBInput}
                            placeholder="e.g. 2.0"
                          />
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-500 dark:text-gray-400 leading-tight break-words">
                              Length of Foundation
                              <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                                — L<span className="font-normal text-gray-400 ml-0.5">(m)</span>
                              </span>
                              {shapeInput === 'square' && (
                                <span className="ml-1 text-[10px] text-primary">(= B)</span>
                              )}
                            </label>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={shapeInput === 'square' ? bInput : lInput}
                              onChange={(e) => shapeInput !== 'square' && setLInput(e.target.value)}
                              readOnly={shapeInput === 'square'}
                              placeholder={shapeInput === 'square' ? 'same as B' : 'e.g. 3.0'}
                              className={`w-full text-center rounded-xl h-9 text-sm font-mono ${shapeInput === 'square' ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                            />
                          </div>
                        </>
                      )}
                      <BcInputRow
                        description="Depth of Foundation Below Scour Level"
                        symbol="Df"
                        unit="m"
                        value={dfInput}
                        onChange={setDfInput}
                        placeholder="e.g. 1.5"
                      />
                      <BcInputRow
                        description="Angle of Inclination of Foundation"
                        symbol="α"
                        unit="°"
                        value={alphaInput}
                        onChange={setAlphaInput}
                        placeholder="e.g. 15"
                      />
                      <BcInputRow
                        description="Cohesion"
                        symbol="c"
                        unit="kN/m²"
                        value={cInput}
                        onChange={setCInput}
                        placeholder="e.g. 20"
                      />
                      <BcInputRow
                        description="Bulk Unit Weight"
                        symbol="γ"
                        unit="kN/m³"
                        value={gammaInput}
                        onChange={setGammaInput}
                        placeholder="e.g. 18"
                      />
                      {/* Computed: Effective Unit Weight */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 leading-tight break-words">
                          Effective Unit Weight
                          <span className="ml-1 font-bold text-gray-700">
                            — γ<sub>sub</sub>{' '}
                            <span className="font-normal text-gray-400">(kN/m³)</span>
                          </span>
                        </label>
                        <div className="h-10 px-3 flex items-center rounded-xl border border-gray-200 bg-gray-50 select-none">
                          <span className="text-sm font-semibold text-primary tabular-nums font-mono">
                            {hasGamma ? `${Math.max(0, gamma - 10).toFixed(3)} kN/m³` : '—'}
                          </span>
                        </div>
                        {hasGamma && (
                          <span className="text-[10px] text-gray-400 italic">
                            γ − 10 = {gamma} − 10
                          </span>
                        )}
                      </div>
                      {/* Computed: Effective Overburden Pressure */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 leading-tight break-words">
                          Effective Overburden Pressure
                          <span className="ml-1 font-bold text-gray-700">
                            — q <span className="font-normal text-gray-400">(kN/m²)</span>
                          </span>
                        </label>
                        <div className="h-10 px-3 flex items-center rounded-xl border border-gray-200 bg-gray-50 select-none">
                          <span className="text-sm font-semibold text-primary tabular-nums font-mono">
                            {hasQ ? `${q.toFixed(3)} kN/m²` : '—'}
                          </span>
                        </div>
                        {hasQ && (
                          <span className="text-[10px] text-gray-400 italic">
                            γ<sub>sub</sub> × Df = {gammaSub.toFixed(3)} × {Df.toFixed(3)}
                          </span>
                        )}
                      </div>
                      {/* System constant: Water Table Correction */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 leading-tight break-words">
                          Water Table Correction
                          <span className="ml-1 font-bold text-gray-700">
                            — W′ <span className="font-normal text-gray-400">(-)</span>
                          </span>
                        </label>
                        <div className="h-10 px-3 flex items-center rounded-xl border border-primary/20 bg-primary/5 select-none">
                          <span className="text-sm font-semibold text-primary tabular-nums font-mono">
                            {W}
                            {hasQ && q > 200 && (
                              <span className="ml-2 text-[10px] text-amber-600 font-sans">
                                ↑ capped (q &gt; 200 kN/m²)
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 italic">
                          System constant: 0.5 {hasQ && q > 200 ? '→ 0.75 (q > 200)' : ''}
                        </span>
                      </div>
                      <BcInputRow
                        description="Factor of Safety"
                        symbol="FOS"
                        unit="-"
                        value={fosInput}
                        onChange={setFosInput}
                        placeholder="e.g. 3"
                      />
                      {fosOutOfRange && (
                        <p className="text-[10px] text-red-500 mt-0.5">
                          FOS must be between 2.0 and 3.0
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Regime badge ── */}
                  {hasPhi && (
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${regimeColor[regime]}`}
                    >
                      <span>Regime:</span>
                      <span>{regimeLabel[regime]}</span>
                    </div>
                  )}

                  {/* ── Intermediate factors summary ── */}
                  {allFactors && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      {[
                        ['Nc', fmtV4(Nc)],
                        ['Nq', fmtV4(Nq)],
                        ['Nγ', fmtV4(Ng)],
                        ['N′c', fmtV4(NcP)],
                        ['N′q', fmtV4(NqP)],
                        ['N′γ', fmtV4(NgP)],
                        ['Sc', fmtV4(Sc)],
                        ['Sq', fmtV4(Sq)],
                        ['Sγ', fmtV4(Sg)],
                        ['dc', fmtV4(dc_v)],
                        ['dq', fmtV4(dqdg_v)],
                        ['dγ', fmtV4(dqdg_v)],
                        ['ic', fmtV4(ic_v)],
                        ['iq', fmtV4(iq_v)],
                        ['iγ', fmtV4(ig_v)],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between gap-1 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700"
                        >
                          <span className="text-gray-500">{k}</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Result cards ── */}
                  {allFactors ? (
                    <div className="space-y-3">
                      {/* Local shear */}
                      {(regime === 'local' || regime === 'intermediate') && (
                        <BcResultCard
                          label="qd (Local)"
                          formula="(2/3)·c·N′c·Sc·dc·ic + q·(N′q−1)·Sq·dq·iq + 0.5·γ·B·N′γ·Sγ·dγ·iγ·W′"
                          value={`${fmtV2(qdLocal)} kN/m²`}
                          highlight={regime === 'local'}
                        />
                      )}
                      {/* General shear */}
                      {(regime === 'general' || regime === 'intermediate') && (
                        <BcResultCard
                          label="qd (General)"
                          formula="c·Nc·Sc·dc·ic + q·(Nq−1)·Sq·dq·iq + 0.5·γ·B·Nγ·Sγ·dγ·iγ·W′"
                          value={`${fmtV2(qdGeneral)} kN/m²`}
                          highlight={regime === 'general'}
                        />
                      )}
                      {/* Intermediate */}
                      {regime === 'intermediate' && (
                        <BcResultCard
                          label="qd (Intermediate) — Final"
                          formula="½ × (qd_local + qd_general)"
                          value={`${fmtV2(qdIntermed)} kN/m²`}
                          highlight
                        />
                      )}
                      {/* Safe bearing capacity */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <BcResultCard
                          label="Ultimate Bearing Capacity - qd"
                          formula={`Applicable to: ${regimeLabel[regime]}`}
                          value={`${fmtV2(qd)} kN/m²`}
                          highlight
                        />
                        <BcResultCard
                          label="Safe Bearing Capacity - qs"
                          formula={`qs = qd / FOS = ${fmtV2(qd)} / ${fos}`}
                          value={hasFos ? `${fmtV2(qs)} kN/m²` : '— (enter FOS)'}
                          highlight={hasFos}
                        />
                      </div>

                      {/* Step-by-step */}
                      <div className="space-y-2 pt-1">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                          Step-by-step computation
                        </h3>
                        <div className="space-y-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                          {(regime === 'local' || regime === 'intermediate') && (
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 whitespace-pre-line leading-relaxed">
                              <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                                qd (Local Shear)
                              </p>
                              {`= (2/3) × ${fmtV4(c)} × ${fmtV4(NcP)} × ${fmtV4(Sc)} × ${fmtV4(dc_v)} × ${fmtV4(ic_v)}
  + ${fmtV4(q)} × (${fmtV4(NqP)} − 1) × ${fmtV4(Sq)} × ${fmtV4(dqdg_v)} × ${fmtV4(iq_v)}
  + 0.5 × ${fmtV4(gamma)} × ${fmtV4(B)} × ${fmtV4(NgP)} × ${fmtV4(Sg)} × ${fmtV4(dqdg_v)} × ${fmtV4(ig_v)} × ${fmtV4(W)}
= ${fmtV4((2 / 3) * c * NcP * Sc * dc_v * ic_v)} + ${fmtV4(q * (NqP - 1) * Sq * dqdg_v * iq_v)} + ${fmtV4(0.5 * gamma * B * NgP * Sg * dqdg_v * ig_v * W)}
= ${fmtV2(qdLocal)} kN/m²`}
                            </div>
                          )}
                          {(regime === 'general' || regime === 'intermediate') && (
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 whitespace-pre-line leading-relaxed">
                              <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                                qd (General Shear)
                              </p>
                              {`= ${fmtV4(c)} × ${fmtV4(Nc)} × ${fmtV4(Sc)} × ${fmtV4(dc_v)} × ${fmtV4(ic_v)}
  + ${fmtV4(q)} × (${fmtV4(Nq)} − 1) × ${fmtV4(Sq)} × ${fmtV4(dqdg_v)} × ${fmtV4(iq_v)}
  + 0.5 × ${fmtV4(gamma)} × ${fmtV4(B)} × ${fmtV4(Ng)} × ${fmtV4(Sg)} × ${fmtV4(dqdg_v)} × ${fmtV4(ig_v)} × ${fmtV4(W)}
= ${fmtV4(genTerm1)} + ${fmtV4(genTerm2)} + ${fmtV4(genTerm3)}
= ${fmtV2(qdGeneral)} kN/m²`}
                            </div>
                          )}
                          {regime === 'intermediate' && (
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 whitespace-pre-line leading-relaxed">
                              <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                                qd (Intermediate)
                              </p>
                              {`= ½ × (${fmtV2(qdLocal)} + ${fmtV2(qdGeneral)})
= ½ × ${fmtV2(qdLocal + qdGeneral)}
= ${fmtV2(qdIntermed)} kN/m²`}
                            </div>
                          )}
                          {hasFos && (
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 whitespace-pre-line leading-relaxed">
                              <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-primary mb-1 not-italic">
                                qs (Safe Bearing Capacity)
                              </p>
                              {`qs = qd / FOS
   = ${fmtV2(qd)} / ${fos}
   = ${fmtV2(qs)} kN/m²`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">
                      Fill all inputs above (φ, B, L, Df, α, c, γ) to compute bearing capacity.
                    </p>
                  )}

                  <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
                    <p>
                      c = cohesion (kN/m²) · q = γ<sub>sub</sub> × Df = effective overburden
                      pressure (kN/m²) · γ = bulk unit weight of soil (kN/m³)
                    </p>
                    <p>
                      W′ = water table correction factor (system constant: 0.5; 0.75 when q &gt; 200
                      kN/m²) · FOS = factor of safety
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Bearing Capacity Tester for Settlement ── */}
          {(() => {
            const RIGIDITY_FACTOR = 0.8;
            const ALLOWABLE_SETTLEMENT = { isolated: 25, raft: 50 }; // mm

            // ── helpers (same logic as the two calculators above) ──────────────

            // Sf: bilinear interpolation on SETTLEMENT_DATA (N rows, B cols)
            const computeSf = (n, b) => {
              if (isNaN(n) || isNaN(b) || n <= 0 || b <= 0) return null;
              const bClamped = Math.min(b, FOOTING_WIDTHS[FOOTING_WIDTHS.length - 1]);
              let bLowIdx = FOOTING_WIDTHS.length - 2;
              for (let i = 0; i < FOOTING_WIDTHS.length - 1; i++) {
                if (bClamped >= FOOTING_WIDTHS[i] && bClamped <= FOOTING_WIDTHS[i + 1]) {
                  bLowIdx = i;
                  break;
                }
              }
              const bHighIdx = Math.min(bLowIdx + 1, FOOTING_WIDTHS.length - 1);
              const b0 = FOOTING_WIDTHS[bLowIdx],
                b1 = FOOTING_WIDTHS[bHighIdx];
              const nRows = SETTLEMENT_DATA.map((r) => r.n);
              let nLowIdx = 0;
              for (let i = 0; i < nRows.length - 1; i++) {
                if (n >= nRows[i] && n <= nRows[i + 1]) {
                  nLowIdx = i;
                  break;
                }
              }
              if (n <= nRows[0]) nLowIdx = 0;
              if (n >= nRows[nRows.length - 1]) nLowIdx = nRows.length - 2;
              const nHighIdx = Math.min(nLowIdx + 1, nRows.length - 1);
              const n0 = nRows[nLowIdx],
                n1 = nRows[nHighIdx];
              const v00 = SETTLEMENT_DATA[nLowIdx].vals[bLowIdx];
              const v01 = SETTLEMENT_DATA[nLowIdx].vals[bHighIdx];
              const v10 = SETTLEMENT_DATA[nHighIdx].vals[bLowIdx];
              const v11 = SETTLEMENT_DATA[nHighIdx].vals[bHighIdx];
              const r0 =
                v00 !== null && v01 !== null && b0 !== b1
                  ? v00 + ((bClamped - b0) / (b1 - b0)) * (v01 - v00)
                  : (v00 ?? v01);
              const r1 =
                v10 !== null && v11 !== null && b0 !== b1
                  ? v10 + ((bClamped - b0) / (b1 - b0)) * (v11 - v10)
                  : (v10 ?? v11);
              if (r0 === null || r1 === null) return null;
              return n0 === n1 ? r0 : r0 + ((n - n0) / (n1 - n0)) * (r1 - r0);
            };

            // If: Fox's correction interpolation (same logic as Depth Factor Calculator)
            const interpFoxLocal = (ds, depthRatio) => {
              const pts = [...ds.data].sort((a, b) => a.y - b.y);
              if (!pts.length) return null;
              if (depthRatio <= pts[0].y) return pts[0].x;
              if (depthRatio >= pts[pts.length - 1].y) return pts[pts.length - 1].x;
              for (let i = 0; i < pts.length - 1; i++) {
                if (depthRatio >= pts[i].y && depthRatio <= pts[i + 1].y) {
                  const t = (depthRatio - pts[i].y) / (pts[i + 1].y - pts[i].y);
                  return pts[i].x + t * (pts[i + 1].x - pts[i].x);
                }
              }
              return null;
            };
            const computeIf = (D, L, B) => {
              if (isNaN(D) || isNaN(L) || isNaN(B) || L <= 0 || B <= 0) return null;
              const lbRatio = L / B;
              const sqrtLB = Math.sqrt(L * B);
              const depthRatioRaw = D / sqrtLB;
              const depthRatio = Math.min(depthRatioRaw, 2.0); // chart y-axis max is 2.0
              const lbValues = [1, 9, 25, 100];
              const clampedLB = Math.max(1, Math.min(100, lbRatio));
              let loIdx = lbValues.length - 2;
              for (let i = 0; i < lbValues.length - 1; i++) {
                if (clampedLB >= lbValues[i] && clampedLB <= lbValues[i + 1]) {
                  loIdx = i;
                  break;
                }
              }
              const lbLo = lbValues[loIdx],
                lbHi = lbValues[loIdx + 1];
              const ifLo = interpFoxLocal(FOX_DATASETS[loIdx], depthRatio);
              const ifHi = interpFoxLocal(FOX_DATASETS[loIdx + 1], depthRatio);
              if (ifLo === null || ifHi === null) return null;
              const t = (clampedLB - lbLo) / (lbHi - lbLo);
              return {
                value: ifLo + t * (ifHi - ifLo),
                depthRatio,
                depthRatioRaw,
                lbRatio,
                clampedLB,
              };
            };

            // ── parse inputs ──────────────────────────────────────────────────
            const N = parseFloat(bctNInput); // field SPT N
            const gamma = parseFloat(bctGammaInput); // bulk unit weight kN/m³
            const ds = parseFloat(bctDsInput); // scour depth m
            const B_raw = parseFloat(bctBInput);
            const L_raw = parseFloat(bctLInput);
            const D = parseFloat(bctDInput);
            // Derive effective B and L from shape
            // circle: B = L = diameter (√(LB) = d for Fox depth ratio)
            // square: L = B
            // strip:  L = 100 × B (effectively infinite for interpolation; Fox caps L/B at 100)
            // rectangle: B and L independent
            const B = !isNaN(B_raw) ? B_raw : null;
            const L = (() => {
              if (B === null) return null;
              switch (bctShape) {
                case 'square':
                  return B;
                case 'circle':
                  return B;
                case 'strip':
                  return 100 * B;
                default:
                  return !isNaN(L_raw) ? L_raw : null; // rectangle
              }
            })();
            const allowSettlement_mm = ALLOWABLE_SETTLEMENT[bctFootingType]; // mm
            const allowSettlement_m = allowSettlement_mm / 1000; // m

            const hasN = !isNaN(N) && bctNInput !== '';
            const hasGamma = !isNaN(gamma) && bctGammaInput !== '';
            // ds defaults to 0 when blank (no scour)
            const ds_val = bctDsInput !== '' && !isNaN(ds) ? ds : 0;
            const hasB = B !== null && !isNaN(B);
            const hasD = !isNaN(D) && bctDInput !== '';
            const hasL = L !== null && !isNaN(L);

            const needsQ = bctCorrectionType === 'overburden' || bctCorrectionType === 'both';

            // ── Overburden pressure derivation chain ──────────────────────────
            // γsub = γ − 10  (effective/submerged unit weight)
            // Df  = D − ds   (depth below scour level; ds defaults to 0)
            // q   = γsub × Df
            const gammaSub = hasGamma ? Math.max(0, gamma - 10) : null;
            const Df = hasD ? Math.max(0, D - ds_val) : null;
            const Q = gammaSub !== null && Df !== null ? gammaSub * Df : null;
            const hasQ = Q !== null;
            const obRows = (() => {
              const raw = settings?.['overburden_correction_data'];
              if (!raw) return [];
              try {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                return Array.isArray(parsed) ? parsed : [];
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

            // ── Overburden correction factor from settings table ──────────────
            // Interpolate CF from overburden_correction_data using computed Q
            const corrFactor =
              needsQ && hasQ && obPoints.length >= 2 ? interpolateY(obPoints, Q) : null;
            const hasCorrFactor = corrFactor !== null;

            // ── Corrected SPT N value (NR) per spec ───────────────────────────
            // none       → NR = N
            // overburden → NR = N × CF  (CF interpolated from table)
            // dilatency  → NR = (N + 15) / 2
            // both       → NR = (N × CF + 15) / 2
            const NR_raw = (() => {
              if (!hasN) return null;
              switch (bctCorrectionType) {
                case 'none':
                  return N;
                case 'overburden':
                  return hasCorrFactor ? N * corrFactor : null;
                case 'dilatency':
                  return (N + 15) / 2;
                case 'both':
                  return hasCorrFactor ? (N * corrFactor + 15) / 2 : null;
                default:
                  return N;
              }
            })();
            // Clamp NR to table range [5, 60]
            const NR = NR_raw !== null ? Math.min(60, Math.max(5, NR_raw)) : null;
            const hasNR = NR !== null;

            // ── computed values ───────────────────────────────────────────────
            const Sf = hasNR && hasB ? computeSf(NR, B) : null;
            const ifRes = hasD && hasL && hasB ? computeIf(D, L, B) : null;
            const If_val = ifRes?.value ?? null;
            const Si = Sf !== null && If_val !== null ? Sf * If_val * RIGIDITY_FACTOR : null;
            // Si is in m (same unit as Sf). Convert both to mm for the ratio:
            // qa (kg/cm²) = S_allow (mm) / Si (mm) — direct ratio since table Sf is mm per kg/cm²
            const qa_kgcm2 = Si !== null && Si > 0 ? allowSettlement_mm / (Si * 1000) : null;
            // Convert kg/cm² → kN/m²: 1 kg/cm² = 98.1 kN/m²
            const qa_kNm2 = qa_kgcm2 !== null ? qa_kgcm2 * 98.1 : null;

            const canCompute = hasNR && hasB && hasD && hasL;
            const fmt4 = (v) => (v !== null ? fmtDec(v) : '—');
            const fmt3 = (v) => (v !== null ? v.toFixed(3) : '—');
            const fmt2 = (v) => (v !== null ? v.toFixed(4) : '—');

            return (
              <div className="hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                    Part 2. Bearing Capacity - Settlement Criteria
                  </h2>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                    Corrected immediate settlement method
                  </p>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                  {/* <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                Inputs
              </h3> */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Field N */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500 leading-tight">
                        Field SPT N-value<span className="ml-1 font-bold text-gray-700"> — N</span>
                      </label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={bctNInput}
                        onChange={(e) => setBctNInput(e.target.value)}
                        placeholder="e.g. 20"
                        className="w-full text-center rounded-xl h-9 text-sm font-mono"
                      />
                    </div>
                    {/* Shape of Footing */}
                    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-4">
                      <label className="text-xs text-gray-500 leading-tight">
                        Shape of Footing
                      </label>
                      <Select value={bctShape} onValueChange={setBctShape}>
                        <SelectTrigger className="w-full rounded-xl h-9 text-sm font-mono">
                          <SelectValue placeholder="Select shape" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rectangle">Rectangle</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="strip">Continuous Strip</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dimension inputs — shape-aware */}
                    {bctShape === 'circle' ? (
                      /* Circle: single diameter field */
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-gray-500 leading-tight">
                          Diameter of Foundation
                          <span className="ml-1 font-bold text-gray-700"> — d</span>
                          <span className="ml-1 text-[10px] text-gray-400">(m)</span>
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={bctBInput}
                          onChange={(e) => setBctBInput(e.target.value)}
                          placeholder="e.g. 1.5"
                          className="w-full text-center rounded-xl h-9 text-sm font-mono"
                        />
                      </div>
                    ) : bctShape === 'strip' ? (
                      /* Strip: single width field */
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-gray-500 leading-tight">
                          Strip Width
                          <span className="ml-1 font-bold text-gray-700"> — B</span>
                          <span className="ml-1 text-[10px] text-gray-400">(m)</span>
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={bctBInput}
                          onChange={(e) => setBctBInput(e.target.value)}
                          placeholder="e.g. 2.0"
                          className="w-full text-center rounded-xl h-9 text-sm font-mono"
                        />
                      </div>
                    ) : (
                      /* Rectangle / Square: B + L */
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-gray-500 leading-tight">
                            Width of Foundation
                            <span className="ml-1 font-bold text-gray-700"> — B</span>
                            <span className="ml-1 text-[10px] text-gray-400">(m)</span>
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={bctBInput}
                            onChange={(e) => setBctBInput(e.target.value)}
                            placeholder="e.g. 2.0"
                            className="w-full text-center rounded-xl h-9 text-sm font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-gray-500 leading-tight">
                            Length of Foundation
                            <span className="ml-1 font-bold text-gray-700"> — L</span>
                            <span className="ml-1 text-[10px] text-gray-400">(m)</span>
                            {bctShape === 'square' && (
                              <span className="ml-1 text-[10px] text-primary">(= B)</span>
                            )}
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={bctShape === 'square' ? bctBInput : bctLInput}
                            onChange={(e) => bctShape !== 'square' && setBctLInput(e.target.value)}
                            readOnly={bctShape === 'square'}
                            placeholder={bctShape === 'square' ? 'same as B' : 'e.g. 2.0'}
                            className={`w-full text-center rounded-xl h-9 text-sm font-mono ${bctShape === 'square' ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                          />
                        </div>
                      </>
                    )}
                    {/* D */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-500 leading-tight">
                        Depth of footing<span className="ml-1 font-bold text-gray-700"> — D</span>
                        <span className="ml-1 text-[10px] text-gray-400">(m)</span>
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={bctDInput}
                        onChange={(e) => setBctDInput(e.target.value)}
                        placeholder="e.g. 1.5"
                        className="w-full text-center rounded-xl h-9 text-sm font-mono"
                      />
                    </div>
                    {/* Correction Type — full width row */}
                    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-4">
                      <label className="text-xs text-gray-500 leading-tight">
                        SPT Correction Type
                      </label>
                      <Select value={bctCorrectionType} onValueChange={setBctCorrectionType}>
                        <SelectTrigger className="w-full rounded-xl h-9 text-sm font-mono">
                          <SelectValue placeholder="Select correction type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Correction</SelectItem>
                          <SelectItem value="overburden">Overburden Correction</SelectItem>
                          <SelectItem value="dilatency">Dilatency Correction</SelectItem>
                          <SelectItem value="both">Both Corrections</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Overburden inputs — only shown when overburden or both */}
                    {needsQ && (
                      <>
                        {/* γ — bulk unit weight */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-gray-500 leading-tight">
                            Bulk Unit Weight
                            <span className="ml-1 font-bold text-gray-700"> — γ</span>
                            <span className="ml-1 text-[10px] text-gray-400">(kN/m³)</span>
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={bctGammaInput}
                            onChange={(e) => setBctGammaInput(e.target.value)}
                            placeholder="e.g. 18"
                            className="w-full text-center rounded-xl h-9 text-sm font-mono"
                          />
                        </div>
                        {/* ds — scour depth */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-gray-500 leading-tight">
                            Scour Depth
                            <span className="ml-1 font-bold text-gray-700">
                              {' '}
                              — d<sub>s</sub>
                            </span>
                            <span className="ml-1 text-[10px] text-gray-400">(m)</span>
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={bctDsInput}
                            onChange={(e) => setBctDsInput(e.target.value)}
                            placeholder="0 (no scour)"
                            className="w-full text-center rounded-xl h-9 text-sm font-mono"
                          />
                        </div>
                        {/* Computed intermediates: γsub, Df, q — read-only display */}
                        <div className="col-span-2 sm:col-span-4 grid grid-cols-3 gap-3">
                          {[
                            {
                              label: (
                                <>
                                  Effective Unit Weight — γ<sub>sub</sub> = γ − 10
                                </>
                              ),
                              value:
                                gammaSub !== null ? `${fmtDec(gammaSub)} kN/m³` : '— (enter γ)',
                            },
                            {
                              label: (
                                <>
                                  Depth Below Scour — D<sub>f</sub> = D − d<sub>s</sub>
                                </>
                              ),
                              value: Df !== null ? `${fmtDec(Df)} m` : !hasD ? '— (enter D)' : '—',
                            },
                            {
                              label: (
                                <>
                                  Effective Overburden Pressure — q = γ<sub>sub</sub> × D
                                  <sub>f</sub>
                                </>
                              ),
                              value:
                                Q !== null
                                  ? `${fmtDec(Q)} kN/m²`
                                  : !hasGamma && !hasD
                                    ? '— (need γ & D)'
                                    : !hasGamma
                                      ? '— (need γ)'
                                      : !hasD
                                        ? '— (need D)'
                                        : '—',
                              highlight: true,
                            },
                          ].map(({ label, value, highlight }, i) => (
                            <div
                              key={i}
                              className={`rounded-xl border p-3 flex flex-col gap-0.5 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100'}`}
                            >
                              <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
                              <p
                                className={`font-mono tabular-nums ${value.startsWith('—') ? 'text-xs text-gray-300 italic font-normal' : `text-sm font-bold ${highlight ? 'text-primary' : 'text-gray-700'}`}`}
                              >
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {/* NR — computed display */}
                    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-4">
                      <label className="text-xs text-gray-500 leading-tight">
                        Corrected SPT N-value
                        <span className="ml-1 font-bold text-gray-700">
                          {' '}
                          — N<sub>R</sub>
                        </span>
                        <span className="ml-1 text-[10px] text-gray-400">(computed)</span>
                      </label>
                      <div
                        className={`w-full text-center rounded-xl h-9 text-sm font-mono flex items-center justify-center border ${hasNR ? 'bg-primary/5 border-primary/20 text-primary font-bold' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                      >
                        {hasNR
                          ? `${fmtDec(NR_raw)}${NR_raw !== NR ? ` → ${NR} (clamped)` : ''}`
                          : needsQ && (!hasGamma || !hasD)
                            ? 'Enter γ & D for overburden correction'
                            : needsQ && !hasCorrFactor
                              ? 'No CF in overburden table — check settings'
                              : !hasN
                                ? 'Enter N'
                                : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Footing type */}
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs text-gray-500 shrink-0">Footing type:</label>
                    <Select value={bctFootingType} onValueChange={setBctFootingType}>
                      <SelectTrigger className="w-52 rounded-xl h-9 text-sm font-mono">
                        <SelectValue placeholder="Select footing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="isolated">Isolated (25 mm)</SelectItem>
                        <SelectItem value="raft">Raft (50 mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results */}
                {canCompute ? (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                      Computed values
                    </h3>

                    {/* Result grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Sf */}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Settlement per Unit Pressure — Sf
                        </p>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">
                          Interpolated from ABC table at N<sub>R</sub>={NR ?? '—'}, B={B} m
                        </p>
                        <p className="text-xl font-black font-mono tabular-nums mt-1 text-gray-800">
                          {Sf !== null ? fmtDec(Sf * 1000) : '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">mm</p>
                      </div>

                      {/* If */}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Depth Factor (Fox's Correction) — I<sub>f</sub>
                        </p>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">
                          {ifRes
                            ? `D/√LB = ${ifRes.depthRatioRaw.toFixed(4)}${ifRes.depthRatioRaw > 2.0 ? ' (capped at 2.0 for chart)' : ''}, L/B = ${ifRes.lbRatio.toFixed(3)}`
                            : 'Enter D, L, B'}
                        </p>
                        <p className="text-xl font-black font-mono tabular-nums mt-1 text-gray-800">
                          {If_val !== null ? If_val.toFixed(4) : '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">dimensionless</p>
                      </div>

                      {/* Rigidity Factor */}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Rigidity Factor — R<sub>f</sub>
                        </p>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">
                          System constant (IS:8009)
                        </p>
                        <p className="text-xl font-black font-mono tabular-nums mt-1 text-gray-800">
                          {RIGIDITY_FACTOR.toFixed(1)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">dimensionless</p>
                      </div>

                      {/* Si */}
                      <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          Corrected Immediate Settlement — Si
                        </p>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">
                          Si = Sf × I<sub>f</sub> × R<sub>f</sub>
                        </p>
                        <p className="text-xl font-black font-mono tabular-nums mt-1 text-gray-700">
                          {Si !== null ? fmtDec(Si * 1000) : '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">mm</p>
                      </div>

                      {/* Allowable settlement */}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Allowable Settlement — S<sub>allow</sub>
                        </p>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">
                          {bctFootingType === 'isolated' ? 'Isolated footing' : 'Raft footing'}
                        </p>
                        <p className="text-xl font-black font-mono tabular-nums mt-1 text-gray-800">
                          {allowSettlement_mm}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">mm</p>
                      </div>

                      {/* qa — highlighted */}
                      <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                          Allowable Bearing Capacity — qa
                        </p>
                        <p className="text-xs font-mono text-gray-500 mt-0.5">
                          qa = S<sub>allow</sub> / Si = {allowSettlement_mm} /{' '}
                          {Si !== null ? fmtDec(Si * 1000) : '—'} mm
                        </p>
                        <p className="text-2xl font-black font-mono tabular-nums mt-1 text-primary">
                          {qa_kNm2 !== null ? qa_kNm2.toFixed(4) : '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">kN/m²</p>
                        {qa_kgcm2 !== null && (
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            = {qa_kgcm2.toFixed(4)} kg/cm²
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Step-by-step */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                        Step-by-step computation
                      </h3>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600 whitespace-pre-line leading-relaxed">
                        {[
                          `Step 1 — Corrected SPT N-value (NR)`,
                          (() => {
                            const corrLabel = {
                              none: 'No Correction → NR = N',
                              overburden: `Overburden Correction → NR = N × CF`,
                              dilatency: `Dilatency Correction → NR = (N + 15) / 2`,
                              both: `Both Corrections → NR = (N × CF + 15) / 2`,
                            }[bctCorrectionType];
                            const lines = [
                              `  Field N = ${hasN ? N : 'NA'},  Correction: ${
                                bctCorrectionType === 'none'
                                  ? 'None'
                                  : bctCorrectionType === 'overburden'
                                    ? 'Overburden'
                                    : bctCorrectionType === 'dilatency'
                                      ? 'Dilatency'
                                      : 'Both'
                              }`,
                            ];
                            if (needsQ) {
                              lines.push(`  γ = ${hasGamma ? gamma : '?'} kN/m³`);
                              lines.push(
                                `  γsub = γ − 10 = ${gammaSub !== null ? fmtDec(gammaSub) : '?'} kN/m³`
                              );
                              lines.push(
                                `  Df = D − ds = ${hasD ? D : '?'} − ${ds_val} = ${Df !== null ? fmtDec(Df) : '?'} m`
                              );
                              lines.push(
                                `  q = γsub × Df = ${gammaSub !== null ? fmtDec(gammaSub) : '?'} × ${Df !== null ? fmtDec(Df) : '?'} = ${Q !== null ? fmtDec(Q) : '?'} kN/m²`
                              );
                              lines.push(
                                `  Overburden Correction Factor CF = ${hasCorrFactor ? fmtDec(corrFactor) : 'NA (check overburden table)'}`
                              );
                            }
                            lines.push(`  ${corrLabel}`);
                            if (bctCorrectionType === 'overburden')
                              lines.push(
                                `     = ${hasN ? N : '?'} × ${hasCorrFactor ? fmtDec(corrFactor) : '?'} = ${NR_raw !== null ? fmtDec(NR_raw) : 'NA'}`
                              );
                            else if (bctCorrectionType === 'dilatency')
                              lines.push(
                                `     = (${hasN ? N : '?'} + 15) / 2 = ${NR_raw !== null ? fmtDec(NR_raw) : 'NA'}`
                              );
                            else if (bctCorrectionType === 'both')
                              lines.push(
                                `     Overburden step: ${hasN ? N : '?'} × ${hasCorrFactor ? fmtDec(corrFactor) : '?'} = ${hasCorrFactor && hasN ? fmtDec(N * corrFactor) : 'NA'}`,
                                `     Dilatency step:  (${hasCorrFactor && hasN ? fmtDec(N * corrFactor) : '?'} + 15) / 2 = ${NR_raw !== null ? fmtDec(NR_raw) : 'NA'}`
                              );
                            lines.push(
                              `  NR = ${NR_raw !== null ? fmtDec(NR_raw) : 'NA'}${NR_raw !== null && NR_raw !== NR ? ` → clamped to ${NR} (table range 5–60)` : ''}`
                            );
                            return lines.join('\n');
                          })(),
                          ``,
                          `Step 2 — Settlement per Unit Pressure (Sf)`,
                          `  From Allowable Bearing Capacity table, interpolated at:`,
                          `  NR = ${NR ?? 'NA'},  B = ${Math.min(B, 6.0).toFixed(2)} m${B > 6.0 ? ` (B clamped from ${B} m — table max 6.0 m)` : ''}`,
                          `  Sf = ${Sf !== null ? fmtDec(Sf) : 'NA'} m`,
                          `     = ${Sf !== null ? fmtDec(Sf * 1000) : 'NA'} mm`,
                          ``,
                          `Step 3 — Depth Factor / Fox's Correction (If)`,
                          ifRes
                            ? (() => {
                                const lbValues = [1, 9, 25, 100];
                                let lo = lbValues.length - 2;
                                for (let i = 0; i < lbValues.length - 1; i++) {
                                  if (
                                    ifRes.clampedLB >= lbValues[i] &&
                                    ifRes.clampedLB <= lbValues[i + 1]
                                  ) {
                                    lo = i;
                                    break;
                                  }
                                }
                                const hi = Math.min(lo + 1, lbValues.length - 1);
                                return [
                                  `  √(L × B) = √(${L} × ${B}) = ${Math.sqrt(L * B).toFixed(4)} m`,
                                  `  Depth ratio D/√LB = ${D} / ${Math.sqrt(L * B).toFixed(4)} = ${ifRes.depthRatioRaw.toFixed(4)}${ifRes.depthRatioRaw > 2.0 ? ` → capped to 2.0 (chart max)` : ''}`,
                                  `  L/B = ${L} / ${B} = ${ifRes.lbRatio.toFixed(4)}`,
                                  `  Interpolated between L/B = ${lbValues[lo]} and L/B = ${lbValues[hi]}`,
                                  `  If = ${If_val !== null ? If_val.toFixed(4) : 'NA'}`,
                                ].join('\n');
                              })()
                            : `  Insufficient input`,
                          ``,
                          `Step 4 — Corrected Immediate Settlement (Si)`,
                          `  Si = Sf × If × Rf`,
                          `     = ${Sf !== null ? fmtDec(Sf * 1000) : 'NA'} mm × ${If_val !== null ? If_val.toFixed(4) : 'NA'} × ${RIGIDITY_FACTOR}`,
                          `     = ${Si !== null ? fmtDec(Si * 1000) : 'NA'} mm`,
                          ``,
                          `Step 5 — Allowable Bearing Capacity (qa)`,
                          `  qa = S_allow / Si`,
                          `     = ${allowSettlement_mm} mm / ${Si !== null ? fmtDec(Si * 1000) : 'NA'} mm`,
                          `     = ${qa_kgcm2 !== null ? qa_kgcm2.toFixed(4) : 'NA'} kg/cm²`,
                          ``,
                          `  Convert to kN/m²: qa × 98.1`,
                          `     = ${qa_kgcm2 !== null ? qa_kgcm2.toFixed(4) : 'NA'} × 98.1`,
                          `     = ${qa_kNm2 !== null ? qa_kNm2.toFixed(4) : 'NA'} kN/m²`,
                        ].join('\n')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-6 italic">
                    Enter Field N, correction type, B, L, and D above to compute bearing capacity
                    based on settlement criteria.
                    {needsQ &&
                      ' Also enter bulk unit weight γ and scour depth ds for the overburden correction.'}
                  </p>
                )}

                {/* Formula reference */}
                <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
                  <p>
                    Sf — settlement per unit pressure (mm), interpolated from Allowable Bearing
                    Capacity table and converted from m to mm (× 1000)
                  </p>
                  <p>
                    If — depth factor from Fox's Correction curves (IS:8009 Fig.9) · Rf = 0.8
                    (rigidity factor, constant)
                  </p>
                  <p>
                    Si = Sf × If × Rf &nbsp;·&nbsp; qa = S<sub>allow</sub> / Si &nbsp;·&nbsp; S
                    <sub>allow</sub>: 25 mm (isolated), 50 mm (raft)
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Part 3: Bearing Capacity — Consolidation Settlement Criteria ── */}
          {(() => {
            const EO = 0.8; // constant void ratio
            const RIGIDITY_FACTOR = 0.8;

            // ── parse Part 3 inputs ───────────────────────────────────────────
            const D3 = parseFloat(csD);
            const B3 = parseFloat(csB);
            const L3 = parseFloat(csL);
            const P3 = parseFloat(csP);
            const Ht3 = parseFloat(csHt);
            const WL3 = parseFloat(csWL);

            const hasD3 = !isNaN(D3) && csD !== '';
            const hasB3 = !isNaN(B3) && csB !== '';
            const hasL3 = !isNaN(L3) && csL !== '';
            const hasP3 = !isNaN(P3) && csP !== '';
            const hasHt3 = !isNaN(Ht3) && csHt !== '';
            const hasWL3 = !isNaN(WL3) && csWL !== '' && WL3 >= 10;
            const wlError = csWL !== '' && !isNaN(WL3) && WL3 < 10;

            // ── re-derive Part 2 values (If, Rf, Si, γsub) ──────────────────
            // Re-use Part 2 state: bctGammaInput, bctDsInput, bctDInput, bctBInput, bctLInput,
            // bctNInput, bctCorrectionType, bctGammaInput
            const p2gamma = parseFloat(bctGammaInput);
            const p2ds =
              bctDsInput !== '' && !isNaN(parseFloat(bctDsInput)) ? parseFloat(bctDsInput) : 0;
            const p2D = parseFloat(bctDInput);
            const p2B = parseFloat(bctBInput);
            const p2L_raw = parseFloat(bctLInput);
            const p2N = parseFloat(bctNInput);

            const p2hasGamma = !isNaN(p2gamma) && bctGammaInput !== '';
            const p2hasD = !isNaN(p2D) && bctDInput !== '';
            const p2hasB = !isNaN(p2B) && bctBInput !== '';

            const p2gammaSub = p2hasGamma ? Math.max(0, p2gamma - 10) : null;
            const p2Df = p2hasD ? Math.max(0, p2D - p2ds) : null;
            const p2Q = p2gammaSub !== null && p2Df !== null ? p2gammaSub * p2Df : null;

            // Overburden correction factor for Part 2 NR
            const obRowsP2 = (() => {
              const raw = settings?.['overburden_correction_data'];
              if (!raw) return [];
              try {
                const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
                return Array.isArray(p) ? p : [];
              } catch {
                return [];
              }
            })();
            const obPointsP2 = obRowsP2
              .filter(
                (r) =>
                  r.pressure !== '' &&
                  r.correction !== '' &&
                  !isNaN(parseFloat(r.pressure)) &&
                  !isNaN(parseFloat(r.correction))
              )
              .map((r) => ({ x: parseFloat(r.pressure), y: parseFloat(r.correction) }))
              .sort((a, b) => a.x - b.x);

            const needsQp2 = bctCorrectionType === 'overburden' || bctCorrectionType === 'both';
            const p2CF =
              needsQp2 && p2Q !== null && obPointsP2.length >= 2
                ? interpolateY(obPointsP2, p2Q)
                : null;

            const p2NR_raw = (() => {
              if (isNaN(p2N)) return null;
              switch (bctCorrectionType) {
                case 'none':
                  return p2N;
                case 'overburden':
                  return p2CF !== null ? p2N * p2CF : null;
                case 'dilatency':
                  return (p2N + 15) / 2;
                case 'both':
                  return p2CF !== null ? (p2N * p2CF + 15) / 2 : null;
                default:
                  return p2N;
              }
            })();
            const p2NR = p2NR_raw !== null ? Math.min(60, Math.max(5, p2NR_raw)) : null;

            // Sf from Part 2
            const p2L = (() => {
              if (!p2hasB) return null;
              switch (bctShape) {
                case 'square':
                  return p2B;
                case 'circle':
                  return p2B;
                case 'strip':
                  return 100 * p2B;
                default:
                  return !isNaN(p2L_raw) && bctLInput !== '' ? p2L_raw : null;
              }
            })();
            const computeSfP2 = (n, b) => {
              if (!n || !b || isNaN(n) || isNaN(b)) return null;
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
            const p2Sf = p2NR !== null && p2hasB ? computeSfP2(p2NR, p2B) : null;

            // If from Fox's correction (Part 2 D, L, B)
            const interpFoxP2 = (ds, dr) => {
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
            const p2If = (() => {
              if (!p2hasD || !p2hasB || p2L === null) return null;
              const sqrtLB = Math.sqrt(p2L * p2B);
              if (sqrtLB === 0) return null;
              const dr = Math.min(p2D / sqrtLB, 2.0);
              const lbR = Math.max(1, Math.min(100, p2L / p2B));
              const lbVals = [1, 9, 25, 100];
              let lo = lbVals.length - 2;
              for (let i = 0; i < lbVals.length - 1; i++) {
                if (lbR >= lbVals[i] && lbR <= lbVals[i + 1]) {
                  lo = i;
                  break;
                }
              }
              const hi = Math.min(lo + 1, lbVals.length - 1);
              const ifLo = interpFoxP2(FOX_DATASETS[lo], dr);
              const ifHi = interpFoxP2(FOX_DATASETS[hi], dr);
              if (ifLo === null || ifHi === null) return null;
              const t = (lbR - lbVals[lo]) / (lbVals[hi] - lbVals[lo]);
              return ifLo + t * (ifHi - ifLo);
            })();
            const p2Si =
              p2Sf !== null && p2If !== null ? p2Sf * p2If * RIGIDITY_FACTOR * 1000 : null; // mm

            // ── Part 3 computed chain ─────────────────────────────────────────
            const depthZoneInfluence = hasD3 && hasB3 ? D3 + 1.5 * B3 : null;
            const Cc = hasWL3 ? 0.009 * (WL3 - 10) : null;
            const Po = p2gammaSub !== null && hasD3 && hasHt3 ? p2gammaSub * (D3 + Ht3 / 2) : null;
            const A = hasB3 && hasL3 ? B3 * L3 : null;
            const Bo = hasB3 && hasHt3 ? B3 + 2 * (Ht3 / 4) : null;
            const Lo = hasL3 && hasHt3 ? L3 + 2 * (Ht3 / 4) : null;
            const Ao = Bo !== null && Lo !== null ? Bo * Lo : null;
            const dP = hasP3 && A !== null && Ao !== null && Ao > 0 ? (P3 * A) / Ao : null;
            const Scon =
              Cc !== null && Po !== null && dP !== null && Ht3 > 0 && Po > 0
                ? (Ht3 / (1 + EO)) * Cc * Math.log10((Po + dP) / Po) * 1000 // mm
                : null;
            const Stot = Scon !== null && p2If !== null ? Scon * p2If * RIGIDITY_FACTOR : null;
            const Sfinal = Stot !== null && p2Si !== null ? Stot + p2Si : null;
            const qSafe = Sfinal !== null && Sfinal > 0 && hasP3 ? (P3 / Sfinal) * 25 : null;

            const canCompute = hasD3 && hasB3 && hasL3 && hasP3 && hasHt3 && hasWL3;

            return (
              <div className="hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                    Part 3. Bearing Capacity — Consolidation Settlement Criteria
                  </h2>
                  {/* <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                IS:8009 Part I – 1976
              </p> */}
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                  {/* <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                Inputs
              </h3> */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <CsInputField
                      label="Depth of foundation"
                      symbol="D"
                      unit="m"
                      value={csD}
                      onChange={setCsD}
                      placeholder="e.g. 1.5"
                    />
                    <CsInputField
                      label="Width of foundation"
                      symbol="B"
                      unit="m"
                      value={csB}
                      onChange={setCsB}
                      placeholder="e.g. 2.0"
                    />
                    <CsInputField
                      label="Length of foundation"
                      symbol="L"
                      unit="m"
                      value={csL}
                      onChange={setCsL}
                      placeholder="e.g. 2.0"
                    />
                    <CsInputField
                      label="Pressure due to imposed load"
                      symbol="P = qs"
                      unit="kN/m²"
                      value={csP}
                      onChange={setCsP}
                      placeholder="e.g. 100"
                    />
                    <CsInputField
                      label="Height of compressible layer"
                      symbol="Ht"
                      unit="m"
                      value={csHt}
                      onChange={setCsHt}
                      placeholder="e.g. 3.0"
                    />
                    <CsInputField
                      label="Liquid Limit"
                      symbol="WL"
                      unit="%"
                      value={csWL}
                      onChange={setCsWL}
                      placeholder="e.g. 40"
                      error={wlError ? 'WL must be ≥ 10%' : null}
                      note="Must be ≥ 10%"
                    />
                  </div>
                </div>

                {/* Constants */}
                <div className="space-y-2">
                  {/* <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                Constants
              </h3> */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <CsComputedRow
                      label="Void ratio"
                      symbol="e₀"
                      displayValue={fmtDec(EO)}
                      formula="constant"
                    />
                    <CsComputedRow
                      label="Rigidity Factor"
                      symbol="Rf"
                      displayValue={fmtDec(RIGIDITY_FACTOR)}
                      formula="constant (IS:8009)"
                    />
                  </div>
                </div>

                {/* From Part 2 */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    Values from Part 2 — Settlement Criteria
                  </h3>
                  {(p2Si === null || p2If === null || p2gammaSub === null) && (
                    <p className="text-xs text-amber-500 italic">
                      ⚠ Fill in Part 2 (Bearing Capacity Tester for Settlement) to populate these
                      values.
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <CsComputedRow
                      label="Depth Factor"
                      symbol="If"
                      displayValue={p2If !== null ? p2If.toFixed(4) : '—'}
                      formula="Fox's Correction (IS:8009)"
                    />
                    <CsComputedRow
                      label="Rigidity Factor"
                      symbol="Rf"
                      displayValue={fmtDec(RIGIDITY_FACTOR)}
                      formula="constant 0.8"
                    />
                    <CsComputedRow
                      label="Corrected Immediate Settlement"
                      symbol="Si"
                      unit="mm"
                      displayValue={p2Si !== null ? p2Si.toFixed(4) : '—'}
                      formula="Sf × If × Rf"
                    />
                    <CsComputedRow
                      label="Submerged unit weight"
                      symbol="γsub"
                      unit="kN/m³"
                      displayValue={p2gammaSub !== null ? fmtDec(p2gammaSub) : '—'}
                      formula="γ − 10"
                    />
                  </div>
                </div>

                {/* Computed chain */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    Computed Values
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <CsComputedRow
                      label="Depth of zone of influence"
                      unit="m"
                      displayValue={depthZoneInfluence !== null ? fmtDec(depthZoneInfluence) : '—'}
                      formula="D + 1.5 × B"
                    />
                    <CsComputedRow
                      label="Compression Index"
                      symbol="Cc"
                      displayValue={Cc !== null ? fmtDec(Cc) : '—'}
                      formula="0.009 × (WL − 10)"
                    />
                    <CsComputedRow
                      label="Initial Pressure"
                      symbol="Po"
                      unit="kN/m²"
                      displayValue={Po !== null ? fmtDec(Po) : '—'}
                      formula="γsub × (D + Ht/2)"
                    />
                    <CsComputedRow
                      label="Area of footing"
                      symbol="A"
                      unit="m²"
                      displayValue={A !== null ? fmtDec(A) : '—'}
                      formula="B × L"
                    />
                    <CsComputedRow
                      label="Width of spread"
                      symbol="Bo"
                      unit="m"
                      displayValue={Bo !== null ? fmtDec(Bo) : '—'}
                      formula="B + 2 × (Ht/4)"
                    />
                    <CsComputedRow
                      label="Length of spread"
                      symbol="Lo"
                      unit="m"
                      displayValue={Lo !== null ? fmtDec(Lo) : '—'}
                      formula="L + 2 × (Ht/4)"
                    />
                    <CsComputedRow
                      label="Area of spread"
                      symbol="Ao"
                      unit="m²"
                      displayValue={Ao !== null ? fmtDec(Ao) : '—'}
                      formula="Lo × Bo"
                    />
                    <CsComputedRow
                      label="Pressure Intensity"
                      symbol="ΔP"
                      unit="kN/m²"
                      displayValue={dP !== null ? fmtDec(dP) : '—'}
                      formula="(P × A) / Ao"
                    />
                    <CsComputedRow
                      label="Consolidation settlement"
                      symbol="Scon"
                      unit="mm"
                      displayValue={Scon !== null ? Scon.toFixed(4) : '—'}
                      formula="(Ht/(1+e₀)) × Cc × log₁₀((Po+ΔP)/Po)"
                    />
                    <CsComputedRow
                      label="Total consolidation settlement"
                      symbol="Stot"
                      unit="mm"
                      displayValue={Stot !== null ? Stot.toFixed(4) : '—'}
                      formula="Scon × If × Rf"
                    />
                    <CsComputedRow
                      label="Total immediate settlement (Si)"
                      symbol="Si"
                      unit="mm"
                      displayValue={p2Si !== null ? p2Si.toFixed(4) : '—'}
                      formula="from Part 2"
                    />
                    <CsComputedRow
                      label="Final settlement"
                      symbol="Sfinal"
                      unit="mm"
                      displayValue={Sfinal !== null ? Sfinal.toFixed(4) : '—'}
                      formula="Stot + Si"
                      highlight
                    />
                  </div>

                  {/* Safe Bearing Pressure — prominent card */}
                  <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex flex-col gap-1 mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Safe Bearing Pressure for 25 mm settlement — q<sub>safe</sub>
                    </p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                      q<sub>safe</sub> = (P / S<sub>final</sub>) × 25
                      {hasP3 && Sfinal !== null && (
                        <>
                          {' '}
                          = ({P3} / {fmtDec(Sfinal)}) × 25
                        </>
                      )}
                    </p>
                    <p className="text-2xl font-black font-mono tabular-nums mt-1 text-primary">
                      {qSafe !== null ? fmtDec(qSafe) : '—'}
                      {qSafe !== null && (
                        <span className="text-sm font-normal text-gray-400 ml-2">kN/m²</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Step-by-step */}
                {canCompute && Scon !== null && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                      Step-by-step computation
                    </h3>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600 whitespace-pre-line leading-relaxed">
                      {[
                        `Constants: e₀ = ${EO},  Rf = ${RIGIDITY_FACTOR}`,
                        `From Part 2: If = ${p2If !== null ? p2If.toFixed(4) : 'NA'},  Si = ${p2Si !== null ? p2Si.toFixed(4) : 'NA'} mm,  γsub = ${p2gammaSub !== null ? fmtDec(p2gammaSub) : 'NA'} kN/m³`,
                        ``,
                        `Compression Index:  Cc = 0.009 × (WL − 10) = 0.009 × (${WL3} − 10) = ${fmtDec(Cc)}`,
                        `Initial Pressure:   Po = γsub × (D + Ht/2) = ${p2gammaSub !== null ? fmtDec(p2gammaSub) : '?'} × (${D3} + ${Ht3}/2) = ${Po !== null ? fmtDec(Po) : 'NA'} kN/m²`,
                        `Area of footing:    A  = B × L = ${B3} × ${L3} = ${A !== null ? fmtDec(A) : 'NA'} m²`,
                        `Width of spread:    Bo = B + 2×(Ht/4) = ${B3} + ${Ht3 !== null ? fmtDec(Ht3 / 2) : '?'} = ${Bo !== null ? fmtDec(Bo) : 'NA'} m`,
                        `Length of spread:   Lo = L + 2×(Ht/4) = ${L3} + ${Ht3 !== null ? fmtDec(Ht3 / 2) : '?'} = ${Lo !== null ? fmtDec(Lo) : 'NA'} m`,
                        `Area of spread:     Ao = Bo × Lo = ${Bo !== null ? fmtDec(Bo) : '?'} × ${Lo !== null ? fmtDec(Lo) : '?'} = ${Ao !== null ? fmtDec(Ao) : 'NA'} m²`,
                        `Pressure intensity: ΔP = (P × A) / Ao = (${P3} × ${A !== null ? fmtDec(A) : '?'}) / ${Ao !== null ? fmtDec(Ao) : '?'} = ${dP !== null ? fmtDec(dP) : 'NA'} kN/m²`,
                        ``,
                        `Consolidation settlement:`,
                        `  Scon = (Ht/(1+e₀)) × Cc × log₁₀((Po+ΔP)/Po)`,
                        `       = (${Ht3}/(1+${EO})) × ${fmtDec(Cc)} × log₁₀((${Po !== null ? fmtDec(Po) : '?'} + ${dP !== null ? fmtDec(dP) : '?'}) / ${Po !== null ? fmtDec(Po) : '?'})`,
                        `       = ${Scon !== null ? fmtDec(Scon) : 'NA'} mm`,
                        ``,
                        `Total consolidation: Stot = Scon × If × Rf = ${fmtDec(Scon)} × ${p2If !== null ? p2If.toFixed(4) : '?'} × ${RIGIDITY_FACTOR} = ${Stot !== null ? fmtDec(Stot) : 'NA'} mm`,
                        `Final settlement:    Sfinal = Stot + Si = ${Stot !== null ? fmtDec(Stot) : '?'} + ${p2Si !== null ? fmtDec(p2Si) : '?'} = ${Sfinal !== null ? fmtDec(Sfinal) : 'NA'} mm`,
                        `Safe bearing pressure: q_safe = (P / Sfinal) × 25 = (${P3} / ${Sfinal !== null ? fmtDec(Sfinal) : '?'}) × 25 = ${qSafe !== null ? fmtDec(qSafe) : 'NA'} kN/m²`,
                      ].join('\n')}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
                  <p>
                    Po is the effective overburden pressure at the midpoint of the compression layer
                    (D + Ht/2).
                  </p>
                  <p>If and Si are taken from Part 2 — ensure Part 2 inputs are filled.</p>
                  <p>
                    e₀ = 0.8 (constant) · Rf = 0.8 (constant) · Cc = 0.009 × (WL − 10) (WL ≥ 10%)
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── SBC Calculator (unified across Parts 1, 2, 3) ── */}
          {(() => {
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
            const sCF =
              needsOB && sQ !== null && obPoints.length >= 2 ? interpolateY(obPoints, sQ) : null;

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

            const tanT =
              hasPhi && hasB && hasD ? Math.tan(((45 + sPhi / 2) * Math.PI) / 180) : null;
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

            const regime = hasPhi
              ? sPhi <= 28
                ? 'local'
                : sPhi >= 36
                  ? 'general'
                  : 'intermediate'
              : null;
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
                {/* Header */}
                <div>
                  {/* <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  New
                </span>
              </div> */}
                  <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                    SBC Calculator
                  </h2>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                    Unified calculator — Parts 1, 2 & 3 from a single set of inputs
                  </p>
                </div>

                {/* ── Common Inputs ── */}
                <div className="space-y-3">
                  {/* <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                Common Inputs
              </h3> */}

                  {/* Shape + Soil Type selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <p className="text-[10px] text-gray-400">
                        Eff. Overburden Pressure — q (kN/m²)
                      </p>
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
                      Fill φ, c, α, FOS (plus B, L, D, γ from Common Inputs) to compute shear
                      criteria.
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
                    Part 1 additionally needs: φ, c, α, FOS (2.0–3.0) · Part 2: N, correction type,
                    footing type · Part 3: P, Ht, WL
                  </p>
                  <p>
                    e₀ = 0.8 (constant) · Rf = 0.8 (constant) · Cc = 0.009 × (WL − 10) (WL ≥ 10%)
                  </p>
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
                      {label && (
                        <span className="block text-[10px] text-gray-400 mt-0.5">{label}</span>
                      )}
                    </td>
                  );

                  return (
                    <div className="mt-6 rounded-xl border border-gray-100 overflow-hidden">
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
                                Lesser of SBC based on Shear Criteria & SBC based on Settlement
                                Criteria
                              </span>
                              minimum(q<sub>s</sub>, q<sub>a</sub>)
                            </th>
                            <th className="text-center py-2 px-3 font-bold text-primary uppercase tracking-widest text-[10px] bg-primary/5">
                              <span className="block normal-case font-normal text-[9px] text-primary/70 mb-0.5">
                                85% × minimum(SBC based on Shear Criteria, SBC based on Settlement
                                Criteria)
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
                                {recommended !== null
                                  ? `= 0.85 × ${Math.min(shearSBC, settlementSBC).toFixed(2)}`
                                  : 'fill Parts 1 & 2/3'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      </div>
                      {(shearSBC === null || settlementSBC === null) && (
                        <p className="px-4 py-2 text-[10px] text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800">
                          {shearSBC === null && settlementSBC === null
                            ? '⚠ Fill Part 1 (shear) and Part 2/3 (settlement) inputs to compute.'
                            : shearSBC === null
                              ? '⚠ Part 1 result missing — enter φ, c, α, FOS.'
                              : `⚠ ${isClay ? 'Part 3' : 'Part 2'} result missing — enter ${isClay ? 'Ht, WL' : 'N'} and required fields.`}
                        </p>
                      )}

                      {/* ── Foundation Cross-Section Visualisation ── */}
                      {(() => {
                        const vB = hasB && sB > 0 ? sB : 2;
                        const vD = hasD && sD > 0 ? sD : 1.5;
                        const vDs = sDs > 0 ? sDs : 0;
                        const vDf = vD - vDs;
                        const vL = hasL && sL > 0 ? sL : vB;
                        const isCirc = sbcShape === 'circle';
                        const isStrip = sbcShape === 'strip';

                        const W = 580,
                          H = 360;
                        const margin = { top: 44, bottom: 16, left: 72, right: 56 };
                        const drawW = W - margin.left - margin.right;
                        const drawH = H - margin.top - margin.bottom;

                        const visDepth = Math.max(vD * 1.7, 3.2);
                        const aboveGnd = visDepth * 0.2;
                        const totalH = visDepth + aboveGnd;
                        const pxPerM = drawH / totalH;

                        const yPx = (m) => margin.top + m * pxPerM;
                        const groundY = yPx(aboveGnd);
                        const scourY = groundY + vDs * pxPerM;
                        const foundBotY = groundY + vD * pxPerM;

                        const cx = margin.left + drawW / 2;
                        const halfFoundPx = Math.min(
                          (vB / (2 * visDepth)) * drawH * 1.5,
                          drawW * 0.4
                        );
                        const foundH_px = Math.max(pxPerM * 0.38, 16);
                        const foundTop = foundBotY - foundH_px;
                        const foundL = cx - halfFoundPx;
                        const foundR = cx + halfFoundPx;

                        const bulbDepth = vB;
                        const bulbBotY = Math.min(
                          foundBotY + bulbDepth * pxPerM,
                          H - margin.bottom - 4
                        );
                        const bulbHalfBot = halfFoundPx + (bulbBotY - foundBotY) * 0.5;

                        const colW = Math.max(halfFoundPx * 0.22, 9);
                        const colTop = margin.top + (aboveGnd - vDs) * pxPerM * 0.45;

                        const fmt2 = (v) => (v !== null && !isNaN(v) ? Number(v).toFixed(2) : '—');

                        /* ── Tiny white text halo helper (rendered as <text> with a <filter>) ── */
                        const haloId = 'lblHalo';

                        return (
                          <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden bg-white">
                            {/* title bar */}
                            <div className="px-4 pt-3 pb-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                  Foundation Cross-Section
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
                                  {sbcShape} footing ·{' '}
                                  {soilTypeInput === 'clay' ? 'Clay' : 'Non-clay'} soil
                                  {isCirc && ' · diameter = B'}
                                  {isStrip && ' · continuous strip'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-gray-500">
                                {hasB && (
                                  <span>
                                    B = <strong className="text-gray-700">{fmt2(sB)} m</strong>
                                  </span>
                                )}
                                {hasL && !isCirc && !isStrip && (
                                  <span>
                                    L = <strong className="text-gray-700">{fmt2(sL)} m</strong>
                                  </span>
                                )}
                                {hasD && (
                                  <span>
                                    D = <strong className="text-gray-700">{fmt2(sD)} m</strong>
                                  </span>
                                )}
                                {vDs > 0 && (
                                  <span>
                                    d<sub>s</sub> ={' '}
                                    <strong className="text-gray-700">{fmt2(vDs)} m</strong>
                                  </span>
                                )}
                                {hasPhi && (
                                  <span>
                                    φ = <strong className="text-gray-700">{fmt2(sPhi)}°</strong>
                                  </span>
                                )}
                                {hasC && (
                                  <span>
                                    c = <strong className="text-gray-700">{fmt2(sC)} kN/m²</strong>
                                  </span>
                                )}
                                {hasGamma && (
                                  <span>
                                    γ ={' '}
                                    <strong className="text-gray-700">{fmt2(sGamma)} kN/m³</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            <svg
                              viewBox={`0 0 ${W} ${H}`}
                              className="w-full"
                              style={{ maxHeight: 380 }}
                            >
                              <defs>
                                {/* white halo for all labels */}
                                <filter id={haloId} x="-20%" y="-20%" width="140%" height="140%">
                                  <feMorphology
                                    in="SourceAlpha"
                                    operator="dilate"
                                    radius="2"
                                    result="dilated"
                                  />
                                  <feFlood floodColor="white" floodOpacity="0.92" result="flood" />
                                  <feComposite
                                    in="flood"
                                    in2="dilated"
                                    operator="in"
                                    result="halo"
                                  />
                                  <feMerge>
                                    <feMergeNode in="halo" />
                                    <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                                </filter>
                                {/* dark halo for labels on light sky background */}
                                <filter id="darkHalo" x="-20%" y="-20%" width="140%" height="140%">
                                  <feMorphology
                                    in="SourceAlpha"
                                    operator="dilate"
                                    radius="2"
                                    result="dilated"
                                  />
                                  <feFlood
                                    floodColor="#f0fdf4"
                                    floodOpacity="0.95"
                                    result="flood"
                                  />
                                  <feComposite
                                    in="flood"
                                    in2="dilated"
                                    operator="in"
                                    result="halo"
                                  />
                                  <feMerge>
                                    <feMergeNode in="halo" />
                                    <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                                </filter>
                              </defs>

                              {/* ── Zones ── */}
                              {/* Sky */}
                              <rect
                                x={margin.left}
                                y={margin.top}
                                width={drawW}
                                height={groundY - margin.top}
                                fill="#e8f5e9"
                              />
                              {/* Soil */}
                              <rect
                                x={margin.left}
                                y={groundY}
                                width={drawW}
                                height={H - groundY}
                                fill="#c8a96e"
                                opacity="0.55"
                              />
                              {/* Darker soil below footing */}
                              <rect
                                x={margin.left}
                                y={foundBotY}
                                width={drawW}
                                height={H - foundBotY}
                                fill="#a0784a"
                                opacity="0.30"
                              />

                              {/* Scour zone */}
                              {vDs > 0 && (
                                <rect
                                  x={margin.left}
                                  y={groundY}
                                  width={drawW}
                                  height={vDs * pxPerM}
                                  fill="#bfdbfe"
                                  opacity="0.65"
                                />
                              )}

                              {/* Soil hatch — diagonal lines */}
                              {[
                                ...Array(Math.ceil(drawW / 18) + Math.ceil((H - groundY) / 18) + 2),
                              ].map((_, k) => {
                                const x1 = margin.left + k * 18;
                                const y1 = groundY;
                                return (
                                  <line
                                    key={k}
                                    x1={Math.min(x1, margin.left + drawW)}
                                    y1={
                                      x1 > margin.left + drawW
                                        ? groundY + (x1 - margin.left - drawW)
                                        : y1
                                    }
                                    x2={Math.min(x1 + (H - groundY), margin.left + drawW)}
                                    y2={Math.min(groundY + (H - groundY), H)}
                                    stroke="#9a6a30"
                                    strokeWidth="0.5"
                                    opacity="0.25"
                                  />
                                );
                              })}

                              {/* ── Stress bulb ── */}
                              <polygon
                                points={`${foundL},${foundBotY} ${foundR},${foundBotY} ${cx + bulbHalfBot},${bulbBotY} ${cx - bulbHalfBot},${bulbBotY}`}
                                fill="#bbf7d0"
                                opacity="0.50"
                                stroke="#16a34a"
                                strokeWidth="1.2"
                                strokeDasharray="5 3"
                              />

                              {/* ── Ground line ── */}
                              <line
                                x1={margin.left}
                                y1={groundY}
                                x2={W - margin.right}
                                y2={groundY}
                                stroke="#1f2937"
                                strokeWidth="2.5"
                              />
                              {/* G.L. label — on sky background, dark text */}
                              <text
                                x={margin.left + 5}
                                y={groundY - 6}
                                fontSize="10"
                                fontWeight="700"
                                fill="#166534"
                                fontFamily="monospace"
                                filter="url(#darkHalo)"
                              >
                                G.L.
                              </text>

                              {/* ── Scour line ── */}
                              {vDs > 0 && (
                                <>
                                  <line
                                    x1={margin.left}
                                    y1={scourY}
                                    x2={W - margin.right}
                                    y2={scourY}
                                    stroke="#1d4ed8"
                                    strokeWidth="1.5"
                                    strokeDasharray="7 3"
                                  />
                                  <rect
                                    x={margin.left + 4}
                                    y={scourY - 14}
                                    width={62}
                                    height={13}
                                    rx="2"
                                    fill="#1d4ed8"
                                    opacity="0.85"
                                  />
                                  <text
                                    x={margin.left + 7}
                                    y={scourY - 4}
                                    fontSize="9"
                                    fontWeight="700"
                                    fill="white"
                                    fontFamily="monospace"
                                  >
                                    Scour level
                                  </text>
                                </>
                              )}

                              {/* ── Water table wavy lines ── */}
                              {gammaSub !== null &&
                                sGamma !== null &&
                                gammaSub < sGamma - 0.5 &&
                                (() => {
                                  const wtY = (vDs > 0 ? scourY : groundY) + 6;
                                  return (
                                    <g>
                                      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                                        <text
                                          key={k}
                                          x={margin.left + 8 + k * 36}
                                          y={wtY + 10}
                                          fontSize="10"
                                          fill="#1d4ed8"
                                          fontFamily="serif"
                                          opacity="0.7"
                                        >
                                          ≈
                                        </text>
                                      ))}
                                      <rect
                                        x={W - margin.right - 30}
                                        y={wtY + 1}
                                        width={28}
                                        height={12}
                                        rx="2"
                                        fill="#1d4ed8"
                                        opacity="0.80"
                                      />
                                      <text
                                        x={W - margin.right - 27}
                                        y={wtY + 10}
                                        fontSize="8"
                                        fontWeight="700"
                                        fill="white"
                                        fontFamily="monospace"
                                      >
                                        W.T.
                                      </text>
                                    </g>
                                  );
                                })()}

                              {/* ── Foundation block ── */}
                              {isCirc ? (
                                <ellipse
                                  cx={cx}
                                  cy={foundBotY - foundH_px / 2}
                                  rx={halfFoundPx}
                                  ry={foundH_px / 2}
                                  fill="#334155"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                />
                              ) : (
                                <rect
                                  x={foundL}
                                  y={foundTop}
                                  width={halfFoundPx * 2}
                                  height={foundH_px}
                                  fill="#334155"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                  rx="2"
                                />
                              )}
                              {/* Foundation label */}
                              <text
                                x={cx}
                                y={foundTop + foundH_px / 2 + 4}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="700"
                                fill="white"
                                fontFamily="monospace"
                              >
                                FOOTING
                              </text>

                              {/* ── Column ── */}
                              <rect
                                x={cx - colW / 2}
                                y={colTop}
                                width={colW}
                                height={foundTop - colTop + 1}
                                fill="#94a3b8"
                                stroke="#475569"
                                strokeWidth="1.5"
                              />
                              {/* column hatch */}
                              {[0.25, 0.5, 0.75].map((f) => {
                                const yy = colTop + f * (foundTop - colTop);
                                return (
                                  <line
                                    key={f}
                                    x1={cx - colW / 2}
                                    y1={yy}
                                    x2={cx + colW / 2}
                                    y2={yy}
                                    stroke="#475569"
                                    strokeWidth="0.8"
                                    opacity="0.5"
                                  />
                                );
                              })}

                              {/* ── Load arrow ── */}
                              {(() => {
                                const aBase = colTop - 3;
                                const aTail = aBase - 26;
                                const ah = 8,
                                  aw = 7;
                                const hasLoad = qs_p1 !== null;
                                return (
                                  <g>
                                    <line
                                      x1={cx}
                                      y1={aTail}
                                      x2={cx}
                                      y2={aBase - ah}
                                      stroke="#15803d"
                                      strokeWidth="2.5"
                                    />
                                    <polygon
                                      points={`${cx},${aBase} ${cx - aw},${aBase - ah} ${cx + aw},${aBase - ah}`}
                                      fill="#15803d"
                                    />
                                    {/* load label pill */}
                                    {hasLoad && (
                                      <>
                                        <rect
                                          x={cx + 8}
                                          y={aTail - 4}
                                          width={68}
                                          height={26}
                                          rx="4"
                                          fill="#15803d"
                                          opacity="0.90"
                                        />
                                        <text
                                          x={cx + 12}
                                          y={aTail + 7}
                                          fontSize="9"
                                          fontWeight="700"
                                          fill="white"
                                          fontFamily="monospace"
                                        >
                                          qs={fmt2(qs_p1)}
                                        </text>
                                        <text
                                          x={cx + 12}
                                          y={aTail + 18}
                                          fontSize="8"
                                          fill="#bbf7d0"
                                          fontFamily="monospace"
                                        >
                                          kN/m²
                                        </text>
                                      </>
                                    )}
                                    {!hasLoad && (
                                      <text
                                        x={cx + 8}
                                        y={aTail + 16}
                                        fontSize="9"
                                        fill="#15803d"
                                        fontFamily="monospace"
                                        filter="url(#darkHalo)"
                                      >
                                        Load ↓
                                      </text>
                                    )}
                                  </g>
                                );
                              })()}

                              {/* ── Inclination vector ── */}
                              {hasAlpha &&
                                parseFloat(sbcAlpha) > 0 &&
                                (() => {
                                  const alphaRad = (parseFloat(sbcAlpha) * Math.PI) / 180;
                                  const len = 32;
                                  const x2 = cx + len * Math.sin(alphaRad);
                                  const y2 = colTop - 4 - len * Math.cos(alphaRad);
                                  return (
                                    <g>
                                      <line
                                        x1={cx}
                                        y1={colTop - 4}
                                        x2={x2}
                                        y2={y2}
                                        stroke="#ea580c"
                                        strokeWidth="2.5"
                                        strokeDasharray="5 2"
                                      />
                                      <rect
                                        x={x2 + 2}
                                        y={y2 - 8}
                                        width={52}
                                        height={13}
                                        rx="3"
                                        fill="#ea580c"
                                        opacity="0.90"
                                      />
                                      <text
                                        x={x2 + 5}
                                        y={y2 + 2}
                                        fontSize="9"
                                        fontWeight="700"
                                        fill="white"
                                        fontFamily="monospace"
                                      >
                                        α={fmt2(parseFloat(sbcAlpha))}°
                                      </text>
                                    </g>
                                  );
                                })()}

                              {/* ── B dimension line ── */}
                              {hasB &&
                                (() => {
                                  const dy = foundTop - 12;
                                  return (
                                    <g>
                                      <line
                                        x1={foundL}
                                        y1={dy}
                                        x2={foundR}
                                        y2={dy}
                                        stroke="#475569"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={foundL}
                                        y1={dy - 4}
                                        x2={foundL}
                                        y2={dy + 4}
                                        stroke="#475569"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={foundR}
                                        y1={dy - 4}
                                        x2={foundR}
                                        y2={dy + 4}
                                        stroke="#475569"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={foundL}
                                        y1={foundTop}
                                        x2={foundL}
                                        y2={dy}
                                        stroke="#475569"
                                        strokeWidth="0.7"
                                        strokeDasharray="3 2"
                                      />
                                      <line
                                        x1={foundR}
                                        y1={foundTop}
                                        x2={foundR}
                                        y2={dy}
                                        stroke="#475569"
                                        strokeWidth="0.7"
                                        strokeDasharray="3 2"
                                      />
                                      {/* pill label on sky background */}
                                      <rect
                                        x={cx - 28}
                                        y={dy - 21}
                                        width={56}
                                        height={14}
                                        rx="3"
                                        fill="#334155"
                                        opacity="0.90"
                                      />
                                      <text
                                        x={cx}
                                        y={dy - 11}
                                        textAnchor="middle"
                                        fontSize="9"
                                        fontWeight="700"
                                        fill="white"
                                        fontFamily="monospace"
                                      >
                                        {isCirc ? `d=${fmt2(sB)} m` : `B=${fmt2(sB)} m`}
                                      </text>
                                    </g>
                                  );
                                })()}

                              {/* ── D dimension line (right) ── */}
                              {hasD &&
                                (() => {
                                  const dx = W - margin.right + 10;
                                  const midY = (groundY + foundBotY) / 2;
                                  return (
                                    <g>
                                      <line
                                        x1={dx}
                                        y1={groundY}
                                        x2={dx}
                                        y2={foundBotY}
                                        stroke="#475569"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={dx - 4}
                                        y1={groundY}
                                        x2={dx + 4}
                                        y2={groundY}
                                        stroke="#475569"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={dx - 4}
                                        y1={foundBotY}
                                        x2={dx + 4}
                                        y2={foundBotY}
                                        stroke="#475569"
                                        strokeWidth="1.2"
                                      />
                                      <rect
                                        x={dx + 5}
                                        y={midY - 8}
                                        width={40}
                                        height={14}
                                        rx="3"
                                        fill="#475569"
                                        opacity="0.90"
                                      />
                                      <text
                                        x={dx + 8}
                                        y={midY + 3}
                                        fontSize="9"
                                        fontWeight="700"
                                        fill="white"
                                        fontFamily="monospace"
                                      >
                                        D={fmt2(sD)}
                                      </text>
                                    </g>
                                  );
                                })()}

                              {/* ── ds dimension line (right, outer) ── */}
                              {vDs > 0 &&
                                hasD &&
                                (() => {
                                  const dx = W - margin.right + 32;
                                  const midY = (groundY + scourY) / 2;
                                  return (
                                    <g>
                                      <line
                                        x1={dx}
                                        y1={groundY}
                                        x2={dx}
                                        y2={scourY}
                                        stroke="#1d4ed8"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={dx - 3}
                                        y1={groundY}
                                        x2={dx + 3}
                                        y2={groundY}
                                        stroke="#1d4ed8"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={dx - 3}
                                        y1={scourY}
                                        x2={dx + 3}
                                        y2={scourY}
                                        stroke="#1d4ed8"
                                        strokeWidth="1.2"
                                      />
                                      <rect
                                        x={dx + 4}
                                        y={midY - 7}
                                        width={38}
                                        height={13}
                                        rx="3"
                                        fill="#1d4ed8"
                                        opacity="0.90"
                                      />
                                      <text
                                        x={dx + 7}
                                        y={midY + 2}
                                        fontSize="8"
                                        fontWeight="700"
                                        fill="white"
                                        fontFamily="monospace"
                                      >
                                        ds={fmt2(vDs)}
                                      </text>
                                    </g>
                                  );
                                })()}

                              {/* ── Df dimension line (left) ── */}
                              {hasD &&
                                (() => {
                                  const dx = margin.left - 12;
                                  const topY = vDs > 0 ? scourY : groundY;
                                  const midY = (topY + foundBotY) / 2;
                                  return (
                                    <g>
                                      <line
                                        x1={dx}
                                        y1={topY}
                                        x2={dx}
                                        y2={foundBotY}
                                        stroke="#15803d"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={dx - 4}
                                        y1={topY}
                                        x2={dx + 4}
                                        y2={topY}
                                        stroke="#15803d"
                                        strokeWidth="1.2"
                                      />
                                      <line
                                        x1={dx - 4}
                                        y1={foundBotY}
                                        x2={dx + 4}
                                        y2={foundBotY}
                                        stroke="#15803d"
                                        strokeWidth="1.2"
                                      />
                                      <rect
                                        x={dx - 46}
                                        y={midY - 7}
                                        width={42}
                                        height={14}
                                        rx="3"
                                        fill="#15803d"
                                        opacity="0.90"
                                      />
                                      <text
                                        x={dx - 43}
                                        y={midY + 4}
                                        fontSize="9"
                                        fontWeight="700"
                                        fill="white"
                                        fontFamily="monospace"
                                      >
                                        Df={fmt2(vDf)} m
                                      </text>
                                    </g>
                                  );
                                })()}

                              {/* ── Stress bulb label ── */}
                              {hasB &&
                                (() => {
                                  const lx = cx + bulbHalfBot * 0.6 + 4;
                                  const ly = foundBotY + (bulbBotY - foundBotY) * 0.55;
                                  return (
                                    <g>
                                      <rect
                                        x={lx}
                                        y={ly - 8}
                                        width={52}
                                        height={13}
                                        rx="3"
                                        fill="#166534"
                                        opacity="0.85"
                                      />
                                      <text
                                        x={lx + 4}
                                        y={ly + 2}
                                        fontSize="8"
                                        fontWeight="700"
                                        fill="white"
                                        fontFamily="monospace"
                                      >
                                        2:1 spread
                                      </text>
                                    </g>
                                  );
                                })()}

                              {/* ── Soil properties label ── */}
                              {(() => {
                                const lx = margin.left + 6;
                                const ly = Math.min(
                                  foundBotY + (bulbBotY - foundBotY) * 0.82,
                                  H - margin.bottom - 18
                                );
                                const parts = [];
                                if (hasPhi) parts.push(`φ=${fmt2(sPhi)}°`);
                                if (hasC) parts.push(`c=${fmt2(sC)} kPa`);
                                if (hasGamma) parts.push(`γ=${fmt2(sGamma)} kN/m³`);
                                if (parts.length === 0) return null;
                                const labelW = parts.length * 68 + 6;
                                return (
                                  <g>
                                    <rect
                                      x={lx}
                                      y={ly - 9}
                                      width={labelW}
                                      height={14}
                                      rx="3"
                                      fill="#7c3d12"
                                      opacity="0.80"
                                    />
                                    <text
                                      x={lx + 5}
                                      y={ly + 2}
                                      fontSize="9"
                                      fontWeight="600"
                                      fill="white"
                                      fontFamily="monospace"
                                    >
                                      {parts.join('  ')}
                                    </text>
                                  </g>
                                );
                              })()}

                              {/* ── Recommended SBC callout ── */}
                              {recommended !== null &&
                                (() => {
                                  const lx = cx - 52;
                                  const ly = foundBotY + (bulbBotY - foundBotY) * 0.28;
                                  return (
                                    <g>
                                      <rect
                                        x={lx}
                                        y={ly - 10}
                                        width={104}
                                        height={28}
                                        rx="5"
                                        fill="#15803d"
                                        opacity="0.92"
                                      />
                                      <text
                                        x={cx}
                                        y={ly + 2}
                                        textAnchor="middle"
                                        fontSize="9"
                                        fontWeight="700"
                                        fill="white"
                                        fontFamily="monospace"
                                      >
                                        SBC={fmt2(recommended)}
                                      </text>
                                      <text
                                        x={cx}
                                        y={ly + 13}
                                        textAnchor="middle"
                                        fontSize="8"
                                        fill="#bbf7d0"
                                        fontFamily="monospace"
                                      >
                                        kN/m² (design)
                                      </text>
                                    </g>
                                  );
                                })()}
                            </svg>

                            {/* ── Parameter summary cards ── */}
                            <div className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-gray-100">
                              {[
                                {
                                  label: 'Shear BC',
                                  sub: 'qs — Part 1',
                                  val: qs_p1,
                                  unit: 'kN/m²',
                                  highlight: false,
                                },
                                {
                                  label:
                                    soilTypeInput === 'clay' ? 'Consolidation BC' : 'Settlement BC',
                                  sub: soilTypeInput === 'clay' ? 'qsafe — Part 3' : 'qa — Part 2',
                                  val: settlementSBC,
                                  unit: 'kN/m²',
                                  highlight: false,
                                },
                                {
                                  label: 'Governs',
                                  sub:
                                    shearSBC !== null && settlementSBC !== null
                                      ? shearSBC <= settlementSBC
                                        ? 'Shear criteria'
                                        : 'Settlement criteria'
                                      : '—',
                                  val:
                                    shearSBC !== null && settlementSBC !== null
                                      ? Math.min(shearSBC, settlementSBC)
                                      : null,
                                  unit: 'kN/m²',
                                  highlight: false,
                                },
                                {
                                  label: 'Recommended SBC',
                                  sub: '85% × min(qs, qa)',
                                  val: recommended,
                                  unit: 'kN/m²',
                                  highlight: true,
                                },
                              ].map(({ label, sub, val, unit, highlight }) => (
                                <div
                                  key={label}
                                  className={`rounded-xl border p-3 flex flex-col gap-0.5 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100'}`}
                                >
                                  <p
                                    className={`text-[10px] font-bold uppercase tracking-widest ${highlight ? 'text-primary' : 'text-gray-400'}`}
                                  >
                                    {label}
                                  </p>
                                  <p className="text-[9px] text-gray-400 font-mono">{sub}</p>
                                  <p
                                    className={`text-lg font-black font-mono tabular-nums mt-0.5 ${val !== null ? (highlight ? 'text-primary' : 'text-gray-800') : 'text-gray-300'}`}
                                  >
                                    {val !== null && !isNaN(val) ? val.toFixed(2) : '—'}
                                    {val !== null && !isNaN(val) && (
                                      <span className="text-xs font-normal text-gray-400 ml-1">
                                        {unit}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* ══════════════════════════════════════════════════════════════
           FORMULAE REFERENCE
      ══════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                Formulae Reference
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                All parameters, symbols, units and formulae used across Bearing Capacity
                calculations — IS 6403 / IS 8009
              </p>
            </div>

            {/* ── Section helper ── */}
            {[
              /* ── Inputs ── */
              {
                section: 'Input Parameters',
                color: 'bg-gray-50',
                rows: [
                  {
                    param: 'Foundation Depth from Ground Level',
                    sym: 'D',
                    unit: 'm',
                    source: 'Input',
                    formula: '—',
                  },
                  {
                    param: 'Width of Foundation',
                    sym: 'B',
                    unit: 'm',
                    source: 'Input',
                    formula: '—',
                  },
                  {
                    param: 'Length of Foundation',
                    sym: 'L',
                    unit: 'm',
                    source: 'Input',
                    formula: '—',
                  },
                  {
                    param: 'Angle of Inclination of Resultant Load',
                    sym: 'α',
                    unit: '°',
                    source: 'Input',
                    formula: '—',
                  },
                  {
                    param: 'Standard Penetration Number',
                    sym: 'N',
                    unit: '—',
                    source: 'Input',
                    formula: '—',
                  },
                  {
                    param: 'Scour Depth from Ground Level',
                    sym: 'dₛ',
                    unit: 'm',
                    source: 'Input',
                    formula: '—',
                  },
                  {
                    param: 'Depth of Ground Water Level',
                    sym: 'Dw',
                    unit: 'm',
                    source: 'Input',
                    formula: '—',
                  },
                  {
                    param: 'Considered Angle of Friction',
                    sym: 'φ',
                    unit: '°',
                    source: 'Input',
                    formula: '—',
                  },
                  { param: 'Cohesion', sym: 'c', unit: 'kN/m²', source: 'Input', formula: '—' },
                  {
                    param: 'Bulk Unit Weight',
                    sym: 'γ',
                    unit: 'kN/m³',
                    source: 'Input',
                    formula: '—',
                  },
                  {
                    param: 'Constant Value for Safer Design (Water Table Correction)',
                    sym: 'W′',
                    unit: '—',
                    source: 'Constant',
                    formula: '0.5  (capped at 0.75 when q > 200 kN/m²)',
                  },
                  {
                    param: 'Factor of Safety',
                    sym: 'FOS',
                    unit: '—',
                    source: 'Input',
                    formula: '2 to 3',
                  },
                  {
                    param: 'Footing Type',
                    sym: '—',
                    unit: '—',
                    source: 'Input',
                    formula: 'Isolated (S_allow = 25 mm) | Raft (S_allow = 50 mm)',
                  },
                ],
              },

              /* ── Computed intermediates ── */
              {
                section: 'Computed Intermediate Values',
                color: 'bg-blue-50/30',
                rows: [
                  {
                    param: 'Effective Unit Weight',
                    sym: 'γsub',
                    unit: 'kN/m³',
                    source: 'Computed',
                    formula: 'γ − 10',
                  },
                  {
                    param: 'Depth of Foundation Below Scour Level',
                    sym: 'Df',
                    unit: 'm',
                    source: 'Computed',
                    formula: 'D − dₛ',
                  },
                  {
                    param: 'Effective Overburden Pressure',
                    sym: 'q',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: 'γsub × Df',
                  },
                  {
                    param: 'Depth of Failure Zone',
                    sym: 'Dfz',
                    unit: 'm',
                    source: 'Computed',
                    formula: '0.5 × B × tan(45° + φ/2)',
                  },
                  {
                    param: 'Reduced Angle of Friction',
                    sym: 'φ′',
                    unit: '°',
                    source: 'Computed',
                    formula: 'tan⁻¹(0.67 × tan φ)',
                  },
                  {
                    param: 'B/L ratio',
                    sym: 'B/L',
                    unit: '—',
                    source: 'Computed',
                    formula: 'B ÷ L  (1 for square/circle; ≈ 0 for strip)',
                  },
                  {
                    param: 'Df/B ratio',
                    sym: 'Df/B',
                    unit: '—',
                    source: 'Computed',
                    formula: 'Df ÷ B',
                  },
                ],
              },

              /* ── BC Factors ── */
              {
                section: 'Bearing Capacity Factors  (from Settings Table)',
                color: 'bg-teal-50/30',
                rows: [
                  {
                    param: 'BC factor — cohesion (general shear)',
                    sym: 'Nc',
                    unit: '—',
                    source: 'Settings',
                    formula: 'Interpolated from Bearing Capacity Factors table at φ',
                  },
                  {
                    param: 'BC factor — surcharge (general shear)',
                    sym: 'Nq',
                    unit: '—',
                    source: 'Settings',
                    formula: 'Interpolated from Bearing Capacity Factors table at φ',
                  },
                  {
                    param: 'BC factor — unit weight (general shear)',
                    sym: 'Nγ',
                    unit: '—',
                    source: 'Settings',
                    formula: 'Interpolated from Bearing Capacity Factors table at φ',
                  },
                  {
                    param: 'Reduced BC factor — cohesion (local shear)',
                    sym: 'N′c',
                    unit: '—',
                    source: 'Settings',
                    formula: 'Interpolated from Bearing Capacity Factors table at φ′',
                  },
                  {
                    param: 'Reduced BC factor — surcharge (local shear)',
                    sym: 'N′q',
                    unit: '—',
                    source: 'Settings',
                    formula: 'Interpolated from Bearing Capacity Factors table at φ′',
                  },
                  {
                    param: 'Reduced BC factor — unit weight (local shear)',
                    sym: 'N′γ',
                    unit: '—',
                    source: 'Settings',
                    formula: 'Interpolated from Bearing Capacity Factors table at φ′',
                  },
                ],
              },

              /* ── Shape factors ── */
              {
                section: 'Shape Factors  (IS 6403)',
                color: 'bg-purple-50/30',
                rows: [
                  {
                    param: 'Shape factor — cohesion term',
                    sym: 'Sc',
                    unit: '—',
                    source: 'Computed',
                    formula:
                      'Strip: 1.00  |  Rectangle: 1 + 0.2·(B/L)  |  Square: 1.3  |  Circle: 1.3',
                  },
                  {
                    param: 'Shape factor — surcharge term',
                    sym: 'Sq',
                    unit: '—',
                    source: 'Computed',
                    formula:
                      'Strip: 1.00  |  Rectangle: 1 + 0.2·(B/L)  |  Square: 1.2  |  Circle: 1.2',
                  },
                  {
                    param: 'Shape factor — unit weight term',
                    sym: 'Sγ',
                    unit: '—',
                    source: 'Computed',
                    formula:
                      'Strip: 1.00  |  Rectangle: 1 − 0.4·(B/L)  |  Square: 0.8  |  Circle: 0.6',
                  },
                ],
              },

              /* ── Depth factors ── */
              {
                section: 'Depth Factors  (IS 6403)',
                color: 'bg-amber-50/30',
                rows: [
                  {
                    param: 'Depth factor — cohesion term',
                    sym: 'dc',
                    unit: '—',
                    source: 'Computed',
                    formula: '1 + 0.2 × (Df/B) × tan(45° + φ/2)',
                  },
                  {
                    param: 'Depth factor — surcharge term',
                    sym: 'dq',
                    unit: '—',
                    source: 'Computed',
                    formula: 'φ ≤ 10°: 1.0   |   φ > 10°: 1 + 0.1 × (Df/B) × tan(45° + φ/2)',
                  },
                  {
                    param: 'Depth factor — unit weight term',
                    sym: 'dγ',
                    unit: '—',
                    source: 'Computed',
                    formula: 'φ ≤ 10°: 1.0   |   φ > 10°: 1 + 0.1 × (Df/B) × tan(45° + φ/2)',
                  },
                ],
              },

              /* ── Inclination factors ── */
              {
                section: 'Inclination Factors  (IS 6403)',
                color: 'bg-rose-50/30',
                rows: [
                  {
                    param: 'Inclination factor — cohesion term',
                    sym: 'ic',
                    unit: '—',
                    source: 'Computed',
                    formula: '(1 − α/90)²',
                  },
                  {
                    param: 'Inclination factor — surcharge term',
                    sym: 'iq',
                    unit: '—',
                    source: 'Computed',
                    formula: '(1 − α/90)²',
                  },
                  {
                    param: 'Inclination factor — unit weight term',
                    sym: 'iγ',
                    unit: '—',
                    source: 'Computed',
                    formula: '(1 − α/φ)²',
                  },
                ],
              },

              /* ── Ultimate Bearing Capacity ── */
              {
                section: 'Ultimate Bearing Capacity  qd  (IS 6403)',
                color: 'bg-green-50/30',
                rows: [
                  {
                    param: 'Local Shear Failure  (φ ≤ 28°)',
                    sym: 'qd',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: '(2/3)·c·N′c·Sc·dc·ic + q·(N′q−1)·Sq·dq·iq + 0.5·γ·B·N′γ·Sγ·dγ·iγ·W′',
                  },
                  {
                    param: 'Intermediate Shear Failure  (28° < φ < 36°)',
                    sym: 'qd',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: '½ × (qd_local + qd_general)',
                  },
                  {
                    param: 'General Shear Failure  (φ ≥ 36°)',
                    sym: 'qd',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: 'c·Nc·Sc·dc·ic + q·(Nq−1)·Sq·dq·iq + 0.5·γ·B·Nγ·Sγ·dγ·iγ·W′',
                  },
                  {
                    param: 'Safe Bearing Capacity',
                    sym: 'qs',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: 'qd ÷ FOS',
                  },
                ],
              },

              /* ── SPT Corrections ── */
              {
                section: 'SPT Corrections  (IS 2131)',
                color: 'bg-orange-50/30',
                rows: [
                  {
                    param: 'Overburden Correction Factor',
                    sym: 'CF',
                    unit: '—',
                    source: 'Settings',
                    formula:
                      'Interpolated from Overburden Correction table at Q  (fixed 0.75 when Q > 200 kN/m²)',
                  },
                  {
                    param: 'Corrected SPT — No Correction',
                    sym: 'NR',
                    unit: '—',
                    source: 'Computed',
                    formula: 'NR = N',
                  },
                  {
                    param: 'Corrected SPT — Overburden only',
                    sym: 'NR',
                    unit: '—',
                    source: 'Computed',
                    formula: 'NR = N × CF',
                  },
                  {
                    param: 'Corrected SPT — Dilatency only',
                    sym: 'NR',
                    unit: '—',
                    source: 'Computed',
                    formula: 'NR = (N + 15) / 2',
                  },
                  {
                    param: 'Corrected SPT — Both corrections',
                    sym: 'NR',
                    unit: '—',
                    source: 'Computed',
                    formula: 'NR = (N × CF + 15) / 2',
                  },
                  {
                    param: 'Clamped range',
                    sym: 'NR',
                    unit: '—',
                    source: 'Computed',
                    formula: 'Clamped to table range [5, 60]',
                  },
                ],
              },

              /* ── Settlement Criteria (Part 2) ── */
              {
                section: 'Settlement Criteria — Part 2  (IS 8009)',
                color: 'bg-sky-50/30',
                rows: [
                  {
                    param: 'Settlement per Unit Pressure',
                    sym: 'Sf',
                    unit: 'm / (kN/m²)',
                    source: 'Settings',
                    formula:
                      'Bilinear interpolation from Allowable Bearing Capacity table at NR and B',
                  },
                  {
                    param: "Fox's Depth Factor",
                    sym: 'If',
                    unit: '—',
                    source: 'Settings',
                    formula: "Interpolated from Fox's Correction curves at D/√(L×B) and L/B",
                  },
                  {
                    param: 'Rigidity Factor',
                    sym: 'Rf',
                    unit: '—',
                    source: 'Constant',
                    formula: '0.8',
                  },
                  {
                    param: 'Corrected Immediate Settlement',
                    sym: 'Si',
                    unit: 'm',
                    source: 'Computed',
                    formula: 'Sf × If × Rf',
                  },
                  {
                    param: 'Allowable Settlement',
                    sym: 'Sallow',
                    unit: 'mm',
                    source: 'Constant',
                    formula: '25 mm (isolated footing)  |  50 mm (raft footing)',
                  },
                  {
                    param: 'Allowable Bearing Capacity (settlement)',
                    sym: 'qa',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: 'Sallow ÷ (Si × 1000)  ×  98.1  [converts kg/cm² → kN/m²]',
                  },
                ],
              },

              /* ── Consolidation Settlement (Part 3) ── */
              {
                section: 'Consolidation Settlement — Part 3  (IS 8009)',
                color: 'bg-indigo-50/30',
                rows: [
                  {
                    param: 'Compression Index',
                    sym: 'Cc',
                    unit: '—',
                    source: 'Computed',
                    formula: '0.009 × (WL − 10)  [WL = liquid limit %, must be ≥ 10]',
                  },
                  {
                    param: 'Initial Overburden Pressure at mid-layer',
                    sym: 'Po',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: 'γsub × (D + Ht/2)',
                  },
                  {
                    param: 'Area of Footing',
                    sym: 'A',
                    unit: 'm²',
                    source: 'Computed',
                    formula: 'B × L',
                  },
                  {
                    param: 'Width of Stress Spread',
                    sym: 'Bo',
                    unit: 'm',
                    source: 'Computed',
                    formula: 'B + 2 × (Ht/4)  =  B + Ht/2',
                  },
                  {
                    param: 'Length of Stress Spread',
                    sym: 'Lo',
                    unit: 'm',
                    source: 'Computed',
                    formula: 'L + 2 × (Ht/4)  =  L + Ht/2',
                  },
                  {
                    param: 'Spread Area at Mid-layer',
                    sym: 'Ao',
                    unit: 'm²',
                    source: 'Computed',
                    formula: 'Bo × Lo',
                  },
                  {
                    param: 'Pressure Intensity at Mid-layer',
                    sym: 'ΔP',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: '(P × A) / Ao',
                  },
                  {
                    param: 'Consolidation Settlement',
                    sym: 'Scon',
                    unit: 'mm',
                    source: 'Computed',
                    formula: '[Ht / (1 + e₀)] × Cc × log₁₀[(Po + ΔP) / Po]  ×  1000  (e₀ = 0.8)',
                  },
                  {
                    param: 'Total Consolidation Settlement',
                    sym: 'Stot',
                    unit: 'mm',
                    source: 'Computed',
                    formula: 'Scon × If × Rf',
                  },
                  {
                    param: 'Final Total Settlement',
                    sym: 'Sfinal',
                    unit: 'mm',
                    source: 'Computed',
                    formula: 'Stot + Si',
                  },
                  {
                    param: 'Safe Bearing Pressure for 25 mm',
                    sym: 'qsafe',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: '(P / Sfinal) × 25',
                  },
                ],
              },

              /* ── Recommended SBC ── */
              {
                section: 'Recommended Design SBC  (IS 6403)',
                color: 'bg-emerald-50/40',
                rows: [
                  {
                    param: 'Governing Settlement BC (Clay)',
                    sym: 'qa',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: 'qsafe from Part 3 (consolidation settlement governs)',
                  },
                  {
                    param: 'Governing Settlement BC (Non-clay)',
                    sym: 'qa',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: 'qa from Part 2 (immediate settlement only)',
                  },
                  {
                    param: 'Recommended Design SBC',
                    sym: 'SBC',
                    unit: 'kN/m²',
                    source: 'Computed',
                    formula: '0.85 × min(qs, qa)',
                  },
                ],
              },
            ].map(({ section, color, rows }) => (
              <div key={section}>
                {/* Section header */}
                <div className={`px-4 py-2 border-b border-gray-100 ${color}`}>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                    {section}
                  </p>
                </div>
                {/* Rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                  <tbody className="divide-y divide-gray-50">
                    {rows.map(({ param, sym, unit, source, formula }) => {
                      const sourceBadge =
                        {
                          Input: 'bg-blue-50 text-blue-700 border-blue-200',
                          Computed: 'bg-amber-50 text-amber-700 border-amber-200',
                          Settings: 'bg-teal-50 text-teal-700 border-teal-200',
                          Constant: 'bg-purple-50 text-purple-700 border-purple-200',
                        }[source] ?? 'bg-gray-50 text-gray-500 border-gray-200';
                      return (
                        <tr key={param} className="hover:bg-gray-50/60 transition-colors group">
                          {/* Parameter name */}
                          <td className="py-2.5 px-4 text-gray-700 font-medium leading-snug w-72">
                            {param}
                          </td>
                          {/* Symbol */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-800 w-16">
                            {sym}
                          </td>
                          {/* Unit */}
                          <td className="py-2.5 px-3 text-center font-mono text-gray-400 w-24">
                            {unit}
                          </td>
                          {/* Source badge */}
                          <td className="py-2.5 px-3 text-center w-24">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${sourceBadge}`}
                            >
                              {source}
                            </span>
                          </td>
                          {/* Formula */}
                          <td className="py-2.5 px-4 font-mono text-gray-600 leading-relaxed">
                            {formula}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[10px] text-gray-400 italic">
                References: IS 6403 : 1981 (Code of Practice for Determination of Bearing Capacity
                of Shallow Foundations) · IS 8009 Part I : 1976 (Code of Practice for Calculation of
                Settlements of Foundations) · IS 2131 : 1981 (Method for Standard Penetration Test
                for Soils)
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="rock">
        <AdminRockBearingCapacity />
      </TabsContent>
    </Tabs>
  );
};

export default AdminBearingCapacityManager;
