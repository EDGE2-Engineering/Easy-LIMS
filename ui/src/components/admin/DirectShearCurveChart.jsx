import React, { useId } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { TrendingUp } from 'lucide-react';

/**
 * Direct Shear Failure Envelope Chart (Normal Stress vs Shear Stress)
 * Plots experimental failure points and best-fit Coulomb failure envelope:
 * τ = C + σ * tan(φ)
 * Per IS: 2720 (Part 13)
 */
export default function DirectShearCurveChart({
  points = [],
  interceptC = null,
  slopeTanPhi = null,
  cValue = '',
  phiValue = '',
  width = 540,
  height = 300,
}) {
  const { isDark } = useTheme();
  const clipId = useId();

  const validPoints = (points || []).filter(
    (p) =>
      p &&
      !isNaN(parseFloat(p.normalStress)) &&
      !isNaN(parseFloat(p.shearStress)) &&
      parseFloat(p.shearStress) > 0
  );

  if (validPoints.length === 0) {
    return (
      <div className="h-64 border border-dashed border-gray-200 dark:border-border rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-muted-foreground p-4 bg-gray-50/50 dark:bg-muted/20">
        <TrendingUp className="w-8 h-8 mb-2 opacity-40 text-primary" />
        <p className="text-sm font-medium">Failure Envelope Graph</p>
        <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">
          Enter proving ring readings to calculate shear failure stresses and plot τ vs σ
        </p>
      </div>
    );
  }

  const padding = { top: 35, right: 35, bottom: 45, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // X range: Normal Stress (kg/cm²), starting from 0
  const maxXValue = Math.max(
    2.0,
    ...validPoints.map((p) => parseFloat(p.normalStress)) + 0.3
  );
  const minX = 0;
  const maxX = Math.ceil(maxXValue * 2) / 2; // snap to 0.5 increments
  const rangeX = maxX - minX || 2.0;

  // Y range: Shear Stress (kg/cm²), starting from 0
  const maxYValue = Math.max(
    1.4,
    ...validPoints.map((p) => parseFloat(p.shearStress)) + 0.3
  );
  const minY = 0;
  const maxY = Math.ceil(maxYValue * 5) / 5; // snap to 0.2 increments
  const rangeY = maxY - minY || 1.5;

  const getX = (val) => {
    const clamped = Math.max(minX, Math.min(maxX, val));
    return padding.left + ((clamped - minX) / rangeX) * plotWidth;
  };

  const getY = (val) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padding.top + plotHeight - ((clamped - minY) / rangeY) * plotHeight;
  };

  // Generate grid ticks
  const xTicks = [];
  const xStep = rangeX <= 2 ? 0.25 : 0.5;
  for (let x = 0; x <= maxX + 1e-6; x += xStep) {
    xTicks.push(Number(x.toFixed(2)));
  }

  const yTicks = [];
  const yStep = rangeY <= 1.5 ? 0.2 : 0.4;
  for (let y = 0; y <= maxY + 1e-6; y += yStep) {
    yTicks.push(Number(y.toFixed(2)));
  }

  // Regression line points
  const cNum = interceptC !== null && !isNaN(parseFloat(interceptC)) ? parseFloat(interceptC) : null;
  const mNum = slopeTanPhi !== null && !isNaN(parseFloat(slopeTanPhi)) ? parseFloat(slopeTanPhi) : null;

  let lineX1 = 0;
  let lineY1 = 0;
  let lineX2 = maxX;
  let lineY2 = 0;

  if (cNum !== null && mNum !== null) {
    lineX1 = 0;
    lineY1 = cNum;
    lineX2 = maxX;
    lineY2 = cNum + mNum * maxX;
  }

  return (
    <div className="w-full flex flex-col items-center bg-white dark:bg-card p-4 rounded-xl border border-gray-100 dark:border-border shadow-sm">
      <div className="w-full flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
            Failure Envelope Graph (IS: 2720 Part 13)
          </span>
        </div>
        {cValue && phiValue && (
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
              c = {cValue} kg/cm²
            </span>
            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-semibold border border-indigo-200 dark:border-indigo-800">
              φ = {phiValue}°
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-2xl h-auto overflow-visible select-none"
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
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Chart Background */}
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          fill={isDark ? '#111827' : '#fcfcfc'}
          rx="4"
        />

        {/* X Grid Lines */}
        {xTicks.map((xVal) => {
          const px = getX(xVal);
          return (
            <g key={`x-${xVal}`}>
              <line
                x1={px}
                y1={padding.top}
                x2={px}
                y2={padding.top + plotHeight}
                stroke={isDark ? '#374151' : '#e5e7eb'}
                strokeDasharray={xVal === 0 ? '' : '3,3'}
                strokeWidth={xVal === 0 ? 1.5 : 1}
              />
              <text
                x={px}
                y={padding.top + plotHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill={isDark ? '#9ca3af' : '#6b7280'}
                fontFamily="sans-serif"
              >
                {xVal.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Y Grid Lines */}
        {yTicks.map((yVal) => {
          const py = getY(yVal);
          return (
            <g key={`y-${yVal}`}>
              <line
                x1={padding.left}
                y1={py}
                x2={padding.left + plotWidth}
                y2={py}
                stroke={isDark ? '#374151' : '#e5e7eb'}
                strokeDasharray={yVal === 0 ? '' : '3,3'}
                strokeWidth={yVal === 0 ? 1.5 : 1}
              />
              <text
                x={padding.left - 8}
                y={py + 3}
                textAnchor="end"
                fontSize="10"
                fill={isDark ? '#9ca3af' : '#6b7280'}
                fontFamily="sans-serif"
              >
                {yVal.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Axes Labels */}
        <text
          x={padding.left + plotWidth / 2}
          y={height - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={isDark ? '#e5e7eb' : '#374151'}
          fontFamily="sans-serif"
        >
          Normal Stress, σ (kg/cm²)
        </text>

        <text
          transform={`rotate(-90)`}
          x={-(padding.top + plotHeight / 2)}
          y={15}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={isDark ? '#e5e7eb' : '#374151'}
          fontFamily="sans-serif"
        >
          Shear Stress at Failure, τ (kg/cm²)
        </text>

        {/* Regression Line */}
        {cNum !== null && mNum !== null && (
          <g clipPath={`url(#${clipId})`}>
            <line
              x1={getX(lineX1)}
              y1={getY(lineY1)}
              x2={getX(lineX2)}
              y2={getY(lineY2)}
              stroke="#2563eb"
              strokeWidth="2.5"
            />
            {/* Shaded Area under regression line */}
            <polygon
              points={`
                ${getX(lineX1)},${getY(lineY1)}
                ${getX(lineX2)},${getY(lineY2)}
                ${getX(lineX2)},${getY(0)}
                ${getX(lineX1)},${getY(0)}
              `}
              fill="url(#areaGradient)"
            />
          </g>
        )}

        {/* Intercept Marker on Y Axis */}
        {cNum !== null && cNum > 0 && (
          <g>
            <circle
              cx={getX(0)}
              cy={getY(cNum)}
              r="4"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <line
              x1={getX(0)}
              y1={getY(cNum)}
              x2={getX(0) + 18}
              y2={getY(cNum)}
              stroke="#10b981"
              strokeWidth="1.2"
              strokeDasharray="2,2"
            />
            <text
              x={getX(0) + 22}
              y={getY(cNum) + 3}
              fontSize="9"
              fontWeight="bold"
              fill="#059669"
            >
              C = {cNum.toFixed(2)}
            </text>
          </g>
        )}

        {/* Experimental Data Points */}
        {validPoints.map((pt, idx) => {
          const px = getX(parseFloat(pt.normalStress));
          const py = getY(parseFloat(pt.shearStress));
          return (
            <g key={`pt-${idx}`}>
              <circle
                cx={px}
                cy={py}
                r="6"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-transform hover:scale-125"
              />
              <rect
                x={px - 28}
                y={py - 22}
                width="56"
                height="16"
                rx="3"
                fill={isDark ? '#1f2937' : '#ffffff'}
                stroke={isDark ? '#374151' : '#e5e7eb'}
                strokeWidth="1"
                className="shadow-sm"
              />
              <text
                x={px}
                y={py - 11}
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill={isDark ? '#f3f4f6' : '#1f2937'}
              >
                ({parseFloat(pt.normalStress).toFixed(1)}, {parseFloat(pt.shearStress).toFixed(2)})
              </text>
            </g>
          );
        })}
      </svg>

      <div className="w-full flex justify-between items-center text-[11px] text-gray-500 dark:text-muted-foreground mt-2 pt-2 border-t border-gray-100 dark:border-border">
        <span>Failure Criterion: τ = C + σ·tan(φ)</span>
        <span>IS: 2720 (Part 13) Direct Shear Test</span>
      </div>
    </div>
  );
}
