import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
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
      const { data, error } = await supabase
        .from('packages')
        .select('*, users(full_name)')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase fetch error (packages):', error.message);
        // Fallback to localStorage
        const stored = localStorage.getItem(STORAGE_KEYS.PACKAGES);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setPackages(parsed);
              return;
            }
          } catch (e) {}
        }
        return;
      }

      if (data) {
        setPackages(data);
        // Cache to localStorage
        localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error loading packages data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEYS.PACKAGES);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setPackages(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
        const { error } = await supabase.from('packages').insert(payload);

        if (error) {
          console.warn('Supabase insert error (packages), falling back to local:', error.message);
          // Save to localStorage as fallback
          const localPayloads = [...previousPackages, payload];
          localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(localPayloads));
          setPackages(localPayloads);
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
        const { error } = await supabase.from('packages').update(payload).eq('id', updatedItem.id);

        if (error) {
          console.warn('Supabase update error (packages), falling back to local:', error.message);
          // Save to localStorage as fallback
          const localPayloads = previousPackages.map((p) =>
            p.id === updatedItem.id ? { ...p, ...payload } : p
          );
          localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(localPayloads));
          setPackages(localPayloads);
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
        const { error } = await supabase.from('packages').delete().eq('id', id);

        if (error) {
          console.warn('Supabase delete error (packages), falling back to local:', error.message);
          // Save to localStorage as fallback
          const localPayloads = previousPackages.filter((p) => p.id !== id);
          localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(localPayloads));
          setPackages(localPayloads);
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
    }),
    [packages, loading, addPackage, updatePackage, deletePackage, fetchPackages]
  );

  return <PackagesContext.Provider value={contextValue}>{children}</PackagesContext.Provider>;
};

export const usePackages = () => {
  const context = React.useContext(PackagesContext);
  if (!context) {
    throw new Error('usePackages must be used within a PackagesProvider');
  }
  return context;
};

export { PackagesContext, PackagesProvider };
