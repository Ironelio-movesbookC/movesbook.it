'use client';

import { useSearchParams } from 'next/navigation';
import type { MubRoleTemplate } from '@/lib/mub/types';
import MubPageClient from '@/components/mub/MubPageClient';

export default function MubStaffPageRouteClient() {
  const searchParams = useSearchParams();
  const role = (searchParams?.get('role') ?? 'SINGLE_USER').toUpperCase() as MubRoleTemplate;

  return (
    <div className="px-4 py-6">
      <MubPageClient mode="staff" staffRoleTemplate={role} />
    </div>
  );
}
