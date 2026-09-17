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
  Calculator,
  RotateCcw,
  Check,
  AlertTriangle,
  Info,
  Scale,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  calculateShrinkageLimits,
  SAMPLE_SHRINKAGE_DATA,
  DEFAULT_SHRINKAGE_TRIAL,
  MERCURY_SPECIFIC_GRAVITY,
} from '@/utils/shrinkageLimitCalculation';

/**
 * Modal dialog for calculating Shrinkage Limit per IS 2720 (Part 6)
 */
export default function ShrinkageLimitModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-1',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [trials, setTrials] = useState([
    { ...DEFAULT_SHRINKAGE_TRIAL },
    { ...DEFAULT_SHRINKAGE_TRIAL },
    { ...DEFAULT_SHRINKAGE_TRIAL },
  ]);

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData?.trials && Array.isArray(initialData.trials) && initialData.trials.length > 0) {
        const loaded = [0, 1, 2].map((idx) => ({
          ...DEFAULT_SHRINKAGE_TRIAL,
          ...(initialData.trials[idx] || {}),
        }));
        setTrials(loaded);
      } else {
        setTrials([
          { ...DEFAULT_SHRINKAGE_TRIAL },
          { ...DEFAULT_SHRINKAGE_TRIAL },
          { ...DEFAULT_SHRINKAGE_TRIAL },
        ]);
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

  // Real-time calculation
  const calc = useMemo(() => {
    return calculateShrinkageLimits(trials);
  }, [trials]);

  const handleApply = () => {
    const finalSl = calc.averageSlFormatted || '';
    const finalRatio = calc.averageRatioFormatted || '';

    onApply({
      shrinkageLimit: finalSl ? `${finalSl}%` : '',
      shrinkageRatio: finalRatio,
      shrinkageData: {
        trials,
        calculatedTrials: calc.trials,
        averageSl: calc.averageSl,
        averageSlFormatted: calc.averageSlFormatted,
        averageRatio: calc.averageRatio,
        averageRatioFormatted: calc.averageRatioFormatted,
        isCompliant: calc.isCompliant,
        lowerLimit: calc.lowerLimit,
        upperLimit: calc.upperLimit,
      },
    });
    onClose();
  };

  const handleClear = () => {
    setTrials([
      { ...DEFAULT_SHRINKAGE_TRIAL },
      { ...DEFAULT_SHRINKAGE_TRIAL },
      { ...DEFAULT_SHRINKAGE_TRIAL },
    ]);
  };

  const handleFillSample = () => {
    setTrials([
      { ...SAMPLE_SHRINKAGE_DATA.trials[0] },
      { ...SAMPLE_SHRINKAGE_DATA.trials[1] },
      { ...DEFAULT_SHRINKAGE_TRIAL },
    ]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white dark:bg-card p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-border max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100 dark:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  Shrinkage Limit & Shrinkage Ratio
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40"
                  >
                    IS 2720 Part 6
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSample}
              className="hidden text-xs h-8 border-primary/30 text-primary hover:bg-primary/5 flex items-center gap-1.5"
              title="Autofill sample values from test sheet"
            >
              <Sparkles className="w-3.5 h-3.5" /> Fill Sample Data
            </Button>
          </div>
        </DialogHeader>

        {/* Formula & Rule Banner */}
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-blue-50/70 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/30 p-3 rounded-xl border border-blue-100/80 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Formula: W_s (%) = w - [ (V - V₀) / W₀ ] × 100 &nbsp;|&nbsp; Ratio: R = W₀ / V₀</span>
          </div>
          <p className="text-[11px] text-blue-700 dark:text-blue-300/80 pl-5 leading-relaxed">
            Specific gravity of mercury = <strong>13.6</strong>. Repeat for up to 3 trials.
            Individual trial values should lie within <strong>±2%</strong> of the average Shrinkage Limit.
          </p>
        </div>

        {/* COMPLIANCE ALERT IF VARIATION > 2% */}
        {!calc.isCompliant && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">IS Code Variation Warning: </span>
              {calc.warningMessage}
            </div>
          </div>
        )}

        {/* OBSERVATION TABLE */}
        <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-muted/40 border-b border-gray-200 dark:border-border text-gray-700 dark:text-gray-300 font-semibold">
                  <th className="p-2.5 w-12 text-center">Sl</th>
                  <th className="p-2.5">Observations / Parameters</th>
                  <th className="p-2.5 w-28 text-center bg-blue-50/30 dark:bg-blue-950/20">Trial - 1</th>
                  <th className="p-2.5 w-28 text-center bg-indigo-50/30 dark:bg-indigo-950/20">Trial - 2</th>
                  <th className="p-2.5 w-28 text-center bg-purple-50/30 dark:bg-purple-950/20">Trial - 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border/60">
                {/* 1. Shrinkage dish No */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">1</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">Shrinkage dish No</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        value={trials[i].dishNo}
                        onChange={(e) => handleTrialChange(i, 'dishNo', e.target.value)}
                        placeholder="e.g. 11"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 2. Empty wt of Shrinkage dish (M1) */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">2</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">
                    Empty weight of Shrinkage dish (g) <span className="font-semibold text-primary">(M₁)</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={trials[i].m1}
                        onChange={(e) => handleTrialChange(i, 'm1', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 3. Wt of Shrinkage dish + wet Soil Pat (M2) */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">3</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">
                    Weight of Shrinkage dish + wet Soil Pat (g) <span className="font-semibold text-primary">(M₂)</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={trials[i].m2}
                        onChange={(e) => handleTrialChange(i, 'm2', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 4. Wt of Shrinkage dish + dry soil Pat (M3) */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">4</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">
                    Weight of Shrinkage dish + dry soil Pat (g) <span className="font-semibold text-primary">(M₃)</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={trials[i].m3}
                        onChange={(e) => handleTrialChange(i, 'm3', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 5. Weight of dry soil Pat (W0) = M3 - M1 */}
                <tr className="bg-gray-50/40 dark:bg-muted/20">
                  <td className="p-2 text-center text-gray-500 font-medium">5</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-200">
                    Weight of dry soil Pat (W₀) (g) <span className="text-[10px] text-gray-400">[M₃ − M₁]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {calc.trials[i]?.w0 !== null ? calc.trials[i].w0.toFixed(3) : '-'}
                    </td>
                  ))}
                </tr>

                {/* 6. Weight of wet Soil Pat (Mw) = M2 - M1 */}
                <tr className="bg-gray-50/40 dark:bg-muted/20">
                  <td className="p-2 text-center text-gray-500 font-medium">6</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-200">
                    Weight of wet Soil Pat (M_w) (g) <span className="text-[10px] text-gray-400">[M₂ − M₁]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {calc.trials[i]?.mw !== null ? calc.trials[i].mw.toFixed(3) : '-'}
                    </td>
                  ))}
                </tr>

                {/* 7. Weight of water = M2 - M3 */}
                <tr className="bg-gray-50/40 dark:bg-muted/20">
                  <td className="p-2 text-center text-gray-500 font-medium">7</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-200">
                    Weight of water (g) <span className="text-[10px] text-gray-400">[M₂ − M₃]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {calc.trials[i]?.waterWeight !== null ? calc.trials[i].waterWeight.toFixed(3) : '-'}
                    </td>
                  ))}
                </tr>

                {/* 8. Moisture Content of Soil Pat (%) */}
                <tr className="bg-blue-50/20 dark:bg-blue-950/20 font-medium">
                  <td className="p-2 text-center text-gray-500 font-medium">8</td>
                  <td className="p-2 text-blue-900 dark:text-blue-300">
                    Moisture Content of Soil Pat (%) <span className="text-[10px] text-blue-600/70">[(M_w − W₀) / W₀ × 100]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-bold text-blue-700 dark:text-blue-300">
                      {calc.trials[i]?.moistureContent !== null ? `${calc.trials[i].moistureContent.toFixed(3)}%` : '-'}
                    </td>
                  ))}
                </tr>

                {/* 9. Shrinkage dish No */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">9</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">Shrinkage dish No</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center text-gray-600 dark:text-gray-400">
                      {trials[i].dishNo || '-'}
                    </td>
                  ))}
                </tr>

                {/* 10. Wt of dish + mercury filled shrinkage dish */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">10</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">
                    Weight of shrinkage dish + mercury filled dish (g)
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={trials[i].dishMercuryFilled}
                        onChange={(e) => handleTrialChange(i, 'dishMercuryFilled', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 11. Empty wt of shrinkage dish */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">11</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">
                    Empty weight of shrinkage dish (g) <span className="text-[10px] text-gray-400">[from Row 2]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center text-gray-600 dark:text-gray-400">
                      {trials[i].m1 || '-'}
                    </td>
                  ))}
                </tr>

                {/* 12. Weight of mercury filling shrinkage dish */}
                <tr className="bg-gray-50/40 dark:bg-muted/20">
                  <td className="p-2 text-center text-gray-500 font-medium">12</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-200">
                    Weight of mercury filling shrinkage dish (g) <span className="text-[10px] text-gray-400">[Row 10 − Row 11]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {calc.trials[i]?.mercuryInDish !== null ? calc.trials[i].mercuryInDish.toFixed(3) : '-'}
                    </td>
                  ))}
                </tr>

                {/* 13. Volume of Shrinkage dish / wet Soil Pat (V) */}
                <tr className="bg-blue-50/20 dark:bg-blue-950/20 font-medium">
                  <td className="p-2 text-center text-gray-500 font-medium">13</td>
                  <td className="p-2 text-blue-900 dark:text-blue-300">
                    Volume of wet soil Pat (V) (ml) <span className="text-[10px] text-blue-600/70">[Row 12 / 13.6]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-bold text-blue-700 dark:text-blue-300">
                      {calc.trials[i]?.v !== null ? calc.trials[i].v.toFixed(3) : '-'}
                    </td>
                  ))}
                </tr>

                {/* 14. Glass Cup No */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">14</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">Glass Cup No</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        value={trials[i].cupNo}
                        onChange={(e) => handleTrialChange(i, 'cupNo', e.target.value)}
                        placeholder="e.g. 1"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 15. Empty weight of Glass Cup */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">15</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">Empty weight of Glass Cup (g)</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={trials[i].emptyCupWeight}
                        onChange={(e) => handleTrialChange(i, 'emptyCupWeight', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 16. Wt of Glass Cup + mercury fully filled */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">16</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">
                    Weight of Glass Cup + mercury fully filled (g)
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={trials[i].cupMercuryFilled}
                        onChange={(e) => handleTrialChange(i, 'cupMercuryFilled', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 17. Wt of Glass Cup + mercury after immersion */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">17</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">
                    Weight of Glass Cup + mercury after immersion of dry soil pat (g)
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-1.5 text-center">
                      <Input
                        type="number"
                        step="any"
                        value={trials[i].cupMercuryImmersed}
                        onChange={(e) => handleTrialChange(i, 'cupMercuryImmersed', e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>

                {/* 18. Wt of mercury displaced by dry soil pat */}
                <tr className="bg-gray-50/40 dark:bg-muted/20">
                  <td className="p-2 text-center text-gray-500 font-medium">18</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-200">
                    Weight of mercury displaced by dry soil pat (g) <span className="text-[10px] text-gray-400">[Row 16 − Row 17]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {calc.trials[i]?.mercuryDisplaced !== null ? calc.trials[i].mercuryDisplaced.toFixed(3) : '-'}
                    </td>
                  ))}
                </tr>

                {/* 19. Specific gravity of mercury */}
                <tr className="hover:bg-gray-50/40 dark:hover:bg-muted/10">
                  <td className="p-2 text-center text-gray-500 font-medium">19</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">Specific gravity of mercury</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-semibold text-gray-500 dark:text-gray-400">
                      13.6
                    </td>
                  ))}
                </tr>

                {/* 20. Volume of dry soil Pat (V0) */}
                <tr className="bg-blue-50/20 dark:bg-blue-950/20 font-medium">
                  <td className="p-2 text-center text-gray-500 font-medium">20</td>
                  <td className="p-2 text-blue-900 dark:text-blue-300">
                    Volume of dry soil Pat (V₀) (ml) <span className="text-[10px] text-blue-600/70">[Row 18 / 13.6]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center font-bold text-blue-700 dark:text-blue-300">
                      {calc.trials[i]?.v0 !== null ? calc.trials[i].v0.toFixed(3) : '-'}
                    </td>
                  ))}
                </tr>

                {/* 21. Shrinkage limit (Ws %) */}
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/30 font-bold border-t-2 border-emerald-200 dark:border-emerald-800">
                  <td className="p-2.5 text-center text-emerald-800 dark:text-emerald-300 font-bold">21</td>
                  <td className="p-2.5 text-emerald-900 dark:text-emerald-200">
                    Shrinkage Limit (W_s) (%) <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">[w − ((V − V₀)/W₀) × 100]</span>
                  </td>
                  {[0, 1, 2].map((i) => {
                    const isDeviating = calc.deviatingTrialIndices.includes(i);
                    return (
                      <td
                        key={i}
                        className={`p-2 text-center text-sm ${
                          isDeviating ? 'text-amber-600 font-extrabold underline' : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {calc.trials[i]?.shrinkageLimit !== null ? `${calc.trials[i].shrinkageLimit.toFixed(2)}%` : '-'}
                      </td>
                    );
                  })}
                </tr>

                {/* 22. Shrinkage Ratio (R) */}
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/30 font-bold">
                  <td className="p-2.5 text-center text-emerald-800 dark:text-emerald-300 font-bold">22</td>
                  <td className="p-2.5 text-emerald-900 dark:text-emerald-200">
                    Shrinkage Ratio (R) <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">[W₀ / V₀]</span>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="p-2 text-center text-sm text-emerald-700 dark:text-emerald-300">
                      {calc.trials[i]?.shrinkageRatio !== null ? calc.trials[i].shrinkageRatio.toFixed(2) : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RESULTS SUMMARY BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-muted/40 rounded-xl border border-gray-200 dark:border-border">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-muted-foreground font-semibold block">
              Average Shrinkage Limit (SL)
            </span>
            <div className="text-xl font-bold text-gray-900 dark:text-foreground mt-0.5">
              {calc.averageSlFormatted ? `${calc.averageSlFormatted}%` : '—'}
            </div>
            <span className="text-[10px] text-gray-400 block mt-0.5">Reported value</span>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-muted/40 rounded-xl border border-gray-200 dark:border-border">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-muted-foreground font-semibold block">
              Average Shrinkage Ratio (R)
            </span>
            <div className="text-xl font-bold text-gray-900 dark:text-foreground mt-0.5">
              {calc.averageRatioFormatted || '—'}
            </div>
            <span className="text-[10px] text-gray-400 block mt-0.5">R = W₀ / V₀</span>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-muted/40 rounded-xl border border-gray-200 dark:border-border">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-muted-foreground font-semibold block">
              IS Code Validation (±2%)
            </span>
            <div className="text-sm font-bold mt-1">
              {calc.validCount > 0 ? (
                calc.isCompliant ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Within ±2% Limits
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> &gt; 2% Variation
                  </span>
                )
              ) : (
                <span className="text-gray-400">Awaiting inputs</span>
              )}
            </div>
            {calc.lowerLimit !== null && (
              <span className="text-[10px] text-gray-500 dark:text-muted-foreground block mt-0.5">
                Allowed: {calc.lowerLimit.toFixed(2)}% — {calc.upperLimit.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear All
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={calc.validCount === 0}
              className="text-xs bg-primary text-primary-foreground font-semibold"
            >
              <Check className="w-4 h-4 mr-1" /> Apply to Lab Test
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
