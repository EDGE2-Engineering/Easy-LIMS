import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const TermsAndConditionsContext = createContext();


const TermsAndConditionsProvider = ({ children }) => {
    const [terms, setTerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchTerms = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('terms_and_conditions')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            setTerms(data || []);
        } catch (error) {
            console.error('Error fetching terms:', error);
            // toast({ title: "Error", description: "Failed to fetch terms and conditions.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, []);

    const addTerm = useCallback(async (text, type = 'general') => {
        try {
            const { data, error } = await supabase
                .from('terms_and_conditions')
                .insert([{ text, type }])
                .select();

            if (error) throw error;
            setTerms(prev => [...prev, ...data]);
            return data;
        } catch (error) {
            console.error('Error adding term:', error);
            throw error;
        }
    }, []);

    const updateTerm = useCallback(async (id, text, type) => {
        try {
            const { data, error } = await supabase
                .from('terms_and_conditions')
                .update({ text, type, updated_at: new Date() })
                .eq('id', id)
                .select();

            if (error) throw error;
            setTerms(prev => prev.map(term => term.id === id ? data[0] : term));
            return data;
        } catch (error) {
            console.error('Error updating term:', error);
            throw error;
        }
    }, []);

    const deleteTerm = useCallback(async (id) => {
        try {
            const { error } = await supabase
                .from('terms_and_conditions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTerms(prev => prev.filter(term => term.id !== id));
        } catch (error) {
            console.error('Error deleting term:', error);
            throw error;
        }
    }, []);

    useEffect(() => {
        fetchTerms();
    }, [fetchTerms]);

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
