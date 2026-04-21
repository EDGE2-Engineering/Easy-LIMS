import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, Search, Download, Upload, AlertCircle, Mail, Phone } from 'lucide-react';
import { useClients } from '@/contexts/ClientsContext';
import { useAuth } from '@/contexts/AuthContext';
import { sendTelegramNotification } from '@/lib/notifier';
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

const AdminClientsManager = () => {
    const { clients, updateClient, addClient, deleteClient, setClients } = useClients();
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingClient, setEditingClient] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [contactErrors, setContactErrors] = useState({});
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, clientId: null, clientName: '' });

    const isValidEmail = (email) => {
        if (!email) return true; // Don't validate if empty
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const fileImportRef = useRef(null);

    const filteredClients = (clients || []).filter(c => {
        const searchStr = searchTerm.toLowerCase();
        const inMainFields = (c.clientName?.toLowerCase() || '').includes(searchStr) ||
            (c.clientAddress?.toLowerCase() || '').includes(searchStr) ||
            (c.id?.toString().toLowerCase() || '').includes(searchStr);

        const inContacts = (c.contacts || []).some(con =>
            (con.contact_person?.toLowerCase() || '').includes(searchStr) ||
            (con.contact_email?.toLowerCase() || '').includes(searchStr) ||
            (con.contact_phone?.toLowerCase() || '').includes(searchStr)
        );

        return inMainFields || inContacts;
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = filteredClients.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleEdit = (client) => {
        const contacts = Array.isArray(client.contacts) ? client.contacts : [];
        setEditingClient({
            ...client,
            contacts
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
            contacts: [{ contact_person: '', contact_email: '', contact_phone: '', is_primary: true }]
        });
        setContactErrors({});
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (Object.values(contactErrors).some(err => err)) {
            toast({ title: "Validation Error", description: "Please fix invalid email formats before saving.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            // Clean up contacts (remove empty ones if needed, but at least ensure primary exists)
            const cleanedContacts = (editingClient.contacts || []).map(c => ({
                ...c,
                contact_email: c.contact_email?.trim() || ''
            })).filter(c => c.contact_email || c.contact_phone || c.contact_person);

            if (cleanedContacts.length > 0 && !cleanedContacts.some(c => c.is_primary)) {
                cleanedContacts[0].is_primary = true;
            }

            const clientToSave = { ...editingClient, contacts: cleanedContacts };

            if (isAddingNew) {
                await addClient(clientToSave);
                toast({ title: "Client Added", description: "New client has been successfully added." });

                // Telegram Notification
                const message = `👥 *New Client Added*\n\nName: \`${clientToSave.clientName}\`\nAdded By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            } else {
                await updateClient(clientToSave);
                toast({ title: "Client Updated", description: "Client details have been updated." });

                // Telegram Notification
                const message = `✏️ *Client Updated*\n\nName: \`${clientToSave.clientName}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            }
            setEditingClient(null);
            setContactErrors({});
            setIsAddingNew(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save client. " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (client) => {
        setDeleteConfirmation({
            isOpen: true,
            clientId: client.id,
            clientName: client.clientName
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.clientId) {
            try {
                await deleteClient(deleteConfirmation.clientId);
                toast({ title: "Client Deleted", description: "The client has been removed.", variant: "destructive" });

                // Telegram Notification
                const message = `🗑️ *Client Deleted*\n\nName: \`${deleteConfirmation.clientName}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``;
                sendTelegramNotification(message);
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "Failed to delete client: " + error.message, variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, clientId: null, clientName: '' });
    };

    const handleChange = (field, value) => {
        setEditingClient(prev => ({ ...prev, [field]: value }));
    };

    const handleContactChange = (index, field, value) => {
        let finalValue = value;
        if (field === 'contact_email') {
            // Strip ALL spaces as the user types
            finalValue = value.replace(/\s/g, '');
            const isValid = isValidEmail(finalValue);
            setContactErrors(prev => ({ ...prev, [index]: !isValid }));
        }

        setEditingClient(prev => {
            const newContacts = [...(prev.contacts || [])];
            if (field === 'is_primary' && value === true) {
                // Only one primary contact allowed
                newContacts.forEach((c, i) => c.is_primary = (i === index));
            } else {
                newContacts[index] = { ...newContacts[index], [field]: finalValue };
            }
            return { ...prev, contacts: newContacts };
        });
    };

    const addContactField = () => {
        setEditingClient(prev => ({
            ...prev,
            contacts: [
                ...(prev.contacts || []),
                { contact_person: '', contact_email: '', contact_phone: '', is_primary: (prev.contacts || []).length === 0 }
            ]
        }));
    };

    const removeContactField = (index) => {
        setEditingClient(prev => {
            const newContacts = (prev.contacts || []).filter((_, i) => i !== index);
            // Ensure at least one primary if contacts exist
            if (newContacts.length > 0 && !newContacts.some(c => c.is_primary)) {
                newContacts[0].is_primary = true;
            }
            return { ...prev, contacts: newContacts };
        });
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(clients, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `clients_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Export Successful", description: "Backup downloaded." });
    };

    const handleImportClick = () => {
        if (window.confirm("Warning: Importing data will OVERWRITE all current clients. This cannot be undone. Do you want to continue?")) {
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
                    localStorage.setItem('clients', JSON.stringify(importedData));
                    toast({ title: "Import Successful", description: `Imported ${importedData.length} clients.` });
                } else {
                    toast({ title: "Import Failed", description: "Invalid JSON format: Expected an array.", variant: "destructive" });
                }
            } catch (error) {
                console.error("Import error:", error);
                toast({ title: "Import Failed", description: "Could not parse JSON file.", variant: "destructive" });
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
                            {isSaving ? 'Saving...' : 'Save Changes'}
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
                                            <Label htmlFor={`primary-${index}`} className="cursor-pointer">Primary Contact</Label>
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
                                                onChange={(e) => handleContactChange(index, 'contact_person', e.target.value)}
                                                placeholder="Name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={contactErrors[index] ? "text-red-500" : ""}>Email</Label>
                                            <Input
                                                value={contact.contact_email || ''}
                                                onChange={(e) => handleContactChange(index, 'contact_email', e.target.value)}
                                                placeholder="Email"
                                                className={contactErrors[index] ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            />
                                            {contactErrors[index] && (
                                                <p className="text-xs text-red-500 mt-1">Please enter a valid email address.</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Phone</Label>
                                            <Input
                                                value={contact.contact_phone || ''}
                                                onChange={(e) => handleContactChange(index, 'contact_phone', e.target.value)}
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search Clients..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <input
                        type="file"
                        ref={fileImportRef}
                        onChange={handleImportFile}
                        accept=".json"
                        className="hidden"
                    />
                    {/* <Button variant="outline" onClick={handleImportClick} className="flex-1 sm:flex-none border-gray-300">
                        <Upload className="w-4 h-4 mr-2" /> Import
                    </Button>
                    <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none border-gray-300">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button> */}
                    <Button onClick={handleAddNew} className="flex-1 sm:flex-none bg-primary hover:bg-primary-dark text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add Client
                    </Button>
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
                        Showing {filteredClients.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredClients.length)} of {filteredClients.length}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Client Details</th>
                            <th className="text-right py-3 px-4 font-semibold text-sm text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedClients.length > 0 ? (
                            paginatedClients.map((client) => {
                                const primaryContact = (client.contacts || []).find(c => c.is_primary) || client.contacts?.[0] || {};
                                return (
                                    <tr key={client.id} className="border-b hover:bg-gray-50 transition-colors">

                                        {/* Single content column */}
                                        <td className="py-3 px-4">
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                                                <p className="font-semibold text-gray-900 text-base">
                                                    {client.clientName}
                                                </p>
                                                <div className="w-full"></div>
                                                <p className="" title={client.clientAddress}>
                                                    <span className="font-semibold text-gray-900">Address:</span>{' '}
                                                    {client.clientAddress}
                                                </p>
                                                <div className="w-full"></div>

                                                {primaryContact.contact_person && (
                                                    <>
                                                        <p className="flex items-center">
                                                            <span className="font-semibold text-gray-900 mr-1">Primary Contact:</span>
                                                            {primaryContact.contact_person}
                                                        </p>
                                                        <p className="flex items-center">
                                                            <Mail className="w-4 h-4 mr-2 text-blue-500" />
                                                            <span className="font-semibold text-gray-900 mr-1">Email:</span>
                                                            {primaryContact.contact_email || '—'}
                                                        </p>
                                                        <p className="flex items-center">
                                                            <Phone className="w-4 h-4 mr-2 text-green-500" />
                                                            <span className="font-semibold text-gray-900 mr-1">Phone:</span>
                                                            {primaryContact.contact_phone || '—'}
                                                        </p>
                                                        <div className="w-full"></div>
                                                    </>
                                                )}


                                                {client.contacts && client.contacts.length > 1 && (
                                                    <div className="w-full mt-1">
                                                        <p className="text-xs text-gray-500">
                                                            +{client.contacts.length - 1} more contact(s)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions column */}
                                        <td className="py-1 px-1 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                                                    <Edit className="w-4 h-4 text-gray-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(client)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </td>

                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="2" className="py-8 text-center text-gray-500">
                                    {searchTerm
                                        ? 'No clients found matching your search.'
                                        : 'No clients added yet.'}
                                </td>
                            </tr>
                        )}
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

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, clientId: null, clientName: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Delete Client?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.clientName}</span>?
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

export default AdminClientsManager;
