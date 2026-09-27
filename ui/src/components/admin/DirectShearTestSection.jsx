import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkles,
  Plus,
  Trash2,
  Table,
  LineChart,
  FileSpreadsheet,
  Info,
  Check,
  ClipboardPaste,
  Layers,
} from 'lucide-react';
import {
  calculateDsProperties,
  calculateUdsProperties,
  calculateLoadTable,
  calculateDirectShearSummary,
  createDefaultReadings,
  createDefaultLoadEntry,
  SAMPLE_DIRECT_SHEAR_DS,
  SAMPLE_DIRECT_SHEAR_UDS,
  STANDARD_DIAL_READINGS,
} from '@/utils/directShearCalculation';
import DirectShearCurveChart from './DirectShearCurveChart';

/**
 * Direct Shear Test Component per IS: 2720 (Part 13)
 * Full support for Disturbed Samples (DS) and Undisturbed Samples (UDS).
 */
export default function DirectShearTestSection({
  sample,
  sampleIndex = 0,
  boreholeIndex = 0,
  onChange,
  onRemove,
  canRemove = false,
}) {
  const [activeTab, setActiveTab] = useState('parameters'); // 'parameters' | 'loads' | 'summary'
  const [activeLoadIndex, setActiveLoadIndex] = useState(0);
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');

  // Ensure loads array exists and has at least 3 loads (0.50, 1.00, 1.50)
  const currentLoads = useMemo(() => {
    if (Array.isArray(sample?.loads) && sample.loads.length >= 3) {
      return sample.loads;
    }
    const defaultNormalStresses = ['0.50', '1.00', '1.50'];
    const existing = sample?.loads || [];
    return defaultNormalStresses.map((ns, idx) => {
      if (existing[idx]) {
        return {
          ...createDefaultLoadEntry(ns),
          ...existing[idx],
          normalStress: existing[idx].normalStress || ns,
          readings:
            existing[idx].readings && existing[idx].readings.length > 0
              ? existing[idx].readings
              : createDefaultReadings(),
        };
      }
      return createDefaultLoadEntry(ns);
    });
  }, [sample?.loads]);

  const sampleType = sample?.sampleType || 'DS';

  // Calculate DS Physical Properties
  const dsProps = useMemo(() => {
    return calculateDsProperties({
      dryDensity: sample?.dryDensity,
      initialWaterContent: sample?.initialWaterContent,
      mouldVolume: sample?.mouldVolume || 90,
    });
  }, [sample?.dryDensity, sample?.initialWaterContent, sample?.mouldVolume]);

  // Calculate UDS Physical Properties
  const udsProps = useMemo(() => {
    return calculateUdsProperties({
      containerEmptyWt: sample?.containerEmptyWt,
      containerWetSoilWt: sample?.containerWetSoilWt,
      containerDrySoilWt: sample?.containerDrySoilWt,
      udsTubeSoilWt: sample?.udsTubeSoilWt,
      udsTubeEmptyWt: sample?.udsTubeEmptyWt,
      udsTubeLengthTotal: sample?.udsTubeLengthTotal,
      udsTubeEmptyLength: sample?.udsTubeEmptyLength,
      udsTubeDia: sample?.udsTubeDia,
      mouldVolume: sample?.mouldVolume || 90,
    });
  }, [
    sample?.containerEmptyWt,
    sample?.containerWetSoilWt,
    sample?.containerDrySoilWt,
    sample?.udsTubeSoilWt,
    sample?.udsTubeEmptyWt,
    sample?.udsTubeLengthTotal,
    sample?.udsTubeEmptyLength,
    sample?.udsTubeDia,
    sample?.mouldVolume,
  ]);

  // Calculate Load Tables for all loads
  const calculatedLoads = useMemo(() => {
    return currentLoads.map((load) => {
      return calculateLoadTable(load, {
        leastCount: sample?.leastCountDialGauge || 0.01,
        mouldDimension: sample?.mouldDimensionL || 6.0,
        mouldArea: sample?.mouldArea || 36.0,
        provingRingConstant: sample?.provingRingConstant || 0.22285,
        provingRingMultiplier: sample?.provingRingMultiplier || 5,
      });
    });
  }, [
    currentLoads,
    sample?.leastCountDialGauge,
    sample?.mouldDimensionL,
    sample?.mouldArea,
    sample?.provingRingConstant,
    sample?.provingRingMultiplier,
  ]);

  // Linear Regression & Summary (C and φ)
  const summary = useMemo(() => {
    return calculateDirectShearSummary(calculatedLoads);
  }, [calculatedLoads]);

  // Automatically update parent if cValue, phiValue or stressReadings need syncing
  useEffect(() => {
    const newC = summary.cValue || sample?.cValue || '';
    const newPhi = summary.phiValue || sample?.phiValue || '';
    const newCkPa = summary.cValueKPa || '';
    const newStresses = calculatedLoads.map((l) => ({
      normalStress: l.normalStress,
      shearStress: l.failureShearStress || '',
    }));

    const isDifferent =
      newC !== sample?.cValue ||
      newPhi !== sample?.phiValue ||
      JSON.stringify(newStresses) !== JSON.stringify(sample?.stressReadings || []);

    if (isDifferent) {
      onChange({
        ...sample,
        cValue: newC,
        phiValue: newPhi,
        cValueKPa: newCkPa,
        stressReadings: newStresses,
      });
    }
  }, [summary, calculatedLoads]);

  // Handler for top-level sample field changes
  const handleFieldChange = (field, value) => {
    const updated = { ...sample, [field]: value };

    // Auto-update initial mass and bulk density on DS changes
    if (field === 'dryDensity' || field === 'initialWaterContent') {
      const calc = calculateDsProperties({
        dryDensity: field === 'dryDensity' ? value : sample?.dryDensity,
        initialWaterContent:
          field === 'initialWaterContent' ? value : sample?.initialWaterContent,
        mouldVolume: sample?.mouldVolume || 90,
      });
      if (calc.initialMass) updated.initialMass = calc.initialMass;
      if (calc.bulkDensity) updated.bulkDensity = calc.bulkDensity;
    }

    onChange(updated);
  };

  // Handler for Proving Ring reading in a specific load and row
  const handleProvingRingChange = (loadIndex, rowIndex, val) => {
    const updatedLoads = [...currentLoads];
    const targetLoad = { ...updatedLoads[loadIndex] };
    const targetReadings = [...targetLoad.readings];

    targetReadings[rowIndex] = {
      ...targetReadings[rowIndex],
      provingRingReading: val,
    };

    targetLoad.readings = targetReadings;
    updatedLoads[loadIndex] = targetLoad;

    onChange({
      ...sample,
      loads: updatedLoads,
    });
  };

  // Pre-populate standard 41 rows (0 to 1200 step 30) for current load
  const handlePrepopulateStandardReadings = (loadIndex) => {
    const updatedLoads = [...currentLoads];
    const targetLoad = { ...updatedLoads[loadIndex] };
    const currentMap = {};
    (targetLoad.readings || []).forEach((r) => {
      const dialNum = parseFloat(r.dialReading);
      if (!isNaN(dialNum)) {
        currentMap[dialNum.toFixed(2)] = r.provingRingReading || '';
      }
    });

    targetLoad.readings = STANDARD_DIAL_READINGS.map((dial) => ({
      dialReading: dial.toFixed(2),
      provingRingReading: currentMap[dial.toFixed(2)] || '',
    }));

    updatedLoads[loadIndex] = targetLoad;
    onChange({
      ...sample,
      loads: updatedLoads,
    });
  };

  // Bulk paste proving ring readings (C5) from clipboard / excel
  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText
      .split(/[\r\n\t,]+/)
      .map((s) => s.trim())
      .filter((s) => s !== '');

    const updatedLoads = [...currentLoads];
    const targetLoad = { ...updatedLoads[activeLoadIndex] };
    const targetReadings = [...(targetLoad.readings || createDefaultReadings())];

    lines.forEach((val, idx) => {
      if (idx < targetReadings.length) {
        targetReadings[idx] = {
          ...targetReadings[idx],
          provingRingReading: val,
        };
      } else {
        // Append row if more values provided
        targetReadings.push({
          dialReading: (idx * 30).toFixed(2),
          provingRingReading: val,
        });
      }
    });

    targetLoad.readings = targetReadings;
    updatedLoads[activeLoadIndex] = targetLoad;

    onChange({
      ...sample,
      loads: updatedLoads,
    });

    setBulkPasteText('');
    setBulkPasteOpen(false);
  };

  // Fill Sample Data from PDF for quick verification
  const handleFillSampleData = () => {
    if (sampleType === 'UDS') {
      onChange({
        ...sample,
        ...SAMPLE_DIRECT_SHEAR_UDS,
        depthOfSample: sample?.depthOfSample || '2.0',
      });
    } else {
      onChange({
        ...sample,
        ...SAMPLE_DIRECT_SHEAR_DS,
        depthOfSample: sample?.depthOfSample || '0.5',
      });
    }
  };

  const handleResetSample = () => {
    if (
      !window.confirm(
        'Are you sure you want to clear all readings and parameters for this sample?'
      )
    )
      return;
    onChange({
      sampleType,
      shearBoxSize: '6 x 6 cm',
      depthOfSample: sample?.depthOfSample || '',
      dateOfTesting: '',
      location: '',
      mouldDimensionL: '6.0',
      mouldDimensionB: '6.0',
      mouldThickness: '2.5',
      mouldArea: '36.0',
      mouldVolume: '90.0',
      provingRingConstant: '0.22285',
      provingRingMultiplier: '5',
      leastCountDialGauge: '0.01',
      initialWaterContent: '',
      dryDensity: '',
      initialMass: '',
      bulkDensity: '',
      finalWaterContent: '',
      loads: [
        createDefaultLoadEntry('0.50'),
        createDefaultLoadEntry('1.00'),
        createDefaultLoadEntry('1.50'),
      ],
      cValue: '',
      phiValue: '',
      cValueKPa: '',
      stressReadings: [
        { normalStress: '0.50', shearStress: '' },
        { normalStress: '1.00', shearStress: '' },
        { normalStress: '1.50', shearStress: '' },
      ],
    });
  };

  const activeCalcLoad = calculatedLoads[activeLoadIndex] || calculatedLoads[0];

  return (
    <div className="border border-gray-200 dark:border-border rounded-xl bg-white dark:bg-card p-4 shadow-sm space-y-4">
      {/* Sample Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-gray-100 dark:border-border">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20 font-bold px-2.5 py-1 text-xs"
          >
            Sample {sampleIndex + 1}
          </Badge>

          {/* Sample Type Dropdown per PDF Page 13 */}
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold text-gray-500">Sample Type:</Label>
            <Select
              value={sampleType}
              onValueChange={(val) => handleFieldChange('sampleType', val)}
            >
              <SelectTrigger className="h-8 w-[190px] text-xs font-semibold bg-gray-50 dark:bg-muted">
                <SelectValue placeholder="Select Sample Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DS" className="text-xs font-medium">
                  Disturbed sample (DS)
                </SelectItem>
                <SelectItem value="UDS" className="text-xs font-medium">
                  Undisturbed sample (UDS)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold text-gray-500">Depth (m):</Label>
            <Input
              value={sample?.depthOfSample || ''}
              onChange={(e) => handleFieldChange('depthOfSample', e.target.value)}
              className="h-8 w-20 text-xs text-center font-medium"
              placeholder="e.g. 0.5"
            />
          </div>
        </div>

        {/* Calculated Results Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {summary.isValid ? (
            <>
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <span>c = {summary.cValue} kg/cm²</span>
                {summary.cValueKPa && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-normal">
                    ({summary.cValueKPa} kN/m²)
                  </span>
                )}
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg text-indigo-800 dark:text-indigo-300 text-xs font-bold">
                φ = {summary.phiValue}°
              </div>
            </>
          ) : (
            <Badge variant="secondary" className="text-xs text-gray-500 font-normal">
              Enter readings to compute c & φ
            </Badge>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFillSampleData}
            className="h-8 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            title="Load standard test data from the IS: 2720 PDF"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Fill Demo Data
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetSample}
            className="h-8 text-xs text-gray-500 hover:text-gray-700"
            title="Clear all entries"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 h-8 w-8"
              title="Remove this direct shear sample"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Internal Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-100 dark:border-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('parameters')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'parameters'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          1. {sampleType === 'UDS' ? 'UDS Properties & Moisture' : 'Sample Parameters (DS)'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loads')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'loads'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          2. Shear Readings (3 Loads)
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px]">
            {calculatedLoads.filter((l) => l.failureShearStress).length}/3
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'summary'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
          }`}
        >
          <LineChart className="w-3.5 h-3.5" />
          3. Summary & Failure Envelope Graph
        </button>
      </div>

      {/* TAB 1: PARAMETERS & PHYSICAL PROPERTIES */}
      {activeTab === 'parameters' && (
        <div className="space-y-4">
          {/* General Apparatus & Mould Constants (Constant based on moulds) */}
          <div className="bg-gray-50/50 dark:bg-muted/30 p-3.5 rounded-xl border border-gray-100 dark:border-border">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Apparatus Constants & Mould Dimensions [IS: 2720 Part 13]
              </span>
              <span className="text-[10px] text-gray-400 italic">Constant based on standard moulds</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div>
                <Label className="text-[11px] text-gray-500">Mould Size (cm)</Label>
                <Input
                  value={`${sample?.mouldDimensionL || '6'} × ${sample?.mouldDimensionB || '6'}`}
                  readOnly
                  className="h-7 text-xs bg-white dark:bg-card"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Thickness (cm)</Label>
                <Input
                  value={sample?.mouldThickness || '2.5'}
                  readOnly
                  className="h-7 text-xs bg-white dark:bg-card"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Area (cm²)</Label>
                <Input
                  value={sample?.mouldArea || '36.0'}
                  readOnly
                  className="h-7 text-xs bg-white dark:bg-card font-semibold"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Volume (cm³)</Label>
                <Input
                  value={sample?.mouldVolume || '90.0'}
                  readOnly
                  className="h-7 text-xs bg-white dark:bg-card font-semibold"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500" title="Proving Ring Calibration Constant">
                  PR Constant (kg/div)
                </Label>
                <Input
                  value={sample?.provingRingConstant ?? '0.22285'}
                  onChange={(e) => handleFieldChange('provingRingConstant', e.target.value)}
                  className="h-7 text-xs font-mono font-medium"
                  placeholder="0.22285"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500" title="Gauge Division Multiplier">
                  PR Multiplier
                </Label>
                <Input
                  value={sample?.provingRingMultiplier ?? '5'}
                  onChange={(e) => handleFieldChange('provingRingMultiplier', e.target.value)}
                  className="h-7 text-xs font-mono font-medium"
                  placeholder="5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2.5">
              <div>
                <Label className="text-[11px] text-gray-500">Least Count of Dial Gauge (mm)</Label>
                <Input
                  value={sample?.leastCountDialGauge || '0.01'}
                  readOnly
                  className="h-7 text-xs bg-white dark:bg-card"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Date of Testing</Label>
                <Input
                  value={sample?.dateOfTesting || ''}
                  onChange={(e) => handleFieldChange('dateOfTesting', e.target.value)}
                  className="h-7 text-xs"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Location / Description</Label>
                <Input
                  value={sample?.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="h-7 text-xs"
                  placeholder="e.g. BH 1, 0.5m"
                />
              </div>
            </div>
          </div>

          {/* DISTURBED SAMPLE (DS) SPECIFIC INPUTS (PDF Page 01) */}
          {sampleType === 'DS' && (
            <div className="border border-blue-100 dark:border-blue-950/60 bg-blue-50/20 dark:bg-blue-950/10 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                  Disturbed Sample (DS) Physical Properties (Based on Compaction Testing)
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400">PDF Page 01</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Initial Water Content, w (%)
                  </Label>
                  <Input
                    value={sample?.initialWaterContent || ''}
                    onChange={(e) => handleFieldChange('initialWaterContent', e.target.value)}
                    placeholder="e.g. 11.8"
                    className="h-8 text-xs font-medium"
                  />
                  <span className="text-[10px] text-gray-400">From compaction test</span>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Dry Density, ρd (g/cc)
                  </Label>
                  <Input
                    value={sample?.dryDensity || ''}
                    onChange={(e) => handleFieldChange('dryDensity', e.target.value)}
                    placeholder="e.g. 1.54"
                    className="h-8 text-xs font-medium"
                  />
                  <span className="text-[10px] text-gray-400">From compaction test</span>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Initial Mass of Specimen (g)
                  </Label>
                  <Input
                    value={dsProps.initialMass || sample?.initialMass || ''}
                    readOnly
                    className="h-8 text-xs bg-gray-50 dark:bg-muted font-bold font-mono text-gray-800 dark:text-foreground"
                    placeholder="Auto: ρd × Vol"
                  />
                  <span className="text-[10px] text-gray-400">= Dry Density × Volume (90 cm³)</span>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Bulk Density, ρ (g/cc)
                  </Label>
                  <Input
                    value={dsProps.bulkDensity || sample?.bulkDensity || ''}
                    readOnly
                    className="h-8 text-xs bg-gray-50 dark:bg-muted font-bold font-mono text-gray-800 dark:text-foreground"
                    placeholder="Auto: ρd × (1 + w/100)"
                  />
                  <span className="text-[10px] text-gray-400">= ρd × (1 + w/100)</span>
                </div>
              </div>
            </div>
          )}

          {/* UNDISTURBED SAMPLE (UDS) SPECIFIC INPUTS (PDF Page 10, 11, 12, 13) */}
          {sampleType === 'UDS' && (
            <div className="space-y-4">
              {/* UDS Tube Dimensions & Bulk Density */}
              <div className="border border-purple-100 dark:border-purple-950/60 bg-purple-50/20 dark:bg-purple-950/10 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wide">
                    UDS Tube Measurements & Bulk Density (PDF Page 11 & 12)
                  </span>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                      UDS ID:
                    </Label>
                    <Input
                      value={sample?.udsId || ''}
                      onChange={(e) => handleFieldChange('udsId', e.target.value)}
                      placeholder="e.g. 01"
                      className="h-7 w-20 text-xs bg-white dark:bg-card"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300">
                      UDS Tube + Soil Wt (g)
                    </Label>
                    <Input
                      value={sample?.udsTubeSoilWt || ''}
                      onChange={(e) => handleFieldChange('udsTubeSoilWt', e.target.value)}
                      placeholder="e.g. 10572"
                      className="h-7 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300">
                      Empty Wt of UDS Tube (g)
                    </Label>
                    <Input
                      value={sample?.udsTubeEmptyWt || ''}
                      onChange={(e) => handleFieldChange('udsTubeEmptyWt', e.target.value)}
                      placeholder="e.g. 5749"
                      className="h-7 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300">
                      Total Length Tube, L (mm)
                    </Label>
                    <Input
                      value={sample?.udsTubeLengthTotal ?? '450'}
                      onChange={(e) => handleFieldChange('udsTubeLengthTotal', e.target.value)}
                      placeholder="e.g. 450"
                      className="h-7 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300">
                      Empty Part Length, l₁ (mm)
                    </Label>
                    <Input
                      value={sample?.udsTubeEmptyLength ?? '75'}
                      onChange={(e) => handleFieldChange('udsTubeEmptyLength', e.target.value)}
                      placeholder="e.g. 75"
                      className="h-7 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300">
                      Dia of UDS Tube, d (mm)
                    </Label>
                    <Input
                      value={sample?.udsTubeDia ?? '100'}
                      onChange={(e) => handleFieldChange('udsTubeDia', e.target.value)}
                      placeholder="e.g. 100"
                      className="h-7 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* UDS Computed Parameters Display */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-purple-100 dark:border-purple-900/40">
                  <div className="bg-white dark:bg-card p-2 rounded-lg border border-purple-50 dark:border-purple-900/30">
                    <span className="text-[10px] text-gray-400 block">Soil Weight (W = W1 - W2)</span>
                    <span className="text-xs font-bold font-mono text-purple-900 dark:text-purple-300">
                      {udsProps.soilWeight ? `${udsProps.soilWeight} g` : '-'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-card p-2 rounded-lg border border-purple-50 dark:border-purple-900/30">
                    <span className="text-[10px] text-gray-400 block">Soil Length (l = L - l₁)</span>
                    <span className="text-xs font-bold font-mono text-purple-900 dark:text-purple-300">
                      {udsProps.soilLengthCm ? `${udsProps.soilLengthCm} cm (${udsProps.soilLengthMm} mm)` : '-'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-card p-2 rounded-lg border border-purple-50 dark:border-purple-900/30">
                    <span className="text-[10px] text-gray-400 block">Soil Volume (V = π·d²/4·l)</span>
                    <span className="text-xs font-bold font-mono text-purple-900 dark:text-purple-300">
                      {udsProps.soilVolume ? `${udsProps.soilVolume} cm³` : '-'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-card p-2 rounded-lg border border-purple-50 dark:border-purple-900/30">
                    <span className="text-[10px] text-gray-400 block">Bulk Density, ρb (W/V)</span>
                    <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400">
                      {udsProps.bulkDensity ? `${udsProps.bulkDensity} g/cc` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* UDS Moisture Content Test Section (PDF Page 12 & 13) */}
              <div className="border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                    Moisture Content Determination for UDS (PDF Page 12 & 13)
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    Initial Water Content: {udsProps.initialWaterContent ? `${udsProps.initialWaterContent}%` : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300">
                      1. Empty Wt of Container, w₁ (g)
                    </Label>
                    <Input
                      value={sample?.containerEmptyWt || ''}
                      onChange={(e) => handleFieldChange('containerEmptyWt', e.target.value)}
                      placeholder="e.g. 20.63"
                      className="h-7 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300">
                      2. Wt of Container + Wet Soil, w₂ (g)
                    </Label>
                    <Input
                      value={sample?.containerWetSoilWt || ''}
                      onChange={(e) => handleFieldChange('containerWetSoilWt', e.target.value)}
                      placeholder="e.g. 48.75"
                      className="h-7 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300">
                      3. Wt of Container + Dry Soil, w₃ (g)
                    </Label>
                    <Input
                      value={sample?.containerDrySoilWt || ''}
                      onChange={(e) => handleFieldChange('containerDrySoilWt', e.target.value)}
                      placeholder="e.g. 45.98"
                      className="h-7 text-xs font-medium"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 italic bg-white dark:bg-card p-2 rounded-lg border border-emerald-50 dark:border-emerald-900/30">
                  Formula: Initial Water % = [(w₂ − w₃) / (w₃ − w₁)] × 100
                  {udsProps.dryDensity && (
                    <span className="ml-3 font-semibold text-emerald-800 dark:text-emerald-300">
                      → Dry Density ρd = {udsProps.dryDensity} g/cc | Initial Mass = {udsProps.initialMass} g
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SHEAR READINGS FOR 3 LOADS */}
      {activeTab === 'loads' && (
        <div className="space-y-3">
          {/* Sub-tabs for the 3 loads (0.50, 1.00, 1.50 kg/cm²) */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-muted/40 rounded-xl border border-gray-100 dark:border-border">
            <div className="flex items-center gap-1.5">
              {calculatedLoads.map((load, lIdx) => (
                <button
                  key={lIdx}
                  type="button"
                  onClick={() => setActiveLoadIndex(lIdx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeLoadIndex === lIdx
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-card text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-border hover:bg-gray-100'
                  }`}
                >
                  <span>Load {lIdx + 1}: σ = {load.normalStress} kg/cm²</span>
                  {load.failureShearStress ? (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        activeLoadIndex === lIdx
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      τ = {load.failureShearStress}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePrepopulateStandardReadings(activeLoadIndex)}
                className="h-7 text-xs text-primary border-primary/20 hover:bg-primary/5"
                title="Pre-fill dial readings 0 to 1200 in standard intervals of 30"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Pre-fill 0-1200 Divs
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulkPasteOpen(!bulkPasteOpen)}
                className="h-7 text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                title="Paste proving ring readings (C5) in bulk from Excel"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1" />
                Bulk Paste C5
              </Button>
            </div>
          </div>

          {/* Bulk Paste Box */}
          {bulkPasteOpen && (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Paste Proving Ring Readings (C5) for Load {activeLoadIndex + 1} (σ = {activeCalcLoad.normalStress} kg/cm²)
                </span>
                <span className="text-[11px] text-gray-500">Separated by lines, spaces, or tabs</span>
              </div>
              <textarea
                value={bulkPasteText}
                onChange={(e) => setBulkPasteText(e.target.value)}
                placeholder="5.40&#10;6.40&#10;7.40&#10;8.40&#10;..."
                rows={4}
                className="w-full text-xs font-mono p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-card focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setBulkPasteOpen(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyBulkPaste}
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Apply Values to Table
                </Button>
              </div>
            </div>
          )}

          {/* Active Load Status Bar */}
          <div className="flex flex-wrap justify-between items-center bg-gray-50/60 dark:bg-muted/20 px-3 py-2 rounded-lg border border-gray-100 dark:border-border text-xs">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Load {activeLoadIndex + 1}: Normal Stress ={' '}
                <span className="font-bold text-primary">{activeCalcLoad.normalStress} kg/cm²</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] text-gray-500">Final Water Content at Shear Zone (%):</Label>
                <Input
                  value={currentLoads[activeLoadIndex]?.finalWaterContent || ''}
                  onChange={(e) => {
                    const updatedLoads = [...currentLoads];
                    updatedLoads[activeLoadIndex] = {
                      ...updatedLoads[activeLoadIndex],
                      finalWaterContent: e.target.value,
                    };
                    onChange({ ...sample, loads: updatedLoads });
                  }}
                  placeholder="In oven after test"
                  className="h-6 w-28 text-xs bg-white dark:bg-card"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500">Maximum / Failure Shear Stress:</span>
              <span className="font-mono font-bold text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                {activeCalcLoad.failureShearStress
                  ? `${activeCalcLoad.failureShearStress} kg/cm²`
                  : 'Pending Readings'}
              </span>
            </div>
          </div>

          {/* Tabular Reading Grid (IS: 2720 Part 13 Pages 3, 4, 5, 8) */}
          <div className="border border-gray-200 dark:border-border rounded-xl overflow-hidden bg-white dark:bg-card shadow-sm">
            <div className="max-h-[460px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 dark:bg-muted/80 text-[11px] font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-border z-10">
                  <tr>
                    <th className="px-2.5 py-2 text-center w-12">#</th>
                    <th className="px-2.5 py-2" title="Shear displacement dial reading">
                      C1: Dial Reading (div)
                    </th>
                    <th className="px-2.5 py-2" title="C2 = (C1 × 0.01) / 10">
                      C2: Disp (cm)
                    </th>
                    <th className="px-2.5 py-2" title="C3 = C2 / 6">
                      C3: Shear Strain
                    </th>
                    <th className="px-2.5 py-2" title="C4 = 36 × (1 - C3)">
                      C4: Corrected Area (cm²)
                    </th>
                    <th
                      className="px-2.5 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-l border-r border-amber-200 dark:border-amber-800"
                      title="Proving Ring Reading (div) - User Input"
                    >
                      C5: Proving Ring (div) *
                    </th>
                    <th className="px-2.5 py-2" title="C6 = C5 × 0.22285 × 5">
                      C6: Shear Force (kg)
                    </th>
                    <th className="px-2.5 py-2 text-right pr-4" title="C7 = C6 / C4">
                      C7: Shear Stress (kg/cm²)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-border">
                  {activeCalcLoad.calculatedRows.map((row, rIdx) => {
                    const isPeak = rIdx === activeCalcLoad.maxRowIndex && activeCalcLoad.failureShearStress;
                    return (
                      <tr
                        key={rIdx}
                        className={`transition-colors ${
                          isPeak
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-semibold'
                            : rIdx % 2 === 0
                            ? 'bg-white dark:bg-card'
                            : 'bg-gray-50/40 dark:bg-muted/20'
                        }`}
                      >
                        <td className="px-2 py-1.5 text-center text-gray-400 font-mono text-[10px]">
                          {rIdx + 1}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">
                          {row.c1}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-gray-500">{row.c2}</td>
                        <td className="px-2 py-1.5 font-mono text-gray-500">{row.c3}</td>
                        <td className="px-2 py-1.5 font-mono text-gray-500">{row.c4}</td>
                        <td className="px-1.5 py-1 bg-amber-50/40 dark:bg-amber-950/20 border-l border-r border-amber-100 dark:border-amber-900/30">
                          <Input
                            value={row.c5}
                            onChange={(e) =>
                              handleProvingRingChange(activeLoadIndex, rIdx, e.target.value)
                            }
                            placeholder="0.00"
                            className="h-6 w-24 text-xs font-mono font-semibold text-center border-amber-300 focus-visible:ring-amber-500 bg-white dark:bg-card"
                          />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-gray-600 dark:text-gray-400">
                          {row.c6}
                        </td>
                        <td className="px-2 py-1.5 text-right pr-4 font-mono font-bold">
                          <span
                            className={
                              isPeak
                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded'
                                : row.c7Num > 0
                                ? 'text-gray-800 dark:text-gray-200'
                                : 'text-gray-400'
                            }
                          >
                            {row.c7}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 bg-gray-50/70 dark:bg-muted/40 border-t border-gray-100 dark:border-border flex justify-between items-center text-[11px] text-gray-500">
              <span>
                Formulas: C2 = (C1×0.01)/10 | C3 = C2/6 | C4 = 36×(1−C3) | C6 = 5 × C5 × 0.22285 | C7 = C6 / C4
              </span>
              <span className="font-semibold">
                Peak Shear Stress for Load {activeLoadIndex + 1}:{' '}
                <span className="text-emerald-700 font-bold">
                  {activeCalcLoad.failureShearStress || '0.00'} kg/cm²
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUMMARY & FAILURE ENVELOPE GRAPH */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Summary Stresses Table */}
            <div className="space-y-3">
              <div className="border border-gray-200 dark:border-border rounded-xl p-4 bg-white dark:bg-card shadow-sm space-y-3">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider block">
                  Shear Failure Summary (IS: 2720 Part 13)
                </span>
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-gray-50 dark:bg-muted/40 text-[11px] text-gray-500 border-b">
                    <tr>
                      <th className="px-3 py-2 font-bold">Load Determination</th>
                      <th className="px-3 py-2 font-bold text-center">
                        Normal Stress, σ (kg/cm²)
                      </th>
                      <th className="px-3 py-2 font-bold text-right">
                        Shear Stress at Failure, τ (kg/cm²)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border">
                    {calculatedLoads.map((load, lIdx) => (
                      <tr key={lIdx} className="hover:bg-gray-50/40">
                        <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                          Determination {lIdx + 1}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-primary">
                          {load.normalStress}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {load.failureShearStress ? `${load.failureShearStress} kg/cm²` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Linear Regression Results per PDF Page 06 & 07 */}
                <div className="bg-blue-50/40 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
                  <span className="text-[11px] font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider block">
                    Linear Regression Failure Envelope: τ = C + σ·tan(φ)
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white dark:bg-card p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                      <span className="text-[10px] text-gray-400 block">
                        Cohesion Intercept, C (Page 07)
                      </span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                        {summary.cValue ? `${summary.cValue} kg/cm²` : '-'}
                      </span>
                      {summary.cValueKPa && (
                        <span className="text-[10px] text-gray-500 block">
                          = {summary.cValueKPa} kN/m² (exact: {summary.interceptC} kg/cm²)
                        </span>
                      )}
                    </div>
                    <div className="bg-white dark:bg-card p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                      <span className="text-[10px] text-gray-400 block">
                        Angle of Internal Friction, φ (Page 07)
                      </span>
                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                        {summary.phiValue ? `${summary.phiValue}°` : '-'}
                      </span>
                      {summary.slopeTanPhi && (
                        <span className="text-[10px] text-gray-500 block">
                          tan(φ) slope = {summary.slopeTanPhi}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 italic pt-1">
                    Note per PDF Page 06: Both C and φ values come from graph with intercept of X-axis and Y-axis. Reported with 2 decimal places.
                  </p>
                </div>
              </div>
            </div>

            {/* Failure Envelope SVG Chart */}
            <div className="w-full">
              <DirectShearCurveChart
                points={summary.points}
                interceptC={summary.interceptC}
                slopeTanPhi={summary.slopeTanPhi}
                cValue={summary.cValue}
                phiValue={summary.phiValue}
                width={520}
                height={290}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
