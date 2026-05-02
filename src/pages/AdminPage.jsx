
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
        leave_management: VIEWS.LEAVE_MANAGEMENT,
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
                <title>{mainTab.charAt(0).toUpperCase() + mainTab.slice(1).replace('_', ' ')} | {siteName}</title>
            </Helmet>

            <Navbar />

            <main className="flex-grow container mx-auto px-4 py-6 relative">
                <Tabs value={mainTab} onValueChange={handleTabChange} className="w-full space-y-6">
                    <div className="mt-4">
                        <ConfigDrivenPage viewName={URL_TO_VIEW[mainTab]} subView={mainTab} id={id} />
                    </div>
                </Tabs>
            </main>
        </div>
    );
};

export default AdminPage;
