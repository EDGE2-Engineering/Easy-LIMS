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
  Info,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  KN_TO_KG,
  STANDARD_LOAD_2_5_MM,
  STANDARD_LOAD_5_0_MM,
  DEFAULT_CBR_METADATA,
  DEFAULT_CBR_OBSERVATIONS,
  SAMPLE_CBR_CONVEX,
  SAMPLE_CBR_CONCAVE,
  convertKnToKg,
  calculateCbrTest,
} from '@/utils/labCbrCalculation';
import LabCbrCurveChart from './LabCbrCurveChart';

/**
 * Modal dialog for Lab CBR (California Bearing Ratio) Test per IS 2720 (Part 16)
 */
export default function LabCbrModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-1',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [metadata, setMetadata] = useState({
    ...DEFAULT_CBR_METADATA,
    depth: depth || '',
  });

  const [observations, setObservations] = useState(DEFAULT_CBR_OBSERVATIONS);

  const [correctionMode, setCorrectionMode] = useState('auto'); // 'auto' | 'on' | 'off'
  const [customOffset, setCustomOffset] = useState('');
  const [manualReportedCbr, setManualReportedCbr] = useState('');
  const [selectedReportedChoice, setSelectedReportedChoice] = useState('auto'); // 'auto' | '2.5' | '5.0' | 'manual'

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData?.observations && Array.isArray(initialData.observations) && initialData.observations.length > 0) {
        setObservations(
          initialData.observations.map((obs) => ({
            penetration: obs.penetration,
            loadKn: obs.loadKn !== undefined ? String(obs.loadKn) : '',
            loadKg: obs.loadKg !== undefined ? String(obs.loadKg) : '',
          }))
        );
      } else {
        setObservations(DEFAULT_CBR_OBSERVATIONS);
      }

      setMetadata({
        ...DEFAULT_CBR_METADATA,
        depth: depth || initialData?.depth || '',
        testStartDate: initialData?.testStartDate || '',
        testCompletionDate: initialData?.testCompletionDate || '',
        testNo: initialData?.testNo || '',
        condition: initialData?.condition || 'Soaked',
        soakingDays: initialData?.soakingDays || '4',
        surchargeWeight: initialData?.surchargeWeight || '5.0',
      });

      if (initialData?.zeroOffset !== undefined && initialData?.zeroOffset !== null) {
        setCustomOffset(String(initialData.zeroOffset));
        setCorrectionMode(initialData.isCorrectionApplied ? 'on' : 'off');
      } else {
        setCorrectionMode('auto');
        setCustomOffset('');
      }

      if (initialData?.reportedCbr !== undefined && initialData?.reportedCbr !== null) {
        setManualReportedCbr(String(initialData.reportedCbr));
        setSelectedReportedChoice('manual');
      } else {
        setSelectedReportedChoice('auto');
        setManualReportedCbr('');
      }
    }
  }, [isOpen, initialData, depth]);

  // Handle observation field changes
  const handleObservationChange = (index, field, value) => {
    setObservations((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };

      if (field === 'loadKn') {
        row.loadKn = value;
        row.loadKg = convertKnToKg(value);
      } else if (field === 'loadKg') {
        row.loadKg = value;
        if (value === '' || isNaN(value)) {
          row.loadKn = '';
        } else {
          row.loadKn = (parseFloat(value) / KN_TO_KG).toFixed(2);
        }
      } else {
        row[field] = value;
      }

      copy[index] = row;
      return copy;
    });
  };

  // Perform calculations
  const calcResult = useMemo(() => {
    const isOverridden = correctionMode !== 'auto';
    const correctionEnabled = correctionMode === 'on';
    const parsedCustomOffset = customOffset !== '' && !isNaN(customOffset) ? parseFloat(customOffset) : null;

    return calculateCbrTest(observations, {
      isCorrectionOverridden: isOverridden,
      correctionEnabled,
      customZeroOffset: parsedCustomOffset,
    });
  }, [observations, correctionMode, customOffset]);

  // Determine effective reported CBR value
  const effectiveReportedCbr = useMemo(() => {
    if (!calcResult.isValid) return '';

    if (selectedReportedChoice === '2.5') {
      return calcResult.active.cbr25.toFixed(2);
    }
    if (selectedReportedChoice === '5.0') {
      return calcResult.active.cbr50.toFixed(2);
    }
    if (selectedReportedChoice === 'manual' && manualReportedCbr !== '') {
      return manualReportedCbr;
    }
    // Auto recommendation
    return calcResult.active.reportedCbr.toFixed(2);
  }, [calcResult, selectedReportedChoice, manualReportedCbr]);

  // Quick load samples
  const handleLoadSample = (sampleType) => {
    const sample = sampleType === 'convex' ? SAMPLE_CBR_CONVEX : SAMPLE_CBR_CONCAVE;
    setObservations(sample.observations.map((o) => ({ ...o })));
    setMetadata((prev) => ({
      ...prev,
      ...sample.metadata,
      depth: prev.depth || '1.50',
    }));
    setCorrectionMode(sampleType === 'concave' ? 'on' : 'auto');
    if (sampleType === 'concave') {
      setCustomOffset('1.5');
    } else {
      setCustomOffset('');
    }
    setSelectedReportedChoice('auto');
    setManualReportedCbr('');
  };

  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setObservations(DEFAULT_CBR_OBSERVATIONS);
    setCorrectionMode('auto');
    setCustomOffset('');
    setSelectedReportedChoice('auto');
    setManualReportedCbr('');
  };

  const handleApply = () => {
    const hasAnyInput = observations.some(
      (o) => o.loadKn !== '' && o.loadKn !== '0' && o.loadKg !== '' && o.loadKg !== '0'
    );

    const cbrData = hasAnyInput
      ? {
          condition: metadata.condition,
          soakingDays: metadata.condition === 'Soaked' ? metadata.soakingDays : null,
          surchargeWeight: metadata.condition === 'Soaked' ? metadata.surchargeWeight : null,
          testStartDate: metadata.testStartDate,
          testCompletionDate: metadata.testCompletionDate,
          testNo: metadata.testNo,
          depth: metadata.depth,
          observations,
          isCorrectionApplied: calcResult.isCorrectionApplied,
          zeroOffset: calcResult.effectiveZeroOffset,
          uncorrected: calcResult.uncorrected,
          corrected: calcResult.corrected,
          reportedCbr: effectiveReportedCbr || null,
          cbr25: calcResult.active?.cbr25 ? calcResult.active.cbr25.toFixed(2) : null,
          cbr50: calcResult.active?.cbr50 ? calcResult.active.cbr50.toFixed(2) : null,
          cbrFormatted: effectiveReportedCbr ? `${effectiveReportedCbr}% (${metadata.condition})` : null,
        }
      : null;

    if (onApply) {
      onApply({
        labCbr: cbrData,
        reportedCbr: effectiveReportedCbr || null,
        condition: metadata.condition,
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border dark:border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-border bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  Lab CBR (California Bearing Ratio) Test
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    IS 2720 (Part 16)
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Soil Bearing Ratio determination with automatic Zero-Correction & standard load calibration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 py-1 font-mono text-xs">
                {boreholeNo} {metadata.depth ? `• ${metadata.depth}m` : ''}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Grid */}
          <div className="bg-gray-50/70 dark:bg-muted/30 p-3.5 rounded-xl border border-gray-200/80 dark:border-border/80">
            <div className={`grid grid-cols-2 ${metadata.condition === 'Soaked' ? 'md:grid-cols-7' : 'md:grid-cols-5'} gap-3 text-xs items-end`}>
              <div>
                <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Test No.</Label>
                <Input
                  value={metadata.testNo}
                  onChange={(e) => setMetadata({ ...metadata, testNo: e.target.value })}
                  placeholder="e.g. CBR-01"
                  className="h-8 mt-1 text-xs bg-white dark:bg-background font-mono"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Sample Depth (GL)</Label>
                <Input
                  value={metadata.depth}
                  onChange={(e) => setMetadata({ ...metadata, depth: e.target.value })}
                  placeholder="e.g. 1.50m"
                  className="h-8 mt-1 text-xs bg-white dark:bg-background font-mono"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Test Start Date</Label>
                <Input
                  type="date"
                  value={metadata.testStartDate}
                  onChange={(e) => setMetadata({ ...metadata, testStartDate: e.target.value })}
                  className="h-8 mt-1 text-xs bg-white dark:bg-background"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Completion Date</Label>
                <Input
                  type="date"
                  value={metadata.testCompletionDate}
                  onChange={(e) => setMetadata({ ...metadata, testCompletionDate: e.target.value })}
                  className="h-8 mt-1 text-xs bg-white dark:bg-background"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Condition</Label>
                <Select
                  value={metadata.condition}
                  onValueChange={(val) => setMetadata({ ...metadata, condition: val })}
                >
                  <SelectTrigger className="h-8 mt-1 text-xs bg-white dark:bg-background font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Soaked" className="text-xs">
                      Soaked Condition
                    </SelectItem>
                    <SelectItem value="Unsoaked" className="text-xs">
                      Unsoaked Condition
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Soaking Parameters */}
              {metadata.condition === 'Soaked' && (
                <>
                  <div>
                    <Label className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                      Soaking (Days)
                    </Label>
                    <Input
                      type="number"
                      value={metadata.soakingDays}
                      onChange={(e) => setMetadata({ ...metadata, soakingDays: e.target.value })}
                      placeholder="4"
                      className="h-8 mt-1 text-xs bg-blue-50/40 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                      Surcharge (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={metadata.surchargeWeight}
                      onChange={(e) => setMetadata({ ...metadata, surchargeWeight: e.target.value })}
                      placeholder="5.0"
                      className="h-8 mt-1 text-xs bg-blue-50/40 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Observations Table (5 Cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Observations Table
                  </h4>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadSample('convex')}
                    className="hidden h-7 text-[10px] px-2 text-blue-600 hover:bg-blue-50 border-blue-200 dark:border-blue-800"
                    title="Load Example 1: Uniform Convex curve (No correction required)"
                  >
                    Ex 1 (Convex)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadSample('concave')}
                    className="hidden h-7 text-[10px] px-2 text-amber-600 hover:bg-amber-50 border-amber-200 dark:border-amber-800"
                    title="Load Example 2: Concave curve (Zero correction required)"
                  >
                    Ex 2 (Correction)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-7 text-[10px] px-1.5 text-gray-500 hover:text-red-500"
                    title="Reset all observations"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-muted/50 border-b dark:border-border text-[11px] text-gray-500 dark:text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-center w-20">Penetration (mm)</th>
                      <th className="px-3 py-2 text-center">Load (kN)</th>
                      <th className="px-3 py-2 text-center bg-blue-50/40 dark:bg-blue-950/20">
                        Corrected Load (kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border/60">
                    {observations.map((row, idx) => {
                      const isTarget25 = row.penetration === 2.5;
                      const isTarget50 = row.penetration === 5.0;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isTarget25
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/20 font-medium'
                              : isTarget50
                              ? 'bg-purple-50/30 dark:bg-purple-950/20 font-medium'
                              : 'hover:bg-gray-50/50 dark:hover:bg-muted/30'
                          }`}
                        >
                          <td className="px-3 py-1.5 text-center font-mono text-gray-800 dark:text-gray-200 font-semibold">
                            <span className="flex items-center justify-center gap-1">
                              {row.penetration.toFixed(1)}
                              {isTarget25 && <span className="text-[9px] text-emerald-600">★</span>}
                              {isTarget50 && <span className="text-[9px] text-purple-600">★</span>}
                            </span>
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.loadKn}
                              onChange={(e) => handleObservationChange(idx, 'loadKn', e.target.value)}
                              placeholder="0.00"
                              disabled={row.penetration === 0}
                              className="h-7 text-center text-xs font-mono bg-white dark:bg-background"
                            />
                          </td>
                          <td className="px-2 py-1 bg-blue-50/20 dark:bg-blue-950/10">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.loadKg}
                              onChange={(e) => handleObservationChange(idx, 'loadKg', e.target.value)}
                              placeholder="0.00"
                              disabled={row.penetration === 0}
                              className="h-7 text-center text-xs font-mono font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-background"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-muted-foreground px-1">
                <span>Constant Factor: 1 kN = 101.971621 kg</span>
                <span>Std: IS 2720 Part 16</span>
              </div>
            </div>

            {/* Right Column: Chart & Zero-Correction & Results (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Load-Penetration Curve Chart */}
              <LabCbrCurveChart
                validPoints={calcResult.validPoints}
                tangentLine={calcResult.tangentLine}
                isCorrectionApplied={calcResult.isCorrectionApplied}
                zeroOffset={calcResult.effectiveZeroOffset}
                shiftedPen25={calcResult.corrected?.shiftedPen25 || 2.5}
                shiftedPen50={calcResult.corrected?.shiftedPen50 || 5.0}
                load25={calcResult.active?.cbr25 ? (calcResult.isCorrectionApplied ? calcResult.corrected.load25 : calcResult.uncorrected.load25) : 0}
                load50={calcResult.active?.cbr50 ? (calcResult.isCorrectionApplied ? calcResult.corrected.load50 : calcResult.uncorrected.load50) : 0}
              />

              {/* Zero-Correction Controls Card */}
              <div className="bg-gray-50/80 dark:bg-muted/30 border border-gray-200 dark:border-border rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-gray-800 dark:text-foreground">
                      Zero-Correction (IS 2720 Part 16)
                    </span>
                  </div>

                  {calcResult.isConcaveStart ? (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px]">
                      Concave Start Detected (Correction Required)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 text-[10px]">
                      Convex Start (No Correction Required)
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center pt-1 border-t border-gray-200/60 dark:border-border/60">
                  <div>
                    <Label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      Correction Mode
                    </Label>
                    <Select value={correctionMode} onValueChange={setCorrectionMode}>
                      <SelectTrigger className="h-8 mt-1 text-xs bg-white dark:bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto" className="text-xs">
                          Auto-Detect ({calcResult.isConcaveStart ? 'Apply Correction' : 'No Correction'})
                        </SelectItem>
                        <SelectItem value="on" className="text-xs">
                          Force Enable Zero Correction
                        </SelectItem>
                        <SelectItem value="off" className="text-xs">
                          Disable Correction (Use Raw Curve)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      Zero Offset Origin Shift <span className="font-mono text-amber-600 font-bold">a (mm)</span>
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="5"
                        value={customOffset !== '' ? customOffset : calcResult.autoZeroOffset || ''}
                        onChange={(e) => setCustomOffset(e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-xs font-mono font-semibold bg-white dark:bg-background text-amber-600"
                      />
                      {customOffset !== '' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomOffset('')}
                          className="h-8 text-[11px] px-2 text-gray-500 hover:text-gray-700"
                          title="Reset to auto-calculated tangent intercept"
                        >
                          Auto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {calcResult.isCorrectionApplied && calcResult.effectiveZeroOffset > 0 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 italic bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                    Tangent drawn from maximum slope cuts X-axis at <span className="font-bold font-mono">a = {calcResult.effectiveZeroOffset} mm</span>. Standard penetration points shift to <span className="font-bold font-mono">{calcResult.corrected.shiftedPen25.toFixed(2)} mm</span> and <span className="font-bold font-mono">{calcResult.corrected.shiftedPen50.toFixed(2)} mm</span>.
                  </p>
                )}
              </div>

              {/* CBR Calculations & Results Card */}
              <div className="bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/20 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/10 border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    CBR Calculation Summary
                  </h4>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">
                    Std Loads: 2.5mm = 1370 kg | 5.0mm = 2055 kg
                  </span>
                </div>

                {/* Comparative Table */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* 2.5 mm Box */}
                  <div className="bg-white dark:bg-card p-3 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        CBR at 2.5 mm
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                        Std: 1370 kg
                      </Badge>
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span>Observed Load:</span>
                        <span className="font-mono font-medium">
                          {calcResult.isValid ? `${calcResult.uncorrected.load25.toFixed(2)} kg` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Raw CBR:</span>
                        <span className="font-mono font-medium">
                          {calcResult.isValid ? `${calcResult.uncorrected.cbr25.toFixed(2)}%` : '-'}
                        </span>
                      </div>

                      {calcResult.isCorrectionApplied && (
                        <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-border text-emerald-700 dark:text-emerald-300 font-bold">
                          <span>Corrected CBR:</span>
                          <span className="font-mono">{calcResult.corrected.cbr25.toFixed(2)}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5.0 mm Box */}
                  <div className="bg-white dark:bg-card p-3 rounded-lg border border-purple-200/80 dark:border-purple-800/60 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                        CBR at 5.0 mm
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200">
                        Std: 2055 kg
                      </Badge>
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span>Observed Load:</span>
                        <span className="font-mono font-medium">
                          {calcResult.isValid ? `${calcResult.uncorrected.load50.toFixed(2)} kg` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Raw CBR:</span>
                        <span className="font-mono font-medium">
                          {calcResult.isValid ? `${calcResult.uncorrected.cbr50.toFixed(2)}%` : '-'}
                        </span>
                      </div>

                      {calcResult.isCorrectionApplied && (
                        <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-border text-purple-700 dark:text-purple-300 font-bold">
                          <span>Corrected CBR:</span>
                          <span className="font-mono">{calcResult.corrected.cbr50.toFixed(2)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reported CBR Selection */}
                <div className="bg-white dark:bg-card p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs font-bold text-gray-800 dark:text-foreground flex items-center gap-1.5">
                      Reported CBR Value (%)
                    </Label>
                    <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                      {calcResult.isValid ? calcResult.active.recommendationNote : 'Enter test observations'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-gray-200 dark:border-border p-0.5 bg-gray-50 dark:bg-muted/40 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedReportedChoice('auto')}
                        className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                          selectedReportedChoice === 'auto'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                        }`}
                      >
                        Auto ({calcResult.isValid ? `${calcResult.active.reportedCbr.toFixed(1)}%` : '-'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedReportedChoice('2.5')}
                        className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                          selectedReportedChoice === '2.5'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                        }`}
                      >
                        2.5mm ({calcResult.isValid ? `${calcResult.active.cbr25.toFixed(1)}%` : '-'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedReportedChoice('5.0')}
                        className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                          selectedReportedChoice === '5.0'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                        }`}
                      >
                        5.0mm ({calcResult.isValid ? `${calcResult.active.cbr50.toFixed(1)}%` : '-'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedReportedChoice('manual')}
                        className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                          selectedReportedChoice === 'manual'
                            ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 shadow-xs'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                        }`}
                      >
                        Custom
                      </button>
                    </div>

                    {selectedReportedChoice === 'manual' ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={manualReportedCbr}
                        onChange={(e) => setManualReportedCbr(e.target.value)}
                        placeholder="CBR %"
                        className="h-8 w-20 text-center font-bold text-blue-600 text-xs bg-white dark:bg-background"
                      />
                    ) : (
                      <div className="h-8 px-3 rounded-md bg-blue-600 text-white font-mono font-bold text-sm flex items-center justify-center shadow-sm">
                        {effectiveReportedCbr ? `${effectiveReportedCbr}%` : '—'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-gray-100 dark:border-border bg-gray-50/50 dark:bg-muted/20 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-muted-foreground">
            {effectiveReportedCbr ? (
              <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                Reported CBR: <span className="font-mono text-sm">{effectiveReportedCbr}%</span> ({metadata.condition})
              </span>
            ) : (
              <span>Enter load observations to apply CBR result</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" /> Apply to Lab Form
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
