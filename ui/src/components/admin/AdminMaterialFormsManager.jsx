import React, { useState, useEffect } from 'react';
import { useMaterials } from '@/contexts/MaterialsContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SwatchBook,
  Settings,
  Eye,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Ruler,
  Table2,
  ShieldAlert,
  Search,
  Box,
  Calculator,
  Building2,
} from 'lucide-react';

import GeotechTestForm from './GeotechTestForm';
import ConcreteCubeModal from './ConcreteCubeModal';
import ActCubeModal from './ActCubeModal';
import ConcreteCoreModal from './ConcreteCoreModal';
import PaverBlockModal from './PaverBlockModal';
import { SAMPLE_CUBE_TEST_DATA } from '@/utils/cubeTestCalculation';
import { SAMPLE_ACT_CUBE_TEST_DATA } from '@/utils/actCubeTestCalculation';
import { SAMPLE_CONCRETE_CORE_TEST_DATA } from '@/utils/concreteCoreTestCalculation';
import { SAMPLE_PAVER_BLOCK_TEST_DATA } from '@/utils/paverBlockTestCalculation';

const FORM_TYPES = [
  {
    id: 'geotech',
    name: 'Geotechnical Inputs',
    description:
      'Applicable for material type "Soil and Rock". Includes borehole logs, lab tests (with grain size / sieve analysis), sub-soil profile, and direct shear.',
  },
  {
    id: 'rock',
    name: 'Rock Analysis Inputs',
    description:
      'Applicable for material type "Rock". Includes rock formations, grade classification, properties, and bearing capacity.',
  },
  {
    id: 'cube',
    name: 'Concrete Cube Inputs',
    description:
      'Applicable for material inward type "Cube" / "Concrete Cube". Includes 150mm specimen dimensions, casting & testing dates, failure load, compressive strength with nearest 0.5 rounding per IS 516 (part 1/Sec 1): 2021.',
  },
  {
    id: 'actcube',
    name: 'ACT Cube Inputs',
    description:
      'Applicable for material inward type "ACT Cube" / "Accelerated Curing Test Cube". Includes IS 9013 accelerated curing correlation and IS 516 compressive strength prediction.',
  },
  {
    id: 'concretecore',
    name: 'Concrete Core Inputs',
    description:
      'Applicable for material inward type "Concrete core" / "Core". Includes IS 516 (part 4) : 2018 cylinder strength, L/D and diameter shape corrections, and equivalent cube strength.',
  },
  {
    id: 'paverblock',
    name: 'Paver Block Inputs',
    description:
      'Applicable for material inward type "Paver block" / "Paver". Includes IS 15658 : 2021 Compressive Strength with Table 5 thickness & chamfer correction factors, and Water Absorption.',
  },
];

