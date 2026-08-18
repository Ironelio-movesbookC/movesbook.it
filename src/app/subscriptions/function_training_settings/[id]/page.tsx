'use client';

import { useParams } from 'next/navigation';
import FunctionSettingsPanel from '@/components/admin/subscriptions/FunctionSettingsPanel';
import { getFunctionSettingsData } from '@/lib/admin/functionSettingsMock';

export default function FunctionTrainingSettingsPage() {
  const params = useParams<{ id: string }>();
  const functionId = Number(params?.id ?? '1');
  const data = getFunctionSettingsData('training', functionId);

  if (!data) {
    return (
      <div className="p-6 text-gray-600">
        Training function not found for id {params?.id}.
      </div>
    );
  }

  return (
    <FunctionSettingsPanel
      tab="training"
      functionId={functionId}
      initialData={data}
      leftSidebarTitle="Actual Function"
    />
  );
}
