
import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const UnitTypesContext = createContext();

const UnitTypesProvider = ({ children }) => {
    const [unitTypes, setUnitTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUnitTypes = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('service_unit_types')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                console.error("Error fetching unit types:", error.message);
                return;
            }

            if (data) {
                setUnitTypes(data);
            }
        } catch (error) {
            console.error("Error loading unit types:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addUnitType = useCallback(async (unitType) => {
        try {
            const { data, error } = await supabase
                .from('service_unit_types')
                .insert([{ unit_type: unitType }])
                .select();

            if (error) throw error;
            if (data) {
                setUnitTypes(prev => [...prev, data[0]]);
            }
        } catch (error) {
            console.error("Error adding unit type:", error);
            throw error;
        }
    }, []);

    const updateUnitType = useCallback(async (id, unitType) => {
        try {
            const { data, error } = await supabase
                .from('service_unit_types')
                .update({ unit_type: unitType })
                .eq('id', id)
                .select();

            if (error) throw error;
            if (data) {
                setUnitTypes(prev => prev.map(u => u.id === id ? data[0] : u));
            }
        } catch (error) {
            console.error("Error updating unit type:", error);
            throw error;
        }
    }, []);

    const deleteUnitType = useCallback(async (id) => {
        try {
            const { error } = await supabase
                .from('service_unit_types')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setUnitTypes(prev => prev.filter(u => u.id !== id));
        } catch (error) {
            console.error("Error deleting unit type:", error);
            throw error;
        }
    }, []);

    useEffect(() => {
        fetchUnitTypes();
    }, [fetchUnitTypes]);

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
