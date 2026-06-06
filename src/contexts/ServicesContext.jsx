import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { initialServices } from '@/data/services';
import { STORAGE_KEYS } from '@/data/storageKeys';

const ServicesContext = createContext();

const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [clientServicePrices, setClientServicePrices] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapFromDb = useCallback((s) => {
    if (!s) return null;
    return {
      ...s,
      id: s.id,
      serviceType: s.service_type || s.serviceType || '',
      price: Number(s.price) || 0,
      unit: s.unit || '',
      qty: Number(s.qty) || 1,
      methodOfSampling: s.method_of_sampling || s.methodOfSampling || 'NA',
      numBHs: Number(s.num_bhs ?? s.numBHs ?? 0) || 0,
      measure: s.measure || s.measureType || 'NA',
      hsnCode: s.hsn_code || s.hsnCode || '',
      tcList: (() => {
        if (s.service_to_terms_conditions)
          return s.service_to_terms_conditions
            .map((x) => x.terms_and_conditions?.type)
            .filter(Boolean);
        if (Array.isArray(s.tc_list || s.tcList)) return s.tc_list || s.tcList;
        return s.tc_list || s.tcList || [];
      })(),
      techList: (() => {
        if (s.service_to_technicals)
          return s.service_to_technicals.map((x) => x.technicals?.type).filter(Boolean);
        if (Array.isArray(s.tech_list || s.techList)) return s.tech_list || s.techList;
        return s.tech_list || s.techList || [];
      })(),
      createdAt: s.created_at || new Date().toISOString(),
    };
  }, []);

  const mapToDb = useCallback((s) => {
    const payload = {
      service_type: s.serviceType,
      price: s.price,
      unit: s.unit,
      qty: s.qty,
      method_of_sampling: s.methodOfSampling || s.method_of_sampling || 'NA',
      num_bhs: typeof s.numBHs === 'number' ? s.numBHs : Number(s.num_bhs ?? 0),
      measure: s.measure || 'NA',
      hsn_code: s.hsnCode || s.hsn_code || '',
    };
    if (s.id && typeof s.id === 'number') {
      payload.id = s.id;
    }
    return payload;
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(
          `
                    *,
                    service_to_technicals ( technicals ( type ) ),
                    service_to_terms_conditions ( terms_and_conditions ( type ) )
                `
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase fetch error (services):', error.message);
        const stored = localStorage.getItem(STORAGE_KEYS.SERVICES);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setServices(parsed);
              return;
            }
          } catch (e) {}
        }
        if (services.length === 0) setServices(initialServices);
        return;
      }

      if (data && data.length > 0) {
        const mappedData = data.map(mapFromDb);
        setServices(mappedData);
      } else {
        const stored = localStorage.getItem(STORAGE_KEYS.SERVICES);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setServices(parsed);
              return;
            }
          } catch (e) {}
        }
        setServices(initialServices);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      if (services.length === 0) setServices(initialServices);
    } finally {
      setLoading(false);
    }
  }, [mapFromDb]);

  const fetchClientServicePrices = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('client_service_prices').select('*');

      if (error) {
        console.warn('Supabase fetch error (client_service_prices):', error.message);
        return;
      }

      if (data) {
        setClientServicePrices(data);
      }
    } catch (error) {
      console.error('Error loading client service prices:', error);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchClientServicePrices();
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEYS.SERVICES);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setServices(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchServices, fetchClientServicePrices]);

  useEffect(() => {
    if (services.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    }
  }, [services]);

  const updateService = useCallback(
    async (updatedService) => {
      const previousServices = [...services];
      setServices((prev) => prev.map((s) => (s.id === updatedService.id ? updatedService : s)));

      try {
        const dbPayload = mapToDb(updatedService);
        const { id, ...updates } = dbPayload;
        updates.updated_at = new Date().toISOString();

        const { error } = await supabase.from('services').update(updates).eq('id', id);

        if (error) {
          console.error('Supabase Update Failed (services):', error);
          setServices(previousServices);
          throw new Error(`Failed to update service: ${error.message}`);
        }

        // Sync T&C
        await supabase.from('service_to_terms_conditions').delete().eq('service_id', id);
        if (updatedService.tcList?.length > 0) {
          const { data: terms } = await supabase
            .from('terms_and_conditions')
            .select('id')
            .in('type', updatedService.tcList);
          if (terms?.length > 0) {
            await supabase
              .from('service_to_terms_conditions')
              .insert(terms.map((t) => ({ service_id: id, tc_id: t.id })));
          }
        }

        // Sync Technicals
        await supabase.from('service_to_technicals').delete().eq('service_id', id);
        if (updatedService.techList?.length > 0) {
          const { data: techs } = await supabase
            .from('technicals')
            .select('id')
            .in('type', updatedService.techList);
          if (techs?.length > 0) {
            await supabase
              .from('service_to_technicals')
              .insert(techs.map((t) => ({ service_id: id, technical_id: t.id })));
          }
        }

        await fetchServices();
      } catch (err) {
        console.error('Update Service Exception:', err);
        setServices(previousServices);
        throw err;
      }
    },
    [services, mapToDb, fetchServices]
  );

  const addService = useCallback(
    async (newService) => {
      const previousServices = [...services];

      try {
        const dbPayload = mapToDb(newService);
        dbPayload.created_at = new Date().toISOString();
        dbPayload.updated_at = new Date().toISOString();

        const { error, data } = await supabase.from('services').insert(dbPayload).select();

        if (error) {
          console.error('Supabase Add Failed (services):', error);
          setServices(previousServices);
          throw new Error(`Failed to add service: ${error.message}`);
        }

        if (data && data.length > 0) {
          const id = data[0].id;

          // Sync T&C
          if (newService.tcList?.length > 0) {
            const { data: terms } = await supabase
              .from('terms_and_conditions')
              .select('id')
              .in('type', newService.tcList);
            if (terms?.length > 0) {
              await supabase
                .from('service_to_terms_conditions')
                .insert(terms.map((t) => ({ service_id: id, tc_id: t.id })));
            }
          }

          // Sync Technicals
          if (newService.techList?.length > 0) {
            const { data: techs } = await supabase
              .from('technicals')
              .select('id')
              .in('type', newService.techList);
            if (techs?.length > 0) {
              await supabase
                .from('service_to_technicals')
                .insert(techs.map((t) => ({ service_id: id, technical_id: t.id })));
            }
          }

          await fetchServices();
        }
      } catch (err) {
        console.error('Add Service Exception:', err);
        setServices(previousServices);
        throw err;
      }
    },
    [services, mapToDb, fetchServices]
  );

  const deleteService = useCallback(
    async (id) => {
      const previousServices = [...services];
      setServices((prev) => prev.filter((s) => s.id !== id));

      try {
        const { error } = await supabase.from('services').delete().eq('id', id);

        if (error) {
          console.error('Supabase Delete Failed (services):', error);
          setServices(previousServices);
          throw new Error(`Failed to delete service: ${error.message}`);
        }
      } catch (err) {
        console.error('Delete Service Exception:', err);
        setServices(previousServices);
        throw err;
      }
    },
    [services]
  );

  const updateClientServicePrice = useCallback(async (clientId, serviceId, price) => {
    try {
      console.log(
        `Updating client service price: client=${clientId}, service=${serviceId}, price=${price}`
      );
      const { data, error } = await supabase
        .from('client_service_prices')
        .upsert({
          client_id: clientId,
          service_id: serviceId,
          price: price,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('Supabase Upsert Error (client_service_prices):', error);
        throw error;
      }
      if (data) {
        setClientServicePrices((prev) => {
          const filtered = prev.filter(
            (p) => !(p.client_id === clientId && p.service_id === serviceId)
          );
          return [...filtered, data[0]];
        });
      }
    } catch (err) {
      console.error('Exception in updateClientServicePrice:', err);
      throw err;
    }
  }, []);

  const deleteClientServicePrice = useCallback(async (clientId, serviceId) => {
    try {
      const { error } = await supabase
        .from('client_service_prices')
        .delete()
        .eq('client_id', clientId)
        .eq('service_id', serviceId);

      if (error) throw error;
      setClientServicePrices((prev) =>
        prev.filter((p) => !(p.client_id === clientId && p.service_id === serviceId))
      );
    } catch (err) {
      console.error('Error deleting client service price:', err);
      throw err;
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      services,
      clientServicePrices,
      loading,
      updateService,
      addService,
      deleteService,
      updateClientServicePrice,
      deleteClientServicePrice,
      setServices,
      refreshServices: fetchServices,
      refreshClientServicePrices: fetchClientServicePrices,
    }),
    [
      services,
      clientServicePrices,
      loading,
      updateService,
      addService,
      deleteService,
      updateClientServicePrice,
      deleteClientServicePrice,
      fetchServices,
      fetchClientServicePrices,
    ]
  );

  return <ServicesContext.Provider value={contextValue}>{children}</ServicesContext.Provider>;
};

export const useServices = () => {
  const context = React.useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};

export { ServicesContext, ServicesProvider };
