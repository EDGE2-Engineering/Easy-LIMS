import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Activity,
  Target,
  MessageSquare,
  Zap,
  AlertCircle,
  Ticket,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { WORKFLOW_STATES, APP_CONFIG, TICKET_STATUSES } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const AnalystDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [assignedJobs, setAssignedJobs] = useState([]);
  const [workflowCounts, setWorkflowCounts] = useState({});
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;

      // Fetch jobs assigned to the analyst
      const { data: assignments, error: assignError } = await supabase
        .from('job_to_technicians')
        .select('job_id')
        .eq('technician_id', userId);

      if (assignError) throw assignError;

      let jobs = [];
      if (assignments && assignments.length > 0) {
        const jobIds = assignments.map((a) => a.job_id);
        const { data: rawJobs, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .in('id', jobIds)
          .order('created_at', { ascending: false });

        if (jobsError) throw jobsError;
        let jobList = rawJobs || [];
        const clientIds = [...new Set(jobList.map((j) => j.client_id).filter(Boolean))];
        if (clientIds.length > 0) {
          const { data: cData } = await supabase.from('clients').select('id, client_name').in('id', clientIds);
          if (cData) {
            const cMap = new Map(cData.map((c) => [c.id, c]));
            jobList = jobList.map((j) => ({ ...j, clients: cMap.get(j.client_id) || null }));
          }
        }
        jobs = jobList;
      }

      setAssignedJobs(jobs);

      // Compute workflow counts for assigned jobs
      const counts = jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {});
      setWorkflowCounts(counts);

      // Fetch tickets created by current user
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);
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

  const getStateLabel = (state) => APP_CONFIG.workflow.states[state]?.label || state;

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case TICKET_STATUSES.OPEN:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case TICKET_STATUSES.IN_PROGRESS:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case TICKET_STATUSES.NEED_MORE_DETAILS:
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case TICKET_STATUSES.NEEDS_VERIFICATION:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case TICKET_STATUSES.VERIFIED:
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case TICKET_STATUSES.RESOLVED:
        return 'bg-green-50 text-green-700 border-green-200';
      case TICKET_STATUSES.INVALID_REQUIREMENT:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case TICKET_STATUSES.CLOSED:
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
            Loading Analyst Dashboard...
          </p>
        </div>
      </div>
    );
  }

  const activeJobsCount = assignedJobs.filter(
    (j) => j.status !== WORKFLOW_STATES.JOB_COMPLETE
  ).length;
  const pendingVerification = workflowCounts[WORKFLOW_STATES.TEST_DATA_UNDER_REVIEW] || 0;

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
              Test Engineer Dashboard
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              label: 'Assigned Active Jobs',
              value: activeJobsCount,
              icon: Briefcase,
              color: 'text-primary',
              bg: 'bg-gray-50 dark:bg-gray-100',
              iconBg: 'bg-primary/10',
              path: '#/settings/jobs',
              tooltip: 'View all your assigned jobs',
            },
            {
              label: 'Pending Verifications',
              value: pendingVerification,
              icon: CheckCircle2,
              color: 'text-primary',
              bg: 'bg-gray-50 dark:bg-gray-100',
              iconBg: 'bg-primary/10',
              path: '#/settings/jobs?status=TEST_DATA_UNDER_REVIEW',
              tooltip: 'View jobs awaiting test result review',
            },
          ].map((stat, idx) => (
            <motion.div key={idx} variants={item}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`border-none shadow-sm ${stat.bg}/30 relative overflow-hidden group ${stat.path ? 'cursor-pointer hover:shadow-md active:scale-95' : ''} transition-all`}
                    onClick={() => stat.path && (window.location.hash = stat.path)}
                  >
                    <div
                      className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} rounded-bl-[64px] -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110 duration-500`}
                    />
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${stat.iconBg} ${stat.color} shrink-0`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest truncate">
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

        <div className="w-full">
          {/* Left Column: Assigned Jobs */}
          <motion.div variants={item} className="space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" /> My Assigned Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {assignedJobs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      No jobs currently assigned to you.
                    </div>
                  ) : (
                    assignedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group cursor-pointer"
                        onClick={() => {
                          window.location.hash = `/settings/jobs/${job.id}`;
                        }}
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {job.job_code}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">
                            {job.clients?.client_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/10 text-primary border-none shadow-none text-xs font-black uppercase">
                            {getStateLabel(job.status)}
                          </Badge>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden mt-6">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" /> My Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {tickets.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      No tickets created by you.
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group cursor-pointer"
                        onClick={() => {
                          navigate(`/settings/tickets/${ticket.id}`);
                        }}
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {ticket.title}
                          </p>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Created on {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getPriorityStyle(ticket.priority)} border-none shadow-none text-xs font-black uppercase`}>
                            {ticket.priority}
                          </Badge>
                          <Badge className={`${getStatusStyle(ticket.status)} border-none shadow-none text-xs font-black uppercase`}>
                            {ticket.status}
                          </Badge>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default AnalystDashboard;
