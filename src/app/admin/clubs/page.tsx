'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';

export default function AdminClubsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-full bg-gray-50">
      
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Building2 className="w-10 h-10 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Clubs Management</h1>
            <p className="text-gray-600">Manage clubs and their members</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <p className="text-gray-600">Clubs management interface coming soon...</p>
        </div>
      </div>
    </div>
  );
}

