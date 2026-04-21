
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
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

const AdminDepartmentsManager = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingDept, setEditingDept] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, name: '' });
    const { toast } = useToast();

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name');
            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast({
                title: 'Error',
                description: 'Failed to load departments.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredDepartments = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (dept) => {
        setEditingDept({ ...dept });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingDept({ name: '' });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (!editingDept.name.trim()) {
            toast({
                title: "Validation Error",
                description: "Department name cannot be empty.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            if (isAddingNew) {
                const { error } = await supabase
                    .from('departments')
                    .insert([{ name: editingDept.name }]);
                if (error) throw error;
                toast({ title: "Department Added", description: "New department has been successfully added." });
            } else {
                const { error } = await supabase
                    .from('departments')
                    .update({ name: editingDept.name })
                    .eq('id', editingDept.id);
                if (error) throw error;
                toast({ title: "Department Updated", description: "Department has been updated." });
            }
            setEditingDept(null);
            setIsAddingNew(false);
            fetchDepartments();
        } catch (error) {
            console.error('Error saving department:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to save department.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (dept) => {
        setDeleteConfirmation({
            isOpen: true,
            id: dept.id,
            name: dept.name
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.id) {
            try {
                const { error } = await supabase
                    .from('departments')
                    .delete()
                    .eq('id', deleteConfirmation.id);
                if (error) throw error;
                toast({
                    title: "Department Deleted",
                    description: "The department has been removed.",
                    variant: "destructive"
                });
                fetchDepartments();
            } catch (error) {
                console.error("Error deleting department:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete department. It might be in use.",
                    variant: "destructive"
                });
            }
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    if (loading && departments.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (editingDept) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Department' : 'Edit Department'}</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingDept(null)} disabled={isSaving}>
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

                <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="dept-name">Department Name</Label>
                        <Input
                            id="dept-name"
                            value={editingDept.name}
                            onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                            placeholder="e.g. Sales"
                            autoFocus
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
                        placeholder="Search departments..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleAddNew}
                    className="bg-primary hover:bg-primary/90 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Department
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Department Name</th>
                            <th className="text-right py-3 px-4 font-semibold text-sm text-gray-600 w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDepartments.map((dept) => (
                            <tr key={dept.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">
                                    {dept.name}
                                </td>
                                <td className="py-2 px-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(dept)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredDepartments.length === 0 && (
                            <tr>
                                <td colSpan="2" className="py-8 text-center text-gray-400 italic">
                                    No departments found.
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
                            Delete Department?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirmation.name}</span>?
                            This action cannot be undone and might fail if users are assigned to this department.
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

export default AdminDepartmentsManager;
