
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { DB_TYPES } from '@/config';

const TermsAndConditionsContext = createContext();

const TermsAndConditionsProvider = ({ children }) => {
    const { idToken, isAuthenticated, loading: authLoading } = useAuth();
    const [terms, setTerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchTerms = useCallback(async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.TERM_AND_CONDITION, idToken);
            setTerms(data || []);
        } catch (error) {
            console.error('Error fetching terms from DynamoDB:', error);
        } finally {
            setLoading(false);
        }
    }, [idToken]);

    const addTerm = useCallback(async (text, term_type = 'general') => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const payload = { text, term_type };
            const savedItem = await dynamoGenericApi.save(DB_TYPES.TERM_AND_CONDITION, payload, idToken);
            setTerms(prev => [...prev.filter(t => t.id !== savedItem.id), savedItem]);
            return [savedItem];
        } catch (error) {
            console.error('Error adding term to DynamoDB:', error);
            throw error;
        }
    }, [idToken]);

    const updateTerm = useCallback(async (id, text, term_type) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            const payload = { id, text, term_type };
            const savedItem = await dynamoGenericApi.save(DB_TYPES.TERM_AND_CONDITION, payload, idToken);
            setTerms(prev => prev.map(term => term.id === id ? savedItem : term));
            return [savedItem];
        } catch (error) {
            console.error('Error updating term in DynamoDB:', error);
            throw error;
        }
    }, [idToken]);

    const deleteTerm = useCallback(async (id) => {
        if (!idToken) throw new Error("User not authenticated");
        try {
            await dynamoGenericApi.delete(id, idToken);
            setTerms(prev => prev.filter(term => term.id !== id));
        } catch (error) {
            console.error('Error deleting term from DynamoDB:', error);
            throw error;
        }
    }, [idToken]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchTerms();
        } else if (!authLoading && !isAuthenticated) {
            setTerms([]);
            setLoading(false);
        }
    }, [fetchTerms, authLoading, isAuthenticated]);

    const contextValue = useMemo(() => ({
        terms,
        loading,
        addTerm,
        updateTerm,
        deleteTerm,
        fetchTerms
    }), [terms, loading, addTerm, updateTerm, deleteTerm, fetchTerms]);

    return (
        <TermsAndConditionsContext.Provider value={contextValue}>
            {children}
        </TermsAndConditionsContext.Provider>
    );
};
export const useTermsAndConditions = () => {
    const context = useContext(TermsAndConditionsContext);
    if (!context) {
        throw new Error('useTermsAndConditions must be used within a TermsAndConditionsProvider');
    }
    return context;
};

export { TermsAndConditionsContext, TermsAndConditionsProvider };
