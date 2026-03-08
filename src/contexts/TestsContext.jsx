
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { useAuth } from '@/contexts/AuthContext';
import { DB_TYPES } from '@/config';

const TestsContext = createContext();

const TestsProvider = ({ children }) => {
    const { idToken, isAuthenticated, loading: authLoading } = useAuth();
    const [tests, setTests] = useState([]);
    const [clientTestPrices, setClientTestPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    const mapFromDb = useCallback((t) => {
        if (!t) return null;
        return {
            ...t,
            id: t.id,
            testType: t.test_type || t.testType || '',
            materials: t.materials || '',
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
        materials: t.materials,
        group: t.group,
        test_method_specification: t.testMethodSpecification,
        num_days: t.numDays,
        price: t.price,
        hsn_code: t.hsnCode || t.hsn_code || '',
        tc_list: t.tcList || t.tc_list || [],
        tech_list: t.techList || t.tech_list || []
    }), []);

    const fetchTests = useCallback(async () => {
        if (!idToken) return;
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.TEST, idToken);

            if (data && data.length > 0) {
                const mappedData = data.map(mapFromDb);
                setTests(mappedData);
            } else {
                setTests([]);
            }
        } catch (error) {
            console.error("Error loading tests from DynamoDB:", error);
            if (tests.length === 0) setTests([]);
        } finally {
            setLoading(false);
        }
    }, [mapFromDb, idToken]);

    const fetchClientTestPrices = useCallback(async () => {
        if (!idToken) return;
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.CLIENT_TEST_PRICE, idToken);
            if (data) {
                setClientTestPrices(data);
            }
        } catch (error) {
            console.error("Error loading client test prices from DynamoDB:", error);
        }
    }, [idToken]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchTests();
            fetchClientTestPrices();
        } else if (!authLoading && !isAuthenticated) {
            setTests([]);
            setClientTestPrices([]);
            setLoading(false);
        }
    }, [fetchTests, fetchClientTestPrices, authLoading, isAuthenticated]);


    const updateTest = useCallback(async (updatedTest) => {
        if (!idToken) throw new Error("User not authenticated");
        setTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
        try {
            const dbPayload = mapToDb(updatedTest);
            await dynamoGenericApi.save(DB_TYPES.TEST, dbPayload, idToken);
        } catch (err) {
            console.warn("Update Test Exception:", err);
            throw err;
        }
    }, [mapToDb, idToken]);

    const addTest = useCallback(async (newTest) => {
        if (!idToken) throw new Error("User not authenticated");
        const tempId = newTest.id || `tst_${Date.now()}`;
        const testWithId = { ...newTest, id: tempId, created_at: new Date().toISOString() };
        setTests(prev => [...prev, testWithId]);
        try {
            const dbPayload = mapToDb(testWithId);
            await dynamoGenericApi.save(DB_TYPES.TEST, dbPayload, idToken);
        } catch (err) {
            console.warn("Add Test Exception:", err);
            throw err;
        }
    }, [mapToDb, idToken]);

    const deleteTest = useCallback(async (id) => {
        if (!idToken) throw new Error("User not authenticated");
        setTests(prev => prev.filter(t => t.id !== id));
        try {
            await dynamoGenericApi.delete(id, idToken);
        } catch (err) {
            console.warn("Delete Test Exception:", err);
        }
    }, [idToken]);

    const updateClientTestPrice = useCallback(async (clientId, testId, price) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const priceId = `ctp_${clientId}_${testId}`;
            const payload = {
                id: priceId,
                client_id: clientId,
                test_id: testId,
                price: price
            };
            const savedItem = await dynamoGenericApi.save(DB_TYPES.CLIENT_TEST_PRICE, payload, idToken);
            setClientTestPrices(prev => {
                const filtered = prev.filter(p => p.id !== priceId);
                return [...filtered, savedItem];
            });
        } catch (err) {
            console.error("Exception in updateClientTestPrice:", err);
            throw err;
        }
    }, [idToken]);

    const deleteClientTestPrice = useCallback(async (clientId, testId) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const priceId = `ctp_${clientId}_${testId}`;
            await dynamoGenericApi.delete(priceId, idToken);
            setClientTestPrices(prev => prev.filter(p => p.id !== priceId));
        } catch (err) {
            console.error("Error deleting client test price:", err);
            throw err;
        }
    }, [idToken]);

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