const DUMMY_GEOTECH_VALUE = {
  entryMode: 'Manual Augering',
  rlValuesNote: 'R.L. Values are assumed.',
  boreholeLogs: [
    [
      {
        depthFrom: '0',
        depthTo: '0.5',
        samplingType: 'DS',
        soilDescription: 'Top soil',
        sptN1: '',
        sptN2: '',
        sptN3: '',
        sptNValue: '',
      },
      {
        depthFrom: '0.5',
        depthTo: '1.5',
        samplingType: 'SPT',
        soilDescription: 'Filled-up Soil',
        sptN1: '7',
        sptN2: '7',
        sptN3: '10',
        sptNValue: '17',
      },
      {
        depthFrom: '1.5',
        depthTo: '3',
        samplingType: 'SPT',
        soilDescription: 'Brownish Gravelly Soil',
        sptN1: '26',
        sptN2: '50',
        sptN3: '50',
        sptNValue: '100',
      },
    ],
  ],
  maxDepths: ['3'],
  latitudes: ['NA'],
  longitudes: ['NA'],
  labTestResults: [
    [
      {
        depth: '0.5',
        moistureContent: '15.8',
        bulkDensity: '-',
        dryDensity: '-',
        specificGravity: '2.52',
        freeSwellIndex: 'NIL',
        liquidLimit: '-',
        plasticLimit: '-',
        plasticityIndex: '-',
        grainSizeDistribution: { gravel: '0', sand: '36.70', siltAndClay: '63.30' },
      },
      {
        depth: '1.5',
        moistureContent: '12.6',
        bulkDensity: '-',
        dryDensity: '-',
        specificGravity: '2.78',
        freeSwellIndex: 'NIL',
        liquidLimit: '31',
        plasticLimit: 'NP',
        plasticityIndex: '-',
        grainSizeDistribution: { gravel: '0.30', sand: '58.50', siltAndClay: '41.20' },
      },
    ],
  ],
  sbcDetails: [
    [
      {
        foundationType: 'Soil',
        footingShape: 'Rectangle',
        soilType: 'Soil',
        footingWidth: '2',
        footingLength: '3',
        foundationDepth: '1.5',
        scourDepth: '0',
        bulkUnitWeight: '18',
        cohesion: '20',
        frictionAngle: '30',
        inclinationAngle: '8',
        factorOfSafety: '3',
        sptCorrection: 'Dilatancy only',
        footingType: 'Isolated (25 mm)',
        fieldSptN: '50',
        imposedLoadPressure: '291.79',
        compressibleLayerHeight: '4',
        liquidLimit: '45',
      },
    ],
  ],
  grainSizeAnalysis: [
    [
      {
        depth: '0.5',
        sampleWeight: '100',
        wt10mm: '0.00',
        wt4_75mm: '0.00',
        wt2_36mm: '0.95',
        wt2mm: '1.00',
        wt1_18mm: '5.25',
        wt0_60mm: '8.30',
        wt0_425mm: '3.36',
        wt0_30mm: '7.94',
        wt0_15mm: '1.11',
        wt0_075mm: '8.81',
        wtPan: '62.45',
      },
      {
        depth: '1.5',
        sampleWeight: '100',
        wt10mm: '0.00',
        wt4_75mm: '0.30',
        wt2_36mm: '1.64',
        wt2mm: '1.60',
        wt1_18mm: '9.16',
        wt0_60mm: '12.75',
        wt0_425mm: '4.03',
        wt0_30mm: '10.78',
        wt0_15mm: '5.25',
        wt0_075mm: '13.25',
        wtPan: '40.44',
      },
    ],
  ],
  subSoilProfile: [
    [
      { depth: '0.5', description: 'Top soil' },
      { depth: '1.5', description: 'Sandy silt' },
      { depth: '3.0', description: 'Silty sand' },
    ],
  ],
};

