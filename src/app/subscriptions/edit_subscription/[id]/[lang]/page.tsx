'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EditSubscriptionPanel from '@/components/admin/subscriptions/EditSubscriptionPanel';
import {
  getClubEditHref,
  getSubscriptionEditData,
  resolveSubscriptionFromEditRouteParam,
} from '@/lib/admin/subscriptionSettingsMock';

export default function EditSubscriptionPage() {
  const params = useParams<{ id: string; lang: string }>();
  const router = useRouter();
  const routeParam = Number(params?.id ?? '');
  const lang = params?.lang ?? 'en';
  const row = resolveSubscriptionFromEditRouteParam(routeParam);

  useEffect(() => {
    if (row?.userType === 'club') {
      router.replace(getClubEditHref(row));
    }
  }, [row, router]);

  if (!row) {
    return (
      <div className="p-6 text-gray-600">
        Subscription not found for id or list order {params?.id ?? ''}.
      </div>
    );
  }

  if (row.userType === 'club') {
    return (
      <div className="p-6 text-gray-600">
        Redirecting to club subscription settings…
      </div>
    );
  }

  const data = getSubscriptionEditData(row.id, false);
  if (!data) {
    return (
      <div className="p-6 text-gray-600">
        Subscription settings could not be loaded for {row.name}.
      </div>
    );
  }

  return (
    <EditSubscriptionPanel subscriptionId={row.id} lang={lang} initialData={data} />
  );
}
