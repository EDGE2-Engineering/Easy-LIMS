
import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard, Briefcase, Users, Calendar, TrendingUp,
    AlertCircle, CheckCircle2, Clock, IndianRupee, FileText,
    Package, ArrowUpRight, ArrowDownRight, ChevronRight, UserMinus,
    Zap, Activity, Target, ShieldCheck, CalendarRange,
    BriefcaseBusiness, MessageSquare, Wallet
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
import { useSettings } from '@/contexts/SettingsContext';

const AdminDashboard = () => {
    const { settings } = useSettings();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalJobs: 0,
        activeJobs: 0,
        ongoingTesting: 0,
        pendingReports: 0,
        pendingPayments: 0,
        totalStaff: 0,
        totalClients: 0,
        expenditures: {
            week: 0,
            month: 0,
            year: 0
        },
        quotations: {
            week: 0,
            month: 0,
            year: 0
        },
        invoices: {
            week: 0,
            month: 0,
            year: 0
        },
        pendingLeaves: 0,
        pendingOtherApprovals: 0,
        pendingInquiries: 0,
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
            const testingOngoing = (counts[WORKFLOW_STATES.UNDER_TESTING] || 0);

            // 2. Fetch Pending Approvals & Leave Records
            const { data: approvals, error: approvError } = await supabase
                .from('request_approvals')
                .select('*, requester:users!request_approvals_requester_id_fkey(full_name, username, role)');

            if (approvError) throw approvError;

            const pendingLeaveApprovalsCount = (approvals || []).filter(r => r.status === 'PENDING' && r.request_type === 'LEAVE').length;
            const otherPendingApprovalsCount = (approvals || []).filter(r => r.status === 'PENDING' && r.request_type !== 'LEAVE').length;
            const approvedLeaves = (approvals || []).filter(r => r.status === 'APPROVED' && r.request_type === 'LEAVE');

            const calculateWorkingDays = (start, end) => {
                let count = 0;
                let cur = new Date(start);
                const last = new Date(end);
                while (cur <= last) {
                    if (cur.getDay() !== 0) count++;
                    cur.setDate(cur.getDate() + 1);
                }
                return count;
            };

            // Expand requests into individual day records for easier filtering
            const expandedLeaves = (approvedLeaves || []).flatMap(req => {
                const { startDate, endDate, leaveType, reason } = req.request_data;
                const workingDays = calculateWorkingDays(startDate, endDate);
                const dates = getDatesBetween(new Date(startDate), new Date(endDate));
                return dates.map(date => ({
                    id: `${req.id}-${date.getTime()}`,
                    request_id: req.id,
                    leave_date: date.toISOString().split('T')[0],
                    startDate,
                    endDate,
                    workingDays,
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

            // Filter unique requests for upcoming leaves to avoid showing the same leave multiple times
            const seenRequests = new Set();
            const upcomingLeaves = expandedLeaves
                .filter(l => {
                    if (l.leave_date > today && l.leave_date <= nextWeekStr && !seenRequests.has(l.request_id)) {
                        seenRequests.add(l.request_id);
                        return true;
                    }
                    return false;
                })
                .sort((a, b) => a.leave_date.localeCompare(b.leave_date));

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

            // 5. Fetch Clients & Inquiries Stats
            const { count: clientsCount, error: clientErr } = await supabase.from('clients').select('*', { count: 'exact', head: true });
            
            const { count: inquiriesCount, error: inquiryErr } = await supabase
                .from('inquiries')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PENDING');

            // 6. Fetch Expenses for Year
            const now = new Date();
            const formatDate = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const firstDayOfYearStr = `${now.getFullYear()}-01-01`;
            const { data: expenses, error: expErr } = await supabase
                .from('expenses')
                .select('amount, date');

            if (expErr) throw expErr;

            const firstDayOfMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));

            // Get first day of current week (assuming Monday)
            const d = new Date(now);
            const dayOfWeek = d.getDay();
            const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const firstDayOfWeekStr = formatDate(new Date(d.setDate(diff)));

            const currentYear = String(now.getFullYear());
            const expMetrics = (expenses || []).reduce((acc, e) => {
                const amount = Number(e.amount) || 0;
                const dateStr = e.date || ""; // YYYY-MM-DD

                // Only count expenses from the current year
                if (dateStr.startsWith(currentYear)) {
                    acc.year += amount;
                    if (dateStr >= firstDayOfMonthStr) acc.month += amount;
                    if (dateStr >= firstDayOfWeekStr) acc.week += amount;
                }

                return acc;
            }, { week: 0, month: 0, year: 0 });

            // 7. Fetch Quotations & Invoices
            const { data: allDocs, error: docsErr } = await supabase
                .from('documents')
                .select('content, created_at, document_type')
                .in('document_type', ['Quotation', 'Tax Invoice']);

            if (docsErr) throw docsErr;

            const taxCGST = settings?.tax_cgst ? Number(settings.tax_cgst) : 9;
            const taxSGST = settings?.tax_sgst ? Number(settings.tax_sgst) : 9;
            const taxTotalPercent = taxCGST + taxSGST;

            const calculateMetrics = (docs) => {
                return (docs || []).reduce((acc, q) => {
                    const content = q.content || {};
                    const items = content.items || [];
                    const discount = content.discount || 0;

                    const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
                    const discountedSubtotal = subtotal * (1 - discount / 100);
                    const total = discountedSubtotal * (1 + taxTotalPercent / 100);

                    const dateStr = q.created_at ? q.created_at.split('T')[0] : "";

                    if (dateStr.startsWith(currentYear)) {
                        acc.year += total;
                        if (dateStr >= firstDayOfMonthStr) acc.month += total;
                        if (dateStr >= firstDayOfWeekStr) acc.week += total;
                    }

                    return acc;
                }, { week: 0, month: 0, year: 0 });
            };

            const quoteMetrics = calculateMetrics(allDocs.filter(d => d.document_type === 'Quotation'));
            const invoiceMetrics = calculateMetrics(allDocs.filter(d => d.document_type === 'Tax Invoice'));

            setStats({
                totalJobs: jobs.length,
                activeJobs: active,
                ongoingTesting: testingOngoing,
                pendingReports: reportsPending,
                pendingPayments: paymentsPending,
                totalStaff: staffCount || 0,
                totalClients: clientsCount || 0,
                expenditures: expMetrics,
                quotations: quoteMetrics,
                invoices: invoiceMetrics,
                pendingLeaves: pendingLeaveApprovalsCount,
                pendingOtherApprovals: otherPendingApprovalsCount,
                pendingInquiries: inquiriesCount || 0,
                leavesToday: leavesToday,
                upcomingLeaves: upcomingLeaves
            });
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
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Initializing Admin Dashboard...</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', trend: 'In Progress', path: '#/settings/jobs' },
                        { label: 'Ongoing Testing', value: stats.ongoingTesting, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', trend: 'Lab Operations', path: '#/settings/jobs?status=UNDER_TESTING' },
                        { label: 'Pending Reports', value: stats.pendingReports, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', trend: 'Awaiting Action', path: '#/settings/jobs' },
                        { label: 'Awaiting Payment', value: stats.pendingPayments, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: 'Documents', path: '#/settings/documents' },
                        { label: 'Total Clients', value: stats.totalClients, icon: BriefcaseBusiness, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: 'Network', path: '#/settings/clients' },
                    ].map((stat, idx) => (
                        <motion.div key={idx} variants={item}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Card
                                        className={`border-none shadow-sm ${stat.bg}/30 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-95`}
                                        onClick={() => window.location.hash = stat.path}
                                    >
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
                                    <Card
                                        className="border-none shadow-sm bg-white rounded-3xl overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                                        onClick={() => window.location.hash = '#/settings/organization/leaves'}
                                    >
                                        <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-primary" /> Today's Brief
                                                </CardTitle>
                                                <Badge className="bg-primary/10 text-primary border-none font-bold hover:bg-primary/20">
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
                                                                    <p className="text-[10px] font-bold text-primary uppercase truncate">
                                                                        {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                        <span className="ml-1 text-gray-400">({leave.workingDays} {leave.workingDays === 1 ? 'day' : 'days'})</span>
                                                                    </p>
                                                                    <p className="text-[9px] font-medium text-gray-400 line-clamp-1 italic">{leave.comments || 'No reason provided'}</p>
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
                                                        <p className="text-[10px] font-bold text-gray-400 italic">No upcoming leaves scheduled.</p>
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
                                                                    <p className="text-[10px] font-bold text-blue-500 uppercase truncate">
                                                                        {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                        <span className="ml-1 text-gray-400">({leave.workingDays} {leave.workingDays === 1 ? 'day' : 'days'})</span>
                                                                    </p>
                                                                    <p className="text-[9px] font-medium text-gray-400 line-clamp-1 italic">{leave.comments || 'Planned Leave'}</p>
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
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div
                                                        className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-center justify-between cursor-pointer hover:bg-orange-100/50 transition-colors group"
                                                        onClick={(e) => { e.stopPropagation(); window.location.hash = '#/settings/approvals'; }}
                                                    >
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xl font-black text-orange-600 tracking-tight">{workflowCounts[WORKFLOW_STATES.TEST_DATA_UNDER_REVIEW] || 0}</span>
                                                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-tight">Job Reviews Pending</span>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-1 transition-transform" />
                                                    </div>

                                                    <div
                                                        className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1 cursor-pointer hover:bg-blue-100/50 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); window.location.hash = '#/settings/documents'; }}
                                                    >
                                                        <span className="text-xl font-black text-blue-600 tracking-tight">{workflowCounts[WORKFLOW_STATES.REPORT_SIGNED] || 0}</span>
                                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-tight">Ready to Invoice</span>
                                                    </div>


                                                    <div
                                                        className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col gap-1 cursor-pointer hover:bg-indigo-100/50 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); window.location.hash = '#/settings/approvals'; }}
                                                    >
                                                        <span className="text-xl font-black text-indigo-600 tracking-tight">{stats.pendingLeaves}</span>
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tight">Leave Requests</span>
                                                    </div>

                                                    <div
                                                        className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col gap-1 cursor-pointer hover:bg-purple-100/50 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); window.location.hash = '#/settings/inquiries'; }}
                                                    >
                                                        <span className="text-xl font-black text-purple-600 tracking-tight">{stats.pendingInquiries}</span>
                                                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-tight">New Inquiries</span>
                                                    </div>

                                                </div>
                                            </div>

                                        </CardContent>
                                    </Card>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800 max-w-[250px]">
                                    <p className="text-xs">Summary of staff availability and key priorities that need attention today.</p>
                                </TooltipContent>
                            </Tooltip>
                        </motion.div>


                    </div>

                    {/* Right Column: Workflow Pipeline & Recent Activity */}
                    <div className="lg:col-span-2 space-y-8">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <motion.div variants={item}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Card
                                            className="border-none shadow-sm bg-gradient-to-br from-red-500 to-red-700 rounded-3xl overflow-hidden text-white relative cursor-pointer hover:shadow-xl hover:shadow-red-500/20 transition-all active:scale-[0.98] group"
                                            onClick={() => window.location.hash = '#/settings/expenses'}
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <Wallet className="w-24 h-24" />
                                            </div>
                                            <CardContent className="p-4 space-y-6 relative">
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black tracking-tight">Expenditures</h3>
                                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Financial Outflow</p>
                                                </div>
                                                <div className="space-y-4">
                                                    {[
                                                        { label: 'This Week', value: stats.expenditures.week },
                                                        { label: 'This Month', value: stats.expenditures.month },
                                                        { label: 'This Year', value: stats.expenditures.year },
                                                    ].map((exp, idx) => (
                                                        <div key={idx} className="space-y-2">
                                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                                <span>{exp.label}</span>
                                                                <span className="text-sm">₹{exp.value.toLocaleString()}</span>
                                                            </div>
                                                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-white rounded-full transition-all duration-1000"
                                                                    style={{
                                                                        width: exp.label === 'This Year' ? '100%' :
                                                                            exp.label === 'This Month' ? `${Math.min(100, (exp.value / (stats.expenditures.year || 1)) * 100)}%` :
                                                                                `${Math.min(100, (exp.value / (stats.expenditures.month || 1)) * 100)}%`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800 max-w-[250px]">
                                        <p className="text-xs">Summary of organizational expenditures across different time periods.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </motion.div>

                            <motion.div variants={item}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Card
                                            className="border-none shadow-sm bg-gradient-to-br from-blue-950 to-slate-800 rounded-3xl overflow-hidden text-white relative cursor-pointer hover:shadow-xl hover:shadow-blue-900/20 transition-all active:scale-[0.98] group"
                                            onClick={() => window.location.hash = '#/settings/documents'}
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <TrendingUp className="w-24 h-24" />
                                            </div>
                                            <CardContent className="p-4 space-y-6 relative">
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black tracking-tight">Quotations</h3>
                                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Business Proposals</p>
                                                </div>
                                                <div className="space-y-4">
                                                    {[
                                                        { label: 'This Week', value: stats.quotations.week },
                                                        { label: 'This Month', value: stats.quotations.month },
                                                        { label: 'This Year', value: stats.quotations.year },
                                                    ].map((quote, idx) => (
                                                        <div key={idx} className="space-y-2">
                                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                                <span>{quote.label}</span>
                                                                <span className="text-sm">₹{quote.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-white rounded-full transition-all duration-1000"
                                                                    style={{
                                                                        width: quote.label === 'This Year' ? '100%' :
                                                                            quote.label === 'This Month' ? `${Math.min(100, (quote.value / (stats.quotations.year || 1)) * 100)}%` :
                                                                                `${Math.min(100, (quote.value / (stats.quotations.month || 1)) * 100)}%`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800 max-w-[250px]">
                                        <p className="text-xs">Summary of total quotation values issued across different time periods.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </motion.div>

                            <motion.div variants={item}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Card
                                            className="border-none shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl overflow-hidden text-white relative cursor-pointer hover:shadow-xl hover:shadow-emerald-900/20 transition-all active:scale-[0.98] group"
                                            onClick={() => window.location.hash = '#/settings/documents'}
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <FileText className="w-24 h-24" />
                                            </div>
                                            <CardContent className="p-4 space-y-6 relative">
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black tracking-tight">Invoices</h3>
                                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Revenue Realization</p>
                                                </div>
                                                <div className="space-y-4">
                                                    {[
                                                        { label: 'This Week', value: stats.invoices.week },
                                                        { label: 'This Month', value: stats.invoices.month },
                                                        { label: 'This Year', value: stats.invoices.year },
                                                    ].map((invoice, idx) => (
                                                        <div key={idx} className="space-y-2">
                                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                                <span>{invoice.label}</span>
                                                                <span className="text-sm">₹{invoice.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-white rounded-full transition-all duration-1000"
                                                                    style={{
                                                                        width: invoice.label === 'This Year' ? '100%' :
                                                                            invoice.label === 'This Month' ? `${Math.min(100, (invoice.value / (stats.invoices.year || 1)) * 100)}%` :
                                                                                `${Math.min(100, (invoice.value / (stats.invoices.month || 1)) * 100)}%`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800 max-w-[250px]">
                                        <p className="text-xs">Summary of total invoice values generated across different time periods.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </motion.div>
                        </div>
                        {/* Workflow Funnel / Pipeline */}
                        <motion.div variants={item}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Card
                                        className="border-none shadow-sm bg-white rounded-3xl overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                                    // onClick={() => window.location.hash = '#/settings/jobs'}
                                    >
                                        <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                                    <Activity className="w-5 h-5 text-primary" /> Summary of Jobs
                                                </CardTitle>
                                                <CardDescription className="text-xs font-medium text-gray-400 uppercase tracking-widest">Jobs distributed by current state</CardDescription>
                                            </div>
                                            {/* <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live</span>
                                </div> */}
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="flex flex-col gap-3">
                                                {[
                                                    { state: WORKFLOW_STATES.JOB_CREATED, label: 'Jobs Created', color: 'bg-slate-100 text-slate-600' },
                                                    { state: WORKFLOW_STATES.MATERIAL_RECEIVED, label: 'Material Received', color: 'bg-indigo-100 text-indigo-600' },
                                                    { state: WORKFLOW_STATES.UNDER_TESTING, label: 'Under Testing', color: 'bg-amber-100 text-amber-600' },
                                                    { state: WORKFLOW_STATES.TEST_DATA_UNDER_REVIEW, label: 'Test Data Review', color: 'bg-rose-100 text-rose-600' },
                                                    { state: WORKFLOW_STATES.REPORT_SIGNED, label: 'Reports Released', color: 'bg-emerald-100 text-emerald-600' },
                                                ].map((stage, idx) => {
                                                    const count = workflowCounts[stage.state] || 0;
                                                    const percentage = stats.totalJobs > 0 ? (count / stats.totalJobs) * 100 : 0;

                                                    return (
                                                        <div key={idx} className="relative group">
                                                            <div
                                                                className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer relative z-10 border border-transparent hover:border-gray-100"
                                                                onClick={(e) => { e.stopPropagation(); window.location.hash = `#/settings/jobs?status=${stage.state}`; }}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-xl ${stage.color} flex items-center justify-center font-black text-sm`}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-normal text-gray-900">{stage.label}</p>
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

                        {/* Recent Activity Feed
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
                    </motion.div> */}
                    </div>
                </div>
            </motion.div>
        </TooltipProvider>
    );
};

export default AdminDashboard;
