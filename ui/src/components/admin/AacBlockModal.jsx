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
  Activity,
  Droplets,
  Weight,
  Percent,
  Layers,
} from 'lucide-react';
import {
  AAC_BLOCK_GRADES,
  AAC_BLOCK_DENSITY_CLASSES,
  DEFAULT_AAC_COMP_OBS,
  DEFAULT_AAC_WA_OBS,
  DEFAULT_AAC_DENSITY_OBS,
  DEFAULT_AAC_MOISTURE_OBS,
  DEFAULT_AAC_COMP_OBSERVATIONS,
  DEFAULT_AAC_WA_OBSERVATIONS,
  DEFAULT_AAC_DENSITY_OBSERVATIONS,
  DEFAULT_AAC_MOISTURE_OBSERVATIONS,
  SAMPLE_AAC_BLOCK_TEST_DATA,
  calculateAacBlockCompressiveStrength,
  calculateAacBlockWaterAbsorption,
  calculateAacBlockDensity,
  calculateAacBlockMoistureContent,
} from '@/utils/aacBlockTestCalculation';

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

export default function AacBlockModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [activeTab, setActiveTab] = useState('compressive');
  const [grade, setGrade] = useState('Grade 1');
  const [sampleName, setSampleName] = useState('');
  const [compObs, setCompObs] = useState(deepClone(DEFAULT_AAC_COMP_OBSERVATIONS));
  const [waObs, setWaObs] = useState(deepClone(DEFAULT_AAC_WA_OBSERVATIONS));
  const [densObs, setDensObs] = useState(deepClone(DEFAULT_AAC_DENSITY_OBSERVATIONS));
  const [moistObs, setMoistObs] = useState(deepClone(DEFAULT_AAC_MOISTURE_OBSERVATIONS));

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setGrade(initialData?.grade || 'Grade 1');
    setSampleName(initialData?.sampleName || '');

    // Compressive Observations
    if (initialData?.compressive?.observations?.length > 0) {
      setCompObs(
        initialData.compressive.observations.map((o, i) => ({
          specimenId: o.specimenId ?? `Specimen ${i + 1}`,
          length: o.length !== undefined ? String(o.length) : '150',
          breadth: (o.breadth ?? o.width) !== undefined ? String(o.breadth ?? o.width) : '150',
          height: o.height !== undefined ? String(o.height) : '150',
          load: o.load !== undefined ? String(o.load) : '',
        }))
      );
    } else {
      setCompObs(
        deepClone(DEFAULT_AAC_COMP_OBSERVATIONS).map((o, i) => ({
          ...o,
          specimenId: sampleCode ? `${sampleCode}-C${i + 1}` : o.specimenId,
        }))
      );
    }

    // Water Absorption Observations
    if (initialData?.waterAbsorption?.observations?.length > 0) {
      setWaObs(
        initialData.waterAbsorption.observations.map((o, i) => ({
          specimenId: o.specimenId ?? `Specimen ${i + 1}`,
          specimenSize: o.specimenSize || '40*40*160',
          wetMass: o.wetMass !== undefined ? String(o.wetMass) : '',
          dryMass: o.dryMass !== undefined ? String(o.dryMass) : '',
        }))
      );
    } else {
      setWaObs(
        deepClone(DEFAULT_AAC_WA_OBSERVATIONS).map((o, i) => ({
          ...o,
          specimenId: sampleCode ? `${sampleCode}-WA${i + 1}` : o.specimenId,
        }))
      );
    }

    // Density Observations
    if (initialData?.density?.observations?.length > 0) {
      setDensObs(
        initialData.density.observations.map((o, i) => ({
          specimenId: o.specimenId ?? `Specimen ${i + 1}`,
          length: o.length !== undefined ? String(o.length) : '100.0',
          breadth: (o.breadth ?? o.width) !== undefined ? String(o.breadth ?? o.width) : '200.0',
          height: o.height !== undefined ? String(o.height) : '50.0',
          weight: (o.weight ?? o.mass) !== undefined ? String(o.weight ?? o.mass) : '',
        }))
      );
    } else {
      setDensObs(
        deepClone(DEFAULT_AAC_DENSITY_OBSERVATIONS).map((o, i) => ({
          ...o,
          specimenId: sampleCode ? `${sampleCode}-D${i + 1}` : o.specimenId,
        }))
      );
    }

    // Moisture Content Observations
    if (initialData?.moistureContent?.observations?.length > 0) {
      setMoistObs(
        initialData.moistureContent.observations.map((o, i) => ({
          specimenId: o.specimenId ?? `Specimen ${i + 1}`,
          specimenSize: o.specimenSize || '150*150*150',
          wetMass: (o.wetMass ?? o.sampleWeight) !== undefined ? String(o.wetMass ?? o.sampleWeight) : '',
          dryMass: o.dryMass !== undefined ? String(o.dryMass) : '',
        }))
      );
    } else {
      setMoistObs(
        deepClone(DEFAULT_AAC_MOISTURE_OBSERVATIONS).map((o, i) => ({
          ...o,
          specimenId: sampleCode ? `${sampleCode}-M${i + 1}` : o.specimenId,
        }))
      );
    }

    setActiveTab('compressive');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calculated outputs ─────────────────────────────────────────────────────
  const compResult = useMemo(() => calculateAacBlockCompressiveStrength(compObs), [compObs]);
  const waResult = useMemo(() => calculateAacBlockWaterAbsorption(waObs), [waObs]);
  const densResult = useMemo(() => calculateAacBlockDensity(densObs), [densObs]);
  const moistResult = useMemo(() => calculateAacBlockMoistureContent(moistObs), [moistObs]);

  // ── Generic cell change helpers ────────────────────────────────────────────
  const chg = (setter) => (i, field, val) =>
    setter((p) => {
      const copy = [...p];
      copy[i] = { ...copy[i], [field]: val };
      return copy;
    });

  const chgComp = chg(setCompObs);
  const chgWa = chg(setWaObs);
  const chgDens = chg(setDensObs);
  const chgMoist = chg(setMoistObs);

  // ── Row addition / removal ────────────────────────────────────────────────
  const addRow = (setter, def, label) =>
    setter((p) => [...p, { ...def, specimenId: `${label} ${p.length + 1}` }]);
  const removeRow = (setter, i) =>
    setter((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  // ── Reset & Fill Sample Data ──────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setGrade('Grade 1');
    setSampleName('');
    setCompObs(deepClone(DEFAULT_AAC_COMP_OBSERVATIONS));
    setWaObs(deepClone(DEFAULT_AAC_WA_OBSERVATIONS));
    setDensObs(deepClone(DEFAULT_AAC_DENSITY_OBSERVATIONS));
    setMoistObs(deepClone(DEFAULT_AAC_MOISTURE_OBSERVATIONS));
  };

  const handleFillSample = () => {
    setGrade(SAMPLE_AAC_BLOCK_TEST_DATA.grade);
    setSampleName(SAMPLE_AAC_BLOCK_TEST_DATA.sampleName);
    setCompObs(deepClone(SAMPLE_AAC_BLOCK_TEST_DATA.compressive.observations));
    setWaObs(deepClone(SAMPLE_AAC_BLOCK_TEST_DATA.waterAbsorption.observations));
    setDensObs(deepClone(SAMPLE_AAC_BLOCK_TEST_DATA.density.observations));
    setMoistObs(deepClone(SAMPLE_AAC_BLOCK_TEST_DATA.moistureContent.observations));
  };

  // ── Apply & Save ──────────────────────────────────────────────────────────
  const handleApply = () => {
    const payload = {
      grade,
      sampleName,
      standard: 'IS 6441 / IS 6598 / IS 2185 (Part 3)',
      compressive: {
        observations: compResult.rows.map((r) => ({
          slNo: r.slNo,
          specimenId: r.specimenId,
          length: r.length,
          breadth: r.breadth,
          height: r.height,
          area: r.areaFmt,
          load: r.load,
          strength: r.strengthFmt,
        })),
        avgCompressiveStrength: compResult.avgStrengthFmt,
      },
      waterAbsorption: {
        observations: waResult.rows.map((r) => ({
          slNo: r.slNo,
          specimenId: r.specimenId,
          specimenSize: r.specimenSize,
          wetMass: r.wetMass,
          dryMass: r.dryMass,
          waterAbsorption: r.waFmt,
        })),
        avgWaterAbsorption: waResult.avgWaFmt,
      },
      density: {
        observations: densResult.rows.map((r) => ({
          slNo: r.slNo,
          specimenId: r.specimenId,
          length: r.length,
          breadth: r.breadth,
          height: r.height,
          volume: r.volumeFmt,
          weight: r.weight,
          density: r.densityFmt,
        })),
        avgDensity: densResult.avgDensityFmt,
      },
      moistureContent: {
        observations: moistResult.rows.map((r) => ({
          slNo: r.slNo,
          specimenId: r.specimenId,
          specimenSize: r.specimenSize,
          wetMass: r.wetMass,
          dryMass: r.dryMass,
          moistureContent: r.moistureFmt,
        })),
        avgMoistureContent: moistResult.avgMoistureFmt,
      },
    };

    if (onApply) onApply(payload);
    onClose();
  };

  // Shared styles
  const theadCls =
    'bg-gray-50/80 dark:bg-muted/50 border-b border-gray-200 dark:border-border text-gray-600 dark:text-gray-300';
  const tbodyCls = 'divide-y divide-gray-100 dark:divide-border';
  const trCls = 'hover:bg-gray-50/50 dark:hover:bg-muted/20 transition-colors';
  const thCls = 'p-2.5 font-bold text-xs whitespace-nowrap text-left';
  const tdCls = 'p-1.5';
  const calcCls = 'p-2.5 text-right font-mono text-xs font-semibold';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border shadow-2xl rounded-2xl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-stone-50/80 via-teal-50/30 to-transparent dark:from-stone-950/30 dark:via-teal-950/20 dark:to-transparent shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    AAC Block Test Data Entry
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700"
                  >
                    IS 6441 / IS 6598
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-stone-50 text-stone-700 border-stone-300 dark:bg-stone-950/50 dark:text-stone-300 dark:border-stone-700"
                  >
                    IS 2185 (Part 3)
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Compressive Strength · Water Absorption · Bulk Density · Moisture Content
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
                className="hidden h-8 text-xs gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/50"
              >
                <Sparkles className="w-3.5 h-3.5" /> Fill Sample Data
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Metadata Info Bar ────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-2.5 bg-gray-50/70 dark:bg-muted/30 border-b border-gray-100 dark:border-border flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground whitespace-nowrap">
              Grade / Class:
            </Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="h-8 text-xs w-48 bg-white dark:bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AAC_BLOCK_GRADES.map((g) => (
                  <SelectItem key={g.value} value={g.value} className="text-xs">
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground whitespace-nowrap">
              Description / Specimen Size:
            </Label>
            <Input
              value={sampleName}
              onChange={(e) => setSampleName(e.target.value)}
              placeholder="e.g. AAC Block (600 x 200 x 150 mm)"
              className="h-8 text-xs bg-white dark:bg-background"
            />
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            {/* Tab navigation */}
            <TabsList className="shrink-0 rounded-none border-b dark:border-border bg-transparent px-4 justify-start gap-1 h-auto py-0">
              {[
                {
                  value: 'compressive',
                  label: 'Compressive Strength',
                  icon: <Activity className="w-3.5 h-3.5" />,
                  count: compObs.length,
                },
                {
                  value: 'water',
                  label: 'Water Absorption',
                  icon: <Droplets className="w-3.5 h-3.5" />,
                  count: waObs.length,
                },
                {
                  value: 'density',
                  label: 'Bulk Density',
                  icon: <Weight className="w-3.5 h-3.5" />,
                  count: densObs.length,
                },
                {
                  value: 'moisture',
                  label: 'Moisture Content',
                  icon: <Percent className="w-3.5 h-3.5" />,
                  count: moistObs.length,
                },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="relative px-4 py-3 rounded-none bg-transparent shadow-none text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5
                             data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary
                             after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform
                             data-[state=active]:after:scale-x-100"
                >
                  {t.icon}
                  {t.label}
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground">
                    {t.count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── TAB 1: Compressive Strength ─────────────────────────────── */}
            <TabsContent value="compressive" className="p-4 sm:p-6 space-y-4 outline-none mt-0">
              <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 text-xs text-teal-900 dark:text-teal-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-teal-600" />
                <div>
                  <span className="font-semibold">IS 6441 (Part 5): 1972 RA 2012 — </span>
                  Standard specimen size: 150 × 150 × 150 mm.
                  <span className="ml-2 font-mono">Area = Length × Breadth (mm²)</span> ·
                  <span className="ml-2 font-mono">σ = (Load [kN] / Area) × 1000 (N/mm²)</span> ·
                  Reported to 1 decimal place.
                </div>
              </div>

              <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={theadCls}>
                      <tr>
                        <th className={thCls}>Sl No</th>
                        <th className={thCls}>Specimen ID</th>
                        <th className={thCls}>Length (mm) [C1]</th>
                        <th className={thCls}>Breadth (mm) [C2]</th>
                        <th className={thCls}>Height (mm) [C3]</th>
                        <th className={`${thCls} text-right`}>Area (mm²) [C4]</th>
                        <th className={thCls}>Compressive Load (kN) [C5]</th>
                        <th className={`${thCls} text-right`}>Strength (N/mm²) [C6]</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className={tbodyCls}>
                      {compResult.rows.map((row, idx) => (
                        <tr key={idx} className={trCls}>
                          <td className="p-2.5 font-medium text-gray-500">{row.slNo}</td>
                          <td className={tdCls}>
                            <Input
                              value={compObs[idx]?.specimenId || ''}
                              onChange={(e) => chgComp(idx, 'specimenId', e.target.value)}
                              className="h-8 text-xs font-mono w-28"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              value={compObs[idx]?.length || ''}
                              onChange={(e) => chgComp(idx, 'length', e.target.value)}
                              className="h-8 text-xs font-mono w-24"
                              placeholder="150"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              value={compObs[idx]?.breadth || ''}
                              onChange={(e) => chgComp(idx, 'breadth', e.target.value)}
                              className="h-8 text-xs font-mono w-24"
                              placeholder="150"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              value={compObs[idx]?.height || ''}
                              onChange={(e) => chgComp(idx, 'height', e.target.value)}
                              className="h-8 text-xs font-mono w-24"
                              placeholder="150"
                            />
                          </td>
                          <td className={calcCls}>
                            {row.areaFmt ? (
                              <span className="text-gray-700 dark:text-gray-300">{row.areaFmt}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={compObs[idx]?.load || ''}
                              onChange={(e) => chgComp(idx, 'load', e.target.value)}
                              className="h-8 text-xs font-mono w-28 font-semibold text-teal-700 dark:text-teal-400"
                              placeholder="e.g. 117.0"
                            />
                          </td>
                          <td className={calcCls}>
                            {row.strengthFmt ? (
                              <span className="text-teal-700 dark:text-teal-400 font-bold text-sm">
                                {row.strengthFmt}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(setCompObs, idx)}
                              disabled={compObs.length <= 1}
                              className="h-7 w-7 text-gray-400 hover:text-red-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-teal-50/40 dark:bg-teal-950/30 border-t-2 border-teal-200 dark:border-teal-800 font-semibold text-xs">
                      <tr>
                        <td colSpan={7} className="p-3 text-right font-bold text-teal-900 dark:text-teal-200">
                          Average Compressive Strength:
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm text-teal-900 dark:text-teal-200">
                          {compResult.avgStrengthFmt ? `${compResult.avgStrengthFmt} N/mm²` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(setCompObs, DEFAULT_AAC_COMP_OBS, 'Specimen')}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Specimen
                </Button>
                <div className="text-xs text-muted-foreground">
                  Minimum 3 specimens recommended per IS 6441 Part 5
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 2: Water Absorption ─────────────────────────────────── */}
            <TabsContent value="water" className="p-4 sm:p-6 space-y-4 outline-none mt-0">
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 6598: 1972 — </span>
                  Specimen Size: 40 × 40 × 160 mm.
                  <span className="ml-2 font-mono">
                    WA (%) = ((Wet Mass [A] - Oven Dry Mass [B]) / Oven Dry Mass [B]) × 100
                  </span> ·
                  Average of 6 specimens reported to 1 decimal place.
                </div>
              </div>

              <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={theadCls}>
                      <tr>
                        <th className={thCls}>Sl No</th>
                        <th className={thCls}>Specimen ID</th>
                        <th className={thCls}>Specimen Size (mm) [C1]</th>
                        <th className={thCls}>Wet Mass (A) g [C2]</th>
                        <th className={thCls}>Oven Dry Mass (B) g [C3]</th>
                        <th className={`${thCls} text-right`}>Water Absorption (%) [C4]</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className={tbodyCls}>
                      {waResult.rows.map((row, idx) => (
                        <tr key={idx} className={trCls}>
                          <td className="p-2.5 font-medium text-gray-500">{row.slNo}</td>
                          <td className={tdCls}>
                            <Input
                              value={waObs[idx]?.specimenId || ''}
                              onChange={(e) => chgWa(idx, 'specimenId', e.target.value)}
                              className="h-8 text-xs font-mono w-28"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              value={waObs[idx]?.specimenSize || ''}
                              onChange={(e) => chgWa(idx, 'specimenSize', e.target.value)}
                              className="h-8 text-xs font-mono w-32"
                              placeholder="40*40*160"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={waObs[idx]?.wetMass || ''}
                              onChange={(e) => chgWa(idx, 'wetMass', e.target.value)}
                              className="h-8 text-xs font-mono w-28 text-blue-700 dark:text-blue-400 font-semibold"
                              placeholder="e.g. 187"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={waObs[idx]?.dryMass || ''}
                              onChange={(e) => chgWa(idx, 'dryMass', e.target.value)}
                              className="h-8 text-xs font-mono w-28 text-blue-700 dark:text-blue-400 font-semibold"
                              placeholder="e.g. 158"
                            />
                          </td>
                          <td className={calcCls}>
                            {row.waFmt ? (
                              <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">
                                {row.waFmt}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(setWaObs, idx)}
                              disabled={waObs.length <= 1}
                              className="h-7 w-7 text-gray-400 hover:text-red-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50/40 dark:bg-blue-950/30 border-t-2 border-blue-200 dark:border-blue-800 font-semibold text-xs">
                      <tr>
                        <td colSpan={5} className="p-3 text-right font-bold text-blue-900 dark:text-blue-200">
                          Average Water Absorption:
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm text-blue-900 dark:text-blue-200">
                          {waResult.avgWaFmt ? `${waResult.avgWaFmt}%` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(setWaObs, DEFAULT_AAC_WA_OBS, 'Specimen')}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Specimen
                </Button>
                <div className="text-xs text-muted-foreground">
                  6 specimens tested per IS 6598
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 3: Bulk Density ─────────────────────────────────────── */}
            <TabsContent value="density" className="p-4 sm:p-6 space-y-4 outline-none mt-0">
              <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 text-xs text-orange-900 dark:text-orange-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
                <div>
                  <span className="font-semibold">IS 6441 (Part 1): 1972 Clause 5.1.1 — </span>
                  Standard specimen size: 100 × 200 × 50 mm.
                  <span className="ml-2 font-mono">Volume = (L × B × H) / 10⁹ (m³)</span> ·
                  <span className="ml-2 font-mono">Density = Weight [kg] / Volume [m³]</span>.
                  <div className="mt-1 font-semibold text-orange-950 dark:text-orange-200">
                    * Individual bulk density calculated within 3 decimal places; mean value calculated within 2 decimal places.
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={theadCls}>
                      <tr>
                        <th className={thCls}>Sl No</th>
                        <th className={thCls}>Specimen ID</th>
                        <th className={thCls}>Length (mm) [C1]</th>
                        <th className={thCls}>Breadth (mm) [C2]</th>
                        <th className={thCls}>Height (mm) [C3]</th>
                        <th className={`${thCls} text-right`}>Volume (m³) [C4]</th>
                        <th className={thCls}>Weight (kg) [C5]</th>
                        <th className={`${thCls} text-right`}>Density (kg/m³) [C6]</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className={tbodyCls}>
                      {densResult.rows.map((row, idx) => (
                        <tr key={idx} className={trCls}>
                          <td className="p-2.5 font-medium text-gray-500">{row.slNo}</td>
                          <td className={tdCls}>
                            <Input
                              value={densObs[idx]?.specimenId || ''}
                              onChange={(e) => chgDens(idx, 'specimenId', e.target.value)}
                              className="h-8 text-xs font-mono w-28"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={densObs[idx]?.length || ''}
                              onChange={(e) => chgDens(idx, 'length', e.target.value)}
                              className="h-8 text-xs font-mono w-24"
                              placeholder="100.0"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={densObs[idx]?.breadth || ''}
                              onChange={(e) => chgDens(idx, 'breadth', e.target.value)}
                              className="h-8 text-xs font-mono w-24"
                              placeholder="200.0"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={densObs[idx]?.height || ''}
                              onChange={(e) => chgDens(idx, 'height', e.target.value)}
                              className="h-8 text-xs font-mono w-24"
                              placeholder="50.0"
                            />
                          </td>
                          <td className={calcCls}>
                            {row.volumeFmt ? (
                              <span className="text-gray-700 dark:text-gray-300 font-mono">
                                {row.volumeFmt}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.001"
                              value={densObs[idx]?.weight || ''}
                              onChange={(e) => chgDens(idx, 'weight', e.target.value)}
                              className="h-8 text-xs font-mono w-28 text-orange-700 dark:text-orange-400 font-semibold"
                              placeholder="e.g. 0.648"
                            />
                          </td>
                          <td className={calcCls}>
                            {row.densityFmt ? (
                              <span className="text-orange-700 dark:text-orange-400 font-bold text-sm">
                                {row.densityFmt}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(setDensObs, idx)}
                              disabled={densObs.length <= 1}
                              className="h-7 w-7 text-gray-400 hover:text-red-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-orange-50/40 dark:bg-orange-950/30 border-t-2 border-orange-200 dark:border-orange-800 font-semibold text-xs">
                      <tr>
                        <td colSpan={7} className="p-3 text-right font-bold text-orange-900 dark:text-orange-200">
                          Average Bulk Density (Mean within 2 decimal places):
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm text-orange-900 dark:text-orange-200">
                          {densResult.avgDensityFmt ? `${densResult.avgDensityFmt} kg/m³` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(setDensObs, DEFAULT_AAC_DENSITY_OBS, 'Specimen')}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Specimen
                </Button>
                <div className="text-xs text-muted-foreground">
                  3 specimens tested per IS 6441 Part 1
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 4: Moisture Content ─────────────────────────────────── */}
            <TabsContent value="moisture" className="p-4 sm:p-6 space-y-4 outline-none mt-0">
              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
                <div>
                  <span className="font-semibold">IS 6441 (Part 1): 1972 Clause 5.2.1 — </span>
                  Specimen Size: 150 × 150 × 150 mm.
                  <span className="ml-2 font-mono">
                    Moisture Content (%) = ((Sample Weight [A] - Oven Dry Mass [B]) / Oven Dry Mass [B]) × 100
                  </span>.
                  <div className="mt-1 font-semibold text-purple-950 dark:text-purple-200">
                    * Clause 5.2.1: Moisture content of individual and mean value of three specimens shall be stated in whole percent.
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={theadCls}>
                      <tr>
                        <th className={thCls}>Sl No</th>
                        <th className={thCls}>Specimen ID</th>
                        <th className={thCls}>Specimen Size (mm) [C1]</th>
                        <th className={thCls}>Sample Weight (A) g [C2]</th>
                        <th className={thCls}>Oven Dry Mass (B) g [C3]</th>
                        <th className={`${thCls} text-right`}>Moisture Content (%) [C4]</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className={tbodyCls}>
                      {moistResult.rows.map((row, idx) => (
                        <tr key={idx} className={trCls}>
                          <td className="p-2.5 font-medium text-gray-500">{row.slNo}</td>
                          <td className={tdCls}>
                            <Input
                              value={moistObs[idx]?.specimenId || ''}
                              onChange={(e) => chgMoist(idx, 'specimenId', e.target.value)}
                              className="h-8 text-xs font-mono w-28"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              value={moistObs[idx]?.specimenSize || ''}
                              onChange={(e) => chgMoist(idx, 'specimenSize', e.target.value)}
                              className="h-8 text-xs font-mono w-32"
                              placeholder="150*150*150"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={moistObs[idx]?.wetMass || ''}
                              onChange={(e) => chgMoist(idx, 'wetMass', e.target.value)}
                              className="h-8 text-xs font-mono w-28 text-purple-700 dark:text-purple-400 font-semibold"
                              placeholder="e.g. 158"
                            />
                          </td>
                          <td className={tdCls}>
                            <Input
                              type="number"
                              step="0.1"
                              value={moistObs[idx]?.dryMass || ''}
                              onChange={(e) => chgMoist(idx, 'dryMass', e.target.value)}
                              className="h-8 text-xs font-mono w-28 text-purple-700 dark:text-purple-400 font-semibold"
                              placeholder="e.g. 143"
                            />
                          </td>
                          <td className={calcCls}>
                            {row.moistureFmt ? (
                              <span className="text-purple-700 dark:text-purple-400 font-bold text-sm">
                                {row.moistureFmt}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(setMoistObs, idx)}
                              disabled={moistObs.length <= 1}
                              className="h-7 w-7 text-gray-400 hover:text-red-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-purple-50/40 dark:bg-purple-950/30 border-t-2 border-purple-200 dark:border-purple-800 font-semibold text-xs">
                      <tr>
                        <td colSpan={5} className="p-3 text-right font-bold text-purple-900 dark:text-purple-200">
                          Average Moisture Content (Whole percent):
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm text-purple-900 dark:text-purple-200">
                          {moistResult.avgMoistureFmt ? `${moistResult.avgMoistureFmt}%` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(setMoistObs, DEFAULT_AAC_MOISTURE_OBS, 'Specimen')}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Specimen
                </Button>
                <div className="text-xs text-muted-foreground">
                  3 specimens tested per IS 6441 Part 1 Clause 5.2
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Summary Footer ──────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-t dark:border-border bg-gray-50/80 dark:bg-muted/30 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Compressive summary badge */}
            <div className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <div className="text-[11px] leading-tight">
                <div className="text-gray-500 dark:text-muted-foreground">Avg Compressive</div>
                <div className="font-bold text-teal-700 dark:text-teal-300 font-mono">
                  {compResult.avgStrengthFmt ? `${compResult.avgStrengthFmt} N/mm²` : '—'}
                </div>
              </div>
            </div>

            {/* WA summary badge */}
            <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <div className="text-[11px] leading-tight">
                <div className="text-gray-500 dark:text-muted-foreground">Avg Water Abs.</div>
                <div className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                  {waResult.avgWaFmt ? `${waResult.avgWaFmt}%` : '—'}
                </div>
              </div>
            </div>

            {/* Density summary badge */}
            <div className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/60 flex items-center gap-2">
              <Weight className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <div className="text-[11px] leading-tight">
                <div className="text-gray-500 dark:text-muted-foreground">Avg Bulk Density</div>
                <div className="font-bold text-orange-700 dark:text-orange-300 font-mono">
                  {densResult.avgDensityFmt ? `${densResult.avgDensityFmt} kg/m³` : '—'}
                </div>
              </div>
            </div>

            {/* Moisture summary badge */}
            <div className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 flex items-center gap-2">
              <Percent className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <div className="text-[11px] leading-tight">
                <div className="text-gray-500 dark:text-muted-foreground">Avg Moisture</div>
                <div className="font-bold text-purple-700 dark:text-purple-300 font-mono">
                  {moistResult.avgMoistureFmt ? `${moistResult.avgMoistureFmt}%` : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 text-xs gap-1.5 text-gray-600 dark:text-gray-300"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-9 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> Save AAC Block Test Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
