import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  Package,
  CheckCircle2,
  FlaskConical,
  Beaker,
  Clock,
  Calendar,
  ArrowLeft,
  Save,
  X,
  Send,
  Edit,
  Layers,
  LandPlot,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';
import { logAudit } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { computeSoilSbcValues, computeRockSbcValues } from '@/utils/sbcCalculators';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLES, DEPARTMENTS } from '@/data/config';
import { useMaterials } from '@/contexts/MaterialsContext';
import { useLabTests } from '@/contexts/LabTestsContext';
import GeotechTestForm from './GeotechTestForm';
import WorkflowPanel from '@/components/common/WorkflowPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { camelCaseToTitleCase } from '@/lib/utils';

// Names of geotechnical material types (matched against TEST_SCHEMA keys)
const GEOTECH_NAMES = ['Soil', 'Rock', 'Soil and Rock'];

const MANUAL_GEOTECH_FIELDS = [
  { key: 'sample_mark', label: 'Sample Mark / ID', type: 'text' },
  { key: 'depth', label: 'Depth (m)', type: 'text' },
  { key: 'description', label: 'Soil Description', type: 'textarea' },
  { key: 'moisture', label: 'Moisture Content (%)', type: 'number' },
  { key: 'specific_gravity', label: 'Specific Gravity', type: 'number' },
  { key: 'liquid_limit', label: 'Liquid Limit (LL)', type: 'number' },
  { key: 'plastic_limit', label: 'Plastic Limit (PL)', type: 'number' },
  { key: 'plasticity_index', label: 'Plasticity Index (PI)', type: 'number' },
  { key: 'gravel', label: 'Gravel (%)', type: 'number' },
  { key: 'sand', label: 'Sand (%)', type: 'number' },
  { key: 'silt_clay', label: 'Silt & Clay (%)', type: 'number' },
];

