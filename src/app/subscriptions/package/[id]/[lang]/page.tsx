'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import PackageSettingsPanel from '@/components/admin/subscriptions/PackageSettingsPanel';
import { getPackageSettingsView } from '@/lib/admin/packageSettingsMock';
import type { PackageTypeId } from '@/types/adminPackageSettings';

const VALID_USER_TYPE_IDS: PackageTypeId[] = [5, 6, 7, 8, 9];

function isUserTypeId(id: number): id is PackageTypeId {
  return VALID_USER_TYPE_IDS.includes(id as PackageTypeId);
}

function PackageSettingsPageContent() {
  const params = useParams<{ id: string; lang: string }>();
  const userTypeId = Number(params?.id ?? '5');
  const lang = params?.lang ?? 'en';

  if (!isUserTypeId(userTypeId)) {
    return (
      <div className="p-6 text-gray-600">
        Invalid user type id {params?.id}. Expected 5–9.
      </div>
    );
  }

  const data = getPackageSettingsView(userTypeId, lang);

  if (!data) {
    return <div className="p-6 text-gray-600">Package settings not found.</div>;
  }

  return (
    <PackageSettingsPanel key={`${userTypeId}-${lang}`} initialData={data} />
  );
}

export default function PackageSettingsPage() {
  return (
    <Suspense fallback={null}>
      <PackageSettingsPageContent />
    </Suspense>
  );
}
