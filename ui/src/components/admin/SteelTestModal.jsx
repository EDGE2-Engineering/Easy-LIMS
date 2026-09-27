import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Info,
  Sparkles,
  AlertTriangle,
  Zap,
  Tag,
  Receipt,
  Truck,
  CheckSquare,
} from 'lucide-react';
import {
  DEFAULT_STEEL_OBSERVATION,
  DEFAULT_STEEL_OBSERVATIONS,
  BEND_REBEND_OPTIONS,
  NOMINAL_DIAMETERS,
  SAMPLE_STEEL_TEST_DATA,
  calculateSteelTest,
} from '@/utils/steelTestCalculation';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Modal for Steel Tensile / Bend / Rebend Tests
 * Standards: IS 1786: 2008 · IS 1608 (Part 1): 2022
 *
 * Features:
 *  1. Sample ID (formerly Bar ID)
 *  2. Client reference columns: Heat/ Lot No., Invoice No., Vehicle No. with dropdown options
 *  3. Dynamic column inclusion/omission in final report
 *  4. Exclusion of averages from final report (individual results only per IS 1786)
 */
export default function SteelTestModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [observations, setObservations] = useState(
    DEFAULT_STEEL_OBSERVATIONS.map((o) => ({ ...o }))
  );

  // Client reference dropdown option pools
  const [heatNoOptions, setHeatNoOptions] = useState([]);
  const [invoiceNoOptions, setInvoiceNoOptions] = useState([]);
  const [vehicleNoOptions, setVehicleNoOptions] = useState([]);

  // Report column toggles (default true when data is present)
  const [includeHeatNoInReport, setIncludeHeatNoInReport] = useState(true);
  const [includeInvoiceNoInReport, setIncludeInvoiceNoInReport] = useState(true);
  const [includeVehicleNoInReport, setIncludeVehicleNoInReport] = useState(true);

  // Quick inputs for adding options
  const [heatInput, setHeatInput] = useState('');
  const [invoiceInput, setInvoiceInput] = useState('');
  const [vehicleInput, setVehicleInput] = useState('');

  // ── Load initial data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (initialData?.observations?.length > 0) {
      setObservations(
        initialData.observations.map((o, i) => ({
          sampleId:         o.sampleId         ?? o.barId         ?? `Sample ${i + 1}`,
          barId:            o.sampleId         ?? o.barId         ?? `Sample ${i + 1}`,
          heatNo:           o.heatNo           !== undefined ? String(o.heatNo)           : '',
          invoiceNo:        o.invoiceNo        !== undefined ? String(o.invoiceNo)        : '',
          vehicleNo:        o.vehicleNo        !== undefined ? String(o.vehicleNo)        : '',
          nominalDia:       o.nominalDia       !== undefined ? String(o.nominalDia)       : '',
          weight:           o.weight           !== undefined ? String(o.weight)           : '',
          length:           o.length           !== undefined ? String(o.length)           : '',
          yieldLoad:        o.yieldLoad        !== undefined ? String(o.yieldLoad)        : '',
          ultimateLoad:     o.ultimateLoad     !== undefined ? String(o.ultimateLoad)     : '',
          finalGaugeLength: o.finalGaugeLength !== undefined ? String(o.finalGaugeLength) : '',
          bendTest:         o.bendTest         || 'NCO',
          rebendTest:       o.rebendTest       || 'NCO',
        }))
      );

      // Collect option pools from initialData or scan observations
      const existingHeats = [
        ...(initialData.heatNoOptions || []),
        ...initialData.observations.map((o) => o.heatNo).filter(Boolean),
      ];
      const existingInvoices = [
        ...(initialData.invoiceNoOptions || []),
        ...initialData.observations.map((o) => o.invoiceNo).filter(Boolean),
      ];
      const existingVehicles = [
        ...(initialData.vehicleNoOptions || []),
        ...initialData.observations.map((o) => o.vehicleNo).filter(Boolean),
      ];

      setHeatNoOptions([...new Set(existingHeats.map((s) => String(s).trim()))]);
      setInvoiceNoOptions([...new Set(existingInvoices.map((s) => String(s).trim()))]);
      setVehicleNoOptions([...new Set(existingVehicles.map((s) => String(s).trim()))]);

      setIncludeHeatNoInReport(
        initialData.includeHeatNoInReport ??
          initialData.clientReferenceColumns?.heatNo ??
          existingHeats.length > 0
      );
      setIncludeInvoiceNoInReport(
        initialData.includeInvoiceNoInReport ??
          initialData.clientReferenceColumns?.invoiceNo ??
          existingInvoices.length > 0
      );
      setIncludeVehicleNoInReport(
        initialData.includeVehicleNoInReport ??
          initialData.clientReferenceColumns?.vehicleNo ??
          existingVehicles.length > 0
      );
    } else {
      setObservations(
        DEFAULT_STEEL_OBSERVATIONS.map((o, i) => ({
          ...o,
          sampleId: sampleCode ? `${sampleCode}-${i + 1}` : o.sampleId,
          barId: sampleCode ? `${sampleCode}-${i + 1}` : o.barId,
        }))
      );
      setHeatNoOptions([]);
      setInvoiceNoOptions([]);
      setVehicleNoOptions([]);
      setIncludeHeatNoInReport(true);
      setIncludeInvoiceNoInReport(true);
      setIncludeVehicleNoInReport(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Combined available options for dropdowns ────────────────────────────
  const availableHeatNos = useMemo(() => {
    const fromObs = observations.map((o) => o.heatNo).filter(Boolean);
    return [...new Set([...heatNoOptions, ...fromObs].map((s) => String(s).trim()))].filter(Boolean);
  }, [heatNoOptions, observations]);

  const availableInvoiceNos = useMemo(() => {
    const fromObs = observations.map((o) => o.invoiceNo).filter(Boolean);
    return [...new Set([...invoiceNoOptions, ...fromObs].map((s) => String(s).trim()))].filter(Boolean);
  }, [invoiceNoOptions, observations]);

  const availableVehicleNos = useMemo(() => {
    const fromObs = observations.map((o) => o.vehicleNo).filter(Boolean);
    return [...new Set([...vehicleNoOptions, ...fromObs].map((s) => String(s).trim()))].filter(Boolean);
  }, [vehicleNoOptions, observations]);

  // ── Real-time calculation ───────────────────────────────────────────────
  const { rows, summary } = useMemo(
    () =>
      calculateSteelTest(observations, {
        includeHeatNoInReport,
        includeInvoiceNoInReport,
        includeVehicleNoInReport,
      }),
    [observations, includeHeatNoInReport, includeInvoiceNoInReport, includeVehicleNoInReport]
  );

  // ── Cell change ─────────────────────────────────────────────────────────
  const change = (i, field, val) =>
    setObservations((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], [field]: val };
      if (field === 'sampleId') {
        c[i].barId = val; // keep barId synced for backward compatibility
      }
      return c;
    });

  // ── Add / remove row ────────────────────────────────────────────────────
  const addRow = () =>
    setObservations((p) => [
      ...p,
      {
        ...DEFAULT_STEEL_OBSERVATION,
        sampleId: `Sample ${p.length + 1}`,
        barId: `Sample ${p.length + 1}`,
        heatNo: availableHeatNos.length === 1 ? availableHeatNos[0] : '',
        invoiceNo: availableInvoiceNos.length === 1 ? availableInvoiceNos[0] : '',
        vehicleNo: availableVehicleNos.length === 1 ? availableVehicleNos[0] : '',
      },
    ]);
  const removeRow = (i) =>
    setObservations((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  // ── Quick addition of options from panel ────────────────────────────────
  const handleAddHeatOptions = () => {
    if (!heatInput.trim()) return;
    const parts = heatInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setHeatNoOptions((prev) => [...new Set([...prev, ...parts])]);
    setIncludeHeatNoInReport(true);
    setHeatInput('');
  };

  const handleAddInvoiceOptions = () => {
    if (!invoiceInput.trim()) return;
    const parts = invoiceInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setInvoiceNoOptions((prev) => [...new Set([...prev, ...parts])]);
    setIncludeInvoiceNoInReport(true);
    setInvoiceInput('');
  };

  const handleAddVehicleOptions = () => {
    if (!vehicleInput.trim()) return;
    const parts = vehicleInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setVehicleNoOptions((prev) => [...new Set([...prev, ...parts])]);
    setIncludeVehicleNoInReport(true);
    setVehicleInput('');
  };

  // ── Quick Apply to All Rows ─────────────────────────────────────────────
  const applyHeatToAll = (val) => {
    if (!val) return;
    setObservations((prev) => prev.map((o) => ({ ...o, heatNo: val })));
    setIncludeHeatNoInReport(true);
  };

  const applyInvoiceToAll = (val) => {
    if (!val) return;
    setObservations((prev) => prev.map((o) => ({ ...o, invoiceNo: val })));
    setIncludeInvoiceNoInReport(true);
  };

  const applyVehicleToAll = (val) => {
    if (!val) return;
    setObservations((prev) => prev.map((o) => ({ ...o, vehicleNo: val })));
    setIncludeVehicleNoInReport(true);
  };

  // ── Inline Prompt to Add New Option ─────────────────────────────────────
  const handlePromptNewOption = (field) => {
    const labels = {
      heatNo: 'Heat/ Lot No.',
      invoiceNo: 'Invoice No.',
      vehicleNo: 'Vehicle No.',
    };
    const val = window.prompt(`Enter new ${labels[field]}:`);
    if (val && val.trim()) {
      const clean = val.trim();
      if (field === 'heatNo') {
        setHeatNoOptions((p) => [...new Set([...p, clean])]);
        setIncludeHeatNoInReport(true);
      } else if (field === 'invoiceNo') {
        setInvoiceNoOptions((p) => [...new Set([...p, clean])]);
        setIncludeInvoiceNoInReport(true);
      } else if (field === 'vehicleNo') {
        setVehicleNoOptions((p) => [...new Set([...p, clean])]);
        setIncludeVehicleNoInReport(true);
      }
      return clean;
    }
    return null;
  };

  // ── Reset ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset and clear all test data?')) return;
    setObservations(DEFAULT_STEEL_OBSERVATIONS.map((o) => ({ ...o })));
    setHeatNoOptions([]);
    setInvoiceNoOptions([]);
    setVehicleNoOptions([]);
    setIncludeHeatNoInReport(true);
    setIncludeInvoiceNoInReport(true);
    setIncludeVehicleNoInReport(false);
  };

  // ── Fill sample ─────────────────────────────────────────────────────────
  const handleFillSample = () => {
    setObservations(SAMPLE_STEEL_TEST_DATA.observations.map((o) => ({ ...o })));
    setHeatNoOptions(SAMPLE_STEEL_TEST_DATA.heatNoOptions || []);
    setInvoiceNoOptions(SAMPLE_STEEL_TEST_DATA.invoiceNoOptions || []);
    setVehicleNoOptions(SAMPLE_STEEL_TEST_DATA.vehicleNoOptions || []);
    setIncludeHeatNoInReport(SAMPLE_STEEL_TEST_DATA.includeHeatNoInReport ?? true);
    setIncludeInvoiceNoInReport(SAMPLE_STEEL_TEST_DATA.includeInvoiceNoInReport ?? true);
    setIncludeVehicleNoInReport(SAMPLE_STEEL_TEST_DATA.includeVehicleNoInReport ?? false);
  };

  // ── Apply & save ────────────────────────────────────────────────────────
  const handleApply = () => {
    const hasHeatVal = rows.some((r) => r.heatNo && r.heatNo.length > 0);
    const hasInvoiceVal = rows.some((r) => r.invoiceNo && r.invoiceNo.length > 0);
    const hasVehicleVal = rows.some((r) => r.vehicleNo && r.vehicleNo.length > 0);

    const isHeatActive = includeHeatNoInReport && (hasHeatVal || heatNoOptions.length > 0);
    const isInvoiceActive = includeInvoiceNoInReport && (hasInvoiceVal || invoiceNoOptions.length > 0);
    const isVehicleActive = includeVehicleNoInReport && (hasVehicleVal || vehicleNoOptions.length > 0);

    const payload = {
      observations: rows.map((r) => ({
        slNo:               r.slNo,
        sampleId:           r.sampleId,
        barId:              r.sampleId, // fallback
        heatNo:             r.heatNo || '',
        invoiceNo:          r.invoiceNo || '',
        vehicleNo:          r.vehicleNo || '',
        nominalDia:         r.nominalDia,
        weight:             r.weight,
        length:             r.length,
        massPerMeter:       r.massPerMeterFmt,
        area:               r.areaFmt,
        yieldLoad:          r.yieldLoad,
        yieldStress:        r.yieldStressFmt,
        ultimateLoad:       r.ultimateLoad,
        tensileStrength:    r.tensileStrengthFmt,
        initialGaugeLength: r.iglFmt,
        finalGaugeLength:   r.finalGaugeLength,
        elongation:         r.elongationFmt,
        bendTest:           r.bendTest,
        rebendTest:         r.rebendTest,
      })),
      // Client reference columns settings
      heatNoOptions:      availableHeatNos,
      invoiceNoOptions:   availableInvoiceNos,
      vehicleNoOptions:   availableVehicleNos,
      includeHeatNoInReport:   isHeatActive,
      includeInvoiceNoInReport: isInvoiceActive,
      includeVehicleNoInReport: isVehicleActive,
      clientReferenceColumns: {
        heatNo:    isHeatActive,
        invoiceNo: isInvoiceActive,
        vehicleNo: isVehicleActive,
      },
      // Summary averages (Internal Testing Data Only)
      avgYieldStress:     summary.avgYieldStressFmt,
      avgTensileStrength: summary.avgTensileStrengthFmt,
      avgElongation:      summary.avgElongationFmt,
      // Requirement 1 flags: averages must NOT appear in final report
      reportExcludeAverages:           true,
      reportExcludeAvgYieldStress:     true,
      reportExcludeAvgTensileStrength: true,
      reportExcludeAvgElongation:      true,
      includeAveragesInReport:         false,
      reportClauseNote:
        'Avg. yield stress, avg. tensile strength, and avg. elongation are for testing data only and shall not appear in the final report; only individual results are required.',
    };
    if (onApply) onApply(payload);
    onClose();
  };

  // ─── Shared table style helpers ─────────────────────────────────────────
  const thBase = 'p-2 font-bold text-[11px] whitespace-nowrap text-center';
  const tdBase = 'p-1.5';
  const calcCell = 'p-2 text-right font-mono text-[11px]';

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[96vw] xl:max-w-7xl max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border shadow-2xl rounded-2xl">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-slate-50/80 via-zinc-50/40 to-transparent dark:from-slate-950/40 dark:via-zinc-950/20 dark:to-transparent shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    Reinforcement Steel Test Data Entry
                  </DialogTitle>
                  <Badge variant="outline" className="text-[11px] font-semibold bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-950/50 dark:text-slate-300 dark:border-slate-700">
                    IS 1786: 2008
                  </Badge>
                  <Badge variant="outline" className="text-[11px] font-semibold bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-950/50 dark:text-slate-300 dark:border-slate-700">
                    IS 1608 (Part 1): 2022
                  </Badge>
                  <Badge variant="outline" className="text-[11px] font-semibold bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-950/50 dark:text-slate-300 dark:border-slate-700">
                    IS 1599: 2019
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  TMT / Deformed steel bar mechanical properties
                  {jobCode    ? ` • Job: ${jobCode}`       : ''}
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
                className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950/50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Fill Reference Sample Data
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">

          {/* Client Reference Configuration Panel */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Client Reference Details
                </span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Columns appear in report only if provided by client
                </Badge>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-muted-foreground">
                Enter client options below to populate dropdowns, or add new options directly in table rows.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Heat/Lot No Options */}
              <div className="p-2.5 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-blue-500" /> Heat/ Lot No. Options
                  </Label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-gray-600 dark:text-gray-400">
                    <Checkbox
                      checked={includeHeatNoInReport}
                      onCheckedChange={setIncludeHeatNoInReport}
                      className="h-3.5 w-3.5"
                    />
                    <span>Include in Report</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={heatInput}
                    onChange={(e) => setHeatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHeatOptions())}
                    placeholder="e.g. 72142090"
                    className="h-7 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddHeatOptions}
                    className="h-7 px-2 text-xs shrink-0"
                  >
                    + Add
                  </Button>
                </div>
                {availableHeatNos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-100 dark:border-border">
                    <span className="text-[10px] text-gray-400">Pool:</span>
                    {availableHeatNos.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 font-mono cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        title="Click to apply to all rows"
                        onClick={() => applyHeatToAll(val)}
                      >
                        {val}
                      </Badge>
                    ))}
                    {availableHeatNos.length === 1 && (
                      <button
                        type="button"
                        onClick={() => applyHeatToAll(availableHeatNos[0])}
                        className="text-[10px] text-blue-600 hover:underline ml-auto"
                      >
                        Apply all
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice No Options */}
              <div className="p-2.5 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-indigo-500" /> Invoice No. Options
                  </Label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-gray-600 dark:text-gray-400">
                    <Checkbox
                      checked={includeInvoiceNoInReport}
                      onCheckedChange={setIncludeInvoiceNoInReport}
                      className="h-3.5 w-3.5"
                    />
                    <span>Include in Report</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={invoiceInput}
                    onChange={(e) => setInvoiceInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInvoiceOptions())}
                    placeholder="e.g. CREDIT/2780, CREDIT/2778"
                    className="h-7 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddInvoiceOptions}
                    className="h-7 px-2 text-xs shrink-0"
                  >
                    + Add
                  </Button>
                </div>
                {availableInvoiceNos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-100 dark:border-border">
                    <span className="text-[10px] text-gray-400">Pool:</span>
                    {availableInvoiceNos.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 font-mono cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        title="Click to apply to all rows"
                        onClick={() => applyInvoiceToAll(val)}
                      >
                        {val}
                      </Badge>
                    ))}
                    {availableInvoiceNos.length === 1 && (
                      <button
                        type="button"
                        onClick={() => applyInvoiceToAll(availableInvoiceNos[0])}
                        className="text-[10px] text-indigo-600 hover:underline ml-auto"
                      >
                        Apply all
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Vehicle No Options */}
              <div className="p-2.5 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-500" /> Vehicle No. Options
                  </Label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-gray-600 dark:text-gray-400">
                    <Checkbox
                      checked={includeVehicleNoInReport}
                      onCheckedChange={setIncludeVehicleNoInReport}
                      className="h-3.5 w-3.5"
                    />
                    <span>Include in Report</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={vehicleInput}
                    onChange={(e) => setVehicleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVehicleOptions())}
                    placeholder="e.g. KA-01-AB-1234"
                    className="h-7 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddVehicleOptions}
                    className="h-7 px-2 text-xs shrink-0"
                  >
                    + Add
                  </Button>
                </div>
                {availableVehicleNos.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-100 dark:border-border">
                    <span className="text-[10px] text-gray-400">Pool:</span>
                    {availableVehicleNos.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 font-mono cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        title="Click to apply to all rows"
                        onClick={() => applyVehicleToAll(val)}
                      >
                        {val}
                      </Badge>
                    ))}
                    {availableVehicleNos.length === 1 && (
                      <button
                        type="button"
                        onClick={() => applyVehicleToAll(availableVehicleNos[0])}
                        className="text-[10px] text-emerald-600 hover:underline ml-auto"
                      >
                        Apply all
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 italic pt-1">
                    (Absent — will not appear in final report if left unpopulated)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Formula Reference */}
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Auto-calculated columns (shaded):</span>
              <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                C4 = C2/C3 · C5 = C4/(0.00785×C3) · C7 = (C6/C5)×1000 · C9 = (C8/C5)×1000 · C10 = 5.65×√C5 · C12 = ((C11−C10)/C10)×100
              </span>
            </div>
          </div>

          {/* Observations Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-slate-500" /> Steel Specimen Observations
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {observations.length} {observations.length === 1 ? 'bar' : 'bars'}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                className="h-7 text-xs gap-1 border-gray-200"
              >
                <Plus className="w-3 h-3" /> Add Bar
              </Button>
            </div>

            <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    {/* Column group header */}
                    <tr className="bg-gray-100/80 dark:bg-muted/60 border-b dark:border-border text-[10px] font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                      <th className={thBase} rowSpan={2}>#</th>
                      <th className={thBase} rowSpan={2}>Sample ID</th>
                      {/* Client References */}
                      <th className={`${thBase} bg-blue-50/60 dark:bg-blue-950/20 border-l dark:border-border`} colSpan={3}>
                        Client References (Dropdown)
                      </th>
                      {/* Inputs */}
                      <th className={`${thBase} border-l dark:border-border`} colSpan={3}>Inputs</th>
                      {/* Mass & Area */}
                      <th className={`${thBase} bg-slate-50/80 dark:bg-slate-900/40 border-l dark:border-border`} colSpan={2}>Derived</th>
                      {/* Yield */}
                      <th className={`${thBase} border-l dark:border-border`} colSpan={2}>Yield</th>
                      {/* Tensile */}
                      <th className={`${thBase} border-l dark:border-border`} colSpan={2}>Tensile</th>
                      {/* Gauge & Elongation */}
                      <th className={`${thBase} bg-emerald-50/60 dark:bg-emerald-950/20 border-l dark:border-border`} colSpan={3}>Gauge / Elongation</th>
                      {/* Bend */}
                      <th className={`${thBase} border-l dark:border-border`} colSpan={2}>Bend / Rebend</th>
                      <th className={thBase} rowSpan={2}></th>
                    </tr>
                    <tr className="bg-gray-50/80 dark:bg-muted/50 border-b dark:border-border text-gray-600 dark:text-gray-300">
                      {/* Client Ref Columns */}
                      <th className={`${thBase} bg-blue-50/40 dark:bg-blue-950/10 border-l dark:border-border min-w-[130px]`}>
                        Heat/ Lot No.
                        <span className="block text-[9px] font-normal text-blue-600 dark:text-blue-400">Dropdown</span>
                      </th>
                      <th className={`${thBase} bg-blue-50/40 dark:bg-blue-950/10 min-w-[130px]`}>
                        Invoice No.
                        <span className="block text-[9px] font-normal text-blue-600 dark:text-blue-400">Dropdown</span>
                      </th>
                      <th className={`${thBase} bg-blue-50/40 dark:bg-blue-950/10 min-w-[130px]`}>
                        Vehicle No.
                        <span className="block text-[9px] font-normal text-blue-600 dark:text-blue-400">Dropdown</span>
                      </th>
                      {/* C1 */}
                      <th className={`${thBase} border-l dark:border-border min-w-[80px]`}>
                        C1<span className="block text-[9px] font-normal text-gray-400">Dia (mm)</span>
                      </th>
                      {/* C2 */}
                      <th className={`${thBase} min-w-[80px]`}>
                        C2<span className="block text-[9px] font-normal text-gray-400">Weight (kg)</span>
                      </th>
                      {/* C3 */}
                      <th className={`${thBase} min-w-[75px]`}>
                        C3<span className="block text-[9px] font-normal text-gray-400">Length (m)</span>
                      </th>
                      {/* C4 — calc */}
                      <th className={`${thBase} bg-slate-50/80 dark:bg-slate-900/40 border-l dark:border-border min-w-[90px]`}>
                        C4<span className="block text-[9px] font-normal text-slate-400">kg/m</span>
                      </th>
                      {/* C5 — calc */}
                      <th className={`${thBase} bg-slate-50/80 dark:bg-slate-900/40 min-w-[80px]`}>
                        C5<span className="block text-[9px] font-normal text-slate-400">Area mm²</span>
                      </th>
                      {/* C6 */}
                      <th className={`${thBase} border-l dark:border-border min-w-[85px]`}>
                        C6<span className="block text-[9px] font-normal text-gray-400">Yield Load (kN)</span>
                      </th>
                      {/* C7 — calc */}
                      <th className={`${thBase} bg-amber-50/60 dark:bg-amber-950/20 min-w-[100px]`}>
                        C7<span className="block text-[9px] font-normal text-amber-500">Yield Stress N/mm²</span>
                      </th>
                      {/* C8 */}
                      <th className={`${thBase} border-l dark:border-border min-w-[85px]`}>
                        C8<span className="block text-[9px] font-normal text-gray-400">Ult. Load (kN)</span>
                      </th>
                      {/* C9 — calc */}
                      <th className={`${thBase} bg-orange-50/60 dark:bg-orange-950/20 min-w-[105px]`}>
                        C9<span className="block text-[9px] font-normal text-orange-500">Tensile Str. N/mm²</span>
                      </th>
                      {/* C10 — calc */}
                      <th className={`${thBase} bg-emerald-50/60 dark:bg-emerald-950/20 border-l dark:border-border min-w-[85px]`}>
                        C10<span className="block text-[9px] font-normal text-emerald-500">IGL (mm)</span>
                      </th>
                      {/* C11 */}
                      <th className={`${thBase} min-w-[85px]`}>
                        C11<span className="block text-[9px] font-normal text-gray-400">FGL (mm)</span>
                      </th>
                      {/* C12 — calc */}
                      <th className={`${thBase} bg-emerald-50/60 dark:bg-emerald-950/20 min-w-[85px]`}>
                        C12<span className="block text-[9px] font-normal text-emerald-500">Elong. %</span>
                      </th>
                      {/* C13 */}
                      <th className={`${thBase} border-l dark:border-border min-w-[110px]`}>
                        C13<span className="block text-[9px] font-normal text-gray-400">Bend</span>
                      </th>
                      {/* C14 */}
                      <th className={`${thBase} min-w-[110px]`}>
                        C14<span className="block text-[9px] font-normal text-gray-400">Rebend</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-border">
                    {rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-gray-50/40 dark:hover:bg-muted/20 transition-colors ${
                          row.errors.length > 0 ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                        }`}
                      >
                        {/* # */}
                        <td className="p-2 text-center font-bold text-gray-400 dark:text-muted-foreground text-xs">
                          {row.slNo}
                        </td>

                        {/* Sample ID (formerly Bar ID) */}
                        <td className={tdBase}>
                          <Input
                            value={observations[idx].sampleId || ''}
                            placeholder="Sample 1"
                            onChange={(e) => change(idx, 'sampleId', e.target.value)}
                            className="h-7 text-xs font-medium min-w-[110px]"
                          />
                        </td>

                        {/* Heat/ Lot No. Dropdown */}
                        <td className={`${tdBase} bg-blue-50/20 dark:bg-blue-950/10 border-l dark:border-border`}>
                          <Select
                            value={observations[idx].heatNo || '_NONE_'}
                            onValueChange={(v) => {
                              if (v === '_NONE_') {
                                change(idx, 'heatNo', '');
                              } else if (v === '_ADD_NEW_') {
                                const newOpt = handlePromptNewOption('heatNo');
                                if (newOpt) change(idx, 'heatNo', newOpt);
                              } else {
                                change(idx, 'heatNo', v);
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs min-w-[125px] font-mono">
                              <SelectValue placeholder="— None —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_NONE_" className="text-xs text-muted-foreground italic">
                                — None / Absent —
                              </SelectItem>
                              {availableHeatNos.map((val) => (
                                <SelectItem key={val} value={val} className="text-xs font-mono">
                                  {val}
                                </SelectItem>
                              ))}
                              {observations[idx].heatNo &&
                                !availableHeatNos.includes(observations[idx].heatNo) && (
                                  <SelectItem value={observations[idx].heatNo} className="text-xs font-mono">
                                    {observations[idx].heatNo}
                                  </SelectItem>
                                )}
                              <SelectItem value="_ADD_NEW_" className="text-xs font-bold text-blue-600 border-t">
                                + Add new Heat No...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Invoice No. Dropdown */}
                        <td className={`${tdBase} bg-blue-50/20 dark:bg-blue-950/10`}>
                          <Select
                            value={observations[idx].invoiceNo || '_NONE_'}
                            onValueChange={(v) => {
                              if (v === '_NONE_') {
                                change(idx, 'invoiceNo', '');
                              } else if (v === '_ADD_NEW_') {
                                const newOpt = handlePromptNewOption('invoiceNo');
                                if (newOpt) change(idx, 'invoiceNo', newOpt);
                              } else {
                                change(idx, 'invoiceNo', v);
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs min-w-[125px] font-mono">
                              <SelectValue placeholder="— None —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_NONE_" className="text-xs text-muted-foreground italic">
                                — None / Absent —
                              </SelectItem>
                              {availableInvoiceNos.map((val) => (
                                <SelectItem key={val} value={val} className="text-xs font-mono">
                                  {val}
                                </SelectItem>
                              ))}
                              {observations[idx].invoiceNo &&
                                !availableInvoiceNos.includes(observations[idx].invoiceNo) && (
                                  <SelectItem value={observations[idx].invoiceNo} className="text-xs font-mono">
                                    {observations[idx].invoiceNo}
                                  </SelectItem>
                                )}
                              <SelectItem value="_ADD_NEW_" className="text-xs font-bold text-indigo-600 border-t">
                                + Add new Invoice No...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Vehicle No. Dropdown */}
                        <td className={`${tdBase} bg-blue-50/20 dark:bg-blue-950/10`}>
                          <Select
                            value={observations[idx].vehicleNo || '_NONE_'}
                            onValueChange={(v) => {
                              if (v === '_NONE_') {
                                change(idx, 'vehicleNo', '');
                              } else if (v === '_ADD_NEW_') {
                                const newOpt = handlePromptNewOption('vehicleNo');
                                if (newOpt) change(idx, 'vehicleNo', newOpt);
                              } else {
                                change(idx, 'vehicleNo', v);
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs min-w-[125px] font-mono">
                              <SelectValue placeholder="— None —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_NONE_" className="text-xs text-muted-foreground italic">
                                — None / Absent —
                              </SelectItem>
                              {availableVehicleNos.map((val) => (
                                <SelectItem key={val} value={val} className="text-xs font-mono">
                                  {val}
                                </SelectItem>
                              ))}
                              {observations[idx].vehicleNo &&
                                !availableVehicleNos.includes(observations[idx].vehicleNo) && (
                                  <SelectItem value={observations[idx].vehicleNo} className="text-xs font-mono">
                                    {observations[idx].vehicleNo}
                                  </SelectItem>
                                )}
                              <SelectItem value="_ADD_NEW_" className="text-xs font-bold text-emerald-600 border-t">
                                + Add new Vehicle No...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* C1 Nominal Dia */}
                        <td className={`${tdBase} border-l dark:border-border`}>
                          <Select
                            value={observations[idx].nominalDia || ''}
                            onValueChange={(v) => change(idx, 'nominalDia', v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[72px]">
                              <SelectValue placeholder="–" />
                            </SelectTrigger>
                            <SelectContent>
                              {NOMINAL_DIAMETERS.map((d) => (
                                <SelectItem key={d} value={d} className="text-xs">{d} mm</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* C2 Weight */}
                        <td className={tdBase}>
                          <Input
                            type="number"
                            step="0.001"
                            value={observations[idx].weight || ''}
                            placeholder="0.396"
                            onChange={(e) => change(idx, 'weight', e.target.value)}
                            className="h-7 text-xs text-right font-mono w-[76px]"
                          />
                        </td>

                        {/* C3 Length */}
                        <td className={tdBase}>
                          <Input
                            type="number"
                            step="0.001"
                            value={observations[idx].length || ''}
                            placeholder="1"
                            onChange={(e) => change(idx, 'length', e.target.value)}
                            className="h-7 text-xs text-right font-mono w-[68px]"
                          />
                        </td>

                        {/* C4 Mass/m — calc */}
                        <td className={`${calcCell} bg-slate-50/60 dark:bg-slate-900/30 border-l dark:border-border`}>
                          {row.massPerMeterFmt ? (
                            <span className="text-slate-700 dark:text-slate-300">{row.massPerMeterFmt}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">–</span>
                          )}
                        </td>

                        {/* C5 Area — calc */}
                        <td className={`${calcCell} bg-slate-50/60 dark:bg-slate-900/30`}>
                          {row.areaFmt ? (
                            <span className="text-slate-700 dark:text-slate-300">{row.areaFmt}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">–</span>
                          )}
                        </td>

                        {/* C6 Yield Load */}
                        <td className={tdBase}>
                          <Input
                            type="number"
                            step="0.01"
                            value={observations[idx].yieldLoad || ''}
                            placeholder="45.68"
                            onChange={(e) => change(idx, 'yieldLoad', e.target.value)}
                            className="h-7 text-xs text-right font-mono w-[76px]"
                          />
                        </td>

                        {/* C7 Yield Stress — calc */}
                        <td className={`${calcCell} bg-amber-50/50 dark:bg-amber-950/15`}>
                          {row.yieldStressFmt ? (
                            <span className="font-bold text-amber-800 dark:text-amber-300">{row.yieldStressFmt}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">–</span>
                          )}
                        </td>

                        {/* C8 Ultimate Load */}
                        <td className={tdBase}>
                          <Input
                            type="number"
                            step="0.01"
                            value={observations[idx].ultimateLoad || ''}
                            placeholder="58.26"
                            onChange={(e) => change(idx, 'ultimateLoad', e.target.value)}
                            className="h-7 text-xs text-right font-mono w-[76px]"
                          />
                        </td>

                        {/* C9 Tensile Strength — calc */}
                        <td className={`${calcCell} bg-orange-50/50 dark:bg-orange-950/15`}>
                          {row.tensileStrengthFmt ? (
                            <span className="font-bold text-orange-800 dark:text-orange-300">{row.tensileStrengthFmt}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">–</span>
                          )}
                        </td>

                        {/* C10 IGL — calc */}
                        <td className={`${calcCell} bg-emerald-50/50 dark:bg-emerald-950/15 border-l dark:border-border`}>
                          {row.iglFmt ? (
                            <span className="text-emerald-700 dark:text-emerald-400">{row.iglFmt}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">–</span>
                          )}
                        </td>

                        {/* C11 Final Gauge Length */}
                        <td className={tdBase}>
                          <Input
                            type="number"
                            step="0.01"
                            value={observations[idx].finalGaugeLength || ''}
                            placeholder="48.32"
                            onChange={(e) => change(idx, 'finalGaugeLength', e.target.value)}
                            className="h-7 text-xs text-right font-mono w-[76px]"
                          />
                        </td>

                        {/* C12 Elongation — calc */}
                        <td className={`${calcCell} bg-emerald-50/50 dark:bg-emerald-950/15`}>
                          {row.elongationFmt ? (
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">{row.elongationFmt}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">–</span>
                          )}
                        </td>

                        {/* C13 Bend */}
                        <td className={tdBase}>
                          <Select
                            value={observations[idx].bendTest || 'NCO'}
                            onValueChange={(v) => change(idx, 'bendTest', v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BEND_REBEND_OPTIONS.map((o) => (
                                <SelectItem
                                  key={o.value}
                                  value={o.value}
                                  className={`text-xs font-medium ${
                                    o.value === 'NCO' ? 'text-emerald-600' : 'text-red-600'
                                  }`}
                                >
                                  {o.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* C14 Rebend */}
                        <td className={tdBase}>
                          <Select
                            value={observations[idx].rebendTest || 'NCO'}
                            onValueChange={(v) => change(idx, 'rebendTest', v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BEND_REBEND_OPTIONS.map((o) => (
                                <SelectItem
                                  key={o.value}
                                  value={o.value}
                                  className={`text-xs font-medium ${
                                    o.value === 'NCO' ? 'text-emerald-600' : 'text-red-600'
                                  }`}
                                >
                                  {o.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Remove */}
                        <td className="p-1.5 text-center">
                          {observations.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(idx)}
                              className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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

          {/* Row-level validation errors */}
          {rows.some((r) => r.errors.length > 0) && (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <ul className="list-disc list-inside space-y-0.5">
                {rows.flatMap((r) =>
                  r.errors.map((e, i) => (
                    <li key={`${r.slNo}-${i}`}>
                      Row {r.slNo} ({r.sampleId}): {e}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* Summary Cards with Requirement 1 Notice */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Calculated Batch Means (Testing Data Only)
              </span>
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                Excluded from final report per IS 1786 specification
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                    Avg Yield Stress (C7)
                  </span>
                  <Badge variant="secondary" className="text-[9px] py-0 px-1 text-gray-500">
                    Testing Only
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-900 dark:text-amber-200 font-mono">
                    {summary.avgYieldStressFmt || '–'}
                  </span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">N/mm²</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-muted-foreground">Mean across all bars</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-orange-800 dark:text-orange-400 uppercase tracking-wider block">
                    Avg Tensile Strength (C9)
                  </span>
                  <Badge variant="secondary" className="text-[9px] py-0 px-1 text-gray-500">
                    Testing Only
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-orange-900 dark:text-orange-200 font-mono">
                    {summary.avgTensileStrengthFmt || '–'}
                  </span>
                  <span className="text-xs font-bold text-orange-700 dark:text-orange-400">N/mm²</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-muted-foreground">Mean across all bars</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                    Avg Elongation (C12)
                  </span>
                  <Badge variant="secondary" className="text-[9px] py-0 px-1 text-gray-500">
                    Testing Only
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200 font-mono">
                    {summary.avgElongationFmt || '–'}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">%</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-muted-foreground">Mean across all bars</p>
              </div>
            </div>

            {/* Prominent Requirement 1 notice banner */}
            <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Report Output Notice:</strong> Average yield stress, average tensile strength, and average elongation shall not appear in the final report; only individual specimen results are required in the report table.
              </span>
            </div>
          </div>

          {/* Bend / Rebend Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-muted-foreground">
            <span className="font-semibold">Bend / Rebend key:</span>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                NCO
              </Badge>
              No Cracks Observed
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                CO
              </Badge>
              Cracks Observed
            </span>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 border-t dark:border-border flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-muted/20">
          <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
            Shaded columns (C4, C5, C7, C9, C10, C12) are auto-calculated from specimen inputs.
          </p>
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
              className="h-9 text-xs gap-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold"
            >
              <Check className="w-3.5 h-3.5" /> Save Steel Test Data
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
