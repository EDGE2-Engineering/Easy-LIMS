import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const ExpensesContext = createContext();

const ExpensesProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapFromDb = useCallback(
    (e) => ({
      ...e,
      id: e.id,
      description: e.description || '',
      amount: Number(e.amount) || 0,
      date: e.date || new Date().toISOString().split('T')[0],
      remarks: e.remarks || '',
      projectName: e.project_name || '',
      siteAddress: e.site_address || '',
      createdBy: e.users?.full_name || e.created_by_name || 'Unknown',
      createdById: e.created_by,
      createdAt: e.created_at || new Date().toISOString(),
      paidBy: e.paid_by || '',
    }),
    []
  );

  const mapToDb = useCallback(
    (e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      date: e.date,
      remarks: e.remarks,
      project_name: e.projectName || null,
      site_address: e.siteAddress || null,
      paid_by: e.paidBy || null,
      created_by: e.createdById,
    }),
    []
  );

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await apiClient.get('/api/expenses?order_by=date&order_dir=desc');

      let users = [];
      try {
        users = await apiClient.get('/api/users');
      } catch (e) {
        console.warn('Could not fetch users for expenses', e);
      }
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {});

      if (data) {
        const enrichedData = data.map((e) => ({
          ...e,
          users: { full_name: userMap[e.created_by] || 'Unknown' },
        }));
        setExpenses(enrichedData.map(mapFromDb));
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      const stored = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setExpenses(parsed.map(mapFromDb));
          }
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  }, [mapFromDb]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    }
  }, [expenses, loading]);

  const addExpense = useCallback(
    async (newExpense, userId = null) => {
      const tempId = `exp_${Date.now()}`;
      const expenseWithId = { ...newExpense, id: tempId, createdAt: new Date().toISOString() };

      const previousExpenses = [...expenses];
      setExpenses((prev) => [expenseWithId, ...prev]);

      try {
        const dbPayload = mapToDb(expenseWithId);
        // Remove temp string ID before insert, DB will generate a bigint ID
        if (typeof dbPayload.id === 'string' && dbPayload.id.startsWith('exp_')) {
          delete dbPayload.id;
        }

        const createdItem = await apiClient.post('/api/expenses', dbPayload);

        if (createdItem && createdItem.id) {
          const added = mapFromDb(createdItem);
          setExpenses((prev) => prev.map((e) => (e.id === tempId ? added : e)));
          logAudit({
            userId: userId || currentUserId,
            entityType: 'expense',
            entityId: added.id,
            entityName: added.description,
            action: 'CREATE',
          });
        }
      } catch (err) {
        console.error('Add Expense Exception:', err);
      }
    },
    [expenses, mapToDb, mapFromDb, currentUserId]
  );

  const updateExpense = useCallback(
    async (updatedExpense, userId = null) => {
      const previousExpenses = [...expenses];
      setExpenses((prev) => prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));

      try {
        const dbPayload = mapToDb(updatedExpense);
        const { id, ...updates } = dbPayload;
        await apiClient.put(`/api/expenses/${id}`, updates);

        logAudit({
          userId: userId || currentUserId,
          entityType: 'expense',
          entityId: updatedExpense.id,
          entityName: updatedExpense.description,
          action: 'UPDATE',
        });
      } catch (err) {
        console.error('Update Expense Exception:', err);
      }
    },
    [expenses, mapToDb, currentUserId]
  );

  const deleteExpense = useCallback(
    async (id, userId = null) => {
      const expenseToDelete = expenses.find((e) => e.id === id);
      const previousExpenses = [...expenses];
      setExpenses((prev) => prev.filter((e) => e.id !== id));

      try {
        await apiClient.delete(`/api/expenses/${id}`);

        logAudit({
          userId: userId || currentUserId,
          entityType: 'expense',
          entityId: id,
          entityName: expenseToDelete?.description,
          action: 'DELETE',
        });
      } catch (err) {
        console.error('Delete Expense Exception:', err);
      }
    },
    [expenses, currentUserId]
  );

  const contextValue = useMemo(
    () => ({
      expenses,
      loading,
      addExpense,
      updateExpense,
      deleteExpense,
      refreshExpenses: fetchExpenses,
    }),
    [expenses, loading, addExpense, updateExpense, deleteExpense, fetchExpenses]
  );

  return <ExpensesContext.Provider value={contextValue}>{children}</ExpensesContext.Provider>;
};

export const useExpenses = () => {
  const context = React.useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  return context;
};

export { ExpensesContext, ExpensesProvider };
