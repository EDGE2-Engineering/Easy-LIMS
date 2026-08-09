import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/components/ui/use-toast';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const TermsAndConditionsContext = createContext();

const TermsAndConditionsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTerms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient
        .from('terms_and_conditions')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setTerms(data || []);
    } catch (error) {
      console.error('Error fetching terms:', error);
      // toast({ title: "Error", description: "Failed to fetch terms and conditions.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const addTerm = useCallback(
    async (text, type = 'general', userId = null) => {
      try {
        const { data, error } = await apiClient
          .from('terms_and_conditions')
          .insert([{ text, type }])
          .select();

        if (error) throw error;
        setTerms((prev) => [...prev, ...data]);
        logAudit({
          userId: userId || currentUserId,
          entityType: 'terms_and_conditions',
          entityId: data[0]?.id,
          entityName: text.slice(0, 60),
          action: 'CREATE',
        });
        return data;
      } catch (error) {
        console.error('Error adding term:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const updateTerm = useCallback(
    async (id, text, type, userId = null) => {
      try {
        const { data, error } = await apiClient
          .from('terms_and_conditions')
          .update({ text, type, updated_at: new Date() })
          .eq('id', id)
          .select();

        if (error) throw error;
        setTerms((prev) => prev.map((term) => (term.id === id ? data[0] : term)));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'terms_and_conditions',
          entityId: id,
          entityName: text.slice(0, 60),
          action: 'UPDATE',
        });
        return data;
      } catch (error) {
        console.error('Error updating term:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const deleteTerm = useCallback(
    async (id, userId = null) => {
      try {
        const toDelete = terms.find((t) => t.id === id);
        const { error } = await apiClient.from('terms_and_conditions').delete().eq('id', id);

        if (error) throw error;
        setTerms((prev) => prev.filter((term) => term.id !== id));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'terms_and_conditions',
          entityId: id,
          entityName: toDelete?.text?.slice(0, 60),
          action: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting term:', error);
        throw error;
      }
    },
    [terms, currentUserId]
  );

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchTerms();
    }
  }, [fetchTerms]);

  const contextValue = useMemo(
    () => ({
      terms,
      loading,
      addTerm,
      updateTerm,
      deleteTerm,
      fetchTerms,
      ensureFetched,
    }),
    [terms, loading, addTerm, updateTerm, deleteTerm, fetchTerms, ensureFetched]
  );

  return (
    <TermsAndConditionsContext.Provider value={contextValue}>
      {children}
    </TermsAndConditionsContext.Provider>
  );
};
export const useTermsAndConditions = () => {
  const context = useContext(TermsAndConditionsContext);
  if (!context) {
    throw new Error('useTermsAndConditions must be used within a TermsAndConditionsProvider');
  }
  useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { TermsAndConditionsContext, TermsAndConditionsProvider };
