import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Briefcase, Calendar, 
    CheckCircle2, Clock, Activity, Target, Zap, Beaker
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WORKFLOW_STATES, APP_CONFIG } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const TechnicianDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    
    const [assignedJobs, setAssignedJobs] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [workflowCounts, setWorkflowCounts] = useState({});

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;

            // Fetch jobs assigned to the technician
            const { data: assignments, error: assignError } = await supabase
                .from('job_to_technicians')
                .select('job_id')
                .eq('technician_id', userId);
            
            if (assignError) throw assignError;

            let jobs = [];
            if (assignments && assignments.length > 0) {
                const jobIds = assignments.map(a => a.job_id);
                const { data: jobData, error: jobsError } = await supabase
                    .from('jobs')
                    .select('*, clients(client_name)')
                    .in('id', jobIds)
                    .order('created_at', { ascending: false });
                
                if (jobsError) throw jobsError;
                jobs = jobData || [];
            }
            
            setAssignedJobs(jobs);

            // Compute workflow counts for assigned jobs
            const counts = jobs.reduce((acc, job) => {
                acc[job.status] = (acc[job.status] || 0) + 1;
                return acc;
            }, {});
            setWorkflowCounts(counts);

            // Fetch user's leave requests
            const { data: requests, error: requestsError } = await supabase
                .from('request_approvals')
                .select('*')
                .eq('requester_id', userId)
                .order('created_at', { ascending: false });

            if (requestsError) throw requestsError;
            setLeaveRequests(requests || []);

        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const getStateLabel = (state) => APP_CONFIG.workflow.states[state]?.label || state;

    if (loading) {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Technician Dashboard...</p>
                </div>
            </div>
        );
    }

    const activeJobsCount = assignedJobs.filter(j => j.status !== WORKFLOW_STATES.JOB_COMPLETE).length;
    const testingJobsCount = assignedJobs.filter(j => j.status === WORKFLOW_STATES.UNDER_TESTING).length;
    const pendingRequests = leaveRequests.filter(r => r.status === 'PENDING').length;

    return (
        <TooltipProvider delayDuration={300}>
            <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-8 pb-12"
            >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <LayoutDashboard className="w-8 h-8 text-primary" />
                            </div>
                            Lab Technician Dashboard
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">Welcome back, <span className="text-primary font-bold">{user?.fullName || user?.username}</span>.</p>
                    </div>
                    <Button onClick={fetchDashboardData} size="sm" variant="ghost" className="rounded-xl h-10 px-4 font-bold text-primary hover:bg-primary/10 transition-all border border-gray-100 bg-white shadow-sm">
                        <Zap className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Assigned Active Jobs', value: activeJobsCount, icon: Briefcase, color: 'text-primary', bg: 'bg-gray-50 dark:bg-gray-100', iconBg: 'bg-primary/10' },
                        { label: 'Currently Under Testing', value: testingJobsCount, icon: Beaker, color: 'text-primary', bg: 'bg-gray-50 dark:bg-gray-100', iconBg: 'bg-primary/10' },
                        { label: 'Pending Leave Requests', value: pendingRequests, icon: Calendar, color: 'text-primary', bg: 'bg-gray-50 dark:bg-gray-100', iconBg: 'bg-primary/10' },
                    ].map((stat, idx) => (
                        <motion.div key={idx} variants={item}>
                            <Card className={`border-none shadow-sm ${stat.bg}/30 relative overflow-hidden group`}>
                                <div className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} rounded-bl-[64px] -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110 duration-500`} />
                                <CardContent className="p-4 relative">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${stat.iconBg} ${stat.color} shrink-0`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{stat.label}</p>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{stat.value}</h3>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                            <div key={job.id} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{job.job_code || job.job_id}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{job.clients?.client_name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge className="bg-primary/10 text-primary border-none shadow-none text-[10px] font-black uppercase">
                                                        {getStateLabel(job.status)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right Column: Leave Requests */}
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
                                        leaveRequests.map((req) => (
                                            <div key={req.id} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {req.request_data?.leaveType || 'Leave Request'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        {new Date(req.request_data?.startDate).toLocaleDateString()} - {new Date(req.request_data?.endDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Badge className={`text-[10px] font-black uppercase border-none ${
                                                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {req.status}
                                                    </Badge>
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

export default TechnicianDashboard;
