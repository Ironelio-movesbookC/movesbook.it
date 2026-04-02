import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPathForUserType } from '@/utils/dashboardRouting';

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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

  const login = (token: string, userData: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
    }
    setUser(userData);
    setShowLoginModal(false);
    
    // Redirect based on user type to category-specific dashboards
    if (userData.userType === 'ADMIN') {
      if (redirectAfterLogin) {
        router.push(redirectAfterLogin);
        setRedirectAfterLogin(null);
      } else {
        router.push(getDashboardPathForUserType(userData.userType));
      }
    } else {
      router.push(getDashboardPathForUserType(userData.userType));
    }
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
