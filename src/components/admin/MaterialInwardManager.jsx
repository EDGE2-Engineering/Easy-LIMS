
import React, { useState, useEffect } from 'react';
import { Search, Trash2, Edit, ExternalLink, FileText, Loader2, AlertCircle, ArrowUpDown, SortAsc, SortDesc, Calendar, Package, Plus, X, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { format } from 'date-fns';
import { WORKFLOW_STATES } from '@/data/config';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';

const MaterialInwardManager = ({ initialJobId, onClose, onSuccess }) => {
    const [records, setRecords] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterClient, setFilterClient] = useState('all');
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, recordId: null, jobOrderNo: '' });
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [appUsers, setAppUsers] = useState([]);
    const [collectionCenters, setCollectionCenters] = useState([]);
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user, isStandard } = useAuth();

    // Management State (Consistent with AdminServicesManager)
    const [editingRecord, setEditingRecord] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const statusOptions = [
        'RECEIVED', 'UIN_GENERATED', 'SENT_TO_DEPARTMENT', 'UNDER_TESTING',
        'TEST_COMPLETED', 'REPORT_GENERATED', 'UNDER_REVIEW', 'SIGNED',
        'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'REPORT_RELEASED', 'COMPLETED'
    ];

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, client_name')
                .order('client_name');
            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name')
                .eq('is_active', true)
                .order('full_name');
            if (error) throw error;
            setAppUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchCollectionCenters = async () => {
        try {
            const { data, error } = await supabase
                .from('collection_centers')
                .select('id, name')
                .order('name');
            if (error) throw error;
            setCollectionCenters(data || []);
        } catch (error) {
            console.error('Error fetching collection centers:', error);
        }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('material_inward_register')
                .select(`
          *,
          clients(client_name),
          users!material_inward_register_created_by_fkey(full_name),
          material_samples(received_date)
        `);

            if (isStandard()) {
                query = query.eq('created_by', user.id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setRecords(data || []);
        } catch (error) {
            console.error('Error fetching material inward records:', error);
            toast({
                title: "Error",
                description: "Failed to load material inward records. " + error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
        fetchClients();
        fetchUsers();
        fetchCollectionCenters();
    }, []);

    useEffect(() => {
        if (initialJobId) {
            const checkExistingOrAddNew = async (jobId) => {
                setLoading(true);
                try {
                    // 1. Check if inward record already exists for this job_id
                    const { data: existing, error: fetchError } = await supabase
                        .from('material_inward_register')
                        .select('*')
                        .eq('job_id', jobId)
                        .maybeSingle();

                    if (!fetchError && existing) {
                        // Enter EDIT mode for existing record
                        await handleEdit(existing);
                        return;
                    }

                    // 2. If not, create a new one based on job details
                    const { data: job, error } = await supabase
                        .from('jobs')
                        .select('*, clients(*)')
                        .eq('id', jobId)
                        .single();
                    if (error) throw error;

                    setEditingRecord({
                        job_order_no: '',
                        po_wo_number: job.work_order_id || '',
                        client_id: job.client_id,
                        job_id: job.id,
                        samples: [
                            {
                                sample_code: '',
                                sample_description: '',
                                quantity: '',
                                received_date: format(new Date(), 'yyyy-MM-dd'),
                                received_time: format(new Date(), 'HH:mm'),
                                received_by: user.id || '',
                                collection_center_id: '',
                                expected_test_days: 7
                            }
                        ]
                    });
                    setIsAddingNew(true);
                } catch (error) {
                    console.error('Error in inward check:', error);
                    toast({ title: "Error", description: "Failed to load/check inward details.", variant: "destructive" });
                } finally {
                    setLoading(false);
                }
            };
            checkExistingOrAddNew(initialJobId);
        }
    }, [initialJobId]);

    const handleAddNew = () => {
        setEditingRecord({
            job_order_no: '',
            po_wo_number: '',
            client_id: '',
            samples: [
                {
                    sample_code: '',
                    sample_description: '',
                    quantity: '',
                    received_date: format(new Date(), 'yyyy-MM-dd'),
                    received_time: format(new Date(), 'HH:mm'),
                    received_by: user.id,
                    collection_center_id: '',
                    expected_test_days: 7
                }
            ]
        });
        setIsAddingNew(true);
    };

    const handleEdit = async (record) => {
        setLoading(true);
        try {
            const { data: samples, error } = await supabase
                .from('material_samples')
                .select('*')
                .eq('inward_id', record.id);

            if (error) throw error;

            setEditingRecord({
                ...record,
                samples: samples.map(s => ({
                    ...s,
                    received_date: format(new Date(s.received_date), 'yyyy-MM-dd'),
                    received_by: s.received_by || user.id
                })) || []
            });
            setIsAddingNew(false);
        } catch (error) {
            console.error('Error fetching samples:', error);
            toast({ title: "Error", description: "Failed to load samples for editing.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddSample = () => {
        setEditingRecord(prev => ({
            ...prev,
            samples: [
                ...prev.samples,
                {
                    sample_code: '',
                    sample_description: '',
                    quantity: '',
                    received_date: format(new Date(), 'yyyy-MM-dd'),
                    received_time: format(new Date(), 'HH:mm'),
                    received_by: user.id,
                    collection_center_id: '',
                    expected_test_days: 7
                }
            ]
        }));
    };

    const handleRemoveSample = (index) => {
        const updatedSamples = editingRecord.samples.filter((_, i) => i !== index);
        setEditingRecord(prev => ({ ...prev, samples: updatedSamples }));
    };

    const handleSampleChange = (index, field, value) => {
        const updatedSamples = [...editingRecord.samples];
        updatedSamples[index][field] = value;
        setEditingRecord(prev => ({ ...prev, samples: updatedSamples }));
    };

    const handleSave = async () => {
        if (!editingRecord.client_id) {
            toast({ title: "Error", description: "Please select a client", variant: "destructive" });
            return;
        }
        if (editingRecord.samples.length === 0) {
            toast({ title: "Error", description: "Please add at least one sample", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            let inwardId = editingRecord.id;

            if (isAddingNew) {
                // Create Register Entry
                const { data: inwardData, error: inwardError } = await supabase
                    .from('material_inward_register')
                    .insert({
                        job_order_no: editingRecord.job_order_no || `JO-${Date.now()}`,
                        po_wo_number: editingRecord.po_wo_number,
                        client_id: editingRecord.client_id,
                        job_id: editingRecord.job_id || null,
                        created_by: user.id,
                        status: 'RECEIVED'
                    })
                    .select()
                    .single();

                if (inwardError) throw inwardError;
                inwardId = inwardData.id;
            } else {
                // Update Register Entry
                const { error: inwardError } = await supabase
                    .from('material_inward_register')
                    .update({
                        job_order_no: editingRecord.job_order_no,
                        po_wo_number: editingRecord.po_wo_number,
                        client_id: editingRecord.client_id,
                        status: editingRecord.status,
                        updated_by: user.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingRecord.id);

                if (inwardError) throw inwardError;

                // Delete existing samples to rebuild them (simplest approach for batch sync)
                const { error: deleteError } = await supabase
                    .from('material_samples')
                    .delete()
                    .eq('inward_id', inwardId);

                if (deleteError) throw deleteError;
            }

            // Create/Recreate Samples
            const samplesToInsert = editingRecord.samples.map(sample => ({
                inward_id: inwardId,
                sample_code: sample.sample_code,
                sample_description: sample.sample_description,
                quantity: parseFloat(sample.quantity) || 0,
                received_date: sample.received_date,
                received_time: sample.received_time,
                received_by: sample.received_by,
                collection_center_id: sample.collection_center_id || null,
                expected_test_days: parseInt(sample.expected_test_days) || 7
            }));

            const { error: samplesError } = await supabase
                .from('material_samples')
                .insert(samplesToInsert);

            if (samplesError) throw samplesError;

            toast({
                title: "Success",
                description: `Material Inward Record ${isAddingNew ? 'created' : 'updated'} successfully!`
            });

            // Telegram Notification
            const clientName = clients.find(c => c.id === editingRecord.client_id)?.client_name || 'Unknown Client';
            const action = isAddingNew ? 'New Entry' : 'Entry Updated';
            const emoji = isAddingNew ? '📥' : '✏️';
            const message = `${emoji} *Material Inward ${action}*\n\nJob OrderNo: \`${editingRecord.job_order_no || inwardId}\`\nClient: \`${clientName}\`\nSamples: \`${editingRecord.samples.length}\`\nBy: \`${user?.fullName || 'Unknown'}\``;
            sendTelegramNotification(message);
            if (editingRecord.job_id && isAddingNew) {
                // Update job status
                await supabase
                    .from('jobs')
                    .update({ status: WORKFLOW_STATES.MATERIAL_RECEIVED })
                    .eq('id', editingRecord.job_id);

                // Add transition log
                await supabase.from('job_workflow_logs').insert({
                    job_id: editingRecord.job_id,
                    to_state: WORKFLOW_STATES.MATERIAL_RECEIVED,
                    action_id: 'RECEIVE_MATERIAL',
                    performed_by: user.id,
                    remarks: `Material Received: ${editingRecord.job_order_no || inwardId}`
                });
            }

            if (onSuccess) {
                onSuccess();
            } else if (onClose) {
                onClose();
            } else {
                setEditingRecord(null);
                setIsAddingNew(false);
                fetchRecords();
            }
        } catch (error) {
            console.error('Error saving inward record:', error);
            toast({ title: "Error", description: "Failed to save record: " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (record) => {
        setDeleteConfirmation({
            isOpen: true,
            recordId: record.id,
            jobOrderNo: record.job_order_no
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.recordId) return;

        try {
            const { error } = await supabase
                .from('material_inward_register')
                .delete()
                .eq('id', deleteConfirmation.recordId);

            if (error) throw error;

            toast({ title: "Record Deleted", description: "The inward record has been removed.", variant: "destructive" });

            // Telegram Notification
            const message = `🗑️ *Material Inward Deleted*\n\nJob Order No: \`${deleteConfirmation.jobOrderNo}\`\nBy: \`${user?.fullName || 'Unknown'}\``;
            sendTelegramNotification(message);

            fetchRecords();
        } catch (error) {
            console.error('Error deleting record:', error);
            toast({ title: "Error", description: "Failed to delete inward record.", variant: "destructive" });
        } finally {
            setDeleteConfirmation({ isOpen: false, recordId: null, jobOrderNo: '' });
        }
    };

    const uniqueClientsInList = Array.from(new Set(records
        .map(r => r.clients?.client_name)
        .filter(Boolean)))
        .sort();

    const filteredRecords = records.filter(r => {
        const matchesSearch = (r.job_order_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (r.po_wo_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (r.clients?.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterClient !== 'all' && r.clients?.client_name !== filterClient) return false;

        if (fromDate || toDate) {
            const recordDate = new Date(r.created_at);
            recordDate.setHours(0, 0, 0, 0);

            if (fromDate) {
                const start = new Date(fromDate);
                start.setHours(0, 0, 0, 0);
                if (recordDate < start) return false;
            }

            if (toDate) {
                const end = new Date(toDate);
                end.setHours(0, 0, 0, 0);
                if (recordDate > end) return false;
            }
        }

        return true;
    });

    const sortedRecords = [...filteredRecords].sort((a, b) => {
        let valA, valB;
        switch (sortField) {
            case 'client':
                valA = (a.clients?.client_name || '').toLowerCase();
                valB = (b.clients?.client_name || '').toLowerCase();
                break;
            case 'status':
                valA = (a.status || '').toLowerCase();
                valB = (b.status || '').toLowerCase();
                break;
            case 'date':
                valA = new Date(a.created_at).getTime();
                valB = new Date(b.created_at).getTime();
                break;
            default:
                return 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, fromDate, toDate, filterStatus, filterClient, sortField, sortOrder]);

    const resetFilters = () => {
        setSearchTerm('');
        setFromDate('');
        setToDate('');
        setFilterStatus('all');
        setFilterClient('all');
        setSortField('date');
        setSortOrder('desc');
        setCurrentPage(1);
    };

    if (loading && records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-gray-500">Loading inward register...</p>
            </div>
        );
    }

    // --- RENDERING EDIT FORM (Consistent with AdminServicesManager) ---
    if (editingRecord) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => onClose ? onClose() : setEditingRecord(null)} className="rounded-full">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </Button>
                        <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Material Inward Entry' : 'Edit Material Inward Entry'}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => onClose ? onClose() : setEditingRecord(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary-dark flex items-center text-white px-6"
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {isSaving ? 'Saving...' : (isAddingNew ? 'Create Inward Entry' : 'Save Changes')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="client">Client</Label>
                        <Select
                            value={editingRecord.client_id}
                            onValueChange={(value) => setEditingRecord(prev => ({ ...prev, client_id: value }))}
                            disabled={!!initialJobId || !!editingRecord.job_id}
                        >
                            <SelectTrigger id="client">
                                <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.client_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" /> Samples
                        </h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddSample}
                            className="text-xs h-8"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Add Sample
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {editingRecord.samples.map((sample, index) => (
                            <div key={index} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 space-y-4 relative group">
                                {editingRecord.samples.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRemoveSample(index)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Sample Code *</Label>
                                        <Input
                                            placeholder="e.g. CUBE-01"
                                            className="h-9 text-sm"
                                            value={sample.sample_code || ''}
                                            onChange={(e) => handleSampleChange(index, 'sample_code', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <Label className="text-xs">Description</Label>
                                        <Input
                                            placeholder="e.g. M25 Grade Concrete"
                                            className="h-9 text-sm"
                                            value={sample.sample_description || ''}
                                            onChange={(e) => handleSampleChange(index, 'sample_description', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Quantity</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 6"
                                            className="h-9 text-sm"
                                            value={sample.quantity || ''}
                                            onChange={(e) => handleSampleChange(index, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Received Date</Label>
                                        <Input
                                            type="date"
                                            className="h-9 text-sm"
                                            value={sample.received_date || ''}
                                            onChange={(e) => handleSampleChange(index, 'received_date', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Time</Label>
                                        <Input
                                            type="time"
                                            className="h-9 text-sm"
                                            value={sample.received_time || ''}
                                            onChange={(e) => handleSampleChange(index, 'received_time', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Collection At</Label>
                                        <Select
                                            value={sample.collection_center_id?.toString()}
                                            onValueChange={(value) => handleSampleChange(index, 'collection_center_id', value)}
                                        >
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {collectionCenters.map(cc => (
                                                    <SelectItem key={cc.id} value={cc.id.toString()}>{cc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Received By</Label>
                                        <Select
                                            value={sample.received_by}
                                            onValueChange={(value) => handleSampleChange(index, 'received_by', value)}
                                        >
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="User" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {appUsers.map(u => (
                                                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Test Days</Label>
                                        <Input
                                            type="number"
                                            className="h-9 text-sm"
                                            value={sample.expected_test_days || ''}
                                            onChange={(e) => handleSampleChange(index, 'expected_test_days', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDERING LIST VIEW ---
    return (
        <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            placeholder="Search by Job Order #, PO/WO # or Client..."
                            className="pl-12 h-12 text-sm bg-gray-50/30 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 px-6 h-12 bg-primary/5 rounded-xl border border-primary/10 whitespace-nowrap">
                        <Package className="w-4 h-4 text-primary/60" />
                        <span className="text-sm font-semibold text-gray-700">
                            {sortedRecords.length} <span className="text-gray-400 font-normal">records</span>
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex flex-wrap items-start gap-6 flex-1">
                        <div className="flex items-start gap-3">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">Filters</span>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 bg-gray-50/50 p-1 px-3 rounded-lg border border-gray-100 focus-within:border-primary/30 transition-colors">
                                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                        <Input
                                            type="date"
                                            className="w-auto min-w-[130px] h-9 text-sm border-none bg-transparent focus-visible:ring-0 cursor-pointer p-0"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                        />
                                        <span className="text-gray-300 font-light px-1">to</span>
                                        <Input
                                            type="date"
                                            className="w-auto min-w-[130px] h-9 text-sm border-none bg-transparent focus-visible:ring-0 cursor-pointer p-0"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="w-40 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt.replace(/_/g, ' ')}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={filterClient} onValueChange={setFilterClient}>
                                        <SelectTrigger className="w-60 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                            <SelectValue placeholder="All Clients" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Clients</SelectItem>
                                            {uniqueClientsInList.map(client => <SelectItem key={client} value={client}>{client}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-gray-100 hidden xl:block" />
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sort</span>
                            <div className="flex items-center gap-2">
                                <Select value={sortField} onValueChange={setSortField}>
                                    <SelectTrigger className="w-40 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="date">Date Created</SelectItem>
                                        <SelectItem value="client">Client Name</SelectItem>
                                        <SelectItem value="status">Status</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 border-gray-200 rounded-lg"
                                    onClick={() => setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))}
                                >
                                    {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="text-gray-400 hover:text-red-500 h-10 text-sm font-bold uppercase tracking-widest transition-colors"
                        >
                            Reset
                        </Button>
                        <Button
                            onClick={handleAddNew}
                            className="bg-primary hover:bg-primary-dark text-white h-10 px-4 rounded-xl shadow-sm text-xs font-semibold"
                        >
                            <Plus className="w-4 h-4 mr-2" /> New Material Inward Entry
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Items per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                    }}>
                        <SelectTrigger className="w-24 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">
                        Showing {sortedRecords.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, sortedRecords.length)} of {sortedRecords.length}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Job Order #</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">PO/WO #</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Created Date</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Received Date</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Client</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Status</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Created By</th>
                                <th className="text-right py-3 px-4 font-semibold text-sm text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-10 text-center text-gray-500">No records found.</td>
                                </tr>
                            ) : (
                                paginatedRecords.map((record) => (
                                    <tr key={record.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <span className="font-semibold font-mono text-black text-md bg-gray-200 p-1 rounded text-sm">{record.job_order_no}</span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {record.po_wo_number || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {format(new Date(record.created_at), 'dd MMM yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {record.material_samples?.[0]?.received_date ? format(new Date(record.material_samples[0].received_date), 'dd MMM yyyy') : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {record.clients?.client_name || '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800`}>
                                                {record.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {record.users?.full_name || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex justify-end space-x-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm px-2"
                                                    onClick={() => handleEdit(record)}
                                                    className="text-blue-600"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm px-2"
                                                    onClick={() => handleDeleteClick(record)}
                                                    className="text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow border border-gray-100">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, recordId: null, jobOrderNo: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Delete Inward Record?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.jobOrderNo}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MaterialInwardManager;
