import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { MATERIALS } from '@/data/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Save, Weight, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const SETTING_PREFIX = 'unit_weight_bulk_';

const AdminUnitWeightsManager = () => {
  const { settings, updateSetting, loading } = useSettings();
  const { toast } = useToast();
  const [localWeights, setLocalWeights] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialise local state from persisted settings
  useEffect(() => {
    if (!loading && settings && !hasInitialized) {
      const weights = {};
      MATERIALS.forEach((mat) => {
        const key = SETTING_PREFIX + mat.id;
        weights[mat.id] = settings[key] !== undefined ? String(settings[key]) : '';
      });
      setLocalWeights(weights);
      setHasInitialized(true);
    }
  }, [loading, settings, hasInitialized]);

  const handleChange = useCallback((materialId, value) => {
    setLocalWeights((prev) => ({ ...prev, [materialId]: value }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const mat of MATERIALS) {
        const key = SETTING_PREFIX + mat.id;
        const value = localWeights[mat.id];
        if (value !== '' && value !== undefined) {
          await updateSetting(key, value);
        }
      }
      toast({
        title: 'Unit Weights Saved',
        description: 'Material unit weights have been updated successfully.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to save unit weights.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const computeEffective = (bulkValue) => {
    const num = parseFloat(bulkValue);
    if (isNaN(num)) return '—';
    // return Math.max(0, num - 10).toFixed(2);
    return (num - 10).toFixed(2);
  };

  if (loading && !hasInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-500 font-medium">Loading unit weights...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <Weight className="w-6 h-6 text-primary" />
            </div>
            Unit Weights of Materials
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Configure bulk and effective unit weights for each material type
          </p>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary-dark flex items-center text-white rounded-xl h-10 px-6 shadow-sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save Unit Weights'}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border-gray-800">
            <p className="text-xs">Persist all unit weight values</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-4 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                Material Type
              </th>
              <th className="text-center py-4 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                Bulk Unit Weight - γ (kN/m³)
              </th>
              <th className="text-center py-4 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                Effective Unit Weight - γ' (kN/m³)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MATERIALS.map((mat) => {
              const bulkVal = localWeights[mat.id] ?? '';
              const effectiveVal = computeEffective(bulkVal);

              return (
                <tr key={mat.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 px-4">
                    <span className="font-semibold text-gray-900">{mat.name}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bulkVal}
                        onChange={(e) => handleChange(mat.id, e.target.value)}
                        placeholder="0.00"
                        className="w-40 text-center rounded-xl h-9"
                      />
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`font-mono font-bold ${effectiveVal === '—' ? 'text-gray-300' : 'text-primary'}`}
                    >
                      {effectiveVal}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
        <Weight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>Note:</strong> Effective Unit Weight is automatically calculated as{' '}
          <strong>Bulk Unit Weight − 10 kN/m³</strong>. Enter the Bulk Unit Weight for each material
          and click <em>Save Unit Weights</em> to persist your changes.
        </p>
      </div>
    </div>
  );
};

export default AdminUnitWeightsManager;
