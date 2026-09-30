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
  Zap,
  Tag,
  Receipt,
  Truck,
  Award,
  Building2,
  Layers,
} from 'lucide-react';
import {
  DEFAULT_STRUCTURAL_STEEL_OBSERVATION,
  DEFAULT_STRUCTURAL_STEEL_OBSERVATIONS,
  BEND_OPTIONS,
  REBEND_OPTIONS,
  COMMON_STRUCTURAL_STEEL_TYPES,
  SAMPLE_STRUCTURAL_STEEL_TEST_DATA,
  calculateStructuralSteelTest,
} from '@/utils/structuralSteelCalculation';

/**
 * Modal for Structural Steel Tensile Tests
 * Standard: IS 1608 (Part 1) : 2022
 *
 * Applicable for:
 *  - MS Plates
 *  - W-Beam
 *  - Channels
 *  - Angles, Flats, Sections
 */
export default function StructuralSteelTestModal({
  isOpen,
  onClose,
  sampleCode = '',
  jobCode = '',
  initialData = {},
  onApply,
}) {
  const [observations, setObservations] = useState(
    DEFAULT_STRUCTURAL_STEEL_OBSERVATIONS.map((o) => ({ ...o }))
  );

  // Client reference dropdown option pools
  const [heatNoOptions, setHeatNoOptions] = useState([]);
  const [invoiceNoOptions, setInvoiceNoOptions] = useState([]);
  const [vehicleNoOptions, setVehicleNoOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);

  // Report column toggles
  const [includeHeatNoInReport, setIncludeHeatNoInReport] = useState(false);
  const [includeInvoiceNoInReport, setIncludeInvoiceNoInReport] = useState(false);
  const [includeVehicleNoInReport, setIncludeVehicleNoInReport] = useState(false);
  const [includeBrandInReport, setIncludeBrandInReport] = useState(true);
  const [includeGradeInReport, setIncludeGradeInReport] = useState(true);
  const [includeBendInReport, setIncludeBendInReport] = useState(false);
  const [includeRebendInReport, setIncludeRebendInReport] = useState(false);

  // Quick inputs
  const [heatInput, setHeatInput] = useState('');
  const [invoiceInput, setInvoiceInput] = useState('');
  const [vehicleInput, setVehicleInput] = useState('');
  const [brandInput, setBrandInput] = useState('');
  const [gradeInput, setGradeInput] = useState('');

  // ── Load initial data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (initialData?.observations?.length > 0) {
      setObservations(
        initialData.observations.map((o, i) => ({
          sampleId:         o.sampleId         ?? `Sample ${i + 1}`,
          sampleType:       o.sampleType       ?? o.sampleName ?? 'MS Plate',
          sampleName:       o.sampleType       ?? o.sampleName ?? 'MS Plate',
          heatNo:           o.heatNo           !== undefined ? String(o.heatNo)           : '',
          invoiceNo:        o.invoiceNo        !== undefined ? String(o.invoiceNo)        : '',
          vehicleNo:        o.vehicleNo        !== undefined ? String(o.vehicleNo)        : '',
          brand:            o.brand            !== undefined ? String(o.brand)            : '',
          grade:            o.grade            !== undefined ? String(o.grade)            : '',
          width:            o.width            !== undefined ? String(o.width)            : '',
          thickness:        o.thickness        !== undefined ? String(o.thickness)        : '',
          yieldLoad:        o.yieldLoad        !== undefined ? String(o.yieldLoad)        : '',
          ultimateLoad:     o.ultimateLoad     !== undefined ? String(o.ultimateLoad)     : '',
          finalGaugeLength: o.finalGaugeLength !== undefined ? String(o.finalGaugeLength) : '',
          bendTest:         o.bendTest         || 'NCO',
          rebendTest:       o.rebendTest       || 'NCO',
        }))
      );

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
      const existingBrands = [
        ...(initialData.brandOptions || []),
        ...initialData.observations.map((o) => o.brand).filter(Boolean),
      ];
      const existingGrades = [
        ...(initialData.gradeOptions || []),
        ...initialData.observations.map((o) => o.grade).filter(Boolean),
      ];

      setHeatNoOptions([...new Set(existingHeats.map((s) => String(s).trim()))]);
      setInvoiceNoOptions([...new Set(existingInvoices.map((s) => String(s).trim()))]);
      setVehicleNoOptions([...new Set(existingVehicles.map((s) => String(s).trim()))]);
      setBrandOptions([...new Set(existingBrands.map((s) => String(s).trim()))]);
      setGradeOptions([...new Set(existingGrades.map((s) => String(s).trim()))]);

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
      setIncludeBrandInReport(
        initialData.includeBrandInReport ??
          initialData.clientReferenceColumns?.brand ??
          true
      );
      setIncludeGradeInReport(
        initialData.includeGradeInReport ??
          initialData.clientReferenceColumns?.grade ??
          true
      );
      setIncludeBendInReport(
        initialData.includeBendInReport ??
          initialData.customOptions?.includeBendInReport ??
          initialData.clientReferenceColumns?.bend ??
          false
      );
      setIncludeRebendInReport(
        initialData.includeRebendInReport ??
          initialData.customOptions?.includeRebendInReport ??
          initialData.clientReferenceColumns?.rebend ??
          false
      );
    } else {
      setObservations(
        DEFAULT_STRUCTURAL_STEEL_OBSERVATIONS.map((o, i) => ({
          ...o,
          sampleId: sampleCode ? `${sampleCode}-${i + 1}` : o.sampleId,
        }))
      );
      setHeatNoOptions([]);
      setInvoiceNoOptions([]);
      setVehicleNoOptions([]);
      setBrandOptions([]);
      setGradeOptions([]);
      setIncludeHeatNoInReport(false);
      setIncludeInvoiceNoInReport(false);
      setIncludeVehicleNoInReport(false);
      setIncludeBrandInReport(true);
      setIncludeGradeInReport(true);
      setIncludeBendInReport(false);
      setIncludeRebendInReport(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Options for dropdowns ───────────────────────────────────────────────
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

  const availableBrands = useMemo(() => {
    const fromObs = observations.map((o) => o.brand).filter(Boolean);
    return [...new Set([...brandOptions, ...fromObs].map((s) => String(s).trim()))].filter(Boolean);
  }, [brandOptions, observations]);

  const availableGrades = useMemo(() => {
    const fromObs = observations.map((o) => o.grade).filter(Boolean);
    return [...new Set([...gradeOptions, ...fromObs].map((s) => String(s).trim()))].filter(Boolean);
  }, [gradeOptions, observations]);

  // ── Calculation ─────────────────────────────────────────────────────────
  const { rows, summary } = useMemo(
    () =>
      calculateStructuralSteelTest(observations, {
        includeHeatNoInReport,
        includeInvoiceNoInReport,
        includeVehicleNoInReport,
        includeBrandInReport,
        includeGradeInReport,
        includeBendInReport,
        includeRebendInReport,
      }),
    [
      observations,
      includeHeatNoInReport,
      includeInvoiceNoInReport,
      includeVehicleNoInReport,
      includeBrandInReport,
      includeGradeInReport,
      includeBendInReport,
      includeRebendInReport,
    ]
  );

  // ── Handlers ────────────────────────────────────────────────────
  const change = (i, field, val) =>
    setObservations((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], [field]: val };
      if (field === 'sampleType') {
        c[i].sampleName = val;
      }
      return c;
    });

  const addRow = () =>
    setObservations((p) => [
      ...p,
      {
        ...DEFAULT_STRUCTURAL_STEEL_OBSERVATION,
        sampleId: `Sample ${p.length + 1}`,
        sampleType: p[p.length - 1]?.sampleType || 'MS Plate',
        sampleName: p[p.length - 1]?.sampleType || 'MS Plate',
        heatNo: availableHeatNos.length === 1 ? availableHeatNos[0] : '',
        invoiceNo: availableInvoiceNos.length === 1 ? availableInvoiceNos[0] : '',
        vehicleNo: availableVehicleNos.length === 1 ? availableVehicleNos[0] : '',
        brand: availableBrands.length === 1 ? availableBrands[0] : '',
        grade: availableGrades.length === 1 ? availableGrades[0] : '',
        bendTest: 'NCO',
        rebendTest: 'NCO',
      },
    ]);

  const removeRow = (i) =>
    setObservations((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  const applySampleTypeToAll = (val) => {
    if (!val) return;
    setObservations((prev) =>
      prev.map((o) => ({ ...o, sampleType: val, sampleName: val }))
    );
  };

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

  const applyBrandToAll = (val) => {
    if (!val) return;
    setObservations((prev) => prev.map((o) => ({ ...o, brand: val })));
    setIncludeBrandInReport(true);
  };

  const applyGradeToAll = (val) => {
    if (!val) return;
    setObservations((prev) => prev.map((o) => ({ ...o, grade: val })));
    setIncludeGradeInReport(true);
  };

  const handleAddHeatOptions = () => {
    if (!heatInput.trim()) return;
    const parts = heatInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    setHeatNoOptions((prev) => [...new Set([...prev, ...parts])]);
    setIncludeHeatNoInReport(true);
    setHeatInput('');
  };

  const handleAddInvoiceOptions = () => {
    if (!invoiceInput.trim()) return;
    const parts = invoiceInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    setInvoiceNoOptions((prev) => [...new Set([...prev, ...parts])]);
    setIncludeInvoiceNoInReport(true);
    setInvoiceInput('');
  };

  const handleAddVehicleOptions = () => {
    if (!vehicleInput.trim()) return;
    const parts = vehicleInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    setVehicleNoOptions((prev) => [...new Set([...prev, ...parts])]);
    setIncludeVehicleNoInReport(true);
    setVehicleInput('');
  };

  const handleAddBrandOptions = () => {
    if (!brandInput.trim()) return;
    const parts = brandInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    setBrandOptions((prev) => [...new Set([...prev, ...parts])]);
    setIncludeBrandInReport(true);
    setBrandInput('');
  };

  const handleAddGradeOptions = () => {
    if (!gradeInput.trim()) return;
    const parts = gradeInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    setGradeOptions((prev) => [...new Set([...prev, ...parts])]);
    setIncludeGradeInReport(true);
    setGradeInput('');
  };

  // ── Load Sample Data ────────────────────────────────────────────────────
  const handleLoadSampleData = () => {
    setObservations(
      SAMPLE_STRUCTURAL_STEEL_TEST_DATA.observations.map((o) => ({ ...o }))
    );
    setHeatNoOptions([...SAMPLE_STRUCTURAL_STEEL_TEST_DATA.heatNoOptions]);
    setInvoiceNoOptions([...SAMPLE_STRUCTURAL_STEEL_TEST_DATA.invoiceNoOptions]);
    setVehicleNoOptions([...SAMPLE_STRUCTURAL_STEEL_TEST_DATA.vehicleNoOptions]);
    setBrandOptions([...(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.brandOptions || [])]);
    setGradeOptions([...(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.gradeOptions || [])]);
    setIncludeHeatNoInReport(false);
    setIncludeInvoiceNoInReport(false);
    setIncludeVehicleNoInReport(false);
    setIncludeBrandInReport(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.includeBrandInReport ?? true);
    setIncludeGradeInReport(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.includeGradeInReport ?? true);
    setIncludeBendInReport(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.includeBendInReport ?? false);
    setIncludeRebendInReport(SAMPLE_STRUCTURAL_STEEL_TEST_DATA.includeRebendInReport ?? false);
  };

  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset all test data?')) return;
    setObservations(
      DEFAULT_STRUCTURAL_STEEL_OBSERVATIONS.map((o, i) => ({
        ...o,
        sampleId: sampleCode ? `${sampleCode}-${i + 1}` : o.sampleId,
      }))
    );
    setHeatNoOptions([]);
    setInvoiceNoOptions([]);
    setVehicleNoOptions([]);
    setBrandOptions([]);
    setGradeOptions([]);
    setIncludeHeatNoInReport(false);
    setIncludeInvoiceNoInReport(false);
    setIncludeVehicleNoInReport(false);
    setIncludeBrandInReport(true);
    setIncludeGradeInReport(true);
    setIncludeBendInReport(false);
    setIncludeRebendInReport(false);
  };

  const handleSave = () => {
    const hasHeatVal = observations.some((o) => o.heatNo && String(o.heatNo).trim() !== '');
    const hasInvoiceVal = observations.some((o) => o.invoiceNo && String(o.invoiceNo).trim() !== '');
    const hasVehicleVal = observations.some((o) => o.vehicleNo && String(o.vehicleNo).trim() !== '');
    const hasBrandVal = observations.some((o) => o.brand && String(o.brand).trim() !== '');
    const hasGradeVal = observations.some((o) => o.grade && String(o.grade).trim() !== '');

    const payload = {
      standard: 'IS 1608 (Part 1) : 2022',
      observations: observations.map((o, i) => {
        const computed = rows[i] || {};
        return {
          ...o,
          slNo: i + 1,
          sampleId:         o.sampleId || `Sample ${i + 1}`,
          sampleType:       o.sampleType || o.sampleName || '',
          sampleName:       o.sampleType || o.sampleName || '',
          heatNo:           o.heatNo || '',
          invoiceNo:        o.invoiceNo || '',
          vehicleNo:        o.vehicleNo || '',
          brand:            o.brand || '',
          grade:            o.grade || '',
          area:             computed.areaFmt || '',
          yieldStress:      computed.yieldStressFmt || '',
          tensileStrength:  computed.tensileStrengthFmt || '',
          ultimateTensileStrength: computed.tensileStrengthFmt || '',
          initialGaugeLength: computed.iglFmt || '',
          finalGaugeLength: o.finalGaugeLength || '',
          elongation:       computed.elongationFmt || '',
          bendTest:         o.bendTest || 'NCO',
          rebendTest:       o.rebendTest || 'NCO',
        };
      }),
      heatNoOptions,
      invoiceNoOptions,
      vehicleNoOptions,
      brandOptions,
      gradeOptions,
      includeHeatNoInReport:   includeHeatNoInReport && (hasHeatVal || heatNoOptions.length > 0),
      includeInvoiceNoInReport: includeInvoiceNoInReport && (hasInvoiceVal || invoiceNoOptions.length > 0),
      includeVehicleNoInReport: includeVehicleNoInReport && (hasVehicleVal || vehicleNoOptions.length > 0),
      includeBrandInReport:   includeBrandInReport && (hasBrandVal || brandOptions.length > 0),
      includeGradeInReport:   includeGradeInReport && (hasGradeVal || gradeOptions.length > 0),
      includeBendInReport:    Boolean(includeBendInReport),
      includeRebendInReport:  Boolean(includeRebendInReport),
      clientReferenceColumns: {
        heatNo:    includeHeatNoInReport && (hasHeatVal || heatNoOptions.length > 0),
        invoiceNo: includeInvoiceNoInReport && (hasInvoiceVal || invoiceNoOptions.length > 0),
        vehicleNo: includeVehicleNoInReport && (hasVehicleVal || vehicleNoOptions.length > 0),
        brand:     includeBrandInReport && (hasBrandVal || brandOptions.length > 0),
        grade:     includeGradeInReport && (hasGradeVal || gradeOptions.length > 0),
        bend:      Boolean(includeBendInReport),
        rebend:    Boolean(includeRebendInReport),
      },
      customOptions: {
        includeBendInReport:   Boolean(includeBendInReport),
        includeRebendInReport: Boolean(includeRebendInReport),
      },
      avgYieldStress:                 summary.avgYieldStressFmt,
      avgTensileStrength:             summary.avgTensileStrengthFmt,
      avgUltimateTensileStrength:     summary.avgUltimateTensileStrengthFmt || summary.avgTensileStrengthFmt,
      avgElongation:                  summary.avgElongationFmt,
      reportExcludeAverages:          true,
      reportExcludeAvgYieldStress:    true,
      reportExcludeAvgTensileStrength: true,
      reportExcludeAvgElongation:     true,
      includeAveragesInReport:        false,
      reportClauseNote:
        'Avg. yield stress, avg. tensile strength, and avg. elongation are for testing data only and shall not appear in the final report; only individual specimen results are required.',
    };

    onApply(payload);
    onClose();
  };

  const thBase = 'p-2.5 text-center font-bold whitespace-nowrap text-xs border-r dark:border-border';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] 2xl:max-w-8xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-card border-gray-200 dark:border-border shadow-2xl rounded-2xl">
        
        {/* ── Fixed Header ─────────────────────────────────────────────── */}
        <DialogHeader className="p-4 sm:p-5 border-b dark:border-border bg-gradient-to-r from-slate-50/80 via-indigo-50/30 to-transparent dark:from-slate-950/40 dark:via-indigo-950/20 dark:to-transparent shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                    Structural Steel Test Data Entry
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700 font-mono"
                  >
                    IS 1608 (Part 1) : 2022
                  </Badge>
                  {jobCode && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      Job: {jobCode}
                    </Badge>
                  )}
                  {sampleCode && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      Sample: {sampleCode}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                  Metallic materials — Tensile testing (MS Plates, W-Beam, Channels, Angles, Flats, Sections)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadSampleData}
                className="hidden h-8 text-xs gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/40 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Fill Reference Sample Data
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable Body ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          
          {/* Top Info Banner & Sample Types Shortcut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Sample Name / Type space explanation */}
            <div className="lg:col-span-2 p-3.5 rounded-xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border shadow-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Sample Name / Type Specification
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                    Space provided to mention sample name or type (MS Plates, W-Beam, Channel, Angles, etc.)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200/70 dark:border-border">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Quick Preset:</span>
                {COMMON_STRUCTURAL_STEEL_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className="text-[11px] cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 dark:hover:bg-indigo-950/50 transition-colors py-0.5 px-2 bg-white dark:bg-card font-medium"
                    title={`Click to set "${type}" for all specimens`}
                    onClick={() => applySampleTypeToAll(type)}
                  >
                    + {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* IS Standard Note */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-sm flex flex-col justify-between">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Calculation Rules (IS 1608: 2022)
                  </h4>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                    Yield Stress &amp; Tensile Strength formatted to <strong>2 decimal places</strong>.<br />
                    Initial Gauge Length = <strong>5.65 × √Area</strong> (Cl. D.2 / 3.1).
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-amber-900/80 dark:text-amber-300/70 pt-2 border-t border-amber-200/60 dark:border-amber-800/60 mt-2">
                * Averages are for testing data only and excluded from final report.
              </span>
            </div>
          </div>

          {/* Client Reference Options (Collapsible / Optional) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Client Reference Columns (Optional)
                </span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Columns appear in report only if toggled on
                </Badge>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-muted-foreground">
                Enter options below to populate dropdowns, or add new options directly in table rows.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {/* Heat No */}
              <div className="p-3 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-blue-500" /> Heat / Lot No.
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
                    placeholder="e.g. HT-2026-01"
                    className="h-7 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddHeatOptions}
                    className="h-7 px-2.5 text-xs shrink-0 font-medium"
                  >
                    + Add
                  </Button>
                </div>
                {availableHeatNos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-border">
                    <span className="text-[10px] text-gray-400">Pool:</span>
                    {availableHeatNos.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 font-mono cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                        title="Click to apply to all rows"
                        onClick={() => applyHeatToAll(val)}
                      >
                        {val}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoice No */}
              <div className="p-3 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-indigo-500" /> Invoice No.
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
                    placeholder="e.g. INV-2026-01"
                    className="h-7 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddInvoiceOptions}
                    className="h-7 px-2.5 text-xs shrink-0 font-medium"
                  >
                    + Add
                  </Button>
                </div>
                {availableInvoiceNos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-border">
                    <span className="text-[10px] text-gray-400">Pool:</span>
                    {availableInvoiceNos.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 font-mono cursor-pointer hover:bg-indigo-50 hover:text-indigo-700"
                        title="Click to apply to all rows"
                        onClick={() => applyInvoiceToAll(val)}
                      >
                        {val}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle No */}
              <div className="p-3 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-500" /> Vehicle No.
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
                    placeholder="e.g. MH-12-AB-1234"
                    className="h-7 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddVehicleOptions}
                    className="h-7 px-2.5 text-xs shrink-0 font-medium"
                  >
                    + Add
                  </Button>
                </div>
                {availableVehicleNos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-border">
                    <span className="text-[10px] text-gray-400">Pool:</span>
                    {availableVehicleNos.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 font-mono cursor-pointer hover:bg-emerald-50 hover:text-emerald-700"
                        title="Click to apply to all rows"
                        onClick={() => applyVehicleToAll(val)}
                      >
                        {val}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Brand Options */}
              <div className="p-3 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Award className="w-3 h-3 text-purple-500" /> Brand Options
                  </Label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-gray-600 dark:text-gray-400">
                    <Checkbox
                      checked={includeBrandInReport}
                      onCheckedChange={setIncludeBrandInReport}
                      className="h-3.5 w-3.5"
                    />
                    <span>Include in Report</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={brandInput}
                    onChange={(e) => setBrandInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBrandOptions())}
                    placeholder="e.g. TATA Structura"
                    className="h-7 text-xs font-sans"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBrandOptions}
                    className="h-7 px-2.5 text-xs shrink-0 font-medium"
                  >
                    + Add
                  </Button>
                </div>
                {availableBrands.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-border">
                    <span className="text-[10px] text-gray-400">Pool:</span>
                    {availableBrands.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 font-sans cursor-pointer hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40"
                        title="Click to apply to all rows"
                        onClick={() => applyBrandToAll(val)}
                      >
                        {val}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Grade Options */}
              <div className="p-3 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-500" /> Grade Options
                  </Label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-gray-600 dark:text-gray-400">
                    <Checkbox
                      checked={includeGradeInReport}
                      onCheckedChange={setIncludeGradeInReport}
                      className="h-3.5 w-3.5"
                    />
                    <span>Include in Report</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGradeOptions())}
                    placeholder="e.g. IS 2062 E250"
                    className="h-7 text-xs font-sans"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddGradeOptions}
                    className="h-7 px-2.5 text-xs shrink-0 font-medium"
                  >
                    + Add
                  </Button>
                </div>
                {availableGrades.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-border">
                    <span className="text-[10px] text-gray-400">Pool:</span>
                    {availableGrades.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 font-sans cursor-pointer hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40"
                        title="Click to apply to all rows"
                        onClick={() => applyGradeToAll(val)}
                      >
                        {val}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Final Report Custom Options (Bend & Rebend Tests) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Report Custom Options: Bend &amp; Rebend Tests
                </span>
                <Badge variant="outline" className="text-[10px] font-normal border-emerald-300 text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/40">
                  Custom Option • Included only when required
                </Badge>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-muted-foreground">
                Bend and Rebend are excluded from final report by default unless toggled ON below.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors">
                <Checkbox
                  checked={includeBendInReport}
                  onCheckedChange={setIncludeBendInReport}
                  className="h-4 w-4"
                />
                <span>Include Bend Test in Final Report</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors">
                <Checkbox
                  checked={includeRebendInReport}
                  onCheckedChange={setIncludeRebendInReport}
                  className="h-4 w-4"
                />
                <span>Include Rebend Test in Final Report</span>
              </label>
            </div>
          </div>

          {/* Observations Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" /> Structural Steel Observations
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono bg-white dark:bg-card">
                  {observations.length} {observations.length === 1 ? 'specimen' : 'specimens'}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                className="h-8 text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Specimen
              </Button>
            </div>

            <div className="border dark:border-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    {/* Header Group */}
                    <tr className="bg-gray-100/90 dark:bg-muted/60 border-b dark:border-border text-[10px] font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                      <th className={thBase} rowSpan={2}>#</th>
                      <th className={thBase} rowSpan={2}>Sample ID</th>
                      <th className={`${thBase} bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300`} rowSpan={2}>
                        Sample Name / Type
                        <span className="block text-[9px] font-normal text-indigo-600 dark:text-indigo-400">
                          (MS Plate, W-Beam, Channel)
                        </span>
                      </th>
                      {/* Client references if active */}
                      {(availableHeatNos.length > 0 || includeHeatNoInReport) && (
                        <th className={`${thBase} bg-blue-50/60 dark:bg-blue-950/20`} rowSpan={2}>
                          Heat/ Lot No.
                        </th>
                      )}
                      {(availableInvoiceNos.length > 0 || includeInvoiceNoInReport) && (
                        <th className={`${thBase} bg-blue-50/60 dark:bg-blue-950/20`} rowSpan={2}>
                          Invoice No.
                        </th>
                      )}
                      {(availableVehicleNos.length > 0 || includeVehicleNoInReport) && (
                        <th className={`${thBase} bg-blue-50/60 dark:bg-blue-950/20`} rowSpan={2}>
                          Vehicle No.
                        </th>
                      )}
                      {(availableBrands.length > 0 || includeBrandInReport) && (
                        <th className={`${thBase} bg-purple-50/60 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300`} rowSpan={2}>
                          Brand
                        </th>
                      )}
                      {(availableGrades.length > 0 || includeGradeInReport) && (
                        <th className={`${thBase} bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300`} rowSpan={2}>
                          Grade
                        </th>
                      )}
                      {/* Inputs */}
                      <th className={`${thBase} border-l dark:border-border`} colSpan={2}>Dimensions (Inputs)</th>
                      {/* Derived Area */}
                      <th className={`${thBase} bg-slate-100/80 dark:bg-slate-900/40 border-l dark:border-border`}>Derived</th>
                      {/* Yield */}
                      <th className={`${thBase} border-l dark:border-border`} colSpan={2}>Yield</th>
                      {/* Ultimate Tensile */}
                      <th className={`${thBase} border-l dark:border-border`} colSpan={2}>Ultimate Tensile</th>
                      {/* Gauge & Elongation */}
                      <th className={`${thBase} bg-emerald-50/60 dark:bg-emerald-950/20 border-l dark:border-border`} colSpan={3}>Gauge / Elongation</th>
                      {/* Bend */}
                      <th className={`${thBase} border-l dark:border-border`} rowSpan={2}>
                        Bend
                        <span className="block text-[9px] font-normal text-gray-400">
                          {includeBendInReport ? '(In Report)' : '(Testing Only)'}
                        </span>
                      </th>
                      {/* Rebend */}
                      <th className={`${thBase} border-l dark:border-border`} rowSpan={2}>
                        Rebend
                        <span className="block text-[9px] font-normal text-gray-400">
                          {includeRebendInReport ? '(In Report)' : '(Testing Only)'}
                        </span>
                      </th>
                      <th className={thBase} rowSpan={2}></th>
                    </tr>

                    <tr className="bg-gray-50/90 dark:bg-muted/50 border-b dark:border-border text-gray-600 dark:text-gray-300">
                      {/* C1 Width */}
                      <th className={`${thBase} border-l dark:border-border min-w-[90px]`}>
                        C1<span className="block text-[9px] font-normal text-gray-400">Width (mm)</span>
                      </th>
                      {/* C2 Thickness */}
                      <th className={`${thBase} min-w-[90px]`}>
                        C2<span className="block text-[9px] font-normal text-gray-400">Thickness (mm)</span>
                      </th>
                      {/* C3 Area */}
                      <th className={`${thBase} bg-slate-100/80 dark:bg-slate-900/40 border-l dark:border-border min-w-[100px]`}>
                        C3<span className="block text-[9px] font-normal text-slate-500">Area mm²</span>
                      </th>
                      {/* C4 Yield Load */}
                      <th className={`${thBase} border-l dark:border-border min-w-[95px]`}>
                        C4<span className="block text-[9px] font-normal text-gray-400">Yield Load (kN)</span>
                      </th>
                      {/* C5 Yield Stress */}
                      <th className={`${thBase} bg-amber-50/70 dark:bg-amber-950/30 min-w-[110px]`}>
                        C5<span className="block text-[9px] font-normal text-amber-600">Yield Stress N/mm²</span>
                      </th>
                      {/* C6 Ult Load */}
                      <th className={`${thBase} border-l dark:border-border min-w-[95px]`}>
                        C6<span className="block text-[9px] font-normal text-gray-400">Ult. Load (kN)</span>
                      </th>
                      {/* C7 Ultimate Tensile Strength */}
                      <th className={`${thBase} bg-orange-50/70 dark:bg-orange-950/30 min-w-[115px]`}>
                        C7<span className="block text-[9px] font-normal text-orange-600">Ultimate Tensile Strength N/mm²</span>
                      </th>
                      {/* C8 IGL */}
                      <th className={`${thBase} bg-emerald-50/50 dark:bg-emerald-950/20 border-l dark:border-border min-w-[95px]`}>
                        C8<span className="block text-[9px] font-normal text-emerald-600">IGL (mm)</span>
                      </th>
                      {/* C9 FGL */}
                      <th className={`${thBase} min-w-[90px]`}>
                        C9<span className="block text-[9px] font-normal text-gray-400">FGL (mm)</span>
                      </th>
                      {/* C10 Elongation */}
                      <th className={`${thBase} bg-emerald-50/70 dark:bg-emerald-950/30 min-w-[95px]`}>
                        C10<span className="block text-[9px] font-normal text-emerald-600">Elong. (%)</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-border font-mono">
                    {observations.map((obs, i) => {
                      const r = rows[i] || {};
                      const hasErr = r.errors?.length > 0;

                      return (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50/60 dark:hover:bg-muted/30 transition-colors ${
                            hasErr ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                          }`}
                        >
                          {/* # */}
                          <td className="p-2 text-center text-gray-400 dark:text-muted-foreground font-sans font-bold text-xs">
                            {i + 1}
                          </td>

                          {/* Sample ID */}
                          <td className="p-1.5">
                            <Input
                              value={obs.sampleId}
                              onChange={(e) => change(i, 'sampleId', e.target.value)}
                              placeholder={`Sample ${i + 1}`}
                              className="h-8 text-xs font-mono font-medium min-w-[100px]"
                            />
                          </td>

                          {/* Sample Name / Type (per user specification) */}
                          <td className="p-1.5 bg-indigo-50/20 dark:bg-indigo-950/10">
                            <div className="relative min-w-[130px]">
                              <Input
                                list={`types-list-${i}`}
                                value={obs.sampleType}
                                onChange={(e) => change(i, 'sampleType', e.target.value)}
                                placeholder="e.g. MS Plate, W-Beam"
                                className="h-8 text-xs font-sans font-medium border-indigo-200 focus:border-indigo-400"
                              />
                              <datalist id={`types-list-${i}`}>
                                {COMMON_STRUCTURAL_STEEL_TYPES.map((t) => (
                                  <option key={t} value={t} />
                                ))}
                              </datalist>
                            </div>
                          </td>

                          {/* Client references */}
                          {(availableHeatNos.length > 0 || includeHeatNoInReport) && (
                            <td className="p-1.5 bg-blue-50/20 dark:bg-blue-950/10">
                              <Input
                                value={obs.heatNo}
                                onChange={(e) => change(i, 'heatNo', e.target.value)}
                                placeholder="Heat No."
                                className="h-8 text-xs font-mono min-w-[90px]"
                              />
                            </td>
                          )}

                          {(availableInvoiceNos.length > 0 || includeInvoiceNoInReport) && (
                            <td className="p-1.5 bg-blue-50/20 dark:bg-blue-950/10">
                              <Input
                                value={obs.invoiceNo}
                                onChange={(e) => change(i, 'invoiceNo', e.target.value)}
                                placeholder="Invoice No."
                                className="h-8 text-xs font-mono min-w-[90px]"
                              />
                            </td>
                          )}

                          {(availableVehicleNos.length > 0 || includeVehicleNoInReport) && (
                            <td className="p-1.5 bg-blue-50/20 dark:bg-blue-950/10">
                              <Input
                                value={obs.vehicleNo}
                                onChange={(e) => change(i, 'vehicleNo', e.target.value)}
                                placeholder="Vehicle No."
                                className="h-8 text-xs font-mono min-w-[90px]"
                              />
                            </td>
                          )}

                          {/* Brand */}
                          {(availableBrands.length > 0 || includeBrandInReport) && (
                            <td className="p-1.5 bg-purple-50/20 dark:bg-purple-950/10">
                              <div className="relative min-w-[110px]">
                                <Input
                                  list={`brands-list-${i}`}
                                  value={obs.brand}
                                  onChange={(e) => change(i, 'brand', e.target.value)}
                                  placeholder="Brand"
                                  className="h-8 text-xs font-sans min-w-[100px]"
                                />
                                <datalist id={`brands-list-${i}`}>
                                  {availableBrands.map((b) => (
                                    <option key={b} value={b} />
                                  ))}
                                </datalist>
                              </div>
                            </td>
                          )}

                          {/* Grade */}
                          {(availableGrades.length > 0 || includeGradeInReport) && (
                            <td className="p-1.5 bg-amber-50/20 dark:bg-amber-950/10">
                              <div className="relative min-w-[110px]">
                                <Input
                                  list={`grades-list-${i}`}
                                  value={obs.grade}
                                  onChange={(e) => change(i, 'grade', e.target.value)}
                                  placeholder="Grade"
                                  className="h-8 text-xs font-sans min-w-[100px]"
                                />
                                <datalist id={`grades-list-${i}`}>
                                  {availableGrades.map((g) => (
                                    <option key={g} value={g} />
                                  ))}
                                </datalist>
                              </div>
                            </td>
                          )}

                          {/* C1: Width (mm) */}
                          <td className="p-1.5">
                            <Input
                              type="number"
                              step="0.001"
                              value={obs.width}
                              onChange={(e) => change(i, 'width', e.target.value)}
                              placeholder="20.000"
                              className="h-8 text-xs text-right font-mono min-w-[85px]"
                            />
                          </td>

                          {/* C2: Thickness (mm) */}
                          <td className="p-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              value={obs.thickness}
                              onChange={(e) => change(i, 'thickness', e.target.value)}
                              placeholder="12.30"
                              className="h-8 text-xs text-right font-mono min-w-[85px]"
                            />
                          </td>

                          {/* C3: Area (mm²) - Calculated */}
                          <td className="p-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100/60 dark:bg-slate-900/30 whitespace-nowrap">
                            {r.areaFmt || '—'}
                          </td>

                          {/* C4: Yield Load (kN) */}
                          <td className="p-1.5">
                            <Input
                              type="number"
                              step="0.001"
                              value={obs.yieldLoad}
                              onChange={(e) => change(i, 'yieldLoad', e.target.value)}
                              placeholder="149.232"
                              className="h-8 text-xs text-right font-mono min-w-[90px]"
                            />
                          </td>

                          {/* C5: Yield Stress (N/mm²) - Calculated */}
                          <td className="p-2 text-right font-mono font-bold text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 whitespace-nowrap">
                            {r.yieldStressFmt || '—'}
                          </td>

                          {/* C6: Ultimate Load (kN) */}
                          <td className="p-1.5">
                            <Input
                              type="number"
                              step="0.001"
                              value={obs.ultimateLoad}
                              onChange={(e) => change(i, 'ultimateLoad', e.target.value)}
                              placeholder="183.816"
                              className="h-8 text-xs text-right font-mono min-w-[90px]"
                            />
                          </td>

                          {/* C7: Ultimate Tensile Strength (N/mm²) - Calculated */}
                          <td className="p-2 text-right font-mono font-bold text-orange-900 dark:text-orange-300 bg-orange-50/50 dark:bg-orange-950/20 whitespace-nowrap">
                            {r.ultimateTensileStrengthFmt || r.tensileStrengthFmt || '—'}
                          </td>

                          {/* C8: Initial Gauge Length (mm) - Calculated */}
                          <td className="p-2 text-right font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10 whitespace-nowrap">
                            {r.iglFmt || '—'}
                          </td>

                          {/* C9: Final Gauge Length (mm) */}
                          <td className="p-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              value={obs.finalGaugeLength}
                              onChange={(e) => change(i, 'finalGaugeLength', e.target.value)}
                              placeholder="111.25"
                              className="h-8 text-xs text-right font-mono min-w-[85px]"
                            />
                          </td>

                          {/* C10: Elongation (%) - Calculated */}
                          <td className="p-2 text-right font-mono font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 whitespace-nowrap">
                            {r.elongationFmt ? `${r.elongationFmt}%` : '—'}
                          </td>

                          {/* Bend Test */}
                          <td className="p-1.5 text-center min-w-[80px]">
                            <Select
                              value={obs.bendTest || 'NCO'}
                              onValueChange={(val) => change(i, 'bendTest', val)}
                            >
                              <SelectTrigger className="h-8 text-[11px] px-2 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BEND_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Rebend Test */}
                          <td className="p-1.5 text-center min-w-[80px]">
                            <Select
                              value={obs.rebendTest || 'NCO'}
                              onValueChange={(val) => change(i, 'rebendTest', val)}
                            >
                              <SelectTrigger className="h-8 text-[11px] px-2 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {REBEND_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Delete */}
                          <td className="p-1 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={observations.length <= 1}
                              onClick={() => removeRow(i)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 disabled:opacity-30"
                              title="Delete specimen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Testing Data Summary (Excluded from Final Report notice) */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-8">
              {/* Avg Yield Stress */}
              <div title="Recorded for testing data only (excluded from final report)">
                <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400">
                  Avg Yield Stress
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-amber-900 dark:text-amber-300 font-mono">
                    {summary.avgYieldStressFmt || '—'}
                  </span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">N/mm²</span>
                </div>
              </div>

              {/* Avg Ultimate Tensile Strength */}
              <div title="Recorded for testing data only (excluded from final report)">
                <span className="text-[10px] uppercase font-bold text-orange-800 dark:text-orange-400">
                  Avg Ultimate Tensile Strength
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-orange-900 dark:text-orange-300 font-mono">
                    {summary.avgUltimateTensileStrengthFmt || summary.avgTensileStrengthFmt || '—'}
                  </span>
                  <span className="text-xs font-bold text-orange-700 dark:text-orange-400">N/mm²</span>
                </div>
              </div>

              {/* Avg Elongation */}
              <div title="Recorded for testing data only (excluded from final report)">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400">
                  Avg Elongation
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-emerald-900 dark:text-emerald-300 font-mono">
                    {summary.avgElongationFmt || '—'}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">%</span>
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-gray-500 dark:text-muted-foreground ml-auto flex flex-col items-end gap-1">
              <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                Testing Data Only • Excluded from final report (individual results only)
              </span>
              <span>IS 1608 (Part 1) : 2022 Tensile Testing</span>
            </div>
          </div>
        </div>

        {/* ── Fixed Footer Actions ─────────────────────────────────────── */}
        <div className="shrink-0 p-4 border-t dark:border-border flex items-center justify-between gap-3 bg-gray-50/80 dark:bg-muted/20">
          <div className="text-xs text-gray-500 dark:text-muted-foreground flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>Formulas &amp; decimal precisions conform to IS 1608 (Part 1) : 2022</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 px-3 text-xs gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900"
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
              onClick={handleSave}
              className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> Save Structural Steel Test Data
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
