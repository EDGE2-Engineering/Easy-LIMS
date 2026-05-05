
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Edit, Trash2, Save, Search, Download, SortAsc, SortDesc, 
    Mail, Phone, User, Calendar, MessageSquare, Clock, Filter, X
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { format } from 'date-fns';

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'FOLLOWED_UP', label: 'Followed Up', color: 'bg-blue-100 text-blue-800' },
    { value: 'CONVERTED', label: 'Converted', color: 'bg-green-100 text-green-800' },
    { value: 'CLOSED', label: 'Closed', color: 'bg-gray-100 text-gray-800' }
];

const InquiriesManager = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingInquiry, setEditingInquiry] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null });
    
    // Filters & Sorting
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortField, setSortField] = useState('received_at');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inquiries')
                .select(`
                    *,
                    receiver:users(full_name, username)
                `)
                .order('received_at', { ascending: false });

            if (error) throw error;
            setInquiries(data || []);
        } catch (error) {
            console.error("Error fetching inquiries:", error);
            toast({ title: "Error", description: "Failed to load inquiries.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingInquiry.client_name) {
            toast({ title: "Validation Error", description: "Client name is required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const inquiryData = {
                client_name: editingInquiry.client_name,
                phone_number: editingInquiry.phone_number,
                email: editingInquiry.email,
                description: editingInquiry.description,
                received_at: editingInquiry.received_at || new Date().toISOString(),
                received_by: editingInquiry.received_by || user.id,
                status: editingInquiry.status || 'PENDING'
            };

            if (isAddingNew) {
                const { error } = await supabase.from('inquiries').insert(inquiryData);
                if (error) throw error;
                toast({ title: "Inquiry Added", description: "New inquiry has been recorded." });
            } else {
                const { error } = await supabase.from('inquiries').update(inquiryData).eq('id', editingInquiry.id);
                if (error) throw error;
                toast({ title: "Inquiry Updated", description: "Inquiry details have been updated." });
            }
            
            setEditingInquiry(null);
            setIsAddingNew(false);
            fetchInquiries();
        } catch (error) {
            console.error("Error saving inquiry:", error);
            toast({ title: "Error", description: "Failed to save inquiry.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            const { error } = await supabase.from('inquiries').delete().eq('id', deleteConfirmation.id);
            if (error) throw error;
            toast({ title: "Inquiry Deleted", description: "The inquiry record has been removed.", variant: "destructive" });
            fetchInquiries();
        } catch (error) {
            console.error("Error deleting inquiry:", error);
            toast({ title: "Error", description: "Failed to delete inquiry.", variant: "destructive" });
        } finally {
            setDeleteConfirmation({ isOpen: false, id: null });
        }
    };

    const filteredInquiries = useMemo(() => {
        let result = inquiries.filter(inq => {
            const matchesSearch = 
                inq.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (inq.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (inq.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (inq.phone_number || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });

        result.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [inquiries, searchTerm, statusFilter, sortField, sortOrder]);

    const handleAddNew = () => {
        setEditingInquiry({
            client_name: '',
            phone_number: '',
            email: '',
            description: '',
            received_at: new Date().toISOString(),
            received_by: user.id,
            status: 'PENDING'
        });
        setIsAddingNew(true);
    };

    const handleEdit = (inquiry) => {
        setEditingInquiry({ ...inquiry });
        setIsAddingNew(false);
    };

    if (editingInquiry) {
        return (
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                            {isAddingNew ? 'Record New Inquiry' : 'Edit Inquiry Details'}
                        </h2>
                        <p className="text-gray-500 font-medium">Capture all client requirements and contact details.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setEditingInquiry(null)} className="rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="bg-primary hover:bg-primary-dark text-white rounded-xl px-8 font-black shadow-lg shadow-primary/20"
                        >
                            {isSaving ? 'Saving...' : 'Save Inquiry'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client Name *</Label>
                            <Input 
                                value={editingInquiry.client_name}
                                onChange={e => setEditingInquiry({...editingInquiry, client_name: e.target.value})}
                                placeholder="Enter client or company name"
                                className="rounded-xl border-gray-100 bg-gray-50/50 h-12 font-bold focus:bg-white transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</Label>
                                <Input 
                                    value={editingInquiry.phone_number}
                                    onChange={e => setEditingInquiry({...editingInquiry, phone_number: e.target.value})}
                                    placeholder="+91 ..."
                                    className="rounded-xl border-gray-100 bg-gray-50/50 h-12 font-bold focus:bg-white transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</Label>
                                <Input 
                                    value={editingInquiry.email}
                                    onChange={e => setEditingInquiry({...editingInquiry, email: e.target.value})}
                                    placeholder="client@example.com"
                                    className="rounded-xl border-gray-100 bg-gray-50/50 h-12 font-bold focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inquiry Status</Label>
                                <Select 
                                    value={editingInquiry.status} 
                                    onValueChange={val => setEditingInquiry({...editingInquiry, status: val})}
                                >
                                    <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-12 font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        {STATUS_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Received Date & Time</Label>
                                <Input 
                                    type="datetime-local"
                                    value={editingInquiry.received_at ? format(new Date(editingInquiry.received_at), "yyyy-MM-dd'T'HH:mm") : ''}
                                    onChange={e => setEditingInquiry({...editingInquiry, received_at: new Date(e.target.value).toISOString()})}
                                    className="rounded-xl border-gray-100 bg-gray-50/50 h-12 font-bold focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inquiry Details / Description</Label>
                        <Textarea 
                            value={editingInquiry.description}
                            onChange={e => setEditingInquiry({...editingInquiry, description: e.target.value})}
                            placeholder="Describe what the client is looking for, project details, specific tests required, etc."
                            className="rounded-xl border-gray-100 bg-gray-50/50 min-h-[220px] font-medium p-4 focus:bg-white transition-all"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                        placeholder="Search inquiries..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-12 rounded-2xl border-none bg-white shadow-sm h-12 font-medium"
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40 rounded-2xl border-none bg-white shadow-sm h-12 font-bold">
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="all">All Status</SelectItem>
                            {STATUS_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button 
                        onClick={handleAddNew}
                        className="bg-primary hover:bg-primary-dark text-white rounded-2xl h-12 px-6 font-black shadow-lg shadow-primary/20 ml-auto md:ml-0"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Record Inquiry
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white/50 rounded-3xl border border-dashed border-gray-200">
                        <Clock className="w-10 h-10 animate-spin text-primary opacity-20 mb-4" />
                        <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Inquiries...</p>
                    </div>
                ) : filteredInquiries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <div className="p-4 bg-gray-50 rounded-2xl mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="font-bold text-gray-900">No inquiries found</p>
                        <p className="text-gray-400 text-sm font-medium">Start by recording your first client inquiry.</p>
                    </div>
                ) : (
                    filteredInquiries.map(inq => (
                        <div 
                            key={inq.id} 
                            className="group bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 hover:shadow-xl hover:border-primary/10 transition-all duration-300"
                        >
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-grow space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight">{inq.client_name}</h3>
                                            <Badge className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_OPTIONS.find(s => s.value === inq.status)?.color || 'bg-gray-100 text-gray-800'}`}>
                                                {STATUS_OPTIONS.find(s => s.value === inq.status)?.label || inq.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(inq)} className="w-10 h-10 rounded-xl hover:bg-primary/5 hover:text-primary">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Inquiry</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmation({ isOpen: true, id: inq.id })} className="w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-500">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete Record</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                                                <Phone className="w-3.5 h-3.5" />
                                            </div>
                                            {inq.phone_number || 'No phone'}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                                <Mail className="w-3.5 h-3.5" />
                                            </div>
                                            {inq.email || 'No email'}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                                <Calendar className="w-3.5 h-3.5" />
                                            </div>
                                            {format(new Date(inq.received_at), 'PPP p')}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                                        <p className="text-gray-600 text-sm font-medium leading-relaxed italic line-clamp-2">
                                            "{inq.description || 'No description provided.'}"
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50 mt-4">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-2.5 h-2.5 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Recorded by {inq.receiver?.full_name || inq.receiver?.username || 'System'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={open => !open && setDeleteConfirmation({ isOpen: false, id: null })}>
                <AlertDialogContent className="rounded-[32px] border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 font-black tracking-tight">Delete Inquiry Record?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium">
                            This will permanently remove the inquiry from the database. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
                            Yes, Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default InquiriesManager;
