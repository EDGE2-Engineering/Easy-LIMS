import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Mountain,
  Gem,
  Save,
  RefreshCw,
  Layers,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Constant values for RMR parameters
const UCS_OPTIONS = [
  { value: '15', label: 'Exceptionally strong (> 250 MPa, PLI > 8)', rating: 15 },
  { value: '12', label: 'Very strong (100 - 250 MPa, PLI 4 - 8)', rating: 12 },
  { value: '7', label: 'Strong (50 - 100 MPa, PLI 2 - 4)', rating: 7 },
  { value: '4', label: 'Average (25 - 50 MPa, PLI 1 - 2)', rating: 4 },
  { value: '2', label: 'Weak (10 - 25 MPa)', rating: 2 },
  { value: '1', label: 'Very weak (2 - 10 MPa)', rating: 1 },
  { value: '0', label: 'Extremely weak (< 2 MPa)', rating: 0 },
];

const RQD_OPTIONS = [
  { value: '20', label: 'Excellent (90% - 100%)', rating: 20 },
  { value: '17', label: 'Good (75% - 90%)', rating: 17 },
  { value: '13', label: 'Fair (50% - 75%)', rating: 13 },
  { value: '8', label: 'Poor (25% - 50%)', rating: 8 },
  { value: '3', label: 'Very Poor (< 25%)', rating: 3 },
];

const SPACING_OPTIONS = [
  { value: '20', label: 'Very wide (> 2 m)', rating: 20 },
  { value: '15', label: 'Wide (0.6 - 2 m)', rating: 15 },
  { value: '10', label: 'Moderate (0.2 - 0.6 m)', rating: 10 },
  { value: '8', label: 'Close (0.06 - 0.2 m)', rating: 8 },
  { value: '5', label: 'Very close (< 0.06 m)', rating: 5 },
];

const CONDITION_OPTIONS = [
  { value: '30', label: 'Very rough / unweathered / tight / no separation', rating: 30 },
  { value: '25', label: 'Rough / slightly weathered / separation < 1 mm', rating: 25 },
  {
    value: '20',
    label: 'Slightly rough / moderately to highly weathered / separation < 1 mm',
    rating: 20,
  },
  {
    value: '10',
    label: 'Slickensided / 1-5 mm gauge OR 1-5 mm wide open continuous joints',
    rating: 10,
  },
  { value: '0', label: '> 5 mm thick soft gauge OR > 5 mm wide continuous joints', rating: 0 },
];

const GW_OPTIONS = [
  { value: '15', label: 'Completely dry (Inflow None)', rating: 15 },
  { value: '10', label: 'Damp (Inflow < 10 L/min)', rating: 10 },
  { value: '7', label: 'Wet (Inflow 10 - 25 L/min)', rating: 7 },
  { value: '4', label: 'Dripping (Inflow 25 - 125 L/min)', rating: 4 },
  { value: '0', label: 'Flowing (Inflow > 125 L/min)', rating: 0 },
];

const JOINT_OPTIONS = [
  { value: '0', label: 'Very Favourable', rating: 0 },
  { value: '-2', label: 'Favourable', rating: -2 },
  { value: '-7', label: 'Fair', rating: -7 },
  { value: '-15', label: 'Unfavourable', rating: -15 },
  { value: '-35', label: 'Very Unfavourable', rating: -35 },
];

const ROCK_TYPES = [
  { value: '0.40', label: 'Slightly jointed or hard rock (Nj = 0.40)', Nj: 0.4 },
  { value: '0.25', label: 'Moderately jointed / Medium hard rock (Nj = 0.25)', Nj: 0.25 },
  { value: '0.10', label: 'Highly jointed / Soft / Weathered rock (Nj = 0.10)', Nj: 0.1 },
];

