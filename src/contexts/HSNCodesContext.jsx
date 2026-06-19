import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const HSNCodesContext = createContext();

const HSNCodesProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [hsnCodes, setHsnCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHsnCodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hsn_sac_codes')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('Error fetching HSN codes:', error.message);
        return;
      }

      if (data) {
        setHsnCodes(data);
      }
    } catch (error) {
      console.error('Error loading HSN codes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addHsnCode = useCallback(async (hsnData, userId = null) => {
    try {
      const { data, error } = await supabase.from('hsn_sac_codes').insert([hsnData]).select();

      if (error) throw error;
      if (data) {
        setHsnCodes((prev) => [...prev, data[0]].sort((a, b) => a.code.localeCompare(b.code)));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'hsn_code',
          entityId: data[0]?.id,
          entityName: `${hsnData.code} — ${hsnData.description}`,
          action: 'CREATE',
        });
      }
    } catch (error) {
      console.error('Error adding HSN code:', error);
      throw error;
    }
  }, [currentUserId]);

  const updateHsnCode = useCallback(async (id, hsnData, userId = null) => {
    try {
      const { data, error } = await supabase
        .from('hsn_sac_codes')
        .update(hsnData)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data) {
        setHsnCodes((prev) =>
          prev.map((h) => (h.id === id ? data[0] : h)).sort((a, b) => a.code.localeCompare(b.code))
        );
        logAudit({
          userId: userId || currentUserId,
          entityType: 'hsn_code',
          entityId: id,
          entityName: `${hsnData.code} — ${hsnData.description}`,
          action: 'UPDATE',
        });
      }
    } catch (error) {
      console.error('Error updating HSN code:', error);
      throw error;
    }
  }, [currentUserId]);

  const deleteHsnCode = useCallback(
    async (id, userId = null) => {
      try {
        const toDelete = hsnCodes.find((h) => h.id === id);
        const { error } = await supabase.from('hsn_sac_codes').delete().eq('id', id);

        if (error) throw error;
        setHsnCodes((prev) => prev.filter((h) => h.id !== id));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'hsn_code',
          entityId: id,
          entityName: toDelete?.code,
          action: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting HSN code:', error);
        throw error;
      }
    },
    [hsnCodes, currentUserId]
  );

  useEffect(() => {
    fetchHsnCodes();
  }, [fetchHsnCodes]);

  const contextValue = useMemo(
    () => ({
      hsnCodes,
      loading,
      refreshHsnCodes: fetchHsnCodes,
      addHsnCode,
      updateHsnCode,
      deleteHsnCode,
    }),
    [hsnCodes, loading, fetchHsnCodes, addHsnCode, updateHsnCode, deleteHsnCode]
  );

  return <HSNCodesContext.Provider value={contextValue}>{children}</HSNCodesContext.Provider>;
};

export const useHSNCodes = () => {
  const context = useContext(HSNCodesContext);
  if (!context) {
    throw new Error('useHSNCodes must be used within a HSNCodesProvider');
  }
  return context;
};

export { HSNCodesContext, HSNCodesProvider };
