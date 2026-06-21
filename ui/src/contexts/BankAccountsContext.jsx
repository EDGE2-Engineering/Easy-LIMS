import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

const BankAccountsContext = createContext();

export const useBankAccounts = () => {
  const context = useContext(BankAccountsContext);
  if (!context) {
    throw new Error('useBankAccounts must be used within a BankAccountsProvider');
  }
  return context;
};

export const BankAccountsProvider = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBankAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/api/bank-accounts?order_by=created_at&order_dir=asc');
      setBankAccounts(data || []);
    } catch (err) {
      console.error('Fetch Bank Accounts Exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addBankAccount = async (bankData) => {
    try {
      // If this is set as default, unset others
      if (bankData.is_default) {
        for (const acc of bankAccounts) {
          if (acc.is_default) {
            await apiClient.put(`/api/bank-accounts/${acc.id}`, { ...acc, is_default: false });
          }
        }
      }

      const data = await apiClient.post('/api/bank-accounts', bankData);

      await fetchBankAccounts();
      return data;
    } catch (err) {
      console.error('Add Bank Account Exception:', err);
      throw err;
    }
  };

  const updateBankAccount = async (id, bankData) => {
    try {
      if (bankData.is_default) {
        for (const acc of bankAccounts) {
          if (acc.id !== id && acc.is_default) {
            await apiClient.put(`/api/bank-accounts/${acc.id}`, { ...acc, is_default: false });
          }
        }
      }

      await apiClient.put(`/api/bank-accounts/${id}`, bankData);

      await fetchBankAccounts();
    } catch (err) {
      console.error('Update Bank Account Exception:', err);
      throw err;
    }
  };

  const deleteBankAccount = async (id) => {
    try {
      await apiClient.delete(`/api/bank-accounts/${id}`);

      await fetchBankAccounts();
    } catch (err) {
      console.error('Delete Bank Account Exception:', err);
      throw err;
    }
  };

  const setDefaultBank = async (id) => {
    try {
      for (const acc of bankAccounts) {
        if (acc.id !== id && acc.is_default) {
          await apiClient.put(`/api/bank-accounts/${acc.id}`, { ...acc, is_default: false });
        }
      }

      const target = bankAccounts.find((a) => a.id === id);
      if (target) {
        await apiClient.put(`/api/bank-accounts/${id}`, { ...target, is_default: true });
      }

      await fetchBankAccounts();
    } catch (err) {
      console.error('Set Default Bank Exception:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  const value = {
    bankAccounts,
    loading,
    fetchBankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultBank,
  };

  return <BankAccountsContext.Provider value={value}>{children}</BankAccountsContext.Provider>;
};
