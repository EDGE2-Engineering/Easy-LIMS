import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, Search, AlertCircle, FileText } from 'lucide-react';
import { useTermsAndConditions } from '@/contexts/TermsAndConditionsContext';
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
import { Card, CardContent } from "@/components/ui/card";

const AdminTermsManager = () => {
    const { terms, loading, addTerm, updateTerm, deleteTerm } = useTermsAndConditions();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTerm, setEditingTerm] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, text: '' });

    const filteredTerms = terms.filter(t =>
        t.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.type && t.type.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleEdit = (term) => {
        setEditingTerm({ ...term });
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setEditingTerm({ text: '', type: 'general' });
        setIsAddingNew(true);
    };

    const handleSave = async () => {
        if (!editingTerm.text.trim()) {
            toast({ title: "Validation Error", description: "Terms and Conditions text cannot be empty.", variant: "destructive" });
            return;
        }
        if (!editingTerm.type || !editingTerm.type.trim()) {
            toast({ title: "Validation Error", description: "Type cannot be empty.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (isAddingNew) {
                await addTerm(editingTerm.text, editingTerm.type);
                toast({ title: "Terms and Conditions Added", description: "New Terms and Conditions has been successfully added." });
            } else {
                await updateTerm(editingTerm.id, editingTerm.text, editingTerm.type);
                toast({ title: "Terms and Conditions Updated", description: "Terms and Conditions has been updated." });
            }
            setEditingTerm(null);
            setIsAddingNew(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save Terms and Conditions.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (term) => {
        setDeleteConfirmation({
            isOpen: true,
            id: term.id,
            text: term.text
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.id) {
            try {
                await deleteTerm(deleteConfirmation.id);
                toast({ title: "Terms and Conditions Deleted", description: "The Terms and Conditions has been removed.", variant: "destructive" });
            } catch (error) {
                console.error("Error deleting Terms and Conditions:", error);
                toast({ title: "Error", description: "Failed to delete Terms and Conditions.", variant: "destructive" });
            }
        }
        setDeleteConfirmation({ isOpen: false, id: null, text: '' });
    };

    if (loading && terms.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading terms...</div>;
    }

    if (editingTerm) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isAddingNew ? 'Add New Terms and Conditions' : 'Edit Terms and Conditions'}</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingTerm(null)} disabled={isSaving}>
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

                <div className="space-y-4 w-full">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Input
                            value={editingTerm.type || ''}
                            onChange={(e) => setEditingTerm({ ...editingTerm, type: e.target.value })}
                            placeholder="e.g. General, Bricks, Cement"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Terms and Conditions Text</Label>
                        <Textarea
                            value={editingTerm.text}
                            onChange={(e) => setEditingTerm({ ...editingTerm, text: e.target.value })}
                            placeholder="e.g. Payment should be made within 30 days."
                            rows={20}
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
                        placeholder="Search terms and conditions..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleAddNew}
                    className="bg-primary hover:bg-primary-dark text-white"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Terms and Conditions
                </Button>
            </div>

            <div className="grid gap-4">
                {filteredTerms.map((term) => (
                    <Card key={term.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex justify-between items-start gap-4">
                            <div className="flex gap-3 items-start w-full">
                                <div className="mt-1 bg-gray-100 p-2 rounded-full shrink-0">
                                    <FileText className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="space-y-1 w-full">
                                    {term.type && (
                                        <span className="inline-block px-1 py-0.5 rounded text-sm font-bold bg-blue-100 text-blue-800">
                                            {term.type}
                                        </span>
                                    )}
                                    <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed pl-1">{term.text}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(term)}>
                                    <Edit className="w-4 h-4 text-gray-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(term)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {filteredTerms.length === 0 && (
                    <div className="p-8 text-center text-gray-400 italic border border-dashed rounded-lg">
                        No terms found.
                    </div>
                )}
            </div>

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Delete Term?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this term?
                            This action cannot be undone.
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm italic border-l-2 border-gray-300">
                                "{deleteConfirmation.text.length > 50 ? deleteConfirmation.text.substring(0, 50) + '...' : deleteConfirmation.text}"
                            </div>
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

export default AdminTermsManager;
