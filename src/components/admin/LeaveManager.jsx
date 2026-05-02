
import React, { useState, useEffect, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, User, CalendarDays, Check, X,
    Loader2, MessageSquare, Trash2, Search, CalendarOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { ROLES } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const toDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const LeaveManager = () => {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();

    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [employees, setEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]); // all leaves for this month
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [loadingLeaves, setLoadingLeaves] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Selection state
    const [rangeStart, setRangeStart] = useState(null);
    const [rangeEnd, setRangeEnd] = useState(null);
    const [hoverDate, setHoverDate] = useState(null);

    // Form state
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [comment, setComment] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    // Delete
    const [deleteTarget, setDeleteTarget] = useState(null);

    // ── Computed ─────────────────────────────────────────────────────────────
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarCells = [];
    for (let i = 0; i < firstDay; i++) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(new Date(year, month, d));

    const getSelectedRange = () => {
        if (!rangeStart) return [];
        const end = rangeEnd || rangeStart;
        const [a, b] = rangeStart <= end ? [rangeStart, end] : [end, rangeStart];
        const dates = [];
        const cur = new Date(a);
        while (cur <= b) {
            dates.push(toDateStr(cur));
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
            dates.push(toDateStr(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return dates;
    };

    const hoverRange = getHoverRange();

    const filteredEmployees = employees.filter(e =>
        (e.full_name || e.username || '').toLowerCase().includes(employeeSearch.toLowerCase())
    );

    // Leaves grouped by date for calendar dots
    const leavesByDate = {};
    leaves.forEach(l => {
        if (!leavesByDate[l.leave_date]) leavesByDate[l.leave_date] = [];
        leavesByDate[l.leave_date].push(l);
    });

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchEmployees = useCallback(async () => {
        setLoadingEmployees(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, username, role')
                .neq('role', ROLES.SUPER_ADMIN.slug)
                .eq('is_active', true)
                .order('full_name');
            if (error) throw error;
            setEmployees(data || []);
        } catch {
            toast({ title: 'Error', description: 'Failed to load employees.', variant: 'destructive' });
        } finally {
            setLoadingEmployees(false);
        }
    }, []);

    const fetchLeaves = useCallback(async () => {
        setLoadingLeaves(true);
        const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        try {
            const { data, error } = await supabase
                .from('employee_leaves')
                .select('*, users!employee_leaves_user_id_fkey(full_name, username)')
                .gte('leave_date', from)
                .lte('leave_date', to)
                .order('leave_date');
            if (error) throw error;
            setLeaves(data || []);
        } catch {
            toast({ title: 'Error', description: 'Failed to load leave records.', variant: 'destructive' });
        } finally {
            setLoadingLeaves(false);
        }
    }, [year, month, daysInMonth]);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
    useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

    // ── Calendar interaction ──────────────────────────────────────────────────
    const handleDayClick = (date) => {
        if (!rangeStart || rangeEnd) {
            // Start new selection
            setRangeStart(date);
            setRangeEnd(null);
        } else {
            // Complete the range
            if (date < rangeStart) {
                setRangeEnd(rangeStart);
                setRangeStart(date);
            } else {
                setRangeEnd(date);
            }
        }
    };

    const clearSelection = () => {
        setRangeStart(null);
        setRangeEnd(null);
        setHoverDate(null);
        setComment('');
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedEmployee) {
            toast({ title: 'Select Employee', description: 'Please choose an employee.', variant: 'destructive' });
            return;
        }
        if (selectedDates.length === 0) {
            toast({ title: 'Select Dates', description: 'Please select one or more dates on the calendar.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const rows = selectedDates.map(d => ({
                user_id: selectedEmployee.id,
                leave_date: d,
                comments: comment.trim() || null,
                created_by: currentUser.id
            }));
            const { error } = await supabase
                .from('employee_leaves')
                .upsert(rows, { onConflict: 'user_id,leave_date', ignoreDuplicates: false });
            if (error) throw error;
            toast({ title: 'Leave Saved', description: `${selectedDates.length} day(s) marked as leave for ${selectedEmployee.full_name || selectedEmployee.username}.` });
            clearSelection();
            fetchLeaves();
        } catch (err) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const { error } = await supabase.from('employee_leaves').delete().eq('id', deleteTarget.id);
            if (error) throw error;
            toast({ title: 'Leave Removed', variant: 'destructive' });
            fetchLeaves();
        } catch (err) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setDeleteTarget(null);
        }
    };

    // ── Cell styling ──────────────────────────────────────────────────────────
    const getCellState = (date) => {
        if (!date) return 'empty';
        const ds = toDateStr(date);
        if (selectedDates.includes(ds)) return 'selected';
        if (hoverRange.includes(ds)) return 'hover';
        return 'normal';
    };

    const isToday = (date) => date && toDateStr(date) === toDateStr(today);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── LEFT: Calendar ─────────────────────────────────── */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">

                    {/* Month Nav */}
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" className="rounded-xl"
                            onClick={() => setViewDate(new Date(year, month - 1, 1))}>
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">
                            {MONTHS[month]} {year}
                        </h2>
                        <Button variant="ghost" size="icon" className="rounded-xl"
                            onClick={() => setViewDate(new Date(year, month + 1, 1))}>
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 text-center">
                        {DAYS.map(d => (
                            <div key={d} className="text-[10px] font-black uppercase tracking-widest text-gray-400 py-2">{d}</div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    {loadingLeaves ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary/30" /></div>
                    ) : (
                        <div className="grid grid-cols-7 gap-1">
                            {calendarCells.map((date, i) => {
                                if (!date) return <div key={`empty-${i}`} />;
                                const ds = toDateStr(date);
                                const state = getCellState(date);
                                const dayLeaves = leavesByDate[ds] || [];
                                const hasLeave = dayLeaves.length > 0;

                                return (
                                    <button
                                        key={ds}
                                        onMouseEnter={() => rangeStart && !rangeEnd && setHoverDate(date)}
                                        onMouseLeave={() => setHoverDate(null)}
                                        onClick={() => handleDayClick(date)}
                                        className={`
                                            relative flex flex-col items-center justify-start pt-1.5 pb-2 rounded-xl text-sm font-bold transition-all duration-150 min-h-[52px]
                                            ${state === 'selected' ? 'bg-primary text-white shadow-md shadow-primary/30' : ''}
                                            ${state === 'hover' ? 'bg-primary/20 text-primary' : ''}
                                            ${state === 'normal' ? 'hover:bg-gray-100 text-gray-700' : ''}
                                            ${isToday(date) && state === 'normal' ? 'ring-2 ring-primary/40' : ''}
                                        `}
                                    >
                                        <span className={`text-[13px] font-black ${isToday(date) && state === 'normal' ? 'text-primary' : ''}`}>
                                            {date.getDate()}
                                        </span>
                                        {hasLeave && (
                                            <div className="flex flex-wrap gap-0.5 justify-center px-1 mt-0.5">
                                                {dayLeaves.slice(0, 3).map((l, li) => (
                                                    <div
                                                        key={l.id}
                                                        title={`${l.users?.full_name || l.users?.username}: ${l.comments || 'On Leave'}`}
                                                        className={`w-1.5 h-1.5 rounded-full ${state === 'selected' ? 'bg-white/70' : 'bg-orange-400'}`}
                                                    />
                                                ))}
                                                {dayLeaves.length > 3 && (
                                                    <span className={`text-[8px] font-black ${state === 'selected' ? 'text-white/80' : 'text-orange-500'}`}>
                                                        +{dayLeaves.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Selection hint */}
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-50 text-xs text-gray-400 font-medium">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-primary" /> Selected
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-orange-400" /> On Leave
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full ring-2 ring-primary/40 bg-white" /> Today
                        </div>
                        <span className="ml-auto italic">Click to set start • click again to set end of range</span>
                    </div>
                </div>

                {/* ── RIGHT: Form ────────────────────────────────────── */}
                <div className="space-y-4">

                    {/* Selected range display */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-sm text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-primary" /> Selected Dates
                            </h3>
                            {selectedDates.length > 0 && (
                                <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                                    <X className="w-3.5 h-3.5" /> Clear
                                </button>
                            )}
                        </div>
                        {selectedDates.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No dates selected yet.</p>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-2xl font-black text-primary">{selectedDates.length} <span className="text-sm font-bold text-gray-500">day{selectedDates.length > 1 ? 's' : ''}</span></p>
                                <p className="text-xs text-gray-500">
                                    {selectedDates[0]}{selectedDates.length > 1 ? ` → ${selectedDates[selectedDates.length - 1]}` : ''}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Employee picker */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
                        <h3 className="font-black text-sm text-gray-700 uppercase tracking-widest flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" /> Employee
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <Input
                                placeholder="Search employee..."
                                value={employeeSearch}
                                onChange={e => setEmployeeSearch(e.target.value)}
                                className="pl-8 h-9 text-sm rounded-xl bg-gray-50 border-transparent"
                            />
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                            {loadingEmployees ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary/30 mx-auto" />
                            ) : filteredEmployees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-all ${selectedEmployee?.id === emp.id
                                        ? 'bg-primary text-white font-bold'
                                        : 'hover:bg-gray-50 text-gray-700 font-medium'}`}
                                >
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${selectedEmployee?.id === emp.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                                        <User className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="truncate">{emp.full_name || emp.username}</span>
                                    {selectedEmployee?.id === emp.id && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
                        <Label className="font-black text-sm text-gray-700 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" /> Comment <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
                        </Label>
                        <Textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="e.g. Medical leave, Personal leave..."
                            className="resize-none text-sm rounded-xl bg-gray-50 border-transparent h-20"
                        />
                    </div>

                    {/* Save button */}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || selectedDates.length === 0 || !selectedEmployee}
                        className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarOff className="w-4 h-4 mr-2" />}
                        Mark Leave{selectedDates.length > 1 ? ` (${selectedDates.length} days)` : ''}
                    </Button>
                </div>
            </div>

            {/* ── Leave records for this month ──────────────────────── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-black text-sm text-gray-700 uppercase tracking-widest">
                        Leave Records — {MONTHS[month]} {year}
                    </h3>
                    <Badge variant="secondary" className="font-bold">{leaves.length} record{leaves.length !== 1 ? 's' : ''}</Badge>
                </div>
                {loadingLeaves ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
                ) : leaves.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 italic text-sm">No leave records for this month.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Employee</th>
                                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Comment</th>
                                    <th className="text-right px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {leaves.map(l => (
                                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3 font-bold text-gray-800 font-mono">{l.leave_date}</td>
                                        <td className="px-6 py-3">
                                            <span className="font-semibold text-gray-700">{l.users?.full_name || l.users?.username || '—'}</span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 italic">{l.comments || '—'}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => setDeleteTarget(l)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Remove Leave Record?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove leave for <strong>{deleteTarget?.users?.full_name || deleteTarget?.users?.username}</strong> on <strong>{deleteTarget?.leave_date}</strong>? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Yes, Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default LeaveManager;
