import React, { useId } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { LineChart } from 'lucide-react';

/**
 * SVG Compaction Curve (Moisture Content % vs Dry Density g/cc)
 * Standard geotechnical bell-shaped curve showing peak MDD and OMC.
 * Strictly bounded and clipped to prevent curve spilling out of container.
 */
export default function CompactionCurveChart({
  validPoints = [],
  curveFit = null,
  peakMdd = null,
  peakOmc = null,
  width = 540,
  height = 280,
}) {
  const { isDark } = useTheme();
  const clipId = useId();

  if (!validPoints || validPoints.length < 2) {
    return (
      <div className="h-64 border border-dashed border-gray-200 dark:border-border rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-muted-foreground p-4 bg-gray-50/50 dark:bg-muted/20">
        <LineChart className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm font-medium">Compaction Curve (MC vs Dry Density)</p>
        <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">
          Enter at least 2 valid determinations to plot the curve
        </p>
      </div>
    );
  }

  const padding = { top: 30, right: 35, bottom: 45, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // X range (Moisture Content %)
  const allX = validPoints.map((p) => p.x);
  if (peakOmc !== null && !isNaN(peakOmc)) allX.push(peakOmc);
  const rawMinX = Math.min(...allX);
  const rawMaxX = Math.max(...allX);
  const minX = Math.floor(rawMinX - 1);
  const maxX = Math.ceil(rawMaxX + 1);
  const rangeX = Math.max(maxX - minX, 4);

  // Y range (Dry Density g/cc)
  const allY = validPoints.map((p) => p.y);
  if (peakMdd !== null && !isNaN(peakMdd)) allY.push(peakMdd);
  const rawMinY = Math.min(...allY);
  const rawMaxY = Math.max(...allY);
  const minY = Math.floor((rawMinY - 0.05) * 20) / 20; // steps of 0.05
  const maxY = Math.ceil((rawMaxY + 0.05) * 20) / 20;
  const rangeY = Math.max(maxY - minY, 0.15);

  // Strictly clamp pixel coordinates so nothing ever projects outside the plot area
  const getX = (val) => {
    const clamped = Math.max(minX, Math.min(maxX, val));
    const ratio = (clamped - minX) / rangeX;
    return padding.left + ratio * plotWidth;
  };

  const getY = (val) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    const ratio = (clamped - minY) / rangeY;
    return height - padding.bottom - ratio * plotHeight;
  };

  const hasPeak = peakMdd !== null && peakOmc !== null && !isNaN(peakMdd) && !isNaN(peakOmc);

  // Build the curve points: all test points + peak, sorted by X
  const curveControlPoints = validPoints.map((p) => ({ ...p }));
  if (hasPeak) {
    const existingNear = curveControlPoints.find((p) => Math.abs(p.x - peakOmc) < 0.25);
    if (!existingNear) {
      curveControlPoints.push({
        x: peakOmc,
        y: peakMdd,
        isPeak: true,
        determinationNo: 'Peak',
      });
    }
  }
  curveControlPoints.sort((a, b) => a.x - b.x);

  // Convert to plot pixels
  const pixelPts = curveControlPoints.map((p) => ({
    x: getX(p.x),
    y: getY(p.y),
  }));

  // Generate smooth Catmull-Rom cubic Bezier path strictly passing through points
  let curvePathD = '';
  if (pixelPts.length === 2) {
    curvePathD = `M ${pixelPts[0].x} ${pixelPts[0].y} L ${pixelPts[1].x} ${pixelPts[1].y}`;
  } else if (pixelPts.length > 2) {
    curvePathD = `M ${pixelPts[0].x.toFixed(1)} ${pixelPts[0].y.toFixed(1)}`;
    const tension = 0.55;
    for (let i = 0; i < pixelPts.length - 1; i++) {
      const p0 = i > 0 ? pixelPts[i - 1] : pixelPts[0];
      const p1 = pixelPts[i];
      const p2 = pixelPts[i + 1];
      const p3 = i + 2 < pixelPts.length ? pixelPts[i + 2] : p2;

      const cp1x = Math.max(padding.left, Math.min(width - padding.right, p1.x + (p2.x - p0.x) / (6 * tension)));
      const cp1y = Math.max(padding.top, Math.min(height - padding.bottom, p1.y + (p2.y - p0.y) / (6 * tension)));

      const cp2x = Math.max(padding.left, Math.min(width - padding.right, p2.x - (p3.x - p1.x) / (6 * tension)));
      const cp2y = Math.max(padding.top, Math.min(height - padding.bottom, p2.y - (p3.y - p1.y) / (6 * tension)));

      curvePathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }

  // Ticks
  const numTicksX = Math.min(rangeX, 8);
  const xTicks = [];
  for (let i = 0; i <= numTicksX; i++) {
    const val = minX + (i / numTicksX) * rangeX;
    xTicks.push(Number(val.toFixed(1)));
  }

  const numTicksY = 5;
  const yTicks = [];
  for (let i = 0; i <= numTicksY; i++) {
    const val = minY + (i / numTicksY) * rangeY;
    yTicks.push(Number(val.toFixed(2)));
  }

  // Peak projection coordinates
  const peakPixelX = hasPeak ? getX(peakOmc) : null;
  const peakPixelY = hasPeak ? getY(peakMdd) : null;

  return (
    <div className="w-full border border-gray-200 dark:border-border rounded-xl bg-white dark:bg-card p-3 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-1 px-1">
        <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <LineChart className="w-3.5 h-3.5 text-primary" /> Compaction Curve
        </h5>
        {hasPeak && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-primary font-bold">
              MDD: {peakMdd.toFixed(2)} g/cc
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              OMC: {peakOmc.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[290px] select-none font-sans overflow-hidden"
      >
        <defs>
          <clipPath id={`clip-${clipId}`}>
            <rect
              x={padding.left}
              y={padding.top}
              width={plotWidth}
              height={plotHeight}
            />
          </clipPath>
        </defs>

        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((yVal, i) => {
          const py = getY(yVal);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={py}
                x2={width - padding.right}
                y2={py}
                stroke={isDark ? '#334155' : '#f1f5f9'}
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={py + 3}
                textAnchor="end"
                className="text-[10px] fill-gray-400 dark:fill-gray-500 font-mono"
              >
                {yVal.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Vertical grid lines & X labels */}
        {xTicks.map((xVal, i) => {
          const px = getX(xVal);
          return (
            <g key={i}>
              <line
                x1={px}
                y1={padding.top}
                x2={px}
                y2={height - padding.bottom}
                stroke={isDark ? '#334155' : '#f1f5f9'}
                strokeWidth="1"
              />
              <text
                x={px}
                y={height - padding.bottom + 15}
                textAnchor="middle"
                className="text-[10px] fill-gray-400 dark:fill-gray-500 font-mono"
              >
                {xVal}
              </text>
            </g>
          );
        })}

        {/* Axis Lines */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={isDark ? '#64748b' : '#cbd5e1'}
          strokeWidth="1.5"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={isDark ? '#64748b' : '#cbd5e1'}
          strokeWidth="1.5"
        />

        {/* Axis Titles */}
        <text
          x={padding.left + plotWidth / 2}
          y={height - 8}
          textAnchor="middle"
          className="text-[11px] font-bold fill-gray-600 dark:fill-gray-300"
        >
          Moisture Content (%) →
        </text>
        <text
          x={-(padding.top + plotHeight / 2)}
          y={15}
          transform="rotate(-90)"
          textAnchor="middle"
          className="text-[11px] font-bold fill-gray-600 dark:fill-gray-300"
        >
          Dry Density (g/cc) →
        </text>

        {/* CLIPPED PLOT CONTENT (Curve and Peak Projections) */}
        <g clipPath={`url(#clip-${clipId})`}>
          {/* Curve Line */}
          {curvePathD && (
            <path
              d={curvePathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Peak Projection Lines */}
          {hasPeak && (
            <g>
              {/* Horizontal line to Y-axis */}
              <line
                x1={padding.left}
                y1={peakPixelY}
                x2={peakPixelX}
                y2={peakPixelY}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {/* Vertical line to X-axis */}
              <line
                x1={peakPixelX}
                y1={peakPixelY}
                x2={peakPixelX}
                y2={height - padding.bottom}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </g>
          )}
        </g>

        {/* Peak Marker Circle */}
        {hasPeak && (
          <circle
            cx={peakPixelX}
            cy={peakPixelY}
            r="6"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth="2"
            className="drop-shadow-md"
          />
        )}

        {/* Data Points */}
        {validPoints.map((pt, i) => {
          const px = getX(pt.x);
          const py = getY(pt.y);
          return (
            <g key={i}>
              <circle
                cx={px}
                cy={py}
                r="4.5"
                fill="hsl(var(--primary))"
                stroke="#ffffff"
                strokeWidth="2"
                className="hover:r-6 cursor-pointer transition-all"
              />
              <text
                x={px}
                y={py - 8}
                textAnchor="middle"
                className="text-[9px] font-semibold fill-gray-600 dark:fill-gray-300"
              >
                T{pt.determinationNo}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
