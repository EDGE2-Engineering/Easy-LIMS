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
import { useLabTests } from '@/contexts/LabTestsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHSNCodes } from '@/contexts/HSNCodesContext';
import { useTermsAndConditions } from '@/contexts/TermsAndConditionsContext';
import { useTechnicals } from '@/contexts/TechnicalsContext';
import { usePaymentTerms } from '@/contexts/PaymentTermsContext';
import { useMaterials } from '@/contexts/MaterialsContext';

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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReactSelect from 'react-select';
import { DOCUMENT_ITEM_TYPES } from '@/data/config';
import { themedReactSelectStyles } from '@/lib/reactSelectStyles';

const AdminLabTestsManager = () => {
  const { labTests, updateLabTest, addLabTest, deleteLabTest, setLabTests } = useLabTests();
  const { hsnCodes } = useHSNCodes();
  const { terms } = useTermsAndConditions();
  const { technicals } = useTechnicals();
  const { paymentTerms } = usePaymentTerms();
  const { materials } = useMaterials();
  const { user } = useAuth();

  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLabTest, setEditingLabTest] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    labTestId: null,
    labTestType: '',
  });
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileImportRef = useRef(null);

  const uniqueMaterials = ['all', ...materials.map((m) => m.name)];

  const filteredLabTests = labTests.filter((t) => {
    const matchesSearch =
      (t.testType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (t.price?.toString() || '').includes(searchTerm) ||
      (t.hsnCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (t.group?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (Array.isArray(t.materials) ? t.materials.join(', ') : t.materials || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (t.testMethodSpecification?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (t.id?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesMaterial =
      filterMaterial === 'all' ||
      (Array.isArray(t.materials)
        ? t.materials.includes(filterMaterial)
        : t.materials === filterMaterial);

    return matchesSearch && matchesMaterial;
  });

  const sortedLabTests = [...filteredLabTests].sort((a, b) => {
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
        valA = (
          Array.isArray(a.materials) ? a.materials.join(', ') : a.materials || ''
        ).toLowerCase();
        valB = (
          Array.isArray(b.materials) ? b.materials.join(', ') : b.materials || ''
        ).toLowerCase();
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
  const totalPages = Math.ceil(sortedLabTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLabTests = sortedLabTests.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMaterial, sortField, sortOrder]);

  const handleEdit = (labTest) => {
    setEditingLabTest({ ...labTest });
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setEditingLabTest({
      testType: '',
      materials: [],
      group: '',
      testMethodSpecification: '',
      numDays: 1,
      price: 0,
      hsnCode: '',
      tcList: [],
      techList: [],
      paymentTermsList: [],
    });
    setIsAddingNew(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isAddingNew) {
        await addLabTest(editingLabTest);
        toast({
          title: 'Lab Test Added',
          description: 'New lab test has been successfully added.',
        });

        // Telegram Notification
        const message = `🧪 *New Lab Test Added*\n\nType: \`${editingLabTest.testType}\`\nPrice: \`${editingLabTest.price}\`\nAdded By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      } else {
        await updateLabTest(editingLabTest);
        toast({ title: 'Lab Test Updated', description: 'Lab test details have been updated.' });

        // Telegram Notification
        const message = `✏️ *Lab Test Updated*\n\nType: \`${editingLabTest.testType}\`\nPrice: \`${editingLabTest.price}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      }
      setEditingLabTest(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to save lab test. ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (labTest) => {
    setDeleteConfirmation({
      isOpen: true,
      labTestId: labTest.id,
      labTestType: labTest.testType,
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.labTestId) {
      try {
        await deleteLabTest(deleteConfirmation.labTestId);
        toast({
          title: 'Lab Test Deleted',
          description: 'The lab test has been removed.',
          variant: 'destructive',
        });

        // Telegram Notification
        const message = `🗑️ *Lab Test Deleted*\n\nType: \`${deleteConfirmation.labTestType}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      } catch (error) {
        console.error('Failed to delete lab test:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete lab test. ' + error.message,
          variant: 'destructive',
        });
      }
    }
    setDeleteConfirmation({ isOpen: false, labTestId: null, labTestType: '' });
  };

  const handleChange = (field, value) => {
    setEditingLabTest((prev) => ({ ...prev, [field]: value }));
  };

  const resetAll = () => {
    setSearchTerm('');
    setSortField('name');
    setSortOrder('asc');
    setFilterMaterial('all');
    setCurrentPage(1);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(labTests, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lab_tests_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: 'Backup downloaded.' });
  };

  const handleImportClick = () => {
    if (
      window.confirm(
        'Warning: Importing data will OVERWRITE all current lab tests. This cannot be undone. Do you want to continue?'
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
          setLabTests(importedData);
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

  const groups = ['Physical', 'Chemical'];

  if (editingLabTest) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold">
            {isAddingNew ? 'Add New Lab Test' : 'Edit Lab Test'}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditingLabTest(null)} disabled={isSaving}>
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
            <Label>Lab Test Type</Label>
            <Textarea
              rows={2}
              value={editingLabTest.testType}
              onChange={(e) => handleChange('testType', e.target.value)}
              placeholder="e.g. Organic Impurities Analysis"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Materials Applicable</Label>
            <ReactSelect
              isMulti
              name="materials"
              options={materials.map((m) => ({ value: m.name, label: m.name }))}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Select Materials..."
              value={
                editingLabTest?.materials
                  ?.filter((m) => materials.some((mat) => mat.name === m))
                  ?.map((m) => ({
                    value: m,
                    label: m,
                  })) || []
              }
              onChange={(selectedOptions) => {
                handleChange(
                  'materials',
                  selectedOptions ? selectedOptions.map((option) => option.value) : []
                );
              }}
              styles={themedReactSelectStyles()}
            />
          </div>

          <div className="space-y-2">
            <Label>Group</Label>
            <Select
              value={editingLabTest.group}
              onValueChange={(val) => handleChange('group', val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
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
              value={editingLabTest.testMethodSpecification}
              onChange={(e) => handleChange('testMethodSpecification', e.target.value)}
              placeholder="e.g. IS2385 (Part2)"
            />
          </div>

          <div className="space-y-2">
            <Label>Num Days</Label>
            <Input
              type="number"
              min="1"
              value={editingLabTest.numDays ?? 1}
              onChange={(e) => handleChange('numDays', Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Price (<Rupee />)
            </Label>
            <Input
              type="number"
              value={editingLabTest.price}
              onChange={(e) => handleChange('price', Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>HSN Code</Label>
            <Select
              value={editingLabTest.hsnCode || ''}
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
              options={[...new Set(terms.map((t) => t.type))].map((type) => ({
                value: type,
                label: type,
              }))}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Select Terms..."
              value={
                editingLabTest?.tcList?.map((type) => ({
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
              placeholder="Select Technicals..."
              value={
                editingLabTest?.techList?.map((type) => ({
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

          <div className="space-y-2 md:col-span-1">
            <Label>Payment Terms</Label>
            <ReactSelect
              isMulti
              name="paymentTermsList"
              options={[...new Set(paymentTerms.map((t) => t.type))].map((type) => ({
                value: type,
                label: type,
              }))}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Select Payment Terms..."
              value={
                editingLabTest?.paymentTermsList?.map((type) => ({
                  value: type,
                  label: type,
                })) || []
              }
              onChange={(selectedOptions) => {
                handleChange(
                  'paymentTermsList',
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
              placeholder="Search lab tests..."
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
                <Plus className="w-4 h-4 mr-2" /> Add Lab Test
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Add a new laboratory test to the catalog</p>
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
              <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                <SelectTrigger className="w-44 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                  <SelectValue placeholder="Materials" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueMaterials.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m === 'all' ? 'All Materials' : m}
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
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="hsn">HSN</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-gray-200 bg-gray-50/50 rounded-lg"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              disabled={
                !searchTerm &&
                sortField === 'name' &&
                sortOrder === 'asc' &&
                filterMaterial === 'all'
              }
              className="text-gray-400 hover:text-red-500 h-10 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Pagination Controls - Top */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-lg shadow border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">Items per page:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-24 h-9 text-xs bg-gray-50/50 border-gray-200 rounded-lg">
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
          <span className="text-xs text-gray-600">
            Showing {sortedLabTests.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, sortedLabTests.length)} of {sortedLabTests.length}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  {DOCUMENT_ITEM_TYPES.LAB_TESTS.label}
                </th>
                <th className="text-right py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLabTests.map((labTest) => (
                <tr
                  key={labTest.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4 align-top text-gray-600">
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-700">
                      <p className="font-bold text-gray-900 whitespace-pre-wrap">
                        {labTest.testType}
                      </p>
                      <div className="w-full"></div>
                      <p>
                        <span className="font-semibold text-primary">Materials:</span>{' '}
                        {Array.isArray(labTest.materials)
                          ? labTest.materials.join(', ')
                          : labTest.materials || '-'}
                      </p>

                      <p>
                        <span className="font-semibold text-primary">Method:</span>{' '}
                        {labTest.testMethodSpecification || '-'}
                      </p>

                      <p>
                        <span className="font-semibold text-primary"># Days:</span>{' '}
                        {labTest.numDays ?? 1}
                      </p>

                      <p>
                        <span className="font-semibold text-primary">Price:</span> <Rupee />
                        {labTest.price.toLocaleString()}
                      </p>

                      <p>
                        <span className="font-semibold text-primary">HSN Code:</span>{' '}
                        {labTest.hsnCode || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-primary">Technicals:</span>{' '}
                        {Array.isArray(labTest.techList) && labTest.techList.length > 0
                          ? labTest.techList.join(', ')
                          : '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-primary">T&C:</span>{' '}
                        {Array.isArray(labTest.tcList) && labTest.tcList.length > 0
                          ? labTest.tcList.join(', ')
                          : '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-primary">Payment Terms:</span>{' '}
                        {Array.isArray(labTest.paymentTermsList) && labTest.paymentTermsList.length > 0
                          ? labTest.paymentTermsList.join(', ')
                          : '-'}
                      </p>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-right align-top">
                    <div className="flex justify-end space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(labTest)}>
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                          <p className="text-xs">Edit lab test details</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(labTest)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                          <p className="text-xs">Permanently delete this lab test</p>
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

      {/* Pagination Controls - Bottom */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-9 px-4 text-sm border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleteConfirmation({ isOpen: false, labTestId: null, labTestType: '' })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Delete Lab Test?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteConfirmation.labTestType}</span>?
              This action cannot be undone.
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

export default AdminLabTestsManager;
