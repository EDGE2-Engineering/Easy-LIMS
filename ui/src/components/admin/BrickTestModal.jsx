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
  Ruler,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  DEFAULT_COMPRESSIVE_OBS,
  DEFAULT_WATER_ABS_OBS,
  DEFAULT_EFFLORESCENCE_OBS,
  DEFAULT_DIMENSIONS_OBS,
  DEFAULT_COMPRESSIVE_OBSERVATIONS,
  DEFAULT_WATER_ABS_OBSERVATIONS,
  DEFAULT_EFFLORESCENCE_OBSERVATIONS,
  DEFAULT_DIMENSIONS_OBSERVATIONS,
  EFFLORESCENCE_RATINGS,
  EFFLORESCENCE_DESCRIPTIONS,
  SAMPLE_BRICK_TEST_DATA,
  calculateBrickCompressiveStrength,
  calculateWaterAbsorption,
  calculateBrickDimensions,
} from '@/utils/brickTestCalculation';

// ─── helpers ─────────────────────────────────────────────────────────────────

function cloneObs(arr) {
  return arr.map((o) => ({ ...o }));
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Modal dialog for Brick Tests per IS 3495 / IS 1077
 * Tests: Compressive Strength | Water Absorption | Efflorescence | Dimensions
 */
export default function BrickTestModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [activeTab, setActiveTab] = useState('compressive');

  // ── Compressive Strength state ─────────────────────────────────────────
  const [compObs, setCompObs] = useState(cloneObs(DEFAULT_COMPRESSIVE_OBSERVATIONS));

  // ── Water Absorption state ─────────────────────────────────────────────
  const [waObs, setWaObs] = useState(cloneObs(DEFAULT_WATER_ABS_OBSERVATIONS));

  // ── Efflorescence state ────────────────────────────────────────────────
  const [effObs, setEffObs] = useState(cloneObs(DEFAULT_EFFLORESCENCE_OBSERVATIONS));

  // ── Dimensions state ───────────────────────────────────────────────────
  const [dimObs, setDimObs] = useState(cloneObs(DEFAULT_DIMENSIONS_OBSERVATIONS));

  // ── Load initialData when opening ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Compressive Strength
    if (initialData?.compressiveStrength?.observations?.length > 0) {
      setCompObs(
        initialData.compressiveStrength.observations.map((o, i) => ({
          brickId: o.brickId ?? `Brick ${i + 1}`,
          length: o.length !== undefined ? String(o.length) : '',
          width: o.width !== undefined ? String(o.width) : '',
          height: o.height !== undefined ? String(o.height) : '',
          failureLoadKn: o.failureLoadKn !== undefined ? String(o.failureLoadKn) : '',
        }))
      );
    } else {
      setCompObs(
        cloneObs(DEFAULT_COMPRESSIVE_OBSERVATIONS).map((o, i) => ({
          ...o,
          brickId: sampleCode ? `${sampleCode}-${i + 1}` : o.brickId,
        }))
      );
    }

    // Water Absorption
    if (initialData?.waterAbsorption?.observations?.length > 0) {
      setWaObs(
        initialData.waterAbsorption.observations.map((o, i) => ({
          brickId: o.brickId ?? `Brick ${i + 1}`,
          wetWeight: o.wetWeight !== undefined ? String(o.wetWeight) : '',
          dryWeight: o.dryWeight !== undefined ? String(o.dryWeight) : '',
        }))
      );
    } else {
      setWaObs(
        cloneObs(DEFAULT_WATER_ABS_OBSERVATIONS).map((o, i) => ({
          ...o,
          brickId: sampleCode ? `${sampleCode}-${i + 1}` : o.brickId,
        }))
      );
    }

    // Efflorescence
    if (initialData?.efflorescence?.observations?.length > 0) {
      setEffObs(
        initialData.efflorescence.observations.map((o, i) => ({
          brickId: o.brickId ?? `Brick ${i + 1}`,
          rating: o.rating || 'Nil',
        }))
      );
    } else {
      setEffObs(
        cloneObs(DEFAULT_EFFLORESCENCE_OBSERVATIONS).map((o, i) => ({
          ...o,
          brickId: sampleCode ? `${sampleCode}-${i + 1}` : o.brickId,
        }))
      );
    }

    // Dimensions
    if (initialData?.dimensions?.observations?.length > 0) {
      setDimObs(
        initialData.dimensions.observations.map((o, i) => ({
          brickId: o.brickId ?? `Brick ${i + 1}`,
          length: o.length !== undefined ? String(o.length) : '',
          width: o.width !== undefined ? String(o.width) : '',
          height: o.height !== undefined ? String(o.height) : '',
        }))
      );
    } else {
      setDimObs(cloneObs(DEFAULT_DIMENSIONS_OBSERVATIONS));
    }

    setActiveTab('compressive');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time calculations ──────────────────────────────────────────────
  const compResult = useMemo(() => calculateBrickCompressiveStrength(compObs), [compObs]);
  const waResult   = useMemo(() => calculateWaterAbsorption(waObs),           [waObs]);
  const dimResult  = useMemo(() => calculateBrickDimensions(dimObs),          [dimObs]);

  // ── Generic cell-change handlers ───────────────────────────────────────
  const changeComp = (i, field, val) =>
    setCompObs((prev) => { const c = [...prev]; c[i] = { ...c[i], [field]: val }; return c; });
  const changeWa   = (i, field, val) =>
    setWaObs((prev)  => { const c = [...prev]; c[i] = { ...c[i], [field]: val }; return c; });
  const changeEff  = (i, field, val) =>
    setEffObs((prev) => { const c = [...prev]; c[i] = { ...c[i], [field]: val }; return c; });
  const changeDim  = (i, field, val) =>
    setDimObs((prev) => { const c = [...prev]; c[i] = { ...c[i], [field]: val }; return c; });

  // ── Add / remove row helpers ────────────────────────────────────────────
  const addCompRow = () =>
    setCompObs((p) => [...p, { ...DEFAULT_COMPRESSIVE_OBS, brickId: `Brick ${p.length + 1}` }]);
  const removeCompRow = (i) =>
    setCompObs((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  const addWaRow = () =>
    setWaObs((p) => [...p, { ...DEFAULT_WATER_ABS_OBS, brickId: `Brick ${p.length + 1}` }]);
  const removeWaRow = (i) =>
    setWaObs((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  const addEffRow = () =>
    setEffObs((p) => [...p, { ...DEFAULT_EFFLORESCENCE_OBS, brickId: `Brick ${p.length + 1}` }]);
  const removeEffRow = (i) =>
    setEffObs((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  const addDimRow = () =>
    setDimObs((p) => [...p, { ...DEFAULT_DIMENSIONS_OBS, brickId: `Brick ${p.length + 1}` }]);
  const removeDimRow = (i) =>
    setDimObs((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  // ── Reset ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    setCompObs(cloneObs(DEFAULT_COMPRESSIVE_OBSERVATIONS));
    setWaObs(cloneObs(DEFAULT_WATER_ABS_OBSERVATIONS));
    setEffObs(cloneObs(DEFAULT_EFFLORESCENCE_OBSERVATIONS));
    setDimObs(cloneObs(DEFAULT_DIMENSIONS_OBSERVATIONS));
  };

  // ── Fill sample data ────────────────────────────────────────────────────
  const handleFillSample = () => {
    setCompObs(cloneObs(SAMPLE_BRICK_TEST_DATA.compressiveStrength.observations));
    setWaObs(cloneObs(SAMPLE_BRICK_TEST_DATA.waterAbsorption.observations));
    setEffObs(cloneObs(SAMPLE_BRICK_TEST_DATA.efflorescence.observations));
    setDimObs(cloneObs(SAMPLE_BRICK_TEST_DATA.dimensions.observations));
  };

  // ── Apply & Save ────────────────────────────────────────────────────────
  const handleApply = () => {
    const payload = {
      compressiveStrength: {
        observations: compResult.rows.map((r) => ({
          slNo:             r.slNo,
          brickId:          r.brickId,
          length:           r.length,
          width:            r.width,
          height:           r.height,
          area:             r.areaFormatted,
          failureLoadKn:    r.failureLoadKn,
          strength:         r.strengthFormatted,
        })),
        avgCompressiveStrength: compResult.avgStrengthFormatted,
      },
      waterAbsorption: {
        observations: waResult.rows.map((r) => ({
          slNo:               r.slNo,
          brickId:            r.brickId,
          wetWeight:          r.wetWeight,
          dryWeight:          r.dryWeight,
          waterAbsorption:    r.absorptionFormatted,
        })),
        avgWaterAbsorption: waResult.avgAbsorptionFormatted,
      },
      efflorescence: {
        observations: effObs.map((o, i) => ({
          slNo:   i + 1,
          brickId: o.brickId || `Brick ${i + 1}`,
          rating:  o.rating || 'Nil',
        })),
      },
      dimensions: {
        observations: dimResult.rows.map((r) => ({
          slNo:   r.slNo,
          brickId: r.brickId,
          length: r.length,
          width:  r.width,
          height: r.height,
        })),
        totalLength:  dimResult.totalLength,
        totalWidth:   dimResult.totalWidth,
        totalHeight:  dimResult.totalHeight,
        avgLength:    dimResult.avgLength,
        avgWidth:     dimResult.avgWidth,
        avgHeight:    dimResult.avgHeight,
        count:        dimResult.count,
      },
    };

    if (onApply) onApply(payload);
    onClose();
  };

  // ─── Shared table chrome classes ─────────────────────────────────────────
  const theadCls = 'bg-gray-50/80 dark:bg-muted/50 border-b border-gray-200 dark:border-border text-gray-600 dark:text-gray-300';
  const tbodyCls = 'divide-y divide-gray-100 dark:divide-border';
  const trCls    = 'hover:bg-gray-50/50 dark:hover:bg-muted/20 transition-colors';
  const thCls    = 'p-2.5 font-bold text-xs';
  const tdCls    = 'p-2';

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border shadow-2xl rounded-2xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-red-50/80 via-rose-50/40 to-transparent dark:from-red-950/30 dark:via-rose-950/20 dark:to-transparent shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    Brick Tests
                  </DialogTitle>
                  <Badge variant="outline" className="text-[11px] font-semibold bg-red-50 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800">
                    IS 3495 / IS 1077
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Compressive Strength · Water Absorption · Efflorescence · Dimensions
                  {jobCode   ? ` • Job: ${jobCode}`     : ''}
                  {sampleCode ? ` • Sample: ${sampleCode}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleFillSample}
                className="h-8 text-xs gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50">
                <Sparkles className="w-3.5 h-3.5" /> Fill Sample Data
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}
                className="h-8 text-xs gap-1.5 text-gray-500 hover:text-gray-700">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">

            {/* Tab bar */}
            <TabsList className="shrink-0 rounded-none border-b dark:border-border bg-transparent px-4 justify-start gap-1 h-auto py-0">
              {[
                { value: 'compressive', label: 'Compressive Strength', icon: <Activity className="w-3.5 h-3.5" /> },
                { value: 'water',       label: 'Water Absorption',      icon: <Droplets className="w-3.5 h-3.5" /> },
                { value: 'efflor',      label: 'Efflorescence',         icon: <AlertTriangle className="w-3.5 h-3.5" /> },
                { value: 'dimensions',  label: 'Dimensions',            icon: <Ruler className="w-3.5 h-3.5" /> },
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

            {/* ── Tab 1: Compressive Strength ─────────────────────────── */}
            <TabsContent value="compressive" className="flex-1 p-4 sm:p-6 space-y-5 outline-none mt-0">

              {/* Standard info */}
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 3495 (Part 1) — Formula: </span>
                  Compressive Strength (N/mm²) = (Failure Load [kN] × 1000) / (L × W [mm²]).
                  Average reported to nearest 0.1 N/mm².
                </div>
              </div>

              {/* Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-red-500" /> Observations
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {compObs.length} specimens
                    </Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCompRow}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Row
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-10`}>Sl No</th>
                          <th className={`${thCls} min-w-[120px]`}>Brick ID</th>
                          <th className={`${thCls} text-center min-w-[60px]`}>L (mm)</th>
                          <th className={`${thCls} text-center min-w-[60px]`}>W (mm)</th>
                          <th className={`${thCls} text-center min-w-[60px]`}>H (mm)</th>
                          <th className={`${thCls} text-center min-w-[90px]`}>
                            Area (mm²)
                            <span className="block text-[10px] font-normal text-gray-400">L × W</span>
                          </th>
                          <th className={`${thCls} text-right min-w-[110px]`}>
                            Max Load (kN)
                          </th>
                          <th className={`${thCls} text-right min-w-[120px] bg-red-50/50 dark:bg-red-950/20`}>
                            Comp. Strength
                            <span className="block text-[10px] font-normal text-red-400">N/mm²</span>
                          </th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {compResult.rows.map((row, idx) => (
                          <tr key={idx} className={`${trCls} ${row.errors.length > 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                            <td className={`${tdCls} text-center font-bold text-gray-400 dark:text-muted-foreground`}>{row.slNo}</td>
                            <td className={tdCls}>
                              <Input value={compObs[idx].brickId || ''} placeholder="e.g. Brick 1"
                                onChange={(e) => changeComp(idx, 'brickId', e.target.value)}
                                className="h-8 text-xs font-medium" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={compObs[idx].length || ''} placeholder="221"
                                onChange={(e) => changeComp(idx, 'length', e.target.value)}
                                className="h-8 text-xs text-center px-1" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={compObs[idx].width || ''} placeholder="107"
                                onChange={(e) => changeComp(idx, 'width', e.target.value)}
                                className="h-8 text-xs text-center px-1" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={compObs[idx].height || ''} placeholder="79"
                                onChange={(e) => changeComp(idx, 'height', e.target.value)}
                                className="h-8 text-xs text-center px-1" />
                            </td>
                            <td className={`${tdCls} text-center font-mono text-gray-700 dark:text-gray-300`}>
                              {row.areaFormatted || <span className="text-gray-400">–</span>}
                            </td>
                            <td className={tdCls}>
                              <Input type="number" step="0.1" value={compObs[idx].failureLoadKn || ''} placeholder="112.9"
                                onChange={(e) => changeComp(idx, 'failureLoadKn', e.target.value)}
                                className="h-8 text-xs text-right font-mono" />
                            </td>
                            <td className={`${tdCls} text-right bg-red-50/40 dark:bg-red-950/10`}>
                              {row.strengthFormatted
                                ? <span className="font-mono font-bold text-red-800 dark:text-red-300">{row.strengthFormatted}</span>
                                : <span className="text-gray-400">–</span>}
                            </td>
                            <td className={`${tdCls} text-center`}>
                              {compObs.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCompRow(idx)}
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

              {/* Errors */}
              {compResult.generalErrors.length > 0 && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
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
                      {compResult.avgStrengthFormatted || '–'}
                    </span>
                    <span className="text-xs font-bold text-red-700 dark:text-red-400">N/mm²</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-muted-foreground">
                    Reported to nearest 0.1 N/mm² per IS 3495 (Part 1)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/30 border border-gray-100 dark:border-border space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider block">
                    Specimens
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-800 dark:text-foreground font-mono">
                      {compResult.rows.length}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">tested</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-muted-foreground">Min. 3 required per standard</p>
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 2: Water Absorption ─────────────────────────────── */}
            <TabsContent value="water" className="flex-1 p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 3495 (Part 2): RA 2019 — Formula: </span>
                  S (%) = ((W₁ − W₂) / W₂) × 100 · W₁ = Wet Weight (g) · W₂ = Oven-Dry Weight (g).
                  Average reported to 1 decimal place.
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
                  <Button type="button" variant="outline" size="sm" onClick={addWaRow}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Row
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-10`}>Sl No</th>
                          <th className={`${thCls} min-w-[120px]`}>Brick ID</th>
                          <th className={`${thCls} text-right min-w-[130px]`}>
                            Wet Weight W₁ (g)
                          </th>
                          <th className={`${thCls} text-right min-w-[140px]`}>
                            Oven-Dry Weight W₂ (g)
                          </th>
                          <th className={`${thCls} text-right min-w-[120px] bg-blue-50/50 dark:bg-blue-950/20`}>
                            Water Absorption S (%)
                          </th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {waResult.rows.map((row, idx) => (
                          <tr key={idx} className={`${trCls} ${row.errors.length > 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                            <td className={`${tdCls} text-center font-bold text-gray-400 dark:text-muted-foreground`}>{row.slNo}</td>
                            <td className={tdCls}>
                              <Input value={waObs[idx].brickId || ''} placeholder="e.g. Brick 1"
                                onChange={(e) => changeWa(idx, 'brickId', e.target.value)}
                                className="h-8 text-xs font-medium" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" step="0.1" value={waObs[idx].wetWeight || ''} placeholder="3320.0"
                                onChange={(e) => changeWa(idx, 'wetWeight', e.target.value)}
                                className="h-8 text-xs text-right font-mono" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" step="0.1" value={waObs[idx].dryWeight || ''} placeholder="2990.0"
                                onChange={(e) => changeWa(idx, 'dryWeight', e.target.value)}
                                className="h-8 text-xs text-right font-mono" />
                            </td>
                            <td className={`${tdCls} text-right bg-blue-50/40 dark:bg-blue-950/10`}>
                              {row.absorptionFormatted
                                ? <span className="font-mono font-bold text-blue-800 dark:text-blue-300">{row.absorptionFormatted}</span>
                                : <span className="text-gray-400">–</span>}
                            </td>
                            <td className={`${tdCls} text-center`}>
                              {waObs.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeWaRow(idx)}
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
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 space-y-1 max-w-xs">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider block">
                  Average Water Absorption
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-900 dark:text-blue-200 font-mono">
                    {waResult.avgAbsorptionFormatted || '–'}
                  </span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">%</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-muted-foreground">
                  IS 3495 (Part 2): RA 2019 — mean of specimens
                </p>
              </div>
            </TabsContent>

            {/* ── Tab 3: Efflorescence ────────────────────────────────── */}
            <TabsContent value="efflor" className="flex-1 p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 3495 (Part 3): RA 2019 — </span>
                  Qualitative visual rating of salt deposit on brick surface after immersion test.
                </div>
              </div>

              {/* Rating reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {EFFLORESCENCE_RATINGS.map((r) => (
                  <div key={r} className="p-2.5 rounded-lg border dark:border-border bg-gray-50/50 dark:bg-muted/20">
                    <span className={`text-[11px] font-bold block mb-0.5 ${
                      r === 'Nil'      ? 'text-emerald-700 dark:text-emerald-400' :
                      r === 'Slight'   ? 'text-yellow-700 dark:text-yellow-400'  :
                      r === 'Moderate' ? 'text-orange-700 dark:text-orange-400'  :
                      r === 'Heavy'    ? 'text-red-700 dark:text-red-400'         :
                                         'text-red-900 dark:text-red-300'
                    }`}>{r}</span>
                    <span className="text-[10px] text-gray-500 dark:text-muted-foreground">{EFFLORESCENCE_DESCRIPTIONS[r]}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Observations
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">{effObs.length} specimens</Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addEffRow}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Row
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-10`}>Sl No</th>
                          <th className={`${thCls} min-w-[150px]`}>Brick ID</th>
                          <th className={`${thCls} min-w-[160px]`}>Rating of Efflorescence</th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {effObs.map((obs, idx) => (
                          <tr key={idx} className={trCls}>
                            <td className={`${tdCls} text-center font-bold text-gray-400 dark:text-muted-foreground`}>{idx + 1}</td>
                            <td className={tdCls}>
                              <Input value={obs.brickId || ''} placeholder="e.g. Brick 1"
                                onChange={(e) => changeEff(idx, 'brickId', e.target.value)}
                                className="h-8 text-xs font-medium" />
                            </td>
                            <td className={tdCls}>
                              <Select value={obs.rating || 'Nil'}
                                onValueChange={(val) => changeEff(idx, 'rating', val)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EFFLORESCENCE_RATINGS.map((r) => (
                                    <SelectItem key={r} value={r} className={`text-xs font-medium ${
                                      r === 'Nil'      ? 'text-emerald-600' :
                                      r === 'Slight'   ? 'text-yellow-600'  :
                                      r === 'Moderate' ? 'text-orange-600'  :
                                      r === 'Heavy'    ? 'text-red-600'      :
                                                          'text-red-800'
                                    }`}>{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className={`${tdCls} text-center`}>
                              {effObs.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeEffRow(idx)}
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

              {/* Summary — count by rating */}
              <div className="flex flex-wrap gap-2">
                {EFFLORESCENCE_RATINGS.map((r) => {
                  const count = effObs.filter((o) => o.rating === r).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={r} variant="outline" className={`text-xs gap-1.5 ${
                      r === 'Nil'      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' :
                      r === 'Slight'   ? 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800'   :
                      r === 'Moderate' ? 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800'   :
                      r === 'Heavy'    ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'                     :
                                         'bg-red-100 text-red-900 border-red-400 dark:bg-red-950/50 dark:text-red-300 dark:border-red-700'
                    }`}>
                      {r}: {count}
                    </Badge>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── Tab 4: Dimensions ───────────────────────────────────── */}
            <TabsContent value="dimensions" className="flex-1 p-4 sm:p-6 space-y-5 outline-none mt-0">

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">IS 1077: RA 2021 — </span>
                  Measure 20 bricks end-to-end for each dimension. Record cumulative totals and compute the average.
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-violet-500" /> Individual Measurements
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">{dimObs.length} bricks</Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addDimRow}
                    className="h-7 text-xs gap-1 border-gray-200">
                    <Plus className="w-3 h-3" /> Add Row
                  </Button>
                </div>

                <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className={theadCls}>
                          <th className={`${thCls} text-center w-10`}>Sl No</th>
                          <th className={`${thCls} min-w-[120px]`}>Brick ID</th>
                          <th className={`${thCls} text-center min-w-[90px]`}>Length (mm)</th>
                          <th className={`${thCls} text-center min-w-[90px]`}>Width (mm)</th>
                          <th className={`${thCls} text-center min-w-[90px]`}>Height (mm)</th>
                          <th className={`${thCls} w-10`}></th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {dimObs.map((obs, idx) => (
                          <tr key={idx} className={trCls}>
                            <td className={`${tdCls} text-center font-bold text-gray-400 dark:text-muted-foreground`}>{idx + 1}</td>
                            <td className={tdCls}>
                              <Input value={obs.brickId || ''} placeholder={`Brick ${idx + 1}`}
                                onChange={(e) => changeDim(idx, 'brickId', e.target.value)}
                                className="h-8 text-xs font-medium" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={obs.length || ''} placeholder="220"
                                onChange={(e) => changeDim(idx, 'length', e.target.value)}
                                className="h-8 text-xs text-center px-1" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={obs.width || ''} placeholder="107"
                                onChange={(e) => changeDim(idx, 'width', e.target.value)}
                                className="h-8 text-xs text-center px-1" />
                            </td>
                            <td className={tdCls}>
                              <Input type="number" value={obs.height || ''} placeholder="81"
                                onChange={(e) => changeDim(idx, 'height', e.target.value)}
                                className="h-8 text-xs text-center px-1" />
                            </td>
                            <td className={`${tdCls} text-center`}>
                              {dimObs.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeDimRow(idx)}
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

              {/* Dimension totals & averages */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Length', total: dimResult.totalLength, avg: dimResult.avgLength, color: 'violet' },
                  { label: 'Width',  total: dimResult.totalWidth,  avg: dimResult.avgWidth,  color: 'indigo' },
                  { label: 'Height', total: dimResult.totalHeight, avg: dimResult.avgHeight, color: 'purple' },
                ].map(({ label, total, avg, color }) => (
                  <div key={label} className={`p-4 rounded-xl border space-y-2
                    bg-${color}-50/40 dark:bg-${color}-950/20
                    border-${color}-200 dark:border-${color}-800/40`}>
                    <span className={`text-[11px] font-bold uppercase tracking-wider block
                      text-${color}-800 dark:text-${color}-400`}>{label}</span>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-muted-foreground">Total (sum)</div>
                      <div className={`text-lg font-black font-mono text-${color}-900 dark:text-${color}-200`}>
                        {total ?? '–'} <span className="text-xs font-semibold">mm</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-muted-foreground">Average / brick</div>
                      <div className={`text-sm font-bold font-mono text-${color}-800 dark:text-${color}-300`}>
                        {avg ?? '–'} mm
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

          </Tabs>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 border-t dark:border-border flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-muted/20">
          <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
            All four test results will be saved together.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="h-9 text-xs">
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleApply}
              className="h-9 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold">
              <Check className="w-3.5 h-3.5" /> Save Brick Test Data
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
