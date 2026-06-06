import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { STORAGE_KEYS } from '@/data/storageKeys';

const SamplingContext = createContext();

const SamplingProvider = ({ children }) => {
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
      const { data, error } = await supabase
        .from('sampling')
        .select(
          `
                    *,
                    sampling_to_technicals ( technicals ( type ) ),
                    sampling_to_terms_conditions ( terms_and_conditions ( type ) )
                `
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase fetch error (sampling):', error.message);
        const stored = localStorage.getItem(STORAGE_KEYS.SAMPLING_DATA);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setSamplingData(parsed);
              return;
            }
          } catch (e) {}
        }
        return;
      }

      if (data) {
        const mappedData = data.map(mapFromDb);
        setSamplingData(mappedData);
      }
    } catch (error) {
      console.error('Error loading sampling data:', error);
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

        const { error } = await supabase.from('sampling').update(dbPayload).eq('id', id);

        if (error) {
          console.error('Supabase Update Failed (sampling):', error);
          setSamplingData(previousData);
          throw new Error(`Failed to update sampling: ${error.message}`);
        }

        // NOTE: 'materials' DB table not yet provisioned — materials are stored in UI state only
        // Sync T&C
        await supabase.from('sampling_to_terms_conditions').delete().eq('sampling_id', id);
        if (updatedItem.tcList?.length > 0) {
          const { data: terms } = await supabase
            .from('terms_and_conditions')
            .select('id')
            .in('type', updatedItem.tcList);
          if (terms?.length > 0) {
            await supabase
              .from('sampling_to_terms_conditions')
              .insert(terms.map((t) => ({ sampling_id: id, tc_id: t.id })));
          }
        }

        // Sync Technicals
        await supabase.from('sampling_to_technicals').delete().eq('sampling_id', id);
        if (updatedItem.techList?.length > 0) {
          const { data: techs } = await supabase
            .from('technicals')
            .select('id')
            .in('type', updatedItem.techList);
          if (techs?.length > 0) {
            await supabase
              .from('sampling_to_technicals')
              .insert(techs.map((t) => ({ sampling_id: id, technical_id: t.id })));
          }
        }

        await fetchSamplingData();
      } catch (err) {
        console.error('Update Sampling Exception:', err);
        setSamplingData(previousData);
        throw err;
      }
    },
    [samplingData, mapToDb, fetchSamplingData]
  );

  const addSampling = useCallback(
    async (newItem) => {
      const previousData = [...samplingData];

      try {
        const dbPayload = mapToDb(newItem);
        dbPayload.created_at = new Date().toISOString();
        dbPayload.updated_at = new Date().toISOString();

        const { error, data } = await supabase.from('sampling').insert(dbPayload).select();

        if (error) {
          console.error('Supabase Add Failed (sampling):', error);
          setSamplingData(previousData);
          throw new Error(`Failed to add sampling: ${error.message}`);
        }

        if (data && data.length > 0) {
          const id = data[0].id;

          // NOTE: 'materials' DB table not yet provisioned — materials are stored in UI state only
          // Sync T&C
          if (newItem.tcList?.length > 0) {
            const { data: terms } = await supabase
              .from('terms_and_conditions')
              .select('id')
              .in('type', newItem.tcList);
            if (terms?.length > 0) {
              await supabase
                .from('sampling_to_terms_conditions')
                .insert(terms.map((t) => ({ sampling_id: id, tc_id: t.id })));
            }
          }

          // Sync Technicals
          if (newItem.techList?.length > 0) {
            const { data: techs } = await supabase
              .from('technicals')
              .select('id')
              .in('type', newItem.techList);
            if (techs?.length > 0) {
              await supabase
                .from('sampling_to_technicals')
                .insert(techs.map((t) => ({ sampling_id: id, technical_id: t.id })));
            }
          }

          await fetchSamplingData();
        }
      } catch (err) {
        console.error('Add Sampling Exception:', err);
        setSamplingData(previousData);
        throw err;
      }
    },
    [samplingData, mapToDb, fetchSamplingData]
  );

  const deleteSampling = useCallback(
    async (id) => {
      const previousData = [...samplingData];
      setSamplingData((prev) => prev.filter((s) => s.id !== id));

      try {
        const { error } = await supabase.from('sampling').delete().eq('id', id);

        if (error) {
          console.error('Supabase Delete Failed (sampling):', error);
          setSamplingData(previousData);
          throw new Error(`Failed to delete sampling: ${error.message}`);
        }
      } catch (err) {
        console.error('Delete Sampling Exception:', err);
        setSamplingData(previousData);
        throw err;
      }
    },
    [samplingData]
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
