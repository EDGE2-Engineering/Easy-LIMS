import React, { useState } from 'react';
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
} from 'lucide-react';
import { soilTypes } from '@/data/soilTypes';
import { useSettings } from '@/contexts/SettingsContext';

/**
 * Look up the Correction Factor (CF) from the overburden correction table stored
 * in settings, interpolating linearly between the two nearest pressure rows.
 * Returns { cf, formula } — cf defaults to 1 and formula to '' if table is empty.
 */
function lookupCorrectionFactor(overburdenRows, depthFromGL) {
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
  if (pressure <= sorted[0].pressure) {
    return {
      cf: sorted[0].correction,
      formula: `CF at ${sorted[0].pressure} kN/m²`,
    };
  }
  if (pressure >= sorted[sorted.length - 1].pressure) {
    const last = sorted[sorted.length - 1];
    return { cf: last.correction, formula: `CF at ${last.pressure} kN/m²` };
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i],
      hi = sorted[i + 1];
    if (pressure >= lo.pressure && pressure <= hi.pressure) {
      const t = (pressure - lo.pressure) / (hi.pressure - lo.pressure);
      const cf = lo.correction + t * (hi.correction - lo.correction);
      return {
        cf,
        formula: `Interpolated from Field N Value between ${lo.pressure}→${hi.pressure} kN/m² from overburden chart in settings`,
      };
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

export default function GeotechTestForm({ value, onChange }) {
  const [activeTab, setActiveTab] = useState('borehole');
  const [activeSoilField, setActiveSoilField] = useState(null);
  const [filteredSoilTypes, setFilteredSoilTypes] = useState(soilTypes);
  const [showSoilSuggestions, setShowSoilSuggestions] = useState(false);
  const [sieveError, setSieveError] = useState(null); // { boreholeIndex, depthIndex, message }

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
    labTestResults: value?.labTestResults || [
      [
        {
          depth: '',
          bulkDensity: '',
          moistureContent: '',
          grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
          atterbergLimits: {
            liquidLimit: '',
            plasticLimit: '',
            plasticityIndex: '',
          },
          specificGravity: '',
          freeSwellIndex: '',
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
    sbcDetails: value?.sbcDetails || [
      [
        {
          foundation: '',
          structure: '',
          chainage: '',
          depthFromGL: '',
          scourDepthFromGL: '',
          strata: '',
          fieldNValue: '',
          typeOfCorrection: '',
          cpLayerThickness: '',
          liquidLimit: '',
          width: '',
          footingLength: '',
          shapeOfFooting: '',
        },
      ],
    ],
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
    const depthData = newLogs[boreholeIndex][depthIndex];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      depthData[parent][child] = val;
    } else {
      depthData[field] = val;
    }
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
      sbcDetails: [
        ...formData.sbcDetails,
        [
          {
            foundation: '',
            structure: '',
            chainage: '',
            depthFromGL: '',
            scourDepthFromGL: '',
            strata: '',
            fieldNValue: '',
            typeOfCorrection: '',
            cpLayerThickness: '',
            liquidLimit: '',
            width: '',
            footingLength: '',
            shapeOfFooting: '',
          },
        ],
      ],
      labTestResults: [
        ...formData.labTestResults,
        [
          {
            depth: '',
            bulkDensity: '',
            moistureContent: '',
            grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
            atterbergLimits: {
              liquidLimit: '',
              plasticLimit: '',
              plasticityIndex: '',
            },
            specificGravity: '',
            freeSwellIndex: '',
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

  const handleSoilSearch = (e, boreholeIndex, depthIndex) => {
    const val = e.target.value;
    handleBoreholeDepthChange(boreholeIndex, depthIndex, 'soilType', val);
    if (val.trim()) {
      setFilteredSoilTypes(soilTypes.filter((s) => s.toLowerCase().includes(val.toLowerCase())));
      setShowSoilSuggestions(true);
    } else {
      setShowSoilSuggestions(false);
    }
  };

  const selectSoilType = (type, boreholeIndex, depthIndex) => {
    handleBoreholeDepthChange(boreholeIndex, depthIndex, 'soilType', type);
    setShowSoilSuggestions(false);
  };

  // --- SBC Handlers ---
  const handleSbcChange = (boreholeIndex, entryIndex, field, val) => {
    const newSbc = [...formData.sbcDetails];
    if (!newSbc[boreholeIndex]) newSbc[boreholeIndex] = [];
    if (!newSbc[boreholeIndex][entryIndex]) newSbc[boreholeIndex][entryIndex] = {};
    newSbc[boreholeIndex][entryIndex][field] = val;

    // For square footings, keep width === footingLength automatically
    const shape = newSbc[boreholeIndex][entryIndex].shapeOfFooting;
    if (shape === 'Square') {
      if (field === 'width') newSbc[boreholeIndex][entryIndex].footingLength = val;
      if (field === 'footingLength') newSbc[boreholeIndex][entryIndex].width = val;
    }

    // When shape changes to Square, equalise the two dimension fields
    if (field === 'shapeOfFooting' && val === 'Square') {
      const existing = newSbc[boreholeIndex][entryIndex].width || '';
      newSbc[boreholeIndex][entryIndex].footingLength = existing;
    }

    setFormData({ ...formData, sbcDetails: newSbc });
  };

  const addSbcEntry = (boreholeIndex) => {
    const newSbc = [...formData.sbcDetails];
    if (!newSbc[boreholeIndex]) newSbc[boreholeIndex] = [];
    newSbc[boreholeIndex].push({
      foundation: '',
      structure: '',
      chainage: '',
      depthFromGL: '',
      scourDepthFromGL: '',
      strata: '',
      fieldNValue: '',
      typeOfCorrection: '',
      cpLayerThickness: '',
      liquidLimit: '',
      width: '',
      footingLength: '',
      shapeOfFooting: '',
    });
    setFormData({ ...formData, sbcDetails: newSbc });
  };

  const removeSbcEntry = (boreholeIndex, entryIndex) => {
    const newSbc = [...formData.sbcDetails];
    newSbc[boreholeIndex].splice(entryIndex, 1);
    setFormData({ ...formData, sbcDetails: newSbc });
  };

  // --- Lab Test Handlers ---
  const handleLabTestDepthChange = (boreholeIndex, depthIndex, field, val) => {
    const newResults = [...formData.labTestResults];
    const depthData = newResults[boreholeIndex][depthIndex];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      depthData[parent][child] = val;
    } else {
      depthData[field] = val;
    }
    setFormData({ ...formData, labTestResults: newResults });
  };

  const addLabTestDepth = (boreholeIndex) => {
    const newResults = [...formData.labTestResults];
    newResults[boreholeIndex].push({
      depth: '',
      bulkDensity: '',
      moistureContent: '',
      grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
      atterbergLimits: {
        liquidLimit: '',
        plasticLimit: '',
        plasticityIndex: '',
      },
      specificGravity: '',
      freeSwellIndex: '',
    });
    setFormData({ ...formData, labTestResults: newResults });
  };

  const removeLabTestDepth = (boreholeIndex, depthIndex) => {
    const newResults = [...formData.labTestResults];
    newResults[boreholeIndex].splice(depthIndex, 1);
    setFormData({ ...formData, labTestResults: newResults });
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white rounded-lg p-1 shadow-sm mb-4 flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="borehole"
            className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
            title="Manage borehole logs, sampling, and SPT data"
          >
            <FlaskConical className="w-4 h-4" /> Borehole
          </TabsTrigger>
          <TabsTrigger
            value="lab"
            className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
            title="Manage laboratory test results for soil samples"
          >
            <TestTube className="w-4 h-4" /> Lab Tests
          </TabsTrigger>
          <TabsTrigger
            value="sieve"
            className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
            title="Manage detailed grain size analysis data"
          >
            <Layers className="w-4 h-4" /> Sieve Analysis
          </TabsTrigger>
          <TabsTrigger
            value="subsoil"
            className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
            title="Manage sub-soil profile descriptions"
          >
            <ArrowDownFromLine className="w-4 h-4" /> Sub-Soil Profile
          </TabsTrigger>
          <TabsTrigger
            value="directshear"
            className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2"
            title="Manage direct shear test results"
          >
            <TestTube className="w-4 h-4" /> Direct Shear
          </TabsTrigger>
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
              {formData.boreholeLogs.map((logs, boreholeIndex) => (
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
                          className="h-8 text-xs w-full"
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
                            className="px-3 py-2 font-bold min-w-[150px]"
                            title="SPT blow counts for 15/30/45cm intervals"
                          >
                            SPT N Value
                          </th>
                          <th className="px-3 py-2 w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((depthData, depthIndex) => (
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
                                className="h-8"
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0.00"
                                title="To depth below ground level (m)"
                              />
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
                            <td className="px-2 py-2 relative overflow-visible">
                              <Input
                                value={depthData.soilType}
                                onChange={(e) => handleSoilSearch(e, boreholeIndex, depthIndex)}
                                onFocus={() => {
                                  setActiveSoilField({
                                    boreholeIndex,
                                    depthIndex,
                                  });
                                  setShowSoilSuggestions(true);
                                  setFilteredSoilTypes(
                                    soilTypes.filter((type) =>
                                      type
                                        .toLowerCase()
                                        .includes((depthData.soilType || '').toLowerCase())
                                    )
                                  );
                                }}
                                onBlur={() => setTimeout(() => setShowSoilSuggestions(false), 200)}
                                className="h-8 text-sm focus:ring-1 focus:ring-primary/30"
                                placeholder="Soil Type"
                                title="Visual soil or rock classification"
                              />
                              {showSoilSuggestions &&
                                activeSoilField?.boreholeIndex === boreholeIndex &&
                                activeSoilField?.depthIndex === depthIndex && (
                                  <div className="absolute z-[999] w-full min-w-[250px] bg-white border rounded-lg shadow-xl max-h-48 overflow-auto mt-1 left-0 ring-1 ring-black/5">
                                    {filteredSoilTypes.map((type, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 hover:bg-primary/5 hover:text-primary cursor-pointer text-xs transition-colors border-b last:border-0 border-gray-50"
                                        onClick={() =>
                                          selectSoilType(type, boreholeIndex, depthIndex)
                                        }
                                      >
                                        {type}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </td>
                            <td className="px-2 py-2">
                              {depthData.natureOfSampling === 'DS' ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-[10px] text-gray-400 font-medium italic bg-gray-50/50 rounded-md border border-dashed border-gray-200 px-2 text-center leading-tight">
                                  SPT Not Required for Disturbed Sampling (DS)
                                </div>
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
                        ))}
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
              ))}
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
              {formData.boreholeLogs.map((_, boreholeIndex) => (
                <div
                  key={boreholeIndex}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                >
                  <h4 className="text-sm font-bold text-gray-800 mb-3">
                    SBC - BH {boreholeIndex + 1}
                  </h4>
                  <div className="space-y-3">
                    {(formData.sbcDetails[boreholeIndex] || []).map((sbcData, entryIndex) => (
                      <div
                        key={entryIndex}
                        className="border border-gray-200 rounded-lg bg-white p-3"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            Entry {entryIndex + 1}
                          </span>
                          {formData.sbcDetails[boreholeIndex]?.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSbcEntry(boreholeIndex, entryIndex)}
                              className="text-red-500 h-7 w-7"
                              title="Remove this SBC entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                          {/* ── Footing Shape & Dimensions Group ── */}
                          {(() => {
                            const shape = sbcData.shapeOfFooting || '';
                            const isCircle = shape === 'Circle';
                            const isStrip = shape === 'Continous Strip';
                            const isSquare = shape === 'Square';
                            const isRectangle = shape === 'Rectangle';

                            // Determine dynamic label for the "width" dimension
                            const widthLabel = isCircle
                              ? 'Diameter of Foundation'
                              : isStrip
                                ? 'Strip Width'
                                : 'Width of Foundation';
                            const widthSymbol = isCircle
                              ? 'd \u00a0|\u00a0 m'
                              : 'B \u00a0|\u00a0 m';
                            const widthPlaceholder = 'm';

                            const showLength = !isCircle && !isStrip;

                            return (
                              <div className="col-span-4 border border-primary/20 bg-primary/5 rounded-lg p-3 mb-1">
                                <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">
                                  Footing Shape &amp; Dimensions
                                </p>
                                <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                                  {/* Shape selector — always first */}
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-gray-500">
                                      Shape of Footing
                                    </Label>
                                    <Select
                                      value={shape}
                                      onValueChange={(val) =>
                                        handleSbcChange(
                                          boreholeIndex,
                                          entryIndex,
                                          'shapeOfFooting',
                                          val
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-full">
                                        <SelectValue placeholder="Select shape" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Rectangle">Rectangle</SelectItem>
                                        <SelectItem value="Square">Square</SelectItem>
                                        <SelectItem value="Circle">Circle</SelectItem>
                                        <SelectItem value="Continous Strip">
                                          Continuous Strip
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Width / Diameter / Strip Width */}
                                  {shape && (
                                    <div className="flex flex-col gap-1">
                                      <Label className="text-xs text-gray-500 flex flex-col">
                                        <span>{widthLabel}</span>
                                        <span className="text-[10px] text-gray-400 italic">
                                          {widthSymbol}
                                        </span>
                                      </Label>
                                      <Input
                                        value={sbcData.width || ''}
                                        onChange={(e) =>
                                          handleSbcChange(
                                            boreholeIndex,
                                            entryIndex,
                                            'width',
                                            e.target.value
                                          )
                                        }
                                        className="h-8"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder={widthPlaceholder}
                                      />
                                    </div>
                                  )}

                                  {/* Length — only for Rectangle or Square */}
                                  {showLength && shape && (
                                    <div className="flex flex-col gap-1">
                                      <Label className="text-xs text-gray-500 flex flex-col">
                                        <span>Length of Foundation</span>
                                        <span className="text-[10px] text-gray-400 italic">
                                          L &nbsp;|&nbsp; m
                                        </span>
                                      </Label>
                                      <Input
                                        value={sbcData.footingLength || ''}
                                        onChange={(e) =>
                                          handleSbcChange(
                                            boreholeIndex,
                                            entryIndex,
                                            'footingLength',
                                            e.target.value
                                          )
                                        }
                                        className={`h-8 ${isSquare ? 'bg-gray-50' : ''}`}
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder={
                                          isSquare ? 'Same as width (auto)' : 'Length (m)'
                                        }
                                        readOnly={isSquare}
                                        title={
                                          isSquare
                                            ? 'Square footing: length equals width automatically'
                                            : undefined
                                        }
                                      />
                                      {isSquare && (
                                        <span className="text-[10px] text-amber-600 italic">
                                          Square footing — length equals width
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Footing size note when nothing selected */}
                                  {!shape && (
                                    <div className="col-span-3 flex items-center text-[11px] text-gray-400 italic">
                                      Select a shape to enter dimensions
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Foundation</Label>
                            <Select
                              value={sbcData.foundation || ''}
                              onValueChange={(val) =>
                                handleSbcChange(boreholeIndex, entryIndex, 'foundation', val)
                              }
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue placeholder="Select foundation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Isolated (Open)">Isolated (Open)</SelectItem>
                                <SelectItem value="Raft">Raft</SelectItem>
                                <SelectItem value="Pile">Pile</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Structure</Label>
                            <Input
                              value={sbcData.structure || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'structure',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              placeholder="Structure"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Location</Label>
                            <Input
                              value={sbcData.chainage || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'chainage',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              placeholder="Location"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Foundation Depth from GL</span>
                              <span className="text-[10px] text-gray-400 italic">
                                D &nbsp;|&nbsp; m
                              </span>
                            </Label>
                            <Input
                              value={sbcData.depthFromGL || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'depthFromGL',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="m"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Foundation RL</span>
                              <span className="text-[10px] text-gray-400 italic">m</span>
                            </Label>
                            <Input
                              value={sbcData.scourDepthFromGL || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'scourDepthFromGL',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="m"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Strata</Label>
                            <Input
                              value={sbcData.strata || ''}
                              onChange={(e) =>
                                handleSbcChange(boreholeIndex, entryIndex, 'strata', e.target.value)
                              }
                              className="h-8"
                              placeholder="Strata"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Field N Value</span>
                              <span className="text-[10px] text-gray-400 italic">
                                dimensionless
                              </span>
                            </Label>
                            <Input
                              value={sbcData.fieldNValue || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'fieldNValue',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="Field N Value"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Type of Correction</Label>
                            <Select
                              value={sbcData.typeOfCorrection || ''}
                              onValueChange={(val) =>
                                handleSbcChange(boreholeIndex, entryIndex, 'typeOfCorrection', val)
                              }
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue placeholder="Select correction" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="No Correction">No Correction</SelectItem>
                                <SelectItem value="Over burden Correction">
                                  Over burden Correction
                                </SelectItem>
                                <SelectItem value="Dilatancy Correction">
                                  Dilatancy Correction
                                </SelectItem>
                                <SelectItem value="Both Corrections">Both Corrections</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(() => {
                            const { value: nVal, formula } = computeCorrectedSPT(
                              sbcData,
                              overburdenRows
                            );
                            const { cf, formula: cfFormula } = lookupCorrectionFactor(
                              overburdenRows,
                              sbcData.depthFromGL
                            );
                            const hasN = sbcData.fieldNValue !== '' && sbcData.fieldNValue != null;
                            return (
                              <>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-gray-500 flex flex-col">
                                    <span>Correction Factor (CF)</span>
                                    <span className="text-[10px] text-gray-400 italic">
                                      dimensionless
                                    </span>
                                  </Label>
                                  {hasN && cfFormula && (
                                    <span className="text-[10px] text-gray-400 italic">
                                      {cfFormula}
                                    </span>
                                  )}
                                  <div className="h-8 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 select-none">
                                    <span className="text-sm font-semibold text-primary tabular-nums">
                                      {hasN ? cf.toFixed(3) : '-'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-gray-500 flex flex-col">
                                    <span>Corrected SPT N Value (NR)</span>
                                    <span className="text-[10px] text-gray-400 italic">
                                      dimensionless
                                    </span>
                                  </Label>
                                  {formula && (
                                    <span className="text-[10px] text-gray-400 italic">
                                      {formula}
                                    </span>
                                  )}
                                  <div className="h-8 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 select-none">
                                    <span className="text-sm font-semibold text-primary tabular-nums">
                                      {nVal}
                                    </span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>CP Layer Thickness</span>
                              <span className="text-[10px] text-gray-400 italic">m</span>
                            </Label>
                            <Input
                              value={sbcData.cpLayerThickness || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'cpLayerThickness',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="m"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Liquid Limit</span>
                              <span className="text-[10px] text-gray-400 italic">%</span>
                            </Label>
                            <Input
                              value={sbcData.liquidLimit || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'liquidLimit',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="%"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Angle of Inclination of Foundation</span>
                              <span className="text-[10px] text-gray-400 italic">
                                α &nbsp;|&nbsp; deg
                              </span>
                            </Label>
                            <Input
                              value={sbcData.foundationInclinationAngle || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'foundationInclinationAngle',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="-90"
                              max="90"
                              step="0.1"
                              placeholder="deg"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Scour Depth from Ground Level</span>
                              <span className="text-[10px] text-gray-400 italic">
                                ds &nbsp;|&nbsp; m
                              </span>
                            </Label>
                            <Input
                              value={sbcData.scourDepth || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'scourDepth',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="m"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Depth of Ground Water Level</span>
                              <span className="text-[10px] text-gray-400 italic">
                                Dw &nbsp;|&nbsp; m
                              </span>
                            </Label>
                            <Input
                              value={sbcData.depthOfGroundWaterLevel || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'depthOfGroundWaterLevel',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="m"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Considered Angle of Friction</span>
                              <span className="text-[10px] text-gray-400 italic">
                                ϕ &nbsp;|&nbsp; deg
                              </span>
                            </Label>
                            <Input
                              value={sbcData.consideredAngleOfFriction || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'consideredAngleOfFriction',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="deg"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Bulk Unit Weight</span>
                              <span className="text-[10px] text-gray-400 italic">
                                γ &nbsp;|&nbsp; kN/m³
                              </span>
                            </Label>
                            <Input
                              value={sbcData.bulkUnitWeight || ''}
                              onChange={(e) =>
                                handleSbcChange(
                                  boreholeIndex,
                                  entryIndex,
                                  'bulkUnitWeight',
                                  e.target.value
                                )
                              }
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="kN/m³"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500 flex flex-col">
                              <span>Effective Unit Weight</span>
                              <span className="text-[10px] text-gray-400 italic">
                                γ<sub>sub</sub> &nbsp;|&nbsp; kN/m³
                              </span>
                            </Label>
                            {sbcData.bulkUnitWeight !== '' && sbcData.bulkUnitWeight != null && (
                              <span className="text-[10px] text-gray-400 italic">
                                γ' = γ − 10 = {sbcData.bulkUnitWeight} − 10
                              </span>
                            )}
                            <div className="h-8 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 select-none">
                              <span className="text-sm font-semibold text-primary tabular-nums">
                                {sbcData.bulkUnitWeight !== '' && sbcData.bulkUnitWeight != null
                                  ? Math.max(0, parseFloat(sbcData.bulkUnitWeight) - 10).toFixed(3)
                                  : '-'}
                              </span>
                              {sbcData.bulkUnitWeight !== '' && sbcData.bulkUnitWeight != null && (
                                <span className="ml-1 text-[10px] text-gray-400">kN/m³</span>
                              )}
                            </div>
                          </div>
                          {/* Computed fields */}
                          {(() => {
                            const { value: dfVal, formula: dfFormula } =
                              computeDepthBelowScour(sbcData);
                            const { value: dfzVal, formula: dfzFormula } =
                              computeDepthFailureZone(sbcData);
                            const { value: phiPrimeVal, formula: phiPrimeFormula } =
                              computeReducedFriction(sbcData);
                            const { value: qVal, formula: qFormula } =
                              computeEffectiveOverburden(sbcData);
                            return (
                              <>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-gray-500 flex flex-col">
                                    <span>Depth of Foundation Below Scour Level</span>
                                    <span className="text-[10px] text-gray-400 italic">
                                      Df &nbsp;|&nbsp; m
                                    </span>
                                  </Label>
                                  {dfFormula && (
                                    <span className="text-[10px] text-gray-400 italic">
                                      {dfFormula}
                                    </span>
                                  )}
                                  <div className="h-8 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 select-none">
                                    <span className="text-sm font-semibold text-primary tabular-nums">
                                      {dfVal}
                                    </span>
                                    {dfVal !== '-' && (
                                      <span className="ml-1 text-[10px] text-gray-400">m</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-gray-500 flex flex-col">
                                    <span>Depth of Failure Zone</span>
                                    <span className="text-[10px] text-gray-400 italic">
                                      Dfz &nbsp;|&nbsp; m
                                    </span>
                                  </Label>
                                  {dfzFormula && (
                                    <span className="text-[10px] text-gray-400 italic">
                                      {dfzFormula}
                                    </span>
                                  )}
                                  <div className="h-8 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 select-none">
                                    <span className="text-sm font-semibold text-primary tabular-nums">
                                      {dfzVal}
                                    </span>
                                    {dfzVal !== '-' && (
                                      <span className="ml-1 text-[10px] text-gray-400">m</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-gray-500 flex flex-col">
                                    <span>Reduced Angle of Friction</span>
                                    <span className="text-[10px] text-gray-400 italic">
                                      ϕ&apos; &nbsp;|&nbsp; deg
                                    </span>
                                  </Label>
                                  {phiPrimeFormula && (
                                    <span className="text-[10px] text-gray-400 italic">
                                      {phiPrimeFormula}
                                    </span>
                                  )}
                                  <div className="h-8 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 select-none">
                                    <span className="text-sm font-semibold text-primary tabular-nums">
                                      {phiPrimeVal}
                                    </span>
                                    {phiPrimeVal !== '-' && (
                                      <span className="ml-1 text-[10px] text-gray-400">deg</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-gray-500 flex flex-col">
                                    <span>Effective Overburden Pressure</span>
                                    <span className="text-[10px] text-gray-400 italic">
                                      q &nbsp;|&nbsp; kN/m²
                                    </span>
                                  </Label>
                                  {qFormula && (
                                    <span className="text-[10px] text-gray-400 italic">
                                      {qFormula}
                                    </span>
                                  )}
                                  <div className="h-8 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 select-none">
                                    <span className="text-sm font-semibold text-primary tabular-nums">
                                      {qVal}
                                    </span>
                                    {qVal !== '-' && (
                                      <span className="ml-1 text-[10px] text-gray-400">kN/m²</span>
                                    )}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                    {(!formData.sbcDetails[boreholeIndex] ||
                      formData.sbcDetails[boreholeIndex].length === 0) && (
                      <div className="px-3 py-6 text-center text-gray-400 italic text-xs border border-dashed border-gray-200 rounded-lg">
                        No entries. Click "Add Entry" to begin.
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSbcEntry(boreholeIndex)}
                    className="text-primary h-8 mt-3"
                    title="Add a new SBC entry"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Entry
                  </Button>
                </div>
              ))}
              {formData.boreholeLogs.length === 0 && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 italic">
                  Add a borehole to enter SBC details.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* SIEVE ANALYSIS TAB */}
        <TabsContent value="sieve" className="mt-0 space-y-4">
          <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-100">
            <h3 className="text-md font-bold text-gray-800 mb-1 pb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Sieve Analysis
            </h3>
            <p className="text-[11px] text-gray-500 mb-4 italic">
              Enter weight retained (gms) for each sieve size. % Weight Retained, % Cumulative
              Weight Retained, and % Fines Passing are computed automatically in the report.
            </p>
            <div className="space-y-4">
              {formData.grainSizeAnalysis.map((logs, boreholeIndex) => (
                <div
                  key={boreholeIndex}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-800">
                      Sieve Analysis - BH {boreholeIndex + 1}
                    </h4>
                  </div>
                  <div className="border rounded-lg bg-white mb-4 overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
                      <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/50 border-b">
                        <tr>
                          <th className="px-3 py-2 font-bold w-20">Depth (m)</th>
                          <th className="px-2 py-2 font-bold text-center">Total Wt. (g)</th>
                          <th className="px-2 py-2 font-bold text-center">10mm</th>
                          <th className="px-2 py-2 font-bold text-center">4.75mm</th>
                          <th className="px-2 py-2 font-bold text-center">2.36mm</th>
                          <th className="px-2 py-2 font-bold text-center">2mm</th>
                          <th className="px-2 py-2 font-bold text-center">1.18mm</th>
                          <th className="px-2 py-2 font-bold text-center">0.60mm</th>
                          <th className="px-2 py-2 font-bold text-center">0.425mm</th>
                          <th className="px-2 py-2 font-bold text-center">0.30mm</th>
                          <th className="px-2 py-2 font-bold text-center">0.15mm</th>
                          <th className="px-2 py-2 font-bold text-center">0.075mm</th>
                          <th className="px-2 py-2 font-bold text-center">Pan</th>
                          <th className="px-2 py-2 w-[50px]"></th>
                        </tr>
                        <tr className="text-[10px] text-gray-400 border-b">
                          <td className="px-3 py-1 italic">depth</td>
                          <td className="px-2 py-1 text-center italic">sample wt.</td>
                          {[
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
                          ].map((k) => (
                            <td key={k} className="px-2 py-1 text-center italic">
                              Wt. Ret. (g)
                            </td>
                          ))}
                          <td></td>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((depthData, depthIndex) => (
                          <tr key={depthIndex} className="border-b">
                            <td className="px-2 py-2">
                              <Input
                                value={depthData.depth}
                                onChange={(e) =>
                                  handleGrainSizeChange(
                                    boreholeIndex,
                                    depthIndex,
                                    'depth',
                                    e.target.value
                                  )
                                }
                                className="h-8 w-16"
                                title="Depth (m)"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <Input
                                value={depthData.totalWeight ?? ''}
                                onChange={(e) =>
                                  handleGrainSizeChange(
                                    boreholeIndex,
                                    depthIndex,
                                    'totalWeight',
                                    e.target.value
                                  )
                                }
                                className="h-8 text-center"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="gms"
                                title="Total weight of sample taken for the test (g)"
                              />
                            </td>
                            {[
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
                            ].map((key) => (
                              <td key={key} className="px-1 py-2">
                                <Input
                                  value={depthData[key] ?? ''}
                                  onChange={(e) =>
                                    handleGrainSizeChange(
                                      boreholeIndex,
                                      depthIndex,
                                      key,
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="gms"
                                  title="Weight retained (gms)"
                                />
                              </td>
                            ))}
                            <td className="px-2 py-2">
                              {logs.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeGrainSizeDepth(boreholeIndex, depthIndex)}
                                  className="text-red-500"
                                  title="Remove this sieve analysis entry"
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
                    onClick={() => addGrainSizeDepth(boreholeIndex)}
                    className="text-primary"
                    title="Add a new depth for sieve analysis"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Depth
                  </Button>
                </div>
              ))}
              {formData.boreholeLogs.length === 0 && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 italic">
                  Add a borehole in the 'Borehole' tab to enter sieve analysis details.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* LAB TAB */}
        <TabsContent value="lab" className="mt-0 space-y-4">
          <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-100">
            <h3 className="text-md font-bold text-gray-800 mb-1 pb-1 flex items-center gap-2">
              <TestTube className="w-4 h-4 text-primary" />
              Lab Test Results
            </h3>
            <p className="text-[11px] text-gray-500 mb-4 italic">
              Record laboratory analysis including soil density, moisture, grain size distribution,
              and consistency limits.
            </p>
            <div className="space-y-4">
              {formData.labTestResults.map((logs, boreholeIndex) => (
                <div
                  key={boreholeIndex}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-800">
                      Lab Tests - BH {boreholeIndex + 1}
                    </h4>
                  </div>
                  <div className="border rounded-lg bg-white mb-4 overflow-visible">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/50 border-b">
                        <tr>
                          <th className="px-3 py-2 font-bold">Depth</th>
                          <th className="px-3 py-2 font-bold">Density/Moisture</th>
                          <th className="px-3 py-2 font-bold">Grain Size (G/S/SC)</th>
                          <th className="px-3 py-2 font-bold">Atterberg (LL/PL/PI)</th>
                          <th className="px-3 py-2 font-bold">SG/FSI</th>
                          <th className="px-3 py-2 w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((depthData, depthIndex) => (
                          <tr key={depthIndex} className="border-b">
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
                              <Input
                                value={depthData.moistureContent}
                                onChange={(e) =>
                                  handleLabTestDepthChange(
                                    boreholeIndex,
                                    depthIndex,
                                    'moistureContent',
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="Moisture Content"
                                title="Ratio of water weight to soil solids weight (%)"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
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
                                  className="h-8"
                                  placeholder="G"
                                  title="Gravel percentage (%)"
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
                                  className="h-8"
                                  placeholder="S"
                                  title="Sand percentage (%)"
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
                                  className="h-8"
                                  placeholder="SC"
                                  title="Silt and Clay percentage (%)"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
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
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                value={depthData.specificGravity}
                                onChange={(e) =>
                                  handleLabTestDepthChange(
                                    boreholeIndex,
                                    depthIndex,
                                    'specificGravity',
                                    e.target.value
                                  )
                                }
                                className="h-8 mb-1"
                                placeholder="SG"
                                title="Specific Gravity of soil solids"
                              />
                              <Input
                                value={depthData.freeSwellIndex}
                                onChange={(e) =>
                                  handleLabTestDepthChange(
                                    boreholeIndex,
                                    depthIndex,
                                    'freeSwellIndex',
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="FSI"
                                title="Free Swell Index indicating expansion potential (%)"
                              />
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
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 italic">
                  Add a borehole in the 'Borehole' tab to enter lab test results.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* SUB-SOIL PROFILE TAB */}
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
