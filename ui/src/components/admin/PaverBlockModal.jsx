import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Info,
  Sparkles,
  AlertTriangle,
  Building2,
  Droplets,
  HelpCircle,
  Table as TableIcon,
} from 'lucide-react';
import {
  DEFAULT_PAVER_BLOCK_METADATA,
  DEFAULT_PAVER_COMP_OBSERVATION,
  DEFAULT_PAVER_COMP_OBSERVATIONS,
  DEFAULT_PAVER_WA_OBSERVATION,
  DEFAULT_PAVER_WA_OBSERVATIONS,
  SAMPLE_PAVER_BLOCK_TEST_DATA,
  TABLE_5_CORRECTION_FACTORS,
  getPaverCorrectionFactor,
  calculatePaverBlockCompressiveStrength,
  calculatePaverBlockWaterAbsorption,
  calculatePaverBlockTest,
} from '@/utils/paverBlockTestCalculation';

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

export default function PaverBlockModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [activeTab, setActiveTab] = useState('compressive');
  const [metadata, setMetadata] = useState(DEFAULT_PAVER_BLOCK_METADATA);
  const [compObs, setCompObs] = useState(DEFAULT_PAVER_COMP_OBSERVATIONS);
  const [waObs, setWaObs] = useState(DEFAULT_PAVER_WA_OBSERVATIONS);
  const [showTable5Ref, setShowTable5Ref] = useState(false);

  // Load initialData when opening
  useEffect(() => {
    if (isOpen) {
      const initMeta = initialData?.metadata || initialData || {};
      setMetadata({
        ...DEFAULT_PAVER_BLOCK_METADATA,
        standard: initMeta.standard || 'IS 15658 : 2021',
        shapeOfPaver: initMeta.shapeOfPaver || 'Type A',
        blockType: initMeta.blockType || 'plain',
        numberOfSamplesComp: initMeta.numberOfSamplesComp || 8,
        numberOfSamplesWa: initMeta.numberOfSamplesWa || 3,
        periodOfTest: initMeta.periodOfTest || '04-06-2026',
      });

      // Compressive Strength Observations
      const loadedComp =
        initialData?.compressiveObservations ||
        initialData?.compressive?.rows ||
        initialData?.compressiveStrength?.observations;
      if (loadedComp && Array.isArray(loadedComp) && loadedComp.length > 0) {
        setCompObs(
          loadedComp.map((obs, idx) => ({
            sampleId: obs.sampleId || `Sample ${idx + 1}`,
            length: obs.length !== undefined ? String(obs.length) : '270',
            breadth: obs.breadth !== undefined ? String(obs.breadth) : '200',
            thickness: obs.thickness !== undefined ? String(obs.thickness) : '80',
            failureLoadKn: obs.failureLoadKn !== undefined ? String(obs.failureLoadKn) : '',
          }))
        );
      } else {
        setCompObs(
          deepClone(DEFAULT_PAVER_COMP_OBSERVATIONS).map((obs, idx) => ({
            ...obs,
            sampleId: sampleCode ? `${sampleCode}-C${idx + 1}` : `R${idx + 1}`,
          }))
        );
      }

      // Water Absorption Observations
      const loadedWa =
        initialData?.waterAbsorptionObservations ||
        initialData?.waterAbsorption?.rows ||
        initialData?.waterAbsorption?.observations;
      if (loadedWa && Array.isArray(loadedWa) && loadedWa.length > 0) {
        setWaObs(
          loadedWa.map((obs, idx) => ({
            sampleId: obs.sampleId || `Sample ${idx + 1}`,
            length: obs.length !== undefined ? String(obs.length) : '270',
            breadth: obs.breadth !== undefined ? String(obs.breadth) : '200',
            thickness: obs.thickness !== undefined ? String(obs.thickness) : '80',
            wetMassKg: obs.wetMassKg !== undefined ? String(obs.wetMassKg) : '',
            dryMassKg: obs.dryMassKg !== undefined ? String(obs.dryMassKg) : '',
          }))
        );
      } else {
        setWaObs(
          deepClone(DEFAULT_PAVER_WA_OBSERVATIONS).map((obs, idx) => ({
            ...obs,
            sampleId: sampleCode ? `${sampleCode}-W${idx + 1}` : `R${idx + 1}`,
          }))
        );
      }
    }
  }, [isOpen, initialData, sampleCode]);

  // Real-time calculations
  const compCalc = useMemo(() => {
    return calculatePaverBlockCompressiveStrength(compObs, metadata);
  }, [compObs, metadata]);

  const waCalc = useMemo(() => {
    return calculatePaverBlockWaterAbsorption(waObs, metadata);
  }, [waObs, metadata]);

  // Metadata change
  const handleMetaChange = (field, value) => {
    setMetadata((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Compressive row changes
  const handleCompChange = (index, field, value) => {
    setCompObs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddCompRow = () => {
    setCompObs((prev) => [
      ...prev,
      {
        ...DEFAULT_PAVER_COMP_OBSERVATION,
        sampleId: `R${prev.length + 1}`,
      },
    ]);
  };

  const handleDeleteCompRow = (index) => {
    if (compObs.length <= 1) return;
    setCompObs((prev) => prev.filter((_, i) => i !== index));
  };

  // Water absorption row changes
  const handleWaChange = (index, field, value) => {
    setWaObs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddWaRow = () => {
    setWaObs((prev) => [
      ...prev,
      {
        ...DEFAULT_PAVER_WA_OBSERVATION,
        sampleId: `R${prev.length + 1}`,
      },
    ]);
  };

  const handleDeleteWaRow = (index) => {
    if (waObs.length <= 1) return;
    setWaObs((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset to default
  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setMetadata(DEFAULT_PAVER_BLOCK_METADATA);
    setCompObs(
      deepClone(DEFAULT_PAVER_COMP_OBSERVATIONS).map((obs, idx) => ({
        ...obs,
        sampleId: sampleCode ? `${sampleCode}-C${idx + 1}` : `R${idx + 1}`,
      }))
    );
    setWaObs(
      deepClone(DEFAULT_PAVER_WA_OBSERVATIONS).map((obs, idx) => ({
        ...obs,
        sampleId: sampleCode ? `${sampleCode}-W${idx + 1}` : `R${idx + 1}`,
      }))
    );
  };

  // Pre-fill sample data from handwritten PDF (IS 15658)
  const handleFillSampleData = () => {
    setMetadata({
      ...DEFAULT_PAVER_BLOCK_METADATA,
      ...SAMPLE_PAVER_BLOCK_TEST_DATA.metadata,
    });
    setCompObs(deepClone(SAMPLE_PAVER_BLOCK_TEST_DATA.compressiveObservations));
    setWaObs(deepClone(SAMPLE_PAVER_BLOCK_TEST_DATA.waterAbsorptionObservations));
  };

  // Save & Apply
  const handleApply = () => {
    const fullTest = calculatePaverBlockTest(compObs, waObs, metadata);

    const payload = {
      metadata,
      shapeOfPaver: metadata.shapeOfPaver,
      blockType: metadata.blockType,
      standard: metadata.standard,
      periodOfTest: metadata.periodOfTest,
      compressive: {
        ...compCalc,
        observations: compObs,
      },
      waterAbsorption: {
        ...waCalc,
        observations: waObs,
      },
      compressiveObservations: compObs,
      waterAbsorptionObservations: waObs,
      avgCompStrength: compCalc.avgCompStrengthFormatted,
      avgCorrectedStrength: compCalc.avgCorrectedStrengthFormatted,
      avgWaterAbsorption: waCalc.avgWaterAbsorptionFormatted,
      reportedStrength: compCalc.avgCorrectedStrengthFormatted || compCalc.avgCompStrengthFormatted || '-',
      reportedWaterAbsorption: waCalc.avgWaterAbsorptionFormatted || '-',
      status: 'Complete',
      updatedAt: new Date().toISOString(),
    };

    if (onApply) {
      onApply(payload);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[96vw] lg:max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border dark:border-border shadow-2xl">
        {/* Top Header */}
        <DialogHeader className="p-4 px-6 border-b bg-stone-50/50 dark:bg-stone-900/40 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Paver Block Testing Form
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-[11px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                  {metadata.standard}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                Compressive strength with Table 5 correction factor & Water absorption per IS 15658 : 2021
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTable5Ref(!showTable5Ref)}
                className="h-8 text-xs gap-1 border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table 5 Factors
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFillSampleData}
                className="hidden h-8 text-xs gap-1 border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Fill Sample Data
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Table 5 Correction Factors Collapsible Reference Card */}
        {showTable5Ref && (
          <div className="p-3 px-6 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
                <Info className="w-4 h-4 text-indigo-600" />
                IS 15658 : 2021 Table 5 — Correction Factor for Thickness and Chamfer
              </div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                Reported to nearest 0.1 MPa
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center pt-1 font-mono">
              {TABLE_5_CORRECTION_FACTORS.map((r) => (
                <div key={r.thickness} className="bg-white dark:bg-card p-1.5 rounded border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[10px] text-gray-500 uppercase">{r.thickness} mm</div>
                  <div className="text-xs font-bold text-gray-800 dark:text-foreground">Plain: {r.plain}</div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300">Chamfer: {r.chamfered}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Metadata Inputs */}
        <div className="p-4 px-6 bg-stone-50/30 dark:bg-stone-900/10 border-b flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-gray-600 dark:text-muted-foreground">
                Shape of Paver
              </Label>
              <Input
                value={metadata.shapeOfPaver}
                onChange={(e) => handleMetaChange('shapeOfPaver', e.target.value)}
                placeholder="e.g. Type A / Zig-zag"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-gray-600 dark:text-muted-foreground">
                Block Edge Type
              </Label>
              <Select
                value={metadata.blockType}
                onValueChange={(val) => handleMetaChange('blockType', val)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Block Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain" className="text-xs">Plain block</SelectItem>
                  <SelectItem value="chamfered" className="text-xs">Arris / Chamfered block</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-gray-600 dark:text-muted-foreground">
                Date / Period of Test
              </Label>
              <Input
                value={metadata.periodOfTest}
                onChange={(e) => handleMetaChange('periodOfTest', e.target.value)}
                placeholder="e.g. 04-06-2026"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-gray-600 dark:text-muted-foreground">
                Standard
              </Label>
              <Input
                value={metadata.standard}
                onChange={(e) => handleMetaChange('standard', e.target.value)}
                placeholder="IS 15658 : 2021"
                className="h-8 text-xs mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-gray-600 dark:text-muted-foreground">
                Sample Code / ID
              </Label>
              <Input
                value={sampleCode || 'N/A'}
                disabled
                className="h-8 text-xs mt-1 bg-gray-50 dark:bg-muted text-gray-500 font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-gray-600 dark:text-muted-foreground">
                Job Code
              </Label>
              <Input
                value={jobCode || 'N/A'}
                disabled
                className="h-8 text-xs mt-1 bg-gray-50 dark:bg-muted text-gray-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Body Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b bg-gray-50/50 dark:bg-muted/30 flex items-center justify-between flex-shrink-0">
              <TabsList className="bg-transparent h-11 p-0 gap-6">
                <TabsTrigger
                  value="compressive"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 rounded-none bg-transparent px-2 h-11 text-xs font-semibold gap-2 shadow-none"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Compressive Strength
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                    {compObs.length} {compObs.length === 1 ? 'Specimen' : 'Specimens'}
                  </Badge>
                  {compCalc.avgCorrectedStrengthFormatted && (
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ({compCalc.avgCorrectedStrengthFormatted} N/mm²)
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="waterAbsorption"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 rounded-none bg-transparent px-2 h-11 text-xs font-semibold gap-2 shadow-none"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  Water Absorption
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                    {waObs.length} {waObs.length === 1 ? 'Specimen' : 'Specimens'}
                  </Badge>
                  {waCalc.avgWaterAbsorptionFormatted && (
                    <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                      ({waCalc.avgWaterAbsorptionFormatted}%)
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="text-[11px] text-gray-500 font-mono hidden md:block">
                IS 15658: 2021 Table 5 / Annex D
              </div>
            </div>

            {/* TAB 1: Compressive Strength */}
            <TabsContent value="compressive" className="flex-1 overflow-auto p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                    Compressive Strength Observations & Correction Factors
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-muted-foreground">
                    Area = Length × Breadth | Strength = (Load / Area) × 1000 | Corrected = Strength × Factor (Table 5)
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddCompRow}
                  className="h-8 text-xs gap-1 border-dashed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Specimen
                </Button>
              </div>

              {/* Compressive Strength Table */}
              <div className="border rounded-xl shadow-sm bg-white dark:bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 dark:bg-stone-900/50 border-b text-gray-600 dark:text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5 min-w-[100px]">Specimen ID</th>
                        <th className="p-2.5 text-right min-w-[90px]">Length C₁ (mm)</th>
                        <th className="p-2.5 text-right min-w-[90px]">Breadth C₂ (mm)</th>
                        <th className="p-2.5 text-right min-w-[90px]">Thick. C₃ (mm)</th>
                        <th className="p-2.5 text-right min-w-[110px] bg-slate-50 dark:bg-slate-900/30">
                          Nominal Area C₄ (mm²)
                        </th>
                        <th className="p-2.5 text-right min-w-[115px]">Max Load C₅ (kN)</th>
                        <th className="p-2.5 text-right min-w-[110px] bg-slate-50 dark:bg-slate-900/30">
                          Strength C₆ (N/mm²)
                        </th>
                        <th className="p-2.5 text-right min-w-[90px] text-indigo-700 dark:text-indigo-300">
                          Tbl 5 Factor
                        </th>
                        <th className="p-2.5 text-right min-w-[125px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold">
                          Corr. Strength C₇ (N/mm²)
                        </th>
                        <th className="p-2.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-border">
                      {compCalc.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 text-center font-bold text-gray-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-2">
                            <Input
                              value={row.sampleId}
                              onChange={(e) => handleCompChange(idx, 'sampleId', e.target.value)}
                              className="h-8 text-xs font-mono"
                              placeholder={`R${idx + 1}`}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.length}
                              onChange={(e) => handleCompChange(idx, 'length', e.target.value)}
                              className="h-8 text-xs text-right font-mono"
                              placeholder="270"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.breadth}
                              onChange={(e) => handleCompChange(idx, 'breadth', e.target.value)}
                              className="h-8 text-xs text-right font-mono"
                              placeholder="200"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.thickness}
                              onChange={(e) => handleCompChange(idx, 'thickness', e.target.value)}
                              className="h-8 text-xs text-right font-mono"
                              placeholder="80"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono text-gray-700 dark:text-gray-300 bg-slate-50/60 dark:bg-slate-900/20">
                            {row.areaFormatted || '-'}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.failureLoadKn}
                              onChange={(e) => handleCompChange(idx, 'failureLoadKn', e.target.value)}
                              className="h-8 text-xs text-right font-mono font-semibold"
                              placeholder="1950.485"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-gray-800 dark:text-gray-200 bg-slate-50/60 dark:bg-slate-900/20">
                            {row.compStrengthFormatted || '-'}
                          </td>
                          <td className="p-2.5 text-right font-mono text-indigo-700 dark:text-indigo-300">
                            {row.correctionFactor ? row.correctionFactor.toFixed(2) : '-'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20">
                            {row.correctedStrengthFormatted || '-'}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={compObs.length <= 1}
                              onClick={() => handleDeleteCompRow(idx)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Average Row */}
                    <tfoot className="bg-stone-100/70 dark:bg-stone-900/80 font-bold border-t text-gray-800 dark:text-foreground">
                      <tr>
                        <td colSpan={7} className="p-2.5 text-right text-xs uppercase tracking-wider text-gray-500">
                          Average / Mean
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-800 dark:text-gray-200 bg-slate-100/70 dark:bg-slate-900/50">
                          {compCalc.avgCompStrengthFormatted ? `${compCalc.avgCompStrengthFormatted} N/mm²` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-indigo-600 text-[11px]">
                          Table 5
                        </td>
                        <td className="p-2.5 text-right font-mono text-sm font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/50">
                          {compCalc.avgCorrectedStrengthFormatted ? `${compCalc.avgCorrectedStrengthFormatted} N/mm²` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Compressive Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-emerald-800 dark:text-emerald-400 tracking-wider">
                      Mean Corrected Compressive Strength
                    </span>
                    <div className="text-2xl font-black font-mono text-emerald-950 dark:text-emerald-200 mt-0.5">
                      {compCalc.avgCorrectedStrengthFormatted || '-'}
                      <span className="text-sm font-bold ml-1">N/mm² (MPa)</span>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-mono text-xs">
                    Nearest 0.1 MPa
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-card border-gray-200 dark:border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-600 dark:text-muted-foreground tracking-wider">
                      Average Uncorrected Strength
                    </span>
                    <div className="text-2xl font-black font-mono text-gray-800 dark:text-gray-200 mt-0.5">
                      {compCalc.avgCompStrengthFormatted || '-'}
                      <span className="text-sm font-bold ml-1">N/mm²</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-indigo-800 dark:text-indigo-400 tracking-wider">
                      Valid Tested Specimens
                    </span>
                    <div className="text-2xl font-black font-mono text-indigo-950 dark:text-indigo-200 mt-0.5">
                      {compCalc.totalValid} / {compObs.length}
                    </div>
                  </div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    {metadata.blockType === 'chamfered' ? 'Arris / Chamfered' : 'Plain Block'}
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Water Absorption */}
            <TabsContent value="waterAbsorption" className="flex-1 overflow-auto p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                    Water Absorption Observations (IS 15658 : 2021)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-muted-foreground">
                    Water Absorption (%) = ((Wet Mass - Oven Dry Mass) / Oven Dry Mass) × 100
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddWaRow}
                  className="h-8 text-xs gap-1 border-dashed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Specimen
                </Button>
              </div>

              {/* Water Absorption Table */}
              <div className="border rounded-xl shadow-sm bg-white dark:bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 dark:bg-stone-900/50 border-b text-gray-600 dark:text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5 min-w-[120px]">Specimen ID</th>
                        <th className="p-2.5 text-right min-w-[100px]">Length C₁ (mm)</th>
                        <th className="p-2.5 text-right min-w-[100px]">Breadth C₂ (mm)</th>
                        <th className="p-2.5 text-right min-w-[100px]">Width C₃ (mm)</th>
                        <th className="p-2.5 text-right min-w-[130px]">Wet Mass C₄ (kg)</th>
                        <th className="p-2.5 text-right min-w-[130px]">Oven Dry Mass C₅ (kg)</th>
                        <th className="p-2.5 text-right min-w-[140px] bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-bold">
                          Water Absorption C₆ (%)
                        </th>
                        <th className="p-2.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-border">
                      {waCalc.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 text-center font-bold text-gray-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-2">
                            <Input
                              value={row.sampleId}
                              onChange={(e) => handleWaChange(idx, 'sampleId', e.target.value)}
                              className="h-8 text-xs font-mono"
                              placeholder={`R${idx + 1}`}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.length}
                              onChange={(e) => handleWaChange(idx, 'length', e.target.value)}
                              className="h-8 text-xs text-right font-mono"
                              placeholder="270"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.breadth}
                              onChange={(e) => handleWaChange(idx, 'breadth', e.target.value)}
                              className="h-8 text-xs text-right font-mono"
                              placeholder="200"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.thickness}
                              onChange={(e) => handleWaChange(idx, 'thickness', e.target.value)}
                              className="h-8 text-xs text-right font-mono"
                              placeholder="80"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.wetMassKg}
                              onChange={(e) => handleWaChange(idx, 'wetMassKg', e.target.value)}
                              className="h-8 text-xs text-right font-mono font-semibold"
                              placeholder="9.660"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              value={row.dryMassKg}
                              onChange={(e) => handleWaChange(idx, 'dryMassKg', e.target.value)}
                              className="h-8 text-xs text-right font-mono font-semibold"
                              placeholder="9.261"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20">
                            {row.waterAbsorptionFormatted ? `${row.waterAbsorptionFormatted}%` : '-'}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={waObs.length <= 1}
                              onClick={() => handleDeleteWaRow(idx)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Average Row */}
                    <tfoot className="bg-stone-100/70 dark:bg-stone-900/80 font-bold border-t text-gray-800 dark:text-foreground">
                      <tr>
                        <td colSpan={7} className="p-2.5 text-right text-xs uppercase tracking-wider text-gray-500">
                          Average Water Absorption
                        </td>
                        <td className="p-2.5 text-right font-mono text-sm font-black text-blue-800 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-950/50">
                          {waCalc.avgWaterAbsorptionFormatted ? `${waCalc.avgWaterAbsorptionFormatted}%` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Water Absorption Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-blue-800 dark:text-blue-400 tracking-wider">
                      Mean Water Absorption
                    </span>
                    <div className="text-2xl font-black font-mono text-blue-950 dark:text-blue-200 mt-0.5">
                      {waCalc.avgWaterAbsorptionFormatted || '-'}
                      <span className="text-sm font-bold ml-1">%</span>
                    </div>
                  </div>
                  <Badge className="bg-blue-600 text-white font-mono text-xs">
                    IS 15658 Annex D
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-card border-gray-200 dark:border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-600 dark:text-muted-foreground tracking-wider">
                      Valid Water Absorption Specimens
                    </span>
                    <div className="text-2xl font-black font-mono text-gray-800 dark:text-gray-200 mt-0.5">
                      {waCalc.totalValid} / {waObs.length}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t bg-stone-50/50 dark:bg-stone-900/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-gray-600 dark:text-muted-foreground">Results:</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              Str: {compCalc.avgCorrectedStrengthFormatted ? `${compCalc.avgCorrectedStrengthFormatted} N/mm²` : '-'}
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
              WA: {waCalc.avgWaterAbsorptionFormatted ? `${waCalc.avgWaterAbsorptionFormatted}%` : '-'}
            </span>
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
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              Save & Apply Test Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
