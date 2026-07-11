import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const MaterialsContext = createContext();

const MaterialsProvider = ({ children }) => {
  const [materials, setMaterials] = useState([]);
  const [materialFormAssociations, setMaterialFormAssociations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch materials
      const { data: matsData, error: matsError } = await supabase
        .from('materials')
        .select('*')
        .order('name', { ascending: true });

      if (matsError) throw matsError;

      // Fetch associations
      const { data: assocData, error: assocError } = await supabase
        .from('material_form_associations')
        .select('*');

      if (assocError) throw assocError;

      setMaterials(matsData || []);
      setMaterialFormAssociations(assocData || []);
    } catch (err) {
      console.error('Error loading materials and associations from database:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addMaterial = useCallback(
    async (materialData) => {
      try {
        const { data, error } = await supabase
          .from('materials')
          .insert([{ name: materialData.name }])
          .select();

        if (error) throw error;

        // No default form associations — user assigns them explicitly via the forms manager

        await fetchMaterials();
        return data?.[0];
      } catch (err) {
        console.error('Failed to add material:', err);
        throw err;
      }
    },
    [fetchMaterials]
  );

  const updateMaterial = useCallback(
    async (id, materialData) => {
      try {
        const { error } = await supabase
          .from('materials')
          .update({ name: materialData.name, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
        await fetchMaterials();
      } catch (err) {
        console.error('Failed to update material:', err);
        throw err;
      }
    },
    [fetchMaterials]
  );

  const deleteMaterial = useCallback(
    async (id) => {
      try {
        const { error } = await supabase.from('materials').delete().eq('id', id);

        if (error) throw error;
        await fetchMaterials();
      } catch (err) {
        console.error('Failed to delete material:', err);
        throw err;
      }
    },
    [fetchMaterials]
  );

  const saveFormAssociations = useCallback(
    async (materialId, formTypes) => {
      try {
        // Delete existing associations
        const { error: deleteError } = await supabase
          .from('material_form_associations')
          .delete()
          .eq('material_id', materialId);

        if (deleteError) throw deleteError;

        if (formTypes.length > 0) {
          const payload = formTypes.map((ft) => ({
            material_id: materialId,
            form_type: ft,
          }));

          const { error: insertError } = await supabase
            .from('material_form_associations')
            .insert(payload);

          if (insertError) throw insertError;
        }

        await fetchMaterials();
      } catch (err) {
        console.error('Failed to save form associations:', err);
        throw err;
      }
    },
    [fetchMaterials]
  );

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const contextValue = useMemo(
    () => ({
      materials,
      materialFormAssociations,
      loading,
      refreshMaterials: fetchMaterials,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      saveFormAssociations,
    }),
    [
      materials,
      materialFormAssociations,
      loading,
      fetchMaterials,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      saveFormAssociations,
    ]
  );

  return <MaterialsContext.Provider value={contextValue}>{children}</MaterialsContext.Provider>;
};

export const useMaterials = () => {
  const context = useContext(MaterialsContext);
  if (!context) {
    throw new Error('useMaterials must be used within a MaterialsProvider');
  }
  return context;
};

export { MaterialsContext, MaterialsProvider };
