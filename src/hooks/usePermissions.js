import { useAuth } from '@/contexts/AuthContext';
import { useWorkflowConfig } from '@/contexts/WorkflowContext';
import { APP_CONFIG, ROLES } from '@/data/config';

export const usePermissions = () => {
    const { user, roles } = useAuth();
    const { workflow } = useWorkflowConfig();

    const canView = (viewName) => {
        if (!user || !user.role) return false;
        
        // Super Admin and Admin can see everything
        if (user.role === ROLES.SUPER_ADMIN.slug || user.role === ROLES.ADMIN.slug) return true;

        const allowedViews = APP_CONFIG.viewPermissions[user.role] || [];
        return allowedViews.includes(viewName);
    };

    const canPerformAction = (state, actionId) => {
        if (!user || !user.role) return false;
        const stateConfig = workflow.states[state];
        if (!stateConfig) return false;
        
        const action = stateConfig.actions.find(a => a.id === actionId);
        return action && action.roles.includes(user.role);
    };

    return {
        canView,
        canPerformAction,
        role: user?.role,
        departments: user?.departments || []
    };

};
