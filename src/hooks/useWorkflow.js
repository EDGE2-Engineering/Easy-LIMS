
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { APP_CONFIG, WORKFLOW_STATES } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

export const useWorkflow = (jobId, currentState) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const getAvailableActions = useCallback(() => {
        if (!currentState || !APP_CONFIG.workflow.states[currentState]) return [];
        
        const stateConfig = APP_CONFIG.workflow.states[currentState];
        return (stateConfig.actions || []).filter(action => {
            // Check if user role matches one of the allowed roles for this action
            return action.roles.includes(user?.role);
        });
    }, [currentState, user?.role]);

    const performAction = async (actionId, remarks = '') => {
        const action = getAvailableActions().find(a => a.id === actionId);
        if (!action) {
            toast({ title: "Error", description: "Action not allowed for your role or current state.", variant: "destructive" });
            return false;
        }

        setLoading(true);
        try {
            // 1. Update job state in DB
            const { error: updateError } = await supabase
                .from('jobs')
                .update({ 
                    status: action.targetState,
                    updated_at: new Date().toISOString()
                })
                .eq('id', jobId);
            
            if (updateError) throw updateError;

            // 2. Log the transition
            const { error: logError } = await supabase
                .from('job_workflow_logs')
                .insert({
                    job_id: jobId,
                    from_state: currentState,
                    to_state: action.targetState,
                    action_id: actionId,
                    performed_by: user?.id,
                    remarks
                });
            if (logError) throw logError;

            toast({ title: "Success", description: `Job transitioned to ${APP_CONFIG.workflow.states[action.targetState]?.label || action.targetState}` });
            return true;
        } catch (err) {
            console.error("Workflow error:", err);
            toast({ title: "Error", description: "Failed to perform action.", variant: "destructive" });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const revertState = async (remarks = 'Reverted to previous step') => {
        const stateKeys = Object.keys(APP_CONFIG.workflow.states);
        const currentIndex = stateKeys.indexOf(currentState);
        
        if (currentIndex <= 0) {
            toast({ title: "Error", description: "Cannot go back further.", variant: "destructive" });
            return false;
        }

        const previousState = stateKeys[currentIndex - 1];
        setLoading(true);
        try {
            const { error: updateError } = await supabase
                .from('jobs')
                .update({ 
                    status: previousState,
                    updated_at: new Date().toISOString()
                })
                .eq('id', jobId);
            
            if (updateError) throw updateError;

            const { error: logError } = await supabase
                .from('job_workflow_logs')
                .insert({
                    job_id: jobId,
                    from_state: currentState,
                    to_state: previousState,
                    action_id: 'REVERT_STATE',
                    performed_by: user?.id,
                    remarks
                });
            if (logError) throw logError;

            toast({ title: "Reverted", description: `Job moved back to ${APP_CONFIG.workflow.states[previousState]?.label}` });
            return true;
        } catch (err) {
            console.error("Workflow revert error:", err);
            toast({ title: "Error", description: "Failed to revert action.", variant: "destructive" });
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        getAvailableActions,
        performAction,
        revertState,
        loading
    };
};
