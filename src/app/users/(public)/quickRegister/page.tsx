'use client';

import { Suspense } from 'react';
import QuickRegisterForm from '@/components/users/QuickRegisterForm';

export default function QuickRegisterPage() {
  return (
    <Suspense fallback={<div className="quickregistration">Loading…</div>}>
      <QuickRegisterForm />
    </Suspense>
  );
}
