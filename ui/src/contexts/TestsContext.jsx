import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { initialTests } from '@/data/tests';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const TestsContext = createContext();

const TestsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [tests, setTests] = useState([]);
  const [clientTestPrices, setClientTestPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapFromDb = useCallback((t) => {
    if (!t) return null;
    return {
      ...t,
      id: t.id,
      testType: t.test_type || t.testType || '',
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
      numDays: Number(t.num_days || t.numDays) || 0,
      price: Number(t.price) || 0,
      hsnCode: t.hsn_code || t.hsnCode || '',
      tcList: (() => {
        if (t.test_to_terms_conditions)
          return t.test_to_terms_conditions
            .map((x) => x.terms_and_conditions?.type)
            .filter(Boolean);
        if (Array.isArray(t.tc_list || t.tcList)) return t.tc_list || t.tcList;
        return t.tc_list || t.tcList || [];
      })(),
      techList: (() => {
        if (t.test_to_technicals)
          return t.test_to_technicals.map((x) => x.technicals?.type).filter(Boolean);
        if (Array.isArray(t.tech_list || t.techList)) return t.tech_list || t.techList;
        return t.tech_list || t.techList || [];
      })(),
      createdAt: t.created_at || new Date().toISOString(),
    };
  }, []);

  const mapToDb = useCallback((t) => {
    const payload = {
      test_type: t.testType,
      materials: Array.isArray(t.materials) ? t.materials : t.materials ? [t.materials] : [],
      group: t.group,
      test_method_specification: t.testMethodSpecification,
      num_days: t.numDays,
      price: t.price,
      hsn_code: t.hsnCode || t.hsn_code || '',
    };
    if (t.id && typeof t.id === 'number') {
      payload.id = t.id;
    }
    return payload;
  }, []);

  const fetchTests = useCallback(async () => {
    try {
      const data = await apiClient.get('/api/tests?order_by=created_at&order_dir=asc');

      if (!data) {
        throw new Error('No data returned');
      }

      const [techsRel, termsRel, techsDb, termsDb] = await Promise.all([
        apiClient.get('/api/test_to_technicals'),
        apiClient.get('/api/test_to_terms_conditions'),
        apiClient.get('/api/technicals'),
        apiClient.get('/api/terms_and_conditions'),
      ]);

      const techMap = techsDb.reduce((acc, t) => ({ ...acc, [t.id]: t.type }), {});
      const termMap = termsDb.reduce((acc, t) => ({ ...acc, [t.id]: t.type }), {});

      const enrichedData = data.map((t) => {
        const tTechs = techsRel
          .filter((r) => r.test_id === t.id)
          .map((r) => ({ technicals: { type: techMap[r.technical_id] } }));
        const tTerms = termsRel
          .filter((r) => r.test_id === t.id)
          .map((r) => ({ terms_and_conditions: { type: termMap[r.tc_id] } }));

        return {
          ...t,
          test_to_technicals: tTechs,
          test_to_terms_conditions: tTerms,
        };
      });

      const mappedData = enrichedData.map(mapFromDb);
      setTests(mappedData);
    } catch (error) {
      console.error('Error loading tests:', error);
      const stored = localStorage.getItem(STORAGE_KEYS.TESTS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTests(parsed);
          }
        } catch (e) {}
      }
      if (tests.length === 0) setTests(initialTests);
    } finally {
      setLoading(false);
    }
  }, [mapFromDb]);

  const fetchClientTestPrices = useCallback(async () => {
    try {
      const data = await apiClient.get('/api/client_test_prices');
      if (data) {
        setClientTestPrices(data);
      }
    } catch (error) {
      console.error('Error loading client test prices:', error);
    }
  }, []);

  useEffect(() => {
    fetchTests();
    fetchClientTestPrices();
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEYS.TESTS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setTests(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchTests, fetchClientTestPrices]);

  useEffect(() => {
    if (tests.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(tests));
    }
  }, [tests]);

  const updateTest = useCallback(
    async (updatedTest) => {
      const previousTests = [...tests];
      setTests((prev) => prev.map((t) => (t.id === updatedTest.id ? updatedTest : t)));

      try {
        const dbPayload = mapToDb(updatedTest);
        const { id, ...updates } = dbPayload;
        await apiClient.put(`/api/tests/${id}`, updates);

        // Sync T&C
        const allTermsRels = await apiClient.get('/api/test_to_terms_conditions');
        const toDeleteTerms = allTermsRels.filter((r) => r.test_id === id);
        for (const rel of toDeleteTerms) {
          await apiClient.delete(`/api/test_to_terms_conditions/${rel.id}`).catch(() => {});
        }

        if (updatedTest.tcList?.length > 0) {
          const terms = await apiClient.get('/api/terms_and_conditions', {
            params: { in_type: updatedTest.tcList },
          });
          if (terms?.length > 0) {
            for (const t of terms) {
              await apiClient
                .post('/api/test_to_terms_conditions', { test_id: id, tc_id: t.id })
                .catch(() => {});
            }
          }
        }

        // Sync Technicals
        const allTechRels = await apiClient.get('/api/test_to_technicals');
        const toDeleteTechs = allTechRels.filter((r) => r.test_id === id);
        for (const rel of toDeleteTechs) {
          await apiClient.delete(`/api/test_to_technicals/${rel.id}`).catch(() => {});
        }

        if (updatedTest.techList?.length > 0) {
          const techs = await apiClient.get('/api/technicals', {
            params: { in_type: updatedTest.techList },
          });
          if (techs?.length > 0) {
            for (const t of techs) {
              await apiClient
                .post('/api/test_to_technicals', { test_id: id, technical_id: t.id })
                .catch(() => {});
            }
          }
        }

        logAudit({
          userId: userId || currentUserId,
          entityType: 'test',
          entityId: updatedTest.id,
          entityName: updatedTest.testType,
          action: 'UPDATE',
        });
        await fetchTests();
      } catch (err) {
        console.error('Update Test Exception:', err);
        setTests(previousTests);
        throw err;
      }
    },
    [tests, mapToDb, fetchTests, currentUserId]
  );

  const addTest = useCallback(
    async (newTest) => {
      try {
        const createdItem = await apiClient.post('/api/tests', mapToDb(newTest));
        if (createdItem && createdItem.id) {
          const id = createdItem.id;

          // Sync T&C
          if (newTest.tcList?.length > 0) {
            const terms = await apiClient.get('/api/terms_and_conditions', {
              params: { in_type: newTest.tcList },
            });
            if (terms?.length > 0) {
              for (const t of terms) {
                await apiClient
                  .post('/api/test_to_terms_conditions', { test_id: id, tc_id: t.id })
                  .catch(() => {});
              }
            }
          }

          // Sync Technicals
          if (newTest.techList?.length > 0) {
            const techs = await apiClient.get('/api/technicals', {
              params: { in_type: newTest.techList },
            });
            if (techs?.length > 0) {
              for (const t of techs) {
                await apiClient
                  .post('/api/test_to_technicals', { test_id: id, technical_id: t.id })
                  .catch(() => {});
              }
            }
          }

          logAudit({
            userId: userId || currentUserId,
            entityType: 'test',
            entityId: id,
            entityName: newTest.testType,
            action: 'CREATE',
          });
          await fetchTests();
        }
      } catch (err) {
        console.error('Add Test Exception:', err);
        throw err;
      }
    },
    [mapToDb, fetchTests, currentUserId]
  );

  const deleteTest = useCallback(
    async (id, userId = null) => {
      const toDelete = tests.find((t) => t.id === id);
      setTests((prev) => prev.filter((t) => t.id !== id));
      try {
        await apiClient.delete(`/api/tests/${id}`);
        logAudit({
          userId: userId || currentUserId,
          entityType: 'test',
          entityId: id,
          entityName: toDelete?.testType,
          action: 'DELETE',
        });
      } catch (err) {
        console.warn('Delete Test Exception:', err);
      }
    },
    [tests, currentUserId]
  );

  const updateClientTestPrice = useCallback(
    async (clientId, testId, price) => {
      try {
        console.log(
          `Updating client test price: client=${clientId}, test=${testId}, price=${price}`
        );
        // Simulating upsert
        const existing = await apiClient.get('/api/client_test_prices', {
          params: { eq_client_id: clientId, eq_test_id: testId },
        });

        let savedPrice;
        if (existing && existing.length > 0) {
          savedPrice = await apiClient.put(`/api/client_test_prices/${existing[0].id}`, {
            client_id: clientId,
            test_id: testId,
            price: price,
            updated_at: new Date().toISOString(),
          });
        } else {
          savedPrice = await apiClient.post('/api/client_test_prices', {
            client_id: clientId,
            test_id: testId,
            price: price,
            updated_at: new Date().toISOString(),
          });
        }

        if (savedPrice) {
          setClientTestPrices((prev) => {
            const filtered = prev.filter(
              (p) => !(p.client_id === clientId && p.test_id === testId)
            );
            return [...filtered, savedPrice];
          });
          logAudit({
            userId: userId || currentUserId,
            entityType: 'client_test_pricing',
            entityId: `${clientId}_test_${testId}`,
            entityName: `Client ${clientId} / Test ${testId}`,
            action: 'UPDATE',
            details: { price },
          });
        }
      } catch (err) {
        console.error('Exception in updateClientTestPrice:', err);
        throw err;
      }
    },
    [currentUserId]
  );

  const deleteClientTestPrice = useCallback(
    async (clientId, testId, userId = null) => {
      try {
        const existing = await apiClient.get('/api/client_test_prices', {
          params: { eq_client_id: clientId, eq_test_id: testId },
        });
        if (existing && existing.length > 0) {
          await apiClient.delete(`/api/client_test_prices/${existing[0].id}`);
        }

        setClientTestPrices((prev) =>
          prev.filter((p) => !(p.client_id === clientId && p.test_id === testId))
        );
        logAudit({
          userId: userId || currentUserId,
          entityType: 'client_test_pricing',
          entityId: `${clientId}_test_${testId}`,
          entityName: `Client ${clientId} / Test ${testId}`,
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Error deleting client test price:', err);
        throw err;
      }
    },
    [currentUserId]
  );

  const contextValue = useMemo(
    () => ({
      tests,
      clientTestPrices,
      loading,
      updateTest,
      addTest,
      deleteTest,
      updateClientTestPrice,
      deleteClientTestPrice,
      setTests,
      refreshTests: fetchTests,
      refreshClientTestPrices: fetchClientTestPrices,
    }),
    [
      tests,
      clientTestPrices,
      loading,
      updateTest,
      addTest,
      deleteTest,
      updateClientTestPrice,
      deleteClientTestPrice,
      fetchTests,
      fetchClientTestPrices,
    ]
  );

  return <TestsContext.Provider value={contextValue}>{children}</TestsContext.Provider>;
};

export const useTests = () => {
  const context = React.useContext(TestsContext);
  if (!context) {
    throw new Error('useTests must be used within a TestsProvider');
  }
  return context;
};

export { TestsContext, TestsProvider };
