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
} from 'lucide-react';
import {
  DEFAULT_CUBE_METADATA,
  DEFAULT_CUBE_OBSERVATIONS,
  DEFAULT_CUBE_OBSERVATION,
  SAMPLE_CUBE_TEST_DATA,
  calculateCubeTest,
} from '@/utils/cubeTestCalculation';

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
  'Custom',
];

/**
 * Modal dialog for Concrete Cube Compressive Strength Test per IS 516 (part 1/Sec 1): 2021
 */
export default function ConcreteCubeModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [metadata, setMetadata] = useState(DEFAULT_CUBE_METADATA);
  const [observations, setObservations] = useState(DEFAULT_CUBE_OBSERVATIONS);
  const [commonCastingDate, setCommonCastingDate] = useState('');
  const [commonTestingDate, setCommonTestingDate] = useState('');

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData?.observations && Array.isArray(initialData.observations) && initialData.observations.length > 0) {
        setObservations(
          initialData.observations.map((obs, idx) => ({
            cubeId: obs.cubeId !== undefined ? String(obs.cubeId) : `Cube ${idx + 1}`,
            length: obs.length !== undefined ? String(obs.length) : '150',
            breadth: obs.breadth !== undefined ? String(obs.breadth) : '150',
            height: obs.height !== undefined ? String(obs.height) : '150',
            dateOfCasting: obs.dateOfCasting || '',
            dateOfTesting: obs.dateOfTesting || '',
            weightKg: obs.weightKg !== undefined ? String(obs.weightKg) : '',
            failureLoadKn: obs.failureLoadKn !== undefined ? String(obs.failureLoadKn) : '',
            failureType: obs.failureType || 'Satisfactory',
          }))
        );
      } else {
        setObservations([
          { ...DEFAULT_CUBE_OBSERVATION, cubeId: sampleCode || 'Cube 1' },
          { ...DEFAULT_CUBE_OBSERVATION, cubeId: sampleCode ? `${sampleCode}-2` : 'Cube 2' },
          { ...DEFAULT_CUBE_OBSERVATION, cubeId: sampleCode ? `${sampleCode}-3` : 'Cube 3' },
        ]);
      }

      setMetadata({
        ...DEFAULT_CUBE_METADATA,
        gradeOfConcrete: initialData?.gradeOfConcrete || initialData?.metadata?.gradeOfConcrete || 'M20',
        standard: initialData?.standard || initialData?.metadata?.standard || 'IS 516 (part 1/Sec 1): 2021',
        numberOfSamples: initialData?.observations?.length || 3,
      });

      if (initialData?.observations?.[0]?.dateOfCasting) {
        setCommonCastingDate(initialData.observations[0].dateOfCasting);
      }
      if (initialData?.observations?.[0]?.dateOfTesting) {
        setCommonTestingDate(initialData.observations[0].dateOfTesting);
      }
    }
  }, [isOpen, initialData, sampleCode]);

  // Real-time calculation
  const calcResult = useMemo(() => {
    return calculateCubeTest(observations, metadata);
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
        ...DEFAULT_CUBE_OBSERVATION,
        cubeId: `Cube ${prev.length + 1}`,
        dateOfCasting: commonCastingDate || (prev[0]?.dateOfCasting || ''),
        dateOfTesting: commonTestingDate || (prev[0]?.dateOfTesting || ''),
      },
    ]);
  };

  // Remove trial row
  const handleRemoveRow = (index) => {
    if (observations.length <= 1) return;
    setObservations((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick apply dates to all rows
  const handleApplyCommonDates = () => {
    if (!commonCastingDate && !commonTestingDate) return;
    setObservations((prev) =>
      prev.map((row) => ({
        ...row,
        ...(commonCastingDate ? { dateOfCasting: commonCastingDate } : {}),
        ...(commonTestingDate ? { dateOfTesting: commonTestingDate } : {}),
      }))
    );
  };

  // Reset to default
  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setObservations([
      { ...DEFAULT_CUBE_OBSERVATION, cubeId: 'Cube 1' },
      { ...DEFAULT_CUBE_OBSERVATION, cubeId: 'Cube 2' },
      { ...DEFAULT_CUBE_OBSERVATION, cubeId: 'Cube 3' },
    ]);
    setMetadata(DEFAULT_CUBE_METADATA);
    setCommonCastingDate('');
    setCommonTestingDate('');
  };

  // Quick fill sample data from PDF
  const handleFillSample = () => {
    setMetadata(SAMPLE_CUBE_TEST_DATA.metadata);
    setObservations(SAMPLE_CUBE_TEST_DATA.observations);
    setCommonCastingDate('2026-01-05');
    setCommonTestingDate('2026-01-12');
  };

  // Apply & Save
  const handleApply = () => {
    const payload = {
      gradeOfConcrete: metadata.gradeOfConcrete,
      standard: metadata.standard,
      numberOfSamples: observations.length,
      observations: calcResult.rows.map((r) => ({
        trialNo: r.trialNo,
        cubeId: r.cubeId,
        length: r.length,
        breadth: r.breadth,
        height: r.height,
        area: r.areaFormatted,
        dateOfCasting: r.dateOfCasting,
        dateOfTesting: r.dateOfTesting,
        ageDays: r.ageFormatted,
        weightKg: r.weightKg,
        failureLoadKn: r.failureLoadKn,
        compressiveStrength: r.strengthFormatted,
        density: r.densityFormatted,
        failureType: r.failureType,
      })),
      avgCompressiveStrength: calcResult.averageStrengthFormatted,
      avgWeight: calcResult.averageWeightFormatted,
      avgAge: calcResult.averageAgeFormatted,
      reportedStrength: calcResult.averageStrengthFormatted,
    };

    if (onApply) {
      onApply(payload);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-8xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    Concrete Cube Compressive Strength Test
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                  >
                    IS 516 (part 1/Sec 1): 2021
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Determination of compressive strength of 150mm concrete cube specimens
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
                className="hidden h-8 text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fill PDF Sample Data
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {/* Metadata & Quick Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50/70 dark:bg-muted/30 border border-gray-100 dark:border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                Grade of Concrete *
              </Label>
              <Select
                value={metadata.gradeOfConcrete}
                onValueChange={(val) => setMetadata((m) => ({ ...m, gradeOfConcrete: val }))}
              >
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-background">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                Test Method
              </Label>
              <Input
                value={metadata.standard}
                readOnly
                className="h-9 text-xs bg-gray-100/70 dark:bg-muted font-mono text-gray-600 dark:text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                Date of Casting (Quick Set)
              </Label>
              <Input
                type="date"
                value={commonCastingDate}
                onChange={(e) => setCommonCastingDate(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                  Date of Testing (Quick Set)
                </Label>
                <button
                  type="button"
                  onClick={handleApplyCommonDates}
                  className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold underline"
                >
                  Apply to all
                </button>
              </div>
              <Input
                type="date"
                value={commonTestingDate}
                onChange={(e) => setCommonTestingDate(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-background"
              />
            </div>
          </div>

          {/* Observations Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  Observations & Compressive Strength Data
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {observations.length} {observations.length === 1 ? 'Trial' : 'Trials'}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-7 text-xs gap-1 border-gray-200"
              >
                <Plus className="w-3 h-3" /> Add Trial
              </Button>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card border-gray-200 dark:border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-muted/50 border-b border-gray-200 dark:border-border text-gray-600 dark:text-gray-300">
                      <th className="p-2.5 font-bold text-center w-10">Sl No</th>
                      <th className="p-2.5 font-bold min-w-[120px]">
                        Identification / Cube ID (C1)
                      </th>
                      <th className="p-2.5 font-bold text-center min-w-[180px]">
                        Dimensions (mm)
                        <div className="grid grid-cols-3 text-[10px] text-gray-400 font-normal mt-0.5">
                          <span>L (C2)</span>
                          <span>B (C3)</span>
                          <span>H (C4)</span>
                        </div>
                      </th>
                      <th className="p-2.5 font-bold text-center min-w-[90px]">
                        Area (mm²)
                        <span className="block text-[10px] text-gray-400 font-normal">C5 = L×B</span>
                      </th>
                      <th className="p-2.5 font-bold min-w-[130px]">
                        Date of Casting (C6)
                      </th>
                      <th className="p-2.5 font-bold min-w-[130px]">
                        Date of Testing (C7)
                      </th>
                      <th className="p-2.5 font-bold text-center min-w-[80px]">
                        Age (C8)
                        <span className="block text-[10px] text-gray-400 font-normal">days</span>
                      </th>
                      <th className="p-2.5 font-bold text-right min-w-[100px]">
                        Weight (C9)
                        <span className="block text-[10px] text-gray-400 font-normal">kg (3 dec)</span>
                      </th>
                      <th className="p-2.5 font-bold text-right min-w-[110px]">
                        Failure Load (C10)
                        <span className="block text-[10px] text-gray-400 font-normal">kN (3 dec)</span>
                      </th>
                      <th className="p-2.5 font-bold text-right min-w-[120px] bg-amber-50/50 dark:bg-amber-950/20">
                        Compressive Str. (C11)
                        <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-normal">
                          N/mm² (nearest 0.5)
                        </span>
                      </th>
                      <th className="p-2.5 font-bold min-w-[120px]">
                        Failure Type (C12)
                      </th>
                      <th className="p-2.5 font-bold text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border">
                    {calcResult.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-gray-50/50 dark:hover:bg-muted/20 transition-colors ${
                          row.errors.length > 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                        }`}
                      >
                        {/* Sl No */}
                        <td className="p-2 text-center font-bold text-gray-400">
                          {row.trialNo}
                        </td>

                        {/* Cube ID */}
                        <td className="p-2">
                          <Input
                            value={observations[idx].cubeId || ''}
                            onChange={(e) => handleObservationChange(idx, 'cubeId', e.target.value)}
                            placeholder="e.g. Footing"
                            className="h-8 text-xs font-medium"
                          />
                        </td>

                        {/* Dimensions L, B, H */}
                        <td className="p-2">
                          <div className="grid grid-cols-3 gap-1">
                            <Input
                              type="number"
                              value={observations[idx].length || ''}
                              onChange={(e) => handleObservationChange(idx, 'length', e.target.value)}
                              placeholder="150"
                              className="h-8 text-xs text-center px-1"
                            />
                            <Input
                              type="number"
                              value={observations[idx].breadth || ''}
                              onChange={(e) => handleObservationChange(idx, 'breadth', e.target.value)}
                              placeholder="150"
                              className="h-8 text-xs text-center px-1"
                            />
                            <Input
                              type="number"
                              value={observations[idx].height || ''}
                              onChange={(e) => handleObservationChange(idx, 'height', e.target.value)}
                              placeholder="150"
                              className="h-8 text-xs text-center px-1"
                            />
                          </div>
                        </td>

                        {/* Area */}
                        <td className="p-2 text-center font-mono font-medium text-gray-700 dark:text-gray-300">
                          {row.areaFormatted || '-'}
                        </td>

                        {/* Date of Casting */}
                        <td className="p-2">
                          <Input
                            type="date"
                            value={observations[idx].dateOfCasting || ''}
                            onChange={(e) =>
                              handleObservationChange(idx, 'dateOfCasting', e.target.value)
                            }
                            className="h-8 text-xs px-2"
                          />
                        </td>

                        {/* Date of Testing */}
                        <td className="p-2">
                          <Input
                            type="date"
                            value={observations[idx].dateOfTesting || ''}
                            onChange={(e) =>
                              handleObservationChange(idx, 'dateOfTesting', e.target.value)
                            }
                            className="h-8 text-xs px-2"
                          />
                        </td>

                        {/* Age at test */}
                        <td className="p-2 text-center">
                          {row.ageFormatted ? (
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            >
                              {row.ageFormatted} {parseInt(row.ageFormatted, 10) === 1 ? 'day' : 'days'}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Weight (kg) */}
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.001"
                            value={observations[idx].weightKg || ''}
                            onChange={(e) => handleObservationChange(idx, 'weightKg', e.target.value)}
                            placeholder="8.372"
                            className="h-8 text-xs text-right font-mono"
                          />
                        </td>

                        {/* Failure Load (kN) */}
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.001"
                            value={observations[idx].failureLoadKn || ''}
                            onChange={(e) =>
                              handleObservationChange(idx, 'failureLoadKn', e.target.value)
                            }
                            placeholder="396.160"
                            className="h-8 text-xs text-right font-mono"
                          />
                        </td>

                        {/* Compressive Strength (N/mm²) */}
                        <td className="p-2 text-right bg-amber-50/40 dark:bg-amber-950/10">
                          {row.strengthFormatted ? (
                            <span className="font-mono font-bold text-xs text-amber-800 dark:text-amber-300">
                              {row.strengthFormatted}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Failure Type */}
                        <td className="p-2">
                          <Select
                            value={observations[idx].failureType || 'Satisfactory'}
                            onValueChange={(val) =>
                              handleObservationChange(idx, 'failureType', val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Satisfactory" className="text-xs text-emerald-600 font-medium">
                                Satisfactory
                              </SelectItem>
                              <SelectItem value="Unsatisfactory" className="text-xs text-red-600 font-medium">
                                Unsatisfactory
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Remove */}
                        <td className="p-2 text-center">
                          {observations.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(idx)}
                              className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Validation Errors Notice */}
          {calcResult.generalErrors.length > 0 && (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <div>
                <span className="font-bold">IS 516 Notice: </span>
                {calcResult.generalErrors.join(' ')}
              </div>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-1">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                Average Compressive Strength
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-900 dark:text-amber-200 font-mono">
                  {calcResult.averageStrengthFormatted || '-'}
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  N/mm²
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-muted-foreground">
                Rounded to nearest 0.5 N/mm² per standard
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider block">
                Average Specimen Weight
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-800 dark:text-foreground font-mono">
                  {calcResult.averageWeightFormatted || '-'}
                </span>
                <span className="text-xs font-semibold text-gray-500">kg</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-muted-foreground">
                3 decimals precision
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider block">
                Curing / Test Age
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-800 dark:text-foreground font-mono">
                  {calcResult.averageAgeFormatted || '-'}
                </span>
                <span className="text-xs font-semibold text-gray-500">days</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-muted-foreground">
                Calculated: Date of testing - Date of casting
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider block">
                Failure Mode Quality
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {calcResult.rows.filter((r) => r.failureType === 'Satisfactory').length ===
                calcResult.rows.length ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      All Satisfactory
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {calcResult.rows.filter((r) => r.failureType === 'Satisfactory').length}/
                    {calcResult.rows.length} Satisfactory
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-muted-foreground">
                IS 516 explosive / semi-explosive failure check
              </p>
            </div>
          </div>

          {/* Standard Formula Reference Callout */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-300 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>IS 516 (part 1/Sec 1): 2021 Formula & Rounding Specifications:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-900/80 dark:text-blue-300/80 pl-2">
              <li>
                <strong>Cross Sectional Area (C5):</strong> L × B (e.g. 150 × 150 = 22,500 mm²)
              </li>
              <li>
                <strong>Age at Test (C8):</strong> Date of testing - Date of casting (in calendar days)
              </li>
              <li>
                <strong>Compressive Strength (C11):</strong> (Failure Load [kN] / Area [mm²]) × 1000 (N/mm²)
              </li>
              <li>
                <strong>Rounding:</strong> Individual strength values and average value are rounded up to the nearest 0.5 N/mm² (with 2 decimal places reporting).
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t dark:border-border bg-gray-50/50 dark:bg-muted/20 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-gray-500 dark:text-muted-foreground hidden sm:block">
            {calcResult.validStrengthCount > 0
              ? `${calcResult.validStrengthCount} of ${calcResult.count} strength calculated`
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
              onClick={handleApply}
              disabled={calcResult.validStrengthCount === 0}
              className="h-9 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-md shadow-amber-600/20 text-xs"
            >
              <Check className="w-4 h-4" />
              Apply & Save Results
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
