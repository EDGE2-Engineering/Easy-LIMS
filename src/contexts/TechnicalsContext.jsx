
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { DB_TYPES } from '@/config';

const TechnicalsContext = createContext();

const TechnicalsProvider = ({ children }) => {
    const { idToken, isAuthenticated, loading: authLoading } = useAuth();
    const [technicals, setTechnicals] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchTechnicals = useCallback(async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.TECHNICAL, idToken);
            setTechnicals(data || []);
        } catch (error) {
            console.error('Error fetching technicals from DynamoDB:', error);
        } finally {
            setLoading(false);
        }
    }, [idToken]);

    const addTechnical = useCallback(async (text, tech_type) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const payload = { text, tech_type };
            const savedItem = await dynamoGenericApi.save(DB_TYPES.TECHNICAL, payload, idToken);
            setTechnicals(prev => [...prev.filter(t => t.id !== savedItem.id), savedItem]);
            return [savedItem];
        } catch (error) {
            console.error('Error adding technical to DynamoDB:', error);
            throw error;
        }
    }, [idToken]);

    const updateTechnical = useCallback(async (id, text, tech_type) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const payload = { id, text, tech_type };
            const savedItem = await dynamoGenericApi.save(DB_TYPES.TECHNICAL, payload, idToken);
            setTechnicals(prev => prev.map(tech => tech.id === id ? savedItem : tech));
            return [savedItem];
        } catch (error) {
            console.error('Error updating technical in DynamoDB:', error);
            throw error;
        }
    }, [idToken]);

    const deleteTechnical = useCallback(async (id) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            await dynamoGenericApi.delete(id, idToken);
            setTechnicals(prev => prev.filter(tech => tech.id !== id));
        } catch (error) {
            console.error('Error deleting technical from DynamoDB:', error);
            throw error;
        }
    }, [idToken]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchTechnicals();
        } else if (!authLoading && !isAuthenticated) {
            setTechnicals([]);
            setLoading(false);
        }
    }, [fetchTechnicals, authLoading, isAuthenticated]);

    const contextValue = useMemo(() => ({
        technicals,
        loading,
        addTechnical,
        updateTechnical,
        deleteTechnical,
        fetchTechnicals
    }), [technicals, loading, addTechnical, updateTechnical, deleteTechnical, fetchTechnicals]);

    return (
        <TechnicalsContext.Provider value={contextValue}>
            {children}
        </TechnicalsContext.Provider>
    );
};
export const useTechnicals = () => {
    const context = useContext(TechnicalsContext);
    if (!context) {
        throw new Error('useTechnicals must be used within a TechnicalsProvider');
    }
    return context;
};

export { TechnicalsContext, TechnicalsProvider };
