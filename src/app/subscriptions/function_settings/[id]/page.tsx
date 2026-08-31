'use client';

import { useParams } from 'next/navigation';
import FunctionSettingsPanel from '@/components/admin/subscriptions/FunctionSettingsPanel';
import { getFunctionSettingsData } from '@/lib/admin/functionSettingsMock';

export default function FunctionSettingsPage() {
  const params = useParams<{ id: string }>();
  const functionId = Number(params?.id ?? '1');
  const data = getFunctionSettingsData('social', functionId);

  if (!data) {
    return (
      <div className="p-6 text-gray-600">
        Function not found for id {params?.id}.
      </div>
    );
  }

  return (
    <FunctionSettingsPanel
      tab="social"
      functionId={functionId}
      initialData={data}
      leftSidebarTitle="Actual Function and procedures"
    />
  );
}
