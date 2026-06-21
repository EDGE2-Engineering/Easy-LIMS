import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/components/ui/use-toast';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const TechnicalsContext = createContext();

const TechnicalsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [technicals, setTechnicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTechnicals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/api/technicals?order_by=id&order_dir=asc');
      setTechnicals(data || []);
    } catch (error) {
      console.error('Error fetching technicals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTechnical = useCallback(
    async (text, type, userId = null) => {
      try {
        const createdItem = await apiClient.post('/api/technicals', { text, type });

        setTechnicals((prev) => [...prev, createdItem]);
        logAudit({
          userId: userId || currentUserId,
          entityType: 'technical',
          entityId: createdItem?.id,
          entityName: text,
          action: 'CREATE',
        });
        return [createdItem];
      } catch (error) {
        console.error('Error adding technical:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const updateTechnical = useCallback(
    async (id, text, type, userId = null) => {
      try {
        const updatedItem = await apiClient.put(`/api/technicals/${id}`, {
          text,
          type,
          updated_at: new Date().toISOString(),
        });

        setTechnicals((prev) => prev.map((tech) => (tech.id === id ? updatedItem : tech)));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'technical',
          entityId: id,
          entityName: text,
          action: 'UPDATE',
        });
        return [updatedItem];
      } catch (error) {
        console.error('Error updating technical:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const deleteTechnical = useCallback(
    async (id, userId = null) => {
      try {
        const toDelete = technicals.find((t) => t.id === id);
        await apiClient.delete(`/api/technicals/${id}`);

        setTechnicals((prev) => prev.filter((tech) => tech.id !== id));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'technical',
          entityId: id,
          entityName: toDelete?.text,
          action: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting technical:', error);
        throw error;
      }
    },
    [technicals, currentUserId]
  );

  useEffect(() => {
    fetchTechnicals();
  }, [fetchTechnicals]);

  const contextValue = useMemo(
    () => ({
      technicals,
      loading,
      addTechnical,
      updateTechnical,
      deleteTechnical,
      fetchTechnicals,
    }),
    [technicals, loading, addTechnical, updateTechnical, deleteTechnical, fetchTechnicals]
  );

  return <TechnicalsContext.Provider value={contextValue}>{children}</TechnicalsContext.Provider>;
};
export const useTechnicals = () => {
  const context = useContext(TechnicalsContext);
  if (!context) {
    throw new Error('useTechnicals must be used within a TechnicalsProvider');
  }
  return context;
};

export { TechnicalsContext, TechnicalsProvider };
