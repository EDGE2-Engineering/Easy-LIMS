import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const TechnicalsContext = createContext();


const TechnicalsProvider = ({ children }) => {
    const [technicals, setTechnicals] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchTechnicals = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('technicals')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            setTechnicals(data || []);
        } catch (error) {
            console.error('Error fetching technicals:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addTechnical = useCallback(async (text, type) => {
        try {
            const { data, error } = await supabase
                .from('technicals')
                .insert([{ text, type }])
                .select();

            if (error) throw error;
            setTechnicals(prev => [...prev, ...data]);
            return data;
        } catch (error) {
            console.error('Error adding technical:', error);
            throw error;
        }
    }, []);

    const updateTechnical = useCallback(async (id, text, type) => {
        try {
            const { data, error } = await supabase
                .from('technicals')
                .update({ text, type, updated_at: new Date() })
                .eq('id', id)
                .select();

            if (error) throw error;
            setTechnicals(prev => prev.map(tech => tech.id === id ? data[0] : tech));
            return data;
        } catch (error) {
            console.error('Error updating technical:', error);
            throw error;
        }
    }, []);

    const deleteTechnical = useCallback(async (id) => {
        try {
            const { error } = await supabase
                .from('technicals')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTechnicals(prev => prev.filter(tech => tech.id !== id));
        } catch (error) {
            console.error('Error deleting technical:', error);
            throw error;
        }
    }, []);

    useEffect(() => {
        fetchTechnicals();
    }, [fetchTechnicals]);

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
