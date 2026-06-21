import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { sendTelegramNotification } from '@/lib/notifier';
import { ROLES, DEPARTMENTS } from '@/data/config';
import { STORAGE_KEYS } from '@/data/storageKeys';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
    localStorage.removeItem('accessToken');
  }, []);

  const login = useCallback(
    async (username, password) => {
      try {
        const data = await apiClient.post('/api/auth/login', { username, password });

        const { access_token, user: userData } = data;

        localStorage.setItem('accessToken', access_token);

        // departments is stored as a JSONB array of dept IDs on the users row
        const deptIds = Array.isArray(userData.departments) ? userData.departments : [];
        const deptNames = deptIds
          .map((id) => DEPARTMENTS.find((d) => d.id === id)?.name)
          .filter(Boolean);

        const sessionUser = {
          id: userData.id,
          username: userData.username,
          fullName: userData.full_name,
          emp_id: userData.employee_id,
          departments: deptNames,
          role: userData.role || '',
        };

        setUser(sessionUser);
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionUser));

        // Send login notification
        notifyLogin(sessionUser.username, sessionUser.fullName);

        return sessionUser;
      } catch (err) {
        console.error('Login error:', err.message);
        throw new Error(err.message || 'Invalid username or password');
      }
    },
    [notifyLogin]
  );

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        try {
          // Verify token with backend
          const userData = await apiClient.get('/api/auth/me');

          const deptIds = Array.isArray(userData.departments) ? userData.departments : [];
          const deptNames = deptIds
            .map((id) => DEPARTMENTS.find((d) => d.id === id)?.name)
            .filter(Boolean);

          const sessionUser = {
            id: userData.id,
            username: userData.username,
            fullName: userData.full_name,
            emp_id: userData.employee_id,
            departments: deptNames,
            role: userData.role || '',
          };

          setUser(sessionUser);
          localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionUser));
        } catch (e) {
          console.error('Failed to verify session', e);
          logout();
          toast({
            title: 'Session Expired',
            description: 'Your session has expired or your account was deactivated.',
            variant: 'destructive',
          });
        }
      }
      setLoading(false);
    };
    verifySession();
  }, [logout, toast]);

  // Inactivity timeout logic
  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(() => {
          logout();
          toast({
            title: 'Session Timed Out',
            description: 'You have been logged out due to inactivity.',
            variant: 'destructive',
          });
        }, INACTIVITY_TIMEOUT);
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    if (user) {
      resetTimer();
      activityEvents.forEach((event) => {
        window.addEventListener(event, resetTimer);
      });
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, logout, toast, INACTIVITY_TIMEOUT]);

  const isSuperAdmin = useCallback(() => user?.role === ROLES.SUPER_ADMIN.slug, [user?.role]);
  const isAdmin = useCallback(
    () => user?.role === ROLES.ADMIN.slug || user?.role === ROLES.SUPER_ADMIN.slug,
    [user?.role]
  );
  const isStandard = useCallback(() => user?.role === ROLES.TECHNICIAN.slug, [user?.role]);

  const contextValue = useMemo(
    () => ({
      user,
      roles: ROLES,
      loading,
      login,
      logout,
      isSuperAdmin,
      isAdmin,
      isStandard,
    }),
    [user, loading, login, logout, isSuperAdmin, isAdmin, isStandard]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext, AuthProvider, useAuth };
