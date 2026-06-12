'use client';

import { useParams } from 'next/navigation';
import EditSubscriptionPanel from '@/components/admin/subscriptions/EditSubscriptionPanel';
import { getSubscriptionEditData } from '@/lib/admin/subscriptionSettingsMock';

export default function EditSubscriptionPage() {
  const params = useParams<{ id: string; lang: string }>();
  const id = params?.id ?? '';
  const lang = params?.lang ?? 'en';
  const listOrder = Number(id);
  const data = getSubscriptionEditData(listOrder, true);

  if (!data) {
    return (
      <div className="p-6 text-gray-600">
        Subscription not found for list order {id}.
      </div>
    );
  }

  return <EditSubscriptionPanel listOrder={listOrder} lang={lang} initialData={data} />;
}
