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
  Plus,
  Trash2,
  Box,
  Calendar,
  AlertTriangle,
  Scale,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  CircleDot,
} from 'lucide-react';
import {
  DEFAULT_CONCRETE_CORE_METADATA,
  DEFAULT_CONCRETE_CORE_OBSERVATIONS,
  DEFAULT_CONCRETE_CORE_OBSERVATION,
  SAMPLE_CONCRETE_CORE_TEST_DATA,
  calculateConcreteCoreTest,
} from '@/utils/concreteCoreTestCalculation';

const CONCRETE_GRADES = [
  'M10',
  'M15',
  'M20',
  'M25',
  'M30',
  'M35',
  'M40',
  'M45',
  'M50',
  'M55',
  'M60',
  'Not furnished',
  'Custom',
];

/**
 * Modal dialog for Concrete Core Compressive Strength Test
 * Standard: IS 516 (part 4) : 2018
 */
export default function ConcreteCoreModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [metadata, setMetadata] = useState(DEFAULT_CONCRETE_CORE_METADATA);
  const [observations, setObservations] = useState(DEFAULT_CONCRETE_CORE_OBSERVATIONS);

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData?.observations && Array.isArray(initialData.observations) && initialData.observations.length > 0) {
        setObservations(
          initialData.observations.map((obs, idx) => ({
            identification: obs.identification !== undefined ? String(obs.identification) : `Core ${idx + 1}`,
            extractionDate: obs.extractionDate || 'Not furnished',
            length: obs.length !== undefined ? String(obs.length) : '198.00',
            dia: obs.dia !== undefined ? String(obs.dia) : '145.00',
            weightKg: obs.weightKg !== undefined ? String(obs.weightKg) : '',
            failureLoadKn: obs.failureLoadKn !== undefined ? String(obs.failureLoadKn) : '',
            failureType: obs.failureType || 'Satisfactory',
          }))
        );
      } else {
        setObservations([
          { ...DEFAULT_CONCRETE_CORE_OBSERVATION, identification: sampleCode ? `${sampleCode}-1` : 'Not furnished' },
          { ...DEFAULT_CONCRETE_CORE_OBSERVATION, identification: sampleCode ? `${sampleCode}-2` : 'Not furnished' },
        ]);
      }

      setMetadata({
        ...DEFAULT_CONCRETE_CORE_METADATA,
        gradeOfConcrete: initialData?.gradeOfConcrete || initialData?.metadata?.gradeOfConcrete || 'M35',
        standard: initialData?.standard || initialData?.metadata?.standard || 'IS 516 (part 4) : 2018',
        numberOfSamples: initialData?.observations?.length || 2,
        cappingMaterial: initialData?.cappingMaterial || initialData?.metadata?.cappingMaterial || 'Epoxy, Ep 10',
        periodOfTest: initialData?.periodOfTest || initialData?.metadata?.periodOfTest || 'Not furnished',
        diameterFactor: initialData?.diameterFactor || initialData?.metadata?.diameterFactor || '1.03',
      });
    }
  }, [isOpen, initialData, sampleCode]);

  // Real-time calculation
  const calcResult = useMemo(() => {
    return calculateConcreteCoreTest(observations, metadata);
  }, [observations, metadata]);

  // Handle single cell change
  const handleObservationChange = (index, field, value) => {
    setObservations((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  // Add new trial row
  const handleAddRow = () => {
    setObservations((prev) => [
      ...prev,
      {
        ...DEFAULT_CONCRETE_CORE_OBSERVATION,
        identification: `Core ${prev.length + 1}`,
      },
    ]);
  };

  // Remove trial row
  const handleRemoveRow = (index) => {
    if (observations.length <= 1) return;
    setObservations((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset to default
  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setObservations([
      { ...DEFAULT_CONCRETE_CORE_OBSERVATION, identification: 'Not furnished' },
      { ...DEFAULT_CONCRETE_CORE_OBSERVATION, identification: 'Not furnished' },
    ]);
    setMetadata(DEFAULT_CONCRETE_CORE_METADATA);
  };

  // Quick fill sample data from PDF
  const handleFillSample = () => {
    setMetadata(SAMPLE_CONCRETE_CORE_TEST_DATA.metadata);
    setObservations(SAMPLE_CONCRETE_CORE_TEST_DATA.observations);
  };

  // Apply & Save
  const handleApply = () => {
    const payload = {
      gradeOfConcrete: metadata.gradeOfConcrete,
      standard: metadata.standard,
      numberOfSamples: observations.length,
      cappingMaterial: metadata.cappingMaterial,
      periodOfTest: metadata.periodOfTest,
      diameterFactor: metadata.diameterFactor,
      observations: calcResult.rows.map((r) => ({
        trialNo: r.trialNo,
        identification: r.identification,
        extractionDate: r.extractionDate,
        length: r.length,
        dia: r.dia,
        area: r.areaFormatted,
        weightKg: r.weightKg,
        failureLoadKn: r.failureLoadKn,
        cylStrength: r.cylStrengthFormatted,
        ldRatio: r.ldRatioFormatted,
        correctionFactor: r.correctionFactorFormatted,
        diaFactor: r.diaFactor,
        corrCylStrength: r.corrCylStrengthFormatted,
        cubeStrength: r.cubeStrengthFormatted,
        density: r.densityFormatted,
        failureType: r.failureType,
      })),
      avgCubeStrength: calcResult.averageCubeStrengthFormatted,
      avgCorrCylStrength: calcResult.averageCorrCylStrengthFormatted,
      avgCylStrength: calcResult.averageCylStrengthFormatted,
      avgWeight: calcResult.averageWeightFormatted,
      avgLdRatio: calcResult.averageLdRatioFormatted,
      reportedStrength: calcResult.averageCubeStrengthFormatted,
    };

    if (onApply) {
      onApply(payload);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm">
                <CircleDot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    Concrete Core Compressive Strength Test
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                  >
                    IS 516 (part 4) : 2018
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Core cylinder strength, H/D shape correction factor, and equivalent cube compressive strength
                  {jobCode ? ` • Job: ${jobCode}` : ''}
                  {sampleCode ? ` • Sample: ${sampleCode}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillSample}
                className="hidden h-8 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                Fill Sample Data
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Metadata & Parameters Card */}
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-muted/30 border border-gray-200/80 dark:border-border/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {/* Grade of Concrete */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Grade of Concrete
                </Label>
                <Select
                  value={metadata.gradeOfConcrete}
                  onValueChange={(val) => setMetadata((prev) => ({ ...prev, gradeOfConcrete: val }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-card">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCRETE_GRADES.map((g) => (
                      <SelectItem key={g} value={g} className="text-xs">
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Samples Tested */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Number of Samples
                </Label>
                <div className="h-9 px-3 flex items-center text-xs font-semibold rounded-md border border-input bg-white dark:bg-card text-gray-800 dark:text-foreground">
                  {observations.length}
                </div>
              </div>

              {/* Capping Material Used */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Capping Material
                </Label>
                <Input
                  type="text"
                  value={metadata.cappingMaterial}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, cappingMaterial: e.target.value }))
                  }
                  className="h-9 text-xs bg-white dark:bg-card"
                  placeholder="e.g. Epoxy, Ep 10"
                />
              </div>

              {/* Period of Test */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Period of Test
                </Label>
                <Input
                  type="text"
                  value={metadata.periodOfTest}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, periodOfTest: e.target.value }))
                  }
                  className="h-9 text-xs bg-white dark:bg-card"
                  placeholder="e.g. Not furnished"
                />
              </div>

              {/* Test Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Test Method
                </Label>
                <Input
                  type="text"
                  value={metadata.standard}
                  onChange={(e) => setMetadata((prev) => ({ ...prev, standard: e.target.value }))}
                  className="h-9 text-xs bg-white dark:bg-card"
                  placeholder="Standard Method"
                />
              </div>
            </div>
          </div>

          {/* Observations Table */}
          <div className="border border-gray-200 dark:border-border rounded-xl shadow-sm bg-white dark:bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-muted/50 border-b dark:border-border text-gray-700 dark:text-muted-foreground font-semibold">
                    <th className="p-2.5 text-center w-10">Sl. No</th>
                    <th className="p-2.5 min-w-[130px]">
                      <div className="flex items-center gap-1">
                        <span>Identification</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">(C1)</span>
                      </div>
                    </th>
                    <th className="p-2.5 min-w-[120px]">
                      <div className="flex items-center gap-1">
                        <span>Extraction Date</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">(C2)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[90px]">
                      <div className="flex flex-col items-end">
                        <span>Length (mm)</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">L (C3)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[90px]">
                      <div className="flex flex-col items-end">
                        <span>Dia (mm)</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">D (C4)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[95px]">
                      <div className="flex flex-col items-end">
                        <span>Weight (kg)</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">(C5)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[105px]">
                      <div className="flex flex-col items-end">
                        <span>Failure Load (kN)</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">(C6)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[100px]">
                      <div className="flex flex-col items-end">
                        <span>Cyl. Strength</span>
                        <span className="text-[10px] text-gray-400 font-mono">(C7: N/mm²)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[80px]">
                      <div className="flex flex-col items-end">
                        <span>L/D Ratio</span>
                        <span className="text-[10px] text-gray-400 font-mono">(C8)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[85px]">
                      <div className="flex flex-col items-end">
                        <span>H/D CF</span>
                        <span className="text-[10px] text-gray-400 font-mono">(C9)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[110px] bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                      <div className="flex flex-col items-end">
                        <span>Corr. Cyl. (N/mm²)</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">(C10)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[125px] bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300">
                      <div className="flex flex-col items-end">
                        <span>Eq. Cube (N/mm²)</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">(C11: ±0.5)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center min-w-[130px]">
                      <div className="flex flex-col items-center">
                        <span>Type of Failure</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">(C12)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-border">
                  {calcResult.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50/60 dark:hover:bg-muted/30 transition-colors"
                    >
                      {/* Sl. No */}
                      <td className="p-2.5 text-center font-bold text-gray-400 dark:text-muted-foreground">
                        {row.trialNo}
                      </td>

                      {/* C1: Identification */}
                      <td className="p-2">
                        <Input
                          type="text"
                          value={observations[idx]?.identification ?? ''}
                          onChange={(e) =>
                            handleObservationChange(idx, 'identification', e.target.value)
                          }
                          placeholder={`Core ${idx + 1}`}
                          className="h-8 text-xs font-medium"
                        />
                      </td>

                      {/* C2: Extraction Date */}
                      <td className="p-2">
                        <Input
                          type="text"
                          value={observations[idx]?.extractionDate ?? ''}
                          onChange={(e) =>
                            handleObservationChange(idx, 'extractionDate', e.target.value)
                          }
                          placeholder="Not furnished"
                          className="h-8 text-xs font-mono"
                        />
                      </td>

                      {/* C3: Length L (mm) */}
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={observations[idx]?.length ?? ''}
                          onChange={(e) => handleObservationChange(idx, 'length', e.target.value)}
                          className="h-8 text-xs text-right font-mono"
                          placeholder="198.00"
                        />
                      </td>

                      {/* C4: Dia D (mm) */}
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={observations[idx]?.dia ?? ''}
                          onChange={(e) => handleObservationChange(idx, 'dia', e.target.value)}
                          className="h-8 text-xs text-right font-mono"
                          placeholder="145.00"
                        />
                      </td>

                      {/* C5: Weight (kg) */}
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={observations[idx]?.weightKg ?? ''}
                          onChange={(e) => handleObservationChange(idx, 'weightKg', e.target.value)}
                          placeholder="7.965"
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>

                      {/* C6: Failure Load (kN) */}
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={observations[idx]?.failureLoadKn ?? ''}
                          onChange={(e) =>
                            handleObservationChange(idx, 'failureLoadKn', e.target.value)
                          }
                          placeholder="512.910"
                          className="h-8 text-xs text-right font-mono font-semibold"
                        />
                      </td>

                      {/* C7: Cylinder Compressive Strength (N/mm²) */}
                      <td className="p-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                        {row.cylStrengthFormatted || '-'}
                      </td>

                      {/* C8: L/D ratio */}
                      <td className="p-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                        {row.ldRatioFormatted || '-'}
                      </td>

                      {/* C9: H/D Correction Factor */}
                      <td className="p-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                        {row.correctionFactorFormatted || '-'}
                      </td>

                      {/* C10: Corrected Cylinder Strength (N/mm²) */}
                      <td className="p-2.5 text-right font-mono font-bold text-blue-900 dark:text-blue-300 bg-blue-50/40 dark:bg-blue-950/20">
                        {row.corrCylStrengthFormatted || '-'}
                      </td>

                      {/* C11: Equivalent Cube Strength (N/mm²) */}
                      <td className="p-2.5 text-right font-mono font-black text-indigo-900 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30">
                        {row.cubeStrengthFormatted || '-'}
                      </td>

                      {/* C12: Type of Failure */}
                      <td className="p-2">
                        <Select
                          value={observations[idx]?.failureType || 'Satisfactory'}
                          onValueChange={(val) =>
                            handleObservationChange(idx, 'failureType', val)
                          }
                        >
                          <SelectTrigger
                            className={`h-8 text-xs ${
                              observations[idx]?.failureType === 'Unsatisfactory'
                                ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            }`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Satisfactory" className="text-xs">
                              Satisfactory
                            </SelectItem>
                            <SelectItem value="Unsatisfactory" className="text-xs">
                              Unsatisfactory
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Delete row */}
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={observations.length <= 1}
                          onClick={() => handleRemoveRow(idx)}
                          className="h-7 w-7 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Add row button */}
            <div className="p-3 bg-gray-50/50 dark:bg-muted/20 border-t dark:border-border flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Specimen
              </Button>
              <div className="text-[11px] text-gray-500 dark:text-muted-foreground">
                Inputs: C1, C2, C3, C4, C5, C6 & C12 • Standard IS 516 (Part 4) Core Method
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {calcResult.generalErrors?.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{calcResult.generalErrors[0]}</span>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Primary: Avg Equivalent Cube Compressive Strength */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent border border-indigo-500/20 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Avg Eq. Cube Strength
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-950 dark:text-indigo-300 font-mono">
                  {calcResult.averageCubeStrengthFormatted || '-'}
                </span>
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-400">N/mm²</span>
              </div>
              <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">
                Rounded to nearest 0.5 N/mm²
              </p>
            </div>

            {/* Average Corrected Cylinder Strength */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/20 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-400 tracking-wider">
                Avg Corr. Cylinder Strength
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-950 dark:text-blue-300 font-mono">
                  {calcResult.averageCorrCylStrengthFormatted || '-'}
                </span>
                <span className="text-xs font-bold text-blue-800 dark:text-blue-400">N/mm²</span>
              </div>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80">
                H/D and Dia factors applied
              </p>
            </div>

            {/* Average Weight */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/40 border border-gray-200 dark:border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-muted-foreground tracking-wider flex items-center gap-1">
                <Scale className="w-3 h-3" />
                Average Weight
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-gray-900 dark:text-foreground font-mono">
                  {calcResult.averageWeightFormatted || '-'}
                </span>
                <span className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">kg</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                Specimen core mass
              </p>
            </div>

            {/* Average L/D Ratio */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/40 border border-gray-200 dark:border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-muted-foreground tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Average L/D Ratio
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-gray-900 dark:text-foreground font-mono">
                  {calcResult.averageLdRatioFormatted || '-'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                Slenderness ratio
              </p>
            </div>
          </div>

          {/* Procedure Formula Callout */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">
                IS 516 (Part 4) : 2018 Formula Reference
              </div>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                1. <strong>H/D Correction Factor (C9)</strong>: If L/D &lt; 2.0, F = 0.11 × (L/D) + 0.78; if L/D ≥ 2.0, F = 1.00.<br />
                2. <strong>Corrected Cylinder Strength (C10)</strong>: Cyl. Strength × H/D CF × Dia Factor (1.03).<br />
                3. <strong>Equivalent Cube Strength (C11)</strong>: Corrected Cylinder Strength × (5/4) = × 1.25, rounded to the nearest 0.5 N/mm².
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t dark:border-border bg-gray-50/50 dark:bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          <div className="text-xs text-gray-500 dark:text-muted-foreground hidden sm:block">
            {calcResult.validCoreCount > 0
              ? `${calcResult.validCoreCount} of ${calcResult.count} cores computed`
              : 'Enter dimensions and failure load to compute'}
          </div>

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
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-9 px-5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5"
            >
              <Check className="w-4 h-4" />
              Apply & Save Concrete Core Data
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
