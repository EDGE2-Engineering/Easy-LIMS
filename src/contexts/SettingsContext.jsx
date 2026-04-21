import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const SettingsContext = createContext();

const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        tax_cgst: 9,
        tax_sgst: 9
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*');

            if (error) {
                console.warn("Supabase Fetch Failed (settings), using defaults:", error);
                return;
            }

            if (data && data.length > 0) {
                const newSettings = {};
                data.forEach(item => {
                    // Try to parse numbers, otherwise keep as string
                    const numVal = Number(item.setting_value);
                    newSettings[item.setting_key] = isNaN(numVal) ? item.setting_value : numVal;
                });
                setSettings(prev => ({ ...prev, ...newSettings }));
            }
        } catch (err) {
            console.error("Fetch Settings Exception:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSetting = useCallback(async (key, value) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: value }));

        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    setting_key: key,
                    setting_value: String(value),
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error(`Failed to update setting ${key}:`, error);
                // Re-fetch to revert if needed, or implement proper revert logic
                await fetchSettings();
                throw error;
            }
        } catch (err) {
            console.error("Update Setting Exception:", err);
            throw err;
        }
    }, [fetchSettings]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const contextValue = useMemo(() => ({
        settings,
        updateSetting,
        loading,
        fetchSettings
    }), [settings, loading, updateSetting, fetchSettings]);

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
};
export { SettingsContext, SettingsProvider, useSettings };
