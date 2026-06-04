import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPathForUserType } from '@/utils/dashboardRouting';
import {
  clearEntityDirectAccessLock,
  setEntityDirectAccessLock,
} from '@/lib/entity/entityDirectAccessSession';
import type { EntityDirectAccessKind } from '@/lib/entity/entityDirectAccessMeta';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  userType: string;
  country?: string | null;
  image?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(null);
  const router = useRouter();

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        void fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => undefined);
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      clearEntityDirectAccessLock();
    }
    setUser(null);
    router.push('/');
  }, [router]);

  const checkAuth = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = (
    token: string,
    userData: AuthUser,
    redirectPath?: string | null,
    options?: {
      entityAccessMode?: string;
      entityKind?: EntityDirectAccessKind;
      entityId?: string;
      /** @deprecated Use entityAccessMode + entityKind + entityId */
      clubAccessMode?: string;
      clubId?: string;
    },
  ) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      const mode = options?.entityAccessMode ?? options?.clubAccessMode;
      const kind = options?.entityKind ?? (options?.clubId ? 'club' : undefined);
      const entityId = options?.entityId ?? options?.clubId;
      if (mode === 'direct-access-only' && kind && entityId) {
        setEntityDirectAccessLock(kind, entityId);
      } else {
        clearEntityDirectAccessLock();
      }
    }
    setUser(userData);
    setShowLoginModal(false);

    let destination = redirectPath?.trim() || null;
    if (!destination && userData.userType === 'ADMIN' && redirectAfterLogin) {
      destination = redirectAfterLogin;
      setRedirectAfterLogin(null);
    }
    if (!destination) {
      destination = getDashboardPathForUserType(userData.userType);
    }

    router.push(destination);
  };

  const requireAuth = (redirectPath: string) => {
    if (!user) {
      setRedirectAfterLogin(redirectPath);
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  return {
    user,
    loading,
    login,
    logout,
    showLoginModal,
    setShowLoginModal,
    requireAuth,
    redirectAfterLogin,
    isAuthenticated: !!user
  };
}
