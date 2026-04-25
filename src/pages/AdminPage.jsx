
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, LayoutDashboard, Home, FileText, User, Save, Loader2, UserCog, Plus, Database, HandHeart, IndianRupee, Ruler, BriefcaseBusiness, Hash, CreditCard, TestTube, Axe, Package, Cpu, ChevronDown, SwatchBook, Drill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import ConfigDrivenPage from '@/components/common/ConfigDrivenPage';
import { VIEWS } from '@/data/config';
import AdminLogin from '@/components/admin/AdminLogin';
import UpdatePassword from '@/components/admin/UpdatePassword';
import { useToast } from '@/components/ui/use-toast';

import { supabase } from '@/lib/customSupabaseClient';

import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteContent } from '@/data/config';


const AdminPage = () => {
    const { user, loading, logout } = useAuth();
    const siteName = getSiteContent().global?.siteName;
    const { tab, id } = useParams();
    const navigate = useNavigate();
    const [mainTab, setMainTab] = useState(tab || 'jobs');
    const { canView } = usePermissions();

    const URL_TO_VIEW = {
        jobs: VIEWS.JOBS,
        expenses: VIEWS.EXPENSES,
        work_log: VIEWS.WORK_LOG,
        inward_register: VIEWS.MATERIAL_INWARD,
        testing: VIEWS.TESTING,
        accounts: VIEWS.ACCOUNTS,
        clients: VIEWS.SETTINGS,
        field_tests: VIEWS.SETTINGS,
        lab_tests: VIEWS.SETTINGS,
        sampling: VIEWS.SETTINGS,
        users: VIEWS.SETTINGS,
        system: VIEWS.SETTINGS
    };

    const TABS_CONFIG = [
        { id: 'clients', label: 'Clients', icon: BriefcaseBusiness, view: VIEWS.SETTINGS },
        { id: 'field_tests', label: 'Field Tests', icon: Drill, view: VIEWS.SETTINGS },
        { id: 'lab_tests', label: 'Lab Tests', icon: TestTube, view: VIEWS.SETTINGS },
        { id: 'sampling', label: 'Sampling', icon: SwatchBook, view: VIEWS.SETTINGS },
        { id: 'system', label: 'System', icon: Cpu, view: VIEWS.SETTINGS }
    ];

    const allowedTabs = TABS_CONFIG.filter(t => canView(t.view));

    useEffect(() => {
        if (tab) setMainTab(tab);
    }, [tab]);

    const handleTabChange = (value) => {
        setMainTab(value);
        navigate(`/settings/${value}`);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
        </div>
    );

    if (!user) return <AdminLogin onLoginSuccess={() => {}} />;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Helmet>
                <title>{allowedTabs.find(t => t.id === mainTab)?.label || 'Settings'} | {siteName}</title>
            </Helmet>

            <Navbar />

            <main className="flex-grow container mx-auto px-4 py-6 relative">
                <Tabs value={mainTab} onValueChange={handleTabChange} className="w-full space-y-6">
                    {/* Responsive Tab Navigation - Only show for settings tabs, not for Jobs/Expenses/Accounts/Work Log */}
                    {mainTab !== 'jobs' && mainTab !== 'expenses' && mainTab !== 'accounts' && mainTab !== 'work_log' && (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                            <div className="block md:hidden w-full relative">
                                <select
                                    id="admin-tabs"
                                    value={mainTab}
                                    onChange={(e) => handleTabChange(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium shadow-sm outline-none appearance-none"
                                >
                                    {allowedTabs.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="hidden md:flex justify-center flex-1">
                                <TabsList className="bg-white p-1 border border-gray-200 rounded-2xl shadow-sm h-auto inline-flex flex-wrap">
                                    {allowedTabs.map(t => (
                                        <TabsTrigger
                                            key={t.id}
                                            value={t.id}
                                            className="px-6 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 font-medium"
                                        >
                                            <t.icon className="w-4 h-4" /> {t.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                        </div>
                    )}


                    <div className="mt-8">
                        <ConfigDrivenPage viewName={URL_TO_VIEW[mainTab]} subView={mainTab} id={id} />
                    </div>
                </Tabs>
            </main>
        </div>
    );
};

export default AdminPage;
