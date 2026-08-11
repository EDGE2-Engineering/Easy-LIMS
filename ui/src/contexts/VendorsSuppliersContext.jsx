import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const VendorsSuppliersContext = createContext();

const VendorsSuppliersProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapFromDb = useCallback((v) => {
    if (!v) return null;
    let contacts = [];
    if (Array.isArray(v.contacts)) {
      contacts = v.contacts;
    } else if (typeof v.contacts === 'string' && v.contacts.trim()) {
      try {
        const parsed = JSON.parse(v.contacts);
        contacts = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        contacts = [];
      }
    }

    if (contacts.length === 0 && (v.contact_person || v.email || v.phone)) {
      contacts = [
        {
          contact_person: v.contact_person || '',
          contact_email: v.email || '',
          contact_phone: v.phone || '',
          is_primary: true,
        },
      ];
    }

    const primary = contacts.find((c) => c.is_primary) || contacts[0] || {};

    return {
      ...v,
      id: v.id,
      type: v.type || 'Vendor',
      name: v.name || '',
      address: v.address || '',
      contact_person: primary.contact_person || v.contact_person || '',
      phone: primary.contact_phone || v.phone || '',
      email: primary.contact_email || v.email || '',
      gstin: v.gstin || '',
      category: v.category || 'General',
      contacts: contacts,
      status: v.status !== false,
      createdAt: v.created_at || new Date().toISOString(),
    };
  }, []);

  const mapToDb = useCallback((item) => {
    const payload = {
      type: item.type || 'Vendor',
      name: item.name,
      address: item.address || '',
      contact_person: item.contact_person || '',
      phone: item.phone || '',
      email: item.email || '',
      gstin: item.gstin || '',
      category: item.category || 'General',
      contacts: Array.isArray(item.contacts) ? item.contacts : [],
      status: item.status !== false,
    };
    if (item.id && typeof item.id === 'number') {
      payload.id = item.id;
    }
    return payload;
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await apiClient
        .from('vendors_suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('API fetch error (vendors_suppliers):', error.message);
        setItems([]);
        return;
      }

      if (data && data.length > 0) {
        setItems(data.map(mapFromDb));
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading vendors & suppliers:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mapFromDb]);

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchItems();
    }
  }, [fetchItems]);

  const addItem = useCallback(
    async (newItem, userId = null) => {
      if (newItem.name) {
        const existing = items.find(
          (i) => i.name.toLowerCase() === newItem.name.toLowerCase() && i.type === newItem.type
        );
        if (existing) {
          throw new Error(`${newItem.type} with name "${newItem.name}" already exists.`);
        }
      }

      const previousItems = [...items];

      try {
        const dbPayload = mapToDb(newItem);
        dbPayload.created_at = new Date().toISOString();
        dbPayload.updated_at = new Date().toISOString();

        const { error, data } = await apiClient
          .from('vendors_suppliers')
          .insert(dbPayload)
          .select();

        if (error) {
          console.error('API Add Failed (vendors_suppliers):', error);
          setItems(previousItems);
          throw new Error(`Failed to add ${newItem.type.toLowerCase()}: ${error.message}`);
        }

        if (data && data.length > 0) {
          const added = mapFromDb(data[0]);
          setItems((prev) => [...prev, added]);
          logAudit({
            userId: userId || currentUserId,
            entityType: newItem.type.toLowerCase(),
            entityId: added.id,
            entityName: added.name,
            action: 'CREATE',
          });
          return added;
        }
      } catch (err) {
        console.error('Add Vendor/Supplier Exception:', err);
        setItems(previousItems);
        throw err;
      }
    },
    [items, mapToDb, mapFromDb, currentUserId]
  );

  const updateItem = useCallback(
    async (updatedItem, userId = null) => {
      if (updatedItem.name) {
        const existing = items.find(
          (i) =>
            i.id !== updatedItem.id &&
            i.type === updatedItem.type &&
            i.name.toLowerCase() === updatedItem.name.toLowerCase()
        );
        if (existing) {
          throw new Error(`${updatedItem.type} with name "${updatedItem.name}" already exists.`);
        }
      }

      const previousItems = [...items];
      setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));

      try {
        const dbPayload = mapToDb(updatedItem);
        const { id, ...updates } = dbPayload;
        updates.updated_at = new Date().toISOString();

        const { error, data } = await apiClient
          .from('vendors_suppliers')
          .update(updates)
          .eq('id', id)
          .select();

        if (error) {
          console.error('API Update Failed (vendors_suppliers):', error);
          setItems(previousItems);
          throw new Error(`Failed to update ${updatedItem.type.toLowerCase()}: ${error.message}`);
        }

        if (data && data.length > 0) {
          const updated = mapFromDb(data[0]);
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        }

        logAudit({
          userId: userId || currentUserId,
          entityType: updatedItem.type.toLowerCase(),
          entityId: updatedItem.id,
          entityName: updatedItem.name,
          action: 'UPDATE',
        });
      } catch (err) {
        console.error('Update Vendor/Supplier Exception:', err);
        setItems(previousItems);
        throw err;
      }
    },
    [items, mapToDb, mapFromDb, currentUserId]
  );

  const deleteItem = useCallback(
    async (id, userId = null) => {
      const itemToDelete = items.find((i) => i.id === id);
      const previousItems = [...items];
      setItems((prev) => prev.filter((i) => i.id !== id));

      try {
        const { error } = await apiClient.from('vendors_suppliers').delete().eq('id', id);

        if (error) {
          console.error('API Delete Failed (vendors_suppliers):', error);
          setItems(previousItems);
          throw new Error(`Failed to delete entry: ${error.message}`);
        }

        logAudit({
          userId: userId || currentUserId,
          entityType: (itemToDelete?.type || 'Vendor').toLowerCase(),
          entityId: id,
          entityName: itemToDelete?.name,
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Delete Vendor/Supplier Exception:', err);
        setItems(previousItems);
        throw err;
      }
    },
    [items, currentUserId]
  );

  const contextValue = useMemo(
    () => ({
      items,
      loading,
      addItem,
      updateItem,
      deleteItem,
      setItems,
      refreshItems: fetchItems,
      ensureFetched,
    }),
    [items, loading, addItem, updateItem, deleteItem, fetchItems, ensureFetched]
  );

  return (
    <VendorsSuppliersContext.Provider value={contextValue}>
      {children}
    </VendorsSuppliersContext.Provider>
  );
};

export const useVendorsSuppliers = () => {
  const context = React.useContext(VendorsSuppliersContext);
  if (!context) {
    throw new Error('useVendorsSuppliers must be used within a VendorsSuppliersProvider');
  }
  React.useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { VendorsSuppliersContext, VendorsSuppliersProvider };
