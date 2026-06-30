import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  Edit,
  Plus,
  Loader2,
  AlertCircle,
  SortAsc,
  SortDesc,
  Calendar,
  Save,
  Package,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePackages } from '@/contexts/PackagesContext';
import { useFieldTests } from '@/contexts/FieldTestsContext';
import { useLabTests } from '@/contexts/LabTestsContext';
import { useSampling } from '@/contexts/SamplingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
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
import ReactSelect from 'react-select';
import { themedReactSelectStyles } from '@/lib/reactSelectStyles';
import { sendTelegramNotification } from '@/lib/notifier';
import Rupee from '../Rupee';

const AdminPackagesManager = () => {
  const { packages, addPackage, updatePackage, deletePackage } = usePackages();
  const { fieldTests } = useFieldTests();
  const { labTests } = useLabTests();
  const { samplingData } = useSampling();
  const { user } = useAuth();
  const { toast } = useToast();
  const canManagePackages = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    itemId: null,
    name: '',
  });

  // Sorting, filtering, pagination states - matching DocumentsManager
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // States for adding item to the package inside the form
  const [addItemType, setAddItemType] = useState('test'); // 'service', 'test', 'sampling'
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [entryQty, setEntryQty] = useState(1);

  // Helper to get full name of an item inside a package
  const getItemDetails = (type, id) => {
    if (type === 'service') {
      const ft = fieldTests.find((x) => x.id === id);
      return { name: ft?.fieldTestType || 'Unknown Field Test', price: ft?.price || 0 };
    } else if (type === 'sampling') {
      const s = samplingData.find((x) => x.id === id);
      return { name: s?.name || 'Unknown Sampling', price: s?.price || 0 };
    } else {
      const lt = labTests.find((x) => x.id === id);
      return { name: lt?.testType || 'Unknown Lab Test', price: lt?.price || 0 };
    }
  };

  // Filter and sort packages
  const filteredData = packages.filter((pkg) => {
    const nameMatch = (pkg.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Check if search matches any item inside the package
    const itemsMatch = pkg.items?.some((item) => {
      const details = getItemDetails(item.type, item.id);
      return details.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return nameMatch || itemsMatch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let valA, valB;
    switch (sortField) {
      case 'name':
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
        break;
      case 'itemsCount':
        valA = a.items?.length || 0;
        valB = b.items?.length || 0;
        break;
      case 'date':
      default:
        valA = new Date(a.createdAt || a.created_at || 0).getTime();
        valB = new Date(b.createdAt || b.created_at || 0).getTime();
        break;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortOrder]);

  const resetAll = () => {
    setSearchTerm('');
    setSortField('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handleEdit = (item) => {
    setEditingItem(JSON.parse(JSON.stringify(item))); // deep clone
    setIsAddingNew(false);
    setSelectedEntryId('');
    setEntryQty(1);
  };

  const handleAddNew = () => {
    setEditingItem({
      name: '',
      items: [],
    });
    setIsAddingNew(true);
    setSelectedEntryId('');
    setEntryQty(1);
  };

  const handleSave = async () => {
    if (!editingItem.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Package Name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!editingItem.items || editingItem.items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one test or sampling entry must be added to the package.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isAddingNew) {
        await addPackage(editingItem);
        toast({
          title: 'Package Added',
          description: 'New package has been successfully created.',
        });
        sendTelegramNotification(
          `📦 *New Package Created*\n\nName: \`${editingItem.name}\`\nEntries: \`${editingItem.items.length}\`\nCreated By: \`${user?.fullName || 'Unknown'}\``
        );
      } else {
        await updatePackage(editingItem);
        toast({
          title: 'Package Updated',
          description: 'Package details have been updated.',
        });
        sendTelegramNotification(
          `✏️ *Package Updated*\n\nName: \`${editingItem.name}\`\nEntries: \`${editingItem.items.length}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``
        );
      }
      setEditingItem(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to save package: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (item) => {
    setDeleteConfirmation({
      isOpen: true,
      itemId: item.id,
      name: item.name,
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.itemId) {
      try {
        await deletePackage(deleteConfirmation.itemId);
        toast({
          title: 'Package Deleted',
          description: 'The package has been removed.',
          variant: 'destructive',
        });
        sendTelegramNotification(
          `🗑️ *Package Deleted*\n\nName: \`${deleteConfirmation.name}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``
        );
      } catch (error) {
        console.error('Error deleting package:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete package: ' + error.message,
          variant: 'destructive',
        });
      }
    }
    setDeleteConfirmation({ isOpen: false, itemId: null, name: '' });
  };

  const handleAddEntryToPackage = () => {
    if (!selectedEntryId) {
      toast({
        title: 'Selection Error',
        description: 'Please select an item to add.',
        variant: 'destructive',
      });
      return;
    }

    const exists = editingItem.items.some(
      (x) => x.type === addItemType && x.id === selectedEntryId
    );
    if (exists) {
      toast({
        title: 'Duplicate Item',
        description: 'This item is already in the package.',
        variant: 'destructive',
      });
      return;
    }

    const newItem = {
      type: addItemType,
      id: selectedEntryId,
      qty: Number(entryQty) || 1,
    };

    setEditingItem((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setSelectedEntryId('');
    setEntryQty(1);
  };

  const handleRemoveEntryFromPackage = (index) => {
    setEditingItem((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const getEntrySelectOptions = () => {
    if (addItemType === 'service') {
      return fieldTests.map((x) => ({ value: x.id, label: x.fieldTestType }));
    } else if (addItemType === 'sampling') {
      return samplingData.map((x) => ({
        value: x.id,
        label: `${x.name} - ${Array.isArray(x.materials) ? x.materials.join(', ') : x.materials || ''}`,
      }));
    } else {
      return labTests.map((x) => ({
        value: x.id,
        label: `${x.testType} - ${Array.isArray(x.materials) ? x.materials.join(', ') : x.materials || ''}`,
      }));
    }
  };

  if (editingItem && canManagePackages) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              {isAddingNew ? 'Create New Package' : 'Edit Package Details'}
            </h2>
            <p className="text-gray-500 font-medium text-xs uppercase tracking-wider mt-1 ml-8">
              Bundle multiple tests and samplings into a single package
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
              disabled={isSaving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary-dark flex items-center text-white rounded-xl px-6"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Package'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">
              Package Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={editingItem.name}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              placeholder="e.g. Geotechnical Investigation Standard Package"
              className="rounded-xl h-12 text-md"
            />
          </div>

          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Add Entry to Package
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3 space-y-2">
                <Label className="text-xs font-semibold text-gray-500">Entry Type</Label>
                <Select
                  value={addItemType}
                  onValueChange={(val) => {
                    setAddItemType(val);
                    setSelectedEntryId('');
                  }}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Lab Test</SelectItem>
                    <SelectItem value="service">Field Test</SelectItem>
                    <SelectItem value="sampling">Sampling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-6 space-y-2">
                <Label className="text-xs font-semibold text-gray-500">Select Item</Label>
                <ReactSelect
                  className="basic-single"
                  classNamePrefix="select"
                  placeholder={`Search ${addItemType === 'service' ? 'Field Test' : addItemType === 'sampling' ? 'Sampling' : 'Lab Test'}...`}
                  options={getEntrySelectOptions()}
                  value={
                    selectedEntryId
                      ? getEntrySelectOptions().find((o) => o.value === selectedEntryId)
                      : null
                  }
                  onChange={(opt) => setSelectedEntryId(opt ? opt.value : '')}
                  styles={themedReactSelectStyles({ minHeight: '44px', borderRadius: '0.75rem' })}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-gray-500">Default Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={entryQty}
                  onChange={(e) => setEntryQty(Number(e.target.value) || 1)}
                  className="rounded-xl h-11 bg-white"
                />
              </div>

              <div className="md:col-span-1">
                <Button
                  type="button"
                  onClick={handleAddEntryToPackage}
                  className="w-full h-11 bg-primary hover:bg-primary-dark text-white rounded-xl"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
              Package Entries ({editingItem.items?.length || 0})
            </h3>
            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] w-[8%]">
                      Sl No.
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] w-[15%]">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] w-[45%]">
                      Name / Description
                    </th>
                    <th className="text-right py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] w-[12%]">
                      Base Price
                    </th>
                    <th className="text-right py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] w-[10%]">
                      Qty
                    </th>
                    <th className="text-right py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] w-[10%]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {editingItem.items?.map((item, index) => {
                    const details = getItemDetails(item.type, item.id);
                    const typeLabel =
                      item.type === 'service'
                        ? 'Field Test'
                        : item.type === 'sampling'
                          ? 'Sampling'
                          : 'Lab Test';

                    return (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-gray-500 font-medium">{index + 1}.</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              item.type === 'service'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : item.type === 'sampling'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                            }`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-medium">{details.name}</td>
                        <td className="py-3 px-4 text-right text-gray-600 font-medium">
                          <Rupee /> {details.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 font-bold">{item.qty}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                            onClick={() => handleRemoveEntryFromPackage(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!editingItem.items || editingItem.items.length === 0) && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400 italic">
                        No entries added to this package yet. Use the form above to add samplings or
                        tests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full pb-12">
      <div className="flex flex-col gap-4">
        {/* Row 1: Search and Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search packages by name or items..."
              className="pl-10 h-10 text-sm bg-white border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canManagePackages && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddNew}
                  className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create Package
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                <p className="text-xs">Create a new test bundle package</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Row 2: Sorting, and Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
                Sort
              </span>
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-40 h-10 text-sm bg-white border-gray-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date Created</SelectItem>
                  <SelectItem value="name">Package Name</SelectItem>
                  <SelectItem value="itemsCount">Items Count</SelectItem>
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 border-gray-200 bg-white rounded-lg"
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
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              disabled={!searchTerm && sortField === 'date' && sortOrder === 'desc'}
              className="text-gray-400 hover:text-red-500 h-10 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              Reset
            </Button>
          </div>

          <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">
            Showing{' '}
            <span className="text-primary">
              {sortedData.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, sortedData.length)}
            </span>{' '}
            of <span className="text-primary">{sortedData.length}</span> Packages
          </div>
        </div>
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
            Showing {sortedData.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, sortedData.length)} of {sortedData.length}
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

      {/* Packages Table - Beautifully matching DocumentsManager layout */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap w-[20%]">
                  Package Name
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] w-[40%]">
                  Included Items
                </th>
                <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap w-[10%]">
                  Items Count
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap w-[10%]">
                  Created On
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap w-[10%]">
                  Created By
                </th>
                {canManagePackages && (
                  <th className="text-center py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap w-[10%]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManagePackages ? 6 : 5}
                    className="py-12 text-center text-gray-500"
                  >
                    No packages found. {canManagePackages && 'Create a new package to get started!'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4 align-top">
                      <div className="font-bold text-gray-900 text-sm break-words">{pkg.name}</div>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="border border-gray-100/80 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                              <th className="py-1.5 px-3 font-bold text-gray-400 uppercase tracking-wider text-[9px] w-[65%]">
                                Item Name
                              </th>
                              <th className="py-1.5 px-3 font-bold text-gray-400 uppercase tracking-wider text-[9px] text-center w-[20%]">
                                Type
                              </th>
                              <th className="py-1.5 px-3 font-bold text-gray-400 uppercase tracking-wider text-[9px] text-right w-[15%]">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 bg-white-100">
                            {pkg.items?.map((item, idx) => {
                              const details = getItemDetails(item.type, item.id);
                              const typeLabel =
                                item.type === 'service'
                                  ? 'Field Test'
                                  : item.type === 'sampling'
                                    ? 'Sampling'
                                    : 'Lab Test';
                              const typeColor =
                                item.type === 'service'
                                  ? 'text-amber-600   border-amber-100/50'
                                  : item.type === 'sampling'
                                    ? 'text-emerald-600   border-emerald-100/50'
                                    : 'text-indigo-600   border-indigo-100/50';

                              return (
                                <tr
                                  key={`${item.type}-${item.id}-${idx}`}
                                  className="hover:bg-gray-50/30"
                                >
                                  <td className="py-2 px-3 text-gray-700 font-medium break-words leading-tight">
                                    {details.name}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span
                                      className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${typeColor}`}
                                    >
                                      {typeLabel}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-gray-900 font-bold tabular-nums">
                                    {item.qty}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center align-top whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        {pkg.items?.length || 0}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap align-top text-gray-600">
                      {pkg.createdAt || pkg.created_at
                        ? format(new Date(pkg.createdAt || pkg.created_at), 'dd MMM yyyy')
                        : '-'}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap align-top text-gray-600">
                      {pkg.users?.full_name || 'System'}
                    </td>

                    {canManagePackages && (
                      <td className="py-4 px-4 align-top text-center">
                        <div className="flex justify-center items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl hover:bg-gray-100"
                                onClick={() => handleEdit(pkg)}
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Package</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-xl"
                                onClick={() => handleDeleteClick(pkg)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Package</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteConfirmation({ isOpen: false, itemId: null, name: '' })
        }
      >
        <AlertDialogContent className="rounded-3xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Delete Package?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium mt-2">
              Are you sure you want to delete{' '}
              <span className="font-bold text-gray-900">"{deleteConfirmation.name}"</span>? This
              action will remove the package template but won't affect any documents where this
              package was already added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 rounded-xl px-6"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPackagesManager;
