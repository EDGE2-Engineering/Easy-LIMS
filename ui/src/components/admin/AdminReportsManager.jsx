import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Trash2,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Save,
  ChevronLeft,
  MapPin,
  ClipboardList,
  TestTube,
  FileCheck,
  Mountain,
  HardHat,
  MessageSquare,
  Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { format } from 'date-fns';
import { safeFormatDate } from '@/lib/utils';
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
import NewReportForm from './NewReportForm';

const AdminReportsManager = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    reportId: null,
    reportNumber: '',
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, users(full_name), clients(client_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({ title: 'Error', description: 'Failed to load reports.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCreateNew = () => {
    setEditingReport(null);
    setIsEditing(true);
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setIsEditing(true);
  };

  const handleDeleteClick = (report) => {
    setDeleteConfirmation({
      isOpen: true,
      reportId: report.id,
      reportNumber: report.report_number,
    });
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', deleteConfirmation.reportId);

      if (error) throw error;
      toast({ title: 'Record Deleted', variant: 'destructive' });

      // Telegram Notification
      const message = `🗑️ *Report Deleted*\n\nReport No: \`${deleteConfirmation.reportNumber}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``;
      sendTelegramNotification(message);

      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({ title: 'Error', description: 'Failed to delete report.', variant: 'destructive' });
    } finally {
      setDeleteConfirmation({ isOpen: false, reportId: null, reportNumber: '' });
    }
  };

  if (isEditing) {
    return (
      <div className="animate-in slide-in-from-right-4 duration-300 w-full mb-8">
        <NewReportForm
          key={editingReport?.id || 'new'}
          editReport={editingReport}
          onCancel={() => {
            setIsEditing(false);
            setEditingReport(null);
          }}
          onSuccess={() => {
            setIsEditing(false);
            setEditingReport(null);
            fetchReports();
          }}
        />
      </div>
    );
  }

  const filteredReports = reports.filter(
    (r) =>
      (r.report_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (r.clients?.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search reports..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCreateNew}
              className="bg-primary hover:bg-primary-dark text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Report
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border-gray-800">
            <p className="text-xs">Start a new final test report</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Report #
                </th>
                <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Client
                </th>
                <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Created By
                </th>
                <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Date
                </th>
                <th className="text-right py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <span className="text-gray-500">Loading reports...</span>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-gray-500">
                    No reports found. Click "Create Report" to start.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-6 align-middle text-gray-600">
                      <span className="font-mono font-semibold text-gray-700">
                        {report.report_number}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 align-middle">
                      {report.clients?.client_name || '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-600 align-middle">
                      {report.users?.full_name || '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-600 align-middle">
                      {safeFormatDate(report.created_at)}
                    </td>
                    <td className="py-4 px-6 text-right text-gray-600 align-middle">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(report)}>
                              <FileText className="w-4 h-4 text-blue-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Edit this report</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(report)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Permanently delete this report</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              Delete Report?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete report{' '}
              <span className="font-semibold text-gray-900">{deleteConfirmation.reportNumber}</span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReportsManager;
