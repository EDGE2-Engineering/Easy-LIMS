import React, { useState } from 'react';
import {
    Save, X, Package, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { WORKFLOW_STATUS_OPTIONS } from '@/config';
import { useAuth } from '@/contexts/AuthContext';

const MaterialInwardForm = ({
    initialData,
    clientsList = [],
    appUsers = [],
    onSave,
    onCancel,
    isSaving = false,
    isAddingNew = true
}) => {
    const { user } = useAuth();
    const [editingRecord, setEditingRecord] = useState(initialData);

    const handleAddSample = () => {
        setEditingRecord(prev => ({
            ...prev,
            samples: [
                ...(prev.samples || []),
                {
                    sample_code: '',
                    sample_description: '',
                    quantity: '',
                    received_date: format(new Date(), 'yyyy-MM-dd'),
                    received_time: format(new Date(), 'HH:mm'),
                    received_by: user?.id || user?.username || '',
                    expected_test_days: 7
                }
            ]
        }));
    };

    const handleRemoveSample = (index) => {
        const updatedSamples = editingRecord.samples.filter((_, i) => i !== index);
        setEditingRecord(prev => ({ ...prev, samples: updatedSamples }));
    };

    const handleSampleChange = (index, field, value) => {
        const updatedSamples = [...editingRecord.samples];
        updatedSamples[index][field] = value;
        setEditingRecord(prev => ({ ...prev, samples: updatedSamples }));
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-lg font-bold">{isAddingNew ? 'Add Material Inward' : 'Edit Material Inward'}</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving} className="h-9">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onSave(editingRecord)}
                        size="sm"
                        className="bg-primary hover:bg-primary-dark flex items-center text-white px-3 h-9"
                        disabled={isSaving}
                    >
                        <Save className="w-3.5 h-3.5 mr-2" />
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="po_wo_number">Purchase Order/Work Order Number</Label>
                    <Input
                        id="po_wo_number"
                        placeholder="e.g. PO/2026/001"
                        value={editingRecord.po_wo_number || ''}
                        onChange={(e) => setEditingRecord(prev => ({ ...prev, po_wo_number: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="client">Client *</Label>
                    <Select
                        value={editingRecord.client_id || ''}
                        onValueChange={(value) => setEditingRecord(prev => ({ ...prev, client_id: value }))}
                        disabled={true}
                    >
                        <SelectTrigger id="client">
                            <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                            {clientsList.map(client => (
                                <SelectItem key={client.id} value={client.id}>{client.client_name || client.clientName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* {!isAddingNew && (
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                            value={editingRecord.status}
                            onValueChange={(value) => setEditingRecord(prev => ({ ...prev, status: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {WORKFLOW_STATUS_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt.replace(/_/g, ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )} */}
            </div>

            <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" /> Samples
                    </h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSample}
                        className="text-xs h-8"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Add Sample
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {editingRecord.samples?.map((sample, index) => (
                        <div key={index} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 space-y-4 relative group">
                            {editingRecord.samples.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveSample(index)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Sample Code *</Label>
                                    <Input
                                        placeholder="e.g. CUBE-01"
                                        className="h-9 text-sm"
                                        value={sample.sample_code}
                                        onChange={(e) => handleSampleChange(index, 'sample_code', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs">Description</Label>
                                    <Input
                                        placeholder="e.g. M25 Grade Concrete"
                                        className="h-9 text-sm"
                                        value={sample.sample_description}
                                        onChange={(e) => handleSampleChange(index, 'sample_description', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Quantity</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 6"
                                        className="h-9 text-sm"
                                        value={sample.quantity}
                                        onChange={(e) => handleSampleChange(index, 'quantity', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Received Date</Label>
                                    <Input
                                        type="date"
                                        className="h-9 text-sm"
                                        value={sample.received_date}
                                        onChange={(e) => handleSampleChange(index, 'received_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Time</Label>
                                    <Input
                                        type="time"
                                        className="h-9 text-sm"
                                        value={sample.received_time}
                                        onChange={(e) => handleSampleChange(index, 'received_time', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Received By</Label>
                                    <Select
                                        value={sample.received_by}
                                        onValueChange={(value) => handleSampleChange(index, 'received_by', value)}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="User" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {appUsers.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.full_name || u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Test Days</Label>
                                    <Input
                                        type="number"
                                        className="h-9 text-sm"
                                        value={sample.expected_test_days}
                                        onChange={(e) => handleSampleChange(index, 'expected_test_days', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MaterialInwardForm;
