import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle, SortAsc, SortDesc } from 'lucide-react';
import Rupee from '../Rupee';
import { useSampling } from '@/contexts/SamplingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUnitTypes } from '@/contexts/UnitTypesContext';
import { useHSNCodes } from '@/contexts/HSNCodesContext';
import { useTermsAndConditions } from '@/contexts/TermsAndConditionsContext';
import { useTechnicals } from '@/contexts/TechnicalsContext';
import { useMaterials } from '@/contexts/MaterialsContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import ReactSelect from 'react-select';

const AdminSamplingManager = () => {
    const { samplingData, updateSampling, addSampling, deleteSampling } = useSampling();
    const { unitTypes } = useUnitTypes();
    const { hsnCodes } = useHSNCodes();
    const { terms } = useTermsAndConditions();
    const { technicals } = useTechnicals();
    const { materials } = useMaterials();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, itemId: null, serviceType: '' });
    
    const [sortField, setSortField] = useState('serviceType');
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterMaterial, setFilterMaterial] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const uniqueMaterials = ['all', ...materials.map(m => m.name)];

    const filteredData = samplingData.filter(s => {
        const matchesSearch =
            (s.serviceType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (Array.isArray(s.materials) ? s.materials.join(', ') : (s.materials || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.group?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (s.hsnCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (s.id?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesMaterial = filterMaterial === 'all' || (Array.isArray(s.materials) ? s.materials.includes(filterMaterial) : s.materials === filterMaterial);

        return matchesSearch && matchesMaterial;
    });

    const sortedData = [...filteredData].sort((a, b) => {
        let valA = (a[sortField] || '').toString().toLowerCase();
        let valB = (b[sortField] || '').toString().toLowerCase();
        
        if (sortField === 'price' || sortField === 'qty') {
            valA = Number(a[sortField]) || 0;
            valB = Number(b[sortField]) || 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterMaterial, sortField, sortOrder]);

    const resetAll = () => {
        setSearchTerm('');
        setSortField('serviceType');
        setSortOrder('asc');
        setFilterMaterial('all');
        setCurrentPage(1);
    };

    const handleEdit = (item) => {
        setEditingItem({ ...item });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingItem({
            serviceType: '',
            materials: [],
            group: '',
            testMethodSpecification: '',
            unit: '',
            qty: 1,
            price: 0,
            hsnCode: '',
            tcList: [],
            techList: []
        });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (!editingItem.serviceType) {
            toast({ title: "Validation Error", description: "Sampling Type is required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (isAddingNew) {
                await addSampling(editingItem);
                toast({ title: "Sampling item Added", description: "New sampling record has been successfully added." });
                sendTelegramNotification(`🧪 *New Sampling Added*\n\nType: \`${editingItem.serviceType}\`\nPrice: \`${editingItem.price}\`\nAdded By: \`${user?.fullName || 'Unknown'}\``);
            } else {
                await updateSampling(editingItem);
                toast({ title: "Sampling item Updated", description: "Sampling details have been updated." });
                sendTelegramNotification(`✏️ *Sampling Updated*\n\nType: \`${editingItem.serviceType}\`\nPrice: \`${editingItem.price}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``);
            }
            setEditingItem(null);
            setIsAddingNew(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save sampling data. " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (item) => {
        setDeleteConfirmation({
            isOpen: true,
            itemId: item.id,
            serviceType: item.serviceType
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.itemId) {
            try {
                await deleteSampling(deleteConfirmation.itemId);
                toast({ title: "Sampling item Deleted", description: "The record has been removed.", variant: "destructive" });
                sendTelegramNotification(`🗑️ *Sampling Deleted*\n\nType: \`${deleteConfirmation.serviceType}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``);
            } catch (error) {
                console.error("Error deleting sampling:", error);
                toast({ title: "Error", description: "Failed to delete item. " + error.message, variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, itemId: null, serviceType: '' });
    };

    const handleChange = (field, value) => {
        setEditingItem(prev => ({ ...prev, [field]: value }));
    };

    if (editingItem) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Sampling Record' : 'Edit Sampling Record'}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setEditingItem(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary-dark flex items-center text-white"
                            disabled={isSaving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 md:col-span-2">
                        <div className="space-y-2">
                            <Label>Sampling Type <span className="text-red-500">*</span></Label>
                            <Textarea
                                rows={2}
                                value={editingItem.serviceType}
                                onChange={(e) => handleChange('serviceType', e.target.value)}
                                placeholder="e.g. Drilling Upto 10m"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Materials</Label>
                        <ReactSelect
                            isMulti
                            options={materials.map(m => ({ value: m.name, label: m.name }))}
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Select Materials..."
                            value={editingItem.materials?.map(m => ({ value: m, label: m })) || []}
                            onChange={(options) => handleChange('materials', options.map(o => o.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Group</Label>
                        <Select
                            value={editingItem.group}
                            onValueChange={(value) => handleChange('group', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select group" />
                            </SelectTrigger>
                            <SelectContent>
                                {['Physical', 'Chemical'].map((g) => (
                                    <SelectItem key={g} value={g}>
                                        {g}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Test Method Specification</Label>
                        <Input
                            value={editingItem.testMethodSpecification}
                            onChange={(e) => handleChange('testMethodSpecification', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Price (<Rupee />)</Label>
                        <Input
                            type="number"
                            value={editingItem.price}
                            onChange={(e) => handleChange('price', Number(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select
                            value={editingItem.unit}
                            onValueChange={(value) => handleChange('unit', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {unitTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.unit_type}>
                                        {type.unit_type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Quantity (Default)</Label>
                        <Input
                            type="number"
                            value={editingItem.qty}
                            onChange={(e) => handleChange('qty', Number(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>HSN Code</Label>
                        <Select
                            value={editingItem.hsnCode || ''}
                            onValueChange={(value) => handleChange('hsnCode', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select HSN code" />
                            </SelectTrigger>
                            <SelectContent>
                                {hsnCodes.map((hsn) => (
                                    <SelectItem key={hsn.id} value={hsn.code} className="text-sm">
                                        {hsn.code} - {hsn.description}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Terms and Conditions</Label>
                        <ReactSelect
                            isMulti
                            options={[...new Set(terms.map(t => t.type))].map(type => ({ value: type, label: type }))}
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Select T&C..."
                            value={editingItem.tcList?.map(t => ({ value: t, label: t })) || []}
                            onChange={(options) => handleChange('tcList', options.map(o => o.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Technicals</Label>
                        <ReactSelect
                            isMulti
                            options={[...new Set(technicals.map(t => t.type))].map(type => ({ value: type, label: type }))}
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Select Technicals..."
                            value={editingItem.techList?.map(t => ({ value: t, label: t })) || []}
                            onChange={(options) => handleChange('techList', options.map(o => o.value))}
                        />
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
                            placeholder="Search sampling items..."
                            className="pl-10 w-full h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={handleAddNew}
                        className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Sampling Record
                    </Button>
                </div>

                {/* Filters and Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Filter</span>
                            <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                                <SelectTrigger className="w-44 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
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
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Sort</span>
                            <Select value={sortField} onValueChange={setSortField}>
                                <SelectTrigger className="w-32 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="serviceType">Name</SelectItem>
                                    <SelectItem value="price">Price</SelectItem>
                                    <SelectItem value="qty">Qty</SelectItem>
                                    <SelectItem value="hsnCode">HSN</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 border-gray-200 bg-gray-50/50 rounded-lg"
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
                            disabled={!searchTerm && sortField === 'serviceType' && sortOrder === 'asc' && filterMaterial === 'all'}
                            className="text-gray-400 hover:text-red-500 h-10 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            Reset
                        </Button>
                    </div>

                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Sampling Details</th>
                                <th className="text-right py-3 px-4 font-semibold text-sm text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item) => (
                                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-700">
                                            <p className="font-bold text-gray-900">
                                                {item.serviceType}
                                            </p>
                                            <div className="w-full"></div>
                                            <p>
                                                <span className="font-semibold text-blue-900">Materials:</span>{' '}
                                                {Array.isArray(item.materials) ? item.materials.join(', ') : (item.materials || '-')}
                                            </p>
                                            <p>
                                                <span className="font-semibold text-blue-900">Group:</span>{' '}
                                                {item.group || '-'}
                                            </p>
                                            <p>
                                                <span className="font-semibold text-blue-900">Method:</span>{' '}
                                                {item.testMethodSpecification || '-'}
                                            </p>
                                            <p>
                                                <span className="font-semibold text-blue-900">Price:</span>{' '}
                                                <Rupee />{item.price.toLocaleString()}
                                            </p>
                                            <p>
                                                <span className="font-semibold text-blue-900">Unit:</span>{' '}
                                                {item.unit || '-'}
                                            </p>
                                            <p>
                                                <span className="font-semibold text-blue-900">Qty (Default):</span>{' '}
                                                {item.qty || '1'}
                                            </p>
                                            <p>
                                                <span className="font-semibold text-blue-900">HSN Code:</span>{' '}
                                                {item.hsnCode || '-'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-1 px-1 text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                <Edit className="w-4 h-4 text-gray-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic">
                                        No sampling records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between">
                        <span className="text-gray-600">Page {currentPage} of {totalPages}</span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && setDeleteConfirmation({ isOpen: false, itemId: null, serviceType: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> Delete Sampling Record?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.serviceType}</span>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminSamplingManager;
