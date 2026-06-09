'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForUserType } from '@/utils/dashboardRouting';
import { 
  User, 
  LogOut, 
  Settings, 
  ChevronDown,
  User as UserIcon
} from 'lucide-react';

export default function UserLoginDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = () => {
    setIsOpen(false);
    router.push('/login');
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const handleProfile = () => {
    setIsOpen(false);
    if (user?.userType) {
      router.push(getDashboardPathForUserType(user.userType));
    } else {
      router.push('/my-page');
    }
  };

  const handleSettings = () => {
    setIsOpen(false);
    router.push('/settings');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          {isAuthenticated ? (
            <UserIcon className="w-4 h-4 text-white" />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {isAuthenticated ? (
            // Authenticated User Menu
            <>
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-blue-600 font-medium capitalize mt-1">
                  {user?.userType?.toLowerCase().replace('_', ' ')}
                </p>
              </div>

              {/* Menu Items */}
              <button
                onClick={handleProfile}
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4 mr-3" />
                My Profile
              </button>

              <button
                onClick={handleSettings}
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </button>
            </>
          ) : (
            // Guest User Menu
            <>
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">
                  Welcome Guest
                </p>
                <p className="text-xs text-gray-500">
                  Sign in to access your account
                </p>
              </div>

              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center px-4 py-3 text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <User className="w-4 h-4 mr-2" />
                Sign In
              </button>

              <div className="px-4 py-2 text-center">
                <p className="text-xs text-gray-500">
                  Don't have an account?{' '}
                  <button
                    onClick={() => router.push('/register')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}