
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle } from 'lucide-react';
import { useUnitTypes } from '@/contexts/UnitTypesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const AdminUnitTypesManager = () => {
    const { unitTypes, loading, addUnitType, updateUnitType, deleteUnitType } = useUnitTypes();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUnitType, setEditingUnitType] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, name: '' });

    const filteredUnitTypes = unitTypes.filter(u =>
        u.unit_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (unitType) => {
        setEditingUnitType({ ...unitType });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingUnitType({ unit_type: '' });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (!editingUnitType.unit_type.trim()) {
            toast({ title: "Validation Error", description: "Unit type name cannot be empty.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (isAddingNew) {
                await addUnitType(editingUnitType.unit_type);
                toast({ title: "Unit Type Added", description: "New unit type has been successfully added." });
            } else {
                await updateUnitType(editingUnitType.id, editingUnitType.unit_type);
                toast({ title: "Unit Type Updated", description: "Unit type has been updated." });
            }
            setEditingUnitType(null);
            setIsAddingNew(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save unit type.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (unitType) => {
        setDeleteConfirmation({
            isOpen: true,
            id: unitType.id,
            name: unitType.unit_type
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.id) {
            try {
                await deleteUnitType(deleteConfirmation.id);
                toast({ title: "Unit Type Deleted", description: "The unit type has been removed.", variant: "destructive" });
            } catch (error) {
                console.error("Error deleting unit type:", error);
                toast({ title: "Error", description: "Failed to delete unit type.", variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    if (loading && unitTypes.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading unit types...</div>;
    }

    if (editingUnitType) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Unit Type' : 'Edit Unit Type'}</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingUnitType(null)} disabled={isSaving}>
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

                <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label>Unit Type Name</Label>
                        <Input
                            value={editingUnitType.unit_type}
                            onChange={(e) => setEditingUnitType({ ...editingUnitType, unit_type: e.target.value })}
                            placeholder="e.g. Per Meter"
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
                        placeholder="Search unit types..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleAddNew}
                    className="bg-primary hover:bg-primary-dark text-white"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Unit Type
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Unit Type</th>
                            <th className="text-right py-3 px-4 font-semibold text-sm text-gray-600 w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUnitTypes.map((unit) => (
                            <tr key={unit.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">
                                    {unit.unit_type}
                                </td>
                                <td className="py-2 px-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(unit)}>
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(unit)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUnitTypes.length === 0 && (
                            <tr>
                                <td colSpan="2" className="py-8 text-center text-gray-400 italic">
                                    No unit types found.
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
                            Delete Unit Type?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.name}</span>?
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

export default AdminUnitTypesManager;
