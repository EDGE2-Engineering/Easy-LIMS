import React, { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useBankAccounts } from '@/contexts/BankAccountsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Save,
  Plus,
  IndianRupee,
  Trash2,
  Edit,
  CheckCircle2,
  Building2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const AdminSettingsManager = () => {
  const { settings, updateSetting, loading: settingsLoading } = useSettings();
  const {
    bankAccounts,
    loading: accountsLoading,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultBank,
  } = useBankAccounts();

  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState({
    tax_cgst: '',
    tax_sgst: '',
    tax_igst: '',
    payment_terms: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingBank, setIsProcessingBank] = useState(false);
  const [editingBankId, setEditingBankId] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_account_holder_name: '',
    bank_account_number: '',
    branch_name: '',
    ifsc_code: '',
    is_default: false,
  });

  useEffect(() => {
    if (!settingsLoading && settings && !hasInitialized) {
      setLocalSettings({
        tax_cgst: settings.tax_cgst || '',
        tax_sgst: settings.tax_sgst || '',
        tax_igst: settings.tax_igst || '',
        payment_terms: settings.payment_terms || '',
      });
      setHasInitialized(true);
    }
  }, [settingsLoading, settings, hasInitialized]);

  const handleChange = (field, value) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveGeneralSettings = async () => {
    setIsSaving(true);
    try {
      await updateSetting('tax_cgst', localSettings.tax_cgst);
      await updateSetting('tax_sgst', localSettings.tax_sgst);
      await updateSetting('tax_igst', localSettings.tax_igst);
      await updateSetting('payment_terms', localSettings.payment_terms);

      toast({ title: 'Settings Saved', description: 'General settings updated successfully.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBank = async () => {
    setIsProcessingBank(true);
    try {
      await addBankAccount(bankForm);
      setBankForm({
        bank_name: '',
        bank_account_holder_name: '',
        bank_account_number: '',
        branch_name: '',
        ifsc_code: '',
        is_default: false,
      });
      setShowBankForm(false);
      toast({ title: 'Success', description: 'Bank account added successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add bank account.', variant: 'destructive' });
    } finally {
      setIsProcessingBank(false);
    }
  };

  const handleUpdateBank = async () => {
    setIsProcessingBank(true);
    try {
      await updateBankAccount(editingBankId, bankForm);
      setEditingBankId(null);
      setBankForm({
        bank_name: '',
        bank_account_holder_name: '',
        bank_account_number: '',
        branch_name: '',
        ifsc_code: '',
        is_default: false,
      });
      setShowBankForm(false);
      toast({ title: 'Success', description: 'Bank account updated successfully.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update bank account.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingBank(false);
    }
  };

  const handleEditBank = (bank) => {
    setBankForm({
      bank_name: bank.bank_name || '',
      bank_account_holder_name: bank.bank_account_holder_name || '',
      bank_account_number: bank.bank_account_number || '',
      branch_name: bank.branch_name || '',
      ifsc_code: bank.ifsc_code || '',
      is_default: bank.is_default || false,
    });
    setEditingBankId(bank.id);
    setShowBankForm(true);
  };

  const handleDeleteBank = async (id) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    try {
      await deleteBankAccount(id);
      toast({ title: 'Success', description: 'Bank account deleted.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete account.', variant: 'destructive' });
    }
  };

  const handleSetDefaultBank = async (id) => {
    try {
      await setDefaultBank(id);
      toast({ title: 'Success', description: 'Default bank account updated.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set default account.',
        variant: 'destructive',
      });
    }
  };

  if (settingsLoading || accountsLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-500 font-medium">Loading settings...</span>
      </div>
    );

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Standardized Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <IndianRupee className="w-6 h-6 text-primary" />
            </div>
            Payment & Tax Settings
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Configure billing rates and bank details
          </p>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleSaveGeneralSettings}
              className="bg-primary hover:bg-primary-dark flex items-center text-white rounded-xl h-10 px-6 shadow-sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save General Settings'}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border-gray-800">
            <p className="text-xs">Update tax rates and payment terms</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {/* Tax Configuration Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tax Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
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

            <div className="space-y-2">
              <Label>IGST (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={localSettings.tax_igst}
                onChange={(e) => handleChange('tax_igst', e.target.value)}
                placeholder="e.g. 18"
              />
              <p className="text-xs text-gray-500">Integrated Goods and Services Tax percentage.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-primary/10 p-4 rounded-md border border-primary/20 text-sm gap-2">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="font-semibold text-primary">Intrastate Tax (CGST + SGST):</span>{' '}
                <span className="text-gray-700">
                  {Number(localSettings.tax_cgst) + Number(localSettings.tax_sgst)}%
                </span>
              </div>
              <div>
                <span className="font-semibold text-primary">Interstate Tax (IGST):</span>{' '}
                <span className="text-gray-700">
                  {Number(localSettings.tax_igst)}%
                </span>
              </div>
            </div>
            <div className="text-gray-600">Changes will apply to new invoices immediately.</div>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="space-y-6 pt-6 border-t border-gray-200 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Bank Accounts
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowBankForm(true);
                setEditingBankId(null);
                setBankForm({
                  bank_name: '',
                  bank_account_holder_name: '',
                  bank_account_number: '',
                  branch_name: '',
                  ifsc_code: '',
                  is_default: false,
                });
              }}
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>

          <Dialog open={showBankForm} onOpenChange={setShowBankForm}>
            <DialogContent className="sm:max-w-[600px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {editingBankId ? 'Edit Bank Account' : 'New Bank Account'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    placeholder="e.g. HDFC Bank"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input
                    value={bankForm.bank_account_holder_name}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, bank_account_holder_name: e.target.value })
                    }
                    placeholder="e.g. EDGE2 Engineering"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={bankForm.bank_account_number}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, bank_account_number: e.target.value })
                    }
                    placeholder="e.g. 1234567890"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch Name</Label>
                  <Input
                    value={bankForm.branch_name}
                    onChange={(e) => setBankForm({ ...bankForm, branch_name: e.target.value })}
                    placeholder="e.g. Peenya Branch"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input
                    value={bankForm.ifsc_code}
                    onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value })}
                    placeholder="e.g. HDFC0001234"
                    className="rounded-xl"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={bankForm.is_default}
                    onChange={(e) => setBankForm({ ...bankForm, is_default: e.target.checked })}
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="is_default" className="cursor-pointer">
                    Set as default account
                  </Label>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowBankForm(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingBankId ? handleUpdateBank : handleAddBank}
                  className="rounded-xl"
                  disabled={
                    isProcessingBank || !bankForm.bank_name || !bankForm.bank_account_number
                  }
                >
                  {isProcessingBank && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingBankId ? 'Update Bank Account' : 'Add Bank Account'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bank accounts configured</p>
                <p className="text-gray-400 text-sm">
                  Add at least one account to display in documents
                </p>
              </div>
            ) : (
              bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className={cn(
                    'p-6 rounded-2xl border transition-all flex flex-col justify-between group',
                    bank.is_default
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-gray-100 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{bank.bank_name}</h4>
                        {bank.is_default && (
                          <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-medium mt-1">
                        {bank.bank_account_holder_name}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => handleEditBank(bank)}
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-red-50"
                        onClick={() => handleDeleteBank(bank.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium">A/c Number:</span>
                      <span className="text-gray-900">{bank.bank_account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">IFSC Code:</span>
                      <span className="text-gray-900">{bank.ifsc_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Branch:</span>
                      <span className="text-gray-900">{bank.branch_name}</span>
                    </div>
                  </div>

                  {!bank.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefaultBank(bank.id)}
                      className="mt-4 text-primary hover:bg-primary/10 w-full rounded-xl h-8 text-xs font-bold uppercase tracking-wider"
                    >
                      Set as Default
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {bankAccounts.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20 mt-4">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong>Note:</strong> Changes to bank accounts are saved instantly. The default
                account will be automatically selected for new documents.
              </p>
            </div>
          )}
        </div>

        {/* Payment Terms Section */}
        <div className="space-y-4 pt-6 border-t border-gray-200 mt-6">
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
    </div>
  );
};

export default AdminSettingsManager;
