import React from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Search,
  Download,
  Upload,
  AlertCircle,
  Mail,
  Phone,
  SortAsc,
  SortDesc,
  Filter,
  X,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useClients } from '@/contexts/ClientsContext';
import { useAuth } from '@/contexts/AuthContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { STORAGE_KEYS } from '@/data/storageKeys';
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

const CLIENT_CATEGORIES = [
  'General',
  'Telecom',
  'Construction',
  'Government',
  'Private',
  'Individual',
];

const isValidEmail = (email) => {
  if (!email) return true; // Don't validate if empty
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const AdminClientsManager = () => {
  // 1. Context Hooks
  const { clients, updateClient, addClient, deleteClient, setClients } = useClients();
  const { user } = useAuth();
  const { toast } = useToast();

  // 2. State Hooks
  const [searchTerm, setSearchTerm] = React.useState('');
  const [editingClient, setEditingClient] = React.useState(null);
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [contactErrors, setContactErrors] = React.useState({});
  const [deleteConfirmation, setDeleteConfirmation] = React.useState({
    isOpen: false,
    clientId: null,
    clientName: '',
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [sortField, setSortField] = React.useState('clientName');
  const [sortOrder, setSortOrder] = React.useState('asc');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [showFilters, setShowFilters] = React.useState(false);

  // 3. Ref Hooks
  const fileImportRef = React.useRef(null);

  // 4. Memo Hooks
  const filteredClients = React.useMemo(() => {
    let result = (clients || []).filter((c) => {
      const searchStr = searchTerm.toLowerCase();
      const inMainFields =
        (c.clientName?.toLowerCase() || '').includes(searchStr) ||
        (c.clientAddress?.toLowerCase() || '').includes(searchStr) ||
        (c.gstin?.toLowerCase() || '').includes(searchStr) ||
        (c.id?.toString().toLowerCase() || '').includes(searchStr);

      const inContacts = (c.contacts || []).some(
        (con) =>
          (con.contact_person?.toLowerCase() || '').includes(searchStr) ||
          (con.contact_email?.toLowerCase() || '').includes(searchStr) ||
          (con.contact_phone?.toLowerCase() || '').includes(searchStr)
      );

      if (!(inMainFields || inContacts)) return false;

      // Category filter
      if (filterCategory !== 'all' && (c.category || 'General') !== filterCategory) return false;

      // Status filter
      if (filterStatus !== 'all') {
        const isActive = c.status !== false;
        if (filterStatus === 'active' && !isActive) return false;
        if (filterStatus === 'inactive' && isActive) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, searchTerm, sortField, sortOrder]);

  const resetAll = () => {
    setSearchTerm('');
    setSortField('clientName');
    setSortOrder('asc');
    setFilterCategory('all');
    setFilterStatus('all');
    setCurrentPage(1);
    setShowFilters(false);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleEdit = (client) => {
    const contacts = Array.isArray(client.contacts) ? client.contacts : [];
    setEditingClient({
      ...client,
      contacts,
    });

    // Initialize validation errors for existing contacts
    const initialErrors = {};
    contacts.forEach((contact, index) => {
      if (contact.contact_email && !isValidEmail(contact.contact_email)) {
        initialErrors[index] = true;
      }
    });
    setContactErrors(initialErrors);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setEditingClient({
      clientName: '',
      clientAddress: '',
      gstin: '',
      category: 'General',
      status: true,
      contacts: [{ contact_person: '', contact_email: '', contact_phone: '', is_primary: true }],
    });
    setContactErrors({});
    setIsAddingNew(true);
  };

  const handleSave = async () => {
    if (Object.values(contactErrors).some((err) => err)) {
      toast({
        title: 'Validation Error',
        description: 'Please fix invalid email formats before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Clean up contacts (remove empty ones if needed, but at least ensure primary exists)
      const cleanedContacts = (editingClient.contacts || [])
        .map((c) => ({
          ...c,
          contact_email: c.contact_email?.trim() || '',
        }))
        .filter((c) => c.contact_email || c.contact_phone || c.contact_person);

      if (cleanedContacts.length > 0 && !cleanedContacts.some((c) => c.is_primary)) {
        cleanedContacts[0].is_primary = true;
      }

      const clientToSave = { ...editingClient, contacts: cleanedContacts };

      if (isAddingNew) {
        await addClient(clientToSave);
        toast({ title: 'Client Added', description: 'New client has been successfully added.' });

        // Telegram Notification
        const message = `👥 *New Client Added*\n\nName: \`${clientToSave.clientName}\`\nAdded By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      } else {
        await updateClient(clientToSave);
        toast({ title: 'Client Updated', description: 'Client details have been updated.' });

        // Telegram Notification
        const message = `✏️ *Client Updated*\n\nName: \`${clientToSave.clientName}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      }
      setEditingClient(null);
      setContactErrors({});
      setIsAddingNew(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to save client. ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (client) => {
    setDeleteConfirmation({
      isOpen: true,
      clientId: client.id,
      clientName: client.clientName,
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.clientId) {
      try {
        await deleteClient(deleteConfirmation.clientId);
        toast({
          title: 'Client Deleted',
          description: 'The client has been removed.',
          variant: 'destructive',
        });

        // Telegram Notification
        const message = `🗑️ *Client Deleted*\n\nName: \`${deleteConfirmation.clientName}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``;
        sendTelegramNotification(message);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Failed to delete client: ' + error.message,
          variant: 'destructive',
        });
      }
    }
    setDeleteConfirmation({ isOpen: false, clientId: null, clientName: '' });
  };

  const handleChange = (field, value) => {
    setEditingClient((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index, field, value) => {
    let finalValue = value;
    if (field === 'contact_email') {
      // Strip ALL spaces as the user types
      finalValue = value.replace(/\s/g, '');
      const isValid = isValidEmail(finalValue);
      setContactErrors((prev) => ({ ...prev, [index]: !isValid }));
    }

    setEditingClient((prev) => {
      const newContacts = [...(prev.contacts || [])];
      if (field === 'is_primary' && value === true) {
        // Only one primary contact allowed
        newContacts.forEach((c, i) => (c.is_primary = i === index));
      } else {
        newContacts[index] = { ...newContacts[index], [field]: finalValue };
      }
      return { ...prev, contacts: newContacts };
    });
  };

  const addContactField = () => {
    setEditingClient((prev) => ({
      ...prev,
      contacts: [
        ...(prev.contacts || []),
        {
          contact_person: '',
          contact_email: '',
          contact_phone: '',
          is_primary: (prev.contacts || []).length === 0,
        },
      ],
    }));
  };

  const removeContactField = (index) => {
    setEditingClient((prev) => {
      const newContacts = (prev.contacts || []).filter((_, i) => i !== index);
      // Ensure at least one primary if contacts exist
      if (newContacts.length > 0 && !newContacts.some((c) => c.is_primary)) {
        newContacts[0].is_primary = true;
      }
      return { ...prev, contacts: newContacts };
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(clients, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clients_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: 'Backup downloaded.' });
  };

  const handleImportClick = () => {
    if (
      window.confirm(
        'Warning: Importing data will OVERWRITE all current clients. This cannot be undone. Do you want to continue?'
      )
    ) {
      fileImportRef.current?.click();
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          setClients(importedData);
          // Also update localStorage immediately
          localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(importedData));
          toast({
            title: 'Import Successful',
            description: `Imported ${importedData.length} clients.`,
          });
        } else {
          toast({
            title: 'Import Failed',
            description: 'Invalid JSON format: Expected an array.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: 'Import Failed',
          description: 'Could not parse JSON file.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  if (editingClient) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Client' : 'Edit Client'}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditingClient(null)} disabled={isSaving}>
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

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Textarea
                rows={2}
                value={editingClient.clientName || ''}
                onChange={(e) => handleChange('clientName', e.target.value)}
                placeholder="Enter client name"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={editingClient.clientAddress || ''}
                onChange={(e) => handleChange('clientAddress', e.target.value)}
                placeholder="Enter client address"
              />
            </div>
            <div className="space-y-2">
              <Label>GSTIN (Optional)</Label>
              <Input
                value={editingClient.gstin || ''}
                onChange={(e) => handleChange('gstin', e.target.value)}
                placeholder="Enter GSTIN (e.g. 29AAAAA0000A1Z5)"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editingClient.category || 'General'}
                  onValueChange={(v) => handleChange('category', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingClient.status !== false ? 'active' : 'inactive'}
                  onValueChange={(v) => handleChange('status', v === 'active')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Contacts</Label>
              <Button variant="outline" size="sm" onClick={addContactField}>
                <Plus className="w-4 h-4 mr-2" /> Add Contact
              </Button>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-gray-50/50">
              {(editingClient.contacts || []).map((contact, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg bg-white relative">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`primary-${index}`}
                        name="primary_contact"
                        checked={contact.is_primary}
                        onChange={() => handleContactChange(index, 'is_primary', true)}
                        className="w-4 h-4 text-primary"
                      />
                      <Label htmlFor={`primary-${index}`} className="cursor-pointer">
                        Primary Contact
                      </Label>
                    </div>
                    {editingClient.contacts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContactField(index)}
                        className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Person</Label>
                      <Input
                        value={contact.contact_person || ''}
                        onChange={(e) =>
                          handleContactChange(index, 'contact_person', e.target.value)
                        }
                        placeholder="Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={contactErrors[index] ? 'text-red-500' : ''}>Email</Label>
                      <Input
                        value={contact.contact_email || ''}
                        onChange={(e) =>
                          handleContactChange(index, 'contact_email', e.target.value)
                        }
                        placeholder="Email"
                        className={
                          contactErrors[index] ? 'border-red-500 focus-visible:ring-red-500' : ''
                        }
                      />
                      {contactErrors[index] && (
                        <p className="text-xs text-red-500 mt-1">
                          Please enter a valid email address.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={contact.contact_phone || ''}
                        onChange={(e) =>
                          handleContactChange(index, 'contact_phone', e.target.value)
                        }
                        placeholder="Phone"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
              placeholder="Search Clients..."
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
                <Plus className="w-4 h-4 mr-2" /> Add Client
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Create a new client record in the system</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Filters and Actions Row */}
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
                  {(filterCategory !== 'all' || filterStatus !== 'all') && (
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
                  <SelectItem value="clientName">Client Name</SelectItem>
                  <SelectItem value="createdAt">Date Added</SelectItem>
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

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileImportRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              className="hidden h-9 px-3 text-xs text-gray-600 border-gray-200 bg-gray-50/50 rounded-lg hover:bg-white transition-all"
            >
              <Upload className="w-3.5 h-3.5 mr-2" /> Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="hidden h-9 px-3 text-xs text-gray-600 border-gray-200 bg-gray-50/50 rounded-lg hover:bg-white transition-all"
            >
              <Download className="w-3.5 h-3.5 mr-2" /> Export
            </Button>
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
                  Category
                </Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CLIENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Status
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
            Showing {filteredClients.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, filteredClients.length)} of {filteredClients.length}
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
                    <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                      Client & Category
                    </th>
                    <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                      Address & GSTIN
                    </th>
                    <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                      Primary Contact
                    </th>
                    <th className="text-center py-3 px-2 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-center py-3 px-2 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.length > 0 ? (
                    paginatedClients.map((client) => {
                      const primaryContact =
                        (client.contacts || []).find((c) => c.is_primary) || client.contacts?.[0] || {};
                      return (
                        <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-3 align-top">
                            <div className="font-semibold text-gray-900 break-words">{client.clientName}</div>
                            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap bg-blue-50 text-blue-700">
                              {client.category || 'General'}
                            </span>
                          </td>
      
                          <td className="py-4 px-3 align-top text-gray-600">
                            <div className="text-xs text-gray-500 break-words whitespace-normal" title={client.clientAddress}>
                              {client.clientAddress}
                            </div>
                            {client.gstin?.trim() && (
                              <div className="text-[10px] text-gray-400 mt-2 break-all">
                                GSTIN: {client.gstin}
                              </div>
                            )}
                          </td>
      
                          <td className="py-4 px-3 align-top text-gray-600">
                            {primaryContact.contact_person ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-900 text-xs">
                                  {primaryContact.contact_person}
                                </div>
                                <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                  <Mail className="w-3 h-3 text-blue-400 shrink-0" />{' '}
                                  {primaryContact.contact_email || '—'}
                                </div>
                                <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-green-400 shrink-0" />{' '}
                                  {primaryContact.contact_phone || '—'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300 font-bold">—</span>
                            )}
                          </td>
      
                          <td className="py-4 px-2 text-center align-top whitespace-nowrap">
                            {client.status === false ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap bg-red-50 text-red-700">
                                Inactive
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap bg-green-50 text-green-700">
                                Active
                              </span>
                            )}
                          </td>
      
                          <td className="py-4 px-2 align-top">
                            <div className="flex justify-center items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEdit(client)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                  <p className="text-xs">Edit Client</p>
                                </TooltipContent>
                              </Tooltip>
      
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteClick(client)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                  <p className="text-xs">Delete Client</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-8 h-8 text-gray-200" />
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            No Clients Registered
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

      {/* Removed bottom pagination as it is now in the top settings panel */}

      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleteConfirmation({ isOpen: false, clientId: null, clientName: '' })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Delete Client?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteConfirmation.clientName}</span>?
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

export default AdminClientsManager;
