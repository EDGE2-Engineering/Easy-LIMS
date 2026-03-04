
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, Search, Download, Upload, AlertCircle, SortAsc, SortDesc } from 'lucide-react';
import Rupee from '../Rupee';
import { useTests } from '@/contexts/TestsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHSNCodes } from '@/contexts/HSNCodesContext';
import { useTermsAndConditions } from '@/contexts/TermsAndConditionsContext';
import { useTechnicals } from '@/contexts/TechnicalsContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
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
import ReactSelect from 'react-select';

const AdminTestsManager = () => {
    const { tests, updateTest, addTest, deleteTest, setTests } = useTests();
    const { hsnCodes } = useHSNCodes();
    const { terms } = useTermsAndConditions();
    const { technicals } = useTechnicals();
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTest, setEditingTest] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, testId: null, testType: '' });
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterMaterial, setFilterMaterial] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const fileImportRef = useRef(null);

    const uniqueMaterials = ['all', ...new Set(tests.map(t => t.materials).filter(Boolean).sort())];

    const filteredTests = tests.filter(t => {
        const matchesSearch =
            (t.testType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (t.price?.toString() || '').includes(searchTerm) ||
            (t.hsnCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (t.group?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (t.materials?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (t.testMethodSpecification?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (t.id?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesMaterial = filterMaterial === 'all' || t.materials === filterMaterial;

        return matchesSearch && matchesMaterial;
    });

    const sortedTests = [...filteredTests].sort((a, b) => {
        let valA, valB;
        switch (sortField) {
            case 'price':
                valA = Number(a.price) || 0;
                valB = Number(b.price) || 0;
                break;
            case 'hsn':
                valA = (a.hsnCode || '').toLowerCase();
                valB = (b.hsnCode || '').toLowerCase();
                break;
            case 'materials':
                valA = (a.materials || '').toLowerCase();
                valB = (b.materials || '').toLowerCase();
                break;
            case 'name':
            default:
                valA = (a.testType || '').toLowerCase();
                valB = (b.testType || '').toLowerCase();
                break;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination calculations
    const totalPages = Math.ceil(sortedTests.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTests = sortedTests.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterMaterial, sortField, sortOrder]);

    const handleEdit = (test) => {
        setEditingTest({ ...test });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingTest({
            testType: '',
            materials: '',
            group: '',
            testMethodSpecification: '',
            numDays: 0,
            price: 0,
            hsnCode: '',
            tcList: [],
            techList: []
        });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (isAddingNew) {
                await addTest(editingTest);
                toast({ title: "Test Added", description: "New test has been successfully added." });

                // Telegram Notification
                const message = `🧪 *New Test Added*\n\nType: \`${editingTest.testType}\`\nPrice: \`${editingTest.price}\`\nAdded By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            } else {
                await updateTest(editingTest);
                toast({ title: "Test Updated", description: "Test details have been updated." });

                // Telegram Notification
                const message = `✏️ *Test Updated*\n\nType: \`${editingTest.testType}\`\nPrice: \`${editingTest.price}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            }
            setEditingTest(null);
            setIsAddingNew(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save test. " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (test) => {
        setDeleteConfirmation({
            isOpen: true,
            testId: test.id,
            testType: test.testType
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.testId) {
            try {
                await deleteTest(deleteConfirmation.testId);
                toast({ title: "Test Deleted", description: "The test has been removed.", variant: "destructive" });

                // Telegram Notification
                const message = `🗑️ *Test Deleted*\n\nType: \`${deleteConfirmation.testType}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            } catch (error) {
                console.error("Failed to delete test:", error);
                toast({ title: "Error", description: "Failed to delete test. " + error.message, variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, testId: null, testType: '' });
    };

    const handleChange = (field, value) => {
        setEditingTest(prev => ({ ...prev, [field]: value }));
    };

    const resetAll = () => {
        setSearchTerm('');
        setSortField('name');
        setSortOrder('asc');
        setFilterMaterial('all');
        setCurrentPage(1);
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(tests, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tests_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Export Successful", description: "Backup downloaded." });
    };

    const handleImportClick = () => {
        if (window.confirm("Warning: Importing data will OVERWRITE all current tests. This cannot be undone. Do you want to continue?")) {
            fileImportRef.current?.click();
        }
    };

    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (Array.isArray(importedData)) {
                    setTests(importedData);
                    toast({
                        title: "Import Loaded",
                        description: "Data loaded. Save individual changes to persist.",
                    });
                }
            } catch (err) {
                console.error(err);
                toast({ title: "Import Failed", variant: "destructive" });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const groups = ['Physical', 'Chemical'];

    if (editingTest) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-lg font-bold">{isAddingNew ? 'Add New Test' : 'Edit Test'}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingTest(null)} disabled={isSaving} className="h-9">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            size="sm"
                            className="bg-primary hover:bg-primary-dark flex items-center text-white h-9"
                            disabled={isSaving}
                        >
                            <Save className="w-3.5 h-3.5 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pb-8">
                    <div className="space-y-2">
                        <Label>Test Type</Label>
                        <Textarea
                            rows={2}
                            value={editingTest.testType}
                            onChange={(e) => handleChange('testType', e.target.value)}
                            placeholder="e.g. Organic Impurities Analysis"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Materials</Label>
                        <Input
                            value={editingTest.materials}
                            onChange={(e) => handleChange('materials', e.target.value)}
                            placeholder="e.g. Aggregate (Coarse)"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Group</Label>
                        <Select value={editingTest.group} onValueChange={(val) => handleChange('group', val)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Group" />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Test Method Specification</Label>
                        <Input
                            value={editingTest.testMethodSpecification}
                            onChange={(e) => handleChange('testMethodSpecification', e.target.value)}
                            placeholder="e.g. IS2385 (Part2)"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Num Days</Label>
                        <Input
                            type="number"
                            value={editingTest.numDays}
                            onChange={(e) => handleChange('numDays', Number(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Price (<Rupee />)</Label>
                        <Input
                            type="number"
                            value={editingTest.price}
                            onChange={(e) => handleChange('price', Number(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>HSN Code</Label>
                        <Select
                            value={editingTest.hsnCode || ''}
                            onValueChange={(value) => handleChange('hsnCode', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select HSN code" />
                            </SelectTrigger>
                            <SelectContent>
                                {hsnCodes.map((hsn) => (
                                    <SelectItem key={hsn.id} value={hsn.code}>
                                        {hsn.code} - {hsn.description}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:col-span-1">
                        <Label>Terms and Conditions</Label>
                        <ReactSelect
                            isMulti
                            name="tcList"
                            options={[...new Set(terms.map(t => t.term_type))].map(type => ({ value: type, label: type }))}
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Select Terms..."
                            value={
                                editingTest?.tcList?.map(type => ({
                                    value: type,
                                    label: type
                                })) || []
                            }
                            onChange={(selectedOptions) => {
                                handleChange('tcList', selectedOptions.map(option => option.value));
                            }}
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    minHeight: '40px',
                                    borderRadius: '0.5rem',
                                    borderColor: '#e5e7eb',
                                    '&:hover': {
                                        borderColor: '#6366f1' // primary color approx
                                    }
                                })
                            }}
                        />
                    </div>

                    <div className="space-y-2 md:col-span-1">
                        <Label>Technicals</Label>
                        <ReactSelect
                            isMulti
                            name="techList"
                            options={[...new Set(technicals.map(t => t.tech_type))].map(type => ({ value: type, label: type }))}
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Select Technicals..."
                            value={
                                editingTest?.techList?.map(type => ({
                                    value: type,
                                    label: type
                                })) || []
                            }
                            onChange={(selectedOptions) => {
                                handleChange('techList', selectedOptions.map(option => option.value));
                            }}
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    minHeight: '40px',
                                    borderRadius: '0.5rem',
                                    borderColor: '#e5e7eb',
                                    '&:hover': {
                                        borderColor: '#6366f1'
                                    }
                                })
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {/* Search Row */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search tests..."
                        className="pl-10 w-full h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg focus:ring-primary focus:border-primary transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters and Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Filter</span>
                            <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                                <SelectTrigger className="w-44 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                    <SelectValue placeholder="Materials" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueMaterials.map(m => (
                                        <SelectItem key={m} value={m}>{m === 'all' ? 'All Materials' : m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Sort</span>
                            <Select value={sortField} onValueChange={setSortField}>
                                <SelectTrigger className="w-32 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="materials">Materials</SelectItem>
                                    <SelectItem value="price">Price</SelectItem>
                                    <SelectItem value="hsn">HSN</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 border-gray-200 bg-gray-50/50 rounded-lg"
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                            >
                                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetAll}
                            disabled={!searchTerm && sortField === 'name' && sortOrder === 'asc' && filterMaterial === 'all'}
                            className="text-gray-400 hover:text-red-500 h-9 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            Reset
                        </Button>
                    </div>

                    <div className="w-full flex justify-end">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-xl">
                                <input
                                    type="file"
                                    ref={fileImportRef}
                                    onChange={handleImportFile}
                                    accept=".json"
                                    className="hidden"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleImportClick}
                                    className="h-9 px-3 text-xs text-gray-600 hover:bg-white hover:shadow-sm transition-all rounded-lg"
                                >
                                    <Upload className="w-3.5 h-3.5 mr-2" /> Import
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleExport}
                                    className="h-9 px-3 text-xs text-gray-600 hover:bg-white hover:shadow-sm transition-all rounded-lg"
                                >
                                    <Download className="w-3.5 h-3.5 mr-2" /> Export
                                </Button>
                            </div> */}

                            <Button
                                onClick={handleAddNew}
                                size="sm"
                                className="bg-primary hover:bg-primary-dark text-white h-9 px-4 rounded-lg shadow-sm text-xs font-semibold"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Test
                            </Button>
                        </div>
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
                        Showing {sortedTests.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, sortedTests.length)} of {sortedTests.length}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Test Type</th>
                            <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTests.map((test) => (
                            <tr key={test.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4">
                                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-700">
                                        <p className="font-bold text-gray-900">
                                            {test.testType}
                                        </p>
                                        <div className="w-full"></div>
                                        <p>
                                            <span className="font-semibold text-blue-900">Materials:</span>{' '}
                                            {test.materials}
                                        </p>

                                        <p>
                                            <span className="font-semibold text-blue-900">Method:</span>{' '}
                                            {test.testMethodSpecification || '-'}
                                        </p>

                                        <p>
                                            <span className="font-semibold text-blue-900">Price:</span>{' '}
                                            <Rupee />{test.price.toLocaleString()}
                                        </p>

                                        <p>
                                            <span className="font-semibold text-blue-900">HSN Code:</span>{' '}
                                            {test.hsnCode || '-'}
                                        </p>

                                    </div>
                                </td>

                                <td className="py-1 px-1 text-right">
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(test)}>
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(test)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </td>

                            </tr>
                        ))}
                    </tbody>

                </table>
            </div>

            {/* Pagination Controls - Bottom */}
            {totalPages > 1 && (
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
            )}

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, testId: null, testType: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Delete Test?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.testType}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Yes, Delete It
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminTestsManager;
