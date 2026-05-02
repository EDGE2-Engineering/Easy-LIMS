
import React, { useState, useEffect } from 'react';
import { 
    CheckCircle2, XCircle, Clock, User, Calendar, 
    MessageSquare, AlertCircle, Filter, ChevronRight,
    ArrowUpRight, Info
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const ApprovalsManager = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [filter, setFilter] = useState('PENDING');

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('request_approvals')
                .select('*, requester:users!request_approvals_requester_id_fkey(full_name, username, role)')
                .eq('status', filter)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error("Error fetching requests:", error);
            toast({
                title: "Error",
                description: "Failed to load approval requests.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (request, action) => {
        try {
            const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
            const { error } = await supabase
                .from('request_approvals')
                .update({
                    status: status,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', request.id);

            if (error) throw error;

            // If it's a leave request and approved, create records in employee_leaves
            if (request.request_type === 'LEAVE' && action === 'approve') {
                const { startDate, endDate } = request.request_data;
                const dates = getDatesBetween(new Date(startDate), new Date(endDate));
                
                const leaveRecords = dates.map(date => ({
                    user_id: request.requester_id,
                    leave_date: date.toISOString().split('T')[0],
                    leave_type: request.request_data.leaveType,
                    comments: `Approved Request #${request.id}: ${request.request_data.reason || ''}`,
                    created_by: user.id
                }));

                const { error: leaveError } = await supabase
                    .from('employee_leaves')
                    .insert(leaveRecords);
                
                if (leaveError) throw leaveError;
            }

            toast({
                title: "Success",
                description: `Request ${status.toLowerCase()} successfully.`,
            });
            fetchRequests();
        } catch (error) {
            console.error("Error updating request:", error);
            toast({
                title: "Error",
                description: "Failed to update request status.",
                variant: "destructive"
            });
        }
    };

    const getDatesBetween = (startDate, endDate) => {
        const dates = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    };

    const RequestCard = ({ request }) => {
        const data = request.request_data;
        const isLeave = request.request_type === 'LEAVE';

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
            >
                <Card className="overflow-hidden border-none shadow-sm bg-white hover:shadow-md transition-all rounded-2xl">
                    <div className="flex flex-col md:flex-row">
                        {/* Left Side: Requester Info & Type */}
                        <div className="w-full md:w-64 bg-gray-50/50 p-6 border-r border-gray-100 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                                        {request.requester?.full_name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">{request.requester?.full_name || 'Unknown'}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{request.requester?.role}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Badge className={`${isLeave ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'} border-none font-black text-[10px] uppercase tracking-tighter`}>
                                        {request.request_type}
                                    </Badge>
                                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Middle: Request Details */}
                        <div className="flex-grow p-6 space-y-4">
                            {isLeave ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100/50">
                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Start Date</p>
                                        <p className="text-sm font-bold text-blue-900 mt-1 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-50/30 rounded-xl border border-purple-100/50">
                                        <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">End Date</p>
                                        <p className="text-sm font-bold text-purple-900 mt-1 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> {new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="col-span-2 p-3 bg-amber-50/30 rounded-xl border border-amber-100/50">
                                        <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Leave Type</p>
                                        <p className="text-sm font-bold text-amber-900 mt-1 flex items-center gap-2">
                                            <Info className="w-4 h-4" /> {data.leaveType || 'Not specified'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-xl text-gray-600 text-sm italic">
                                    {JSON.stringify(data)}
                                </div>
                            )}

                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" /> Requester Remarks
                                </p>
                                <p className="text-sm font-medium text-gray-700 leading-relaxed">
                                    {data.reason || "No specific reason provided."}
                                </p>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="p-6 border-l border-gray-100 flex flex-row md:flex-col justify-center gap-3 bg-gray-50/20">
                            {request.status === 'PENDING' ? (
                                <>
                                    <Button 
                                        onClick={() => handleAction(request, 'approve')}
                                        className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-500/20 px-6"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Approve
                                    </Button>
                                    <Button 
                                        onClick={() => handleAction(request, 'reject')}
                                        variant="outline"
                                        className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-xs gap-2 px-6"
                                    >
                                        <XCircle className="w-4 h-4" /> Reject
                                    </Button>
                                </>
                            ) : (
                                <Badge className={`px-4 py-2 rounded-xl border-none font-black text-xs ${
                                    request.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                }`}>
                                    {request.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                </Card>
            </motion.div>
        );
    };

    return (
        <div className="space-y-8 pb-12 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl">
                            <CheckCircle2 className="w-8 h-8 text-primary" />
                        </div>
                        Request Approvals
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 uppercase text-xs tracking-widest ml-1">Review and manage employee requests</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                    {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                                filter === s 
                                ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Syncing requests...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.length === 0 ? (
                        <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Info className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">No {filter.toLowerCase()} requests</h3>
                            <p className="text-gray-400 font-medium mt-2">There are currently no requests in this category to show.</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            <div className="grid grid-cols-1 gap-6">
                                {requests.map((request) => (
                                    <RequestCard key={request.id} request={request} />
                                ))}
                            </div>
                        </AnimatePresence>
                    )}
                </div>
            )}
        </div>
    );
};

export default ApprovalsManager;
