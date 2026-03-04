
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, Search, Download, Upload, AlertCircle, SortAsc, SortDesc } from 'lucide-react';
import Rupee from '../Rupee';
import { useServices } from '@/contexts/ServicesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUnitTypes } from '@/contexts/UnitTypesContext';
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

const AdminServicesManager = () => {
    const { services, updateService, addService, deleteService, setServices } = useServices();
    const { unitTypes } = useUnitTypes();
    const { hsnCodes } = useHSNCodes();
    const { terms } = useTermsAndConditions();
    const { technicals } = useTechnicals();
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingService, setEditingService] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, serviceId: null, serviceType: '' });
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterUnit, setFilterUnit] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const fileImportRef = useRef(null);

    const uniqueUnits = ['all', ...new Set(services.map(s => s.unit).filter(Boolean).sort())];

    const filteredServices = services.filter(s => {
        const matchesSearch =
            (s.serviceType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (s.price?.toString() || '').includes(searchTerm) ||
            (s.hsnCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (s.unit?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (s.id?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesUnit = filterUnit === 'all' || s.unit === filterUnit;

        return matchesSearch && matchesUnit;
    });

    const sortedServices = [...filteredServices].sort((a, b) => {
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
            case 'name':
            default:
                valA = (a.serviceType || '').toLowerCase();
                valB = (b.serviceType || '').toLowerCase();
                break;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination calculations
    const totalPages = Math.ceil(sortedServices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedServices = sortedServices.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterUnit, sortField, sortOrder]);

    const handleEdit = (service) => {
        setEditingService({ ...service });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingService({
            serviceType: '',
            price: 0,
            unit: '',
            qty: 1,
            methodOfSampling: 'NA',
            numBHs: 0,
            measure: 'NA',
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
                await addService(editingService);
                toast({ title: "Service Added", description: "New service has been successfully added." });

                // Telegram Notification
                const message = `🛠️ *New Service Added*\n\nType: \`${editingService.serviceType}\`\nPrice: \`${editingService.price}\`\nAdded By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            } else {
                await updateService(editingService);
                toast({ title: "Service Updated", description: "Service details have been updated." });

                // Telegram Notification
                const message = `✏️ *Service Updated*\n\nType: \`${editingService.serviceType}\`\nPrice: \`${editingService.price}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            }
            setEditingService(null);
            setIsAddingNew(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save service. " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (service) => {
        setDeleteConfirmation({
            isOpen: true,
            serviceId: service.id,
            serviceType: service.serviceType
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.serviceId) {
            try {
                await deleteService(deleteConfirmation.serviceId);
                toast({ title: "Service Deleted", description: "The service has been removed.", variant: "destructive" });

                // Telegram Notification
                const message = `🗑️ *Service Deleted*\n\nType: \`${deleteConfirmation.serviceType}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            } catch (error) {
                console.error("Error deleting service:", error);
                toast({ title: "Error", description: "Failed to delete service. " + error.message, variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, serviceId: null, serviceType: '' });
    };

    const handleChange = (field, value) => {
        setEditingService(prev => ({ ...prev, [field]: value }));
    };

    const resetAll = () => {
        setSearchTerm('');
        setSortField('name');
        setSortOrder('asc');
        setFilterUnit('all');
        setCurrentPage(1);
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(services, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `services_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Export Successful", description: "Backup downloaded." });
    };

    const handleImportClick = () => {
        if (window.confirm("Warning: Importing data will OVERWRITE all current services. This cannot be undone. Do you want to continue?")) {
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
                    setServices(importedData);
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

    if (editingService) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-lg font-bold">{isAddingNew ? 'Add New Service' : 'Edit Service'}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingService(null)} disabled={isSaving} className="h-9">
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
                        <Label>Service Type</Label>
                        <Textarea
                            rows={2}
                            value={editingService.serviceType}
                            onChange={(e) => handleChange('serviceType', e.target.value)}
                            placeholder="e.g. Drilling Upto 10m"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Price (<Rupee />)</Label>
                        <Input
                            type="number"
                            value={editingService.price}
                            onChange={(e) => handleChange('price', Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select
                            value={editingService.unit}
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
                            value={editingService.qty}
                            onChange={(e) => handleChange('qty', Number(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Method of Sampling</Label>
                        <Select
                            value={editingService.methodOfSampling || 'NA'}
                            onValueChange={(value) => handleChange('methodOfSampling', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Rotary">Rotary</SelectItem>
                                <SelectItem value="Hydraulic">Hydraulic</SelectItem>
                                <SelectItem value="Calyx">Calyx</SelectItem>
                                <SelectItem value="NA">NA</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Number of BHs</Label>
                        <Input
                            type="number"
                            min="0"
                            value={editingService.numBHs ?? 0}
                            onChange={(e) => handleChange('numBHs', Number(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Measure</Label>
                        <Select
                            value={editingService.measure || 'NA'}
                            onValueChange={(value) => handleChange('measure', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select measure" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Per BH">Per BH</SelectItem>
                                <SelectItem value="Per Sample">Per Sample</SelectItem>
                                <SelectItem value="NA">NA</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>HSN Code</Label>
                        <Select
                            value={editingService.hsnCode || ''}
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

                    <div className="space-y-2 md:col-span-1">
                        <Label>Terms and Conditions</Label>
                        <ReactSelect
                            isMulti
                            name="tcList"
                            options={[...new Set(terms.map(t => t.term_type))].map(type => ({ value: type, label: type }))}
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Select Terms and Conditions..."
                            value={
                                editingService?.tcList?.map(type => ({
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
                            placeholder="Select Technical Lists..."
                            value={
                                editingService?.techList?.map(type => ({
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
                        placeholder="Search services..."
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
                            <Select value={filterUnit} onValueChange={setFilterUnit}>
                                <SelectTrigger className="w-32 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                                    <SelectValue placeholder="Units" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueUnits.map(u => (
                                        <SelectItem key={u} value={u}>{u === 'all' ? 'All Units' : u}</SelectItem>
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
                            disabled={!searchTerm && sortField === 'name' && sortOrder === 'asc' && filterUnit === 'all'}
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
                                <Plus className="w-4 h-4 mr-2" /> Add Service
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
                        Showing {sortedServices.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, sortedServices.length)} of {sortedServices.length}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Service Type</th>
                            <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedServices.map((service) => (
                            <tr key={service.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4">
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                                        <p className="font-bold text-gray-900 ">
                                            {service.serviceType}
                                        </p>
                                        <div className="w-full"></div>
                                        <p>
                                            <span className="font-semibold text-blue-900">Price:</span>{' '}
                                            <Rupee />{service.price.toLocaleString()}
                                        </p>

                                        <p>
                                            <span className="font-semibold text-blue-900">Unit:</span>{' '}
                                            {service.unit}
                                        </p>

                                        <p>
                                            <span className="font-semibold text-blue-900">Method:</span>{' '}
                                            {service.methodOfSampling || 'NA'}
                                        </p>

                                        <p>
                                            <span className="font-semibold text-blue-900"># BHs:</span>{' '}
                                            {service.numBHs ?? 0}
                                        </p>

                                        <p>
                                            <span className="font-semibold text-blue-900">Measure:</span>{' '}
                                            {service.measure || 'NA'}
                                        </p>

                                        <p>
                                            <span className="font-semibold text-blue-900">HSN Code:</span>{' '}
                                            {service.hsnCode || '-'}
                                        </p>
                                    </div>
                                </td>

                                <td className="py-1 px-1 text-right">
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(service)}>
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

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, serviceId: null, serviceType: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Delete Service?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.serviceType}</span>?
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

export default AdminServicesManager;
