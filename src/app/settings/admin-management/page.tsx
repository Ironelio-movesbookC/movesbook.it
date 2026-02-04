'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import ModernNavbar from '@/components/ModernNavbar';
import ModernFooter from '@/components/ModernFooter';
import AdminManagement from '@/components/settings/AdminManagement';
import { useAuth } from '@/hooks/useAuth';

export default function AdminManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (adminData) {
      try {
        JSON.parse(adminData);
        setIsAdmin(true);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminToken');
        router.push('/');
      }
    }
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const isAuthed = !!user || isAdmin;
    const isActuallyAdmin = isAdmin || user?.userType === 'ADMIN';
    if (!isAuthed || !isActuallyAdmin) router.push('/');
  }, [loading, user, isAdmin, router]);

  if (loading || (!user && !isAdmin)) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {isAdmin ? <AdminNavbar /> : <ModernNavbar />}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 transition-colors">
          <AdminManagement />
        </div>
      </div>
      <ModernFooter />
    </div>
  );
}

