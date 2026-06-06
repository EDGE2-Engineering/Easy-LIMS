import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

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
      const { data, error } = await supabase
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

  const addBankAccount = async (bankData) => {
    try {
      // If this is set as default, unset others
      if (bankData.is_default) {
        await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy filter to allow update all
      }

      const { data, error } = await supabase.from('bank_accounts').insert([bankData]).select();

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
        await supabase.from('bank_accounts').update({ is_default: false }).neq('id', id);
      }

      const { error } = await supabase.from('bank_accounts').update(bankData).eq('id', id);

      if (error) throw error;

      await fetchBankAccounts();
    } catch (err) {
      console.error('Update Bank Account Exception:', err);
      throw err;
    }
  };

  const deleteBankAccount = async (id) => {
    try {
      const { error } = await supabase.from('bank_accounts').delete().eq('id', id);

      if (error) throw error;

      await fetchBankAccounts();
    } catch (err) {
      console.error('Delete Bank Account Exception:', err);
      throw err;
    }
  };

  const setDefaultBank = async (id) => {
    try {
      // Unset all
      await supabase.from('bank_accounts').update({ is_default: false }).neq('id', id);

      // Set this one
      const { error } = await supabase
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
