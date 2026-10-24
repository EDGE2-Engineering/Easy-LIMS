import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  RotateCcw,
  Check,
  AlertTriangle,
  Info,
  Sparkles,
  Layers,
  LineChart,
  HelpCircle,
} from 'lucide-react';
import {
  ATTERBERG_METHODS,
  calculateAtterbergLimits,
  calculateCasagrandeLiquidLimit,
  calculatePlasticLimit,
  calculateConePenetrationLiquidLimit,
  DEFAULT_CASAGRANDE_LL_TRIALS,
  DEFAULT_CASAGRANDE_PL_TRIALS,
  DEFAULT_CONE_LL_TRIALS,
  SAMPLE_CASAGRANDE_DATA,
  SAMPLE_CONE_PENETRATION_DATA,
  isPresent,
} from '@/utils/atterbergCalculation';

/**
 * Semi-log Flow Curve SVG Graph for Casagrande Method
 * X-axis: Logarithmic (No. of Blows, e.g. 10 to 100)
 * Y-axis: Linear (Water Content, %)
 */
function CasagrandeFlowCurve({ validPoints, regression, targetLL, onTargetChange }) {
  const { isDark } = useTheme();
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!validPoints || validPoints.length < 2 || !regression) {
    return (
      <div className="h-64 border border-dashed border-gray-200 dark:border-border rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-muted-foreground p-4 bg-gray-50/50 dark:bg-muted/20">
        <LineChart className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm font-medium">Flow Curve (Semi-Logarithmic)</p>
        <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">Enter at least 2 valid trials to generate the curve</p>
      </div>
    );
  }

  const width = 500;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const xMin = 10;
  const xMax = 100;
  const logMin = Math.log10(xMin);
  const logMax = Math.log10(xMax);

  // Y-axis range based on points & LL at 25 blows
  const allY = validPoints.map((p) => p.y);
  if (targetLL !== null && !isNaN(targetLL)) allY.push(targetLL);

  const minY = Math.floor(Math.min(...allY) - 2);
  const maxY = Math.ceil(Math.max(...allY) + 2);
  const rangeY = Math.max(maxY - minY, 5);

  const getX = (blows) => {
    const logVal = Math.log10(Math.max(1, blows));
    const ratio = (logVal - logMin) / (logMax - logMin);
    return padding.left + ratio * (width - padding.left - padding.right);
  };

  const getY = (yVal) => {
    const ratio = (yVal - minY) / rangeY;
    return height - padding.bottom - ratio * (height - padding.top - padding.bottom);
  };

  // Trendline points across xMin to xMax
  const getXFromLog = (logVal) => {
    const ratio = (logVal - logMin) / (logMax - logMin);
    return padding.left + ratio * (width - padding.left - padding.right);
  };

  // Trendline points across xMin to xMax clamped to [minY, maxY]
  let logX1 = logMin;
  let y1 = regression.slope * logX1 + regression.intercept;
  let logX2 = logMax;
  let y2 = regression.slope * logX2 + regression.intercept;

  if (regression.slope !== 0) {
    if (y1 > maxY) {
      logX1 = (maxY - regression.intercept) / regression.slope;
      y1 = maxY;
    } else if (y1 < minY) {
      logX1 = (minY - regression.intercept) / regression.slope;
      y1 = minY;
    }
    if (y2 > maxY) {
      logX2 = (maxY - regression.intercept) / regression.slope;
      y2 = maxY;
    } else if (y2 < minY) {
      logX2 = (minY - regression.intercept) / regression.slope;
      y2 = minY;
    }
  }
  logX1 = Math.max(logMin, Math.min(logMax, logX1));
  logX2 = Math.max(logMin, Math.min(logMax, logX2));

  // Intersect at 25 blows
  const x25 = getX(25);
  const llVal = targetLL !== null && !isNaN(targetLL) ? targetLL : regression.slope * Math.log10(25) + regression.intercept;
  const y25 = getY(llVal);

  // Y-axis tick values (5 ticks)
  const yTicks = [];
  const tickStep = rangeY <= 10 ? 2 : Math.ceil(rangeY / 5);
  for (let y = Math.ceil(minY / tickStep) * tickStep; y <= maxY; y += tickStep) {
    yTicks.push(y);
  }

  // Major log ticks for blows
  const logTicks = [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 100];

  return (
    <div className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-xl p-3 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700 dark:text-foreground uppercase tracking-wider">
            Flow Curve (Semi-Logarithmic)
          </span>
          <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/5 dark:bg-primary/20 border-primary/20 dark:border-primary/40">
            IS:2720 (Part 5)
          </Badge>
        </div>
        <div className="text-[11px] text-gray-500 dark:text-muted-foreground font-mono">
          y = {regression.slope.toFixed(2)} log₁₀(N) + {regression.intercept.toFixed(1)} (R²={regression.rSquared})
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-hidden select-none">
        <defs>
          <clipPath id="casagrande-plot-clip">
            <rect
              x={padding.left}
              y={padding.top}
              width={width - padding.left - padding.right}
              height={height - padding.top - padding.bottom}
            />
          </clipPath>
        </defs>
        {/* Background grid */}
        {yTicks.map((yVal) => {
          const yPos = getY(yVal);
          return (
            <g key={`y-${yVal}`}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke={isDark ? '#26362f' : '#f1f5f9'}
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={yPos + 3}
                textAnchor="end"
                className="text-[9px] fill-gray-400 font-mono"
              >
                {yVal}%
              </text>
            </g>
          );
        })}

        {logTicks.map((b) => {
          const xPos = getX(b);
          const isMajor = b === 10 || b === 25 || b === 50 || b === 100;
          return (
            <g key={`x-${b}`}>
              <line
                x1={xPos}
                y1={padding.top}
                x2={xPos}
                y2={height - padding.bottom}
                stroke={isMajor ? (isDark ? '#33473e' : '#e2e8f0') : (isDark ? '#1a2721' : '#f8fafc')}
                strokeWidth={isMajor ? '1' : '0.5'}
                strokeDasharray={b === 25 ? '2,2' : undefined}
              />
              {isMajor && (
                <text
                  x={xPos}
                  y={height - padding.bottom + 14}
                  textAnchor="middle"
                  className={`text-[9px] font-mono ${b === 25 ? 'fill-primary font-bold' : 'fill-gray-400'}`}
                >
                  {b}
                </text>
              )}
            </g>
          );
        })}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={isDark ? '#4b6357' : '#94a3b8'}
          strokeWidth="1.2"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={isDark ? '#4b6357' : '#94a3b8'}
          strokeWidth="1.2"
        />

        {/* Axis Labels */}
        <text
          x={padding.left + (width - padding.left - padding.right) / 2}
          y={height - 6}
          textAnchor="middle"
          className="text-[10px] fill-gray-500 font-medium"
        >
          Number of Blows (N) — Log Scale
        </text>
        <text
          x={-((height - padding.top - padding.bottom) / 2 + padding.top)}
          y={15}
          transform="rotate(-90)"
          textAnchor="middle"
          className="text-[10px] fill-gray-500 font-medium"
        >
          Water Content (%)
        </text>

        {/* Regression Trend Line */}
        <g clipPath="url(#casagrande-plot-clip)">
          <line
            x1={getXFromLog(logX1)}
            y1={getY(y1)}
            x2={getXFromLog(logX2)}
            y2={getY(y2)}
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
        </g>

        {/* Intersect Crosshair at 25 Blows */}
        <g>
          <line
            x1={x25}
            y1={height - padding.bottom}
            x2={x25}
            y2={y25}
            stroke="#e11d48"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <line
            x1={padding.left}
            y1={y25}
            x2={x25}
            y2={y25}
            stroke="#e11d48"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          {/* Target point */}
          <circle cx={x25} cy={y25} r="4.5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
          {/* Annotation tag */}
          <rect
            x={Math.min(x25 + 8, width - padding.right - 90)}
            y={Math.max(y25 - 24, padding.top)}
            width="85"
            height="20"
            rx="4"
            fill="#e11d48"
          />
          <text
            x={Math.min(x25 + 8, width - padding.right - 90) + 42}
            y={Math.max(y25 - 24, padding.top) + 13}
            textAnchor="middle"
            className="text-[10px] fill-white font-bold font-mono"
          >
            LL: {targetLL !== null && !isNaN(targetLL) ? (Number.isInteger(targetLL) ? targetLL : targetLL.toFixed(1)) : llVal.toFixed(1)}% @ 25N
          </text>
        </g>

        {/* Data points */}
        {validPoints.map((pt, idx) => {
          const cx = getX(pt.blows);
          const cy = getY(pt.y);
          const isHovered = hoveredPoint === idx;
          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(idx)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Fixed-size hit area to prevent any hover jitter */}
              <circle cx={cx} cy={cy} r="16" fill="#000" opacity="0" style={{ pointerEvents: 'all' }} />
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 4.5}
                fill={isHovered ? '#1d4ed8' : '#2563eb'}
                stroke="#ffffff"
                strokeWidth={isHovered ? 2 : 1.5}
                className="transition-all duration-150 pointer-events-none"
              />
              {isHovered && (
                <g className="pointer-events-none">
                  <rect
                    x={Math.max(padding.left, Math.min(cx - 48, width - padding.right - 96))}
                    y={Math.max(padding.top, cy - 28)}
                    width="96"
                    height="20"
                    rx="4"
                    fill="#1e293b"
                    opacity="0.92"
                  />
                  <text
                    x={Math.max(padding.left, Math.min(cx - 48, width - padding.right - 96)) + 48}
                    y={Math.max(padding.top, cy - 28) + 13}
                    textAnchor="middle"
                    className="text-[10px] fill-white font-mono font-bold"
                  >
                    N={pt.blows}, w={pt.y.toFixed(2)}%
                  </text>
                </g>
              )}
              <title>Trial {idx + 1}: {pt.blows} blows, {pt.y.toFixed(2)}% water content</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Linear Flow Curve SVG Graph for Cone Penetration Method
 * X-axis: Penetration (mm, linear scale, e.g. 10 to 30 mm)
 * Y-axis: Water Content (%, linear scale)
 */
function ConeFlowCurve({ validPoints, regression, targetLL }) {
  const { isDark } = useTheme();
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!validPoints || validPoints.length < 2 || !regression) {
    return (
      <div className="h-64 border border-dashed border-gray-200 dark:border-border rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-muted-foreground p-4 bg-gray-50/50 dark:bg-muted/20">
        <LineChart className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm font-medium">Flow Curve (Linear Plot)</p>
        <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">Enter at least 2 valid trials to generate the curve</p>
      </div>
    );
  }

  const width = 500;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const xMin = 10;
  const xMax = 32;
  const rangeX = xMax - xMin;

  const allY = validPoints.map((p) => p.y);
  if (targetLL !== null && !isNaN(targetLL)) allY.push(targetLL);

  const minY = Math.floor(Math.min(...allY) - 2);
  const maxY = Math.ceil(Math.max(...allY) + 2);
  const rangeY = Math.max(maxY - minY, 5);

  const getX = (pen) => {
    const ratio = (pen - xMin) / rangeX;
    return padding.left + ratio * (width - padding.left - padding.right);
  };

  const getY = (yVal) => {
    const ratio = (yVal - minY) / rangeY;
    return height - padding.bottom - ratio * (height - padding.top - padding.bottom);
  };

  // Trendline points across xMin to xMax clamped to [minY, maxY]
  let x1Val = xMin;
  let y1 = regression.slope * x1Val + regression.intercept;
  let x2Val = xMax;
  let y2 = regression.slope * x2Val + regression.intercept;

  if (regression.slope !== 0) {
    if (y1 > maxY) {
      x1Val = (maxY - regression.intercept) / regression.slope;
      y1 = maxY;
    } else if (y1 < minY) {
      x1Val = (minY - regression.intercept) / regression.slope;
      y1 = minY;
    }
    if (y2 > maxY) {
      x2Val = (maxY - regression.intercept) / regression.slope;
      y2 = maxY;
    } else if (y2 < minY) {
      x2Val = (minY - regression.intercept) / regression.slope;
      y2 = minY;
    }
  }
  x1Val = Math.max(xMin, Math.min(xMax, x1Val));
  x2Val = Math.max(xMin, Math.min(xMax, x2Val));

  // 20 mm intersection
  const x20 = getX(20.0);
  const llVal = targetLL !== null && !isNaN(targetLL) ? targetLL : regression.slope * 20.0 + regression.intercept;
  const y20 = getY(llVal);

  const yTicks = [];
  const tickStep = rangeY <= 10 ? 2 : Math.ceil(rangeY / 5);
  for (let y = Math.ceil(minY / tickStep) * tickStep; y <= maxY; y += tickStep) {
    yTicks.push(y);
  }

  const xTicks = [10, 15, 20, 25, 30];

  return (
    <div className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-xl p-3 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700 dark:text-foreground uppercase tracking-wider">
            Flow Curve (Linear Plot)
          </span>
          <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60">
            IS:2720 (Part 5)
          </Badge>
        </div>
        <div className="text-[11px] text-gray-500 dark:text-muted-foreground font-mono">
          y = {regression.slope.toFixed(3)} x + {regression.intercept.toFixed(1)} (R²={regression.rSquared})
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-hidden select-none">
        <defs>
          <clipPath id="cone-plot-clip">
            <rect
              x={padding.left}
              y={padding.top}
              width={width - padding.left - padding.right}
              height={height - padding.top - padding.bottom}
            />
          </clipPath>
        </defs>
        {/* Y Grid */}
        {yTicks.map((yVal) => {
          const yPos = getY(yVal);
          return (
            <g key={`y-${yVal}`}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke={isDark ? '#26362f' : '#f1f5f9'}
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={yPos + 3}
                textAnchor="end"
                className="text-[9px] fill-gray-400 font-mono"
              >
                {yVal}%
              </text>
            </g>
          );
        })}

        {/* X Grid */}
        {xTicks.map((xVal) => {
          const xPos = getX(xVal);
          return (
            <g key={`x-${xVal}`}>
              <line
                x1={xPos}
                y1={padding.top}
                x2={xPos}
                y2={height - padding.bottom}
                stroke={xVal === 20 ? (isDark ? '#33473e' : '#e2e8f0') : (isDark ? '#1a2721' : '#f8fafc')}
                strokeWidth="1"
                strokeDasharray={xVal === 20 ? '2,2' : undefined}
              />
              <text
                x={xPos}
                y={height - padding.bottom + 14}
                textAnchor="middle"
                className={`text-[9px] font-mono ${xVal === 20 ? 'fill-emerald-600 font-bold' : 'fill-gray-400'}`}
              >
                {xVal}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={isDark ? '#4b6357' : '#94a3b8'}
          strokeWidth="1.2"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={isDark ? '#4b6357' : '#94a3b8'}
          strokeWidth="1.2"
        />

        {/* Axis Labels */}
        <text
          x={padding.left + (width - padding.left - padding.right) / 2}
          y={height - 6}
          textAnchor="middle"
          className="text-[10px] fill-gray-500 font-medium"
        >
          Cone Penetration (mm) — Linear Scale
        </text>
        <text
          x={-((height - padding.top - padding.bottom) / 2 + padding.top)}
          y={15}
          transform="rotate(-90)"
          textAnchor="middle"
          className="text-[10px] fill-gray-500 font-medium"
        >
          Water Content (%)
        </text>

        {/* Trendline */}
        <g clipPath="url(#cone-plot-clip)">
          <line
            x1={getX(x1Val)}
            y1={getY(y1)}
            x2={getX(x2Val)}
            y2={getY(y2)}
            stroke="#059669"
            strokeWidth="2"
          />
        </g>

        {/* 20 mm crosshair */}
        <g>
          <line
            x1={x20}
            y1={height - padding.bottom}
            x2={x20}
            y2={y20}
            stroke="#dc2626"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <line
            x1={padding.left}
            y1={y20}
            x2={x20}
            y2={y20}
            stroke="#dc2626"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <circle cx={x20} cy={y20} r="4.5" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
          <rect
            x={Math.min(x20 + 8, width - padding.right - 90)}
            y={Math.max(y20 - 24, padding.top)}
            width="85"
            height="20"
            rx="4"
            fill="#dc2626"
          />
          <text
            x={Math.min(x20 + 8, width - padding.right - 90) + 42}
            y={Math.max(y20 - 24, padding.top) + 13}
            textAnchor="middle"
            className="text-[10px] fill-white font-bold font-mono"
          >
            LL: {targetLL !== null && !isNaN(targetLL) ? targetLL : (Math.round((llVal + Number.EPSILON) * 10) / 10).toFixed(1)}% @ 20mm
          </text>
        </g>

        {/* Data points */}
        {validPoints.map((pt, idx) => {
          const cx = getX(pt.penetration);
          const cy = getY(pt.y);
          const isHovered = hoveredPoint === idx;
          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(idx)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Fixed-size hit area to prevent any hover jitter */}
              <circle cx={cx} cy={cy} r="16" fill="#000" opacity="0" style={{ pointerEvents: 'all' }} />
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 4.5}
                fill={isHovered ? '#047857' : '#059669'}
                stroke="#ffffff"
                strokeWidth={isHovered ? 2 : 1.5}
                className="transition-all duration-150 pointer-events-none"
              />
              <text
                x={cx}
                y={cy - (isHovered ? 10 : 8)}
                textAnchor="middle"
                className={`text-[9px] font-mono font-bold pointer-events-none transition-colors duration-150 ${isHovered ? 'fill-emerald-800 dark:fill-emerald-300' : 'fill-gray-600 dark:fill-gray-400'}`}
              >
                {pt.roundedY}%
              </text>
              <title>Trial {idx + 1}: {pt.penetration} mm, {pt.y.toFixed(2)}% water content</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Main Atterberg Limits Modal Component
 */
export default function AtterbergLimitsModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-01',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [method, setMethod] = useState(ATTERBERG_METHODS.CASAGRANDE);
  const [casagrandeLLTrials, setCasagrandeLLTrials] = useState(DEFAULT_CASAGRANDE_LL_TRIALS);
  const [casagrandePLTrials, setCasagrandePLTrials] = useState(DEFAULT_CASAGRANDE_PL_TRIALS);
  const [coneTrials, setConeTrials] = useState(DEFAULT_CONE_LL_TRIALS);
  const [roundLiquidLimitToWhole, setRoundLiquidLimitToWhole] = useState(true);
  const [roundPlasticLimitToWhole, setRoundPlasticLimitToWhole] = useState(true);
  const [roundConeLLToFirstDecimal, setRoundConeLLToFirstDecimal] = useState(true);

  // Optional manual override of calculated values (if user reads graph slightly differently)
  const [overrideLL, setOverrideLL] = useState('');
  const [overridePL, setOverridePL] = useState('');

  // Hydrate initial data if already saved
  useEffect(() => {
    if (isOpen) {
      if (initialData?.method) {
        setMethod(initialData.method);
      } else {
        setMethod(ATTERBERG_METHODS.CASAGRANDE);
      }

      if (Array.isArray(initialData?.casagrandeLiquidTrials) && initialData.casagrandeLiquidTrials.length > 0) {
        setCasagrandeLLTrials(initialData.casagrandeLiquidTrials);
      } else {
        setCasagrandeLLTrials(DEFAULT_CASAGRANDE_LL_TRIALS);
      }

      if (Array.isArray(initialData?.casagrandePlasticTrials) && initialData.casagrandePlasticTrials.length > 0) {
        setCasagrandePLTrials(initialData.casagrandePlasticTrials);
      } else {
        setCasagrandePLTrials(DEFAULT_CASAGRANDE_PL_TRIALS);
      }

      if (Array.isArray(initialData?.coneTrials) && initialData.coneTrials.length > 0) {
        setConeTrials(initialData.coneTrials);
      } else {
        setConeTrials(DEFAULT_CONE_LL_TRIALS);
      }

      setOverrideLL(initialData?.manualLL || '');
      setOverridePL(initialData?.manualPL || '');
      setRoundLiquidLimitToWhole(
        initialData?.roundLiquidLimitToWhole !== undefined
          ? Boolean(initialData.roundLiquidLimitToWhole)
          : true
      );
      setRoundPlasticLimitToWhole(
        initialData?.roundPlasticLimitToWhole !== undefined
          ? Boolean(initialData.roundPlasticLimitToWhole)
          : true
      );
      setRoundConeLLToFirstDecimal(
        initialData?.roundConeLLToFirstDecimal !== undefined
          ? Boolean(initialData.roundConeLLToFirstDecimal)
          : true
      );
    }
  }, [isOpen, initialData]);

  // Real-time calculations
  const calc = useMemo(() => {
    return calculateAtterbergLimits({
      method,
      casagrandeLiquidTrials: casagrandeLLTrials,
      casagrandePlasticTrials: casagrandePLTrials,
      coneTrials,
      roundLiquidLimitToWhole,
      roundPlasticLimitToWhole,
      roundConeLLToFirstDecimal,
    });
  }, [method, casagrandeLLTrials, casagrandePLTrials, coneTrials, roundLiquidLimitToWhole, roundPlasticLimitToWhole, roundConeLLToFirstDecimal]);

  // Final values to display & apply (accounting for manual adjustments if specified)
  const effectiveLL = overrideLL !== '' ? overrideLL : calc.liquidLimit;
  const effectivePL = method === ATTERBERG_METHODS.CONE_PENETRATION ? 'NP' : overridePL !== '' ? overridePL : calc.plasticLimit;

  const effectivePI = useMemo(() => {
    if (method === ATTERBERG_METHODS.CONE_PENETRATION) return '-';
    if (!effectiveLL || !effectivePL || effectivePL === 'NP' || effectivePL === '-') return '-';
    const numLL = parseFloat(effectiveLL);
    const numPL = parseFloat(effectivePL);
    if (!isNaN(numLL) && !isNaN(numPL)) {
      const diff = numLL - numPL;
      return diff <= 0 ? '0' : (roundLiquidLimitToWhole || roundPlasticLimitToWhole) ? String(Math.round(diff)) : diff.toFixed(1);
    }
    return '-';
  }, [method, effectiveLL, effectivePL, roundLiquidLimitToWhole, roundPlasticLimitToWhole]);

  // Handlers for trial inputs
  const handleCasagrandeLLChange = (idx, field, val) => {
    setCasagrandeLLTrials((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleCasagrandePLChange = (idx, field, val) => {
    setCasagrandePLTrials((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleConeChange = (idx, field, val) => {
    setConeTrials((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleFillSample = () => {
    if (method === ATTERBERG_METHODS.CASAGRANDE) {
      setCasagrandeLLTrials(SAMPLE_CASAGRANDE_DATA.liquidTrials);
      setCasagrandePLTrials(SAMPLE_CASAGRANDE_DATA.plasticTrials);
      setOverrideLL('');
      setOverridePL('');
    } else {
      setConeTrials(SAMPLE_CONE_PENETRATION_DATA.trials);
      setOverrideLL('');
      setOverridePL('');
    }
  };

  const handleClear = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setCasagrandeLLTrials(DEFAULT_CASAGRANDE_LL_TRIALS);
    setCasagrandePLTrials(DEFAULT_CASAGRANDE_PL_TRIALS);
    setConeTrials(DEFAULT_CONE_LL_TRIALS);
    setOverrideLL('');
    setOverridePL('');
  };

  const handleApply = () => {
    const finalLL = effectiveLL || '-';
    const finalPL = effectivePL || '-';
    const finalPI = effectivePI || '-';

    onApply({
      method,
      atterbergLimits: {
        liquidLimit: finalLL,
        plasticLimit: finalPL,
        plasticityIndex: finalPI,
      },
      casagrandeLiquidTrials: method === ATTERBERG_METHODS.CASAGRANDE ? casagrandeLLTrials : null,
      casagrandePlasticTrials: method === ATTERBERG_METHODS.CASAGRANDE ? casagrandePLTrials : null,
      coneTrials: method === ATTERBERG_METHODS.CONE_PENETRATION ? coneTrials : null,
      manualLL: overrideLL,
      manualPL: overridePL,
      roundLiquidLimitToWhole,
      roundPlasticLimitToWhole,
      roundConeLLToFirstDecimal,
      rawCalc: {
        rawLiquidLimit: calc.rawLiquidLimit,
        rawPlasticLimit: calc.rawPlasticLimit,
      },
      appliedAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-white dark:bg-card p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-border max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4 border-gray-100 dark:border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-foreground">
                <Calculator className="w-5 h-5 text-primary" />
                Atterberg Limits Calculation
                <Badge variant="outline" className="text-xs font-semibold text-primary bg-primary/5 dark:bg-primary/20 border-primary/20 dark:border-primary/40">
                  IS:2720 (Part 5)
                </Badge>
              </DialogTitle>
              <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">
                Determination of Liquid Limit (LL), Plastic Limit (PL) and Plasticity Index (PI)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-semibold text-gray-700 dark:text-foreground bg-gray-100 dark:bg-muted/40">
                {boreholeNo}
              </Badge>
              {depth && (
                <Badge variant="outline" className="px-3 py-1 font-semibold text-gray-600 dark:text-muted-foreground dark:border-border">
                  Depth: {depth} m
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Top Control Bar: Method Selector & Sample Data Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50/80 dark:bg-muted/30 rounded-xl border border-gray-100 dark:border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-700 dark:text-foreground uppercase tracking-wider">
              Testing Method:
            </span>
            <Select value={method} onValueChange={(v) => setMethod(v)}>
              <SelectTrigger className="w-[400px] h-9 bg-white dark:bg-background/90 font-medium text-sm shadow-xs border-gray-200 dark:border-border dark:text-foreground">
                <SelectValue placeholder="Select Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ATTERBERG_METHODS.CASAGRANDE} className="font-medium text-sm py-2">
                  Casagrande Apparatus Method (LL, PL, PI)
                </SelectItem>
                <SelectItem value={ATTERBERG_METHODS.CONE_PENETRATION} className="font-medium text-sm py-2">
                  Cone Penetration Method (LL only, PL = NP)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSample}
              className="hidden h-8 text-xs font-medium text-primary hover:bg-primary/10 border-primary/20 shadow-xs"
              title="Fill with verified test sample values from reference sheet"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
              Fill Sample Data
            </Button>
          </div>
        </div>

        {/* METHOD 1: CASAGRANDE APPARATUS */}
        {method === ATTERBERG_METHODS.CASAGRANDE && (
          <div className="space-y-6">
            {/* Section A: Liquid Limit Table (5 Trials) */}
            <div className="border border-gray-200 dark:border-border rounded-xl p-4 bg-white dark:bg-card/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-0 font-bold dark:bg-primary/20">
                    Part A
                  </Badge>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-foreground">
                    Liquid Limit (LL) — 5 Mandatory Trials
                  </h4>
                  <span className="text-xs text-gray-400 dark:text-muted-foreground">
                    (Standard: IS:2720 Part 5, Clause 3.4)
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 dark:text-muted-foreground hidden sm:inline">
                    Target blows: 15 to 35
                  </span>
                  <label className="text-xs text-gray-600 dark:text-muted-foreground flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roundLiquidLimitToWhole}
                      onChange={(e) => setRoundLiquidLimitToWhole(e.target.checked)}
                      className="rounded text-primary focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Round LL to nearest whole number</span>
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-muted/50 border-b border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground uppercase tracking-wider">
                      <th className="p-2 w-10 text-center font-bold">#</th>
                      <th className="p-2 w-20 font-bold">Cup No</th>
                      <th className="p-2 w-24 font-bold text-primary">No of Blows</th>
                      <th className="p-2 font-bold" title="W1: Empty wt of cup (g)">Empty Cup W₁ (g)</th>
                      <th className="p-2 font-bold" title="W2: Cup wt + Wet Soil (g)">Cup + Wet W₂ (g)</th>
                      <th className="p-2 font-bold" title="W3: Cup wt + Dry Soil (g)">Cup + Dry W₃ (g)</th>
                      <th className="p-2 bg-gray-100/50 dark:bg-muted/30 font-bold text-gray-700 dark:text-foreground" title="Ww = W2 - W3">Water Wt (g)</th>
                      <th className="p-2 bg-gray-100/50 dark:bg-muted/30 font-bold text-gray-700 dark:text-foreground" title="Ws = W3 - W1">Solids Wt (g)</th>
                      <th className="p-2 bg-blue-50/60 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-300 text-right" title="w% = (Ww / Ws) * 100">
                        Water Content w (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border">
                    {calc.liquidLimitCalc.trials.map((trial, idx) => (
                      <tr key={idx} className={trial.isValid ? 'hover:bg-gray-50/50 dark:hover:bg-muted/20' : 'bg-red-50/20 dark:bg-red-950/20'}>
                        <td className="p-2 text-center font-bold text-gray-400 dark:text-muted-foreground">{idx + 1}</td>
                        <td className="p-1">
                          <Input
                            value={casagrandeLLTrials[idx].cupNo}
                            onChange={(e) => handleCasagrandeLLChange(idx, 'cupNo', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 36"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={casagrandeLLTrials[idx].blows}
                            onChange={(e) => handleCasagrandeLLChange(idx, 'blows', e.target.value)}
                            className="h-7 text-xs font-semibold text-primary dark:bg-background dark:border-border"
                            placeholder="e.g. 25"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={casagrandeLLTrials[idx].cupEmpty}
                            onChange={(e) => handleCasagrandeLLChange(idx, 'cupEmpty', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 18.58"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={casagrandeLLTrials[idx].cupWet}
                            onChange={(e) => handleCasagrandeLLChange(idx, 'cupWet', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 28.76"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={casagrandeLLTrials[idx].cupDry}
                            onChange={(e) => handleCasagrandeLLChange(idx, 'cupDry', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 25.53"
                          />
                        </td>
                        <td className="p-2 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-foreground">
                          {trial.waterWeight !== null ? trial.waterWeight.toFixed(2) : '-'}
                        </td>
                        <td className="p-2 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-foreground">
                          {trial.solidsWeight !== null ? trial.solidsWeight.toFixed(2) : '-'}
                        </td>
                        <td className="p-2 bg-blue-50/50 dark:bg-blue-950/30 font-mono font-bold text-blue-800 dark:text-blue-300 text-right">
                          {trial.waterContent !== null ? `${trial.waterContent.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Flow Curve Graph */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border overflow-hidden">
                <CasagrandeFlowCurve
                  validPoints={calc.liquidLimitCalc.validPoints}
                  regression={calc.liquidLimitCalc.regression}
                  targetLL={overrideLL !== '' ? parseFloat(overrideLL) : (calc.liquidLimit ? parseFloat(calc.liquidLimit) : calc.liquidLimitCalc.liquidLimit)}
                />
              </div>
            </div>

            {/* Section B: Plastic Limit Table (2 Trials) */}
            <div className="border border-gray-200 dark:border-border rounded-xl p-4 bg-white dark:bg-card/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-0 font-bold">
                    Part B
                  </Badge>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-foreground">
                    Plastic Limit (PL) — 2 Trials
                  </h4>
                  <span className="text-xs text-gray-400 dark:text-muted-foreground">
                    (Standard: IS:2720 Part 5, Clause 4)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 dark:text-muted-foreground flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roundPlasticLimitToWhole}
                      onChange={(e) => setRoundPlasticLimitToWhole(e.target.checked)}
                      className="rounded text-primary focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Round PL to nearest whole number</span>
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-muted/50 border-b border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground uppercase tracking-wider">
                      <th className="p-2 w-10 text-center font-bold">#</th>
                      <th className="p-2 w-28 font-bold">Cup No</th>
                      <th className="p-2 font-bold" title="W1: Empty wt of cup (g)">Empty Cup W₁ (g)</th>
                      <th className="p-2 font-bold" title="W2: Cup wt + Wet Soil (g)">Cup + Wet W₂ (g)</th>
                      <th className="p-2 font-bold" title="W3: Cup wt + Dry Soil (g)">Cup + Dry W₃ (g)</th>
                      <th className="p-2 bg-gray-100/50 dark:bg-muted/30 font-bold text-gray-700 dark:text-foreground">Water Wt (g)</th>
                      <th className="p-2 bg-gray-100/50 dark:bg-muted/30 font-bold text-gray-700 dark:text-foreground">Solids Wt (g)</th>
                      <th className="p-2 bg-emerald-50/60 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-300 text-right">
                        Water Content w (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border">
                    {calc.plasticLimitCalc.trials.map((trial, idx) => (
                      <tr key={idx} className={trial.isValid ? 'hover:bg-gray-50/50 dark:hover:bg-muted/20' : 'bg-red-50/20 dark:bg-red-950/20'}>
                        <td className="p-2 text-center font-bold text-gray-400 dark:text-muted-foreground">{idx + 1}</td>
                        <td className="p-1">
                          <Input
                            value={casagrandePLTrials[idx].cupNo}
                            onChange={(e) => handleCasagrandePLChange(idx, 'cupNo', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 47"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={casagrandePLTrials[idx].cupEmpty}
                            onChange={(e) => handleCasagrandePLChange(idx, 'cupEmpty', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 18.62"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={casagrandePLTrials[idx].cupWet}
                            onChange={(e) => handleCasagrandePLChange(idx, 'cupWet', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 20.32"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={casagrandePLTrials[idx].cupDry}
                            onChange={(e) => handleCasagrandePLChange(idx, 'cupDry', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 19.95"
                          />
                        </td>
                        <td className="p-2 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-foreground">
                          {trial.waterWeight !== null ? trial.waterWeight.toFixed(2) : '-'}
                        </td>
                        <td className="p-2 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-foreground">
                          {trial.solidsWeight !== null ? trial.solidsWeight.toFixed(2) : '-'}
                        </td>
                        <td className="p-2 bg-emerald-50/50 dark:bg-emerald-950/30 font-mono font-bold text-emerald-800 dark:text-emerald-300 text-right">
                          {trial.waterContent !== null ? `${trial.waterContent.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Plastic limit summary */}
              <div className="mt-3 p-3 bg-emerald-50/40 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-lg flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-foreground">
                  Plastic Limit = Average of Water Content = ({' '}
                  {calc.plasticLimitCalc.trials[0]?.waterContent ?? '-' } +{' '}
                  {calc.plasticLimitCalc.trials[1]?.waterContent ?? '-' } ) / 2
                </span>
                <span className="font-bold text-emerald-800 dark:text-emerald-300 font-mono text-sm">
                  PL = {calc.plasticLimit || '-'}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* METHOD 2: CONE PENETRATION METHOD */}
        {method === ATTERBERG_METHODS.CONE_PENETRATION && (
          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-border rounded-xl p-4 bg-white dark:bg-card/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-0 font-bold">
                    Cone Penetration
                  </Badge>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-foreground">
                    Liquid Limit (LL) — 4 Trials
                  </h4>
                  <span className="text-xs text-gray-400 dark:text-muted-foreground">
                    (Standard: IS:2720 Part 5, Clause 3.5)
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 dark:text-muted-foreground hidden sm:inline">
                    Standard penetration range: 14 mm to 28 mm
                  </span>
                  <label className="text-xs text-gray-600 dark:text-muted-foreground flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roundConeLLToFirstDecimal}
                      onChange={(e) => setRoundConeLLToFirstDecimal(e.target.checked)}
                      className="rounded text-primary focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Round LL to nearest first decimal place</span>
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-muted/50 border-b border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground uppercase tracking-wider">
                      <th className="p-2 w-10 text-center font-bold">#</th>
                      <th className="p-2 w-20 font-bold">Cup No</th>
                      <th className="p-2 w-28 font-bold text-emerald-700 dark:text-emerald-400" title="Penetration of cone in mm">
                        Penetration (mm)
                      </th>
                      <th className="p-2 font-bold" title="W1: Empty wt of cup (g)">Empty Cup W₁ (g)</th>
                      <th className="p-2 font-bold" title="W2: Cup wt + Wet Soil (g)">Cup + Wet W₂ (g)</th>
                      <th className="p-2 font-bold" title="W3: Cup wt + Dry Soil (g)">Cup + Dry W₃ (g)</th>
                      <th className="p-2 bg-gray-100/50 dark:bg-muted/30 font-bold text-gray-700 dark:text-foreground">Water Wt (g)</th>
                      <th className="p-2 bg-gray-100/50 dark:bg-muted/30 font-bold text-gray-700 dark:text-foreground">Solids Wt (g)</th>
                      <th className="p-2 bg-emerald-50/60 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-300 text-right">
                        Water Content w (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border">
                    {calc.cone.trials.map((trial, idx) => (
                      <tr key={idx} className={trial.isValid ? 'hover:bg-gray-50/50 dark:hover:bg-muted/20' : 'bg-red-50/20 dark:bg-red-950/20'}>
                        <td className="p-2 text-center font-bold text-gray-400 dark:text-muted-foreground">{idx + 1}</td>
                        <td className="p-1">
                          <Input
                            value={coneTrials[idx].cupNo}
                            onChange={(e) => handleConeChange(idx, 'cupNo', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 9"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={coneTrials[idx].penetration}
                            onChange={(e) => handleConeChange(idx, 'penetration', e.target.value)}
                            className="h-7 text-xs font-semibold text-emerald-700 dark:text-emerald-400 dark:bg-background dark:border-border"
                            placeholder="e.g. 20.0"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={coneTrials[idx].cupEmpty}
                            onChange={(e) => handleConeChange(idx, 'cupEmpty', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 12.80"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={coneTrials[idx].cupWet}
                            onChange={(e) => handleConeChange(idx, 'cupWet', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 21.68"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="any"
                            value={coneTrials[idx].cupDry}
                            onChange={(e) => handleConeChange(idx, 'cupDry', e.target.value)}
                            className="h-7 text-xs dark:bg-background dark:border-border"
                            placeholder="e.g. 19.97"
                          />
                        </td>
                        <td className="p-2 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-foreground">
                          {trial.waterWeight !== null ? trial.waterWeight.toFixed(2) : '-'}
                        </td>
                        <td className="p-2 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-foreground">
                          {trial.solidsWeight !== null ? trial.solidsWeight.toFixed(2) : '-'}
                        </td>
                        <td className="p-2 bg-emerald-50/50 dark:bg-emerald-950/30 font-mono font-bold text-emerald-800 dark:text-emerald-300 text-right">
                          {trial.waterContent !== null ? `${trial.waterContent.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Linear Flow Curve */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border overflow-hidden">
                <ConeFlowCurve
                  validPoints={calc.cone.validPoints}
                  regression={calc.cone.regression}
                  targetLL={overrideLL !== '' ? parseFloat(overrideLL) : (calc.liquidLimit ? parseFloat(calc.liquidLimit) : calc.cone.liquidLimit)}
                />
              </div>

              {/* Note per page 3 of reference PDF */}
              <div className="mt-4 p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">IS:2720 Cone Penetration Specification:</p>
                  <p className="mt-0.5">
                    This method determines <strong>Liquid Limit (LL)</strong> at 20 mm penetration.
                    Plastic Limit (PL) is recorded as <strong>Non-Plastic (NP)</strong> and Plasticity Index (PI) is recorded as a <strong>hyphen (-)</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fine-Tuning & Result Summary Bar */}
        <div className="p-4 bg-gray-50/80 dark:bg-muted/30 border border-gray-200 dark:border-border rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-foreground uppercase tracking-wider">
                Computed Limits
              </span>
              <span className="text-[11px] text-gray-500 dark:text-muted-foreground">
                (Reported to 1 decimal place per IS:2720 Part 5)
              </span>
            </div>

            {/* Optional Manual Adjustment for Flow Curve reading */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500 dark:text-muted-foreground">Adjust from graph if needed:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-700 dark:text-foreground">LL:</span>
                <Input
                  type="number"
                  step="0.1"
                  value={overrideLL}
                  onChange={(e) => setOverrideLL(e.target.value)}
                  placeholder={calc.liquidLimit || 'Auto'}
                  className="w-20 h-7 text-xs font-mono font-bold bg-white dark:bg-background/90 dark:border-border dark:text-foreground"
                />
              </div>
              {method === ATTERBERG_METHODS.CASAGRANDE && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700 dark:text-foreground">PL:</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={overridePL}
                    onChange={(e) => setOverridePL(e.target.value)}
                    placeholder={calc.plasticLimit || 'Auto'}
                    className="w-20 h-7 text-xs font-mono font-bold bg-white dark:bg-background/90 dark:border-border dark:text-foreground"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Three Large KPI summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white dark:bg-card rounded-xl border border-blue-100 dark:border-blue-900/40 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">Liquid Limit (LL)</span>
                <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold border-0">
                  {method === ATTERBERG_METHODS.CASAGRANDE ? '@ 25 blows' : '@ 20 mm'}
                </Badge>
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-blue-700 dark:text-blue-400">
                {effectiveLL ? `${effectiveLL}%` : '-'}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-muted-foreground mt-0.5">
                {method === ATTERBERG_METHODS.CASAGRANDE ? 'Semi-log regression' : 'Linear regression'}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-card rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">Plastic Limit (PL)</span>
                <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border-0">
                  {method === ATTERBERG_METHODS.CASAGRANDE ? '2-Trial Avg' : 'Fixed'}
                </Badge>
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {effectivePL ? (effectivePL === 'NP' ? 'NP' : `${effectivePL}%`) : '-'}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-muted-foreground mt-0.5">
                {method === ATTERBERG_METHODS.CASAGRANDE ? '3 mm soil thread' : 'Non-Plastic'}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-card rounded-xl border border-purple-100 dark:border-purple-900/40 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase">Plasticity Index (PI)</span>
                <Badge className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold border-0">
                  LL - PL
                </Badge>
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-purple-700 dark:text-purple-400">
                {effectivePI}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-muted-foreground mt-0.5">
                Unitless
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-gray-100 dark:border-border flex items-center justify-end sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="h-9 text-xs dark:border-border dark:hover:bg-muted/30 text-gray-600 dark:text-gray-400 gap-1.5"
            title="Reset all inputs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs dark:border-border dark:hover:bg-muted/30">
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            disabled={!effectiveLL}
            className="h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Apply to Atterberg (LL/PL/PI)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
