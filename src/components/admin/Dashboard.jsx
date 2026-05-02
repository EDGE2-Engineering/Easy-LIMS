
import React, { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, Briefcase, Users, Calendar, TrendingUp, 
    AlertCircle, CheckCircle2, Clock, IndianRupee, FileText, 
    Package, ArrowUpRight, ArrowDownRight, ChevronRight, UserMinus, 
    Zap, Activity, Target, ShieldCheck, CalendarRange
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        leavesToday: [],
        upcomingLeaves: []
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [workflowCounts, setWorkflowCounts] = useState({});
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

            const { data: leaves, error: leavesError } = await supabase
                .from('employee_leaves')
                .select('*, users!employee_leaves_user_id_fkey(full_name, username, role)')
                .eq('leave_date', today);
            if (leavesError) throw leavesError;

            // 2b. Fetch Upcoming Leaves (next 7 days)
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const nextWeekStr = nextWeek.toISOString().split('T')[0];

            const { data: upcoming, error: upcomingError } = await supabase
                .from('employee_leaves')
                .select('*, users!employee_leaves_user_id_fkey(full_name, username, role)')
                .gt('leave_date', today)
                .lte('leave_date', nextWeekStr)
                .order('leave_date');
            if (upcomingError) throw upcomingError;

            // 3. Fetch Total Staff
            const { count: staffCount, error: staffError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .neq('role', ROLES.SUPER_ADMIN.slug);
            if (staffError) throw staffError;

            // 4. Fetch Recent Activity (from workflow logs)
            const { data: activity, error: activityError } = await supabase
                .from('job_workflow_logs')
                .select('*, jobs(job_code, project_name), users(full_name, username)')
                .order('created_at', { ascending: false })
                .limit(5);
            if (activityError) throw activityError;

            setStats({
                totalJobs: jobs.length,
                activeJobs: active,
                pendingReports: reportsPending,
                pendingPayments: paymentsPending,
                totalStaff: staffCount || 0,
                leavesToday: leaves || [],
                upcomingLeaves: upcoming || []
            });
            setWorkflowCounts(counts);
            setRecentActivity(activity || []);

        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
        }
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
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-12"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <LayoutDashboard className="w-8 h-8 text-primary" />
                        </div>
                        Operational Dashboard
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Welcome back, <span className="text-primary font-bold">{user?.fullName || user?.username}</span>. Here's what's happening today.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="px-4 py-2 text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Server Time</p>
                        <p className="text-sm font-black text-gray-900 mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100" />
                    <Button onClick={fetchDashboardData} size="sm" variant="ghost" className="rounded-xl h-10 px-4 font-bold text-primary hover:bg-primary/10 transition-all">
                        <Zap className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                </div>
            </div>


            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', trend: 'In Progress' },
                    { label: 'Pending Reports', value: stats.pendingReports, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', trend: 'Awaiting Action' },
                    { label: 'Awaiting Payment', value: stats.pendingPayments, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: 'Accounts' },
                    { label: 'Total Staff', value: stats.totalStaff, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', trend: 'Strength' },
                ].map((stat, idx) => (
                    <motion.div key={idx} variants={item}>
                        <Card className={`border-none shadow-sm ${stat.bg}/30 relative overflow-hidden group`}>
                            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-[100px] -mr-8 -mt-8 opacity-50 transition-transform group-hover:scale-110 duration-500`} />
                            <CardContent className="p-6 relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <Badge variant="outline" className={`bg-white/50 border-none text-[10px] font-black uppercase tracking-tighter ${stat.color}`}>
                                        {stat.trend}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Main Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Today View & Staff */}
                <div className="lg:col-span-1 space-y-8">
                    <motion.div variants={item}>
                        <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-primary" /> Today's Focus
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
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
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
                    </motion.div>
                </div>

                {/* Right Column: Workflow Pipeline & Recent Activity */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Workflow Funnel / Pipeline */}
                    <motion.div variants={item}>
                        <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                            <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" /> Active Workflow Pipeline
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
                    </motion.div>

                    {/* Recent Activity Feed */}
                    <motion.div variants={item}>
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
                                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary">
                                        View All Audit Logs <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default Dashboard;
