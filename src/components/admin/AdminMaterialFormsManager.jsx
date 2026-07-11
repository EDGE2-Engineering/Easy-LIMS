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
} from 'lucide-react';

import GeotechTestForm from './GeotechTestForm';

const FORM_TYPES = [
  {
    id: 'geotech',
    name: 'Geotechnical Inputs',
    description:
      'Applicable for material type "Soil and Rock". Includes borehole logs, sieve analysis, lab tests, sub-soil profile, and direct shear.',
  },
  {
    id: 'rock',
    name: 'Rock Analysis Inputs',
    description:
      'Applicable for material type "Rock". Includes rock formations, grade classification, properties, and bearing capacity.',
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
        depth: '',
        moistureContent: '',
        bulkDensity: '',
        dryDensity: '',
        specificGravity: '',
        freeSwellIndex: '',
        liquidLimit: '',
        plasticLimit: '',
        plasticityIndex: '',
        grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
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
                (a) => String(a.material_id) === String(m.id) && FORM_TYPES.some((ft) => ft.id === a.form_type)
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
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500 font-bold'
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
                        enabledForms={['borehole', 'sieve', 'lab', 'subsoil', 'directshear']}
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
                        enabledForms={['borehole', 'sieve', 'lab', 'subsoil', 'directshear']}
                        onChange={() => {}}
                      />
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
    </div>
  );
};

export default AdminMaterialFormsManager;
