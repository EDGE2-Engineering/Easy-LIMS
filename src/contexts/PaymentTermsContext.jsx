import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const PaymentTermsContext = createContext();

const PaymentTermsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPaymentTerms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_terms')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setPaymentTerms(data || []);
    } catch (error) {
      console.error('Error fetching payment terms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addPaymentTerm = useCallback(
    async (text, type = 'general', userId = null) => {
      try {
        const { data, error } = await supabase
          .from('payment_terms')
          .insert([{ text, type }])
          .select();

        if (error) throw error;
        setPaymentTerms((prev) => [...prev, ...data]);
        logAudit({
          userId: userId || currentUserId,
          entityType: 'payment_terms',
          entityId: data[0]?.id,
          entityName: text.slice(0, 60),
          action: 'CREATE',
        });
        return data;
      } catch (error) {
        console.error('Error adding payment term:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const updatePaymentTerm = useCallback(
    async (id, text, type, userId = null) => {
      try {
        const { data, error } = await supabase
          .from('payment_terms')
          .update({ text, type, updated_at: new Date() })
          .eq('id', id)
          .select();

        if (error) throw error;
        setPaymentTerms((prev) => prev.map((item) => (item.id === id ? data[0] : item)));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'payment_terms',
          entityId: id,
          entityName: text.slice(0, 60),
          action: 'UPDATE',
        });
        return data;
      } catch (error) {
        console.error('Error updating payment term:', error);
        throw error;
      }
    },
    [currentUserId]
  );

  const deletePaymentTerm = useCallback(
    async (id, userId = null) => {
      try {
        const toDelete = paymentTerms.find((t) => t.id === id);
        const { error } = await supabase.from('payment_terms').delete().eq('id', id);

        if (error) throw error;
        setPaymentTerms((prev) => prev.filter((item) => item.id !== id));
        logAudit({
          userId: userId || currentUserId,
          entityType: 'payment_terms',
          entityId: id,
          entityName: toDelete?.text?.slice(0, 60),
          action: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting payment term:', error);
        throw error;
      }
    },
    [paymentTerms, currentUserId]
  );

  useEffect(() => {
    fetchPaymentTerms();
  }, [fetchPaymentTerms]);

  const contextValue = useMemo(
    () => ({
      paymentTerms,
      loading,
      addPaymentTerm,
      updatePaymentTerm,
      deletePaymentTerm,
      fetchPaymentTerms,
    }),
    [paymentTerms, loading, addPaymentTerm, updatePaymentTerm, deletePaymentTerm, fetchPaymentTerms]
  );

  return (
    <PaymentTermsContext.Provider value={contextValue}>
      {children}
    </PaymentTermsContext.Provider>
  );
};

export const usePaymentTerms = () => {
  const context = useContext(PaymentTermsContext);
  if (!context) {
    throw new Error('usePaymentTerms must be used within a PaymentTermsProvider');
  }
  return context;
};

export { PaymentTermsContext, PaymentTermsProvider };
