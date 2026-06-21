import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const UnitTypesContext = createContext();

const UnitTypesProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [unitTypes, setUnitTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUnitTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/api/service_unit_types?order_by=id&order_dir=asc');
      if (data) {
        setUnitTypes(data);
      }
    } catch (error) {
      console.error('Error loading unit types:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addUnitType = useCallback(
    async (unitType, userId = null) => {
      try {
        const createdItem = await apiClient.post('/api/service_unit_types', {
          unit_type: unitType,
        });

        if (createdItem) {
          setUnitTypes((prev) => [...prev, createdItem]);
          logAudit({
            userId: userId || currentUserId,
            entityType: 'unit_type',
            entityId: createdItem?.id,
            entityName: unitType,
            action: 'CREATE',
          });
        }
      } catch (error) {
        console.error('Error adding unit type:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const updateUnitType = useCallback(
    async (id, unitType, userId = null) => {
      try {
        const updatedItem = await apiClient.put(`/api/service_unit_types/${id}`, {
          unit_type: unitType,
        });

        if (updatedItem) {
          setUnitTypes((prev) => prev.map((u) => (u.id === id ? updatedItem : u)));
          logAudit({
            userId: userId || currentUserId,
            entityType: 'unit_type',
            entityId: id,
            entityName: unitType,
            action: 'UPDATE',
          });
        }
      } catch (error) {
        console.error('Error updating unit type:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const deleteUnitType = useCallback(
    async (id, userId = null) => {
      try {
        const toDelete = unitTypes.find((u) => u.id === id);
        await apiClient.delete(`/api/service_unit_types/${id}`);

        setUnitTypes((prev) => prev.filter((u) => u.id !== id));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'unit_type',
          entityId: id,
          entityName: toDelete?.unit_type,
          action: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting unit type:', error);
        throw error;
      }
    },
    [unitTypes, currentUserId]
  );

  useEffect(() => {
    fetchUnitTypes();
  }, [fetchUnitTypes]);

  const contextValue = useMemo(
    () => ({
      unitTypes,
      loading,
      refreshUnitTypes: fetchUnitTypes,
      addUnitType,
      updateUnitType,
      deleteUnitType,
    }),
    [unitTypes, loading, fetchUnitTypes, addUnitType, updateUnitType, deleteUnitType]
  );

  return <UnitTypesContext.Provider value={contextValue}>{children}</UnitTypesContext.Provider>;
};

export const useUnitTypes = () => {
  const context = useContext(UnitTypesContext);
  if (!context) {
    throw new Error('useUnitTypes must be used within a UnitTypesProvider');
  }
  return context;
};

export { UnitTypesContext, UnitTypesProvider };
