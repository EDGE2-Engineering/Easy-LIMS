
import React, { lazy, Suspense } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { VIEWS } from '@/data/config';
import { Loader2, ShieldAlert } from 'lucide-react';

const AdminClientsManager = lazy(() => import('@/components/admin/AdminClientsManager.jsx'));
const AdminUsersManager = lazy(() => import('@/components/admin/AdminUsersManager.jsx'));
const DocumentsManager = lazy(() => import('@/components/admin/DocumentsManager.jsx'));
const MaterialInwardManager = lazy(() => import('@/components/admin/MaterialInwardManager'));
const JobsManager = lazy(() => import('@/components/admin/JobsManager.jsx'));
const AdminTestsManager = lazy(() => import('@/components/admin/AdminTestsManager.jsx'));
const AdminServicesManager = lazy(() => import('@/components/admin/AdminServicesManager.jsx'));
const AdminSystemSettings = lazy(() => import('@/components/admin/AdminSystemSettings.jsx'));
const AdminSamplingManager = lazy(() => import('@/components/admin/AdminSamplingManager.jsx'));
const ExpensesManager = lazy(() => import('@/components/admin/ExpensesManager.jsx'));
const LeavesManager = lazy(() => import('@/components/admin/LeavesManager.jsx'));
const UtilitiesManager = lazy(() => import('@/components/admin/UtilitiesManager.jsx'));
const Dashboard = lazy(() => import('@/components/admin/Dashboard.jsx'));
const AnalystDashboard = lazy(() => import('@/components/admin/AnalystDashboard.jsx'));
const ApprovalsManager = lazy(() => import('@/components/admin/ApprovalsManager.jsx'));
const AdminClientPricingManager = lazy(() => import('@/components/admin/AdminClientPricingManager.jsx'));
const AdminOrganizationSettings = lazy(() => import('@/components/admin/AdminOrganizationSettings.jsx'));
const InquiriesManager = lazy(() => import('@/components/admin/InquiriesManager.jsx'));

const COMPONENT_MAP = {
  [VIEWS.DASHBOARD]: Dashboard,
  [VIEWS.ANALYST_DASHBOARD]: AnalystDashboard,
  [VIEWS.APPROVALS]: ApprovalsManager,
  [VIEWS.JOBS]: JobsManager,
  [VIEWS.MATERIAL_INWARD]: MaterialInwardManager,
  [VIEWS.DOCUMENTS]: DocumentsManager,
  [VIEWS.EXPENSES]: ExpensesManager,
  [VIEWS.WORK_LOG]: LeavesManager,
  [VIEWS.UTILITIES]: UtilitiesManager,
  [VIEWS.SETTINGS]: AdminSystemSettings,
  [VIEWS.CLIENT_PRICING]: AdminClientPricingManager,
  [VIEWS.INQUIRIES]: InquiriesManager,
  [VIEWS.ORGANIZATION]: AdminOrganizationSettings,
  [VIEWS.TESTING]: lazy(() => import('@/components/admin/TestingDashboard.jsx'))
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
