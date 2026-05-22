import { Suspense } from 'react';
import AdminUserSearchClient from './AdminUserSearchClient';

export const dynamic = 'force-dynamic';

export default function AdminUserSearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <AdminUserSearchClient />
    </Suspense>
  );
}
