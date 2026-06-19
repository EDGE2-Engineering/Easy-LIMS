import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { APP_CONFIG, WORKFLOW_STATES } from '@/data/config';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  User,
  Briefcase,
  ArrowRight,
  SlidersHorizontal,
  CalendarRange,
  Activity,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 25;

// ── helpers ──────────────────────────────────────────────────────────────────

const getStateLabel = (state) => APP_CONFIG.workflow.states[state]?.label || state || '—';

const STATE_COLORS = {
  INQUIRY_RECEIVED: 'bg-slate-100 text-slate-600 border-slate-200',
  QUOTATION_SENT: 'bg-blue-50 text-blue-700 border-blue-100',
  WORK_ORDER_RECEIVED: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  MATERIAL_INWARD: 'bg-violet-50 text-violet-700 border-violet-100',
  SAMPLE_REGISTERED: 'bg-purple-50 text-purple-700 border-purple-100',
  TESTING_IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  TESTING_COMPLETED: 'bg-amber-50 text-amber-700 border-amber-100',
  TEST_DATA_UNDER_REVIEW: 'bg-orange-50 text-orange-700 border-orange-100',
  REPORT_SIGNED: 'bg-teal-50 text-teal-700 border-teal-100',
  REPORT_UNDER_REVIEW: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  INVOICE_GENERATED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  AWAITING_PAYMENT: 'bg-lime-50 text-lime-700 border-lime-100',
  PAYMENT_RECEIVED: 'bg-green-50 text-green-700 border-green-100',
  REPORT_RELEASED: 'bg-sky-50 text-sky-700 border-sky-100',
  JOB_COMPLETE: 'bg-primary/10 text-primary border-primary/20',
};

