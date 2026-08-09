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
      const { data, error } = await apiClient
        .from('service_unit_types')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching unit types:', error.message);
        return;
      }

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
        const { data, error } = await apiClient
          .from('service_unit_types')
          .insert([{ unit_type: unitType }])
          .select();

        if (error) throw error;
        if (data) {
          setUnitTypes((prev) => [...prev, data[0]]);
          logAudit({
            userId: userId || currentUserId,
            entityType: 'unit_type',
            entityId: data[0]?.id,
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
        const { data, error } = await apiClient
          .from('service_unit_types')
          .update({ unit_type: unitType })
          .eq('id', id)
          .select();

        if (error) throw error;
        if (data) {
          setUnitTypes((prev) => prev.map((u) => (u.id === id ? data[0] : u)));
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
        const { error } = await apiClient.from('service_unit_types').delete().eq('id', id);

        if (error) throw error;
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

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchUnitTypes();
    }
  }, [fetchUnitTypes]);

  const contextValue = useMemo(
    () => ({
      unitTypes,
      loading,
      refreshUnitTypes: fetchUnitTypes,
      ensureFetched,
      addUnitType,
      updateUnitType,
      deleteUnitType,
    }),
    [unitTypes, loading, fetchUnitTypes, ensureFetched, addUnitType, updateUnitType, deleteUnitType]
  );

  return <UnitTypesContext.Provider value={contextValue}>{children}</UnitTypesContext.Provider>;
};

export const useUnitTypes = () => {
  const context = useContext(UnitTypesContext);
  if (!context) {
    throw new Error('useUnitTypes must be used within a UnitTypesProvider');
  }
  useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { UnitTypesContext, UnitTypesProvider };
