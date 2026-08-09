import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { initialFieldTests } from '@/data/fieldTests';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const FieldTestsContext = createContext();

const FieldTestsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [fieldTests, setFieldTests] = useState([]);
  const [clientFieldTestPrices, setClientFieldTestPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapFromDb = useCallback((ft) => {
    if (!ft) return null;
    return {
      ...ft,
      id: ft.id,
      fieldTestType: ft.name || ft.field_test_type || ft.fieldTestType || '',
      price: Number(ft.price) || 0,
      unit: ft.unit || '',
      qty: Number(ft.qty) || 1,
      methodOfSampling: ft.method_of_sampling || ft.methodOfSampling || 'NA',
      numBHs: Number(ft.num_bhs ?? ft.numBHs ?? 0) || 0,
      measure: ft.measure || ft.measureType || 'NA',
      numDays: Number(ft.num_days ?? ft.numDays ?? 1) || 1,
      hsnCode: ft.hsn_code || ft.hsnCode || '',
      tcList: (() => {
        if (ft.field_test_to_terms_conditions)
          return ft.field_test_to_terms_conditions
            .map((x) => x.terms_and_conditions?.type)
            .filter(Boolean);
        if (Array.isArray(ft.tc_list || ft.tcList)) return ft.tc_list || ft.tcList;
        return ft.tc_list || ft.tcList || [];
      })(),
      techList: (() => {
        if (ft.field_test_to_technicals)
          return ft.field_test_to_technicals.map((x) => x.technicals?.type).filter(Boolean);
        if (Array.isArray(ft.tech_list || ft.techList)) return ft.tech_list || ft.techList;
        return ft.tech_list || ft.techList || [];
      })(),
      paymentTermsList: (() => {
        if (ft.field_test_to_payment_terms)
          return ft.field_test_to_payment_terms.map((x) => x.payment_terms?.type).filter(Boolean);
        if (Array.isArray(ft.paymentTermsList)) return ft.paymentTermsList;
        return [];
      })(),
      createdAt: ft.created_at || new Date().toISOString(),
    };
  }, []);

  const mapToDb = useCallback((ft) => {
    const payload = {
      name: ft.fieldTestType,
      price: ft.price,
      unit: ft.unit,
      qty: ft.qty,
      method_of_sampling: ft.methodOfSampling || ft.method_of_sampling || 'NA',
      num_bhs: typeof ft.numBHs === 'number' ? ft.numBHs : Number(ft.num_bhs ?? 0),
      measure: ft.measure || 'NA',
      num_days: typeof ft.numDays === 'number' ? ft.numDays : Number(ft.num_days ?? 1),
      hsn_code: ft.hsnCode || ft.hsn_code || '',
    };
    if (ft.id && typeof ft.id === 'number') {
      payload.id = ft.id;
    }
    return payload;
  }, []);

  const fetchFieldTests = useCallback(async () => {
    try {
      const { data, error } = await apiClient
        .from('field_tests')
        .select(
          `
                    *,
                    field_test_to_technicals ( technicals ( type ) ),
                    field_test_to_terms_conditions ( terms_and_conditions ( type ) ),
                    field_test_to_payment_terms ( payment_terms ( type ) )
                `
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('API fetch error (field_tests):', error.message);
        const stored = localStorage.getItem(STORAGE_KEYS.FIELD_TESTS);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFieldTests(parsed);
              return;
            }
          } catch (e) {}
        }
        if (fieldTests.length === 0) setFieldTests(initialFieldTests);
        return;
      }

      if (data && data.length > 0) {
        const mappedData = data.map(mapFromDb);
        setFieldTests(mappedData);
      } else {
        const stored = localStorage.getItem(STORAGE_KEYS.FIELD_TESTS);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFieldTests(parsed);
              return;
            }
          } catch (e) {}
        }
        setFieldTests(initialFieldTests);
      }
    } catch (error) {
      console.error('Error loading field tests:', error);
      if (fieldTests.length === 0) setFieldTests(initialFieldTests);
    } finally {
      setLoading(false);
    }
  }, [mapFromDb, fieldTests.length]);

  const fetchClientFieldTestPrices = useCallback(async () => {
    try {
      const { data, error } = await apiClient.from('client_field_test_prices').select('*');

      if (error) {
        console.warn('API fetch error (client_field_test_prices):', error.message);
        return;
      }

      if (data) {
        setClientFieldTestPrices(data);
      }
    } catch (error) {
      console.error('Error loading client field test prices:', error);
    }
  }, []);

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchFieldTests();
      fetchClientFieldTestPrices();
    }
  }, [fetchFieldTests, fetchClientFieldTestPrices]);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEYS.FIELD_TESTS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setFieldTests(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (fieldTests.length > 0) {
      localStorage.setItem(STORAGE_KEYS.FIELD_TESTS, JSON.stringify(fieldTests));
    }
  }, [fieldTests]);

  const updateFieldTest = useCallback(
    async (updatedFieldTest, userId = null) => {
      const previousFieldTests = [...fieldTests];
      setFieldTests((prev) =>
        prev.map((s) => (s.id === updatedFieldTest.id ? updatedFieldTest : s))
      );

      try {
        const dbPayload = mapToDb(updatedFieldTest);
        const { id, ...updates } = dbPayload;
        updates.updated_at = new Date().toISOString();

        const { error } = await apiClient.from('field_tests').update(updates).eq('id', id);

        if (error) {
          console.error('API Update Failed (field_tests):', error);
          setFieldTests(previousFieldTests);
          throw new Error(`Failed to update field test: ${error.message}`);
        }

        // Sync T&C
        await apiClient.from('field_test_to_terms_conditions').delete().eq('field_test_id', id);
        if (updatedFieldTest.tcList?.length > 0) {
          const { data: terms } = await apiClient
            .from('terms_and_conditions')
            .select('id')
            .in('type', updatedFieldTest.tcList);
          if (terms?.length > 0) {
            await apiClient
              .from('field_test_to_terms_conditions')
              .insert(terms.map((t) => ({ field_test_id: id, tc_id: t.id })));
          }
        }

        // Sync Technicals
        await apiClient.from('field_test_to_technicals').delete().eq('field_test_id', id);
        if (updatedFieldTest.techList?.length > 0) {
          const { data: techs } = await apiClient
            .from('technicals')
            .select('id')
            .in('type', updatedFieldTest.techList);
          if (techs?.length > 0) {
            await apiClient
              .from('field_test_to_technicals')
              .insert(techs.map((t) => ({ field_test_id: id, technical_id: t.id })));
          }
        }

        // Sync Payment Terms
        await apiClient.from('field_test_to_payment_terms').delete().eq('field_test_id', id);
        if (updatedFieldTest.paymentTermsList?.length > 0) {
          const { data: payTerms } = await apiClient
            .from('payment_terms')
            .select('id')
            .in('type', updatedFieldTest.paymentTermsList);
          if (payTerms?.length > 0) {
            await apiClient
              .from('field_test_to_payment_terms')
              .insert(payTerms.map((t) => ({ field_test_id: id, payment_term_id: t.id })));
          }
        }

        logAudit({
          userId: userId || currentUserId,
          entityType: 'field_test',
          entityId: updatedFieldTest.id,
          entityName: updatedFieldTest.fieldTestType,
          action: 'UPDATE',
        });
        await fetchFieldTests();
      } catch (err) {
        console.error('Update Field Test Exception:', err);
        setFieldTests(previousFieldTests);
        throw err;
      }
    },
    [fieldTests, mapToDb, fetchFieldTests, currentUserId]
  );

  const addFieldTest = useCallback(
    async (newFieldTest, userId = null) => {
      const previousFieldTests = [...fieldTests];

      try {
        const dbPayload = mapToDb(newFieldTest);
        dbPayload.created_at = new Date().toISOString();
        dbPayload.updated_at = new Date().toISOString();

        const { error, data } = await apiClient.from('field_tests').insert(dbPayload).select();

        if (error) {
          console.error('API Add Failed (field_tests):', error);
          setFieldTests(previousFieldTests);
          throw new Error(`Failed to add field test: ${error.message}`);
        }

        if (data && data.length > 0) {
          const id = data[0].id;

          // Sync T&C
          if (newFieldTest.tcList?.length > 0) {
            const { data: terms } = await apiClient
              .from('terms_and_conditions')
              .select('id')
              .in('type', newFieldTest.tcList);
            if (terms?.length > 0) {
              await apiClient
                .from('field_test_to_terms_conditions')
                .insert(terms.map((t) => ({ field_test_id: id, tc_id: t.id })));
            }
          }

          // Sync Technicals
          if (newFieldTest.techList?.length > 0) {
            const { data: techs } = await apiClient
              .from('technicals')
              .select('id')
              .in('type', newFieldTest.techList);
            if (techs?.length > 0) {
              await apiClient
                .from('field_test_to_technicals')
                .insert(techs.map((t) => ({ field_test_id: id, technical_id: t.id })));
            }
          }

          // Sync Payment Terms
          if (newFieldTest.paymentTermsList?.length > 0) {
            const { data: payTerms } = await apiClient
              .from('payment_terms')
              .select('id')
              .in('type', newFieldTest.paymentTermsList);
            if (payTerms?.length > 0) {
              await apiClient
                .from('field_test_to_payment_terms')
                .insert(payTerms.map((t) => ({ field_test_id: id, payment_term_id: t.id })));
            }
          }

          logAudit({
            userId: userId || currentUserId,
            entityType: 'field_test',
            entityId: id,
            entityName: newFieldTest.fieldTestType,
            action: 'CREATE',
          });
          await fetchFieldTests();
        }
      } catch (err) {
        console.error('Add Field Test Exception:', err);
        setFieldTests(previousFieldTests);
        throw err;
      }
    },
    [fieldTests, mapToDb, fetchFieldTests, currentUserId]
  );

  const deleteFieldTest = useCallback(
    async (id, userId = null) => {
      const toDelete = fieldTests.find((s) => s.id === id);
      const previousFieldTests = [...fieldTests];
      setFieldTests((prev) => prev.filter((s) => s.id !== id));

      try {
        const { error } = await apiClient.from('field_tests').delete().eq('id', id);

        if (error) {
          console.error('API Delete Failed (field_tests):', error);
          setFieldTests(previousFieldTests);
          throw new Error(`Failed to delete field test: ${error.message}`);
        }

        logAudit({
          userId: userId || currentUserId,
          entityType: 'field_test',
          entityId: id,
          entityName: toDelete?.fieldTestType,
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Delete Field Test Exception:', err);
        setFieldTests(previousFieldTests);
        throw err;
      }
    },
    [fieldTests, currentUserId]
  );

  const updateClientFieldTestPrice = useCallback(
    async (clientId, fieldTestId, price, userId = null) => {
      try {
        console.log(
          `Updating client field test price: client=${clientId}, fieldTest=${fieldTestId}, price=${price}`
        );
        const { data, error } = await apiClient
          .from('client_field_test_prices')
          .upsert({
            client_id: clientId,
            field_test_id: fieldTestId,
            price: price,
            updated_at: new Date().toISOString(),
          })
          .select();

        if (error) {
          console.error('API Upsert Error (client_field_test_prices):', error);
          throw error;
        }
        if (data) {
          setClientFieldTestPrices((prev) => {
            const filtered = prev.filter(
              (p) => !(p.client_id === clientId && p.field_test_id === fieldTestId)
            );
            return [...filtered, data[0]];
          });
          logAudit({
            userId: userId || currentUserId,
            entityType: 'client_field_test_pricing',
            entityId: `${clientId}_field_test_${fieldTestId}`,
            entityName: `Client ${clientId} / Field Test ${fieldTestId}`,
            action: 'UPDATE',
            details: { price },
          });
        }
      } catch (err) {
        console.error('Exception in updateClientFieldTestPrice:', err);
        throw err;
      }
    },
    [currentUserId]
  );

  const deleteClientFieldTestPrice = useCallback(
    async (clientId, fieldTestId, userId = null) => {
      try {
        const { error } = await apiClient
          .from('client_field_test_prices')
          .delete()
          .eq('client_id', clientId)
          .eq('field_test_id', fieldTestId);

        if (error) throw error;
        setClientFieldTestPrices((prev) =>
          prev.filter((p) => !(p.client_id === clientId && p.field_test_id === fieldTestId))
        );
        logAudit({
          userId: userId || currentUserId,
          entityType: 'client_field_test_pricing',
          entityId: `${clientId}_field_test_${fieldTestId}`,
          entityName: `Client ${clientId} / Field Test ${fieldTestId}`,
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Error deleting client field test price:', err);
        throw err;
      }
    },
    [currentUserId]
  );

  const contextValue = useMemo(
    () => ({
      fieldTests,
      clientFieldTestPrices,
      loading,
      updateFieldTest,
      addFieldTest,
      deleteFieldTest,
      updateClientFieldTestPrice,
      deleteClientFieldTestPrice,
      setFieldTests,
      refreshFieldTests: fetchFieldTests,
      refreshClientFieldTestPrices: fetchClientFieldTestPrices,
      ensureFetched,
    }),
    [
      fieldTests,
      clientFieldTestPrices,
      loading,
      updateFieldTest,
      addFieldTest,
      deleteFieldTest,
      updateClientFieldTestPrice,
      deleteClientFieldTestPrice,
      fetchFieldTests,
      fetchClientFieldTestPrices,
      ensureFetched,
    ]
  );

  return <FieldTestsContext.Provider value={contextValue}>{children}</FieldTestsContext.Provider>;
};

export const useFieldTests = () => {
  const context = React.useContext(FieldTestsContext);
  if (!context) {
    throw new Error('useFieldTests must be used within a FieldTestsProvider');
  }
  React.useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { FieldTestsContext, FieldTestsProvider };
