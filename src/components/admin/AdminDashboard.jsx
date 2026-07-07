import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  FileText,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  UserMinus,
  Zap,
  Activity,
  Target,
  ShieldCheck,
  CalendarRange,
  BriefcaseBusiness,
  MessageSquare,
  Wallet,
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
      lastWeek: 0,
      week: 0,
      lastMonth: 0,
      month: 0,
      lastThreeMonths: 0,
      year: 0,
    },
    quotations: {
      lastWeek: 0,
      week: 0,
      lastMonth: 0,
      month: 0,
      lastThreeMonths: 0,
      year: 0,
    },
    invoices: {
      lastWeek: 0,
      week: 0,
      lastMonth: 0,
      month: 0,
      lastThreeMonths: 0,
      year: 0,
    },
    pendingLeaves: 0,
    pendingOtherApprovals: 0,
    pendingInquiries: 0,
    leavesToday: [],
    upcomingLeaves: [],
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [todayActivities, setTodayActivities] = useState([]);
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

      const active = jobs.filter((j) => j.status !== WORKFLOW_STATES.JOB_COMPLETE).length;
      const reportsPending =
        (counts[WORKFLOW_STATES.REPORT_GENERATED] || 0) +
        (counts[WORKFLOW_STATES.REPORT_UNDER_REVIEW] || 0);
      const paymentsPending =
        (counts[WORKFLOW_STATES.AWAITING_PAYMENT] || 0) +
        (counts[WORKFLOW_STATES.INVOICE_GENERATED] || 0);
      const testingOngoing = counts[WORKFLOW_STATES.UNDER_TESTING] || 0;

      // 2. Fetch Pending Approvals & Leave Records
      const { data: approvals, error: approvError } = await supabase
        .from('request_approvals')
        .select(
          '*, requester:users!request_approvals_requester_id_fkey(full_name, username, role)'
        );

      if (approvError) throw approvError;

      const pendingLeaveApprovalsCount = (approvals || []).filter(
        (r) => r.status === 'PENDING' && r.request_type === 'LEAVE'
      ).length;
      const otherPendingApprovalsCount = (approvals || []).filter(
        (r) => r.status === 'PENDING' && r.request_type !== 'LEAVE'
      ).length;
      const approvedLeaves = (approvals || []).filter(
        (r) => r.status === 'APPROVED' && r.request_type === 'LEAVE'
      );

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
      const expandedLeaves = (approvedLeaves || []).flatMap((req) => {
        const { startDate, endDate, leaveType, reason } = req.request_data;
        const workingDays = calculateWorkingDays(startDate, endDate);
        const dates = getDatesBetween(new Date(startDate), new Date(endDate));
        return dates.map((date) => ({
          id: `${req.id}-${date.getTime()}`,
          request_id: req.id,
          leave_date: date.toISOString().split('T')[0],
          startDate,
          endDate,
          workingDays,
          leave_type: leaveType,
          comments: reason,
          users: req.requester,
          user_id: req.requester_id,
        }));
      });

      const leavesToday = expandedLeaves.filter((l) => l.leave_date === today);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      // Filter unique requests for upcoming leaves to avoid showing the same leave multiple times
      const seenRequests = new Set();
      const upcomingLeaves = expandedLeaves
        .filter((l) => {
          if (
            l.leave_date > today &&
            l.leave_date <= nextWeekStr &&
            !seenRequests.has(l.request_id)
          ) {
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
      const { count: clientsCount, error: clientErr } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

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
      const lastDayOfLastMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
      const firstDayOfLastMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const firstDayOfThreeMonthsAgoStr = formatDate(
        new Date(now.getFullYear(), now.getMonth() - 3, 1)
      );

      // Get first day of current week (assuming Monday)
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const firstDayOfWeekStr = formatDate(new Date(d.setDate(diff)));

      // Get last week range (Mon–Sun of previous week)
      const lastWeekEnd = new Date(d);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); // last Sunday
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 6); // last Monday
      const firstDayOfLastWeekStr = formatDate(lastWeekStart);
      const lastDayOfLastWeekStr = formatDate(lastWeekEnd);

      const currentYear = String(now.getFullYear());
      const expMetrics = (expenses || []).reduce(
        (acc, e) => {
          const amount = Number(e.amount) || 0;
          const dateStr = e.date || ''; // YYYY-MM-DD

          if (dateStr.startsWith(currentYear)) {
            acc.year += amount;
            if (dateStr >= firstDayOfMonthStr) acc.month += amount;
            if (dateStr >= firstDayOfWeekStr) acc.week += amount;
            if (dateStr >= firstDayOfThreeMonthsAgoStr && dateStr < firstDayOfMonthStr)
              acc.lastThreeMonths += amount;
          }
          if (dateStr >= firstDayOfLastMonthStr && dateStr <= lastDayOfLastMonthStr)
            acc.lastMonth += amount;
          if (dateStr >= firstDayOfLastWeekStr && dateStr <= lastDayOfLastWeekStr)
            acc.lastWeek += amount;

          return acc;
        },
        { lastWeek: 0, week: 0, lastMonth: 0, month: 0, lastThreeMonths: 0, year: 0 }
      );

      // 7. Fetch Quotations & Invoices
      const { data: allDocs, error: docsErr } = await supabase
        .from('documents')
        .select('content, created_at, document_type')
        .in('document_type', ['Quotation', 'Tax Invoice']);

      if (docsErr) throw docsErr;

      const taxCGST = settings?.tax_cgst ? Number(settings.tax_cgst) : 9;
      const taxSGST = settings?.tax_sgst ? Number(settings.tax_sgst) : 9;
      const taxIGST = settings?.tax_igst ? Number(settings.tax_igst) : 18;
      const taxTotalPercent = taxCGST + taxSGST;

      const calculateMetrics = (docs) => {
        return (docs || []).reduce(
          (acc, q) => {
            const content = q.content || {};
            const items = content.items || [];
            const discount = content.discount || 0;

            const isInterstate = content.isInterstate === true;
            const recordTax = isInterstate ? taxIGST : taxTotalPercent;

            const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
            const discountedSubtotal = subtotal * (1 - discount / 100);
            const total = discountedSubtotal * (1 + recordTax / 100);

            const dateStr = q.created_at ? q.created_at.split('T')[0] : '';

            if (dateStr.startsWith(currentYear)) {
              acc.year += total;
              if (dateStr >= firstDayOfMonthStr) acc.month += total;
              if (dateStr >= firstDayOfWeekStr) acc.week += total;
              if (dateStr >= firstDayOfThreeMonthsAgoStr && dateStr < firstDayOfMonthStr)
                acc.lastThreeMonths += total;
            }
            if (dateStr >= firstDayOfLastMonthStr && dateStr <= lastDayOfLastMonthStr)
              acc.lastMonth += total;
            if (dateStr >= firstDayOfLastWeekStr && dateStr <= lastDayOfLastWeekStr)
              acc.lastWeek += total;

            return acc;
          },
          { lastWeek: 0, week: 0, lastMonth: 0, month: 0, lastThreeMonths: 0, year: 0 }
        );
      };

      const quoteMetrics = calculateMetrics(allDocs.filter((d) => d.document_type === 'Quotation'));
      const invoiceMetrics = calculateMetrics(
        allDocs.filter((d) => d.document_type === 'Tax Invoice')
      );

      // 8. Fetch Today's Activity (New docs, jobs, expenses, clients)
      const localToday = new Date();
      localToday.setHours(0, 0, 0, 0);
      const startOfTodayISO = localToday.toISOString();

      const fetchTodayDocs = supabase
        .from('documents')
        .select(
          'id, quote_number, document_type, created_at, clients(client_name), users:created_by(full_name, username)'
        )
        .gte('created_at', startOfTodayISO)
        .then((res) => res.data || [])
        .catch(() => []);
      const fetchTodayJobs = supabase
        .from('jobs')
        .select(
          'id, job_code, project_name, created_at, clients(client_name), users:created_by(full_name, username)'
        )
        .gte('created_at', startOfTodayISO)
        .then((res) => res.data || [])
        .catch(() => []);
      const fetchTodayExpenses = supabase
        .from('expenses')
        .select('id, description, amount, created_at, users:created_by(full_name, username)')
        .gte('created_at', startOfTodayISO)
        .then((res) => res.data || [])
        .catch(() => []);
      const fetchTodayClients = supabase
        .from('clients')
        .select('id, client_name, created_at')
        .gte('created_at', startOfTodayISO)
        .then((res) => res.data || [])
        .catch(() => []);
      const fetchTodayPackages = supabase
        .from('packages')
        .select('id, name, created_at, users:created_by(full_name, username)')
        .gte('created_at', startOfTodayISO)
        .then((res) => res.data || [])
        .catch(() => []);

      const [todayDocs, todayJobs, todayExpenses, todayClients, todayPackages] = await Promise.all([
        fetchTodayDocs,
        fetchTodayJobs,
        fetchTodayExpenses,
        fetchTodayClients,
        fetchTodayPackages,
      ]);

      const docActivities = (todayDocs || []).map((doc) => {
        const userName = doc.users?.full_name || doc.users?.username || 'Unknown';
        return {
          id: `doc-${doc.id}`,
          type: 'document',
          title: `New ${doc.document_type || 'Document'} Created by ${userName}`,
          detail: doc.quote_number,
          subtitle: doc.clients?.client_name || 'No Client Name',
          timestamp: doc.created_at,
          originalId: doc.id,
        };
      });

      const jobActivities = (todayJobs || []).map((job) => {
        const userName = job.users?.full_name || job.users?.username || 'Unknown';
        return {
          id: `job-${job.id}`,
          type: 'job',
          title: `New Job Registered by ${userName}`,
          detail: `#${job.job_code}`,
          subtitle: job.project_name || job.clients?.client_name || 'No Project Details',
          timestamp: job.created_at,
          originalId: job.id,
        };
      });

      const expenseActivities = (todayExpenses || []).map((exp) => {
        const userName = exp.users?.full_name || exp.users?.username || 'Unknown';
        return {
          id: `exp-${exp.id}`,
          type: 'expense',
          title: `New Expense Recorded by ${userName}`,
          detail: `₹${Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          subtitle: exp.description,
          timestamp: exp.created_at,
          originalId: exp.id,
        };
      });

      const clientActivities = (todayClients || []).map((cli) => ({
        id: `cli-${cli.id}`,
        type: 'client',
        title: 'New Client Registered',
        detail: cli.client_name,
        subtitle: 'Master Database',
        timestamp: cli.created_at,
        originalId: cli.id,
      }));

      const packageActivities = (todayPackages || []).map((pkg) => {
        const userName = pkg.users?.full_name || pkg.users?.username || 'Unknown';
        return {
          id: `pkg-${pkg.id}`,
          type: 'package',
          title: `New Package Created by ${userName}`,
          detail: pkg.name,
          subtitle: 'Master Database',
          timestamp: pkg.created_at,
          originalId: pkg.id,
        };
      });

      const compiledActivities = [
        ...docActivities,
        ...jobActivities,
        ...expenseActivities,
        ...clientActivities,
        ...packageActivities,
      ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      setTodayActivities(compiledActivities);

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
        upcomingLeaves: upcomingLeaves,
      });
      setWorkflowCounts(counts);
      setRecentActivity(activity || []);
    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
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
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const getStateLabel = (state) => APP_CONFIG.workflow.states[state]?.label || state;

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
            Initializing Admin Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <LayoutDashboard className="w-8 h-8 text-primary" />
              </div>
              Operational Dashboard
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Welcome back,{' '}
              <span className="text-primary font-bold">{user?.fullName || user?.username}</span>.
              Here's what's happening today.
            </p>
          </div>
          <Button
            onClick={fetchDashboardData}
            size="sm"
            variant="ghost"
            className="rounded-xl h-10 px-4 font-bold text-primary hover:bg-primary/10 transition-all border border-gray-100 bg-white shadow-sm"
          >
            <Zap className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: 'Active Jobs',
              value: stats.activeJobs,
              icon: Briefcase,
              color: 'text-primary',
              bg: 'bg-gray-50 dark:bg-gray-100',
              iconBg: 'bg-primary/10',
              trend: 'In Progress',
              path: '#/settings/jobs',
            },
            {
              label: 'Ongoing Testing',
              value: stats.ongoingTesting,
              icon: Activity,
              color: 'text-primary',
              bg: 'bg-gray-50 dark:bg-gray-100',
              iconBg: 'bg-primary/10',
              trend: 'Lab Operations',
              path: '#/settings/jobs?status=UNDER_TESTING',
            },
            {
              label: 'Pending Reports',
              value: stats.pendingReports,
              icon: FileText,
              color: 'text-primary',
              bg: 'bg-gray-50 dark:bg-gray-100',
              iconBg: 'bg-primary/10',
              trend: 'Awaiting Action',
              path: '#/settings/jobs',
            },
            {
              label: 'Awaiting Payment',
              value: stats.pendingPayments,
              icon: IndianRupee,
              color: 'text-primary',
              bg: 'bg-gray-50 dark:bg-gray-100',
              iconBg: 'bg-primary/10',
              trend: 'Documents',
              path: '#/settings/documents',
            },
            {
              label: 'Total Clients',
              value: stats.totalClients,
              icon: BriefcaseBusiness,
              color: 'text-primary',
              bg: 'bg-gray-50 dark:bg-gray-100',
              iconBg: 'bg-primary/10',
              trend: 'Network',
              path: '#/settings/clients',
            },
          ].map((stat, idx) => (
            <motion.div key={idx} variants={item}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`border-none shadow-sm ${stat.bg}/30 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-95`}
                    onClick={() => (window.location.hash = stat.path)}
                  >
                    <div
                      className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} rounded-bl-[64px] -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110 duration-500`}
                    />
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${stat.iconBg} ${stat.color} shrink-0`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest truncate">
                              {stat.label}
                            </p>
                            <Badge
                              variant="outline"
                              className={`hidden bg-white/50 border-none text-[10px] font-black uppercase tracking-tighter ${stat.color} px-1.5 py-0 h-4`}
                            >
                              {stat.trend}
                            </Badge>
                          </div>
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {stat.value}
                          </h3>
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
                    onClick={() => (window.location.hash = '#/settings/organization/leaves')}
                  >
                    <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" /> Today's Brief
                        </CardTitle>
                        <Badge className="bg-primary/10 text-primary border-none font-bold hover:bg-primary/20">
                          {new Date().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <UserMinus className="w-3.5 h-3.5" /> On Leave Today
                          </h4>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {stats.leavesToday.length}
                          </span>
                        </div>

                        {stats.leavesToday.length === 0 ? (
                          <div className="p-4 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200">
                            <p className="text-sm font-medium text-gray-400 italic">
                              Everyone is in today!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {stats.leavesToday.map((leave, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100/50 hover:border-primary/20 transition-all group"
                              >
                                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-100 text-xs font-black text-primary">
                                  {(() => {
                                    const u =
                                      leave.users || leave['users!employee_leaves_user_id_fkey'];
                                    return (u?.full_name || u?.username || 'U')[0].toUpperCase();
                                  })()}
                                </div>
                                <div className="flex-grow min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">
                                    {(() => {
                                      const u =
                                        leave.users || leave['users!employee_leaves_user_id_fkey'];
                                      return u?.full_name || u?.username || 'Unknown User';
                                    })()}
                                  </p>
                                  <p className="text-xs font-semibold text-primary uppercase truncate">
                                    {new Date(leave.startDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}{' '}
                                    -{' '}
                                    {new Date(leave.endDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    <span className="ml-1 text-gray-400 font-medium">
                                      ({leave.workingDays}{' '}
                                      {leave.workingDays === 1 ? 'day' : 'days'})
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-400 line-clamp-1 italic mt-0.5">
                                    {leave.comments || 'No reason provided'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-50 space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <CalendarRange className="w-3.5 h-3.5" /> Upcoming Leaves
                          </h4>
                          <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                            Next 7 Days
                          </span>
                        </div>

                        {stats.upcomingLeaves.length === 0 ? (
                          <div className="p-4 bg-gray-50/50 rounded-2xl text-center border border-dashed border-gray-200">
                            <p className="text-sm font-medium text-gray-400 italic">
                              No upcoming leaves scheduled.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {stats.upcomingLeaves.map((leave, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-50 hover:border-blue-200 transition-all group shadow-sm"
                              >
                                <div className="w-8 h-8 bg-blue-50 rounded-xl flex flex-col items-center justify-center border border-blue-100 text-blue-600">
                                  <span className="text-[10px] font-black leading-none uppercase">
                                    {new Date(leave.leave_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                    })}
                                  </span>
                                  <span className="text-xs font-black leading-none">
                                    {new Date(leave.leave_date).getDate()}
                                  </span>
                                </div>
                                <div className="flex-grow min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">
                                    {(() => {
                                      const u =
                                        leave.users || leave['users!employee_leaves_user_id_fkey'];
                                      return u?.full_name || u?.username || 'Unknown User';
                                    })()}
                                  </p>
                                  <p className="text-xs font-semibold text-blue-500 uppercase truncate">
                                    {new Date(leave.startDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}{' '}
                                    -{' '}
                                    {new Date(leave.endDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    <span className="ml-1 text-gray-400 font-medium">
                                      ({leave.workingDays}{' '}
                                      {leave.workingDays === 1 ? 'day' : 'days'})
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-400 line-clamp-1 italic mt-0.5">
                                    {leave.comments || 'Planned Leave'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-50 space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" /> Daily Priorities
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div
                            className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 hover:border-primary/30 transition-colors group"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.hash = '#/settings/approvals';
                            }}
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-2xl font-black text-primary tracking-tight">
                                {workflowCounts[WORKFLOW_STATES.TEST_DATA_UNDER_REVIEW] || 0}
                              </span>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                                Reviews Pending
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-transform shrink-0" />
                          </div>

                          <div
                            className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 hover:border-primary/30 transition-colors group"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.hash = '#/settings/documents';
                            }}
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-2xl font-black text-primary tracking-tight">
                                {workflowCounts[WORKFLOW_STATES.REPORT_SIGNED] || 0}
                              </span>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                                Ready to Invoice
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-transform shrink-0" />
                          </div>

                          <div
                            className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 hover:border-primary/30 transition-colors group"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.hash = '#/settings/approvals';
                            }}
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-2xl font-black text-primary tracking-tight">
                                {stats.pendingLeaves}
                              </span>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                                Leave Requests
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-transform shrink-0" />
                          </div>

                          <div
                            className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 hover:border-primary/30 transition-colors group"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.hash = '#/settings/inquiries';
                            }}
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-2xl font-black text-primary tracking-tight">
                                {stats.pendingInquiries}
                              </span>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                                New Inquiries
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-transform shrink-0" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-gray-900 text-white border-gray-800 max-w-[250px]"
                >
                  <p className="text-xs">
                    Summary of staff availability and key priorities that need attention today.
                  </p>
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
                      onClick={() => (window.location.hash = '#/settings/expenses')}
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Wallet className="w-24 h-24" />
                      </div>
                      <CardContent className="p-4 space-y-6 relative">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black tracking-tight">Expenditures</h3>
                          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                            Financial Outflow
                          </p>
                        </div>
                        <div className="space-y-4">
                          {[
                            { label: 'Last Week', value: stats.expenditures.lastWeek },
                            { label: 'This Week', value: stats.expenditures.week },
                            { label: 'Last Month', value: stats.expenditures.lastMonth },
                            { label: 'This Month', value: stats.expenditures.month },
                            { label: 'Last 3 Months', value: stats.expenditures.lastThreeMonths },
                            { label: 'This Year', value: stats.expenditures.year },
                          ].map((exp, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                                <span>{exp.label}</span>
                                <span className="text-sm">₹{exp.value.toLocaleString()}</span>
                              </div>
                              <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    width:
                                      exp.label === 'This Year'
                                        ? '100%'
                                        : `${Math.min(100, (exp.value / (stats.expenditures.year || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="bg-gray-900 text-white border-gray-800 max-w-[250px]"
                  >
                    <p className="text-xs">
                      Summary of organizational expenditures across different time periods.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>

              <motion.div variants={item}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card
                      className="border-none shadow-sm bg-gradient-to-br from-blue-950 to-slate-800 rounded-3xl overflow-hidden text-white relative cursor-pointer hover:shadow-xl hover:shadow-blue-900/20 transition-all active:scale-[0.98] group"
                      onClick={() => (window.location.hash = '#/settings/documents')}
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <TrendingUp className="w-24 h-24" />
                      </div>
                      <CardContent className="p-4 space-y-6 relative">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black tracking-tight">Quotations</h3>
                          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                            Business Proposals
                          </p>
                        </div>
                        <div className="space-y-4">
                          {[
                            { label: 'Last Week', value: stats.quotations.lastWeek },
                            { label: 'This Week', value: stats.quotations.week },
                            { label: 'Last Month', value: stats.quotations.lastMonth },
                            { label: 'This Month', value: stats.quotations.month },
                            { label: 'Last 3 Months', value: stats.quotations.lastThreeMonths },
                            { label: 'This Year', value: stats.quotations.year },
                          ].map((quote, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                                <span>{quote.label}</span>
                                <span className="text-sm">
                                  ₹
                                  {quote.value.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    width:
                                      quote.label === 'This Year'
                                        ? '100%'
                                        : `${Math.min(100, (quote.value / (stats.quotations.year || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="bg-gray-900 text-white border-gray-800 max-w-[250px]"
                  >
                    <p className="text-xs">
                      Summary of total quotation values issued across different time periods.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>

              <motion.div variants={item}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card
                      className="border-none shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl overflow-hidden text-white relative cursor-pointer hover:shadow-xl hover:shadow-emerald-900/20 transition-all active:scale-[0.98] group"
                      onClick={() => (window.location.hash = '#/settings/documents')}
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <FileText className="w-24 h-24" />
                      </div>
                      <CardContent className="p-4 space-y-6 relative">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black tracking-tight">Invoices</h3>
                          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                            Revenue Realization
                          </p>
                        </div>
                        <div className="space-y-4">
                          {[
                            { label: 'Last Week', value: stats.invoices.lastWeek },
                            { label: 'This Week', value: stats.invoices.week },
                            { label: 'Last Month', value: stats.invoices.lastMonth },
                            { label: 'This Month', value: stats.invoices.month },
                            { label: 'Last 3 Months', value: stats.invoices.lastThreeMonths },
                            { label: 'This Year', value: stats.invoices.year },
                          ].map((invoice, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                                <span>{invoice.label}</span>
                                <span className="text-sm">
                                  ₹
                                  {invoice.value.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    width:
                                      invoice.label === 'This Year'
                                        ? '100%'
                                        : `${Math.min(100, (invoice.value / (stats.invoices.year || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="bg-gray-900 text-white border-gray-800 max-w-[250px]"
                  >
                    <p className="text-xs">
                      Summary of total invoice values generated across different time periods.
                    </p>
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
                        <CardDescription className="text-xs font-medium text-gray-400 uppercase tracking-widest">
                          Jobs distributed by current state
                        </CardDescription>
                      </div>
                      {/* <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                     <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Live</span>
                                </div> */}
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                          {
                            state: WORKFLOW_STATES.JOB_CREATED,
                            label: 'Jobs Created',
                            color: 'bg-slate-100 text-slate-600',
                          },
                          {
                            state: WORKFLOW_STATES.MATERIAL_RECEIVED,
                            label: 'Material Received',
                            color: 'bg-indigo-100 text-indigo-600',
                          },
                          {
                            state: WORKFLOW_STATES.UNDER_TESTING,
                            label: 'Under Testing',
                            color: 'bg-amber-100 text-amber-600',
                          },
                          {
                            state: WORKFLOW_STATES.TEST_DATA_UNDER_REVIEW,
                            label: 'Test Data Review',
                            color: 'bg-rose-100 text-rose-600',
                          },
                          {
                            state: WORKFLOW_STATES.REPORT_SIGNED,
                            label: 'Reports Released',
                            color: 'bg-emerald-100 text-emerald-600',
                          },
                        ].map((stage, idx) => {
                          const count = workflowCounts[stage.state] || 0;

                          return (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.hash = `#/settings/jobs?status=${stage.state}`;
                              }}
                              className="flex flex-col justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50/50 transition-all cursor-pointer relative group hover:shadow-sm"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div
                                  className={`w-9 h-9 rounded-xl ${stage.color} flex items-center justify-center font-black text-sm shrink-0`}
                                >
                                  {idx + 1}
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                              </div>
                              <div>
                                <p className="text-sm font-normal text-gray-900 group-hover:text-primary transition-colors leading-tight">
                                  {stage.label}
                                </p>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">
                                  {count} Active Case{count !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  className="bg-gray-900 text-white border-gray-800 max-w-[250px]"
                >
                  <p className="text-xs">
                    The current pipeline of active jobs distributed across all workflow stages.
                  </p>
                </TooltipContent>
              </Tooltip>
            </motion.div>

            {/* Today's Activity */}
            <motion.div variants={item} className="mt-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="p-6 border-b border-gray-50 bg-gray-50/30">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                          <Activity className="w-5 h-5 text-primary" /> Today's Activity
                        </CardTitle>
                        <Badge className="bg-primary/10 text-primary border-none font-bold">
                          Today
                        </Badge>
                      </div>
                      <CardDescription className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-1">
                        Recent documents, jobs, expenses, and clients
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto no-scrollbar">
                        {todayActivities.length === 0 ? (
                          <div className="p-12 text-center">
                            <Activity className="w-12 h-12 mb-4 opacity-20 text-gray-400 mx-auto" />
                            <p className="font-semibold text-gray-500 text-sm">
                              No activity recorded today
                            </p>
                            <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                              New jobs, documents, expenses, or clients will appear here as they are
                              created.
                            </p>
                          </div>
                        ) : (
                          todayActivities.map((act) => {
                            let icon, badgeColor;
                            if (act.type === 'document') {
                              icon = <FileText className="w-4 h-4" />;
                              badgeColor = 'bg-blue-50 text-blue-600';
                            } else if (act.type === 'job') {
                              icon = <Briefcase className="w-4 h-4" />;
                              badgeColor = 'bg-purple-50 text-purple-600';
                            } else if (act.type === 'expense') {
                              icon = <IndianRupee className="w-4 h-4" />;
                              badgeColor = 'bg-red-50 text-red-600';
                            } else if (act.type === 'client') {
                              icon = <Users className="w-4 h-4" />;
                              badgeColor = 'bg-emerald-50 text-emerald-600';
                            } else if (act.type === 'package') {
                              icon = <Package className="w-4 h-4" />;
                              badgeColor = 'bg-orange-50 text-orange-600';
                            }

                            return (
                              <div
                                key={act.id}
                                onClick={() => {
                                  if (act.type === 'document') {
                                    window.location.hash = `#/doc/${act.originalId}`;
                                  } else if (act.type === 'job') {
                                    window.location.hash = `#/settings/jobs/${act.originalId}`;
                                  } else if (act.type === 'expense') {
                                    window.location.hash = `#/settings/expenses/${act.originalId}`;
                                  } else if (act.type === 'client') {
                                    window.location.hash = `#/settings/clients/${act.originalId}`;
                                  } else if (act.type === 'package') {
                                    window.location.hash = `#/settings/packages`;
                                  }
                                }}
                                className="p-5 flex gap-4 hover:bg-gray-50/50 cursor-pointer transition-all group items-center"
                              >
                                <div className="shrink-0">
                                  <div
                                    className={`w-8 h-8 rounded-xl ${badgeColor} flex items-center justify-center shrink-0`}
                                  >
                                    {icon}
                                  </div>
                                </div>
                                <div className="flex-grow flex flex-col md:grid md:grid-cols-12 gap-1 md:gap-4 items-start md:items-center min-w-0">
                                  <div className="md:col-span-5 min-w-0 w-full">
                                    <div className="flex items-center justify-between md:block">
                                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                                        {act.title}
                                      </p>
                                      <span className="text-xs font-black text-gray-400 uppercase tracking-tighter shrink-0 md:hidden">
                                        {new Date(act.timestamp).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="md:col-span-3 min-w-0 w-full">
                                    <p className="text-xs text-gray-600 font-bold truncate">
                                      {act.detail}
                                    </p>
                                  </div>
                                  <div className="md:col-span-3 min-w-0 w-full">
                                    {act.subtitle && (
                                      <p className="text-xs text-gray-400 font-medium truncate">
                                        {act.subtitle}
                                      </p>
                                    )}
                                  </div>
                                  <div className="hidden md:block md:col-span-1 text-right shrink-0">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">
                                      {new Date(act.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  className="bg-gray-900 text-white border-gray-800 max-w-[250px]"
                >
                  <p className="text-xs">
                    Live feed of documents created, jobs registered, expenses logged, and clients
                    added today.
                  </p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default AdminDashboard;
