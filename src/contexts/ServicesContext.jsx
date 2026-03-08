
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { useAuth } from '@/contexts/AuthContext';
import { DB_TYPES } from '@/config';

const ServicesContext = createContext();

const ServicesProvider = ({ children }) => {
    const { idToken, isAuthenticated, loading: authLoading } = useAuth();
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
            tcList: s.tc_list || s.tcList || [],
            techList: s.tech_list || s.techList || [],
            createdAt: s.created_at || new Date().toISOString()
        };
    }, []);

    const mapToDb = useCallback((s) => ({
        id: s.id,
        service_type: s.serviceType,
        price: s.price,
        unit: s.unit,
        qty: s.qty,
        method_of_sampling: s.methodOfSampling || s.method_of_sampling || 'NA',
        num_bhs: typeof s.numBHs === 'number' ? s.numBHs : Number(s.num_bhs ?? 0),
        measure: s.measure || 'NA',
        hsn_code: s.hsnCode || s.hsn_code || '',
        tc_list: s.tcList || s.tc_list || [],
        tech_list: s.techList || s.tech_list || []
    }), []);

    const fetchServices = useCallback(async () => {
        if (!idToken) return;
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.SERVICE, idToken);

            if (data && data.length > 0) {
                const mappedData = data.map(mapFromDb);
                setServices(mappedData);
            } else {
                setServices([]);
            }
        } catch (error) {
            console.error("Error loading services from DynamoDB:", error);
            if (services.length === 0) setServices([]);
        } finally {
            setLoading(false);
        }
    }, [mapFromDb, idToken]);

    const fetchClientServicePrices = useCallback(async () => {
        if (!idToken) return;
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.CLIENT_SERVICE_PRICE, idToken);
            if (data) {
                setClientServicePrices(data);
            }
        } catch (error) {
            console.error("Error loading client service prices from DynamoDB:", error);
        }
    }, [idToken]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchServices();
            fetchClientServicePrices();
        } else if (!authLoading && !isAuthenticated) {
            setServices([]);
            setClientServicePrices([]);
            setLoading(false);
        }
    }, [fetchServices, fetchClientServicePrices, authLoading, isAuthenticated]);


    const updateService = useCallback(async (updatedService) => {
        if (!idToken) throw new Error("User not authenticated");
        const previousServices = [...services];
        setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));

        try {
            const dbPayload = mapToDb(updatedService);
            const savedItem = await dynamoGenericApi.save(DB_TYPES.SERVICE, dbPayload, idToken);
            const updated = mapFromDb(savedItem);
            setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
        } catch (err) {
            console.error("Update Service Exception:", err);
            setServices(previousServices);
            throw err;
        }
    }, [services, idToken, mapToDb, mapFromDb]);

    const addService = useCallback(async (newService) => {
        if (!idToken) throw new Error("User not authenticated");
        const tempId = newService.id || `srv_${Date.now()}`;
        const serviceWithId = { ...newService, id: tempId, created_at: new Date().toISOString() };
        const previousServices = [...services];
        setServices(prev => [...prev, serviceWithId]);

        try {
            const dbPayload = mapToDb(serviceWithId);
            const savedItem = await dynamoGenericApi.save(DB_TYPES.SERVICE, dbPayload, idToken);
            const added = mapFromDb(savedItem);
            setServices(prev => prev.map(s => s.id === tempId ? added : s));
        } catch (err) {
            console.error("Add Service Exception:", err);
            setServices(previousServices);
            throw err;
        }
    }, [services, idToken, mapToDb, mapFromDb]);

    const deleteService = useCallback(async (id) => {
        if (!idToken) throw new Error("User not authenticated");
        const previousServices = [...services];
        setServices(prev => prev.filter(s => s.id !== id));

        try {
            await dynamoGenericApi.delete(id, idToken);
        } catch (err) {
            console.error("Delete Service Exception:", err);
            setServices(previousServices);
            throw err;
        }
    }, [services, idToken]);

    const updateClientServicePrice = useCallback(async (clientId, serviceId, price) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const priceId = `csp_${clientId}_${serviceId}`;
            const payload = {
                id: priceId,
                client_id: clientId,
                service_id: serviceId,
                price: price
            };
            const savedItem = await dynamoGenericApi.save(DB_TYPES.CLIENT_SERVICE_PRICE, payload, idToken);
            setClientServicePrices(prev => {
                const filtered = prev.filter(p => p.id !== priceId);
                return [...filtered, savedItem];
            });
        } catch (err) {
            console.error("Exception in updateClientServicePrice:", err);
            throw err;
        }
    }, [idToken]);

    const deleteClientServicePrice = useCallback(async (clientId, serviceId) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const priceId = `csp_${clientId}_${serviceId}`;
            await dynamoGenericApi.delete(priceId, idToken);
            setClientServicePrices(prev => prev.filter(p => p.id !== priceId));
        } catch (err) {
            console.error("Error deleting client service price:", err);
            throw err;
        }
    }, [idToken]);

    const contextValue = useMemo(() => ({
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
        refreshClientServicePrices: fetchClientServicePrices
    }), [services, clientServicePrices, loading, updateService, addService, deleteService, updateClientServicePrice, deleteClientServicePrice, fetchServices, fetchClientServicePrices]);

    return (
        <ServicesContext.Provider value={contextValue}>
            {children}
        </ServicesContext.Provider>
    );
};

export const useServices = () => {
    const context = React.useContext(ServicesContext);
    if (!context) {
        throw new Error('useServices must be used within a ServicesProvider');
    }
    return context;
};

export { ServicesContext, ServicesProvider };
