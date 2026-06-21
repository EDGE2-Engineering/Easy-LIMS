import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const SettingsContext = createContext();

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

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
      const data = await apiClient.get('/api/app-settings');

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

        let data;
        if (settingsMetadata[key]?.id) {
          payload.id = settingsMetadata[key].id;
          data = await apiClient.put(`/api/app-settings/${payload.id}`, payload);
        } else {
          data = await apiClient.post('/api/app-settings', payload);
        }

        if (data) {
          setSettingsMetadata((prev) => ({
            ...prev,
            [key]: { id: data.id },
          }));
          logAudit({
            userId: userId || currentUserId,
            entityType: 'setting',
            entityId: data.id,
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

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const contextValue = useMemo(
    () => ({
      settings,
      updateSetting,
      loading,
      fetchSettings,
    }),
    [settings, loading, updateSetting, fetchSettings]
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};
export { SettingsContext, SettingsProvider, useSettings };
