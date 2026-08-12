import { Suspense } from 'react';
import MubPageRoute from './MubPageRouteClient';

export default function MubPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-sm text-gray-600">Loading…</div>}>
      <MubPageRoute />
    </Suspense>
  );
}
