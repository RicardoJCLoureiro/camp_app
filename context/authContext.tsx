// context/authContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/utils/api';

export interface UserProfile {
  userId: number;
  firstName: string;
  lastName: string;
  image: string;
  email: string;
}

export interface TopEntity {
  id: number;
  name: string;
}

export interface UserAccess {
  moduleID: number;
  moduleName: string;
  componentID: number;
  componentName: string;
  permissionID: number;
  permissionCode: 'CREATE' | 'READ' | 'EDIT' | 'DELETE' | 'LIST';
  permissionName: string;
}

interface AuthContextType {
  loading: boolean;
  loaded: boolean;
  user: UserProfile | null;
  topEntity: TopEntity | null;
  roles: string[];
  access: UserAccess[];
  expiresAt: number;
  onLogin: (
    user: UserProfile,
    topEntity: TopEntity | null,
    roles: string[],
    access: UserAccess[],
    expiresInSec: number
  ) => void;
  refreshAccessToken: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

type RefreshResponse = {
  user: {
    userId: number;
    email: string;
    name: string;
    profilePictureUrl?: string | null;
    roles: string[];
  };
  expires: string;
};

const splitName = (full: string) => {
  const parts = (full || '').trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const api = useApi();

  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [topEntity, setTopEntity] = useState<TopEntity | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [access, setAccess] = useState<UserAccess[]>([]);
  const [expiresAt, setExpiresAt] = useState<number>(0);

  // Utility to safely parse JSON
  const safeParse = <T,>(item: string | null, defaultValue: T): T => {
    if (!item) return defaultValue;
    try {
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  };

  useEffect(() => {
    // Rehydrate from sessionStorage
    const su = safeParse<UserProfile | null>(sessionStorage.getItem('user'), null);
    const ste = safeParse<TopEntity | null>(sessionStorage.getItem('topEntity'), null);
    const sr = safeParse<string[]>(sessionStorage.getItem('roles'), []);
    const sa = safeParse<UserAccess[]>(sessionStorage.getItem('access'), []);
    const se = Number(sessionStorage.getItem('expiresAt') || '0');

    if (su && se > Date.now()) {
      setUser(su);
      setTopEntity(ste);
      setRoles(sr);
      setAccess(sa);
      setExpiresAt(se);
    } else {
      sessionStorage.clear();
    }

    // Silent refresh and load current user (new API returns user + expires)
    (async () => {
      try {
        const jwtRes = await api.post<RefreshResponse>('/auth/refresh');
        const u = jwtRes.data.user;
        const { firstName, lastName } = splitName(u.name);
        const profile: UserProfile = {
          userId: u.userId,
          firstName,
          lastName,
          image: u.profilePictureUrl || '',
          email: u.email,
        };

        const newExp = new Date(jwtRes.data.expires).getTime();
        setUser(profile);
        setTopEntity(null);      // no longer provided by backend
        setRoles(u.roles || []);
        setAccess([]);           // no longer provided by backend
        setExpiresAt(newExp);

        sessionStorage.setItem('user', JSON.stringify(profile));
        sessionStorage.setItem('topEntity', JSON.stringify(null));
        sessionStorage.setItem('roles', JSON.stringify(u.roles || []));
        sessionStorage.setItem('access', JSON.stringify([]));
        sessionStorage.setItem('expiresAt', newExp.toString());
      } catch {
        sessionStorage.clear();
        setUser(null);
        setTopEntity(null);
        setRoles([]);
        setAccess([]);
        setExpiresAt(0);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    })();
  }, [api]);

  const onLogin = (
    u: UserProfile,
    te: TopEntity | null,
    r: string[],
    ac: UserAccess[],
    expiresInSec: number
  ) => {
    const expiry = Date.now() + expiresInSec * 1000;

    setUser(u);
    setTopEntity(te);
    setRoles(r);
    setAccess(ac);
    setExpiresAt(expiry);

    sessionStorage.setItem('user', JSON.stringify(u));
    sessionStorage.setItem('topEntity', JSON.stringify(te));
    sessionStorage.setItem('roles', JSON.stringify(r));
    sessionStorage.setItem('access', JSON.stringify(ac));
    sessionStorage.setItem('expiresAt', expiry.toString());
  };

  const refreshAccessToken = async () => {
    if (!user) return;

    try {
      const jwtRes = await api.post<RefreshResponse>('/auth/refresh');
      const u = jwtRes.data.user;
      const { firstName, lastName } = splitName(u.name);
      const profile: UserProfile = {
        userId: u.userId,
        firstName,
        lastName,
        image: u.profilePictureUrl || '',
        email: u.email,
      };

      const newExp = new Date(jwtRes.data.expires).getTime();

      setUser(profile);
      setTopEntity(null);
      setRoles(u.roles || []);
      setAccess([]);
      setExpiresAt(newExp);

      sessionStorage.setItem('user', JSON.stringify(profile));
      sessionStorage.setItem('topEntity', JSON.stringify(null));
      sessionStorage.setItem('roles', JSON.stringify(u.roles || []));
      sessionStorage.setItem('access', JSON.stringify([]));
      sessionStorage.setItem('expiresAt', newExp.toString());

      toast.info(t('sessionRefreshed'));
    } catch {
      // ignore
    }
  };

  const performLogout = async (reason: 'expiry' | 'inactivity') => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* silent */
    } finally {
      sessionStorage.clear();
      setUser(null);
      setTopEntity(null);
      setRoles([]);
      setAccess([]);
      setExpiresAt(0);

      // Cross-tab: notify other tabs to logout
      try { localStorage.setItem('myb4y:logout', String(Date.now())); } catch {}

      toast.info(
        reason === 'inactivity'
          ? t('sessionWarningModal.inactivityToast')
          : t('sessionWarningModal.expiredToast')
      );
      router.push('/');
    }
  };

  const logout = () => performLogout('inactivity');

  // Enforce server-side expiry: logout exactly when the backend says so
  useEffect(() => {
    if (!expiresAt) return;

    if (expiresAt <= Date.now()) {
      performLogout('expiry');
      return;
    }

    const ms = Math.max(0, expiresAt - Date.now());
    const timer = window.setTimeout(() => performLogout('expiry'), ms);
    return () => clearTimeout(timer);
  }, [expiresAt]); // re-schedule whenever the server updates expiry

  return (
    <AuthContext.Provider
      value={{
        loading,
        loaded,
        user,
        topEntity,
        roles,
        access,
        expiresAt,
        onLogin,
        refreshAccessToken,
        logout,
      }}
    >
      {children}
      {/* Removed IdleTimeoutModal here to avoid duplicate modals.
          The modal is now owned/controlled by app/dashboard/IdleClient.tsx */}
    </AuthContext.Provider>
  );
};