
import React, { useState, useEffect } from 'react';
import { Search, Trash2, Edit, ExternalLink, FileText, Loader2, AlertCircle, ArrowUpDown, SortAsc, SortDesc, Calendar, Package, Plus, X, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { format } from 'date-fns';
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
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { Textarea } from '@/components/ui/textarea';
import { DB_TYPES } from '@/data/config';

const MaterialInwardManager = () => {
    const [records, setRecords] = useState([]);
    const [clientsList, setClientsList] = useState([]);
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
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user, isStandard, idToken } = useAuth();

    // Management State (Consistent with AdminServicesManager)
    const [editingRecord, setEditingRecord] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const statusOptions = [
        'RECEIVED', 'SENT_TO_DEPARTMENT', 'UNDER_TESTING',
        'TEST_COMPLETED', 'REPORT_GENERATED', 'UNDER_REVIEW', 'SIGNED',
        'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'REPORT_RELEASED', 'COMPLETED'
    ];

    const fetchClients = async () => {
        if (!idToken) return;
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.CLIENT, idToken);
            setClientsList(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchUsers = async () => {
        if (!idToken) return;
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.USER, idToken);
            setAppUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchRecords = async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.JOB, idToken);

            let filteredData = (data || []).map(item => ({
                ...item,
                ...item.material_inward // Flatten material_inward data for the table/UI
            }));
            if (isStandard()) {
                filteredData = filteredData.filter(r =>
                    r.created_by === user.id ||
                    r.created_by === user.username ||
                    r.created_by === user.name
                );
            }

            setRecords(filteredData);
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
        if (idToken) {
            fetchRecords();
            fetchClients();
            fetchUsers();
        }
    }, [idToken]);

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
                    received_by: user.id || user.username,
                    expected_test_days: 7
                }
            ]
        });
        setIsAddingNew(true);
    };

    const handleEdit = async (record) => {
        setEditingRecord({
            ...record,
            samples: record.content?.samples?.map(s => ({
                ...s,
                received_date: s.received_date ? format(new Date(s.received_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                received_by: s.received_by || user.id || user.username
            })) || []
        });
        setIsAddingNew(false);
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
                    received_by: user.id || user.username,
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
            const client = clientsList.find(c => c.id === editingRecord.client_id);
            const clientName = client?.client_name || client?.clientName || 'Unknown Client';

            const recordData = {
                id: editingRecord.id || `JOB-${Date.now()}`,
                job_order_no: editingRecord.job_order_no || `JO-${Date.now()}`,
                client_name: clientName,
                client_id: editingRecord.client_id,
                status: isAddingNew ? 'RECEIVED' : editingRecord.status,
                material_inward: {
                    po_wo_number: editingRecord.po_wo_number,
                    samples: editingRecord.samples.map(sample => ({
                        ...sample,
                        quantity: parseFloat(sample.quantity) || 0,
                        expected_test_days: parseInt(sample.expected_test_days) || 7
                    }))
                },
                created_by: isAddingNew ? (user.id || user.name || user.username) : editingRecord.created_by,
                updated_by: user.id || user.name || user.username,
                updated_at: new Date().toISOString()
            };

            await dynamoGenericApi.save(DB_TYPES.JOB, recordData, idToken);

            toast({
                title: "Success",
                description: `Material Inward Record ${isAddingNew ? 'created' : 'updated'} successfully!`
            });

            // Telegram Notification
            const action = isAddingNew ? 'New Entry' : 'Entry Updated';
            const emoji = isAddingNew ? '📥' : '✏️';
            const message = `${emoji} *Material Inward ${action}*\n\nJob Order No: \`${recordData.job_order_no}\`\nClient: \`${clientName}\`\nSamples: \`${recordData.material_inward.samples.length}\`\nBy: \`${user?.full_name || user?.name || 'Unknown'}\``;
            sendTelegramNotification(message);

            setEditingRecord(null);
            setIsAddingNew(false);
            fetchRecords();
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
            await dynamoGenericApi.delete(deleteConfirmation.recordId, idToken);

            toast({ title: "Record Deleted", description: "The inward record has been removed.", variant: "destructive" });

            // Telegram Notification
            const message = `🗑️ *Material Inward Deleted*\n\nJob Order No: \`${deleteConfirmation.jobOrderNo}\`\nBy: \`${user?.full_name || user?.name || 'Unknown'}\``;
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
        .map(r => r.client_name)
        .filter(Boolean)))
        .sort();

    const filteredRecords = records.filter(r => {
        const matchesSearch = (r.job_order_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (r.po_wo_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (r.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterClient !== 'all' && r.client_name !== filterClient) return false;

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
                valA = (a.client_name || '').toLowerCase();
                valB = (b.client_name || '').toLowerCase();
                break;
            case 'status':
                valA = (a.status || '').toLowerCase();
                valB = (b.status || '').toLowerCase();
                break;
            case 'date':
                valA = new Date(a.created_at || a.updated_at).getTime();
                valB = new Date(b.created_at || b.updated_at).getTime();
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
                        <Button variant="ghost" size="icon" onClick={() => setEditingRecord(null)} className="rounded-full">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </Button>
                        <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Material Inward Entry' : 'Edit Material Inward Entry'}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setEditingRecord(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary-dark flex items-center text-white"
                            disabled={isSaving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="po_wo_number">Purchase Order/Work Order Number</Label>
                        <Input
                            id="po_wo_number"
                            placeholder="e.g. PO/2026/001"
                            value={editingRecord.po_wo_number}
                            onChange={(e) => setEditingRecord(prev => ({ ...prev, po_wo_number: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="client">Client *</Label>
                        <Select
                            value={editingRecord.client_id}
                            onValueChange={(value) => setEditingRecord(prev => ({ ...prev, client_id: value }))}
                        >
                            <SelectTrigger id="client">
                                <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                            <SelectContent>
                                {clientsList.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.client_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {!isAddingNew && (
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={editingRecord.status}
                                onValueChange={(value) => setEditingRecord(prev => ({ ...prev, status: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
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
                                            value={sample.sample_code}
                                            onChange={(e) => handleSampleChange(index, 'sample_code', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <Label className="text-xs">Description</Label>
                                        <Input
                                            placeholder="e.g. M25 Grade Concrete"
                                            className="h-9 text-sm"
                                            value={sample.sample_description}
                                            onChange={(e) => handleSampleChange(index, 'sample_description', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Quantity</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 6"
                                            className="h-9 text-sm"
                                            value={sample.quantity}
                                            onChange={(e) => handleSampleChange(index, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Received Date</Label>
                                        <Input
                                            type="date"
                                            className="h-9 text-sm"
                                            value={sample.received_date}
                                            onChange={(e) => handleSampleChange(index, 'received_date', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Time</Label>
                                        <Input
                                            type="time"
                                            className="h-9 text-sm"
                                            value={sample.received_time}
                                            onChange={(e) => handleSampleChange(index, 'received_time', e.target.value)}
                                        />
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
                                            value={sample.expected_test_days}
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
                                            {format(new Date(record.created_at || record.updated_at), 'dd MMM yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {record.content?.samples?.[0]?.received_date ? format(new Date(record.content.samples[0].received_date), 'dd MMM yyyy') : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {record.client_name || '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800`}>
                                                {record.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {(() => {
                                                const u = appUsers.find(u => u.id === record.created_by || u.sub === record.created_by || u.username === record.created_by || u.email === record.created_by);
                                                if (!u && record.created_by && record.created_by.length > 20) {
                                                    console.log(`[Diagnostic] User not found for ID: "${record.created_by}". appUsers count: ${appUsers.length}`);
                                                    if (appUsers.length > 0) {
                                                        console.log('[Diagnostic] First user in list:', appUsers[0]);
                                                    }
                                                }
                                                return u ? (u.full_name || u.fullName || u.name) : (record.created_by || '-');
                                            })()}
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
