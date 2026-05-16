
import React, { Suspense } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { usePermissions } from '@/hooks/usePermissions';
import { VIEWS } from '@/data/config';
import { Loader2, ShieldAlert } from 'lucide-react';

const AdminClientsManager = lazyWithRetry(() => import('@/components/admin/AdminClientsManager.jsx'));
const AdminUsersManager = lazyWithRetry(() => import('@/components/admin/AdminUsersManager.jsx'));
const DocumentsManager = lazyWithRetry(() => import('@/components/admin/DocumentsManager.jsx'));
const JobsManager = lazyWithRetry(() => import('@/components/admin/JobsManager.jsx'));
const AdminTestsManager = lazyWithRetry(() => import('@/components/admin/AdminTestsManager.jsx'));
const AdminServicesManager = lazyWithRetry(() => import('@/components/admin/AdminServicesManager.jsx'));
const AdminSystemSettings = lazyWithRetry(() => import('@/components/admin/AdminSystemSettings.jsx'));
const AdminSamplingManager = lazyWithRetry(() => import('@/components/admin/AdminSamplingManager.jsx'));
const ExpensesManager = lazyWithRetry(() => import('@/components/admin/ExpensesManager.jsx'));
const LeavesManager = lazyWithRetry(() => import('@/components/admin/LeavesManager.jsx'));
const UtilitiesManager = lazyWithRetry(() => import('@/components/admin/UtilitiesManager.jsx'));
const AdminDashboard = lazyWithRetry(() => import('@/components/admin/AdminDashboard.jsx'));
const AnalystDashboard = lazyWithRetry(() => import('@/components/admin/AnalystDashboard.jsx'));
const AccountsDashboard = lazyWithRetry(() => import('@/components/admin/AccountsDashboard.jsx'));
const TechnicianDashboard = lazyWithRetry(() => import('@/components/admin/TechnicianDashboard.jsx'));
const ApprovalsManager = lazyWithRetry(() => import('@/components/admin/ApprovalsManager.jsx'));
const AdminClientPricingManager = lazyWithRetry(() => import('@/components/admin/AdminClientPricingManager.jsx'));
const AdminOrganizationSettings = lazyWithRetry(() => import('@/components/admin/AdminOrganizationSettings.jsx'));
const MroDashboard = lazyWithRetry(() => import('@/components/admin/MroDashboard.jsx'));
const HRDashboard = lazyWithRetry(() => import('@/components/admin/HRDashboard.jsx'));
const InquiriesManager = lazyWithRetry(() => import('@/components/admin/InquiriesManager.jsx'));

const COMPONENT_MAP = {
  [VIEWS.DASHBOARD]: AdminDashboard,
  [VIEWS.ANALYST_DASHBOARD]: AnalystDashboard,
  [VIEWS.ACCOUNTS_DASHBOARD]: AccountsDashboard,
  [VIEWS.TECHNICIAN_DASHBOARD]: TechnicianDashboard,
  [VIEWS.MRO_DASHBOARD]: MroDashboard,
  [VIEWS.APPROVALS]: ApprovalsManager,
  [VIEWS.JOBS]: JobsManager,
  [VIEWS.DOCUMENTS]: DocumentsManager,
  [VIEWS.EXPENSES]: ExpensesManager,
  [VIEWS.WORK_LOG]: LeavesManager,
  [VIEWS.UTILITIES]: UtilitiesManager,
  [VIEWS.SETTINGS]: AdminSystemSettings,
  [VIEWS.CLIENT_PRICING]: AdminClientPricingManager,
  [VIEWS.ORGANIZATION]: AdminOrganizationSettings,
  [VIEWS.TESTING]: lazyWithRetry(() => import('@/components/admin/TestingDashboard.jsx')),
  [VIEWS.HR_DASHBOARD]: HRDashboard,
  [VIEWS.INQUIRIES]: InquiriesManager
};

const ConfigDrivenPage = ({ viewName, subView, id }) => {
  const { canView } = usePermissions();
  let Component = COMPONENT_MAP[viewName];

  if (viewName === VIEWS.SETTINGS) {
    if (subView === 'clients') Component = AdminClientsManager;
    else if (subView === 'system') Component = AdminSystemSettings;
    else if (subView === 'field_tests') Component = AdminServicesManager;
    else if (subView === 'lab_tests') Component = AdminTestsManager;
    else if (subView === 'sampling') Component = AdminSamplingManager;
  }

  if (!canView(viewName)) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-muted-foreground animate-in fade-in zoom-in-95 duration-300">
        <ShieldAlert className="w-16 h-16 text-yellow-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-gray-500">Your role does not have permission to view the <span className="font-bold text-primary">{viewName}</span> section.</p>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="p-8 border border-dashed rounded-xl bg-muted text-center italic">
        Component for view "{viewName}" is not yet registered in COMPONENT_MAP.
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <Component id={id} />
    </Suspense>
  );
};

export default ConfigDrivenPage;
