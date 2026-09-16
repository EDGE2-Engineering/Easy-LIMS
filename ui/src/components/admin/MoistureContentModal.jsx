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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  RotateCcw,
  Check,
  AlertTriangle,
  Info,
  Layers,
  Droplets,
  Scale,
} from 'lucide-react';
import { calculateMoistureValues } from '@/utils/moistureCalculation';

/**
 * Modal dialog for calculating Moisture Content per IS:2720 (Part II)
 */
export default function MoistureContentModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-1',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [containerNo, setContainerNo] = useState('');
  const [w1, setW1] = useState('');
  const [w2, setW2] = useState('');
  const [w3, setW3] = useState('');
  const [precisionMode, setPrecisionMode] = useState('two_sig_figs');

  // Initialize or reset when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      const cleanVal = (v) => (v === '-' || v === undefined || v === null ? '' : String(v));
      setContainerNo(cleanVal(initialData?.containerNo));
      setW1(cleanVal(initialData?.w1));
      setW2(cleanVal(initialData?.w2));
      setW3(cleanVal(initialData?.w3));
      setPrecisionMode(initialData?.precisionMode || 'two_sig_figs');
    }
  }, [isOpen, initialData]);

  // Real-time calculation
  const calc = useMemo(() => {
    return calculateMoistureValues({ w1, w2, w3, precisionMode });
  }, [w1, w2, w3, precisionMode]);

  const handleApply = () => {
    const finalMoisture = calc.moistureContent || '-';
    onApply({
      containerNo,
      w1: w1 !== '' && w1 !== '-' ? String(w1) : '',
      w2: w2 !== '' && w2 !== '-' ? String(w2) : '',
      w3: w3 !== '' && w3 !== '-' ? String(w3) : '',
      w4: calc.w4 || '-',
      w5: calc.w5 || '-',
      rawMoisture: calc.rawMoisture !== null ? String(calc.rawMoisture.toFixed(2)) : '',
      moistureContent: finalMoisture,
      precisionMode,
    });
    onClose();
  };

  const handleClear = () => {
    setContainerNo('');
    setW1('');
    setW2('');
    setW3('');
  };

  const handleFillSample = (sampleNum) => {
    if (sampleNum === 1) {
      setContainerNo('3');
      setW1('12.59');
      setW2('36.02');
      setW3('33.72');
    } else {
      setContainerNo('4');
      setW1('14.10');
      setW2('38.10');
      setW3('34.88');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-card p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100 dark:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  Moisture Content Calculation
                  <Badge variant="secondary" className="text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
                    IS:2720 (Part II)
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  Sample: <span className="font-semibold text-gray-700 dark:text-foreground">{boreholeNo}</span>
                  {depth ? <> • Depth: <span className="font-semibold text-gray-700 dark:text-foreground">{depth} m</span></> : null}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Info banner about IS 2720 Part 2 */}
        <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 p-3 rounded-xl border border-blue-100/80 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Oven-Drying Method Standard Formulas</span>
          </div>
          <p className="text-[11px] text-blue-700 dark:text-blue-300/80 leading-relaxed pl-5">
            Water content (w) is calculated as the ratio of the weight of water to the weight of dry soil, reported to two significant figures.
          </p>
        </div>

        {/* INPUT FIELDS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-primary" /> Input Measurements
            </h4>
            <div className="flex gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleFillSample(1)}
                className="hidden text-[11px] text-primary hover:underline font-medium"
                title="Fill BH-01 (1.50m) sample data"
              >
                Sample 1
              </button>
              <span className="text-gray-300 dark:text-muted-foreground/40">•</span>
              <button
                type="button"
                onClick={() => handleFillSample(2)}
                className="hidden text-[11px] text-primary hover:underline font-medium"
                title="Fill BH-01 (3.00m) sample data"
              >
                Sample 2
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/60 dark:bg-muted/25 p-4 rounded-xl border border-gray-100 dark:border-border">
            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-foreground flex items-center gap-1">
                Container Number
              </Label>
              <Input
                value={containerNo}
                onChange={(e) => setContainerNo(e.target.value)}
                placeholder="e.g. 3 or C-1"
                className="h-9 mt-1 bg-white dark:bg-background/80 dark:border-border"
              />
              <span className="text-[10px] text-gray-400 dark:text-muted-foreground">Tare tin / container identifier</span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-foreground flex items-center gap-1">
                Weight of Container — w₁ (gm)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={w1}
                onChange={(e) => setW1(e.target.value)}
                placeholder="e.g. 12.59"
                className="h-9 mt-1 bg-white dark:bg-background/80 dark:border-border"
              />
              <span className="text-[10px] text-gray-400 dark:text-muted-foreground">Empty clean dry container</span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-foreground flex items-center gap-1">
                Weight of Container + Wet Soil — w₂ (gm)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={w2}
                onChange={(e) => setW2(e.target.value)}
                placeholder="e.g. 36.02"
                className="h-9 mt-1 bg-white dark:bg-background/80 dark:border-border"
              />
              <span className="text-[10px] text-gray-400 dark:text-muted-foreground">Initial sample before oven drying</span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-foreground flex items-center gap-1">
                Weight of Container + Dry Soil — w₃ (gm)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={w3}
                onChange={(e) => setW3(e.target.value)}
                placeholder="e.g. 33.72"
                className="h-9 mt-1 bg-white dark:bg-background/80 dark:border-border"
              />
              <span className="text-[10px] text-gray-400 dark:text-muted-foreground">After oven drying at 105°C - 110°C</span>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {calc.errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Measurement Discrepancy</span>
            </div>
            {calc.errors.map((err, i) => (
              <p key={i} className="pl-5 text-[11px]">• {err}</p>
            ))}
          </div>
        )}

        {/* COMPUTED OUTPUTS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-blue-500" /> Computed Outputs
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-muted-foreground text-[11px]">Precision:</span>
              <button
                type="button"
                onClick={() => setPrecisionMode('two_sig_figs')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  precisionMode === 'two_sig_figs'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-muted/40 text-gray-600 dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-muted/60 dark:hover:text-foreground'
                }`}
                title="Reported to two significant figures as per IS:2720 Part II"
              >
                2 Sig Figs (IS:2720)
              </button>
              <button
                type="button"
                onClick={() => setPrecisionMode('one_decimal')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  precisionMode === 'one_decimal'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-muted/40 text-gray-600 dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-muted/60 dark:hover:text-foreground'
                }`}
                title="1 Decimal place (e.g. 10.9%, 15.5%)"
              >
                1 Decimal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* w4 */}
            <div className="bg-blue-50/50 dark:bg-blue-950/25 p-3.5 rounded-xl border border-blue-100 dark:border-blue-800/40 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Weight of Water (w₄)</span>
                <p className="text-[10px] text-gray-400 dark:text-muted-foreground">w₄ = w₂ - w₃</p>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {calc.w4 && calc.w4 !== '-' ? calc.w4 : '—'}
                </span>
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">gm</span>
              </div>
            </div>

            {/* w5 */}
            <div className="bg-amber-50/50 dark:bg-amber-950/25 p-3.5 rounded-xl border border-amber-100 dark:border-amber-800/40 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">Weight of Dry Soil (w₅)</span>
                <p className="text-[10px] text-gray-400 dark:text-muted-foreground">w₅ = w₃ - w₁</p>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-amber-900 dark:text-amber-100">
                  {calc.w5 && calc.w5 !== '-' ? calc.w5 : '—'}
                </span>
                <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">gm</span>
              </div>
            </div>

            {/* w (Moisture Content %) */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/25 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between">
                  Moisture Content (w)
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                    {precisionMode === 'two_sig_figs' ? '2 Sig Figs' : '1 Dec'}
                  </span>
                </span>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">w = (w₄ / w₅) × 100</p>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100">
                  {calc.moistureContent && calc.moistureContent !== '-' ? `${calc.moistureContent}%` : '—'}
                </span>
                {calc.rawMoisture !== null && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-normal ml-1">
                    ({calc.rawMoisture.toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reporting Note */}
        <div className="text-[11px] text-gray-500 dark:text-muted-foreground bg-gray-50 dark:bg-muted/30 p-2.5 rounded-lg border border-gray-100 dark:border-border">
          <span className="font-semibold text-gray-700 dark:text-foreground">Note per IS:2720 (Part II): </span>
          The water content (w) shall be reported to two significant figures (e.g. 5.44% → 5.4%, 12.81% → 13%).
        </div>

        <DialogFooter className="pt-3 border-t border-gray-100 dark:border-border flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-gray-500 dark:text-muted-foreground hover:text-gray-800 dark:hover:text-foreground text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </Button>

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
              disabled={calc.errors.length > 0}
              className="text-xs bg-primary hover:bg-primary/90 text-white flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Apply Moisture Content
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
