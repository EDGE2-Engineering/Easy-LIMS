import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Plus,
  Trash2,
  Search,
  Filter,
  X,
  Loader2,
  Eye,
  Printer,
  Banknote,
  CheckCircle2,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { safeFormatDate } from '@/lib/utils';
import { getSiteContent } from '@/data/config';

const MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const COMPANY_INFO = {
  name: 'EDGE2 Engineering Solutions India Pvt. Ltd.',
  addressLine1: 'Shivaganga Arcade, B35/130, 6th Cross, 6th Block,',
  addressLine2: 'Vishweshwaraiah Layout, Ullal Upanagar, Bangalore - 560056, Karnataka',
  phone: '09448377127 / 09880973810 / 080-50056086',
  email: 'info@edge2.in',
  website: 'https://edge2.in',
  gstin: '29AACCE1702A1ZD',
  pan: 'AACCE1702A',
};

const PaySlipsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const siteContent = getSiteContent();
  const siteName = siteContent.global?.siteName || COMPANY_INFO.name;

  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [usersList, setUsersList] = useState([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    status: 'Paid',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // View / Print Modal State
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: viewingPayslip
      ? `Payslip_${(viewingPayslip.employee_name || 'Employee').replace(/\s+/g, '_')}_${viewingPayslip.month}_${viewingPayslip.year}`
      : 'Payslip',
  });

  // Delete State
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    id: null,
    employeeName: '',
    period: '',
  });

  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await apiClient
          .from('users')
          .select('id, full_name, username, role, employee_id, base_salary, departments');
        if (data) {
          const sorted = [...data].sort((a, b) =>
            (a.full_name || a.username || '').localeCompare(b.full_name || b.username || '')
          );
          setUsersList(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch payslips
  const fetchPayslips = async () => {
    setLoading(true);
    try {
      let query = apiClient.from('employee_payslips').select('*');

      if (filterUser && filterUser !== 'all') {
        query = query.eq('user_id', parseInt(filterUser));
      }
      if (filterMonth && filterMonth !== 'all') {
        query = query.eq('month', parseInt(filterMonth));
      }
      if (filterYear && filterYear !== 'all') {
        query = query.eq('year', parseInt(filterYear));
      }
      if (searchTerm.trim()) {
        query = query.ilike('employee_name', `%${searchTerm.trim()}%`);
      }

      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data, count, error } = await query;
      if (error) throw error;
      setPayslips(data || []);
      setTotalCount(count ?? (data ? data.length : 0));
    } catch (err) {
      console.error('Failed to fetch payslips:', err);
      toast({
        title: 'Error',
        description: 'Failed to load employee payslips.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [filterMonth, filterYear, filterUser, searchTerm, sortField, sortOrder]);

  // Handle employee selection in creation form (auto-fill amount if base_salary exists)
  const handleEmployeeSelect = (selectedUserId) => {
    const selectedUser = usersList.find((u) => String(u.id) === String(selectedUserId));
    setFormData((prev) => ({
      ...prev,
      userId: selectedUserId,
      amount: selectedUser?.base_salary ? String(selectedUser.base_salary) : prev.amount,
    }));
  };

  // Handle Create Payslip Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userId) {
      toast({ title: 'Validation Error', description: 'Please select an employee.', variant: 'destructive' });
      return;
    }
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid amount.', variant: 'destructive' });
      return;
    }

    const selectedUser = usersList.find((u) => String(u.id) === String(formData.userId));
    const empName = selectedUser?.full_name || selectedUser?.username || 'Employee';

    setIsSubmitting(true);
    try {
      const payload = {
        user_id: parseInt(formData.userId),
        employee_name: empName,
        amount: parseFloat(formData.amount),
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        status: formData.status || 'Paid',
        payment_date: formData.paymentDate || null,
        notes: formData.notes.trim() || null,
        created_by: user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : null,
      };

      const { error } = await apiClient.from('employee_payslips').insert(payload);
      if (error) throw error;

      toast({
        title: 'Pay Slip Created',
        description: `Successfully generated pay slip for ${empName} (${MONTHS.find((m) => m.value === parseInt(formData.month))?.label} ${formData.year}).`,
      });

      setIsCreateOpen(false);
      setFormData({
        userId: '',
        amount: '',
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
        status: 'Paid',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchPayslips();
    } catch (err) {
      console.error('Failed to create payslip:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create pay slip.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Payslip
  const confirmDelete = async () => {
    if (!deleteConfirmation.id) return;
    try {
      const { error } = await apiClient
        .from('employee_payslips')
        .delete()
        .eq('id', deleteConfirmation.id);
      if (error) throw error;

      toast({ title: 'Pay Slip Deleted', description: 'Pay slip has been removed.' });
      setDeleteConfirmation({ isOpen: false, id: null, employeeName: '', period: '' });
      fetchPayslips();
    } catch (err) {
      console.error('Failed to delete payslip:', err);
      toast({ title: 'Error', description: 'Failed to delete pay slip.', variant: 'destructive' });
    }
  };

  // Filtered & Paginated records
  const totalAmount = useMemo(() => {
    return payslips.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [payslips]);

  const totalPages = Math.max(1, Math.ceil(payslips.length / itemsPerPage));
  const paginatedPayslips = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return payslips.slice(start, start + itemsPerPage);
  }, [payslips, currentPage, itemsPerPage]);

  const getMonthLabel = (mVal) => {
    return MONTHS.find((m) => m.value === parseInt(mVal))?.label || `Month ${mVal}`;
  };

  // Helper to split salary into standard earnings breakdown matching gross amount
  const getSalaryBreakdown = (amount) => {
    const total = parseFloat(amount || 0);
    const basicPay = Math.round(total * 0.5);
    const hra = Math.round(total * 0.3);
    const specialAllowance = Math.max(0, total - basicPay - hra);
    return {
      basicPay,
      hra,
      specialAllowance,
      grossPay: total,
      pf: 0,
      pt: 0,
      tds: 0,
      totalDeductions: 0,
      netPay: total,
    };
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <Banknote className="w-6 h-6 text-primary" />
            </div>
            Pay Slips Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Track and generate employee salary pay slips
          </p>
        </div>
      </div>

      {/* Action / Search Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by employee name or remarks..."
              className="pl-10 w-full h-10 text-sm bg-gray-50/50 dark:bg-card border-gray-200 dark:border-border rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0 gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Pay Slip
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                <p className="text-xs">Generate a new employee pay slip</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Filters & Sorting Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-4 rounded-xl transition-all border-gray-200 dark:border-border ${
                showFilters
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-gray-50/50 dark:bg-card'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              <span className="text-sm font-bold uppercase tracking-widest leading-none">
                Filters
              </span>
              {(filterMonth !== 'all' || filterYear !== 'all' || filterUser !== 'all') && (
                <Badge className="ml-2 bg-primary text-white scale-75">!</Badge>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
                Sort
              </span>
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-40 h-10 text-sm bg-gray-50/50 dark:bg-card border-gray-200 dark:border-border rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="employee_name">Employee Name</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="h-10 w-10 border-gray-200 dark:border-border bg-gray-50/50 dark:bg-card rounded-lg"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-6 text-sm">
            <span className="font-bold text-gray-500 uppercase tracking-wider text-xs">
              Showing{' '}
              <span className="text-primary font-bold">
                {payslips.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, payslips.length)}
              </span>{' '}
              of {payslips.length} Pay Slips
            </span>
            <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-xl font-bold tracking-tight text-sm">
              Total Sum:{' '}
              <span className="tabular-nums">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Dropdowns Panel */}
        {showFilters && (
          <div className="p-4 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                Month
              </Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                Year
              </Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                Employee
              </Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {usersList.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.full_name || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterMonth('all');
                  setFilterYear('all');
                  setFilterUser('all');
                  setSearchTerm('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reset Filters
              </Button>
            </div>
          </div>
        )}

        {/* Pagination bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-2">
            <span>Items:</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(val) => {
                setItemsPerPage(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs"
            >
              PREV
            </Button>
            <span className="font-semibold px-2">
              PAGE {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-3 text-xs"
            >
              NEXT
            </Button>
          </div>
        </div>
      </div>

      {/* Pay Slips Table */}
      <div className="border border-gray-200 dark:border-border bg-white dark:bg-card rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50/75 dark:bg-muted/50 border-b border-gray-200 dark:border-border">
              <tr>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Employee
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Period
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-right">
                  Amount
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-center">
                  Status
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Created On
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Remarks
                </th>
                <th className="py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                      <p className="text-gray-500 font-medium text-sm">Loading pay slips...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedPayslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="p-3 bg-muted rounded-full mb-3 text-muted-foreground">
                        <Banknote className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">No Pay Slips Found</h3>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        No pay slips match your current filters. Click below to create a new pay slip.
                      </p>
                      <Button
                        onClick={() => setIsCreateOpen(true)}
                        size="sm"
                        className="rounded-xl gap-2 font-semibold"
                      >
                        <Plus className="w-4 h-4" /> Create Pay Slip
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPayslips.map((slip) => {
                  const empObj = slip.users || usersList.find((u) => u.id === slip.user_id);
                  const displayName =
                    slip.employee_name || empObj?.full_name || empObj?.username || 'Employee';
                  const periodText = `${getMonthLabel(slip.month)} ${slip.year}`;

                  return (
                    <tr
                      key={slip.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center uppercase shrink-0">
                            {displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {displayName}
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                              {empObj?.employee_id && (
                                <span className="font-mono">ID: {empObj.employee_id}</span>
                              )}
                              {empObj?.role && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                  {empObj.role}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {periodText}
                        </div>
                        {slip.payment_date && (
                          <div className="text-[11px] text-gray-400">
                            Paid on: {safeFormatDate(slip.payment_date)}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                          ₹{parseFloat(slip.amount || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            slip.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {slip.status || 'Generated'}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-middle whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">
                        {safeFormatDate(slip.created_at)}
                      </td>

                      <td className="py-4 px-4 align-middle max-w-xs truncate text-xs text-gray-500">
                        {slip.notes || '-'}
                      </td>

                      <td className="py-4 px-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                  onClick={() => setViewingPayslip(slip)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View / Print Pay Slip</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() =>
                                    setDeleteConfirmation({
                                      isOpen: true,
                                      id: slip.id,
                                      employeeName: displayName,
                                      period: periodText,
                                    })
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Pay Slip</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Pay Slip Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Banknote className="w-5 h-5 text-primary" />
                Generate Employee Pay Slip
              </DialogTitle>
              <DialogDescription>
                Create and record a salary pay slip entry in the system.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Employee Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Select Employee <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.userId} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose employee..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="font-medium">{u.full_name || u.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {u.role}
                            {u.base_salary ? ` (₹${u.base_salary})` : ''}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Salary Amount (₹) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    ₹
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="pl-8 rounded-xl font-mono text-base font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Month and Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Month <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.month}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, month: val }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Year <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.year}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, year: val }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status & Payment Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Generated">Generated</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Payment Date
                  </Label>
                  <AppDatePicker
                    value={formData.paymentDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Remarks / Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Remarks / Notes
                </Label>
                <Textarea
                  placeholder="Optional bonus, deductions, or payment mode notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl resize-none text-xs"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary hover:bg-primary-dark font-semibold gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Save Pay Slip
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View & Print Pay Slip Modal (Styled Exactly As Provided Template) */}
      {viewingPayslip && (() => {
        const empObj = viewingPayslip.users || usersList.find((u) => u.id === viewingPayslip.user_id);
        const displayName = viewingPayslip.employee_name || empObj?.full_name || empObj?.username || 'Employee';
        const breakdown = getSalaryBreakdown(viewingPayslip.amount);
        const payPeriodStr = `${getMonthLabel(viewingPayslip.month)} ${viewingPayslip.year}`;
        const payDateStr = safeFormatDate(viewingPayslip.payment_date || viewingPayslip.created_at);
        const payrollNum = `PS-${String(viewingPayslip.id).padStart(6, '0')}`;
        const employeeIdStr = empObj?.employee_id || `EMP-${viewingPayslip.user_id}`;

        return (
          <Dialog open={!!viewingPayslip} onOpenChange={() => setViewingPayslip(null)}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 bg-gray-100 dark:bg-card">
              {/* Top Modal Action Bar */}
              <div className="sticky top-0 z-10 bg-white/95 dark:bg-card/95 backdrop-blur-sm border-b border-gray-200 dark:border-border px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    Pay Slip Preview — {displayName} ({payPeriodStr})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePrint()}
                    className="rounded-xl gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-xs h-9 px-4 shadow-sm"
                  >
                    <Printer className="w-4 h-4" /> Print / Save PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingPayslip(null)}
                    className="rounded-xl h-9"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Printable Area - Designed Exactly as Uploaded Template */}
              <div className="p-4 sm:p-8 flex justify-center bg-gray-100 dark:bg-muted/30">
                <div
                  ref={printRef}
                  id="printable-payslip-root"
                  className="w-full max-w-[210mm] min-h-[297mm] bg-white text-gray-900 p-8 sm:p-12 shadow-xl border border-gray-200 print:shadow-none print:border-none print:p-8 font-sans"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#111827',
                  }}
                >
                  {/* Print Styles Injection */}
                  <style dangerouslySetInnerHTML={{
                    __html: `
                      @media print {
                        body {
                          background: white !important;
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                        }
                        #printable-payslip-root {
                          padding: 10mm !important;
                          box-shadow: none !important;
                          border: none !important;
                          width: 100% !important;
                          max-width: 100% !important;
                        }
                      }
                    `
                  }} />

                  {/* 1. Header Row: Company Info (left) & PAYSLIP (right) */}
                  <div className="flex justify-between items-start border-b border-gray-200 pb-5 mb-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={`${import.meta.env.BASE_URL}edge2-logo.png`}
                        alt="Company Logo"
                        className="w-16 h-16 object-contain shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black text-[#2B6CB0] tracking-tight">
                          {COMPANY_INFO.name}
                        </h1>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {COMPANY_INFO.addressLine1} {COMPANY_INFO.addressLine2}
                        </p>
                        <p className="text-xs text-gray-600">
                          Phone: {COMPANY_INFO.phone} | Email: {COMPANY_INFO.email}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          GSTIN: <span className="font-semibold text-gray-700">{COMPANY_INFO.gstin}</span> | PAN: <span className="font-semibold text-gray-700">{COMPANY_INFO.pan}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#3B71CA] tracking-wider uppercase">
                        PAYSLIP
                      </h2>
                    </div>
                  </div>

                  {/* 2. Top Grid: Employee Information (left) & Pay Info Block (right) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs">
                    {/* Left: Employee Information */}
                    <div>
                      <div className="bg-[#5B9BD5] text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1.5">
                        EMPLOYEE INFORMATION
                      </div>
                      <div className="p-3 bg-white border-l border-r border-b border-gray-200 space-y-1">
                        <div className="text-sm font-bold text-gray-900">
                          {displayName}
                        </div>
                        {empObj?.role && (
                          <div className="text-gray-700 font-medium">
                            Designation: <span className="font-semibold">{empObj.role}</span>
                          </div>
                        )}
                        {employeeIdStr && (
                          <div className="text-gray-600">
                            Employee ID: <span className="font-mono font-semibold">{employeeIdStr}</span>
                          </div>
                        )}
                        {Array.isArray(empObj?.departments) && empObj.departments.length > 0 && (
                          <div className="text-gray-600">
                            Department: {empObj.departments.join(', ')}
                          </div>
                        )}
                        {empObj?.username && (
                          <div className="text-gray-500 text-[11px]">
                            Username / System ID: {empObj.username}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Pay Details Matrix Table */}
                    <div>
                      <div className="border border-gray-300 overflow-hidden">
                        {/* Header Row 1 */}
                        <div className="grid grid-cols-3 bg-[#5B9BD5] text-white font-bold text-[10px] text-center uppercase tracking-wider divide-x divide-white/20">
                          <div className="py-1">PAY DATE</div>
                          <div className="py-1">PAY TYPE</div>
                          <div className="py-1">PERIOD</div>
                        </div>
                        {/* Values Row 1 */}
                        <div className="grid grid-cols-3 text-center text-xs divide-x divide-gray-300 border-b border-gray-300 bg-gray-50/40">
                          <div className="py-1.5 font-medium">{payDateStr}</div>
                          <div className="py-1.5 font-medium">Monthly</div>
                          <div className="py-1.5 font-semibold text-gray-900">{payPeriodStr}</div>
                        </div>

                        {/* Header Row 2 */}
                        <div className="grid grid-cols-3 bg-[#5B9BD5] text-white font-bold text-[10px] text-center uppercase tracking-wider divide-x divide-white/20">
                          <div className="py-1">PAYROLL #</div>
                          <div className="py-1">EMPLOYEE ID</div>
                          <div className="py-1">STATUS</div>
                        </div>
                        {/* Values Row 2 */}
                        <div className="grid grid-cols-3 text-center text-xs divide-x divide-gray-300 bg-gray-50/40">
                          <div className="py-1.5 font-mono">{payrollNum}</div>
                          <div className="py-1.5 font-mono">{employeeIdStr}</div>
                          <div className="py-1.5 font-semibold text-emerald-700">{viewingPayslip.status || 'Paid'}</div>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-700 flex items-center justify-between px-1">
                        <span>Payment Method: <strong className="text-gray-900">Bank Transfer</strong></span>
                        <span className="text-[11px] text-gray-500">Currency: <strong className="text-gray-700">INR (₹)</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* 3. EARNINGS Section */}
                  <div className="mb-6">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#BFBFBF] text-gray-900 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-2 px-3 text-left w-2/5">EARNINGS</th>
                          <th className="py-2 px-3 text-center w-1/6">HOURS / DAYS</th>
                          <th className="py-2 px-3 text-center w-1/6">RATE</th>
                          <th className="py-2 px-3 text-right w-1/6">CURRENT (₹)</th>
                          <th className="py-2 px-3 text-right w-1/6">YTD (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-gray-800">
                        <tr>
                          <td className="py-2 px-3 font-medium">Basic Pay</td>
                          <td className="py-2 px-3 text-center">30 Days</td>
                          <td className="py-2 px-3 text-center">-</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {breakdown.basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {breakdown.basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">House Rent Allowance (HRA)</td>
                          <td className="py-2 px-3 text-center">-</td>
                          <td className="py-2 px-3 text-center">-</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {breakdown.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {breakdown.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">Special / Conveyance Allowance</td>
                          <td className="py-2 px-3 text-center">-</td>
                          <td className="py-2 px-3 text-center">-</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {breakdown.specialAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {breakdown.specialAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {viewingPayslip.notes && (
                          <tr className="bg-gray-50/60">
                            <td colSpan={5} className="py-1.5 px-3 text-[11px] text-gray-600 italic">
                              Remarks / Bonus / Adjustments: {viewingPayslip.notes}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#BFBFBF] text-gray-900 font-bold uppercase tracking-wider text-xs">
                          <td colSpan={3} className="py-2 px-3 text-right font-extrabold">
                            GROSS PAY
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-sm">
                            ₹{breakdown.grossPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-sm">
                            ₹{breakdown.grossPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 4. DEDUCTIONS Section */}
                  <div className="mb-6">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#BFBFBF] text-gray-900 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-2 px-3 text-left w-3/5">DEDUCTIONS</th>
                          <th className="py-2 px-3 text-right w-1/5">CURRENT (₹)</th>
                          <th className="py-2 px-3 text-right w-1/5">YTD (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-gray-800">
                        <tr>
                          <td className="py-2 px-3 font-medium">Provident Fund (PF)</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">0.00</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">0.00</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">Professional Tax (PT)</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">0.00</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">0.00</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">Income Tax (TDS)</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">0.00</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">0.00</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#BFBFBF] text-gray-900 font-bold uppercase tracking-wider text-xs">
                          <td className="py-2 px-3 text-right font-extrabold">
                            TOTAL DEDUCTIONS
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-sm">
                            ₹0.00
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-sm">
                            ₹0.00
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 5. NET PAY Highlight Bar (Right-Aligned like in template) */}
                  <div className="flex justify-end mb-10">
                    <div className="w-full sm:w-1/2 bg-[#A6A6A6] text-gray-900 font-extrabold flex justify-between items-center py-2.5 px-4 text-sm tracking-wider uppercase shadow-sm">
                      <span className="text-base font-black">NET PAY</span>
                      <div className="text-right flex items-center gap-6">
                        <span className="font-mono text-base font-black text-gray-950">
                          ₹{breakdown.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="font-mono text-sm font-bold text-gray-800 hidden sm:inline">
                          ₹{breakdown.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 6. Footer Notes */}
                  <div className="text-center pt-8 border-t border-gray-200 space-y-1.5 text-xs text-gray-600">
                    <p className="font-semibold text-gray-800">
                      If you have any questions about this payslip, please contact:
                    </p>
                    <p className="font-medium text-gray-900">
                      Accounts & HR Department — {COMPANY_INFO.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Email: {COMPANY_INFO.email} | Phone: {COMPANY_INFO.phone} | Website: {COMPANY_INFO.website}
                    </p>
                    <p className="text-[10px] text-gray-400 pt-3 italic">
                      This is a system-generated document and does not require an authorized signature.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="sticky bottom-0 z-10 bg-white/95 dark:bg-card/95 backdrop-blur-sm border-t border-gray-200 dark:border-border px-6 py-3 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setViewingPayslip(null)}
                  className="rounded-xl"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handlePrint()}
                  className="rounded-xl gap-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleteConfirmation({ isOpen: false, id: null, employeeName: '', period: '' })
        }
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Pay Slip?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the pay slip for{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                {deleteConfirmation.employeeName}
              </strong>{' '}
              ({deleteConfirmation.period})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaySlipsManager;
