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
  ShieldCheck,
  Layers,
  Clock,
  CircleDot,
} from 'lucide-react';
import {
  DEFAULT_PLI_METADATA,
  DEFAULT_PLI_OBSERVATIONS,
  SAMPLE_PLI_DATA,
  calculatePointLoadIndexTest,
} from '@/utils/pointLoadIndexCalculation';

/**
 * Modal dialog for Point Load Index (PLI) Strength of Rock per IS: 8764
 */
export default function PointLoadIndexModal({
  isOpen,
  onClose,
  boreholeNo = 'BH-1',
  depth = '',
  initialData = {},
  onApply,
}) {
  const [metadata, setMetadata] = useState({
    ...DEFAULT_PLI_METADATA,
    boreholeNo: boreholeNo || 'BH-1',
  });

  const [observations, setObservations] = useState(DEFAULT_PLI_OBSERVATIONS);
  const [selectedReportChoice, setSelectedReportChoice] = useState('avg'); // 'avg' | 'custom'
  const [customReportedPli, setCustomReportedPli] = useState('');

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData?.observations && Array.isArray(initialData.observations) && initialData.observations.length > 0) {
        setObservations(
          initialData.observations.map((obs, idx) => ({
            coreNo: obs.coreNo !== undefined ? String(obs.coreNo) : String(idx + 1),
            depthFrom: obs.depthFrom !== undefined ? String(obs.depthFrom) : '',
            depthTo: obs.depthTo !== undefined ? String(obs.depthTo) : '',
            dia: obs.dia !== undefined ? String(obs.dia) : '',
            length: obs.length !== undefined ? String(obs.length) : '',
            weight: obs.weight !== undefined ? String(obs.weight) : '',
            loadKn: obs.loadKn !== undefined ? String(obs.loadKn) : '',
          }))
        );
      } else {
        setObservations([
          {
            coreNo: '1',
            depthFrom: depth ? String(depth) : '',
            depthTo: '',
            dia: '',
            length: '',
            weight: '',
            loadKn: '',
          },
        ]);
      }

      setMetadata({
        ...DEFAULT_PLI_METADATA,
        dateOfTesting: initialData?.dateOfTesting || new Date().toISOString().split('T')[0],
        testingType: initialData?.testingType || 'Unsoaked',
        soakingPeriodHrs: initialData?.soakingPeriodHrs !== undefined ? String(initialData.soakingPeriodHrs) : '',
        boreholeNo: initialData?.boreholeNo || boreholeNo || 'BH-1',
      });

      if (initialData?.reportedPli !== undefined && initialData?.reportedPli !== null) {
        setCustomReportedPli(String(initialData.reportedPli));
        setSelectedReportChoice(initialData?.reportMode === 'custom' ? 'custom' : 'avg');
      } else {
        setSelectedReportChoice('avg');
        setCustomReportedPli('');
      }
    }
  }, [isOpen, initialData, boreholeNo, depth]);

  // Handle row change
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

  // Add new core piece row
  const handleAddRow = () => {
    setObservations((prev) => [
      ...prev,
      {
        coreNo: String(prev.length + 1),
        depthFrom: '',
        depthTo: '',
        dia: '',
        length: '',
        weight: '',
        loadKn: '',
      },
    ]);
  };

  // Remove core piece row
  const handleRemoveRow = (index) => {
    if (observations.length <= 1) return;
    setObservations((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((row, idx) => ({
          ...row,
          coreNo: String(idx + 1),
        }))
    );
  };

  // Reset to default
  const handleReset = () => {
    setObservations([
      {
        coreNo: '1',
        depthFrom: depth ? String(depth) : '',
        depthTo: '',
        dia: '',
        length: '',
        weight: '',
        loadKn: '',
      },
    ]);
    setMetadata({
      ...DEFAULT_PLI_METADATA,
      boreholeNo: boreholeNo || 'BH-1',
    });
    setSelectedReportChoice('avg');
    setCustomReportedPli('');
  };

  // Quick fill sample data
  const handleFillSample = () => {
    setMetadata({
      ...SAMPLE_PLI_DATA.metadata,
      boreholeNo: boreholeNo || 'BH-1',
    });
    setObservations(SAMPLE_PLI_DATA.observations);
    setSelectedReportChoice('avg');
  };

  // Real-time calculation
  const calcResult = useMemo(() => {
    return calculatePointLoadIndexTest(observations, metadata);
  }, [observations, metadata]);

  // Effective reported PLI
  const effectiveReportedPli = useMemo(() => {
    if (selectedReportChoice === 'custom' && customReportedPli !== '') {
      return customReportedPli;
    }
    return calcResult.representativePli || '';
  }, [selectedReportChoice, customReportedPli, calcResult.representativePli]);

  const handleApply = () => {
    const payload = {
      pointLoadIndex: {
        dateOfTesting: metadata.dateOfTesting,
        testingType: metadata.testingType,
        soakingPeriodHrs: metadata.testingType === 'Soaked' ? metadata.soakingPeriodHrs : null,
        boreholeNo: metadata.boreholeNo,
        observations: calcResult.rows.map((r) => ({
          coreNo: r.coreNo,
          depthFrom: r.depthFrom,
          depthTo: r.depthTo,
          dia: r.dia,
          length: r.length,
          weight: r.weight,
          area: r.area,
          volume: r.volume,
          density: r.density,
          loadKn: r.loadKn,
          pli: r.pli,
        })),
        avgPli: calcResult.avgPli,
        avgDensity: calcResult.avgDensity,
        reportedPli: effectiveReportedPli,
        reportMode: selectedReportChoice,
      },
      reportedPli: effectiveReportedPli,
      density: calcResult.avgDensity || '',
    };

    if (onApply) {
      onApply(payload);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-transparent dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CircleDot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    Point Load Index (PLI) Strength of Rock
                  </DialogTitle>
                  <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                    IS: 8764
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Determination of Point Load Strength Index of rock specimens ({metadata.boreholeNo || boreholeNo}{depth ? ` • Depth: ${depth}m` : ''})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillSample}
                className="hidden h-8 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
                title="Fill sample observations from calculation sheet"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Fill Sample Data
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                title="Reset all inputs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Metadata Grid */}
          <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-muted/30 border border-gray-200/80 dark:border-border">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Test Header & Conditions
            </h4>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${metadata.testingType === 'Soaked' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3 text-xs`}>
              <div>
                <Label className="text-[11px] text-gray-500 dark:text-muted-foreground font-medium">Date of Testing</Label>
                <Input
                  type="date"
                  value={metadata.dateOfTesting}
                  onChange={(e) => setMetadata({ ...metadata, dateOfTesting: e.target.value })}
                  className="h-8 text-xs mt-1 bg-white dark:bg-background"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500 dark:text-muted-foreground font-medium">Type of Testing</Label>
                <Select
                  value={metadata.testingType}
                  onValueChange={(val) => setMetadata({ ...metadata, testingType: val })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1 bg-white dark:bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unsoaked">Unsoaked</SelectItem>
                    <SelectItem value="Soaked">Soaked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {metadata.testingType === 'Soaked' && (
                <div>
                  <Label className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" /> Soaking Period (Hrs) *
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={metadata.soakingPeriodHrs}
                    onChange={(e) => setMetadata({ ...metadata, soakingPeriodHrs: e.target.value })}
                    placeholder="e.g. 48"
                    className="h-8 text-xs mt-1 border-emerald-300 focus-visible:ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Observation Sheet Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Observation Sheet
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                  Enter core dimensions & failure load. Area, volume, density, and point load index are auto-calculated (2 decimals).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-7 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-emerald-300"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Core Piece
              </Button>
            </div>

            <div className="border border-gray-200 dark:border-border rounded-xl bg-white dark:bg-card overflow-x-auto shadow-sm">
              <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                <thead className="text-[11px] text-gray-600 dark:text-muted-foreground uppercase bg-gray-50/80 dark:bg-muted/40 border-b dark:border-border">
                  <tr>
                    <th className="px-2.5 py-2 font-bold w-12 text-center">Core #<br/><span className="text-[9px] font-normal text-gray-400">C₁</span></th>
                    <th className="px-2.5 py-2 font-bold w-20">From (m)<br/><span className="text-[9px] font-normal text-gray-400">C₂</span></th>
                    <th className="px-2.5 py-2 font-bold w-20">To (m)<br/><span className="text-[9px] font-normal text-gray-400">C₃</span></th>
                    <th className="px-2.5 py-2 font-bold w-24">Dia D (mm)<br/><span className="text-[9px] font-normal text-gray-400">C₄</span></th>
                    <th className="px-2.5 py-2 font-bold w-24">Length L (mm)<br/><span className="text-[9px] font-normal text-gray-400">C₅</span></th>
                    <th className="px-2.5 py-2 font-bold w-24">Weight W (g)<br/><span className="text-[9px] font-normal text-gray-400">C₆</span></th>
                    <th className="px-2.5 py-2 font-bold w-24 bg-gray-100/50 dark:bg-muted/30">Area A (mm²)<br/><span className="text-[9px] font-normal text-gray-400">C₇ (Auto)</span></th>
                    <th className="px-2.5 py-2 font-bold w-28 bg-gray-100/50 dark:bg-muted/30">Volume V (mm³)<br/><span className="text-[9px] font-normal text-gray-400">C₈ (Auto)</span></th>
                    <th className="px-2.5 py-2 font-bold w-24 bg-gray-100/50 dark:bg-muted/30">Density (g/cc)<br/><span className="text-[9px] font-normal text-gray-400">C₉ (Auto)</span></th>
                    <th className="px-2.5 py-2 font-bold w-24">Load (kN)<br/><span className="text-[9px] font-normal text-gray-400">C₁₀</span></th>
                    <th className="px-2.5 py-2 font-bold w-28 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                      PLI (N/mm²)<br/><span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400">C₁₁ = MPa (Auto)</span>
                    </th>
                    <th className="px-2 py-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {calcResult.rows.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-muted/20 transition-colors">
                      <td className="px-2 py-2 text-center font-bold text-gray-600 dark:text-gray-300">
                        {row.coreNo || index + 1}
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.depthFrom || ''}
                          onChange={(e) => handleObservationChange(index, 'depthFrom', e.target.value)}
                          placeholder="e.g. 4.50"
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.depthTo || ''}
                          onChange={(e) => handleObservationChange(index, 'depthTo', e.target.value)}
                          placeholder="e.g. 6.00"
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.dia || ''}
                          onChange={(e) => handleObservationChange(index, 'dia', e.target.value)}
                          placeholder="e.g. 57.49"
                          className="h-7 text-xs font-mono"
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.length || ''}
                          onChange={(e) => handleObservationChange(index, 'length', e.target.value)}
                          placeholder="e.g. 73.71"
                          className="h-7 text-xs font-mono"
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.weight || ''}
                          onChange={(e) => handleObservationChange(index, 'weight', e.target.value)}
                          placeholder="e.g. 441.00"
                          className="h-7 text-xs font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-gray-300 text-right">
                        {row.area || '-'}
                      </td>
                      <td className="px-2 py-1.5 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-gray-300 text-right">
                        {row.volume || '-'}
                      </td>
                      <td className="px-2 py-1.5 bg-gray-50/50 dark:bg-muted/20 font-mono text-gray-700 dark:text-gray-300 text-right font-medium">
                        {row.density || '-'}
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.loadKn || ''}
                          onChange={(e) => handleObservationChange(index, 'loadKn', e.target.value)}
                          placeholder="e.g. 3.62"
                          className="h-7 text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-300"
                        />
                      </td>
                      <td className="px-2.5 py-1.5 bg-emerald-50/50 dark:bg-emerald-950/30 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-right">
                        {row.pli ? `${row.pli} MPa` : '-'}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {calcResult.rows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRow(index)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete this core piece row"
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

          {/* Results Summary Card & Formula Reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Calculation Formulas Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300">
              <div className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                <Info className="w-3.5 h-3.5 text-blue-500" /> Formulas (IS: 8764)
              </div>
              <div>• Area A = (π / 4) × D² (mm²)</div>
              <div>• Volume V = A × L (mm³)</div>
              <div>• Density = (W × 1000) / V (g/cc)</div>
              <div>• PLI Is(50) = (Load × 1000) / (D^1.5 × √50) (N/mm² = MPa)</div>
            </div>

            {/* Average Summary Card */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 md:col-span-2 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Test Results Summary
                </span>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                  {calcResult.validCount} valid specimen{calcResult.validCount !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-1">
                <div className="bg-white/90 dark:bg-card/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-gray-500 dark:text-muted-foreground uppercase block">Avg Point Load Strength</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {calcResult.avgPli ? `${calcResult.avgPli} MPa` : '-'}
                  </span>
                </div>
                <div className="bg-white/90 dark:bg-card/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-gray-500 dark:text-muted-foreground uppercase block">Avg Rock Density</span>
                  <span className="text-lg font-black text-teal-700 dark:text-teal-300 font-mono">
                    {calcResult.avgDensity ? `${calcResult.avgDensity} g/cc` : '-'}
                  </span>
                </div>
                <div className="bg-white/90 dark:bg-card/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-gray-500 dark:text-muted-foreground uppercase block">Reported PLI Value</span>
                  <span className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono">
                    {effectiveReportedPli ? `${effectiveReportedPli} MPa` : '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 text-xs">
                <Label className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">Reporting Mode:</Label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="pliReportMode"
                    value="avg"
                    checked={selectedReportChoice === 'avg'}
                    onChange={() => setSelectedReportChoice('avg')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Use Average ({calcResult.avgPli || '-'} MPa)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="pliReportMode"
                    value="custom"
                    checked={selectedReportChoice === 'custom'}
                    onChange={() => setSelectedReportChoice('custom')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Custom Value</span>
                </label>
                {selectedReportChoice === 'custom' && (
                  <Input
                    type="number"
                    step="0.01"
                    value={customReportedPli}
                    onChange={(e) => setCustomReportedPli(e.target.value)}
                    placeholder="e.g. 1.17"
                    className="h-6 w-20 text-xs ml-1 bg-white dark:bg-background"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3.5 sm:p-4 border-t dark:border-border bg-gray-50/80 dark:bg-card flex flex-row items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-muted-foreground">
            {metadata.testingType === 'Soaked' ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                Condition: Soaked ({metadata.soakingPeriodHrs ? `${metadata.soakingPeriodHrs} hrs` : 'Hours not specified'})
              </span>
            ) : (
              <span>Condition: Unsoaked</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Apply to Lab Test
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
