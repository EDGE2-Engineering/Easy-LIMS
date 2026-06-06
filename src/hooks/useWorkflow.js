import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { APP_CONFIG, WORKFLOW_STATES, ROLES } from '@/data/config';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflowConfig } from '@/contexts/WorkflowContext';
import { toast } from '@/components/ui/use-toast';

export const useWorkflow = (jobId, currentState) => {
  const { user } = useAuth();
  const { workflow } = useWorkflowConfig();
  const [loading, setLoading] = useState(false);

  const getAvailableActions = useCallback(() => {
    if (!currentState || !workflow.states[currentState]) return [];

    const stateConfig = workflow.states[currentState];
    return (stateConfig.actions || []).filter((action) => {
      // Admin and Super Admin can perform all workflow actions
      if (user?.role === ROLES.SUPER_ADMIN.slug || user?.role === ROLES.ADMIN.slug) return true;
      // Check if user role matches one of the allowed roles for this action
      return action.roles.includes(user?.role);
    });
  }, [currentState, user?.role]);

  const performAction = async (actionId, remarks = '') => {
    const action = getAvailableActions().find((a) => a.id === actionId);
    if (!action) {
      toast({
        title: 'Error',
        description: 'Action not allowed for your role or current state.',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      // Robustly determine the integer user ID for bigint columns
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      if (isNaN(userId) && user.username) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', user.username)
          .maybeSingle();
        if (userData) userId = userData.id;
      }

      if (isNaN(userId)) {
        throw new Error(
          'Unable to determine a valid numeric User ID. Please try logging out and back in.'
        );
      }

      // 1. Update job state in DB
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: action.targetState,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      // 2. Log the transition
      const { error: logError } = await supabase.from('job_workflow_logs').insert({
        job_id: jobId,
        from_state: currentState,
        to_state: action.targetState,
        action_id: actionId,
        performed_by: userId,
        remarks,
      });
      if (logError) throw logError;

      toast({
        title: 'Success',
        description: `Job transitioned to ${workflow.states[action.targetState]?.label || action.targetState}`,
      });
      return true;
    } catch (err) {
      console.error('Workflow error:', err);
      toast({ title: 'Error', description: 'Failed to perform action.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const revertState = async (remarks = 'Reverted to previous step') => {
    const stateKeys = Object.keys(workflow.states);
    const currentIndex = stateKeys.indexOf(currentState);

    if (currentIndex <= 0) {
      toast({ title: 'Error', description: 'Cannot go back further.', variant: 'destructive' });
      return false;
    }

    const previousState = stateKeys[currentIndex - 1];
    setLoading(true);
    try {
      // Robustly determine the integer user ID for bigint columns
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      if (isNaN(userId) && user.username) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', user.username)
          .maybeSingle();
        if (userData) userId = userData.id;
      }

      if (isNaN(userId)) {
        throw new Error(
          'Unable to determine a valid numeric User ID. Please try logging out and back in.'
        );
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: previousState,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('job_workflow_logs').insert({
        job_id: jobId,
        from_state: currentState,
        to_state: previousState,
        action_id: 'REVERT_STATE',
        performed_by: userId,
        remarks,
      });
      if (logError) throw logError;

      toast({
        title: 'Reverted',
        description: `Job moved back to ${workflow.states[previousState]?.label}`,
      });
      return true;
    } catch (err) {
      console.error('Workflow revert error:', err);
      toast({ title: 'Error', description: 'Failed to revert action.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    getAvailableActions,
    performAction,
    revertState,
    loading,
  };
};
