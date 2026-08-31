'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { EditGroupAdminProfilePage } from '@/components/entity/EditEntityProfilePage';

export default function EditGroupProfileRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <EditGroupAdminProfilePage />
    </Suspense>
  );
}