const stateBadge = (state) => {
  const cls = STATE_COLORS[state] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${cls}`}>
      {getStateLabel(state)}
    </span>
  );
};

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtDateOnly = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── component ─────────────────────────────────────────────────────────────────

const AuditLogsManager = () => {
  // data
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);     // for user filter dropdown
  const [states, setStates] = useState([]);   // unique from/to states

  // pagination
  const [page, setPage] = useState(1);

  // search + filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterActivityType, setFilterActivityType] = useState(''); // '' | 'job' | 'leave' | 'other'
  const [datePreset, setDatePreset] = useState('custom');
  const [showFilters, setShowFilters] = useState(false);

  // sort
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // stats
  const [stats, setStats] = useState({ total: 0, today: 0, uniqueUsers: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // export
  const [exporting, setExporting] = useState(false);

  // debounce search
  const searchTimer = useRef(null);
  const handleSearchChange = (v) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  };

  // ── fetch summary stats (once on mount) ────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { count: total } = await supabase
        .from('job_workflow_logs')
        .select('*', { count: 'exact', head: true });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('job_workflow_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // unique performers
      const { data: performers } = await supabase
        .from('job_workflow_logs')
        .select('performed_by');
      const unique = new Set((performers || []).map((r) => r.performed_by)).size;

      setStats({ total: total || 0, today: todayCount || 0, uniqueUsers: unique });
    } catch (_) {}
    finally { setStatsLoading(false); }
  }, []);

  // ── fetch user list for dropdown ───────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, username')
      .order('full_name');
    setUsers(data || []);
  }, []);

  // ── main paginated log fetch ───────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from('job_workflow_logs')
        .select(
          '*, jobs(job_code, project_name), users!job_workflow_logs_performed_by_fkey(id, full_name, username)',
          { count: 'exact' }
        );

      // filters
      if (filterUser) q = q.eq('performed_by', filterUser);
      if (filterState) q = q.or(`from_state.eq.${filterState},to_state.eq.${filterState}`);
      if (filterDateFrom) q = q.gte('created_at', new Date(filterDateFrom).toISOString());
      if (filterDateTo) {
        const end = new Date(filterDateTo);
        end.setHours(23, 59, 59, 999);
        q = q.lte('created_at', end.toISOString());
      }

      // search on job_code via text — filter client-side after fetch (Supabase free tier workaround)
      q = q.order(sortKey, { ascending: sortDir === 'asc' }).range(from, to);

      const { data, count, error } = await q;
      if (error) throw error;

      let rows = data || [];

      // client-side search on job_code / user name / remarks
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.jobs?.job_code?.toLowerCase().includes(term) ||
            r.jobs?.project_name?.toLowerCase().includes(term) ||
            r.users?.full_name?.toLowerCase().includes(term) ||
            r.users?.username?.toLowerCase().includes(term) ||
            r.remarks?.toLowerCase().includes(term) ||
            r.action_id?.toLowerCase().includes(term)
        );
      }

      setLogs(rows);
      setTotalCount(count || 0);

      // collect all unique states seen so far for the filter dropdown
      const seenStates = new Set();
      rows.forEach((r) => {
        if (r.from_state) seenStates.add(r.from_state);
        if (r.to_state) seenStates.add(r.to_state);
      });
      // merge with existing
      setStates((prev) => [...new Set([...prev, ...seenStates])]);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortDir, filterUser, filterState, filterDateFrom, filterDateTo, debouncedSearch]);

  useEffect(() => { fetchStats(); fetchUsers(); }, [fetchStats, fetchUsers]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-gray-300 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-primary ml-1 inline" />
      : <ChevronDown className="w-3 h-3 text-primary ml-1 inline" />;
  };

  const activeFilters = [filterUser, filterState, filterDateFrom, filterDateTo, filterActivityType].filter(Boolean).length;

  const applyDatePreset = (preset) => {
    const now = new Date();
    const fd = (d) => d.toISOString().split('T')[0];
    let start = '', end = '';
    switch (preset) {
      case 'this_month':
        start = fd(new Date(now.getFullYear(), now.getMonth(), 1));
        end   = fd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'last_month':
        start = fd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        end   = fd(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'ytd':
        start = fd(new Date(now.getFullYear(), 0, 1));
        end   = fd(now);
        break;
      case 'this_year':
        start = fd(new Date(now.getFullYear(), 0, 1));
        end   = fd(new Date(now.getFullYear(), 11, 31));
        break;
      case 'last_year':
        start = fd(new Date(now.getFullYear() - 1, 0, 1));
        end   = fd(new Date(now.getFullYear() - 1, 11, 31));
        break;
      default:
        break;
    }
    setFilterDateFrom(start);
    setFilterDateTo(end);
    setDatePreset(preset);
    setPage(1);
  };

  const clearFilters = () => {
    setFilterUser(''); setFilterState('');
    setFilterDateFrom(''); setFilterDateTo('');
    setFilterActivityType('');
    setDatePreset('custom');
    setSearch(''); setDebouncedSearch('');
    setPage(1);
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      let q = supabase
        .from('job_workflow_logs')
        .select('*, jobs(job_code, project_name), users!job_workflow_logs_performed_by_fkey(full_name, username)')
        .order('created_at', { ascending: false });

      if (filterUser) q = q.eq('performed_by', filterUser);
      if (filterState) q = q.or(`from_state.eq.${filterState},to_state.eq.${filterState}`);
      if (filterDateFrom) q = q.gte('created_at', new Date(filterDateFrom).toISOString());
      if (filterDateTo) {
        const end = new Date(filterDateTo); end.setHours(23, 59, 59, 999);
        q = q.lte('created_at', end.toISOString());
      }

      const { data } = await q;
      let rows = data || [];
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.jobs?.job_code?.toLowerCase().includes(term) ||
            r.users?.full_name?.toLowerCase().includes(term) ||
            r.remarks?.toLowerCase().includes(term)
        );
      }

      const headers = ['Date & Time', 'User', 'Job Code', 'Project', 'Action', 'From State', 'To State', 'Remarks'];
      const csvRows = rows.map((r) => [
        fmt(r.created_at),
        r.users?.full_name || r.users?.username || 'System',
        r.jobs?.job_code || '',
        r.jobs?.project_name || '',
        r.action_id || '',
        getStateLabel(r.from_state),
        getStateLabel(r.to_state),
        `"${(r.remarks || '').replace(/"/g, '""')}"`,
      ]);

      const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            System Audit Logs
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-1">
            Full activity trail · search · filter · export
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { fetchLogs(); fetchStats(); }}
            className="rounded-xl h-9 px-4 font-bold text-primary hover:bg-primary/10 border border-gray-100 bg-white shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-xl h-9 px-4 font-bold text-emerald-700 hover:bg-emerald-50 border border-gray-100 bg-white shadow-sm"
          >
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Stats Strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Log Entries', value: statsLoading ? '…' : stats.total.toLocaleString(), icon: Activity, color: 'text-primary bg-primary/10' },
          { label: 'Activity Today', value: statsLoading ? '…' : stats.today.toLocaleString(), icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Unique Users', value: statsLoading ? '…' : stats.uniqueUsers.toLocaleString(), icon: User, color: 'text-indigo-600 bg-indigo-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────────────────── */}
      <Card className="border-none shadow-sm bg-white rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search job code, user, remarks, action…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-10 rounded-xl border-gray-200 text-sm font-medium"
              />
              {search && (
                <button onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <Button
              size="sm"
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters((v) => !v)}
              className={`h-10 rounded-xl font-bold px-4 gap-2 ${showFilters ? 'bg-primary text-white' : 'border-gray-200'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilters > 0 && (
                <span className="ml-1 bg-white text-primary rounded-full px-1.5 text-[10px] font-black">
                  {activeFilters}
                </span>
              )}
            </Button>

            {activeFilters > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-10 rounded-xl font-bold px-3 text-gray-400 hover:text-destructive hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="pt-3 border-t border-border space-y-4">
              {/* Row 1: Activity Type · User · Quick Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Activity Type */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Activity Type
                  </Label>
                  <Select
                    value={filterActivityType || '__all__'}
                    onValueChange={(v) => { setFilterActivityType(v === '__all__' ? '' : v); setFilterState(''); setPage(1); }}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-sm bg-muted/40 border-transparent">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Types</SelectItem>
                      <SelectItem value="job">Job Workflow</SelectItem>
                      <SelectItem value="leave">Leave Approval</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> User
                  </Label>
                  <Select
                    value={filterUser || '__all__'}
                    onValueChange={(v) => { setFilterUser(v === '__all__' ? '' : v); setPage(1); }}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-sm bg-muted/40 border-transparent">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Users</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.full_name || u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Date */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <CalendarRange className="w-3 h-3" /> Quick Date
                  </Label>
                  <Select value={datePreset} onValueChange={applyDatePreset}>
                    <SelectTrigger className="h-10 rounded-xl text-sm bg-muted/40 border-transparent">
                      <SelectValue placeholder="Custom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Range</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Workflow State (job only) · From Date · To Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Workflow State — only shown when Activity Type = job */}
                {filterActivityType === 'job' ? (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Workflow State
                    </Label>
                    <Select
                      value={filterState || '__all__'}
                      onValueChange={(v) => { setFilterState(v === '__all__' ? '' : v); setPage(1); }}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-sm bg-muted/40 border-transparent">
                        <SelectValue placeholder="All States" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All States</SelectItem>
                        {Object.entries(WORKFLOW_STATES).map(([key, val]) => (
                          <SelectItem key={key} value={val}>
                            {getStateLabel(val)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div />
                )}

                {/* From Date */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <CalendarRange className="w-3 h-3" /> From Date
                  </Label>
                  <AppDatePicker
                    value={filterDateFrom}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setDatePreset('custom'); setPage(1); }}
                    className="h-10 text-sm bg-muted/40 border-transparent rounded-xl"
                    placeholder="From date"
                  />
                </div>

                {/* To Date */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <CalendarRange className="w-3 h-3" /> To Date
                  </Label>
                  <AppDatePicker
                    value={filterDateTo}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => { setFilterDateTo(e.target.value); setDatePreset('custom'); setPage(1); }}
                    className="h-10 text-sm bg-muted/40 border-transparent rounded-xl"
                    placeholder="To date"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="p-5 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Activity Log
            </CardTitle>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {loading ? 'Loading…' : `${totalCount.toLocaleString()} entries · page ${page} of ${totalPages}`}
            </span>
          </div>
        </CardHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-bold text-gray-400">No matching activity found.</p>
            <p className="text-xs text-gray-300 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px] table-fixed">
              <colgroup>
                <col style={{ width: '160px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '170px' }} />
                <col style={{ width: '170px' }} />
                <col style={{ width: '155px' }} />
                <col style={{ width: '175px' }} />
              </colgroup>
              <thead className="bg-muted/60 border-b border-border">
                <tr>
                  {[
                    { label: 'Date & Time', col: 'created_at' },
                    { label: 'User', col: null },
                    { label: 'Job Code', col: null },
                    { label: 'From State', col: null },
                    { label: 'To State', col: null },
                    { label: 'Action', col: 'action_id' },
                    { label: 'Remarks', col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      onClick={col ? () => toggleSort(col) : undefined}
                      className={`py-3 px-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap ${col ? 'cursor-pointer hover:text-primary select-none' : ''}`}
                    >
                      {label}
                      {col && <SortIcon col={col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    className="hover:bg-muted/40 transition-colors group"
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-700">
                          {fmtDateOnly(log.created_at)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 truncate">
                          {log.users?.full_name || log.users?.username || 'System'}
                        </span>
                      </div>
                    </td>

                    {/* Job Code */}
                    <td className="py-3.5 px-4 align-middle">
                      {log.jobs?.job_code ? (
                        <span className="font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 text-xs">
                          #{log.jobs.job_code}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* From State */}
                    <td className="py-3.5 px-4 align-middle">
                      {log.from_state ? stateBadge(log.from_state) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* To State */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        {log.from_state && <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />}
                        {stateBadge(log.to_state)}
                      </div>
                    </td>

                    {/* Action ID */}
                    <td className="py-3.5 px-4 align-middle">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {(log.action_id || '').replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Remarks */}
                    <td className="py-3.5 px-4 align-middle">
                      {log.remarks ? (
                        <span className="text-xs text-gray-500 italic truncate block max-w-[155px]" title={log.remarks}>
                          {log.remarks}
                        </span>
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs font-medium text-gray-400">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()} entries
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Page numbers — show at most 5 */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? 'default' : 'ghost'}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${p === page ? 'bg-primary text-white' : ''}`}
                  >
                    {p}
                  </Button>
                );
              })}

              <Button
                size="sm"
                variant="ghost"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogsManager;
