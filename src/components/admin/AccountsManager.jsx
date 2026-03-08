import React, { useState, useEffect } from 'react';
import { Search, Trash2, ExternalLink, FileText, Loader2, AlertCircle, ArrowUpDown, SortAsc, SortDesc, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import Rupee from '../Rupee';
import { useSettings } from '@/contexts/SettingsContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DB_TYPES } from '@/config';

const AccountsManager = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, recordId: null, jobOrderNo: '' });
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [appUsers, setAppUsers] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user, isStandard, idToken } = useAuth();

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

  const fetchAccounts = async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const data = await dynamoGenericApi.listByType(DB_TYPES.ACCOUNT, idToken);

      // Filter by standard user if applicable
      let filteredData = data || [];
      if (isStandard()) {
        filteredData = filteredData.filter(item => item.created_by === user.username);
      }

      // Hide 'Report' type documents as they are now managed in their own tab
      filteredData = filteredData.filter(item => item.document_type !== 'Report');

      setAccounts(filteredData);
    } catch (error) {
      console.error('Error fetching accounts from DynamoDB:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts. " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!idToken) return;
    try {
      const data = await dynamoGenericApi.listByType(DB_TYPES.USER, idToken);
      setAppUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (idToken) {
      fetchAccounts();
      fetchUsers();
    }
  }, [idToken]);

  const handleDeleteClick = (record) => {
    setDeleteConfirmation({
      isOpen: true,
      recordId: record.id,
      jobOrderNo: record.job_order_no
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.recordId || !idToken) return;

    try {
      await dynamoGenericApi.delete(deleteConfirmation.recordId, idToken);
      toast({ title: "Account Deleted", description: "The account record has been removed.", variant: "destructive" });
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account from DynamoDB:', error);
      toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" });
    } finally {
      setDeleteConfirmation({ isOpen: false, recordId: null, jobOrderNo: '' });
    }
  };

  const handleOpen = (recordId, docNumber) => {
    navigate(`/ doc / ${recordId} `);
  };

  const uniqueUsersInList = Array.from(new Set(accounts
    .map(r => {
      const u = appUsers.find(u => u.id === r.created_by || u.sub === r.created_by || u.username === r.created_by || u.email === r.created_by);
      return u ? (u.full_name || u.fullName || u.name) : r.created_by;
    })
    .filter(Boolean)))
    .sort();

  const uniqueClients = Array.from(new Set(accounts
    .map(r => r.client_name)
    .filter(Boolean)))
    .sort();

  const filteredAccounts = accounts.filter(r => {
    const matchesSearch = (r.job_order_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (r.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (r.document_type?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Document Type Filter
    if (filterDocType !== 'all' && r.document_type !== filterDocType) return false;

    // User Filter
    const uMatch = appUsers.find(u => u.id === r.created_by || u.sub === r.created_by || u.username === r.created_by || u.email === r.created_by);
    const userName = uMatch ? (uMatch.full_name || uMatch.fullName || uMatch.name) : r.created_by;
    if (filterUser !== 'all' && userName !== filterUser) return false;

    // Client Filter
    if (filterClient !== 'all' && r.client_name !== filterClient) return false;

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

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    let valA, valB;
    switch (sortField) {
      case 'total':
        valA = calculateRecordTotal(a);
        valB = calculateRecordTotal(b);
        break;
      case 'client':
        valA = (a.client_name || '').toLowerCase();
        valB = (b.client_name || '').toLowerCase();
        break;
      case 'user':
        const uA = appUsers.find(u => u.id === a.created_by || u.sub === a.created_by || u.username === a.created_by || u.email === a.created_by);
        const uB = appUsers.find(u => u.id === b.created_by || u.sub === b.created_by || u.username === b.created_by || u.email === b.created_by);
        valA = (uA ? (uA.full_name || uA.fullName || uA.name) : (a.created_by || '')).toLowerCase();
        valB = (uB ? (uB.full_name || uB.fullName || uB.name) : (b.created_by || '')).toLowerCase();
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
  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAccounts = sortedAccounts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate, filterDocType, filterUser, filterClient, sortField, sortOrder]);

  const resetFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setFilterDocType('all');
    setFilterUser('all');
    setFilterClient('all');
    setSortField('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Panel: Search, Filters, Sorting */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        {/* Top Row: Prominent Search Bar and Record Count */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by invoice/quote number or client name..."
              className="pl-12 h-10 text-sm bg-gray-50/30 border-gray-200 rounded-lg focus:ring-primary focus:border-primary transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Record Count Status */}
          <div className="flex items-center gap-2 px-6 h-10 bg-primary/5 rounded-lg border border-primary/10 whitespace-nowrap">
            <FileText className="w-4 h-4 text-primary/60" />
            <span className="text-sm font-semibold text-gray-700">
              {sortedAccounts.length} <span className="text-gray-400 font-normal">accounts found</span>
            </span>
          </div>
        </div>

        {/* Bottom Row: Filters, Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-start gap-6 flex-1">

            {/* Filters Group */}
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">
                Filters
              </span>

              <div className="flex flex-col gap-3">

                {/* Row 1 – Date Range */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-gray-50/50 p-1 px-3 rounded-lg border border-gray-100 focus-within:border-primary/30 transition-colors">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <Input
                      type="date"
                      className="w-auto min-w-[130px] h-9 text-sm border-none bg-transparent focus-visible:ring-0 cursor-pointer p-0"
                      value={fromDate}
                      title="From Date"
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                    <span className="text-gray-300 font-light px-1">to</span>
                    <Input
                      type="date"
                      className="w-auto min-w-[130px] h-9 text-sm border-none bg-transparent focus-visible:ring-0 cursor-pointer p-0"
                      value={toDate}
                      title="To Date"
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2 – Select Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filterDocType} onValueChange={setFilterDocType}>
                    <SelectTrigger className="w-32 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg focus:ring-1 focus:ring-primary/20">
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

                  {!isStandard() && (
                    <Select value={filterUser} onValueChange={setFilterUser}>
                      <SelectTrigger className="w-36 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg focus:ring-1 focus:ring-primary/20">
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {uniqueUsersInList.map(user => (
                          <SelectItem key={user} value={user}>
                            {user}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={filterClient} onValueChange={setFilterClient}>
                    <SelectTrigger className="w-72 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg text-left focus:ring-1 focus:ring-primary/20">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {uniqueClients.map(client => (
                        <SelectItem key={client} value={client}>
                          {client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>

            <div className="h-8 w-px bg-gray-100 hidden xl:block" />

            {/* Sorting Group */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Sort
              </span>

              <div className="flex items-center gap-2">
                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="w-40 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg focus:ring-1 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date Created</SelectItem>
                    <SelectItem value="total">Total Amount</SelectItem>
                    <SelectItem value="client">Client Name</SelectItem>
                    {!isStandard() && <SelectItem value="user">Created By</SelectItem>}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 hover:bg-primary/5 hover:text-primary transition-colors border-gray-200 rounded-lg flex-shrink-0"
                  onClick={() =>
                    setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
                  }
                  title={`Order: ${sortOrder === "asc" ? "Ascending" : "Descending"} `}
                >
                  {sortOrder === "asc" ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={
                !searchTerm &&
                !fromDate &&
                !toDate &&
                filterDocType === "all" &&
                filterUser === "all" &&
                filterClient === "all" &&
                sortField === "date" &&
                sortOrder === "desc"
              }
              className="text-red-900 bg-red-50 hover:bg-red-500 hover:text-white h-9 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              Reset All
            </Button>
            <Button
              onClick={() => navigate('/doc/new', { state: { forceReset: Date.now() } })}
              size="sm"
              className="bg-primary hover:bg-primary-dark text-white h-9 px-4 rounded-lg shadow-sm text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Doc
            </Button>
          </div>
        </div>

      </div>

      {/* Pagination Controls - Top */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Items per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
            setItemsPerPage(Number(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-24 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">
            Showing {sortedAccounts.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, sortedAccounts.length)} of {sortedAccounts.length}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Document #</th>
                <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Created On</th>
                <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Client</th>
                <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Total Amount</th>
                <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Created By</th>
                <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Document Type</th>
                <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan="2" className="py-10 text-center text-gray-500">
                    No accounts found.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-4 text-sm text-gray-600">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="font-semibold font-mono text-black text-md bg-gray-200 p-1 rounded">{record.job_order_no}</span>
                      </div>
                    </td>

                    <td className="justify-left items-center">
                      <span className="text-black font-regular text-sm"> {format(new Date(record.created_at), 'dd MMM yyyy')}</span>
                    </td>

                    <td className="justify-left items-center">
                      <span className="text-black font-regular text-sm"> {record.client_name || '-'}</span>
                    </td>

                    <td className="justify-left items-center">
                      <span className="text-black font-regular text-sm"> <Rupee />{calculateRecordTotal(record).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="justify-left items-center">
                      <span className="text-black font-regular text-sm">
                        {(() => {
                          const u = appUsers.find(u => u.id === record.created_by || u.sub === record.created_by || u.username === record.created_by || u.email === record.created_by);
                          return u ? (u.full_name || u.fullName || u.name) : (record.created_by || '-');
                        })()}
                      </span>
                    </td>

                    <td className="justify-left items-center">
                      <span className={`inline - flex items - center px - 2 py - 0.5 rounded text - xs font - medium ${record.document_type === 'Tax Invoice'
                        ? 'bg-blue-100 text-blue-800'
                        : record.document_type === 'Proforma Invoice'
                          ? 'bg-purple-100 text-purple-800'
                          : record.document_type === 'Purchase Order'
                            ? 'bg-orange-100 text-orange-800'
                            : record.document_type === 'Delivery Challan'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-green-100 text-green-800'
                        } `}>
                        {record.document_type}
                      </span>
                    </td>

                    {/* Actions */}
                    < td className="py-1 px-1 text-right" >
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Open Document"
                          className="text-primary hover:text-primary-dark hover:bg-primary/10 px-0 text-blue-600 text-xs px-1"
                          onClick={() => handleOpen(record.id, record.job_order_no)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          title="Delete Document"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-1"
                          onClick={() => handleDeleteClick(record)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </div >

      {/* Pagination Controls - Bottom */}
      {
        totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow border border-gray-100">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 px-4 text-sm border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-4 text-sm border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )
      }

      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, recordId: null, jobOrderNo: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.jobOrderNo}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};

export default AccountsManager;
