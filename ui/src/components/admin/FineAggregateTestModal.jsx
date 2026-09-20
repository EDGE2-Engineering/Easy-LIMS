import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Info,
  Sparkles,
  AlertTriangle,
  FlaskConical,
  Layers,
  Droplets,
  Weight,
} from 'lucide-react';
import {
  FINE_AGG_SIEVES,
  DEFAULT_SIEVE_ANALYSIS,
  DEFAULT_FINER75,
  DEFAULT_SG_WA,
  DEFAULT_SG_TRIAL,
  DEFAULT_BULK_DENSITY,
  DEFAULT_BULK_DENSITY_TRIAL,
  SAMPLE_FINE_AGG_DATA,
  calculateSieveAnalysis,
  calculateFiner75,
  calculateSgWa,
  calculateBulkDensity,
} from '@/utils/fineAggregateTestCalculation';

// ─── helpers ─────────────────────────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Modal for Fine Aggregate Tests per IS 2386 (Parts 1 & 3): 1963 RA 2021
 * Tabs: Sieve Analysis | Finer <75µm | Specific Gravity & WA | Bulk Density
 */
export default function FineAggregateTestModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [activeTab, setActiveTab] = useState('sieve');

  // ── State for each test ────────────────────────────────────────────────
  const [sieveData,    setSieveData]    = useState(deepClone(DEFAULT_SIEVE_ANALYSIS));
  const [finer75Data,  setFiner75Data]  = useState(deepClone(DEFAULT_FINER75));
  const [sgWaData,     setSgWaData]     = useState(deepClone(DEFAULT_SG_WA));
  const [bulkData,     setBulkData]     = useState(deepClone(DEFAULT_BULK_DENSITY));

  // ── Load initialData ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (initialData?.sieveAnalysis) {
      const loaded = deepClone(initialData.sieveAnalysis);
      const reconstructedRetained = { ...DEFAULT_SIEVE_ANALYSIS.retained };
      if (loaded.retained) {
        Object.assign(reconstructedRetained, loaded.retained);
      } else if (Array.isArray(loaded.rows)) {
        loaded.rows.forEach((r, idx) => {
          const sieveDef =
            FINE_AGG_SIEVES.find((s) => s.key === r.key || s.label === r.sieve) ||
            FINE_AGG_SIEVES[idx];
          if (sieveDef) {
            reconstructedRetained[sieveDef.key] = String(r.weightRetained ?? r.weightRetainedFmt ?? '0');
          }
        });
      }
      setSieveData({
        sampleWeight:
          loaded.sampleWeight !== undefined && loaded.sampleWeight !== null
            ? String(loaded.sampleWeight)
            : DEFAULT_SIEVE_ANALYSIS.sampleWeight,
        retained: reconstructedRetained,
      });
    } else {
      setSieveData(deepClone(DEFAULT_SIEVE_ANALYSIS));
    }

    setFiner75Data({
      w1: initialData?.finer75?.w1 !== undefined ? String(initialData.finer75.w1) : DEFAULT_FINER75.w1,
      w2: initialData?.finer75?.w2 !== undefined ? String(initialData.finer75.w2) : DEFAULT_FINER75.w2,
    });

    setSgWaData(
      initialData?.sgWa?.trials?.length > 0
        ? {
            trials: initialData.sgWa.trials.map((t) => ({
              a: t.a !== undefined ? String(t.a) : '',
              b: t.b !== undefined ? String(t.b) : '',
              c: t.c !== undefined ? String(t.c) : '',
              d: t.d !== undefined ? String(t.d) : '',
            })),
          }
        : deepClone(DEFAULT_SG_WA)
    );

    setBulkData(
      initialData?.bulkDensity?.trials?.length > 0
        ? {
            trials: initialData.bulkDensity.trials.map((t) => ({
              volume: t.volume !== undefined ? String(t.volume) : '',
              mouldWeight: t.mouldWeight !== undefined ? String(t.mouldWeight) : '',
              compactedWeight: t.compactedWeight !== undefined ? String(t.compactedWeight) : '',
              looseWeight: t.looseWeight !== undefined ? String(t.looseWeight) : '',
            })),
          }
        : deepClone(DEFAULT_BULK_DENSITY)
    );

    setActiveTab('sieve');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time calculations ─────────────────────────────────────────────
  const sieveResult  = useMemo(() => calculateSieveAnalysis(sieveData),  [sieveData]);
  const finer75Result= useMemo(() => calculateFiner75(finer75Data),       [finer75Data]);
  const sgWaResult   = useMemo(() => calculateSgWa(sgWaData),             [sgWaData]);
  const bulkResult   = useMemo(() => calculateBulkDensity(bulkData),      [bulkData]);

  // ── Sieve handlers ─────────────────────────────────────────────────────
  const setSieveWeight = (key, val) =>
    setSieveData((prev) => ({
      ...prev,
      retained: {
        ...(prev?.retained || DEFAULT_SIEVE_ANALYSIS.retained),
        [key]: val,
      },
    }));

  // ── SG/WA handlers ────────────────────────────────────────────────────
  const setSgTrial = (i, field, val) =>
    setSgWaData((prev) => {
      const trials = prev.trials.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
      return { ...prev, trials };
    });
  const addSgTrial = () =>
    setSgWaData((prev) => ({ ...prev, trials: [...prev.trials, deepClone(DEFAULT_SG_TRIAL)] }));
  const removeSgTrial = (i) =>
    setSgWaData((prev) => ({
      ...prev,
      trials: prev.trials.length > 1 ? prev.trials.filter((_, idx) => idx !== i) : prev.trials,
    }));

  // ── Bulk density handlers ──────────────────────────────────────────────
  const setBulkTrial = (i, field, val) =>
    setBulkData((prev) => {
      const trials = prev.trials.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
      return { ...prev, trials };
    });
  const addBulkTrial = () =>
    setBulkData((prev) => ({ ...prev, trials: [...prev.trials, deepClone(DEFAULT_BULK_DENSITY_TRIAL)] }));
  const removeBulkTrial = (i) =>
    setBulkData((prev) => ({
      ...prev,
      trials: prev.trials.length > 1 ? prev.trials.filter((_, idx) => idx !== i) : prev.trials,
    }));

  // ── Reset ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setSieveData(deepClone(DEFAULT_SIEVE_ANALYSIS));
    setFiner75Data(deepClone(DEFAULT_FINER75));
    setSgWaData(deepClone(DEFAULT_SG_WA));
    setBulkData(deepClone(DEFAULT_BULK_DENSITY));
  };

  // ── Fill sample ────────────────────────────────────────────────────────
  const handleFillSample = () => {
    setSieveData(deepClone(SAMPLE_FINE_AGG_DATA.sieveAnalysis));
    setFiner75Data(deepClone(SAMPLE_FINE_AGG_DATA.finer75));
    setSgWaData(deepClone(SAMPLE_FINE_AGG_DATA.sgWa));
    setBulkData(deepClone(SAMPLE_FINE_AGG_DATA.bulkDensity));
  };

  // ── Apply & Save ───────────────────────────────────────────────────────
  const handleApply = () => {
    const payload = {
      sieveAnalysis: {
        sampleWeight: sieveData.sampleWeight,
        retained: sieveData.retained,
        rows: sieveResult.rows.map((r) => ({
          key:                      r.key,
          sieve:                    r.sieve,
          weightRetained:           r.weightRetainedFmt,
          cumulativeRetained:       r.cumulativeRetainedFmt,
          cumulativePctRetained:    r.cumPctRetainedFmt,
          pctPassing:               r.pctPassingFmt,
        })),
        finenessModulus: sieveResult.finenessModulusFmt,
      },
      finer75: {
        w1:      finer75Data.w1,
        w2:      finer75Data.w2,
        finerPct: finer75Result.finerPctFmt,
      },
      sgWa: {
        trials: sgWaResult.trialResults.map((t, i) => ({
          trialNo: t.trialNo,
          a: sgWaData.trials[i]?.a || '',
          b: sgWaData.trials[i]?.b || '',
          c: sgWaData.trials[i]?.c || '',
          d: sgWaData.trials[i]?.d || '',
          sgSsd: t.sgSsdFmt,
          sgApp: t.sgAppFmt,
          wa:    t.waFmt,
        })),
        avgSgSsd: sgWaResult.avgSgSsdFmt,
        avgSgApp: sgWaResult.avgSgAppFmt,
        avgWa:    sgWaResult.avgWaFmt,
      },
      bulkDensity: {
        trials: bulkResult.trialResults.map((t, i) => ({
          trialNo:         t.trialNo,
          volume:          bulkData.trials[i]?.volume          || '',
          mouldWeight:     bulkData.trials[i]?.mouldWeight      || '',
          compactedWeight: bulkData.trials[i]?.compactedWeight  || '',
          looseWeight:     bulkData.trials[i]?.looseWeight      || '',
          compactedBulkDensity: t.compactedFmt,
          looseBulkDensity:     t.looseFmt,
        })),
        avgCompactedBulkDensity: bulkResult.avgCompactedFmt,
        avgLooseBulkDensity:     bulkResult.avgLooseFmt,
      },
    };
    if (onApply) onApply(payload);
    onClose();
  };

  // ─── Shared table style helpers ──────────────────────────────────────
  const theadCls = 'bg-gray-50/80 dark:bg-muted/50 border-b border-gray-200 dark:border-border text-gray-600 dark:text-gray-300';
  const tbodyCls = 'divide-y divide-gray-100 dark:divide-border';
  const trCls    = 'hover:bg-gray-50/50 dark:hover:bg-muted/20 transition-colors';
  const thCls    = 'p-2.5 font-bold text-xs';
  const tdCls    = 'p-2';
  const calcCls  = 'p-2.5 text-right font-mono text-xs font-semibold';

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border shadow-2xl rounded-2xl">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-teal-50/80 via-cyan-50/40 to-transparent dark:from-teal-950/30 dark:via-cyan-950/20 dark:to-transparent shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    Fine Aggregate Tests
                  </DialogTitle>
                  <Badge variant="outline" className="text-[11px] font-semibold bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800">
                    IS 2386 (Part 1 & 3): 1963 RA 2021
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Sieve Analysis · Finer &lt;75µm · Specific Gravity &amp; WA · Bulk Density
                  {jobCode    ? ` • Job: ${jobCode}`       : ''}
                  {sampleCode ? ` • Sample: ${sampleCode}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleFillSample}
                className="hidden h-8 text-xs gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-900 dark:text-teal-300 dark:hover:bg-teal-950/50">
                <Sparkles className="w-3.5 h-3.5" /> Fill Sample Data
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">

            {/* Tab bar */}
            <TabsList className="shrink-0 rounded-none border-b dark:border-border bg-transparent px-4 justify-start gap-1 h-auto py-0">
              {[
                { value: 'sieve',   label: 'Sieve Analysis',          icon: <Layers   className="w-3.5 h-3.5" /> },
                { value: 'finer75', label: 'Finer <75 µm',            icon: <FlaskConical className="w-3.5 h-3.5" /> },
                { value: 'sgwa',    label: 'Specific Gravity & WA',   icon: <Droplets className="w-3.5 h-3.5" /> },
                { value: 'bulk',    label: 'Bulk Density',            icon: <Weight   className="w-3.5 h-3.5" /> },
              ].map((t) => (
                <TabsTrigger key={t.value} value={t.value}
                  className="relative px-4 py-3 rounded-none bg-transparent shadow-none text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5
                             data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary
                             after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform
                             data-[state=active]:after:scale-x-100">
                  {t.icon}{t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Tab 1: Sieve Analysis ─────────────────────────────── */}
            <TabsContent value="sieve" className="p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 2386 (Part 1) — </span>
                  Cumulative % Retained = (Cumulative Wt / Sample Wt) × 100 · % Passing = 100 − Cum % Retained ·
                  Fineness Modulus = Σ(Cum % Retained for all sieves ≥ 150 µm) / 100
                </div>
              </div>

              {/* Sample weight input */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50/70 dark:bg-muted/30 border border-gray-100 dark:border-border">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                    Sample Weight Taken (g)
                  </Label>
                  <Input
                    type="number"
                    value={sieveData.sampleWeight}
                    onChange={(e) => setSieveData((p) => ({ ...p, sampleWeight: e.target.value }))}
                    placeholder="1000"
                    className="h-9 text-sm w-36 font-mono"
                  />
                </div>
                {sieveResult.finenessModulusFmt && (
                  <div className="ml-auto p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 text-center min-w-[130px]">
                    <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 block">Fineness Modulus</span>
                    <span className="text-2xl font-black text-teal-900 dark:text-teal-200 font-mono">{sieveResult.finenessModulusFmt}</span>
                  </div>
                )}
              </div>

              {/* Sieve table */}
              <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={theadCls}>
                      <th className={`${thCls} min-w-[120px]`}>IS Sieve</th>
                      <th className={`${thCls} text-right min-w-[140px]`}>
                        Weight Retained (g)
                      </th>
                      <th className={`${thCls} text-right min-w-[160px] bg-teal-50/50 dark:bg-teal-950/20`}>
                        Cumulative Retained (g)
                      </th>
                      <th className={`${thCls} text-right min-w-[140px] bg-teal-50/50 dark:bg-teal-950/20`}>
                        Cum % Retained
                      </th>
                      <th className={`${thCls} text-right min-w-[110px] bg-teal-100/60 dark:bg-teal-900/30`}>
                        % Passing
                      </th>
                    </tr>
                  </thead>
                  <tbody className={tbodyCls}>
                    {FINE_AGG_SIEVES.map(({ label, key }, i) => {
                      const row = sieveResult.rows[i] || {};
                      return (
                        <tr key={key} className={trCls}>
                          <td className="p-2.5 font-semibold text-gray-700 dark:text-foreground">{label}</td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={sieveData?.retained?.[key] ?? ''}
                              onChange={(e) => setSieveWeight(key, e.target.value)}
                              placeholder="0.0"
                              className="h-8 text-xs text-right font-mono w-full"
                            />
                          </td>
                          <td className={`${calcCls} bg-teal-50/40 dark:bg-teal-950/15`}>
                            {row.cumulativeRetainedFmt || <span className="text-gray-400">–</span>}
                          </td>
                          <td className={`${calcCls} bg-teal-50/40 dark:bg-teal-950/15`}>
                            {row.cumPctRetainedFmt
                              ? <span className="text-teal-800 dark:text-teal-300">{row.cumPctRetainedFmt}</span>
                              : <span className="text-gray-400">–</span>}
                          </td>
                          <td className={`${calcCls} bg-teal-100/50 dark:bg-teal-900/20`}>
                            {row.pctPassingFmt
                              ? <span className="font-bold text-teal-900 dark:text-teal-200">{row.pctPassingFmt}</span>
                              : <span className="text-gray-400">–</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {sieveResult.errors.length > 0 && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{sieveResult.errors.join(' ')}</div>
                </div>
              )}
            </TabsContent>

            {/* ── Tab 2: Finer than 75 µm ──────────────────────────── */}
            <TabsContent value="finer75" className="p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 2386 (Part 1) — Formula: </span>
                  Finer than 75 µm (%) = ((W₁ − W₂) / W₂) × 100
                  · W₁ = Sample taken (g) · W₂ = After wash oven-dry weight (g)
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                    W₁ — Sample Taken (g)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={finer75Data.w1}
                    onChange={(e) => setFiner75Data((p) => ({ ...p, w1: e.target.value }))}
                    placeholder="500"
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                    W₂ — After Wash Oven-Dry Weight (g)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={finer75Data.w2}
                    onChange={(e) => setFiner75Data((p) => ({ ...p, w2: e.target.value }))}
                    placeholder="457"
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>

              {finer75Result.errors.length > 0 && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{finer75Result.errors.join(' ')}</div>
                </div>
              )}

              {finer75Result.finerPctFmt && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 space-y-1 max-w-xs">
                  <span className="text-[11px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wider block">
                    Finer than 75 µm
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-teal-900 dark:text-teal-200 font-mono">
                      {finer75Result.finerPctFmt}
                    </span>
                    <span className="text-sm font-bold text-teal-700 dark:text-teal-400">%</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-muted-foreground">
                    IS 2386 (Part 1): 1963 RA 2021
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ── Tab 3: Specific Gravity & Water Absorption ───────── */}
            <TabsContent value="sgwa" className="p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">IS 2386 (Part 3) — Pycnometer method. Notations:</span>
                  <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                    A = Wt of SSD sample (g) · B = Wt of Pycnometer + Sample + Water (g) ·
                    C = Wt of Pycnometer + Water (g) · D = Oven-Dry Wt (g)
                  </span>
                  <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80 block">
                    SSD SG = D / (A − (B−C)) · Apparent SG = D / (D − (B−C)) · WA (%) = 100×(A−D)/D
                  </span>
                </div>
              </div>

              {/* Trials table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Trials
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">{sgWaData.trials.length} trial{sgWaData.trials.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addSgTrial}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Trial
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-16`}>Trial</th>
                          <th className={`${thCls} min-w-[120px]`}>
                            A — SSD Wt (g)
                          </th>
                          <th className={`${thCls} min-w-[160px]`}>
                            B — Pyc+Sample+Water (g)
                          </th>
                          <th className={`${thCls} min-w-[145px]`}>
                            C — Pyc+Water (g)
                          </th>
                          <th className={`${thCls} min-w-[130px]`}>
                            D — Oven-Dry Wt (g)
                          </th>
                          <th className={`${thCls} text-right min-w-[110px] bg-teal-50/60 dark:bg-teal-950/20`}>
                            SSD SG
                          </th>
                          <th className={`${thCls} text-right min-w-[120px] bg-teal-50/60 dark:bg-teal-950/20`}>
                            Apparent SG
                          </th>
                          <th className={`${thCls} text-right min-w-[100px] bg-blue-50/60 dark:bg-blue-950/20`}>
                            WA (%)
                          </th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {sgWaData.trials.map((trial, idx) => {
                          const res = sgWaResult.trialResults[idx] || {};
                          const hasErr = res.errors?.length > 0;
                          return (
                            <tr key={idx} className={`${trCls} ${hasErr ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                              <td className="p-2.5 text-center font-bold text-gray-400 dark:text-muted-foreground">
                                {idx + 1}
                              </td>
                              {['a', 'b', 'c', 'd'].map((field) => (
                                <td key={field} className={tdCls}>
                                  <Input
                                    type="number" step="0.01"
                                    value={trial[field] || ''}
                                    onChange={(e) => setSgTrial(idx, field, e.target.value)}
                                    placeholder={field === 'a' ? '505.00' : field === 'b' ? '1890.00' : field === 'c' ? '1576.00' : '495.50'}
                                    className="h-8 text-xs text-right font-mono w-full"
                                  />
                                </td>
                              ))}
                              <td className={`${calcCls} bg-teal-50/40 dark:bg-teal-950/15`}>
                                {res.sgSsdFmt
                                  ? <span className="text-teal-800 dark:text-teal-300 font-bold">{res.sgSsdFmt}</span>
                                  : <span className="text-gray-400">–</span>}
                              </td>
                              <td className={`${calcCls} bg-teal-50/40 dark:bg-teal-950/15`}>
                                {res.sgAppFmt
                                  ? <span className="text-teal-800 dark:text-teal-300 font-bold">{res.sgAppFmt}</span>
                                  : <span className="text-gray-400">–</span>}
                              </td>
                              <td className={`${calcCls} bg-blue-50/40 dark:bg-blue-950/15`}>
                                {res.waFmt
                                  ? <span className="text-blue-800 dark:text-blue-300 font-bold">{res.waFmt}</span>
                                  : <span className="text-gray-400">–</span>}
                              </td>
                              <td className="p-1.5 text-center">
                                {sgWaData.trials.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSgTrial(idx)}
                                    className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Average row */}
                        {sgWaData.trials.length > 1 && (
                          <tr className="bg-gray-50/60 dark:bg-muted/30 font-bold">
                            <td className="p-2.5 text-center text-xs text-gray-500 dark:text-muted-foreground" colSpan={5}>
                              Average
                            </td>
                            <td className={`${calcCls} bg-teal-100/60 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200`}>
                              {sgWaResult.avgSgSsdFmt || '–'}
                            </td>
                            <td className={`${calcCls} bg-teal-100/60 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200`}>
                              {sgWaResult.avgSgAppFmt || '–'}
                            </td>
                            <td className={`${calcCls} bg-blue-100/60 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200`}>
                              {sgWaResult.avgWaFmt || '–'}
                            </td>
                            <td></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Avg SSD Specific Gravity',     value: sgWaResult.avgSgSsdFmt, unit: '',  color: 'teal'  },
                  { label: 'Avg Apparent Specific Gravity', value: sgWaResult.avgSgAppFmt, unit: '',  color: 'teal'  },
                  { label: 'Avg Water Absorption',          value: sgWaResult.avgWaFmt,    unit: '%', color: 'blue'  },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} className={`p-4 rounded-xl bg-${color}-50/40 dark:bg-${color}-950/20 border border-${color}-200 dark:border-${color}-800/40 space-y-1`}>
                    <span className={`text-[11px] font-bold text-${color}-800 dark:text-${color}-400 uppercase tracking-wider block`}>
                      {label}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black text-${color}-900 dark:text-${color}-200 font-mono`}>
                        {value || '–'}
                      </span>
                      {unit && <span className={`text-xs font-bold text-${color}-700 dark:text-${color}-400`}>{unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── Tab 4: Bulk Density ──────────────────────────────── */}
            <TabsContent value="bulk" className="p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 2386 (Part 3) — Formulas: </span>
                  Dry Compacted Bulk Density = M₁ / V · Dry Loose Bulk Density = M₂ / V (kg/litre)
                  · V = Volume of cylinder (L) · M₁ = Weight of compacted aggregate (kg) · M₂ = Weight of loose aggregate (kg)
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Trials</h4>
                    <Badge variant="outline" className="text-[10px] font-mono">{bulkData.trials.length} trial{bulkData.trials.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addBulkTrial}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Trial
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-16`}>Trial</th>
                          <th className={`${thCls} min-w-[120px]`}>V — Volume (L)</th>
                          <th className={`${thCls} min-w-[130px]`}>Mould Wt (kg)</th>
                          <th className={`${thCls} min-w-[160px]`}>
                            M₁ — Compacted Agg Wt (kg)
                          </th>
                          <th className={`${thCls} min-w-[145px]`}>
                            M₂ — Loose Agg Wt (kg)
                          </th>
                          <th className={`${thCls} text-right min-w-[155px] bg-orange-50/60 dark:bg-orange-950/20`}>
                            Dry Compacted BD (kg/L)
                          </th>
                          <th className={`${thCls} text-right min-w-[140px] bg-yellow-50/60 dark:bg-yellow-950/20`}>
                            Dry Loose BD (kg/L)
                          </th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {bulkData.trials.map((trial, idx) => {
                          const res = bulkResult.trialResults[idx] || {};
                          const hasErr = res.errors?.length > 0;
                          return (
                            <tr key={idx} className={`${trCls} ${hasErr ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                              <td className="p-2.5 text-center font-bold text-gray-400 dark:text-muted-foreground">{idx + 1}</td>
                              {[
                                { field: 'volume',          ph: '3'    },
                                { field: 'mouldWeight',     ph: '2.67' },
                                { field: 'compactedWeight', ph: '5.36' },
                                { field: 'looseWeight',     ph: '4.90' },
                              ].map(({ field, ph }) => (
                                <td key={field} className={tdCls}>
                                  <Input
                                    type="number" step="0.01"
                                    value={trial[field] || ''}
                                    onChange={(e) => setBulkTrial(idx, field, e.target.value)}
                                    placeholder={ph}
                                    className="h-8 text-xs text-right font-mono w-full"
                                  />
                                </td>
                              ))}
                              <td className={`${calcCls} bg-orange-50/40 dark:bg-orange-950/15`}>
                                {res.compactedFmt
                                  ? <span className="font-bold text-orange-800 dark:text-orange-300">{res.compactedFmt}</span>
                                  : <span className="text-gray-400">–</span>}
                              </td>
                              <td className={`${calcCls} bg-yellow-50/40 dark:bg-yellow-950/15`}>
                                {res.looseFmt
                                  ? <span className="font-bold text-yellow-800 dark:text-yellow-300">{res.looseFmt}</span>
                                  : <span className="text-gray-400">–</span>}
                              </td>
                              <td className="p-1.5 text-center">
                                {bulkData.trials.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeBulkTrial(idx)}
                                    className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Average row */}
                        {bulkData.trials.length > 1 && (
                          <tr className="bg-gray-50/60 dark:bg-muted/30 font-bold">
                            <td className="p-2.5 text-center text-xs text-gray-500 dark:text-muted-foreground" colSpan={5}>
                              Average
                            </td>
                            <td className={`${calcCls} bg-orange-100/60 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200`}>
                              {bulkResult.avgCompactedFmt || '–'}
                            </td>
                            <td className={`${calcCls} bg-yellow-100/60 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200`}>
                              {bulkResult.avgLooseFmt || '–'}
                            </td>
                            <td></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Avg Dry Compacted Bulk Density', value: bulkResult.avgCompactedFmt, color: 'orange' },
                  { label: 'Avg Dry Loose Bulk Density',     value: bulkResult.avgLooseFmt,     color: 'yellow' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`p-4 rounded-xl bg-${color}-50/40 dark:bg-${color}-950/20 border border-${color}-200 dark:border-${color}-800/40 space-y-1`}>
                    <span className={`text-[11px] font-bold text-${color}-800 dark:text-${color}-400 uppercase tracking-wider block`}>
                      {label}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black text-${color}-900 dark:text-${color}-200 font-mono`}>
                        {value || '–'}
                      </span>
                      <span className={`text-xs font-bold text-${color}-700 dark:text-${color}-400`}>kg/L</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

          </Tabs>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 border-t dark:border-border flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-muted/20">
          <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
            All four test results will be saved together.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 px-3 text-xs gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleApply}
              className="h-9 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold">
              <Check className="w-3.5 h-3.5" /> Save Fine Aggregate Test Data
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
