import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { MATERIALS } from '@/data/config';

const MaterialsContext = createContext();

const MaterialsProvider = ({ children }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(() => {
    setLoading(true);
    // Simply use the static data from config.js
    const mappedMaterials = MATERIALS.map((m, i) => ({
      id: m.id || `static-${i}`,
      name: m.name || m,
    }));
    setMaterials(mappedMaterials);
    setLoading(false);
  }, []);

  const addMaterial = useCallback(async (materialData) => {
    console.warn(
      'Manual addition of materials is disabled. Please update src/data/config.js instead.'
    );
  }, []);

  const updateMaterial = useCallback(async (id, materialData) => {
    console.warn(
      'Manual update of materials is disabled. Please update src/data/config.js instead.'
    );
  }, []);

  const deleteMaterial = useCallback(async (id) => {
    console.warn(
      'Manual deletion of materials is disabled. Please update src/data/config.js instead.'
    );
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const contextValue = useMemo(
    () => ({
      materials,
      loading,
      refreshMaterials: fetchMaterials,
      addMaterial,
      updateMaterial,
      deleteMaterial,
    }),
    [materials, loading, fetchMaterials, addMaterial, updateMaterial, deleteMaterial]
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
