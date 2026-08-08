import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Box,
  TrendingUp,
  FileCheck,
  FileClock,
  ClipboardList,
  Calendar,
  ArrowRight,
  ListFilter,
  UserCheck,
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

const MroDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [recentInwards, setRecentInwards] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [stats, setStats] = useState({
    totalInwards: 0,
    pendingMaterialCount: 0,
    totalSamples: 0,
    activeJobsCount: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch total material inward count
      const { count: inwardCount, error: inwardError } = await supabase
        .from('material_inward_register')
        .select('*', { count: 'exact', head: true });

      if (inwardError) throw inwardError;

      // 2. Fetch total samples count
      const { count: samplesCount, error: samplesError } = await supabase
        .from('material_samples')
        .select('*', { count: 'exact', head: true });

      if (samplesError) throw samplesError;

      // 3. Fetch recent inwards (for the list)
      const { data: inwards, error: recInwardError } = await supabase
        .from('material_inward_register')
        .select('*, clients(client_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recInwardError) throw recInwardError;
      setRecentInwards(inwards || []);

      // 4. Fetch jobs awaiting material (WORK_ORDER_RECEIVED status)
      const { data: readyJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*, clients(client_name)')
        .eq('status', WORKFLOW_STATES.WORK_ORDER_RECEIVED)
        .order('updated_at', { ascending: false });

      if (jobsError) throw jobsError;
      setPendingJobs(readyJobs || []);

      // 5. Fetch active jobs count (anything not complete)
      const { count: activeJobs, error: activeErr } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .neq('status', WORKFLOW_STATES.JOB_COMPLETE);

      if (activeErr) throw activeErr;

      setStats({
        totalInwards: inwardCount || 0,
        pendingMaterialCount: readyJobs?.length || 0,
        totalSamples: samplesCount || 0,
        activeJobsCount: activeJobs || 0,
      });
    } catch (error) {
      console.error('MRO Dashboard Fetch Error:', error);
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
            Loading MRO Dashboard...
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
                <Package className="w-8 h-8 text-primary" />
              </div>
              MRO Dashboard
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: 'Total Inward Entries',
              value: stats.totalInwards,
              icon: ClipboardList,
              path: '#/settings/jobs',
              tooltip: 'View all jobs',
            },
            {
              label: 'Active Jobs',
              value: stats.activeJobsCount,
              icon: TrendingUp,
              path: '#/settings/jobs',
              tooltip: 'View all active jobs',
            },
            {
              label: 'Awaiting Inward',
              value: stats.pendingMaterialCount,
              icon: Clock,
              path: '#/settings/jobs?status=WORK_ORDER_RECEIVED',
              tooltip: 'View jobs ready for material inward',
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
          {/* Jobs Awaiting Material */}
          <motion.div variants={item} className="lg:col-span-3 space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <ListFilter className="w-5 h-5 text-orange-500" /> Jobs Ready for Material Inward
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {pendingJobs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      No jobs currently awaiting material inward.
                    </div>
                  ) : (
                    pendingJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group cursor-pointer"
                        onClick={() => (window.location.hash = `/settings/jobs/${job.id}`)}
                      >
                        <div className="flex-grow min-w-0 mr-4">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors truncate">
                            {job.job_code}
                          </p>
                          <p className="text-xs text-gray-500 font-medium truncate">
                            {job.clients?.client_name}
                          </p>
                          {job.project_name && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate italic">
                              Project: {job.project_name}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Inward Entries */}
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" /> Recent Inward Register
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                  {recentInwards.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      No inward entries found.
                    </div>
                  ) : (
                    recentInwards.map((inward) => (
                      <div
                        key={inward.id}
                        className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{inward.job_order_no}</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight">
                              {inward.clients?.client_name} •{' '}
                              {new Date(inward.created_at).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className="text-[9px] font-bold uppercase tracking-tight bg-gray-50 text-gray-500 border-gray-100"
                          >
                            {inward.status}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full h-8 w-8 text-gray-400 hover:text-primary hover:bg-primary/10"
                            onClick={() =>
                              (window.location.hash = inward.job_id
                                ? `#/settings/jobs/${inward.job_id}`
                                : '#/settings/system')
                            }
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {recentInwards.length > 5 && (
                  <div className="p-4 bg-gray-50/30 border-t border-gray-50 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary"
                      onClick={() => (window.location.hash = '#/settings/system')}
                    >
                      View Inward Register <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default MroDashboard;
