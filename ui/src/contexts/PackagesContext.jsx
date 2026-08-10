import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const PackagesContext = createContext();

const PackagesProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    try {
      const { data: rawData, error } = await apiClient
        .from('packages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('API fetch error (packages):', error.message);
        return;
      }

      if (rawData) {
        // Normalize items: API may return JSONB as a JSON string, parse it if needed
        let pkgList = rawData.map((p) => {
          let items = p.items;
          if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { items = []; }
          }
          return { ...p, items: Array.isArray(items) ? items : [] };
        });
        const userIds = [...new Set(pkgList.map((p) => p.user_id || p.created_by).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: uData } = await apiClient
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          if (uData) {
            const userMap = new Map(uData.map((u) => [u.id, u]));
            pkgList = pkgList.map((p) => ({
              ...p,
              users: userMap.get(p.user_id || p.created_by) || null,
            }));
          }
        }
        setPackages(pkgList);
      }
    } catch (err) {
      console.error('Error loading packages data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPackages();
    }
  }, [fetchPackages]);

  const addPackage = useCallback(
    async (newPackage) => {
      const packageId = `pkg_${Date.now()}`;
      const payload = {
        id: packageId,
        name: newPackage.name,
        items: newPackage.items || [],
        created_by: currentUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      const previousPackages = [...packages];
      setPackages((prev) => [...prev, payload]);

      try {
        const { error } = await apiClient.from('packages').insert(payload);

        if (error) {
          console.warn('API insert error (packages):', error.message);
          setPackages(previousPackages);
        } else {
          // Refresh from DB to ensure sync
          await fetchPackages();
        }

        logAudit({
          userId: currentUserId,
          entityType: 'packages',
          entityId: packageId,
          entityName: payload.name,
          action: 'CREATE',
        });
      } catch (err) {
        console.error('Add Package Exception:', err);
        setPackages(previousPackages);
        throw err;
      }
    },
    [packages, fetchPackages, currentUserId]
  );

  const updatePackage = useCallback(
    async (updatedItem) => {
      const payload = {
        name: updatedItem.name,
        items: updatedItem.items || [],
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      const previousPackages = [...packages];
      setPackages((prev) => prev.map((p) => (p.id === updatedItem.id ? { ...p, ...payload } : p)));

      try {
        const { error } = await apiClient.from('packages').update(payload).eq('id', updatedItem.id);

        if (error) {
          console.warn('API update error (packages):', error.message);
          setPackages(previousPackages);
        } else {
          // Refresh from DB to ensure sync
          await fetchPackages();
        }

        logAudit({
          userId: currentUserId,
          entityType: 'packages',
          entityId: updatedItem.id,
          entityName: updatedItem.name,
          action: 'UPDATE',
        });
      } catch (err) {
        console.error('Update Package Exception:', err);
        setPackages(previousPackages);
        throw err;
      }
    },
    [packages, fetchPackages, currentUserId]
  );

  const deletePackage = useCallback(
    async (id) => {
      const toDelete = packages.find((p) => p.id === id);
      const previousPackages = [...packages];
      setPackages((prev) => prev.filter((p) => p.id !== id));

      try {
        const { error } = await apiClient.from('packages').delete().eq('id', id);

        if (error) {
          console.warn('API delete error (packages):', error.message);
          setPackages(previousPackages);
        }

        logAudit({
          userId: currentUserId,
          entityType: 'packages',
          entityId: id,
          entityName: toDelete?.name || 'Unknown Package',
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Delete Package Exception:', err);
        setPackages(previousPackages);
        throw err;
      }
    },
    [packages, currentUserId]
  );

  const contextValue = useMemo(
    () => ({
      packages,
      loading,
      addPackage,
      updatePackage,
      deletePackage,
      refreshPackages: fetchPackages,
      ensureFetched,
    }),
    [packages, loading, addPackage, updatePackage, deletePackage, fetchPackages, ensureFetched]
  );

  return <PackagesContext.Provider value={contextValue}>{children}</PackagesContext.Provider>;
};

export const usePackages = () => {
  const context = React.useContext(PackagesContext);
  if (!context) {
    throw new Error('usePackages must be used within a PackagesProvider');
  }
  React.useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { PackagesContext, PackagesProvider };
