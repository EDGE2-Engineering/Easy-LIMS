import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, User, Calendar, CreditCard, Receipt, Wallet, AlertCircle, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';

const WageCalculator = () => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        employeeName: '',
        salary: '',
        totalWorkingDays: '', // Total possible working days in that month
        daysWorked: '',      // Days actually worked by the employee
        month: new Date().getMonth().toString(),
        year: new Date().getFullYear().toString()
    });
    const [calculatedWage, setCalculatedWage] = useState(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 5;
        const endYear = currentYear + 1;
        const result = [];
        for (let y = endYear; y >= startYear; y--) {
            result.push(y.toString());
        }
        return result;
    }, []);

    const calculateWorkingDaysInMonth = (month, year) => {
        const m = parseInt(month);
        const y = parseInt(year);
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        let workingDaysCount = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(y, m, day);
            if (date.getDay() !== 0) { // 0 is Sunday
                workingDaysCount++;
            }
        }
        return workingDaysCount;
    };

    useEffect(() => {
        if (formData.month && formData.year) {
            const days = calculateWorkingDaysInMonth(formData.month, formData.year);
            setFormData(prev => ({ 
                ...prev, 
                totalWorkingDays: days.toString(),
                daysWorked: days.toString() // Default to full attendance
            }));
        }
    }, [formData.month, formData.year]);

    const calculateWage = () => {
        const { salary, totalWorkingDays, daysWorked } = formData;

        if (!formData.employeeName || !salary || !totalWorkingDays || !daysWorked) {
            toast({
                title: "Incomplete Details",
                description: "Please fill in all fields to calculate wage.",
                variant: "destructive"
            });
            return;
        }

        const totalDays = parseFloat(totalWorkingDays);
        const workedDays = parseFloat(daysWorked);

        if (totalDays === 0) {
            toast({ title: "Error", description: "Total working days cannot be zero.", variant: "destructive" });
            return;
        }

        // Calculation: (Salary / Total Working Days in Month) * Days Employee Worked
        const dailyWage = parseFloat(salary) / totalDays; 
        const totalWage = dailyWage * workedDays;
        
        setCalculatedWage(totalWage);
        
        toast({
            title: "Wage Calculated",
            description: `Calculated wage for ${formData.employeeName}: ₹${totalWage.toLocaleString()}.`
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Calculator className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Wage Calculator</h1>
                        <p className="text-gray-500 font-medium">Precision wage calculation based on monthly working days</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-gray-900">Enter Details</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center">
                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                Employee Name
                            </Label>
                            <Input
                                placeholder="Enter full name"
                                value={formData.employeeName}
                                onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                                className="h-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center">
                                <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                                Monthly Salary (₹)
                            </Label>
                            <Input
                                type="number"
                                placeholder="Full monthly salary"
                                value={formData.salary}
                                onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                                className="h-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                    Year
                                </Label>
                                <Select 
                                    value={formData.year} 
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, year: val }))}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-gray-100">
                                        {years.map(y => (
                                            <SelectItem key={y} value={y} className="rounded-xl">{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                    Month
                                </Label>
                                <Select 
                                    value={formData.month} 
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, month: val }))}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-gray-100">
                                        {months.map((m, idx) => (
                                            <SelectItem key={m} value={idx.toString()} className="rounded-xl">{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                    Working Days
                                </Label>
                                <Input
                                    type="number"
                                    value={formData.totalWorkingDays}
                                    onChange={(e) => setFormData(prev => ({ ...prev, totalWorkingDays: e.target.value }))}
                                    className="h-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium"
                                />
                                <p className="text-[10px] text-gray-400 font-medium pl-1 italic">
                                    Total work days in {months[parseInt(formData.month)]}, {formData.year}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                                    Days Worked
                                </Label>
                                <Input
                                    type="number"
                                    placeholder="Employee attendance"
                                    value={formData.daysWorked}
                                    onChange={(e) => setFormData(prev => ({ ...prev, daysWorked: e.target.value }))}
                                    className="h-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium"
                                />
                                <p className="text-[10px] text-gray-400 font-medium pl-1 italic">
                                    Days employee worked
                                </p>
                            </div>
                        </div>

                        <Button 
                            onClick={calculateWage}
                            className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-lg shadow-primary/20 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                        >
                            Calculate Wage
                        </Button>
                    </div>
                </div>

                {/* Result Section */}
                <div className="flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-primary to-green-300 p-8 rounded-3xl shadow-xl shadow-primary/20 text-white flex-grow flex flex-col justify-center">
                        <div className="space-y-2 mb-8">
                            <h2 className="text-lg font-medium opacity-80 uppercase tracking-widest text-center">Calculated Wage</h2>
                            <div className="flex items-center justify-center">
                                <span className="text-5xl font-black tracking-tighter">
                                    ₹{calculatedWage !== null ? calculatedWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                </span>
                            </div>
                        </div>
                        
                        {calculatedWage !== null && (
                            <div className="space-y-4 pt-6 border-t border-white/10">
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-60">Employee</span>
                                    <span className="font-bold">{formData.employeeName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-60">Period</span>
                                    <span className="font-bold">{months[parseInt(formData.month)]} {formData.year}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-60">Attendance</span>
                                    <span className="font-bold">{formData.daysWorked} / {formData.totalWorkingDays} Days</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-60">Daily Rate</span>
                                    <span className="font-bold">₹{(parseFloat(formData.salary) / parseFloat(formData.totalWorkingDays)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        )}
                        
                        {calculatedWage === null && (
                            <div className="flex items-center justify-center p-8 bg-black/5 rounded-2xl border border-white/5 italic opacity-60 text-sm text-center">
                                Enter employee details and click calculate to see the result
                            </div>
                        )}
                    </div>

                    {/* Quick Info Card */}
                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-blue-900">Calculation Formula</h3>
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                (Salary ÷ Total Working Days in Month) × Days Actually Worked. 
                                <br />
                                <span className="italic">* Sundays are excluded from the default total working days.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WageCalculator;
