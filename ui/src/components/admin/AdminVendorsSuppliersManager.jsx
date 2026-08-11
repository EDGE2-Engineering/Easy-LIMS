import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Search,
  Download,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  Truck,
  Store,
  Filter,
  CheckCircle2,
  XCircle,
  UsersRound,
  ShieldCheck,
  MapPin,
  FileText,
  Loader2,
  Tag,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useVendorsSuppliers } from '@/contexts/VendorsSuppliersContext';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const VENDOR_CATEGORIES = [
  'Manual Auger Team',
  'Drilling Team',
  'Outsource testing Labs',
  'Survey Team',
  'ERT Team',
  'Hydrology Testing Team',
  'NDT Testing Team',
  'Third Party Inspector',
  'Other Vendor',
];

const SUPPLIER_CATEGORIES = [
  'Service Providers',
  'Material Suppliers',
  'Stationary suppliers',
  'Equipment Suppliers',
  'Chemical & Reagents',
  'IT & Hardware',
  'Other Supplier',
];

const isValidEmail = (email) => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const AdminVendorsSuppliersManager = () => {
  const { items, addItem, updateItem, deleteItem, loading } = useVendorsSuppliers();
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState('all'); // 'all', 'Vendor', 'Supplier'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [editingItem, setEditingItem] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    id: null,
    name: '',
    type: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filtered list
  const filteredItems = useMemo(() => {
    return (items || []).filter((item) => {
      // Type tab filter
      if (activeTypeTab !== 'all' && item.type !== activeTypeTab) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // Status filter
      if (selectedStatus !== 'all') {
        const isActive = item.status !== false;
        if (selectedStatus === 'active' && !isActive) return false;
        if (selectedStatus === 'inactive' && isActive) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const mainMatches =
          (item.name?.toLowerCase() || '').includes(term) ||
          (item.address?.toLowerCase() || '').includes(term) ||
          (item.gstin?.toLowerCase() || '').includes(term) ||
          (item.category?.toLowerCase() || '').includes(term) ||
          (item.email?.toLowerCase() || '').includes(term) ||
          (item.phone?.toLowerCase() || '').includes(term) ||
          (item.contact_person?.toLowerCase() || '').includes(term);

        const contactsMatches = (item.contacts || []).some(
          (c) =>
            (c.contact_person?.toLowerCase() || '').includes(term) ||
            (c.contact_email?.toLowerCase() || '').includes(term) ||
            (c.contact_phone?.toLowerCase() || '').includes(term)
        );

        if (!mainMatches && !contactsMatches) return false;
      }

      return true;
    });
  }, [items, activeTypeTab, selectedCategory, selectedStatus, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const vendors = items.filter((i) => i.type === 'Vendor').length;
    const suppliers = items.filter((i) => i.type === 'Supplier').length;
    const active = items.filter((i) => i.status !== false).length;
    return { total, vendors, suppliers, active };
  }, [items]);

  // Available categories for dropdown based on entity type
  const availableCategories = useMemo(() => {
    if (editingItem?.type === 'Supplier') return SUPPLIER_CATEGORIES;
    return VENDOR_CATEGORIES;
  }, [editingItem?.type]);

  const handleOpenAdd = (type = 'Vendor') => {
    setEditingItem({
      type: type,
      name: '',
      category: type === 'Vendor' ? VENDOR_CATEGORIES[0] : SUPPLIER_CATEGORIES[0],
      address: '',
      contact_person: '',
      phone: '',
      email: '',
      gstin: '',
      status: true,
      contacts: [
        {
          contact_person: '',
          contact_email: '',
          contact_phone: '',
          is_primary: true,
        },
      ],
    });
    setIsAddingNew(true);
  };

  const handleOpenEdit = (item) => {
    const contacts = Array.isArray(item.contacts) && item.contacts.length > 0
      ? item.contacts
      : [
          {
            contact_person: item.contact_person || '',
            contact_email: item.email || '',
            contact_phone: item.phone || '',
            is_primary: true,
          },
        ];

    setEditingItem({
      ...item,
      contacts,
    });
    setIsAddingNew(false);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setIsAddingNew(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editingItem.name?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (editingItem.email && !isValidEmail(editingItem.email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isAddingNew) {
        await addItem(editingItem, user?.id);
        toast({
          title: 'Success',
          description: `${editingItem.type} "${editingItem.name}" created successfully.`,
        });
      } else {
        await updateItem(editingItem, user?.id);
        toast({
          title: 'Success',
          description: `${editingItem.type} "${editingItem.name}" updated successfully.`,
        });
      }
      handleCloseModal();
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save record.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmation.id) return;
    try {
      await deleteItem(deleteConfirmation.id, user?.id);
      toast({
        title: 'Deleted',
        description: `${deleteConfirmation.type || 'Entry'} "${deleteConfirmation.name}" deleted successfully.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete record.',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmation({ isOpen: false, id: null, name: '', type: '' });
    }
  };

  const handleContactChange = (index, field, value) => {
    setEditingItem((prev) => {
      const updatedContacts = [...(prev.contacts || [])];
      updatedContacts[index] = {
        ...updatedContacts[index],
        [field]: value,
      };

      // Keep primary contact person/email/phone in sync with top-level fields
      const isPrimary = updatedContacts[index].is_primary || index === 0;
      const topSync = isPrimary
        ? {
            contact_person: field === 'contact_person' ? value : prev.contact_person,
            email: field === 'contact_email' ? value : prev.email,
            phone: field === 'contact_phone' ? value : prev.phone,
          }
        : {};

      return {
        ...prev,
        ...topSync,
        contacts: updatedContacts,
      };
    });
  };

  const handleAddContact = () => {
    setEditingItem((prev) => ({
      ...prev,
      contacts: [
        ...(prev.contacts || []),
        {
          contact_person: '',
          contact_email: '',
          contact_phone: '',
          is_primary: false,
        },
      ],
    }));
  };

  const handleRemoveContact = (index) => {
    setEditingItem((prev) => {
      const updated = (prev.contacts || []).filter((_, i) => i !== index);
      return { ...prev, contacts: updated };
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const exportToCSV = () => {
    const headers = ['ID', 'Type', 'Name', 'Category', 'Contact Person', 'Phone', 'Mail ID', 'GSTIN', 'Address', 'Status'];
    const rows = filteredItems.map((i) => [
      i.id,
      i.type,
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${(i.category || '').replace(/"/g, '""')}"`,
      `"${(i.contact_person || '').replace(/"/g, '""')}"`,
      `"${(i.phone || '').replace(/"/g, '""')}"`,
      `"${(i.email || '').replace(/"/g, '""')}"`,
      `"${(i.gstin || '').replace(/"/g, '""')}"`,
      `"${(i.address || '').replace(/"/g, '""')}"`,
      i.status !== false ? 'Active' : 'Inactive',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendors_suppliers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Cards */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-primary" /> Vendors & Suppliers Register
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage 3rd party testing agencies, outsourcing teams, material providers, and service suppliers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>

          <Button
            onClick={() => handleOpenAdd('Vendor')}
            className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>

          <Button
            onClick={() => handleOpenAdd('Supplier')}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Partners</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Testing Vendors</p>
            <p className="text-2xl font-bold text-purple-700">{stats.vendors}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Suppliers</p>
            <p className="text-2xl font-bold text-teal-700">{stats.suppliers}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Active Partners</p>
            <p className="text-2xl font-bold text-green-700">{stats.active}</p>
          </div>
        </div>
      </div>

      {/* Main Filter & Data Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        {/* Navigation Tabs & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <Tabs value={activeTypeTab} onValueChange={(val) => { setActiveTypeTab(val); setCurrentPage(1); }} className="w-auto">
            <TabsList className="bg-gray-100 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg text-xs font-medium px-4 py-2">
                All ({items.length})
              </TabsTrigger>
              <TabsTrigger value="Vendor" className="rounded-lg text-xs font-medium px-4 py-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                Vendors ({stats.vendors})
              </TabsTrigger>
              <TabsTrigger value="Supplier" className="rounded-lg text-xs font-medium px-4 py-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Suppliers ({stats.suppliers})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search name, phone, email, GST..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-9 text-xs rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all"
              />
            </div>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px] h-9 text-xs rounded-xl border-gray-200 bg-gray-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm">Loading vendors & suppliers...</p>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <Truck className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-base font-semibold text-gray-700">No records found</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Try updating your search term or tab filters, or add a new vendor/supplier.
            </p>
            <Button onClick={() => handleOpenAdd('Vendor')} size="sm" className="mt-2 bg-primary">
              <Plus className="w-4 h-4 mr-1" /> Add New Entry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 font-medium text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Name & Category</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Entity Type Badge */}
                    <td className="py-4 px-4 align-top">
                      {item.type === 'Supplier' ? (
                        <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100 font-medium text-xs gap-1 py-1">
                          <Store className="w-3 h-3" /> Supplier
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 font-medium text-xs gap-1 py-1">
                          <Truck className="w-3 h-3" /> Vendor
                        </Badge>
                      )}
                    </td>

                    {/* Name & Category */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      {item.category && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {item.category}
                        </span>
                      )}
                    </td>

                    {/* Contact Info */}
                    <td className="py-4 px-4 align-top space-y-1 text-xs">
                      {item.contact_person && (
                        <div className="font-medium text-gray-800">{item.contact_person}</div>
                      )}
                      {item.phone && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{item.phone}</span>
                        </div>
                      )}
                      {item.email && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{item.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-4 px-4 align-top text-xs text-gray-600 max-w-[220px]">
                      {item.address ? (
                        <div className="flex gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.address}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not provided</span>
                      )}
                    </td>

                    {/* GSTIN */}
                    <td className="py-4 px-4 align-top text-xs">
                      {item.gstin ? (
                        <span className="font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200 font-semibold">
                          {item.gstin}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Optional</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 align-top">
                      {item.status !== false ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3 h-3 text-green-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          <XCircle className="w-3 h-3 text-gray-400" /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 align-top text-right space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Details</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteConfirmation({
                                isOpen: true,
                                id: item.id,
                                name: item.name,
                                type: item.type,
                              })
                            }
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Entry</TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredItems.length)} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 text-xs"
              >
                Previous
              </Button>
              <span className="font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal Dialog */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {editingItem.type === 'Supplier' ? (
                    <Store className="w-5 h-5 text-teal-600" />
                  ) : (
                    <Truck className="w-5 h-5 text-purple-600" />
                  )}
                  {isAddingNew ? `Add New ${editingItem.type}` : `Edit ${editingItem.type}`}
                </h3>
                <p className="text-xs text-gray-500">
                  {editingItem.type === 'Vendor'
                    ? '3rd party testing agencies, auger teams, drilling, or lab testing partners'
                    : 'Service providers, material suppliers, and stationary suppliers'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Selection */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Entity Type *</Label>
                  <Select
                    value={editingItem.type}
                    onValueChange={(val) =>
                      setEditingItem((prev) => ({
                        ...prev,
                        type: val,
                        category: val === 'Vendor' ? VENDOR_CATEGORIES[0] : SUPPLIER_CATEGORIES[0],
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vendor">Vendor (Outsource / Testing Agency)</SelectItem>
                      <SelectItem value="Supplier">Supplier (Material / Service Provider)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Selection */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Category / Specialty *</Label>
                  <Select
                    value={editingItem.category}
                    onValueChange={(val) => setEditingItem((prev) => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name */}
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-gray-700">
                    {editingItem.type} Name *
                  </Label>
                  <Input
                    type="text"
                    required
                    placeholder={`e.g. ${editingItem.type === 'Vendor' ? 'Auger Drilling Agency' : 'Metro Stationery Mart'}`}
                    value={editingItem.name}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Contact Person</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={editingItem.contact_person || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingItem((prev) => ({ ...prev, contact_person: val }));
                      if (prev.contacts && prev.contacts.length > 0) {
                        handleContactChange(0, 'contact_person', val);
                      }
                    }}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Contact Phone / Mobile</Label>
                  <Input
                    type="text"
                    placeholder="+91 9876543210"
                    value={editingItem.phone || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingItem((prev) => ({ ...prev, phone: val }));
                      if (prev.contacts && prev.contacts.length > 0) {
                        handleContactChange(0, 'contact_phone', val);
                      }
                    }}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Email / Mail ID (Optional) */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>Mail ID</span>
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="vendor@company.com"
                    value={editingItem.email || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingItem((prev) => ({ ...prev, email: val }));
                      if (prev.contacts && prev.contacts.length > 0) {
                        handleContactChange(0, 'contact_email', val);
                      }
                    }}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                {/* GSTIN (Optional) */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>GST Number (GSTIN)</span>
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="29ABCDE1234F1ZH"
                    value={editingItem.gstin || ''}
                    onChange={(e) =>
                      setEditingItem((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))
                    }
                    className="mt-1 h-9 text-xs rounded-xl uppercase font-mono"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-gray-700">Full Address</Label>
                  <Textarea
                    rows={2}
                    placeholder="Enter street, office location, area, city, pincode..."
                    value={editingItem.address || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, address: e.target.value }))}
                    className="mt-1 text-xs rounded-xl resize-none"
                  />
                </div>

                {/* Status Toggle */}
                <div className="md:col-span-2 flex items-center justify-between pt-2 border-t border-gray-100">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Account Status</Label>
                    <p className="text-xs text-gray-400">Mark active for work order and expense logs</p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingItem((prev) => ({ ...prev, status: prev.status === false ? true : false }))
                    }
                    className={`rounded-xl text-xs font-medium px-4 ${
                      editingItem.status !== false
                        ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {editingItem.status !== false ? 'Active' : 'Inactive'}
                  </Button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleCloseModal} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-primary text-white text-xs px-5 shadow-sm">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save {editingItem.type}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => !open && setDeleteConfirmation({ isOpen: false, id: null, name: '', type: '' })}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 text-sm">
              Are you sure you want to delete {deleteConfirmation.type || 'entry'} &quot;
              <strong className="text-gray-900">{deleteConfirmation.name}</strong>&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminVendorsSuppliersManager;
