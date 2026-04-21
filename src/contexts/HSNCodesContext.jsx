
import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const HSNCodesContext = createContext();

const HSNCodesProvider = ({ children }) => {
    const [hsnCodes, setHsnCodes] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHsnCodes = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('hsn_sac_codes')
                .select('*')
                .order('code', { ascending: true });

            if (error) {
                console.error("Error fetching HSN codes:", error.message);
                return;
            }

            if (data) {
                setHsnCodes(data);
            }
        } catch (error) {
            console.error("Error loading HSN codes:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addHsnCode = useCallback(async (hsnData) => {
        try {
            const { data, error } = await supabase
                .from('hsn_sac_codes')
                .insert([hsnData])
                .select();

            if (error) throw error;
            if (data) {
                setHsnCodes(prev => [...prev, data[0]].sort((a, b) => a.code.localeCompare(b.code)));
            }
        } catch (error) {
            console.error("Error adding HSN code:", error);
            throw error;
        }
    }, []);

    const updateHsnCode = useCallback(async (id, hsnData) => {
        try {
            const { data, error } = await supabase
                .from('hsn_sac_codes')
                .update(hsnData)
                .eq('id', id)
                .select();

            if (error) throw error;
            if (data) {
                setHsnCodes(prev => prev.map(h => h.id === id ? data[0] : h).sort((a, b) => a.code.localeCompare(b.code)));
            }
        } catch (error) {
            console.error("Error updating HSN code:", error);
            throw error;
        }
    }, []);

    const deleteHsnCode = useCallback(async (id) => {
        try {
            const { error } = await supabase
                .from('hsn_sac_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setHsnCodes(prev => prev.filter(h => h.id !== id));
        } catch (error) {
            console.error("Error deleting HSN code:", error);
            throw error;
        }
    }, []);

    useEffect(() => {
        fetchHsnCodes();
    }, [fetchHsnCodes]);

    const contextValue = useMemo(() => ({
        hsnCodes,
        loading,
        refreshHsnCodes: fetchHsnCodes,
        addHsnCode,
        updateHsnCode,
        deleteHsnCode
    }), [hsnCodes, loading, fetchHsnCodes, addHsnCode, updateHsnCode, deleteHsnCode]);

    return (
        <HSNCodesContext.Provider value={contextValue}>
            {children}
        </HSNCodesContext.Provider>
    );
};

export const useHSNCodes = () => {
    const context = useContext(HSNCodesContext);
    if (!context) {
        throw new Error('useHSNCodes must be used within a HSNCodesProvider');
    }
    return context;
};

export { HSNCodesContext, HSNCodesProvider };
