import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  RotateCcw,
  Check,
  AlertTriangle,
  Info,
  Scale,
  Sparkles,
  PieChart,
} from 'lucide-react';
import {
  SIEVES_CONFIG,
  calculateGrainSizeFromSieve,
} from '@/utils/grainSizeCalculation';

/**
 * Modal dialog for entering Sieve Analysis weights and calculating
 * Grain Size Distribution (Gravel / Sand / Silt & Clay) per IS:2720 (Part 4) & IS:1498.
 */
export default function SieveAnalysisModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-1',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [totalWeight, setTotalWeight] = useState('');
  const [sieves, setSieves] = useState(() => {
    const initial = {};
    SIEVES_CONFIG.forEach((s) => {
      initial[s.key] = '';
    });
    return initial;
  });

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      const cleanVal = (v) => (v === '-' || v === undefined || v === null ? '' : String(v));
      setTotalWeight(cleanVal(initialData?.totalWeight || initialData?.sampleWeight || ''));

      const nextSieves = {};
      SIEVES_CONFIG.forEach((s) => {
        const val = initialData?.[s.key] ?? initialData?.[s.key.replace('sieve', 'sieve_')] ?? initialData?.[s.label];
        nextSieves[s.key] = cleanVal(val);
      });
      setSieves(nextSieves);
    }
  }, [isOpen, initialData]);

  // Real-time calculation
  const calc = useMemo(() => {
    return calculateGrainSizeFromSieve({
      totalWeight,
      sieves,
    });
  }, [totalWeight, sieves]);

  const handleSieveWeightChange = (key, value) => {
    setSieves((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApply = () => {
    const finalGravel = calc.gravel !== '' ? calc.gravel : '-';
    const finalSand = calc.sand !== '' ? calc.sand : '-';
    const finalSiltAndClay = calc.siltAndClay !== '' ? calc.siltAndClay : '-';

    onApply({
      sieveData: {
        totalWeight: totalWeight !== '' && totalWeight !== '-' ? String(totalWeight) : '',
        ...sieves,
      },
      grainSizeDistribution: {
        gravel: finalGravel,
        sand: finalSand,
        siltAndClay: finalSiltAndClay,
      },
      summary: {
        sumRetained: calc.sumRetained,
        gravelWeight: calc.gravelWeight,
        sandWeight: calc.sandWeight,
        panWeight: calc.panWeight,
        recoveryPercent: calc.recoveryPercent,
      },
    });
    onClose();
  };

  const handleClear = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setTotalWeight('');
    const cleared = {};
    SIEVES_CONFIG.forEach((s) => {
      cleared[s.key] = '';
    });
    setSieves(cleared);
  };

  const handleFillSample = (sampleNum) => {
    if (sampleNum === 1) {
      // 100g sample: Silty Sand (G: 0.00%, S: 36.70%, SC: 63.30%)
      setTotalWeight('100');
      setSieves({
        sieve0: '0',
        sieve1: '0',
        sieve2: '0.95',
        sieve3: '1.00',
        sieve4: '5.25',
        sieve5: '8.30',
        sieve6: '3.36',
        sieve7: '7.94',
        sieve8: '1.11',
        sieve9: '8.81',
        sieve10: '62.45',
      });
    } else {
      // 100g sample: Sandy Silt (G: 0.30%, S: 58.50%, SC: 41.20%)
      setTotalWeight('100');
      setSieves({
        sieve0: '0',
        sieve1: '0.30',
        sieve2: '1.64',
        sieve3: '1.60',
        sieve4: '9.16',
        sieve5: '12.75',
        sieve6: '4.03',
        sieve7: '10.78',
        sieve8: '5.25',
        sieve9: '13.25',
        sieve10: '40.44',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white dark:bg-card p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-border max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100 dark:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  Sieve Analysis & Grain Size Calculation
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
                </p>
              </div>
            </div>

            {/* Quick Fill Sample Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFillSample(1)}
                className="hidden text-[11px] font-medium text-primary hover:underline bg-primary/5 px-2 py-1 rounded-md transition-colors"
                title="Fill Sample 1 (Silty Sand - G:0%, S:36.7%, SC:63.3%)"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                Sample 1
              </button>
              <button
                type="button"
                onClick={() => handleFillSample(2)}
                className="hidden text-[11px] font-medium text-primary hover:underline bg-primary/5 px-2 py-1 rounded-md transition-colors"
                title="Fill Sample 2 (Sandy Silt - G:0.3%, S:58.5%, SC:41.2%)"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                Sample 2
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-medium text-gray-500 dark:text-muted-foreground hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Clear all inputs"
              >
                <RotateCcw className="w-3 h-3 inline mr-1" />
                Clear
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Standard Info Banner */}
        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Soil Fraction Classification Standards (IS 1498)</span>
          </div>
          <div className="text-[11px] text-blue-700/90 dark:text-blue-300/80 pl-5 grid grid-cols-1 md:grid-cols-3 gap-2 pt-0.5">
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-300">Gravel (G):</span> Retained on ≥ 4.75 mm
              (10mm + 4.75mm sieves)
            </div>
            <div>
              <span className="font-semibold text-blue-900 dark:text-blue-300">Sand (S):</span> Retained on 4.75 mm to 0.075 mm
              (2.36mm down to 0.075mm)
            </div>
            <div>
              <span className="font-semibold text-emerald-900 dark:text-emerald-300">Silt & Clay (SC):</span> Passing 0.075 mm
              (Pan & Fines)
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
            <div className="bg-white dark:bg-card px-2.5 py-1 rounded-lg border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground">
              Sum Retained:{' '}
              <span className="font-bold text-gray-900 dark:text-foreground">{calc.sumRetained} g</span>
            </div>
            {calc.totalWeight ? (
              <div
                className={`px-2.5 py-1 rounded-lg border font-medium ${
                  Math.abs(calc.massLoss) > 2
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                }`}
              >
                Recovery: <span className="font-bold">{calc.recoveryPercent}%</span>
                {calc.massLoss !== 0 && (
                  <span className="ml-1 text-[10px] opacity-80">
                    ({calc.massLoss > 0 ? `-${calc.massLoss}g loss` : `+${Math.abs(calc.massLoss)}g`})
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Sieve Weights Table */}
        <div className="border border-gray-200 dark:border-border rounded-xl bg-white dark:bg-card overflow-hidden shadow-sm">
          <div className="max-h-[320px] overflow-y-auto">
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
                {calc.sieveRows.map((row) => (
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
                      {calc.hasData ? `${row.pctRetained}%` : '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-foreground font-medium">
                      {calc.hasData ? `${row.cumPctRetained}%` : '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-primary font-semibold">
                      {calc.hasData ? `${row.finesPassing}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning Alerts */}
        {calc.warnings.length > 0 && (
          <div className="space-y-1.5">
            {calc.warnings.map((w, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* COMPUTED GRAIN SIZE DISTRIBUTION CARDS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-muted-foreground flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-primary" /> Computed Grain Size Distribution (G / S / SC)
            </h4>
            <span className="text-[11px] text-gray-400 dark:text-muted-foreground">
              Total: <span className="font-bold text-gray-700 dark:text-foreground">100.00%</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Gravel Card */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50/70 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/50 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                  Gravel (G)
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-white/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                >
                  ≥ 4.75 mm
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-900 dark:text-amber-100">
                  {calc.gravel !== '' ? `${calc.gravel}%` : '-'}
                </span>
              </div>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1">
                Weight: {calc.gravelWeight} g
              </p>
            </div>

            {/* Sand Card */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50/70 to-cyan-50/50 dark:from-blue-950/30 dark:to-cyan-950/20 border border-blue-200/80 dark:border-blue-800/50 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                  Sand (S)
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-white/80 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/60"
                >
                  4.75mm - 0.075mm
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-900 dark:text-blue-100">
                  {calc.sand !== '' ? `${calc.sand}%` : '-'}
                </span>
              </div>
              <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80 mt-1">
                Weight: {calc.sandWeight} g
              </p>
            </div>

            {/* Silt & Clay Card */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/50 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                  Silt & Clay (SC)
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-white/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                >
                  &lt; 0.075 mm
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                  {calc.siltAndClay !== '' ? `${calc.siltAndClay}%` : '-'}
                </span>
              </div>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                Pan: {calc.panWeight} g (Fines balance)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-gray-100 dark:border-border flex items-center justify-between">
          <div className="text-[11px] text-gray-400 dark:text-muted-foreground italic">
            Applying will populate G, S, SC inputs in the Lab Tests table.
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
              Apply to Grain Size (G/S/SC)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
