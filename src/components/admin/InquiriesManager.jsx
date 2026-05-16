
import React, { useState, useEffect } from 'react';
import { Search, Trash2, Edit, Mail, Phone, User, Calendar, Filter, X, Plus, Save, Loader2, AlertCircle, SortAsc, SortDesc, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from '@/components/ui/textarea';

const INQUIRY_STATUSES = [
    { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'REPLIED', label: 'Replied', color: 'bg-blue-100 text-blue-700' },
    { value: 'CLOSED', label: 'Closed', color: 'bg-green-100 text-green-700' },
    { value: 'SPAM', label: 'Spam', color: 'bg-red-100 text-red-700' }
];

const InquiriesManager = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [editingInquiry, setEditingInquiry] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, inquiryId: null, clientName: '' });
    
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchInquiries = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inquiries')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // If table doesn't exist, we'll handle it gracefully
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    setInquiries([]);
                } else {
                    throw error;
                }
            } else {
                setInquiries(data || []);
            }
        } catch (error) {
            console.error('Error fetching inquiries:', error);
            toast({
                title: "Error",
                description: "Failed to load inquiries. " + error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    const filteredInquiries = inquiries.filter(i => {
        const matchesSearch = 
            (i.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (i.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (i.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (i.message?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
        
        return matchesSearch && matchesStatus;
    });

    const sortedInquiries = [...filteredInquiries].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'created_at') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        } else if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedInquiries.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInquiries = sortedInquiries.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, sortField, sortOrder]);

    const handleEdit = (inquiry) => {
        setEditingInquiry({ ...inquiry });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('inquiries')
                .update({
                    status: editingInquiry.status,
                    remarks: editingInquiry.remarks,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingInquiry.id);

            if (error) throw error;

            toast({ title: "Inquiry Updated", description: "The inquiry has been successfully updated." });
            setEditingInquiry(null);
            fetchInquiries();
        } catch (error) {
            console.error('Error saving inquiry:', error);
            toast({ title: "Error", description: "Failed to update inquiry.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (inquiry) => {
        setDeleteConfirmation({
            isOpen: true,
            inquiryId: inquiry.id,
            clientName: inquiry.client_name
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.inquiryId) return;
        try {
            const { error } = await supabase
                .from('inquiries')
                .delete()
                .eq('id', deleteConfirmation.inquiryId);

            if (error) throw error;

            toast({ title: "Inquiry Deleted", description: "The inquiry has been removed.", variant: "destructive" });
            fetchInquiries();
        } catch (error) {
            console.error('Error deleting inquiry:', error);
            toast({ title: "Error", description: "Failed to delete inquiry.", variant: "destructive" });
        } finally {
            setDeleteConfirmation({ isOpen: false, inquiryId: null, clientName: '' });
        }
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterStatus('all');
        setSortField('created_at');
        setSortOrder('desc');
        setCurrentPage(1);
    };

    if (editingInquiry) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 font-display">Manage Inquiry</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setEditingInquiry(null)} disabled={isSaving} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary-dark flex items-center text-white rounded-xl shadow-lg shadow-primary/20"
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {isSaving ? 'Saving...' : 'Update Inquiry'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Client Details</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100">
                                        <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Name</p>
                                        <p className="text-sm font-semibold text-gray-900">{editingInquiry.client_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100">
                                        <Mail className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Email</p>
                                        <p className="text-sm font-semibold text-gray-900">{editingInquiry.email || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100">
                                        <Phone className="w-4 h-4 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Phone</p>
                                        <p className="text-sm font-semibold text-gray-900">{editingInquiry.phone || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Status</Label>
                            <Select
                                value={editingInquiry.status}
                                onValueChange={(v) => setEditingInquiry(prev => ({ ...prev, status: v }))}
                            >
                                <SelectTrigger className="rounded-xl h-12">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                    {INQUIRY_STATUSES.map(status => (
                                        <SelectItem key={status.value} value={status.value} className="rounded-lg my-1">
                                            <div className="flex items-center gap-2 font-medium">
                                                <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                                                {status.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
                            <h3 className="text-sm font-bold text-primary/60 uppercase tracking-widest">Message</h3>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-gray-900">{editingInquiry.subject}</p>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{editingInquiry.message}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Admin Remarks / Notes</Label>
                            <Textarea
                                rows={5}
                                value={editingInquiry.remarks || ''}
                                onChange={(e) => setEditingInquiry(prev => ({ ...prev, remarks: e.target.value }))}
                                placeholder="Enter internal notes or reply status..."
                                className="rounded-xl resize-none focus:ring-primary/20 transition-all border-gray-200"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/5">
                            <MessageSquare className="w-7 h-7 text-primary" />
                        </div>
                        Inquiries Manager
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">Track and respond to client inquiries and leads</p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search by client, email, or message..."
                            className="pl-12 w-full h-12 text-sm bg-gray-50/50 border-gray-200 rounded-2xl focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-40 h-12 rounded-2xl border-gray-200 bg-gray-50/50">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                <SelectItem value="all" className="rounded-lg">All Status</SelectItem>
                                {INQUIRY_STATUSES.map(s => (
                                    <SelectItem key={s.value} value={s.value} className="rounded-lg my-1">
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="h-12 px-4 rounded-2xl text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest transition-all"
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                {/* Pagination Controls - Top */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 px-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Items</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                        }}>
                            <SelectTrigger className="w-20 h-9 text-xs bg-gray-50/50 border-gray-200 rounded-lg">
                                <SelectValue className="text-xs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10" className="text-xs">10</SelectItem>
                                <SelectItem value="25" className="text-xs">25</SelectItem>
                                <SelectItem value="50" className="text-xs">50</SelectItem>
                                <SelectItem value="100" className="text-xs">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-l pl-3 ml-1">
                            Showing {sortedInquiries.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, sortedInquiries.length)} of {sortedInquiries.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
                        >
                            Prev
                        </Button>
                        <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                                Page {currentPage} / {totalPages || 1}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="text-left py-5 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Received</th>
                            <th className="text-left py-5 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Client / Subject</th>
                            <th className="text-center py-5 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                            <th className="text-right py-5 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Fetching leads...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedInquiries.length > 0 ? (
                            paginatedInquiries.map((inquiry) => {
                                const status = INQUIRY_STATUSES.find(s => s.value === (inquiry.status || 'PENDING')) || INQUIRY_STATUSES[0];
                                return (
                                    <tr key={inquiry.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-bold text-gray-900 whitespace-nowrap">
                                                    {format(new Date(inquiry.created_at), 'dd MMM yyyy')}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                                                    {format(new Date(inquiry.created_at), 'hh:mm aa')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col max-w-md">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-900 group-hover:text-primary transition-colors">{inquiry.client_name}</span>
                                                    {inquiry.phone && <span className="text-[10px] text-gray-400 font-mono">({inquiry.phone})</span>}
                                                </div>
                                                <span className="text-xs font-semibold text-gray-600 line-clamp-1">{inquiry.subject}</span>
                                                <span className="text-[10px] text-gray-400 italic line-clamp-1 mt-0.5">{inquiry.message}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <Badge className={`${status.color} uppercase text-[10px] font-black px-3 py-1 rounded-full border-none shadow-sm`}>
                                                {status.label}
                                            </Badge>
                                        </td>
                                        <td className="py-5 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleEdit(inquiry)}
                                                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                                        >
                                                            <Edit className="w-4.5 h-4.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                                        <p className="text-xs">Review and respond</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleDeleteClick(inquiry)}
                                                            className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-4.5 h-4.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                                        <p className="text-xs">Delete inquiry</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="4" className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
                                        <p className="font-bold uppercase tracking-widest text-[10px]">No inquiries found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, inquiryId: null, clientName: '' })}>
                <AlertDialogContent className="rounded-3xl border-gray-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600 font-display text-xl">
                            <AlertCircle className="w-6 h-6 mr-3" />
                            Delete Inquiry?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500 mt-2">
                            Are you sure you want to permanently delete the inquiry from <span className="font-bold text-gray-900">{deleteConfirmation.clientName}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-200 border-none">
                            Yes, Delete Inquiry
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default InquiriesManager;
