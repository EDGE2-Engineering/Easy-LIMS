
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle } from 'lucide-react';
import { useHSNCodes } from '@/contexts/HSNCodesContext';
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

const AdminHSNCodesManager = () => {
    const { hsnCodes, loading, addHsnCode, updateHsnCode, deleteHsnCode } = useHSNCodes();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingHsnCode, setEditingHsnCode] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, code: '' });

    const filteredHsnCodes = hsnCodes.filter(h =>
        h.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (hsnCode) => {
        setEditingHsnCode({ ...hsnCode });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingHsnCode({ code: '', description: '' });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (!editingHsnCode.code.trim()) {
            toast({ title: "Validation Error", description: "HSN/SAC code cannot be empty.", variant: "destructive" });
            return;
        }
        if (!editingHsnCode.description.trim()) {
            toast({ title: "Validation Error", description: "Description cannot be empty.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (isAddingNew) {
                await addHsnCode(editingHsnCode);
                toast({ title: "HSN Code Added", description: "New HSN/SAC code has been successfully added." });
            } else {
                const { id, ...hsnData } = editingHsnCode;
                await updateHsnCode(id, hsnData);
                toast({ title: "HSN Code Updated", description: "HSN/SAC code has been updated." });
            }
            setEditingHsnCode(null);
            setIsAddingNew(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save HSN/SAC code.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (hsnCode) => {
        setDeleteConfirmation({
            isOpen: true,
            id: hsnCode.id,
            code: hsnCode.code
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.id) {
            try {
                await deleteHsnCode(deleteConfirmation.id);
                toast({ title: "HSN Code Deleted", description: "The HSN/SAC code has been removed.", variant: "destructive" });
            } catch (error) {
                console.error("Error deleting HSN code:", error);
                toast({ title: "Error", description: "Failed to delete HSN/SAC code.", variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, id: null, code: '' });
    };

    if (loading && hsnCodes.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading HSN codes...</div>;
    }

    if (editingHsnCode) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isAddingNew ? 'Add New HSN/SAC Code' : 'Edit HSN/SAC Code'}</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingHsnCode(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary-dark text-white"
                            disabled={isSaving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 max-w-2xl">
                    <div className="space-y-2">
                        <Label>HSN/SAC Code</Label>
                        <Input
                            value={editingHsnCode.code}
                            onChange={(e) => setEditingHsnCode({ ...editingHsnCode, code: e.target.value })}
                            placeholder="e.g. 998346"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            rows={3}
                            value={editingHsnCode.description}
                            onChange={(e) => setEditingHsnCode({ ...editingHsnCode, description: e.target.value })}
                            placeholder="e.g. Technical testing and analysis services"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search HSN/SAC codes..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleAddNew}
                    className="bg-primary hover:bg-primary-dark text-white"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add HSN/SAC Code
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 w-32">Code</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Description</th>
                            <th className="text-right py-3 px-4 font-semibold text-sm text-gray-600 w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHsnCodes.map((hsn) => (
                            <tr key={hsn.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-800 font-bold">
                                    {hsn.code}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                    {hsn.description}
                                </td>
                                <td className="py-2 px-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(hsn)}>
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(hsn)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredHsnCodes.length === 0 && (
                            <tr>
                                <td colSpan="3" className="py-8 text-center text-gray-400 italic">
                                    No HSN codes found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Delete HSN/SAC Code?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete code <span className="font-semibold text-gray-900">{deleteConfirmation.code}</span>?
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

export default AdminHSNCodesManager;
