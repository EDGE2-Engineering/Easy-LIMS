import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ArrowLeft, Save, Loader2, Package, ArrowRight, FileText, ExternalLink, CheckCircle2, Edit, UserPlus, Trash2, AlertCircle, SortAsc, SortDesc } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { WORKFLOW_STATES, MATERIALS, ROLES } from '@/data/config';
import { useWorkflowConfig } from '@/contexts/WorkflowContext';
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
import ReactSelect from 'react-select';

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
    const [showingTestingForm, setShowingTestingForm] = useState(false);
    const [jobSamples, setJobSamples] = useState([]);
    const [techAssignments, setTechAssignments] = useState([]);
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    const { toast } = useToast();
    const navigate = useNavigate();
    const { user, isAdmin, loading: authLoading } = useAuth();
    const { workflow } = useWorkflowConfig();

    const [editingRecord, setEditingRecord] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, jobId: null, jobCode: '' });

    useEffect(() => {
        if (id) {
            const existing = records.find(r => String(r.id) === String(id));
            if (existing) {
                setEditingRecord({ ...existing });
                setIsAddingNew(false);
            } else if (!authLoading) {
                // If records are loaded but id not found, it might be a new record or invalid
                // Or we can fetch it directly
                fetchJobById(id);
            }
        } else {
            setEditingRecord(null);
        }
    }, [id, records, authLoading]);

    const fetchJobById = async (jobId) => {
        if (!user || !user.id) return;
        try {
            let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
            if (isNaN(userId)) {
                // Last resort: look up by username if ID is somehow invalid
                const { data: u } = await supabase.from('users').select('id').eq('username', user.username).maybeSingle();
                if (u) userId = u.id;
            }
            if (!userId || isNaN(userId)) return;

            const { data, error } = await supabase.from('jobs').select('*, clients(client_name)').eq('id', jobId).maybeSingle();
            if (error) throw error;
            
            if (data) {
                const actualJobId = data.id;
                // Security check for analysts
                if (!isAdmin() && user?.role === ROLES.ANALYST.slug) {
                    const { data: assignments, error: assignError } = await supabase
                        .from('job_to_technicians')
                        .select('id')
                        .eq('job_id', actualJobId)
                        .eq('technician_id', userId);
                    
                    if (assignError || !assignments || assignments.length === 0) {
                        console.error("Access Denied Check:", { actualJobId, userId, userRole: user?.role, error: assignError });
                        toast({ title: "Access Denied", description: "You are not assigned to this job.", variant: "destructive" });
                        setEditingRecord(null);
                        return;
                    }
                }
                
                setEditingRecord({ ...data });
                setIsAddingNew(false);
            }
        } catch (err) {
            console.error("Failed to fetch job by ID:", err);
        }
    };

    const handleReceiveWorkOrder = async () => {
        setIsSaving(true);
        try {
            // Robustly determine the integer user ID for bigint columns
            let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
            if (isNaN(userId) && user.username) {
                const { data: userData } = await supabase.from('users').select('id').eq('username', user.username).maybeSingle();
                if (userData) userId = userData.id;
            }

            if (isNaN(userId)) {
                throw new Error("Unable to determine a valid numeric User ID. Please try logging out and back in.");
            }

            // 1. Update job Record
            const { error: updateError } = await supabase
                .from('jobs')
                .update({
                    work_order_id: woId,
                    status: WORKFLOW_STATES.WORK_ORDER_RECEIVED,
                    updated_at: new Date().toISOString(),
                    updated_by: userId
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
                    performed_by: userId,
                    remarks: `Work Order Received: ${woId}`
                });
            if (logError) throw logError;

            toast({ title: "Success", description: "Work Order Received & Workflow Updated" });
            setShowingWoForm(false);
            setWoId('');
            reloadEditingRecord();
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: err.message, variant: "destructive" });
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
                .from('job_to_technicians')
                .select('technician_id, users!job_to_technicians_technician_id_fkey(id, full_name, username)')
                .eq('job_id', jobId);

            if (error) throw error;

            // Map the foreign key relation back to a simple user object
            const techs = (data || []).map(r => r.users).filter(Boolean);
            setTechAssignments(techs);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    };

    const fetchJobSamples = async (jobId) => {
        try {
            const { data: inwardRecords } = await supabase
                .from('material_inward_register')
                .select('id')
                .eq('job_id', jobId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (inwardRecords && inwardRecords.length > 0) {
                const inward = inwardRecords[0];
                const { data: samples, error } = await supabase
                    .from('material_samples')
                    .select('*, users!material_samples_received_by_fkey(full_name), collection_centers!material_samples_collection_center_id_fkey(name)')
                    .eq('inward_id', inward.id);

                if (error) throw error;
                setJobSamples(samples || []);
            }
        } catch (err) {
            console.error('Error fetching samples:', err);
        }
    };

    const computeGrandTotal = (doc) => {
        if (!doc?.content) return null;
        const { items = [], discount = 0 } = doc.content;
        const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
        const discountAmt = (subtotal * Number(discount)) / 100;
        const afterDiscount = subtotal - discountAmt;
        const tax = afterDiscount * 0.18; // 18% GST
        return afterDiscount + tax;
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('jobs')
                .select('*, clients(client_name), users:created_by(full_name)')
                .order('created_at', { ascending: false });

            if (!isAdmin()) {
                let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
                if (isNaN(userId)) userId = -1;

                if (user?.role === ROLES.ANALYST.slug) {
                    const { data: assignments } = await supabase
                        .from('job_to_technicians')
                        .select('job_id')
                        .eq('technician_id', userId);
                    
                    const assignedJobIds = (assignments || []).map(a => a.job_id);
                    if (assignedJobIds.length > 0) {
                        query = query.in('id', assignedJobIds);
                    } else {
                        query = query.eq('id', 0); // No jobs assigned
                    }
                } else {
                    query = query.eq('created_by', userId);
                }
            }

            const { data: jobs, error } = await query;
            if (error) throw error;

            // Fetch quotation documents for all jobs in one query
            const jobIds = (jobs || []).map(j => j.id);
            let quotationMap = {};
            if (jobIds.length > 0) {
                const { data: docs } = await supabase
                    .from('documents')
                    .select('job_id, content, document_type')
                    .in('job_id', jobIds)
                    .eq('document_type', 'Quotation');
                (docs || []).forEach(doc => {
                    // Keep first quotation per job
                    if (!quotationMap[doc.job_id]) quotationMap[doc.job_id] = doc;
                });
            }

            const enriched = (jobs || []).map(j => ({
                ...j,
                quotationAmount: computeGrandTotal(quotationMap[j.id])
            }));
            setRecords(enriched);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const reloadEditingRecord = async () => {
        if (!editingRecord?.id) return;
        const jobId = editingRecord.id;
        try {
            const { data, error } = await supabase.from('jobs').select('*, clients(client_name)').eq('id', jobId).maybeSingle();
            if (error) throw error;
            if (data) {
                setEditingRecord({ ...data });
            }
            // Explicitly refresh child data — the useEffect won't re-fire since the job ID hasn't changed
            fetchJobSamples(jobId);
            fetchJobAssignments(jobId);
            fetchJobDocs(jobId);
            fetchRecords();
        } catch (error) {
            console.error("Failed to reload record:", error);
        }
    };

    useEffect(() => {
        if (editingRecord?.id) {
            fetchJobDocs(editingRecord.id);
            fetchJobSamples(editingRecord.id);
            fetchJobAssignments(editingRecord.id);
        } else {
            setLinkedDocs([]);
            setJobSamples([]);
            setTechAssignments([]);
        }
    }, [editingRecord?.id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Ensure client_id is an integer
            const clientId = typeof editingRecord.client_id === 'string' ? parseInt(editingRecord.client_id) : editingRecord.client_id;

            if (!clientId || isNaN(clientId)) {
                throw new Error("Please select a valid client.");
            }

            const payload = {
                client_id: clientId,
                project_name: editingRecord.project_name || '',
                work_order_id: editingRecord.work_order_id || null,
                status: editingRecord.status,
                updated_at: new Date().toISOString()
            };

            if (isAddingNew) {
                // Robustly determine the integer user ID for bigint columns
                let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;

                // If the ID is a UUID string (not numeric), try to resolve it from the users table
                if (isNaN(userId) && user.username) {
                    const { data: userData } = await supabase.from('users').select('id').eq('username', user.username).maybeSingle();
                    if (userData) userId = userData.id;
                }

                if (isNaN(userId)) {
                    throw new Error("Unable to determine a valid numeric User ID. Please try logging out and back in.");
                }

                // Ensure we don't send any 'id' field for new records to let DB auto-generate it
                const insertData = {
                    ...payload,
                    created_by: userId,
                    updated_by: userId
                };

                const { error } = await supabase.from('jobs').insert(insertData);
                if (error) throw error;
            } else {
                let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
                if (isNaN(userId) && user.username) {
                    const { data: userData } = await supabase.from('users').select('id').eq('username', user.username).maybeSingle();
                    if (userData) userId = userData.id;
                }

                const { error } = await supabase.from('jobs').update({
                    ...payload,
                    updated_by: userId || 1 // Fallback to 1 if still not found for updates
                }).eq('id', editingRecord.id);
                if (error) throw error;
            }
            toast({ title: "Success", description: "Job saved successfully" });
            setEditingRecord(null);
            fetchRecords();
        } catch (err) {
            console.error("Save Error:", err);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (job) => {
        setDeleteConfirmation({
            isOpen: true,
            jobId: job.id,
            jobCode: job.job_code || job.job_id
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.jobId) return;

        try {
            const jobId = deleteConfirmation.jobId;

            // 1. Get inward register ID to delete samples
            const { data: inwardRecords } = await supabase
                .from('material_inward_register')
                .select('id')
                .eq('job_id', jobId);

            if (inwardRecords && inwardRecords.length > 0) {
                const inwardIds = inwardRecords.map(r => r.id);
                // 2. Delete material samples
                await supabase.from('material_samples').delete().in('inward_id', inwardIds);
                // 3. Delete material inward register
                await supabase.from('material_inward_register').delete().in('id', inwardIds);
            }

            // 4. Delete job tests
            await supabase.from('job_tests').delete().eq('job_id', jobId);

            // 5. Delete job workflow logs
            await supabase.from('job_workflow_logs').delete().eq('job_id', jobId);

            // 6. Delete linked documents
            await supabase.from('documents').delete().eq('job_id', jobId);

            // 7. Finally delete the job itself
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', jobId);

            if (error) throw error;

            toast({ title: "Success", description: "Job and all related data deleted successfully" });
            fetchRecords();
        } catch (err) {
            console.error("Delete Error:", err);
            toast({ title: "Error", description: "Failed to delete job: " + err.message, variant: "destructive" });
        } finally {
            setDeleteConfirmation({ isOpen: false, jobId: null, jobCode: '' });
        }
    };

    const getStatusLabel = (status) => workflow.states[status]?.label || status;

    const filteredRecords = useMemo(() => {
        let result = records.filter(r =>
            ((r.job_code || r.job_id)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.clients?.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.project_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (filterStatus === 'all' || r.status === filterStatus)
        );

        // Sorting
        result.sort((a, b) => {
            let valA, valB;

            if (sortField === 'client_name') {
                valA = a.clients?.client_name || '';
                valB = b.clients?.client_name || '';
            } else if (sortField === 'quotationAmount') {
                valA = a.quotationAmount != null ? a.quotationAmount : -1;
                valB = b.quotationAmount != null ? b.quotationAmount : -1;
            } else {
                valA = a[sortField] || '';
                valB = b[sortField] || '';
            }

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [records, searchTerm, filterStatus, sortField, sortOrder]);

    const resetAll = () => {
        setSearchTerm('');
        setFilterStatus('all');
        setSortField('created_at');
        setSortOrder('desc');
    };

    if (editingRecord) {
        return (
            <div className="space-y-6 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/settings/jobs')} className="rounded-full bg-gray-50 hover:bg-primary/10 hover:text-primary transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{isAddingNew ? 'Create New Job' : `Job: ${editingRecord.job_code}`}</h2>
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
                            onActionClick={async (actionId, action, performAction) => {
                                if (actionId === 'RECEIVE_WORK_ORDER') { setShowingWoForm(true); return false; }
                                if (actionId === 'RECEIVE_MATERIAL') { setShowingMaterialForm(true); return false; }
                                if (actionId === 'ASSIGN_TECHNICIANS') { setShowingTechForm(true); return false; }
                                if (actionId === 'START_TESTING') { setShowingTestingForm(true); }
                                if (actionId === 'GENERATE_INVOICE') {
                                    const existingInvoice = linkedDocs.find(d => d.document_type === 'Tax Invoice');
                                    if (existingInvoice) {
                                        // Invoice already exists, so just perform the state transition
                                        const success = await performAction(actionId);
                                        if (success) reloadEditingRecord();
                                        return false;
                                    }
                                }
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
                                <TechnicianAssignment jobId={editingRecord.id} onComplete={() => { setShowingTechForm(false); reloadEditingRecord(); }} />
                            </DialogContent>
                        </Dialog>

                        <Dialog open={showingTestingForm} onOpenChange={setShowingTestingForm}>
                            <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Testing Data Entry</DialogTitle></DialogHeader>
                                <TestingManager initialJobId={editingRecord.id} onClose={() => { setShowingTestingForm(false); reloadEditingRecord(); }} />
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
                                {isAdmin() ? <ReactSelect
                                    className="mt-1"
                                    classNamePrefix="react-select"
                                    options={clients.map(c => ({ value: c.id, label: c.client_name }))}
                                    value={editingRecord.client_id ? {
                                        value: editingRecord.client_id,
                                        label: clients.find(c => String(c.id) === String(editingRecord.client_id))?.client_name
                                    } : null}
                                    onChange={(option) => setEditingRecord({ ...editingRecord, client_id: option ? option.value : '' })}
                                    placeholder="Search Clients..."
                                    isSearchable
                                    isClearable
                                    // isDisabled={!isAdmin()}
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            height: '48px',
                                            borderColor: '#e2e8f0',
                                            borderRadius: '0.75rem',
                                            paddingLeft: '4px',
                                            boxShadow: 'none',
                                            '&:hover': {
                                                borderColor: '#94a3b8'
                                            }
                                        }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isSelected ? '#0f172a' : state.isFocused ? '#f1f5f9' : 'white',
                                            color: state.isSelected ? 'white' : '#1e293b',
                                            fontSize: '0.875rem'
                                        })
                                    }}
                                />
                                : <p className="text-sm h-12 border-gray-200 rounded-xl">{editingRecord.client_name || ''}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-semibold">Project Name</Label>
                                {!isAdmin() && <p className="text-sm h-12 border-gray-200 rounded-xl">{editingRecord.project_name || ''}</p>}
                                {isAdmin() && <Input className="h-12 border-gray-200 rounded-xl" value={editingRecord.project_name || ''} onChange={e => setEditingRecord({ ...editingRecord, project_name: e.target.value })} />}
                            </div>
                            {!isAddingNew && editingRecord.work_order_id && (
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-semibold">Work Order ID</Label>
                                    {!isAdmin() && <p className="text-sm h-12 border-gray-200 rounded-xl">{editingRecord.work_order_id || ''}</p>}
                                    {isAdmin() && (<Input
                                        className="h-12 border-gray-200 rounded-xl bg-gray-50/50"
                                        value={editingRecord.work_order_id || ''}
                                        onChange={e => setEditingRecord({ ...editingRecord, work_order_id: e.target.value })}
                                        placeholder="e.g. WO/2026/088"
                                    />)}
                                </div>
                            )}
                        </div>
                    </div>

                    {!isAddingNew && (
                        <>
                            {/* Materials Summary */}
                            {Object.values(WORKFLOW_STATES).indexOf(editingRecord.status) >= Object.values(WORKFLOW_STATES).indexOf(WORKFLOW_STATES.MATERIAL_RECEIVED) && (
                                <div className="bg-white rounded-2xl shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4" /> Material Inward Details</h3>
                                        {isAdmin() && (
                                            <Button variant="outline" size="sm" onClick={() => setShowingMaterialForm(true)} className="h-8 text-xs"><Edit className="w-3 h-3 mr-1" /> Edit Entries</Button>
                                        )}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 border-b"><tr><th className="p-3">Code</th><th className="p-3">Material Type</th><th className="p-3">Description</th><th className="p-3">Qty</th><th className="p-3 text-right">Date</th><th className="p-3 text-right">Collected By</th><th className="p-3 text-right">Collected At</th></tr></thead>
                                            <tbody className="divide-y">{jobSamples.map((s, i) => (<tr key={i}><td className="p-3 font-bold">{s.sample_code}</td><td className="p-3 text-gray-500">{MATERIALS.find(m => m.id === s.material_type)?.name || s.material_type || '-'}</td><td className="p-3 text-gray-500">{s.sample_description}</td><td className="p-3">{s.quantity}</td><td className="p-3 text-right text-gray-400">{s.received_date}</td><td className="p-3 text-right text-gray-400">{s.users?.full_name || '-'}</td><td className="p-3 text-right text-gray-400">{s.collection_centers?.name || '-'}</td></tr>))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {Object.values(WORKFLOW_STATES).indexOf(editingRecord.status) >= Object.values(WORKFLOW_STATES).indexOf(WORKFLOW_STATES.TECHNICIANS_ASSIGNED) && (
                                <div className="bg-white rounded-2xl shadow-sm">
                                    {isAdmin() && (
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserPlus className="w-4 h-4" /> Technician Assignments</h3>
                                            <Button variant="outline" size="sm" onClick={() => setShowingTechForm(true)} className="h-8 text-xs"><Edit className="w-3 h-3 mr-1" /> Edit Assignments</Button>
                                        </div>
                                    )}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 border-b"><tr><th className="p-3">Assigned Technician</th></tr></thead>
                                            <tbody className="divide-y">{techAssignments.map((a, i) => (<tr key={i}><td className="p-3 font-bold text-gray-700">{a.full_name || a.username}</td></tr>))}
                                                {techAssignments.length === 0 && <tr><td className="p-3 text-gray-500 italic">No technicians assigned yet.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Testing Data */}
                            {Object.values(WORKFLOW_STATES).indexOf(editingRecord.status) >= Object.values(WORKFLOW_STATES).indexOf(WORKFLOW_STATES.UNDER_TESTING) && (
                                <div className="bg-white rounded-2xl shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Package className="w-4 h-4" /> Testing Data</h3>
                                    <TestingManager initialJobId={editingRecord.id} />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {isAdmin() && (
                    <div className="flex justify-end gap-3 pt-8 border-t">
                        <Button variant="outline" className="h-12 px-8 rounded-xl" onClick={() => navigate('/settings/jobs')}>Cancel</Button>
                        <Button className="h-12 px-8 rounded-xl bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Job Details
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search by Job ID or Client..."
                            className="pl-10 w-full h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {isAdmin() && <Button
                                onClick={() => { setEditingRecord({ status: WORKFLOW_STATES.JOB_CREATED, project_name: '', client_id: '' }); setIsAddingNew(true); }}
                                className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
                            >
                                <Plus className="w-4 h-4 mr-2" /> New Job
                            </Button>}
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Create a new testing job for a client</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Filters and Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Filter</span>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-48 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                    <SelectValue placeholder="All States" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All States</SelectItem>
                                    {Object.entries(workflow.states).map(([id, s]) => (
                                        <SelectItem key={id} value={id}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Sort</span>
                            <Select value={sortField} onValueChange={setSortField}>
                                <SelectTrigger className="w-40 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="created_at">Date Created</SelectItem>
                                    <SelectItem value="job_id">Job ID</SelectItem>
                                    <SelectItem value="client_name">Client Name</SelectItem>
                                    <SelectItem value="quotationAmount">Quotation Amount</SelectItem>
                                </SelectContent>
                            </Select>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 border-gray-200 bg-gray-50/50 rounded-lg"
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    >
                                        {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">Toggle {sortOrder === 'asc' ? 'Descending' : 'Ascending'} Sort</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetAll}
                            disabled={!searchTerm && filterStatus === 'all' && sortField === 'created_at' && sortOrder === 'desc'}
                            className="text-gray-400 hover:text-red-500 h-10 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            Reset
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Job Code</th>
                            <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Client and Project Name</th>
                            <th className="text-right py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Quotation Amount</th>
                            <th className="text-right py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Created On</th>
                            <th className="text-right py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Created By</th>
                            <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                            <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.map(r => (
                            <tr key={r.id} className="border-b hover:bg-gray-50/50 transition-colors group">
                                <td className="py-5 px-6">
                                    <span className="font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">{r.job_code}</span>
                                </td>
                                <td className="py-5 px-6">
                                    <div className="font-bold text-gray-900">{r.clients?.client_name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{r.project_name}</div>
                                </td>
                                <td className="py-5 px-6 text-right">
                                    {r.quotationAmount != null ? (
                                        <span className="font-bold text-gray-900 tabular-nums">
                                            ₹{r.quotationAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                    ) : (
                                        <span className="text-gray-300 font-bold">—</span>
                                    )}
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <div className="text-xs text-gray-500 mt-1">
                                        {new Date(r.created_at).toLocaleString("en-IN", {
                                            timeZone: "Asia/Kolkata",
                                            dateStyle: "medium",
                                        })}
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <div className="text-xs text-gray-500 mt-1">
                                        {r.users?.full_name || r.created_by || '-'}
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    {(() => {
                                        const stateColor = workflow.states[r.status]?.color;
                                        return stateColor ? (
                                            <span
                                                style={{
                                                    backgroundColor: stateColor.bg,
                                                    color: stateColor.text,
                                                    borderColor: stateColor.border,
                                                }}
                                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap"
                                            >
                                                {getStatusLabel(r.status)}
                                            </span>
                                        ) : (
                                            <Badge variant="secondary" className="bg-white border-gray-200 text-gray-700 shadow-sm">
                                                {getStatusLabel(r.status)}
                                            </Badge>
                                        );
                                    })()}
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <div className="flex justify-center gap-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm" onClick={() => navigate(`/settings/jobs/${r.id}`)} className="h-9 px-4 rounded-lg hover:bg-primary hover:text-white transition-all">
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                                <p className="text-xs">Open Job</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        {isAdmin() && <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(r)} className="h-9 px-4 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                                <p className="text-xs">Delete this job</p>
                                            </TooltipContent>
                                        </Tooltip>}
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
