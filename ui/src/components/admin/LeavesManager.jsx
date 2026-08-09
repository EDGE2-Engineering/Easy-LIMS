import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  User,
  Calendar,
  CreditCard,
  Wallet,
  AlertCircle,
  Briefcase,
  Search,
  ArrowLeft,
  Save,
  Loader2,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  Users,
  Info,
  Plus,
  History,
  ChevronLeft,
  Edit,
  Filter,
  X,
  RotateCcw,
  ClipboardCheck,
  CalendarOff,
  Grid3x3,
  List,
  Trash2,
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
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DEPARTMENTS, ROLES } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const LeavesManager = () => {
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

  // Filter State for Leaves
  const [historyFilters, setHistoryFilters] = useState({
    month: 'all',
    year: 'all',
  });

  // Calculator State
  const [formData, setFormData] = useState({
    employeeName: '',
    salary: '',
    totalWorkingDays: '',
    daysWorked: '',
    month: new Date().getMonth().toString(),
    year: new Date().getFullYear().toString(),
  });
  const [calculatedWage, setCalculatedWage] = useState(null);

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
      const { data, error } = await apiClient
        .from('users')
        .select('*')
        .neq('role', ROLES.SUPER_ADMIN.slug)
        .order('full_name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch employees.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = useCallback(
    async (userId, year) => {
      setLoadingLeaves(true);
      try {
        const { data, error } = await apiClient
          .from('request_approvals')
          .select('*')
          .eq('requester_id', userId)
          .eq('request_type', 'LEAVE')
          .eq('status', 'APPROVED');

        if (error) throw error;

        // Filter for the selected year and expand into daily records
        const yearStr = year.toString();
        const dailyRecords = (data || []).flatMap((req) => {
          const { startDate, endDate, leaveType, reason } = req.request_data;
          const dates = getDatesBetween(new Date(startDate), new Date(endDate));
          return dates
            .filter((d) => d.getFullYear().toString() === yearStr)
            .map((d) => ({
              id: `${req.id}-${d.getTime()}`,
              request_id: req.id,
              leave_date: d.toISOString().split('T')[0],
              leave_type: leaveType,
              comments: reason,
              created_by: req.reviewed_by,
            }));
        });

        setLeaves(dailyRecords);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch leave records.',
          variant: 'destructive',
        });
      } finally {
        setLoadingLeaves(false);
      }
    },
    [toast]
  );

  const getDatesBetween = (startDate, endDate) => {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setHistoryFilters({ month: 'all', year: 'all' });
    fetchLeaves(employee.id, selectedYear);
    setView('employee_history');
  };

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
    if (formData.month && formData.year && view === 'calculator') {
      const days = calculateWorkingDaysInMonth(formData.month, formData.year);
      // Only auto-populate if fields are empty
      if (!formData.totalWorkingDays) {
        setFormData((prev) => ({
          ...prev,
          totalWorkingDays: days.toString(),
          daysWorked: days.toString(),
        }));
      }
    }
  }, [formData.month, formData.year, view]);

  const handleSaveLeave = async () => {
    if (!rangeStart) return;
    const end = rangeEnd || rangeStart;
    const [a, b] = rangeStart <= end ? [rangeStart, end] : [end, rangeStart];

    setIsSaving(true);
    try {
      const { error } = await apiClient.from('request_approvals').insert({
        requester_id: selectedEmployee.id,
        request_type: 'LEAVE',
        request_data: {
          startDate: a.toISOString().split('T')[0],
          endDate: b.toISOString().split('T')[0],
          leaveType: 'Casual Leave', // Default
          reason: leaveComment.trim() || 'Admin marked leave',
        },
        status: 'APPROVED',
        reviewed_by: authUser.id,
        reviewed_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: 'Success', description: `Marked leave for ${selectedEmployee.full_name}.` });
      setRangeStart(null);
      setRangeEnd(null);
      setLeaveComment('');
      fetchLeaves(selectedEmployee.id, selectedYear);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLeave = async () => {
    if (!deleteTarget) return;
    try {
      // Note: This deletes the entire request range associated with this day
      const { error } = await apiClient
        .from('request_approvals')
        .delete()
        .eq('id', deleteTarget.request_id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Leave request removed.' });
      fetchLeaves(selectedEmployee.id, selectedYear);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleUpdateLeave = async () => {
    if (!editingLeave) return;
    setIsSaving(true);
    try {
      // Fetch current request to update its JSONB data
      const { data: currentReq, error: fetchError } = await apiClient
        .from('request_approvals')
        .select('request_data')
        .eq('id', editingLeave.request_id)
        .single();

      if (fetchError) throw fetchError;

      const updatedData = {
        ...currentReq.request_data,
        reason: leaveComment.trim() || currentReq.request_data.reason,
      };

      const { error } = await apiClient
        .from('request_approvals')
        .update({
          request_data: updatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingLeave.request_id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Leave record updated.' });
      setIsEditLeaveDialogOpen(false);
      setEditingLeave(null);
      setLeaveComment('');
      fetchLeaves(selectedEmployee.id, selectedYear);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...historyFilters, [key]: value };
    setHistoryFilters(newFilters);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
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
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => {
                const newYear = selectedYear - 1;
                setSelectedYear(newYear);
                fetchLeaves(selectedEmployee.id, newYear);
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{selectedYear}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => {
                const newYear = selectedYear + 1;
                setSelectedYear(newYear);
                fetchLeaves(selectedEmployee.id, newYear);
              }}
            >
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
            {monthIndices.map((m) => {
              const firstDay = new Date(selectedYear, m, 1).getDay();
              const daysInMonth = new Date(selectedYear, m + 1, 0).getDate();
              const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
                new Date(selectedYear, m, 1)
              );

              return (
                <div
                  key={m}
                  className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3"
                >
                  <h3 className="text-sm font-black text-gray-900 tracking-tight px-1">
                    {monthName}
                  </h3>
                  <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div
                        key={i}
                        className="text-[9px] font-black text-gray-300 text-center uppercase py-1"
                      >
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Month
                </Label>
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
                      <SelectItem key={i} value={i.toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Year
                </Label>
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
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
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

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Date
                      </th>
                      <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Comments
                      </th>
                      <th className="text-right py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingLeaves ? (
                      <tr>
                        <td colSpan="3" className="p-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/20" />
                        </td>
                      </tr>
                    ) : leaves.filter((l) => {
                        const leaveDate = new Date(l.leave_date);
                        const matchesMonth =
                          historyFilters.month === 'all' ||
                          leaveDate.getMonth() === parseInt(historyFilters.month);
                        const matchesYear =
                          historyFilters.year === 'all' ||
                          leaveDate.getFullYear() === parseInt(historyFilters.year);
                        return matchesMonth && matchesYear;
                      }).length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-gray-400 italic">
                          No leave records found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      leaves
                        .filter((l) => {
                          const leaveDate = new Date(l.leave_date);
                          const matchesMonth =
                            historyFilters.month === 'all' ||
                            leaveDate.getMonth() === parseInt(historyFilters.month);
                          const matchesYear =
                            historyFilters.year === 'all' ||
                            leaveDate.getFullYear() === parseInt(historyFilters.year);
                          return matchesMonth && matchesYear;
                        })
                        .map((l) => (
                          <tr
                            key={l.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-4 px-6 font-mono font-bold text-gray-700 align-middle whitespace-nowrap">
                              {l.leave_date}
                            </td>
                            <td className="py-4 px-6 text-gray-500 font-medium italic align-middle">
                              {l.comments || '—'}
                            </td>
                            <td className="py-4 px-6 text-right align-middle text-gray-600">
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
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Mark Leave Selection Controls */}
        {rangeStart && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-primary/20 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Selected Period
              </span>
              <span className="text-sm font-black text-primary">
                {selectedDates.length} Day{selectedDates.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <Input
              placeholder="Add leave comments..."
              value={leaveComment}
              onChange={(e) => setLeaveComment(e.target.value)}
              className="w-64 h-10 rounded-xl border-transparent bg-gray-100/50 focus:bg-white transition-all text-sm font-medium"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setRangeStart(null);
                  setRangeEnd(null);
                  setLeaveComment('');
                }}
                variant="ghost"
                className="rounded-xl h-10 px-4 font-bold text-xs text-gray-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLeave}
                disabled={isSaving}
                className="bg-primary hover:bg-primary-dark text-white rounded-xl h-10 px-6 font-bold text-xs shadow-lg shadow-primary/20"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-2" />
                )}
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
      <div className="w-full space-y-6 animate-in slide-in-from-right-4 duration-300">
        <Button
          variant="ghost"
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employee List
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {selectedEmployee.full_name || selectedEmployee.username}
              </h1>
              <p className="text-gray-500 text-sm font-medium capitalize">
                {String(selectedEmployee.role || 'No Role').replace('_', ' ')} •{' '}
                {(() => {
                  const ids = Array.isArray(selectedEmployee.departments)
                    ? selectedEmployee.departments
                    : [];
                  const names = ids
                    .map((id) => DEPARTMENTS.find((d) => d.id === id)?.name)
                    .filter(Boolean);
                  return names.join(', ') || 'No Department';
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Simplified view: Only Leave Records */}
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
              Leave Records
            </h3>
          </div>
          {renderLeaveCalendar()}
        </div>

        {/* AlertDialog for Leave Deletion */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-gray-900 tracking-tight">
                Remove Leave Record?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-gray-500">
                This will permanently delete the leave record for{' '}
                <span className="text-primary font-bold">{deleteTarget?.leave_date}</span>. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="rounded-xl h-11 px-6 font-bold text-gray-500 border-none hover:bg-gray-100">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLeave}
                className="rounded-xl h-11 px-6 font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200"
              >
                Delete Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog for Editing Leave Comment */}
        <Dialog
          open={isEditLeaveDialogOpen}
          onOpenChange={(open) => {
            setIsEditLeaveDialogOpen(open);
            if (!open) {
              setEditingLeave(null);
              setLeaveComment('');
            }
          }}
        >
          <DialogContent className="rounded-3xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900 tracking-tight">
                Edit Leave Comment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Leave Date
                </span>
                <span className="text-sm font-black text-primary">{editingLeave?.leave_date}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Comments
                </Label>
                <Textarea
                  value={leaveComment}
                  onChange={(e) => setLeaveComment(e.target.value)}
                  placeholder="Update leave comments..."
                  className="rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white h-24 resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setIsEditLeaveDialogOpen(false)}
                variant="ghost"
                className="rounded-xl h-11 px-6 font-bold text-gray-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateLeave}
                disabled={isSaving}
                className="bg-primary hover:bg-primary-dark text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Update Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Standardized Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            Employee Leaves
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Track and manage attendance records
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-white border-gray-200 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => handleEmployeeSelect(emp)}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <User className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">
                    {emp.full_name || emp.username}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                      {String(emp.role || 'No Role').replace('_', ' ')}
                    </Badge>
                    {/* <span className="text-[11px] text-gray-400 font-medium truncate">
                                            {(() => {
                                                const ids = Array.isArray(emp.departments) ? emp.departments : [];
                                                return ids.map(id => DEPARTMENTS.find(d => d.id === id)?.name).filter(Boolean).join(', ');
                                            })()}
                                        </span> */}
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

export default LeavesManager;
