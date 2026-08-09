import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const SettingsContext = createContext();

const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [settings, setSettings] = useState({
    tax_cgst: 9,
    tax_sgst: 9,
    tax_igst: 18,
  });
  const [settingsMetadata, setSettingsMetadata] = useState({}); // Stores IDs and other metadata per key
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.from('app_settings').select('*');

      if (error) {
        console.warn('API Fetch Failed (settings), using defaults:', error);
        return;
      }

      if (data && data.length > 0) {
        const newSettings = {};
        const metadata = {};
        data.forEach((item) => {
          // Try to parse numbers, otherwise keep as string
          const numVal = Number(item.setting_value);
          newSettings[item.setting_key] = isNaN(numVal) ? item.setting_value : numVal;
          metadata[item.setting_key] = { id: item.id };
        });
        setSettings((prev) => ({ ...prev, ...newSettings }));
        setSettingsMetadata(metadata);
      }
    } catch (err) {
      console.error('Fetch Settings Exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(
    async (key, value, userId = null) => {
      // Optimistic update
      setSettings((prev) => ({ ...prev, [key]: value }));

      try {
        const payload = {
          setting_key: key,
          setting_value: String(value),
          updated_at: new Date().toISOString(),
        };

        // If we have an ID for this setting, include it to ensure upsert works correctly
        if (settingsMetadata[key]?.id) {
          payload.id = settingsMetadata[key].id;
        }

        const { data, error } = await apiClient
          .from('app_settings')
          .upsert(payload, { onConflict: 'setting_key' }) // Try onConflict as backup
          .select();

        if (error) {
          console.error(`Failed to update setting ${key}:`, error);
          // Re-fetch to revert if needed
          await fetchSettings();
          throw error;
        }

        // Update metadata with new ID if it was a new insertion
        if (data && data[0]) {
          setSettingsMetadata((prev) => ({
            ...prev,
            [key]: { id: data[0].id },
          }));
          logAudit({
            userId: userId || currentUserId,
            entityType: 'setting',
            entityId: data[0].id,
            entityName: key,
            action: 'UPDATE',
            details: { value },
          });
        }
      } catch (err) {
        console.error('Update Setting Exception:', err);
        throw err;
      }
    },
    [fetchSettings, settingsMetadata, currentUserId]
  );

  const fetchedRef = React.useRef(false);
  const ensureFetched = useCallback(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchSettings();
    }
  }, [fetchSettings]);

  const contextValue = useMemo(
    () => ({
      settings,
      updateSetting,
      loading,
      fetchSettings,
      ensureFetched,
    }),
    [settings, loading, updateSetting, fetchSettings, ensureFetched]
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  useEffect(() => {
    context.ensureFetched();
  }, [context]);
  return context;
};

export { SettingsContext, SettingsProvider, useSettings };
