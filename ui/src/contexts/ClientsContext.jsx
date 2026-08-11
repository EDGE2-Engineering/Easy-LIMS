import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const ClientsContext = createContext();

const initialClients = [
  {
    id: 'C1',
    clientName: 'Indus Towers Ltd.',
    clientAddress: "No.12, Subramanya Arcade, 'D' Block, 7th Floor, Bannerghatta Road, Bengaluru.",
    contacts: [
      {
        contact_person: '',
        contact_email: 'indus@email.com',
        contact_phone: '123',
        is_primary: true,
      },
    ],
  },
  {
    id: 'C2',
    clientName: 'Reliance Jio Infocomm Ltd.',
    clientAddress: 'Bengaluru, Karnataka',
    contacts: [
      {
        contact_person: '',
        contact_email: 'jio@email.com',
        contact_phone: '456',
        is_primary: true,
      },
    ],
  },
  {
    id: 'C3',
    clientName: 'ATC Telecom Infrastructure Pvt. Ltd.',
    clientAddress:
      'HM Tower, 1st Floor, Magrath Road Junction, Brigade Road, Ashok Nagar, Bengaluru - 560001, Karnataka, INDIA',
    contacts: [
      {
        contact_person: '',
        contact_email: 'atc@email.com',
        contact_phone: '789',
        is_primary: true,
      },
    ],
  },
];

const ClientsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapFromDb = useCallback((c) => {
    if (!c) return null;
    let contacts = [];
    if (Array.isArray(c.contacts)) {
      contacts = c.contacts;
    } else if (typeof c.contacts === 'string' && c.contacts.trim()) {
      try {
        const parsed = JSON.parse(c.contacts);
        contacts = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        contacts = [];
      }
    }

    // Migration: If no contacts array exists, create one from legacy email/phone
    if (contacts.length === 0 && (c.email || c.phone || c.client_name || c.clientName)) {
      contacts = [
        {
          contact_person: '',
          contact_email: c.email || '',
          contact_phone: c.phone || '',
          is_primary: true,
        },
      ];
    }

    const primaryContact = contacts.find((con) => con.is_primary) || contacts[0] || {};

    return {
      ...c,
      id: c.id,
      clientName: c.client_name || c.clientName || '',
      client_name: c.client_name || c.clientName || '',
      clientAddress: c.client_address || c.clientAddress || '',
      client_address: c.client_address || c.clientAddress || '',
      contacts: contacts,
      // Backward compatibility for UI parts still using single email/phone
      email: primaryContact.contact_email || c.email || '',
      phone: primaryContact.contact_phone || c.phone || '',
      gstin: c.gstin || '',
      createdAt: c.created_at || new Date().toISOString(),
    };
  }, []);

  const mapToDb = useCallback((c) => {
    const payload = {
      client_name: c.clientName,
      client_address: c.clientAddress,
      gstin: c.gstin || null,
      contacts: Array.isArray(c.contacts) ? c.contacts : [],
    };
    // Only include ID if it's not a temporary/new record ID (which would be a string like cli_...)
    if (c.id && typeof c.id === 'number') {
      payload.id = c.id;
    }
    return payload;
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await apiClient
        .from('clients')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('API fetch error (clients):', error.message);
        if (clients.length === 0) setClients(initialClients.map(mapFromDb));
        return;
      }

      if (data && data.length > 0) {
        const mappedData = data.map(mapFromDb);
        setClients(mappedData);
      } else {
        setClients(initialClients.map(mapFromDb));
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      if (clients.length === 0) setClients(initialClients.map(mapFromDb));
    } finally {
      setLoading(false);
    }
  }, [mapFromDb]);

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchClients();
    }
  }, [fetchClients]);

  const updateClient = useCallback(
    async (updatedClient, userId = null) => {
      // Check for duplicate client names
      if (updatedClient.clientName) {
        const existingWithName = clients.find(
          (c) =>
            c.id !== updatedClient.id &&
            c.clientName.toLowerCase() === updatedClient.clientName.toLowerCase()
        );
        if (existingWithName) {
          throw new Error(`Client name "${updatedClient.clientName}" already exists.`);
        }
      }

      const previousClients = [...clients];
      setClients((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));

      try {
        const dbPayload = mapToDb(updatedClient);
        const { id, ...updates } = dbPayload;
        updates.updated_at = new Date().toISOString();

        const { error, data } = await apiClient
          .from('clients')
          .update(updates)
          .eq('id', id)
          .select();

        if (error) {
          console.error('API Update Failed (clients):', error);
          setClients(previousClients);
          throw new Error(`Failed to update client: ${error.message}`);
        }

        if (data && data.length > 0) {
          const updated = mapFromDb(data[0]);
          setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        }

        logAudit({
          userId: userId || currentUserId,
          entityType: 'client',
          entityId: updatedClient.id,
          entityName: updatedClient.clientName,
          action: 'UPDATE',
        });
      } catch (err) {
        console.error('Update Client Exception:', err);
        setClients(previousClients);
        throw err;
      }
    },
    [clients, mapToDb, mapFromDb, currentUserId]
  );

  const addClient = useCallback(
    async (newClient, userId = null) => {
      // Check for duplicate client names
      if (newClient.clientName) {
        const existingWithName = clients.find(
          (c) => c.clientName.toLowerCase() === newClient.clientName.toLowerCase()
        );
        if (existingWithName) {
          throw new Error(`Client name "${newClient.clientName}" already exists.`);
        }
      }

      const previousClients = [...clients];
      // We'll add the client to the state after a successful DB insert to get the real ID

      try {
        const dbPayload = mapToDb(newClient);
        dbPayload.created_at = new Date().toISOString();
        dbPayload.updated_at = new Date().toISOString();

        const { error, data } = await apiClient.from('clients').insert(dbPayload).select();

        if (error) {
          console.error('API Add Failed (clients):', error);
          setClients(previousClients);
          throw new Error(`Failed to add client: ${error.message}`);
        }

        if (data && data.length > 0) {
          const added = mapFromDb(data[0]);
          setClients((prev) => [...prev, added]);
          logAudit({
            userId: userId || currentUserId,
            entityType: 'client',
            entityId: added.id,
            entityName: added.clientName,
            action: 'CREATE',
          });
        }
      } catch (err) {
        console.error('Add Client Exception:', err);
        setClients(previousClients);
        throw err;
      }
    },
    [clients, mapToDb, mapFromDb, currentUserId]
  );

  const deleteClient = useCallback(
    async (id, userId = null) => {
      const clientToDelete = clients.find((c) => c.id === id);
      const previousClients = [...clients];
      setClients((prev) => prev.filter((c) => c.id !== id));

      try {
        const { error } = await apiClient.from('clients').delete().eq('id', id);

        if (error) {
          console.error('API Delete Failed (clients):', error);
          setClients(previousClients);
          throw new Error(`Failed to delete client: ${error.message}`);
        }

        logAudit({
          userId: userId || currentUserId,
          entityType: 'client',
          entityId: id,
          entityName: clientToDelete?.clientName,
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Delete Client Exception:', err);
        setClients(previousClients);
        throw err;
      }
    },
    [clients, currentUserId]
  );

  const contextValue = React.useMemo(
    () => ({
      clients,
      loading,
      updateClient,
      addClient,
      deleteClient,
      setClients,
      refreshClients: fetchClients,
      ensureFetched,
    }),
    [clients, loading, updateClient, addClient, deleteClient, fetchClients, ensureFetched]
  );

  return <ClientsContext.Provider value={contextValue}>{children}</ClientsContext.Provider>;
};

export const useClients = () => {
  const context = React.useContext(ClientsContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  React.useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { ClientsContext, ClientsProvider };
