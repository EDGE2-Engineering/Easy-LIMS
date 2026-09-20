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
  Plus,
  Trash2,
  Info,
  Sparkles,
  Weight,
} from 'lucide-react';
import {
  calculateCompactionTest,
  MOULD_PRESETS,
  DEFAULT_COMPACTION_ROW,
  SAMPLE_HEAVY_COMPACTION_DATA,
  roundOmcByISCode,
} from '@/utils/compactionCalculation';
import CompactionCurveChart from './CompactionCurveChart';

/**
 * Modal dialog for Heavy Compaction Test per IS 2720 (Part 8)
 */
export default function HeavyCompactionModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-1',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [mouldType, setMouldType] = useState('HEAVY_SMALL'); // 'HEAVY_SMALL' or 'HEAVY_BIG'
  const [trials, setTrials] = useState([
    { ...DEFAULT_COMPACTION_ROW },
    { ...DEFAULT_COMPACTION_ROW },
    { ...DEFAULT_COMPACTION_ROW },
    { ...DEFAULT_COMPACTION_ROW },
    { ...DEFAULT_COMPACTION_ROW },
  ]);

  const [manualPeak, setManualPeak] = useState({
    enabled: false,
    mdd: '',
    omc: '',
  });

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData?.mouldType) {
        setMouldType(initialData.mouldType);
      } else {
        setMouldType('HEAVY_SMALL');
      }

      if (initialData?.trials && Array.isArray(initialData.trials) && initialData.trials.length > 0) {
        setTrials(initialData.trials.map((t) => ({ ...DEFAULT_COMPACTION_ROW, ...t })));
      } else {
        setTrials([
          { ...DEFAULT_COMPACTION_ROW },
          { ...DEFAULT_COMPACTION_ROW },
          { ...DEFAULT_COMPACTION_ROW },
          { ...DEFAULT_COMPACTION_ROW },
          { ...DEFAULT_COMPACTION_ROW },
        ]);
      }

      if (initialData?.manualPeak) {
        setManualPeak(initialData.manualPeak);
      } else {
        setManualPeak({ enabled: false, mdd: '', omc: '' });
      }
    }
  }, [isOpen, initialData]);

  const handleTrialChange = (trialIndex, field, val) => {
    setTrials((prev) => {
      const copy = [...prev];
      copy[trialIndex] = {
        ...copy[trialIndex],
        [field]: val,
      };
      return copy;
    });
  };

  const handleAddTrial = () => {
    if (trials.length < 8) {
      setTrials((prev) => [...prev, { ...DEFAULT_COMPACTION_ROW }]);
    }
  };

  const handleRemoveTrial = (indexToRemove) => {
    if (trials.length > 3) {
      setTrials((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    }
  };

  // Real-time calculations
  const calc = useMemo(() => {
    return calculateCompactionTest({
      mouldType,
      trials,
      manualMdd: manualPeak.enabled && manualPeak.mdd ? parseFloat(manualPeak.mdd) : null,
      manualOmc: manualPeak.enabled && manualPeak.omc ? parseFloat(manualPeak.omc) : null,
    });
  }, [mouldType, trials, manualPeak]);

  const handleApply = () => {
    const finalMdd = calc.mdd || '';
    const finalOmc = calc.omc || '';
    const hasAnyInput =
      trials.some((t) =>
        ['mouldPlusWetSoil', 'containerNo', 'containerWeight', 'containerPlusWetSoil', 'containerPlusDrySoil'].some(
          (k) => t[k] !== '' && t[k] !== null && t[k] !== undefined
        )
      ) || Boolean(manualPeak.enabled && (manualPeak.mdd || manualPeak.omc));

    onApply({
      heavyCompaction: hasAnyInput
        ? {
            mouldType,
            mdd: finalMdd,
            omc: finalOmc,
            mddFormatted: calc.mddFormatted,
            omcFormatted: calc.omcFormatted,
            rawMdd: calc.rawMdd,
            rawOmc: calc.rawOmc,
            mould: MOULD_PRESETS[mouldType],
            trials,
            calculatedTrials: calc.trials,
            manualPeak,
          }
        : null,
    });
    onClose();
  };

  const handleClear = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setTrials([
      { ...DEFAULT_COMPACTION_ROW },
      { ...DEFAULT_COMPACTION_ROW },
      { ...DEFAULT_COMPACTION_ROW },
      { ...DEFAULT_COMPACTION_ROW },
      { ...DEFAULT_COMPACTION_ROW },
    ]);
    setManualPeak({ enabled: false, mdd: '', omc: '' });
  };

  const handleFillSample = () => {
    setMouldType('HEAVY_SMALL');
    setTrials(SAMPLE_HEAVY_COMPACTION_DATA.trials.map((t) => ({ ...t })));
    setManualPeak({ enabled: false, mdd: '', omc: '' });
  };

  const mould = MOULD_PRESETS[mouldType] || MOULD_PRESETS.HEAVY_SMALL;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-white dark:bg-card p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-border max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100 dark:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Weight className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  Heavy Compaction Test
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                  >
                    IS 2720 Part 8
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillSample}
                className="hidden text-xs h-8 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/5 items-center gap-1.5"
                title="Autofill sample values from reference sheet"
              >
                <Sparkles className="w-3.5 h-3.5" /> Fill Sample Data
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* MOULD SELECTOR & SPECS */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-muted/30 border border-gray-200 dark:border-border space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Select Mould:</span>
              <Select value={mouldType} onValueChange={setMouldType}>
                <SelectTrigger className="w-[260px] h-8 text-xs bg-white dark:bg-card">
                  <SelectValue placeholder="Choose mould" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HEAVY_SMALL">Small Mould (1000 cm³ • 25 blows)</SelectItem>
                  <SelectItem value="HEAVY_BIG">Big Mould (2250 cm³ • 55 blows)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-[11px] text-gray-500 italic">
              Height of fall: 45 cm • 5 layers for both moulds
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2 border-t border-gray-200/60 dark:border-border/60 text-[11px]">
            <div>
              <span className="text-gray-400 block text-[10px]">Empty Wt (W₁)</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{mould.emptyWeight} g</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Diameter</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{mould.diameter} cm</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Length</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{mould.length} cm</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Volume</span>
              <span className="font-bold text-primary">{mould.volume} cm³</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Height of Fall</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{mould.heightOfFall} cm</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Blows / Layer</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{mould.blows} times</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">No of Layers</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{mould.layers} layers</span>
            </div>
          </div>
        </div>

        {/* OBSERVATION TABLE */}
        <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-muted/40 border-b border-gray-200 dark:border-border text-gray-700 dark:text-gray-300 font-semibold">
                  <th className="p-2 w-10 text-center">Row</th>
                  <th className="p-2 min-w-[180px]">Parameters / Determination</th>
                  <th className="p-2 w-14 text-center">Unit</th>
                  {trials.map((_, i) => (
                    <th key={i} className="p-2 text-center min-w-[90px] bg-purple-50/20 dark:bg-purple-950/10">
                      <div className="flex items-center justify-center gap-1">
                        <span>Trial {i + 1}</span>
                        {trials.length > 3 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTrial(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                            title="Remove trial"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border/60">
                {/* R1: Determination No */}
                <tr className="bg-gray-50/20">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R1</td>
                  <td className="p-1.5 text-gray-700 dark:text-gray-300 font-medium">Determination No</td>
                  <td className="p-1.5 text-center text-gray-400">nos</td>
                  {trials.map((_, i) => (
                    <td key={i} className="p-1.5 text-center font-bold text-gray-700 dark:text-gray-300">
                      {i + 1}
                    </td>
                  ))}
                </tr>

                {/* R2: Wt of Mould + wet Soil (W2) */}
                <tr className="hover:bg-gray-50/40">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R2</td>
                  <td className="p-1.5 text-gray-800 dark:text-gray-200 font-medium">
                    Wt of Mould + wet Soil <span className="text-primary font-bold">(W₂)</span>
                  </td>
                  <td className="p-1.5 text-center text-gray-500">gms</td>
                  {trials.map((t, i) => (
                    <td key={i} className="p-1 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={t.mouldPlusWetSoil}
                        onChange={(e) => handleTrialChange(i, 'mouldPlusWetSoil', e.target.value)}
                        placeholder="0"
                        className="h-7 text-xs text-center font-medium"
                      />
                    </td>
                  ))}
                </tr>

                {/* R3: Wt of wet Soil = W2 - W1 */}
                <tr className="bg-gray-50/40 dark:bg-muted/20">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R3</td>
                  <td className="p-1.5 text-gray-700 dark:text-gray-300">
                    Wt of wet Soil <span className="text-[10px] text-gray-400">[W₂ − W₁]</span>
                  </td>
                  <td className="p-1.5 text-center text-gray-500">gms</td>
                  {trials.map((_, i) => (
                    <td key={i} className="p-1.5 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {calc.trials[i]?.wetSoilWeight !== null ? calc.trials[i].wetSoilWeight : '—'}
                    </td>
                  ))}
                </tr>

                {/* R4: Bulk Density = R3 / Volume */}
                <tr className="bg-purple-50/20 dark:bg-purple-950/20 font-medium">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R4</td>
                  <td className="p-1.5 text-purple-900 dark:text-purple-300">
                    Bulk Density <span className="text-[10px] text-purple-700/70">[R₃ / Volume]</span>
                  </td>
                  <td className="p-1.5 text-center text-purple-700">g/cc</td>
                  {trials.map((_, i) => (
                    <td key={i} className="p-1.5 text-center font-bold text-purple-700 dark:text-purple-300">
                      {calc.trials[i]?.bulkDensityFormatted || '—'}
                    </td>
                  ))}
                </tr>

                {/* R5: Container No */}
                <tr className="hover:bg-gray-50/40">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R5</td>
                  <td className="p-1.5 text-gray-700 dark:text-gray-300">Container No</td>
                  <td className="p-1.5 text-center text-gray-400">nos</td>
                  {trials.map((t, i) => (
                    <td key={i} className="p-1 text-center">
                      <Input
                        value={t.containerNo}
                        onChange={(e) => handleTrialChange(i, 'containerNo', e.target.value)}
                        placeholder="Cont #"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* R6: Wt of Container */}
                <tr className="hover:bg-gray-50/40">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R6</td>
                  <td className="p-1.5 text-gray-700 dark:text-gray-300">Wt of Container</td>
                  <td className="p-1.5 text-center text-gray-500">gms</td>
                  {trials.map((t, i) => (
                    <td key={i} className="p-1 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={t.containerWeight}
                        onChange={(e) => handleTrialChange(i, 'containerWeight', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* R7: Wt of Container + wet Soil */}
                <tr className="hover:bg-gray-50/40">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R7</td>
                  <td className="p-1.5 text-gray-700 dark:text-gray-300">Wt of Container + wet Soil</td>
                  <td className="p-1.5 text-center text-gray-500">gms</td>
                  {trials.map((t, i) => (
                    <td key={i} className="p-1 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={t.containerPlusWetSoil}
                        onChange={(e) => handleTrialChange(i, 'containerPlusWetSoil', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* R8: Wt of Container + dry Soil */}
                <tr className="hover:bg-gray-50/40">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R8</td>
                  <td className="p-1.5 text-gray-700 dark:text-gray-300">Wt of Container + dry Soil</td>
                  <td className="p-1.5 text-center text-gray-500">gms</td>
                  {trials.map((t, i) => (
                    <td key={i} className="p-1 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={t.containerPlusDrySoil}
                        onChange={(e) => handleTrialChange(i, 'containerPlusDrySoil', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* R9: Wt of water = R7 - R8 */}
                <tr className="bg-gray-50/40 dark:bg-muted/20">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R9</td>
                  <td className="p-1.5 text-gray-700 dark:text-gray-300">
                    Wt of water <span className="text-[10px] text-gray-400">[R₇ − R₈]</span>
                  </td>
                  <td className="p-1.5 text-center text-gray-500">gms</td>
                  {trials.map((_, i) => (
                    <td key={i} className="p-1.5 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {calc.trials[i]?.waterWeight !== null ? calc.trials[i].waterWeight : '—'}
                    </td>
                  ))}
                </tr>

                {/* R10: Wt of dry Soil = R8 - R6 */}
                <tr className="bg-gray-50/40 dark:bg-muted/20">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R10</td>
                  <td className="p-1.5 text-gray-700 dark:text-gray-300">
                    Wt of dry Soil <span className="text-[10px] text-gray-400">[R₈ − R₆]</span>
                  </td>
                  <td className="p-1.5 text-center text-gray-500">gms</td>
                  {trials.map((_, i) => (
                    <td key={i} className="p-1.5 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {calc.trials[i]?.drySoilWeight !== null ? calc.trials[i].drySoilWeight : '—'}
                    </td>
                  ))}
                </tr>

                {/* R11: Moisture Content % */}
                <tr className="bg-blue-50/30 dark:bg-blue-950/20 font-medium">
                  <td className="p-1.5 text-center text-gray-400 font-mono">R11</td>
                  <td className="p-1.5 text-blue-900 dark:text-blue-300">
                    Moisture Content (%) <span className="text-[10px] text-blue-600/70">[(R₉ / R₁₀) × 100]</span>
                  </td>
                  <td className="p-1.5 text-center text-blue-700">%</td>
                  {trials.map((_, i) => (
                    <td key={i} className="p-1.5 text-center font-bold text-blue-700 dark:text-blue-300">
                      {calc.trials[i]?.moistureContentFormatted ? `${calc.trials[i].moistureContentFormatted}%` : '—'}
                    </td>
                  ))}
                </tr>

                {/* R12: Dry Density (g/cc) */}
                <tr className="bg-emerald-50/50 dark:bg-emerald-950/30 font-bold border-t border-emerald-200 dark:border-emerald-800">
                  <td className="p-2 text-center text-emerald-800 font-mono">R12</td>
                  <td className="p-2 text-emerald-900 dark:text-emerald-200">
                    Dry Density (g/cc) <span className="text-[10px] font-normal text-emerald-700">[R₄ / ((R₁₁ / 100) + 1)]</span>
                  </td>
                  <td className="p-2 text-center text-emerald-700">g/cc</td>
                  {trials.map((_, i) => (
                    <td key={i} className="p-2 text-center font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                      {calc.trials[i]?.dryDensityFormatted || '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {trials.length < 8 && (
            <div className="p-2 bg-gray-50/50 dark:bg-muted/20 border-t border-gray-100 dark:border-border flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTrial}
                className="text-xs h-7 border-dashed border-gray-300 text-primary hover:bg-primary/5"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Determination ({trials.length + 1})
              </Button>
            </div>
          )}
        </div>

        {/* COMPACTION CURVE CHART */}
        <CompactionCurveChart
          validPoints={calc.validPoints}
          curveFit={calc.curveFit}
          peakMdd={calc.rawMdd}
          peakOmc={calc.rawOmc}
        />

        {/* PEAK SUMMARY CARD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
              Maximum Dry Density (MDD)
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-foreground mt-1 flex items-baseline gap-1.5">
              {calc.mdd ? `${calc.mdd}` : '—'}
              <span className="text-sm font-medium text-gray-500">g/cc</span>
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              Reported to 2 decimal places per IS 2720
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Optimum Moisture Content (OMC)
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-foreground mt-1 flex items-baseline gap-1.5">
              {calc.omc ? `${calc.omc}` : '—'}
              <span className="text-sm font-medium text-gray-500">%</span>
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              Rounded per IS Code (&lt;5% → 0.2%, 5-10% → 0.5%, &gt;10% → whole 1%)
            </span>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-border gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-xs text-gray-600 dark:text-gray-400 gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear All
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="text-xs bg-primary text-primary-foreground font-semibold"
          >
            <Check className="w-4 h-4 mr-1" /> Apply to Lab Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
