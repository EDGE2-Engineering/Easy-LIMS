import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { WORKFLOW_STATES, ROLES, APP_CONFIG } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/SettingsContext';

// Helper date functions
const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

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

const CardSkeleton = ({ height = "h-28" }) => (
  <Card className="rounded-2xl border-gray-100 shadow-sm relative overflow-hidden bg-white">
    <div className={`p-5 flex items-center justify-between ${height}`}>
      <div className="space-y-3 w-full">
        <div className="h-4 bg-gray-100 rounded-md w-1/3 animate-pulse" />
        <div className="h-8 bg-gray-100 rounded-lg w-1/2 animate-pulse" />
        <div className="h-3 bg-gray-50 rounded-md w-2/3 animate-pulse" />
      </div>
      <Loader2 className="w-5 h-5 text-gray-300 animate-spin shrink-0 ml-4" />
    </div>
  </Card>
);

// Component 1: Quick Stats (Active Jobs, Testing, Reports, Payments, Clients)
const QuickStatsWidget = ({ refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeJobs: 0,
    ongoingTesting: 0,
    pendingReports: 0,
    pendingPayments: 0,
    totalClients: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchQuickStats = async () => {
      setLoading(true);
      try {
        const [jobsRes, clientsRes] = await Promise.all([
          apiClient.from('jobs').select('id, status'),
          apiClient.from('clients').select('*', { count: 'exact', head: true })
        ]);

        if (jobsRes.error) throw jobsRes.error;

        const jobs = jobsRes.data || [];
        const counts = jobs.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {});

        const active = jobs.filter((j) => j.status !== WORKFLOW_STATES.JOB_COMPLETE).length;
        const reportsPending = (counts[WORKFLOW_STATES.REPORT_GENERATED] || 0) + (counts[WORKFLOW_STATES.REPORT_UNDER_REVIEW] || 0);
        const paymentsPending = (counts[WORKFLOW_STATES.AWAITING_PAYMENT] || 0) + (counts[WORKFLOW_STATES.INVOICE_GENERATED] || 0);
        const testingOngoing = counts[WORKFLOW_STATES.UNDER_TESTING] || 0;

        if (isMounted) {
          setStats({
            activeJobs: active,
            ongoingTesting: testingOngoing,
            pendingReports: reportsPending,
            pendingPayments: paymentsPending,
            totalClients: clientsRes.count || 0,
          });
        }
      } catch (err) {
        console.error('QuickStats fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchQuickStats();
    return () => { isMounted = false; };
  }, [refreshKey]);

  const cards = [
    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, path: '#/settings/jobs', trend: 'In Progress' },
    { label: 'Ongoing Testing', value: stats.ongoingTesting, icon: Activity, path: '#/settings/jobs?status=UNDER_TESTING', trend: 'Lab Operations' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: FileText, path: '#/settings/jobs', trend: 'Awaiting Action' },
    { label: 'Awaiting Payment', value: stats.pendingPayments, icon: IndianRupee, path: '#/settings/documents', trend: 'Documents' },
    { label: 'Total Clients', value: stats.totalClients, icon: BriefcaseBusiness, path: '#/settings/clients', trend: 'Database' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{card.label}</span>
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black text-gray-900 tracking-tight">{card.value}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] font-bold text-gray-400">{card.trend}</span>
                  <a href={card.path} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Component 2: Financial Metrics & Revenue Widget
const FinancialMetricsWidget = ({ refreshKey }) => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [expTimeframe, setExpTimeframe] = useState('month');
  const [financials, setFinancials] = useState({
    expenditures: { lastWeek: 0, week: 0, lastMonth: 0, month: 0, lastThreeMonths: 0, year: 0 },
    quotations: { lastWeek: 0, week: 0, lastMonth: 0, month: 0, lastThreeMonths: 0, year: 0 },
    invoices: { lastWeek: 0, week: 0, lastMonth: 0, month: 0, lastThreeMonths: 0, year: 0 },
  });

  useEffect(() => {
    let isMounted = true;
    const fetchFinancials = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const formatDate = (d) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const firstDayOfMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        const lastDayOfLastMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
        const firstDayOfLastMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const firstDayOfThreeMonthsAgoStr = formatDate(new Date(now.getFullYear(), now.getMonth() - 3, 1));

        const d = new Date(now);
        const dayOfWeek = d.getDay();
        const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const firstDayOfWeekStr = formatDate(new Date(d.setDate(diff)));

        const lastWeekEnd = new Date(d);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 6);
        const firstDayOfLastWeekStr = formatDate(lastWeekStart);
        const lastDayOfLastWeekStr = formatDate(lastWeekEnd);

        const currentYear = String(now.getFullYear());

        const [expRes, docsRes] = await Promise.all([
          apiClient.from('expenses').select('amount, date'),
          apiClient.from('documents').select('content, created_at, document_type').in('document_type', ['Quotation', 'Tax Invoice'])
        ]);

        const expenses = expRes.data || [];
        const expMetrics = expenses.reduce(
          (acc, e) => {
            const amount = Number(e.amount) || 0;
            const dateStr = e.date || '';
            if (dateStr.startsWith(currentYear)) {
              acc.year += amount;
              if (dateStr >= firstDayOfMonthStr) acc.month += amount;
              if (dateStr >= firstDayOfWeekStr) acc.week += amount;
              if (dateStr >= firstDayOfThreeMonthsAgoStr && dateStr < firstDayOfMonthStr) acc.lastThreeMonths += amount;
            }
            if (dateStr >= firstDayOfLastMonthStr && dateStr <= lastDayOfLastMonthStr) acc.lastMonth += amount;
            if (dateStr >= firstDayOfLastWeekStr && dateStr <= lastDayOfLastWeekStr) acc.lastWeek += amount;
            return acc;
          },
          { lastWeek: 0, week: 0, lastMonth: 0, month: 0, lastThreeMonths: 0, year: 0 }
        );

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
                if (dateStr >= firstDayOfThreeMonthsAgoStr && dateStr < firstDayOfMonthStr) acc.lastThreeMonths += total;
              }
              if (dateStr >= firstDayOfLastMonthStr && dateStr <= lastDayOfLastMonthStr) acc.lastMonth += total;
              if (dateStr >= firstDayOfLastWeekStr && dateStr <= lastDayOfLastWeekStr) acc.lastWeek += total;

              return acc;
            },
            { lastWeek: 0, week: 0, lastMonth: 0, month: 0, lastThreeMonths: 0, year: 0 }
          );
        };

        const allDocs = docsRes.data || [];
        const quoteMetrics = calculateMetrics(allDocs.filter((d) => d.document_type === 'Quotation'));
        const invoiceMetrics = calculateMetrics(allDocs.filter((d) => d.document_type === 'Tax Invoice'));

        if (isMounted) {
          setFinancials({
            expenditures: expMetrics,
            quotations: quoteMetrics,
            invoices: invoiceMetrics,
          });
        }
      } catch (err) {
        console.error('Financials fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFinancials();
    return () => { isMounted = false; };
  }, [refreshKey, settings]);

  const timeframeLabels = {
    week: 'This Week',
    lastWeek: 'Last Week',
    month: 'This Month',
    lastMonth: 'Last Month',
    lastThreeMonths: 'Last 3 Months',
    year: 'This Year',
  };

  const currentExp = financials.expenditures[expTimeframe] || 0;
  const currentQuote = financials.quotations[expTimeframe] || 0;
  const currentInvoice = financials.invoices[expTimeframe] || 0;

  if (loading) {
    return (
      <Card className="rounded-2xl border-gray-100 shadow-sm bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-100 rounded w-1/4 animate-pulse" />
          <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
      <CardHeader className="p-6 pb-2 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Financial Overview & Revenue Metrics
          </CardTitle>
          <CardDescription className="text-xs text-gray-500 font-medium mt-1">
            Real-time financial performance breakdown ({timeframeLabels[expTimeframe]})
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          {Object.keys(timeframeLabels).map((tf) => (
            <button
              key={tf}
              onClick={() => setExpTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                expTimeframe === tf ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {timeframeLabels[tf]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expenditures</span>
            <div className="text-2xl font-black text-gray-900 mt-2">
              ₹{Number(currentExp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] font-bold text-gray-400 mt-1">Total recorded operating costs</p>
          </div>
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quotation Pipeline Value</span>
            <div className="text-2xl font-black text-gray-900 mt-2">
              ₹{Number(currentQuote).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] font-bold text-gray-400 mt-1">Total quotation value generated</p>
          </div>
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Invoiced Revenue</span>
            <div className="text-2xl font-black text-gray-900 mt-2">
              ₹{Number(currentInvoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] font-bold text-gray-400 mt-1">Total tax invoice revenue billed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Component 3: Approvals & Leave Tracker Widget
const ApprovalsWidget = ({ refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [approvalsData, setApprovalsData] = useState({
    pendingLeaves: 0,
    pendingOther: 0,
    leavesToday: [],
    upcomingLeaves: [],
  });

  useEffect(() => {
    let isMounted = true;
    const fetchApprovals = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: approvals, error } = await apiClient
          .from('request_approvals')
          .select('*, requester:users!request_approvals_requester_id_fkey(full_name, username, role)');

        if (error) throw error;

        const list = approvals || [];
        const pendingLeaveCount = list.filter((r) => r.status === 'PENDING' && r.request_type === 'LEAVE').length;
        const pendingOtherCount = list.filter((r) => r.status === 'PENDING' && r.request_type !== 'LEAVE').length;

        const approvedLeaves = list.filter((r) => r.status === 'APPROVED' && r.request_type === 'LEAVE');

        const expandedLeaves = (approvedLeaves || []).flatMap((req) => {
          const { startDate, endDate, leaveType, reason } = req.request_data || {};
          if (!startDate || !endDate) return [];
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

        const seenRequests = new Set();
        const upcomingLeaves = expandedLeaves
          .filter((l) => {
            if (l.leave_date > today && l.leave_date <= nextWeekStr && !seenRequests.has(l.request_id)) {
              seenRequests.add(l.request_id);
              return true;
            }
            return false;
          })
          .sort((a, b) => a.leave_date.localeCompare(b.leave_date));

        if (isMounted) {
          setApprovalsData({
            pendingLeaves: pendingLeaveCount,
            pendingOther: pendingOtherCount,
            leavesToday,
            upcomingLeaves,
          });
        }
      } catch (err) {
        console.error('Approvals fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchApprovals();
    return () => { isMounted = false; };
  }, [refreshKey]);

  if (loading) {
    return <CardSkeleton height="h-36" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pending Approvals Card */}
      <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-gray-50 flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Pending Approvals & Requests
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 font-medium">Requires management authorization</CardDescription>
          </div>
          <a href="#/settings/approvals" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            Manage <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Leave Requests</span>
                <div className="text-2xl font-black text-gray-900 mt-1">{approvalsData.pendingLeaves}</div>
              </div>
              <Calendar className="w-8 h-8 text-primary/40" />
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Operational Requests</span>
                <div className="text-2xl font-black text-gray-900 mt-1">{approvalsData.pendingOther}</div>
              </div>
              <Briefcase className="w-8 h-8 text-primary/40" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Tracker Card */}
      <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-gray-50 flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-primary" /> Staff Leave Tracker
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 font-medium">Staff on leave today & next 7 days</CardDescription>
          </div>
          <Badge variant="outline" className="rounded-lg font-bold text-xs">
            {approvalsData.leavesToday.length} On Leave Today
          </Badge>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          {approvalsData.leavesToday.length === 0 && approvalsData.upcomingLeaves.length === 0 ? (
            <div className="text-center py-4 text-xs font-bold text-gray-400">No staff on leave today or in the upcoming 7 days</div>
          ) : (
            <>
              {approvalsData.leavesToday.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {(l.users?.full_name || l.users?.username || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{l.users?.full_name || l.users?.username}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{l.leave_type || 'Leave'} • Today</div>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-none font-bold text-[10px]">On Leave</Badge>
                </div>
              ))}
              {approvalsData.upcomingLeaves.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center">
                      {(l.users?.full_name || l.users?.username || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{l.users?.full_name || l.users?.username}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{l.leave_type || 'Leave'} • Starts {l.leave_date}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">Upcoming</Badge>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Component 4: Recent Activity & Workflow Logs Widget
const RecentActivityWidget = ({ refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchRecentActivity = async () => {
      setLoading(true);
      try {
        const { data: rawActivity, error } = await apiClient
          .from('job_workflow_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        let list = rawActivity || [];

        const actJobIds = [...new Set(list.map((a) => a.job_id).filter(Boolean))];
        const actUserIds = [...new Set(list.map((a) => a.performed_by).filter(Boolean))];

        let actJobMap = new Map();
        if (actJobIds.length > 0) {
          const { data: jData } = await apiClient.from('jobs').select('id, job_code, project_name').in('id', actJobIds);
          if (jData) actJobMap = new Map(jData.map((j) => [j.id, j]));
        }

        let actUserMap = new Map();
        if (actUserIds.length > 0) {
          const { data: uData } = await apiClient.from('users').select('id, full_name, username').in('id', actUserIds);
          if (uData) actUserMap = new Map(uData.map((u) => [u.id, u]));
        }

        const enriched = list.map((a) => ({
          ...a,
          jobs: actJobMap.get(a.job_id) || null,
          users: actUserMap.get(a.performed_by) || null,
        }));

        if (isMounted) setActivities(enriched);
      } catch (err) {
        console.error('Recent activity fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecentActivity();
    return () => { isMounted = false; };
  }, [refreshKey]);

  if (loading) {
    return <CardSkeleton height="h-40" />;
  }

  return (
    <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-gray-50 flex items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Workflow Activity Feed
          </CardTitle>
          <CardDescription className="text-xs text-gray-500 font-medium">Recent status changes across laboratory jobs</CardDescription>
        </div>
        <a href="#/settings/logs" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
          Full Log <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </CardHeader>
      <CardContent className="p-5">
        {activities.length === 0 ? (
          <div className="text-center py-6 text-xs font-bold text-gray-400">No recent workflow activity logs found</div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="p-2 bg-primary/10 rounded-lg text-primary mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">
                      Job #{act.jobs?.job_code || act.job_id} updated by {act.users?.full_name || act.users?.username || 'User'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                    State changed to <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold">{APP_CONFIG.workflow.states[act.to_state]?.label || act.to_state}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main AdminDashboard Container Page
const AdminDashboard = () => {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-8 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <LayoutDashboard className="w-8 h-8 text-primary" />
              </div>
              Operational Dashboard
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Welcome back, <span className="text-primary font-bold">{user?.fullName || user?.username}</span>. Live summary of Easy-LIMS operations.
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="ghost"
            className="rounded-xl h-10 px-4 font-bold text-primary hover:bg-primary/10 transition-all border border-gray-100 bg-white shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Dashboard
          </Button>
        </div>

        {/* Modular Independent Components */}
        <QuickStatsWidget refreshKey={refreshKey} />
        <FinancialMetricsWidget refreshKey={refreshKey} />
        <ApprovalsWidget refreshKey={refreshKey} />
        <RecentActivityWidget refreshKey={refreshKey} />
      </div>
    </TooltipProvider>
  );
};

export default AdminDashboard;
