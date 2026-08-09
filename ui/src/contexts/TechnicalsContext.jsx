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
      const { data, error } = await apiClient
        .from('technicals')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
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
        const { data, error } = await apiClient.from('technicals').insert([{ text, type }]).select();

        if (error) throw error;
        setTechnicals((prev) => [...prev, ...data]);
        logAudit({
          userId: userId || currentUserId,
          entityType: 'technical',
          entityId: data[0]?.id,
          entityName: text,
          action: 'CREATE',
        });
        return data;
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
        const { data, error } = await apiClient
          .from('technicals')
          .update({ text, type, updated_at: new Date() })
          .eq('id', id)
          .select();

        if (error) throw error;
        setTechnicals((prev) => prev.map((tech) => (tech.id === id ? data[0] : tech)));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'technical',
          entityId: id,
          entityName: text,
          action: 'UPDATE',
        });
        return data;
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
        const { error } = await apiClient.from('technicals').delete().eq('id', id);

        if (error) throw error;
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

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchTechnicals();
    }
  }, [fetchTechnicals]);

  const contextValue = useMemo(
    () => ({
      technicals,
      loading,
      addTechnical,
      updateTechnical,
      deleteTechnical,
      fetchTechnicals,
      ensureFetched,
    }),
    [
      technicals,
      loading,
      addTechnical,
      updateTechnical,
      deleteTechnical,
      fetchTechnicals,
      ensureFetched,
    ]
  );

  return <TechnicalsContext.Provider value={contextValue}>{children}</TechnicalsContext.Provider>;
};
export const useTechnicals = () => {
  const context = useContext(TechnicalsContext);
  if (!context) {
    throw new Error('useTechnicals must be used within a TechnicalsProvider');
  }
  useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { TechnicalsContext, TechnicalsProvider };
