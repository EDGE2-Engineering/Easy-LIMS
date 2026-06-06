import React, { useState, useEffect } from 'react';
import ReactSelect from 'react-select';
import {
  Search,
  Trash2,
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Calendar,
  Plus,
  Filter,
  X,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import Rupee from '../Rupee';
import { useSettings } from '@/contexts/SettingsContext';
import { ROLES } from '@/data/config';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { themedReactSelectStyles } from '@/lib/reactSelectStyles';

const DocumentsManager = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    recordId: null,
    quoteNumber: '',
  });
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [datePreset, setDatePreset] = useState('custom');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user, isStandard } = useAuth();

  const taxCGST = settings?.tax_cgst ? Number(settings.tax_cgst) : 9;
  const taxSGST = settings?.tax_sgst ? Number(settings.tax_sgst) : 9;
  const taxTotalPercent = taxCGST + taxSGST;

  const calculateRecordTotal = (record) => {
    try {
      const content = record.content || {};
      const items = content.items || [];
      const discount = content.discount || 0;

      const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      const discountedSubtotal = subtotal * (1 - discount / 100);
      const total = discountedSubtotal * (1 + taxTotalPercent / 100);

      return total;
    } catch (error) {
      console.error('Error calculating record total:', error);
      return 0;
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select('*, users(full_name), clients(client_name, gstin), jobs(project_name)');

      if (isStandard()) {
        query = query.eq('created_by', user.id);
      }

      // Hide 'Report' type documents as they are now managed in their own tab
      query = query.neq('document_type', 'Report');

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents. ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDeleteClick = (record) => {
    setDeleteConfirmation({
      isOpen: true,
      recordId: record.id,
      quoteNumber: record.quote_number,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.recordId) return;
    if (user?.role === ROLES.ACCOUNTS.slug) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete documents.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', deleteConfirmation.recordId);

      if (error) throw error;

      toast({
        title: 'Document Deleted',
        description: 'The document record has been removed.',
        variant: 'destructive',
      });
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({ title: 'Error', description: 'Failed to delete document.', variant: 'destructive' });
    } finally {
      setDeleteConfirmation({ isOpen: false, recordId: null, quoteNumber: '' });
    }
  };

  const handleOpen = (recordId, docNumber) => {
    navigate(`/doc/${recordId}`);
  };

  const applyDatePreset = (preset) => {
    const now = new Date();
    let start = '';
    let end = '';
    const formatDateStr = (date) => date.toISOString().split('T')[0];

    switch (preset) {
      case 'this_month':
        start = formatDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
        end = formatDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'last_month':
        start = formatDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        end = formatDateStr(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'this_year':
        start = formatDateStr(new Date(now.getFullYear(), 0, 1));
        end = formatDateStr(new Date(now.getFullYear(), 11, 31));
        break;
      case 'last_year':
        start = formatDateStr(new Date(now.getFullYear() - 1, 0, 1));
        end = formatDateStr(new Date(now.getFullYear() - 1, 11, 31));
        break;
      case 'ytd':
        start = formatDateStr(new Date(now.getFullYear(), 0, 1));
        end = formatDateStr(now);
        break;
      case 'custom':
        start = '';
        end = '';
        break;
      default:
        break;
    }

    setFromDate(start);
    setToDate(end);
    setDatePreset(preset);
  };

  const uniqueUsers = Array.from(
    new Set(documents.map((r) => r.users?.full_name).filter(Boolean))
  ).sort();

  const uniqueClients = Array.from(
    new Set(documents.map((r) => r.clients?.client_name).filter(Boolean))
  ).sort();

  const filteredDocuments = documents.filter((r) => {
    const matchesSearch =
      (r.quote_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (r.clients?.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (r.document_type?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Document Type Filter
    if (filterDocType !== 'all' && r.document_type !== filterDocType) return false;

    // User Filter
    if (filterUser !== 'all' && r.users?.full_name !== filterUser) return false;

    // Client Filter
    if (filterClient !== 'all' && r.clients?.client_name !== filterClient) return false;

    if (fromDate || toDate) {
      const recordDate = new Date(r.created_at);
      recordDate.setHours(0, 0, 0, 0);

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate < start) return false;
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(0, 0, 0, 0);
        if (recordDate > end) return false;
      }
    }

    return true;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    let valA, valB;
    switch (sortField) {
      case 'total':
        valA = calculateRecordTotal(a);
        valB = calculateRecordTotal(b);
        break;
      case 'client':
        valA = (a.clients?.client_name || '').toLowerCase();
        valB = (b.clients?.client_name || '').toLowerCase();
        break;
      case 'user':
        valA = (a.users?.full_name || '').toLowerCase();
        valB = (b.users?.full_name || '').toLowerCase();
        break;
      case 'date':
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = sortedDocuments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate, filterDocType, filterUser, filterClient, sortField, sortOrder]);

  const resetAll = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setFilterDocType('all');
    setFilterUser('all');
    setFilterClient('all');
    setSortField('date');
    setSortOrder('desc');
    setCurrentPage(1);
    setShowFilters(false);
    setDatePreset('custom');
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        {/* Row 1: Search and Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by invoice/quote number or client name..."
              className="pl-10 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => navigate('/doc/new', { state: { forceReset: Date.now() } })}
                className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Document
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Generate a new billing or proposal document</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Row 2: Filters Toggle, Sorting, and Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showFilters ? 'secondary' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-10 px-4 rounded-xl transition-all border-gray-200 ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-50/50'}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="text-sm font-bold uppercase tracking-widest leading-none">
                    Filters
                  </span>
                  {(fromDate ||
                    toDate ||
                    filterDocType !== 'all' ||
                    filterUser !== 'all' ||
                    filterClient !== 'all') && (
                    <Badge className="ml-2 bg-primary text-white scale-75">!</Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                <p className="text-xs">Show advanced filtering options</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
                Sort
              </span>
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-40 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date Created</SelectItem>
                  <SelectItem value="total">Total Amount</SelectItem>
                  <SelectItem value="client">Client Name</SelectItem>
                  {!isStandard() && <SelectItem value="user">Created By</SelectItem>}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 border-gray-200 bg-gray-50/50 rounded-lg"
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  >
                    {sortOrder === 'asc' ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                  <p className="text-xs">
                    Toggle {sortOrder === 'asc' ? 'Descending' : 'Ascending'} Sort
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">
            Showing{' '}
            <span className="text-primary">
              {sortedDocuments.length === 0 ? 0 : startIndex + 1}–
              {Math.min(endIndex, sortedDocuments.length)}
            </span>{' '}
            of <span className="text-primary">{sortedDocuments.length}</span> Documents
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <Filter className="w-4 h-4 mr-2 text-primary" />
                Advanced Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="text-xs text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest"
              >
                <X className="w-3 h-3 mr-1" /> Reset All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Document Type
                </Label>
                <Select value={filterDocType} onValueChange={setFilterDocType}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Tax Invoice">Tax Invoice</SelectItem>
                    <SelectItem value="Quotation">Quotation</SelectItem>
                    <SelectItem value="Proforma Invoice">Proforma Invoice</SelectItem>
                    <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                    <SelectItem value="Delivery Challan">Delivery Challan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Quick Date
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

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  From Date
                </Label>
                <AppDatePicker
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  To Date
                </Label>
                <AppDatePicker
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                />
              </div>

              {!isStandard() && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Created By
                  </Label>
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {uniqueUsers.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Client
                </Label>
                <ReactSelect
                  className="text-sm"
                  classNamePrefix="react-select"
                  options={[
                    { value: 'all', label: 'All Clients' },
                    ...uniqueClients.map((c) => ({ value: c, label: c })),
                  ]}
                  value={{
                    value: filterClient,
                    label: filterClient === 'all' ? 'All Clients' : filterClient,
                  }}
                  onChange={(option) => setFilterClient(option ? option.value : 'all')}
                  placeholder="Search Clients..."
                  isSearchable
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={themedReactSelectStyles()}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls - Top */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 px-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
            Items
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
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
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-l pl-3 ml-1">
            Showing {sortedDocuments.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, sortedDocuments.length)} of {sortedDocuments.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
          >
            Prev
          </Button>
          <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
              Page {currentPage} / {totalPages || 1}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Document #
                </th>
                <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Client and Project Name
                </th>
                <th className="text-right py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Total Amount
                </th>
                <th className="text-right py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Created On
                </th>
                <th className="text-right py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Created By
                </th>
                <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Document Type
                </th>
                <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-gray-500">
                    No documents found.
                  </td>
                </tr>
              ) : (
                paginatedDocuments.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="py-5 px-6">
                      <span className="font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                        {record.quote_number}
                      </span>
                    </td>

                    <td className="py-5 px-6">
                      <div className="font-bold text-gray-900">
                        {record.clients?.client_name || '-'}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                        {record.clients?.gstin ? `GSTIN: ${record.clients.gstin}` : ''}
                      </div>
                      {record.jobs?.project_name && (
                        <div className="text-xs text-gray-500 mt-1">{record.jobs.project_name}</div>
                      )}
                    </td>

                    <td className="py-5 px-6 text-right">
                      <span className="font-bold text-gray-900 tabular-nums">
                        <Rupee />
                        {Math.floor(calculateRecordTotal(record)).toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-5 px-6 text-right">
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(record.created_at), 'dd MMM yyyy')}
                      </div>
                    </td>

                    <td className="py-5 px-6 text-right">
                      <div className="text-xs text-gray-500 mt-1">
                        {record.users?.full_name || '-'}
                      </div>
                    </td>

                    <td className="py-5 px-6 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
                          record.document_type === 'Tax Invoice'
                            ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                            : record.document_type === 'Proforma Invoice'
                              ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                              : record.document_type === 'Purchase Order'
                                ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
                                : record.document_type === 'Delivery Challan'
                                  ? 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800'
                                  : 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                        }`}
                      >
                        {record.document_type}
                      </span>
                    </td>

                    <td className="py-5 px-6 text-center">
                      <div className="flex justify-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-4 rounded-lg hover:bg-primary hover:text-white transition-all text-blue-600"
                              onClick={() => handleOpen(record.id, record.quote_number)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Open Document</p>
                          </TooltipContent>
                        </Tooltip>

                        {user?.role !== ROLES.ACCOUNTS.slug && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-4 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-all"
                                onClick={() => handleDeleteClick(record)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                              <p className="text-xs">Delete Document</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleteConfirmation({ isOpen: false, recordId: null, quoteNumber: '' })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Delete Document?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteConfirmation.quoteNumber}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsManager;
