'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PromocodeAddForm from '@/components/promocodes/PromocodeAddForm';
import { promocodesFetch, usePromocodesAdminAuth } from '@/components/promocodes/usePromocodesAdminAuth';
import type { PromocodeSettingRow } from '@/lib/promocodes/types';

export default function PromocodesEditPage() {
  const ready = usePromocodesAdminAuth();
  const params = useParams();
  const id = parseInt(String(params?.id ?? ''), 10);
  const [setting, setSetting] = useState<PromocodeSettingRow | null>(null);
  const [socialOptions, setSocialOptions] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !Number.isFinite(id)) return;
    promocodesFetch(`/api/admin/promocodes/settings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSetting(data.setting ?? null);
        setSocialOptions(data.setting?.socialOptionsParsed ?? {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready, id]);

  if (!ready || loading) return null;
  if (!setting) return <div className="p-8 text-center text-red-700">Promocode not found.</div>;

  return (
    <div className="max-w-[980px] mx-auto">
      <PromocodeAddForm
        mode="edit"
        settingId={id}
        initialSetting={setting}
        initialSocialOptions={socialOptions}
      />
    </div>
  );
}
