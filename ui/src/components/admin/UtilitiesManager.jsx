import React, { useState, useEffect } from 'react';
import {
  Calculator,
  RotateCcw,
  TrendingUp,
  Info,
  Save,
  Loader2,
  IndianRupee,
  Briefcase,
  Calendar,
  ChevronRight,
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
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const UtilitiesManager = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('wage_calculator');

  // Wage Calculator State
  const [formData, setFormData] = useState({
    salary: '',
    totalWorkingDays: '',
    daysWorked: '',
    month: new Date().getMonth().toString(),
    year: new Date().getFullYear().toString(),
  });
  const [calculatedWage, setCalculatedWage] = useState(null);
  const [showCalculation, setShowCalculation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  const calculateWorkingDaysInMonth = (month, year) => {
    const m = parseInt(month);
    const y = parseInt(year);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let workingDaysCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m, day);
      if (date.getDay() !== 0) {
        // 0 is Sunday
        workingDaysCount++;
      }
    }
    return workingDaysCount;
  };

  useEffect(() => {
    if (formData.month && formData.year) {
      const days = calculateWorkingDaysInMonth(formData.month, formData.year);
      if (!formData.totalWorkingDays) {
        setFormData((prev) => ({
          ...prev,
          totalWorkingDays: days.toString(),
          daysWorked: days.toString(),
        }));
      }
    }
  }, [formData.month, formData.year]);

  const handleCalculate = () => {
    const { salary, totalWorkingDays, daysWorked } = formData;
    if (!salary || !totalWorkingDays || !daysWorked) {
      toast({
        title: 'Incomplete Details',
        description: 'Please enter salary and attendance details.',
        variant: 'destructive',
      });
      return;
    }
    const totalDays = parseFloat(totalWorkingDays);
    const workedDays = parseFloat(daysWorked);
    if (totalDays === 0) return;
    const dailyWage = parseFloat(salary) / totalDays;
    const totalWage = dailyWage * workedDays;
    setCalculatedWage(totalWage);
    setShowCalculation(true);
  };

  const handleResetCalculator = () => {
    setShowCalculation(false);
    setCalculatedWage(null);
    setFormData((prev) => ({
      ...prev,
      totalWorkingDays: '',
      daysWorked: '',
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Utilities</h1>
        <p className="text-gray-500 text-sm font-medium">
          Helpful tools and calculators for daily operations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border flex self-start">
          <TabsTrigger
            value="wage_calculator"
            className="rounded-xl px-6 py-2 font-black text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
          >
            <Calculator className="w-3.5 h-3.5 mr-2" /> Wage Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="wage_calculator"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight">Calculate Wages</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Select Year
                  </Label>
                  <Select
                    value={formData.year}
                    onValueChange={(val) =>
                      setFormData((p) => ({
                        ...p,
                        year: val,
                        totalWorkingDays: '',
                        daysWorked: '',
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-100 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Select Month
                  </Label>
                  <Select
                    value={formData.month}
                    onValueChange={(val) =>
                      setFormData((p) => ({
                        ...p,
                        month: val,
                        totalWorkingDays: '',
                        daysWorked: '',
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-100 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {months.map((m, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Monthly Salary (Base)
                </Label>
                <Input
                  type="number"
                  value={formData.salary}
                  placeholder="e.g. 25000"
                  onChange={(e) => setFormData((p) => ({ ...p, salary: e.target.value }))}
                  className="h-12 rounded-xl bg-gray-50/50 border-gray-100 font-black text-lg focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Total Working Days
                  </Label>
                  <Input
                    type="number"
                    value={formData.totalWorkingDays}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, totalWorkingDays: e.target.value }))
                    }
                    className="h-11 rounded-xl bg-gray-50/50 border-gray-100 font-bold"
                  />
                  <p className="text-[10px] text-gray-400 font-medium italic">
                    Usually excluding Sundays.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Days Worked
                  </Label>
                  <Input
                    type="number"
                    value={formData.daysWorked}
                    onChange={(e) => setFormData((p) => ({ ...p, daysWorked: e.target.value }))}
                    className="h-11 rounded-xl bg-gray-50/50 border-gray-100 font-bold"
                  />
                  <p className="text-[10px] text-gray-400 font-medium italic">
                    Employee's actual attendance.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                className="w-full bg-primary hover:bg-primary-dark text-white rounded-2xl h-14 font-black text-sm shadow-xl shadow-primary/20 mt-4"
              >
                <Calculator className="w-5 h-5 mr-2" /> Calculate Result
              </Button>
            </div>

            {/* Result Section */}
            <div className="relative">
              {showCalculation ? (
                <div className="bg-gradient-to-br from-primary to-green-500 p-10 rounded-[2.5rem] shadow-2xl shadow-primary/20 text-white h-full flex flex-col justify-center relative overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="w-48 h-48" />
                  </div>
                  <div className="relative z-10 space-y-2 text-center mb-10">
                    <h2 className="text-sm font-black opacity-80 uppercase tracking-[0.2em]">
                      Final Wage Payable
                    </h2>
                    <div className="text-7xl font-black tracking-tighter drop-shadow-md">
                      ₹
                      {calculatedWage !== null
                        ? calculatedWage.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '0.00'}
                    </div>
                    <p className="text-xs font-bold opacity-60 mt-2 uppercase tracking-widest">
                      For {months[parseInt(formData.month)]} {formData.year}
                    </p>
                  </div>

                  <div className="relative z-10 space-y-4 pt-8 border-t border-white/20">
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                      <span className="text-xs font-bold opacity-80 uppercase">Attendance</span>
                      <span className="font-black">
                        {formData.daysWorked} / {formData.totalWorkingDays} Days
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                      <span className="text-xs font-bold opacity-80 uppercase">Daily Rate</span>
                      <span className="font-black">
                        ₹
                        {(
                          parseFloat(formData.salary) / parseFloat(formData.totalWorkingDays)
                        ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-10 flex items-center gap-4 relative z-10">
                    <button
                      onClick={handleResetCalculator}
                      className="flex-grow rounded-2xl bg-white text-primary font-black px-6 py-4 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Calculate New
                    </button>
                    <button
                      onClick={handleResetCalculator}
                      title="Reset All"
                      className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] text-center space-y-6">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-md animate-bounce duration-[2000ms]">
                    <Calculator className="w-10 h-10 text-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-black text-xl text-gray-900 tracking-tight">
                      Ready to Calculate
                    </h3>
                    <p className="text-sm text-gray-400 font-medium max-w-[240px] mx-auto leading-relaxed">
                      Enter the base salary and attendance data on the left to see the calculated
                      wage.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    <Info className="w-3 h-3" />
                    <span>Pro-rata basis calculation</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UtilitiesManager;
