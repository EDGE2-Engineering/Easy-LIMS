import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { initialLabTests } from '@/data/labTests';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const LabTestsContext = createContext();

const LabTestsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [labTests, setLabTests] = useState([]);
  const [clientLabTestPrices, setClientLabTestPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapFromDb = useCallback((t) => {
    if (!t) return null;
    return {
      ...t,
      id: t.id,
      testType: t.name || t.test_type || t.testType || '',
      materials: (() => {
        if (Array.isArray(t.materials)) return t.materials;
        if (
          typeof t.materials === 'string' &&
          t.materials.trim().startsWith('[') &&
          t.materials.trim().endsWith(']')
        ) {
          try {
            return JSON.parse(t.materials);
          } catch (e) {
            return [t.materials];
          }
        }
        return t.materials ? t.materials.split(',').map((m) => m.trim()) : [];
      })(),
      group: t.group || '',

      testMethodSpecification: t.test_method_specification || t.testMethodSpecification || '',
      numDays: Number(t.num_days ?? t.numDays ?? 1) || 1,
      price: Number(t.price) || 0,
      hsnCode: t.hsn_code || t.hsnCode || '',
      tcList: (() => {
        if (t.lab_test_to_terms_conditions)
          return t.lab_test_to_terms_conditions
            .map((x) => x.terms_and_conditions?.type)
            .filter(Boolean);
        if (Array.isArray(t.tc_list || t.tcList)) return t.tc_list || t.tcList;
        return t.tc_list || t.tcList || [];
      })(),
      techList: (() => {
        if (t.lab_test_to_technicals)
          return t.lab_test_to_technicals.map((x) => x.technicals?.type).filter(Boolean);
        if (Array.isArray(t.tech_list || t.techList)) return t.tech_list || t.techList;
        return t.tech_list || t.techList || [];
      })(),
      paymentTermsList: (() => {
        if (t.lab_test_to_payment_terms)
          return t.lab_test_to_payment_terms.map((x) => x.payment_terms?.type).filter(Boolean);
        if (Array.isArray(t.paymentTermsList)) return t.paymentTermsList;
        return [];
      })(),
      createdAt: t.created_at || new Date().toISOString(),
    };
  }, []);

  const mapToDb = useCallback((t) => {
    const payload = {
      name: t.testType,
      materials: Array.isArray(t.materials) ? t.materials : t.materials ? [t.materials] : [],
      group: t.group,
      test_method_specification: t.testMethodSpecification,
      num_days: typeof t.numDays === 'number' ? t.numDays : Number(t.num_days ?? 1),
      price: t.price,
      hsn_code: t.hsnCode || t.hsn_code || '',
    };
    if (t.id && typeof t.id === 'number') {
      payload.id = t.id;
    }
    return payload;
  }, []);

  const fetchLabTests = useCallback(async () => {
    try {
      const { data, error } = await apiClient
        .from('lab_tests')
        .select(
          `
                    *,
                    lab_test_to_technicals ( technicals ( type ) ),
                    lab_test_to_terms_conditions ( terms_and_conditions ( type ) ),
                    lab_test_to_payment_terms ( payment_terms ( type ) )
                `
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('API fetch error (lab_tests):', error.message);
        const stored = localStorage.getItem(STORAGE_KEYS.LAB_TESTS);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLabTests(parsed);
              return;
            }
          } catch (e) {}
        }
        if (labTests.length === 0) setLabTests(initialLabTests);
        return;
      }

      if (data && data.length > 0) {
        const mappedData = data.map(mapFromDb);
        setLabTests(mappedData);
      } else {
        const stored = localStorage.getItem(STORAGE_KEYS.LAB_TESTS);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLabTests(parsed);
              return;
            }
          } catch (e) {}
        }
        setLabTests(initialLabTests);
      }
    } catch (error) {
      console.error('Error loading lab tests:', error);
      if (labTests.length === 0) setLabTests(initialLabTests);
    } finally {
      setLoading(false);
    }
  }, [mapFromDb, labTests.length]);

  const fetchClientLabTestPrices = useCallback(async () => {
    try {
      const { data, error } = await apiClient.from('client_lab_test_prices').select('*');

      if (error) {
        console.warn('API fetch error (client_lab_test_prices):', error.message);
        return;
      }

      if (data) {
        setClientLabTestPrices(data);
      }
    } catch (error) {
      console.error('Error loading client lab test prices:', error);
    }
  }, []);

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchLabTests();
      fetchClientLabTestPrices();
    }
  }, [fetchLabTests, fetchClientLabTestPrices]);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEYS.LAB_TESTS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setLabTests(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (labTests.length > 0) {
      localStorage.setItem(STORAGE_KEYS.LAB_TESTS, JSON.stringify(labTests));
    }
  }, [labTests]);

  const updateLabTest = useCallback(
    async (updatedTest) => {
      const previousTests = [...labTests];
      setLabTests((prev) => prev.map((t) => (t.id === updatedTest.id ? updatedTest : t)));

      try {
        const dbPayload = mapToDb(updatedTest);
        const { id, ...updates } = dbPayload;
        const { error } = await apiClient.from('lab_tests').update(updates).eq('id', id);

        if (error) {
          console.error('API Update Failed (lab_tests):', error.message);
          setLabTests(previousTests);
          throw error;
        }

        // Sync T&C
        await apiClient.from('lab_test_to_terms_conditions').delete().eq('lab_test_id', id);
        if (updatedTest.tcList?.length > 0) {
          const { data: terms } = await apiClient
            .from('terms_and_conditions')
            .select('id')
            .in('type', updatedTest.tcList);
          if (terms?.length > 0) {
            await apiClient
              .from('lab_test_to_terms_conditions')
              .insert(terms.map((term) => ({ lab_test_id: id, tc_id: term.id })));
          }
        }

        // Sync Technicals
        await apiClient.from('lab_test_to_technicals').delete().eq('lab_test_id', id);
        if (updatedTest.techList?.length > 0) {
          const { data: techs } = await apiClient
            .from('technicals')
            .select('id')
            .in('type', updatedTest.techList);
          if (techs?.length > 0) {
            await apiClient
              .from('lab_test_to_technicals')
              .insert(techs.map((tech) => ({ lab_test_id: id, technical_id: tech.id })));
          }
        }

        // Sync Payment Terms
        await apiClient.from('lab_test_to_payment_terms').delete().eq('lab_test_id', id);
        if (updatedTest.paymentTermsList?.length > 0) {
          const { data: payTerms } = await apiClient
            .from('payment_terms')
            .select('id')
            .in('type', updatedTest.paymentTermsList);
          if (payTerms?.length > 0) {
            await apiClient
              .from('lab_test_to_payment_terms')
              .insert(payTerms.map((term) => ({ lab_test_id: id, payment_term_id: term.id })));
          }
        }

        logAudit({
          userId: currentUserId,
          entityType: 'lab_test',
          entityId: updatedTest.id,
          entityName: updatedTest.testType,
          action: 'UPDATE',
        });
        await fetchLabTests();
      } catch (err) {
        console.error('Update Lab Test Exception:', err);
        setLabTests(previousTests);
        throw err;
      }
    },
    [labTests, mapToDb, fetchLabTests, currentUserId]
  );

  const addLabTest = useCallback(
    async (newTest) => {
      try {
        const { data, error } = await apiClient.from('lab_tests').insert(mapToDb(newTest)).select();
        if (error) throw error;
        if (data && data.length > 0) {
          const id = data[0].id;

          // Sync T&C
          if (newTest.tcList?.length > 0) {
            const { data: terms } = await apiClient
              .from('terms_and_conditions')
              .select('id')
              .in('type', newTest.tcList);
            if (terms?.length > 0) {
              await apiClient
                .from('lab_test_to_terms_conditions')
                .insert(terms.map((term) => ({ lab_test_id: id, tc_id: term.id })));
            }
          }

          // Sync Technicals
          if (newTest.techList?.length > 0) {
            const { data: techs } = await apiClient
              .from('technicals')
              .select('id')
              .in('type', newTest.techList);
            if (techs?.length > 0) {
              await apiClient
                .from('lab_test_to_technicals')
                .insert(techs.map((tech) => ({ lab_test_id: id, technical_id: tech.id })));
            }
          }

          // Sync Payment Terms
          if (newTest.paymentTermsList?.length > 0) {
            const { data: payTerms } = await apiClient
              .from('payment_terms')
              .select('id')
              .in('type', newTest.paymentTermsList);
            if (payTerms?.length > 0) {
              await apiClient
                .from('lab_test_to_payment_terms')
                .insert(payTerms.map((term) => ({ lab_test_id: id, payment_term_id: term.id })));
            }
          }

          logAudit({
            userId: currentUserId,
            entityType: 'lab_test',
            entityId: id,
            entityName: newTest.testType,
            action: 'CREATE',
          });
          await fetchLabTests();
        }
      } catch (err) {
        console.error('Add Lab Test Exception:', err);
        throw err;
      }
    },
    [mapToDb, fetchLabTests, currentUserId]
  );

  const deleteLabTest = useCallback(
    async (id, userId = null) => {
      const toDelete = labTests.find((t) => t.id === id);
      setLabTests((prev) => prev.filter((t) => t.id !== id));
      try {
        const { error } = await apiClient.from('lab_tests').delete().eq('id', id);
        if (error) {
          console.warn('API Delete Failed (lab_tests):', error.message);
        } else {
          logAudit({
            userId: userId || currentUserId,
            entityType: 'lab_test',
            entityId: id,
            entityName: toDelete?.testType,
            action: 'DELETE',
          });
        }
      } catch (err) {
        console.warn('Delete Lab Test Exception:', err);
      }
    },
    [labTests, currentUserId]
  );

  const updateClientLabTestPrice = useCallback(
    async (clientId, testId, price) => {
      try {
        console.log(
          `Updating client lab test price: client=${clientId}, test=${testId}, price=${price}`
        );
        const { data, error } = await apiClient
          .from('client_lab_test_prices')
          .upsert({
            client_id: clientId,
            lab_test_id: testId,
            price: price,
            updated_at: new Date().toISOString(),
          })
          .select();

        if (error) {
          console.error('API Upsert Error (client_lab_test_prices):', error);
          throw error;
        }
        if (data) {
          setClientLabTestPrices((prev) => {
            const filtered = prev.filter(
              (p) => !(p.client_id === clientId && p.lab_test_id === testId)
            );
            return [...filtered, data[0]];
          });
          logAudit({
            userId: currentUserId,
            entityType: 'client_lab_test_pricing',
            entityId: `${clientId}_test_${testId}`,
            entityName: `Client ${clientId} / Lab Test ${testId}`,
            action: 'UPDATE',
            details: { price },
          });
        }
      } catch (err) {
        console.error('Exception in updateClientLabTestPrice:', err);
        throw err;
      }
    },
    [currentUserId]
  );

  const deleteClientLabTestPrice = useCallback(
    async (clientId, testId, userId = null) => {
      try {
        const { error } = await apiClient
          .from('client_lab_test_prices')
          .delete()
          .eq('client_id', clientId)
          .eq('lab_test_id', testId);

        if (error) throw error;
        setClientLabTestPrices((prev) =>
          prev.filter((p) => !(p.client_id === clientId && p.lab_test_id === testId))
        );
        logAudit({
          userId: userId || currentUserId,
          entityType: 'client_lab_test_pricing',
          entityId: `${clientId}_test_${testId}`,
          entityName: `Client ${clientId} / Lab Test ${testId}`,
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Error deleting client lab test price:', err);
        throw err;
      }
    },
    [currentUserId]
  );

  const contextValue = useMemo(
    () => ({
      labTests,
      clientLabTestPrices,
      loading,
      updateLabTest,
      addLabTest,
      deleteLabTest,
      updateClientLabTestPrice,
      deleteClientLabTestPrice,
      setLabTests,
      refreshLabTests: fetchLabTests,
      refreshClientLabTestPrices: fetchClientLabTestPrices,
      ensureFetched,
    }),
    [
      labTests,
      clientLabTestPrices,
      loading,
      updateLabTest,
      addLabTest,
      deleteLabTest,
      updateClientLabTestPrice,
      deleteClientLabTestPrice,
      fetchLabTests,
      fetchClientLabTestPrices,
      ensureFetched,
    ]
  );

  return <LabTestsContext.Provider value={contextValue}>{children}</LabTestsContext.Provider>;
};

export const useLabTests = () => {
  const context = React.useContext(LabTestsContext);
  if (!context) {
    throw new Error('useLabTests must be used within a LabTestsProvider');
  }
  React.useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { LabTestsContext, LabTestsProvider };
