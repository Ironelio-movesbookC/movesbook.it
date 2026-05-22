import { Suspense } from 'react';
import AdminUserSearchClient from './AdminUserSearchClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminUserSearchClient />
    </Suspense>
  );
}