
import React, { useState, useEffect, useMemo } from 'react';
import {
    BriefcaseBusiness, Search, Calendar, User, Eye, ArrowLeft, ArrowRight,
    CheckCircle2, Clock, MoreVertical, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { format } from 'date-fns';
import { MermaidDiagram } from '@lightenna/react-mermaid-diagram';
import { ScrollArea } from "@/components/ui/scroll-area";
import { DB_TYPES, WORKFLOW_STEPS } from '@/data/config';

const AdminJobsManager = () => {
    const { idToken, user, isAdmin } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [appUsers, setAppUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);

    const workflowStates = WORKFLOW_STEPS.map(s => s.id);

    const fetchInitialData = async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const [jobsData, usersData] = await Promise.all([
                dynamoGenericApi.listByType(DB_TYPES.JOB, idToken),
                dynamoGenericApi.listByType(DB_TYPES.USER, idToken)
            ]);
            setJobs(jobsData || []);
            setAppUsers(usersData || []);
        } catch (error) {
            console.error('Error fetching jobs data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [idToken]);

    const filteredJobs = useMemo(() => {
        return jobs.filter(job =>
            job.job_order_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.po_wo_number?.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [jobs, searchQuery]);

    const getStatusBadge = (status) => {
        const variants = {
            'RECEIVED': 'bg-blue-100 text-blue-700',
            'COMPLETED': 'bg-green-100 text-green-700',
            'SENT_TO_DEPARTMENT': 'bg-purple-100 text-purple-700',
            'UNDER_TESTING': 'bg-orange-100 text-orange-700',
            'SIGNED': 'bg-emerald-100 text-emerald-700',
            'PAYMENT_PENDING': 'bg-red-100 text-red-700',
        };
        const step = WORKFLOW_STEPS.find(s => s.id === status);
        return (
            <Badge variant="outline" className={`${variants[status] || 'bg-gray-100 text-gray-700'} border-none font-medium`}>
                {step ? step.label : status.replace(/_/g, ' ')}
            </Badge>
        );
    };
    const handleStatusTransition = async () => {
        if (!selectedJob || !idToken) return;

        const currentIndex = workflowStates.indexOf(selectedJob.status);
        if (currentIndex === -1 || currentIndex === workflowStates.length - 1) return;

        const nextStatus = workflowStates[currentIndex + 1];
        setLoading(true);

        try {
            const updatedJob = {
                ...selectedJob,
                status: nextStatus,
                updated_at: new Date().toISOString(),
                updated_by: user.id || user.username
            };

            await dynamoGenericApi.save(DB_TYPES.JOB, updatedJob, idToken);

            // Update local state
            setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            setSelectedJob(updatedJob);

            // Notification (optional but good)
            console.log(`Job ${selectedJob.job_order_no} transitioned to ${nextStatus}`);
        } catch (error) {
            console.error('Error transitioning job status:', error);
        } finally {
            setLoading(false);
        }
    };

    const getUserName = (id) => {
        const u = appUsers.find(u => u.id === id || u.sub === id || u.username === id || u.email === id);
        return u ? (u.full_name || u.fullName || u.name) : id;
    };

    const generateMermaidSource = (currentStatus) => {
        const currentIndex = workflowStates.indexOf(currentStatus);

        let source = "flowchart LR\n";

        WORKFLOW_STEPS.forEach((step, index) => {
            const label = step.label;
            const isCurrent = index === currentIndex;
            const isCompleted = index <= currentIndex;
            const isCurrentNode = isCurrent && step.id !== 'COMPLETED';

            let nodeStyle = "";
            // Apply completed style to all nodes up to current
            if (isCompleted) nodeStyle = ":::completed";
            // Overwrite or append current style to the active node for thicker border
            if (isCurrentNode) nodeStyle = ":::currentNode";

            const icon = isCompleted ? " ✅" : "";
            source += `  ${step.id}["${label}${icon}"]${nodeStyle}\n`;

            if (index < WORKFLOW_STEPS.length - 1) {
                source += `  ${step.id} --> ${WORKFLOW_STEPS[index + 1].id}\n`;
            }
        });

        source += "\n  classDef completed fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#166534\n";
        source += "  classDef currentNode fill:#dcfce7,stroke:#2563eb,stroke-width:4px,color:#166534,font-weight:bold\n";

        return source;
    };

    if (selectedJob) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedJob(null)} className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedJob.job_order_no}</h2>
                            <p className="text-sm text-gray-500">{selectedJob.client_name}</p>
                        </div>
                    </div>

                    {(() => {
                        const currentStep = WORKFLOW_STEPS.find(s => s.id === selectedJob.status);
                        const currentIndex = workflowStates.indexOf(selectedJob.status);
                        const hasNext = currentIndex < workflowStates.length - 1;

                        if (!hasNext || !currentStep?.action) return null;

                        // ROLE-BASED ACCESS CONTROL
                        const actualIsAdmin = isAdmin();
                        const userRole = user?.role?.toLowerCase() || 'user';
                        const canPerformAction = actualIsAdmin || currentStep.roles?.some(r => r.toLowerCase() === userRole);

                        console.log('AdminJobsManager: RBAC Evaluation:', {
                            userRole,
                            actualIsAdmin,
                            stepRoles: currentStep.roles,
                            canPerformAction
                        });

                        if (!canPerformAction) return (
                            <div className="flex items-center gap-2 text-gray-400 text-sm italic">
                                <Clock className="w-4 h-4" />
                                Requires {currentStep.id === 'UNDER_TESTING' || currentStep.id === 'SENT_TO_DEPARTMENT' ? 'Test Staff' : 'Admin'} permission
                            </div>
                        );

                        return (
                            <Button
                                onClick={handleStatusTransition}
                                disabled={loading}
                                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 flex items-center gap-2 h-11 shadow-sm transition-all active:scale-95"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <ArrowRight className="w-4 h-4" />
                                )}
                                {currentStep.action}
                            </Button>
                        );
                    })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">



                    <Card className="lg:col-span-2 rounded-2xl border-gray-100 shadow-sm overflow-hidden ">
                        <CardHeader className="bg-gray-50/50 border-b p-2 px-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LayoutDashboard className="w-5 h-5 text-primary" /> Progress
                            </CardTitle>
                            {/* <CardDescription>Visual tracker for job progress</CardDescription> */}
                        </CardHeader>
                        <CardContent className="p-0 overflow-hidden">
                            <ScrollArea className="w-full p-2">
                                <div className="">
                                    <MermaidDiagram>
                                        {generateMermaidSource(selectedJob.status)}
                                    </MermaidDiagram>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-2 space-y-6">
                        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                            <CardHeader className="bg-gray-50/50 border-b">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" /> Job Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</p>
                                        <div>{getStatusBadge(selectedJob.status)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Created Date</p>
                                        <p className="text-sm font-medium">{format(new Date(selectedJob.created_at), 'dd MMM yyyy')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">PO/WO #</p>
                                        <p className="text-sm font-medium">{selectedJob.po_wo_number || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Created By</p>
                                        <p className="text-sm font-medium">{getUserName(selectedJob.created_by)}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Samples ({selectedJob.content?.samples?.length || 0})</p>
                                    <div className="space-y-2">
                                        {selectedJob.content?.samples?.map((sample, idx) => (
                                            <div key={idx} className="p-2 bg-gray-50 rounded-lg text-xs">
                                                <p className="font-bold text-gray-700">{sample.sample_code}</p>
                                                <p className="text-gray-500 truncate">{sample.sample_description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <BriefcaseBusiness className="w-8 h-8 text-primary" /> Jobs Tracker
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Monitor job lifecycle and workflow status in real-time.</p>
                </div>

                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-grow md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search jobs, clients, POs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 border-gray-100 bg-gray-50/50 focus:bg-white transition-all rounded-xl"
                        />
                    </div>
                </div>
            </div>

            <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-gray-100">
                            <TableHead className="w-48 font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Job Order ID</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Client</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">PO/WO #</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Received Date</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Status</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Created By</TableHead>
                            <TableHead className="text-right h-14">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm text-gray-500">Loading jobs...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredJobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Search className="w-12 h-12" />
                                        <p className="font-medium text-gray-900">No jobs found matching your search</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredJobs.map((job) => (
                            <TableRow key={job.id} className="hover:bg-gray-50/50 border-gray-100 transition-colors group cursor-pointer" onClick={() => setSelectedJob(job)}>
                                <TableCell className="font-mono text-sm font-bold text-primary">{job.job_order_no}</TableCell>
                                <TableCell className="font-medium text-gray-900">{job.client_name}</TableCell>
                                <TableCell className="text-gray-500 text-sm">{job.po_wo_number || '-'}</TableCell>
                                <TableCell className="text-gray-500 text-sm">{format(new Date(job.created_at), 'dd MMM yyyy')}</TableCell>
                                <TableCell>{getStatusBadge(job.status)}</TableCell>
                                <TableCell className="text-sm text-gray-600 font-medium">{getUserName(job.created_by)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="group-hover:text-primary transition-colors">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default AdminJobsManager;
