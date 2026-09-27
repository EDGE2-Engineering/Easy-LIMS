import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  RotateCcw,
  Check,
  AlertTriangle,
  Info,
  Scale,
  Sparkles,
  PieChart,
  Activity,
  LineChart,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings2,
  ArrowRight,
  TestTube,
} from 'lucide-react';
import {
  SIEVES_CONFIG,
  COARSE_SIEVES_CONFIG,
  FULL_SIEVES_CONFIG,
  calculateGrainSizeFromSieve,
  calculateHydrometerAnalysis,
  DEFAULT_HYDROMETER_TIMES,
  HYDROMETER_DEFAULTS,
  PDF_SAMPLE_DATA,
} from '@/utils/grainSizeCalculation';

/**
 * Modal dialog for entering Sieve Analysis and Hydrometer Analysis test data
 * and calculating complete Grain Size Distribution (Gravel / Sand / Silt / Clay)
 * per IS:2720 (Part 4) & IS:1498.
 */
export default function SieveAnalysisModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-1',
  depth = '',
  initialData = {},
  specificGravity = '',
  onApply,
}) {
  const [activeTab, setActiveTab] = useState('sieve');
  const [includeCoarse, setIncludeCoarse] = useState(false);
  const [showConstants, setShowConstants] = useState(false);

  // Sieve State
  const [totalWeight, setTotalWeight] = useState('');
  const [sieves, setSieves] = useState(() => {
    const initial = {};
    FULL_SIEVES_CONFIG.forEach((s) => {
      initial[s.key] = '';
    });
    return initial;
  });

  // Hydrometer Header / Configuration State
  const [hydroConfig, setHydroConfig] = useState({
    specificGravitySoil: 2.55,
    drySampleWeight: 50.0,
    testStartDate: '',
    testEndDate: '',
    testTime: '',
    temperature: 28,
    meniscusCorrectionCm: HYDROMETER_DEFAULTS.meniscusCorrectionCm,
    dispersingAgentCorrectionCd: HYDROMETER_DEFAULTS.dispersingAgentCorrectionCd,
  });

  // Hydrometer Observation Rows
  const [hydroReadings, setHydroReadings] = useState(() =>
    DEFAULT_HYDROMETER_TIMES.map((time, idx) => ({
      id: `time-${time}-${idx}`,
      time,
      temp: 28,
      hmReading: '',
    }))
  );

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      const cleanVal = (v) => (v === '-' || v === undefined || v === null ? '' : String(v));
      const initSieve = initialData?.sieveData || initialData || {};
      setTotalWeight(cleanVal(initSieve.totalWeight || initSieve.sampleWeight || ''));

      const nextSieves = {};
      let hasCoarse = false;
      FULL_SIEVES_CONFIG.forEach((s) => {
        const val = initSieve[s.key] ?? initSieve[s.key.replace('sieve', 'sieve_')] ?? initSieve[s.label];
        const cleaned = cleanVal(val);
        nextSieves[s.key] = cleaned;
        if (s.size > 10 && cleaned !== '' && parseFloat(cleaned) > 0) {
          hasCoarse = true;
        }
      });
      setSieves(nextSieves);
      if (hasCoarse) setIncludeCoarse(true);

      // Hydrometer initial data
      const initHydro = initialData?.hydrometerData || {};
      const sgVal = parseFloat(initHydro.specificGravitySoil || specificGravity || 2.55);
      setHydroConfig({
        specificGravitySoil: !isNaN(sgVal) && sgVal > 0 ? sgVal : 2.55,
        drySampleWeight: parseFloat(initHydro.drySampleWeight) || 50.0,
        testStartDate: initHydro.testStartDate || '',
        testEndDate: initHydro.testEndDate || '',
        testTime: initHydro.testTime || '',
        temperature: parseFloat(initHydro.temperature) || 28,
        meniscusCorrectionCm: parseFloat(initHydro.constants?.meniscusCorrectionCm) || HYDROMETER_DEFAULTS.meniscusCorrectionCm,
        dispersingAgentCorrectionCd: parseFloat(initHydro.constants?.dispersingAgentCorrectionCd) || HYDROMETER_DEFAULTS.dispersingAgentCorrectionCd,
      });

      if (Array.isArray(initHydro.readings) && initHydro.readings.length > 0) {
        setHydroReadings(
          initHydro.readings.map((r, idx) => ({
            id: `time-${r.time}-${idx}`,
            time: r.time,
            temp: r.temp ?? 28,
            hmReading: cleanVal(r.hmReading ?? r.rawReading),
          }))
        );
      } else {
        setHydroReadings(
          DEFAULT_HYDROMETER_TIMES.map((time, idx) => ({
            id: `time-${time}-${idx}`,
            time,
            temp: 28,
            hmReading: '',
          }))
        );
      }
    }
  }, [isOpen, initialData, specificGravity]);

  // Real-time Sieve Calculations
  const sieveCalc = useMemo(() => {
    return calculateGrainSizeFromSieve({
      totalWeight,
      sieves,
      includeCoarse,
    });
  }, [totalWeight, sieves, includeCoarse]);

  // Real-time Hydrometer Calculations
  const hydroCalc = useMemo(() => {
    return calculateHydrometerAnalysis({
      readings: hydroReadings,
      sieveTotalWeight: sieveCalc.effectiveTotal || totalWeight,
      finesPassing75um: sieveCalc.passing75um,
      specificGravitySoil: hydroConfig.specificGravitySoil,
      drySampleWeight: hydroConfig.drySampleWeight,
      constants: {
        meniscusCorrectionCm: hydroConfig.meniscusCorrectionCm,
        dispersingAgentCorrectionCd: hydroConfig.dispersingAgentCorrectionCd,
      },
    });
  }, [hydroReadings, sieveCalc, hydroConfig]);

  const handleSieveWeightChange = (key, value) => {
    setSieves((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleHydroReadingChange = (index, field, value) => {
    setHydroReadings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddHydroRow = () => {
    const lastRow = hydroReadings[hydroReadings.length - 1];
    const nextTime = lastRow ? Number(lastRow.time) + 60 : 30;
    setHydroReadings((prev) => [
      ...prev,
      {
        id: `time-custom-${Date.now()}`,
        time: nextTime,
        temp: lastRow ? lastRow.temp : 28,
        hmReading: '',
      },
    ]);
  };

  const handleRemoveHydroRow = (index) => {
    setHydroReadings((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleResetHydroTimes = () => {
    setHydroReadings(
      DEFAULT_HYDROMETER_TIMES.map((time, idx) => ({
        id: `time-${time}-${idx}`,
        time,
        temp: 28,
        hmReading: '',
      }))
    );
  };

  // Quick fill sample from the PDF
  const handleFillPdfSample = () => {
    setTotalWeight(String(PDF_SAMPLE_DATA.sieve.totalWeight));
    setIncludeCoarse(true);
    const filledSieves = {};
    FULL_SIEVES_CONFIG.forEach((s) => {
      filledSieves[s.key] = String(PDF_SAMPLE_DATA.sieve[s.key] ?? '0');
    });
    setSieves(filledSieves);

    setHydroConfig({
      specificGravitySoil: PDF_SAMPLE_DATA.hydrometer.specificGravitySoil,
      drySampleWeight: PDF_SAMPLE_DATA.hydrometer.drySampleWeight,
      testStartDate: PDF_SAMPLE_DATA.hydrometer.testStartDate,
      testEndDate: PDF_SAMPLE_DATA.hydrometer.testEndDate,
      testTime: PDF_SAMPLE_DATA.hydrometer.testTime,
      temperature: PDF_SAMPLE_DATA.hydrometer.temperature,
      meniscusCorrectionCm: HYDROMETER_DEFAULTS.meniscusCorrectionCm,
      dispersingAgentCorrectionCd: HYDROMETER_DEFAULTS.dispersingAgentCorrectionCd,
    });

    setHydroReadings(
      PDF_SAMPLE_DATA.hydrometer.readings.map((r, idx) => ({
        id: `pdf-row-${idx}`,
        time: r.time,
        temp: r.temp,
        hmReading: String(r.hmReading),
      }))
    );
  };

  const handleClear = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setTotalWeight('');
    const cleared = {};
    FULL_SIEVES_CONFIG.forEach((s) => {
      cleared[s.key] = '';
    });
    setSieves(cleared);
    setHydroReadings(
      DEFAULT_HYDROMETER_TIMES.map((time, idx) => ({
        id: `time-${time}-${idx}`,
        time,
        temp: 28,
        hmReading: '',
      }))
    );
  };

  const handleApply = () => {
    const finalGravel = sieveCalc.gravel !== '' ? sieveCalc.gravel : '-';
    const finalSand = sieveCalc.sand !== '' ? sieveCalc.sand : '-';
    const finalSiltAndClay = sieveCalc.siltAndClay !== '' ? sieveCalc.siltAndClay : '-';

    const hasHydrometer = hydroCalc.hasData;

    onApply({
      sieveData: {
        totalWeight: totalWeight !== '' && totalWeight !== '-' ? String(totalWeight) : '',
        ...sieves,
      },
      hydrometerData: hasHydrometer
        ? {
            specificGravitySoil: hydroConfig.specificGravitySoil,
            drySampleWeight: hydroConfig.drySampleWeight,
            testStartDate: hydroConfig.testStartDate,
            testEndDate: hydroConfig.testEndDate,
            testTime: hydroConfig.testTime,
            temperature: hydroConfig.temperature,
            samplePassed75um: hydroCalc.samplePassed75um,
            sampleRetained75um: hydroCalc.sampleRetained75um,
            readings: hydroReadings,
            bifurcation: hydroCalc.bifurcation,
          }
        : null,
      grainSizeDistribution: {
        gravel: finalGravel,
        sand: finalSand,
        siltAndClay: finalSiltAndClay,
        silt: hasHydrometer ? hydroCalc.bifurcation.silt.toFixed(2) : undefined,
        clay: hasHydrometer ? hydroCalc.bifurcation.clay.toFixed(2) : undefined,
        coarseSand: sieveCalc.sandBifurcation.coarse.toFixed(2),
        mediumSand: sieveCalc.sandBifurcation.medium.toFixed(2),
        fineSand: sieveCalc.sandBifurcation.fine.toFixed(2),
      },
      summary: {
        sumRetained: sieveCalc.sumRetained,
        gravelWeight: sieveCalc.gravelWeight,
        sandWeight: sieveCalc.sandWeight,
        panWeight: sieveCalc.panWeight,
        recoveryPercent: sieveCalc.recoveryPercent,
        passing75um: sieveCalc.passing75um,
        requiresHydrometer: sieveCalc.requiresHydrometer,
        hydrometerPerformed: hasHydrometer,
      },
    });
    onClose();
  };

  // Build combined data points for the particle size distribution curve
  const curvePoints = useMemo(() => {
    const pts = [];

    // Sieve points
    sieveCalc.sieveRows.forEach((s) => {
      if (s.size !== null && s.size > 0 && typeof s.finesPassing === 'number') {
        pts.push({
          type: 'sieve',
          label: s.label,
          d: s.size,
          finesPassing: s.finesPassing,
        });
      }
    });

    // Hydrometer points (from Column 11 and Column 14 per Page 25)
    if (hydroCalc.hasData) {
      hydroCalc.rows.forEach((r) => {
        if (typeof r.diaParticleD === 'number' && r.diaParticleD > 0 && typeof r.combinedPercentageFiner === 'number') {
          pts.push({
            type: 'hydrometer',
            label: `${r.diaParticleD.toFixed(3)} mm (${r.time}m)`,
            d: r.diaParticleD,
            finesPassing: r.combinedPercentageFiner,
          });
        }
      });
    }

    // Sort descending by particle diameter D
    return pts.sort((a, b) => b.d - a.d);
  }, [sieveCalc, hydroCalc]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-8xl bg-white dark:bg-card p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-border max-h-[94vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100 dark:border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  Grain Size Analysis
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                  >
                    IS:2720 (Part 4) / IS:1498
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  Sample: <span className="font-semibold text-gray-700 dark:text-foreground">{boreholeNo}</span>
                  {depth ? (
                    <>
                      {' '}
                      • Depth: <span className="font-semibold text-gray-700 dark:text-foreground">{depth} m</span>
                    </>
                  ) : null}
                  {sieveCalc.passing75um > 0 && (
                    <>
                      {' '}
                      • 75µ Passing:{' '}
                      <span className="font-semibold text-primary">{sieveCalc.passing75um}%</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Fill Sample Actions */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillPdfSample}
                className="text-[11px] font-medium text-primary hover:text-primary-dark border-primary/30 bg-primary/5 hover:bg-primary/10 h-7"
                title="Fill complete Sieve & Hydrometer test data from IS 2720 PDF (200g sample)"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Fill PDF Sample (IS 2720)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-[11px] font-medium text-gray-500 hover:text-red-600 h-7"
                title="Clear all inputs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="sieve" className="text-xs font-semibold flex items-center gap-1.5 py-1.5">
              <Layers className="w-3.5 h-3.5" />
              Sieve Analysis
              {sieveCalc.hasData && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/20 text-primary font-bold">
                  {sieveCalc.sumRetained}g
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="hydrometer" className="text-xs font-semibold flex items-center gap-1.5 py-1.5">
              <Activity className="w-3.5 h-3.5" />
              Hydrometer Analysis
              {sieveCalc.requiresHydrometer && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold animate-pulse">
                  Required
                </span>
              )}
              {hydroCalc.hasData && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                  Done
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="curve" className="text-xs font-semibold flex items-center gap-1.5 py-1.5">
              <LineChart className="w-3.5 h-3.5" />
              Gradation Curve & Bifurcation
            </TabsTrigger>
          </TabsList>

          {/* ========================================================= */}
          {/* TAB 1: SIEVE ANALYSIS */}
          {/* ========================================================= */}
          <TabsContent value="sieve" className="space-y-3 pt-2">
            {/* Standard Info Banner */}
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>IS 1498 Soil Fraction Standards</span>
              </div>
              <div className="text-[11px] text-blue-700/90 dark:text-blue-300/80 pl-5 grid grid-cols-1 md:grid-cols-3 gap-2 pt-0.5">
                <div>
                  <span className="font-semibold text-amber-900 dark:text-amber-300">Gravel (G):</span> Retained on ≥ 4.75 mm
                </div>
                <div>
                  <span className="font-semibold text-blue-900 dark:text-blue-300">Sand (S):</span> 4.75 mm to 0.075 mm
                </div>
                <div>
                  <span className="font-semibold text-emerald-900 dark:text-emerald-300">Silt & Clay (SC):</span> Passing 0.075 mm (75 µm)
                </div>
              </div>
            </div>

            {/* Total Sample Weight & Balance Stats */}
            <div className="bg-gray-50/70 dark:bg-muted/30 p-3.5 rounded-xl border border-gray-100 dark:border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <label className="text-xs font-bold text-gray-700 dark:text-foreground">
                  Total Sample Weight taken for Sieve Test:
                </label>
                <div className="relative w-36">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(e.target.value)}
                    placeholder="gms"
                    className="h-8 pr-7 text-right font-medium text-xs dark:bg-background dark:border-border"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-gray-400 dark:text-muted-foreground">g</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIncludeCoarse(!includeCoarse)}
                  className="text-[11px] text-gray-500 hover:text-primary h-7"
                >
                  {includeCoarse ? 'Hide 100-20mm Sieves' : '+ Include Coarse Sieves (100, 80, 40, 20mm)'}
                </Button>
                <div className="bg-white dark:bg-card px-2.5 py-1 rounded-lg border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground">
                  Sum Retained:{' '}
                  <span className="font-bold text-gray-900 dark:text-foreground">{sieveCalc.sumRetained} g</span>
                </div>
                {sieveCalc.totalWeight ? (
                  <div
                    className={`px-2.5 py-1 rounded-lg border font-medium ${
                      Math.abs(sieveCalc.massLoss) > 2
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                    }`}
                  >
                    Recovery: <span className="font-bold">{sieveCalc.recoveryPercent}%</span>
                    {sieveCalc.massLoss !== 0 && (
                      <span className="ml-1 text-[10px] opacity-80">
                        ({sieveCalc.massLoss > 0 ? `-${sieveCalc.massLoss}g loss` : `+${Math.abs(sieveCalc.massLoss)}g`})
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Sieve Weights Table */}
            <div className="border border-gray-200 dark:border-border rounded-xl bg-white dark:bg-card overflow-hidden shadow-sm">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="text-[11px] text-gray-500 dark:text-muted-foreground uppercase bg-gray-50 dark:bg-muted/50 sticky top-0 border-b border-gray-200 dark:border-border z-10">
                    <tr>
                      <th className="px-3 py-2 font-bold w-24">IS Sieve</th>
                      <th className="px-2 py-2 font-bold w-36">Soil Fraction</th>
                      <th className="px-3 py-2 font-bold text-center w-32">Weight Retained (g)</th>
                      <th className="px-3 py-2 font-bold text-center w-28">% Retained</th>
                      <th className="px-3 py-2 font-bold text-center w-28">% Cumulative</th>
                      <th className="px-3 py-2 font-bold text-center w-28">% Fines Passing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border">
                    {sieveCalc.sieveRows.map((row) => (
                      <tr
                        key={row.key}
                        className={`hover:bg-gray-50/50 dark:hover:bg-muted/20 transition-colors ${
                          row.category === 'gravel'
                            ? 'bg-amber-50/10 dark:bg-amber-950/10'
                            : row.category === 'sand'
                            ? 'bg-blue-50/10 dark:bg-blue-950/10'
                            : 'bg-emerald-50/10 dark:bg-emerald-950/10'
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-foreground">{row.label}</td>
                        <td className="px-2 py-2">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                              row.category === 'gravel'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                                : row.category === 'sand'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                            }`}
                          >
                            {row.fraction}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.rawInput}
                            onChange={(e) => handleSieveWeightChange(row.key, e.target.value)}
                            placeholder="0.00"
                            className="h-7 text-center text-xs font-medium dark:bg-background dark:border-border"
                          />
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700 dark:text-foreground font-medium">
                          {sieveCalc.hasData ? `${row.pctRetained}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700 dark:text-foreground font-medium">
                          {sieveCalc.hasData ? `${row.cumPctRetained}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-primary font-bold">
                          {sieveCalc.hasData ? `${row.finesPassing}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HYDROMETER REQUIREMENT PROMPT (IS 2720 Part 4 / Page 5) */}
            {sieveCalc.hasData && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  sieveCalc.requiresHydrometer
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                    : 'bg-gray-50 dark:bg-muted/30 border-gray-200 dark:border-border text-gray-700 dark:text-muted-foreground'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      sieveCalc.requiresHydrometer ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'
                    }`}
                  />
                  <div>
                    <h5 className="text-xs font-bold flex items-center gap-1.5">
                      Passing 75µ Sieve: <span className="font-extrabold text-sm">{sieveCalc.passing75um}%</span>
                      {sieveCalc.requiresHydrometer ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
                          Hydrometer Required (&gt; 10%)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Hydrometer Optional (≤ 10%)
                        </Badge>
                      )}
                    </h5>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {sieveCalc.requiresHydrometer
                        ? 'Because more than 10% of the soil sample passes the 75-micron sieve, Hydrometer Analysis is required per IS 2720 (Part 4) to determine Silt & Clay distribution.'
                        : 'Passing 75µ is within 10%. Hydrometer analysis is not mandatory per code, but can be added if required by project specifications.'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveTab('hydrometer')}
                  className={`text-xs flex items-center gap-1 flex-shrink-0 ${
                    sieveCalc.requiresHydrometer
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-primary/80 hover:bg-primary text-white'
                  }`}
                >
                  Proceed to Hydrometer
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* COMPUTED GRAIN SIZE DISTRIBUTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
              {/* Gravel Card */}
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                    Gravel (G)
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white text-amber-800 border-amber-300">
                    ≥ 4.75 mm
                  </Badge>
                </div>
                <div className="text-2xl font-black text-amber-900 dark:text-amber-100">
                  {sieveCalc.gravel !== '' ? `${sieveCalc.gravel}%` : '-'}
                </div>
                <p className="text-[10px] text-amber-700/80 mt-1">Weight: {sieveCalc.gravelWeight} g</p>
              </div>

              {/* Sand Card */}
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">Sand (S)</span>
                  <Badge variant="outline" className="text-[10px] bg-white text-blue-800 border-blue-300">
                    4.75 - 0.075 mm
                  </Badge>
                </div>
                <div className="text-2xl font-black text-blue-900 dark:text-blue-100">
                  {sieveCalc.sand !== '' ? `${sieveCalc.sand}%` : '-'}
                </div>
                <p className="text-[10px] text-blue-700/80 mt-1">
                  Coarse: {sieveCalc.sandBifurcation.coarse}% • Med: {sieveCalc.sandBifurcation.medium}% • Fine:{' '}
                  {sieveCalc.sandBifurcation.fine}%
                </p>
              </div>

              {/* Silt & Clay Card */}
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                    Silt & Clay (SC)
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white text-emerald-800 border-emerald-300">
                    &lt; 0.075 mm
                  </Badge>
                </div>
                <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                  {sieveCalc.siltAndClay !== '' ? `${sieveCalc.siltAndClay}%` : '-'}
                </div>
                <p className="text-[10px] text-emerald-700/80 mt-1">
                  {hydroCalc.hasData
                    ? `Silt: ${hydroCalc.bifurcation.silt}% • Clay: ${hydroCalc.bifurcation.clay}%`
                    : `Pan: ${sieveCalc.panWeight} g (Fines)`}
                </p>
              </div>

              {/* Recovery Card */}
              <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase">Recovery</span>
                  <Badge variant="outline" className="text-[10px] bg-white text-purple-800 border-purple-300">
                    IS 2720
                  </Badge>
                </div>
                <div className="text-2xl font-black text-purple-900 dark:text-purple-100">
                  {sieveCalc.recoveryPercent ? `${sieveCalc.recoveryPercent}%` : '-'}
                </div>
                <p className="text-[10px] text-purple-700/80 mt-1">
                  Loss: {sieveCalc.massLoss !== 0 ? `${sieveCalc.massLoss} g` : '0 g'}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 2: HYDROMETER ANALYSIS */}
          {/* ========================================================= */}
          <TabsContent value="hydrometer" className="space-y-3 pt-2">
            {/* Header info & mapped values from Page 8 & 9 */}
            <div className="bg-gray-50/80 dark:bg-muted/30 p-3.5 rounded-xl border border-gray-200 dark:border-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-gray-800 dark:text-foreground">
                    Hydrometer Analysis Parameters (IS 2720: Part 4)
                  </h4>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConstants(!showConstants)}
                  className="text-[11px] text-gray-500 h-6 flex items-center gap-1"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  {showConstants ? 'Hide Equipment Constants' : 'Hydrometer & Jar Calibration Constants'}
                  {showConstants ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="text-[11px] text-gray-500 block">Total Sieve Sample (Mw):</label>
                  <span className="font-bold text-gray-800 dark:text-foreground">
                    {sieveCalc.effectiveTotal || totalWeight || '-'} g
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block">Passing 75µ Sieve (%):</label>
                  <span className="font-bold text-primary">{sieveCalc.passing75um}%</span>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block">Sample Passed 75µ (Md):</label>
                  <span className="font-bold text-gray-800 dark:text-foreground">
                    {hydroCalc.samplePassed75um} g
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block">Sample Retained 75µ:</label>
                  <span className="font-bold text-gray-800 dark:text-foreground">
                    {hydroCalc.sampleRetained75um} g
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 block">Specific Gravity of Soil (Gs):</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={hydroConfig.specificGravitySoil}
                    onChange={(e) =>
                      setHydroConfig((prev) => ({ ...prev, specificGravitySoil: parseFloat(e.target.value) || 2.55 }))
                    }
                    className="h-7 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block">Sample Pretreated (WD, g):</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={hydroConfig.drySampleWeight}
                    onChange={(e) =>
                      setHydroConfig((prev) => ({ ...prev, drySampleWeight: parseFloat(e.target.value) || 50.0 }))
                    }
                    className="h-7 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block">Test Start Date / Time:</label>
                  <div className="flex gap-1">
                    <Input
                      type="date"
                      value={hydroConfig.testStartDate}
                      onChange={(e) => setHydroConfig((prev) => ({ ...prev, testStartDate: e.target.value }))}
                      className="h-7 text-[10px]"
                    />
                    <Input
                      type="text"
                      placeholder="11:00 AM"
                      value={hydroConfig.testTime}
                      onChange={(e) => setHydroConfig((prev) => ({ ...prev, testTime: e.target.value }))}
                      className="h-7 text-[10px] w-20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block">Test End Date:</label>
                  <Input
                    type="date"
                    value={hydroConfig.testEndDate}
                    onChange={(e) => setHydroConfig((prev) => ({ ...prev, testEndDate: e.target.value }))}
                    className="h-7 text-[10px]"
                  />
                </div>
              </div>

              {/* COLLAPSIBLE EQUIPMENT CONSTANTS (Pages 6, 7, 11, 13) */}
              {showConstants && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-border text-[11px] grid grid-cols-2 md:grid-cols-4 gap-2 bg-white dark:bg-card p-3 rounded-lg border">
                  <div>
                    <span className="text-gray-500">1000ml Jar Area (A):</span>
                    <span className="font-mono font-semibold ml-1">28.17 cm² (600-700ml / 3.55cm)</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Hydrometer Vol (Vh):</span>
                    <span className="font-mono font-semibold ml-1">80 mL (880 - 800ml)</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Bulb Length (h):</span>
                    <span className="font-mono font-semibold ml-1">17 cm</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Meniscus Corr. (Cm):</span>
                    <span className="font-mono font-semibold ml-1">+0.0005</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Dispersing Agent (Cd):</span>
                    <span className="font-mono font-semibold ml-1">2.5</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-gray-500">Calibration Equations for He:</span>
                    <span className="font-mono font-semibold ml-1">
                      t ≤ 4m: He = 19.303 - 0.3688×Rh • t &gt; 4m: He = 20.723 - 0.3688×Rh
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Observations Table Toolbar */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-foreground">
                Hydrometer Observations & Stokes' Law Calculations ({hydroReadings.length} readings)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetHydroTimes}
                  className="h-7 text-[11px]"
                >
                  Reset Times (0.5m - 24h)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddHydroRow}
                  className="h-7 text-[11px] bg-primary text-white"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Reading Row
                </Button>
              </div>
            </div>

            {/* 14-COLUMNS OBSERVATION TABLE (Matching Page 19) */}
            <div className="border border-gray-200 dark:border-border rounded-xl bg-white dark:bg-card overflow-hidden shadow-sm">
              <div className="max-h-[360px] overflow-x-auto overflow-y-auto">
                <table className="w-full text-[11px] text-left border-collapse min-w-[1100px]">
                  <thead className="text-[10px] text-gray-500 dark:text-muted-foreground uppercase bg-gray-50 dark:bg-muted/50 sticky top-0 border-b border-gray-200 dark:border-border z-10">
                    <tr>
                      <th className="px-2 py-2 font-bold text-center w-16">C1<br />Time (min)</th>
                      <th className="px-2 py-2 font-bold text-center w-14">C2<br />Temp (°C)</th>
                      <th className="px-2 py-2 font-bold text-center w-24">C3<br />Obs. HM (Rh')</th>
                      <th className="px-2 py-2 font-bold text-center w-20">C4<br />HM Dist. H₂O</th>
                      <th className="px-2 py-2 font-bold text-center w-20">C5<br />Viscosity</th>
                      <th className="px-2 py-2 font-bold text-center w-20">C6<br />Crctd Rh</th>
                      <th className="px-2 py-2 font-bold text-center w-16">C7<br />Ct</th>
                      <th className="px-2 py-2 font-bold text-center w-20">C8<br />Rh+Ct-Cd</th>
                      <th className="px-2 py-2 font-bold text-center w-20">C9<br />He (cm)</th>
                      <th className="px-2 py-2 font-bold text-center w-16">C10<br />Factor K</th>
                      <th className="px-2 py-2 font-bold text-center w-20">C11<br />Dia D (mm)</th>
                      <th className="px-2 py-2 font-bold text-center w-20">C12<br />% Finer N</th>
                      <th className="px-2 py-2 font-bold text-center w-20">C13<br />Mass 75µ (g)</th>
                      <th className="px-2 py-2 font-bold text-center w-24">C14<br />Combined %</th>
                      <th className="px-1 py-2 font-bold text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border font-mono">
                    {hydroCalc.rows.map((row, idx) => (
                      <tr key={hydroReadings[idx]?.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-muted/20">
                        {/* C1: Time */}
                        <td className="px-1.5 py-1 text-center">
                          <Input
                            type="number"
                            step="any"
                            value={hydroReadings[idx]?.time ?? ''}
                            onChange={(e) => handleHydroReadingChange(idx, 'time', e.target.value)}
                            className="h-6 text-center text-[11px] p-0 font-semibold"
                          />
                        </td>

                        {/* C2: Temp */}
                        <td className="px-1.5 py-1 text-center">
                          <Input
                            type="number"
                            step="1"
                            value={hydroReadings[idx]?.temp ?? ''}
                            onChange={(e) => handleHydroReadingChange(idx, 'temp', e.target.value)}
                            className="h-6 text-center text-[11px] p-0 font-medium"
                          />
                        </td>

                        {/* C3: Observed Reading */}
                        <td className="px-1.5 py-1 text-center">
                          <Input
                            type="number"
                            step="0.0005"
                            placeholder="1.0115"
                            value={hydroReadings[idx]?.hmReading ?? ''}
                            onChange={(e) => handleHydroReadingChange(idx, 'hmReading', e.target.value)}
                            className="h-6 text-center text-[11px] p-0 font-bold text-primary"
                          />
                        </td>

                        {/* C4: Water Reading */}
                        <td className="px-1.5 py-1 text-center text-gray-500">
                          {row.readingInWater || '-'}
                        </td>

                        {/* C5: Viscosity */}
                        <td className="px-1.5 py-1 text-center text-gray-500">
                          {row.viscosity ? row.viscosity.toFixed(6) : '-'}
                        </td>

                        {/* C6: Corrected Rh */}
                        <td className="px-1.5 py-1 text-center text-gray-700 dark:text-foreground font-semibold">
                          {row.correctedRh !== '' ? row.correctedRh : '-'}
                        </td>

                        {/* C7: Temp Correction */}
                        <td className="px-1.5 py-1 text-center text-gray-600">
                          {row.tempCrctnCt !== '' ? row.tempCrctnCt : '-'}
                        </td>

                        {/* C8: Rh + Ct - Cd */}
                        <td className="px-1.5 py-1 text-center text-gray-700 font-medium">
                          {row.rhTotalCorrection !== '' ? row.rhTotalCorrection : '-'}
                        </td>

                        {/* C9: Effective Depth */}
                        <td className="px-1.5 py-1 text-center text-blue-700 font-semibold">
                          {row.effectiveDepthHe !== '' ? row.effectiveDepthHe : '-'}
                        </td>

                        {/* C10: Factor K */}
                        <td className="px-1.5 py-1 text-center text-gray-600">
                          {row.factorKDisplay !== '' ? row.factorKDisplay : '-'}
                        </td>

                        {/* C11: Particle Dia D */}
                        <td className="px-1.5 py-1 text-center font-bold text-emerald-700 dark:text-emerald-400">
                          {row.diaParticleD !== '' ? row.diaParticleD.toFixed(3) : '-'}
                        </td>

                        {/* C12: % Finer N */}
                        <td className="px-1.5 py-1 text-center text-gray-700">
                          {row.percentageFinerN !== '' ? `${row.percentageFinerN}%` : '-'}
                        </td>

                        {/* C13: Mass 75µ Passing */}
                        <td className="px-1.5 py-1 text-center text-gray-600">
                          {row.massPassed75um !== '' ? row.massPassed75um : '-'}
                        </td>

                        {/* C14: Combined % Finer than D */}
                        <td className="px-1.5 py-1 text-center font-black text-primary text-xs">
                          {row.combinedPercentageFiner !== '' ? `${row.combinedPercentageFiner}%` : '-'}
                        </td>

                        {/* Remove Row */}
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveHydroRow(idx)}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Silt & Clay Fraction Computed Card */}
            {hydroCalc.hasData && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Fine Soil Bifurcation from Hydrometer Analysis (IS 1498)
                    </h5>
                    <p className="text-[11px] text-emerald-800/80">
                      Clay fraction evaluated at particle diameter D &lt; 0.002 mm; Silt fraction is 0.075 mm to 0.002 mm.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="bg-white dark:bg-card px-3 py-1.5 rounded-lg border border-emerald-200">
                    Silt (0.075 - 0.002 mm):{' '}
                    <span className="font-extrabold text-sm text-emerald-800 dark:text-emerald-300">
                      {hydroCalc.bifurcation.silt}%
                    </span>
                  </div>
                  <div className="bg-white dark:bg-card px-3 py-1.5 rounded-lg border border-emerald-200">
                    Clay (&lt; 0.002 mm):{' '}
                    <span className="font-extrabold text-sm text-teal-800 dark:text-teal-300">
                      {hydroCalc.bifurcation.clay}%
                    </span>
                  </div>
                  <div className="bg-emerald-100/80 dark:bg-emerald-900/40 px-3 py-1.5 rounded-lg font-bold text-emerald-900 dark:text-emerald-200">
                    Total Fines: {hydroCalc.bifurcation.totalFines}%
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 3: GRADATION CURVE & SOIL BIFURCATION */}
          {/* ========================================================= */}
          <TabsContent value="curve" className="space-y-3 pt-2">
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <LineChart className="w-4 h-4 text-primary" />
                    Particle Size Distribution Curve (Semi-Logarithmic)
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Standard: IS 2720 (Part 4) • Combined Sieve (100mm - 0.075mm) + Hydrometer (0.070mm - 0.001mm)
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                    Sieve Analysis
                  </span>
                  {hydroCalc.hasData && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      Hydrometer Analysis
                    </span>
                  )}
                </div>
              </div>

              {/* SEMI-LOGARITHMIC SVG CHART */}
              {curvePoints.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <svg viewBox="0 0 760 340" className="w-full h-auto select-none font-sans">
                    {/* Background & Boundary */}
                    <rect x="60" y="25" width="670" height="260" fill="none" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Zone Header Bars at Top */}
                    {/* Decades: 100mm to 10mm (Gravel: >= 4.75mm) */}
                    {/* Log range: 100 mm to 0.001 mm = 5 decades */}
                    {/* x(D) = 60 + ((2 - log10(D)) / 5) * 670 */}
                    {(() => {
                      const getX = (d) => 60 + ((2 - Math.log10(d)) / 5) * 670;
                      const xGravelCut = getX(4.75);
                      const xSandCut = getX(0.075);
                      const xClayCut = getX(0.002);

                      return (
                        <g>
                          {/* Zone header bands */}
                          <rect x="60" y="8" width={xGravelCut - 60} height="16" fill="#fef3c7" opacity="0.8" />
                          <text x={(60 + xGravelCut) / 2} y="19" textAnchor="middle" className="text-[9px] font-bold fill-amber-900">
                            GRAVEL (&gt; 4.75mm)
                          </text>

                          <rect x={xGravelCut} y="8" width={xSandCut - xGravelCut} height="16" fill="#dbeafe" opacity="0.8" />
                          <text x={(xGravelCut + xSandCut) / 2} y="19" textAnchor="middle" className="text-[9px] font-bold fill-blue-900">
                            SAND (4.75 - 0.075mm)
                          </text>

                          <rect x={xSandCut} y="8" width={xClayCut - xSandCut} height="16" fill="#d1fae5" opacity="0.8" />
                          <text x={(xSandCut + xClayCut) / 2} y="19" textAnchor="middle" className="text-[9px] font-bold fill-emerald-900">
                            SILT (0.075 - 0.002mm)
                          </text>

                          <rect x={xClayCut} y="8" width={730 - xClayCut} height="16" fill="#ccfbf1" opacity="0.8" />
                          <text x={(xClayCut + 730) / 2} y="19" textAnchor="middle" className="text-[9px] font-bold fill-teal-900">
                            CLAY (&lt; 0.002mm)
                          </text>
                        </g>
                      );
                    })()}

                    {/* Y-Axis Grid & Labels (0% to 100%) */}
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((yVal) => {
                      const yPos = 285 - (yVal / 100) * 260;
                      return (
                        <g key={`y-${yVal}`}>
                          <line x1="60" y1={yPos} x2="730" y2={yPos} stroke="#f1f5f9" strokeWidth="1" />
                          <text x="52" y={yPos + 3} textAnchor="end" className="text-[9px] fill-gray-500 font-mono">
                            {yVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* X-Axis Logarithmic Grid Lines & Labels */}
                    {[
                      { d: 100, label: '100' },
                      { d: 80 }, { d: 60 }, { d: 40 }, { d: 20 },
                      { d: 10, label: '10' },
                      { d: 8 }, { d: 6 }, { d: 4.75, label: '4.75', isCut: true }, { d: 2, label: '2' },
                      { d: 1, label: '1' },
                      { d: 0.8 }, { d: 0.6 }, { d: 0.425, label: '0.425' }, { d: 0.2 },
                      { d: 0.1, label: '0.1' },
                      { d: 0.075, label: '0.075', isCut: true }, { d: 0.04 }, { d: 0.02 },
                      { d: 0.01, label: '0.01' },
                      { d: 0.005 }, { d: 0.002, label: '0.002', isCut: true },
                      { d: 0.001, label: '0.001' },
                    ].map(({ d, label, isCut }) => {
                      const xPos = 60 + ((2 - Math.log10(d)) / 5) * 670;
                      return (
                        <g key={`x-${d}`}>
                          <line
                            x1={xPos}
                            y1="25"
                            x2={xPos}
                            y2="285"
                            stroke={isCut ? '#f59e0b' : label ? '#e2e8f0' : '#f8fafc'}
                            strokeWidth={isCut ? '1.5' : label ? '1' : '0.5'}
                            strokeDasharray={isCut ? '3,2' : undefined}
                          />
                          {label && (
                            <text
                              x={xPos}
                              y="300"
                              textAnchor="middle"
                              className={`text-[8.5px] font-mono ${isCut ? 'fill-amber-600 font-bold' : 'fill-gray-500'}`}
                            >
                              {label}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Axis Titles */}
                    <text x="395" y="325" textAnchor="middle" className="text-[11px] font-bold fill-gray-700">
                      PARTICLE SIZE (MM) — LOGARITHMIC SCALE
                    </text>
                    <text
                      x="-155"
                      y="18"
                      transform="rotate(-90)"
                      textAnchor="middle"
                      className="text-[11px] font-bold fill-gray-700"
                    >
                      PERCENTAGE FINER THAN D (%)
                    </text>

                    {/* GRADATION CURVE PATH */}
                    {(() => {
                      const getX = (d) => 60 + ((2 - Math.log10(d)) / 5) * 670;
                      const getY = (fp) => 285 - (fp / 100) * 260;

                      const pathD = curvePoints.reduce((acc, pt, idx) => {
                        const px = getX(pt.d);
                        const py = getY(pt.finesPassing);
                        return idx === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`;
                      }, '');

                      return (
                        <g>
                          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                          {curvePoints.map((pt, i) => {
                            const cx = getX(pt.d);
                            const cy = getY(pt.finesPassing);
                            const isHydro = pt.type === 'hydrometer';
                            return (
                              <g key={`pt-${i}`}>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isHydro ? 3.5 : 4.5}
                                  fill={isHydro ? '#10b981' : '#2563eb'}
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                />
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
                  Enter sieve or hydrometer test weights to generate the particle size curve.
                </div>
              )}
            </div>

            {/* COMPLETE SOIL BIFURCATION SUMMARY TABLE (Page 3 & 26) */}
            <div className="border border-gray-200 dark:border-border rounded-xl bg-white dark:bg-card overflow-hidden shadow-sm">
              <div className="p-3 bg-gray-50 dark:bg-muted/40 border-b border-gray-200 dark:border-border font-bold text-xs text-gray-700 dark:text-foreground">
                Complete Soil Classification & Bifurcation Summary (IS:1498)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="text-[10px] uppercase bg-gray-50/50 dark:bg-muted/20 text-gray-600 border-b">
                    <tr>
                      <th className="px-3 py-2 border-r font-bold">Bore Hole</th>
                      <th className="px-3 py-2 border-r font-bold">Depth (m)</th>
                      <th className="px-3 py-2 border-r font-bold text-amber-800">Gravel (&gt; 4.75mm)</th>
                      <th className="px-3 py-2 border-r font-bold text-blue-800" colSpan={4}>
                        Sand (4.75 - 0.075mm)
                      </th>
                      <th className="px-3 py-2 font-bold text-emerald-800" colSpan={3}>
                        Silt & Clay (&lt; 0.075mm)
                      </th>
                    </tr>
                    <tr className="text-[9px] bg-gray-50 text-gray-500 border-b">
                      <th className="border-r"></th>
                      <th className="border-r"></th>
                      <th className="border-r">%</th>
                      <th className="border-r">Coarse</th>
                      <th className="border-r">Medium</th>
                      <th className="border-r">Fine</th>
                      <th className="border-r font-semibold text-blue-900">Total Sand</th>
                      <th className="border-r">Silt</th>
                      <th className="border-r">Clay</th>
                      <th className="font-semibold text-emerald-900">Total Fines</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    <tr className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 font-bold border-r text-gray-700">{boreholeNo}</td>
                      <td className="px-3 py-2.5 border-r font-medium">{depth || '-'}</td>
                      <td className="px-3 py-2.5 border-r font-bold text-amber-700">
                        {sieveCalc.gravel !== '' ? `${sieveCalc.gravel}%` : '-'}
                      </td>
                      <td className="px-2 py-2.5 border-r text-gray-600">
                        {sieveCalc.sandBifurcation.coarse}%
                      </td>
                      <td className="px-2 py-2.5 border-r text-gray-600">
                        {sieveCalc.sandBifurcation.medium}%
                      </td>
                      <td className="px-2 py-2.5 border-r text-gray-600">
                        {sieveCalc.sandBifurcation.fine}%
                      </td>
                      <td className="px-3 py-2.5 border-r font-bold text-blue-700">
                        {sieveCalc.sand !== '' ? `${sieveCalc.sand}%` : '-'}
                      </td>
                      <td className="px-2 py-2.5 border-r text-emerald-700">
                        {hydroCalc.hasData ? `${hydroCalc.bifurcation.silt}%` : '-'}
                      </td>
                      <td className="px-2 py-2.5 border-r text-teal-700">
                        {hydroCalc.hasData ? `${hydroCalc.bifurcation.clay}%` : '-'}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-emerald-800">
                        {sieveCalc.siltAndClay !== '' ? `${sieveCalc.siltAndClay}%` : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* DIALOG FOOTER */}
        <DialogFooter className="pt-3 border-t border-gray-100 dark:border-border flex items-center justify-between flex-wrap gap-2">
          <div className="text-[11px] text-gray-400 dark:text-muted-foreground italic">
            Applying will populate Gravel, Sand, Silt & Clay values in the Lab Tests table.
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs dark:border-border dark:hover:bg-muted/30"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="text-xs bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Grain Size Data
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
