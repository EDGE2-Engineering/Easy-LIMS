
import React, { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, Briefcase, Users, Calendar, TrendingUp, 
    AlertCircle, CheckCircle2, Clock, IndianRupee, FileText, 
    Package, ArrowUpRight, ArrowDownRight, ChevronRight, UserMinus, 
    Zap, Activity, Target, ShieldCheck, CalendarRange,
    BriefcaseBusiness, MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { WORKFLOW_STATES, ROLES, APP_CONFIG } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const Dashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalJobs: 0,
        activeJobs: 0,
        pendingReports: 0,
        pendingPayments: 0,
        totalStaff: 0,
        totalClients: 0,
        totalInquiries: 0,
        pendingInquiries: 0,
        leavesToday: [],
        upcomingLeaves: []
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [workflowCounts, setWorkflowCounts] = useState({});
    const [recentInquiries, setRecentInquiries] = useState([]);
    const { toast } = useToast();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Fetch Job Stats
            const { data: jobs, error: jobsError } = await supabase.from('jobs').select('id, status');
            if (jobsError) throw jobsError;

            const counts = jobs.reduce((acc, job) => {
                acc[job.status] = (acc[job.status] || 0) + 1;
                return acc;
            }, {});

            const active = jobs.filter(j => j.status !== WORKFLOW_STATES.JOB_COMPLETE).length;
            const reportsPending = (counts[WORKFLOW_STATES.REPORT_GENERATED] || 0) + (counts[WORKFLOW_STATES.REPORT_UNDER_REVIEW] || 0);
            const paymentsPending = (counts[WORKFLOW_STATES.AWAITING_PAYMENT] || 0) + (counts[WORKFLOW_STATES.INVOICE_GENERATED] || 0);

            // 2. Fetch Leaves (from approved request_approvals)
            const { data: approvedRequests, error: approvError } = await supabase
                .from('request_approvals')
                .select('*, requester:users!request_approvals_requester_id_fkey(full_name, username, role)')
                .eq('request_type', 'LEAVE')
                .eq('status', 'APPROVED');
            
            if (approvError) throw approvError;

            // Expand requests into individual day records for easier filtering
            const expandedLeaves = (approvedRequests || []).flatMap(req => {
                const { startDate, endDate, leaveType, reason } = req.request_data;
                const dates = getDatesBetween(new Date(startDate), new Date(endDate));
                return dates.map(date => ({
                    id: `${req.id}-${date.getTime()}`,
                    leave_date: date.toISOString().split('T')[0],
                    leave_type: leaveType,
                    comments: reason,
                    users: req.requester,
                    user_id: req.requester_id
                }));
            });

            const leavesToday = expandedLeaves.filter(l => l.leave_date === today);

            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const nextWeekStr = nextWeek.toISOString().split('T')[0];
            
            const upcomingLeaves = expandedLeaves
                .filter(l => l.leave_date > today && l.leave_date <= nextWeekStr)
                .sort((a, b) => a.leave_date.localeCompare(b.leave_date));

            // 3. Fetch Total Staff
            const { count: staffCount, error: staffError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .neq('role', ROLES.SUPER_ADMIN.slug);
            if (staffError) throw staffError;

            if (activityError) throw activityError;
            
            // 5. Fetch Clients & Inquiries Stats
            const { count: clientsCount, error: clientErr } = await supabase.from('clients').select('*', { count: 'exact', head: true });
            const { data: inquiries, error: inqErr } = await supabase.from('inquiries').select('status');
            
            const pendingInquiries = (inquiries || []).filter(i => i.status === 'PENDING').length;

            setStats({
                totalJobs: jobs.length,
                activeJobs: active,
                pendingReports: reportsPending,
                pendingPayments: paymentsPending,
                totalStaff: staffCount || 0,
                totalClients: clientsCount || 0,
                totalInquiries: inquiries?.length || 0,
                pendingInquiries: pendingInquiries,
                leavesToday: leavesToday,
                upcomingLeaves: upcomingLeaves
            });
            setRecentInquiries((inquiries || []).slice(0, 3));
            setWorkflowCounts(counts);
            setRecentActivity(activity || []);

        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
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

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const getStateLabel = (state) => APP_CONFIG.workflow.states[state]?.label || state;

    if (loading) {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Initializing Dashboard...</p>
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
                        Operational Dashboard
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Welcome back, <span className="text-primary font-bold">{user?.fullName || user?.username}</span>. Here's what's happening today.</p>
                </div>
                <Button onClick={fetchDashboardData} size="sm" variant="ghost" className="rounded-xl h-10 px-4 font-bold text-primary hover:bg-primary/10 transition-all border border-gray-100 bg-white shadow-sm">
                    <Zap className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>


            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {[
                    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', trend: 'In Progress' },
                    { label: 'Pending Reports', value: stats.pendingReports, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', trend: 'Awaiting Action' },
                    { label: 'Awaiting Payment', value: stats.pendingPayments, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: 'Accounts' },
                    { label: 'Total Clients', value: stats.totalClients, icon: BriefcaseBusiness, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: 'Network' },
                    { label: 'New Inquiries', value: stats.totalInquiries, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', trend: `${stats.pendingInquiries} Pending` },
                ].map((stat, idx) => (
                    <motion.div key={idx} variants={item}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Card className={`border-none shadow-sm ${stat.bg}/30 relative overflow-hidden group`}>
                                    <div className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} rounded-bl-[64px] -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110 duration-500`} />
                                    <CardContent className="p-4 relative">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                                                <stat.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{stat.label}</p>
                                                    <Badge variant="outline" className={`hidden bg-white/50 border-none text-[8px] font-black uppercase tracking-tighter ${stat.color} px-1.5 py-0 h-4`}>
                                                        {stat.trend}
                                                    </Badge>
                                                </div>
                                                <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{stat.value}</h3>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                                <p className="text-xs">The total count of {stat.label.toLowerCase()}</p>
                            </TooltipContent>
                        </Tooltip>
                    </motion.div>
                ))}
            </div>

            {/* Main Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Today View & Staff */}
                <div className="lg:col-span-1 space-y-8">
                    <motion.div variants={item}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                                    <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-primary" /> Today's Brief
                                    </CardTitle>
                                    <Badge className="bg-primary/10 text-primary border-none font-bold">
                                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <UserMinus className="w-3 h-3" /> On Leave Today
                                        </h4>
                                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{stats.leavesToday.length}</span>
                                    </div>
                                    
                                    {stats.leavesToday.length === 0 ? (
                                        <div className="p-4 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200">
                                            <p className="text-xs font-bold text-gray-400 italic">Everyone is in today!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {stats.leavesToday.map((leave, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100/50 hover:border-primary/20 transition-all group">
                                                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-100 text-xs font-black text-primary">
                                                        {(() => {
                                                            const u = leave.users || leave['users!employee_leaves_user_id_fkey'];
                                                            return (u?.full_name || u?.username || 'U')[0].toUpperCase();
                                                        })()}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">
                                                            {(() => {
                                                                const u = leave.users || leave['users!employee_leaves_user_id_fkey'];
                                                                return u?.full_name || u?.username || 'Unknown User';
                                                            })()}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{leave.comments || 'Casual Leave'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-50 space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <CalendarRange className="w-3 h-3" /> Upcoming Leaves
                                        </h4>
                                        <span className="text-[10px] font-black text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">Next 7 Days</span>
                                    </div>
                                    
                                    {stats.upcomingLeaves.length === 0 ? (
                                        <div className="p-4 bg-gray-50/50 rounded-2xl text-center border border-dashed border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-400 italic">No leaves scheduled soon.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {stats.upcomingLeaves.map((leave, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-50 hover:border-blue-200 transition-all group shadow-sm">
                                                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex flex-col items-center justify-center border border-blue-100 text-blue-600">
                                                        <span className="text-[8px] font-black leading-none">{new Date(leave.leave_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                        <span className="text-xs font-black leading-none">{new Date(leave.leave_date).getDate()}</span>
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">
                                                            {(() => {
                                                                const u = leave.users || leave['users!employee_leaves_user_id_fkey'];
                                                                return u?.full_name || u?.username || 'Unknown User';
                                                            })()}
                                                        </p>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{leave.comments || 'Planned Leave'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-50 space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Daily Priorities
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex flex-col gap-1">
                                            <span className="text-xl font-black text-orange-600 tracking-tight">{workflowCounts[WORKFLOW_STATES.UNDER_REVIEW] || 0}</span>
                                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-tight">Needs Review</span>
                                        </div>
                                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                                            <span className="text-xl font-black text-blue-600 tracking-tight">{workflowCounts[WORKFLOW_STATES.REPORT_SIGNED] || 0}</span>
                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-tight">Ready to Invoice</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare className="w-3 h-3" /> Recent Inquiries
                                        </h4>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-5 px-2 text-[8px] font-black uppercase text-primary hover:bg-primary/5"
                                            onClick={() => window.location.hash = '#/settings/inquiries'}
                                        >
                                            View All
                                        </Button>
                                    </div>
                                    
                                    {recentInquiries.length === 0 ? (
                                        <div className="p-4 bg-gray-50/50 rounded-2xl text-center border border-dashed border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-400 italic">No new inquiries.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {recentInquiries.map((inq, idx) => (
                                                <div key={idx} className="p-3 bg-white rounded-2xl border border-gray-50 hover:border-rose-100 transition-all group shadow-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="text-xs font-bold text-gray-900 truncate flex-grow mr-2">{inq.client_name}</p>
                                                        <Badge className={`text-[8px] px-1 py-0 h-3.5 border-none font-black uppercase ${inq.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            {inq.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 font-medium line-clamp-1">{inq.description || 'No details provided'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800 max-w-[250px]">
                                <p className="text-xs">Summary of staff availability and key priorities that need attention today.</p>
                            </TooltipContent>
                        </Tooltip>
                    </motion.div>

                    <motion.div variants={item}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Card className="border-none shadow-sm bg-gradient-to-br from-primary to-primary-dark rounded-3xl overflow-hidden text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Target className="w-24 h-24" />
                            </div>
                            <CardContent className="p-8 space-y-6 relative">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black tracking-tight">System Goals</h3>
                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Efficiency Metrics</p>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Sample Testing TAT', value: '2.4 Days', progress: 85 },
                                        { label: 'Data Accuracy Rate', value: '99.2%', progress: 99 },
                                        { label: 'Payment Collection', value: '72%', progress: 72 },
                                    ].map((goal, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span>{goal.label}</span>
                                                <span>{goal.value}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-white rounded-full" style={{ width: `${goal.progress}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800 max-w-[250px]">
                                <p className="text-xs">Real-time tracking of organizational efficiency metrics and targets.</p>
                            </TooltipContent>
                        </Tooltip>
                    </motion.div>
                </div>

                {/* Right Column: Workflow Pipeline & Recent Activity */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Workflow Funnel / Pipeline */}
                    <motion.div variants={item}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                            <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" /> Summary of Jobs 
                                    </CardTitle>
                                    <CardDescription className="text-xs font-medium text-gray-400 uppercase tracking-widest">Jobs distributed by current state</CardDescription>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-3">
                                    {[
                                        { state: WORKFLOW_STATES.JOB_CREATED, label: 'Inquiry/Quotation', color: 'bg-slate-100 text-slate-600' },
                                        { state: WORKFLOW_STATES.MATERIAL_RECEIVED, label: 'Material Received', color: 'bg-indigo-100 text-indigo-600' },
                                        { state: WORKFLOW_STATES.UNDER_TESTING, label: 'Testing Lab', color: 'bg-amber-100 text-amber-600' },
                                        { state: WORKFLOW_STATES.UNDER_REVIEW, label: 'Quality Review', color: 'bg-rose-100 text-rose-600' },
                                        { state: WORKFLOW_STATES.REPORT_SIGNED, label: 'Reports Released', color: 'bg-emerald-100 text-emerald-600' },
                                    ].map((stage, idx) => {
                                        const count = workflowCounts[stage.state] || 0;
                                        const percentage = stats.totalJobs > 0 ? (count / stats.totalJobs) * 100 : 0;
                                        
                                        return (
                                            <div key={idx} className="relative group">
                                                <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer relative z-10 border border-transparent hover:border-gray-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl ${stage.color} flex items-center justify-center font-black text-sm`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{stage.label}</p>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{count} Active Case{count !== 1 ? 's' : ''}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                                </div>
                                                <div className="absolute left-14 right-14 bottom-0 h-px bg-gray-50 group-last:hidden" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-gray-900 text-white border-gray-800 max-w-[250px]">
                                <p className="text-xs">The current pipeline of active jobs distributed across all workflow stages.</p>
                            </TooltipContent>
                        </Tooltip>
                    </motion.div>

                    {/* Recent Activity Feed */}
                    <motion.div variants={item}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                            <CardHeader className="p-6 border-b border-gray-50">
                                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-primary" /> System Activity Feed
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-50">
                                    {recentActivity.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <p className="text-sm font-bold text-gray-400 italic">No recent activity found.</p>
                                        </div>
                                    ) : (
                                        recentActivity.map((log, idx) => (
                                            <div key={idx} className="p-5 flex gap-4 hover:bg-gray-50/50 transition-all group">
                                                <div className="mt-1">
                                                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="flex-grow space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {log.users?.full_name || log.users?.username}
                                                            <span className="text-gray-400 font-medium ml-1.5 tracking-tight">moved</span>
                                                            <span className="text-primary font-black ml-1.5 tracking-tighter">#{log.jobs?.job_code}</span>
                                                        </p>
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">
                                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] border border-gray-200">{getStateLabel(log.from_state)}</span>
                                                        <ChevronRight className="w-3 h-3 text-gray-300" />
                                                        <span className="px-1.5 py-0.5 rounded-md bg-primary/5 text-primary text-[10px] border border-primary/10">{getStateLabel(log.to_state)}</span>
                                                    </p>
                                                    {log.remarks && <p className="text-[11px] text-gray-500 italic mt-2 border-l-2 border-gray-100 pl-3 py-1 font-medium bg-gray-50/30 rounded-r-lg">{log.remarks}</p>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50/50 border-t border-gray-50 text-center">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary"
                                        onClick={() => window.location.hash = '#/settings/organization/audit_logs'}
                                    >
                                        View All Audit Logs <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-gray-900 text-white border-gray-800 max-w-[250px]">
                                <p className="text-xs">Live feed of the most recent actions and state transitions within the application.</p>
                            </TooltipContent>
                        </Tooltip>
                    </motion.div>
                </div>
            </div>
            </motion.div>
        </TooltipProvider>
    );
};

export default Dashboard;
