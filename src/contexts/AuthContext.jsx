
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { sendTelegramNotification } from '@/lib/notifier';
import { ROLES } from '@/data/config';
import { STORAGE_KEYS } from '@/data/storageKeys';


const AuthContext = createContext();


const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const notifyLogin = useCallback(async (username, fullName) => {
        const message = `🔔 *Login Alert*\n\nUser: \`${fullName}\` (@${username})`;
        await sendTelegramNotification(message);
    }, []);

    const fetchRoles = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('app_roles').select('*').order('name');
            if (error) throw error;
            setRoles(data || []);
        } catch (error) {
            console.error("Failed to fetch roles", error);
        }
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
        fetchRoles();
        setLoading(false);
    }, [fetchRoles]);

    const login = useCallback(async (username, password) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select(`
                    *,
                    app_roles!role(role_slug, name),
                    departments!department(name)
                `)
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
                department: data.departments?.name || '', 
                role: data.app_roles?.role_slug || '' 
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

    const isSuperAdmin = useCallback(() => user?.role === ROLES.SUPER_ADMIN, [user?.role]);
    const isAdmin = useCallback(() => user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN, [user?.role]);
    const isStandard = useCallback(() => user?.role === ROLES.STANDARD, [user?.role]);

    const contextValue = useMemo(() => ({
        user,
        roles,
        loading,
        login,
        logout,
        isSuperAdmin,
        isAdmin,
        isStandard,
        refreshRoles: fetchRoles
    }), [user, roles, loading, login, logout, isSuperAdmin, isAdmin, isStandard, fetchRoles]);

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
