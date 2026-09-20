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
} from 'lucide-react';
import { calculateFreeSwellIndex } from '@/utils/freeSwellIndexCalculation';

/**
 * Modal dialog for calculating Free Swell Index (FSI) per IS 2720 (Part 40)
 */
export default function FreeSwellIndexModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-3',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [t1SoilMass, setT1SoilMass] = useState('10.000');
  const [t1Vd, setT1Vd] = useState('');
  const [t1Vk, setT1Vk] = useState('');

  const [t2SoilMass, setT2SoilMass] = useState('10.000');
  const [t2Vd, setT2Vd] = useState('');
  const [t2Vk, setT2Vk] = useState('');

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      const cleanVal = (v) => (v === '-' || v === undefined || v === null ? '' : String(v));
      setT1SoilMass(cleanVal(initialData?.t1?.soilMass) || '10.000');
      setT1Vd(cleanVal(initialData?.t1?.vd));
      setT1Vk(cleanVal(initialData?.t1?.vk));

      setT2SoilMass(cleanVal(initialData?.t2?.soilMass) || '10.000');
      setT2Vd(cleanVal(initialData?.t2?.vd));
      setT2Vk(cleanVal(initialData?.t2?.vk));
    }
  }, [isOpen, initialData]);

  // Real-time calculation
  const calc = useMemo(() => {
    return calculateFreeSwellIndex({
      trial1: { soilMass: t1SoilMass, vd: t1Vd, vk: t1Vk },
      trial2: { soilMass: t2SoilMass, vd: t2Vd, vk: t2Vk },
    });
  }, [t1SoilMass, t1Vd, t1Vk, t2SoilMass, t2Vd, t2Vk]);

  const handleApply = () => {
    const finalAverageFsi = calc.averageFsi || '-';
    onApply({
      trials: {
        t1: { soilMass: t1SoilMass, vd: t1Vd, vk: t1Vk, fsi: calc.t1.fsi || '-' },
        t2: { soilMass: t2SoilMass, vd: t2Vd, vk: t2Vk, fsi: calc.t2.fsi || '-' },
        averageFsi: finalAverageFsi,
        expansiveness: calc.expansiveness || '',
      },
      averageFsi: finalAverageFsi,
    });
    onClose();
  };

  const handleClear = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setT1SoilMass('10.000');
    setT1Vd('');
    setT1Vk('');
    setT2SoilMass('10.000');
    setT2Vd('');
    setT2Vk('');
  };

  const handleFillSample = () => {
    // Sample data from reference sheet
    setT1SoilMass('10.000');
    setT1Vd('12.000');
    setT1Vk('10.000');

    setT2SoilMass('10.000');
    setT2Vd('12.000');
    setT2Vk('10.000');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-card p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100 dark:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  Free Swell Index (FSI) Calculation
                  <Badge variant="secondary" className="text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                    IS 2720 Part 40
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  Sample: <span className="font-semibold text-gray-700 dark:text-foreground">{boreholeNo}</span>
                  {depth ? <> • Depth: <span className="font-semibold text-gray-700 dark:text-foreground">{depth} m</span></> : null}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSample}
              className="hidden text-xs h-7 border-primary/30 text-primary hover:bg-primary/5"
              title="Autofill sample values from specification"
            >
              Fill Sample Data
            </Button>
          </div>
        </DialogHeader>

        {/* Formula Banner */}
        <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-purple-50/70 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 p-3 rounded-xl border border-purple-100/80 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300">
            <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span>Formula: FSI = [(V_d - V_k) / V_k] × 100</span>
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-400 pl-5 leading-relaxed">
            V_d is soil volume in water after 24 hrs; V_k is soil volume in kerosene after 24 hrs. Conduct two determinations per soil depth and report the average rounded to 2 decimal places.
          </p>
        </div>

        {/* TRIAL MEASUREMENTS TABLE */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-primary" /> Trial Measurements
          </h4>

          <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden bg-white dark:bg-background shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-50/80 dark:bg-muted/40 border-b dark:border-border text-[11px] text-gray-600 dark:text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Parameter</th>
                  <th className="px-3 py-2.5 text-center w-40">Determination 1</th>
                  <th className="px-3 py-2.5 text-center w-40">Determination 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border">
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-700 dark:text-foreground">
                    Mass of dry soil passing sieve (g)
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t1SoilMass}
                      onChange={(e) => setT1SoilMass(e.target.value)}
                      placeholder="10.000"
                      className="h-8 text-xs bg-gray-50/40 dark:bg-muted/30 dark:border-border dark:text-foreground text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t2SoilMass}
                      onChange={(e) => setT2SoilMass(e.target.value)}
                      placeholder="10.000"
                      className="h-8 text-xs bg-gray-50/40 dark:bg-muted/30 dark:border-border dark:text-foreground text-center"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="px-3 py-2 font-medium text-gray-700 dark:text-foreground">
                    Volume in water after 24 hrs (V_d) (ml)
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t1Vd}
                      onChange={(e) => setT1Vd(e.target.value)}
                      placeholder="e.g. 12.000"
                      className="h-8 text-xs bg-gray-50/40 dark:bg-muted/30 dark:border-border dark:text-foreground text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t2Vd}
                      onChange={(e) => setT2Vd(e.target.value)}
                      placeholder="e.g. 12.000"
                      className="h-8 text-xs bg-gray-50/40 dark:bg-muted/30 dark:border-border dark:text-foreground text-center"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="px-3 py-2 font-medium text-gray-700 dark:text-foreground">
                    Volume in kerosene after 24 hrs (V_k) (ml)
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t1Vk}
                      onChange={(e) => setT1Vk(e.target.value)}
                      placeholder="e.g. 10.000"
                      className="h-8 text-xs bg-gray-50/40 dark:bg-muted/30 dark:border-border dark:text-foreground text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t2Vk}
                      onChange={(e) => setT2Vk(e.target.value)}
                      placeholder="e.g. 10.000"
                      className="h-8 text-xs bg-gray-50/40 dark:bg-muted/30 dark:border-border dark:text-foreground text-center"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Errors */}
        {(calc.t1.errors.length > 0 || calc.t2.errors.length > 0) && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
              <span>Input Error</span>
            </div>
            {calc.t1.errors.map((err, i) => (
              <p key={`t1-${i}`} className="pl-5 text-[11px]">• Trial 1: {err}</p>
            ))}
            {calc.t2.errors.map((err, i) => (
              <p key={`t2-${i}`} className="pl-5 text-[11px]">• Trial 2: {err}</p>
            ))}
          </div>
        )}

        {/* COMPUTED OUTPUTS */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-primary" /> Computed Free Swell Index
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Trial 1 */}
            <div className="bg-gray-50/80 dark:bg-muted/30 p-3.5 rounded-xl border border-gray-100 dark:border-border flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">Determination 1 (FSI₁)</span>
                <p className="text-[10px] text-gray-400 dark:text-muted-foreground">[(V_d - V_k) / V_k] × 100</p>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-gray-800 dark:text-foreground">
                  {calc.t1.fsi && calc.t1.fsi !== '-' ? `${calc.t1.fsi}%` : '—'}
                </span>
              </div>
            </div>

            {/* Trial 2 */}
            <div className="bg-gray-50/80 dark:bg-muted/30 p-3.5 rounded-xl border border-gray-100 dark:border-border flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">Determination 2 (FSI₂)</span>
                <p className="text-[10px] text-gray-400 dark:text-muted-foreground">[(V_d - V_k) / V_k] × 100</p>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-gray-800 dark:text-foreground">
                  {calc.t2.fsi && calc.t2.fsi !== '-' ? `${calc.t2.fsi}%` : '—'}
                </span>
              </div>
            </div>

            {/* Average FSI */}
            <div className="bg-purple-50/70 dark:bg-purple-950/25 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/40 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-purple-900 dark:text-purple-300 font-bold flex items-center justify-between">
                  Average FSI
                  {calc.expansiveness && (
                    <Badge variant="outline" className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800">
                      {calc.expansiveness} Swell
                    </Badge>
                  )}
                </span>
                <p className="text-[10px] text-purple-600 dark:text-purple-400">(FSI₁ + FSI₂) / 2</p>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-purple-900 dark:text-purple-200">
                  {calc.averageFsi && calc.averageFsi !== '-' ? `${calc.averageFsi}%` : '—'}
                </span>
              </div>
            </div>
          </div>
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
              className="text-xs dark:bg-muted/30 dark:border-border dark:hover:bg-muted/60"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={calc.t1.errors.length > 0 || calc.t2.errors.length > 0}
              className="text-xs bg-primary hover:bg-primary/90 text-white flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Apply Free Swell Index
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
