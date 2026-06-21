import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Search,
  AlertCircle,
  X,
  Filter,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/data/config';

// ── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;
const TABLE = 'bank_statements';

const EMPTY_ROW = {
  date: '',
  transaction_id: '',
  ref_num: '',
  particulars: '',
  debit_amt: '',
  credit_amt: '',
  balance_amt: '',
  source: '',
  sheet_number: '',
};

const AMOUNT_OPS = [
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'eq', label: 'Equal to' },
];

const AMOUNT_FIELDS = [
  { value: 'debit_amt', label: 'Debit Amount' },
  { value: 'credit_amt', label: 'Credit Amount' },
  { value: 'balance_amt', label: 'Balance Amount' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (val) => {
  if (val == null || val === '' || val === 'NaN') return '—';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
};

// Sanitize text fields — treat null, empty string, or literal "NaN" as blank
const txt = (val) => {
  if (val == null || val === '' || String(val) === 'NaN') return '—';
  return String(val);
};

const toNum = (v) => {
  if (v === '' || v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
};

// ── Active filter count ───────────────────────────────────────────────────

const countActive = (f) =>
  [
    f.type !== 'all',
    !!f.source,
    !!f.dateFrom,
    !!f.dateTo,
    f.amountOp !== 'none' && f.amountVal !== '',
  ].filter(Boolean).length;

// ── Main Component ────────────────────────────────────────────────────────

const AdminBankStatementsManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const canAccess = user?.role === ROLES.ADMIN.slug || user?.role === ROLES.SUPER_ADMIN.slug;

  if (!canAccess) {
    return (
      <div className="p-8 border border-dashed rounded-xl bg-muted text-center italic text-sm text-gray-400">
        You do not have permission to access this section.
      </div>
    );
  }

  // ── UI state ──────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, label }
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  const [sortKey, setSortKey] = useState('date_desc');

  const [filters, setFilters] = useState({
    type: 'all',
    source: '',
    dateFrom: '',
    dateTo: '',
    amountField: 'debit_amt',
    amountOp: 'none',
    amountVal: '',
  });

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const activeFilters = countActive(filters);

  const resetFilters = () => {
    setFilters({
      type: 'all',
      source: '',
      dateFrom: '',
      dateTo: '',
      amountField: 'debit_amt',
      amountOp: 'none',
      amountVal: '',
    });
    setSearchTerm('');
    setSortKey('date_desc');
  };

  // Debounce search to avoid hammering DB on every keystroke
  const searchRef = useRef(searchTerm);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    searchRef.current = searchTerm;
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Build query with active filters ──────────────────────────────────────
  const applyFiltersLocal = useCallback(
    (data) => {
      let result = data;
      if (filters.type === 'debit') {
        result = result.filter(
          (r) => r.debit_amt > 0 || r.credit_amt == null || r.credit_amt === 0
        );
      }
      if (filters.type === 'credit') {
        result = result.filter((r) => r.credit_amt > 0 || r.debit_amt == null || r.debit_amt === 0);
      }
      if (filters.source) {
        result = result.filter((r) => r.source === filters.source);
      }
      if (filters.dateFrom) {
        result = result.filter((r) => r.date >= filters.dateFrom);
      }
      if (filters.dateTo) {
        result = result.filter((r) => r.date <= filters.dateTo);
      }

      if (filters.amountOp !== 'none' && filters.amountVal !== '') {
        const n = toNum(filters.amountVal);
        if (n != null) {
          const col = filters.amountField;
          if (filters.amountOp === 'gt') result = result.filter((r) => r[col] > n);
          if (filters.amountOp === 'lt') result = result.filter((r) => r[col] < n);
          if (filters.amountOp === 'eq') result = result.filter((r) => r[col] === n);
        }
      }

      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        result = result.filter(
          (r) =>
            (r.transaction_id && r.transaction_id.toLowerCase().includes(s)) ||
            (r.ref_num && r.ref_num.toLowerCase().includes(s)) ||
            (r.particulars && r.particulars.toLowerCase().includes(s)) ||
            (r.source && r.source.toLowerCase().includes(s)) ||
            (r.sheet_number && r.sheet_number.toLowerCase().includes(s))
        );
      }
      return result;
    },
    [filters, debouncedSearch]
  );

  // ── Fetch current page ────────────────────────────────────────────────────
  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all to do in-memory filtering since API lacks complex operators
      const dataRaw = await apiClient.get('/api/bank_statements', {
        params: { limit: 100000 },
      });

      let filteredData = applyFiltersLocal(dataRaw || []);

      let sortCol = 'date';
      let sortAscending = false;

      if (sortKey) {
        const parts = sortKey.split('_');
        if (parts.length >= 2) {
          const dir = parts[parts.length - 1];
          sortCol = parts.slice(0, -1).join('_');
          sortAscending = dir === 'asc';
        }
      }

      filteredData.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];

        if (valA === null) valA = '';
        if (valB === null) valB = '';

        if (valA < valB) return sortAscending ? -1 : 1;
        if (valA > valB) return sortAscending ? 1 : -1;

        return b.id - a.id;
      });

      setTotalCount(filteredData.length);

      let d = 0,
        c = 0;
      filteredData.forEach((r) => {
        d += Number(r.debit_amt) || 0;
        c += Number(r.credit_amt) || 0;
      });
      setTotals({ debit: d, credit: c });

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      setRows(filteredData.slice(from, to));
    } catch (err) {
      console.error('fetchPage error:', err);
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, applyFiltersLocal, toast, sortKey]);

  // ── Fetch sources for filter dropdown ────────────────────────────────────
  const fetchSummaries = useCallback(async () => {
    try {
      const dataRaw = await apiClient.get('/api/bank_statements', { params: { limit: 100000 } });
      const uniq = [...new Set((dataRaw || []).map((r) => r.source).filter(Boolean))].sort();
      setSources(uniq);
    } catch (err) {
      console.error('fetchSources error:', err);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  // Reset to page 1 whenever filters, sort or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearch, itemsPerPage, sortKey]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);
  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const refresh = () => {
    fetchPage();
    fetchSummaries();
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editingRow.date) {
      toast({
        title: 'Validation Error',
        description: 'Date is required.',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        date: editingRow.date || null,
        transaction_id: editingRow.transaction_id?.trim() || null,
        ref_num: editingRow.ref_num?.trim() || null,
        particulars: editingRow.particulars?.trim() || null,
        debit_amt: toNum(editingRow.debit_amt),
        credit_amt: toNum(editingRow.credit_amt),
        balance_amt: toNum(editingRow.balance_amt),
        source: editingRow.source?.trim() || null,
        sheet_number: editingRow.sheet_number?.trim() || null,
      };

      if (isAddingNew) {
        await apiClient.post('/api/bank_statements', payload);
        toast({ title: 'Transaction Added' });
      } else {
        await apiClient.put(`/api/bank_statements/${editingRow.id}`, payload);
        toast({ title: 'Transaction Updated' });
      }

      setEditingRow(null);
      setIsAddingNew(false);
      refresh();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/api/bank_statements/${deleteTarget.id}`);
      toast({ title: 'Transaction Deleted', variant: 'destructive' });
      refresh();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const downloadCSV = async () => {
    setIsDownloading(true);
    try {
      const dataRaw = await apiClient.get('/api/bank_statements', {
        params: { limit: 100000 },
      });
      let allData = applyFiltersLocal(dataRaw || []);

      if (allData.length === 0) {
        toast({ title: 'No data to download' });
        return;
      }

      const headers = [
        'Date',
        'Transaction ID',
        'Ref Num',
        'Particulars',
        'Debit Amount',
        'Credit Amount',
        'Balance',
        'Source',
        'Sheet Number',
      ];
      const csvRows = allData.map((r) =>
        [
          r.date || '',
          r.transaction_id || '',
          r.ref_num || '',
          `"${(r.particulars || '').replace(/"/g, '""')}"`,
          r.debit_amt || '',
          r.credit_amt || '',
          r.balance_amt || '',
          `"${(r.source || '').replace(/"/g, '""')}"`,
          r.sheet_number || '',
        ].join(',')
      );

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statements_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast({ title: 'Error downloading CSV', description: err.message, variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleChange = (field, value) => setEditingRow((p) => ({ ...p, [field]: value }));

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ── Edit / Add Form ───────────────────────────────────────────────────────
  if (editingRow) {
    return (
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm animate-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {isAddingNew ? 'Add Bank Transaction' : 'Edit Bank Transaction'}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingRow(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={editingRow.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Transaction ID</Label>
            <Input
              value={editingRow.transaction_id || ''}
              onChange={(e) => handleChange('transaction_id', e.target.value)}
              placeholder="e.g. XS1003720"
            />
          </div>
          <div className="space-y-2">
            <Label>Ref / Cheque / Instr Num</Label>
            <Input
              value={editingRow.ref_num || ''}
              onChange={(e) => handleChange('ref_num', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Particulars</Label>
            <Input
              value={editingRow.particulars || ''}
              onChange={(e) => handleChange('particulars', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Debit Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editingRow.debit_amt ?? ''}
              onChange={(e) => handleChange('debit_amt', e.target.value)}
              placeholder="Leave blank if credit"
            />
          </div>
          <div className="space-y-2">
            <Label>Credit Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editingRow.credit_amt ?? ''}
              onChange={(e) => handleChange('credit_amt', e.target.value)}
              placeholder="Leave blank if debit"
            />
          </div>
          <div className="space-y-2">
            <Label>Balance Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editingRow.balance_amt ?? ''}
              onChange={(e) => handleChange('balance_amt', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Input
              value={editingRow.source || ''}
              onChange={(e) => handleChange('source', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sheet Number</Label>
            <Input
              value={editingRow.sheet_number || ''}
              onChange={(e) => handleChange('sheet_number', e.target.value)}
              placeholder="e.g. Table 1"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Search + Add */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search transactions…"
              className="pl-10 h-10 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchTerm('')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={refresh}
                variant="outline"
                className="h-10 w-10 px-0 rounded-xl shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Refresh</p>
            </TooltipContent>
          </Tooltip>
          <Button
            onClick={() => {
              setEditingRow({ ...EMPTY_ROW });
              setIsAddingNew(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-6 rounded-xl shrink-0 font-semibold text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Transaction
          </Button>
        </div>

        {/* Filters toggle + Sort by */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters((v) => !v)}
              className={`h-10 px-4 rounded-xl ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              <span className="text-sm font-bold uppercase tracking-widest leading-none">
                Filters
              </span>
              {activeFilters > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </Button>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-3 text-xs text-muted-foreground hover:text-destructive font-bold uppercase tracking-widest"
              >
                <X className="w-3 h-3 mr-1" /> Clear all
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Sort by
            </span>
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger className="w-48 h-10 rounded-xl bg-card border border-border shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date (Newest)</SelectItem>
                <SelectItem value="date_asc">Date (Oldest)</SelectItem>
                <SelectItem value="debit_amt_desc">Debit (Highest)</SelectItem>
                <SelectItem value="debit_amt_asc">Debit (Lowest)</SelectItem>
                <SelectItem value="credit_amt_desc">Credit (Highest)</SelectItem>
                <SelectItem value="credit_amt_asc">Credit (Lowest)</SelectItem>
                <SelectItem value="balance_amt_desc">Balance (Highest)</SelectItem>
                <SelectItem value="balance_amt_asc">Balance (Lowest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm animate-in slide-in-from-top-2 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Advanced Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-destructive font-bold uppercase tracking-widest"
              >
                <X className="w-3 h-3 mr-1" /> Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Type
                </Label>
                <Select value={filters.type} onValueChange={(v) => setFilter('type', v)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="debit">Debits Only</SelectItem>
                    <SelectItem value="credit">Credits Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Source
                </Label>
                <Select
                  value={filters.source || '__all__'}
                  onValueChange={(v) => setFilter('source', v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Sources</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Date From
                </Label>
                <Input
                  type="date"
                  className="h-10 rounded-xl"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Date To
                </Label>
                <Input
                  type="date"
                  className="h-10 rounded-xl"
                  value={filters.dateTo}
                  onChange={(e) => setFilter('dateTo', e.target.value)}
                />
              </div>
            </div>

            {/* Amount filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Amount Field
                </Label>
                <Select
                  value={filters.amountField}
                  onValueChange={(v) => setFilter('amountField', v)}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AMOUNT_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Condition
                </Label>
                <Select value={filters.amountOp} onValueChange={(v) => setFilter('amountOp', v)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No condition</SelectItem>
                    {AMOUNT_OPS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Amount (₹)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-10 rounded-xl"
                  placeholder="e.g. 50000"
                  value={filters.amountVal}
                  disabled={filters.amountOp === 'none'}
                  onChange={(e) => setFilter('amountVal', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-2 px-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Items
          </span>
          <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-20 h-9 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100, 250, 500, 1000].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-l pl-3 ml-1">
            {totalCount === 0
              ? '0 results'
              : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-50"
          >
            Prev
          </Button>
          <div className="bg-muted px-3 py-1.5 rounded-lg border border-border">
            <span className="text-[10px] font-black text-primary">
              Page {currentPage} / {totalPages || 1}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Summary and CSV Download */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Total Debit
            </span>
            <span className="text-xl font-black text-destructive">{fmt(totals.debit)}</span>
          </div>
          <div className="flex flex-col border-l border-border pl-6">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Total Credit
            </span>
            <span className="text-xl font-black text-green-600 dark:text-green-400">
              {fmt(totals.credit)}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={downloadCSV}
          disabled={isDownloading || rows.length === 0}
          className="h-10 px-4 rounded-xl font-semibold text-xs border-primary/20 hover:bg-primary/5 text-primary"
        >
          {isDownloading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download CSV
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm font-medium text-gray-500 animate-pulse">
              Loading transactions…
            </span>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[1190px] table-fixed">
            {/* colgroup locks each column width regardless of header/cell content */}
            <colgroup>
              <col style={{ width: '100px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '90px' }} />
            </colgroup>
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-left">
                  Date
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-left">
                  Transaction ID
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-left">
                  Ref / Cheque No.
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-left">
                  Particulars
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-right">
                  Debit (₹)
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-right">
                  Credit (₹)
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-right">
                  Balance (₹)
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-left">
                  Source
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-left">
                  Sheet
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4 text-xs font-medium text-gray-600 align-middle whitespace-nowrap">
                      {txt(row.date)}
                    </td>
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <span className="font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 text-xs">
                        {txt(row.transaction_id)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-400 align-middle whitespace-nowrap">
                      {txt(row.ref_num)}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600 align-middle">
                      <span className="block break-words whitespace-normal" title={row.particulars}>
                        {txt(row.particulars)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-right align-middle whitespace-nowrap">
                      {row.debit_amt != null &&
                      row.debit_amt !== '' &&
                      !isNaN(Number(row.debit_amt)) ? (
                        <span className="text-destructive">{fmt(row.debit_amt)}</span>
                      ) : (
                        <span className="text-gray-300 font-normal not-italic">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-right align-middle whitespace-nowrap">
                      {row.credit_amt != null &&
                      row.credit_amt !== '' &&
                      !isNaN(Number(row.credit_amt)) ? (
                        <span className="text-green-600 dark:text-green-400">
                          {fmt(row.credit_amt)}
                        </span>
                      ) : (
                        <span className="text-gray-300 font-normal not-italic">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-right align-middle whitespace-nowrap text-primary">
                      {row.balance_amt != null && !isNaN(Number(row.balance_amt))
                        ? fmt(row.balance_amt)
                        : '—'}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600 align-middle whitespace-nowrap">
                      {txt(row.source)}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600 align-middle whitespace-nowrap">
                      {txt(row.sheet_number)}
                    </td>
                    <td className="py-4 px-4 text-center align-middle">
                      <div className="flex justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRow({ ...row });
                                setIsAddingNew(false);
                              }}
                              className="h-8 px-3 rounded-lg hover:bg-primary hover:text-primary-foreground"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Edit</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteTarget({
                                  id: row.id,
                                  label: `${row.transaction_id || row.date} — ${row.particulars || ''}`,
                                })
                              }
                              className="h-8 px-3 rounded-lg hover:bg-destructive hover:text-destructive-foreground text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Delete</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-gray-300" />
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {searchTerm || activeFilters > 0
                          ? 'No matching transactions'
                          : 'No transactions yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-destructive">
              <AlertCircle className="w-5 h-5 mr-2" /> Delete Transaction?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete <span className="font-semibold text-foreground">{deleteTarget?.label}</span>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Yes, Delete It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBankStatementsManager;
