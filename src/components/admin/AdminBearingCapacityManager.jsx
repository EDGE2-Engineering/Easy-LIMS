import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Save, Plus, Trash2, Loader2, Mountain } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AdminOverburdenCorrectionManager from './AdminOverburdenCorrectionManager';
import AdminUnitWeightsManager from './AdminUnitWeightsManager';
import {
  Chart,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
  LineController,
} from 'chart.js';

Chart.register(LinearScale, PointElement, LineElement, ChartTooltip, Legend, LineController);

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
  const [dfInput, setDfInput] = useState('');
  const [alphaInput, setAlphaInput] = useState('');
  const [cInput, setCInput] = useState(''); // cohesion kN/m²
  const [qInput, setQInput] = useState(''); // surcharge kN/m²
  const [gammaInput, setGammaInput] = useState(''); // unit weight kN/m³
  const [wInput, setWInput] = useState('1'); // W′ water table factor (default 1)
  const [fosInput, setFosInput] = useState(''); // factor of safety

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

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
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
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
            N<sub>c</sub>, N<sub>q</sub>, N<sub>γ</sub> and derived N′<sub>c</sub>, N′<sub>q</sub>,
            N′<sub>γ</sub> vs. friction angle φ
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
                    Bearing Capacity Interpolation Calculator
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
          <strong>φ′ = tan⁻¹(0.67 × tan φ)</strong> and interpolate N′<sub>c</sub>, N′<sub>q</sub>,
          N′<sub>γ</sub> from the same table — these are the <em>local shear failure</em> factors
          per IS 6403. Hover the chart for <strong>interpolated values</strong>. Click <em>Save</em>{' '}
          to persist the base table.
        </p>
      </div>

      {/* ── Table: Shape Factors ── */}
      {(() => {
        const B = parseFloat(bInput);
        const L = parseFloat(lInput);
        const hasB = !isNaN(B) && bInput !== '';
        const hasL = !isNaN(L) && lInput !== '';
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
                    Length of Foundation
                    <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                      — L <span className="font-normal text-gray-400">(m)</span>
                    </span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={lInput}
                    onChange={(e) => setLInput(e.target.value)}
                    placeholder="e.g. 3.0"
                    className="w-40 text-center rounded-xl h-9 text-sm font-mono"
                  />
                </div>
                {hasBL && (
                  <span className="text-xs font-mono text-gray-500 shrink-0 pb-2">
                    B/L = {ratio.toFixed(4)}
                  </span>
                )}
              </div>
            </div>

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
                    canCalc && phi <= 10 ? '1  [φ ≤ 10°]' : '1 + 0.1·(Df/B)·tan(45°+φ/2)  [φ > 10°]'
                  }
                  value={fmtV(dqdg)}
                />
                <DepthCard
                  label="dγ"
                  formula={
                    canCalc && phi <= 10 ? '1  [φ ≤ 10°]' : '1 + 0.1·(Df/B)·tan(45°+φ/2)  [φ > 10°]'
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
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
                  i<sub>c</sub>, i<sub>q</sub>, i<sub>γ</sub> — angle of inclination of resultant
                  load
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

      {/* ── Bearing Capacity ── */}
      {(() => {
        // ── Pull all shared computed values ──────────────────────────────────
        const phi = parseFloat(phiInput);
        const B = parseFloat(bInput);
        const alpha = parseFloat(alphaInput);

        const hasPhi = !isNaN(phi) && phiInput !== '';
        const hasB = !isNaN(B) && bInput !== '';
        const hasAlpha = !isNaN(alpha) && alphaInput !== '';

        // Interpolated factors (from base table)
        const phiPrime = hasPhi ? derivePhiPrime(phi) : null;
        const Nc = hasPhi ? interpolateY(ncPts, phi) : null;
        const Nq = hasPhi ? interpolateY(nqPts, phi) : null;
        const Ng = hasPhi ? interpolateY(ngPts, phi) : null;
        const NcP = hasPhi ? interpolateY(ncPts, phiPrime) : null;
        const NgP = hasPhi ? interpolateY(ngPts, phiPrime) : null; // N′γ

        // Shape factors (Rectangle formula — most general; fixed for Sq/Sc, user provides B/L)
        const L = parseFloat(lInput);
        const hasL = !isNaN(L) && lInput !== '' && L !== 0;
        const ratio = hasB && hasL ? B / L : null;
        const Sc = ratio !== null ? 1 + 0.2 * ratio : null;
        const Sq = ratio !== null ? 1 + 0.2 * ratio : null;
        const Sg = ratio !== null ? 1 - 0.4 * ratio : null;

        // Depth factors
        const Df = parseFloat(dfInput);
        const hasDf = !isNaN(Df) && dfInput !== '';
        const tanT = hasPhi && hasB && hasDf ? Math.tan(((45 + phi / 2) * Math.PI) / 180) : null;
        const dfbR = hasB && hasDf ? Df / B : null;
        const dc_v = tanT !== null ? 1 + 0.2 * dfbR * tanT : null;
        const dqdg_v = tanT !== null ? (phi <= 10 ? 1 : 1 + 0.1 * dfbR * tanT) : null;

        // Inclination factors
        const ic_v = hasAlpha ? Math.pow(1 - alpha / 90, 2) : null;
        const iq_v = hasAlpha ? Math.pow(1 - alpha / 90, 2) : null;
        const ig_v = hasAlpha && hasPhi && phi !== 0 ? Math.pow(1 - alpha / phi, 2) : null;

        // Additional inputs specific to bearing capacity
        const c = parseFloat(cInput);
        const q = parseFloat(qInput);
        const gamma = parseFloat(gammaInput);
        const W = parseFloat(wInput);
        const fos = parseFloat(fosInput);

        const hasC = !isNaN(c) && cInput !== '';
        const hasQ = !isNaN(q) && qInput !== '';
        const hasGamma = !isNaN(gamma) && gammaInput !== '';
        const hasW = !isNaN(W) && wInput !== '';
        const hasFos = !isNaN(fos) && fosInput !== '' && fos > 0;

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
        //   (2/3)·c·N′c·Sc·dc·ic + q·(N′q−1)·Sq·dq·iq + 0.5·γ·B·N′γ·dγ·iγ·W′
        // General shear (uses N factors):
        //   c·Nc·Sc·dc·ic + q·(Nq−1)·Sq·dq·iq + 0.5·γ·B·Nγ·dγ·iγ·W′
        // Note: the problem statement uses N′γ in the general shear 3rd term — keeping as specified.

        const localTerm1 = allFactors ? (2 / 3) * c * NcP * Sc * dc_v * ic_v : null;
        const localTerm2 = allFactors ? q * (NcP - 1) * Sq * dqdg_v * iq_v : null; // N′q ≈ NcP per IS 6403 note; using NcP as stated
        // Re-reading formula: q·(N′q−1) — user gave N′q as derived from Nq. Use Nq interpolated at φ′
        const NqP = hasPhi ? interpolateY(nqPts, phiPrime) : null;
        const localT2_fix = allFactors ? q * (NqP - 1) * Sq * dqdg_v * iq_v : null;
        const localTerm3 = allFactors ? 0.5 * gamma * B * NgP * dqdg_v * ig_v * W : null;
        const qdLocal = allFactors
          ? (2 / 3) * c * NcP * Sc * dc_v * ic_v +
            q * (NqP - 1) * Sq * dqdg_v * iq_v +
            0.5 * gamma * B * NgP * dqdg_v * ig_v * W
          : null;

        const genTerm1 = allFactors ? c * Nc * Sc * dc_v * ic_v : null;
        const genTerm2 = allFactors ? q * (Nq - 1) * Sq * dqdg_v * iq_v : null;
        const genTerm3 = allFactors ? 0.5 * gamma * B * NgP * dqdg_v * ig_v * W : null;
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                Bearing Capacity Tester
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
                Ultimate q<sub>d</sub> and safe q<sub>s</sub> per IS 6403
              </p>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* ── Input grid ── */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Inputs — shared values auto-filled from above
                </p>
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
                  <BcInputRow
                    description="Width of Foundation"
                    symbol="B"
                    unit="m"
                    value={bInput}
                    onChange={setBInput}
                    placeholder="e.g. 2.0"
                  />
                  <BcInputRow
                    description="Length of Foundation"
                    symbol="L"
                    unit="m"
                    value={lInput}
                    onChange={setLInput}
                    placeholder="e.g. 3.0"
                  />
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
                    description="Effective Overburden Pressure"
                    symbol="q"
                    unit="kN/m²"
                    value={qInput}
                    onChange={setQInput}
                    placeholder="e.g. 18"
                  />
                  <BcInputRow
                    description="Bulk Unit Weight"
                    symbol="γ"
                    unit="kN/m³"
                    value={gammaInput}
                    onChange={setGammaInput}
                    placeholder="e.g. 18"
                  />
                  <BcInputRow
                    description="Constant Value for Safer Design"
                    symbol="W′"
                    unit="-"
                    value={wInput}
                    onChange={setWInput}
                    placeholder="e.g. 1.0"
                  />
                  <BcInputRow
                    description="Factor of Safety"
                    symbol="FOS"
                    unit="-"
                    value={fosInput}
                    onChange={setFosInput}
                    placeholder="e.g. 3"
                  />
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
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{v}</span>
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
                      formula="(2/3)·c·N′c·Sc·dc·ic + q·(N′q−1)·Sq·dq·iq + 0.5·γ·B·N′γ·dγ·iγ·W′"
                      value={`${fmtV2(qdLocal)} kN/m²`}
                      highlight={regime === 'local'}
                    />
                  )}
                  {/* General shear */}
                  {(regime === 'general' || regime === 'intermediate') && (
                    <BcResultCard
                      label="qd (General)"
                      formula="c·Nc·Sc·dc·ic + q·(Nq−1)·Sq·dq·iq + 0.5·γ·B·N′γ·dγ·iγ·W′"
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
  + 0.5 × ${fmtV4(gamma)} × ${fmtV4(B)} × ${fmtV4(NgP)} × ${fmtV4(dqdg_v)} × ${fmtV4(ig_v)} × ${fmtV4(W)}
= ${fmtV4((2 / 3) * c * NcP * Sc * dc_v * ic_v)} + ${fmtV4(q * (NqP - 1) * Sq * dqdg_v * iq_v)} + ${fmtV4(0.5 * gamma * B * NgP * dqdg_v * ig_v * W)}
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
  + 0.5 × ${fmtV4(gamma)} × ${fmtV4(B)} × ${fmtV4(NgP)} × ${fmtV4(dqdg_v)} × ${fmtV4(ig_v)} × ${fmtV4(W)}
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
                  Fill all inputs above (φ, B, L, Df, α, c, q, γ, W′) to compute bearing capacity.
                </p>
              )}

              <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
                <p>
                  c = cohesion (kN/m²) · q = overburden pressure at foundation level (kN/m²) · γ =
                  unit weight of soil (kN/m³)
                </p>
                <p>
                  W′ = water table correction factor (1.0 = no correction, 0.5 = water at base) ·
                  FOS = factor of safety
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminBearingCapacityManager;
