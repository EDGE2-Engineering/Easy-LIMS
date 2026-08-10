import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
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

  const logout = useCallback(async () => {
    // Destroy the token server-side before clearing local state
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (_) { /* best-effort */ }
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
  }, []);

  const login = useCallback(
    async (username, password) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Invalid username or password');
        }

        const data = await response.json();

        // Store the API token
        if (data.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        }

        const userData = data.user || data;

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
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());

        // Send login notification
        notifyLogin(sessionUser.username, sessionUser.fullName);

        return sessionUser;
      } catch (err) {
        console.error('Login error:', err.message);
        throw err;
      }
    },
    [notifyLogin]
  );

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (storedToken) {
        try {
          // Verify token and fetch fresh user profile from API
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${storedToken}` },
          });

          if (!response.ok) {
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            setUser(null);
            if (response.status === 401) {
              toast({
                title: 'Session Expired',
                description: 'Your session has expired. Please log in again.',
                variant: 'destructive',
              });
            }
          } else {
            const userData = await response.json();
            if (userData && userData.is_active === false) {
              localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
              setUser(null);
              toast({
                title: 'Account Deactivated',
                description: 'Your account is no longer active.',
                variant: 'destructive',
              });
            } else {
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
              localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
            }
          }
        } catch (e) {
          console.error('Failed to verify session', e);
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          setUser(null);
        }
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        setUser(null);
      }
      setLoading(false);
    };
    verifySession();
  }, [toast]);

  // Synchronize token changes across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.AUTH_TOKEN && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Inactivity timeout logic (cross-tab synchronized via localStorage)
  useEffect(() => {
    if (!user) return;

    // Initialize/update last activity on mount/user change
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());

    const updateActivity = () => {
      const now = Date.now();
      const lastSaved = Number(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) || 0);
      if (now - lastSaved > 5000) {
        // Throttle writes to localStorage to at most once every 5 seconds
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
      }
    };

    const checkInactivity = () => {
      const lastActivity = Number(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) || 0);
      const now = Date.now();
      if (now - lastActivity >= INACTIVITY_TIMEOUT) {
        logout();
        toast({
          title: 'Session Timed Out',
          description: 'You have been logged out due to inactivity.',
          variant: 'destructive',
        });
      }
    };

    // Run the inactivity check every 5 seconds
    const intervalId = setInterval(checkInactivity, 5000);

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
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
