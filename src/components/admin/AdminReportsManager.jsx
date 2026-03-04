
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Search, Trash2, ExternalLink, FileText, Loader2, Plus, Save, ChevronLeft,
    MapPin, ClipboardList, TestTube, FileCheck, Mountain, HardHat, MessageSquare, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import NewReportForm from './NewReportForm';
import { DB_TYPES } from '@/config';

const AdminReportsManager = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, reportId: null, reportNumber: '' });
    const [appUsers, setAppUsers] = useState([]);
    const { toast } = useToast();
    const { user, idToken } = useAuth();

    const fetchUsers = async () => {
        if (!idToken) return;
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.USER, idToken);
            setAppUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchReports = async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.JOB, idToken);
            // Filter only jobs that have report data or are ready for reports
            setReports(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast({ title: "Error", description: "Failed to load reports.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (idToken) {
            fetchReports();
            fetchUsers();
        }
    }, [idToken]);

    // ... handle functions ...

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
            reportNumber: report.report_number
        });
    };

    const confirmDelete = async () => {
        if (!idToken) return;
        try {
            await dynamoGenericApi.delete(deleteConfirmation.reportId, idToken);
            toast({ title: "Record Deleted", variant: "destructive" });

            // Telegram Notification
            const message = `🗑️ *Report Deleted*\n\nReport No: \`${deleteConfirmation.reportNumber}\`\nDeleted By: \`${user?.fullName || 'Unknown'}\``;
            sendTelegramNotification(message);

            fetchReports();
        } catch (error) {
            console.error('Error deleting report:', error);
            toast({ title: "Error", description: "Failed to delete report.", variant: "destructive" });
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

    const filteredReports = reports.filter(r =>
        (r.report_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search reports..."
                        className="pl-10 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreateNew} size="sm" className="bg-primary hover:bg-primary-dark text-white h-9 rounded-lg">
                    <Plus className="w-4 h-4 mr-2" /> Create Report
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50/50 border-b">
                        <tr>
                            <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-gray-500">Report #</th>
                            <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-gray-500">Client</th>
                            <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-gray-500">Created By</th>
                            <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-gray-500">Date</th>
                            <th className="text-right py-4 px-6 font-bold text-xs uppercase tracking-wider text-gray-500">Actions</th>
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
                                <tr key={report.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="py-4 px-6">
                                        <span className="font-mono font-semibold text-gray-900">{report.report?.reportId || report.report_number || report.job_order_no}</span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-700">{report.client_name || report.report?.client || '-'}</td>
                                    <td className="py-4 px-6 text-sm text-gray-700">
                                        {(() => {
                                            const u = appUsers.find(u => u.id === report.created_by || u.sub === report.created_by || u.username === report.created_by || u.email === report.created_by);
                                            return u ? (u.full_name || u.fullName || u.name) : (report.created_by || '-');
                                        })()}
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-500">
                                        {format(new Date(report.created_at || report.updated_at), 'dd MMM yyyy')}
                                    </td>
                                    <td className="py-3 px-2 text-right space-x-0">
                                        <Button variant="ghost" className="px-2" size="icon" title="Edit Report" onClick={() => handleEdit(report)}>
                                            <FileText className="w-4 h-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" className="px-2" size="icon" title="Delete" onClick={() => handleDeleteClick(report)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">Delete Report?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete report <span className="font-semibold text-gray-900">{deleteConfirmation.reportNumber}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminReportsManager;
