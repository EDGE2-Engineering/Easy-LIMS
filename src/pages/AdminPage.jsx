
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
    const currentTab = tab || 'dashboard';
    const { canView } = usePermissions();

    const URL_TO_VIEW = {
        dashboard: VIEWS.DASHBOARD,
        analyst_dashboard: VIEWS.ANALYST_DASHBOARD,
        accounts_dashboard: VIEWS.ACCOUNTS_DASHBOARD,
        technician_dashboard: VIEWS.TECHNICIAN_DASHBOARD,
        jobs: VIEWS.JOBS,
        expenses: VIEWS.EXPENSES,
        work_log: VIEWS.WORK_LOG,
        utilities: VIEWS.UTILITIES,
        inward_register: VIEWS.MATERIAL_INWARD,
        material_inward: VIEWS.MATERIAL_INWARD,
        testing: VIEWS.TESTING,
        documents: VIEWS.DOCUMENTS,
        approvals: VIEWS.APPROVALS,
        settings: VIEWS.SETTINGS,
        users: VIEWS.SETTINGS,
        system: VIEWS.SETTINGS,
        clients: VIEWS.SETTINGS,
        field_tests: VIEWS.SETTINGS,
        lab_tests: VIEWS.SETTINGS,
        sampling: VIEWS.SETTINGS,
        client_pricing: VIEWS.CLIENT_PRICING,
        organization: VIEWS.ORGANIZATION,
        inquiries: VIEWS.INQUIRIES
    };





    useEffect(() => {
        if (user && !loading) {
            const currentView = URL_TO_VIEW[currentTab];
            if (currentView && !canView(currentView)) {
                const orderedTabs = ['dashboard', 'analyst_dashboard', 'accounts_dashboard', 'technician_dashboard', 'jobs', 'inquiries', 'inward_register', 'testing', 'documents', 'organization'];
                const firstAllowed = orderedTabs.find(t => canView(URL_TO_VIEW[t]));
                if (firstAllowed) {
                    navigate(`/settings/${firstAllowed}`, { replace: true });
                }
            }
        }
    }, [user, loading, currentTab, canView, navigate]);

    const handleTabChange = (value) => {
        navigate(`/settings/${value}`);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
        </div>
    );

    if (!user) return <AdminLogin onLoginSuccess={() => { }} />;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Helmet>
                <title>{currentTab.charAt(0).toUpperCase() + currentTab.slice(1).replace('_', ' ')} | {siteName}</title>
            </Helmet>

            <Navbar />

            <main className="flex-grow container mx-auto px-4 py-6 relative">
                <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full space-y-6">
                    <div className="mt-4">
                        <ConfigDrivenPage viewName={URL_TO_VIEW[currentTab]} subView={currentTab} id={id} />
                    </div>
                </Tabs>
            </main>
        </div>
    );
};

export default AdminPage;