const DUMMY_ROCK_VALUE = {
  entryMode: 'Manual Augering',
  rlValuesNote: 'R.L. Values are assumed.',
  boreholeLogs: [
    [
      {
        depthFrom: '0',
        depthTo: '0.5',
        samplingType: 'DS',
        soilDescription: 'Top soil',
        sptNValue: '',
      },
      {
        depthFrom: '0.5',
        depthTo: '1.5',
        samplingType: 'SPT',
        soilDescription: 'Filled-up Soil',
        sptNValue: '',
      },
    ],
  ],
  maxDepths: ['4'],
  latitudes: ['NA'],
  longitudes: ['NA'],
  labTestResults: [
    [
      {
        depth: '4.50',
        moistureContent: '-',
        bulkDensity: '2.30',
        dryDensity: '-',
        specificGravity: '2.65',
        freeSwellIndex: 'NIL',
        liquidLimit: '-',
        plasticLimit: '-',
        plasticityIndex: '-',
        grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
        pointLoadIndex: {
          dateOfTesting: '2026-09-17',
          testingType: 'Unsoaked',
          boreholeNo: 'BH-1',
          observations: [
            {
              coreNo: '1',
              depthFrom: '4.50',
              depthTo: '6.00',
              dia: '57.49',
              length: '73.71',
              weight: '441.00',
              area: '2595.82',
              volume: '191337.85',
              density: '2.30',
              loadKn: '3.62',
              pli: '1.17',
            },
            {
              coreNo: '2',
              depthFrom: '7.50',
              depthTo: '9.00',
              dia: '56.95',
              length: '62.08',
              weight: '368.50',
              area: '2547.61',
              volume: '158155.88',
              density: '2.33',
              loadKn: '2.88',
              pli: '0.95',
            },
          ],
          avgPli: '1.06',
          avgDensity: '2.32',
          reportedPli: '1.17',
        },
        ucs: {
          dateOfTesting: '2026-09-17',
          testingType: 'Unsoaked',
          boreholeNo: 'BH-1',
          observations: [
            {
              coreNo: '1',
              depthFrom: '6.00',
              depthTo: '7.50',
              dia: '57.04',
              length: '110.04',
              weight: '740.50',
              area: '2555.34',
              volume: '281189.76',
              density: '2.63',
              ldRatio: '1.93',
              correctionFactor: '0.99',
              loadKn: '39.35',
              ucs: '15.28',
            },
            {
              coreNo: '2',
              depthFrom: '7.50',
              depthTo: '9.00',
              dia: '56.98',
              length: '115.64',
              weight: '753.00',
              area: '2549.97',
              volume: '294878.33',
              density: '2.55',
              ldRatio: '2.03',
              correctionFactor: '1.00',
              loadKn: '56.16',
              ucs: '22.02',
            },
          ],
          avgUcs: '18.65',
          avgDensity: '2.59',
          reportedUcs: '15.28',
        },
      },
    ],
  ],
  sbcDetails: [
    [
      {
        foundationType: 'Rock',
        footingShape: 'Rectangle',
        soilType: 'Soil',
        footingWidth: '',
        footingLength: '',
        foundationDepth: '',
        scourDepth: '',
        bulkUnitWeight: '',
        cohesion: '',
        frictionAngle: '',
        inclinationAngle: '',
        factorOfSafety: '',
        sptCorrection: 'Dilatancy only',
        footingType: 'Isolated (25 mm)',
        fieldSptN: '',
        imposedLoadPressure: '',
        compressibleLayerHeight: '',
        liquidLimit: '',
      },
    ],
  ],
  grainSizeAnalysis: [
    [
      {
        depth: '',
        sampleWeight: '',
        wt10mm: '',
        wt4_75mm: '',
        wt2_36mm: '',
        wt2mm: '',
        wt1_18mm: '',
        wt0_60mm: '',
        wt0_425mm: '',
        wt0_30mm: '',
        wt0_15mm: '',
        wt0_075mm: '',
        wtPan: '',
      },
    ],
  ],
  subSoilProfile: [
    [
      { depth: '0.5', description: 'Top soil' },
      { depth: '1.5', description: 'Clayey sand' },
      { depth: '3', description: 'Clayey sand' },
      { depth: '4', description: 'Clayey sand' },
    ],
  ],
};

