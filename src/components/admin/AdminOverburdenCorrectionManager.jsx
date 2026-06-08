import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Save, Plus, Trash2, Loader2, Layers } from 'lucide-react';
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

const SETTING_KEY = 'overburden_correction_data';
const DEFAULT_ROWS = [{ id: Date.now(), pressure: '', correction: '' }];

// ─── Theme helpers ─────────────────────────────────────────────────────────────
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
});

// ─── Linear interpolation on sorted { x, y } array ───────────────────────────
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

// ─── Crosshair plugin ─────────────────────────────────────────────────────────
const makeCrosshairPlugin = (colors) => ({
  id: 'overburdenCrosshair',
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

    const xScale = scales.x;
    const yScale = scales.y;
    const points = (chart.data.datasets[0]?.data || []).slice().sort((a, b) => a.x - b.x);
    const xVal = xScale.getValueForPixel(cursor.x);
    const yProjected = interpolateY(points, xVal);
    if (yProjected === null) return;

    const yPixel = yScale.getPixelForValue(yProjected);

    ctx.save();

    // Vertical dashed line
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.moveTo(cursor.x, top);
    ctx.lineTo(cursor.x, bottom);
    ctx.stroke();

    // Horizontal dashed line
    ctx.beginPath();
    ctx.moveTo(left, yPixel);
    ctx.lineTo(right, yPixel);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dot
    ctx.beginPath();
    ctx.arc(cursor.x, yPixel, 5, 0, Math.PI * 2);
    ctx.fillStyle = colors.primary;
    ctx.fill();
    ctx.strokeStyle = colors.card;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tooltip
    const cfLabel = `CF: ${xVal.toFixed(3)}`;
    const qLabel = `Q:  ${yProjected.toFixed(2)} kN/m\u00b2`;
    const fontSize = 11;
    ctx.font = `600 ${fontSize}px 'Poppins','Inter',sans-serif`;
    const pad = 8,
      lineH = fontSize + 5,
      margin = 10;
    const boxW = Math.max(ctx.measureText(cfLabel).width, ctx.measureText(qLabel).width) + pad * 2;
    const boxH = lineH * 2 + pad * 2;
    let bx = cursor.x + margin;
    let by = yPixel - boxH - margin;
    if (bx + boxW > right) bx = cursor.x - boxW - margin;
    if (by < top) by = yPixel + margin;

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
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = colors.card;
    ctx.textBaseline = 'middle';
    ctx.fillText(cfLabel, bx + pad, by + pad + lineH * 0.5);
    ctx.fillText(qLabel, bx + pad, by + pad + lineH * 1.5);
    ctx.restore();
  },
});

