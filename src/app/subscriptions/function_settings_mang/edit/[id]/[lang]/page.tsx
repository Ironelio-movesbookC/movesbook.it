'use client';

import { useParams } from 'next/navigation';
import FunctionManagementEditPanel from '@/components/admin/subscriptions/FunctionManagementEditPanel';
import { getManagementFeatureEditData } from '@/lib/admin/managementFunctionSettingsMock';

export default function FunctionManagementEditPage() {
  const params = useParams<{ id: string; lang: string }>();
  const featureId = Number(params?.id ?? '0');
  const lang = params?.lang ?? 'en';
  const data = getManagementFeatureEditData(lang, featureId);

  if (!data) {
    return (
      <div className="p-6 text-gray-600">
        Management feature not found for id {params?.id}.
      </div>
    );
  }

  return <FunctionManagementEditPanel initialData={data} />;
}