const ROCK_ELASTIC_OPTIONS = [
  { value: '20000000', label: 'Hard rock (E = 20,000,000 kN/m²)', E: 20000000, mu: 0.1 },
  { value: '10000000', label: 'Medium hard rock (E = 10,000,000 kN/m²)', E: 10000000, mu: 0.2 },
  { value: '5000000', label: 'Soft rock (E = 5,000,000 kN/m²)', E: 5000000, mu: 0.3 },
  { value: '1000000', label: 'Weathered rock (E = 1,000,000 kN/m²)', E: 1000000, mu: 0.4 },
];

const LOCAL_STORAGE_KEY = 'rock_bearing_capacity_calc_inputs';

const AdminRockBearingCapacity = () => {
  const { toast } = useToast();

  // General inputs
  const [bhId, setBhId] = useState('');
  const [depthTop, setDepthTop] = useState('');
  const [depthBottom, setDepthBottom] = useState('');
  const [df, setDf] = useState('');
  const [widthB, setWidthB] = useState('');
  const [lengthL, setLengthL] = useState('');

  // Method I: Core Strength
  const [qc, setQc] = useState('');
  const [pli, setPli] = useState('');
  const [usePli, setUsePli] = useState(false);
  const [rockTypeNj, setRockTypeNj] = useState('0.40');
  const [cw, setCw] = useState('0.5');
  const [cj, setCj] = useState('0.5');

  // Settlement Inputs
  const [selectedElasticIndex, setSelectedElasticIndex] = useState('20000000');
  const [customE, setCustomE] = useState('');
  const [customMu, setCustomMu] = useState('');
  const [isCustomSettlement, setIsCustomSettlement] = useState(false);

  // Method II: RMR
  const [rmrUCS, setRmrUCS] = useState('12');
  const [rmrRQD, setRmrRQD] = useState('17');
  const [rmrSpacing, setRmrSpacing] = useState('15');
  const [rmrCondition, setRmrCondition] = useState('25');
  const [rmrGW, setRmrGW] = useState('15');
  const [rmrJoint, setRmrJoint] = useState('0');

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setBhId(data.bhId || '');
        setDepthTop(data.depthTop || '');
        setDepthBottom(data.depthBottom || '');
        setDf(data.df || '');
        setWidthB(data.widthB || '');
        setLengthL(data.lengthL || '');
        setQc(data.qc || '');
        setPli(data.pli || '');
        setUsePli(!!data.usePli);
        setRockTypeNj(data.rockTypeNj || '0.40');
        setCw(data.cw || '0.5');
        setCj(data.cj || '0.5');
        setSelectedElasticIndex(data.selectedElasticIndex || '20000000');
        setCustomE(data.customE || '');
        setCustomMu(data.customMu || '');
        setIsCustomSettlement(!!data.isCustomSettlement);
        setRmrUCS(data.rmrUCS || '12');
        setRmrRQD(data.rmrRQD || '17');
        setRmrSpacing(data.rmrSpacing || '15');
        setRmrCondition(data.rmrCondition || '25');
        setRmrGW(data.rmrGW || '15');
        setRmrJoint(data.rmrJoint || '0');
      } catch (e) {
        console.error('Error loading rock calc state:', e);
      }
    }
  }, []);

  // Save to local storage on change
  const saveState = (updated) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const updateField = (setter, key, val) => {
    setter(val);
    const saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    saveState({ ...saved, [key]: val });
  };

  const handleReset = () => {
    setBhId('');
    setDepthTop('');
    setDepthBottom('');
    setDf('');
    setWidthB('');
    setLengthL('');
    setQc('');
    setPli('');
    setUsePli(false);
    setRockTypeNj('0.40');
    setCw('0.5');
    setCj('0.5');
    setSelectedElasticIndex('20000000');
    setCustomE('');
    setCustomMu('');
    setIsCustomSettlement(false);
    setRmrUCS('12');
    setRmrRQD('17');
    setRmrSpacing('15');
    setRmrCondition('25');
    setRmrGW('15');
    setRmrJoint('0');
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    toast({
      title: 'Reset Completed',
      description: 'All inputs have been cleared.',
    });
  };

  // Calculations: Method I
  const nj = parseFloat(rockTypeNj) || 0.4;
  const cwVal = parseFloat(cw) || 0.5;
  const cjVal = parseFloat(cj) || 0.5;
  const B = parseFloat(widthB) || 0;
  const L = parseFloat(lengthL) || 0;

  let computedQc = 0;
  if (usePli) {
    const pliVal = parseFloat(pli) || 0;
    computedQc = 22 * pliVal;
  } else {
    computedQc = parseFloat(qc) || 0;
  }

  // Safe Bearing Pressure qs in N/mm²
  const qsNmm2 = computedQc * nj * cwVal * cjVal;
  // Convert to kN/m²
  const qsKnm2 = qsNmm2 * 1000;
  // Design SBP = 0.85 * qs
  const rawDesignSbp = qsKnm2 * 0.85;
  // Round down to the nearest multiple of 10
  const designSbp = Math.floor(rawDesignSbp / 10) * 10;

  // Settlement lookup
  const elasticConfig =
    ROCK_ELASTIC_OPTIONS.find((o) => o.value === selectedElasticIndex) || ROCK_ELASTIC_OPTIONS[0];
  const E_val = isCustomSettlement ? parseFloat(customE) || 1 : elasticConfig.E;
  const mu_val = isCustomSettlement ? parseFloat(customMu) || 0 : elasticConfig.mu;

  // Influence factor: Square footing = 0.82, otherwise 1.00
  const I_val = B > 0 && L > 0 && B === L ? 0.82 : 1.0;

  // Si immediate settlement in mm
  const immediateSettlementSi =
    E_val > 0 ? ((qsKnm2 * B * (1 - mu_val * mu_val) * I_val) / E_val) * 1000 : 0;
  const isSettlementSafe = immediateSettlementSi <= 12;

  // Calculations: Method II (RMR)
  const score1 = parseFloat(rmrUCS) || 0;
  const score2 = parseFloat(rmrRQD) || 0;
  const score3 = parseFloat(rmrSpacing) || 0;
  const score4 = parseFloat(rmrCondition) || 0;
  const score5 = parseFloat(rmrGW) || 0;
  const score6 = parseFloat(rmrJoint) || 0;

  const totalRMR = score1 + score2 + score3 + score4 + score5 + score6;

  // Linear interpolation on IS 12070 Table 3 RMR -> qnb mapping
  const getQnbFromRmr = (rmr) => {
    const score = Math.max(0, Math.min(100, rmr));
    if (score >= 81) {
      return 448 + ((score - 81) / (100 - 81)) * (600 - 448);
    } else if (score >= 61) {
      return 288 + ((score - 61) / (80 - 61)) * (440 - 288);
    } else if (score >= 41) {
      return 141 + ((score - 41) / (60 - 41)) * (280 - 141);
    } else if (score >= 21) {
      return 48 + ((score - 21) / (40 - 21)) * (135 - 48);
    } else {
      return 30 + ((score - 0) / 20) * (45 - 30);
    }
  };

  const qnb_t_m2 = getQnbFromRmr(totalRMR);
  const qnb_kn_m2 = qnb_t_m2 * 9.81;

  // Interpolation range description for step-by-step formula display
  const rmrInterpDesc = (() => {
    const score = Math.max(0, Math.min(100, totalRMR));
    if (score >= 81)
      return {
        rangeLabel: '81–100 (Class I)',
        formula: '448 + ((RMR − 81) / 19) × (600 − 448)',
        substitution: `448 + ((${score} − 81) / 19) × 152`,
      };
    if (score >= 61)
      return {
        rangeLabel: '61–80 (Class II)',
        formula: '288 + ((RMR − 61) / 19) × (440 − 288)',
        substitution: `288 + ((${score} − 61) / 19) × 152`,
      };
    if (score >= 41)
      return {
        rangeLabel: '41–60 (Class III)',
        formula: '141 + ((RMR − 41) / 19) × (280 − 141)',
        substitution: `141 + ((${score} − 41) / 19) × 139`,
      };
    if (score >= 21)
      return {
        rangeLabel: '21–40 (Class IV)',
        formula: '48 + ((RMR − 21) / 19) × (135 − 48)',
        substitution: `48 + ((${score} − 21) / 19) × 87`,
      };
    return {
      rangeLabel: '0–20 (Class V)',
      formula: '30 + ((RMR − 0) / 20) × (45 − 30)',
      substitution: `30 + ((${score} − 0) / 20) × 15`,
    };
  })();

  // Classification Descriptions
  let rmrClass = '—';
  let rmrDesc = '—';
  let rmrColor = 'text-gray-400';

  if (totalRMR >= 81 && totalRMR <= 100) {
    rmrClass = 'Class I';
    rmrDesc = 'Very Good Rock';
    rmrColor = 'text-emerald-600 font-bold';
  } else if (totalRMR >= 61 && totalRMR <= 80) {
    rmrClass = 'Class II';
    rmrDesc = 'Good Rock';
    rmrColor = 'text-green-600 font-bold';
  } else if (totalRMR >= 41 && totalRMR <= 60) {
    rmrClass = 'Class III';
    rmrDesc = 'Fair Rock';
    rmrColor = 'text-amber-600 font-bold';
  } else if (totalRMR >= 21 && totalRMR <= 40) {
    rmrClass = 'Class IV';
    rmrDesc = 'Poor Rock';
    rmrColor = 'text-orange-600 font-bold';
  } else if (totalRMR >= 0 && totalRMR <= 20) {
    rmrClass = 'Class V';
    rmrDesc = 'Very Poor Rock';
    rmrColor = 'text-red-600 font-bold';
  }

  // Format Helper
  const fmt = (val, dec = 2) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return val.toFixed(dec);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header and top actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <Gem className="w-6 h-6 text-primary" />
            </div>
            Bearing Capacity & Settlement of Rock Foundations
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Calculations resting on Rock in accordance with IS 12070:1987 & IS 13365 (Part 1):1998
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl h-10 px-4 border-dashed border-2 hover:border-red-500 hover:text-red-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset Form
          </Button>
          <Button
            onClick={() => {
              toast({
                title: 'Data Cached',
                description: 'Calculation state has been saved to your browser session.',
              });
            }}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 px-6 shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" /> Save Calculator State
          </Button>
        </div>
      </div>

      {/* General Input Parameters Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
          <Layers className="w-4 h-4 text-primary" /> General Foundation Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Borehole ID</Label>
            <Input
              value={bhId}
              onChange={(e) => updateField(setBhId, 'bhId', e.target.value)}
              placeholder="e.g. BH-01"
              className="rounded-xl h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Layer Top (m)</Label>
            <Input
              type="number"
              step="any"
              value={depthTop}
              onChange={(e) => updateField(setDepthTop, 'depthTop', e.target.value)}
              placeholder="0.00"
              className="rounded-xl h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Layer Bottom (m)</Label>
            <Input
              type="number"
              step="any"
              value={depthBottom}
              onChange={(e) => updateField(setDepthBottom, 'depthBottom', e.target.value)}
              placeholder="5.00"
              className="rounded-xl h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Depth of Foundation - Df (m)</Label>
            <Input
              type="number"
              step="any"
              value={df}
              onChange={(e) => updateField(setDf, 'df', e.target.value)}
              placeholder="1.50"
              className="rounded-xl h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Width B (m)</Label>
            <Input
              type="number"
              step="any"
              value={widthB}
              onChange={(e) => updateField(setWidthB, 'widthB', e.target.value)}
              placeholder="2.00"
              className="rounded-xl h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Length L (m)</Label>
            <Input
              type="number"
              step="any"
              value={lengthL}
              onChange={(e) => updateField(setLengthL, 'lengthL', e.target.value)}
              placeholder="2.00"
              className="rounded-xl h-9 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout for Method I and Method II */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Method I (Core Strength) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
              <Mountain className="w-4 h-4 text-primary" /> Method I: Core Strength (IS 12070)
            </h2>

            {/* Toggle Compressive Strength or PLI */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border">
              <span className="text-xs font-semibold text-gray-600">
                Calculate qc from Point Load Index?
              </span>
              <input
                type="checkbox"
                checked={usePli}
                onChange={(e) => updateField(setUsePli, 'usePli', e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!usePli ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Intact Strength qc (N/mm²)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={qc}
                    onChange={(e) => updateField(setQc, 'qc', e.target.value)}
                    placeholder="e.g. 50"
                    className="rounded-xl h-9 font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Point Load Index PLI (N/mm²)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={pli}
                    onChange={(e) => updateField(setPli, 'pli', e.target.value)}
                    placeholder="e.g. 2.5"
                    className="rounded-xl h-9 font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Rock Type empirical factor Nj</Label>
                <Select
                  value={rockTypeNj}
                  onValueChange={(v) => updateField(setRockTypeNj, 'rockTypeNj', v)}
                >
                  <SelectTrigger className="h-auto min-h-9 py-1.5 rounded-xl whitespace-normal text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROCK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Submergence Correction Cw</Label>
                <Input
                  type="number"
                  step="any"
                  value={cw}
                  onChange={(e) => updateField(setCw, 'cw', e.target.value)}
                  className="rounded-xl h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Joint Orientation Factor Cj</Label>
                <Input
                  type="number"
                  step="any"
                  value={cj}
                  onChange={(e) => updateField(setCj, 'cj', e.target.value)}
                  className="rounded-xl h-9 font-mono"
                />
              </div>
            </div>

            {/* Elastic Properties for Settlement */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Elastic Parameters & Settlement Verify
                </h3>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={isCustomSettlement}
                    onChange={(e) =>
                      updateField(setIsCustomSettlement, 'isCustomSettlement', e.target.checked)
                    }
                    className="w-3.5 h-3.5 accent-primary"
                    id="chkCustomSet"
                  />
                  <Label
                    htmlFor="chkCustomSet"
                    className="text-[10px] text-gray-400 cursor-pointer"
                  >
                    Custom E & μ
                  </Label>
                </div>
              </div>

              {!isCustomSettlement ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Elastic Rock Modulus (E)</Label>
                  <Select
                    value={selectedElasticIndex}
                    onValueChange={(v) =>
                      updateField(setSelectedElasticIndex, 'selectedElasticIndex', v)
                    }
                  >
                    <SelectTrigger className="h-9 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROCK_ELASTIC_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">E Modulus (kN/m²)</Label>
                    <Input
                      type="number"
                      value={customE}
                      onChange={(e) => updateField(setCustomE, 'customE', e.target.value)}
                      placeholder="e.g. 20000000"
                      className="rounded-xl h-9 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Poisson's Ratio (μ)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={customMu}
                      onChange={(e) => updateField(setCustomMu, 'customMu', e.target.value)}
                      placeholder="e.g. 0.15"
                      className="rounded-xl h-9 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Block - Method I */}
          <div className="mt-6 pt-6 border-t space-y-4 bg-gray-50 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">
              Method I Calculation Summary
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  qc Considered
                </p>
                <p className="text-lg font-mono font-bold text-gray-800 mt-1">
                  {fmt(computedQc)} N/mm²
                </p>
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-0.5">
                  <p className="text-[9px] font-mono text-gray-400 italic">
                    {usePli ? 'qc = 22 × PLI' : 'qc = Direct input'}
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">
                    {usePli
                      ? `= 22 × ${fmt(parseFloat(pli) || 0)} = ${fmt(computedQc)} N/mm²`
                      : `= ${fmt(computedQc)} N/mm²`}
                  </p>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Safe Pressure qs
                </p>
                <p className="text-lg font-mono font-bold text-gray-800 mt-1">
                  {fmt(qsKnm2, 1)} <span className="text-xs font-normal">kN/m²</span>
                </p>
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-0.5">
                  <p className="text-[9px] font-mono text-gray-400 italic">
                    qs = qc × Nj × Cw × Cj
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">
                    = {fmt(computedQc)} × {nj} × {cwVal} × {cjVal}
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">= {fmt(qsNmm2)} N/mm²</p>
                  <p className="text-[9px] font-mono text-gray-500">
                    = {fmt(qsNmm2)} × 1000 = {fmt(qsKnm2, 1)} kN/m²
                  </p>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-3 col-span-2">
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  Design SBP (0.85 × qs)
                </p>
                <div className="flex justify-between items-baseline mt-1">
                  <p className="text-2xl font-mono font-black text-primary">{designSbp} kN/m²</p>
                  <span className="text-[9px] text-gray-400 font-semibold italic">
                    Rounded down to nearest 10
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-0.5">
                  <p className="text-[9px] font-mono text-gray-400 italic">
                    Design SBP = qs (kN/m²) × 0.85, rounded down to nearest 10
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">
                    = {fmt(qsKnm2, 1)} × 0.85 = {fmt(rawDesignSbp, 2)}
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">≈ {designSbp} kN/m²</p>
                </div>
              </div>
            </div>

            {/* Settlement results */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Immediate Settlement (Si)
                  </p>
                  <p className="text-md font-mono font-bold text-gray-700">
                    {B > 0 && L > 0 ? `${fmt(immediateSettlementSi)} mm` : 'Enter dimensions'}
                  </p>
                  <p className="text-[8px] text-gray-400 font-semibold">
                    Influence I = {fmt(I_val)} | Limit = 12mm
                  </p>
                </div>
                {B > 0 && L > 0 && (
                  <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-black ${isSettlementSafe ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                  >
                    {isSettlementSafe ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" /> Safe
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" /> Unsafe
                      </>
                    )}
                  </div>
                )}
              </div>
              {B > 0 && L > 0 && (
                <div className="pt-2 border-t border-dashed border-gray-200 space-y-0.5">
                  <p className="text-[9px] font-mono text-gray-400 italic">
                    Si = [qs(kN/m²) × B × (1 − μ²) × I / E] × 1000
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">
                    {`= [${fmt(qsKnm2, 1)} × ${fmt(B)} × (1 − ${fmt(mu_val)}²) × ${fmt(I_val)} / ${E_val.toLocaleString()}] × 1000`}
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">
                    {`= [${fmt(qsKnm2, 1)} × ${fmt(B)} × ${fmt(1 - mu_val * mu_val, 4)} × ${fmt(I_val)} / ${E_val.toLocaleString()}] × 1000`}
                  </p>
                  <p className="text-[9px] font-mono text-gray-500 font-semibold">
                    {`= ${fmt(immediateSettlementSi)} mm`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Method II (RMR Method) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
              <Layers className="w-4 h-4 text-primary" /> Method II: Rock Mass Rating — RMR (IS
              13365)
            </h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-semibold">
                  1. Intact Rock Strength (UCS)
                </Label>
                <Select value={rmrUCS} onValueChange={(v) => updateField(setRmrUCS, 'rmrUCS', v)}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UCS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label} (Rating: {o.rating})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-semibold">
                  2. Rock Quality Designation (RQD)
                </Label>
                <Select value={rmrRQD} onValueChange={(v) => updateField(setRmrRQD, 'rmrRQD', v)}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RQD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label} (Rating: {o.rating})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-semibold">
                  3. Spacing of Discontinuities
                </Label>
                <Select
                  value={rmrSpacing}
                  onValueChange={(v) => updateField(setRmrSpacing, 'rmrSpacing', v)}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPACING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label} (Rating: {o.rating})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-semibold">
                  4. Condition of Discontinuities
                </Label>
                <Select
                  value={rmrCondition}
                  onValueChange={(v) => updateField(setRmrCondition, 'rmrCondition', v)}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label} (Rating: {o.rating})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-semibold">
                  5. Groundwater Conditions
                </Label>
                <Select value={rmrGW} onValueChange={(v) => updateField(setRmrGW, 'rmrGW', v)}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GW_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label} (Rating: {o.rating})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-semibold">
                  6. Adjustment for Joint Orientation (Raft)
                </Label>
                <Select
                  value={rmrJoint}
                  onValueChange={(v) => updateField(setRmrJoint, 'rmrJoint', v)}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOINT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label} (Rating: {o.rating})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Results Block - Method II */}
          <div className="mt-6 pt-6 border-t space-y-4 bg-gray-50 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">
              Method II Calculation Summary
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Total RMR Score
                </p>
                <p className="text-xl font-mono font-black text-gray-800 mt-1">{totalRMR} / 100</p>
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-0.5">
                  <p className="text-[9px] font-mono text-gray-400 italic">
                    RMR = R1 + R2 + R3 + R4 + R5 + R6
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">
                    = {score1} + {score2} + {score3} + {score4} + {score5} + ({score6}) = {totalRMR}
                  </p>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Classification
                </p>
                <p className={`text-xs mt-1 ${rmrColor}`}>
                  {rmrClass} — {rmrDesc}
                </p>
              </div>

              <div className="bg-white border rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Interpolated qnb (IS 12070)
                </p>
                <p className="text-lg font-mono font-bold text-gray-800 mt-1">
                  {fmt(qnb_t_m2)} t/m²
                </p>
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-0.5">
                  <p className="text-[9px] font-mono text-gray-400 italic">
                    RMR range: {rmrInterpDesc.rangeLabel}
                  </p>
                  <p className="text-[9px] font-mono text-gray-400 italic">
                    qnb = {rmrInterpDesc.formula}
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">
                    = {rmrInterpDesc.substitution}
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">= {fmt(qnb_t_m2)} t/m²</p>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-3">
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  SBC in Metric Units (qnb)
                </p>
                <p className="text-lg font-mono font-black text-primary mt-1">
                  {fmt(qnb_kn_m2, 1)} <span className="text-xs font-semibold">kN/m²</span>
                </p>
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-0.5">
                  <p className="text-[9px] font-mono text-gray-400 italic">
                    qnb (kN/m²) = qnb (t/m²) × 9.81
                  </p>
                  <p className="text-[9px] font-mono text-gray-500">
                    = {fmt(qnb_t_m2)} × 9.81 = {fmt(qnb_kn_m2, 1)} kN/m²
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-gray-400 font-semibold italic border-t pt-2 mt-2 leading-tight">
              * Note: Interpolation is computed continuously against values defined in IS 12070:1987
              Table 3 database.
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
          <CheckCircle className="w-4 h-4 text-primary" /> SBC Comparison & Summary Recommendations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-xl p-4 space-y-1 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Method I: Core Strength SBP
            </p>
            <p className="text-2xl font-black font-mono text-gray-800 mt-1">{designSbp} kN/m²</p>
            <p className="text-[9px] text-gray-400 leading-tight">
              Settlement condition: {isSettlementSafe ? 'SAFE' : 'UNSAFE'}
            </p>
          </div>

          <div className="border rounded-xl p-4 space-y-1 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Method II: RMR SBC
            </p>
            <p className="text-2xl font-black font-mono text-gray-800 mt-1">
              {fmt(qnb_kn_m2, 1)} kN/m²
            </p>
            <p className="text-[9px] text-gray-400 leading-tight">
              Rock Class: {rmrClass} ({rmrDesc})
            </p>
          </div>

          <div className="border border-primary/20 rounded-xl p-4 space-y-1 bg-primary/5">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Recommended Design SBC
            </p>
            <p className="text-3xl font-black font-mono text-primary mt-1">
              {fmt(Math.min(designSbp, qnb_kn_m2), 1)}{' '}
              <span className="text-sm font-bold">kN/m²</span>
            </p>
            <p className="text-[9px] text-primary/80 font-semibold leading-tight mt-1">
              Governed by conservative design envelope limit
            </p>
            <div className="mt-2 pt-2 border-t border-dashed border-primary/20 space-y-0.5">
              <p className="text-[9px] font-mono text-primary/60 italic">
                SBC = min(Method I Design SBP, Method II RMR SBC)
              </p>
              <p className="text-[9px] font-mono text-primary/70">
                {`= min(${designSbp}, ${fmt(qnb_kn_m2, 1)}) = ${fmt(Math.min(designSbp, qnb_kn_m2), 1)} kN/m²`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulae Reference Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" /> Rock Calculations Reference (IS 12070 /
            IS 13365)
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">
            Specifications, symbols, constants, and formulas used for rock bearing capacity
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-6">Parameter</th>
                <th className="py-3 px-4 text-center">Symbol</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4">Standard Reference</th>
                <th className="py-3 px-6">Formula / Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              <tr>
                <td className="py-3 px-6 font-semibold">Safe Bearing Pressure (Method I)</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-primary">qs</td>
                <td className="py-3 px-4 text-center font-mono">N/mm²</td>
                <td className="py-3 px-4">IS 12070 : 1987</td>
                <td className="py-3 px-6 font-mono text-[11px]">qc × Nj × Cw × Cj</td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-semibold">Point Load Compressive Strength</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-primary">qc</td>
                <td className="py-3 px-4 text-center font-mono">N/mm²</td>
                <td className="py-3 px-4">Fallback calculation</td>
                <td className="py-3 px-6 font-mono text-[11px]">qc = 22 × PLI</td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-semibold">Design Safe Bearing Pressure</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-primary">
                  Design SBP
                </td>
                <td className="py-3 px-4 text-center font-mono">kN/m²</td>
                <td className="py-3 px-4">Core strength discount</td>
                <td className="py-3 px-6 font-mono text-[11px]">
                  qs (in kN/m²) × 0.85 (rounded down to nearest 10)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-semibold">Immediate Settlement</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-primary">Si</td>
                <td className="py-3 px-4 text-center font-mono">mm</td>
                <td className="py-3 px-4">Elastic formula</td>
                <td className="py-3 px-6 font-mono text-[11px]">
                  [qs × B × (1 − μ²) × I / E] × 1000
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-semibold">Poisson's Ratio</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-primary">μ</td>
                <td className="py-3 px-4 text-center font-mono">—</td>
                <td className="py-3 px-4">Rock type lookup</td>
                <td className="py-3 px-6">
                  Weathered: 0.40 | Soft: 0.30 | Medium hard: 0.20 | Hard: 0.10
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-semibold">Modulus of Elasticity</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-primary">E</td>
                <td className="py-3 px-4 text-center font-mono">kN/m²</td>
                <td className="py-3 px-4">Rock type lookup</td>
                <td className="py-3 px-6">
                  Weathered: 1.0M | Soft: 5.0M | Medium: 10.0M | Hard: 20.0M
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-semibold">Rock Mass Rating</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-primary">RMR</td>
                <td className="py-3 px-4 text-center font-mono">—</td>
                <td className="py-3 px-4">IS 13365 (Part 1) : 1998</td>
                <td className="py-3 px-6 font-mono text-[11px]">
                  Σ (Strength + RQD + Spacing + Condition + GW + Joint)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-semibold">Net Safe Bearing Pressure (Method II)</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-primary">qnb</td>
                <td className="py-3 px-4 text-center font-mono">kN/m²</td>
                <td className="py-3 px-4">IS 12070 : Table 3</td>
                <td className="py-3 px-6 font-mono text-[11px]">
                  qnb (in t/m²) × 9.81 [qnb interpolated from RMR table]
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[10px] text-gray-400 italic">
            Reference codes: IS 12070 : 1987 (Code of practice for design and construction of
            shallow foundations on rocks) · IS 13365 Part 1 : 1998 (Guidelines for geotechnical
            classification of rock mass)
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRockBearingCapacity;
