import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Save, Plus, Trash2, Loader2, Mountain } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
const makeCrosshairPlugin = (colors) => ({
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
    const dsColors = [
      colors.primary,
      colors.blue,
      colors.orange,
      colors.teal,
      colors.violet,
      colors.rose,
    ];
    const labels = ['Nc', 'Nq', 'N\u03b3', 'N\u2019c', 'N\u2019q', 'N\u2019\u03b3'];

    const interpolated = chart.data.datasets.map((ds) => {
      const pts = (ds.data || []).slice().sort((a, b) => a.x - b.x);
      return interpolateY(pts, xVal);
    });

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

    // Dots on each curve
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

    const phiPrime = derivePhiPrime(xVal);
    const lines = [
      { text: `\u03c6: ${xVal.toFixed(1)}\u00b0`, color: colors.card },
      ...interpolated.slice(0, 3).map((v, i) => ({
        text: v !== null ? `${labels[i]}: ${v.toFixed(2)}` : `${labels[i]}: \u2014`,
        color: dsColors[i],
      })),
      { text: `\u03c6\u2032: ${phiPrime.toFixed(2)}\u00b0`, color: '#99f6e4' },
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

// ─── Component ────────────────────────────────────────────────────────────────
const AdminBearingCapacityManager = () => {
  const { settings, updateSetting, loading } = useSettings();
  const { toast } = useToast();

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

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
      plugins: [makeCrosshairPlugin(colors)],
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
                φ (°)
              </th>
              <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                N<sub>c</sub>
              </th>
              <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                N<sub>q</sub>
              </th>
              <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100">
                N<sub>γ</sub>
              </th>
              <th className="text-center py-3 px-4 font-bold text-teal-600 dark:text-teal-300 uppercase tracking-widest text-[10px] bg-teal-50/50 dark:bg-teal-900/20">
                φ′ (°)
              </th>
              <th className="text-center py-3 px-4 font-bold text-teal-600 dark:text-teal-300 uppercase tracking-widest text-[10px] bg-teal-50/50 dark:bg-teal-900/20">
                N′<sub>c</sub>
              </th>
              <th className="text-center py-3 px-4 font-bold text-teal-600 dark:text-teal-300 uppercase tracking-widest text-[10px] bg-teal-50/50 dark:bg-teal-900/20">
                N′<sub>q</sub>
              </th>
              <th className="text-center py-3 px-4 font-bold text-teal-600 dark:text-teal-300 uppercase tracking-widest text-[10px] bg-teal-50/50 dark:bg-teal-900/20">
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
    </div>
  );
};

export default AdminBearingCapacityManager;
