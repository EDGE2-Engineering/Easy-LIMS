import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowDownFromLine,
  Layers,
  LandPlot,
  Trash2,
  Plus,
  FlaskConical,
  TestTube,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Scale,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { soilTypes } from '@/data/soilTypes';
import { useSettings } from '@/contexts/SettingsContext';
import MoistureContentModal from './MoistureContentModal';
import { calculateMoistureValues } from '@/utils/moistureCalculation';
import SpecificGravityModal from './SpecificGravityModal';
import FreeSwellIndexModal from './FreeSwellIndexModal';
import SieveAnalysisModal from './SieveAnalysisModal';
import AtterbergLimitsModal from './AtterbergLimitsModal';
import ShrinkageLimitModal from './ShrinkageLimitModal';
import LightCompactionModal from './LightCompactionModal';
import HeavyCompactionModal from './HeavyCompactionModal';

/**
 * Look up the Correction Factor (CF) from the overburden correction table stored
 * in settings, interpolating linearly between the two nearest pressure rows.
 * Per IS code: CF is restricted to a maximum of 0.75 when Q > 200 kN/m².
 * Returns { cf, formula } — cf defaults to 1 and formula to '' if table is empty.
 */
function lookupCorrectionFactor(overburdenRows, depthFromGL) {
  const CF_MAX_ABOVE_200 = 0.75;
  const fallback = { cf: 1, formula: '' };
  if (!Array.isArray(overburdenRows) || overburdenRows.length === 0) return fallback;
  const sorted = overburdenRows
    .map((r) => ({
      pressure: parseFloat(r.pressure),
      correction: parseFloat(r.correction),
    }))
    .filter((r) => !isNaN(r.pressure) && !isNaN(r.correction))
    .sort((a, b) => a.pressure - b.pressure);
  if (sorted.length === 0) return fallback;
  const pressure = parseFloat(depthFromGL) || 0;

  // Apply IS code rule: CF = 0.75 (fixed) the moment Q > 200 kN/m²
  const applyCap = (cf, formulaBase) => {
    if (pressure > 200) {
      return {
        cf: CF_MAX_ABOVE_200,
        formula: `${formulaBase} → fixed at 0.75 (Q > 200 kN/m²)`,
      };
    }
    return { cf, formula: formulaBase };
  };

  if (pressure <= sorted[0].pressure) {
    return applyCap(sorted[0].correction, `CF at ${sorted[0].pressure} kN/m²`);
  }
  if (pressure >= sorted[sorted.length - 1].pressure) {
    const last = sorted[sorted.length - 1];
    return applyCap(last.correction, `CF at ${last.pressure} kN/m²`);
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i],
      hi = sorted[i + 1];
    if (pressure >= lo.pressure && pressure <= hi.pressure) {
      const t = (pressure - lo.pressure) / (hi.pressure - lo.pressure);
      const cf = lo.correction + t * (hi.correction - lo.correction);
      return applyCap(cf, `Interpolated from Overburden Correction chart in settings`);
    }
  }
  return fallback;
}

/**
 * Compute Depth of Foundation Below Scour Level: Df = D - ds
 * Returns { value, formula }
 */
function computeDepthBelowScour(sbcData) {
  const D = parseFloat(sbcData.depthFromGL);
  const ds = parseFloat(sbcData.scourDepth);
  if (isNaN(D) || isNaN(ds)) return { value: '-', formula: '' };
  const Df = D - ds;
  return {
    value: Df.toFixed(3),
    formula: `Df = D − ds = ${D} − ${ds}`,
  };
}

/**
 * Compute Depth of Failure Zone: Dfz = 0.5 * B * tan(45 + φ/2)
 * Returns { value, formula }
 */
function computeDepthFailureZone(sbcData) {
  const B = parseFloat(sbcData.width);
  const phi = parseFloat(sbcData.consideredAngleOfFriction);
  if (isNaN(B) || isNaN(phi)) return { value: '-', formula: '' };
  const angleRad = ((45 + phi / 2) * Math.PI) / 180;
  const Dfz = 0.5 * B * Math.tan(angleRad);
  return {
    value: Dfz.toFixed(3),
    formula: `Dfz = 0.5 × ${B} × tan(45 + ${phi}/2)`,
  };
}

/**
 * Compute Reduced Angle of Friction: ϕ' = atan(0.67 * tan(φ)) in degrees
 * Returns { value, formula }
 */
function computeReducedFriction(sbcData) {
  const phi = parseFloat(sbcData.consideredAngleOfFriction);
  if (isNaN(phi)) return { value: '-', formula: '' };
  const phiRad = (phi * Math.PI) / 180;
  const phiPrime = (Math.atan(0.67 * Math.tan(phiRad)) * 180) / Math.PI;
  return {
    value: phiPrime.toFixed(3),
    formula: `ϕ' = tan⁻¹(0.67 × tan(${phi}°))`,
  };
}

/**
 * Compute Effective Overburden Pressure: q = γsub × Df
 * where γsub = effectiveUnitWeight (γ') and Df = D - ds
 * Returns { value, formula }
 */
function computeEffectiveOverburden(sbcData) {
  const bulk = parseFloat(sbcData.bulkUnitWeight);
  const D = parseFloat(sbcData.depthFromGL);
  const ds = parseFloat(sbcData.scourDepth);
  if (isNaN(bulk) || isNaN(D) || isNaN(ds)) return { value: '-', formula: '' };
  const gammaSub = Math.max(0, bulk - 10);
  const Df = D - ds;
  const q = gammaSub * Df;
  return {
    value: q.toFixed(3),
    formula: `q = γ' × Df = (${bulk} − 10) × ${Df.toFixed(3)}`,
  };
}

/**
 * Calculate Corrected SPT N value based on type of correction and the overburden table.
 * Returns { value, formula } where value is rounded to 2 dp (or '-') and formula is
 * the human-readable expression used to compute it.
 */
function computeCorrectedSPT(sbcData, overburdenRows) {
  const fieldN = parseFloat(sbcData.fieldNValue);
  if (isNaN(fieldN) || sbcData.fieldNValue === '') return { value: '-', formula: '' };
  const correction = sbcData.typeOfCorrection || 'No Correction';
  const { cf } = lookupCorrectionFactor(overburdenRows, sbcData.depthFromGL);

  if (correction === 'No Correction') {
    return {
      value: String(fieldN),
      formula: 'NR = Field N',
    };
  }
  if (correction === 'Over burden Correction') {
    return {
      value: (fieldN * cf).toFixed(2),
      formula: `NR = ${fieldN} × ${cf.toFixed(3)} (CF)`,
    };
  }
  if (correction === 'Dilatancy Correction') {
    return {
      value: ((fieldN + 15) / 2).toFixed(2),
      formula: `NR = (${fieldN} + 15) / 2`,
    };
  }
  if (correction === 'Both Corrections') {
    const nOB = fieldN * cf;
    return {
      value: ((nOB + 15) / 2).toFixed(2),
      formula: `NR = (${fieldN} × ${cf.toFixed(3)} + 15) / 2`,
    };
  }
  return { value: '-', formula: '' };
}

import GeotechSoilSbcDetails from './GeotechSoilSbcDetails';
import GeotechRockSbcDetails from './GeotechRockSbcDetails';

/**
 * Searchable soil-type dropdown.
 * Uses the app's own Select primitives so it respects the current theme.
 * When "Others" (or a custom soil type string) is selected, renders an editable text input.
 */
