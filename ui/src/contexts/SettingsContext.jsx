import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { logAudit } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_SETTINGS = {
  tax_cgst: 9,
  tax_sgst: 9,
  tax_igst: 18,
  compaction_light_mould_empty_weight: 3989,
  compaction_heavy_small_mould_empty_weight: 3989,
  compaction_heavy_big_mould_empty_weight: 5774,
  smtp_campaign_email: '',
  smtp_campaign_password: '',
  smtp_campaign_sender_name: '',
  smtp_campaign_host: 'smtp.gmail.com',
  smtp_campaign_port: 587,
  smtp_campaign_security: 'tls',
  smtp_campaign_enabled: 'true',
  smtp_report_email: '',
  smtp_report_password: '',
  smtp_report_sender_name: '',
  smtp_report_host: 'smtp.gmail.com',
  smtp_report_port: 587,
  smtp_report_security: 'tls',
  smtp_report_reply_to: '',
  smtp_report_enabled: 'true',
};

const getInitialSettings = () => {
  try {
    const cached = localStorage.getItem('easy_lims_settings_cache');
    if (cached) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_SETTINGS;
};

const SettingsContext = createContext();

const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [settings, setSettings] = useState(getInitialSettings);
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
        setSettings((prev) => {
          const merged = { ...prev, ...newSettings };
          try {
            localStorage.setItem('easy_lims_settings_cache', JSON.stringify(merged));
          } catch (e) {
            // ignore
          }
          return merged;
        });
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
      setSettings((prev) => {
        const updated = { ...prev, [key]: value };
        try {
          localStorage.setItem('easy_lims_settings_cache', JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
        return updated;
      });

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
