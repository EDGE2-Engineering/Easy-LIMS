
import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const MaterialsContext = createContext();

const MaterialsProvider = ({ children }) => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMaterials = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                console.error("Error fetching materials:", error.message);
                return;
            }

            if (data) {
                setMaterials(data);
            }
        } catch (error) {
            console.error("Error loading materials:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addMaterial = useCallback(async (materialData) => {
        try {
            const { data, error } = await supabase
                .from('materials')
                .insert([materialData])
                .select();

            if (error) throw error;
            if (data) {
                setMaterials(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            }
        } catch (error) {
            console.error("Error adding material:", error);
            throw error;
        }
    }, []);

    const updateMaterial = useCallback(async (id, materialData) => {
        try {
            const { data, error } = await supabase
                .from('materials')
                .update(materialData)
                .eq('id', id)
                .select();

            if (error) throw error;
            if (data) {
                setMaterials(prev => prev.map(m => m.id === id ? data[0] : m).sort((a, b) => a.name.localeCompare(b.name)));
            }
        } catch (error) {
            console.error("Error updating material:", error);
            throw error;
        }
    }, []);

    const deleteMaterial = useCallback(async (id) => {
        try {
            const { error } = await supabase
                .from('materials')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setMaterials(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error("Error deleting material:", error);
            throw error;
        }
    }, []);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    const contextValue = useMemo(() => ({
        materials,
        loading,
        refreshMaterials: fetchMaterials,
        addMaterial,
        updateMaterial,
        deleteMaterial
    }), [materials, loading, fetchMaterials, addMaterial, updateMaterial, deleteMaterial]);

    return (
        <MaterialsContext.Provider value={contextValue}>
            {children}
        </MaterialsContext.Provider>
    );
};

export const useMaterials = () => {
    const context = useContext(MaterialsContext);
    if (!context) {
        throw new Error('useMaterials must be used within a MaterialsProvider');
    }
    return context;
};

export { MaterialsContext, MaterialsProvider };
