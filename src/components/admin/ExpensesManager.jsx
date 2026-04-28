import React from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle, IndianRupee, Calendar, User, SortAsc, SortDesc, Filter, X, Download, FileSpreadsheet } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ExpensesManager = () => {
    const { expenses, addExpense, updateExpense, deleteExpense, loading } = useExpenses();
    const { user } = useAuth();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = React.useState('');
    const [editingExpense, setEditingExpense] = React.useState(null);
    const [isAddingNew, setIsAddingNew] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = React.useState({ isOpen: false, expenseId: null, description: '' });
    
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [sortField, setSortField] = React.useState('date');
    const [sortOrder, setSortOrder] = React.useState('desc');

    // Advanced Filters State
    const [filterByCreator, setFilterByCreator] = React.useState('all');
    const [filterDateStart, setFilterDateStart] = React.useState('');
    const [filterDateEnd, setFilterDateEnd] = React.useState('');
    const [datePreset, setDatePreset] = React.useState('custom');
    const [showFilters, setShowFilters] = React.useState(false);

    const creators = React.useMemo(() => {
        const set = new Set((expenses || []).map(e => e.createdBy));
        return Array.from(set).sort();
    }, [expenses]);

    const applyDatePreset = (preset) => {
        const now = new Date();
        let start = '';
        let end = '';

        const formatDate = (date) => date.toISOString().split('T')[0];

        switch (preset) {
            case 'this_month':
                start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
                end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
                break;
            case 'last_month':
                start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
                end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
                break;
            case 'this_year':
                start = formatDate(new Date(now.getFullYear(), 0, 1));
                end = formatDate(new Date(now.getFullYear(), 11, 31));
                break;
            case 'last_year':
                start = formatDate(new Date(now.getFullYear() - 1, 0, 1));
                end = formatDate(new Date(now.getFullYear() - 1, 11, 31));
                break;
            case 'ytd':
                start = formatDate(new Date(now.getFullYear(), 0, 1));
                end = formatDate(now);
                break;
            case 'custom':
                start = '';
                end = '';
                break;
            default:
                break;
        }

        setFilterDateStart(start);
        setFilterDateEnd(end);
        setDatePreset(preset);
    };

    const filteredExpenses = React.useMemo(() => {
        let result = (expenses || []).filter(e => {
            // Search filter
            const searchStr = searchTerm.toLowerCase();
            const matchesSearch = (e.description?.toLowerCase() || '').includes(searchStr) ||
                                 (e.remarks?.toLowerCase() || '').includes(searchStr) ||
                                 (e.createdBy?.toLowerCase() || '').includes(searchStr);
            if (!matchesSearch) return false;

            // Creator filter
            if (filterByCreator !== 'all' && e.createdBy !== filterByCreator) return false;

            // Date range filter
            if (filterDateStart && new Date(e.date) < new Date(filterDateStart)) return false;
            if (filterDateEnd && new Date(e.date) > new Date(filterDateEnd)) return false;

            return true;
        });

        result.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'date') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [expenses, searchTerm, sortField, sortOrder, filterByCreator, filterDateStart, filterDateEnd]);

    const resetFilters = () => {
        setFilterByCreator('all');
        setFilterDateStart('');
        setFilterDateEnd('');
        setDatePreset('custom');
        setSearchTerm('');
    };

    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterByCreator, filterDateStart, filterDateEnd]);

    const handleEdit = (expense) => {
        setEditingExpense({ ...expense });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingExpense({
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            remarks: '',
            createdBy: user?.fullName || user?.username || 'Admin'
        });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (!editingExpense.description || !editingExpense.amount || !editingExpense.date) {
            toast({ title: "Validation Error", description: "Description, Amount and Date are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (isAddingNew) {
                await addExpense(editingExpense);
                toast({ title: "Expense Added", description: "New expense record has been created." });
            } else {
                await updateExpense(editingExpense);
                toast({ title: "Expense Updated", description: "Expense details have been updated." });
            }
            setEditingExpense(null);
            setIsAddingNew(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to save expense. " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (expense) => {
        setDeleteConfirmation({
            isOpen: true,
            expenseId: expense.id,
            description: expense.description
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.expenseId) {
            try {
                await deleteExpense(deleteConfirmation.expenseId);
                toast({ title: "Expense Deleted", description: "The record has been removed.", variant: "destructive" });
            } catch (error) {
                toast({ title: "Error", description: "Failed to delete expense: " + error.message, variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, expenseId: null, description: '' });
    };

    const downloadCSV = () => {
        if (filteredExpenses.length === 0) return;

        // Define headers
        const headers = ['Date', 'Description', 'Amount', 'Created By', 'Remarks'];
        
        // Map data to rows
        const rows = filteredExpenses.map(e => [
            new Date(e.date).toLocaleDateString('en-IN'),
            `"${e.description?.replace(/"/g, '""') || ''}"`, // Escape quotes and wrap in quotes
            e.amount,
            `"${e.createdBy?.replace(/"/g, '""') || ''}"`,
            `"${e.remarks?.replace(/"/g, '""') || ''}"`
        ]);

        // Combine into CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Expenses_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "Report Downloaded", description: `Exported ${filteredExpenses.length} records to CSV.` });
    };

    if (editingExpense) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{isAddingNew ? 'Add New Expense' : 'Edit Expense'}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setEditingExpense(null)} disabled={isSaving} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary-dark flex items-center text-white rounded-xl"
                            disabled={isSaving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Record'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Description</Label>
                            <Input
                                value={editingExpense.description || ''}
                                onChange={(e) => setEditingExpense(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="What was the expense for?"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Amount (₹)</Label>
                                <Input
                                    type="number"
                                    value={editingExpense.amount || ''}
                                    onChange={(e) => setEditingExpense(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0.00"
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Date</Label>
                                <Input
                                    type="date"
                                    value={editingExpense.date || ''}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setEditingExpense(prev => ({ ...prev, date: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-2" hidden={true}>
                            <Label className="text-sm font-semibold text-gray-700">Created By</Label>
                            <Input
                                value={editingExpense.createdBy || ''}
                                disabled
                                className="bg-gray-50 rounded-xl"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Remarks</Label>
                            <Textarea
                                rows={6}
                                value={editingExpense.remarks || ''}
                                onChange={(e) => setEditingExpense(prev => ({ ...prev, remarks: e.target.value }))}
                                placeholder="Additional details..."
                                className="rounded-xl resize-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search Expenses..."
                            className="pl-10 w-full h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={handleAddNew}
                                className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Expense
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Log a new business expense</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={showFilters ? "secondary" : "outline"}
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`h-10 px-4 rounded-xl transition-all border-gray-200 ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-50/50'}`}
                                >
                                    <Filter className="w-4 h-4 mr-2" />
                                    <span className="text-sm font-bold uppercase tracking-widest leading-none">Filters</span>
                                    {(filterByCreator !== 'all' || filterDateStart || filterDateEnd) && (
                                        <Badge className="ml-2 bg-primary text-white scale-75">!</Badge>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                <p className="text-xs">Show advanced filtering options</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    onClick={downloadCSV}
                                    disabled={filteredExpenses.length === 0}
                                    className="h-10 px-4 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all text-sm font-bold uppercase tracking-widest leading-none"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    <span>Export CSV</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                <p className="text-xs">Download filtered expenses as CSV</p>
                            </TooltipContent>
                        </Tooltip>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Sort</span>
                            <Select value={sortField} onValueChange={setSortField}>
                                <SelectTrigger className="w-40 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="amount">Amount</SelectItem>
                                    <SelectItem value="description">Description</SelectItem>
                                </SelectContent>
                            </Select>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 border-gray-200 bg-gray-50/50 rounded-lg"
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    >
                                        {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">Toggle {sortOrder === 'asc' ? 'Descending' : 'Ascending'} Sort</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">
                        Total: <span className="text-primary">₹{filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}</span>
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
                            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-gray-400 hover:text-red-500">
                                <X className="w-3 h-3 mr-1" /> Reset All
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-500 uppercase">Quick Date</Label>
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
                                <Label className="text-xs font-semibold text-gray-500 uppercase">From Date</Label>
                                <Input
                                    type="date"
                                    value={filterDateStart}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        setFilterDateStart(e.target.value);
                                        setDatePreset('custom');
                                    }}
                                    className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-500 uppercase">To Date</Label>
                                <Input
                                    type="date"
                                    value={filterDateEnd}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        setFilterDateEnd(e.target.value);
                                        setDatePreset('custom');
                                    }}
                                    className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-500 uppercase">Created By</Label>
                                <Select value={filterByCreator} onValueChange={setFilterByCreator}>
                                    <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                                        <SelectValue placeholder="All Users" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        {creators.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Date</th>
                            <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Description / Remarks</th>
                            <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Amount</th>
                            <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] hidden md:table-cell">Created By</th>
                            <th className="text-center py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedExpenses.length > 0 ? (
                            paginatedExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="py-5 px-6">
                                        <span className="font-mono font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                            {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">{expense.description}</div>
                                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{expense.remarks || 'No remarks'}</div>
                                    </td>

                                    <td className="py-5 px-6 text-center">
                                        <div className="font-mono font-bold text-primary">
                                            ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-center hidden md:table-cell">
                                        <div className="text-xs font-semibold text-gray-500 tracking-tight">
                                            {expense.createdBy}
                                        </div>
                                    </td>

                                    <td className="py-5 px-6 text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)} className="h-9 px-4 rounded-lg hover:bg-primary hover:text-white transition-all">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(expense)} className="h-9 px-4 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <IndianRupee className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="font-medium text-lg">No expenses found</p>
                                        <p className="text-sm">Try adjusting your search or filters.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-sm text-gray-500 font-medium">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredExpenses.length)} of {filteredExpenses.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="rounded-xl"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="rounded-xl"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, expenseId: null, description: '' })}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Delete Expense?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.description}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
                            Delete Record
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ExpensesManager;