// ─── Component ────────────────────────────────────────────────────────────────
const AdminOverburdenCorrectionManager = () => {
  const { settings, updateSetting, loading } = useSettings();
  const { toast } = useToast();

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInit] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [qInput, setQInput] = useState(''); // interpolation calculator input

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Dark mode observer
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Load persisted data
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
      setHasInit(true);
    }
  }, [loading, settings, hasInitialized]);

  // Sorted chart data: x = correction factor, y = pressure
  const chartData = rows
    .filter(
      (r) =>
        r.pressure !== '' &&
        r.correction !== '' &&
        !isNaN(parseFloat(r.pressure)) &&
        !isNaN(parseFloat(r.correction))
    )
    .map((r) => ({ x: parseFloat(r.correction), y: parseFloat(r.pressure) }))
    .sort((a, b) => a.x - b.x);

  // Sorted by Q (pressure as x) for the calculator
  const qPoints = rows
    .filter(
      (r) =>
        r.pressure !== '' &&
        r.correction !== '' &&
        !isNaN(parseFloat(r.pressure)) &&
        !isNaN(parseFloat(r.correction))
    )
    .map((r) => ({ x: parseFloat(r.pressure), y: parseFloat(r.correction) }))
    .sort((a, b) => a.x - b.x);

  const chartDataKey = JSON.stringify(chartData);

  // Chart
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    if (chartData.length < 2) return;

    const colors = buildChartColors();
    const fillColor = colors.primary.startsWith('hsl')
      ? colors.primary.replace('hsl(', 'hsla(').replace(')', ', 0.10)')
      : colors.primary + '1a';

    const xMax = Math.max(2.0, Math.ceil((chartData[chartData.length - 1]?.x ?? 2) * 10) / 10);
    const tickValues = new Set();
    for (let v = 0; v <= xMax + 1e-9; v = Math.round((v + 0.5) * 100) / 100)
      tickValues.add(Math.round(v * 100) / 100);
    for (let v = 0.5; v <= 1.0 + 1e-9; v = Math.round((v + 0.1) * 100) / 100)
      tickValues.add(Math.round(v * 100) / 100);
    const sortedTicks = [...tickValues].sort((a, b) => a - b);

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Overburden Pressure vs Correction Factor',
            data: chartData,
            parsing: false,
            borderColor: colors.primary,
            backgroundColor: fillColor,
            pointBackgroundColor: colors.primary,
            pointBorderColor: colors.card,
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 9,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
          },
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
              padding: 16,
            },
          },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: xMax,
            ticks: {
              values: sortedTicks,
              color: colors.muted,
              font: { size: 10 },
              maxRotation: 0,
              callback(value) {
                const v = Math.round(value * 100) / 100;
                return Math.round(v / 0.5) * 0.5 === v || (v >= 0.5 && v <= 1.0)
                  ? v.toFixed(1)
                  : '';
              },
            },
            afterBuildTicks(axis) {
              axis.ticks = sortedTicks.map((v) => ({ value: v }));
            },
            title: {
              display: true,
              text: 'Correction Factor (CF)  \u2192',
              color: colors.muted,
              font: { size: 11, weight: '600' },
              padding: { top: 8 },
            },
            grid: { color: colors.border, lineWidth: 1 },
            border: { color: colors.border },
          },
          y: {
            type: 'linear',
            reverse: true,
            min: 0,
            title: {
              display: true,
              text: '\u2190 Effective Overburden Pressure Q (kN/m\u00b2)',
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
    setRows((prev) => [...prev, { id: Date.now(), pressure: '', correction: '' }]);

  const handleDeleteRow = useCallback((id) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [{ id: Date.now(), pressure: '', correction: '' }];
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting(SETTING_KEY, JSON.stringify(rows));
      toast({ title: 'Saved', description: 'Overburden pressure correction data has been saved.' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to save correction data.',
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

  // ── Calculator ──────────────────────────────────────────────────────────────
  const calcQ = parseFloat(qInput);
  const hasQ = !isNaN(calcQ) && qInput !== '';
  const cfValue = hasQ ? interpolateY(qPoints, calcQ) : null;

  const findBracket = (pts, x) => {
    if (!pts || pts.length < 2 || isNaN(x)) return null;
    if (x <= pts[0].x) return { lo: pts[0], hi: pts[1] };
    if (x >= pts[pts.length - 1].x) return { lo: pts[pts.length - 2], hi: pts[pts.length - 1] };
    for (let i = 0; i < pts.length - 1; i++)
      if (x >= pts[i].x && x <= pts[i + 1].x) return { lo: pts[i], hi: pts[i + 1] };
    return null;
  };
  const bracket = hasQ ? findBracket(qPoints, calcQ) : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-4">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            Overburden Pressure Correction
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Effective overburden pressure vs. correction factor
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
              <p className="text-xs">Persist all correction values</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] w-10">
                #
              </th>
              <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                  Effective Overburden Pressure
                </span>
                Q (kN/m²)
              </th>
              <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                <span className="block normal-case font-normal text-gray-400 text-[9px] leading-tight">
                  Overburden Pressure
                </span>
                Correction Factor (CF)
              </th>
              <th className="py-3 px-4 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="py-3 px-4 text-center text-gray-400 text-xs font-mono">{idx + 1}</td>
                <td className="py-3 px-4">
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.pressure}
                      onChange={(e) => handleChange(row.id, 'pressure', e.target.value)}
                      placeholder="e.g. 100.00"
                      className="w-40 text-center rounded-xl h-9"
                    />
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={row.correction}
                      onChange={(e) => handleChange(row.id, 'correction', e.target.value)}
                      placeholder="e.g. 1.000"
                      className="w-40 text-center rounded-xl h-9"
                    />
                  </div>
                </td>
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
            ))}
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
      {chartData.length >= 2 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Correction Curve
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Hover anywhere for interpolated values &nbsp;·&nbsp; Dense 0.1 intervals between
              0.5–1.0, coarse 0.5 steps elsewhere
            </p>
          </div>
          <div className="relative w-full" style={{ height: 420 }}>
            <canvas ref={chartRef} />
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-10 text-gray-400 text-sm text-center space-y-1">
          <Layers className="w-6 h-6 mx-auto opacity-30 mb-2" />
          <p>
            {chartData.length === 1
              ? 'Add at least 2 valid rows to display the chart.'
              : 'Enter values in the table above to see the correction curve.'}
          </p>
        </div>
      )}

      {/* ── Interpolation Calculator ── */}
      {qPoints.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          {/* Title + input */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Interpolation Calculator
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Enter Q to compute the interpolated Correction Factor with step-by-step formula
              </p>
            </div>
            <div className="flex flex-col gap-1.5 sm:ml-auto w-40">
              <label className="text-xs text-gray-500 dark:text-gray-400 leading-tight w-40 break-words">
                Effective Overburden Pressure
                <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">
                  — Q <span className="font-normal text-gray-400">(kN/m²)</span>
                </span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="e.g. 150.0"
                className="w-40 text-center rounded-xl h-10 text-base font-mono"
              />
            </div>
          </div>

          {hasQ ? (
            <>
              {/* Result card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border p-4 flex flex-col gap-1 bg-gray-50 dark:bg-gray-100 border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Q (kN/m²)
                  </p>
                  <p className="text-2xl font-black font-mono tabular-nums text-gray-900 dark:text-gray-100">
                    {calcQ.toFixed(4)}
                  </p>
                </div>
                <div className="rounded-xl border p-4 flex flex-col gap-1 bg-primary/5 border-primary/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Correction Factor (CF)
                  </p>
                  <p className="text-2xl font-black font-mono tabular-nums text-primary">
                    {cfValue !== null ? cfValue.toFixed(4) : '—'}
                  </p>
                </div>
              </div>

              {/* Step-by-step */}
              {bracket && cfValue !== null && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    Step-by-step computation
                  </h3>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-1 not-italic">
                      CF — interpolated at Q = {calcQ.toFixed(4)} kN/m²
                    </p>
                    {`CF = CF_low + ((CF_high − CF_low) / (Q_high − Q_low)) × (Q − Q_low)
   = ${bracket.lo.y.toFixed(4)} + ((${bracket.hi.y.toFixed(4)} − ${bracket.lo.y.toFixed(4)}) / (${bracket.hi.x.toFixed(4)} − ${bracket.lo.x.toFixed(4)})) × (${calcQ.toFixed(4)} − ${bracket.lo.x.toFixed(4)})
   = ${bracket.lo.y.toFixed(4)} + (${(bracket.hi.y - bracket.lo.y).toFixed(4)} / ${(bracket.hi.x - bracket.lo.x).toFixed(4)}) × ${(calcQ - bracket.lo.x).toFixed(4)}
   = ${bracket.lo.y.toFixed(4)} + ${((bracket.hi.y - bracket.lo.y) / (bracket.hi.x - bracket.lo.x)).toFixed(6)} × ${(calcQ - bracket.lo.x).toFixed(4)}
   = ${bracket.lo.y.toFixed(4)} + ${(((bracket.hi.y - bracket.lo.y) / (bracket.hi.x - bracket.lo.x)) * (calcQ - bracket.lo.x)).toFixed(6)}
   = ${cfValue.toFixed(4)}`}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              Enter a Q value above to see the interpolated correction factor and formula.
            </div>
          )}
        </div>
      )}

      {/* ── Info note ── */}
      <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
        <Layers className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">
          Dense 0.1 intervals between <strong>0.5 and 1.0</strong>, coarse 0.5 steps outside. Y-axis
          is inverted (0 kN/m² at top, increasing downward). Hover the curve for{' '}
          <strong>interpolated CF and Q values</strong>. Click <em>Save</em> to persist.
        </p>
      </div>
    </div>
  );
};

export default AdminOverburdenCorrectionManager;
