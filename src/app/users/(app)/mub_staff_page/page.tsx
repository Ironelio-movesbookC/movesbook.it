import { Suspense } from 'react';
import MubStaffPageRouteClient from './MubStaffPageRouteClient';

export default function MubStaffPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-sm text-gray-600">Loading…</div>}>
      <MubStaffPageRouteClient />
    </Suspense>
  );
}
