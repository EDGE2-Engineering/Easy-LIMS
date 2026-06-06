import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Wallet,
  TrendingUp,
  FileCheck,
  FileClock,
  Receipt,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { WORKFLOW_STATES, APP_CONFIG } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Rupee from '../Rupee';

const AccountsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [myDocuments, setMyDocuments] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalQuotations: 0,
    totalInvoices: 0,
    pendingInvoicesCount: 0,
    totalBilled: 0,
  });
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user's documents
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*, clients(client_name)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setMyDocuments(docs || []);

      // Calculate stats from docs
      const quotes = docs.filter((d) => d.document_type === 'Quotation');
      const invoices = docs.filter((d) => d.document_type === 'Tax Invoice');

      const totalBilled = invoices.reduce((sum, inv) => {
        const content = inv.content || {};
        const items = content.items || [];
        const subtotal = items.reduce((s, item) => s + (Number(item.total) || 0), 0);
        return sum + subtotal;
      }, 0);

      // 2. Fetch jobs ready for invoicing
      const { data: readyJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*, clients(client_name)')
        .eq('status', WORKFLOW_STATES.REPORT_SIGNED)
        .order('updated_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Filter out jobs that already have an invoice
      const jobIds = readyJobs.map((j) => j.id);
      const { data: existingInvoices, error: invError } = await supabase
        .from('documents')
        .select('job_id')
        .in('job_id', jobIds)
        .eq('document_type', 'Tax Invoice');

      if (invError) throw invError;
      const existingJobIdsWithInvoice = new Set(existingInvoices.map((i) => i.job_id));

      const jobsToInvoice = readyJobs.filter((j) => !existingJobIdsWithInvoice.has(j.id));
      setPendingInvoices(jobsToInvoice);

      setStats({
        totalQuotations: quotes.length,
        totalInvoices: invoices.length,
        pendingInvoicesCount: jobsToInvoice.length,
        totalBilled: totalBilled,
      });

      // 3. Fetch user's leave requests
      const { data: requests, error: requestsError } = await supabase
        .from('request_approvals')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setLeaveRequests(requests || []);
    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
            Loading Accounts Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <LayoutDashboard className="w-8 h-8 text-primary" />
              </div>
              Accounts Dashboard
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Welcome back,{' '}
              <span className="text-primary font-bold">{user?.fullName || user?.username}</span>.
            </p>
          </div>
          <Button
            onClick={fetchDashboardData}
            size="sm"
            variant="ghost"
            className="rounded-xl h-10 px-4 font-bold text-primary hover:bg-primary/10 transition-all border border-gray-100 bg-white shadow-sm"
          >
            <Zap className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Quotations Created',
              value: stats.totalQuotations,
              icon: FileClock,
              path: '#/settings/documents',
              tooltip: 'View all your documents',
            },
            {
              label: 'Invoices Generated',
              value: stats.totalInvoices,
              icon: FileCheck,
              path: '#/settings/documents',
              tooltip: 'View all your documents',
            },
            {
              label: 'Total Billed (My Invoices)',
              value: `₹${stats.totalBilled.toLocaleString()}`,
              icon: TrendingUp,
              path: '#/settings/documents',
              tooltip: 'View all invoices',
            },
            {
              label: 'Pending Leave Requests',
              value: leaveRequests.filter((r) => r.status === 'PENDING').length,
              icon: Calendar,
              path: null,
              tooltip: 'Your pending leave requests',
            },
          ].map((stat, idx) => (
            <motion.div key={idx} variants={item}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`border-none shadow-sm bg-gray-50/30 relative overflow-hidden group ${stat.path ? 'cursor-pointer hover:shadow-md active:scale-95' : ''} transition-all`}
                    onClick={() => stat.path && (window.location.hash = stat.path)}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50 rounded-bl-[64px] -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110 duration-500" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                            {stat.label}
                          </p>
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {stat.value}
                          </h3>
                        </div>
                        {stat.path && (
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                  <p className="text-xs">{stat.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Invoices */}
          <motion.div variants={item} className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" /> Jobs Ready for Invoicing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {pendingInvoices.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      No jobs currently awaiting invoice generation.
                    </div>
                  ) : (
                    pendingInvoices.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group cursor-pointer"
                        onClick={() => (window.location.hash = `/settings/jobs/${job.id}`)}
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {job.job_code}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">
                            {job.clients?.client_name}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Documents Created By Me */}
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> My Recent Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                  {myDocuments.slice(0, 5).length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      You haven't created any documents yet.
                    </div>
                  ) : (
                    myDocuments.slice(0, 5).map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${doc.document_type === 'Quotation' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}
                          >
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{doc.quote_number}</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight">
                              {doc.document_type} • {doc.clients?.client_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-black text-gray-900">
                            <Rupee />
                            {(doc.content?.total || 0).toLocaleString()}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full h-8 w-8 text-gray-400 hover:text-primary hover:bg-primary/10"
                            onClick={() => (window.location.hash = `#/doc/${doc.id}`)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {myDocuments.length > 5 && (
                  <div className="p-4 bg-gray-50/30 border-t border-gray-50 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary"
                      onClick={() => (window.location.hash = '#/settings/documents')}
                    >
                      View All Documents <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* My Leaves / Actions */}
          <motion.div variants={item} className="space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> My Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {leaveRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      No recent leave requests.
                    </div>
                  ) : (
                    leaveRequests.slice(0, 5).map((req) => (
                      <div
                        key={req.id}
                        className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {req.request_data?.leaveType || 'Leave Request'}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {new Date(req.request_data?.startDate).toLocaleDateString()} -{' '}
                            {new Date(req.request_data?.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <Badge
                            className={`text-[9px] font-black uppercase border-none ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : req.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-3">
              <Button
                className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                onClick={() => (window.location.hash = '#/doc/new?type=Quotation')}
              >
                <FileText className="w-4 h-4" /> New Quotation
              </Button>
              <Button
                variant="outline"
                className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2"
                onClick={() => (window.location.hash = '#/settings/expenses')}
              >
                <Wallet className="w-4 h-4" /> Manage Expenses
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default AccountsDashboard;
