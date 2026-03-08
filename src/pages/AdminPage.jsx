
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, LayoutDashboard, Home, FileText, User, Save, Loader2, UserCog, Plus, Database, HandHeart, IndianRupee, Ruler, BriefcaseBusiness, Hash, CreditCard, TestTube, Axe, Package, Cpu, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

import AdminClientsManager from '@/components/admin/AdminClientsManager.jsx';
import AdminClientPricingManager from '@/components/admin/AdminClientPricingManager.jsx';
import AccountsManager from '@/components/admin/AccountsManager.jsx';
import AdminSystemSettings from '@/components/admin/AdminSystemSettings.jsx';
import AdminReportsManager from '@/components/admin/AdminReportsManager.jsx';
import MaterialInwardManager from '@/components/admin/MaterialInwardManager';
import AdminServicesManager from '@/components/admin/AdminServicesManager';
import AdminTestsManager from '@/components/admin/AdminTestsManager';
import AdminJobsManager from '@/components/admin/AdminJobsManager';
import SystemInfo from '@/components/admin/SystemInfo';

import AdminLogin from '@/components/admin/AdminLogin';
import UpdatePassword from '@/components/admin/UpdatePassword';
import { useToast } from '@/components/ui/use-toast';

import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteContent } from '@/config';

const AdminPage = () => {
    const { user, loading, logout, isAdmin, isStandard } = useAuth();
    const siteName = getSiteContent().global?.siteName || "Easy Billing";
    const { tab } = useParams();
    const navigate = useNavigate();
    const [mainTab, setMainTab] = useState(tab || 'accounts');
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    const { toast } = useToast();

    // No longer redirect standard users away from settings
    // useEffect(() => {
    //   const allowedTabs = ['accounts', 'material-inward', 'reports'];
    //   if (isStandard() && !allowedTabs.includes(mainTab)) {
    //     navigate('/settings/accounts');
    //   }
    // }, [user, navigate, mainTab, isStandard]);

    useEffect(() => {
        if (tab) {
            setMainTab(tab);
        }
    }, [tab]);

    // No longer redirect - everything is top level
    // useEffect(() => {
    //   if (mainTab === 'services' || mainTab === 'tests') {
    //     navigate('/settings/system');
    //   }
    // }, [mainTab, navigate]);

    const settingsTabs = ['clients', 'pricing', 'services', 'tests', 'system', 'info'];
    const isSettingsTab = settingsTabs.includes(mainTab);

    const handleTabChange = (value) => {
        setMainTab(value);
        navigate(`/settings/${value}`);
    };

    const handleLoginSuccess = () => {
        toast({ title: "Welcome back", description: "You have successfully logged in." });
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isPasswordRecovery) {
        return (
            <>
                <Helmet>
                    <title>Reset Password | EDGE2 {siteName}</title>
                </Helmet>
                <UpdatePassword />
            </>
        );
    }

    if (!user && !loading) {
        return (
            <>
                <Helmet>
                    <title>Admin Login | EDGE2 {siteName}</title>
                </Helmet>
                <AdminLogin onLoginSuccess={handleLoginSuccess} />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Helmet>
                <title>Settings | EDGE2 {siteName}</title>
            </Helmet>

            <Navbar />

            <main className="flex-grow container mx-auto px-4 py-0 relative">
                <Tabs value={mainTab} onValueChange={handleTabChange} className="w-full space-y-4">
                    {/* Sub-Navigation: Only show if we are in a settings-related tab */}
                    {isSettingsTab && (
                        <>
                            {/* Mobile View: Select Dropdown */}
                            <div className="block md:hidden relative mb-4">
                                <label htmlFor="admin-tabs" className="sr-only">Select a section</label>
                                <select
                                    id="admin-tabs"
                                    value={mainTab}
                                    onChange={(e) => handleTabChange(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none appearance-none"
                                >
                                    <option value="clients">Clients</option>
                                    <option value="pricing">Pricing</option>
                                    <option value="services">Services</option>
                                    <option value="tests">Tests</option>
                                    {/* <option value="jobs">Jobs</option> */}
                                    <option value="system">Others</option>
                                    <option value="info">Info</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>

                            {/* Desktop View: Sub-Tabs List */}
                            <div className="hidden md:flex justify-center">
                                <TabsList className="bg-white p-1 border border-gray-200 rounded-xl shadow-sm h-auto inline-flex flex-wrap justify-center overflow-x-auto max-w-full">
                                    <TabsTrigger value="clients" className="px-3 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"><BriefcaseBusiness className="w-4 h-4" /> Clients</TabsTrigger>
                                    <TabsTrigger value="pricing" className="px-3 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"><IndianRupee className="w-4 h-4" /> Pricing</TabsTrigger>
                                    <TabsTrigger value="services" className="px-3 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"><HandHeart className="w-4 h-4" /> Services</TabsTrigger>
                                    <TabsTrigger value="tests" className="px-3 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"><TestTube className="w-4 h-4" /> Tests</TabsTrigger>
                                    {/* <TabsTrigger value="jobs" className="px-3 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"><LayoutDashboard className="w-4 h-4" /> Jobs</TabsTrigger> */}
                                    <TabsTrigger value="system" className="px-3 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"><Cpu className="w-4 h-4" /> Others</TabsTrigger>
                                    <TabsTrigger value="info" className="px-3 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"><Info className="w-4 h-4" /> Info</TabsTrigger>
                                </TabsList>
                            </div>
                        </>
                    )}

                    <TabsContent value="clients" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AdminClientsManager />
                    </TabsContent>

                    <TabsContent value="pricing" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AdminClientPricingManager />
                    </TabsContent>

                    <TabsContent value="accounts" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AccountsManager />
                    </TabsContent>

                    <TabsContent value="material-inward" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <MaterialInwardManager />
                    </TabsContent>

                    <TabsContent value="reports" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AdminReportsManager />
                    </TabsContent>

                    <TabsContent value="jobs" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AdminJobsManager />
                    </TabsContent>

                    <TabsContent value="services" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AdminServicesManager />
                    </TabsContent>

                    <TabsContent value="tests" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AdminTestsManager />
                    </TabsContent>

                    <TabsContent value="info" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <SystemInfo />
                    </TabsContent>

                    <TabsContent value="system" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AdminSystemSettings />
                    </TabsContent>
                </Tabs>
            </main >
        </div >
    );
};

export default AdminPage;
