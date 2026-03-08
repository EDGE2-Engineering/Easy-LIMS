
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useAuth as useOidcAuth } from "react-oidc-context";
import { cognitoAuth } from '@/lib/cognitoAuth';
import { sendTelegramNotification } from '@/lib/notifier';
import { cognitoConfig } from '@/config';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { DB_TYPES } from '@/config';
import { DEPARTMENTS } from '@/config';

const AuthContext = createContext();


const AuthProvider = ({ children }) => {
    const auth = useOidcAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasSynced = React.useRef(false); // Ref to prevent multiple syncs per login

    const notifyLogin = useCallback(async (username, fullName) => {
        const message = `🔔 *Login Alert*\n\nUser: \`${fullName}\` (@${username})`;
        await sendTelegramNotification(message);
    }, []);

    const syncUserToDb = useCallback(async (userData, token) => {
        try {
            // Check if user already exists
            const existingUser = await dynamoGenericApi.getById(userData.id, token);
            if (existingUser) {
                console.log('AuthContext: User already exists in database, skipping creation.');
                return;
            }

            let department = DEPARTMENTS.ACCOUNTS;
            if (userData.role === 'admin' || userData.role === 'superadmin' || userData.role === 'super_admin' || userData.role === 'administrator') {
                department = DEPARTMENTS.ALL;
            }else{
                department = userData.department;
            }

            console.log('AuthContext: Creating new user record in database...');
            const newUser = {
                id: userData.id,
                username: userData.username,
                full_name: userData.full_name,
                created_at: new Date().toISOString(),
                created_by: userData.id,
                role: userData.role,
                department: department,
                is_active: true,
                type: 'user'
            };

            await dynamoGenericApi.save(DB_TYPES.USER, newUser, token);
            console.log('AuthContext: User record created successfully.');
        } catch (error) {
            console.error('Failed to sync user to database:', error);
        }
    }, []);

    // Sync OIDC auth state to our internal user state
    useEffect(() => {
        const justLoggedOut = localStorage.getItem('edge2_just_logged_out') === 'true';

        // Skip syncing if we just logged out AND the OIDC lib still thinks we are authenticated
        // This prevents the auto-login loop if Cognito's session is still briefly active
        if (justLoggedOut && auth.isAuthenticated) {
            console.log('AuthContext: Logout flag active and authenticated. Delaying sync...');
            setLoading(false);
            return;
        }

        // If we are definitely NOT authenticated anymore, it's safe to clear the flag
        if (!auth.isAuthenticated && justLoggedOut) {
            console.log('AuthContext: Session cleared, removing logout flag.');
            localStorage.removeItem('edge2_just_logged_out');
        }

        if (auth.isAuthenticated && auth.user) {
            const session = cognitoAuth.getSession(auth);
            if (session) {
                // console.log('AuthContext: Session:', { session });
                // Use a stable identifier (ID) to check if we actually need to update user
                if (!user || user.id !== session.user.id) {
                    // Only notify/sync if we haven't synced for THIS specific user ID yet
                    if (!hasSynced.current || hasSynced.current !== session.user.id) {
                        notifyLogin(session.user.username, session.user.full_name);
                        syncUserToDb(session.user, session.idToken);
                        hasSynced.current = session.user.id;
                    }

                    setUser({
                        ...session.user,
                        idToken: session.idToken,
                        accessToken: auth.user.access_token
                    });
                }
            }
        } else if (!auth.isLoading && !auth.isAuthenticated) {
            if (user) setUser(null);
            hasSynced.current = false;
        }

        // Only update loading if it has actually changed
        if (loading !== auth.isLoading) {
            setLoading(auth.isLoading);
        }
    }, [auth.isAuthenticated, auth.user, auth.isLoading, user, notifyLogin, loading]);

    const login = useCallback(async () => {
        await auth.signinRedirect();
    }, [auth]);

    const logout = useCallback(async () => {
        try {
            setUser(null);
            localStorage.setItem('edge2_just_logged_out', 'true');
            
            // Clear OIDC storage
            await auth.removeUser();
            
            // Ensure session storage is also cleared (oidc-client-ts often uses both)
            sessionStorage.clear();
            
            // Construct and redirect to Cognito logout
            const logoutUrl = cognitoConfig.getLogoutUrl();
            console.log('AuthContext: Logging out via:', logoutUrl);
            window.location.href = logoutUrl;
        } catch (error) {
            console.error('Logout failed:', error);
            // Fallback: reload the page
            window.location.href = '/';
        }
    }, [auth]);

    const isSuperAdmin = useCallback(() => {
        const role = user?.role?.toLowerCase();
        return role === 'superadmin' || role === 'super_admin';
    }, [user?.role]);

    const isAdmin = useCallback(() => {
        const role = user?.role?.toLowerCase();
        const result = role === 'admin' || role === 'superadmin' || role === 'super_admin' || role === 'administrator';
        // console.log(user)
        // console.log('AuthContext: isAdmin check:', { role, result });
        return result;
    }, [user?.role]);

    const isStandard = useCallback(() => {
        const role = user?.role?.toLowerCase();
        return role === 'standard' || !role;
    }, [user?.role]);

    const contextValue = useMemo(() => ({
        user,
        loading,
        login,
        logout,
        isSuperAdmin,
        isAdmin,
        isStandard,
        idToken: user?.idToken, // Expose idToken for DynamoDB APIs
        accessToken: user?.accessToken, // Expose accessToken for Cognito APIs
        isAuthenticated: !!user,
        auth // Expose raw auth object if needed
    }), [user, loading, login, logout, isSuperAdmin, isAdmin, isStandard, auth]);

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
