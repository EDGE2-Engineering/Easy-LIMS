
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle } from 'lucide-react';
import { useMaterials } from '@/contexts/MaterialsContext';
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

const AdminMaterialsManager = () => {
    const { materials, loading, addMaterial, updateMaterial, deleteMaterial } = useMaterials();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, name: '' });

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (material) => {
        setEditingMaterial({ ...material });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingMaterial({ name: '' });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (!editingMaterial.name.trim()) {
            toast({ title: "Validation Error", description: "Material name cannot be empty.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (isAddingNew) {
                await addMaterial(editingMaterial);
                toast({ title: "Material Added", description: "New material has been successfully added." });
            } else {
                const { id, ...materialData } = editingMaterial;
                await updateMaterial(id, materialData);
                toast({ title: "Material Updated", description: "Material has been updated." });
            }
            setEditingMaterial(null);
            setIsAddingNew(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save material.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (material) => {
        setDeleteConfirmation({
            isOpen: true,
            id: material.id,
            name: material.name
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.id) {
            try {
                await deleteMaterial(deleteConfirmation.id);
                toast({ title: "Material Deleted", description: "The material has been removed.", variant: "destructive" });
            } catch (error) {
                console.error("Error deleting material:", error);
                toast({ title: "Error", description: "Failed to delete material.", variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    if (loading && materials.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading materials...</div>;
    }

    if (editingMaterial) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Material' : 'Edit Material'}</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingMaterial(null)} disabled={isSaving}>
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
                        <Label>Material Name</Label>
                        <Input
                            value={editingMaterial.name}
                            onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                            placeholder="e.g. Concrete, Aggregate (Coarse)"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search materials..."
                        className="pl-10 w-full h-12 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleAddNew}
                    className="bg-primary hover:bg-primary-dark text-white h-12 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Material
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Name</th>
                            <th className="text-right py-3 px-4 font-semibold text-sm text-gray-600 w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMaterials.map((material) => (
                            <tr key={material.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-800 font-bold">
                                    {material.name}
                                </td>
                                <td className="py-2 px-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(material)}>
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(material)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredMaterials.length === 0 && (
                            <tr>
                                <td colSpan="2" className="py-8 text-center text-gray-400 italic">
                                    No materials found.
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
                            Delete Material?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete material <span className="font-semibold text-gray-900">{deleteConfirmation.name}</span>?
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

export default AdminMaterialsManager;
