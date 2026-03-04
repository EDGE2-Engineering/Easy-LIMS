import React, { useState, useEffect, useMemo } from 'react';
import {
    BriefcaseBusiness, Search, Calendar, User, Eye, ArrowLeft, ArrowRight,
    CheckCircle2, Clock, MoreVertical, LayoutDashboard, Plus, Edit, FileText, Beaker, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
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
import { DB_TYPES, WORKFLOW_STEPS } from '@/config';
import MaterialInwardForm from './MaterialInwardForm';
import TestingDetailsForm from './TestingDetailsForm';
import { useToast } from '@/components/ui/use-toast';
import { sendTelegramNotification } from '@/lib/notifier';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ReportPreview from '@/components/ReportPreview';

const AdminJobsManager = () => {
    const { idToken, user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [appUsers, setAppUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [clientsList, setClientsList] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showInwardForm, setShowInwardForm] = useState(false);
    const [showTestingForm, setShowTestingForm] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showReportPreview, setShowReportPreview] = useState(false);
    const { toast } = useToast();

    const workflowStates = WORKFLOW_STEPS.map(s => s.id);

    const fetchInitialData = async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const [jobsData, usersData, clientsData] = await Promise.all([
                dynamoGenericApi.listByType(DB_TYPES.JOB, idToken),
                dynamoGenericApi.listByType(DB_TYPES.USER, idToken),
                dynamoGenericApi.listByType(DB_TYPES.CLIENT, idToken)
            ]);
            setJobs(jobsData || []);
            setAppUsers(usersData || []);
            setClientsList(clientsData || []);
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
            'MATERIAL_RECEIVED': 'bg-blue-100 text-blue-700',
            'COMPLETED': 'bg-green-100 text-green-700',
            'SENT_TO_TESTING_DEPARTMENT': 'bg-purple-100 text-purple-700',
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
        if (selectedJob.status === 'QUOTATION_CREATED') {
            setShowInwardForm(true);
            return;
        }

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

            setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            setSelectedJob(updatedJob);

            console.log(`Job ${selectedJob.job_order_no} transitioned to ${nextStatus}`);
        } catch (error) {
            console.error('Error transitioning job status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInward = async (inwardData) => {
        setIsSaving(true);
        try {
            const client = clientsList.find(c => c.id === inwardData.client_id);
            const clientName = client?.client_name || client?.clientName || selectedJob.client_name;

            const updatedJob = {
                ...selectedJob,
                status: selectedJob.status === 'QUOTATION_CREATED' ? 'MATERIAL_RECEIVED' : selectedJob.status,
                material_inward: {
                    po_wo_number: inwardData.po_wo_number,
                    inward_date: inwardData.samples?.[0]?.received_date || format(new Date(), 'yyyy-MM-dd'),
                    received_by: inwardData.samples?.[0]?.received_by || user.id || user.username,
                    samples: inwardData.samples.map(sample => ({
                        ...sample,
                        quantity: parseFloat(sample.quantity) || 0,
                        expected_test_days: parseInt(sample.expected_test_days) || 7
                    }))
                },
                updated_at: new Date().toISOString(),
                updated_by: user.id || user.username
            };

            await dynamoGenericApi.save(DB_TYPES.JOB, updatedJob, idToken);

            setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            setSelectedJob(updatedJob);
            setShowInwardForm(false);

            toast({ title: "Success", description: "Material Inward details added and job status updated to MATERIAL_RECEIVED." });

            // Telegram Notification
            const message = `📥 *Material Inward Entry Added*\n\nJob Order No: \`${updatedJob.job_order_no}\`\nClient: \`${clientName}\`\nSamples: \`${updatedJob.material_inward.samples.length}\`\nBy: \`${user?.full_name || user?.name || 'Unknown'}\``;
            sendTelegramNotification(message);

        } catch (error) {
            console.error('Error saving inward details:', error);
            toast({ title: "Error", description: "Failed to save inward details: " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTestingDetails = async (testingData) => {
        setIsSaving(true);
        try {
            const updatedJob = {
                ...selectedJob,
                lab_test_results: testingData.labTestResults,
                chemical_analysis: testingData.chemicalAnalysis,
                grain_size_analysis: testingData.grainSizeAnalysis,
                updated_at: new Date().toISOString(),
                updated_by: user.id || user.username
            };

            await dynamoGenericApi.save(DB_TYPES.JOB, updatedJob, idToken);

            setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            setSelectedJob(updatedJob);
            setShowTestingForm(false);

            toast({ title: "Success", description: "Testing details saved successfully." });

            // Telegram Notification
            const labLevels = testingData.labTestResults?.length || 0;
            const message = `🧪 *Testing Details Added/Updated*\n\nJob Order No: \`${updatedJob.job_order_no}\`\nClient: \`${updatedJob.client_name}\`\nLab Levels: \`${labLevels}\`\nBy: \`${user?.full_name || user?.name || 'Unknown'}\``;
            sendTelegramNotification(message);

        } catch (error) {
            console.error('Error saving testing details:', error);
            toast({ title: "Error", description: "Failed to save testing details: " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
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

            // const icon = isCompleted ? " ✅" : "";
            const icon = "";
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
        if (showInwardForm) {
            const initialInwardData = {
                job_order_no: selectedJob.job_order_no,
                client_id: selectedJob.client_id,
                po_wo_number: selectedJob.material_inward?.po_wo_number || selectedJob.po_wo_number || '',
                samples: selectedJob.material_inward?.samples || selectedJob.content?.samples || [
                    {
                        sample_code: '',
                        sample_description: '',
                        quantity: '',
                        received_date: format(new Date(), 'yyyy-MM-dd'),
                        received_time: format(new Date(), 'HH:mm'),
                        received_by: user.id || user.username,
                        expected_test_days: 7
                    }
                ]
            };

            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setShowInwardForm(false)} className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-lg font-bold">{selectedJob.material_inward ? 'Edit' : 'Add'} Material Inward for {selectedJob.job_order_no}</h2>
                    </div>
                    <MaterialInwardForm
                        initialData={initialInwardData}
                        clientsList={clientsList}
                        appUsers={appUsers}
                        onSave={handleSaveInward}
                        onCancel={() => setShowInwardForm(false)}
                        isSaving={isSaving}
                        isAddingNew={!selectedJob.material_inward}
                    />
                </div>
            );
        }
        if (showTestingForm) {
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setShowTestingForm(false)} className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-lg font-bold">{selectedJob.lab_test_results ? 'Edit' : 'Add'} Testing Details for {selectedJob.job_order_no}</h2>
                    </div>
                    <TestingDetailsForm
                        initialData={{
                            labTestResults: selectedJob.lab_test_results,
                            chemicalAnalysis: selectedJob.chemical_analysis,
                            grainSizeAnalysis: selectedJob.grain_size_analysis,
                        }}
                        appUsers={appUsers}
                        onSave={handleSaveTestingDetails}
                        onCancel={() => setShowTestingForm(false)}
                        isSaving={isSaving}
                    />
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)} className="rounded-full h-8 w-8 p-0">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedJob.job_order_no}</h2>
                            <p className="text-xs text-gray-500">{selectedJob.client_name}</p>
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
                                Requires {currentStep.id === 'UNDER_TESTING' || currentStep.id === 'SENT_TO_TESTING_DEPARTMENT' ? 'Test Staff' : 'Admin'} permission
                            </div>
                        );

                        return (
                            <div className="flex items-center gap-2">
                                {selectedJob.status === 'MATERIAL_RECEIVED' && canPerformAction && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowInwardForm(true)}
                                        className="border-primary text-primary hover:bg-primary/5 rounded-lg px-3 flex items-center gap-2 h-9 transition-all"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        Edit Material Inward
                                    </Button>
                                )}
                                {selectedJob.status === 'QUOTATION_CREATED' && canPerformAction && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/doc/${selectedJob.id}`)}
                                        className="border-primary text-primary hover:bg-primary/5 rounded-lg px-3 flex items-center gap-2 h-9 transition-all"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        Edit Quotation
                                    </Button>
                                )}
                                {selectedJob.status === 'REPORT_GENERATED' && canPerformAction && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowReportPreview(true)}
                                        className="border-primary text-primary hover:bg-primary/5 rounded-lg px-3 flex items-center gap-2 h-9 transition-all"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Preview Report
                                    </Button>
                                )}
                                {selectedJob.status === 'UNDER_TESTING' && canPerformAction && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowTestingForm(true)}
                                        className="border-primary text-primary hover:bg-primary/5 rounded-lg px-3 flex items-center gap-2 h-9 transition-all"
                                    >
                                        <Beaker className="w-3.5 h-3.5" />
                                        {selectedJob.lab_test_results ? 'Edit Testing' : 'Add Testing'}
                                    </Button>
                                )}
                                <Button
                                    onClick={() => setShowConfirmDialog(true)}
                                    disabled={loading}
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 flex items-center gap-2 h-9 shadow-sm transition-all active:scale-95"
                                >
                                    {loading ? (
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    )}
                                    {currentStep.action}
                                </Button>
                            </div>
                        );
                    })()}
                </div>

                {/* ── Status Transition Confirmation Dialog ─────────────────── */}
                {(() => {
                    const currentIndex = workflowStates.indexOf(selectedJob.status);
                    const nextStatusId = workflowStates[currentIndex + 1];
                    const currentStep = WORKFLOW_STEPS.find(s => s.id === selectedJob.status);
                    const nextStep = WORKFLOW_STEPS.find(s => s.id === nextStatusId);
                    return (
                        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                            <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                        <ArrowRight className="w-5 h-5 text-primary" />
                                        Confirm Status Update
                                    </AlertDialogTitle>
                                    <AlertDialogDescription asChild>
                                        <div className="space-y-3 pt-1">
                                            <p className="text-sm text-gray-500">
                                                Are you sure you want to move job{' '}
                                                <span className="font-semibold text-gray-800">{selectedJob.job_order_no}</span>{' '}
                                                to the next stage?
                                            </p>
                                            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3 align-center justify-center">
                                                <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-700 rounded-lg">
                                                    {currentStep?.label || selectedJob.status.replace(/_/g, ' ')}
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                                                <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-lg">
                                                    {nextStep?.label || nextStatusId?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                                ⚠️ Note: This action cannot be undone.
                                            </p>
                                        </div>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-primary hover:bg-primary/90 rounded-xl"
                                        onClick={() => {
                                            setShowConfirmDialog(false);
                                            handleStatusTransition();
                                        }}
                                    >
                                        {currentStep?.action || 'Confirm'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    );
                })()}

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
                                        <p className="text-sm font-medium">{selectedJob.material_inward?.po_wo_number || selectedJob.po_wo_number || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Created By</p>
                                        <p className="text-sm font-medium">{getUserName(selectedJob.created_by)}</p>
                                    </div>
                                </div>

                                {/* {selectedJob.status === 'SENT_TO_TESTING_DEPARTMENT' && selectedJob.material_inward && (
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3 mt-4">
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                            <Package className="w-3.5 h-3.5" /> Inward Summaryss
                                        </p>
                                        {selectedJob?.material_inward?.samples?.map((sample, index) => (
                                            console.log(sample),
                                            <table key={index} className="w-full border border-gray-200  text-blue-400 uppercase tracking-wider">
                                                <tbody>
                                                    <tr>
                                                        <td className="font-bold text-[11px]">Quantity</td>
                                                        <td className="font-bold text-[11px]">Expected Test Days</td>
                                                        <td className="font-bold text-[11px]">Received Date</td>
                                                        <td className="font-bold text-[11px]">Sample Code</td>
                                                        <td className="font-bold text-[11px]">Sample Description</td>
                                                        <td className="font-bold text-[11px]">Received By</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="font-semibold text-[10px]">{sample.quantity}</td>
                                                        <td className="font-semibold text-[10px]">{sample.expected_test_days}</td>
                                                        <td className="font-semibold text-[10px]">{sample.received_date}</td>
                                                        <td className="font-semibold text-[10px]">{sample.sample_code}</td>
                                                        <td className="font-semibold text-[10px]">{sample.sample_description}</td>
                                                        <td className="font-semibold text-[10px]">{sample.received_by}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        ))}
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Inward Date</p>
                                                <p className="text-sm font-bold text-blue-900">
                                                    {selectedJob.material_inward.inward_date ? format(new Date(selectedJob.material_inward.inward_date), 'dd MMM yyyy') : '-'}
                                                </p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Total Quantity</p>
                                                <p className="text-sm font-bold text-blue-900">
                                                    {selectedJob.material_inward.samples?.reduce((sum, s) => sum + (parseFloat(s.quantity) || 0), 0)} Units
                                                </p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Received By</p>
                                                <p className="text-sm font-bold text-blue-900 uppercase">
                                                    {getUserName(selectedJob.material_inward.received_by)}
                                                </p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Total Samples</p>
                                                <p className="text-sm font-bold text-blue-900">
                                                    {selectedJob.material_inward.samples?.length || 0} items
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )} */}

                                <div className="pt-4 border-t">
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4 mt-4">
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                            <Package className="w-3.5 h-3.5" /> Summary of Material Inward
                                        </p>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Samples ({(selectedJob.material_inward?.samples || selectedJob.content?.samples)?.length || 0})</p>
                                            <div className="w-full overflow-x-auto">
                                                <table className="w-full border border-gray-200 text-xs">
                                                    <thead className="bg-blue-50">
                                                        <tr>
                                                            <th className="p-2 border text-left text-blue-700">Sample Code</th>
                                                            <th className="p-2 border text-left text-blue-700">Sample Description</th>
                                                            <th className="p-2 border text-left text-blue-700">Quantity</th>
                                                            <th className="p-2 border text-left text-blue-700">Expected Test Days</th>
                                                            <th className="p-2 border text-left text-blue-700">Received Date</th>
                                                            <th className="p-2 border text-left text-blue-700">Received By</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(selectedJob.material_inward?.samples || selectedJob.content?.samples)?.map((sample, idx) => (
                                                            <tr key={idx} className="bg-white even:bg-blue-50/30">
                                                                <td className="p-2 border">{sample.sample_code}</td>
                                                                <td className="p-2 border">{sample.sample_description}</td>
                                                                <td className="p-2 border">{sample.quantity}</td>
                                                                <td className="p-2 border">{sample.expected_test_days}</td>
                                                                <td className="p-2 border">{sample.received_date}</td>
                                                                <td className="p-2 border font-medium">{getUserName(sample.received_by)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Summary of Tests ───────────────────────────────────── */}
                                {(selectedJob.lab_test_results || selectedJob.chemical_analysis || selectedJob.grain_size_analysis) && (
                                    <div className="pt-4 border-t">
                                        <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-4 mt-4">
                                            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                                <Beaker className="w-3.5 h-3.5" /> Summary of Tests
                                            </p>

                                            {/* Lab Test Results */}
                                            {Array.isArray(selectedJob.lab_test_results) && selectedJob.lab_test_results.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                        Lab Test Results ({selectedJob.lab_test_results.length} level{selectedJob.lab_test_results.length !== 1 ? 's' : ''})
                                                    </p>
                                                    <div className="w-full overflow-x-auto">
                                                        <table className="w-full border border-gray-200 text-xs">
                                                            <thead className="bg-purple-50">
                                                                <tr>
                                                                    <th className="p-2 border text-left text-purple-700">Level</th>
                                                                    <th className="p-2 border text-left text-purple-700">Readings</th>
                                                                    <th className="p-2 border text-left text-purple-700">Depth Range</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedJob.lab_test_results.map((level, li) => {
                                                                    const rows = Array.isArray(level) ? level : [];
                                                                    const depths = rows.map(r => r.depth).filter(Boolean);
                                                                    const depthRange = depths.length > 0
                                                                        ? (depths.length === 1 ? depths[0] : `${depths[0]} – ${depths[depths.length - 1]}`)
                                                                        : '-';
                                                                    return (
                                                                        <tr key={li} className="bg-white even:bg-purple-50/30">
                                                                            <td className="p-2 border font-medium">Level {li + 1}</td>
                                                                            <td className="p-2 border">{rows.length}</td>
                                                                            <td className="p-2 border">{depthRange}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Chemical Analysis */}
                                            {Array.isArray(selectedJob.chemical_analysis) && selectedJob.chemical_analysis.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                        Chemical Analysis ({selectedJob.chemical_analysis.length} level{selectedJob.chemical_analysis.length !== 1 ? 's' : ''})
                                                    </p>
                                                    <div className="w-full overflow-x-auto">
                                                        <table className="w-full border border-gray-200 text-xs">
                                                            <thead className="bg-purple-50">
                                                                <tr>
                                                                    <th className="p-2 border text-left text-purple-700">Level</th>
                                                                    <th className="p-2 border text-left text-purple-700">pH Value</th>
                                                                    <th className="p-2 border text-left text-purple-700">Sulphates (%)</th>
                                                                    <th className="p-2 border text-left text-purple-700">Chlorides (%)</th>
                                                                    <th className="p-2 border text-left text-purple-700">Additional Keys</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedJob.chemical_analysis.map((item, ci) => (
                                                                    <tr key={ci} className="bg-white even:bg-purple-50/30">
                                                                        <td className="p-2 border font-medium">Level {ci + 1}</td>
                                                                        <td className="p-2 border">{item.phValue || '-'}</td>
                                                                        <td className="p-2 border">{item.sulphates || '-'}</td>
                                                                        <td className="p-2 border">{item.chlorides || '-'}</td>
                                                                        <td className="p-2 border">{item.additionalKeys?.filter(k => k.key).length || 0}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Grain Size Analysis */}
                                            {Array.isArray(selectedJob.grain_size_analysis) && selectedJob.grain_size_analysis.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                        Grain Size Analysis ({selectedJob.grain_size_analysis.length} level{selectedJob.grain_size_analysis.length !== 1 ? 's' : ''})
                                                    </p>
                                                    <div className="w-full overflow-x-auto">
                                                        <table className="w-full border border-gray-200 text-xs">
                                                            <thead className="bg-purple-50">
                                                                <tr>
                                                                    <th className="p-2 border text-left text-purple-700">Level</th>
                                                                    <th className="p-2 border text-left text-purple-700">Rows</th>
                                                                    <th className="p-2 border text-left text-purple-700">Depth Range</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedJob.grain_size_analysis.map((level, gi) => {
                                                                    const rows = Array.isArray(level) ? level : [];
                                                                    const depths = rows.map(r => r.depth).filter(Boolean);
                                                                    const depthRange = depths.length > 0
                                                                        ? (depths.length === 1 ? depths[0] : `${depths[0]} – ${depths[depths.length - 1]}`)
                                                                        : '-';
                                                                    return (
                                                                        <tr key={gi} className="bg-white even:bg-purple-50/30">
                                                                            <td className="p-2 border font-medium">Level {gi + 1}</td>
                                                                            <td className="p-2 border">{rows.length}</td>
                                                                            <td className="p-2 border">{depthRange}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Dialog open={showReportPreview} onOpenChange={setShowReportPreview}>
                    <DialogContent className="max-w-5xl h-[95vh] p-0 overflow-hidden flex flex-col bg-gray-100">
                        <div className="flex-grow overflow-y-auto p-4 flex justify-center">
                            <ReportPreview
                                formData={selectedJob.content || selectedJob}
                                onClose={() => setShowReportPreview(false)}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-md font-bold text-gray-900 flex items-center gap-3">
                        <BriefcaseBusiness className="w-8 h-8 text-primary" /> Jobs
                    </h1>
                    {/* <p className="text-gray-500 text-sm mt-1">Monitor job lifecycle and workflow status in real-time.</p> */}
                </div>

                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-grow md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search jobs, clients, POs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-9 border-gray-100 bg-gray-50/50 focus:bg-white transition-all rounded-lg text-sm"
                        />
                    </div>
                    <Button
                        onClick={() => navigate('/doc/new')}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 flex items-center gap-2 h-9"
                    >
                        <Plus className="w-4 h-4" /> New Job
                    </Button>
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
