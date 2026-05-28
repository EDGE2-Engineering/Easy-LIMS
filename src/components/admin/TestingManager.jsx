
import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Package, CheckCircle2, FlaskConical, Beaker, Clock, Calendar, ArrowLeft, Save, X, Send, Edit, Layers, LandPlot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useWorkflow } from '@/hooks/useWorkflow';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MATERIALS, ROLES } from '@/data/config';
import GeotechTestForm from './GeotechTestForm';
import WorkflowPanel from '@/components/common/WorkflowPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    const [jobDetails, setJobDetails] = useState(null);
    const [samples, setSamples] = useState([]);
    const [testResults, setTestResults] = useState({}); // { category: { testName: { values: {}, remarks: "" } } }
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [techCapabilities, setTechCapabilities] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [entryMode, setEntryMode] = useState('Drilling'); // 'Manual' or 'Drilling'
    const { toast } = useToast();
    const { user, isAdmin } = useAuth();
    const { canAction } = usePermissions();
    const { transition, isTransitioning } = useWorkflow();

    useEffect(() => {
        if (initialJobId) fetchData();
    }, [initialJobId]);

    // Restore saved entryMode from GeotechData when opening a geotech category dialog
    useEffect(() => {
        if (selectedCategory && GEOTECH_NAMES.includes(selectedCategory)) {
            const saved = testResults[selectedCategory]?.GeotechData?.methodOfBoring;
            if (saved) setEntryMode(saved);
        }
    }, [selectedCategory]);

    const fetchData = async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            // Fetch Job
            const { data: job, error: jobError } = await supabase.from('jobs').select('*, clients(client_name)').eq('id', initialJobId).single();
            if (jobError) throw jobError;
            setJobDetails(job);

            // Fetch Samples
            const { data: inwards, error: inError } = await supabase
                .from('material_inward_register')
                .select('*, material_samples(*)')
                .eq('job_id', initialJobId);
            const flatSamples = inwards ? inwards.flatMap(i => i.material_samples || []) : [];
            setSamples(flatSamples);
            if (inError) console.error('Inward fetch error:', inError);

            // Fetch Existing Test Data
            const { data: testData, error: tError } = await supabase.from('job_tests').select('*').eq('job_id', initialJobId);
            if (!tError) {
                const results = {};
                testData.forEach(t => {
                    results[t.category] = t.results || {};
                });
                setTestResults(results);
            }

            // Fetch Tech Capabilities
            const { data: caps, error: capError } = await supabase.from('technician_capabilities').select('category').eq('user_id', user.id);
            if (!capError) setTechCapabilities(caps.map(c => c.category));

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
        } finally {
            if (!silent) setLoading(false);
        }
    };


    const handleSaveResults = async (category) => {
        setIsSaving(true);
        try {
            let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
            if (isNaN(userId) && user.username) {
                const { data: userData } = await supabase.from('users').select('id').eq('username', user.username).maybeSingle();
                if (userData) userId = userData.id;
            }

            console.log('[handleSaveResults] maxDepths at save time:', testResults[category]?.GeotechData?.maxDepths);

            // Check if record exists
            const { data: existing } = await supabase.from('job_tests')
                .select('id')
                .eq('job_id', initialJobId)
                .eq('category', category)
                .maybeSingle();

            const recordData = {
                job_id: initialJobId,
                category,
                results: {
                    ...testResults[category] || {},
                    // Stamp the entry mode so the report knows the method of boring
                    ...(testResults[category]?.GeotechData !== undefined && {
                        GeotechData: {
                            ...testResults[category].GeotechData,
                            methodOfBoring: entryMode,
                        }
                    }),
                },
                status: 'IN_PROGRESS',
                assigned_technician_id: userId || null,
                updated_at: new Date().toISOString()
            };

            let error;
            if (existing && existing.id) {
                const { error: updateError } = await supabase.from('job_tests').update(recordData).eq('id', existing.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('job_tests').insert([recordData]);
                error = insertError;
            }

            if (error) throw error;
            toast({ title: "Progress Saved", description: `Results for ${category} have been saved.` });
            
            // Refetch silently to sync state without showing the loading spinner
            await fetchData({ silent: true });
            
            // Trigger parent callback to sync parent state
            if (onSave) onSave();
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to save results", variant: "destructive" });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
    if (!jobDetails) return null;

    // Derive category names by looking up each sample's material_type in the MATERIALS config
    const sampleCategories = [...new Set(
        samples
            .map(s => {
                if (!s.material_type) return null;
                const mat = MATERIALS.find(m => m.id === s.material_type);
                return mat ? mat.name : null;
            })
            .filter(Boolean)
    )];
    const dataCats = Object.keys(testResults);

    const hasMaterialsGap = samples.length > 0 && sampleCategories.length === 0;
    const allCategories = [...new Set([...sampleCategories, ...dataCats])];

    const isAnalyst = user?.role === ROLES.ANALYST.slug;
    const isSoilTech = user?.role === ROLES.TECHNICIAN.slug && user?.departments?.includes('Soil Investigation');

    // Admin and Test Engineers see all categories; Technicians see only authorized or already-recorded categories
    const visibleCategories = (isAdmin() || isAnalyst)
        ? allCategories
        : allCategories.filter(c => {
            if (user?.role !== ROLES.TECHNICIAN.slug) return false;
            if (techCapabilities.includes(c) || dataCats.includes(c)) return true;
            if (isSoilTech && GEOTECH_NAMES.includes(c)) return true;
            return false;
        });

    return (
        <div className="w-full animate-in fade-in duration-500 space-y-4">
            {onClose && (
                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-4">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-primary/10 hover:text-primary dark:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Job: {jobDetails?.job_code}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Record and submit test results for this job.</p>
                    </div>
                </div>
            )}
            {visibleCategories.length > 0 ? (
                <Tabs defaultValue={visibleCategories[0]} className="w-full">
                            {hasMaterialsGap && (
                                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3 text-sm">
                                    <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                    <p className="text-gray-600">
                                        <strong className="text-primary">Material types not set on samples.</strong>{' '}
                                        Update the <em>Material Inward</em> entry to assign a Material Type to each sample — tabs below show all available test categories as a fallback.
                                    </p>
                                </div>
                            )}
                            <TabsList className="bg-muted/60 border border-border rounded-xl p-1 mb-2 flex-wrap h-auto min-h-0 py-1">
                                {visibleCategories.map(cat => (
                                    <TabsTrigger key={cat} value={cat} className="px-2 py-2 rounded-lg text-muted-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                        {cat}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {visibleCategories.map(cat => {
                                const assignedTestTypes = (jobDetails.test_types || {})[cat] || [];
                                const dataTestTypes = Object.keys(testResults[cat] || {}).filter(k => k !== 'GeotechData' && k !== 'ManualData');
                                const testTypes = [...new Set([...assignedTestTypes, ...dataTestTypes])];
                                return (
                                    <TabsContent key={cat} value={cat} className="space-y-6 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {GEOTECH_NAMES.includes(cat) && (
                                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full w-full col-span-full md:col-span-2 lg:col-span-3">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                                            {/* <div className={`w-2 h-2 rounded-full ${Object.keys(testResults[cat]?.['GeotechData'] || {}).length > 0 ? 'bg-green-500' : 'bg-amber-400'}`} /> */}
                                                            Geotechnical Data
                                                        </h4>
                                                        {!testResults[cat]?.['GeotechData'] || Object.keys(testResults[cat]?.['GeotechData'] || {}).length === 0 ? (
                                                            <p className="text-xs text-gray-500 mb-4">Pending geotechnical input</p>
                                                        ) : (
                                                            <div className="space-y-8 mt-4">
                                                                {(() => {
                                                                    const geotechData = testResults[cat]?.['GeotechData'] || {};
                                                                    const { boreholeLogs = [], maxDepths = [], latitudes = [], longitudes = [], labTestResults = [], sbcDetails = [], grainSizeAnalysis = [] } = geotechData;
                                                                    const processedBoreholeLogs = boreholeLogs.map((bh, idx) => {
                                                                        const newBh = [...bh];
                                                                        newBh.maxDepth = maxDepths[idx] || bh.maxDepth || '';
                                                                        return newBh;
                                                                    });
                                                                    
                                                                    return (
                                                                        <>
                                                                            {/* Borehole Logs Table */}
                                                                            {processedBoreholeLogs.some(bh => bh.length > 0) && (
                                                                                <div className="space-y-3">
                                                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                                        <FlaskConical className="w-3 h-3 text-primary" /> Borehole Logs
                                                                                    </h5>
                                                                                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                                                                                        <table className="w-full text-left text-[11px]">
                                                                                            <thead className="bg-gray-50 border-b">
                                                                                                <tr>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">BH</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Max Depth of Exploration (m)</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Latitude</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Longitude</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Depth (m)</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Sampling</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Soil Type</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">SPT (15/30/45)</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-gray-50">
                                                                                                {boreholeLogs.map((bh, bhIdx) => bh.map((d, dIdx) => (
                                                                                                    <tr key={`bh-${bhIdx}-${dIdx}`} className="hover:bg-gray-50/30 transition-colors">
                                                                                                        <td className="p-3 font-bold text-gray-400">BH-{bhIdx + 1}</td>
                                                                                                        <td className="p-3 font-mono text-gray-500">{maxDepths[bhIdx] || '-'}</td>
                                                                                                        <td className="p-3 font-mono text-gray-500">{latitudes[bhIdx] || '-'}</td>
                                                                                                        <td className="p-3 font-mono text-gray-500">{longitudes[bhIdx] || '-'}</td>
                                                                                                        <td className="p-3 text-gray-900 font-medium">{d.depth || '-'}</td>
                                                                                                        <td className="p-3"><Badge variant="outline" className="text-[9px] font-bold py-0 h-4 bg-gray-50">{d.natureOfSampling || '-'}</Badge></td>
                                                                                                        <td className="p-3 text-gray-600 max-w-[200px] truncate" title={d.soilType}>{d.soilType || '-'}</td>
                                                                                                        <td className="p-3 font-mono text-gray-500">{d.spt1 || '-'}/{d.spt2 || '-'}/{d.spt3 || '-'}</td>
                                                                                                    </tr>
                                                                                                )))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Lab Test Results Table */}
                                                                            {labTestResults.some(bh => bh.length > 0) && (
                                                                                <div className="space-y-3">
                                                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                                        <Beaker className="w-3 h-3 text-blue-500" /> Lab Test Results
                                                                                    </h5>
                                                                                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                                                                                        <table className="w-full text-left text-[11px]">
                                                                                            <thead className="bg-gray-50 border-b">
                                                                                                <tr>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">BH</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Depth</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Density/Moist.</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Grain Size (G/S/SC)</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Atterberg (LL/PL/PI)</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">SG/FSI</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-gray-50">
                                                                                                {labTestResults.map((bh, bhIdx) => bh.map((d, dIdx) => (
                                                                                                    <tr key={`lab-${bhIdx}-${dIdx}`} className="hover:bg-gray-50/30 transition-colors">
                                                                                                        <td className="p-3 font-bold text-gray-400">BH-{bhIdx + 1}</td>
                                                                                                        <td className="p-3 text-gray-900 font-medium">{d.depth || '-'}</td>
                                                                                                        <td className="p-3 text-gray-600">{d.bulkDensity || '-'}/{d.moistureContent || '-'}%</td>
                                                                                                        <td className="p-3 text-gray-600">{d.grainSizeDistribution?.gravel || '-'}/{d.grainSizeDistribution?.sand || '-'}/{d.grainSizeDistribution?.siltAndClay || '-'}</td>
                                                                                                        <td className="p-3 text-gray-600">{d.atterbergLimits?.liquidLimit || '-'}/{d.atterbergLimits?.plasticLimit || '-'}/{d.atterbergLimits?.plasticityIndex || '-'}</td>
                                                                                                        <td className="p-3 text-gray-600">{d.specificGravity || '-'}/{d.freeSwellIndex || '-'}%</td>
                                                                                                    </tr>
                                                                                                )))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* SBC Details Table */}
                                                                            {sbcDetails.some(bh => bh.length > 0) && (
                                                                                <div className="space-y-3">
                                                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                                        <Package className="w-3 h-3 text-purple-500" /> SBC Details
                                                                                    </h5>
                                                                                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden w-full">
                                                                                        <table className="w-full text-left text-[11px]">
                                                                                            <thead className="bg-gray-50 border-b">
                                                                                                <tr>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">BH</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Depth (m)</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">SBC Value (t/m²)</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-gray-50">
                                                                                                {sbcDetails.map((bh, bhIdx) => bh.map((d, dIdx) => (
                                                                                                    <tr key={`sbc-${bhIdx}-${dIdx}`} className="hover:bg-gray-50/30 transition-colors">
                                                                                                        <td className="p-3 font-bold text-gray-400">BH-{bhIdx + 1}</td>
                                                                                                        <td className="p-3 text-gray-900 font-medium">{d.depth || '-'}</td>
                                                                                                        <td className="p-3 text-gray-900 font-bold tabular-nums">{d.sbcValue || '-'}</td>
                                                                                                    </tr>
                                                                                                )))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Sub-Soil Profile Table */}
                                                                            {geotechData.subSoilProfile?.some(bh => bh.length > 0) && (
                                                                                <div className="space-y-3">
                                                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                                        <LandPlot className="w-3 h-3 text-emerald-500" /> Sub-Soil Profile
                                                                                    </h5>
                                                                                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                                                                                        <table className="w-full text-left text-[11px]">
                                                                                            <thead className="bg-gray-50 border-b">
                                                                                                <tr>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">BH</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Depth (m)</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Description</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-gray-50">
                                                                                                {geotechData.subSoilProfile.map((bh, bhIdx) => bh.map((d, dIdx) => (
                                                                                                    <tr key={`profile-${bhIdx}-${dIdx}`} className="hover:bg-gray-50/30 transition-colors">
                                                                                                        <td className="p-3 font-bold text-gray-400">BH-{bhIdx + 1}</td>
                                                                                                        <td className="p-3 text-gray-900 font-medium">{d.depth || '-'}</td>
                                                                                                        <td className="p-3 text-gray-600">{d.description || '-'}</td>
                                                                                                    </tr>
                                                                                                )))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Sieve Analysis Table */}
                                                                            {grainSizeAnalysis.some(bh => bh.length > 0) && (
                                                                                <div className="space-y-3">
                                                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                                        <Layers className="w-3 h-3 text-orange-500" /> Sieve Analysis (Passing %)
                                                                                    </h5>
                                                                                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                                                                                        <table className="w-full text-left text-[11px]">
                                                                                            <thead className="bg-gray-50 border-b">
                                                                                                <tr>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">BH</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Depth</th>
                                                                                                    {[
                                                                                                        { key: 'sieve0',  label: '10mm'    },
                                                                                                        { key: 'sieve1',  label: '4.75mm'  },
                                                                                                        { key: 'sieve1b', label: '2mm'     },
                                                                                                        { key: 'sieve2',  label: '2.36mm'  },
                                                                                                        { key: 'sieve3',  label: '1.18mm'  },
                                                                                                        { key: 'sieve4',  label: '0.60mm'  },
                                                                                                        { key: 'sieve5',  label: '0.425mm' },
                                                                                                        { key: 'sieve6',  label: '0.30mm'  },
                                                                                                        { key: 'sieve7',  label: '0.15mm'  },
                                                                                                        { key: 'sieve8',  label: '0.075mm' },
                                                                                                        { key: 'sieve9',  label: 'Pan'     },
                                                                                                    ].map(({ key, label }) => (
                                                                                                        <th key={key} className="p-2 font-bold text-gray-400 text-center text-[9px] uppercase">{label}</th>
                                                                                                    ))}
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-gray-50">
                                                                                                {grainSizeAnalysis.map((bh, bhIdx) => bh.map((d, dIdx) => (
                                                                                                    <tr key={`sieve-${bhIdx}-${dIdx}`} className="hover:bg-gray-50/30 transition-colors">
                                                                                                        <td className="p-3 font-bold text-gray-400">BH-{bhIdx + 1}</td>
                                                                                                        <td className="p-3 text-gray-900 font-medium">{d.depth || '-'}</td>
                                                                                                        {['sieve0', 'sieve1', 'sieve1b', 'sieve2', 'sieve3', 'sieve4', 'sieve5', 'sieve6', 'sieve7', 'sieve8', 'sieve9'].map(key => (
                                                                                                            <td key={key} className="p-2 text-center text-gray-500 font-mono">{d[key] ?? '-'}</td>
                                                                                                        ))}
                                                                                                    </tr>
                                                                                                )))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {/* Chemical Analysis Table */}
                                                                            {geotechData.chemicalAnalysis?.some(d => d.phValue || d.sulphates) && (
                                                                                <div className="space-y-3">
                                                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                                        <FlaskConical className="w-3 h-3 text-rose-500" /> Chemical Analysis
                                                                                    </h5>
                                                                                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden w-full">
                                                                                        <table className="w-full text-left text-[11px]">
                                                                                            <thead className="bg-gray-50 border-b">
                                                                                                <tr>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">pH Value</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Sulphates</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Chlorides</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Other Parameters</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-gray-50">
                                                                                                {geotechData.chemicalAnalysis.map((d, idx) => (
                                                                                                    <tr key={`chem-${idx}`} className="hover:bg-gray-50/30 transition-colors">
                                                                                                        <td className="p-3 text-gray-900 font-medium">{d.phValue || '-'}</td>
                                                                                                        <td className="p-3 text-gray-600">{d.sulphates || '-'}</td>
                                                                                                        <td className="p-3 text-gray-600">{d.chlorides || '-'}</td>
                                                                                                        <td className="p-3 text-gray-500 italic text-[10px]">
                                                                                                            {d.additionalKeys?.filter(k => k.key).map(k => `${k.key}: ${k.value}`).join(', ') || '-'}
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Direct Shear Results Table */}
                                                                            {geotechData.directShearResults?.some(bh => bh.length > 0) && (
                                                                                <div className="space-y-3">
                                                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                                        <Beaker className="w-3 h-3 text-indigo-500" /> Direct Shear Results
                                                                                    </h5>
                                                                                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden w-full">
                                                                                        <table className="w-full text-left text-[11px]">
                                                                                            <thead className="bg-gray-50 border-b">
                                                                                                <tr>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">BH</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Shear Box Size</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Depth</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">c Value</th>
                                                                                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">phi Value</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-gray-50">
                                                                                                {geotechData.directShearResults.map((bh, bhIdx) => bh.map((d, dIdx) => (
                                                                                                    <tr key={`shear-${bhIdx}-${dIdx}`} className="hover:bg-gray-50/30 transition-colors">
                                                                                                        <td className="p-3 font-bold text-gray-400">BH-{bhIdx + 1}</td>
                                                                                                        <td className="p-3 text-gray-600">{d.shearBoxSize || '-'}</td>
                                                                                                        <td className="p-3 text-gray-600">{d.depthOfSample || '-'}</td>
                                                                                                        <td className="p-3 text-gray-900 font-bold">{d.cValue || '-'}</td>
                                                                                                        <td className="p-3 text-gray-900 font-bold">{d.phiValue || '-'}</td>
                                                                                                    </tr>
                                                                                                )))}
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
                                            {testResults[cat]?.['ManualData'] && Object.keys(testResults[cat]?.['ManualData']).length > 0 && (
                                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full w-full col-span-full md:col-span-1 lg:col-span-1 hidden">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                            Manual Investigation Data
                                                        </h4>
                                                        <div className="space-y-2 mt-4 bg-gray-50/50 p-3 rounded-lg border">
                                                            {Object.entries(testResults[cat]?.['ManualData']).map(([key, val]) => {
                                                                if (!val) return null;
                                                                const field = MANUAL_GEOTECH_FIELDS.find(f => f.key === key);
                                                                return (
                                                                    <div key={key} className="flex justify-between items-start text-xs border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                                                        <span className="text-gray-500 font-medium">{field?.label || key}:</span>
                                                                        <span className="text-gray-900 font-bold text-right ml-2">{val}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                                                            {testTypes.map(testName => {
                                                const testValues = testResults[cat]?.[testName]?.values || {};
                                                const hasData = Object.keys(testValues).length > 0;
                                                
                                                return (
                                                    <div key={testName} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-green-500' : 'bg-amber-400'}`} />
                                                                {testName}
                                                            </h4>
                                                            {!hasData ? (
                                                                <p className="text-xs text-gray-500 mb-4">Pending input</p>
                                                            ) : (
                                                                <div className="mb-6 space-y-2 max-h-40 overflow-y-auto no-scrollbar border p-3 rounded-lg bg-gray-50/50">
                                                                    {Object.entries(testValues).map(([k, v]) => (
                                                                        <div key={k} className="flex justify-between items-center text-xs border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                                                            <span className="text-gray-500 max-w-[55%] truncate pr-2" title={k}>{k}</span>
                                                                            <span className="font-medium text-gray-900 truncate text-right" title={String(v)}>{String(v) || '-'}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex justify-end pt-0">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button onClick={() => setSelectedCategory(cat)} className="bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 dark:text-white py-0 px-2 rounded-md my-0 mx-4">
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit {cat} Test Data
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                                    <p className="text-xs">Open data entry form for {cat}</p>
                                                </TooltipContent>
                                            </Tooltip>
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
                            <p className="text-gray-500 mt-2">You don't have the assigned capability to perform tests for this job's categories.</p>
                        </div>
                    )}

            {/* Category Test Data Input Dialog */}
            <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
                <DialogContent className="max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
                    <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            <FlaskConical className="w-5 h-5 text-primary" />
                            {selectedCategory} Test Data Entry
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCategory && (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-2 space-y-6 custom-scrollbar">
                                {selectedCategory && (
                                    <div className="space-y-4">
                                        {/* Entry Mode Selection - Only for Geotech categories */}
                                        {GEOTECH_NAMES.includes(selectedCategory) && (
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
</div>
                                        )}

                                        {/* Drilling Form (Geotech Only) */}
                                        {GEOTECH_NAMES.includes(selectedCategory) && (
                                            <div className="space-y-4 rounded-xl border border-gray-100 p-4 bg-white shadow-sm mb-4">
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                                                    Geotechnical Inputs
                                                </h3>
                                                <GeotechTestForm 
                                                    value={testResults[selectedCategory]?.['GeotechData'] || {}}
                                                    onChange={(val) => {
                                                        console.log('[GeotechTestForm onChange] maxDepths:', val?.maxDepths);
                                                        setTestResults(prev => ({
                                                            ...prev,
                                                            [selectedCategory]: {
                                                                ...(prev[selectedCategory] || {}),
                                                                'GeotechData': val
                                                            }
                                                        }));
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Regular Tests (non-geotech categories only) */}
                                        {!GEOTECH_NAMES.includes(selectedCategory) && (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {(() => {
                                                            const assignedTestTypes = (jobDetails.test_types || {})[selectedCategory] || [];
                                                            const dataTestTypes = Object.keys(testResults[selectedCategory] || {}).filter(k => k !== 'GeotechData' && k !== 'ManualData');
                                                            const testTypes = [...new Set([...assignedTestTypes, ...dataTestTypes])];

                                                            if (testTypes.length === 0) {
                                                                return (
                                                                    <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                                        <p className="text-gray-500 text-sm">No regular tests assigned to this category.</p>
                                                                        <p className="text-xs text-gray-400 mt-1">Assign tests in the Job Manager to see them here.</p>
                                                                    </div>
                                                                );
                                                            }

                                                            return testTypes.map(testName => (
                                                                <div key={testName} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-4">
                                                                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                                                                        <h4 className="text-sm font-bold text-gray-800">{testName}</h4>
                                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold">Regular Test</Badge>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div className="grid gap-2">
                                                                            <Label className="text-[10px] font-bold text-gray-400 uppercase">Test Value / Result</Label>
                                                                            <Input 
                                                                                value={testResults[selectedCategory]?.[testName]?.values?.['Result'] || ''}
                                                                                onChange={(e) => setTestResults(prev => ({
                                                                                    ...prev,
                                                                                    [selectedCategory]: {
                                                                                        ...(prev[selectedCategory] || {}),
                                                                                        [testName]: {
                                                                                            ...(prev[selectedCategory]?.[testName] || {}),
                                                                                            values: {
                                                                                                ...(prev[selectedCategory]?.[testName]?.values || {}),
                                                                                                'Result': e.target.value
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }))}
                                                                                placeholder="Enter numerical or descriptive result"
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                        <div className="grid gap-2">
                                                                            <Label className="text-[10px] font-bold text-gray-400 uppercase">Remarks</Label>
                                                                            <Input 
                                                                                value={testResults[selectedCategory]?.[testName]?.remarks || ''}
                                                                                onChange={(e) => setTestResults(prev => ({
                                                                                    ...prev,
                                                                                    [selectedCategory]: {
                                                                                        ...(prev[selectedCategory] || {}),
                                                                                        [testName]: {
                                                                                            ...(prev[selectedCategory]?.[testName] || {}),
                                                                                            remarks: e.target.value
                                                                                        }
                                                                                    }
                                                                                }))}
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
                                <Button variant="ghost" className="px-6 rounded-xl hover:bg-muted font-medium text-muted-foreground" onClick={() => setSelectedCategory(null)} disabled={isSaving}>Cancel</Button>
                                <Button className="px-8 rounded-xl bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold dark:text-white" onClick={async () => { const ok = await handleSaveResults(selectedCategory); if (ok !== false) setSelectedCategory(null); }} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save All Results
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
