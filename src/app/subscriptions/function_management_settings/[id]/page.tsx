'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FunctionManagementSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/subscriptions/function_settings_mang/en');
  }, [router]);

  return null;
}
