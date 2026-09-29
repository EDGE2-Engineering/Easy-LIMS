import React, { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Save,
  RotateCcw,
  Scale,
  Flame,
  Weight,
  Loader2,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MOULD_PRESETS,
  COMPACTION_SETTING_KEYS,
} from '@/utils/compactionCalculation';

const AdminCompactionSettingsManager = () => {
  const { settings, updateSetting, loading: settingsLoading } = useSettings();
  const { toast } = useToast();

  const [form, setForm] = useState({
    lightEmptyWeight: '',
    heavySmallEmptyWeight: '',
    heavyBigEmptyWeight: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!settingsLoading && settings && !hasInitialized) {
      setForm({
        lightEmptyWeight:
          settings[COMPACTION_SETTING_KEYS.LIGHT_EMPTY_WEIGHT] !== undefined
            ? String(settings[COMPACTION_SETTING_KEYS.LIGHT_EMPTY_WEIGHT])
            : String(MOULD_PRESETS.LIGHT_STANDARD.emptyWeight),
        heavySmallEmptyWeight:
          settings[COMPACTION_SETTING_KEYS.HEAVY_SMALL_EMPTY_WEIGHT] !== undefined
            ? String(settings[COMPACTION_SETTING_KEYS.HEAVY_SMALL_EMPTY_WEIGHT])
            : String(MOULD_PRESETS.HEAVY_SMALL.emptyWeight),
        heavyBigEmptyWeight:
          settings[COMPACTION_SETTING_KEYS.HEAVY_BIG_EMPTY_WEIGHT] !== undefined
            ? String(settings[COMPACTION_SETTING_KEYS.HEAVY_BIG_EMPTY_WEIGHT])
            : String(MOULD_PRESETS.HEAVY_BIG.emptyWeight),
      });
      setHasInitialized(true);
    }
  }, [settingsLoading, settings, hasInitialized]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (form.lightEmptyWeight !== '') {
        await updateSetting(
          COMPACTION_SETTING_KEYS.LIGHT_EMPTY_WEIGHT,
          parseFloat(form.lightEmptyWeight) || form.lightEmptyWeight
        );
      }
      if (form.heavySmallEmptyWeight !== '') {
        await updateSetting(
          COMPACTION_SETTING_KEYS.HEAVY_SMALL_EMPTY_WEIGHT,
          parseFloat(form.heavySmallEmptyWeight) || form.heavySmallEmptyWeight
        );
      }
      if (form.heavyBigEmptyWeight !== '') {
        await updateSetting(
          COMPACTION_SETTING_KEYS.HEAVY_BIG_EMPTY_WEIGHT,
          parseFloat(form.heavyBigEmptyWeight) || form.heavyBigEmptyWeight
        );
      }

      toast({
        title: 'Settings Saved',
        description: 'Compaction mould weights have been updated successfully.',
      });
    } catch (error) {
      console.error('Failed to save compaction settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save compaction mould settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset empty mould weights to standard laboratory defaults?')) {
      return;
    }
    setForm({
      lightEmptyWeight: String(MOULD_PRESETS.LIGHT_STANDARD.emptyWeight),
      heavySmallEmptyWeight: String(MOULD_PRESETS.HEAVY_SMALL.emptyWeight),
      heavyBigEmptyWeight: String(MOULD_PRESETS.HEAVY_BIG.emptyWeight),
    });
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-500 font-medium">Loading compaction settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-foreground tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            Soil Compaction Mould Settings
          </h1>
          <p className="text-gray-500 dark:text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            IS 2720 Part 7 & Part 8 • Dynamic Constants & Mould Calibration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetDefaults}
            className="rounded-xl h-10 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 px-6 shadow-sm flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold">Dynamic Constant Management:</p>
          <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
            The empty mould weight (W₁) remains constant as long as the same physical mould is in use. If a mould is replaced or recalibrated due to breakage, wear, or repair, enter the new weight once here and save. All future light and heavy compaction tests will automatically adopt the new default value.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Light Compaction Card */}
        <Card className="rounded-3xl border border-gray-100 dark:border-border shadow-sm overflow-hidden bg-white dark:bg-card">
          <CardHeader className="bg-amber-50/40 dark:bg-amber-950/20 border-b border-amber-100/60 dark:border-amber-900/30 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    Light Compaction Mould
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Standard Proctor Compaction per IS 2720 (Part 7)
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold text-[11px]"
              >
                IS 2720 Part 7
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* Empty Mould Weight Field */}
            <div className="space-y-2 p-4 rounded-2xl bg-gray-50 dark:bg-muted/40 border border-gray-200 dark:border-border">
              <div className="flex items-center justify-between">
                <Label htmlFor="lightEmptyWeight" className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  Empty Mould weight (W₁)
                </Label>
                <span className="text-[11px] text-gray-500">Unit: grams (g)</span>
              </div>
              <div className="relative">
                <Input
                  id="lightEmptyWeight"
                  type="number"
                  step="any"
                  value={form.lightEmptyWeight}
                  onChange={(e) => handleChange('lightEmptyWeight', e.target.value)}
                  placeholder="3989"
                  className="text-base font-bold pl-3 pr-12 h-11 bg-white dark:bg-card"
                />
                <span className="absolute right-3.5 top-3 text-xs font-semibold text-gray-400">
                  gms
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                Default weight of the clean, dry light compaction mould with base plate.
              </p>
            </div>

            {/* Specifications Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground">
                Standard Mould Specifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-muted/30 border border-gray-100 dark:border-border">
                  <span className="text-gray-400 block text-[10px]">Mould Volume</span>
                  <span className="font-bold text-primary text-sm">
                    {MOULD_PRESETS.LIGHT_STANDARD.volume} cm³
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-muted/30 border border-gray-100 dark:border-border">
                  <span className="text-gray-400 block text-[10px]">Internal Diameter</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {MOULD_PRESETS.LIGHT_STANDARD.diameter} cm
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-muted/30 border border-gray-100 dark:border-border">
                  <span className="text-gray-400 block text-[10px]">Effective Length</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {MOULD_PRESETS.LIGHT_STANDARD.length} cm
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-muted/30 border border-gray-100 dark:border-border">
                  <span className="text-gray-400 block text-[10px]">Height of Fall</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {MOULD_PRESETS.LIGHT_STANDARD.heightOfFall} cm
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-muted/30 border border-gray-100 dark:border-border">
                  <span className="text-gray-400 block text-[10px]">Blows / Layer</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {MOULD_PRESETS.LIGHT_STANDARD.blows} blows
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-muted/30 border border-gray-100 dark:border-border">
                  <span className="text-gray-400 block text-[10px]">Compaction Layers</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {MOULD_PRESETS.LIGHT_STANDARD.layers} layers
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Heavy Compaction Card */}
        <Card className="rounded-3xl border border-gray-100 dark:border-border shadow-sm overflow-hidden bg-white dark:bg-card">
          <CardHeader className="bg-purple-50/40 dark:bg-purple-950/20 border-b border-purple-100/60 dark:border-purple-900/30 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <Weight className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    Heavy Compaction Moulds
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Modified Proctor Compaction per IS 2720 (Part 8)
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-semibold text-[11px]"
              >
                IS 2720 Part 8
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Small Mould (1000 cm3) */}
            <div className="space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-muted/40 border border-gray-200 dark:border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-foreground">
                    Small Mould (1000 cm³)
                  </h4>
                  <p className="text-[11px] text-gray-500">25 blows/layer • 5 layers • 45 cm fall</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  1000 cm³
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="heavySmallEmptyWeight" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Empty Mould weight (W₁)
                </Label>
                <div className="relative">
                  <Input
                    id="heavySmallEmptyWeight"
                    type="number"
                    step="any"
                    value={form.heavySmallEmptyWeight}
                    onChange={(e) => handleChange('heavySmallEmptyWeight', e.target.value)}
                    placeholder="3989"
                    className="text-sm font-bold pl-3 pr-12 h-10 bg-white dark:bg-card"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-gray-400">
                    gms
                  </span>
                </div>
              </div>
            </div>

            {/* Big Mould (2250 cm3) */}
            <div className="space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-muted/40 border border-gray-200 dark:border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-foreground">
                    Big Mould (2250 cm³)
                  </h4>
                  <p className="text-[11px] text-gray-500">55 blows/layer • 5 layers • 45 cm fall</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  2250 cm³
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="heavyBigEmptyWeight" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Empty Mould weight (W₁)
                </Label>
                <div className="relative">
                  <Input
                    id="heavyBigEmptyWeight"
                    type="number"
                    step="any"
                    value={form.heavyBigEmptyWeight}
                    onChange={(e) => handleChange('heavyBigEmptyWeight', e.target.value)}
                    placeholder="5774"
                    className="text-sm font-bold pl-3 pr-12 h-10 bg-white dark:bg-card"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-gray-400">
                    gms
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCompactionSettingsManager;
