import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';

const BankAccountsContext = createContext();

export const BankAccountsProvider = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchBankAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch bank accounts:', error);
        return;
      }

      setBankAccounts(data || []);
    } catch (err) {
      console.error('Fetch Bank Accounts Exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchBankAccounts();
    }
  }, [fetchBankAccounts]);

  const addBankAccount = async (bankData) => {
    try {
      if (bankData.is_default) {
        await apiClient
          .from('bank_accounts')
          .update({ is_default: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await apiClient.from('bank_accounts').insert([bankData]).select();
      if (error) throw error;
      await fetchBankAccounts();
      return data[0];
    } catch (err) {
      console.error('Add Bank Account Exception:', err);
      throw err;
    }
  };

  const updateBankAccount = async (id, bankData) => {
    try {
      if (bankData.is_default) {
        await apiClient.from('bank_accounts').update({ is_default: false }).neq('id', id);
      }
      const { error } = await apiClient.from('bank_accounts').update(bankData).eq('id', id);
      if (error) throw error;
      await fetchBankAccounts();
    } catch (err) {
      console.error('Update Bank Account Exception:', err);
      throw err;
    }
  };

  const deleteBankAccount = async (id) => {
    try {
      const { error } = await apiClient.from('bank_accounts').delete().eq('id', id);
      if (error) throw error;
      await fetchBankAccounts();
    } catch (err) {
      console.error('Delete Bank Account Exception:', err);
      throw err;
    }
  };

  const setDefaultBank = async (id) => {
    try {
      await apiClient.from('bank_accounts').update({ is_default: false }).neq('id', id);
      const { error } = await apiClient
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      await fetchBankAccounts();
    } catch (err) {
      console.error('Set Default Bank Exception:', err);
      throw err;
    }
  };

  const value = {
    bankAccounts,
    loading,
    fetchBankAccounts,
    ensureFetched,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultBank,
  };

  return <BankAccountsContext.Provider value={value}>{children}</BankAccountsContext.Provider>;
};

export const useBankAccounts = () => {
  const context = useContext(BankAccountsContext);
  if (!context) {
    throw new Error('useBankAccounts must be used within a BankAccountsProvider');
  }
  useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};
