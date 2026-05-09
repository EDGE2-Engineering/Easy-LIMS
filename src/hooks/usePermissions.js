import { useAuth } from '@/contexts/AuthContext';
import { useWorkflowConfig } from '@/contexts/WorkflowContext';
import { APP_CONFIG, ROLES, VIEWS } from '@/data/config';

export const usePermissions = () => {
    const { user, roles } = useAuth();
    const { workflow } = useWorkflowConfig();

    const canView = (viewName) => {
        if (!user || !user.role) return false;

        const allowedViews = APP_CONFIG.viewPermissions[user.role] || [];
        
        if (viewName === VIEWS.ORGANIZATION) {
            return allowedViews.includes(VIEWS.EXPENSES) || 
                   allowedViews.includes(VIEWS.WORK_LOG) || 
                   allowedViews.includes(VIEWS.APPROVALS) ||
                   allowedViews.includes(VIEWS.SETTINGS);
        }

        return allowedViews.includes(viewName);
    };

    const canPerformAction = (state, actionId) => {
        if (!user || !user.role) return false;
        const stateConfig = workflow.states[state];
        if (!stateConfig) return false;
        
        const action = stateConfig.actions.find(a => a.id === actionId);
        return action && action.roles.includes(user.role);
    };

    const canShowNavbarAction = (actionId) => {
        if (!user || !user.role) return false;
        const allowedActions = APP_CONFIG.navbar.permissions[user.role] || [];
        return allowedActions.includes(actionId);
    };

    /**
     * Returns true if the current role's navItems list includes the given item ID.
     * Falls back to viewPermissions-based canView() when the role has no explicit list.
     * @param {string} itemId  – one of NAV_ITEM_IDS values
     * @param {string} viewName – the VIEWS value used as a fallback
     */
    const canShowNavItem = (itemId, viewName) => {
        if (!user || !user.role) return false;
        const roleList = APP_CONFIG.navbar.navItems?.[user.role];
        if (Array.isArray(roleList)) {
            return roleList.includes(itemId);
        }
        // Fallback: use the view-based permission
        return viewName ? canView(viewName) : false;
    };

    /**
     * Returns true if the current role's settingsItems list includes the given item ID.
     * Falls back to viewPermissions-based logic when the role has no explicit list.
     * @param {string} itemId   – one of SETTINGS_ITEM_IDS values
     * @param {string|string[]} viewName – the VIEWS value(s) used as a fallback
     */
    const canShowSettingsItem = (itemId, viewName) => {
        if (!user || !user.role) return false;
        const roleList = APP_CONFIG.navbar.settingsItems?.[user.role];
        if (Array.isArray(roleList)) {
            return roleList.includes(itemId);
        }
        // Fallback: use the view-based permission
        if (Array.isArray(viewName)) {
            return viewName.some(v => canView(v));
        }
        return viewName ? canView(viewName) : canView(VIEWS.SETTINGS);
    };

    return {
        canView,
        canPerformAction,
        canShowNavbarAction,
        canShowNavItem,
        canShowSettingsItem,
        role: user?.role,
        departments: user?.departments || []
    };

};
