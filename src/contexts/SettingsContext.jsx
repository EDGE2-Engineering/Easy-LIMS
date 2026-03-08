
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { useAuth } from '@/contexts/AuthContext';
import { DB_TYPES } from '@/config';

const SettingsContext = createContext();

const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

const SettingsProvider = ({ children }) => {
    const { idToken, isAuthenticated, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState({
        tax_cgst: 9,
        tax_sgst: 9
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.APP_SETTING, idToken);
            if (data && data.length > 0) {
                const newSettings = {};
                data.forEach(item => {
                    const numVal = Number(item.setting_value);
                    newSettings[item.setting_key] = isNaN(numVal) ? item.setting_value : numVal;
                });
                setSettings(prev => ({ ...prev, ...newSettings }));
            }
        } catch (err) {
            console.error("Fetch Settings Exception from DynamoDB:", err);
        } finally {
            setLoading(false);
        }
    }, [idToken]);

    const updateSetting = useCallback(async (key, value) => {
        if (!idToken) throw new Error("User not authenticated");
        setSettings(prev => ({ ...prev, [key]: value }));

        try {
            const payload = {
                id: `setting_${key}`,
                setting_key: key,
                setting_value: String(value)
            };
            await dynamoGenericApi.save(DB_TYPES.APP_SETTING, payload, idToken);
        } catch (err) {
            console.error("Update Setting Exception in DynamoDB:", err);
            await fetchSettings();
            throw err;
        }
    }, [idToken, fetchSettings]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchSettings();
        } else if (!authLoading && !isAuthenticated) {
            setSettings({ tax_cgst: 9, tax_sgst: 9 });
            setLoading(false);
        }
    }, [fetchSettings, authLoading, isAuthenticated]);

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
