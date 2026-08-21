'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import PackageEditPanel from '@/components/admin/subscriptions/PackageEditPanel';
import { getPackageItemEditData } from '@/lib/admin/packageSettingsMock';
import type { PackageTypeId } from '@/types/adminPackageSettings';

const VALID_USER_TYPE_IDS: PackageTypeId[] = [5, 6, 7, 8, 9];

function isUserTypeId(id: number): id is PackageTypeId {
  return VALID_USER_TYPE_IDS.includes(id as PackageTypeId);
}

function PackageEditPageContent() {
  const params = useParams<{ id: string; lang: string }>();
  const searchParams = useSearchParams();
  const itemId = Number(params?.id ?? '0');
  const lang = params?.lang ?? 'en';
  const userTypeId = Number(searchParams?.get('userType') ?? '5');

  if (!isUserTypeId(userTypeId)) {
    return <div className="p-6 text-gray-600">Invalid user type id.</div>;
  }

  const data = getPackageItemEditData(userTypeId, itemId, lang);

  if (!data) {
    return <div className="p-6 text-gray-600">Package not found for id {params?.id}.</div>;
  }

  return <PackageEditPanel key={`${userTypeId}-${itemId}-${lang}`} initialData={data} />;
}

export default function PackageEditPage() {
  return (
    <Suspense fallback={null}>
      <PackageEditPageContent />
    </Suspense>
  );
}
