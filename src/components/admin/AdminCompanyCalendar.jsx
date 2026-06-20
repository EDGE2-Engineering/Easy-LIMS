import React, { useState, useEffect, useCallback } from 'react';
import {
  format,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSunday,
  isSameDay,
  addYears,
  subYears,
  startOfToday,
  isAfter,
  isBefore,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Download,
  Users,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const AdminCompanyCalendar = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState('calendar'); // 'calendar' or 'list'
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventName, setEventName] = useState('');
  const [isHoliday, setIsHoliday] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [leavesOnSelectedDate, setLeavesOnSelectedDate] = useState([]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_calendar')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch calendar events.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLeaves = useCallback(async () => {
    try {
      const { data: allRequests, error } = await supabase
        .from('request_approvals')
        .select('*, requester:users!request_approvals_requester_id_fkey(full_name, username)');

      if (error) throw error;

      const approvedLeaves = (allRequests || []).filter(
        (r) => r.request_type === 'LEAVE' && r.status === 'APPROVED'
      );

      // Expand into individual days for easy calendar matching
      const expanded = approvedLeaves.flatMap((req) => {
        try {
          const { startDate, endDate } = req.request_data;
          if (!startDate || !endDate) return [];

          // Use new Date(str) for consistency with dashboard parsing
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

          const dates = [];
          let curr = new Date(start);
          while (curr <= end) {
            // Skip Sundays
            if (curr.getDay() !== 0) {
              dates.push({
                date: format(curr, 'yyyy-MM-dd'),
                requester: req.requester?.full_name || 'Unknown',
                type: req.request_data.leaveType || 'General Leave',
                reason: req.request_data.reason,
              });
            }
            curr.setDate(curr.getDate() + 1);
          }
          return dates;
        } catch (err) {
          console.error('Error expanding leave request:', err);
          return [];
        }
      });
      setLeaves(expanded);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchLeaves();
  }, [fetchEvents, fetchLeaves]);

  const handleDateClick = (date) => {
    const existingEvent = events.find((e) => isSameDay(parseISO(e.event_date), date));
    setSelectedDate(date);

    // Find leaves for this date
    const dateStr = format(date, 'yyyy-MM-dd');
    const leavesOnDate = leaves.filter((l) => l.date === dateStr);
    setLeavesOnSelectedDate(leavesOnDate);

    if (existingEvent) {
      setEditingEvent(existingEvent);
      setEventName(existingEvent.event_name);
      setIsHoliday(existingEvent.is_holiday);
    } else {
      setEditingEvent(null);
      setEventName('');
      setIsHoliday(isSunday(date));
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!eventName.trim()) return;

    setIsSaving(true);
    try {
      const eventData = {
        event_date: format(selectedDate, 'yyyy-MM-dd'),
        event_name: eventName.trim(),
        is_holiday: isHoliday,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('company_calendar')
          .update(eventData)
          .eq('id', editingEvent.id);
        if (error) throw error;
        logAudit({
          userId: currentUser?.id,
          entityType: 'calendar_event',
          entityId: editingEvent.id,
          entityName: eventData.event_name,
          action: 'UPDATE',
        });
        toast({ title: 'Event Updated', description: 'Calendar event updated successfully.' });
      } else {
        const { data, error } = await supabase
          .from('company_calendar')
          .insert([eventData])
          .select();
        if (error) throw error;
        logAudit({
          userId: currentUser?.id,
          entityType: 'calendar_event',
          entityId: data?.[0]?.id,
          entityName: eventData.event_name,
          action: 'CREATE',
        });
        toast({ title: 'Event Added', description: 'New event added to calendar.' });
      }

      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: 'Failed to save event.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    if (!confirm('Are you sure you want to delete this event?')) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('company_calendar').delete().eq('id', editingEvent.id);

      if (error) throw error;

      logAudit({
        userId: currentUser?.id,
        entityType: 'calendar_event',
        entityId: editingEvent.id,
        entityName: editingEvent.event_name,
        action: 'DELETE',
      });

      toast({ title: 'Event Deleted', description: 'Calendar event removed.' });
      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCSV = () => {
    if (events.length === 0) {
      toast({
        title: 'No Events',
        description: 'There are no events to export.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Date', 'Day', 'Event Name', 'Is Holiday'];
    const csvRows = events.map((event) => {
      const date = parseISO(event.event_date);
      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'EEEE'),
        `"${event.event_name.replace(/"/g, '""')}"`,
        event.is_holiday ? 'Yes' : 'No',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `company_calendar_${format(new Date(), 'yyyy_MM_dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'CSV Downloaded', description: 'Company calendar exported successfully.' });
  };

  const renderCalendar = () => {
    const yearStart = startOfYear(selectedYear);
    const months = eachMonthOfInterval({
      start: yearStart,
      end: endOfYear(selectedYear),
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const startDayOfWeek = monthStart.getDay(); // 0 is Sunday

          return (
            <div
              key={month.toString()}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-center">{format(month, 'MMMM')}</h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div
                      key={i}
                      className={`text-[10px] font-bold text-center ${i === 0 ? 'text-red-500' : 'text-gray-400'}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const event = events.find((e) => isSameDay(parseISO(e.event_date), day));
                    const hasLeave = leaves.some((l) => l.date === dateStr);
                    const isSun = isSunday(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={day.toString()}
                        onClick={() => handleDateClick(day)}
                        className={`
                                                    relative h-8 w-full rounded-lg text-xs transition-all flex flex-col items-center justify-center
                                                    ${
                                                      event?.is_holiday
                                                        ? 'bg-orange-100 text-orange-700 font-bold hover:bg-orange-200 ring-2 ring-orange-100 ring-offset-0 dark:bg-orange-500/20 dark:text-orange-400 dark:hover:bg-orange-500/30 dark:ring-orange-500/20'
                                                        : isSun
                                                          ? 'text-red-600 font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
                                                          : hasLeave
                                                            ? 'bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/50 border border-indigo-200 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 dark:border-indigo-500/20'
                                                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                                    }
                                                    ${isToday ? 'bg-primary/10 text-primary font-bold border border-primary/20 dark:bg-primary/20 dark:border-primary/30' : ''}
                                                `}
                        title={
                          event
                            ? event.event_name
                            : hasLeave
                              ? 'Employee(s) on Leave'
                              : format(day, 'PP')
                        }
                      >
                        {day.getDate()}
                        <div className="flex gap-0.5 mt-0.5">
                          {event && (
                            <div
                              className={`w-1 h-1 rounded-full ${event.is_holiday ? 'bg-orange-500' : 'bg-primary'}`}
                            />
                          )}
                          {hasLeave && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderList = () => {
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.event_date) - new Date(b.event_date)
    );
    const today = startOfToday();

    // Find first event from today or later
    const upcomingIndex = sortedEvents.findIndex((e) => !isBefore(parseISO(e.event_date), today));

    return (
      <div className="w-full space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedEvents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500 italic">
                      No events found in the calendar.
                    </td>
                  </tr>
                ) : (
                  sortedEvents.map((event, index) => {
                    const eventDate = parseISO(event.event_date);
                    const isPast = isBefore(eventDate, today) && !isSameDay(eventDate, today);
                    const isRef = index === upcomingIndex;

                    return (
                      <tr
                        key={event.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isPast ? 'opacity-60' : ''} ${isRef ? 'bg-primary/5' : ''}`}
                        id={isRef ? 'today-event' : undefined}
                      >
                        <td className="px-6 py-4 align-middle text-gray-600 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span
                              className={`font-semibold ${isSunday(eventDate) ? 'text-red-600' : 'text-gray-900'}`}
                            >
                              {format(eventDate, 'PPP')}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {format(eventDate, 'EEEE')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle text-gray-600">
                          <span className="text-sm font-medium text-gray-700">
                            {event.event_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle text-gray-600">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              event.is_holiday
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                : isSunday(eventDate)
                                  ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                  : 'bg-primary/10 text-primary dark:bg-primary/20'
                            }`}
                          >
                            {event.is_holiday
                              ? 'Company Holiday'
                              : isSunday(eventDate)
                                ? 'Sunday'
                                : 'Event'}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle text-gray-600 text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 rounded-lg"
                                  onClick={() => handleDateClick(eventDate)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                <p className="text-xs">Edit event details</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  onClick={() => {
                                    setSelectedDate(eventDate);
                                    setEditingEvent(event);
                                    handleDeleteEvent();
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                <p className="text-xs">Remove event from calendar</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Standardized Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            Company Calendar
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Manage holidays and events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                className="rounded-xl border-gray-200 hover:bg-primary/5 hover:text-primary transition-all flex items-center gap-2 h-9"
              >
                <Download className="w-4 h-4" /> Export
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Export to CSV</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('calendar')}
              className={`rounded-xl h-9 px-4 font-bold text-xs ${view === 'calendar' ? 'bg-primary shadow-md' : 'text-gray-500'}`}
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-2" /> Full View
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className={`rounded-xl h-9 px-4 font-bold text-xs ${view === 'list' ? 'bg-primary shadow-md' : 'text-gray-500'}`}
            >
              <ListIcon className="w-3.5 h-3.5 mr-2" /> List View
            </Button>
          </div>
        </div>
      </div>

      {/* Year Selector (only for calendar view) */}
      {view === 'calendar' && (
        <div className="flex justify-center items-center gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(subYears(selectedYear, 1))}
                className="rounded-full w-10 h-10 hover:bg-primary/5 hover:text-primary transition-all border-gray-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Previous Year</p>
            </TooltipContent>
          </Tooltip>

          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {format(selectedYear, 'yyyy')}
          </h2>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(addYears(selectedYear, 1))}
                className="rounded-full w-10 h-10 hover:bg-primary/5 hover:text-primary transition-all border-gray-200"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Next Year</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-400 gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="font-medium">Loading calendar events...</p>
          </div>
        ) : view === 'calendar' ? (
          renderCalendar()
        ) : (
          renderList()
        )}
      </div>

      {/* Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <div className={`h-2 w-full ${isSunday(selectedDate) ? 'bg-red-500' : 'bg-primary'}`} />
          <div className="p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {editingEvent ? 'Edit Event' : 'Add Event'}
                </DialogTitle>
                {leavesOnSelectedDate.length > 0 && (
                  <Badge className="bg-indigo-100 text-indigo-600 border-none font-black text-[10px] px-3 py-1">
                    {leavesOnSelectedDate.length} Staff on Leave
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {selectedDate && format(selectedDate, 'EEEE, do MMMM yyyy')}
                {selectedDate && isSunday(selectedDate) && (
                  <span className="ml-2 text-red-500 font-bold">(Sunday)</span>
                )}
              </p>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  Event Name
                </label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Enter holiday or event name..."
                  className="rounded-xl border-gray-200 focus:ring-primary h-12 text-base"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEvent();
                  }}
                />
              </div>

              <div className="flex items-center space-x-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <Checkbox id="is-holiday" checked={isHoliday} onCheckedChange={setIsHoliday} />
                <Label
                  htmlFor="is-holiday"
                  className="text-sm font-semibold text-gray-700 cursor-pointer"
                >
                  Mark as Company Holiday
                </Label>
              </div>

              {/* Employee Leaves Section */}
              {leavesOnSelectedDate.length > 0 && (
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" /> Employees on Leave
                  </h4>
                  <div className="space-y-2">
                    {leavesOnSelectedDate.map((leave, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50"
                      >
                        <div>
                          <p className="text-sm font-bold text-indigo-900">{leave.requester}</p>
                          <p className="text-[10px] font-medium text-indigo-400 uppercase">
                            {leave.type}
                          </p>
                        </div>
                        {leave.reason && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-1.5 bg-white rounded-lg cursor-help">
                                <MessageSquare className="w-3.5 h-3.5 text-indigo-300" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                              <p className="text-xs">{leave.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
              {editingEvent && (
                <Button
                  variant="ghost"
                  onClick={handleDeleteEvent}
                  disabled={isSaving}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEvent}
                disabled={isSaving || !eventName.trim()}
                className="rounded-xl bg-primary hover:bg-primary/90 px-8"
              >
                {isSaving ? (
                  'Saving...'
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" /> Save
                  </span>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompanyCalendar;
