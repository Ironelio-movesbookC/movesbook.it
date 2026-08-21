'use client';

import { useParams } from 'next/navigation';
import FunctionManagementSettingsPanel from '@/components/admin/subscriptions/FunctionManagementSettingsPanel';
import { getManagementSettingsData } from '@/lib/admin/managementFunctionSettingsMock';

export default function FunctionManagementSettingsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params?.lang ?? 'en';
  const data = getManagementSettingsData(lang);

  return <FunctionManagementSettingsPanel lang={lang} initialData={data} />;
}
