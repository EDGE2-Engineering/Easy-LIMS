import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
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
      const data = await apiClient.get('/api/hsn-sac-codes?order_by=code&order_dir=asc');

      if (data) {
        setHsnCodes(data);
      }
    } catch (error) {
      console.error('Error loading HSN codes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addHsnCode = useCallback(
    async (hsnData, userId = null) => {
      try {
        const data = await apiClient.post('/api/hsn-sac-codes', hsnData);

        if (data) {
          setHsnCodes((prev) => [...prev, data].sort((a, b) => a.code.localeCompare(b.code)));
          logAudit({
            userId: userId || currentUserId,
            entityType: 'hsn_code',
            entityId: data?.id,
            entityName: `${hsnData.code} — ${hsnData.description}`,
            action: 'CREATE',
          });
        }
      } catch (error) {
        console.error('Error adding HSN code:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const updateHsnCode = useCallback(
    async (id, hsnData, userId = null) => {
      try {
        const data = await apiClient.put(`/api/hsn-sac-codes/${id}`, hsnData);

        if (data) {
          setHsnCodes((prev) =>
            prev.map((h) => (h.id === id ? data : h)).sort((a, b) => a.code.localeCompare(b.code))
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
    },
    [currentUserId]
  );

  const deleteHsnCode = useCallback(
    async (id, userId = null) => {
      try {
        const toDelete = hsnCodes.find((h) => h.id === id);
        await apiClient.delete(`/api/hsn-sac-codes/${id}`);
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
