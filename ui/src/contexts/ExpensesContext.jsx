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
      const { data: rawData, error } = await apiClient
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.warn('API fetch error (expenses):', error.message);
        return;
      }

      if (rawData) {
        let expList = rawData;
        const userIds = [...new Set(expList.map((e) => e.created_by).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: uData } = await apiClient
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          if (uData) {
            const userMap = new Map(uData.map((u) => [u.id, u]));
            expList = expList.map((e) => ({
              ...e,
              users: userMap.get(e.created_by) || null,
            }));
          }
        }
        const mapped = expList.map(mapFromDb);
        setExpenses(mapped);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [mapFromDb]);

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchExpenses();
    }
  }, [fetchExpenses]);

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

        const { error, data } = await apiClient.from('expenses').insert(dbPayload).select();

        if (error) {
          console.error('API Add Failed (expenses):', error);
          // We keep it in local state anyway if offline
        } else if (data && data.length > 0) {
          const added = mapFromDb(data[0]);
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
        const { error } = await apiClient.from('expenses').update(updates).eq('id', id);

        if (error) {
          console.error('API Update Failed (expenses):', error);
        } else {
          logAudit({
            userId: userId || currentUserId,
            entityType: 'expense',
            entityId: updatedExpense.id,
            entityName: updatedExpense.description,
            action: 'UPDATE',
          });
        }
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
        const { error } = await apiClient.from('expenses').delete().eq('id', id);

        if (error) {
          console.error('API Delete Failed (expenses):', error);
        } else {
          logAudit({
            userId: userId || currentUserId,
            entityType: 'expense',
            entityId: id,
            entityName: expenseToDelete?.description,
            action: 'DELETE',
          });
        }
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
      ensureFetched,
    }),
    [expenses, loading, addExpense, updateExpense, deleteExpense, fetchExpenses, ensureFetched]
  );

  return <ExpensesContext.Provider value={contextValue}>{children}</ExpensesContext.Provider>;
};

export const useExpenses = () => {
  const context = React.useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  React.useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { ExpensesContext, ExpensesProvider };
