import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle, X, Filter, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';
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
  const applyFilters = useCallback(
    (q) => {
      if (filters.type === 'debit') {
        q = q.gt('debit_amt', 0);
        q = q.or('credit_amt.is.null,credit_amt.eq.0');
      }
      if (filters.type === 'credit') {
        q = q.gt('credit_amt', 0);
        q = q.or('debit_amt.is.null,debit_amt.eq.0');
      }
      if (filters.source) q = q.eq('source', filters.source);
      if (filters.dateFrom) q = q.gte('date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('date', filters.dateTo);

      if (filters.amountOp !== 'none' && filters.amountVal !== '') {
        const n = toNum(filters.amountVal);
        if (n != null) {
          const col = filters.amountField;
          if (filters.amountOp === 'gt') q = q.gt(col, n);
          if (filters.amountOp === 'lt') q = q.lt(col, n);
          if (filters.amountOp === 'eq') q = q.eq(col, n);
        }
      }

      if (debouncedSearch) {
        q = q.or(
          `transaction_id.ilike.%${debouncedSearch}%,` +
            `ref_num.ilike.%${debouncedSearch}%,` +
            `particulars.ilike.%${debouncedSearch}%,` +
            `source.ilike.%${debouncedSearch}%,` +
            `sheet_number.ilike.%${debouncedSearch}%`
        );
      }
      return q;
    },
    [filters, debouncedSearch]
  );

  // ── Fetch current page ────────────────────────────────────────────────────
  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Determine sort column and direction
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

      let q = supabase
        .from(TABLE)
        .select('*', { count: 'exact' })
        .order(sortCol, { ascending: sortAscending, nullsFirst: false })
        .order('id', { ascending: false }) // secondary stable sort
        .range(from, to);
      q = applyFilters(q);

      const { data, error, count } = await q;
      if (error) throw error;
      if (data?.length > 0)
        console.log('[BankStatements] actual DB columns:', Object.keys(data[0]));
      if (data?.length > 0) console.log('[BankStatements] first row raw:', JSON.stringify(data[0]));
      setRows(data || []);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error('fetchPage error:', err);
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, applyFilters, toast, sortKey]);

  // ── Fetch sources for filter dropdown ────────────────────────────────────
  const fetchSummaries = useCallback(async () => {
    try {
      const sourcesRes = await supabase.from('bank_statement_sources').select('source');
      const uniq = [
        ...new Set((sourcesRes.data || []).map((r) => r.source).filter(Boolean)),
      ].sort();
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
        const { error } = await supabase.from(TABLE).insert(payload);
        if (error) throw error;
        toast({ title: 'Transaction Added' });
      } else {
        const { error } = await supabase.from(TABLE).update(payload).eq('id', editingRow.id);
        if (error) throw error;
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
      const { error } = await supabase.from(TABLE).delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Transaction Deleted', variant: 'destructive' });
      refresh();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
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

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm font-medium text-muted-foreground animate-pulse">
              Loading transactions…
            </span>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {[
                  { label: 'Date', cls: 'w-[100px]' },
                  { label: 'Transaction ID', cls: 'w-[130px]' },
                  { label: 'Ref / Cheque / Instr Num', cls: 'w-[140px]' },
                  { label: 'Particulars', cls: 'w-[220px]' },
                  { label: 'Debit (₹)', cls: 'w-[120px] text-right' },
                  { label: 'Credit (₹)', cls: 'w-[120px] text-right' },
                  { label: 'Balance (₹)', cls: 'w-[130px] text-right' },
                  { label: 'Source', cls: 'w-[160px]' },
                  { label: 'Sheet', cls: 'w-[80px]' },
                  { label: 'Actions', cls: 'w-[90px] text-center' },
                ].map(({ label, cls }) => (
                  <th
                    key={label}
                    className={`py-4 px-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap ${cls}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-4 text-xs font-medium text-foreground whitespace-nowrap">
                      {txt(row.date)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 text-xs">
                        {txt(row.transaction_id)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-muted-foreground">{txt(row.ref_num)}</td>
                    <td className="py-4 px-4 text-xs text-foreground w-[220px] max-w-[220px]">
                      <span className="block break-words whitespace-normal" title={row.particulars}>
                        {txt(row.particulars)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-right whitespace-nowrap w-[120px]">
                      {row.debit_amt != null &&
                      row.debit_amt !== '' &&
                      !isNaN(Number(row.debit_amt)) ? (
                        <span className="text-destructive">{fmt(row.debit_amt)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-right whitespace-nowrap w-[120px]">
                      {row.credit_amt != null &&
                      row.credit_amt !== '' &&
                      !isNaN(Number(row.credit_amt)) ? (
                        <span className="text-green-600 dark:text-green-400">
                          {fmt(row.credit_amt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-right whitespace-nowrap text-primary w-[130px]">
                      {row.balance_amt != null && !isNaN(Number(row.balance_amt))
                        ? fmt(row.balance_amt)
                        : '—'}
                    </td>
                    <td className="py-4 px-4 text-xs text-muted-foreground">{txt(row.source)}</td>
                    <td className="py-4 px-4 text-xs text-muted-foreground">
                      {txt(row.sheet_number)}
                    </td>
                    <td className="py-4 px-4 text-center">
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
                          <TooltipContent>
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
                          <TooltipContent>
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
                      <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
