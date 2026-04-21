
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { sendTelegramNotification } from '@/lib/notifier';
import { ROLES } from '@/data/config';
import { STORAGE_KEYS } from '@/data/storageKeys';


const AuthContext = createContext();


const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const notifyLogin = useCallback(async (username, fullName) => {
        const message = `🔔 *Login Alert*\n\nUser: \`${fullName}\` (@${username})`;
        await sendTelegramNotification(message);
    }, []);

    useEffect(() => {
        // Check for existing session in localStorage
        const storedUser = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem(STORAGE_KEYS.SESSION);
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (username, password) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                throw new Error("Invalid username or password");
            }

            const sessionUser = {
                id: data.id,
                username: data.username,
                fullName: data.full_name,
                department: data.department,
                role: data.role
            };

            setUser(sessionUser);
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionUser));

            // Send login notification
            notifyLogin(sessionUser.username, sessionUser.fullName);

            return sessionUser;
        } catch (err) {
            console.error("Login error:", err.message);
            throw err;
        }
    }, [notifyLogin]);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
    }, []);

    const isSuperAdmin = useCallback(() => user?.role === 'super_admin', [user?.role]);
    const isAdmin = useCallback(() => user?.role === ROLES.ADMIN || user?.role === 'super_admin', [user?.role]);
    const isStandard = useCallback(() => user?.role === 'standard', [user?.role]);

    const contextValue = useMemo(() => ({
        user,
        loading,
        login,
        logout,
        isSuperAdmin,
        isAdmin,
        isStandard
    }), [user, loading, login, logout, isSuperAdmin, isAdmin, isStandard]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export { AuthContext, AuthProvider, useAuth };
