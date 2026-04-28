import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calculator, User, Calendar, CreditCard, Wallet, AlertCircle, 
    Briefcase, Search, ArrowLeft, Save, Loader2, IndianRupee,
    ChevronRight, TrendingUp, Users, Info, Plus, History, ChevronLeft, Edit,
    Filter, X, RotateCcw, ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const WorkLogManager = () => {
    const { toast } = useToast();
    const [view, setView] = useState('list'); // 'list', 'employee_history', 'calculator'
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showCalculation, setShowCalculation] = useState(false);

    // History & Pagination State
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    // Filter State for History
    const [historyFilters, setHistoryFilters] = useState({
        month: 'all',
        year: 'all'
    });

    // Calculator State
    const [formData, setFormData] = useState({
        employeeName: '',
        salary: '',
        totalWorkingDays: '',
        daysWorked: '',
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
        const result = [];
        for (let y = currentYear; y >= startYear; y--) {
            result.push(y.toString());
        }
        return result;
    }, []);

    useEffect(() => {
        if (view === 'list') {
            fetchEmployees();
        }
    }, [view]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('full_name');
            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch employees.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceHistory = async (userId, page = 1, filters = historyFilters) => {
        setHistoryLoading(true);
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('employee_attendance')
                .select('*', { count: 'exact' })
                .eq('user_id', userId);

            if (filters.month !== 'all') {
                query = query.eq('month', parseInt(filters.month));
            }
            if (filters.year !== 'all') {
                query = query.eq('year', parseInt(filters.year));
            }

            const { data, error, count } = await query
                .order('year', { ascending: false })
                .order('month', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setAttendanceHistory(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch attendance records.", variant: "destructive" });
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setCurrentPage(1);
        setHistoryFilters({ month: 'all', year: 'all' });
        fetchAttendanceHistory(employee.id, 1, { month: 'all', year: 'all' });
        setView('employee_history');
    };

    const handleAddEntry = () => {
        setFormData({
            employeeName: selectedEmployee.full_name || selectedEmployee.username,
            salary: selectedEmployee.base_salary || '',
            month: new Date().getMonth().toString(),
            year: new Date().getFullYear().toString(),
            totalWorkingDays: '',
            daysWorked: ''
        });
        setCalculatedWage(null);
        setShowCalculation(false);
        setView('calculator');
    };

    const handleEditEntry = (entry) => {
        setFormData({
            employeeName: selectedEmployee.full_name || selectedEmployee.username,
            salary: selectedEmployee.base_salary || '',
            month: entry.month.toString(),
            year: entry.year.toString(),
            totalWorkingDays: entry.total_working_days.toString(),
            daysWorked: entry.days_worked.toString()
        });
        setCalculatedWage(null);
        setShowCalculation(false);
        setView('calculator');
    };

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
        if (formData.month && formData.year && view === 'calculator') {
            const days = calculateWorkingDaysInMonth(formData.month, formData.year);
            // Only auto-populate if fields are empty
            if (!formData.totalWorkingDays) {
                setFormData(prev => ({ 
                    ...prev, 
                    totalWorkingDays: days.toString(),
                    daysWorked: days.toString() 
                }));
            }
        }
    }, [formData.month, formData.year, view]);

    const handleCalculate = () => {
        const { salary, totalWorkingDays, daysWorked } = formData;
        if (!salary || !totalWorkingDays || !daysWorked) {
            toast({ title: "Incomplete Details", description: "Please enter salary and attendance details.", variant: "destructive" });
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
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const totalDays = parseFloat(formData.totalWorkingDays);
            const workedDays = parseFloat(formData.daysWorked);
            
            const attendanceData = {
                user_id: selectedEmployee.id,
                month: parseInt(formData.month),
                year: parseInt(formData.year),
                total_working_days: totalDays,
                days_worked: workedDays,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('employee_attendance')
                .upsert(attendanceData, { onConflict: 'user_id,month,year' });

            if (error) throw error;

            toast({ title: "Success", description: "Work log entry saved successfully." });
            fetchAttendanceHistory(selectedEmployee.id, currentPage);
            setView('employee_history');
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...historyFilters, [key]: value };
        setHistoryFilters(newFilters);
        setCurrentPage(1);
        fetchAttendanceHistory(selectedEmployee.id, 1, newFilters);
    };

    const filteredEmployees = employees.filter(emp => 
        (emp.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (view === 'employee_history') {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
                <Button variant="ghost" onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Employee List
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{selectedEmployee.full_name || selectedEmployee.username}</h1>
                            <p className="text-gray-500 text-sm font-medium capitalize">{selectedEmployee.role} • {selectedEmployee.department || 'No Department'}</p>
                        </div>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleAddEntry} className="bg-primary hover:bg-primary-dark text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-primary/20">
                                <Plus className="w-4 h-4 mr-2" /> Add Work Log
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Record monthly attendance for this employee</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Filters Section */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-end gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Filter Year
                        </Label>
                        <Select value={historyFilters.year} onValueChange={(v) => handleFilterChange('year', v)}>
                            <SelectTrigger className="w-32 h-10 rounded-xl bg-gray-50 border-transparent focus:ring-primary font-medium">
                                <SelectValue placeholder="All Years" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Years</SelectItem>
                                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5" /> Filter Month
                        </Label>
                        <Select value={historyFilters.month} onValueChange={(v) => handleFilterChange('month', v)}>
                            <SelectTrigger className="w-40 h-10 rounded-xl bg-gray-50 border-transparent focus:ring-primary font-medium">
                                <SelectValue placeholder="All Months" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Months</SelectItem>
                                {months.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {(historyFilters.month !== 'all' || historyFilters.year !== 'all') && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                                const reset = { month: 'all', year: 'all' };
                                setHistoryFilters(reset);
                                fetchAttendanceHistory(selectedEmployee.id, 1, reset);
                            }}
                            className="h-10 text-gray-400 hover:text-red-500 rounded-xl"
                        >
                            <X className="w-4 h-4 mr-2" /> Clear
                        </Button>
                    )}
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left p-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Month</th>
                                    <th className="text-left p-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Year</th>
                                    <th className="text-left p-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Attendance Ratio</th>
                                    <th className="text-left p-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Performance</th>
                                    <th className="text-right p-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {historyLoading ? (
                                    <tr><td colSpan="5" className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/20" /></td></tr>
                                ) : (
                                    attendanceHistory.map((entry) => {
                                        const percentage = ((entry.days_worked / entry.total_working_days) * 100);
                                        return (
                                            <tr 
                                                key={entry.id} 
                                                onClick={() => handleEditEntry(entry)}
                                                className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                                            >
                                                <td className="p-5">
                                                    <span className="font-bold text-gray-900">{months[entry.month]}</span>
                                                </td>
                                                <td className="p-5">
                                                    <span className="text-gray-500 font-medium">{entry.year}</span>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-700">{entry.days_worked} / {entry.total_working_days}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Working Days</span>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                                                            <div 
                                                                className={`h-full rounded-full ${percentage >= 90 ? 'bg-green-500' : percentage >= 75 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <Badge variant="secondary" className={`text-[10px] py-0 border-transparent ${percentage >= 90 ? 'bg-green-50 text-green-700' : percentage >= 75 ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                            {percentage.toFixed(0)}%
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-primary opacity-100 transition-all">
                                                        <Edit className="w-4 h-4" />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                {!historyLoading && attendanceHistory.length === 0 && (
                                    <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-medium">No records found matching the criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalCount > pageSize && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                        const newPage = currentPage - 1;
                                        setCurrentPage(newPage);
                                        fetchAttendanceHistory(selectedEmployee.id, newPage);
                                    }}
                                    disabled={currentPage === 1}
                                    className="rounded-lg h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-xs font-bold text-gray-600 px-2">{currentPage}</span>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                        const newPage = currentPage + 1;
                                        setCurrentPage(newPage);
                                        fetchAttendanceHistory(selectedEmployee.id, newPage);
                                    }}
                                    disabled={currentPage * pageSize >= totalCount}
                                    className="rounded-lg h-8 w-8 p-0"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'calculator') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
                <Button variant="ghost" onClick={() => setView('employee_history')} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to History
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Entry for {months[parseInt(formData.month)]} {formData.year}</h1>
                            <p className="text-gray-500 text-sm font-medium uppercase">{selectedEmployee.full_name || selectedEmployee.username}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-dark text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-primary/20">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Work Log
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                <p className="text-xs">Commit this work log to the database</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Year</Label>
                                <Select value={formData.year} onValueChange={(val) => setFormData(p => ({ ...p, year: val, totalWorkingDays: '', daysWorked: '' }))}>
                                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-100"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Month</Label>
                                <Select value={formData.month} onValueChange={(val) => setFormData(p => ({ ...p, month: val, totalWorkingDays: '', daysWorked: '' }))}>
                                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-100"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">{months.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Working Days</Label>
                                <Input type="number" value={formData.totalWorkingDays} onChange={e => setFormData(p => ({ ...p, totalWorkingDays: e.target.value }))} className="h-11 rounded-xl bg-gray-50/50 border-gray-100 font-medium" />
                                <p className="text-xs text-gray-500">Number of working days for EDGE2 in the month. Sundays are excluded.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Days Worked</Label>
                                <Input type="number" value={formData.daysWorked} onChange={e => setFormData(p => ({ ...p, daysWorked: e.target.value }))} className="h-11 rounded-xl bg-gray-50/50 border-gray-100 font-medium" />
                                <p className="text-xs text-gray-500">Number of days worked by the employee in the month.</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        {showCalculation ? (
                            <div className="bg-gradient-to-br from-primary to-green-500 p-8 rounded-3xl shadow-xl shadow-primary/20 text-white h-full flex flex-col justify-center relative overflow-hidden animate-in zoom-in-95 duration-300">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-32 h-32" /></div>
                                <div className="relative z-10 space-y-2 text-center mb-8">
                                    <h2 className="text-lg font-medium opacity-80 uppercase tracking-widest">Calculated Wage</h2>
                                    <div className="text-5xl font-black tracking-tighter">₹{calculatedWage !== null ? calculatedWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
                                </div>
                                <div className="relative z-10 space-y-3 pt-6 border-t border-white/10">
                                    <div className="flex justify-between text-sm"><span className="opacity-70">Attendance</span><span className="font-bold">{formData.daysWorked} / {formData.totalWorkingDays} Days</span></div>
                                    <div className="flex justify-between text-sm"><span className="opacity-70">Daily Rate</span><span className="font-bold">₹{(parseFloat(formData.salary) / parseFloat(formData.totalWorkingDays)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                                </div>
                                <div className="mt-8 flex items-center gap-3 relative z-10">
                                    <button onClick={handleCalculate} className="flex-grow rounded-xl bg-white text-primary font-bold px-6 py-3 shadow-sm hover:shadow-md transition-all">Recalculate</button>
                                    <button onClick={handleResetCalculator} title="Reset Calculation" className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm">
                                        <RotateCcw className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl text-center space-y-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm"><Info className="w-8 h-8 text-gray-300" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Wage Calculation</h3>
                                    <div className="space-y-2 mt-6 mb-6 w-64">
                                        <Input type="number" value={formData.salary} placeholder='Enter Monthly Salary' onChange={e => setFormData(p => ({ ...p, salary: e.target.value }))} className="h-11 rounded-xl bg-white border-gray-200 font-medium text-center" />
                                    </div>
                                    <p className="text-sm text-gray-500 max-w-[200px] mx-auto mt-1">Entered salary is for calculation only and will not be saved.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleCalculate} className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"><Calculator className="w-4 h-4 mr-2" /> Calculate Wage</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* <div>
                    <h1 className="text-md font-bold text-gray-900 tracking-tight flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-primary" /> Employee Work Log</h1>
                    <p className="text-gray-500 text-sm">Track and manage monthly attendance records for all employees</p>
                </div> */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11 rounded-xl bg-white border-gray-200 focus:ring-primary shadow-sm" />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.map(emp => (
                        <div key={emp.id} onClick={() => handleEmployeeSelect(emp)} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors"><User className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" /></div>
                                <div className="flex-grow min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate">{emp.full_name || emp.username}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">{emp.role}</Badge>
                                        <span className="text-[11px] text-gray-400 font-medium truncate">{emp.department || 'Unassigned'}</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkLogManager;
