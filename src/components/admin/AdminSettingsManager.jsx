import React, { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Save } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const AdminSettingsManager = () => {
    const { settings, updateSetting, loading } = useSettings();
    const { toast } = useToast();
    const [localSettings, setLocalSettings] = useState({
        tax_cgst: '',
        tax_sgst: '',
        bank_name: '',
        bank_account_holder_name: '',
        bank_account_number: '',
        branch_name: '',
        ifsc_code: '',
        payment_terms: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!loading && settings) {
            setLocalSettings({
                tax_cgst: settings.tax_cgst || '',
                tax_sgst: settings.tax_sgst || '',
                bank_name: settings.bank_name || '',
                bank_account_holder_name: settings.bank_account_holder_name || '',
                bank_account_number: settings.bank_account_number || '',
                branch_name: settings.branch_name || '',
                ifsc_code: settings.ifsc_code || '',
                payment_terms: settings.payment_terms || ''
            });
        }
    }, [loading, settings]);

    const handleChange = (field, value) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save all settings
            await updateSetting('tax_cgst', localSettings.tax_cgst);
            await updateSetting('tax_sgst', localSettings.tax_sgst);
            await updateSetting('bank_name', localSettings.bank_name);
            await updateSetting('bank_account_holder_name', localSettings.bank_account_holder_name);
            await updateSetting('bank_account_number', localSettings.bank_account_number);
            await updateSetting('branch_name', localSettings.branch_name);
            await updateSetting('ifsc_code', localSettings.ifsc_code);
            await updateSetting('payment_terms', localSettings.payment_terms);
            toast({ title: "Settings Saved", description: "All settings updated successfully." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold hidden">Tax and Bank Details</h2>
                    <p className="text-gray-500 text-sm mt-1 hidden">Configure tax rates and bank details for invoices.</p>
                </div>
                <Button
                    onClick={handleSave}
                    className="bg-primary hover:bg-primary-dark flex items-center text-white"
                    disabled={isSaving}
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>

            {/* Tax Configuration Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tax Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                    <div className="space-y-2">
                        <Label>CGST (%)</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={localSettings.tax_cgst}
                            onChange={(e) => handleChange('tax_cgst', e.target.value)}
                            placeholder="e.g. 9"
                        />
                        <p className="text-xs text-gray-500">Central Goods and Services Tax percentage.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>SGST (%)</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={localSettings.tax_sgst}
                            onChange={(e) => handleChange('tax_sgst', e.target.value)}
                            placeholder="e.g. 9"
                        />
                        <p className="text-xs text-gray-500">State Goods and Services Tax percentage.</p>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-md text-blue-800 text-sm">
                    <div>
                        <span className="font-semibold">Total Tax:</span> {Number(localSettings.tax_cgst) + Number(localSettings.tax_sgst)}%
                    </div>
                    <div>
                        Changes will apply to new invoices immediately.
                    </div>
                </div>
            </div>

            {/* Bank Details Section */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input
                            type="text"
                            min="0"
                            step="0.01"
                            value={localSettings.bank_name}
                            onChange={(e) => handleChange('bank_name', e.target.value)}
                            placeholder="e.g. HDFC Bank"
                        />
                        <p className="text-xs text-gray-500">Bank Name.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Bank Account Holder Name</Label>
                        <Input
                            type="text"
                            min="0"
                            step="0.01"
                            value={localSettings.bank_account_holder_name}
                            onChange={(e) => handleChange('bank_account_holder_name', e.target.value)}
                            placeholder="e.g. EDGE2 Engineering"
                        />
                        <p className="text-xs text-gray-500">Bank Account Holder Name.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Bank Account Number</Label>
                        <Input
                            type="text"
                            min="0"
                            step="0.01"
                            value={localSettings.bank_account_number}
                            onChange={(e) => handleChange('bank_account_number', e.target.value)}
                            placeholder="e.g. 1234567890"
                        />
                        <p className="text-xs text-gray-500">Bank Account Number.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Branch Name</Label>
                        <Input
                            type="text"
                            min="0"
                            step="0.01"
                            value={localSettings.branch_name}
                            onChange={(e) => handleChange('branch_name', e.target.value)}
                            placeholder="e.g. HDFC Bank Bengaluru Branch"
                        />
                        <p className="text-xs text-gray-500">Branch Name.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>IFSC Code</Label>
                        <Input
                            type="text"
                            min="0"
                            step="0.01"
                            value={localSettings.ifsc_code}
                            onChange={(e) => handleChange('ifsc_code', e.target.value)}
                            placeholder="e.g. HDFC0001234"
                        />
                        <p className="text-xs text-gray-500">Bank IFSC Code.</p>
                    </div>
                </div>
            </div>

            {/* Payment Terms Section */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold">Payment Terms</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label className="hidden">Payment Terms</Label>
                        <Textarea
                            rows={5}
                            value={localSettings.payment_terms}
                            onChange={(e) => handleChange('payment_terms', e.target.value)}
                            placeholder="e.g. Payment should be made within 30 days of the invoice date."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsManager;
