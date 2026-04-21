import { useState, useEffect } from 'react';
import { Search, Plus, ArrowLeft, Save, Loader2, Package, ArrowRight, FileText, ExternalLink, CheckCircle2, Edit, UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_CONFIG, WORKFLOW_STATES, JOB_CATEGORIES } from '@/data/config';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WorkflowPanel from '@/components/common/WorkflowPanel';
import TechnicianAssignment from './TechnicianAssignment';
import TestingManager from './TestingManager';
import MaterialInwardManager from './MaterialInwardManager';

const JobsManager = ({ id }) => {
    const [records, setRecords] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [linkedDocs, setLinkedDocs] = useState([]);
    const [woId, setWoId] = useState('');
    const [showingWoForm, setShowingWoForm] = useState(false);
    const [showingMaterialForm, setShowingMaterialForm] = useState(false);
    const [showingTechForm, setShowingTechForm] = useState(false);
    const [jobSamples, setJobSamples] = useState([]);
    const [techAssignments, setTechAssignments] = useState([]);
    
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [editingRecord, setEditingRecord] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, jobId: null, jobCode: '' });
    
    useEffect(() => {
        if (id) {
            const existing = records.find(r => r.id === id);
            if (existing) {
                let cats = existing.job_categories || [];
                if (typeof cats === 'string') {
                    try { cats = JSON.parse(cats); } catch (e) { cats = []; }
                }
                setEditingRecord({ ...existing, job_categories: Array.isArray(cats) ? cats : [] });
                setIsAddingNew(false);
            } else if (!loading) {
                // If records are loaded but id not found, it might be a new record or invalid
                // Or we can fetch it directly
                fetchJobById(id);
            }
        } else {
            setEditingRecord(null);
        }
    }, [id, records, loading]);

    const fetchJobById = async (jobId) => {
        try {
            const { data, error } = await supabase.from('jobs').select('*, clients(client_name)').eq('id', jobId).maybeSingle();
            if (error) throw error;
            if (data) {
                let cats = data.job_categories || [];
                if (typeof cats === 'string') {
                    try { cats = JSON.parse(cats); } catch (e) { cats = []; }
                }
                setEditingRecord({ ...data, job_categories: Array.isArray(cats) ? cats : [] });
                setIsAddingNew(false);
            }
        } catch (err) {
            console.error("Failed to fetch job by ID:", err);
        }
    };

    const handleReceiveWorkOrder = async () => {
        setIsSaving(true);
        try {
            // 1. Update job Record
            const { error: updateError } = await supabase
                .from('jobs')
                .update({ 
                    work_order_id: woId,
                    status: WORKFLOW_STATES.WORK_ORDER_RECEIVED,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingRecord.id);

            if (updateError) throw updateError;

            // 2. Log workflow transition
            const { error: logError } = await supabase
                .from('job_workflow_logs')
                .insert({
                    job_id: editingRecord.id,
                    from_state: editingRecord.status,
                    to_state: WORKFLOW_STATES.WORK_ORDER_RECEIVED,
                    action_id: 'RECEIVE_WORK_ORDER',
                    performed_by: user?.id,
                    remarks: `Work Order Received: ${woId}`
                });
            if (logError) throw logError;

            toast({ title: "Success", description: "Work Order Received & Workflow Updated" });
            setShowingWoForm(false);
            setWoId('');
            reloadEditingRecord();
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Column 'work_order_id' might be missing in your database. Please update your schema.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const fetchJobDocs = async (jobId) => {
        try {
            const { data, error } = await supabase.from('documents').select('*').eq('job_id', jobId);
            if (error) throw error;
            setLinkedDocs(data || []);
        } catch (error) {
            console.error('Error fetching linked documents:', error);
        }
    };

    useEffect(() => {
        fetchRecords();
        fetchClients();
    }, []);

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, client_name').order('client_name');
        setClients(data || []);
    };

    useEffect(() => {
        if (editingRecord?.id) {
            fetchJobSamples(editingRecord.id);
            fetchJobAssignments(editingRecord.id);
        } else {
            setJobSamples([]);
            setTechAssignments([]);
        }
    }, [editingRecord?.id]);

    const fetchJobAssignments = async (jobId) => {
        try {
            const { data, error } = await supabase
                .from('job_tests')
                .select('*, users!job_tests_assigned_technician_id_fkey(full_name, username)')
                .eq('job_id', jobId);
            
            if (error) throw error;
            setTechAssignments(data || []);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    };

    const fetchJobSamples = async (jobId) => {
        try {
            const { data: inward } = await supabase
                .from('material_inward_register')
                .select('id')
                .eq('job_id', jobId)
                .maybeSingle();

            if (inward) {
                const { data: samples, error } = await supabase
                    .from('material_samples')
                    .select('*')
                    .eq('inward_id', inward.id);

                if (error) throw error;
                setJobSamples(samples || []);
            }
        } catch (err) {
            console.error('Error fetching samples:', err);
        }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('jobs').select('*, clients(client_name)').order('created_at', { ascending: false });
            if (error) throw error;
            setRecords(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const reloadEditingRecord = async () => {
        if (!editingRecord?.id) return;
        try {
            const { data, error } = await supabase.from('jobs').select('*, clients(client_name)').eq('id', editingRecord.id).maybeSingle();
            if (error) throw error;
            if (data) {
                let cats = data.job_categories || [];
                if (typeof cats === 'string') {
                    try { cats = JSON.parse(cats); } catch (e) { cats = []; }
                }
                setEditingRecord({ ...data, job_categories: Array.isArray(cats) ? cats : [] });
            }
            fetchRecords();
        } catch (error) {
            console.error("Failed to reload record:", error);
        }
    };

    useEffect(() => {
        if (editingRecord?.id) {
            fetchJobDocs(editingRecord.id);
        } else {
            setLinkedDocs([]);
        }
    }, [editingRecord?.id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                client_id: editingRecord.client_id,
                project_name: editingRecord.project_name,
                work_order_id: editingRecord.work_order_id,
                status: editingRecord.status,
                updated_at: new Date().toISOString()
            };

            if (isAddingNew) {
                const { error } = await supabase.from('jobs').insert({ ...payload, created_by: user.id });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('jobs').update(payload).eq('id', editingRecord.id);
                if (error) throw error;
            }
            toast({ title: "Success", description: "Job saved successfully" });
            setEditingRecord(null);
            fetchRecords();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (job) => {
        setDeleteConfirmation({
            isOpen: true,
            jobId: job.id,
            jobCode: job.job_id
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.jobId) return;
        
        try {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', deleteConfirmation.jobId);

            if (error) throw error;

            toast({ title: "Success", description: "Job deleted successfully" });
            fetchRecords();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setDeleteConfirmation({ isOpen: false, jobId: null, jobCode: '' });
        }
    };

    const getStatusLabel = (status) => APP_CONFIG.workflow.states[status]?.label || status;

    const filteredRecords = records.filter(r => 
        (r.job_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         r.clients?.client_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterStatus === 'all' || r.status === filterStatus)
    );

    if (editingRecord) {
        return (
            <div className="space-y-6 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/settings/jobs')} className="rounded-full bg-gray-50 hover:bg-primary/10 hover:text-primary transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{isAddingNew ? 'Create New Job' : `Job: ${editingRecord.job_id}`}</h2>
                            <p className="text-sm text-gray-500">Manage job details and track its progress in the laboratory workflow.</p>
                        </div>
                    </div>
                </div>

                {!isAddingNew && (
                    <div className="mb-10 space-y-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Workflow Actions</h3>
                        <WorkflowPanel 
                            jobId={editingRecord.id} 
                            currentStatus={editingRecord.status} 
                            onTransition={reloadEditingRecord} 
                            onActionClick={(actionId) => {
                                if (actionId === 'RECEIVE_WORK_ORDER') { setShowingWoForm(true); return false; }
                                if (actionId === 'RECEIVE_MATERIAL') { setShowingMaterialForm(true); return false; }
                                if (actionId === 'ASSIGN_TECHNICIANS') { setShowingTechForm(true); return false; }
                            }}
                        />

                        {/* Modals & Dialogs Group */}
                        <Dialog open={showingWoForm} onOpenChange={setShowingWoForm}>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-orange-600">
                                        <FileText className="w-5 h-5" /> Receive Work Order
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="py-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-semibold">Client Work Order ID</Label>
                                        <Input autoFocus placeholder="e.g. WO/2026/088" value={woId} onChange={e => setWoId(e.target.value)} />
                                    </div>
                                    <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setShowingWoForm(false)}>Cancel</Button><Button className="bg-orange-500 text-white" onClick={handleReceiveWorkOrder} disabled={!woId}>Confirm</Button></div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={showingMaterialForm} onOpenChange={setShowingMaterialForm}>
                            <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Material Samples Input</DialogTitle></DialogHeader>
                                <MaterialInwardManager initialJobId={editingRecord.id} onClose={() => setShowingMaterialForm(false)} onSuccess={() => { setShowingMaterialForm(false); reloadEditingRecord(); }} />
                            </DialogContent>
                        </Dialog>

                        <Dialog open={showingTechForm} onOpenChange={setShowingTechForm}>
                            <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Assign Technicians</DialogTitle></DialogHeader>
                                <TechnicianAssignment jobId={editingRecord.id} jobCategories={editingRecord.job_categories} onComplete={() => { setShowingTechForm(false); reloadEditingRecord(); }} />
                            </DialogContent>
                        </Dialog>

                        {/* Linked Documents Summary */}
                        {linkedDocs.length > 0 && (
                            <div className="p-6 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText className="w-3 h-3" /> Job Documents</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {linkedDocs.map(doc => (
                                        <div key={doc.id} className="p-3 bg-white rounded-xl border border-blue-50 flex items-center justify-between group hover:border-blue-300 transition-all cursor-pointer" onClick={() => navigate(`/doc/${doc.id}`)}>
                                            <div className="space-y-0.5"><div className="text-[9px] font-bold text-blue-500">{doc.document_type}</div><div className="font-mono text-xs font-bold text-gray-700">{doc.quote_number}</div></div>
                                            <ExternalLink className="w-3 h-3 text-blue-300 group-hover:text-blue-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Client Details</h3>

                {/* Main Content Sections */}
                <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-semibold">Client</Label>
                                <Select value={editingRecord.client_id} onValueChange={v => setEditingRecord({...editingRecord, client_id: v})}>
                                    <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue placeholder="Select Client" /></SelectTrigger>
                                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                 <Label className="text-gray-700 font-semibold">Project Name</Label>
                                 <Input className="h-12 border-gray-200 rounded-xl" value={editingRecord.project_name || ''} onChange={e => setEditingRecord({...editingRecord, project_name: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {!isAddingNew && (
                        <>
                            {/* Materials Summary */}
                            {[WORKFLOW_STATES.MATERIAL_RECEIVED, WORKFLOW_STATES.TECHNICIANS_ASSIGNED, WORKFLOW_STATES.UNDER_TESTING, WORKFLOW_STATES.TESTING_COMPLETE, WORKFLOW_STATES.UNDER_REVIEW].includes(editingRecord.status) && (
                                <div className="bg-white rounded-2xl shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4" /> Material Inward Details</h3>
                                        <Button variant="outline" size="sm" onClick={() => setShowingMaterialForm(true)} className="h-8 text-xs"><Edit className="w-3 h-3 mr-1" /> Edit Entries</Button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 border-b"><tr><th className="p-3">Code</th><th className="p-3">Description</th><th className="p-3">Qty</th><th className="p-3 text-right">Date</th></tr></thead>
                                            <tbody className="divide-y">{jobSamples.map((s, i) => (<tr key={i}><td className="p-3 font-bold">{s.sample_code}</td><td className="p-3 text-gray-500">{s.sample_description}</td><td className="p-3">{s.quantity}</td><td className="p-3 text-right text-gray-400">{s.received_date}</td></tr>))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {[WORKFLOW_STATES.TECHNICIANS_ASSIGNED, WORKFLOW_STATES.UNDER_TESTING, WORKFLOW_STATES.TESTING_COMPLETE, WORKFLOW_STATES.UNDER_REVIEW].includes(editingRecord.status) && (
                                <div className="bg-white rounded-2xl shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserPlus className="w-4 h-4" /> Technician Assignments</h3>
                                        <Button variant="outline" size="sm" onClick={() => setShowingTechForm(true)} className="h-8 text-xs"><Edit className="w-3 h-3 mr-1" /> Edit Assignments</Button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 border-b"><tr><th className="p-3">Testing Category</th><th className="p-3">Assigned Technician</th><th className="p-3 text-right">Status</th></tr></thead>
                                            <tbody className="divide-y">{techAssignments.map((a, i) => (<tr key={i}><td className="p-3 font-bold">{a.category}</td><td className="p-3 text-gray-500">{a.users?.full_name || a.users?.username || 'Unassigned'}</td><td className="p-3 text-right text-gray-400">{a.status}</td></tr>))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Testing Data */}
                            {[WORKFLOW_STATES.UNDER_TESTING, WORKFLOW_STATES.TESTING_COMPLETE, WORKFLOW_STATES.UNDER_REVIEW].includes(editingRecord.status) && (
                                <div className="bg-white rounded-2xl shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Package className="w-4 h-4" /> Testing Data</h3>
                                    <TestingManager initialJobId={editingRecord.id} />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-8 border-t">
                    <Button variant="outline" className="h-12 px-8 rounded-xl" onClick={() => navigate('/settings/jobs')}>Cancel</Button>
                    <Button className="h-12 px-8 rounded-xl bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20" onClick={handleSave} disabled={isSaving}>
                         {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Job Details
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input className="pl-12 h-12 border-gray-200 rounded-xl" placeholder="Search by Job ID or Client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48 h-12 border-gray-200 rounded-xl"><SelectValue placeholder="All States" /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All States</SelectItem>
                             {Object.entries(APP_CONFIG.workflow.states).map(([id, s]) => <SelectItem key={id} value={id}>{s.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => { setEditingRecord({ status: WORKFLOW_STATES.JOB_CREATED, project_name: '', client_id: '' }); setIsAddingNew(true); }} className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-dark">
                         <Plus className="mr-2 h-4 w-4" /> New Job
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Job ID</th>
                             <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Client / Project</th>
                             <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Current Status</th>
                             <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.map(r => (
                            <tr key={r.id} className="border-b hover:bg-gray-50/50 transition-colors group">
                                <td className="py-5 px-6">
                                    <span className="font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">{r.job_id}</span>
                                </td>
                                <td className="py-5 px-6">
                                    <div className="font-bold text-gray-900">{r.clients?.client_name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{r.project_name}</div>
                                </td>
                                <td className="py-5 px-6 text-center">
                                     <Badge variant="secondary" className="bg-white border-gray-200 text-gray-700 shadow-sm">
                                         {getStatusLabel(r.status)}
                                     </Badge>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <div className="flex justify-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/settings/jobs/${r.id}`)} className="h-9 px-4 rounded-lg hover:bg-primary hover:text-white transition-all">
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(r)} className="h-9 px-4 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, jobId: null, jobCode: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Delete Job?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete job <span className="font-semibold text-gray-900">{deleteConfirmation.jobCode}</span>?
                            This action cannot be undone and will remove all associated records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Yes, Delete It
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default JobsManager;
