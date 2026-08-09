import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { APP_CONFIG, WORKFLOW_STATES, ROLES, DEPARTMENTS } from '@/data/config';
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
  SortAsc,
  SortDesc,
} from 'lucide-react';

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
  const [users, setUsers] = useState([]); // for user filter dropdown

  // pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // search + filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterActivityType, setFilterActivityType] = useState(''); // '' | 'job_workflow' | 'client' | 'expense' ...
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
      const { count: totalAudit } = await apiClient
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });
      const { count: totalWorkflow } = await apiClient
        .from('job_workflow_logs')
        .select('*', { count: 'exact', head: true });
      const total = (totalAudit || 0) + (totalWorkflow || 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: todayAuditCount } = await apiClient
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());
      const { count: todayWorkflowCount } = await apiClient
        .from('job_workflow_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());
      const todayCount = (todayAuditCount || 0) + (todayWorkflowCount || 0);

      // unique performers
      const { data: performersAudit } = await apiClient.from('audit_logs').select('performed_by');
      const { data: performersWorkflow } = await apiClient
        .from('job_workflow_logs')
        .select('performed_by');
      const allPerformers = [
        ...(performersAudit || []).map((r) => r.performed_by),
        ...(performersWorkflow || []).map((r) => r.performed_by),
      ].filter(Boolean);
      const unique = new Set(allPerformers).size;

      setStats({ total, today: todayCount, uniqueUsers: unique });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── fetch user list for dropdown ───────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    const { data } = await apiClient
      .from('users')
      .select('id, full_name, username')
      .order('full_name');
    setUsers(data || []);
  }, []);

  // ── main paginated log fetch ───────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Audit Logs
      let auditRows = [];
      if (!filterActivityType || filterActivityType !== 'job_workflow') {
        let qAudit = apiClient
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (filterUser) qAudit = qAudit.eq('performed_by', filterUser);
        if (filterDateFrom)
          qAudit = qAudit.gte('created_at', new Date(filterDateFrom).toISOString());
        if (filterDateTo) {
          const end = new Date(filterDateTo);
          end.setHours(23, 59, 59, 999);
          qAudit = qAudit.lte('created_at', end.toISOString());
        }
        if (filterActivityType) {
          qAudit = qAudit.eq('entity_type', filterActivityType);
        }

        const { data, error } = await qAudit;
        if (error) {
          console.warn('[AuditLogsManager] Failed to fetch audit_logs:', error.message);
        } else {
          auditRows = data || [];
        }
      }

      // 2. Fetch Workflow Logs
      let workflowRows = [];
      if (!filterActivityType || filterActivityType === 'job_workflow') {
        let qWorkflow = apiClient
          .from('job_workflow_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (filterUser) qWorkflow = qWorkflow.eq('performed_by', filterUser);
        if (filterDateFrom)
          qWorkflow = qWorkflow.gte('created_at', new Date(filterDateFrom).toISOString());
        if (filterDateTo) {
          const end = new Date(filterDateTo);
          end.setHours(23, 59, 59, 999);
          qWorkflow = qWorkflow.lte('created_at', end.toISOString());
        }
        if (filterState) {
          qWorkflow = qWorkflow.or(`from_state.eq.${filterState},to_state.eq.${filterState}`);
        }

        const { data, error } = await qWorkflow;
        if (error) {
          console.warn('[AuditLogsManager] Failed to fetch job_workflow_logs:', error.message);
        } else {
          workflowRows = data || [];
        }
      }

      // Hydrate users and jobs client-side
      const userIds = [
        ...new Set([
          ...auditRows.map((r) => r.performed_by),
          ...workflowRows.map((r) => r.performed_by),
        ].filter(Boolean)),
      ];
      const jobIds = [...new Set(workflowRows.map((r) => r.job_id).filter(Boolean))];

      let userMap = new Map();
      if (userIds.length > 0) {
        const { data: uData } = await apiClient
          .from('users')
          .select('id, full_name, username, role, departments')
          .in('id', userIds);
        if (uData) userMap = new Map(uData.map((u) => [u.id, u]));
      }

      let jobMap = new Map();
      if (jobIds.length > 0) {
        const { data: jData } = await apiClient
          .from('jobs')
          .select('id, job_code, project_name')
          .in('id', jobIds);
        if (jData) jobMap = new Map(jData.map((j) => [j.id, j]));
      }

      auditRows = auditRows.map((r) => ({ ...r, users: userMap.get(r.performed_by) || null }));
      workflowRows = workflowRows.map((r) => ({
        ...r,
        users: userMap.get(r.performed_by) || null,
        jobs: jobMap.get(r.job_id) || null,
      }));

      // 3. Merge Rows
      const merged = [];
      auditRows.forEach((item) => {
        merged.push({
          id: `audit-${item.id}`,
          created_at: item.created_at,
          user: item.users,
          job_code:
            item.entity_type === 'job' || item.entity_type === 'job_test' ? item.entity_name : '',
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          entity_name: item.entity_name,
          action: item.action,
          details: item.details,
          source: 'audit_logs',
        });
      });

      workflowRows.forEach((item) => {
        merged.push({
          id: `workflow-${item.id}`,
          created_at: item.created_at,
          user: item.users,
          job_code: item.jobs?.job_code,
          entity_type: 'job_workflow',
          entity_id: String(item.job_id),
          entity_name: item.jobs?.job_code || `Job #${item.job_id}`,
          action: item.action_id || 'TRANSITION',
          details: { from_state: item.from_state, to_state: item.to_state, remarks: item.remarks },
          source: 'job_workflow_logs',
        });
      });

      // Sort merged array client-side
      merged.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (sortKey === 'created_at') {
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
        } else if (sortKey === 'action_id') {
          valA = (a.action || '').toLowerCase();
          valB = (b.action || '').toLowerCase();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      // Filter client-side by debouncedSearch
      let filtered = merged;
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.toLowerCase();
        filtered = merged.filter((item) => {
          return (
            (item.user?.full_name || '').toLowerCase().includes(term) ||
            (item.user?.username || '').toLowerCase().includes(term) ||
            (item.entity_type || '').toLowerCase().includes(term) ||
            (item.entity_name || '').toLowerCase().includes(term) ||
            (item.action || '').toLowerCase().includes(term) ||
            (item.job_code || '').toLowerCase().includes(term) ||
            JSON.stringify(item.details || {})
              .toLowerCase()
              .includes(term)
          );
        });
      }

      setLogs(filtered);
      setTotalCount(filtered.length);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    sortKey,
    sortDir,
    filterUser,
    filterState,
    filterDateFrom,
    filterDateTo,
    filterActivityType,
    debouncedSearch,
    itemsPerPage,
  ]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [fetchStats, fetchUsers]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-gray-300 ml-1 inline" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-primary ml-1 inline" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary ml-1 inline" />
    );
  };

  const activeFilters = [
    filterUser,
    filterState,
    filterDateFrom,
    filterDateTo,
    filterActivityType,
  ].filter(Boolean).length;

  const applyDatePreset = (preset) => {
    const now = new Date();
    const fd = (d) => d.toISOString().split('T')[0];
    let start = '',
      end = '';
    switch (preset) {
      case 'this_month':
        start = fd(new Date(now.getFullYear(), now.getMonth(), 1));
        end = fd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'last_month':
        start = fd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        end = fd(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'ytd':
        start = fd(new Date(now.getFullYear(), 0, 1));
        end = fd(now);
        break;
      case 'this_year':
        start = fd(new Date(now.getFullYear(), 0, 1));
        end = fd(new Date(now.getFullYear(), 11, 31));
        break;
      case 'last_year':
        start = fd(new Date(now.getFullYear() - 1, 0, 1));
        end = fd(new Date(now.getFullYear() - 1, 11, 31));
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
    setFilterUser('');
    setFilterState('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterActivityType('');
    setDatePreset('custom');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      // 1. Fetch Audit Logs
      let auditRows = [];
      if (!filterActivityType || filterActivityType !== 'job_workflow') {
        let qAudit = apiClient
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (filterUser) qAudit = qAudit.eq('performed_by', filterUser);
        if (filterDateFrom)
          qAudit = qAudit.gte('created_at', new Date(filterDateFrom).toISOString());
        if (filterDateTo) {
          const end = new Date(filterDateTo);
          end.setHours(23, 59, 59, 999);
          qAudit = qAudit.lte('created_at', end.toISOString());
        }
        if (filterActivityType) {
          qAudit = qAudit.eq('entity_type', filterActivityType);
        }

        const { data } = await qAudit;
        auditRows = data || [];
      }

      // 2. Fetch Workflow Logs
      let workflowRows = [];
      if (!filterActivityType || filterActivityType === 'job_workflow') {
        let qWorkflow = apiClient
          .from('job_workflow_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (filterUser) qWorkflow = qWorkflow.eq('performed_by', filterUser);
        if (filterDateFrom)
          qWorkflow = qWorkflow.gte('created_at', new Date(filterDateFrom).toISOString());
        if (filterDateTo) {
          const end = new Date(filterDateTo);
          end.setHours(23, 59, 59, 999);
          qWorkflow = qWorkflow.lte('created_at', end.toISOString());
        }
        if (filterState) {
          qWorkflow = qWorkflow.or(`from_state.eq.${filterState},to_state.eq.${filterState}`);
        }

        const { data } = await qWorkflow;
        workflowRows = data || [];
      }

      const userIds = [
        ...new Set([
          ...auditRows.map((r) => r.performed_by),
          ...workflowRows.map((r) => r.performed_by),
        ].filter(Boolean)),
      ];
      const jobIds = [...new Set(workflowRows.map((r) => r.job_id).filter(Boolean))];

      let userMap = new Map();
      if (userIds.length > 0) {
        const { data: uData } = await apiClient
          .from('users')
          .select('id, full_name, username, role, departments')
          .in('id', userIds);
        if (uData) userMap = new Map(uData.map((u) => [u.id, u]));
      }

      let jobMap = new Map();
      if (jobIds.length > 0) {
        const { data: jData } = await apiClient
          .from('jobs')
          .select('id, job_code, project_name')
          .in('id', jobIds);
        if (jData) jobMap = new Map(jData.map((j) => [j.id, j]));
      }

      auditRows = auditRows.map((r) => ({ ...r, users: userMap.get(r.performed_by) || null }));
      workflowRows = workflowRows.map((r) => ({
        ...r,
        users: userMap.get(r.performed_by) || null,
        jobs: jobMap.get(r.job_id) || null,
      }));

      const merged = [];
      auditRows.forEach((item) => {
        merged.push({
          created_at: item.created_at,
          user: item.users,
          entity_type: item.entity_type,
          entity_name: item.entity_name,
          action: item.action,
          details: item.details,
          source: 'audit_logs',
        });
      });

      workflowRows.forEach((item) => {
        merged.push({
          created_at: item.created_at,
          user: item.users,
          entity_type: 'job_workflow',
          entity_name: item.jobs?.job_code || `Job #${item.job_id}`,
          action: item.action_id || 'TRANSITION',
          details: { from_state: item.from_state, to_state: item.to_state, remarks: item.remarks },
          source: 'job_workflow_logs',
        });
      });

      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      let filtered = merged;
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.toLowerCase();
        filtered = merged.filter((item) => {
          return (
            (item.user?.full_name || '').toLowerCase().includes(term) ||
            (item.user?.username || '').toLowerCase().includes(term) ||
            (item.entity_type || '').toLowerCase().includes(term) ||
            (item.entity_name || '').toLowerCase().includes(term) ||
            (item.action || '').toLowerCase().includes(term) ||
            JSON.stringify(item.details || {})
              .toLowerCase()
              .includes(term)
          );
        });
      }

      const headers = ['Date & Time', 'User', 'Action', 'Target Type', 'Target Name', 'Details'];
      const csvRows = filtered.map((r) => {
        let detailsStr = '';
        if (r.source === 'job_workflow_logs') {
          detailsStr = `${getStateLabel(r.details.from_state)} -> ${getStateLabel(r.details.to_state)}`;
          if (r.details.remarks) detailsStr += ` | Remarks: ${r.details.remarks}`;
        } else {
          detailsStr = r.details ? JSON.stringify(r.details) : '';
        }

        return [
          fmt(r.created_at),
          r.user?.full_name || r.user?.username || 'System',
          r.action || '',
          r.entity_type || '',
          r.entity_name || '',
          `"${detailsStr.replace(/"/g, '""')}"`,
        ];
      });

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

  const renderDetails = (log) => {
    if (log.source === 'job_workflow_logs') {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 self-start px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700/50 flex items-center mb-1">
            {log.details.from_state && log.details.to_state ? (
              <>
                {getStateLabel(log.details.from_state)}
                <ArrowRight className="w-3 h-3 mx-1.5 text-gray-400" />
                {getStateLabel(log.details.to_state)}
              </>
            ) : log.details.to_state ? (
              getStateLabel(log.details.to_state)
            ) : (
              getStateLabel(log.details.from_state)
            )}
          </span>
          {log.details.remarks && (
            <span className="whitespace-pre-wrap leading-relaxed text-gray-600 dark:text-gray-400">
              {log.details.remarks}
            </span>
          )}
        </div>
      );
    }

    const details = log.details;
    if (!details || Object.keys(details).length === 0) {
      return <span className="text-gray-300 dark:text-gray-600">—</span>;
    }

    return (
      <div className="text-[11px] font-mono text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto space-y-1">
        {Object.entries(details).map(([key, val]) => (
          <div key={key} className="truncate">
            <span className="font-bold text-gray-500 dark:text-gray-500">{key}:</span>{' '}
            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
          </div>
        ))}
      </div>
    );
  };

  const paginatedLogs = logs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            System Audit Logs
          </h1>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 ml-1">
            Full activity trail · search · filter · export
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              fetchLogs();
              fetchStats();
            }}
            className="rounded-xl h-9 px-4 font-bold text-primary hover:bg-primary/10 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Stats Strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Log Entries',
            value: statsLoading ? '…' : stats.total.toLocaleString(),
            icon: Activity,
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Activity Today',
            value: statsLoading ? '…' : stats.today.toLocaleString(),
            icon: Clock,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400',
          },
          {
            label: 'Unique Users',
            value: statsLoading ? '…' : stats.uniqueUsers.toLocaleString(),
            icon: User,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-none shadow-sm bg-white dark:bg-gray-950 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {label}
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                  {value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────────────────── */}
      {/* ── Search & Filter Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Search Row */}
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search user, action, target, details…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-full h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters and Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-950 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-4 rounded-xl transition-all border-gray-200 font-bold uppercase tracking-widest text-[10px] ${
                showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-50/50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              <span>Filters</span>
              {activeFilters > 0 && (
                <span className="ml-2 bg-primary text-white rounded-full px-1.5 py-0.5 text-[9px] font-black">
                  {activeFilters}
                </span>
              )}
            </Button>

            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-10 rounded-xl font-bold px-3 text-gray-400 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 text-[10px] uppercase tracking-widest"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting || logs.length === 0}
              className="h-10 px-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all text-[10px] font-bold uppercase tracking-widest leading-none"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              <span>Export CSV</span>
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                Sort
              </span>
              <Select
                value={sortKey}
                onValueChange={(val) => {
                  setSortKey(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40 h-10 text-xs bg-gray-50/50 border-gray-200 rounded-lg">
                  <SelectValue placeholder="Sort key" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date & Time</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="entity_type">Target Type</SelectItem>
                  <SelectItem value="entity_name">Target Name</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-gray-200 bg-gray-50/50 rounded-lg"
                onClick={() => {
                  setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  setPage(1);
                }}
              >
                {sortDir === 'asc' ? (
                  <SortAsc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <SortDesc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            Showing{' '}
            <span className="text-primary">
              {totalCount === 0 ? 0 : (page - 1) * itemsPerPage + 1}–
              {Math.min(page * itemsPerPage, totalCount)}
            </span>{' '}
            of <span className="text-primary">{totalCount}</span> Log Entries
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in slide-in-from-top-2 duration-200 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center">
                <Filter className="w-4 h-4 mr-2 text-primary" />
                Advanced Filters
              </h3>
            </div>

            {/* Row 1: Activity Type · User · Quick Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Activity Type */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Activity Type
                </Label>
                <Select
                  value={filterActivityType || '__all__'}
                  onValueChange={(v) => {
                    setFilterActivityType(v === '__all__' ? '' : v);
                    setFilterState('');
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All Activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Activities</SelectItem>
                    <SelectItem value="job_workflow">Job Workflow Transitions</SelectItem>
                    <SelectItem value="client">Clients</SelectItem>
                    <SelectItem value="expense">Expenses</SelectItem>
                    <SelectItem value="service">Lab Tests</SelectItem>
                    <SelectItem value="client_pricing">Client Pricing (Lab)</SelectItem>
                    <SelectItem value="test">Field Tests</SelectItem>
                    <SelectItem value="client_test_pricing">Client Pricing (Field)</SelectItem>
                    <SelectItem value="sampling">Sampling Settings</SelectItem>
                    <SelectItem value="technical">Technicals Settings</SelectItem>
                    <SelectItem value="terms_and_conditions">Terms & Conditions</SelectItem>
                    <SelectItem value="unit_type">Unit Types</SelectItem>
                    <SelectItem value="hsn_code">HSN/SAC Codes</SelectItem>
                    <SelectItem value="setting">System Settings</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                    <SelectItem value="collection_center">Collection Centers</SelectItem>
                    <SelectItem value="calendar_event">Calendar Events</SelectItem>
                    <SelectItem value="document">Documents/Quotations</SelectItem>
                    <SelectItem value="job">Jobs</SelectItem>
                    <SelectItem value="job_test">Job Test Records</SelectItem>
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
                  onValueChange={(v) => {
                    setFilterUser(v === '__all__' ? '' : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
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
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
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

            {/* Row 2: Workflow State (job_workflow only) · From Date · To Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Workflow State — only shown when Activity Type = job_workflow */}
              {filterActivityType === 'job_workflow' ? (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Workflow State
                  </Label>
                  <Select
                    value={filterState || '__all__'}
                    onValueChange={(v) => {
                      setFilterState(v === '__all__' ? '' : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
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
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setDatePreset('custom');
                    setPage(1);
                  }}
                  className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
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
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setDatePreset('custom');
                    setPage(1);
                  }}
                  className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                  placeholder="To date"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls - Top */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-950 p-2 px-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
            Items
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-20 h-9 text-xs bg-gray-50/50 border-gray-200 rounded-lg">
              <SelectValue className="text-xs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10" className="text-xs">
                10
              </SelectItem>
              <SelectItem value="25" className="text-xs">
                25
              </SelectItem>
              <SelectItem value="50" className="text-xs">
                50
              </SelectItem>
              <SelectItem value="100" className="text-xs">
                100
              </SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none border-l dark:border-gray-800 pl-3 ml-1">
            Showing {totalCount === 0 ? 0 : (page - 1) * itemsPerPage + 1}-
            {Math.min(page * itemsPerPage, totalCount)} of {totalCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-gray-850 dark:text-gray-300 rounded-lg disabled:opacity-50"
          >
            Prev
          </Button>
          <div className="bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
              Page {page} / {totalPages || 1}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-gray-850 dark:text-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="p-5 border-b border-border dark:border-gray-800 bg-muted/40 dark:bg-gray-950/40">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Activity Log
            </CardTitle>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {loading
                ? 'Loading…'
                : `${totalCount.toLocaleString()} entries · page ${page} of ${totalPages}`}
            </span>
          </div>
        </CardHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-gray-950">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-800" />
            <p className="text-sm font-bold text-gray-400 dark:text-gray-500">
              No matching activity found.
            </p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-950">
            <table className="w-full text-sm min-w-[1000px] table-fixed">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  {[
                    { label: 'Date & Time', col: 'created_at' },
                    { label: 'User', col: null },
                    { label: 'Action', col: 'action_id' },
                    { label: 'Target (Type · Name)', col: null },
                    { label: 'Details / Remarks', col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      onClick={col ? () => toggleSort(col) : undefined}
                      className={`py-3 px-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap ${col ? 'cursor-pointer hover:text-primary select-none' : ''}`}
                    >
                      {label}
                      {col && <SortIcon col={col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {paginatedLogs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    className="hover:bg-muted/45 dark:hover:bg-gray-900/40 transition-colors group"
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {fmtDateOnly(log.created_at)}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                          {new Date(log.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="py-3.5 px-4 align-middle">
                      {log.user ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help select-none">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <User className="w-3 h-3 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 truncate">
                                  {log.user.full_name || log.user.username}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800 p-3 rounded-lg shadow-md space-y-1 text-xs">
                              <div>
                                <span className="text-gray-400 font-medium">Role:</span>{' '}
                                <span className="font-bold text-white capitalize">
                                  {Object.values(ROLES).find((r) => r.slug === log.user.role)?.label || log.user.role || 'User'}
                                </span>
                              </div>
                              {(log.user.departments || []).length > 0 && (
                                <div>
                                  <span className="text-gray-400 font-medium">Department:</span>{' '}
                                  <span className="font-bold text-white">
                                    {(log.user.departments || [])
                                      .map((dVal) => {
                                        const found = DEPARTMENTS.find((d) => String(d.id) === String(dVal) || d.name === dVal);
                                        return found ? found.name : dVal;
                                      })
                                      .filter(Boolean)
                                      .join(', ')}
                                  </span>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 truncate">
                            System
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 align-middle">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.action === 'CREATE'
                            ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                            : log.action === 'UPDATE'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400'
                              : log.action === 'DELETE'
                                ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {(log.action || '').replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 self-start px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700/50 uppercase tracking-wider">
                          {(log.entity_type || '').replace(/_/g, ' ')}
                        </span>
                        <span
                          className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-xs"
                          title={log.entity_name}
                        >
                          {log.entity_name || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 align-middle">{renderDetails(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogsManager;
