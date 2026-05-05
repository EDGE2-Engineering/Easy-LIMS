import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { IndianRupee, ClipboardCheck, CheckCircle2, ShieldCheck } from 'lucide-react';

import ExpensesManager from './ExpensesManager';
import WagesManager from './WagesManager';
import ApprovalsManager from './ApprovalsManager';
import AuditLogsManager from './AuditLogsManager';

const AdminOrganizationSettings = ({ id }) => {
    const navigate = useNavigate();
    const activeTab = id || 'expenses';

    const handleTabChange = (value) => {
        navigate(`/settings/organization/${value}`);
    };

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="flex justify-center mb-6">
                    <TabsList className="bg-white p-1 border border-gray-200 rounded-xl shadow-sm h-auto inline-flex flex-wrap justify-center">
                        <TabsTrigger
                            value="expenses"
                            className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
                        >
                            <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4" /> Expenses
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">Manage company expenses</p>
                                </TooltipContent>
                            </Tooltip>
                            </TooltipProvider>
                        </TabsTrigger>

                        <TabsTrigger
                            value="leaves"
                            className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
                        >
                            <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                        <ClipboardCheck className="w-4 h-4" /> Leaves
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">Manage employee leaves</p>
                                </TooltipContent>
                            </Tooltip>
                            </TooltipProvider>
                        </TabsTrigger>

                        <TabsTrigger
                            value="approvals"
                            className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
                        >
                            <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Approvals
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">Manage employee requests and approvals</p>
                                </TooltipContent>
                            </Tooltip>
                            </TooltipProvider>
                        </TabsTrigger>
                        
                        <TabsTrigger
                            value="audit_logs"
                            className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
                        >
                            <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" /> Audit Logs
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">View system activity and audit logs</p>
                                </TooltipContent>
                            </Tooltip>
                            </TooltipProvider>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="expenses" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ExpensesManager />
                </TabsContent>

                <TabsContent value="leaves" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <WagesManager />
                </TabsContent>

                <TabsContent value="approvals" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ApprovalsManager />
                </TabsContent>

                <TabsContent value="audit_logs" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AuditLogsManager />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminOrganizationSettings;
