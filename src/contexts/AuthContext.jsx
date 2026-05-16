
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { sendTelegramNotification } from '@/lib/notifier';
import { ROLES, DEPARTMENTS } from '@/data/config';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { useToast } from '@/components/ui/use-toast';


const AuthContext = createContext();


const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

    const notifyLogin = useCallback(async (username, fullName) => {
        const message = `🔔 *Login Alert*\n\nUser: \`${fullName}\` (@${username})`;
        await sendTelegramNotification(message);
    }, []);


    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
    }, []);

    const login = useCallback(async (username, password) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .eq('is_active', true)
                .maybeSingle();

            if (error || !data) {
                throw new Error("Invalid username or password");
            }

            // departments is stored as a JSONB array of dept IDs on the users row
            const deptIds = Array.isArray(data.departments) ? data.departments : [];
            const deptNames = deptIds
                .map(id => DEPARTMENTS.find(d => d.id === id)?.name)
                .filter(Boolean);

            const sessionUser = {
                id: data.id,
                username: data.username,
                fullName: data.full_name,
                emp_id: data.employee_id,
                departments: deptNames,
                role: data.role || ''
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

    useEffect(() => {
        const verifySession = async () => {
            const storedUser = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    // Verify if user is still active in DB
                    const { data, error } = await supabase
                        .from('users')
                        .select('is_active')
                        .eq('id', parsedUser.id)
                        .maybeSingle();

                    if (error || !data || !data.is_active) {
                        localStorage.removeItem(STORAGE_KEYS.SESSION);
                        setUser(null);
                        if (data && !data.is_active) {
                             toast({
                                title: "Account Deactivated",
                                description: "Your account is no longer active.",
                                variant: "destructive",
                            });
                        }
                    } else {
                        setUser(parsedUser);
                    }
                } catch (e) {
                    console.error("Failed to parse stored user", e);
                    localStorage.removeItem(STORAGE_KEYS.SESSION);
                }
            }
            setLoading(false);
        };
        verifySession();
    }, [toast]);

    // Real-time status check
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`user-status-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.new && payload.new.is_active === false) {
                        logout();
                        toast({
                            title: "Account Deactivated",
                            description: "Your account has been deactivated. You have been logged out.",
                            variant: "destructive",
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, logout, toast]);

    // Inactivity timeout logic
    useEffect(() => {
        let timeoutId;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (user) {
                timeoutId = setTimeout(() => {
                    logout();
                    toast({
                        title: "Session Timed Out",
                        description: "You have been logged out due to inactivity.",
                        variant: "destructive",
                    });
                }, INACTIVITY_TIMEOUT);
            }
        };

        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        if (user) {
            resetTimer();
            activityEvents.forEach(event => {
                window.addEventListener(event, resetTimer);
            });
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user, logout, toast, INACTIVITY_TIMEOUT]);

    const isSuperAdmin = useCallback(() => user?.role === ROLES.SUPER_ADMIN.slug, [user?.role]);
    const isAdmin = useCallback(() => user?.role === ROLES.ADMIN.slug || user?.role === ROLES.SUPER_ADMIN.slug, [user?.role]);
    const isStandard = useCallback(() => user?.role === ROLES.TECHNICIAN.slug, [user?.role]);

    const contextValue = useMemo(() => ({
        user,
        roles: ROLES,
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
