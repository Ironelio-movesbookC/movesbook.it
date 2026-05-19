'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminNavUserSearchResults from '@/components/admin/AdminNavUserSearchResults';
import { isNavSearchScope, type NavSearchScope } from '@/lib/adminNavUserSearchScope';

export default function AdminUserSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  const scopeParam = searchParams?.get('scope') ?? 'all';
  const scope: NavSearchScope = isNavSearchScope(scopeParam) ? scopeParam : 'all';
  const query = searchParams?.get('q') ?? '';

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return null;

  return <AdminNavUserSearchResults initialScope={scope} initialQuery={query} />;
}
