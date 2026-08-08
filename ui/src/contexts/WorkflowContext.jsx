import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { APP_CONFIG } from '@/data/config';

const WorkflowContext = createContext();

export const WorkflowProvider = ({ children }) => {
  const [workflow, setWorkflow] = useState(APP_CONFIG.workflow);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkflow = useCallback(async () => {
    setLoading(true);
    // Using local config only - remote table 'workflow_config' is not present
    setWorkflow(APP_CONFIG.workflow);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const updateWorkflow = async (newConfig) => {
    try {
      const { error } = await supabase.from('workflow_config').insert([{ config: newConfig }]);

      if (error) throw error;
      setWorkflow(newConfig);
      return { success: true };
    } catch (err) {
      console.error('Error updating workflow config:', err);
      return { success: false, error: err };
    }
  };

  const value = {
    workflow,
    loading,
    error,
    refreshWorkflow: fetchWorkflow,
    updateWorkflow,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};

export const useWorkflowConfig = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflowConfig must be used within a WorkflowProvider');
  }
  return context;
};
