import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Calculator, User, Calendar, CreditCard, Wallet, AlertCircle, 
    Briefcase, Search, ArrowLeft, Save, Loader2, IndianRupee,
    ChevronRight, TrendingUp, Users, Info, Plus, History, ChevronLeft, Edit,
    Filter, X, RotateCcw, ClipboardCheck, CalendarOff, Grid3x3, List, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DEPARTMENTS, ROLES } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const WorkLogManager = () => {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [view, setView] = useState('list'); // 'list', 'employee_history', 'calculator'
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showCalculation, setShowCalculation] = useState(false);

    // Leave Management State
    const [leaves, setLeaves] = useState([]);
    const [loadingLeaves, setLoadingLeaves] = useState(false);
    const [leaveView, setLeaveView] = useState('calendar'); // 'calendar' or 'list'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [rangeStart, setRangeStart] = useState(null);
    const [rangeEnd, setRangeEnd] = useState(null);
    const [hoverDate, setHoverDate] = useState(null);
    const [leaveComment, setLeaveComment] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editingLeave, setEditingLeave] = useState(null);
    const [isEditLeaveDialogOpen, setIsEditLeaveDialogOpen] = useState(false);

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
                .neq('role', ROLES.SUPER_ADMIN.slug)
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

    const fetchLeaves = useCallback(async (userId, year) => {
        setLoadingLeaves(true);
        const from = `${year}-01-01`;
        const to = `${year}-12-31`;
        try {
            const { data, error } = await supabase
                .from('employee_leaves')
                .select('*')
                .eq('user_id', userId)
                .gte('leave_date', from)
                .lte('leave_date', to)
                .order('leave_date');
            if (error) throw error;
            setLeaves(data || []);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch leave records.", variant: "destructive" });
        } finally {
            setLoadingLeaves(false);
        }
    }, [toast]);

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setCurrentPage(1);
        setHistoryFilters({ month: 'all', year: 'all' });
        fetchAttendanceHistory(employee.id, 1, { month: 'all', year: 'all' });
        fetchLeaves(employee.id, selectedYear);
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

    const handleSaveLeave = async () => {
        if (!rangeStart) return;
        const end = rangeEnd || rangeStart;
        const [a, b] = rangeStart <= end ? [rangeStart, end] : [end, rangeStart];
        
        const dates = [];
        const cur = new Date(a);
        while (cur <= b) {
            dates.push(new Date(cur).toISOString().split('T')[0]);
            cur.setDate(cur.getDate() + 1);
        }

        setIsSaving(true);
        try {
            const rows = dates.map(d => ({
                user_id: selectedEmployee.id,
                leave_date: d,
                comments: leaveComment.trim() || null,
                created_by: authUser.id
            }));

            const { error } = await supabase
                .from('employee_leaves')
                .upsert(rows, { onConflict: 'user_id,leave_date' });
            
            if (error) throw error;

            toast({ title: "Success", description: `Marked ${dates.length} day(s) leave.` });
            setRangeStart(null);
            setRangeEnd(null);
            setLeaveComment('');
            fetchLeaves(selectedEmployee.id, selectedYear);
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLeave = async () => {
        if (!deleteTarget) return;
        try {
            const { error } = await supabase
                .from('employee_leaves')
                .delete()
                .eq('id', deleteTarget.id);
            if (error) throw error;
            toast({ title: "Success", description: "Leave removed." });
            fetchLeaves(selectedEmployee.id, selectedYear);
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleUpdateLeave = async () => {
        if (!editingLeave) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('employee_leaves')
                .update({ 
                    comments: leaveComment.trim() || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingLeave.id);
            
            if (error) throw error;

            toast({ title: "Success", description: "Leave record updated." });
            setIsEditLeaveDialogOpen(false);
            setEditingLeave(null);
            setLeaveComment('');
            fetchLeaves(selectedEmployee.id, selectedYear);
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

    const renderLeaveCalendar = () => {
        const monthIndices = Array.from({ length: 12 }, (_, i) => i);
        const leavesByDate = leaves.reduce((acc, l) => {
            acc[l.leave_date] = l;
            return acc;
        }, {});

        const getSelectedRange = () => {
            if (!rangeStart) return [];
            const end = rangeEnd || rangeStart;
            const [a, b] = rangeStart <= end ? [rangeStart, end] : [end, rangeStart];
            const dates = [];
            const cur = new Date(a);
            while (cur <= b) {
                dates.push(new Date(cur).toISOString().split('T')[0]);
                cur.setDate(cur.getDate() + 1);
            }
            return dates;
        };

        const selectedDates = getSelectedRange();

        const getHoverRange = () => {
            if (!rangeStart || rangeEnd || !hoverDate) return [];
            const [a, b] = rangeStart <= hoverDate ? [rangeStart, hoverDate] : [hoverDate, rangeStart];
            const dates = [];
            const cur = new Date(a);
            while (cur <= b) {
                dates.push(new Date(cur).toISOString().split('T')[0]);
                cur.setDate(cur.getDate() + 1);
            }
            return dates;
        };

        const hoveredDates = getHoverRange();

        const handleDayClick = (dateStr) => {
            const date = new Date(dateStr);
            if (!rangeStart || rangeEnd) {
                setRangeStart(date);
                setRangeEnd(null);
            } else {
                setRangeEnd(date);
            }
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => {
                            const newYear = selectedYear - 1;
                            setSelectedYear(newYear);
                            fetchLeaves(selectedEmployee.id, newYear);
                        }}>
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">{selectedYear}</h2>
                        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => {
                            const newYear = selectedYear + 1;
                            setSelectedYear(newYear);
                            fetchLeaves(selectedEmployee.id, newYear);
                        }}>
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                        <Button
                            variant={leaveView === 'calendar' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setLeaveView('calendar')}
                            className={`rounded-xl h-9 px-4 font-bold text-xs ${leaveView === 'calendar' ? 'bg-primary shadow-md' : 'text-gray-500'}`}
                        >
                            <Grid3x3 className="w-3.5 h-3.5 mr-2" /> Year View
                        </Button>
                        <Button
                            variant={leaveView === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setLeaveView('list')}
                            className={`rounded-xl h-9 px-4 font-bold text-xs ${leaveView === 'list' ? 'bg-primary shadow-md' : 'text-gray-500'}`}
                        >
                            <List className="w-3.5 h-3.5 mr-2" /> List View
                        </Button>
                    </div>
                </div>

                {leaveView === 'calendar' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {monthIndices.map(m => {
                            const firstDay = new Date(selectedYear, m, 1).getDay();
                            const daysInMonth = new Date(selectedYear, m + 1, 0).getDate();
                            const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(selectedYear, m, 1));

                            return (
                                <div key={m} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                                    <h3 className="text-sm font-black text-gray-900 tracking-tight px-1">{monthName}</h3>
                                    <div className="grid grid-cols-7 gap-1">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                            <div key={i} className="text-[9px] font-black text-gray-300 text-center uppercase py-1">{d}</div>
                                        ))}
                                        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const date = new Date(selectedYear, m, day);
                                            const dateStr = date.toISOString().split('T')[0];
                                            const isLeave = leavesByDate[dateStr];
                                            const isSelected = selectedDates.includes(dateStr);
                                            const isHovered = hoveredDates.includes(dateStr);
                                            const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => handleDayClick(dateStr)}
                                                    onMouseEnter={() => rangeStart && !rangeEnd && setHoverDate(date)}
                                                    onMouseLeave={() => setHoverDate(null)}
                                                    className={`
                                                        w-full aspect-square rounded-lg text-[11px] font-black transition-all flex items-center justify-center relative
                                                        ${isLeave ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 ring-2 ring-orange-200' : 'text-gray-600 hover:bg-gray-50'}
                                                        ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20 ring-2 ring-primary/20 scale-110 z-10' : ''}
                                                        ${isHovered ? 'bg-primary/20 text-primary' : ''}
                                                        ${isToday && !isLeave && !isSelected ? 'text-primary ring-1 ring-primary/30 font-black' : ''}
                                                    `}
                                                    title={isLeave ? `${isLeave.comments || 'On Leave'}` : ''}
                                                >
                                                    {day}
                                                    {isLeave && !isSelected && (
                                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full border-2 border-white shadow-sm" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Original Filter Row moved to List View */}
                        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4 animate-in fade-in duration-500">
                            <div className="flex items-center gap-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Month</Label>
                                <Select 
                                    value={historyFilters.month} 
                                    onValueChange={(val) => handleFilterChange('month', val)}
                                >
                                    <SelectTrigger className="w-32 h-9 rounded-xl border-gray-100 text-xs font-bold">
                                        <SelectValue placeholder="Select Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Months</SelectItem>
                                        {months.map((m, i) => (
                                            <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Year</Label>
                                <Select 
                                    value={historyFilters.year} 
                                    onValueChange={(val) => {
                                        handleFilterChange('year', val);
                                        if (val !== 'all') {
                                            const newYear = parseInt(val);
                                            setSelectedYear(newYear);
                                            fetchLeaves(selectedEmployee.id, newYear);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-24 h-9 rounded-xl border-gray-100 text-xs font-bold">
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Years</SelectItem>
                                        {years.map(y => (
                                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                    setHistoryFilters({ month: 'all', year: 'all' });
                                    setSelectedYear(new Date().getFullYear());
                                    fetchLeaves(selectedEmployee.id, new Date().getFullYear());
                                }}
                                className="text-xs font-bold text-gray-500 hover:text-primary rounded-xl"
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset
                            </Button>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left p-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Date</th>
                                        <th className="text-left p-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Comments</th>
                                        <th className="text-right p-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loadingLeaves ? (
                                        <tr><td colSpan="3" className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/20" /></td></tr>
                                    ) : (
                                        leaves
                                            .filter(l => {
                                                const leaveDate = new Date(l.leave_date);
                                                const matchesMonth = historyFilters.month === 'all' || leaveDate.getMonth() === parseInt(historyFilters.month);
                                                const matchesYear = historyFilters.year === 'all' || leaveDate.getFullYear() === parseInt(historyFilters.year);
                                                return matchesMonth && matchesYear;
                                            })
                                            .length === 0 ? (
                                                <tr><td colSpan="3" className="p-12 text-center text-gray-400 font-medium">No leave records found for the selected filters.</td></tr>
                                            ) : (
                                                leaves
                                                    .filter(l => {
                                                        const leaveDate = new Date(l.leave_date);
                                                        const matchesMonth = historyFilters.month === 'all' || leaveDate.getMonth() === parseInt(historyFilters.month);
                                                        const matchesYear = historyFilters.year === 'all' || leaveDate.getFullYear() === parseInt(historyFilters.year);
                                                        return matchesMonth && matchesYear;
                                                    })
                                                    .map(l => (
                                                        <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-5 font-black text-gray-900">{l.leave_date}</td>
                                                            <td className="p-5 text-gray-500 font-medium italic">{l.comments || '—'}</td>
                                                            <td className="p-5 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setEditingLeave(l);
                                                                            setLeaveComment(l.comments || '');
                                                                            setIsEditLeaveDialogOpen(true);
                                                                        }}
                                                                        className="text-gray-400 hover:text-primary rounded-xl"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setDeleteTarget(l)}
                                                                        className="text-gray-400 hover:text-red-500 rounded-xl"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                            )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Mark Leave Selection Controls */}
                {rangeStart && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-primary/20 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Period</span>
                            <span className="text-sm font-black text-primary">
                                {selectedDates.length} Day{selectedDates.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-gray-100" />
                        <Input
                            placeholder="Add leave comments..."
                            value={leaveComment}
                            onChange={e => setLeaveComment(e.target.value)}
                            className="w-64 h-10 rounded-xl border-transparent bg-gray-100/50 focus:bg-white transition-all text-sm font-medium"
                        />
                        <div className="flex items-center gap-2">
                            <Button onClick={() => {
                                setRangeStart(null);
                                setRangeEnd(null);
                                setLeaveComment('');
                            }} variant="ghost" className="rounded-xl h-10 px-4 font-bold text-xs text-gray-500">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveLeave} disabled={isSaving} className="bg-primary hover:bg-primary-dark text-white rounded-xl h-10 px-6 font-bold text-xs shadow-lg shadow-primary/20">
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                                Save Leave
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

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
                            <p className="text-gray-500 text-sm font-medium capitalize">
                                {String(selectedEmployee.role || 'No Role').replace('_', ' ')} • {
                                    (() => {
                                        const ids = Array.isArray(selectedEmployee.departments) ? selectedEmployee.departments : [];
                                        const names = ids.map(id => DEPARTMENTS.find(d => d.id === id)?.name).filter(Boolean);
                                        return names.join(', ') || 'No Department';
                                    })()
                                }
                            </p>
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



                {/* Simplified view: Only Leave Records */}
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2">
                        <CalendarOff className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Leave Records</h3>
                    </div>
                    {renderLeaveCalendar()}
                </div>

                {/* AlertDialog for Leave Deletion */}
                <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                    <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black text-gray-900 tracking-tight">Remove Leave Record?</AlertDialogTitle>
                            <AlertDialogDescription className="font-medium text-gray-500">
                                This will permanently delete the leave record for <span className="text-primary font-bold">{deleteTarget?.leave_date}</span>. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel className="rounded-xl h-11 px-6 font-bold text-gray-500 border-none hover:bg-gray-100">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteLeave} className="rounded-xl h-11 px-6 font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200">
                                Delete Record
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Dialog for Editing Leave Comment */}
                <Dialog open={isEditLeaveDialogOpen} onOpenChange={(open) => {
                    setIsEditLeaveDialogOpen(open);
                    if (!open) {
                        setEditingLeave(null);
                        setLeaveComment('');
                    }
                }}>
                    <DialogContent className="rounded-3xl border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-gray-900 tracking-tight">Edit Leave Comment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Leave Date</span>
                                <span className="text-sm font-black text-primary">{editingLeave?.leave_date}</span>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comments</Label>
                                <Textarea 
                                    value={leaveComment}
                                    onChange={e => setLeaveComment(e.target.value)}
                                    placeholder="Update leave comments..."
                                    className="rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white h-24 resize-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setIsEditLeaveDialogOpen(false)} variant="ghost" className="rounded-xl h-11 px-6 font-bold text-gray-500">
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateLeave} disabled={isSaving} className="bg-primary hover:bg-primary-dark text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Update Record
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">{String(emp.role || 'No Role').replace('_', ' ')}</Badge>
                                        <span className="text-[11px] text-gray-400 font-medium truncate">
                                            {(() => {
                                                const ids = Array.isArray(emp.departments) ? emp.departments : [];
                                                return ids.map(id => DEPARTMENTS.find(d => d.id === id)?.name).filter(Boolean).join(', ');
                                            })()}
                                        </span>
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
