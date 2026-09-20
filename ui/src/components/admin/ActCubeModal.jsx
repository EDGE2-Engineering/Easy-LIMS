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
  FlaskConical,
} from 'lucide-react';
import {
  DEFAULT_ACT_CUBE_METADATA,
  DEFAULT_ACT_CUBE_OBSERVATIONS,
  DEFAULT_ACT_CUBE_OBSERVATION,
  SAMPLE_ACT_CUBE_TEST_DATA,
  calculateActCubeTest,
} from '@/utils/actCubeTestCalculation';

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
 * Modal dialog for ACT (Accelerated Curing Test) Cube Compressive Strength Test
 * Standards: IS 9013 (RA 2018) & IS 516 (part 1/Sec 1): 2021
 */
export default function ActCubeModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [metadata, setMetadata] = useState(DEFAULT_ACT_CUBE_METADATA);
  const [observations, setObservations] = useState(DEFAULT_ACT_CUBE_OBSERVATIONS);
  const [commonCastingDate, setCommonCastingDate] = useState('');
  const [commonTestingDate, setCommonTestingDate] = useState('');

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData?.observations && Array.isArray(initialData.observations) && initialData.observations.length > 0) {
        setObservations(
          initialData.observations.map((obs, idx) => ({
            cubeId: obs.cubeId !== undefined ? String(obs.cubeId) : `ACT-${idx + 1}`,
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
          { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: sampleCode ? `${sampleCode}-1` : 'ACT-1' },
          { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: sampleCode ? `${sampleCode}-2` : 'ACT-2' },
          { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: sampleCode ? `${sampleCode}-3` : 'ACT-3' },
        ]);
      }

      setMetadata({
        ...DEFAULT_ACT_CUBE_METADATA,
        gradeOfConcrete: initialData?.gradeOfConcrete || initialData?.metadata?.gradeOfConcrete || 'M25',
        standard: initialData?.standard || initialData?.metadata?.standard || 'IS 9013 (RA 2018), IS 516 (part 1/Sec 1) : 2021',
        numberOfSamples: initialData?.observations?.length || 3,
        waterAdditionDateTime: initialData?.waterAdditionDateTime || initialData?.metadata?.waterAdditionDateTime || '',
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
    return calculateActCubeTest(observations, metadata);
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
        ...DEFAULT_ACT_CUBE_OBSERVATION,
        cubeId: `ACT-${prev.length + 1}`,
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
    setObservations([
      { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: 'ACT-1' },
      { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: 'ACT-2' },
      { ...DEFAULT_ACT_CUBE_OBSERVATION, cubeId: 'ACT-3' },
    ]);
    setMetadata(DEFAULT_ACT_CUBE_METADATA);
    setCommonCastingDate('');
    setCommonTestingDate('');
  };

  // Quick fill sample data from PDF
  const handleFillSample = () => {
    setMetadata(SAMPLE_ACT_CUBE_TEST_DATA.metadata);
    setObservations(SAMPLE_ACT_CUBE_TEST_DATA.observations);
    setCommonCastingDate('2024-06-03');
    setCommonTestingDate('2024-06-04');
  };

  // Apply & Save
  const handleApply = () => {
    const payload = {
      gradeOfConcrete: metadata.gradeOfConcrete,
      standard: metadata.standard,
      numberOfSamples: observations.length,
      waterAdditionDateTime: metadata.waterAdditionDateTime,
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
        predicted28DayStrength: r.predicted28DayFormatted,
        density: r.densityFormatted,
        failureType: r.failureType,
      })),
      avgCompressiveStrength: calcResult.averageStrengthFormatted,
      avgPredicted28DayStrength: calcResult.averagePredictedStrengthFormatted,
      avgWeight: calcResult.averageWeightFormatted,
      avgAge: calcResult.averageAgeFormatted,
      reportedStrength: calcResult.averagePredictedStrengthFormatted || calcResult.averageStrengthFormatted,
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
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-transparent dark:from-teal-950/30 dark:via-emerald-950/20 dark:to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    ACT (Accelerated Curing Test) Cube Compressive Strength
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800"
                  >
                    IS 9013 (RA 2018)
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  >
                    IS 516: 2021
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Accelerated curing testing and 28-day strength prediction per IS 9013 Clause 9
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
                className="h-8 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                Fill Sample Data
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Metadata & Quick Config Bar */}
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-muted/30 border border-gray-200/80 dark:border-border/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Grade of Concrete */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
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
                  <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Number of Samples
                </Label>
                <div className="h-9 px-3 flex items-center text-xs font-semibold rounded-md border border-input bg-white dark:bg-card text-gray-800 dark:text-foreground">
                  {observations.length} (three)
                </div>
              </div>

              {/* Date & Time of Water Addition */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Water Addition Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={metadata.waterAdditionDateTime}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, waterAdditionDateTime: e.target.value }))
                  }
                  className="h-9 text-xs bg-white dark:bg-card font-mono"
                  placeholder="YYYY-MM-DD HH:MM"
                />
              </div>

              {/* Test Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
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

            {/* Quick Date Setter */}
            <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-border/40 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-gray-500 dark:text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Quick Set Dates:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Casting:</span>
                <Input
                  type="date"
                  value={commonCastingDate}
                  onChange={(e) => setCommonCastingDate(e.target.value)}
                  className="h-7 text-xs w-36 bg-white dark:bg-card font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Testing:</span>
                <Input
                  type="date"
                  value={commonTestingDate}
                  onChange={(e) => setCommonTestingDate(e.target.value)}
                  className="h-7 text-xs w-36 bg-white dark:bg-card font-mono"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleApplyCommonDates}
                className="h-7 text-xs px-2.5"
                disabled={!commonCastingDate && !commonTestingDate}
              >
                Apply to all rows
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-gray-200 dark:border-border rounded-xl shadow-sm bg-white dark:bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-muted/50 border-b dark:border-border text-gray-700 dark:text-muted-foreground font-semibold">
                    <th className="p-2.5 text-center w-10">Sl. No</th>
                    <th className="p-2.5 min-w-[170px]">
                      <div className="flex items-center gap-1">
                        <span>Identification / Cube ID</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">(C1)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center min-w-[210px]">
                      <div className="flex flex-col items-center">
                        <span>Dimensions (mm)</span>
                        <span className="text-[10px] text-gray-400 font-mono">L (C2) × B (C3) × H (C4)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center min-w-[90px]">
                      <div className="flex flex-col items-center">
                        <span>Area (mm²)</span>
                        <span className="text-[10px] text-gray-400 font-mono">(C5)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center min-w-[130px]">
                      <div className="flex flex-col items-center">
                        <span>Date of Casting</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">(C6)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center min-w-[130px]">
                      <div className="flex flex-col items-center">
                        <span>Date of Testing</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">(C7)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center min-w-[70px]">
                      <div className="flex flex-col items-center">
                        <span>Age</span>
                        <span className="text-[10px] text-gray-400 font-mono">(C8)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[100px]">
                      <div className="flex flex-col items-end">
                        <span>Weight (kg)</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">(C9)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[110px]">
                      <div className="flex flex-col items-end">
                        <span>Failure Load (kN)</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">(C10)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[125px] bg-teal-50/60 dark:bg-teal-950/20 text-teal-900 dark:text-teal-300">
                      <div className="flex flex-col items-end">
                        <span>ACT Strength (N/mm²)</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">(C11: ±0.5)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-right min-w-[135px] bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                      <div className="flex flex-col items-end">
                        <span>Predicted 28d (N/mm²)</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">(C12)</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center min-w-[130px]">
                      <div className="flex flex-col items-center">
                        <span>Type of Failure</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">(C13)</span>
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

                      {/* C1: Identification / Cube ID */}
                      <td className="p-2">
                        <Input
                          type="text"
                          value={observations[idx]?.cubeId ?? ''}
                          onChange={(e) => handleObservationChange(idx, 'cubeId', e.target.value)}
                          placeholder={`ACT-${idx + 1}`}
                          className="h-8 text-xs font-medium"
                        />
                      </td>

                      {/* C2, C3, C4: Dimensions (L x B x H) */}
                      <td className="p-2">
                        <div className="flex items-center gap-1 justify-center">
                          <Input
                            type="number"
                            value={observations[idx]?.length ?? '150'}
                            onChange={(e) => handleObservationChange(idx, 'length', e.target.value)}
                            className="h-8 text-xs w-16 text-center font-mono p-1"
                            placeholder="L"
                          />
                          <span className="text-gray-400 text-xs">×</span>
                          <Input
                            type="number"
                            value={observations[idx]?.breadth ?? '150'}
                            onChange={(e) => handleObservationChange(idx, 'breadth', e.target.value)}
                            className="h-8 text-xs w-16 text-center font-mono p-1"
                            placeholder="B"
                          />
                          <span className="text-gray-400 text-xs">×</span>
                          <Input
                            type="number"
                            value={observations[idx]?.height ?? '150'}
                            onChange={(e) => handleObservationChange(idx, 'height', e.target.value)}
                            className="h-8 text-xs w-16 text-center font-mono p-1"
                            placeholder="H"
                          />
                        </div>
                      </td>

                      {/* C5: Cross Sectional Area (sq. mm) */}
                      <td className="p-2.5 text-center font-mono text-gray-700 dark:text-gray-300">
                        {row.areaFormatted || '22500'}
                      </td>

                      {/* C6: Date of Casting */}
                      <td className="p-2">
                        <Input
                          type="date"
                          value={observations[idx]?.dateOfCasting ?? ''}
                          onChange={(e) =>
                            handleObservationChange(idx, 'dateOfCasting', e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </td>

                      {/* C7: Date of Testing */}
                      <td className="p-2">
                        <Input
                          type="date"
                          value={observations[idx]?.dateOfTesting ?? ''}
                          onChange={(e) =>
                            handleObservationChange(idx, 'dateOfTesting', e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </td>

                      {/* C8: Age at Test (Days) */}
                      <td className="p-2.5 text-center font-mono font-semibold text-gray-800 dark:text-foreground">
                        {row.ageFormatted ? `${row.ageFormatted}d` : '-'}
                      </td>

                      {/* C9: Weight (kg) */}
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={observations[idx]?.weightKg ?? ''}
                          onChange={(e) =>
                            handleObservationChange(idx, 'weightKg', e.target.value)
                          }
                          placeholder="8.250"
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>

                      {/* C10: Failure Load (kN) */}
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={observations[idx]?.failureLoadKn ?? ''}
                          onChange={(e) =>
                            handleObservationChange(idx, 'failureLoadKn', e.target.value)
                          }
                          placeholder="365.250"
                          className="h-8 text-xs text-right font-mono font-semibold"
                        />
                      </td>

                      {/* C11: Compressive Strength (N/mm²) */}
                      <td className="p-2.5 text-right font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-950/20">
                        {row.strengthFormatted || '-'}
                      </td>

                      {/* C12: Predicted 28-day ACT Compressive Strength (N/mm²) */}
                      <td className="p-2.5 text-right font-mono font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20">
                        {row.predicted28DayFormatted || '-'}
                      </td>

                      {/* C13: Type of Failure */}
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
                Inputs: C1, C2, C3, C4, C6, C7, C9, C10 & C13 • Standard cube size: 150×150×150 mm
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
            {/* Primary: Predicted 28-day ACT Strength */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                CR: Predicted 28d Strength
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-950 dark:text-emerald-300 font-mono">
                  {calcResult.averagePredictedStrengthFormatted || '-'}
                </span>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">N/mm²</span>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                {calcResult.rawAveragePredictedStrength
                  ? `Mean: ${calcResult.rawAveragePredictedStrength.toFixed(2)} → Round up nearest 0.5`
                  : 'Requires test failure load & area'}
              </p>
            </div>

            {/* Accelerated Compressive Strength */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent border border-teal-500/20 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-400 tracking-wider">
                Avg ACT Strength (Ra)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-teal-950 dark:text-teal-300 font-mono">
                  {calcResult.averageStrengthFormatted || '-'}
                </span>
                <span className="text-xs font-bold text-teal-800 dark:text-teal-400">N/mm²</span>
              </div>
              <p className="text-[11px] text-teal-700/80 dark:text-teal-400/80">
                IS 516 nearest 0.5 value applied
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
                Specimen bulk mass
              </p>
            </div>

            {/* Age & Testing Method */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/40 border border-gray-200 dark:border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-muted-foreground tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Age at Testing
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-gray-900 dark:text-foreground font-mono">
                  {calcResult.averageAgeFormatted ? `${calcResult.averageAgeFormatted} Days` : '-'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                Accelerated curing regime
              </p>
            </div>
          </div>

          {/* Procedure Formula Callout */}
          <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">
                IS 9013 Clause 9 Prediction Formula: R₂₈ = 1.64 × Rₐ + 8.09 N/mm²
              </div>
              <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80">
                Where <strong>R₂₈</strong> is the predicted 28-day normal compressive strength, and{' '}
                <strong>Rₐ</strong> is the accelerated compressive strength (rounded to the nearest 0.5 N/mm² per IS 516).
                Average 28-day predicted strength (CR) is rounded to the nearest 0.5 N/mm².
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t dark:border-border bg-gray-50/50 dark:bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Apply & Save ACT Cube Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