const TestingManager = ({ initialJobId, onClose, onSave }) => {
  const { materials, materialFormAssociations } = useMaterials();
  const { labTests } = useLabTests();
  const getMaterialAndForms = useCallback(
    (cat) => {
      const material = materials.find((m) => String(m.id) === String(cat) || m.name === cat);
      const materialName = material?.name || cat;

      // Hardcoded bypass: Soil, Rock, and Soil and Rock always use their solidly built out geotech forms only.
      const lowerName = String(materialName).toLowerCase().trim();
      if (['soil', 'rock', 'soil and rock'].includes(lowerName)) {
        return {
          material,
          forms: ['borehole', 'sieve', 'lab', 'subsoil', 'directshear'],
          isGeotech: true,
          isRegular: false,
        };
      }

      if (!material) {
        return {
          material: null,
          forms: ['regular'],
          isGeotech: false,
          isRegular: true,
        };
      }
      const forms = materialFormAssociations
        .filter((a) => String(a.material_id) === String(material.id))
        .map((a) => a.form_type);
      const hasGeotech = forms.some((f) =>
        ['borehole', 'sieve', 'lab', 'subsoil', 'directshear'].includes(f)
      );
      const hasRegular = forms.includes('regular');
      return {
        material,
        forms: forms.length > 0 ? forms : ['regular'],
        isGeotech: hasGeotech,
        isRegular: hasRegular || forms.length === 0,
      };
    },
    [materials, materialFormAssociations]
  );
  const [jobDetails, setJobDetails] = useState(null);
  const [samples, setSamples] = useState([]);
  const [testResults, setTestResults] = useState({}); // { category: { testName: { values: {}, remarks: "" } } }
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [techCapabilities, setTechCapabilities] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [entryMode, setEntryMode] = useState('Drilling'); // 'Manual' or 'Drilling'
  const [rlValuesNote, setRlValuesNote] = useState('R.L. Values are assumed.');
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    if (initialJobId) fetchData();
  }, [initialJobId]);

  // Restore saved entryMode and rlValuesNote from GeotechData when opening a geotech category dialog
  useEffect(() => {
    if (selectedCategory && getMaterialAndForms(selectedCategory).isGeotech) {
      const saved = testResults[selectedCategory]?.GeotechData?.methodOfBoring;
      if (saved) setEntryMode(saved);
      const savedRl = testResults[selectedCategory]?.GeotechData?.rlValuesNote;
      if (savedRl) setRlValuesNote(savedRl);
    }
  }, [selectedCategory, getMaterialAndForms]);

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      // Fetch Job
      const { data: rawJob, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', initialJobId)
        .single();
      if (jobError) throw jobError;

      let job = rawJob;
      if (job && job.client_id) {
        const { data: cData } = await supabase.from('clients').select('id, client_name').eq('id', job.client_id).maybeSingle();
        if (cData) job = { ...job, clients: cData };
      }
      setJobDetails(job);

      // Fetch Samples
      const { data: inwards, error: inError } = await supabase
        .from('material_inward_register')
        .select('*')
        .eq('job_id', initialJobId);

      let flatSamples = [];
      if (inwards && inwards.length > 0) {
        const inwardIds = inwards.map((i) => i.id);
        const { data: sData } = await supabase
          .from('material_samples')
          .select('*')
          .in('inward_id', inwardIds);
        flatSamples = sData || [];
      }
      setSamples(flatSamples);
      if (inError) console.error('Inward fetch error:', inError);

      // Fetch Existing Test Data
      const { data: testData, error: tError } = await supabase
        .from('job_tests')
        .select('*')
        .eq('job_id', initialJobId);
      if (!tError) {
        const results = {};
        testData.forEach((t) => {
          results[t.category] = t.results || {};
        });
        setTestResults(results);
      }

      // Fetch Tech Capabilities
      const { data: caps, error: capError } = await supabase
        .from('technician_capabilities')
        .select('category')
        .eq('user_id', user.id);
      if (!capError) setTechCapabilities(caps.map((c) => c.category));
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSaveResults = async (category) => {
    setIsSaving(true);
    try {
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      if (isNaN(userId) && user.username) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', user.username)
          .maybeSingle();
        if (userData) userId = userData.id;
      }

      console.log(
        '[handleSaveResults] maxDepths at save time:',
        testResults[category]?.GeotechData?.maxDepths
      );

      // Check if record exists
      const { data: existing } = await supabase
        .from('job_tests')
        .select('id')
        .eq('job_id', initialJobId)
        .eq('category', category)
        .maybeSingle();

      const recordData = {
        job_id: initialJobId,
        category,
        results: {
          ...(testResults[category] || {}),
          // Stamp the entry mode so the report knows the method of boring
          ...(testResults[category]?.GeotechData !== undefined && {
            GeotechData: {
              ...testResults[category].GeotechData,
              methodOfBoring: entryMode,
              ...(entryMode === 'Manual Augering' && { rlValuesNote }),
            },
          }),
        },
        status: 'IN_PROGRESS',
        assigned_technician_id: userId || null,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing && existing.id) {
        const { error: updateError } = await supabase
          .from('job_tests')
          .update(recordData)
          .eq('id', existing.id);
        error = updateError;
        if (!error) {
          logAudit({
            userId,
            entityType: 'job_test',
            entityId: existing.id,
            entityName: `${category} for Job ${initialJobId}`,
            action: 'UPDATE',
          });
        }
      } else {
        const { data, error: insertError } = await supabase
          .from('job_tests')
          .insert([recordData])
          .select();
        error = insertError;
        if (!error && data && data.length > 0) {
          logAudit({
            userId,
            entityType: 'job_test',
            entityId: data[0].id,
            entityName: `${category} for Job ${initialJobId}`,
            action: 'CREATE',
          });
        }
      }

      if (error) throw error;
      toast({ title: 'Progress Saved', description: `Results for ${category} have been saved.` });

      // Refetch silently to sync state without showing the loading spinner
      await fetchData({ silent: true });

      // Trigger parent callback to sync parent state
      if (onSave) onSave();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save results', variant: 'destructive' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!jobDetails) return null;

  // Derive category names by looking up each sample's material_type in the materials context
  const sampleCategories = [
    ...new Set(
      samples
        .map((s) => {
          if (!s.material_type) return null;
          const mat = materials.find((m) => String(m.id) === String(s.material_type));
          return mat ? String(mat.id) : null;
        })
        .filter(Boolean)
    ),
  ];
  const dataCats = Object.keys(testResults);
  const jobCategories = Object.keys(jobDetails?.test_types || {});

  const hasMaterialsGap = samples.length > 0 && sampleCategories.length === 0;
  const allCategories = [...new Set([...sampleCategories, ...jobCategories, ...dataCats])];

  const isAnalyst = user?.role === ROLES.ANALYST.slug;
  const isSoilTech =
    user?.role === ROLES.TECHNICIAN.slug && user?.departments?.includes('Soil Investigation');

  // Admin and Test Engineers see all categories; Technicians see only authorized or already-recorded categories
  const visibleCategories =
    isAdmin() || isAnalyst
      ? allCategories
      : allCategories.filter((c) => {
          if (user?.role !== ROLES.TECHNICIAN.slug) return false;

          // Check if it's geotech (Soil Investigation)
          const isGeotechCategory = getMaterialAndForms(c).isGeotech;
          if (isGeotechCategory) {
            const isSoilCategory = isSoilTech || techCapabilities.includes(c) || dataCats.includes(c);
            return isSoilCategory && user?.departments?.includes('Soil Investigation');
          }

          // Otherwise it's a regular category. Ensure they have general access:
          if (!techCapabilities.includes(c) && !dataCats.includes(c)) return false;

          // Find tests for this category (either from jobDetails.test_types or recorded in testResults)
          const assigned = (jobDetails?.test_types || {})[c] || [];
          const dataTestTypes = Object.keys(testResults[c] || {}).filter(
            (k) => k !== 'GeotechData' && k !== 'ManualData' && k !== 'status' && k !== 'remarks'
          );
          const testTypes = [...new Set([...assigned, ...dataTestTypes])];

          // If there are no tests at all, don't show the category tab to technician
          if (testTypes.length === 0) return false;

          // Ensure at least one test matches the technician's department(s)
          const hasMatchingTest = testTypes.some((testName) => {
            const testDef = labTests.find((t) => t.testType === testName);
            return testDef && user?.departments?.includes(testDef.group);
          });
          return hasMatchingTest;
        });

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-4">
      {onClose && (
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-primary/10 hover:text-primary dark:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Job: {jobDetails?.job_code}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Record and submit test results for this job.
            </p>
          </div>
        </div>
      )}
      {visibleCategories.length > 0 ? (
        <Tabs defaultValue={visibleCategories[0]} className="w-full">
          {hasMaterialsGap && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-gray-600">
                <strong className="text-primary">Material types not set on samples.</strong> Update
                the <em>Material Inward</em> entry to assign a Material Type to each sample — tabs
                below show all available test categories as a fallback.
              </p>
            </div>
          )}
          <TabsList className="bg-transparent border-b border-border rounded-none p-0 mb-0 flex-wrap h-auto min-h-0 gap-0 justify-start w-full">
            {visibleCategories.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="relative px-4 py-2.5 rounded-none bg-transparent shadow-none text-sm font-medium text-muted-foreground hover:text-foreground transition-colors
                                            data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary
                                            after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform after:duration-200
                                            data-[state=active]:after:scale-x-100 mt-0"
              >
                {materials.find((m) => String(m.id) === String(cat))?.name || cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleCategories.map((cat) => {
            const materialName = materials.find((m) => String(m.id) === String(cat))?.name;
            const assignedTestTypes =
              (jobDetails.test_types || {})[cat] ||
              (materialName ? (jobDetails.test_types || {})[materialName] : []) ||
              [];
            const dataTestTypes = Object.keys(testResults[cat] || {}).filter(
              (k) => k !== 'GeotechData' && k !== 'ManualData'
            );
            const testTypes = [...new Set([...assignedTestTypes, ...dataTestTypes])];
            const { isGeotech, isRegular, forms } = getMaterialAndForms(cat);
            return (
              <TabsContent key={cat} value={cat} className="space-y-6 outline-none mt-0">
                {isRegular && (
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800">
                      {materialName || cat} Test Data
                    </h4>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCategory(cat)}
                          className="h-8 text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit {materialName || cat} Test Data
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white border-gray-800">
                        <p className="text-xs">Open data entry form for {materialName || cat}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ">
                  {isGeotech && (
                    <div className="bg-white p-6 rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full w-full col-span-full md:col-span-2 lg:col-span-3">
                      <div>
                        <div className="flex items-center justify-between mb-0">
                          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            {/* Geotechnical Data */}
                          </h4>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCategory(cat)}
                                className="h-8 text-xs"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit {materialName || cat} Test Data
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                              <p className="text-xs">
                                Open data entry form for {materialName || cat}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {!testResults[cat]?.['GeotechData'] ||
                        Object.keys(testResults[cat]?.['GeotechData'] || {}).length === 0 ? (
                          <p className="text-xs text-gray-500 mb-4">Pending geotechnical input</p>
                        ) : (
                          <div className="space-y-8 mt-4">
                            {(() => {
                              const geotechData = testResults[cat]?.['GeotechData'] || {};
                              const {
                                boreholeLogs = [],
                                maxDepths = [],
                                latitudes = [],
                                longitudes = [],
                                labTestResults = [],
                                sbcDetails = [],
                                grainSizeAnalysis = [],
                              } = geotechData;
                              const processedBoreholeLogs = boreholeLogs.map((bh, idx) => {
                                const newBh = [...bh];
                                newBh.maxDepth = maxDepths[idx] || bh.maxDepth || '';
                                return newBh;
                              });

                              return (
                                <>
                                  {/* Borehole Logs Table */}
                                  {processedBoreholeLogs.some((bh) => bh.length > 0) && (
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <FlaskConical className="w-3 h-3 text-primary" /> Borehole
                                        Logs
                                      </h5>
                                      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="bg-gray-50 border-b">
                                            <tr>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                BH
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Max Depth of Exploration (m)
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Latitude
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Longitude
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                From (m)
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                To (m)
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Sampling
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Soil Type
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                SPT N Values (15/30/45)
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {boreholeLogs.map((bh, bhIdx) =>
                                              bh.map((d, dIdx) => (
                                                <tr
                                                  key={`bh-${bhIdx}-${dIdx}`}
                                                  className="hover:bg-gray-50/30 transition-colors"
                                                >
                                                  <td className="p-3 font-bold text-gray-400">
                                                    BH-{bhIdx + 1}
                                                  </td>
                                                  <td className="p-3 font-mono text-gray-500">
                                                    {maxDepths[bhIdx] || '-'}
                                                  </td>
                                                  <td className="p-3 font-mono text-gray-500">
                                                    {latitudes[bhIdx] || '-'}
                                                  </td>
                                                  <td className="p-3 font-mono text-gray-500">
                                                    {longitudes[bhIdx] || '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-900 font-medium">
                                                    {d.fromDepth ?? d.depth ?? '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-900 font-medium">
                                                    {d.toDepth ?? '-'}
                                                  </td>
                                                  <td className="p-3">
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[9px] font-bold py-0 h-4 bg-gray-50"
                                                    >
                                                      {d.natureOfSampling || '-'}
                                                    </Badge>
                                                  </td>
                                                  <td
                                                    className="p-3 text-gray-600 max-w-[200px] truncate"
                                                    title={d.soilType}
                                                  >
                                                    {d.soilType || '-'}
                                                  </td>
                                                  <td className="p-3 font-mono text-gray-500">
                                                    {d.spt1 || '-'}/{d.spt2 || '-'}/{d.spt3 || '-'}
                                                  </td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Lab Test Results Table */}
                                  {labTestResults.some((bh) => bh.length > 0) && (
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Beaker className="w-3 h-3 text-blue-500" /> Lab Test
                                        Results
                                      </h5>
                                      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="bg-gray-50 border-b">
                                            <tr>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                BH
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Depth
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Density/Moist.
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Grain Size (G/S/SC)
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Atterberg (LL/PL/PI)
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                SG/FSI
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {labTestResults.map((bh, bhIdx) =>
                                              bh.map((d, dIdx) => (
                                                <tr
                                                  key={`lab-${bhIdx}-${dIdx}`}
                                                  className="hover:bg-gray-50/30 transition-colors"
                                                >
                                                  <td className="p-3 font-bold text-gray-400">
                                                    BH-{bhIdx + 1}
                                                  </td>
                                                  <td className="p-3 text-gray-900 font-medium">
                                                    {d.depth || '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-600">
                                                    {d.bulkDensity || '-'}/
                                                    {d.moistureContent || '-'}%
                                                  </td>
                                                  <td className="p-3 text-gray-600">
                                                    {d.grainSizeDistribution?.gravel || '-'}/
                                                    {d.grainSizeDistribution?.sand || '-'}/
                                                    {d.grainSizeDistribution?.siltAndClay || '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-600">
                                                    {d.atterbergLimits?.liquidLimit || '-'}/
                                                    {d.atterbergLimits?.plasticLimit || '-'}/
                                                    {d.atterbergLimits?.plasticityIndex || '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-600">
                                                    {d.specificGravity || '-'}/
                                                    {d.freeSwellIndex || '-'}%
                                                  </td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* SBC Details Table */}
                                  {(() => {
                                    const normalizedSbcDetails = [];
                                    (sbcDetails || []).forEach((bhSbc, bhIdx) => {
                                      if (Array.isArray(bhSbc)) {
                                        bhSbc.forEach((entry, entryIdx) => {
                                          if (entry && Object.keys(entry).length > 0) {
                                            normalizedSbcDetails.push({
                                              d: entry,
                                              bhIdx,
                                              entryIdx,
                                            });
                                          }
                                        });
                                      } else if (bhSbc && Object.keys(bhSbc).length > 0) {
                                        normalizedSbcDetails.push({ d: bhSbc, bhIdx, entryIdx: 0 });
                                      }
                                    });

                                    if (normalizedSbcDetails.length === 0) return null;

                                    const resolvedName = materialName || cat;
                                    const soilSbcs = normalizedSbcDetails.filter(
                                      ({ d }) =>
                                        d &&
                                        (resolvedName === 'Soil' ||
                                          d.foundationType === 'Soil' ||
                                          (resolvedName === 'Soil and Rock' &&
                                            d.foundationType !== 'Rock'))
                                    );
                                    const rockSbcs = normalizedSbcDetails.filter(
                                      ({ d }) =>
                                        d &&
                                        (resolvedName === 'Rock' || d.foundationType === 'Rock')
                                    );

                                    const renderSbcTable = (isRock, rows) => {
                                      if (rows.length === 0) return null;
                                      return (
                                        <div className="space-y-3 mt-4">
                                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Package className="w-3 h-3 text-purple-500" /> SBC
                                            Details -{' '}
                                            {isRock ? 'Rock Foundation' : 'Soil Foundation'}
                                          </h5>
                                          <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden w-full">
                                            <table className="w-full text-left text-[11px]">
                                              <thead className="bg-gray-50 border-b">
                                                <tr>
                                                  <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                    BH
                                                  </th>
                                                  {!isRock && (
                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                      Shape
                                                    </th>
                                                  )}
                                                  {!isRock && (
                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                      Material
                                                    </th>
                                                  )}
                                                  {isRock && (
                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                      Rock Top/Bottom
                                                    </th>
                                                  )}
                                                  <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                    Width B (m)
                                                  </th>
                                                  <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                    Length L (m)
                                                  </th>
                                                  <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                    Depth Df (m)
                                                  </th>
                                                  {!isRock && (
                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                      Cohesion C
                                                    </th>
                                                  )}
                                                  {!isRock && (
                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                      Angle Φ
                                                    </th>
                                                  )}
                                                  {!isRock && (
                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                      Unit Wt γ
                                                    </th>
                                                  )}
                                                  <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                    Safe BC (qs)
                                                  </th>
                                                  <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                    Allowable BC (qa)
                                                  </th>
                                                  {!isRock && (
                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                      Safe BP (qsafe)
                                                    </th>
                                                  )}
                                                  <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                    Rec. SBC
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                                {rows.map(({ d, bhIdx, entryIdx }, idx) => {
                                                  const computed = isRock
                                                    ? computeRockSbcValues(d)
                                                    : computeSoilSbcValues(d, settings);
                                                  const hasMultiple =
                                                    Array.isArray(sbcDetails[bhIdx]) &&
                                                    sbcDetails[bhIdx].length > 1;
                                                  return (
                                                    <tr
                                                      key={`sbc-${bhIdx}-${idx}`}
                                                      className="hover:bg-gray-50/30 transition-colors"
                                                    >
                                                      <td className="p-3 font-bold text-gray-400">
                                                        BH-{bhIdx + 1}
                                                        {hasMultiple ? ` (${entryIdx + 1})` : ''}
                                                      </td>
                                                      {!isRock && (
                                                        <td className="p-3 text-gray-900">
                                                          {d.sbcShape || '-'}
                                                        </td>
                                                      )}
                                                      {!isRock && (
                                                        <td className="p-3 text-gray-900">
                                                          {d.soilTypeInput || '-'}
                                                        </td>
                                                      )}
                                                      {isRock && (
                                                        <td className="p-3 text-gray-900">
                                                          {d.depthTop || d.depthBottom
                                                            ? `${d.depthTop || 0} - ${d.depthBottom || 0}`
                                                            : '-'}
                                                        </td>
                                                      )}
                                                      <td className="p-3 text-gray-900">
                                                        {d.sbcB || d.widthB || '-'}
                                                      </td>
                                                      <td className="p-3 text-gray-900">
                                                        {d.sbcL || d.lengthL || '-'}
                                                      </td>
                                                      <td className="p-3 text-gray-900">
                                                        {d.sbcD || d.df || '-'}
                                                      </td>
                                                      {!isRock && (
                                                        <td className="p-3 text-gray-900">
                                                          {d.sbcC || '-'}
                                                        </td>
                                                      )}
                                                      {!isRock && (
                                                        <td className="p-3 text-gray-900">
                                                          {d.sbcPhi || '-'}
                                                        </td>
                                                      )}
                                                      {!isRock && (
                                                        <td className="p-3 text-gray-900">
                                                          {d.sbcGamma || '-'}
                                                        </td>
                                                      )}
                                                      <td className="p-3 text-gray-900 font-mono">
                                                        {computed.computedQs !== null &&
                                                        computed.computedQs !== undefined
                                                          ? Number(computed.computedQs).toFixed(2)
                                                          : '-'}
                                                      </td>
                                                      <td className="p-3 text-gray-900 font-mono">
                                                        {computed.computedQa !== null &&
                                                        computed.computedQa !== undefined
                                                          ? Number(computed.computedQa).toFixed(2)
                                                          : '-'}
                                                      </td>
                                                      {!isRock && (
                                                        <td className="p-3 text-gray-900 font-mono">
                                                          {computed.computedQsafe !== null &&
                                                          computed.computedQsafe !== undefined
                                                            ? Number(
                                                                computed.computedQsafe
                                                              ).toFixed(2)
                                                            : '-'}
                                                        </td>
                                                      )}
                                                      <td className="p-3 text-primary font-bold font-mono">
                                                        {computed.computedRecommendedSbc !== null &&
                                                        computed.computedRecommendedSbc !==
                                                          undefined
                                                          ? Number(
                                                              computed.computedRecommendedSbc
                                                            ).toFixed(2)
                                                          : '-'}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      );
                                    };

                                    return (
                                      <div className="flex flex-col gap-2 w-full">
                                        {renderSbcTable(false, soilSbcs)}
                                        {renderSbcTable(true, rockSbcs)}
                                      </div>
                                    );
                                  })()}

                                  {/* Sub-Soil Profile Table */}
                                  {geotechData.subSoilProfile?.some((bh) => bh.length > 0) && (
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <LandPlot className="w-3 h-3 text-emerald-500" /> Sub-Soil
                                        Profile
                                      </h5>
                                      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="bg-gray-50 border-b">
                                            <tr>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                BH
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Depth (m)
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Description
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {geotechData.subSoilProfile.map((bh, bhIdx) =>
                                              bh.map((d, dIdx) => (
                                                <tr
                                                  key={`profile-${bhIdx}-${dIdx}`}
                                                  className="hover:bg-gray-50/30 transition-colors"
                                                >
                                                  <td className="p-3 font-bold text-gray-400">
                                                    BH-{bhIdx + 1}
                                                  </td>
                                                  <td className="p-3 text-gray-900 font-medium">
                                                    {d.depth || '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-600">
                                                    {d.description || '-'}
                                                  </td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Sieve Analysis Table */}
                                  {grainSizeAnalysis.some((bh) => bh.length > 0) && (
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Layers className="w-3 h-3 text-orange-500" /> Sieve
                                        Analysis - Weight Retained (gms)
                                      </h5>
                                      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="bg-gray-50 border-b">
                                            <tr>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                BH
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Depth
                                              </th>
                                              {[
                                                { key: 'sieve0', label: '10mm' },
                                                { key: 'sieve1', label: '4.75mm' },
                                                { key: 'sieve2', label: '2.36mm' },
                                                { key: 'sieve3', label: '2mm' },
                                                { key: 'sieve4', label: '1.18mm' },
                                                { key: 'sieve5', label: '0.60mm' },
                                                { key: 'sieve6', label: '0.425mm' },
                                                { key: 'sieve7', label: '0.30mm' },
                                                { key: 'sieve8', label: '0.15mm' },
                                                { key: 'sieve9', label: '0.075mm' },
                                                { key: 'sieve10', label: 'Pan' },
                                              ].map(({ key, label }) => (
                                                <th
                                                  key={key}
                                                  className="p-2 font-bold text-gray-400 text-center text-[9px] uppercase"
                                                >
                                                  {label}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {grainSizeAnalysis.map((bh, bhIdx) =>
                                              bh.map((d, dIdx) => (
                                                <tr
                                                  key={`sieve-${bhIdx}-${dIdx}`}
                                                  className="hover:bg-gray-50/30 transition-colors"
                                                >
                                                  <td className="p-3 font-bold text-gray-400">
                                                    BH-{bhIdx + 1}
                                                  </td>
                                                  <td className="p-3 text-gray-900 font-medium">
                                                    {d.depth || '-'}
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
                                                    <td
                                                      key={key}
                                                      className="p-2 text-center text-gray-500 font-mono"
                                                    >
                                                      {d[key] ?? '-'}
                                                    </td>
                                                  ))}
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                  {/* Chemical Analysis Table */}
                                  {geotechData.chemicalAnalysis?.some(
                                    (d) => d.phValue || d.sulphates
                                  ) && (
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <FlaskConical className="w-3 h-3 text-rose-500" /> Chemical
                                        Analysis
                                      </h5>
                                      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden w-full">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="bg-gray-50 border-b">
                                            <tr>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                pH Value
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Sulphates
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Chlorides
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Other Parameters
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {geotechData.chemicalAnalysis.map((d, idx) => (
                                              <tr
                                                key={`chem-${idx}`}
                                                className="hover:bg-gray-50/30 transition-colors"
                                              >
                                                <td className="p-3 text-gray-900 font-medium">
                                                  {d.phValue || '-'}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                  {d.sulphates || '-'}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                  {d.chlorides || '-'}
                                                </td>
                                                <td className="p-3 text-gray-500 italic text-[10px]">
                                                  {d.additionalKeys
                                                    ?.filter((k) => k.key)
                                                    .map((k) => `${k.key}: ${k.value}`)
                                                    .join(', ') || '-'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Direct Shear Results Table */}
                                  {geotechData.directShearResults?.some((bh) => bh.length > 0) && (
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Beaker className="w-3 h-3 text-indigo-500" /> Direct Shear
                                        Results
                                      </h5>
                                      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden w-full">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="bg-gray-50 border-b">
                                            <tr>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                BH
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Shear Box Size
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                Depth
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                c Value
                                              </th>
                                              <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                                                phi Value
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {geotechData.directShearResults.map((bh, bhIdx) =>
                                              bh.map((d, dIdx) => (
                                                <tr
                                                  key={`shear-${bhIdx}-${dIdx}`}
                                                  className="hover:bg-gray-50/30 transition-colors"
                                                >
                                                  <td className="p-3 font-bold text-gray-400">
                                                    BH-{bhIdx + 1}
                                                  </td>
                                                  <td className="p-3 text-gray-600">
                                                    {d.shearBoxSize || '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-600">
                                                    {d.depthOfSample || '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-900 font-bold">
                                                    {d.cValue || '-'}
                                                  </td>
                                                  <td className="p-3 text-gray-900 font-bold">
                                                    {d.phiValue || '-'}
                                                  </td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <p className="text-[10px] text-gray-400 italic mt-4 flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-gray-300" />
                              Click Edit Results to manage complex geotechnical tables.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual Geotech Data Card */}
                  {testResults[cat]?.['ManualData'] &&
                    Object.keys(testResults[cat]?.['ManualData']).length > 0 && (
                      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full w-full col-span-full md:col-span-1 lg:col-span-1 hidden">
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Manual Investigation Data
                          </h4>
                          <div className="space-y-2 mt-4 bg-gray-50/50 p-3 rounded-lg border">
                            {Object.entries(testResults[cat]?.['ManualData']).map(([key, val]) => {
                              if (!val) return null;
                              const field = MANUAL_GEOTECH_FIELDS.find((f) => f.key === key);
                              return (
                                <div
                                  key={key}
                                  className="flex justify-between items-start text-xs border-b border-gray-100 last:border-0 pb-1 last:pb-0"
                                >
                                  <span className="text-gray-500 font-medium">
                                    {field?.label || key}:
                                  </span>
                                  <span className="text-gray-900 font-bold text-right ml-2">
                                    {val}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  {testTypes.map((testName) => {
                    const testValues = testResults[cat]?.[testName]?.values || {};
                    const hasData = Object.keys(testValues).length > 0;

                    return (
                      <div
                        key={testName}
                        className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full"
                      >
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${hasData ? 'bg-green-500' : 'bg-amber-400'}`}
                            />
                            {testName}
                          </h4>
                          {!hasData ? (
                            <p className="text-xs text-gray-500 mb-4">Pending input</p>
                          ) : (
                            <div className="mb-6 space-y-2 max-h-40 overflow-y-auto no-scrollbar border p-3 rounded-lg bg-gray-50/50">
                              {Object.entries(testValues).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="flex justify-between items-center text-xs border-b border-gray-100 last:border-0 pb-1 last:pb-0"
                                >
                                  <span
                                    className="text-gray-500 max-w-[55%] truncate pr-2"
                                    title={k}
                                  >
                                    {k}
                                  </span>
                                  <span
                                    className="font-medium text-gray-900 truncate text-right"
                                    title={String(v)}
                                  >
                                    {String(v) || '-'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="bg-white border border-gray-100 p-8 rounded-xl text-center shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Authorized Test Streams</h3>
          <p className="text-gray-500 mt-2">
            You don't have the assigned capability to perform tests for this job's categories.
          </p>
        </div>
      )}

      {/* Category Test Data Input Dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <DialogContent className="w-[96vw] max-w-[1800px] max-h-[96vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <FlaskConical className="w-5 h-5 text-primary" />
              {materials.find((m) => String(m.id) === String(selectedCategory))?.name ||
                selectedCategory}{' '}
              Test Data Entry
            </DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto p-2 space-y-6 custom-scrollbar">
                {selectedCategory && (
                  <div className="space-y-4">
                    {/* Entry Mode Selection - Only for Geotech categories */}
                    {getMaterialAndForms(selectedCategory).isGeotech && (
                      <div className="flex items-center gap-4 p-2 bg-gray-50 rounded-xl border border-gray-100">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Entry Mode
                        </Label>

                        <Select value={entryMode} onValueChange={setEntryMode}>
                          <SelectTrigger className="h-8 w-[180px] bg-white border-gray-200 text-xs px-2">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem className="text-xs py-1 min-h-0" value="Manual Augering">
                              Manual Augering
                            </SelectItem>

                            <SelectItem className="text-xs py-1 min-h-0" value="Rotary Drilling">
                              Rotary Drilling
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {entryMode === 'Manual Augering' && (
                          <>
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              R.L. Values
                            </Label>
                            <Select value={rlValuesNote} onValueChange={setRlValuesNote}>
                              <SelectTrigger className="h-8 w-[360px] bg-white border-gray-200 text-xs px-2">
                                <SelectValue placeholder="Select R.L. note" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  className="text-xs py-1 min-h-0"
                                  value="R.L. Values are assumed."
                                >
                                  R.L. Values are assumed.
                                </SelectItem>
                                <SelectItem
                                  className="text-xs py-1 min-h-0"
                                  value="R.L. Values are provided as furnished by the client."
                                >
                                  R.L. Values are provided as furnished by the client.
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                    )}

                    {/* Drilling Form (Geotech Only) */}
                    {getMaterialAndForms(selectedCategory).isGeotech && (
                      <div className="space-y-4 rounded-xl border border-gray-100 p-4 bg-white shadow-sm mb-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                          Geotechnical Inputs
                        </h3>
                        <GeotechTestForm
                          materialCategory={
                            materials.find((m) => String(m.id) === String(selectedCategory))
                              ?.name || selectedCategory
                          }
                          value={testResults[selectedCategory]?.['GeotechData'] || {}}
                          enabledForms={getMaterialAndForms(selectedCategory).forms}
                          onChange={(val) => {
                            console.log('[GeotechTestForm onChange] maxDepths:', val?.maxDepths);
                            setTestResults((prev) => ({
                              ...prev,
                              [selectedCategory]: {
                                ...(prev[selectedCategory] || {}),
                                GeotechData: val,
                              },
                            }));
                          }}
                        />
                      </div>
                    )}

                    {/* Regular Tests (non-geotech categories only) */}
                    {getMaterialAndForms(selectedCategory).isRegular && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {(() => {
                            const materialName = materials.find(
                              (m) => String(m.id) === String(selectedCategory)
                            )?.name;
                            const assignedTestTypes =
                              (jobDetails.test_types || {})[selectedCategory] ||
                              (materialName ? (jobDetails.test_types || {})[materialName] : []) ||
                              [];
                            const dataTestTypes = Object.keys(
                              testResults[selectedCategory] || {}
                            ).filter((k) => k !== 'GeotechData' && k !== 'ManualData' && k !== 'status' && k !== 'remarks');
                            const testTypes = [
                              ...new Set([...assignedTestTypes, ...dataTestTypes]),
                            ];

                            const visibleTestTypes = isAdmin() || isAnalyst
                              ? testTypes
                              : testTypes.filter((testName) => {
                                  const testDef = labTests.find((t) => t.testType === testName);
                                  if (!testDef || !testDef.group) return true;
                                  return user?.departments?.includes(testDef.group);
                                });

                            if (visibleTestTypes.length === 0) {
                              return (
                                <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                  <p className="text-gray-500 text-sm">
                                    No regular tests assigned to your department for this category.
                                  </p>
                                </div>
                              );
                            }

                            return visibleTestTypes.map((testName) => (
                              <div
                                key={testName}
                                className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-4"
                              >
                                <div className="flex items-center justify-between border-b pb-2 mb-2">
                                  <h4 className="text-sm font-bold text-gray-800">{testName}</h4>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase font-bold"
                                  >
                                    Regular Test
                                  </Badge>
                                </div>
                                <div className="space-y-3">
                                  <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">
                                      Test Value / Result
                                    </Label>
                                    <Input
                                      value={
                                        testResults[selectedCategory]?.[testName]?.values?.[
                                          'Result'
                                        ] || ''
                                      }
                                      onChange={(e) =>
                                        setTestResults((prev) => ({
                                          ...prev,
                                          [selectedCategory]: {
                                            ...(prev[selectedCategory] || {}),
                                            [testName]: {
                                              ...(prev[selectedCategory]?.[testName] || {}),
                                              values: {
                                                ...(prev[selectedCategory]?.[testName]?.values ||
                                                  {}),
                                                Result: e.target.value,
                                              },
                                            },
                                          },
                                        }))
                                      }
                                      placeholder="Enter numerical or descriptive result"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">
                                      Remarks
                                    </Label>
                                    <Input
                                      value={
                                        testResults[selectedCategory]?.[testName]?.remarks || ''
                                      }
                                      onChange={(e) =>
                                        setTestResults((prev) => ({
                                          ...prev,
                                          [selectedCategory]: {
                                            ...(prev[selectedCategory] || {}),
                                            [testName]: {
                                              ...(prev[selectedCategory]?.[testName] || {}),
                                              remarks: e.target.value,
                                            },
                                          },
                                        }))
                                      }
                                      placeholder="Optional remarks"
                                      className="h-9 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 z-10 flex justify-end gap-3 px-6 py-4 border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
                <Button
                  variant="ghost"
                  className="px-6 rounded-xl hover:bg-muted font-medium text-muted-foreground"
                  onClick={() => setSelectedCategory(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  className="px-8 rounded-xl bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold dark:text-white"
                  onClick={async () => {
                    const ok = await handleSaveResults(selectedCategory);
                    if (ok !== false) setSelectedCategory(null);
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}{' '}
                  Save All Results
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestingManager;
