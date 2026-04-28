
import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Package, CheckCircle2, FlaskConical, Beaker, Clock, Calendar, ArrowLeft, Save, X, Send, Edit } from 'lucide-react';
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
import { TEST_SCHEMA } from '@/data/test_schemas';
import DynamicForm from '@/components/common/DynamicForm';
import GeotechTestForm from './GeotechTestForm';
import WorkflowPanel from '@/components/common/WorkflowPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { camelCaseToTitleCase } from '@/lib/utils';

const TestingManager = ({ initialJobId, onClose }) => {
    const [jobDetails, setJobDetails] = useState(null);
    const [samples, setSamples] = useState([]);
    const [testResults, setTestResults] = useState({}); // { category: { testName: { values: {}, remarks: "" } } }
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [techCapabilities, setTechCapabilities] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const { toast } = useToast();
    const { user, isAdmin } = useAuth();
    const { canAction } = usePermissions();
    const { transition, isTransitioning } = useWorkflow();

    useEffect(() => {
        if (initialJobId) fetchData();
    }, [initialJobId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Job
            const { data: job, error: jobError } = await supabase.from('jobs').select('*, clients(client_name)').eq('id', initialJobId).single();
            if (jobError) throw jobError;
            setJobDetails(job);

            // Fetch Samples
            const { data: inwards, error: inError } = await supabase.from('material_inward_register').select('*, material_samples(*)').eq('job_id', initialJobId);
            if (!inError) setSamples(inwards.flatMap(i => i.material_samples || []));

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
            setLoading(false);
        }
    };

    const handleResultChange = (category, testName, fieldId, value) => {
        setTestResults(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] || {}),
                [testName]: {
                    ...((prev[category] || {})[testName] || {}),
                    values: { ...(((prev[category] || {})[testName] || {}).values || {}), [fieldId]: value }
                }
            }
        }));
    };

    const handleSaveResults = async (category) => {
        setIsSaving(true);
        try {
            const { error } = await supabase.from('job_tests').upsert({
                job_id: initialJobId,
                category,
                results: testResults[category] || {},
                status: 'IN_PROGRESS',
                updated_at: new Date().toISOString()
            }, { onConflict: 'job_id,category' });

            if (error) throw error;
            toast({ title: "Progress Saved", description: `Results for ${category} have been saved.` });
        } catch (err) {
            toast({ title: "Error", description: "Failed to save results", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
    if (!jobDetails) return null;

    const jobCats = Array.isArray(jobDetails.job_categories) ? jobDetails.job_categories : [];
    const assignedCats = Object.keys(jobDetails.test_types || {});
    const dataCats = Object.keys(testResults);
    const allCategories = [...new Set([...jobCats, ...assignedCats, ...dataCats])];
    
    // Admin gets to see all assigned categories. Technicians only see their capable ones, PLUS categories that already have data.
    const visibleCategories = isAdmin() ? allCategories : allCategories.filter(c => techCapabilities.includes(c) || dataCats.includes(c));

    return (
        <div className="w-full animate-in fade-in duration-500">
            {visibleCategories.length > 0 ? (
                        <Tabs defaultValue={visibleCategories[0]} className="w-full">
                            <TabsList className="bg-white border rounded-xl p-1 mb-6 flex-wrap h-auto">
                                {visibleCategories.map(cat => (
                                    <TabsTrigger key={cat} value={cat} className="px-6 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                                        {cat}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {visibleCategories.map(cat => {
                                const assignedTestTypes = (jobDetails.test_types || {})[cat] || [];
                                const dataTestTypes = Object.keys(testResults[cat] || {}).filter(k => k !== 'GeotechData');
                                const schemaTestTypes = Object.keys(TEST_SCHEMA[cat] || {});
                                const testTypes = [...new Set([...assignedTestTypes, ...dataTestTypes, ...schemaTestTypes])];
                                return (
                                    <TabsContent key={cat} value={cat} className="space-y-6 outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {cat === 'Soil Testing' && (
                                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full w-full col-span-full md:col-span-2 lg:col-span-3">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${Object.keys(testResults[cat]?.['GeotechData'] || {}).length > 0 ? 'bg-green-500' : 'bg-amber-400'}`} />
                                                            Geotechnical Data
                                                        </h4>
                                                        {!testResults[cat]?.['GeotechData'] || Object.keys(testResults[cat]?.['GeotechData'] || {}).length === 0 ? (
                                                            <p className="text-xs text-gray-500 mb-4">Pending geotechnical input</p>
                                                        ) : (
                                                            <div className="text-sm text-gray-600 grid grid-cols-2 gap-4 mt-3">
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                                                                    <span className="font-semibold text-gray-700">Borehole Logs</span>
                                                                    <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">{testResults[cat]['GeotechData'].boreholeLogs?.length || 0} Levels</span>
                                                                </div>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                                                                    <span className="font-semibold text-gray-700">Lab Tests</span>
                                                                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">{testResults[cat]['GeotechData'].labTestResults?.length || 0} Levels</span>
                                                                </div>
                                                                {/* Display more mini-summaries here as needed */}
                                                                <p className="text-xs text-gray-400 italic col-span-full mt-1">Click Edit Results to manage complex geotechnical tables.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {testTypes.map(testName => {
                                                const testValues = testResults[cat]?.[testName]?.values || {};
                                                const hasData = Object.keys(testValues).length > 0;
                                                const testSchema = TEST_SCHEMA[cat]?.[testName] || [];
                                                
                                                return (
                                                    <div key={testName} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-green-500' : 'bg-amber-400'}`} />
                                                                {/* {camelCaseToTitleCase(testName)}  */}
                                                                                                                                {testName}

                                                            </h4>
                                                            {!hasData ? (
                                                                <p className="text-xs text-gray-500 mb-4">Pending input</p>
                                                            ) : (
                                                                <div className="mb-6 space-y-2 max-h-40 overflow-y-auto no-scrollbar border p-3 rounded-lg bg-gray-50/50">
                                                                    {Object.entries(testValues).map(([k, v]) => {
                                                                        const schemaField = testSchema.find(f => f.id === k);
                                                                        const label = schemaField ? schemaField.label : k;
                                                                        const unit = schemaField?.unit ? ` ${schemaField.unit}` : '';
                                                                        return (
                                                                            <div key={k} className="flex justify-between items-center text-xs border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                                                                <span className="text-gray-500 max-w-[55%] truncate pr-2" title={label}>{label}</span>
                                                                                <span className="font-medium text-gray-900 truncate text-right" title={String(v) + unit}>{String(v) || '-'} {v ? unit : ''}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button onClick={() => setSelectedCategory(cat)} className="bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20">
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit {cat} Results
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
                        <div className="bg-amber-50 border border-amber-100 p-8 rounded-xl text-center">
                            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-amber-900">No Authorized Test Streams</h3>
                            <p className="text-amber-700 mt-2">You don't have the assigned capability to perform tests for this job's categories.</p>
                        </div>
                    )}

            {/* Category Test Data Input Dialog */}
            <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
                <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl border-b pb-4">
                            <FlaskConical className="w-5 h-5 text-primary" />
                            Edit {selectedCategory} Results
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCategory && (
                        <div className="py-4 space-y-8">
                            {selectedCategory === 'Soil Testing' && (
                                <div className="space-y-4 rounded-xl border border-gray-100 p-6 bg-white shadow-sm mb-6">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        Advanced Geotechnical Inputs
                                    </h3>
                                    <GeotechTestForm 
                                        value={testResults['Soil Testing']?.['GeotechData'] || {}}
                                        onChange={(val) => setTestResults(prev => ({ 
                                            ...prev, 
                                            'Soil Testing': {
                                                ...(prev['Soil Testing'] || {}),
                                                'GeotechData': val
                                            }
                                        }))}
                                    />
                                </div>
                            )}
                            {Object.keys(TEST_SCHEMA[selectedCategory] || {}).map(testName => (
                                <div key={testName} className="space-y-4 border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        {testName}
                                    </h3>
                                    <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 shadow-inner">
                                        <DynamicForm 
                                            schema={TEST_SCHEMA[selectedCategory]?.[testName]} 
                                            values={testResults[selectedCategory]?.[testName]?.values || {}}
                                            onChange={(fId, val) => handleResultChange(selectedCategory, testName, fId, val)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-gray-700">Test Remarks & Observations</Label>
                                        <textarea 
                                            className="w-full p-4 min-h-[80px] text-sm border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
                                            placeholder={`Enter any specific observations or notes for ${testName}...`}
                                            value={testResults[selectedCategory]?.[testName]?.remarks || ""}
                                            onChange={(e) => setTestResults(prev => ({
                                                ...prev,
                                                [selectedCategory]: {
                                                    ...(prev[selectedCategory] || {}),
                                                    [testName]: { ...((prev[selectedCategory] || {})[testName] || {}), remarks: e.target.value }
                                                }
                                            }))}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end gap-3 pt-1 mt-1 sticky bottom-0 pb-2 z-10">
                                <Button variant="outline" className="px-6 rounded-xl" onClick={() => setSelectedCategory(null)} disabled={isSaving}>Cancel</Button>
                                <Button className="px-6 rounded-xl bg-primary hover:bg-primary-dark shadow-md" onClick={async () => { await handleSaveResults(selectedCategory); setSelectedCategory(null); }} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Results
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
