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
  FlaskConical,
} from 'lucide-react';
import { calculateSpecificGravity } from '@/utils/specificGravityCalculation';

/**
 * Modal dialog for calculating Specific Gravity (SG) per Density Bottle Method
 */
export default function SpecificGravityModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-01',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [t1M1, setT1M1] = useState('');
  const [t1M2, setT1M2] = useState('');
  const [t1M3, setT1M3] = useState('');
  const [t1M4, setT1M4] = useState('');

  const [t2M1, setT2M1] = useState('');
  const [t2M2, setT2M2] = useState('');
  const [t2M3, setT2M3] = useState('');
  const [t2M4, setT2M4] = useState('');

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      setT1M1(initialData?.t1?.m1 ?? '');
      setT1M2(initialData?.t1?.m2 ?? '');
      setT1M3(initialData?.t1?.m3 ?? '');
      setT1M4(initialData?.t1?.m4 ?? '');

      setT2M1(initialData?.t2?.m1 ?? '');
      setT2M2(initialData?.t2?.m2 ?? '');
      setT2M3(initialData?.t2?.m3 ?? '');
      setT2M4(initialData?.t2?.m4 ?? '');
    }
  }, [isOpen, initialData]);

  // Real-time calculation
  const calc = useMemo(() => {
    return calculateSpecificGravity({
      trial1: { m1: t1M1, m2: t1M2, m3: t1M3, m4: t1M4 },
      trial2: { m1: t2M1, m2: t2M2, m3: t2M3, m4: t2M4 },
    });
  }, [t1M1, t1M2, t1M3, t1M4, t2M1, t2M2, t2M3, t2M4]);

  const handleApply = () => {
    onApply({
      trials: {
        t1: { m1: t1M1, m2: t1M2, m3: t1M3, m4: t1M4, sg: calc.t1.sg },
        t2: { m1: t2M1, m2: t2M2, m3: t2M3, m4: t2M4, sg: calc.t2.sg },
        diff: calc.diff,
        averageSg: calc.averageSg,
        isDiffExceeded: calc.isDiffExceeded,
      },
      averageSg: calc.averageSg,
    });
    onClose();
  };

  const handleClear = () => {
    setT1M1('');
    setT1M2('');
    setT1M3('');
    setT1M4('');
    setT2M1('');
    setT2M2('');
    setT2M3('');
    setT2M4('');
  };

  const handleFillSample = () => {
    // Exact sample values from reference specification
    setT1M1('30.038');
    setT1M2('40.037');
    setT1M3('90.189');
    setT1M4('84.321');

    setT2M1('30.907');
    setT2M2('40.907');
    setT2M3('89.696');
    setT2M4('83.725');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Specific Gravity (SG) Calculation
                  <Badge variant="secondary" className="text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    Density Bottle Method
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-gray-500">
                  Sample: <span className="font-semibold text-gray-700">{boreholeNo}</span>
                  {depth ? <> • Depth: <span className="font-semibold text-gray-700">{depth} m</span></> : null}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSample}
              className="text-xs h-7 border-primary/30 text-primary hover:bg-primary/5"
              title="Autofill sample values from specification"
            >
              Fill Sample Data
            </Button>
          </div>
        </DialogHeader>

        {/* Formula Banner */}
        <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 p-3 rounded-xl border border-amber-100/80 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Formula: SG = (M₂ - M₁) / [(M₄ - M₁) - (M₃ - M₂)]</span>
          </div>
          <p className="text-[11px] text-amber-700 pl-5 leading-relaxed">
            Two trials required for one depth of soil. Specific gravity values are rounded to 2 decimal places. Difference between SG₁ and SG₂ should not exceed 0.03.
          </p>
        </div>

        {/* TRIAL MEASUREMENTS TABLE */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-primary" /> Trial Measurements
          </h4>

          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-50/80 border-b text-[11px] text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Parameter</th>
                  <th className="px-3 py-2.5 text-center w-40">Determination 1 (SG₁)</th>
                  <th className="px-3 py-2.5 text-center w-40">Determination 2 (SG₂)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    Mass of Density Bottle (M₁) (g)
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t1M1}
                      onChange={(e) => setT1M1(e.target.value)}
                      placeholder="e.g. 30.038"
                      className="h-8 text-xs bg-gray-50/40 text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t2M1}
                      onChange={(e) => setT2M1(e.target.value)}
                      placeholder="e.g. 30.907"
                      className="h-8 text-xs bg-gray-50/40 text-center"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    Mass of Density Bottle + Dry soil (M₂) (g)
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t1M2}
                      onChange={(e) => setT1M2(e.target.value)}
                      placeholder="e.g. 40.037"
                      className="h-8 text-xs bg-gray-50/40 text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t2M2}
                      onChange={(e) => setT2M2(e.target.value)}
                      placeholder="e.g. 40.907"
                      className="h-8 text-xs bg-gray-50/40 text-center"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    Mass of Density Bottle + Soil + Water (M₃) (g)
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t1M3}
                      onChange={(e) => setT1M3(e.target.value)}
                      placeholder="e.g. 90.189"
                      className="h-8 text-xs bg-gray-50/40 text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t2M3}
                      onChange={(e) => setT2M3(e.target.value)}
                      placeholder="e.g. 89.696"
                      className="h-8 text-xs bg-gray-50/40 text-center"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    Mass of Density Bottle + Full water (M₄) (g)
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t1M4}
                      onChange={(e) => setT1M4(e.target.value)}
                      placeholder="e.g. 84.321"
                      className="h-8 text-xs bg-gray-50/40 text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={t2M4}
                      onChange={(e) => setT2M4(e.target.value)}
                      placeholder="e.g. 83.725"
                      className="h-8 text-xs bg-gray-50/40 text-center"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Errors */}
        {(calc.t1.errors.length > 0 || calc.t2.errors.length > 0) && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-500" />
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

        {/* Validation Warning: Difference > 0.03 */}
        {calc.isDiffExceeded && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Validation Warning (NOTE 2)</span>
            </div>
            <p className="pl-5 text-[11px] leading-relaxed">
              The difference between SG₁ ({calc.t1.sg}) and SG₂ ({calc.t2.sg}) is <strong>{calc.diff}</strong>, which exceeds the permissible limit of <strong>0.03</strong>.
            </p>
          </div>
        )}

        {/* COMPUTED OUTPUTS */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-primary" /> Computed Specific Gravity
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Trial 1 */}
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-gray-600 font-medium">Trial 1 (SG₁)</span>
                <p className="text-[10px] text-gray-400">Determination 1</p>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-gray-800">
                  {calc.t1.sg !== '' ? calc.t1.sg : '—'}
                </span>
              </div>
            </div>

            {/* Trial 2 */}
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-gray-600 font-medium">Trial 2 (SG₂)</span>
                <p className="text-[10px] text-gray-400">Determination 2</p>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-gray-800">
                  {calc.t2.sg !== '' ? calc.t2.sg : '—'}
                </span>
              </div>
            </div>

            {/* Difference */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              calc.isDiffExceeded
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-gray-50/80 border-gray-100'
            }`}>
              <div>
                <span className={`text-[11px] font-medium ${calc.isDiffExceeded ? 'text-amber-800' : 'text-gray-600'}`}>
                  Difference |SG₁ - SG₂|
                </span>
                <p className="text-[10px] text-gray-400">Limit: ≤ 0.03</p>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`text-xl font-bold ${calc.isDiffExceeded ? 'text-amber-900' : 'text-gray-800'}`}>
                  {calc.diff !== '' ? calc.diff : '—'}
                </span>
                {calc.diff !== '' && (
                  calc.isDiffExceeded ? (
                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
                      &gt; 0.03
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      ✓ OK
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Average SG */}
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-emerald-800 font-bold">
                  Average SG
                </span>
                <p className="text-[10px] text-emerald-600">(SG₁ + SG₂) / 2</p>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-emerald-900">
                  {calc.averageSg !== '' ? calc.averageSg : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-gray-500 hover:text-gray-800 text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={!calc.averageSg || calc.t1.errors.length > 0 || calc.t2.errors.length > 0}
              className="text-xs bg-primary hover:bg-primary/90 text-white flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Apply Specific Gravity
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