const AdminMaterialFormsManager = () => {
  const { materials, materialFormAssociations, saveFormAssociations, loading } = useMaterials();
  const { toast } = useToast();

  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [selectedForms, setSelectedForms] = useState([]);
  const [activePreviewTab, setActivePreviewTab] = useState('geotech');
  const [previewCubeModalOpen, setPreviewCubeModalOpen] = useState(false);
  const [previewActCubeModalOpen, setPreviewActCubeModalOpen] = useState(false);
  const [previewConcreteCoreModalOpen, setPreviewConcreteCoreModalOpen] = useState(false);
  const [previewPaverBlockModalOpen, setPreviewPaverBlockModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');

  const currentMaterial = materials.find((m) => String(m.id) === String(selectedMaterialId));

  // Set initial selected material
  useEffect(() => {
    if (materials.length > 0 && !selectedMaterialId) {
      setSelectedMaterialId(materials[0].id);
    }
  }, [materials, selectedMaterialId]);

  // Load associations for the selected material
  useEffect(() => {
    if (selectedMaterialId && currentMaterial) {
      const associated = materialFormAssociations
        .filter((a) => String(a.material_id) === String(selectedMaterialId))
        .map((a) => a.form_type);
      setSelectedForms(associated);
    }
  }, [selectedMaterialId, currentMaterial, materialFormAssociations]);

  const handleToggleForm = (formId) => {
    setSelectedForms((prev) =>
      prev.includes(formId) ? prev.filter((id) => id !== formId) : [...prev, formId]
    );
  };

  const handleSave = async () => {
    if (!selectedMaterialId) return;
    setIsSaving(true);
    try {
      await saveFormAssociations(selectedMaterialId, selectedForms);
      toast({
        title: 'Associations Saved',
        description: 'Material to testing form associations updated successfully.',
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to save associations: ' + err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && materials.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading form configuration...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Materials Sidebar (Left) */}
      <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <SwatchBook className="w-4 h-4 text-primary" /> Materials List
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={materialSearch}
            onChange={(e) => setMaterialSearch(e.target.value)}
            placeholder="Search materials..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-gray-400"
          />
        </div>
        <div className="space-y-1.5">
          {materials
            .filter((m) => m.name.toLowerCase().includes(materialSearch.toLowerCase().trim()))
            .map((m) => {
              const isSelected = String(m.id) === String(selectedMaterialId);
              const count = materialFormAssociations.filter(
                (a) =>
                  String(a.material_id) === String(m.id) &&
                  FORM_TYPES.some((ft) => ft.id === a.form_type)
              ).length;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMaterialId(m.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between ${
                    isSelected
                      ? 'bg-primary text-white font-bold shadow-md shadow-primary/20 scale-[1.01]'
                      : 'bg-gray-50/50 hover:bg-gray-100/70 text-gray-700 font-medium'
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-500 font-bold'
                      }`}
                    >
                      {count} {count === 1 ? 'form' : 'forms'}
                    </span>
                  )}
                </button>
              );
            })}
          {materials.filter((m) =>
            m.name.toLowerCase().includes(materialSearch.toLowerCase().trim())
          ).length === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-3">
              No materials match "{materialSearch}"
            </p>
          )}
        </div>
      </div>

      {/* Configuration & Previews (Right) */}
      <div className="lg:col-span-8 space-y-6">
        {currentMaterial ? (
          <>
            {/* Form Association Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Form Association Settings
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                    Forms for: <span className="text-primary">{currentMaterial.name}</span>
                  </h2>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl px-6 self-start sm:self-center shadow-md shadow-primary/10"
                >
                  {isSaving ? 'Saving...' : 'Save Associations'}
                </Button>
              </div>

              {/* Form Types Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FORM_TYPES.map((ft) => {
                  const isChecked = selectedForms.includes(ft.id);
                  return (
                    <div
                      key={ft.id}
                      onClick={() => handleToggleForm(ft.id)}
                      className={`p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 select-none ${
                        isChecked
                          ? 'border-primary/40 bg-primary/5 shadow-sm cursor-pointer'
                          : 'border-gray-150 hover:bg-gray-50/50 cursor-pointer'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => {}} // Controlled by outer click
                        className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-800 cursor-pointer">
                          {ft.name}
                        </label>
                        <p className="text-xs text-gray-500 leading-relaxed">{ft.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Read-Only Form Preview Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Testing Data Entry Form Previews
                </h3>
              </div>

              <Tabs value={activePreviewTab} onValueChange={setActivePreviewTab} className="w-full">
                <TabsList className="bg-gray-50 p-1 border border-gray-150 rounded-xl h-auto inline-flex flex-wrap gap-1 mb-4 w-full justify-start">
                  {FORM_TYPES.map((ft) => (
                    <TabsTrigger
                      key={ft.id}
                      value={ft.id}
                      className="px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all"
                    >
                      {ft.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Previews Contents */}
                <div className="border border-gray-150 rounded-2xl p-6 bg-gray-50/50 min-h-[300px]">
                  {activePreviewTab === 'geotech' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 p-2.5 rounded-lg mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                          This is a live interactive preview of the Geotechnical Inputs form. Try
                          clicking the tabs to view the different forms.
                        </span>
                      </div>
                      <GeotechTestForm
                        materialCategory="Soil and Rock"
                        value={DUMMY_GEOTECH_VALUE}
                        enabledForms={['borehole', 'lab', 'subsoil', 'directshear']}
                        onChange={() => {}}
                      />
                    </div>
                  )}

                  {activePreviewTab === 'rock' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 p-2.5 rounded-lg mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                          This is a live interactive preview of the Rock Analysis Inputs form. Try
                          clicking the tabs to view the different forms.
                        </span>
                      </div>
                      <GeotechTestForm
                        materialCategory="Rock"
                        value={DUMMY_ROCK_VALUE}
                        enabledForms={['borehole', 'lab', 'subsoil', 'directshear']}
                        onChange={() => {}}
                      />
                    </div>
                  )}

                  {activePreviewTab === 'cube' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-600 text-white">
                            <Box className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-amber-900">
                              Concrete Cube Compressive Strength [IS 516 (part 1/Sec 1): 2021]
                            </h4>
                            <p className="text-xs text-amber-700 mt-0.5">
                              Standard 150mm cube test with nearest 0.5 N/mm² rounding on individual & average strengths.
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setPreviewCubeModalOpen(true)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-sm"
                        >
                          <Calculator className="w-4 h-4" />
                          Open Live Modal Preview
                        </Button>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Sample Data Preview (IS 516 Specimen Batch)
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            Avg Strength: 19.0 N/mm² (Grade: M20)
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                              <tr>
                                <th className="p-2 text-center">Trial</th>
                                <th className="p-2">ID</th>
                                <th className="p-2 text-center">Dimensions</th>
                                <th className="p-2 text-center">Age</th>
                                <th className="p-2 text-right">Weight (kg)</th>
                                <th className="p-2 text-right">Failure Load (kN)</th>
                                <th className="p-2 text-right bg-amber-50 text-amber-900 font-bold">
                                  Strength (N/mm²)
                                </th>
                                <th className="p-2 text-center">Failure Mode</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">1</td>
                                <td className="p-2 font-sans font-medium">Footing</td>
                                <td className="p-2 text-center">150×150×150</td>
                                <td className="p-2 text-center">7 days</td>
                                <td className="p-2 text-right">8.372</td>
                                <td className="p-2 text-right">396.160</td>
                                <td className="p-2 text-right font-bold text-amber-900 bg-amber-50/50">17.50</td>
                                <td className="p-2 text-center font-sans">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                    Satisfactory
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">2</td>
                                <td className="p-2 font-sans font-medium">Footing</td>
                                <td className="p-2 text-center">150×150×150</td>
                                <td className="p-2 text-center">7 days</td>
                                <td className="p-2 text-right">8.552</td>
                                <td className="p-2 text-right">433.236</td>
                                <td className="p-2 text-right font-bold text-amber-900 bg-amber-50/50">19.50</td>
                                <td className="p-2 text-center font-sans">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                    Satisfactory
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">3</td>
                                <td className="p-2 font-sans font-medium">Footing</td>
                                <td className="p-2 text-center">150×150×150</td>
                                <td className="p-2 text-center">7 days</td>
                                <td className="p-2 text-right">8.396</td>
                                <td className="p-2 text-right">440.967</td>
                                <td className="p-2 text-right font-bold text-amber-900 bg-amber-50/50">19.50</td>
                                <td className="p-2 text-center font-sans">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                    Satisfactory
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreviewTab === 'actcube' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-4 p-4 bg-teal-50 border border-teal-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-teal-600 text-white">
                            <Box className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-teal-900">
                              ACT (Accelerated Curing Test) Cube Compressive Strength [IS 9013 & IS 516]
                            </h4>
                            <p className="text-xs text-teal-700 mt-0.5">
                              Accelerated curing testing, IS 516 nearest 0.5 rounding, and IS 9013 28-day predicted strength (R₂₈ = 1.64 × Rₐ + 8.09).
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setPreviewActCubeModalOpen(true)}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5 shadow-sm"
                        >
                          <Calculator className="w-4 h-4" />
                          Open Live Modal Preview
                        </Button>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Sample Data Preview (IS 9013 Specimen Batch)
                          </span>
                          <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                            Predicted 28d Strength: 34.0 N/mm² (Grade: M25)
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                              <tr>
                                <th className="p-2 text-center">Trial</th>
                                <th className="p-2">ID</th>
                                <th className="p-2 text-center">Dimensions</th>
                                <th className="p-2 text-center">Age</th>
                                <th className="p-2 text-right">Weight (kg)</th>
                                <th className="p-2 text-right">Load (kN)</th>
                                <th className="p-2 text-right">Strength (N/mm²)</th>
                                <th className="p-2 text-right font-bold text-teal-900">Predicted 28d (N/mm²)</th>
                                <th className="p-2 text-center">Type of Failure</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-mono">
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">1</td>
                                <td className="p-2 font-sans font-medium">M25, Tm-06, Cement - 80%</td>
                                <td className="p-2 text-center">150×150×150</td>
                                <td className="p-2 text-center">1 day</td>
                                <td className="p-2 text-right">8.259</td>
                                <td className="p-2 text-right">365.250</td>
                                <td className="p-2 text-right">16.0</td>
                                <td className="p-2 text-right font-bold text-teal-900 bg-teal-50/50">34.33</td>
                                <td className="p-2 text-center font-sans">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                    Satisfactory
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">2</td>
                                <td className="p-2 font-sans font-medium">M25, Tm-06, Cement - 80%</td>
                                <td className="p-2 text-center">150×150×150</td>
                                <td className="p-2 text-center">1 day</td>
                                <td className="p-2 text-right">8.274</td>
                                <td className="p-2 text-right">341.800</td>
                                <td className="p-2 text-right">15.0</td>
                                <td className="p-2 text-right font-bold text-teal-900 bg-teal-50/50">32.69</td>
                                <td className="p-2 text-center font-sans">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                    Satisfactory
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">3</td>
                                <td className="p-2 font-sans font-medium">M25, Tm-06, Cement - 80%</td>
                                <td className="p-2 text-center">150×150×150</td>
                                <td className="p-2 text-center">1 day</td>
                                <td className="p-2 text-right">8.296</td>
                                <td className="p-2 text-right">359.605</td>
                                <td className="p-2 text-right">16.0</td>
                                <td className="p-2 text-right font-bold text-teal-900 bg-teal-50/50">34.33</td>
                                <td className="p-2 text-center font-sans">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                    Satisfactory
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreviewTab === 'concretecore' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-600 text-white">
                            <Box className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-900">
                              Concrete Core Compressive Strength Test [IS 516 (part 4) : 2018]
                            </h4>
                            <p className="text-xs text-blue-700 mt-0.5">
                              Core cylinder strength, H/D shape correction factor, and equivalent cube compressive strength.
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setPreviewConcreteCoreModalOpen(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm"
                        >
                          <Calculator className="w-4 h-4" />
                          Open Live Modal Preview
                        </Button>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Sample Data Preview (IS 516 Core Batch)
                          </span>
                          <span className="text-xs font-mono font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                            Avg Eq. Cube Strength: 36.0 N/mm² (Grade: M35)
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                              <tr>
                                <th className="p-2 text-center">Trial</th>
                                <th className="p-2">ID</th>
                                <th className="p-2 text-right">L (mm)</th>
                                <th className="p-2 text-right">Dia (mm)</th>
                                <th className="p-2 text-right">Weight (kg)</th>
                                <th className="p-2 text-right">Load (kN)</th>
                                <th className="p-2 text-right">Cyl. Str.</th>
                                <th className="p-2 text-right">L/D</th>
                                <th className="p-2 text-right">CF</th>
                                <th className="p-2 text-right font-bold text-blue-900">Corr. Cyl.</th>
                                <th className="p-2 text-right font-bold text-indigo-900">Eq. Cube</th>
                                <th className="p-2 text-center">Failure Type</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-mono">
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">1</td>
                                <td className="p-2 font-sans font-medium">Not furnished</td>
                                <td className="p-2 text-right">198.00</td>
                                <td className="p-2 text-right">145.00</td>
                                <td className="p-2 text-right">7.965</td>
                                <td className="p-2 text-right">512.910</td>
                                <td className="p-2 text-right">31.05</td>
                                <td className="p-2 text-right">1.37</td>
                                <td className="p-2 text-right">0.93</td>
                                <td className="p-2 text-right font-bold text-blue-900 bg-blue-50/40">29.75</td>
                                <td className="p-2 text-right font-bold text-indigo-900 bg-indigo-50/50">37.0</td>
                                <td className="p-2 text-center font-sans">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                    Satisfactory
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">2</td>
                                <td className="p-2 font-sans font-medium">Not furnished</td>
                                <td className="p-2 text-right">198.50</td>
                                <td className="p-2 text-right">141.92</td>
                                <td className="p-2 text-right">7.698</td>
                                <td className="p-2 text-right">462.322</td>
                                <td className="p-2 text-right">29.13</td>
                                <td className="p-2 text-right">1.40</td>
                                <td className="p-2 text-right">0.93</td>
                                <td className="p-2 text-right font-bold text-blue-900 bg-blue-50/40">28.02</td>
                                <td className="p-2 text-right font-bold text-indigo-900 bg-indigo-50/50">35.0</td>
                                <td className="p-2 text-center font-sans">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                    Satisfactory
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreviewTab === 'paverblock' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-indigo-50/70 p-4 rounded-xl border border-indigo-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-600 rounded-lg text-white shadow-sm">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-indigo-950">
                              Paver Block Testing Form [IS 15658 : 2021]
                            </h4>
                            <p className="text-xs text-indigo-700 mt-0.5">
                              Compressive strength with Table 5 correction factor & Water absorption.
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setPreviewPaverBlockModalOpen(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm"
                        >
                          <Calculator className="w-4 h-4" />
                          Open Live Modal Preview
                        </Button>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Sample Data Preview (IS 15658 Plain 80mm Batch)
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              Mean Corr. Strength: 41.2 N/mm²
                            </span>
                            <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                              Mean WA: 4.1%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                              <tr>
                                <th className="p-2 text-center">Trial</th>
                                <th className="p-2 text-right">L (mm)</th>
                                <th className="p-2 text-right">B (mm)</th>
                                <th className="p-2 text-right">W (mm)</th>
                                <th className="p-2 text-right">Area (mm²)</th>
                                <th className="p-2 text-right">Load (kN)</th>
                                <th className="p-2 text-right">Str (N/mm²)</th>
                                <th className="p-2 text-right">Table 5 Factor</th>
                                <th className="p-2 text-right font-bold text-emerald-900 bg-emerald-50/70">
                                  Corr. Str (N/mm²)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">1</td>
                                <td className="p-2 text-right">270</td>
                                <td className="p-2 text-right">200</td>
                                <td className="p-2 text-right">80</td>
                                <td className="p-2 text-right">54000</td>
                                <td className="p-2 text-right">1950.485</td>
                                <td className="p-2 text-right">36.12</td>
                                <td className="p-2 text-right text-indigo-700">1.12</td>
                                <td className="p-2 text-right font-bold text-emerald-900 bg-emerald-50/50">40.5</td>
                              </tr>
                              <tr>
                                <td className="p-2 text-center font-bold text-gray-400">2</td>
                                <td className="p-2 text-right">272</td>
                                <td className="p-2 text-right">192</td>
                                <td className="p-2 text-right">80</td>
                                <td className="p-2 text-right">52224</td>
                                <td className="p-2 text-right">1975.265</td>
                                <td className="p-2 text-right">37.82</td>
                                <td className="p-2 text-right text-indigo-700">1.12</td>
                                <td className="p-2 text-right font-bold text-emerald-900 bg-emerald-50/50">42.4</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="bg-white p-8 text-center text-gray-400 italic rounded-2xl border border-gray-100 shadow-sm">
            Select a material from the list to manage form associations.
          </div>
        )}
      </div>

      {previewCubeModalOpen && (
        <ConcreteCubeModal
          isOpen={previewCubeModalOpen}
          onClose={() => setPreviewCubeModalOpen(false)}
          sampleCode="DEMO-CUBE-01"
          jobCode="JOB-DEMO-2026"
          initialData={SAMPLE_CUBE_TEST_DATA}
          onApply={() => setPreviewCubeModalOpen(false)}
        />
      )}

      {previewActCubeModalOpen && (
        <ActCubeModal
          isOpen={previewActCubeModalOpen}
          onClose={() => setPreviewActCubeModalOpen(false)}
          sampleCode="DEMO-ACT-01"
          jobCode="JOB-DEMO-2026"
          initialData={SAMPLE_ACT_CUBE_TEST_DATA}
          onApply={() => setPreviewActCubeModalOpen(false)}
        />
      )}

      {previewConcreteCoreModalOpen && (
        <ConcreteCoreModal
          isOpen={previewConcreteCoreModalOpen}
          onClose={() => setPreviewConcreteCoreModalOpen(false)}
          sampleCode="DEMO-CORE-01"
          jobCode="JOB-DEMO-2026"
          initialData={SAMPLE_CONCRETE_CORE_TEST_DATA}
          onApply={() => setPreviewConcreteCoreModalOpen(false)}
        />
      )}

      {previewPaverBlockModalOpen && (
        <PaverBlockModal
          isOpen={previewPaverBlockModalOpen}
          onClose={() => setPreviewPaverBlockModalOpen(false)}
          sampleCode="DEMO-PAVER-01"
          jobCode="JOB-DEMO-2026"
          initialData={SAMPLE_PAVER_BLOCK_TEST_DATA}
          onApply={() => setPreviewPaverBlockModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminMaterialFormsManager;
