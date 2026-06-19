import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarOff,
  Clock,
  User,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
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

const MyLeaves = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  
  // Dialog State
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'Casual Leave',
    reason: '',
  });

  // Cancel Request State
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserLeaves();
    }
  }, [user]);

  const fetchUserLeaves = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('request_approvals')
        .select(
          '*, reviewer:users!request_approvals_reviewed_by_fkey(full_name, username)'
        )
        .eq('requester_id', user.id)
        .eq('request_type', 'LEAVE')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (error) {
      console.error('Error fetching user leaves:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leave requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkingDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    let count = 0;
    let cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() !== 0) { // Exclude Sundays
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    try {
      const { error } = await supabase.from('request_approvals').insert([
        {
          requester_id: user.id,
          request_type: 'LEAVE',
          status: 'PENDING',
          request_data: leaveRequest,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Your leave request has been sent for approval.',
      });
      setIsApplyDialogOpen(false);
      setLeaveRequest({ startDate: '', endDate: '', leaveType: 'Casual Leave', reason: '' });
      fetchUserLeaves();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const { error } = await supabase
        .from('request_approvals')
        .delete()
        .eq('id', cancelTarget.id);

      if (error) throw error;

      toast({
        title: 'Request Canceled',
        description: 'Your leave request has been successfully canceled.',
      });
      fetchUserLeaves();
    } catch (error) {
      console.error('Error canceling request:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel leave request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelLoading(false);
      setCancelTarget(null);
    }
  };

  return (
    <div className="space-y-8 pb-12 w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            My Leaves
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-xs uppercase tracking-widest ml-1">
            Track and manage your leave requests
          </p>
        </div>

        <Button
          onClick={() => setIsApplyDialogOpen(true)}
          className="bg-primary hover:bg-primary-dark text-white rounded-2xl h-12 px-6 font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Apply for Leave
        </Button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Syncing leave records...
          </p>
        </div>
      ) : leaves.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CalendarOff className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight animate-pulse">
            No Leave Requests Found
          </h3>
          <p className="text-gray-400 font-medium mt-2 max-w-sm mx-auto text-sm">
            You haven't submitted any leave requests yet. Apply for a leave to view your logs here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Leave Period
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Leave Type
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Duration
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Reason
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Review Details
                  </th>
                  <th className="text-right py-4 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map((req) => {
                  const data = req.request_data || {};
                  const workingDays = calculateWorkingDays(data.startDate, data.endDate);
                  
                  return (
                    <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      {/* Leave Period */}
                      <td className="py-4 px-6 font-medium text-gray-900 align-middle whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-950">
                            {data.startDate ? new Date(data.startDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }) : 'N/A'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight flex items-center gap-1">
                            to {data.endDate ? new Date(data.endDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }) : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-4 px-6 align-middle font-semibold text-gray-700">
                        {data.leaveType || 'Leave Request'}
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-6 align-middle font-bold text-primary">
                        {workingDays} Day{workingDays !== 1 ? 's' : ''}
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-6 align-middle text-gray-500 font-medium max-w-xs truncate" title={data.reason}>
                        {data.reason || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 align-middle">
                        <Badge
                          className={`text-[9px] font-black uppercase border-none px-3 py-1.5 rounded-xl ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : req.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {req.status}
                        </Badge>
                      </td>

                      {/* Review Details */}
                      <td className="py-4 px-6 align-middle text-xs">
                        {req.status !== 'PENDING' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-gray-700 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              {req.reviewer?.full_name || 'System'}
                            </span>
                            {req.admin_remarks && (
                              <span className="text-gray-400 italic">
                                "{req.admin_remarks}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic font-medium">Awaiting Review</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 align-middle text-right">
                        {req.status === 'PENDING' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCancelTarget(req)}
                            className="text-gray-400 hover:text-red-500 rounded-xl"
                            title="Cancel Leave Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply for Leave Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-gray-900 tracking-tight">
              Apply for Leave
            </DialogTitle>
            <DialogDescription className="text-center font-medium text-gray-500">
              Submit your leave request for approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplySubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Start Date
                </Label>
                <AppDatePicker
                  required
                  value={leaveRequest.startDate}
                  onChange={(e) => setLeaveRequest({ ...leaveRequest, startDate: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  End Date
                </Label>
                <AppDatePicker
                  required
                  value={leaveRequest.endDate}
                  onChange={(e) => setLeaveRequest({ ...leaveRequest, endDate: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Leave Type
              </Label>
              <select
                value={leaveRequest.leaveType}
                onChange={(e) => setLeaveRequest({ ...leaveRequest, leaveType: e.target.value })}
                className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
              >
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Earned Leave</option>
                <option>Loss of Pay</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Reason
              </Label>
              <Textarea
                required
                value={leaveRequest.reason}
                onChange={(e) => setLeaveRequest({ ...leaveRequest, reason: e.target.value })}
                placeholder="Briefly explain your reason for leave..."
                className="min-h-[100px] rounded-xl border-gray-100 bg-gray-50 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={applyLoading}
              className="w-full h-14 rounded-2xl font-bold bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20"
            >
              {applyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-gray-900 tracking-tight">
              Cancel Leave Request?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-gray-500 text-sm">
              Are you sure you want to cancel this leave request? This will permanently delete the request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl h-11 px-6 font-bold text-gray-500 border-none hover:bg-gray-100">
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequest}
              disabled={cancelLoading}
              className="rounded-xl h-11 px-6 font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200"
            >
              {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Cancel Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyLeaves;
