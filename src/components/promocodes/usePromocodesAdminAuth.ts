'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function usePromocodesAdminAuth() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    setReady(true);
  }, [router]);

  return ready;
}

export async function promocodesFetch(path: string, init?: RequestInit) {
  const { getAdminBearerToken } = await import('@/lib/admin/clientAdminAuth');
  const token = getAdminBearerToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(path, { ...init, headers });
}