function SoilTypeSelect({ value, onChange }) {
  const [search, setSearch] = React.useState('');
  const standardSoilTypes = React.useMemo(
    () => soilTypes.filter((t) => t !== 'Others'),
    []
  );

  const filtered = React.useMemo(
    () => soilTypes.filter((t) => t.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  // Check if current value is custom (i.e. 'Others' or a string not in standard list)
  const isCustom = React.useMemo(() => {
    if (!value) return false;
    if (value === 'Others') return true;
    return !standardSoilTypes.includes(value);
  }, [value, standardSoilTypes]);

  const selectValue = isCustom ? 'Others' : (value || '');

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === 'Others') {
            onChange('Others');
          } else {
            onChange(v);
          }
        }}
        onOpenChange={(open) => {
          if (!open) setSearch('');
        }}
      >
        <SelectTrigger className="h-8 text-xs w-full">
          <SelectValue placeholder="Select soil type" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {/* inline search input — not a SelectItem so it won't be selectable */}
          <div
            className="flex items-center border-b border-border px-2 pb-1 mb-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg
              className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none py-1"
              placeholder="Search soil types…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">No results</div>
          ) : (
            filtered.map((type) => (
              <SelectItem key={type} value={type} className="text-xs">
                {type}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {isCustom && (
        <Input
          value={value === 'Others' ? '' : value}
          onChange={(e) => onChange(e.target.value || 'Others')}
          placeholder="Specify custom soil type…"
          className="h-8 text-xs bg-white border-primary/40 focus:border-primary"
        />
      )}
    </div>
  );
}

// Toggle to control Sub-Soil Profile tab visibility (set to true to unhide)
const SHOW_SUBSOIL_TAB = false;

export default function GeotechTestForm({ value, onChange, materialCategory, enabledForms }) {
  const { toast } = useToast();
  const effectiveEnabledForms = enabledForms
    ? enabledForms.filter((f) => SHOW_SUBSOIL_TAB || f !== 'subsoil')
    : null;
  const defaultTab =
    effectiveEnabledForms?.length > 0
      ? effectiveEnabledForms[0] === 'sieve'
        ? 'borehole'
        : effectiveEnabledForms[0]
      : 'borehole';
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!SHOW_SUBSOIL_TAB && activeTab === 'subsoil') {
      setActiveTab('borehole');
    }
  }, [activeTab]);
  const [sieveError, setSieveError] = useState(null); // { boreholeIndex, depthIndex, message }
  const [moistureModalState, setMoistureModalState] = useState({
    isOpen: false,
    boreholeIndex: 0,
    depthIndex: 0,
  });
  const [sgModalState, setSgModalState] = useState({
    isOpen: false,
    boreholeIndex: 0,
    depthIndex: 0,
  });
  const [fsiModalState, setFsiModalState] = useState({
    isOpen: false,
    boreholeIndex: 0,
    depthIndex: 0,
  });
  const [sieveModalState, setSieveModalState] = useState({
    isOpen: false,
    boreholeIndex: 0,
    depthIndex: 0,
  });
  const [atterbergModalState, setAtterbergModalState] = useState({
    isOpen: false,
    boreholeIndex: 0,
    depthIndex: 0,
  });
  const [shrinkageModalState, setShrinkageModalState] = useState({
    isOpen: false,
    boreholeIndex: 0,
    depthIndex: 0,
  });
  const [lightCompactionModalState, setLightCompactionModalState] = useState({
    isOpen: false,
    boreholeIndex: 0,
    depthIndex: 0,
  });
  const [heavyCompactionModalState, setHeavyCompactionModalState] = useState({
    isOpen: false,
    boreholeIndex: 0,
    depthIndex: 0,
  });
  const [showMoistureInputsInline, setShowMoistureInputsInline] = useState(false);

  // Overburden correction table from Settings → System → Overburden
  const { settings } = useSettings();
  const overburdenRows = (() => {
    try {
      const raw = settings?.overburden_correction_data;
      if (!raw) return [];
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return [];
    }
  })();

  // Ensure all required properties exist with defaults if value is empty
  const initialBoreholeLogs = value?.boreholeLogs || [
    [
      {
        fromDepth: '',
        toDepth: '',
        natureOfSampling: '',
        soilType: '',
        waterTable: false,
        spt1: '',
        spt2: '',
        spt3: '',
        shearParameters: { cValue: '', phiValue: '' },
        coreLength: '',
        coreRecovery: '',
        rqd: '',
        sbc: '',
      },
    ],
  ];
  const initialMaxDepths = value?.maxDepths || [];

  const formData = {
    boreholeLogs: initialBoreholeLogs,
    maxDepths: initialMaxDepths,
    latitudes: value?.latitudes || [],
    longitudes: value?.longitudes || [],
    labTestResults: value?.labTestResults
      ? value.labTestResults.map((boreholeResults) =>
          boreholeResults.map((entry) => ({
            depth: entry.depth ?? '',
            bulkDensity: entry.bulkDensity ?? '',
            moistureContent: entry.moistureContent ?? '',
            containerNo: entry.containerNo ?? '',
            w1: entry.w1 ?? '',
            w2: entry.w2 ?? '',
            w3: entry.w3 ?? '',
            w4: entry.w4 ?? '',
            w5: entry.w5 ?? '',
            precisionMode: entry.precisionMode || 'two_sig_figs',
            grainSizeDistribution: {
              gravel: entry.grainSizeDistribution?.gravel ?? '',
              sand: entry.grainSizeDistribution?.sand ?? '',
              siltAndClay: entry.grainSizeDistribution?.siltAndClay ?? '',
            },
            sieveData: entry.sieveData || null,
            atterbergLimits: {
              liquidLimit: entry.atterbergLimits?.liquidLimit ?? '',
              plasticLimit: entry.atterbergLimits?.plasticLimit ?? '',
              plasticityIndex: entry.atterbergLimits?.plasticityIndex ?? '',
            },
            atterbergData: entry.atterbergData || null,
            specificGravity: entry.specificGravity ?? '',
            specificGravityTrials: entry.specificGravityTrials || null,
            freeSwellIndex: entry.freeSwellIndex ?? '',
            freeSwellIndexTrials: entry.freeSwellIndexTrials || null,
            shrinkageLimit: entry.shrinkageLimit ?? '',
            shrinkageRatio: entry.shrinkageRatio ?? '',
            shrinkageData: entry.shrinkageData || null,
            lightCompaction: entry.lightCompaction || null,
            heavyCompaction: entry.heavyCompaction || null,
          }))
        )
      : [
          [
            {
              depth: '',
              bulkDensity: '',
              moistureContent: '',
              containerNo: '',
              w1: '',
              w2: '',
              w3: '',
              w4: '',
              w5: '',
              precisionMode: 'two_sig_figs',
              grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
              sieveData: null,
              atterbergLimits: {
                liquidLimit: '',
                plasticLimit: '',
                plasticityIndex: '',
              },
              atterbergData: null,
              specificGravity: '',
              specificGravityTrials: null,
              freeSwellIndex: '',
              freeSwellIndexTrials: null,
              shrinkageLimit: '',
              shrinkageRatio: '',
              shrinkageData: null,
              lightCompaction: null,
              heavyCompaction: null,
            },
          ],
        ],
    chemicalAnalysis: value?.chemicalAnalysis || [
      {
        phValue: '',
        sulphates: '',
        chlorides: '',
        additionalKeys: [{ key: '', value: '' }],
      },
    ],
    grainSizeAnalysis: value?.grainSizeAnalysis || [
      [
        {
          depth: '',
          totalWeight: '',
          sieve0: '',
          sieve1: '',
          sieve3: '',
          sieve2: '',
          sieve4: '',
          sieve5: '',
          sieve6: '',
          sieve7: '',
          sieve8: '',
          sieve9: '',
          sieve10: '',
        },
      ],
    ],
    sbcDetails: (() => {
      if (!value?.sbcDetails) {
        return initialBoreholeLogs.map(() => [{}]);
      }
      return value.sbcDetails.map((bhSbc) => {
        if (Array.isArray(bhSbc)) {
          return bhSbc.length > 0 ? bhSbc : [{}];
        }
        return [bhSbc || {}];
      });
    })(),
    subSoilProfile: value?.subSoilProfile || [[{ depth: '', description: '' }]],
    directShearResults: value?.directShearResults || [
      [
        {
          shearBoxSize: '',
          depthOfSample: '',
          cValue: '',
          phiValue: '',
          stressReadings: [{ normalStress: '', shearStress: '' }],
        },
      ],
    ],
    pointLoadStrength: value?.pointLoadStrength || [
      [
        {
          depth: '',
          readings: [{ loadAtFailure: '', d50: '', d: '', ucs: '' }],
        },
      ],
    ],
    pointLoadStrengthLump: value?.pointLoadStrengthLump || [
      [
        {
          depth: '',
          readings: [{ loadAtFailure: '', d50: '', d: '', w: '', ucs: '' }],
        },
      ],
    ],
    foundationRockFormations: value?.foundationRockFormations || [
      {
        rows: [
          {
            rock: '',
            strength: '',
            rqd: '',
            spacingDiscontinuity: '',
            conditionOfDiscontinuity: '',
            gwtCondition: '',
            discontinuityOrientation: '',
            rockGrade: '',
            inferredNetSbp: '',
          },
        ],
      },
    ],
  };

  const setFormData = (updater) => {
    if (typeof updater === 'function') {
      onChange(updater(formData));
    } else {
      onChange(updater);
    }
  };

  // --- Borehole Handlers ---
  const handleBoreholeDepthChange = (boreholeIndex, depthIndex, field, val) => {
    const newLogs = [...formData.boreholeLogs];
    const depthData = { ...newLogs[boreholeIndex][depthIndex] };
    if (field === 'natureOfSampling') {
      depthData.natureOfSampling = val;
      if (val === 'Core') {
        depthData.spt1 = '-';
        depthData.spt2 = '-';
        depthData.spt3 = '-';
      } else if (val === 'SPT') {
        if (depthData.spt1 === '-') depthData.spt1 = '';
        if (depthData.spt2 === '-') depthData.spt2 = '';
        if (depthData.spt3 === '-') depthData.spt3 = '';
      }
    } else if (field.includes('.')) {
      const [parent, child] = field.split('.');
      depthData[parent] = { ...depthData[parent], [child]: val };
    } else {
      depthData[field] = val;
    }
    newLogs[boreholeIndex][depthIndex] = depthData;
    setFormData({ ...formData, boreholeLogs: newLogs });
  };

  const addBoreholeDepth = (boreholeIndex) => {
    const newLogs = [...formData.boreholeLogs];
    newLogs[boreholeIndex].push({
      fromDepth: '',
      toDepth: '',
      natureOfSampling: '',
      soilType: '',
      waterTable: false,
      spt1: '',
      spt2: '',
      spt3: '',
      shearParameters: { cValue: '', phiValue: '' },
      coreLength: '',
      coreRecovery: '',
      rqd: '',
      sbc: '',
    });
    setFormData({ ...formData, boreholeLogs: newLogs });
  };

  const removeBoreholeDepth = (boreholeIndex, depthIndex) => {
    const newLogs = [...formData.boreholeLogs];
    newLogs[boreholeIndex].splice(depthIndex, 1);
    setFormData({ ...formData, boreholeLogs: newLogs });
  };

  const handleMaxDepthChange = (boreholeIndex, val) => {
    const parsed = val === '' ? '' : parseFloat(val);
    const newMaxDepths = [...(formData.maxDepths || [])];
    newMaxDepths[boreholeIndex] = parsed;
    setFormData({ ...formData, maxDepths: newMaxDepths });
  };

  const handleLatitudeChange = (boreholeIndex, val) => {
    const newLatitudes = [...(formData.latitudes || [])];
    newLatitudes[boreholeIndex] = val;
    setFormData({ ...formData, latitudes: newLatitudes });
  };

  const handleLongitudeChange = (boreholeIndex, val) => {
    const newLongitudes = [...(formData.longitudes || [])];
    newLongitudes[boreholeIndex] = val;
    setFormData({ ...formData, longitudes: newLongitudes });
  };

  const addBorehole = () => {
    setFormData({
      ...formData,
      boreholeLogs: [
        ...formData.boreholeLogs,
        [
          {
            fromDepth: '',
            toDepth: '',
            natureOfSampling: '',
            soilType: '',
            waterTable: false,
            spt1: '',
            spt2: '',
            spt3: '',
            shearParameters: { cValue: '', phiValue: '' },
            coreLength: '',
            coreRecovery: '',
            rqd: '',
            sbc: '',
          },
        ],
      ],
      maxDepths: [...(formData.maxDepths || []), ''],
      latitudes: [...(formData.latitudes || []), ''],
      longitudes: [...(formData.longitudes || []), ''],
      sbcDetails: [...formData.sbcDetails, [{}]],
      labTestResults: [
        ...formData.labTestResults,
        [
          {
            depth: '',
            bulkDensity: '',
            moistureContent: '',
            containerNo: '',
            w1: '',
            w2: '',
            w3: '',
            w4: '',
            w5: '',
            precisionMode: 'two_sig_figs',
            grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
            atterbergLimits: {
              liquidLimit: '',
              plasticLimit: '',
              plasticityIndex: '',
            },
            atterbergData: null,
            specificGravity: '',
            specificGravityTrials: null,
            freeSwellIndex: '',
            freeSwellIndexTrials: null,
            shrinkageLimit: '',
            shrinkageRatio: '',
            shrinkageData: null,
            lightCompaction: null,
            heavyCompaction: null,
          },
        ],
      ],
      grainSizeAnalysis: [
        ...formData.grainSizeAnalysis,
        [
          {
            depth: '',
            totalWeight: '',
            sieve0: '',
            sieve1: '',
            sieve3: '',
            sieve2: '',
            sieve4: '',
            sieve5: '',
            sieve6: '',
            sieve7: '',
            sieve8: '',
            sieve9: '',
            sieve10: '',
          },
        ],
      ],
    });
  };

  const removeBorehole = (index) => {
    const newLogs = [...formData.boreholeLogs];
    newLogs.splice(index, 1);
    const newMaxDepths = [...(formData.maxDepths || [])];
    newMaxDepths.splice(index, 1);
    const newLatitudes = [...(formData.latitudes || [])];
    newLatitudes.splice(index, 1);
    const newLongitudes = [...(formData.longitudes || [])];
    newLongitudes.splice(index, 1);
    const newSbc = [...formData.sbcDetails];
    newSbc.splice(index, 1);
    const newLab = [...formData.labTestResults];
    newLab.splice(index, 1);
    const newSieve = [...formData.grainSizeAnalysis];
    newSieve.splice(index, 1);
    setFormData({
      ...formData,
      boreholeLogs: newLogs,
      maxDepths: newMaxDepths,
      latitudes: newLatitudes,
      longitudes: newLongitudes,
      sbcDetails: newSbc,
      labTestResults: newLab,
      grainSizeAnalysis: newSieve,
    });
  };

  const selectSoilType = (type, boreholeIndex, depthIndex) => {
    handleBoreholeDepthChange(boreholeIndex, depthIndex, 'soilType', type);
  };

  // --- SBC Handlers ---
  const handleSbcChange = (boreholeIndex, entryIndex, field, val) => {
    const newSbcDetails = [...formData.sbcDetails];
    const bhEntries = [...(newSbcDetails[boreholeIndex] || [{}])];
    if (field === null && typeof val === 'object') {
      bhEntries[entryIndex] = val;
    } else {
      bhEntries[entryIndex] = {
        ...bhEntries[entryIndex],
        [field]: val,
      };
    }
    newSbcDetails[boreholeIndex] = bhEntries;
    setFormData({ ...formData, sbcDetails: newSbcDetails });
  };

  const addSbcEntry = (boreholeIndex) => {
    const newSbcDetails = [...formData.sbcDetails];
    const bhEntries = [...(newSbcDetails[boreholeIndex] || [{}])];
    bhEntries.push({});
    newSbcDetails[boreholeIndex] = bhEntries;
    setFormData({ ...formData, sbcDetails: newSbcDetails });
  };

  const removeSbcEntry = (boreholeIndex, entryIndex) => {
    const newSbcDetails = [...formData.sbcDetails];
    const bhEntries = [...(newSbcDetails[boreholeIndex] || [{}])];
    if (bhEntries.length > 1) {
      bhEntries.splice(entryIndex, 1);
      newSbcDetails[boreholeIndex] = bhEntries;
      setFormData({ ...formData, sbcDetails: newSbcDetails });
    }
  };

  // --- Lab Test Handlers ---
  const handleLabTestDepthChange = (boreholeIndex, depthIndex, field, val) => {
    const newResults = [...formData.labTestResults];
    const depthData = { ...newResults[boreholeIndex][depthIndex] };
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      depthData[parent] = { ...depthData[parent], [child]: val };
    } else {
      depthData[field] = val;
    }

    // Auto-compute moisture content if w1, w2, w3 or precisionMode changed
    if (['w1', 'w2', 'w3', 'precisionMode'].includes(field)) {
      const calc = calculateMoistureValues({
        w1: field === 'w1' ? val : depthData.w1,
        w2: field === 'w2' ? val : depthData.w2,
        w3: field === 'w3' ? val : depthData.w3,
        precisionMode: field === 'precisionMode' ? val : (depthData.precisionMode || 'two_sig_figs'),
      });
      depthData.w4 = calc.w4;
      depthData.w5 = calc.w5;
      depthData.moistureContent = calc.moistureContent;
    }

    newResults[boreholeIndex][depthIndex] = depthData;

    let updatedAnalysis = formData.grainSizeAnalysis;
    if (field === 'depth' && updatedAnalysis?.[boreholeIndex]?.[depthIndex]) {
      const nextAnalysis = [...updatedAnalysis];
      nextAnalysis[boreholeIndex][depthIndex] = {
        ...nextAnalysis[boreholeIndex][depthIndex],
        depth: val,
      };
      updatedAnalysis = nextAnalysis;
    }

    setFormData({
      ...formData,
      labTestResults: newResults,
      grainSizeAnalysis: updatedAnalysis,
    });
  };

  const handleApplySieveModal = (boreholeIndex, depthIndex, { sieveData, grainSizeDistribution }) => {
    const newResults = [...formData.labTestResults];
    const finalGravel = grainSizeDistribution.gravel && grainSizeDistribution.gravel !== '' ? grainSizeDistribution.gravel : '-';
    const finalSand = grainSizeDistribution.sand && grainSizeDistribution.sand !== '' ? grainSizeDistribution.sand : '-';
    const finalSiltAndClay = grainSizeDistribution.siltAndClay && grainSizeDistribution.siltAndClay !== '' ? grainSizeDistribution.siltAndClay : '-';

    const currentDepth = newResults[boreholeIndex]?.[depthIndex]?.depth || '';
    newResults[boreholeIndex][depthIndex] = {
      ...newResults[boreholeIndex][depthIndex],
      grainSizeDistribution: {
        gravel: finalGravel,
        sand: finalSand,
        siltAndClay: finalSiltAndClay,
      },
      sieveData: sieveData || null,
    };

    // Synchronize with formData.grainSizeAnalysis for reports, charts & exports
    const newAnalysis = [...(formData.grainSizeAnalysis || [])];
    if (!newAnalysis[boreholeIndex]) newAnalysis[boreholeIndex] = [];
    newAnalysis[boreholeIndex][depthIndex] = {
      depth: currentDepth,
      totalWeight: sieveData?.totalWeight || '',
      sieve0: sieveData?.sieve0 || '',
      sieve1: sieveData?.sieve1 || '',
      sieve2: sieveData?.sieve2 || '',
      sieve3: sieveData?.sieve3 || '',
      sieve4: sieveData?.sieve4 || '',
      sieve5: sieveData?.sieve5 || '',
      sieve6: sieveData?.sieve6 || '',
      sieve7: sieveData?.sieve7 || '',
      sieve8: sieveData?.sieve8 || '',
      sieve9: sieveData?.sieve9 || '',
      sieve10: sieveData?.sieve10 || '',
    };

    setFormData({
      ...formData,
      labTestResults: newResults,
      grainSizeAnalysis: newAnalysis,
    });

    toast({
      title: 'Grain Size Computed',
      description: `Gravel: ${finalGravel}%, Sand: ${finalSand}%, Silt & Clay: ${finalSiltAndClay}% applied from Sieve Analysis.`,
    });
  };

  const handleApplyMoistureModal = (boreholeIndex, depthIndex, appliedData) => {
    const newResults = [...formData.labTestResults];
    const finalMoisture = appliedData.moistureContent && appliedData.moistureContent !== '' ? appliedData.moistureContent : '-';
    newResults[boreholeIndex][depthIndex] = {
      ...newResults[boreholeIndex][depthIndex],
      containerNo: appliedData.containerNo,
      w1: appliedData.w1,
      w2: appliedData.w2,
      w3: appliedData.w3,
      w4: appliedData.w4 || '-',
      w5: appliedData.w5 || '-',
      moistureContent: finalMoisture,
      precisionMode: appliedData.precisionMode,
    };
    setFormData({ ...formData, labTestResults: newResults });
  };

  const handleApplySpecificGravityModal = (boreholeIndex, depthIndex, { trials, averageSg }) => {
    const newResults = [...formData.labTestResults];
    const finalVal = averageSg && averageSg !== '' ? averageSg : '-';
    newResults[boreholeIndex][depthIndex] = {
      ...newResults[boreholeIndex][depthIndex],
      specificGravity: finalVal,
      specificGravityTrials: trials,
    };
    setFormData({ ...formData, labTestResults: newResults });
  };

  const handleApplyFreeSwellIndexModal = (boreholeIndex, depthIndex, { trials, averageFsi }) => {
    const newResults = [...formData.labTestResults];
    const finalVal = averageFsi && averageFsi !== '' ? averageFsi : '-';
    newResults[boreholeIndex][depthIndex] = {
      ...newResults[boreholeIndex][depthIndex],
      freeSwellIndex: finalVal,
      freeSwellIndexTrials: trials,
    };
    setFormData({ ...formData, labTestResults: newResults });
  };

  const handleApplyAtterbergModal = (boreholeIndex, depthIndex, appliedData) => {
    const newResults = [...formData.labTestResults];
    const { atterbergLimits } = appliedData;
    const finalLL = atterbergLimits?.liquidLimit && atterbergLimits.liquidLimit !== '' ? atterbergLimits.liquidLimit : '-';
    const finalPL = atterbergLimits?.plasticLimit && atterbergLimits.plasticLimit !== '' ? atterbergLimits.plasticLimit : '-';
    const finalPI = atterbergLimits?.plasticityIndex && atterbergLimits.plasticityIndex !== '' ? atterbergLimits.plasticityIndex : '-';

    newResults[boreholeIndex][depthIndex] = {
      ...newResults[boreholeIndex][depthIndex],
      atterbergLimits: {
        liquidLimit: finalLL,
        plasticLimit: finalPL,
        plasticityIndex: finalPI,
      },
      atterbergData: appliedData,
    };
    setFormData({ ...formData, labTestResults: newResults });

    toast({
      title: 'Atterberg Limits Computed',
      description: `LL: ${finalLL}%, PL: ${finalPL}, PI: ${finalPI} applied.`,
    });
  };

  const handleApplyShrinkageModal = (boreholeIndex, depthIndex, appliedData) => {
    const newResults = [...formData.labTestResults];
    newResults[boreholeIndex][depthIndex] = {
      ...newResults[boreholeIndex][depthIndex],
      shrinkageLimit: appliedData.shrinkageLimit || '',
      shrinkageRatio: appliedData.shrinkageRatio || '',
      shrinkageData: appliedData.shrinkageData || null,
    };
    setFormData({ ...formData, labTestResults: newResults });
    toast({
      title: 'Shrinkage Limit Applied',
      description: `SL: ${appliedData.shrinkageLimit || '-'}, R: ${appliedData.shrinkageRatio || '-'}`,
    });
  };

  const handleApplyLightCompactionModal = (boreholeIndex, depthIndex, appliedData) => {
    const newResults = [...formData.labTestResults];
    const { lightCompaction } = appliedData;
    newResults[boreholeIndex][depthIndex] = {
      ...newResults[boreholeIndex][depthIndex],
      lightCompaction: lightCompaction || null,
    };
    setFormData({ ...formData, labTestResults: newResults });
    toast({
      title: 'Light Compaction Applied',
      description: `MDD: ${lightCompaction?.mddFormatted || '-'}, OMC: ${lightCompaction?.omcFormatted || '-'}`,
    });
  };

  const handleApplyHeavyCompactionModal = (boreholeIndex, depthIndex, appliedData) => {
    const newResults = [...formData.labTestResults];
    const { heavyCompaction } = appliedData;
    newResults[boreholeIndex][depthIndex] = {
      ...newResults[boreholeIndex][depthIndex],
      heavyCompaction: heavyCompaction || null,
    };
    setFormData({ ...formData, labTestResults: newResults });
    toast({
      title: 'Heavy Compaction Applied',
      description: `MDD: ${heavyCompaction?.mddFormatted || '-'}, OMC: ${heavyCompaction?.omcFormatted || '-'}`,
    });
  };

  const addLabTestDepth = (boreholeIndex) => {
    const newResults = [...formData.labTestResults];
    newResults[boreholeIndex].push({
      depth: '',
      bulkDensity: '',
      moistureContent: '',
      containerNo: '',
      w1: '',
      w2: '',
      w3: '',
      w4: '',
      w5: '',
      precisionMode: 'two_sig_figs',
      grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
      sieveData: null,
      atterbergLimits: {
        liquidLimit: '',
        plasticLimit: '',
        plasticityIndex: '',
      },
      atterbergData: null,
      specificGravity: '',
      specificGravityTrials: null,
      freeSwellIndex: '',
      freeSwellIndexTrials: null,
      shrinkageLimit: '',
      shrinkageRatio: '',
      shrinkageData: null,
      lightCompaction: null,
      heavyCompaction: null,
    });

    const newAnalysis = [...(formData.grainSizeAnalysis || [])];
    if (!newAnalysis[boreholeIndex]) newAnalysis[boreholeIndex] = [];
    newAnalysis[boreholeIndex].push({
      depth: '',
      totalWeight: '',
      sieve0: '',
      sieve1: '',
      sieve2: '',
      sieve3: '',
      sieve4: '',
      sieve5: '',
      sieve6: '',
      sieve7: '',
      sieve8: '',
      sieve9: '',
      sieve10: '',
    });

    setFormData({
      ...formData,
      labTestResults: newResults,
      grainSizeAnalysis: newAnalysis,
    });
  };

  const removeLabTestDepth = (boreholeIndex, depthIndex) => {
    const newResults = [...formData.labTestResults];
    newResults[boreholeIndex].splice(depthIndex, 1);

    const newAnalysis = [...(formData.grainSizeAnalysis || [])];
    if (newAnalysis[boreholeIndex] && newAnalysis[boreholeIndex].length > depthIndex) {
      newAnalysis[boreholeIndex].splice(depthIndex, 1);
    }

    setFormData({
      ...formData,
      labTestResults: newResults,
      grainSizeAnalysis: newAnalysis,
    });
  };

  // --- Grain Size Analysis Handlers ---
  const handleGrainSizeChange = (boreholeIndex, depthIndex, field, val) => {
    const newAnalysis = [...formData.grainSizeAnalysis];
    newAnalysis[boreholeIndex][depthIndex][field] = val;
    setFormData({ ...formData, grainSizeAnalysis: newAnalysis });

    // Validate: sum of retained weights must be >= 1% of totalWeight
    const row = newAnalysis[boreholeIndex][depthIndex];
    const totalWeight = parseFloat(field === 'totalWeight' ? val : row.totalWeight);
    if (totalWeight > 0) {
      const sieveKeys = [
        'sieve0',
        'sieve1',
        'sieve2',
        'sieve3',
        'sieve4',
        'sieve5',
        'sieve6',
        'sieve7',
        'sieve8',
        'sieve9',
        'sieve10',
      ];
      const sumRetained = sieveKeys.reduce((sum, k) => {
        const v = parseFloat(field === k ? val : row[k]);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
      if (sumRetained > 0 && sumRetained < totalWeight * 0.01) {
        setSieveError({
          boreholeIndex,
          depthIndex,
          message: `Sum of retained weights (${sumRetained.toFixed(2)} g) is less than 1% of the total sample weight (${totalWeight.toFixed(2)} g). Minimum required: ${(totalWeight * 0.01).toFixed(2)} g.`,
        });
      }
    }
  };

  const addGrainSizeDepth = (boreholeIndex) => {
    const newAnalysis = [...formData.grainSizeAnalysis];
    newAnalysis[boreholeIndex].push({
      depth: '',
      totalWeight: '',
      sieve0: '',
      sieve1: '',
      sieve3: '',
      sieve2: '',
      sieve4: '',
      sieve5: '',
      sieve6: '',
      sieve7: '',
      sieve8: '',
      sieve9: '',
      sieve10: '',
    });
    setFormData({ ...formData, grainSizeAnalysis: newAnalysis });
  };

  const removeGrainSizeDepth = (boreholeIndex, depthIndex) => {
    const newAnalysis = [...formData.grainSizeAnalysis];
    newAnalysis[boreholeIndex].splice(depthIndex, 1);
    setFormData({ ...formData, grainSizeAnalysis: newAnalysis });
  };

  // --- Sub-Soil Profile Handlers ---
  const handleSubSoilChange = (boreholeIndex, rowIndex, field, val) => {
    const newProfile = [...formData.subSoilProfile];
    if (!newProfile[boreholeIndex]) newProfile[boreholeIndex] = [];
    newProfile[boreholeIndex][rowIndex][field] = val;
    setFormData({ ...formData, subSoilProfile: newProfile });
  };

  const addSubSoilRow = (boreholeIndex) => {
    const newProfile = [...formData.subSoilProfile];
    if (!newProfile[boreholeIndex]) newProfile[boreholeIndex] = [];
    newProfile[boreholeIndex].push({ depth: '', description: '' });
    setFormData({ ...formData, subSoilProfile: newProfile });
  };

  const removeSubSoilRow = (boreholeIndex, rowIndex) => {
    const newProfile = [...formData.subSoilProfile];
    newProfile[boreholeIndex].splice(rowIndex, 1);
    setFormData({ ...formData, subSoilProfile: newProfile });
  };

  // --- Direct Shear Handlers ---
  const handleDirectShearChange = (boreholeIndex, rowIndex, field, val) => {
    const newResults = [...formData.directShearResults];
    if (!newResults[boreholeIndex]) newResults[boreholeIndex] = [];
    newResults[boreholeIndex][rowIndex][field] = val;
    setFormData({ ...formData, directShearResults: newResults });
  };

  const handleDirectShearStressChange = (boreholeIndex, rowIndex, stressIndex, field, val) => {
    const newResults = [...formData.directShearResults];
    newResults[boreholeIndex][rowIndex].stressReadings[stressIndex][field] = val;
    setFormData({ ...formData, directShearResults: newResults });
  };

  const addDirectShearRow = (boreholeIndex) => {
    const newResults = [...formData.directShearResults];
    if (!newResults[boreholeIndex]) newResults[boreholeIndex] = [];
    newResults[boreholeIndex].push({
      shearBoxSize: '',
      depthOfSample: '',
      cValue: '',
      phiValue: '',

      stressReadings: [{ normalStress: '', shearStress: '' }],
    });
    setFormData({ ...formData, directShearResults: newResults });
  };

  const removeDirectShearRow = (boreholeIndex, rowIndex) => {
    const newResults = [...formData.directShearResults];
    newResults[boreholeIndex].splice(rowIndex, 1);
    setFormData({ ...formData, directShearResults: newResults });
  };

  const addStressReading = (boreholeIndex, rowIndex) => {
    const newResults = [...formData.directShearResults];
    newResults[boreholeIndex][rowIndex].stressReadings.push({
      normalStress: '',
      shearStress: '',
    });
    setFormData({ ...formData, directShearResults: newResults });
  };

  const removeStressReading = (boreholeIndex, rowIndex, stressIndex) => {
    const newResults = [...formData.directShearResults];
    newResults[boreholeIndex][rowIndex].stressReadings.splice(stressIndex, 1);
    setFormData({ ...formData, directShearResults: newResults });
  };
  const hasAnyBoreholeMismatch = formData.boreholeLogs.some((logs, bIndex) => {
    if (!logs || logs.length === 0) return false;
    const finalRow = logs[logs.length - 1];
    const finalToRaw = finalRow?.toDepth;
    const maxDepthRaw = formData.maxDepths?.[bIndex];

    const hasFinalTo =
      finalToRaw !== '' &&
      finalToRaw !== null &&
      finalToRaw !== undefined &&
      !isNaN(parseFloat(finalToRaw));
    const hasMaxDepth =
      maxDepthRaw !== '' &&
      maxDepthRaw !== null &&
      maxDepthRaw !== undefined &&
      !isNaN(parseFloat(maxDepthRaw));

    if (hasFinalTo && hasMaxDepth) {
      return Math.abs(parseFloat(finalToRaw) - parseFloat(maxDepthRaw)) > 0.0001;
    }
    return hasFinalTo && !hasMaxDepth;
  });

  const hasAnyCoreMissing = formData.boreholeLogs.some((logs) =>
    logs?.some(
      (row) =>
        row.natureOfSampling === 'Core' &&
        (row.coreRecovery === '' ||
          row.coreRecovery === null ||
          row.coreRecovery === undefined ||
          (typeof row.coreRecovery === 'string' && row.coreRecovery.trim() === '') ||
          isNaN(parseFloat(row.coreRecovery)) ||
          row.rqd === '' ||
          row.rqd === null ||
          row.rqd === undefined ||
          (typeof row.rqd === 'string' && row.rqd.trim() === '') ||
          isNaN(parseFloat(row.rqd)))
    )
  );

  return (
    <div className="w-full">
      {/* Sieve weight validation error dialog */}
      <AlertDialog
        open={!!sieveError}
        onOpenChange={(open) => {
          if (!open) setSieveError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Sieve Analysis Warning</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-700">
              {sieveError?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSieveError(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {moistureModalState.isOpen && (
        <MoistureContentModal
          isOpen={moistureModalState.isOpen}
          onClose={() => setMoistureModalState((prev) => ({ ...prev, isOpen: false }))}
          boreholeNo={`BH-${moistureModalState.boreholeIndex + 1}`}
          depth={
            formData.labTestResults?.[moistureModalState.boreholeIndex]?.[
              moistureModalState.depthIndex
            ]?.depth || ''
          }
          initialData={
            formData.labTestResults?.[moistureModalState.boreholeIndex]?.[
              moistureModalState.depthIndex
            ] || {}
          }
          onApply={(appliedData) =>
            handleApplyMoistureModal(
              moistureModalState.boreholeIndex,
              moistureModalState.depthIndex,
              appliedData
            )
          }
        />
      )}

      {sgModalState.isOpen && (
        <SpecificGravityModal
          isOpen={sgModalState.isOpen}
          onClose={() => setSgModalState((prev) => ({ ...prev, isOpen: false }))}
          boreholeNo={`BH-${sgModalState.boreholeIndex + 1}`}
          depth={
            formData.labTestResults?.[sgModalState.boreholeIndex]?.[
              sgModalState.depthIndex
            ]?.depth || ''
          }
          initialData={
            formData.labTestResults?.[sgModalState.boreholeIndex]?.[
              sgModalState.depthIndex
            ]?.specificGravityTrials || {}
          }
          onApply={({ trials, averageSg }) =>
            handleApplySpecificGravityModal(
              sgModalState.boreholeIndex,
              sgModalState.depthIndex,
              { trials, averageSg }
            )
          }
        />
      )}

      {fsiModalState.isOpen && (
        <FreeSwellIndexModal
          isOpen={fsiModalState.isOpen}
          onClose={() => setFsiModalState((prev) => ({ ...prev, isOpen: false }))}
          boreholeNo={`BH-${fsiModalState.boreholeIndex + 1}`}
          depth={
            formData.labTestResults?.[fsiModalState.boreholeIndex]?.[
              fsiModalState.depthIndex
            ]?.depth || ''
          }
          initialData={
            formData.labTestResults?.[fsiModalState.boreholeIndex]?.[
              fsiModalState.depthIndex
            ]?.freeSwellIndexTrials || {}
          }
          onApply={({ trials, averageFsi }) =>
            handleApplyFreeSwellIndexModal(
              fsiModalState.boreholeIndex,
              fsiModalState.depthIndex,
              { trials, averageFsi }
            )
          }
        />
      )}

      {sieveModalState.isOpen && (
        <SieveAnalysisModal
          isOpen={sieveModalState.isOpen}
          onClose={() => setSieveModalState((prev) => ({ ...prev, isOpen: false }))}
          boreholeNo={`BH-${sieveModalState.boreholeIndex + 1}`}
          depth={
            formData.labTestResults?.[sieveModalState.boreholeIndex]?.[
              sieveModalState.depthIndex
            ]?.depth || ''
          }
          initialData={
            formData.labTestResults?.[sieveModalState.boreholeIndex]?.[
              sieveModalState.depthIndex
            ]?.sieveData ||
            formData.grainSizeAnalysis?.[sieveModalState.boreholeIndex]?.[
              sieveModalState.depthIndex
            ] ||
            formData.grainSizeAnalysis?.[sieveModalState.boreholeIndex]?.find(
              (r) =>
                r.depth &&
                String(r.depth) ===
                  String(
                    formData.labTestResults?.[sieveModalState.boreholeIndex]?.[
                      sieveModalState.depthIndex
                    ]?.depth
                  )
            ) ||
            {}
          }
          onApply={(appliedData) =>
            handleApplySieveModal(
              sieveModalState.boreholeIndex,
              sieveModalState.depthIndex,
              appliedData
            )
          }
        />
      )}

      {atterbergModalState.isOpen && (
        <AtterbergLimitsModal
          isOpen={atterbergModalState.isOpen}
          onClose={() => setAtterbergModalState((prev) => ({ ...prev, isOpen: false }))}
          boreholeNo={`BH-${atterbergModalState.boreholeIndex + 1}`}
          depth={
            formData.labTestResults?.[atterbergModalState.boreholeIndex]?.[
              atterbergModalState.depthIndex
            ]?.depth || ''
          }
          initialData={
            formData.labTestResults?.[atterbergModalState.boreholeIndex]?.[
              atterbergModalState.depthIndex
            ]?.atterbergData || {}
          }
          onApply={(appliedData) =>
            handleApplyAtterbergModal(
              atterbergModalState.boreholeIndex,
              atterbergModalState.depthIndex,
              appliedData
            )
          }
        />
      )}

      {shrinkageModalState.isOpen && (
        <ShrinkageLimitModal
          isOpen={shrinkageModalState.isOpen}
          onClose={() => setShrinkageModalState((prev) => ({ ...prev, isOpen: false }))}
          boreholeNo={`BH-${shrinkageModalState.boreholeIndex + 1}`}
          depth={
            formData.labTestResults?.[shrinkageModalState.boreholeIndex]?.[
              shrinkageModalState.depthIndex
            ]?.depth || ''
          }
          initialData={
            formData.labTestResults?.[shrinkageModalState.boreholeIndex]?.[
              shrinkageModalState.depthIndex
            ]?.shrinkageData || {}
          }
          onApply={(appliedData) =>
            handleApplyShrinkageModal(
              shrinkageModalState.boreholeIndex,
              shrinkageModalState.depthIndex,
              appliedData
            )
          }
        />
      )}

      {lightCompactionModalState.isOpen && (
        <LightCompactionModal
          isOpen={lightCompactionModalState.isOpen}
          onClose={() => setLightCompactionModalState((prev) => ({ ...prev, isOpen: false }))}
          boreholeNo={`BH-${lightCompactionModalState.boreholeIndex + 1}`}
          depth={
            formData.labTestResults?.[lightCompactionModalState.boreholeIndex]?.[
              lightCompactionModalState.depthIndex
            ]?.depth || ''
          }
          initialData={
            formData.labTestResults?.[lightCompactionModalState.boreholeIndex]?.[
              lightCompactionModalState.depthIndex
            ]?.lightCompaction || {}
          }
          onApply={(appliedData) =>
            handleApplyLightCompactionModal(
              lightCompactionModalState.boreholeIndex,
              lightCompactionModalState.depthIndex,
              appliedData
            )
          }
        />
      )}

      {heavyCompactionModalState.isOpen && (
        <HeavyCompactionModal
          isOpen={heavyCompactionModalState.isOpen}
          onClose={() => setHeavyCompactionModalState((prev) => ({ ...prev, isOpen: false }))}
          boreholeNo={`BH-${heavyCompactionModalState.boreholeIndex + 1}`}
          depth={
            formData.labTestResults?.[heavyCompactionModalState.boreholeIndex]?.[
              heavyCompactionModalState.depthIndex
            ]?.depth || ''
          }
          initialData={
            formData.labTestResults?.[heavyCompactionModalState.boreholeIndex]?.[
              heavyCompactionModalState.depthIndex
            ]?.heavyCompaction || {}
          }
          onApply={(appliedData) =>
            handleApplyHeavyCompactionModal(
              heavyCompactionModalState.boreholeIndex,
              heavyCompactionModalState.depthIndex,
              appliedData
            )
          }
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white rounded-lg p-1 shadow-sm mb-4 flex flex-wrap h-auto gap-1">
          {(!enabledForms || enabledForms.includes('borehole')) && (
            <TabsTrigger
              value="borehole"
              className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
              title="Manage borehole logs, sampling, and SPT data"
            >
              <FlaskConical className="w-4 h-4" /> Borehole
              {(hasAnyBoreholeMismatch || hasAnyCoreMissing) && (
                <span
                  className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-0.5"
                  title="Warnings in borehole logs: Depth mismatch or missing mandatory Core sampling fields (CR% / RQD%)"
                />
              )}
            </TabsTrigger>
          )}
          {(!enabledForms || enabledForms.includes('lab')) && (
            <TabsTrigger
              value="lab"
              className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
              title="Manage laboratory test results for soil samples"
            >
              <TestTube className="w-4 h-4" /> Lab Tests
            </TabsTrigger>
          )}

          {SHOW_SUBSOIL_TAB && (!enabledForms || enabledForms.includes('subsoil')) && (
            <TabsTrigger
              value="subsoil"
              className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
              title="Manage sub-soil profile descriptions"
            >
              <ArrowDownFromLine className="w-4 h-4" /> Sub-Soil Profile
            </TabsTrigger>
          )}
          {(!enabledForms || enabledForms.includes('directshear')) && (
            <TabsTrigger
              value="directshear"
              className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
              title="Manage direct shear test results"
            >
              <TestTube className="w-4 h-4" /> Direct Shear
            </TabsTrigger>
          )}
        </TabsList>

        {/* BOREHOLE TAB */}
        <TabsContent value="borehole" className="mt-0 space-y-4">
          <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-100">
            <h3 className="text-md font-bold text-gray-800 mb-1 pb-1 flex items-center gap-2">
              <TestTube className="w-4 h-4 text-primary" />
              Borehole Logs
            </h3>
            <p className="text-[11px] text-gray-500 mb-4 italic">
              Record sub-surface exploration data, including sampling methods, soil types, and SPT
              blow counts at various depths.
            </p>
            <div className="space-y-4">
              {formData.boreholeLogs.map((logs, boreholeIndex) => {
                const finalRow = logs[logs.length - 1];
                const finalToRaw = finalRow?.toDepth;
                const maxDepthRaw = formData.maxDepths?.[boreholeIndex];

                const hasFinalTo =
                  finalToRaw !== '' &&
                  finalToRaw !== null &&
                  finalToRaw !== undefined &&
                  !isNaN(parseFloat(finalToRaw));
                const hasMaxDepth =
                  maxDepthRaw !== '' &&
                  maxDepthRaw !== null &&
                  maxDepthRaw !== undefined &&
                  !isNaN(parseFloat(maxDepthRaw));

                const isDepthMismatch =
                  (hasFinalTo &&
                    hasMaxDepth &&
                    Math.abs(parseFloat(finalToRaw) - parseFloat(maxDepthRaw)) > 0.0001) ||
                  (hasFinalTo && !hasMaxDepth);

                const isDepthMatched =
                  hasFinalTo &&
                  hasMaxDepth &&
                  Math.abs(parseFloat(finalToRaw) - parseFloat(maxDepthRaw)) <= 0.0001;

                const hasCoreMissingInBH = logs.some(
                  (row) =>
                    row.natureOfSampling === 'Core' &&
                    (row.coreRecovery === '' ||
                      row.coreRecovery === null ||
                      row.coreRecovery === undefined ||
                      (typeof row.coreRecovery === 'string' && row.coreRecovery.trim() === '') ||
                      isNaN(parseFloat(row.coreRecovery)) ||
                      row.rqd === '' ||
                      row.rqd === null ||
                      row.rqd === undefined ||
                      (typeof row.rqd === 'string' && row.rqd.trim() === '') ||
                      isNaN(parseFloat(row.rqd)))
                );

                return (
                  <div
                    key={boreholeIndex}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-gray-800">BH - {boreholeIndex + 1}</h4>
                      <div className="flex items-end gap-4">
                        <div className="flex flex-col gap-1">
                          <Label className="text-left text-xs">
                            Maximum Depth of Exploration (m)
                          </Label>
                          <Input
                            className={`h-8 text-xs w-full transition-colors ${
                              isDepthMismatch
                                ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50 text-red-900 font-semibold ring-1 ring-red-400/40'
                                : isDepthMatched
                                ? 'border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-50/30'
                                : ''
                            }`}
                            placeholder="Max Exploration Depth"
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.maxDepths?.[boreholeIndex] ?? ''}
                            onChange={(e) => handleMaxDepthChange(boreholeIndex, e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-left text-xs">Latitude (°)</Label>
                          <Input
                            className="h-8 text-xs w-36"
                            placeholder="e.g. 12.971599"
                            value={formData.latitudes?.[boreholeIndex] ?? ''}
                            onChange={(e) => handleLatitudeChange(boreholeIndex, e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-left text-xs">Longitude (°)</Label>
                          <Input
                            className="h-8 text-xs w-36"
                            placeholder="e.g. 77.594566"
                            value={formData.longitudes?.[boreholeIndex] ?? ''}
                            onChange={(e) => handleLongitudeChange(boreholeIndex, e.target.value)}
                          />
                        </div>
                      </div>
                      {formData.boreholeLogs.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeBorehole(boreholeIndex)}
                          className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60"
                          title="Remove this entire borehole and its associated data"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Remove Borehole
                        </Button>
                      )}
                    </div>

                    {isDepthMismatch && (
                      <div className="flex items-start gap-2.5 p-3 mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-red-800 dark:text-red-200">
                            Depth Mismatch Warning (BH - {boreholeIndex + 1})
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">
                            {!hasMaxDepth ? (
                              <>
                                Final row &quot;To (m)&quot; is entered as{' '}
                                <strong>{finalToRaw} m</strong>, but &quot;Maximum Depth of
                                Exploration&quot; has not been set. Both values must match exactly
                                before you can save results.
                              </>
                            ) : (
                              <>
                                The final row &quot;To (m)&quot; value (
                                <strong>{finalToRaw} m</strong>) does not match the Maximum Depth of
                                Exploration (<strong>{maxDepthRaw} m</strong>). Both values must
                                match exactly before you can save results.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    {isDepthMatched && (
                      <div className="flex items-center gap-2 p-2 mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          Final row &quot;To (m)&quot; matches Maximum Depth of Exploration (
                          {finalToRaw} m).
                        </span>
                      </div>
                    )}
                    {hasCoreMissingInBH && (
                      <div className="flex items-start gap-2.5 p-3 mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-200 text-xs shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-amber-900 dark:text-amber-100">
                            Mandatory Core Data Required (BH - {boreholeIndex + 1})
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">
                            One or more rows have <strong>Core</strong> sampling selected. Both{' '}
                            <strong>CR (%)</strong> and <strong>RQD (%)</strong> are mandatory fields and
                            cannot be left empty before saving results.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg bg-white mb-4 overflow-visible">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/50 border-b">
                          <tr>
                            <th
                              className="px-3 py-2 font-bold min-w-[80px]"
                              title="From depth below ground level (m)"
                            >
                              From (m)
                            </th>
                            <th
                              className="px-3 py-2 font-bold min-w-[80px]"
                              title="To depth below ground level (m)"
                            >
                              To (m)
                            </th>
                            <th
                              className="px-3 py-2 font-bold min-w-[150px]"
                              title="Method used to collect soil sample (CR/DS/UDS/SPT)"
                            >
                              Sampling
                            </th>
                            <th
                              className="px-3 py-2 font-bold min-w-[200px]"
                              title="Visual soil or rock classification"
                            >
                              Soil Type
                            </th>
                            <th
                              className="px-3 py-2 font-bold min-w-[170px]"
                              title="SPT blow counts for 15/30/45cm intervals, or CR% and RQD% for Core sampling"
                            >
                              SPT N Value
                            </th>
                            <th className="px-3 py-2 w-[50px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((depthData, depthIndex) => {
                            const isFinalRow = depthIndex === logs.length - 1;
                            const isRowMismatch = isFinalRow && isDepthMismatch;
                            const isRowMatched = isFinalRow && isDepthMatched;

                            return (
                              <tr key={depthIndex} className="border-b">
                                <td className="px-2 py-2">
                                  <Input
                                    value={depthData.fromDepth}
                                    onChange={(e) =>
                                      handleBoreholeDepthChange(
                                        boreholeIndex,
                                        depthIndex,
                                        'fromDepth',
                                        e.target.value
                                      )
                                    }
                                    className="h-8"
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    placeholder="0.00"
                                    title="From depth below ground level (m)"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex flex-col">
                                    <Input
                                      value={depthData.toDepth}
                                      onChange={(e) =>
                                        handleBoreholeDepthChange(
                                          boreholeIndex,
                                          depthIndex,
                                          'toDepth',
                                          e.target.value
                                        )
                                      }
                                      onBlur={() => {
                                        if (isFinalRow && isDepthMismatch) {
                                          toast({
                                            title: 'Depth Mismatch Warning',
                                            description: !hasMaxDepth
                                              ? `BH - ${boreholeIndex + 1}: Final row To (m) is ${finalToRaw} m, but Maximum Depth of Exploration is not set.`
                                              : `BH - ${boreholeIndex + 1}: Final row To (m) (${finalToRaw} m) does not match Maximum Depth of Exploration (${maxDepthRaw} m).`,
                                            variant: 'destructive',
                                          });
                                        }
                                      }}
                                      className={`h-8 transition-colors ${
                                        isRowMismatch
                                          ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50 text-red-900 font-semibold ring-1 ring-red-400/40'
                                          : isRowMatched
                                          ? 'border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-50/30'
                                          : ''
                                      }`}
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      placeholder="0.00"
                                      title={
                                        isFinalRow
                                          ? `Final To depth (Must match Maximum Depth of Exploration: ${maxDepthRaw ?? 'not set'} m)`
                                          : 'To depth below ground level (m)'
                                      }
                                    />
                                    {isRowMismatch && (
                                      <span className="text-[10px] text-red-600 font-semibold mt-0.5 whitespace-nowrap">
                                        Must match Max Depth ({maxDepthRaw ? `${maxDepthRaw} m` : 'not set'})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <Select
                                    value={depthData.natureOfSampling}
                                    onValueChange={(v) =>
                                      handleBoreholeDepthChange(
                                        boreholeIndex,
                                        depthIndex,
                                        'natureOfSampling',
                                        v
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      className="h-8"
                                      title="Nature of Sampling (CR: Core Recovery, DS: Disturbed, UDS: Undisturbed, SPT: Split Spoon)"
                                    >
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Core">Core</SelectItem>
                                      <SelectItem value="DS">DS</SelectItem>
                                      <SelectItem value="UDS">UDS</SelectItem>
                                      <SelectItem value="SPT">SPT</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-2 py-2">
                                  <SoilTypeSelect
                                    value={depthData.soilType || ''}
                                    onChange={(val) =>
                                      selectSoilType(val, boreholeIndex, depthIndex)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  {depthData.natureOfSampling === 'DS' ? (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-[10px] text-gray-400 font-medium italic bg-gray-50/50 rounded-md border border-dashed border-gray-200 px-2 text-center leading-tight">
                                      SPT Not Required for Disturbed Sampling (DS)
                                    </div>
                                  ) : depthData.natureOfSampling === 'Core' ? (
                                    (() => {
                                      const isCrMissing =
                                        depthData.coreRecovery === '' ||
                                        depthData.coreRecovery === null ||
                                        depthData.coreRecovery === undefined ||
                                        (typeof depthData.coreRecovery === 'string' &&
                                          depthData.coreRecovery.trim() === '') ||
                                        isNaN(parseFloat(depthData.coreRecovery));

                                      const isRqdMissing =
                                        depthData.rqd === '' ||
                                        depthData.rqd === null ||
                                        depthData.rqd === undefined ||
                                        (typeof depthData.rqd === 'string' &&
                                          depthData.rqd.trim() === '') ||
                                        isNaN(parseFloat(depthData.rqd));

                                      return (
                                        <div
                                          className={`flex flex-col gap-2 min-w-[160px] p-2 rounded-lg border transition-colors ${
                                            isCrMissing || isRqdMissing
                                              ? 'bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-900/60'
                                              : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40'
                                          }`}
                                        >
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                              SPT N Value
                                            </span>
                                            <Input
                                              value={depthData.spt1 || '-'}
                                              onChange={(e) => {
                                                handleBoreholeDepthChange(
                                                  boreholeIndex,
                                                  depthIndex,
                                                  'spt1',
                                                  e.target.value
                                                );
                                                handleBoreholeDepthChange(
                                                  boreholeIndex,
                                                  depthIndex,
                                                  'spt2',
                                                  e.target.value
                                                );
                                                handleBoreholeDepthChange(
                                                  boreholeIndex,
                                                  depthIndex,
                                                  'spt3',
                                                  e.target.value
                                                );
                                              }}
                                              className="h-8 text-xs font-mono font-bold text-center bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                                              placeholder="-"
                                              title="SPT N-Value (filled with '-' for Core)"
                                            />
                                          </div>
                                          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-blue-100 dark:border-blue-900/40">
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[10px] font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between">
                                                <span>CR (%)</span>
                                                <span
                                                  className="text-red-500 font-extrabold text-[11px]"
                                                  title="Mandatory field - cannot be left empty"
                                                >
                                                  *
                                                </span>
                                              </label>
                                              <Input
                                                value={depthData.coreRecovery ?? ''}
                                                onChange={(e) =>
                                                  handleBoreholeDepthChange(
                                                    boreholeIndex,
                                                    depthIndex,
                                                    'coreRecovery',
                                                    e.target.value
                                                  )
                                                }
                                                onBlur={() => {
                                                  if (isCrMissing) {
                                                    toast({
                                                      title: 'Mandatory Field Missing',
                                                      description: `BH - ${boreholeIndex + 1} (Row ${depthIndex + 1}): Core Recovery (CR %) is mandatory for Core sampling and cannot be left empty.`,
                                                      variant: 'destructive',
                                                    });
                                                  }
                                                }}
                                                className={`h-8 text-xs font-semibold transition-colors ${
                                                  isCrMissing
                                                    ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/60 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold ring-1 ring-red-400/40'
                                                    : 'border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500 bg-white dark:bg-gray-900'
                                                }`}
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                placeholder="CR % *"
                                                title="Core Recovery (%) - Mandatory for Core sampling"
                                                required
                                              />
                                              {isCrMissing && (
                                                <span className="text-[9px] text-red-600 dark:text-red-400 font-bold leading-none mt-0.5">
                                                  Required
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                                                <span>RQD (%)</span>
                                                <span
                                                  className="text-red-500 font-extrabold text-[11px]"
                                                  title="Mandatory field - cannot be left empty"
                                                >
                                                  *
                                                </span>
                                              </label>
                                              <Input
                                                value={depthData.rqd ?? ''}
                                                onChange={(e) =>
                                                  handleBoreholeDepthChange(
                                                    boreholeIndex,
                                                    depthIndex,
                                                    'rqd',
                                                    e.target.value
                                                  )
                                                }
                                                onBlur={() => {
                                                  if (isRqdMissing) {
                                                    toast({
                                                      title: 'Mandatory Field Missing',
                                                      description: `BH - ${boreholeIndex + 1} (Row ${depthIndex + 1}): Rock Quality Designation (RQD %) is mandatory for Core sampling and cannot be left empty.`,
                                                      variant: 'destructive',
                                                    });
                                                  }
                                                }}
                                                className={`h-8 text-xs font-semibold transition-colors ${
                                                  isRqdMissing
                                                    ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/60 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold ring-1 ring-red-400/40'
                                                    : 'border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500 bg-white dark:bg-gray-900'
                                                }`}
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                placeholder="RQD % *"
                                                title="Rock Quality Designation (%) - Mandatory for Core sampling"
                                                required
                                              />
                                              {isRqdMissing && (
                                                <span className="text-[9px] text-red-600 dark:text-red-400 font-bold leading-none mt-0.5">
                                                  Required
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {(isCrMissing || isRqdMissing) && (
                                            <div className="flex items-center gap-1 text-[9px] font-semibold text-red-600 dark:text-red-400 pt-0.5">
                                              <AlertTriangle className="w-3 h-3 shrink-0" />
                                              <span>CR &amp; RQD are mandatory</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <>
                                      <Input
                                        value={depthData.spt1}
                                        onChange={(e) =>
                                          handleBoreholeDepthChange(
                                            boreholeIndex,
                                            depthIndex,
                                            'spt1',
                                            e.target.value
                                          )
                                        }
                                        className="h-8 mb-1"
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="15cm"
                                        title="SPT N-Value for first 15cm"
                                      />
                                      <Input
                                        value={depthData.spt2}
                                        onChange={(e) =>
                                          handleBoreholeDepthChange(
                                            boreholeIndex,
                                            depthIndex,
                                            'spt2',
                                            e.target.value
                                          )
                                        }
                                        className="h-8 mb-1"
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="30cm"
                                        title="SPT N-Value for second 15cm"
                                      />
                                      <Input
                                        value={depthData.spt3}
                                        onChange={(e) =>
                                          handleBoreholeDepthChange(
                                            boreholeIndex,
                                            depthIndex,
                                            'spt3',
                                            e.target.value
                                          )
                                        }
                                        className="h-8"
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="45cm"
                                        title="SPT N-Value for third 15cm"
                                      />
                                    </>
                                  )}
                                </td>
                                <td className="px-2 py-2">
                                  {logs.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeBoreholeDepth(boreholeIndex, depthIndex)}
                                      className="text-red-500"
                                      title="Remove this depth entry"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addBoreholeDepth(boreholeIndex)}
                      className="text-primary"
                      title="Add a new depth level for this borehole"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Depth
                    </Button>
                  </div>
                );
              })}
              <div className="flex justify-center pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBorehole}
                  className="text-primary"
                  title="Add a new borehole to the report"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Borehole
                </Button>
              </div>
            </div>
          </div>

          {/* SBC DETAILS SECTION */}
          <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-100">
            <h3 className="text-md font-bold text-gray-800 mb-1 pb-1 flex items-center gap-2">
              <LandPlot className="w-4 h-4 text-primary" />
              SBC Details
            </h3>
            <p className="text-[11px] text-gray-500 mb-4 italic">
              Input Safe Bearing Capacity (SBC) values for foundation design at specific borehole
              depths.
            </p>
            <div className="space-y-4">
              {formData.boreholeLogs.map((_, boreholeIndex) => {
                const sbcEntries = formData.sbcDetails[boreholeIndex] || [{}];
                return (
                  <div
                    key={boreholeIndex}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4"
                  >
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 pb-2 border-b dark:border-gray-700">
                      SBC - BH {boreholeIndex + 1}
                    </h4>

                    <div className="space-y-6">
                      {sbcEntries.map((sbcVal, entryIndex) => {
                        const categoryLower = materialCategory?.toLowerCase().trim();
                        const type =
                          categoryLower === 'rock'
                            ? 'Rock'
                            : categoryLower === 'soil'
                              ? 'Soil'
                              : sbcVal.foundationType || 'Soil';

                        return (
                          <div
                            key={entryIndex}
                            className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/30 dark:bg-gray-700/40 relative space-y-4"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                SBC - BH {boreholeIndex + 1} - Footing Size {entryIndex + 1}
                              </span>
                              {sbcEntries.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSbcEntry(boreholeIndex, entryIndex)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-8 w-8 rounded-lg"
                                  title="Remove this footing size entry"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            {categoryLower === 'soil and rock' && (
                              <div className="flex items-center gap-4 bg-gray-50/50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-600">
                                <Label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                  Foundation Material
                                </Label>
                                <Select
                                  value={type}
                                  onValueChange={(val) =>
                                    handleSbcChange(boreholeIndex, entryIndex, null, {
                                      ...sbcVal,
                                      foundationType: val,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-[180px] h-8 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 dark:text-gray-200">
                                    <SelectValue placeholder="Select Material" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Soil" className="text-xs">
                                      Soil
                                    </SelectItem>
                                    <SelectItem value="Rock" className="text-xs">
                                      Rock
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {type === 'Rock' ? (
                              <GeotechRockSbcDetails
                                value={sbcVal}
                                onChange={(newVal) =>
                                  handleSbcChange(boreholeIndex, entryIndex, null, {
                                    ...newVal,
                                    foundationType: type,
                                  })
                                }
                              />
                            ) : (
                              <GeotechSoilSbcDetails
                                value={sbcVal}
                                onChange={(newVal) =>
                                  handleSbcChange(boreholeIndex, entryIndex, null, {
                                    ...newVal,
                                    foundationType: type,
                                  })
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex justify-start">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSbcEntry(boreholeIndex)}
                        className="text-primary hover:bg-primary/5 border-primary/20"
                        title="Add a new footing size recommendation for this borehole"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Footing Size
                      </Button>
                    </div>
                  </div>
                );
              })}
              {formData.boreholeLogs.length === 0 && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 italic">
                  Add a borehole to enter SBC details.
                </div>
              )}
            </div>
          </div>
        </TabsContent>



        {/* LAB TAB */}
        <TabsContent value="lab" className="mt-0 space-y-4">
          <div className="bg-gray-50/30 dark:bg-card/40 p-4 rounded-xl border border-gray-100 dark:border-border">
            <h3 className="text-md font-bold text-gray-800 dark:text-foreground mb-1 pb-1 flex items-center gap-2">
              <TestTube className="w-4 h-4 text-primary" />
              Lab Test Results
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-muted-foreground mb-4 italic">
              Record laboratory analysis including soil density, moisture, grain size distribution,
              and consistency limits.
            </p>
            <div className="space-y-4">
              {formData.labTestResults.map((logs, boreholeIndex) => (
                <div
                  key={boreholeIndex}
                  className="bg-white dark:bg-card p-4 rounded-xl border border-gray-200 dark:border-border shadow-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-foreground">
                      Lab Tests - BH {boreholeIndex + 1}
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMoistureInputsInline(!showMoistureInputsInline)}
                      className="hidden text-xs h-8 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-foreground border-gray-200 dark:border-border"
                      title="Toggle inline entry for Container No, w1, w2, w3"
                    >
                      <Scale className="w-3.5 h-3.5 mr-1 text-primary" />
                      {showMoistureInputsInline ? 'Hide Moisture Details' : 'Show Moisture Details (w₁, w₂, w₃)'}
                    </Button>
                  </div>
                  <div className="border border-gray-200 dark:border-border rounded-lg bg-white dark:bg-card mb-4 overflow-visible">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="text-[11px] text-gray-500 dark:text-muted-foreground uppercase bg-gray-50/50 dark:bg-muted/40 border-b dark:border-border">
                        <tr>
                          <th className="px-3 py-2 font-bold">Depth</th>
                          <th className="px-3 py-2 font-bold">Density/Moisture</th>
                          <th className="px-3 py-2 font-bold">Grain Size (G/S/SC)</th>
                          <th className="px-3 py-2 font-bold">Atterberg (LL/PL/PI)</th>
                          <th className="px-3 py-2 font-bold">SG/FSI</th>
                          <th className="px-3 py-2 font-bold">Shrinkage (SL/R)</th>
                          <th className="px-3 py-2 font-bold">Light Compaction</th>
                          <th className="px-3 py-2 font-bold">Heavy Compaction</th>
                          <th className="px-3 py-2 w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((depthData, depthIndex) => (
                          <React.Fragment key={depthIndex}>
                            <tr className="border-b dark:border-border">
                              <td className="px-2 py-2">
                                <Input
                                  value={depthData.depth}
                                  onChange={(e) =>
                                    handleLabTestDepthChange(
                                      boreholeIndex,
                                      depthIndex,
                                      'depth',
                                      e.target.value
                                    )
                                  }
                                  className="h-8 w-20"
                                  title="Depth below ground level (m)"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  value={depthData.bulkDensity}
                                  onChange={(e) =>
                                    handleLabTestDepthChange(
                                      boreholeIndex,
                                      depthIndex,
                                      'bulkDensity',
                                      e.target.value
                                    )
                                  }
                                  className="h-8 mb-1"
                                  placeholder="Bulk Density"
                                  title="Mass per unit volume of soil in natural state"
                                />
                                <div className="relative flex items-center">
                                  <Input
                                    value={
                                      depthData.moistureContent !== '' &&
                                      depthData.moistureContent !== null &&
                                      depthData.moistureContent !== undefined
                                        ? depthData.moistureContent === '-'
                                          ? '-'
                                          : String(depthData.moistureContent).endsWith('%')
                                          ? depthData.moistureContent
                                          : `${depthData.moistureContent}%`
                                        : ''
                                    }
                                    readOnly
                                    onClick={() =>
                                      setMoistureModalState({
                                        isOpen: true,
                                        boreholeIndex,
                                        depthIndex,
                                      })
                                    }
                                    className="h-8 pr-8 cursor-pointer bg-gray-50/70 dark:bg-background/80 hover:bg-gray-100/80 dark:hover:bg-muted/40 font-medium text-gray-800 dark:text-foreground transition-colors"
                                    placeholder="Moisture % (IS:2720)"
                                    title={
                                      depthData.moistureContent && depthData.moistureContent !== '-'
                                        ? `Cont: ${depthData.containerNo || '-'}, w₁=${depthData.w1 || '-'}g, w₂=${depthData.w2 || '-'}g, w₃=${depthData.w3 || '-'}g (w₄=${depthData.w4 || '-'}g, w₅=${depthData.w5 || '-'}g). Click to open calculator.`
                                        : 'Click to calculate Moisture Content (IS:2720 Part II)'
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMoistureModalState({
                                        isOpen: true,
                                        boreholeIndex,
                                        depthIndex,
                                      })
                                    }
                                    className="absolute right-1 text-primary hover:text-primary/80 p-1 rounded transition-colors"
                                    title="Open Moisture Content Calculator"
                                  >
                                    <Calculator className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  value={depthData.grainSizeDistribution.gravel}
                                  onChange={(e) =>
                                    handleLabTestDepthChange(
                                      boreholeIndex,
                                      depthIndex,
                                      'grainSizeDistribution.gravel',
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center text-xs"
                                  placeholder="G"
                                  title={
                                    depthData.grainSizeDistribution.gravel !== ''
                                      ? `Gravel: ${depthData.grainSizeDistribution.gravel}%. Click calculator to view/edit Sieve Analysis.`
                                      : 'Gravel percentage (%)'
                                  }
                                />
                                <Input
                                  value={depthData.grainSizeDistribution.sand}
                                  onChange={(e) =>
                                    handleLabTestDepthChange(
                                      boreholeIndex,
                                      depthIndex,
                                      'grainSizeDistribution.sand',
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center text-xs"
                                  placeholder="S"
                                  title={
                                    depthData.grainSizeDistribution.sand !== ''
                                      ? `Sand: ${depthData.grainSizeDistribution.sand}%. Click calculator to view/edit Sieve Analysis.`
                                      : 'Sand percentage (%)'
                                  }
                                />
                                <Input
                                  value={depthData.grainSizeDistribution.siltAndClay}
                                  onChange={(e) =>
                                    handleLabTestDepthChange(
                                      boreholeIndex,
                                      depthIndex,
                                      'grainSizeDistribution.siltAndClay',
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center text-xs"
                                  placeholder="SC"
                                  title={
                                    depthData.grainSizeDistribution.siltAndClay !== ''
                                      ? `Silt & Clay: ${depthData.grainSizeDistribution.siltAndClay}%. Click calculator to view/edit Sieve Analysis.`
                                      : 'Silt and Clay percentage (%)'
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSieveModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 border ${
                                    depthData.sieveData ||
                                    depthData.grainSizeDistribution.gravel !== '' ||
                                    depthData.grainSizeDistribution.sand !== '' ||
                                    depthData.grainSizeDistribution.siltAndClay !== ''
                                      ? 'text-primary bg-primary/10 border-primary/30 hover:bg-primary/20 dark:bg-primary/20 dark:border-primary/40 dark:text-primary'
                                      : 'text-gray-400 bg-gray-50/70 border-gray-200 hover:text-primary hover:bg-primary/5 hover:border-primary/20 dark:bg-card/90 dark:border-border dark:text-gray-400 dark:hover:text-primary dark:hover:bg-primary/20 dark:hover:border-primary/40'
                                  }`}
                                  title={
                                    depthData.sieveData?.totalWeight
                                      ? `Sieve Analysis: Total Wt=${depthData.sieveData.totalWeight}g. Click to edit.`
                                      : 'Click to calculate Grain Size (G/S/SC) from Sieve Analysis'
                                  }
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1 items-center">
                                <Input
                                  value={depthData.atterbergLimits.liquidLimit}
                                  onChange={(e) =>
                                    handleLabTestDepthChange(
                                      boreholeIndex,
                                      depthIndex,
                                      'atterbergLimits.liquidLimit',
                                      e.target.value
                                    )
                                  }
                                  className="h-8"
                                  placeholder="LL"
                                  title="Liquid Limit (%)"
                                />
                                <Input
                                  value={depthData.atterbergLimits.plasticLimit}
                                  onChange={(e) =>
                                    handleLabTestDepthChange(
                                      boreholeIndex,
                                      depthIndex,
                                      'atterbergLimits.plasticLimit',
                                      e.target.value
                                    )
                                  }
                                  className="h-8"
                                  placeholder="PL"
                                  title="Plastic Limit (%)"
                                />
                                <Input
                                  value={depthData.atterbergLimits.plasticityIndex}
                                  onChange={(e) =>
                                    handleLabTestDepthChange(
                                      boreholeIndex,
                                      depthIndex,
                                      'atterbergLimits.plasticityIndex',
                                      e.target.value
                                    )
                                  }
                                  className="h-8"
                                  placeholder="PI"
                                  title="Plasticity Index (LL - PL)"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAtterbergModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 border ${
                                    depthData.atterbergData ||
                                    depthData.atterbergLimits.liquidLimit !== '' ||
                                    depthData.atterbergLimits.plasticLimit !== '' ||
                                    depthData.atterbergLimits.plasticityIndex !== ''
                                      ? 'text-primary bg-primary/10 border-primary/30 hover:bg-primary/20 dark:bg-primary/20 dark:border-primary/40 dark:text-primary'
                                      : 'text-gray-400 bg-gray-50/70 border-gray-200 hover:text-primary hover:bg-primary/5 hover:border-primary/20 dark:bg-card/90 dark:border-border dark:text-gray-400 dark:hover:text-primary dark:hover:bg-primary/20 dark:hover:border-primary/40'
                                  }`}
                                  title={
                                    depthData.atterbergData?.method
                                      ? `Atterberg (${depthData.atterbergData.method === 'casagrande' ? 'Casagrande' : 'Cone Pen'}): LL=${depthData.atterbergLimits.liquidLimit}%, PL=${depthData.atterbergLimits.plasticLimit}, PI=${depthData.atterbergLimits.plasticityIndex}. Click to edit.`
                                      : 'Click to calculate Atterberg Limits (LL/PL/PI) from Casagrande or Cone Penetration'
                                  }
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="relative flex items-center mb-1">
                                <Input
                                  value={depthData.specificGravity || ''}
                                  readOnly
                                  onClick={() =>
                                    setSgModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className={`h-8 pr-8 cursor-pointer bg-gray-50/70 dark:bg-background/80 hover:bg-gray-100/80 dark:hover:bg-muted/40 font-medium text-gray-800 dark:text-foreground transition-colors ${
                                    depthData.specificGravityTrials?.isDiffExceeded
                                      ? 'border-amber-400 bg-amber-50/30 dark:border-amber-500/60 dark:bg-amber-950/20'
                                      : ''
                                  }`}
                                  placeholder="SG (Auto)"
                                  title={
                                    depthData.specificGravityTrials?.averageSg && depthData.specificGravityTrials?.averageSg !== '-'
                                      ? `SG₁=${depthData.specificGravityTrials?.t1?.sg || '-'}, SG₂=${depthData.specificGravityTrials?.t2?.sg || '-'}, Diff=${depthData.specificGravityTrials?.diff || '-'}${
                                          depthData.specificGravityTrials?.isDiffExceeded ? ' (⚠️ Difference > 0.03)' : ''
                                        }. Click to edit.`
                                      : 'Click to calculate Specific Gravity (Density Bottle Method)'
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSgModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className="absolute right-1 text-primary hover:text-primary/80 p-1 rounded transition-colors"
                                  title="Open Specific Gravity Calculator"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="relative flex items-center">
                                <Input
                                  value={
                                    depthData.freeSwellIndex !== '' &&
                                    depthData.freeSwellIndex !== null &&
                                    depthData.freeSwellIndex !== undefined
                                      ? depthData.freeSwellIndex === '-'
                                        ? '-'
                                        : String(depthData.freeSwellIndex).endsWith('%')
                                        ? depthData.freeSwellIndex
                                        : `${depthData.freeSwellIndex}%`
                                      : ''
                                  }
                                  readOnly
                                  onClick={() =>
                                    setFsiModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className="h-8 pr-8 cursor-pointer bg-gray-50/70 dark:bg-background/80 hover:bg-gray-100/80 dark:hover:bg-muted/40 font-medium text-gray-800 dark:text-foreground transition-colors"
                                  placeholder="FSI % (Auto)"
                                  title={
                                    depthData.freeSwellIndexTrials?.averageFsi && depthData.freeSwellIndexTrials?.averageFsi !== '-'
                                      ? `FSI₁=${depthData.freeSwellIndexTrials?.t1?.fsi || '-'}%, FSI₂=${depthData.freeSwellIndexTrials?.t2?.fsi || '-'}% (Avg: ${depthData.freeSwellIndexTrials?.averageFsi}%${
                                          depthData.freeSwellIndexTrials?.expansiveness
                                            ? `, ${depthData.freeSwellIndexTrials.expansiveness} Swell`
                                            : ''
                                        }). Click to edit.`
                                      : 'Click to calculate Free Swell Index (IS 2720 Part 40)'
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFsiModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className="absolute right-1 text-primary hover:text-primary/80 p-1 rounded transition-colors"
                                  title="Open Free Swell Index Calculator"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Shrinkage Limit (SL / R) */}
                            <td className="px-2 py-2">
                              <div className="flex gap-1 items-center">
                                <div className="relative flex items-center flex-1">
                                  <Input
                                    value={
                                      depthData.shrinkageLimit
                                        ? String(depthData.shrinkageLimit).endsWith('%')
                                          ? depthData.shrinkageLimit
                                          : `${depthData.shrinkageLimit}%`
                                        : ''
                                    }
                                    readOnly
                                    onClick={() =>
                                      setShrinkageModalState({
                                        isOpen: true,
                                        boreholeIndex,
                                        depthIndex,
                                      })
                                    }
                                    className={`h-8 pr-7 cursor-pointer bg-gray-50/70 dark:bg-background/80 hover:bg-gray-100/80 dark:hover:bg-muted/40 font-medium text-xs text-gray-800 dark:text-foreground transition-colors ${
                                      depthData.shrinkageData && !depthData.shrinkageData.isCompliant
                                        ? 'border-amber-400 bg-amber-50/30 dark:border-amber-600 dark:bg-amber-950/20'
                                        : ''
                                    }`}
                                    placeholder="SL % (Auto)"
                                    title={
                                      depthData.shrinkageLimit
                                        ? `Shrinkage Limit: ${depthData.shrinkageLimit}, Ratio: ${depthData.shrinkageRatio || '-'}. Click to edit.`
                                        : 'Click to calculate Shrinkage Limit (IS 2720 Part 6)'
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShrinkageModalState({
                                        isOpen: true,
                                        boreholeIndex,
                                        depthIndex,
                                      })
                                    }
                                    className="absolute right-1 text-primary hover:text-primary/80 p-1 rounded transition-colors"
                                    title="Open Shrinkage Limit Calculator"
                                  >
                                    <Calculator className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <Input
                                  value={depthData.shrinkageRatio || ''}
                                  readOnly
                                  onClick={() =>
                                    setShrinkageModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className="h-8 w-12 text-center cursor-pointer text-xs bg-gray-50/70 dark:bg-background/80 text-gray-700 dark:text-gray-300"
                                  placeholder="R"
                                  title="Shrinkage Ratio (W₀ / V₀)"
                                />
                              </div>
                            </td>

                            {/* Light Compaction (MDD / OMC) */}
                            <td className="px-2 py-2">
                              <div className="relative flex items-center">
                                <Input
                                  value={
                                    depthData.lightCompaction?.mdd
                                      ? `${depthData.lightCompaction.mdd} | ${depthData.lightCompaction.omc}%`
                                      : ''
                                  }
                                  readOnly
                                  onClick={() =>
                                    setLightCompactionModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className="h-8 pr-7 cursor-pointer bg-gray-50/70 dark:bg-background/80 hover:bg-gray-100/80 dark:hover:bg-muted/40 font-medium text-xs text-gray-800 dark:text-foreground transition-colors"
                                  placeholder="Light (Auto)"
                                  title={
                                    depthData.lightCompaction?.mdd
                                      ? `Light Compaction: MDD=${depthData.lightCompaction.mdd} g/cc, OMC=${depthData.lightCompaction.omc}%. Click to edit.`
                                      : 'Click to calculate Light Compaction (IS 2720 Part 7)'
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightCompactionModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className="absolute right-1 text-amber-600 hover:text-amber-700 p-1 rounded transition-colors"
                                  title="Open Light Compaction Calculator"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Heavy Compaction (MDD / OMC) */}
                            <td className="px-2 py-2">
                              <div className="relative flex items-center">
                                <Input
                                  value={
                                    depthData.heavyCompaction?.mdd
                                      ? `${depthData.heavyCompaction.mdd} | ${depthData.heavyCompaction.omc}%`
                                      : ''
                                  }
                                  readOnly
                                  onClick={() =>
                                    setHeavyCompactionModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className="h-8 pr-7 cursor-pointer bg-gray-50/70 dark:bg-background/80 hover:bg-gray-100/80 dark:hover:bg-muted/40 font-medium text-xs text-gray-800 dark:text-foreground transition-colors"
                                  placeholder="Heavy (Auto)"
                                  title={
                                    depthData.heavyCompaction?.mdd
                                      ? `Heavy Compaction (${depthData.heavyCompaction.mouldType === 'HEAVY_BIG' ? 'Big Mould' : 'Small Mould'}): MDD=${depthData.heavyCompaction.mdd} g/cc, OMC=${depthData.heavyCompaction.omc}%. Click to edit.`
                                      : 'Click to calculate Heavy Compaction (IS 2720 Part 8)'
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setHeavyCompactionModalState({
                                      isOpen: true,
                                      boreholeIndex,
                                      depthIndex,
                                    })
                                  }
                                  className="absolute right-1 text-purple-600 hover:text-purple-700 p-1 rounded transition-colors"
                                  title="Open Heavy Compaction Calculator"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            <td className="px-2 py-2">
                              {logs.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLabTestDepth(boreholeIndex, depthIndex)}
                                  className="text-red-500"
                                  title="Remove this lab test entry"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                          {showMoistureInputsInline && (
                            <tr className="bg-blue-50/25 dark:bg-blue-950/20 border-b dark:border-border">
                              <td colSpan={9} className="px-3 py-2.5 bg-gradient-to-r from-blue-50/40 via-emerald-50/20 to-transparent dark:from-blue-950/30 dark:via-emerald-950/20 dark:to-transparent">
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                  <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                    <Calculator className="w-3.5 h-3.5 text-primary" /> Moisture Inputs:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">Cont #:</span>
                                    <Input
                                      value={depthData.containerNo || ''}
                                      onChange={(e) =>
                                        handleLabTestDepthChange(
                                          boreholeIndex,
                                          depthIndex,
                                          'containerNo',
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g. 1"
                                      className="h-7 w-16 text-xs bg-white dark:bg-background"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">w₁ (tare):</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={depthData.w1 || ''}
                                      onChange={(e) =>
                                        handleLabTestDepthChange(
                                          boreholeIndex,
                                          depthIndex,
                                          'w1',
                                          e.target.value
                                        )
                                      }
                                      placeholder="w1 (g)"
                                      className="h-7 w-20 text-xs bg-white dark:bg-background"
                                      title="Weight of Container - w1 (gm)"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">w₂ (wet):</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={depthData.w2 || ''}
                                      onChange={(e) =>
                                        handleLabTestDepthChange(
                                          boreholeIndex,
                                          depthIndex,
                                          'w2',
                                          e.target.value
                                        )
                                      }
                                      placeholder="w2 (g)"
                                      className="h-7 w-20 text-xs bg-white dark:bg-background"
                                      title="Weight of Container + Wet Soil - w2 (gm)"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">w₃ (dry):</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={depthData.w3 || ''}
                                      onChange={(e) =>
                                        handleLabTestDepthChange(
                                          boreholeIndex,
                                          depthIndex,
                                          'w3',
                                          e.target.value
                                        )
                                      }
                                      placeholder="w3 (g)"
                                      className="h-7 w-20 text-xs bg-white dark:bg-background"
                                      title="Weight of Container + Dry Soil - w3 (gm)"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-border">
                                    <span className="text-[11px] text-blue-700 dark:text-blue-400">
                                      w₄: <strong>{depthData.w4 && depthData.w4 !== '-' ? `${depthData.w4}g` : '—'}</strong>
                                    </span>
                                    <span className="text-[11px] text-amber-700 dark:text-amber-400">
                                      w₅: <strong>{depthData.w5 && depthData.w5 !== '-' ? `${depthData.w5}g` : '—'}</strong>
                                    </span>
                                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100/80 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                                      w: {depthData.moistureContent && depthData.moistureContent !== '-' ? `${depthData.moistureContent}%` : '—'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addLabTestDepth(boreholeIndex)}
                    className="text-primary"
                    title="Add a new depth for lab testing"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Depth
                  </Button>
                </div>
              ))}
              {formData.boreholeLogs.length === 0 && (
                <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-200 dark:border-border text-center text-gray-500 dark:text-muted-foreground italic">
                  Add a borehole in the 'Borehole' tab to enter lab test results.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* SUB-SOIL PROFILE TAB */}
        {SHOW_SUBSOIL_TAB && (
          <TabsContent value="subsoil" className="mt-0 space-y-4">
          <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-100">
            <h3 className="text-md font-bold text-gray-800 mb-1 pb-1 flex items-center gap-2">
              <ArrowDownFromLine className="w-4 h-4 text-primary" />
              Sub-Soil Profile
            </h3>
            <p className="text-[11px] text-gray-500 mb-4 italic">
              Record depth and strata description for each layer in the sub-soil profile.
            </p>
            <div className="space-y-4">
              {formData.boreholeLogs.map((_, boreholeIndex) => (
                <div
                  key={boreholeIndex}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                >
                  <h4 className="text-sm font-bold text-gray-800 mb-3">
                    Sub-Soil Profile - BH {boreholeIndex + 1}
                  </h4>
                  <div className="border rounded-lg bg-white mb-4 overflow-hidden">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/50 border-b">
                        <tr>
                          <th className="px-3 py-2 font-bold w-28">Depth (m)</th>
                          <th className="px-3 py-2 font-bold">Description</th>
                          <th className="px-3 py-2 w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.subSoilProfile[boreholeIndex] || []).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b last:border-0">
                            <td className="px-2 py-2">
                              <Input
                                value={row.depth || ''}
                                onChange={(e) =>
                                  handleSubSoilChange(
                                    boreholeIndex,
                                    rowIndex,
                                    'depth',
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="Depth"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                value={row.description || ''}
                                onChange={(e) =>
                                  handleSubSoilChange(
                                    boreholeIndex,
                                    rowIndex,
                                    'description',
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="Strata description"
                              />
                            </td>
                            <td className="px-2 py-2 text-right">
                              {(formData.subSoilProfile[boreholeIndex] || []).length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSubSoilRow(boreholeIndex, rowIndex)}
                                  className="text-red-500 h-8 w-8"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(!formData.subSoilProfile[boreholeIndex] ||
                          formData.subSoilProfile[boreholeIndex].length === 0) && (
                          <tr>
                            <td
                              colSpan="3"
                              className="px-3 py-4 text-center text-gray-400 italic text-xs"
                            >
                              No entries. Click "Add Row" to begin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSubSoilRow(boreholeIndex)}
                    className="text-primary h-8"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Row
                  </Button>
                </div>
              ))}
              {formData.boreholeLogs.length === 0 && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 italic">
                  Add a borehole in the 'Borehole' tab to enter sub-soil profile data.
                </div>
              )}
            </div>
          </div>
          </TabsContent>
        )}

        {/* DIRECT SHEAR TAB */}
        <TabsContent value="directshear" className="mt-0 space-y-4">
          <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-100">
            <h3 className="text-md font-bold text-gray-800 mb-1 pb-1 flex items-center gap-2">
              <TestTube className="w-4 h-4 text-primary" />
              Direct Shear Test Results
            </h3>
            <p className="text-[11px] text-gray-500 mb-4 italic">
              Record direct shear test parameters and stress readings for each sample.
            </p>
            <div className="space-y-4">
              {formData.boreholeLogs.map((_, boreholeIndex) => (
                <div
                  key={boreholeIndex}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                >
                  <h4 className="text-sm font-bold text-gray-800 mb-3">
                    Direct Shear - BH {boreholeIndex + 1}
                  </h4>
                  <div className="space-y-3">
                    {(formData.directShearResults[boreholeIndex] || []).map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="border border-gray-200 rounded-lg bg-white p-3"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            Sample {rowIndex + 1}
                          </span>
                          {(formData.directShearResults[boreholeIndex] || []).length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDirectShearRow(boreholeIndex, rowIndex)}
                              className="text-red-500 h-7 w-7"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Shear Box Size</Label>
                            <Input
                              value={row.shearBoxSize || ''}
                              onChange={(e) =>
                                handleDirectShearChange(
                                  boreholeIndex,
                                  rowIndex,
                                  'shearBoxSize',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              placeholder="e.g. 60mm"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Depth of Sample (m)</Label>
                            <Input
                              value={row.depthOfSample || ''}
                              onChange={(e) =>
                                handleDirectShearChange(
                                  boreholeIndex,
                                  rowIndex,
                                  'depthOfSample',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              placeholder="Depth"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">C Value (kN/m²)</Label>
                            <Input
                              value={row.cValue || ''}
                              onChange={(e) =>
                                handleDirectShearChange(
                                  boreholeIndex,
                                  rowIndex,
                                  'cValue',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              placeholder="Cohesion"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Φ Value (°)</Label>
                            <Input
                              value={row.phiValue || ''}
                              onChange={(e) =>
                                handleDirectShearChange(
                                  boreholeIndex,
                                  rowIndex,
                                  'phiValue',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              placeholder="Friction angle"
                            />
                          </div>
                        </div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Stress Readings
                        </p>
                        <div className="border rounded-lg overflow-hidden mb-2">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/50 border-b">
                              <tr>
                                <th className="px-3 py-2 font-bold">Normal Stress (kN/m²)</th>
                                <th className="px-3 py-2 font-bold">Shear Stress (kN/m²)</th>
                                <th className="px-3 py-2 w-[50px]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(row.stressReadings || []).map((stress, stressIndex) => (
                                <tr key={stressIndex} className="border-b last:border-0">
                                  <td className="px-2 py-2">
                                    <Input
                                      value={stress.normalStress || ''}
                                      onChange={(e) =>
                                        handleDirectShearStressChange(
                                          boreholeIndex,
                                          rowIndex,
                                          stressIndex,
                                          'normalStress',
                                          e.target.value
                                        )
                                      }
                                      className="h-8"
                                      placeholder="Normal stress"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={stress.shearStress || ''}
                                      onChange={(e) =>
                                        handleDirectShearStressChange(
                                          boreholeIndex,
                                          rowIndex,
                                          stressIndex,
                                          'shearStress',
                                          e.target.value
                                        )
                                      }
                                      className="h-8"
                                      placeholder="Shear stress"
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-right">
                                    {(row.stressReadings || []).length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          removeStressReading(boreholeIndex, rowIndex, stressIndex)
                                        }
                                        className="text-red-500 h-8 w-8"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addStressReading(boreholeIndex, rowIndex)}
                          className="text-primary h-7 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Stress Reading
                        </Button>
                      </div>
                    ))}
                    {(!formData.directShearResults[boreholeIndex] ||
                      formData.directShearResults[boreholeIndex].length === 0) && (
                      <div className="px-3 py-6 text-center text-gray-400 italic text-xs border border-dashed border-gray-200 rounded-lg">
                        No samples. Click "Add Sample" to begin.
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addDirectShearRow(boreholeIndex)}
                    className="text-primary h-8 mt-3"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Sample
                  </Button>
                </div>
              ))}
              {formData.boreholeLogs.length === 0 && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 italic">
                  Add a borehole in the 'Borehole' tab to enter direct shear results.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>{' '}
    </div>
  );
}
