import { useAuth } from '@/contexts/AuthContext';
import { useWorkflowConfig } from '@/contexts/WorkflowContext';
import { APP_CONFIG } from '@/data/config';

export const usePermissions = () => {
    const { user, roles } = useAuth();
    const { workflow } = useWorkflowConfig();

    const canView = (viewName) => {
        if (!user || !user.role) return false;
        
        // Find role definition in database roles (user.role is a string slug)
        const roleDef = roles.find(r => r.role_slug === user.role);
        const allowedViews = roleDef?.view_permissions || [];
        
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
        department: user?.department
    };
};
