import React, { useId } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { LineChart, Sparkles } from 'lucide-react';

/**
 * High-fidelity SVG Load-Penetration Curve for Lab CBR Test (IS 2720 Part 16)
 * Plots Penetration (mm) vs Load (kg), with zero-offset correction tangent & shifted points.
 */
export default function LabCbrCurveChart({
  validPoints = [],
  tangentLine = null,
  isCorrectionApplied = false,
  zeroOffset = 0,
  shiftedPen25 = 2.5,
  shiftedPen50 = 5.0,
  load25 = 0,
  load50 = 0,
  width = 540,
  height = 320,
}) {
  const { isDark } = useTheme();
  const clipId = useId();

  if (!validPoints || validPoints.length < 2) {
    return (
      <div className="h-72 border border-dashed border-gray-200 dark:border-border rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-muted-foreground p-4 bg-gray-50/50 dark:bg-muted/20">
        <LineChart className="w-10 h-10 mb-2 opacity-40 text-primary" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Load vs. Penetration Curve (IS:2720)
        </p>
        <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1 text-center max-w-xs">
          Enter at least 2 load readings to generate the CBR curve and zero-correction tangent.
        </p>
      </div>
    );
  }

  const padding = { top: 35, right: 35, bottom: 50, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // X range: 0 to max penetration (at least 14 mm to comfortably fit 12.5mm + offset)
  const minX = 0;
  const maxX = Math.max(14, ...validPoints.map((p) => p.x), isCorrectionApplied ? shiftedPen50 + 2 : 14);
  const rangeX = maxX - minX;

  // Y range: 0 to max load + 15% headroom
  const maxYValue = Math.max(...validPoints.map((p) => p.y), load25, load50, 100);
  const minY = 0;
  const maxY = Math.ceil((maxYValue * 1.15) / 100) * 100;
  const rangeY = maxY - minY || 100;

  const getX = (val) => {
    const clamped = Math.max(minX, Math.min(maxX, val));
    return padding.left + (clamped - minX) / rangeX * plotWidth;
  };

  const getY = (val) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return height - padding.bottom - (clamped - minY) / rangeY * plotHeight;
  };

  // Build smooth curve path (Catmull-Rom / monotonic cubic bezier through validPoints)
  const buildSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${getX(pts[0].x)} ${getY(pts[0].y)}`;

    let path = `M ${getX(pts[0].x)} ${getY(pts[0].y)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${getX(cp1x)} ${getY(cp1y)}, ${getX(cp2x)} ${getY(cp2y)}, ${getX(p2.x)} ${getY(p2.y)}`;
    }
    return path;
  };

  const curvePath = buildSmoothPath(validPoints);

  // X-axis ticks (every 2 mm)
  const xTicks = [];
  for (let x = 0; x <= maxX; x += 2) {
    xTicks.push(x);
  }

  // Y-axis ticks (4-5 nice round steps)
  const yTicks = [];
  const yStep = maxY > 800 ? 200 : maxY > 400 ? 100 : 50;
  for (let y = 0; y <= maxY; y += yStep) {
    yTicks.push(y);
  }

  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-3 shadow-sm relative overflow-hidden">
      {/* Top Header & Legend */}
      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800 dark:text-foreground flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            Load-Penetration Curve
          </span>
          {isCorrectionApplied && zeroOffset > 0 && (
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Offset a = {zeroOffset} mm
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-blue-600 inline-block"></span> Test Curve
          </span>
          {isCorrectionApplied && zeroOffset > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-500 border-b border-dashed inline-block"></span> Tangent
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span> 2.5mm / 5.0mm
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        style={{ maxHeight: '340px' }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={padding.left}
              y={padding.top}
              width={plotWidth}
              height={plotHeight}
            />
          </clipPath>
          <linearGradient id="cbrAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Plot Background */}
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          className="fill-gray-50/50 dark:fill-muted/10"
        />

        {/* Horizontal Gridlines */}
        {yTicks.map((yVal) => {
          const yPos = getY(yVal);
          return (
            <g key={`y-${yVal}`}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke={isDark ? '#374151' : '#e5e7eb'}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={yPos + 3.5}
                textAnchor="end"
                className="text-[10px] fill-gray-500 dark:fill-gray-400 font-mono"
              >
                {yVal}
              </text>
            </g>
          );
        })}

        {/* Vertical Gridlines */}
        {xTicks.map((xVal) => {
          const xPos = getX(xVal);
          return (
            <g key={`x-${xVal}`}>
              <line
                x1={xPos}
                y1={padding.top}
                x2={xPos}
                y2={height - padding.bottom}
                stroke={isDark ? '#374151' : '#e5e7eb'}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={xPos}
                y={height - padding.bottom + 15}
                textAnchor="middle"
                className="text-[10px] fill-gray-500 dark:fill-gray-400 font-mono"
              >
                {xVal}
              </text>
            </g>
          );
        })}

        {/* Main Axes */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={isDark ? '#6b7280' : '#9ca3af'}
          strokeWidth="1.5"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={isDark ? '#6b7280' : '#9ca3af'}
          strokeWidth="1.5"
        />

        {/* Axis Labels */}
        <text
          x={padding.left + plotWidth / 2}
          y={height - 12}
          textAnchor="middle"
          className="text-[11px] font-bold fill-gray-700 dark:fill-gray-300"
        >
          Penetration (mm)
        </text>
        <text
          x={-height / 2 + 5}
          y={15}
          transform="rotate(-90)"
          textAnchor="middle"
          className="text-[11px] font-bold fill-gray-700 dark:fill-gray-300"
        >
          Corrected Load (kg)
        </text>

        {/* Zero Correction: Tangent Line (IS 2720 Part 16) */}
        {isCorrectionApplied && tangentLine && zeroOffset > 0 && (
          <g clipPath={`url(#${clipId})`}>
            <line
              x1={getX(tangentLine.point1.x)}
              y1={getY(tangentLine.point1.y)}
              x2={getX(tangentLine.point2.x)}
              y2={getY(tangentLine.point2.y)}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
          </g>
        )}

        {/* Corrected Origin 0' & Zero offset 'a' label */}
        {isCorrectionApplied && zeroOffset > 0 && (
          <g>
            <circle
              cx={getX(zeroOffset)}
              cy={getY(0)}
              r="4"
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <text
              x={getX(zeroOffset)}
              y={getY(0) - 8}
              textAnchor="middle"
              className="text-[10px] font-bold fill-amber-600 dark:fill-amber-400"
            >
              0' (a={zeroOffset}mm)
            </text>
            {/* Bracket/indicator from 0 to a */}
            <line
              x1={getX(0)}
              y1={getY(0) + 4}
              x2={getX(zeroOffset)}
              y2={getY(0) + 4}
              stroke="#f59e0b"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Main Test Curve */}
        <g clipPath={`url(#${clipId})`}>
          <path
            d={`${curvePath} L ${getX(validPoints[validPoints.length - 1].x)} ${getY(0)} L ${getX(validPoints[0].x)} ${getY(0)} Z`}
            fill="url(#cbrAreaGrad)"
          />
          <path
            d={curvePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Shifted / Target Reference Lines (2.5mm and 5.0mm) */}
        {/* 2.5 mm target */}
        <g>
          <line
            x1={getX(shiftedPen25)}
            y1={getY(load25)}
            x2={getX(shiftedPen25)}
            y2={height - padding.bottom}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <line
            x1={padding.left}
            y1={getY(load25)}
            x2={getX(shiftedPen25)}
            y2={getY(load25)}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <circle
            cx={getX(shiftedPen25)}
            cy={getY(load25)}
            r="4.5"
            fill="#10b981"
            stroke="#fff"
            strokeWidth="1.5"
          />
          <text
            x={getX(shiftedPen25) + 6}
            y={getY(load25) - 6}
            className="text-[10px] font-bold fill-emerald-600 dark:fill-emerald-400"
          >
            2.5mm ({load25 ? Math.round(load25 * 10) / 10 : 0} kg)
          </text>
        </g>

        {/* 5.0 mm target */}
        <g>
          <line
            x1={getX(shiftedPen50)}
            y1={getY(load50)}
            x2={getX(shiftedPen50)}
            y2={height - padding.bottom}
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <line
            x1={padding.left}
            y1={getY(load50)}
            x2={getX(shiftedPen50)}
            y2={getY(load50)}
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <circle
            cx={getX(shiftedPen50)}
            cy={getY(load50)}
            r="4.5"
            fill="#8b5cf6"
            stroke="#fff"
            strokeWidth="1.5"
          />
          <text
            x={getX(shiftedPen50) + 6}
            y={getY(load50) - 6}
            className="text-[10px] font-bold fill-purple-600 dark:fill-purple-400"
          >
            5.0mm ({load50 ? Math.round(load50 * 10) / 10 : 0} kg)
          </text>
        </g>

        {/* Uncorrected 2.5 & 5.0 markers if correction shifted */}
        {isCorrectionApplied && zeroOffset > 0 && (
          <>
            <line
              x1={getX(2.5)}
              y1={padding.top}
              x2={getX(2.5)}
              y2={height - padding.bottom}
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={getX(2.5)}
              y={padding.top - 5}
              textAnchor="middle"
              className="text-[9px] fill-gray-400 dark:fill-gray-500 font-mono"
            >
              Raw 2.5
            </text>

            <line
              x1={getX(5.0)}
              y1={padding.top}
              x2={getX(5.0)}
              y2={height - padding.bottom}
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={getX(5.0)}
              y={padding.top - 5}
              textAnchor="middle"
              className="text-[9px] fill-gray-400 dark:fill-gray-500 font-mono"
            >
              Raw 5.0
            </text>
          </>
        )}

        {/* Measured Observation Points */}
        {validPoints.map((pt, idx) => (
          <g key={`pt-${idx}`} className="group cursor-pointer">
            <circle
              cx={getX(pt.x)}
              cy={getY(pt.y)}
              r="3.5"
              fill="#2563eb"
              stroke="#fff"
              strokeWidth="1.5"
              className="transition-transform group-hover:scale-125"
            />
            <title>{`Penetration: ${pt.x} mm | Load: ${pt.y.toFixed(2)} kg (${pt.kn || (pt.y / 101.971621).toFixed(2)} kN)`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
