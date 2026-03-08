
import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { useAuth } from '@/contexts/AuthContext';
import { DB_TYPES } from '@/config';

const UnitTypesContext = createContext();

const UnitTypesProvider = ({ children }) => {
    const { idToken, isAuthenticated, loading: authLoading } = useAuth();
    const [unitTypes, setUnitTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUnitTypes = useCallback(async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.SERVICE_UNIT_TYPE, idToken);
            if (data) {
                setUnitTypes(data);
            }
        } catch (error) {
            console.error("Error loading unit types from DynamoDB:", error);
        } finally {
            setLoading(false);
        }
    }, [idToken]);

    const addUnitType = useCallback(async (unitType) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const payload = { unit_type: unitType };
            const savedItem = await dynamoGenericApi.save(DB_TYPES.SERVICE_UNIT_TYPE, payload, idToken);
            setUnitTypes(prev => [...prev.filter(u => u.id !== savedItem.id), savedItem]);
        } catch (error) {
            console.error("Error adding unit type to DynamoDB:", error);
            throw error;
        }
    }, [idToken]);

    const updateUnitType = useCallback(async (id, unitType) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const payload = { id, unit_type: unitType };
            const savedItem = await dynamoGenericApi.save(DB_TYPES.SERVICE_UNIT_TYPE, payload, idToken);
            setUnitTypes(prev => prev.map(u => u.id === id ? savedItem : u));
        } catch (error) {
            console.error("Error updating unit type in DynamoDB:", error);
            throw error;
        }
    }, [idToken]);

    const deleteUnitType = useCallback(async (id) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            await dynamoGenericApi.delete(id, idToken);
            setUnitTypes(prev => prev.filter(u => u.id !== id));
        } catch (error) {
            console.error("Error deleting unit type from DynamoDB:", error);
            throw error;
        }
    }, [idToken]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchUnitTypes();
        } else if (!authLoading && !isAuthenticated) {
            setUnitTypes([]);
            setLoading(false);
        }
    }, [fetchUnitTypes, authLoading, isAuthenticated]);

    const contextValue = useMemo(() => ({
        unitTypes,
        loading,
        refreshUnitTypes: fetchUnitTypes,
        addUnitType,
        updateUnitType,
        deleteUnitType
    }), [unitTypes, loading, fetchUnitTypes, addUnitType, updateUnitType, deleteUnitType]);

    return (
        <UnitTypesContext.Provider value={contextValue}>
            {children}
        </UnitTypesContext.Provider>
    );
};

export const useUnitTypes = () => {
    const context = useContext(UnitTypesContext);
    if (!context) {
        throw new Error('useUnitTypes must be used within a UnitTypesProvider');
    }
    return context;
};

export { UnitTypesContext, UnitTypesProvider };
