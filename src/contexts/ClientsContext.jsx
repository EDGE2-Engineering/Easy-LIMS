
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { useAuth } from '@/contexts/AuthContext';
import { DB_TYPES } from '@/config';

const ClientsContext = createContext();


const ClientsProvider = ({ children }) => {
    const { idToken, isAuthenticated, loading: authLoading } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const mapFromDb = useCallback((c) => {
        if (!c) return null;
        let contacts = Array.isArray(c.contacts) ? c.contacts : [];

        // Migration: If no contacts array exists, create one from legacy email/phone
        if (contacts.length === 0 && (c.email || c.phone || c.client_name || c.clientName)) {
            contacts = [{
                contact_person: '',
                contact_email: c.email || '',
                contact_phone: c.phone || '',
                is_primary: true
            }];
        }

        const primaryContact = contacts.find(con => con.is_primary) || contacts[0] || {};

        return {
            ...c,
            id: c.id,
            clientName: c.client_name || c.clientName || '',
            clientAddress: c.client_address || c.clientAddress || '',
            contacts: contacts,
            // Backward compatibility for UI parts still using single email/phone
            email: primaryContact.contact_email || c.email || '',
            phone: primaryContact.contact_phone || c.phone || '',
            createdAt: c.created_at || new Date().toISOString()
        };
    }, []);

    const mapToDb = useCallback((c) => ({
        id: c.id,
        client_name: c.clientName,
        client_address: c.clientAddress,
        contacts: Array.isArray(c.contacts) ? c.contacts : []
    }), []);

    const fetchClients = useCallback(async () => {
        if (!idToken) {
            setLoading(false);
            return;
        }

        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.CLIENT, idToken);

            if (data && data.length > 0) {
                const mappedData = data.map(mapFromDb);
                setClients(mappedData);
            } else {
                setClients([]);
            }
        } catch (error) {
            console.error("Error loading clients from DynamoDB:", error);
            if (clients.length === 0) setClients([]);
        } finally {
            setLoading(false);
        }
    }, [mapFromDb, idToken]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchClients();
        } else if (!authLoading && !isAuthenticated) {
            setClients([]);
            setLoading(false);
        }
    }, [fetchClients, authLoading, isAuthenticated]);


    const updateClient = useCallback(async (updatedClient) => {
        if (!idToken) throw new Error("User not authenticated");

        // Check for duplicate client names
        if (updatedClient.clientName) {
            const existingWithName = clients.find(
                c => c.id !== updatedClient.id && c.clientName.toLowerCase() === updatedClient.clientName.toLowerCase()
            );
            if (existingWithName) {
                throw new Error(`Client name "${updatedClient.clientName}" already exists.`);
            }
        }

        const previousClients = [...clients];
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));

        try {
            const dbPayload = mapToDb(updatedClient);
            const savedItem = await dynamoGenericApi.save(DB_TYPES.CLIENT, dbPayload, idToken);
            const updated = mapFromDb(savedItem);
            setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        } catch (err) {
            console.error("Update Client Exception:", err);
            setClients(previousClients);
            throw err;
        }
    }, [clients, idToken, mapToDb, mapFromDb]);

    const addClient = useCallback(async (newClient) => {
        if (!idToken) throw new Error("User not authenticated");

        // Check for duplicate client names
        if (newClient.clientName) {
            const existingWithName = clients.find(
                c => c.clientName.toLowerCase() === newClient.clientName.toLowerCase()
            );
            if (existingWithName) {
                throw new Error(`Client name "${newClient.clientName}" already exists.`);
            }
        }

        const tempId = newClient.id || `cli_${Date.now()}`;
        const clientWithId = { ...newClient, id: tempId, created_at: new Date().toISOString() };

        const previousClients = [...clients];
        setClients(prev => [...prev, clientWithId]);

        try {
            const dbPayload = mapToDb(clientWithId);
            const savedItem = await dynamoGenericApi.save(DB_TYPES.CLIENT, dbPayload, idToken);
            const added = mapFromDb(savedItem);
            setClients(prev => prev.map(c => c.id === tempId ? added : c));
        } catch (err) {
            console.error("Add Client Exception:", err);
            setClients(previousClients);
            throw err;
        }
    }, [clients, idToken, mapToDb, mapFromDb]);

    const deleteClient = useCallback(async (id) => {
        if (!idToken) throw new Error("User not authenticated");

        const previousClients = [...clients];
        setClients(prev => prev.filter(c => c.id !== id));

        try {
            await dynamoGenericApi.delete(id, idToken);
        } catch (err) {
            console.error("Delete Client Exception:", err);
            setClients(previousClients);
            throw err;
        }
    }, [clients, idToken]);

    const contextValue = useMemo(() => ({
        clients,
        loading,
        updateClient,
        addClient,
        deleteClient,
        setClients,
        refreshClients: fetchClients
    }), [clients, loading, updateClient, addClient, deleteClient, fetchClients]);

    return (
        <ClientsContext.Provider value={contextValue}>
            {children}
        </ClientsContext.Provider>
    );
};

export const useClients = () => {
    const context = React.useContext(ClientsContext);
    if (!context) {
        throw new Error('useClients must be used within a ClientsProvider');
    }
    return context;
};

export { ClientsContext, ClientsProvider };
