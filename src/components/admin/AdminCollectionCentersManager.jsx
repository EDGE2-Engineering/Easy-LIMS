
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const AdminCollectionCentersManager = () => {
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCenter, setEditingCenter] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, name: '' });
    const { toast } = useToast();

    useEffect(() => {
        fetchCenters();
    }, []);

    const fetchCenters = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('collection_centers')
                .select('*')
                .order('name');
            if (error) throw error;
            setCenters(data || []);
        } catch (error) {
            console.error('Error fetching collection centers:', error);
            toast({
                title: 'Error',
                description: 'Failed to load collection centers.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredCenters = centers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (center) => {
        setEditingCenter({ ...center });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingCenter({ name: '', address: '' });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (!editingCenter.name.trim()) {
            toast({
                title: "Validation Error",
                description: "Collection center name cannot be empty.",
                variant: "destructive"
            });
            return;
        }
        if (!editingCenter.address.trim()) {
            toast({
                title: "Validation Error",
                description: "Collection center address cannot be empty.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            if (isAddingNew) {
                const { error } = await supabase
                    .from('collection_centers')
                    .insert([{ 
                        name: editingCenter.name, 
                        address: editingCenter.address 
                    }]);
                if (error) throw error;
                toast({ title: "Collection Center Added", description: "New collection center has been successfully added." });
            } else {
                const { error } = await supabase
                    .from('collection_centers')
                    .update({ 
                        name: editingCenter.name, 
                        address: editingCenter.address,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingCenter.id);
                if (error) throw error;
                toast({ title: "Collection Center Updated", description: "Collection center has been updated." });
            }
            setEditingCenter(null);
            setIsAddingNew(false);
            fetchCenters();
        } catch (error) {
            console.error('Error saving collection center:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to save collection center.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (center) => {
        setDeleteConfirmation({
            isOpen: true,
            id: center.id,
            name: center.name
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.id) {
            try {
                const { error } = await supabase
                    .from('collection_centers')
                    .delete()
                    .eq('id', deleteConfirmation.id);
                if (error) throw error;
                toast({
                    title: "Collection Center Deleted",
                    description: "The collection center has been removed.",
                    variant: "destructive"
                });
                fetchCenters();
            } catch (error) {
                console.error("Error deleting collection center:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete collection center.",
                    variant: "destructive"
                });
            }
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    if (loading && centers.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (editingCenter) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Collection Center' : 'Edit Collection Center'}</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingCenter(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary/90 text-white"
                            disabled={isSaving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 max-w-lg">
                    <div className="space-y-2">
                        <Label htmlFor="center-name">Collection Center Name</Label>
                        <Input
                            id="center-name"
                            value={editingCenter.name}
                            onChange={(e) => setEditingCenter({ ...editingCenter, name: e.target.value })}
                            placeholder="e.g. North Bengaluru Hub"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="center-address">Address</Label>
                        <Textarea
                            id="center-address"
                            value={editingCenter.address}
                            onChange={(e) => setEditingCenter({ ...editingCenter, address: e.target.value })}
                            placeholder="Full address of the collection center"
                            rows={4}
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
                        placeholder="Search centers..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleAddNew}
                    className="bg-primary hover:bg-primary/90 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Collection Center
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Center Name</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Address</th>
                            <th className="text-right py-3 px-4 font-semibold text-sm text-gray-600 w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCenters.map((center) => (
                            <tr key={center.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-primary opacity-50" />
                                        {center.name}
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                    {center.address}
                                </td>
                                <td className="py-2 px-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(center)}>
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(center)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredCenters.length === 0 && (
                            <tr>
                                <td colSpan="3" className="py-8 text-center text-gray-400 italic">
                                    No collection centers found.
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
                            Delete Collection Center?
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

export default AdminCollectionCentersManager;
