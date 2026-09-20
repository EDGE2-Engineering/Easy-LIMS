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
  Activity,
  Droplets,
  Weight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  BLOCK_GRADES,
  DEFAULT_COMP_OBS,
  DEFAULT_WA_OBS,
  DEFAULT_DENSITY_OBS,
  DEFAULT_COMP_OBSERVATIONS,
  DEFAULT_WA_OBSERVATIONS,
  DEFAULT_DENSITY_OBSERVATIONS,
  SAMPLE_BLOCKS_TEST_DATA,
  calculateBlocksCompressiveStrength,
  calculateBlocksWaterAbsorption,
  calculateBlockDensity,
} from '@/utils/blocksTestCalculation';

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlocksTestModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [activeTab, setActiveTab]   = useState('compressive');
  const [grade,     setGrade]       = useState('C5.0');
  const [sampleName, setSampleName] = useState('');
  const [compObs,   setCompObs]     = useState(deepClone(DEFAULT_COMP_OBSERVATIONS));
  const [waObs,     setWaObs]       = useState(deepClone(DEFAULT_WA_OBSERVATIONS));
  const [densObs,   setDensObs]     = useState(deepClone(DEFAULT_DENSITY_OBSERVATIONS));

  // ── Load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setGrade(initialData?.grade || 'C5.0');
    setSampleName(initialData?.sampleName || '');

    setCompObs(
      initialData?.compressiveStrength?.observations?.length > 0
        ? initialData.compressiveStrength.observations.map((o, i) => ({
            blockId: o.blockId ?? `Block ${i + 1}`,
            length:  o.length  !== undefined ? String(o.length)  : '',
            width:   o.width   !== undefined ? String(o.width)   : '',
            height:  o.height  !== undefined ? String(o.height)  : '',
            load:    o.load    !== undefined ? String(o.load)    : '',
          }))
        : deepClone(DEFAULT_COMP_OBSERVATIONS).map((o, i) => ({
            ...o, blockId: sampleCode ? `${sampleCode}-${i + 1}` : o.blockId,
          }))
    );

    setWaObs(
      initialData?.waterAbsorption?.observations?.length > 0
        ? initialData.waterAbsorption.observations.map((o, i) => ({
            blockId: o.blockId ?? `Block ${i + 1}`,
            idMark:  o.idMark  || '',
            wetMass: o.wetMass !== undefined ? String(o.wetMass) : '',
            dryMass: o.dryMass !== undefined ? String(o.dryMass) : '',
          }))
        : deepClone(DEFAULT_WA_OBSERVATIONS).map((o, i) => ({
            ...o, blockId: sampleCode ? `${sampleCode}-${i + 1}` : o.blockId,
          }))
    );

    setDensObs(
      initialData?.blockDensity?.observations?.length > 0
        ? initialData.blockDensity.observations.map((o, i) => ({
            blockId: o.blockId ?? `Block ${i + 1}`,
            length:  o.length  !== undefined ? String(o.length)  : '',
            width:   o.width   !== undefined ? String(o.width)   : '',
            height:  o.height  !== undefined ? String(o.height)  : '',
            mass:    o.mass    !== undefined ? String(o.mass)    : '',
          }))
        : deepClone(DEFAULT_DENSITY_OBSERVATIONS)
    );

    setActiveTab('compressive');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calculations ─────────────────────────────────────────────────────────
  const compResult = useMemo(() => calculateBlocksCompressiveStrength(compObs, grade), [compObs, grade]);
  const waResult   = useMemo(() => calculateBlocksWaterAbsorption(waObs),              [waObs]);
  const densResult = useMemo(() => calculateBlockDensity(densObs),                     [densObs]);

  // ── Generic cell change ───────────────────────────────────────────────────
  const chg = (setter) => (i, field, val) =>
    setter((p) => { const c = [...p]; c[i] = { ...c[i], [field]: val }; return c; });
  const chgComp = chg(setCompObs);
  const chgWa   = chg(setWaObs);
  const chgDens = chg(setDensObs);

  // ── Add / remove ──────────────────────────────────────────────────────────
  const addRow    = (setter, def, label) =>
    setter((p) => [...p, { ...def, blockId: `${label} ${p.length + 1}` }]);
  const removeRow = (setter, i) =>
    setter((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  // ── Reset / fill ──────────────────────────────────────────────────────────
  const handleReset = () => {
    setGrade('C5.0'); setSampleName('');
    setCompObs(deepClone(DEFAULT_COMP_OBSERVATIONS));
    setWaObs(deepClone(DEFAULT_WA_OBSERVATIONS));
    setDensObs(deepClone(DEFAULT_DENSITY_OBSERVATIONS));
  };
  const handleFillSample = () => {
    setGrade(SAMPLE_BLOCKS_TEST_DATA.grade);
    setSampleName(SAMPLE_BLOCKS_TEST_DATA.sampleName);
    setCompObs(deepClone(SAMPLE_BLOCKS_TEST_DATA.compressiveStrength.observations));
    setWaObs(deepClone(SAMPLE_BLOCKS_TEST_DATA.waterAbsorption.observations));
    setDensObs(deepClone(SAMPLE_BLOCKS_TEST_DATA.blockDensity.observations));
  };

  // ── Apply & save ──────────────────────────────────────────────────────────
  const handleApply = () => {
    const payload = {
      grade,
      sampleName,
      compressiveStrength: {
        observations: compResult.rows.map((r) => ({
          slNo: r.slNo, blockId: r.blockId,
          length: r.length, width: r.width, height: r.height,
          area: r.areaFmt, load: r.load, strength: r.strengthFmt,
        })),
        avgCompressiveStrength: compResult.avgStrengthFmt,
      },
      waterAbsorption: {
        observations: waResult.rows.map((r) => ({
          slNo: r.slNo, blockId: r.blockId, idMark: r.idMark,
          wetMass: r.wetMass, dryMass: r.dryMass, waterAbsorption: r.waFmt,
        })),
        avgWaterAbsorption: waResult.avgWaFmt,
      },
      blockDensity: {
        observations: densResult.rows.map((r) => ({
          slNo: r.slNo, blockId: r.blockId,
          length: r.length, width: r.width, height: r.height,
          mass: r.mass, volume: r.volumeFmt, density: r.densityFmt,
        })),
        avgBlockDensity: densResult.avgDensityFmt,
      },
    };
    if (onApply) onApply(payload);
    onClose();
  };

  // ── Shared table styles ───────────────────────────────────────────────────
  const theadCls = 'bg-gray-50/80 dark:bg-muted/50 border-b border-gray-200 dark:border-border text-gray-600 dark:text-gray-300';
  const tbodyCls = 'divide-y divide-gray-100 dark:divide-border';
  const trCls    = 'hover:bg-gray-50/50 dark:hover:bg-muted/20 transition-colors';
  const thCls    = 'p-2.5 font-bold text-xs whitespace-nowrap';
  const tdCls    = 'p-1.5';
  const calcCls  = 'p-2.5 text-right font-mono text-xs font-semibold';

  // ── Grade compliance indicator ────────────────────────────────────────────
  const gradeInfo = compResult.gradeInfo;
  const avgStrNum = parseFloat(compResult.avgStrengthFmt);
  const complianceOk = !isNaN(avgStrNum) && gradeInfo && avgStrNum >= gradeInfo.minAvg;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border shadow-2xl rounded-2xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-stone-50/80 via-zinc-50/40 to-transparent dark:from-stone-950/30 dark:via-zinc-950/20 dark:to-transparent shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20 shadow-sm">
                <Weight className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    Solid / Hollow Blocks Tests
                  </DialogTitle>
                  <Badge variant="outline" className="text-[11px] font-semibold bg-stone-50 text-stone-700 border-stone-300 dark:bg-stone-950/50 dark:text-stone-300 dark:border-stone-700">
                    IS 2185 (Part 1): 2005 RA 2020
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Compressive Strength · Water Absorption · Block Density
                  {jobCode    ? ` • Job: ${jobCode}`       : ''}
                  {sampleCode ? ` • Sample: ${sampleCode}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleFillSample}
                className="h-8 text-xs gap-1.5 border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-950/50">
                <Sparkles className="w-3.5 h-3.5" /> Fill Sample Data
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}
                className="h-8 text-xs gap-1.5 text-gray-500 hover:text-gray-700">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">

            {/* Tab bar */}
            <TabsList className="shrink-0 rounded-none border-b dark:border-border bg-transparent px-4 justify-start gap-1 h-auto py-0">
              {[
                { value: 'compressive', label: 'Compressive Strength', icon: <Activity className="w-3.5 h-3.5" /> },
                { value: 'water',       label: 'Water Absorption',     icon: <Droplets className="w-3.5 h-3.5" /> },
                { value: 'density',     label: 'Block Density',        icon: <Weight   className="w-3.5 h-3.5" /> },
              ].map((t) => (
                <TabsTrigger key={t.value} value={t.value}
                  className="relative px-4 py-3 rounded-none bg-transparent shadow-none text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5
                             data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary
                             after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform
                             data-[state=active]:after:scale-x-100">
                  {t.icon}{t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Tab 1: Compressive Strength ──────────────────────────────── */}
            <TabsContent value="compressive" className="p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 2185 (Part 1) Cl. 5.1, 5.2 &amp; 9 — </span>
                  Area = L × B · σ = (P [kN] × 1000) / A [mm²] · Average reported to 1 decimal.
                </div>
              </div>

              {/* Metadata row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50/70 dark:bg-muted/30 border border-gray-100 dark:border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_GRADES.map((g) => (
                        <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Sample Name / Description</Label>
                  <Input
                    value={sampleName}
                    onChange={(e) => setSampleName(e.target.value)}
                    placeholder='e.g. Solid blocks (8" x 16" x 4")'
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Grade requirements banner */}
              {gradeInfo && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-muted/20 border dark:border-border text-xs">
                  <span className="text-gray-600 dark:text-muted-foreground font-semibold">{gradeInfo.label}:</span>
                  <span className="text-gray-600 dark:text-muted-foreground">
                    Min individual = <strong>{gradeInfo.minIndividual} N/mm²</strong> ·
                    Min average = <strong>{gradeInfo.minAvg} N/mm²</strong>
                  </span>
                  {compResult.avgStrengthFmt && (
                    complianceOk
                      ? <span className="ml-auto flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Compliant
                        </span>
                      : <span className="ml-auto flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
                          <XCircle className="w-4 h-4" /> Below Requirement
                        </span>
                  )}
                </div>
              )}

              {/* Observations table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-stone-500" /> Observations
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">{compObs.length} specimens</Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => addRow(setCompObs, DEFAULT_COMP_OBS, 'Block')}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Row
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-10`}>#</th>
                          <th className={`${thCls} min-w-[110px]`}>Block ID</th>
                          <th className={`${thCls} text-center min-w-[75px]`}>L (mm)</th>
                          <th className={`${thCls} text-center min-w-[75px]`}>B (mm)</th>
                          <th className={`${thCls} text-center min-w-[75px]`}>H (mm)</th>
                          <th className={`${thCls} text-right min-w-[100px] bg-stone-50/60 dark:bg-stone-900/30`}>
                            Area (mm²)
                            <span className="block text-[9px] font-normal text-stone-400">L × B</span>
                          </th>
                          <th className={`${thCls} text-right min-w-[110px]`}>Max Load P (kN)</th>
                          <th className={`${thCls} text-right min-w-[120px] bg-red-50/60 dark:bg-red-950/20`}>
                            σ (N/mm²)
                            <span className="block text-[9px] font-normal text-red-400">(P×1000)/A</span>
                          </th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {compResult.rows.map((row, idx) => (
                          <tr key={idx} className={`${trCls} ${row.errors.length > 0 ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                            <td className="p-2.5 text-center font-bold text-gray-400 dark:text-muted-foreground">{row.slNo}</td>
                            <td className={tdCls}>
                              <Input value={compObs[idx].blockId || ''} placeholder="Block 1"
                                onChange={(e) => chgComp(idx, 'blockId', e.target.value)}
                                className="h-8 text-xs font-medium" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={compObs[idx].length || ''} placeholder="400"
                                onChange={(e) => chgComp(idx, 'length', e.target.value)}
                                className="h-8 text-xs text-center px-1 w-[68px]" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={compObs[idx].width || ''} placeholder="200"
                                onChange={(e) => chgComp(idx, 'width', e.target.value)}
                                className="h-8 text-xs text-center px-1 w-[68px]" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={compObs[idx].height || ''} placeholder="200"
                                onChange={(e) => chgComp(idx, 'height', e.target.value)}
                                className="h-8 text-xs text-center px-1 w-[68px]" />
                            </td>
                            <td className={`${calcCls} bg-stone-50/50 dark:bg-stone-900/20`}>
                              {row.areaFmt
                                ? <span className="text-stone-700 dark:text-stone-300">{row.areaFmt}</span>
                                : <span className="text-gray-300 dark:text-gray-600">–</span>}
                            </td>
                            <td className={tdCls}>
                              <Input type="number" step="0.001" value={compObs[idx].load || ''} placeholder="530.171"
                                onChange={(e) => chgComp(idx, 'load', e.target.value)}
                                className="h-8 text-xs text-right font-mono w-[96px]" />
                            </td>
                            <td className={`${calcCls} bg-red-50/40 dark:bg-red-950/15`}>
                              {row.strengthFmt
                                ? <span className="font-bold text-red-800 dark:text-red-300">{row.strengthFmt}</span>
                                : <span className="text-gray-300 dark:text-gray-600">–</span>}
                            </td>
                            <td className="p-1.5 text-center">
                              {compObs.length > 1 && (
                                <Button type="button" variant="ghost" size="icon"
                                  onClick={() => removeRow(setCompObs, idx)}
                                  className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
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

              {compResult.generalErrors.length > 0 && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{compResult.generalErrors.join(' ')}</div>
                </div>
              )}

              {/* Summary card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-red-800 dark:text-red-400 uppercase tracking-wider block">
                    Average Compressive Strength
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-red-900 dark:text-red-200 font-mono">
                      {compResult.avgStrengthFmt || '–'}
                    </span>
                    <span className="text-xs font-bold text-red-700 dark:text-red-400">N/mm²</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-muted-foreground">
                    Reported to nearest 0.1 N/mm²
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider block">Specimens Tested</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-800 dark:text-foreground font-mono">{compObs.length}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-muted-foreground">Min. 3 required per standard</p>
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 2: Water Absorption ──────────────────────────────────── */}
            <TabsContent value="water" className="p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 2185 (Part 1) Cl. 9.5 — </span>
                  WA (%) = ((A − B) / B) × 100 · A = Wet mass (kg) · B = Oven-dry mass (kg).
                  Average of 3 samples shall not exceed <strong>10%</strong>.
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-500" /> Observations
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">{waObs.length} specimens</Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => addRow(setWaObs, DEFAULT_WA_OBS, 'Block')}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Row
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-10`}>#</th>
                          <th className={`${thCls} min-w-[110px]`}>Block ID</th>
                          <th className={`${thCls} min-w-[130px]`}>ID Mark / Supplier</th>
                          <th className={`${thCls} text-right min-w-[140px]`}>A — Wet Mass (kg)</th>
                          <th className={`${thCls} text-right min-w-[150px]`}>B — Oven-Dry Mass (kg)</th>
                          <th className={`${thCls} text-right min-w-[120px] bg-blue-50/60 dark:bg-blue-950/20`}>WA (%)</th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {waResult.rows.map((row, idx) => (
                          <tr key={idx} className={`${trCls} ${row.errors.length > 0 ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                            <td className="p-2.5 text-center font-bold text-gray-400 dark:text-muted-foreground">{row.slNo}</td>
                            <td className={tdCls}>
                              <Input value={waObs[idx].blockId || ''} placeholder="Block 1"
                                onChange={(e) => chgWa(idx, 'blockId', e.target.value)}
                                className="h-8 text-xs font-medium" />
                            </td>
                            <td className={tdCls}>
                              <Input value={waObs[idx].idMark || ''} placeholder="Not Furnished"
                                onChange={(e) => chgWa(idx, 'idMark', e.target.value)}
                                className="h-8 text-xs" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" step="0.001" value={waObs[idx].wetMass || ''} placeholder="34.050"
                                onChange={(e) => chgWa(idx, 'wetMass', e.target.value)}
                                className="h-8 text-xs text-right font-mono" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" step="0.001" value={waObs[idx].dryMass || ''} placeholder="32.879"
                                onChange={(e) => chgWa(idx, 'dryMass', e.target.value)}
                                className="h-8 text-xs text-right font-mono" />
                            </td>
                            <td className={`${calcCls} bg-blue-50/40 dark:bg-blue-950/15`}>
                              {row.waFmt
                                ? <span className="font-bold text-blue-800 dark:text-blue-300">{row.waFmt}</span>
                                : <span className="text-gray-300 dark:text-gray-600">–</span>}
                            </td>
                            <td className="p-1.5 text-center">
                              {waObs.length > 1 && (
                                <Button type="button" variant="ghost" size="icon"
                                  onClick={() => removeRow(setWaObs, idx)}
                                  className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
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

              {/* Summary */}
              <div className="flex items-start gap-4 flex-wrap">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 space-y-1 min-w-[160px]">
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider block">
                    Average Water Absorption
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-blue-900 dark:text-blue-200 font-mono">
                      {waResult.avgWaFmt || '–'}
                    </span>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">%</span>
                  </div>
                  {waResult.avgWaFmt && (
                    parseFloat(waResult.avgWaFmt) <= 10
                      ? <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ≤ 10% — Compliant</p>
                      : <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> &gt; 10% — Exceeds limit</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 3: Block Density ─────────────────────────────────────── */}
            <TabsContent value="density" className="p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 2185 (Part 1) Cl. 5.2 — </span>
                  V = (L/1000) × (B/1000) × (H/1000) m³ · ρ = W [kg] / V [m³].
                  Block density shall not be less than <strong>1800 kg/m³</strong>.
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Weight className="w-3.5 h-3.5 text-stone-500" /> Observations
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">{densObs.length} specimens</Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => addRow(setDensObs, DEFAULT_DENSITY_OBS, 'Block')}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Row
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-10`}>#</th>
                          <th className={`${thCls} min-w-[110px]`}>Block ID</th>
                          <th className={`${thCls} text-center min-w-[75px]`}>L (mm)</th>
                          <th className={`${thCls} text-center min-w-[75px]`}>B (mm)</th>
                          <th className={`${thCls} text-center min-w-[75px]`}>H (mm)</th>
                          <th className={`${thCls} text-right min-w-[130px]`}>W — Mass (kg)</th>
                          <th className={`${thCls} text-right min-w-[100px] bg-stone-50/60 dark:bg-stone-900/30`}>
                            V (m³)
                          </th>
                          <th className={`${thCls} text-right min-w-[120px] bg-orange-50/60 dark:bg-orange-950/20`}>
                            ρ (kg/m³)
                          </th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {densResult.rows.map((row, idx) => (
                          <tr key={idx} className={`${trCls} ${row.errors.length > 0 ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                            <td className="p-2.5 text-center font-bold text-gray-400 dark:text-muted-foreground">{row.slNo}</td>
                            <td className={tdCls}>
                              <Input value={densObs[idx].blockId || ''} placeholder="Block 1"
                                onChange={(e) => chgDens(idx, 'blockId', e.target.value)}
                                className="h-8 text-xs font-medium" />
                            </td>
                            {['length', 'width', 'height'].map((f) => (
                              <td key={f} className={tdCls}>
                                <Input type="number" value={densObs[idx][f] || ''} placeholder="400"
                                  onChange={(e) => chgDens(idx, f, e.target.value)}
                                  className="h-8 text-xs text-center px-1 w-[68px]" />
                              </td>
                            ))}
                            <td className={tdCls}>
                              <Input type="number" step="0.01" value={densObs[idx].mass || ''} placeholder="32.28"
                                onChange={(e) => chgDens(idx, 'mass', e.target.value)}
                                className="h-8 text-xs text-right font-mono" />
                            </td>
                            <td className={`${calcCls} bg-stone-50/40 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300`}>
                              {row.volumeFmt || <span className="text-gray-300 dark:text-gray-600">–</span>}
                            </td>
                            <td className={`${calcCls} bg-orange-50/40 dark:bg-orange-950/15`}>
                              {row.densityFmt
                                ? <span className="font-bold text-orange-800 dark:text-orange-300">{row.densityFmt}</span>
                                : <span className="text-gray-300 dark:text-gray-600">–</span>}
                            </td>
                            <td className="p-1.5 text-center">
                              {densObs.length > 1 && (
                                <Button type="button" variant="ghost" size="icon"
                                  onClick={() => removeRow(setDensObs, idx)}
                                  className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
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

              {/* Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 space-y-1 max-w-xs">
                <span className="text-[11px] font-bold text-orange-800 dark:text-orange-400 uppercase tracking-wider block">
                  Average Block Density
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-orange-900 dark:text-orange-200 font-mono">
                    {densResult.avgDensityFmt || '–'}
                  </span>
                  <span className="text-xs font-bold text-orange-700 dark:text-orange-400">kg/m³</span>
                </div>
                {densResult.avgDensityFmt && (
                  parseInt(densResult.avgDensityFmt, 10) >= 1800
                    ? <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ≥ 1800 kg/m³ — Compliant</p>
                    : <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> &lt; 1800 kg/m³ — Below requirement</p>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 border-t dark:border-border flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-muted/20">
          <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
            All three test results will be saved together.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleApply}
              className="h-9 text-xs gap-1.5 bg-stone-700 hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-500 text-white font-bold">
              <Check className="w-3.5 h-3.5" /> Save Blocks Test Data
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
