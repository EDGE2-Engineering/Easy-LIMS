
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { initialTests } from '@/data/tests';
import { STORAGE_KEYS } from '@/data/storageKeys';

const TestsContext = createContext();

const TestsProvider = ({ children }) => {
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
                if (typeof t.materials === 'string' && t.materials.trim().startsWith('[') && t.materials.trim().endsWith(']')) {
                    try { return JSON.parse(t.materials); } catch (e) { return [t.materials]; }
                }
                return t.materials ? t.materials.split(',').map(m => m.trim()) : [];
            })(),
            group: t.group || '',

            testMethodSpecification: t.test_method_specification || t.testMethodSpecification || '',
            numDays: Number(t.num_days || t.numDays) || 0,
            price: Number(t.price) || 0,
            hsnCode: t.hsn_code || t.hsnCode || '',
            tcList: t.tc_list || t.tcList || [],
            techList: t.tech_list || t.techList || [],
            createdAt: t.created_at || new Date().toISOString()
        };
    }, []);

    const mapToDb = useCallback((t) => ({
        id: t.id,
        test_type: t.testType,
        materials: Array.isArray(t.materials) ? t.materials : (t.materials ? [t.materials] : []),
        group: t.group,

        test_method_specification: t.testMethodSpecification,
        num_days: t.numDays,
        price: t.price,
        hsn_code: t.hsnCode || t.hsn_code || '',
        tc_list: t.tcList || t.tc_list || [],
        tech_list: t.techList || t.tech_list || []
    }), []);

    const fetchTests = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('tests')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.warn("Supabase fetch error (tests):", error.message);
                const stored = localStorage.getItem(STORAGE_KEYS.TESTS);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setTests(parsed);
                            return;
                        }
                    } catch (e) { }
                }
                if (tests.length === 0) setTests(initialTests);
                return;
            }

            if (data && data.length > 0) {
                const mappedData = data.map(mapFromDb);
                setTests(mappedData);
            } else {
                const stored = localStorage.getItem(STORAGE_KEYS.TESTS);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setTests(parsed);
                            return;
                        }
                    } catch (e) { }
                }
                setTests(initialTests);
            }
        } catch (error) {
            console.error("Error loading tests:", error);
            if (tests.length === 0) setTests(initialTests);
        } finally {
            setLoading(false);
        }
    }, [mapFromDb]);

    const fetchClientTestPrices = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('client_test_prices')
                .select('*');

            if (error) {
                console.warn("Supabase fetch error (client_test_prices):", error.message);
                return;
            }

            if (data) {
                setClientTestPrices(data);
            }
        } catch (error) {
            console.error("Error loading client test prices:", error);
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
                } catch (e) { }
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

    const updateTest = useCallback(async (updatedTest) => {

        setTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
        try {
            const dbPayload = mapToDb(updatedTest);
            const { id, ...updates } = dbPayload;
            const { error } = await supabase.from('tests').update(updates).eq('id', id);
            if (error) console.warn("Supabase Update Failed (tests):", error.message);
        } catch (err) {
            console.warn("Update Test Exception:", err);
            throw err;
        }
    }, [mapToDb]);

    const addTest = useCallback(async (newTest) => {

        const tempId = newTest.id || `tst_${Date.now()}`;
        const testWithId = { ...newTest, id: tempId, created_at: new Date().toISOString() };
        setTests(prev => [...prev, testWithId]);
        try {
            const { error } = await supabase.from('tests').insert(mapToDb(testWithId));
            if (error) console.warn("Supabase Add Failed (tests):", error.message);
        } catch (err) {
            console.warn("Add Test Exception:", err);
            throw err;
        }
    }, [mapToDb]);

    const deleteTest = useCallback(async (id) => {
        setTests(prev => prev.filter(t => t.id !== id));
        try {
            const { error } = await supabase.from('tests').delete().eq('id', id);
            if (error) console.warn("Supabase Delete Failed (tests):", error.message);
        } catch (err) {
            console.warn("Delete Test Exception:", err);
        }
    }, []);

    const updateClientTestPrice = useCallback(async (clientId, testId, price) => {
        try {
            console.log(`Updating client test price: client=${clientId}, test=${testId}, price=${price}`);
            const { data, error } = await supabase
                .from('client_test_prices')
                .upsert({
                    client_id: clientId,
                    test_id: testId,
                    price: price,
                    updated_at: new Date().toISOString()
                })
                .select();

            if (error) {
                console.error("Supabase Upsert Error (client_test_prices):", error);
                throw error;
            }
            if (data) {
                setClientTestPrices(prev => {
                    const filtered = prev.filter(p => !(p.client_id === clientId && p.test_id === testId));
                    return [...filtered, data[0]];
                });
            }
        } catch (err) {
            console.error("Exception in updateClientTestPrice:", err);
            throw err;
        }
    }, []);

    const deleteClientTestPrice = useCallback(async (clientId, testId) => {
        try {
            const { error } = await supabase
                .from('client_test_prices')
                .delete()
                .eq('client_id', clientId)
                .eq('test_id', testId);

            if (error) throw error;
            setClientTestPrices(prev => prev.filter(p => !(p.client_id === clientId && p.test_id === testId)));
        } catch (err) {
            console.error("Error deleting client test price:", err);
            throw err;
        }
    }, []);

    const contextValue = useMemo(() => ({
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
        refreshClientTestPrices: fetchClientTestPrices
    }), [tests, clientTestPrices, loading, updateTest, addTest, deleteTest, updateClientTestPrice, deleteClientTestPrice, fetchTests, fetchClientTestPrices]);

    return (
        <TestsContext.Provider value={contextValue}>
            {children}
        </TestsContext.Provider>
    );
};

export const useTests = () => {
    const context = React.useContext(TestsContext);
    if (!context) {
        throw new Error('useTests must be used within a TestsProvider');
    }
    return context;
};

export { TestsContext, TestsProvider };
