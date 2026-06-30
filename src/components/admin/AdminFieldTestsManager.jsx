import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Search,
  Download,
  Upload,
  AlertCircle,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Rupee from '../Rupee';
import { useFieldTests } from '@/contexts/FieldTestsContext';
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
} from '@/components/ui/select';
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
import ReactSelect from 'react-select';
import { DOCUMENT_ITEM_TYPES } from '@/data/config';
import { themedReactSelectStyles } from '@/lib/reactSelectStyles';

const AdminFieldTestsManager = () => {
  const { fieldTests, updateFieldTest, addFieldTest, deleteFieldTest, setFieldTests } =
    useFieldTests();
  const { unitTypes } = useUnitTypes();
  const { hsnCodes } = useHSNCodes();
  const { terms } = useTermsAndConditions();
  const { technicals } = useTechnicals();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFieldTest, setEditingFieldTest] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    fieldTestId: null,
    fieldTestType: '',
  });
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterUnit, setFilterUnit] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileImportRef = useRef(null);

  const uniqueUnits = [
    'all',
    ...new Set(
      fieldTests
        .map((s) => s.unit)
        .filter(Boolean)
        .sort()
    ),
  ];

  const filteredFieldTests = fieldTests.filter((s) => {
    const matchesSearch =
      (s.fieldTestType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.price?.toString() || '').includes(searchTerm) ||
      (s.hsnCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.unit?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.id?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesUnit = filterUnit === 'all' || s.unit === filterUnit;

    return matchesSearch && matchesUnit;
  });

  const sortedFieldTests = [...filteredFieldTests].sort((a, b) => {
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
        valA = (a.fieldTestType || '').toLowerCase();
        valB = (b.fieldTestType || '').toLowerCase();
        break;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedFieldTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFieldTests = sortedFieldTests.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterUnit, sortField, sortOrder]);

  const handleEdit = (fieldTest) => {
    setEditingFieldTest({ ...fieldTest });
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setEditingFieldTest({
      fieldTestType: '',
      price: 0,
      unit: '',
      qty: 1,
      methodOfSampling: 'NA',
      numBHs: 0,
      measure: 'NA',
      hsnCode: '',
      tcList: [],
      techList: [],
      numDays: 1,
    });
    setIsAddingNew(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isAddingNew) {
        await addFieldTest(editingFieldTest);
        toast({
          title: 'Field Test Added',
          description: 'New field test has been successfully added.',
        });

        // Telegram Notification
        const message = `🛠️ *New Field Test Added*\n\nType: \`${editingFieldTest.fieldTestType}\`\nPrice: \`${editingFieldTest.price}\`\nAdded By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      } else {
        await updateFieldTest(editingFieldTest);
        toast({
          title: 'Field Test Updated',
          description: 'Field test details have been updated.',
        });

        // Telegram Notification
        const message = `✏️ *Field Test Updated*\n\nType: \`${editingFieldTest.fieldTestType}\`\nPrice: \`${editingFieldTest.price}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      }
      setEditingFieldTest(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to save field test. ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (fieldTest) => {
    setDeleteConfirmation({
      isOpen: true,
      fieldTestId: fieldTest.id,
      fieldTestType: fieldTest.fieldTestType,
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.fieldTestId) {
      try {
        await deleteFieldTest(deleteConfirmation.fieldTestId);
        toast({
          title: 'Field Test Deleted',
          description: 'The field test has been removed.',
          variant: 'destructive',
        });

        // Telegram Notification
        const message = `🗑️ *Field Test Deleted*\n\nType: \`${deleteConfirmation.fieldTestType}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      } catch (error) {
        console.error('Error deleting field test:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete field test. ' + error.message,
          variant: 'destructive',
        });
      }
    }
    setDeleteConfirmation({ isOpen: false, fieldTestId: null, fieldTestType: '' });
  };

  const handleChange = (field, value) => {
    setEditingFieldTest((prev) => ({ ...prev, [field]: value }));
  };

  const resetAll = () => {
    setSearchTerm('');
    setSortField('name');
    setSortOrder('asc');
    setFilterUnit('all');
    setCurrentPage(1);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(fieldTests, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `field_tests_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: 'Backup downloaded.' });
  };

  const handleImportClick = () => {
    if (
      window.confirm(
        'Warning: Importing data will OVERWRITE all current field tests. This cannot be undone. Do you want to continue?'
      )
    ) {
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
          setFieldTests(importedData);
          toast({
            title: 'Import Loaded',
            description: 'Data loaded. Save individual changes to persist.',
          });
        }
      } catch (err) {
        console.error(err);
        toast({ title: 'Import Failed', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (editingFieldTest) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold">
            {isAddingNew ? 'Add New Field Test' : 'Edit Field Test'}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditingFieldTest(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary-dark flex items-center text-white"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pb-8">
          <div className="space-y-2">
            <Label>Field Test Type</Label>
            <Textarea
              rows={2}
              value={editingFieldTest.fieldTestType}
              onChange={(e) => handleChange('fieldTestType', e.target.value)}
              placeholder="e.g. Drilling Upto 10m"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              Price (<Rupee />)
            </Label>
            <Input
              type="number"
              value={editingFieldTest.price}
              onChange={(e) => handleChange('price', Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select
              value={editingFieldTest.unit}
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
              value={editingFieldTest.qty}
              onChange={(e) => handleChange('qty', Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Method of Sampling</Label>
            <Select
              value={editingFieldTest.methodOfSampling || 'NA'}
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
              value={editingFieldTest.numBHs ?? 0}
              onChange={(e) => handleChange('numBHs', Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Number of Days</Label>
            <Input
              type="number"
              min="1"
              value={editingFieldTest.numDays ?? 1}
              onChange={(e) => handleChange('numDays', Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Measure</Label>
            <Select
              value={editingFieldTest.measure || 'NA'}
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
              value={editingFieldTest.hsnCode || ''}
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
              options={[...new Set(terms.map((t) => t.type))].map((type) => ({
                value: type,
                label: type,
              }))}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Select Terms and Conditions..."
              value={
                editingFieldTest?.tcList?.map((type) => ({
                  value: type,
                  label: type,
                })) || []
              }
              onChange={(selectedOptions) => {
                handleChange(
                  'tcList',
                  selectedOptions ? selectedOptions.map((option) => option.value) : []
                );
              }}
              styles={themedReactSelectStyles()}
            />
          </div>

          <div className="space-y-2 md:col-span-1">
            <Label>Technicals</Label>
            <ReactSelect
              isMulti
              name="techList"
              options={[...new Set(technicals.map((t) => t.type))].map((type) => ({
                value: type,
                label: type,
              }))}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Select Technical Lists..."
              value={
                editingFieldTest?.techList?.map((type) => ({
                  value: type,
                  label: type,
                })) || []
              }
              onChange={(selectedOptions) => {
                handleChange(
                  'techList',
                  selectedOptions ? selectedOptions.map((option) => option.value) : []
                );
              }}
              styles={themedReactSelectStyles()}
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
              placeholder="Search field tests..."
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
                <Plus className="w-4 h-4 mr-2" /> Add Field Test
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Add a new field testing service to the catalog</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Filters and Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
                Filter
              </span>
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger className="w-32 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                  <SelectValue placeholder="Units" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueUnits.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u === 'all' ? 'All Units' : u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
                Sort
              </span>
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-32 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="hsn">HSN</SelectItem>
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

            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              disabled={
                !searchTerm && sortField === 'name' && sortOrder === 'asc' && filterUnit === 'all'
              }
              className="text-gray-400 hover:text-red-500 h-10 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              Reset
            </Button>
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
            Showing {sortedFieldTests.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, sortedFieldTests.length)} of {sortedFieldTests.length}
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
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  {DOCUMENT_ITEM_TYPES.FIELD_TESTS.label}
                </th>
                <th className="text-right py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedFieldTests.map((fieldTest) => (
                <tr
                  key={fieldTest.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4 align-top text-gray-600">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                      <p className="font-bold text-gray-900 whitespace-pre-wrap">
                        {fieldTest.fieldTestType}
                      </p>
                      <div className="w-full"></div>
                      <p>
                        <span className="font-semibold text-primary">Price:</span> <Rupee />
                        {fieldTest.price.toLocaleString()}
                      </p>

                      <p>
                        <span className="font-semibold text-primary">Unit:</span> {fieldTest.unit}
                      </p>

                      <p>
                        <span className="font-semibold text-primary">Method:</span>{' '}
                        {fieldTest.methodOfSampling || 'NA'}
                      </p>

                      <p>
                        <span className="font-semibold text-primary"># BHs:</span>{' '}
                        {fieldTest.numBHs ?? 0}
                      </p>

                      <p>
                        <span className="font-semibold text-primary"># Days:</span>{' '}
                        {fieldTest.numDays ?? 1}
                      </p>

                      <p>
                        <span className="font-semibold text-primary">Measure:</span>{' '}
                        {fieldTest.measure || 'NA'}
                      </p>

                      <p>
                        <span className="font-semibold text-primary">HSN Code:</span>{' '}
                        {fieldTest.hsnCode || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-primary">Technicals:</span>{' '}
                        {Array.isArray(fieldTest.techList) && fieldTest.techList.length > 0
                          ? fieldTest.techList.join(', ')
                          : '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-primary">T&C:</span>{' '}
                        {Array.isArray(fieldTest.tcList) && fieldTest.tcList.length > 0
                          ? fieldTest.tcList.join(', ')
                          : '-'}
                      </p>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-right align-top">
                    <div className="flex justify-end space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(fieldTest)}>
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                          <p className="text-xs">Edit field test details</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(fieldTest)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                          <p className="text-xs">Permanently delete this field test</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleteConfirmation({ isOpen: false, fieldTestId: null, fieldTestType: '' })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Delete Field Test?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">
                {deleteConfirmation.fieldTestType}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminFieldTestsManager;
