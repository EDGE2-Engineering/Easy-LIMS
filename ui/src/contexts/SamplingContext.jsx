import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const SamplingContext = createContext();

const SamplingProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [samplingData, setSamplingData] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapFromDb = useCallback((s) => {
    if (!s) return null;
    return {
      ...s,
      id: s.id,
      serviceType: s.service_type || '',
      materials: (() => {
        // Priority: junction table rows
        if (s.sampling_to_materials && s.sampling_to_materials.length > 0)
          return s.sampling_to_materials.map((m) => m.materials?.name).filter(Boolean);
        // Fallbacks (legacy)
        if (Array.isArray(s.materials)) return s.materials;
        if (
          typeof s.materials === 'string' &&
          s.materials.trim().startsWith('[') &&
          s.materials.trim().endsWith(']')
        ) {
          try {
            return JSON.parse(s.materials);
          } catch (e) {
            return [s.materials];
          }
        }
        return s.materials ? s.materials.split(',').map((m) => m.trim()) : [];
      })(),
      group: s.group || '',
      testMethodSpecification: s.test_method_specification || '',
      unit: s.unit || '',
      qty: Number(s.qty) || 1,
      price: Number(s.price) || 0,
      hsnCode: s.hsn_code || '',
      tcList: (() => {
        // Priority: junction table rows
        if (s.sampling_to_terms_conditions && s.sampling_to_terms_conditions.length > 0)
          return s.sampling_to_terms_conditions
            .map((t) => t.terms_and_conditions?.type)
            .filter(Boolean);
        // Fallbacks (legacy)
        if (Array.isArray(s.tc_list)) return s.tc_list;
        if (
          typeof s.tc_list === 'string' &&
          s.tc_list.trim().startsWith('[') &&
          s.tc_list.trim().endsWith(']')
        ) {
          try {
            return JSON.parse(s.tc_list);
          } catch (e) {
            return [s.tc_list];
          }
        }
        return s.tc_list ? [s.tc_list] : [];
      })(),
      techList: (() => {
        // Priority: junction table rows
        if (s.sampling_to_technicals && s.sampling_to_technicals.length > 0)
          return s.sampling_to_technicals.map((t) => t.technicals?.type).filter(Boolean);
        // Fallbacks (legacy)
        if (Array.isArray(s.tech_list)) return s.tech_list;
        if (
          typeof s.tech_list === 'string' &&
          s.tech_list.trim().startsWith('[') &&
          s.tech_list.trim().endsWith(']')
        ) {
          try {
            return JSON.parse(s.tech_list);
          } catch (e) {
            return [s.tech_list];
          }
        }
        return s.tech_list ? [s.tech_list] : [];
      })(),
      createdAt: s.created_at || new Date().toISOString(),
    };
  }, []);

  // NOTE: tc_list and tech_list are text[] columns on the sampling table.
  // Run migration_sampling_tc_tech.sql in Supabase if they don't exist yet.
  const mapToDb = useCallback(
    (s) => ({
      service_type: s.serviceType,
      group: s.group,
      test_method_specification: s.testMethodSpecification,
      unit: s.unit,
      qty: s.qty,
      price: s.price,
      hsn_code: s.hsnCode,
    }),
    []
  );

  const fetchSamplingData = useCallback(async () => {
    try {
      const data = await apiClient.get('/api/sampling?order_by=created_at&order_dir=asc');

      if (!data) {
        throw new Error('No data returned');
      }

      // Fetch relationships for mapping
      const [techsRel, termsRel, techsDb, termsDb, materialsRel, materialsDb] = await Promise.all([
        apiClient.get('/api/sampling_to_technicals'),
        apiClient.get('/api/sampling_to_terms_conditions'),
        apiClient.get('/api/technicals'),
        apiClient.get('/api/terms_and_conditions'),
        apiClient.get('/api/sampling_to_materials').catch(() => []), // Table might not exist
        apiClient.get('/api/materials').catch(() => []), // Table might not exist
      ]);

      const techMap = techsDb.reduce((acc, t) => ({ ...acc, [t.id]: t.type }), {});
      const termMap = termsDb.reduce((acc, t) => ({ ...acc, [t.id]: t.type }), {});
      const materialMap = materialsDb.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {});

      const enrichedData = data.map((s) => {
        const sTechs = techsRel
          .filter((r) => r.sampling_id === s.id)
          .map((r) => ({ technicals: { type: techMap[r.technical_id] } }));
        const sTerms = termsRel
          .filter((r) => r.sampling_id === s.id)
          .map((r) => ({ terms_and_conditions: { type: termMap[r.tc_id] } }));
        const sMats = materialsRel
          .filter((r) => r.sampling_id === s.id)
          .map((r) => ({ materials: { name: materialMap[r.material_id] } }));

        return {
          ...s,
          sampling_to_technicals: sTechs,
          sampling_to_terms_conditions: sTerms,
          sampling_to_materials: sMats,
        };
      });

      const mappedData = enrichedData.map(mapFromDb);
      setSamplingData(mappedData);
    } catch (error) {
      console.error('Error loading sampling data:', error);
      const stored = localStorage.getItem(STORAGE_KEYS.SAMPLING_DATA);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSamplingData(parsed);
          }
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  }, [mapFromDb]);

  useEffect(() => {
    fetchSamplingData();
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEYS.SAMPLING_DATA);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setSamplingData(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchSamplingData]);

  useEffect(() => {
    if (samplingData.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SAMPLING_DATA, JSON.stringify(samplingData));
    }
  }, [samplingData]);

  const updateSampling = useCallback(
    async (updatedItem) => {
      const previousData = [...samplingData];
      setSamplingData((prev) => prev.map((s) => (s.id === updatedItem.id ? updatedItem : s)));

      try {
        const dbPayload = mapToDb(updatedItem);
        const id = updatedItem.id;
        dbPayload.updated_at = new Date().toISOString();

        await apiClient.put(`/api/sampling/${id}`, dbPayload);

        // NOTE: 'materials' DB table not yet provisioned — materials are stored in UI state only

        // Sync T&C (Delete old, insert new)
        const allTermsRels = await apiClient.get('/api/sampling_to_terms_conditions');
        const toDeleteTerms = allTermsRels.filter((r) => r.sampling_id === id);
        for (const rel of toDeleteTerms) {
          await apiClient.delete(`/api/sampling_to_terms_conditions/${rel.id}`).catch(() => {});
        }

        if (updatedItem.tcList?.length > 0) {
          const terms = await apiClient.get('/api/terms_and_conditions', {
            params: { in_type: updatedItem.tcList },
          });
          if (terms?.length > 0) {
            for (const t of terms) {
              await apiClient
                .post('/api/sampling_to_terms_conditions', { sampling_id: id, tc_id: t.id })
                .catch(() => {});
            }
          }
        }

        // Sync Technicals
        const allTechRels = await apiClient.get('/api/sampling_to_technicals');
        const toDeleteTechs = allTechRels.filter((r) => r.sampling_id === id);
        for (const rel of toDeleteTechs) {
          await apiClient.delete(`/api/sampling_to_technicals/${rel.id}`).catch(() => {});
        }

        if (updatedItem.techList?.length > 0) {
          const techs = await apiClient.get('/api/technicals', {
            params: { in_type: updatedItem.techList },
          });
          if (techs?.length > 0) {
            for (const t of techs) {
              await apiClient
                .post('/api/sampling_to_technicals', { sampling_id: id, technical_id: t.id })
                .catch(() => {});
            }
          }
        }

        logAudit({
          userId: userId || currentUserId,
          entityType: 'sampling',
          entityId: updatedItem.id,
          entityName: updatedItem.serviceType,
          action: 'UPDATE',
        });
        await fetchSamplingData();
      } catch (err) {
        console.error('Update Sampling Exception:', err);
        setSamplingData(previousData);
        throw err;
      }
    },
    [samplingData, mapToDb, fetchSamplingData, currentUserId]
  );

  const addSampling = useCallback(
    async (newItem) => {
      const previousData = [...samplingData];

      try {
        const dbPayload = mapToDb(newItem);
        dbPayload.created_at = new Date().toISOString();
        dbPayload.updated_at = new Date().toISOString();

        const createdItem = await apiClient.post('/api/sampling', dbPayload);

        if (createdItem && createdItem.id) {
          const id = createdItem.id;

          // Sync T&C
          if (newItem.tcList?.length > 0) {
            const terms = await apiClient.get('/api/terms_and_conditions', {
              params: { in_type: newItem.tcList },
            });
            if (terms?.length > 0) {
              for (const t of terms) {
                await apiClient
                  .post('/api/sampling_to_terms_conditions', { sampling_id: id, tc_id: t.id })
                  .catch(() => {});
              }
            }
          }

          // Sync Technicals
          if (newItem.techList?.length > 0) {
            const techs = await apiClient.get('/api/technicals', {
              params: { in_type: newItem.techList },
            });
            if (techs?.length > 0) {
              for (const t of techs) {
                await apiClient
                  .post('/api/sampling_to_technicals', { sampling_id: id, technical_id: t.id })
                  .catch(() => {});
              }
            }
          }

          logAudit({
            userId: userId || currentUserId,
            entityType: 'sampling',
            entityId: id,
            entityName: newItem.serviceType,
            action: 'CREATE',
          });
          await fetchSamplingData();
        }
      } catch (err) {
        console.error('Add Sampling Exception:', err);
        setSamplingData(previousData);
        throw err;
      }
    },
    [samplingData, mapToDb, fetchSamplingData, currentUserId]
  );

  const deleteSampling = useCallback(
    async (id, userId = null) => {
      const toDelete = samplingData.find((s) => s.id === id);
      const previousData = [...samplingData];
      setSamplingData((prev) => prev.filter((s) => s.id !== id));

      try {
        await apiClient.delete(`/api/sampling/${id}`);

        logAudit({
          userId: userId || currentUserId,
          entityType: 'sampling',
          entityId: id,
          entityName: toDelete?.serviceType,
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Delete Sampling Exception:', err);
        setSamplingData(previousData);
        throw err;
      }
    },
    [samplingData, currentUserId]
  );

  const contextValue = useMemo(
    () => ({
      samplingData,
      loading,
      updateSampling,
      addSampling,
      deleteSampling,
      refreshSampling: fetchSamplingData,
    }),
    [samplingData, loading, updateSampling, addSampling, deleteSampling, fetchSamplingData]
  );

  return <SamplingContext.Provider value={contextValue}>{children}</SamplingContext.Provider>;
};

export const useSampling = () => {
  const context = React.useContext(SamplingContext);
  if (!context) {
    throw new Error('useSampling must be used within a SamplingProvider');
  }
  return context;
};

export { SamplingContext, SamplingProvider };
