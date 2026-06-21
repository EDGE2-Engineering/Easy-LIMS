import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { IndianRupee, ClipboardCheck, CheckCircle2, ShieldCheck, Calendar } from 'lucide-react';

import { usePermissions } from '@/hooks/usePermissions';
import { VIEWS } from '@/data/config';

import ExpensesManager from './ExpensesManager';
import LeavesManager from './LeavesManager';
import ApprovalsManager from './ApprovalsManager';
import AuditLogsManager from './AuditLogsManager';
import AdminCompanyCalendar from './AdminCompanyCalendar';

const AdminOrganizationSettings = ({ id }) => {
  const navigate = useNavigate();
  const { canView } = usePermissions();

  const TABS_CONFIG = [
    {
      id: 'expenses',
      label: 'Expenses',
      icon: IndianRupee,
      view: VIEWS.EXPENSES,
      component: ExpensesManager,
      description: 'Manage company expenses',
    },
    {
      id: 'leaves',
      label: 'Leaves',
      icon: ClipboardCheck,
      view: VIEWS.WORK_LOG,
      component: LeavesManager,
      description: 'Manage employee leaves',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: CheckCircle2,
      view: VIEWS.APPROVALS,
      component: ApprovalsManager,
      description: 'Manage employee requests and approvals',
    },
    {
      id: 'audit_logs',
      label: 'Audit Logs',
      icon: ShieldCheck,
      view: VIEWS.SETTINGS,
      component: AuditLogsManager,
      description: 'View system activity and audit logs',
    },
    {
      id: 'company_calendar',
      label: 'Calendar',
      icon: Calendar,
      view: VIEWS.SETTINGS,
      component: AdminCompanyCalendar,
      description: 'Company holidays and event schedule',
    },
  ];

  const allowedTabs = TABS_CONFIG.filter((tab) => canView(tab.view));
  const activeTab = id && allowedTabs.find((t) => t.id === id) ? id : allowedTabs[0]?.id || '';

  useEffect(() => {
    if (!id && allowedTabs.length > 0) {
      navigate(`/settings/organization/${allowedTabs[0].id}`, { replace: true });
    } else if (id && !allowedTabs.find((t) => t.id === id) && allowedTabs.length > 0) {
      navigate(`/settings/organization/${allowedTabs[0].id}`, { replace: true });
    }
  }, [id, allowedTabs, navigate]);

  const handleTabChange = (value) => {
    navigate(`/settings/organization/${value}`);
  };

  if (allowedTabs.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-xl bg-muted text-center italic">
        You do not have permission to view any organization settings.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="bg-white p-1 border border-gray-200 rounded-xl shadow-sm h-auto inline-flex flex-wrap justify-center">
            {allowedTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <tab.icon className="w-4 h-4" /> {tab.label}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-gray-800">
                    <p className="text-xs">{tab.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {allowedTabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminOrganizationSettings;
