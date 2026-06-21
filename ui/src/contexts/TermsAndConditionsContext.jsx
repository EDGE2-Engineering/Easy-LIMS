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
      const data = await apiClient.get('/api/terms_and_conditions?order_by=id&order_dir=asc');
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
        const createdItem = await apiClient.post('/api/terms_and_conditions', { text, type });

        setTerms((prev) => [...prev, createdItem]);
        logAudit({
          userId: userId || currentUserId,
          entityType: 'terms_and_conditions',
          entityId: createdItem?.id,
          entityName: text.slice(0, 60),
          action: 'CREATE',
        });
        return [createdItem];
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
        const updatedItem = await apiClient.put(`/api/terms_and_conditions/${id}`, {
          text,
          type,
          updated_at: new Date().toISOString(),
        });

        setTerms((prev) => prev.map((term) => (term.id === id ? updatedItem : term)));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'terms_and_conditions',
          entityId: id,
          entityName: text.slice(0, 60),
          action: 'UPDATE',
        });
        return [updatedItem];
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
        await apiClient.delete(`/api/terms_and_conditions/${id}`);

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

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const contextValue = useMemo(
    () => ({
      terms,
      loading,
      addTerm,
      updateTerm,
      deleteTerm,
      fetchTerms,
    }),
    [terms, loading, addTerm, updateTerm, deleteTerm, fetchTerms]
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
  return context;
};

export { TermsAndConditionsContext, TermsAndConditionsProvider };
