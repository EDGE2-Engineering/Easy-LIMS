import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { STORAGE_KEYS } from '@/data/storageKeys';

const ExpensesContext = createContext();

const ExpensesProvider = ({ children }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    const mapFromDb = useCallback((e) => ({
        ...e,
        id: e.id,
        description: e.description || '',
        amount: Number(e.amount) || 0,
        date: e.date || new Date().toISOString().split('T')[0],
        remarks: e.remarks || '',
        createdBy: e.created_by || e.createdBy || 'Unknown',
        createdAt: e.created_at || new Date().toISOString()
    }), []);

    const mapToDb = useCallback((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        remarks: e.remarks,
        created_by: e.createdBy
    }), []);

    const fetchExpenses = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                console.warn("Supabase fetch error (expenses):", error.message);
                const stored = localStorage.getItem(STORAGE_KEYS.EXPENSES);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) {
                            setExpenses(parsed.map(mapFromDb));
                            return;
                        }
                    } catch (e) { }
                }
                return;
            }

            if (data) {
                setExpenses(data.map(mapFromDb));
            }
        } catch (error) {
            console.error("Error loading expenses:", error);
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

    const addExpense = useCallback(async (newExpense) => {
        const tempId = `exp_${Date.now()}`;
        const expenseWithId = { ...newExpense, id: tempId, createdAt: new Date().toISOString() };
        
        const previousExpenses = [...expenses];
        setExpenses(prev => [expenseWithId, ...prev]);

        try {
            const dbPayload = mapToDb(expenseWithId);
            const { error, data } = await supabase
                .from('expenses')
                .insert(dbPayload)
                .select();

            if (error) {
                console.error("Supabase Add Failed (expenses):", error);
                // We keep it in local state anyway if offline
            } else if (data && data.length > 0) {
                const added = mapFromDb(data[0]);
                setExpenses(prev => prev.map(e => e.id === tempId ? added : e));
            }
        } catch (err) {
            console.error("Add Expense Exception:", err);
        }
    }, [expenses, mapToDb, mapFromDb]);

    const updateExpense = useCallback(async (updatedExpense) => {
        const previousExpenses = [...expenses];
        setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));

        try {
            const dbPayload = mapToDb(updatedExpense);
            const { id, ...updates } = dbPayload;
            const { error } = await supabase
                .from('expenses')
                .update(updates)
                .eq('id', id);

            if (error) {
                console.error("Supabase Update Failed (expenses):", error);
            }
        } catch (err) {
            console.error("Update Expense Exception:", err);
        }
    }, [expenses, mapToDb]);

    const deleteExpense = useCallback(async (id) => {
        const previousExpenses = [...expenses];
        setExpenses(prev => prev.filter(e => e.id !== id));

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("Supabase Delete Failed (expenses):", error);
            }
        } catch (err) {
            console.error("Delete Expense Exception:", err);
        }
    }, [expenses]);

    const contextValue = useMemo(() => ({
        expenses,
        loading,
        addExpense,
        updateExpense,
        deleteExpense,
        refreshExpenses: fetchExpenses
    }), [expenses, loading, addExpense, updateExpense, deleteExpense, fetchExpenses]);

    return (
        <ExpensesContext.Provider value={contextValue}>
            {children}
        </ExpensesContext.Provider>
    );
};

export const useExpenses = () => {
    const context = React.useContext(ExpensesContext);
    if (!context) {
        throw new Error('useExpenses must be used within an ExpensesProvider');
    }
    return context;
};

export { ExpensesContext, ExpensesProvider };
