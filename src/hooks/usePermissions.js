
import { useAuth } from '@/contexts/AuthContext';
import { APP_CONFIG } from '@/data/config';

export const usePermissions = () => {
    const { user } = useAuth();

    const canView = (viewName) => {
        if (!user || !user.role) return false;
        const allowedViews = APP_CONFIG.viewPermissions[user.role] || [];
        return allowedViews.includes(viewName);
    };

    const canPerformAction = (state, actionId) => {
        if (!user || !user.role) return false;
        const stateConfig = APP_CONFIG.workflow.states[state];
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
