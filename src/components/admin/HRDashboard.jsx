import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Users, Calendar, 
    CheckCircle2, Clock, Zap, ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const HRDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    
    const [myLeaveRequests, setMyLeaveRequests] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        pendingApprovalsCount: 0,
        myPendingLeaves: 0
    });

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Fetch total active employees
            const { count: employeeCount, error: empError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            
            if (empError) throw empError;

            // 2. Fetch pending leave approvals (all)
            const { data: approvals, error: appError } = await supabase
                .from('request_approvals')
                .select('*, requester:users!request_approvals_requester_id_fkey(full_name, role)')
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false });
            
            if (appError) throw appError;
            setPendingApprovals(approvals || []);

            // 3. Fetch user's own leave requests
            const { data: myLeaves, error: leavesError } = await supabase
                .from('request_approvals')
                .select('*')
                .eq('requester_id', user.id)
                .order('created_at', { ascending: false });

            if (leavesError) throw leavesError;
            setMyLeaveRequests(myLeaves || []);

            setStats({
                totalEmployees: employeeCount || 0,
                pendingApprovalsCount: approvals?.length || 0,
                myPendingLeaves: myLeaves?.filter(r => r.status === 'PENDING').length || 0
            });

        } catch (error) {
            console.error("HR Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading HR Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={300}>
            <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-8 pb-12"
            >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <LayoutDashboard className="w-8 h-8 text-primary" />
                            </div>
                            HR Dashboard
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">Welcome back, <span className="text-primary font-bold">{user?.fullName || user?.username}</span>.</p>
                    </div>
                    <Button onClick={fetchDashboardData} size="sm" variant="ghost" className="rounded-xl h-10 px-4 font-bold text-primary hover:bg-primary/10 transition-all border border-gray-100 bg-white shadow-sm">
                        <Zap className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Active Employees', value: stats.totalEmployees, icon: Users, path: '#/settings/system/users', tooltip: 'View all active employees' },
                        { label: 'Pending Approvals', value: stats.pendingApprovalsCount, icon: CheckCircle2, path: '#/settings/approvals', tooltip: 'Review pending leave requests' },
                        { label: 'My Pending Leaves', value: stats.myPendingLeaves, icon: Calendar, path: null, tooltip: 'Your pending leave requests' },
                    ].map((stat, idx) => (
                        <motion.div key={idx} variants={item}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Card
                                        className={`border-none shadow-sm bg-gray-50/30 relative overflow-hidden group ${stat.path ? 'cursor-pointer hover:shadow-md active:scale-95' : ''} transition-all`}
                                        onClick={() => stat.path && (window.location.hash = stat.path)}
                                    >
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50 rounded-bl-[64px] -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110 duration-500" />
                                        <CardContent className="p-4 relative">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                                    <stat.icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{stat.label}</p>
                                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{stat.value}</h3>
                                                </div>
                                                {stat.path && <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0" />}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">{stat.tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Pending Approvals */}
                    <motion.div variants={item} className="space-y-6">
                        <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-orange-500" /> Pending Approval Requests
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                                    {pendingApprovals.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                                            No pending requests to approve.
                                        </div>
                                    ) : (
                                        pendingApprovals.map((req) => (
                                            <div
                                                key={req.id}
                                                className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group cursor-pointer"
                                                onClick={() => window.location.hash = '/settings/approvals'}
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{req.requester?.full_name}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{req.request_data?.leaveType || 'Leave Request'}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right Column: My Leave Requests */}
                    <motion.div variants={item} className="space-y-6">
                        <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" /> My Leave Requests
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                                    {myLeaveRequests.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                                            No recent leave requests.
                                        </div>
                                    ) : (
                                        myLeaveRequests.map((req) => (
                                            <div key={req.id} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {req.request_data?.leaveType || 'Leave Request'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        {new Date(req.request_data?.startDate).toLocaleDateString()} - {new Date(req.request_data?.endDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Badge className={`text-[10px] font-black uppercase border-none ${
                                                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {req.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </TooltipProvider>
    );
};

export default HRDashboard;
